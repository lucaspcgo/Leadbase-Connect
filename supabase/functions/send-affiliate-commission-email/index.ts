import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommissionEmailRequest {
  commission_id: string;
  status: 'APPROVED' | 'PAID';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { commission_id, status }: CommissionEmailRequest = await req.json();

    if (!commission_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: commission_id and status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-affiliate-commission-email] Processing email for commission ${commission_id} with status ${status}`);

    // Get commission details with affiliate info
    const { data: commission, error: commissionError } = await supabaseClient
      .from('affiliate_commissions')
      .select(`
        *,
        affiliates (
          user_id,
          referral_code
        )
      `)
      .eq('id', commission_id)
      .single();

    if (commissionError || !commission) {
      console.error(`[send-affiliate-commission-email] Commission not found:`, commissionError);
      return new Response(
        JSON.stringify({ error: "Commission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const affiliateData = commission.affiliates as any;
    if (!affiliateData?.user_id) {
      console.error(`[send-affiliate-commission-email] Affiliate not found for commission`);
      return new Response(
        JSON.stringify({ error: "Affiliate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get affiliate's profile for name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('user_id', affiliateData.user_id)
      .single();

    // Get user email from auth
    const { data: authUser } = await supabaseClient.auth.admin.getUserById(affiliateData.user_id);
    
    if (!authUser?.user?.email) {
      console.error(`[send-affiliate-commission-email] User email not found`);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = authUser.user.email;
    const userName = profile?.name || userEmail.split('@')[0];
    const commissionAmount = Number(commission.commission_amount).toFixed(2);

    // Get SMTP config
    const { data: smtpConfig } = await supabaseClient
      .from('payment_configs')
      .select('smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_secure')
      .single();

    if (!smtpConfig?.smtp_enabled || !smtpConfig.smtp_host) {
      console.log(`[send-affiliate-commission-email] SMTP not configured, skipping email`);
      return new Response(
        JSON.stringify({ success: false, message: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import denomailer
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.smtp_host,
        port: smtpConfig.smtp_port || 587,
        tls: smtpConfig.smtp_secure !== false,
        auth: {
          username: smtpConfig.smtp_user || "",
          password: smtpConfig.smtp_password || "",
        },
      },
    });

    let subject: string;
    let htmlContent: string;

    if (status === 'APPROVED') {
      subject = `🎉 Sua comissão de R$ ${commissionAmount} foi aprovada!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount { font-size: 36px; font-weight: bold; color: #22c55e; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Comissão Aprovada!</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${userName}</strong>!</p>
            <p>Temos ótimas notícias! Sua comissão foi aprovada e está aguardando pagamento.</p>
            <p style="text-align: center;">
              <span class="amount">R$ ${commissionAmount}</span>
            </p>
            <p>Esta comissão será processada e paga em breve. Você receberá outro email quando o pagamento for efetuado.</p>
            <p>Continue indicando e aumentando seus ganhos!</p>
            <p>Atenciosamente,<br>Equipe LeadsBase Pro</p>
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente. Por favor, não responda.</p>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `💰 Pagamento de R$ ${commissionAmount} realizado!`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount { font-size: 36px; font-weight: bold; color: #22c55e; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💰 Pagamento Realizado!</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${userName}</strong>!</p>
            <p>Excelente notícia! O pagamento da sua comissão foi processado com sucesso.</p>
            <p style="text-align: center;">
              <span class="amount">R$ ${commissionAmount}</span>
            </p>
            <p>O valor foi creditado conforme os dados cadastrados. Verifique sua conta em breve.</p>
            <p>Obrigado por fazer parte do nosso programa de afiliados!</p>
            <p>Atenciosamente,<br>Equipe LeadsBase Pro</p>
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente. Por favor, não responda.</p>
          </div>
        </body>
        </html>
      `;
    }

    await client.send({
      from: `${smtpConfig.smtp_from_name || 'LeadsBase Pro'} <${smtpConfig.smtp_from_email || smtpConfig.smtp_user}>`,
      to: userEmail,
      subject,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    console.log(`[send-affiliate-commission-email] Email sent successfully to ${userEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-affiliate-commission-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
