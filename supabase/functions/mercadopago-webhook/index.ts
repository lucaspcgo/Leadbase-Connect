import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MercadoPagoNotification {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Mercado Pago webhook received`);

  try {
    // Get request body
    let notification: MercadoPagoNotification;
    try {
      notification = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Notification:`, {
      type: notification.type,
      action: notification.action,
      data_id: notification.data?.id,
      live_mode: notification.live_mode,
    });

    // Only process payment notifications
    if (notification.type !== 'payment') {
      console.log(`[${requestId}] Ignoring non-payment notification: ${notification.type}`);
      return new Response(
        JSON.stringify({ received: true, ignored: true, reason: 'Not a payment notification' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentId = notification.data?.id;
    if (!paymentId) {
      console.error(`[${requestId}] No payment ID in notification`);
      return new Response(
        JSON.stringify({ error: 'Missing payment ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Mercado Pago access token
    const { data: paymentConfig, error: configError } = await supabaseServiceRole
      .from('payment_configs')
      .select('mercado_pago_access_token, mercado_pago_webhook_secret')
      .limit(1)
      .maybeSingle();

    if (configError || !paymentConfig?.mercado_pago_access_token) {
      console.error(`[${requestId}] Error fetching payment config:`, configError);
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implement webhook signature validation if mercado_pago_webhook_secret is set
    // const signature = req.headers.get('x-signature');
    // if (paymentConfig.mercado_pago_webhook_secret && signature) {
    //   // Validate signature
    // }

    // Fetch payment details from Mercado Pago
    console.log(`[${requestId}] Fetching payment ${paymentId} from Mercado Pago...`);
    
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paymentConfig.mercado_pago_access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error(`[${requestId}] Failed to fetch payment from MP:`, mpResponse.status, errorText);
      
      // If payment not found (404), it might be a test webhook - return success
      if (mpResponse.status === 404) {
        console.log(`[${requestId}] Payment not found - possibly a test webhook`);
        return new Response(
          JSON.stringify({ 
            received: true, 
            ignored: true, 
            reason: 'Payment not found in Mercado Pago (possibly a test)' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment from Mercado Pago' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpPayment = await mpResponse.json();
    console.log(`[${requestId}] MP Payment:`, {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
      external_reference: mpPayment.external_reference,
      transaction_amount: mpPayment.transaction_amount,
    });

    const externalReference = mpPayment.external_reference;
    if (!externalReference) {
      console.error(`[${requestId}] No external_reference in payment`);
      return new Response(
        JSON.stringify({ received: true, ignored: true, reason: 'No external_reference' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Mercado Pago status to our status
    let newStatus: string;
    let paidAt: string | null = null;

    switch (mpPayment.status) {
      case 'approved':
        newStatus = 'APPROVED';
        paidAt = mpPayment.date_approved || new Date().toISOString();
        break;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        newStatus = 'PENDING';
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'FAILED';
        break;
      case 'refunded':
      case 'charged_back':
        newStatus = 'REFUNDED';
        break;
      default:
        newStatus = 'PENDING';
    }

    console.log(`[${requestId}] Updating payment ${externalReference} to status: ${newStatus}`);

    // Update payment in database
    const updateData: Record<string, unknown> = {
      status: newStatus,
      external_id: paymentId.toString(),
      metadata: {
        mercado_pago_id: mpPayment.id,
        mercado_pago_status: mpPayment.status,
        mercado_pago_status_detail: mpPayment.status_detail,
        last_webhook_at: new Date().toISOString(),
      },
    };

    if (paidAt) {
      updateData.paid_at = paidAt;
    }

    const { error: updateError } = await supabaseServiceRole
      .from('payments')
      .update(updateData)
      .eq('id', externalReference);

    if (updateError) {
      console.error(`[${requestId}] Failed to update payment:`, updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment is approved, also update invoice and subscription
    if (newStatus === 'APPROVED') {
      console.log(`[${requestId}] Payment approved, updating related records...`);

      // Get the payment to find the invoice_id
      const { data: payment, error: paymentError } = await supabaseServiceRole
        .from('payments')
        .select('invoice_id, user_id')
        .eq('id', externalReference)
        .single();

      if (paymentError || !payment) {
        console.error(`[${requestId}] Failed to fetch payment:`, paymentError);
      } else {
        // Update invoice
        if (payment.invoice_id) {
          const { error: invoiceError } = await supabaseServiceRole
            .from('invoices')
            .update({
              status: 'PAID',
              paid_at: paidAt,
            })
            .eq('id', payment.invoice_id);

          if (invoiceError) {
            console.error(`[${requestId}] Failed to update invoice:`, invoiceError);
          } else {
            console.log(`[${requestId}] Invoice ${payment.invoice_id} marked as PAID`);
          }
        }

        // Mark any existing ACTIVE subscriptions as UPGRADED before activating new one
        await supabaseServiceRole
          .from('subscriptions')
          .update({ status: 'UPGRADED', updated_at: new Date().toISOString() })
          .eq('user_id', payment.user_id)
          .eq('status', 'ACTIVE');

        // Update subscription status
        const now = new Date();
        const periodEnd = new Date();
        
        // Fetch the pending subscription to get billing cycle
        const { data: subscription } = await supabaseServiceRole
          .from('subscriptions')
          .select('plan_id, billing_cycle')
          .eq('user_id', payment.user_id)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscription?.billing_cycle === 'YEARLY') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const { error: subscriptionError } = await supabaseServiceRole
          .from('subscriptions')
          .update({
            status: 'ACTIVE',
            start_at: now.toISOString(),
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('user_id', payment.user_id)
          .eq('status', 'PENDING');

        if (subscriptionError) {
          console.error(`[${requestId}] Failed to update subscription:`, subscriptionError);
        } else {
          console.log(`[${requestId}] Subscription activated for user ${payment.user_id}`);
        }

        // Update user profile with the plan
        const { data: subscription } = await supabaseServiceRole
          .from('subscriptions')
          .select('plan_id')
          .eq('user_id', payment.user_id)
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();

        if (subscription) {
          // Calculate carry-over credits before updating plan
          const profileUpdateData: Record<string, unknown> = {
            plan_id: subscription.plan_id,
            plan_start_date: now.toISOString(),
          };

          const { data: currentProfile } = await supabaseServiceRole
            .from('profiles')
            .select('plan_id, extra_credits, plan_start_date')
            .eq('user_id', payment.user_id)
            .single();

          if (currentProfile && currentProfile.plan_id !== subscription.plan_id && currentProfile.plan_id !== 'free') {
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

          const { error: profileError } = await supabaseServiceRole
            .from('profiles')
            .update(profileUpdateData)
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error(`[${requestId}] Failed to update profile:`, profileError);
          } else {
            console.log(`[${requestId}] Profile updated with plan ${subscription.plan_id}`);
          }
        }
      }
    }

    console.log(`[${requestId}] Webhook processed successfully`);

    return new Response(
      JSON.stringify({ 
        received: true, 
        payment_id: externalReference, 
        status: newStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Webhook error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
