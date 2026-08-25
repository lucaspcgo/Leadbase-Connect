import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationTemplate {
  id: string;
  template_key: string;
  title: string;
  body: string;
  url: string;
  is_active: boolean;
}

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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

    const { type } = await req.json();

    // Get the appropriate template
    let templateKey: string;
    switch (type) {
      case 'new_user':
        templateKey = 'new_user';
        break;
      case 'new_empresa':
        templateKey = 'new_empresa';
        break;
      case 'invoice_reminder':
        // Check which reminder to send based on days until due
        const { days } = await req.json();
        if (days === 7) templateKey = 'invoice_reminder_7d';
        else if (days === 3) templateKey = 'invoice_reminder_3d';
        else templateKey = 'invoice_reminder_1d';
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.log('Template not found or inactive:', templateKey);
      return new Response(
        JSON.stringify({ success: false, message: 'Template not found or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: template.title,
      body: template.body,
      url: template.url,
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    const expiredSubscriptions: string[] = [];

    for (const sub of subscriptions as PushSubscription[]) {
      try {
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
          },
          body: payload,
        });

        if (response.ok) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          expiredSubscriptions.push(sub.user_id);
          failed++;
        } else {
          failed++;
        }
      } catch (pushError) {
        console.error('Error sending push:', pushError);
        failed++;
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      for (const userId of expiredSubscriptions) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }
    }

    // Log the notification
    await supabase
      .from('scheduled_notifications')
      .insert({
        template_key: templateKey,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { sent, failed },
      });

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
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
