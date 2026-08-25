import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CheckStatusRequest {
  payment_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting check-payment-status request`);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error(`[${requestId}] Unauthorized: Missing or invalid Authorization header`);
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error(`[${requestId}] Auth error:`, claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    console.log(`[${requestId}] User authenticated: ${userId}`);

    // Get request body
    let body: CheckStatusRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_id } = body;

    if (!payment_id) {
      console.error(`[${requestId}] Missing payment_id`);
      return new Response(
        JSON.stringify({ error: 'payment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Checking payment: ${payment_id}`);

    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get payment from database
    const { data: payment, error: paymentError } = await supabaseServiceRole
      .from('payments')
      .select('id, external_id, status, user_id, invoice_id, method')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      console.error(`[${requestId}] Payment not found:`, paymentError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this payment
    if (payment.user_id !== userId) {
      console.error(`[${requestId}] User ${userId} does not own payment ${payment_id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment is already approved or failed, return current status
    if (payment.status === 'APPROVED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      console.log(`[${requestId}] Payment already has final status: ${payment.status}`);
      return new Response(
        JSON.stringify({ 
          payment_id: payment.id,
          status: payment.status,
          is_final: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not Mercado Pago or no external_id, return current status
    if (payment.method !== 'MERCADO_PAGO' || !payment.external_id) {
      console.log(`[${requestId}] Payment method is not MERCADO_PAGO or no external_id`);
      return new Response(
        JSON.stringify({ 
          payment_id: payment.id,
          status: payment.status,
          is_final: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Mercado Pago access token
    const { data: paymentConfig, error: configError } = await supabaseServiceRole
      .from('payment_configs')
      .select('mercado_pago_access_token')
      .limit(1)
      .maybeSingle();

    if (configError || !paymentConfig?.mercado_pago_access_token) {
      console.error(`[${requestId}] Error fetching payment config:`, configError);
      return new Response(
        JSON.stringify({ 
          payment_id: payment.id,
          status: payment.status,
          is_final: false,
          error: 'Configuration error',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Mercado Pago for payment status
    console.log(`[${requestId}] Fetching payment ${payment.external_id} from Mercado Pago...`);
    
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment.external_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paymentConfig.mercado_pago_access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error(`[${requestId}] Failed to fetch from MP:`, mpResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          payment_id: payment.id,
          status: payment.status,
          is_final: false,
          error: 'Failed to fetch from payment provider',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpPayment = await mpResponse.json();
    console.log(`[${requestId}] MP Payment status:`, {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
    });

    // Map Mercado Pago status to our status
    let newStatus: string = payment.status;
    let paidAt: string | null = null;
    let isFinal = false;

    switch (mpPayment.status) {
      case 'approved':
        newStatus = 'APPROVED';
        paidAt = mpPayment.date_approved || new Date().toISOString();
        isFinal = true;
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'FAILED';
        isFinal = true;
        break;
      case 'refunded':
      case 'charged_back':
        newStatus = 'REFUNDED';
        isFinal = true;
        break;
      case 'pending':
      case 'in_process':
      case 'in_mediation':
        newStatus = 'PENDING';
        isFinal = false;
        break;
    }

    // If status changed, update database
    if (newStatus !== payment.status) {
      console.log(`[${requestId}] Status changed from ${payment.status} to ${newStatus}`);
      
      // Update payment
      const updateData: Record<string, unknown> = {
        status: newStatus,
        metadata: {
          mercado_pago_id: mpPayment.id,
          mercado_pago_status: mpPayment.status,
          mercado_pago_status_detail: mpPayment.status_detail,
          last_check_at: new Date().toISOString(),
        },
      };

      if (paidAt) {
        updateData.paid_at = paidAt;
      }

      const { error: updateError } = await supabaseServiceRole
        .from('payments')
        .update(updateData)
        .eq('id', payment_id);

      if (updateError) {
        console.error(`[${requestId}] Failed to update payment:`, updateError);
      }

      // If approved, update invoice, subscription, and profile
      if (newStatus === 'APPROVED') {
        console.log(`[${requestId}] Payment approved, updating related records...`);

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

        // Get subscription info from invoice
        const { data: invoice } = await supabaseServiceRole
          .from('invoices')
          .select('billing_cycle')
          .eq('id', payment.invoice_id)
          .single();

        // Mark any existing ACTIVE subscriptions as UPGRADED
        await supabaseServiceRole
          .from('subscriptions')
          .update({ status: 'UPGRADED', updated_at: new Date().toISOString() })
          .eq('user_id', payment.user_id)
          .eq('status', 'ACTIVE');

        // Calculate period end based on billing cycle
        const now = new Date();
        const periodEnd = new Date();
        if (invoice?.billing_cycle === 'YEARLY') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Update subscription
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

        // Get activated subscription to update profile
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

    console.log(`[${requestId}] Check complete, returning status: ${newStatus}`);

    return new Response(
      JSON.stringify({ 
        payment_id: payment.id,
        status: newStatus,
        is_final: isFinal,
        mercado_pago_status: mpPayment.status,
        mercado_pago_status_detail: mpPayment.status_detail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Edge function error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
