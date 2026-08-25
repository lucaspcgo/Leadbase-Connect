import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  current_period_end: string;
  status: string;
}

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationTemplate {
  title: string;
  body: string;
  url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get templates
    const { data: templates, error: templatesError } = await supabase
      .from('notification_templates')
      .select('template_key, title, body, url')
      .in('template_key', ['invoice_reminder_1d', 'invoice_reminder_3d', 'invoice_reminder_7d'])
      .eq('is_active', true);

    if (templatesError || !templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active reminder templates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templateMap = templates.reduce((acc, t) => {
      acc[t.template_key] = t;
      return acc;
    }, {} as Record<string, NotificationTemplate>);

    // Get subscriptions expiring in 1, 3, or 7 days
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, user_id, user_email, current_period_end, status')
      .eq('status', 'ACTIVE')
      .not('current_period_end', 'is', null);

    if (subsError || !subscriptions) {
      throw subsError || new Error('Failed to fetch subscriptions');
    }

    let notificationsSent = 0;
    const processedUsers = new Set<string>();

    for (const sub of subscriptions as Subscription[]) {
      if (!sub.current_period_end || processedUsers.has(sub.user_id)) continue;

      const endDate = new Date(sub.current_period_end);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let templateKey: string | null = null;

      // Check if we should send a reminder (within a 12-hour window)
      if (daysUntilExpiry === 1) {
        templateKey = 'invoice_reminder_1d';
      } else if (daysUntilExpiry === 3) {
        templateKey = 'invoice_reminder_3d';
      } else if (daysUntilExpiry === 7) {
        templateKey = 'invoice_reminder_7d';
      }

      if (!templateKey || !templateMap[templateKey]) continue;

      // Check if we already sent this notification today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingNotification } = await supabase
        .from('scheduled_notifications')
        .select('id')
        .eq('template_key', templateKey)
        .eq('target_user_id', sub.user_id)
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      if (existingNotification && existingNotification.length > 0) continue;

      // Get user's push subscriptions
      const { data: pushSubs, error: pushError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', sub.user_id);

      if (pushError || !pushSubs || pushSubs.length === 0) continue;

      const template = templateMap[templateKey];
      const payload = JSON.stringify({
        title: template.title,
        body: template.body,
        url: template.url,
        timestamp: Date.now(),
      });

      let sent = false;
      for (const pushSub of pushSubs as PushSubscription[]) {
        try {
          const response = await fetch(pushSub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
            },
            body: payload,
          });

          if (response.ok) {
            sent = true;
          } else if (response.status === 404 || response.status === 410) {
            // Clean up expired subscription
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', pushSub.endpoint);
          }
        } catch (pushError) {
          console.error('Error sending push:', pushError);
        }
      }

      if (sent) {
        notificationsSent++;
        processedUsers.add(sub.user_id);

        // Log the notification
        await supabase
          .from('scheduled_notifications')
          .insert({
            template_key: templateKey,
            target_user_id: sub.user_id,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { days_until_expiry: daysUntilExpiry },
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent,
        subscriptionsChecked: subscriptions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
