import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyRequest {
  session_id: string;
  payment_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting verify-stripe-payment request`);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Parse request body
    let body: VerifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { session_id, payment_id } = body;

    if (!session_id || !payment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id or payment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stripe credentials
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: paymentConfig, error: configError } = await supabaseServiceRole
      .from('payment_configs')
      .select('stripe_secret_key')
      .limit(1)
      .maybeSingle();

    if (configError || !paymentConfig?.stripe_secret_key) {
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(paymentConfig.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log(`[${requestId}] Session status:`, {
      session_id: session.id,
      payment_status: session.payment_status,
      status: session.status,
    });

    const isPaid = session.payment_status === 'paid';

    if (isPaid) {
      const now = new Date().toISOString();

      // Update payment status
      const { error: paymentError } = await supabaseServiceRole
        .from('payments')
        .update({
          status: 'APPROVED',
          paid_at: now,
          metadata: {
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            verified_at: now,
          },
        })
        .eq('id', payment_id)
        .eq('user_id', userId);

      if (paymentError) {
        console.error(`[${requestId}] Error updating payment:`, paymentError);
      }

      // Get payment to update related records
      const { data: payment } = await supabaseServiceRole
        .from('payments')
        .select('invoice_id')
        .eq('id', payment_id)
        .single();

      // Update invoice
      if (payment?.invoice_id) {
        await supabaseServiceRole
          .from('invoices')
          .update({
            status: 'PAID',
            paid_at: now,
          })
          .eq('id', payment.invoice_id);
      }

      // Update subscription
      const planId = session.metadata?.plan_id;
      const billingCycle = session.metadata?.billing_cycle;

      if (planId) {
        const { data: subscription } = await supabaseServiceRole
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('plan_id', planId)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscription) {
          const periodStart = new Date();
          const periodEnd = new Date();
          
          if (billingCycle === 'YEARLY') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          // Mark any other ACTIVE subscriptions as UPGRADED
          await supabaseServiceRole
            .from('subscriptions')
            .update({ status: 'UPGRADED', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')
            .neq('id', subscription.id);

          await supabaseServiceRole
            .from('subscriptions')
            .update({
              status: 'ACTIVE',
              start_at: periodStart.toISOString(),
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .eq('id', subscription.id);

          // Calculate carry-over credits before updating plan
          const profileUpdateData: Record<string, unknown> = {
            plan_id: planId,
            plan_start_date: periodStart.toISOString(),
          };

          const { data: currentProfile } = await supabaseServiceRole
            .from('profiles')
            .select('plan_id, extra_credits, plan_start_date')
            .eq('user_id', userId)
            .single();

          if (currentProfile && currentProfile.plan_id !== planId && currentProfile.plan_id !== 'free') {
            const { data: oldPlan } = await supabaseServiceRole
              .from('plans')
              .select('monthly_company_limit')
              .eq('id', currentProfile.plan_id)
              .single();

            if (oldPlan) {
              const cycleStart = currentProfile.plan_start_date || new Date(0).toISOString();
              const { count } = await supabaseServiceRole
                .from('unlocked_companies')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('unlocked_at', cycleStart);

              const remaining = Math.max(0, oldPlan.monthly_company_limit - (count || 0));
              if (remaining > 0) {
                profileUpdateData.extra_credits = (currentProfile.extra_credits || 0) + remaining;
                console.log(`[${requestId}] Carrying over ${remaining} unused credits from plan ${currentProfile.plan_id}`);
              }
            }
          }

          await supabaseServiceRole
            .from('profiles')
            .update(profileUpdateData)
            .eq('user_id', userId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment_id,
        session_id: session_id,
        status: isPaid ? 'APPROVED' : 'PENDING',
        is_paid: isPaid,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Verification failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
