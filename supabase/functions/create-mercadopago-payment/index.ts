import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PaymentRequest {
  amount: number;
  description: string;
  payer_email: string;
  payer_name: string;
  payer_document?: string;
  external_reference: string; // payment_id from our database
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Starting create-mercadopago-payment request`);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error(`[${requestId}] Unauthorized: Missing or invalid Authorization header`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Missing or invalid authorization header' }),
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
        JSON.stringify({ error: 'Unauthorized', details: claimsError?.message || 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    console.log(`[${requestId}] User authenticated: ${userId}`);

    // Get request body
    let body: PaymentRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: 'Expected valid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, description, payer_email, payer_name, payer_document, external_reference } = body;

    console.log(`[${requestId}] Request body:`, {
      amount,
      description,
      payer_email,
      payer_name: payer_name?.substring(0, 3) + '***',
      external_reference,
      has_document: !!payer_document,
    });

    // Validate required fields
    if (!amount || amount <= 0) {
      console.error(`[${requestId}] Invalid amount: ${amount}`);
      return new Response(
        JSON.stringify({ error: 'Valor inválido', details: 'O valor deve ser maior que zero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!description) {
      console.error(`[${requestId}] Missing description`);
      return new Response(
        JSON.stringify({ error: 'Descrição obrigatória', details: 'A descrição do pagamento é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payer_email) {
      console.error(`[${requestId}] Missing payer_email`);
      return new Response(
        JSON.stringify({ error: 'Email obrigatório', details: 'O email do pagador é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!external_reference) {
      console.error(`[${requestId}] Missing external_reference`);
      return new Response(
        JSON.stringify({ error: 'Referência obrigatória', details: 'O ID do pagamento é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Mercado Pago credentials from payment_configs
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: paymentConfig, error: configError } = await supabaseServiceRole
      .from('payment_configs')
      .select('mercado_pago_enabled, mercado_pago_access_token, mercado_pago_sandbox_mode')
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error(`[${requestId}] Error fetching payment config:`, configError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro na configuração', 
          details: 'Não foi possível carregar a configuração de pagamento' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Payment config:`, {
      mercado_pago_enabled: paymentConfig?.mercado_pago_enabled,
      mercado_pago_sandbox_mode: paymentConfig?.mercado_pago_sandbox_mode,
      has_access_token: !!paymentConfig?.mercado_pago_access_token,
      access_token_prefix: paymentConfig?.mercado_pago_access_token?.substring(0, 10) + '...',
    });

    if (!paymentConfig?.mercado_pago_enabled) {
      console.error(`[${requestId}] Mercado Pago not enabled`);
      return new Response(
        JSON.stringify({ 
          error: 'Mercado Pago desabilitado', 
          details: 'A integração com Mercado Pago não está habilitada' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentConfig?.mercado_pago_access_token) {
      console.error(`[${requestId}] Mercado Pago access token not configured`);
      return new Response(
        JSON.stringify({ 
          error: 'Token não configurado', 
          details: 'O Access Token do Mercado Pago não está configurado' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = paymentConfig.mercado_pago_access_token;
    const isSandbox = paymentConfig.mercado_pago_sandbox_mode ?? true;

    // Validate token format for sandbox/production
    const isTestToken = accessToken.startsWith('TEST-');
    const isProdToken = accessToken.startsWith('APP_USR-');
    
    console.log(`[${requestId}] Token type: ${isTestToken ? 'TEST' : isProdToken ? 'PROD' : 'UNKNOWN'}, Sandbox mode: ${isSandbox}`);

    if (isSandbox && !isTestToken) {
      console.warn(`[${requestId}] Warning: Sandbox mode enabled but token doesn't start with TEST-`);
    }

    if (!isSandbox && !isProdToken) {
      console.warn(`[${requestId}] Warning: Production mode enabled but token doesn't start with APP_USR-`);
    }

    // Prepare payer data
    const firstName = payer_name?.split(' ')[0] || 'Cliente';
    const lastName = payer_name?.split(' ').slice(1).join(' ') || '';
    const documentNumber = payer_document?.replace(/\D/g, '') || '';
    const documentType = documentNumber.length === 11 ? 'CPF' : documentNumber.length === 14 ? 'CNPJ' : 'CPF';

    // Create PIX payment via Mercado Pago API
    const mpApiUrl = 'https://api.mercadopago.com/v1/payments';
    const idempotencyKey = `${external_reference}-${Date.now()}`;
    
    const paymentPayload = {
      transaction_amount: Number(amount.toFixed(2)),
      description: description.substring(0, 100),
      payment_method_id: 'pix',
      payer: {
        email: payer_email,
        first_name: firstName,
        last_name: lastName,
        ...(documentNumber && {
          identification: {
            type: documentType,
            number: documentNumber,
          },
        }),
      },
      external_reference: external_reference,
      metadata: {
        user_id: userId,
        payment_id: external_reference,
      },
    };

    console.log(`[${requestId}] Creating Mercado Pago payment:`, {
      ...paymentPayload,
      payer: { 
        ...paymentPayload.payer, 
        email: paymentPayload.payer.email.substring(0, 3) + '***',
        identification: paymentPayload.payer.identification ? { 
          type: paymentPayload.payer.identification.type, 
          number: '***' 
        } : undefined,
      },
    });

    const mpResponse = await fetch(mpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpData = await mpResponse.json();

    console.log(`[${requestId}] Mercado Pago response status: ${mpResponse.status}`);
    console.log(`[${requestId}] Mercado Pago response:`, {
      id: mpData.id,
      status: mpData.status,
      status_detail: mpData.status_detail,
      hasQrCode: !!mpData.point_of_interaction?.transaction_data?.qr_code,
      hasQrCodeBase64: !!mpData.point_of_interaction?.transaction_data?.qr_code_base64,
      error: mpData.message,
      cause: mpData.cause,
    });

    if (!mpResponse.ok) {
      console.error(`[${requestId}] Mercado Pago API error:`, JSON.stringify(mpData, null, 2));
      
      // Parse error details
      let errorMessage = 'Erro ao criar pagamento no Mercado Pago';
      let errorDetails = '';

      if (mpData.message) {
        errorMessage = mpData.message;
      }

      if (mpData.cause && Array.isArray(mpData.cause)) {
        const causes = mpData.cause.map((c: { description?: string; code?: string }) => 
          c.description || c.code || JSON.stringify(c)
        ).join('; ');
        errorDetails = causes;
      }

      // Update payment record with error
      const { error: updateError } = await supabaseServiceRole
        .from('payments')
        .update({
          status: 'FAILED',
          metadata: {
            error_message: errorMessage,
            error_details: errorDetails,
            error_status: mpResponse.status,
            error_response: mpData,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', external_reference);

      if (updateError) {
        console.error(`[${requestId}] Failed to update payment with error:`, updateError);
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails || `HTTP ${mpResponse.status}`,
          mp_error: mpData,
        }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract PIX data from response
    const pixData = mpData.point_of_interaction?.transaction_data;
    
    if (!pixData?.qr_code) {
      console.error(`[${requestId}] No QR code in MP response. Full response:`, JSON.stringify(mpData, null, 2));
      
      // Update payment with partial data
      const { error: updateError } = await supabaseServiceRole
        .from('payments')
        .update({
          external_id: mpData.id?.toString(),
          status: 'FAILED',
          metadata: {
            mercado_pago_id: mpData.id,
            mercado_pago_status: mpData.status,
            error_message: 'QR Code não foi gerado pelo Mercado Pago',
            raw_response: mpData,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', external_reference);

      if (updateError) {
        console.error(`[${requestId}] Failed to update payment:`, updateError);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Falha ao gerar QR Code', 
          details: 'O Mercado Pago não retornou um QR Code PIX. Verifique a configuração da conta.',
          mp_status: mpData.status,
          mp_status_detail: mpData.status_detail,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] PIX QR Code generated successfully`);
    console.log(`[${requestId}] QR code length: ${pixData.qr_code.length}`);
    console.log(`[${requestId}] QR code base64 available: ${!!pixData.qr_code_base64}`);

    // Update payment record with Mercado Pago data
    const { error: updateError } = await supabaseServiceRole
      .from('payments')
      .update({
        external_id: mpData.id.toString(),
        pix_code: pixData.qr_code,
        pix_qrcode: pixData.qr_code_base64 ? `data:image/png;base64,${pixData.qr_code_base64}` : null,
        metadata: {
          mercado_pago_id: mpData.id,
          mercado_pago_status: mpData.status,
          ticket_url: pixData.ticket_url,
          date_of_expiration: mpData.date_of_expiration,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', external_reference);

    if (updateError) {
      console.error(`[${requestId}] Error updating payment record:`, updateError);
      // Don't fail the request, just log the error
    } else {
      console.log(`[${requestId}] Payment record updated successfully`);
    }

    const response = {
      success: true,
      payment_id: mpData.id,
      status: mpData.status,
      pix_code: pixData.qr_code,
      pix_qrcode_base64: pixData.qr_code_base64 ? `data:image/png;base64,${pixData.qr_code_base64}` : null,
      ticket_url: pixData.ticket_url,
      expiration_date: mpData.date_of_expiration,
    };

    console.log(`[${requestId}] Success response:`, {
      ...response,
      pix_code: response.pix_code?.substring(0, 30) + '...',
      pix_qrcode_base64: response.pix_qrcode_base64 ? 'data:image/png;base64,[...]' : null,
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Edge function error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[${requestId}] Error stack:`, errorStack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
