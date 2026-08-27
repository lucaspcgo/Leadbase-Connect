import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting stripe-webhook request`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Stripe credentials
    const { data: paymentConfig, error: configError } = await supabaseServiceRole
      .from('payment_configs')
      .select('stripe_secret_key, stripe_webhook_secret')
      .limit(1)
      .maybeSingle();

    if (configError || !paymentConfig?.stripe_secret_key) {
      console.error(`[${requestId}] Error fetching payment config:`, configError);
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(paymentConfig.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    // Verify webhook signature if webhook secret is configured
    if (paymentConfig.stripe_webhook_secret && signature) {
      try {
        // constructEventAsync, e nao constructEvent: no Deno o SDK do Stripe
        // assina via Web Crypto, que e assincrona. A versao sincrona lanca
        // "SubtleCryptoProvider cannot be used in a synchronous context" e
        // toda notificacao de pagamento era recusada com 400.
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          paymentConfig.stripe_webhook_secret
        );
        console.log(`[${requestId}] Webhook signature verified`);
      } catch (err) {
        console.error(`[${requestId}] Webhook signature verification failed:`, err);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Parse without verification (not recommended for production)
      event = JSON.parse(body) as Stripe.Event;
      console.warn(`[${requestId}] Webhook signature not verified - webhook secret not configured`);
    }

    console.log(`[${requestId}] Received event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.client_reference_id || session.metadata?.payment_id;
        
        console.log(`[${requestId}] Checkout session completed:`, {
          session_id: session.id,
          payment_id: paymentId,
          payment_status: session.payment_status,
        });

        if (paymentId && session.payment_status === 'paid') {
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
                paid_at: now,
              },
            })
            .eq('id', paymentId);

          if (paymentError) {
            console.error(`[${requestId}] Error updating payment:`, paymentError);
          } else {
            console.log(`[${requestId}] Payment ${paymentId} marked as APPROVED`);
          }

          // Update invoice status
          const { data: payment } = await supabaseServiceRole
            .from('payments')
            .select('invoice_id, user_id')
            .eq('id', paymentId)
            .single();

          if (payment?.invoice_id) {
            await supabaseServiceRole
              .from('invoices')
              .update({
                status: 'PAID',
                paid_at: now,
              })
              .eq('id', payment.invoice_id);
            
            console.log(`[${requestId}] Invoice ${payment.invoice_id} marked as PAID`);
          }

          // Update subscription status
          const planId = session.metadata?.plan_id;
          const billingCycle = session.metadata?.billing_cycle;
          
          if (payment?.user_id && planId) {
            // Find pending subscription for this user
            const { data: subscription, error: subError } = await supabaseServiceRole
              .from('subscriptions')
              .select('id')
              .eq('user_id', payment.user_id)
              .eq('plan_id', planId)
              .eq('status', 'PENDING')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (subscription && !subError) {
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
                .eq('user_id', payment.user_id)
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

              console.log(`[${requestId}] Subscription ${subscription.id} activated`);

              // Calculate carry-over credits before updating plan
              const profileUpdateData: Record<string, unknown> = {
                plan_id: planId,
                plan_start_date: periodStart.toISOString(),
              };

              const { data: currentProfile } = await supabaseServiceRole
                .from('profiles')
                .select('plan_id, extra_credits, plan_start_date')
                .eq('user_id', payment.user_id)
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
                    .eq('user_id', payment.user_id)
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
                .eq('user_id', payment.user_id);

              console.log(`[${requestId}] User profile updated with plan ${planId}`);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentId = paymentIntent.metadata?.payment_id;
        
        console.log(`[${requestId}] Payment failed:`, {
          payment_intent_id: paymentIntent.id,
          payment_id: paymentId,
        });

        if (paymentId) {
          await supabaseServiceRole
            .from('payments')
            .update({
              status: 'FAILED',
              metadata: {
                stripe_payment_intent: paymentIntent.id,
                error_message: paymentIntent.last_payment_error?.message,
                failed_at: new Date().toISOString(),
              },
            })
            .eq('id', paymentId);

          console.log(`[${requestId}] Payment ${paymentId} marked as FAILED`);
        }
        break;
      }

      default:
        console.log(`[${requestId}] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Webhook error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
