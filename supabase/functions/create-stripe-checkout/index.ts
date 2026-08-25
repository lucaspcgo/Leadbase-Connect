import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CheckoutRequest {
  amount: number;
  description: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  payer_email: string;
  payer_name: string;
  external_reference: string;
  success_url: string;
  cancel_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting create-stripe-checkout request`);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error(`[${requestId}] Unauthorized: Missing Authorization header`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Missing authorization header' }),
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
      console.error(`[${requestId}] Auth error:`, authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log(`[${requestId}] User authenticated: ${userId}`);

    // Parse request body
    let body: CheckoutRequest;
    try {
      body = await req.json();
    } catch {
      console.error(`[${requestId}] Failed to parse request body`);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      amount, 
      description, 
      plan_id,
      plan_name,
      billing_cycle,
      payer_email, 
      payer_name, 
      external_reference,
      success_url,
      cancel_url 
    } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor inválido', details: 'O valor deve ser maior que zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!external_reference || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stripe credentials from payment_configs
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: paymentConfig, error: configError } = await supabaseServiceRole
      .from('payment_configs')
      .select('stripe_enabled, stripe_secret_key, stripe_sandbox_mode')
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error(`[${requestId}] Error fetching payment config:`, configError);
      return new Response(
        JSON.stringify({ error: 'Erro na configuração' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentConfig?.stripe_enabled) {
      console.error(`[${requestId}] Stripe not enabled`);
      return new Response(
        JSON.stringify({ error: 'Stripe desabilitado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentConfig?.stripe_secret_key) {
      console.error(`[${requestId}] Stripe secret key not configured`);
      return new Response(
        JSON.stringify({ error: 'Chave do Stripe não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(paymentConfig.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    console.log(`[${requestId}] Creating Stripe checkout session`);

    // Check if customer exists or create new one
    let customerId: string | undefined;
    
    const existingCustomers = await stripe.customers.list({
      email: payer_email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log(`[${requestId}] Found existing customer: ${customerId}`);
    } else {
      const newCustomer = await stripe.customers.create({
        email: payer_email,
        name: payer_name,
        metadata: {
          user_id: userId,
        },
      });
      customerId = newCustomer.id;
      console.log(`[${requestId}] Created new customer: ${customerId}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: plan_name,
              description: `Assinatura ${plan_name} - ${billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&payment_id=${external_reference}`,
      cancel_url: cancel_url,
      metadata: {
        user_id: userId,
        payment_id: external_reference,
        plan_id: plan_id,
        plan_name: plan_name,
        billing_cycle: billing_cycle,
      },
      client_reference_id: external_reference,
    });

    console.log(`[${requestId}] Checkout session created: ${session.id}`);

    // Update payment record with Stripe session ID
    const { error: updateError } = await supabaseServiceRole
      .from('payments')
      .update({
        external_id: session.id,
        metadata: {
          stripe_session_id: session.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', external_reference);

    if (updateError) {
      console.error(`[${requestId}] Error updating payment record:`, updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        checkout_url: session.url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Edge function error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
