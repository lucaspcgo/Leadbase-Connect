import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

interface SmtpConfig {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

// Email templates
const emailTemplates: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  subscription_expiring: (data) => ({
    subject: `⚠️ Sua assinatura vence em ${data.days_remaining} dias`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Atenção!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.user_name || 'Cliente'}</strong>,</p>
            <p>Sua assinatura do plano <strong>${data.plan_name}</strong> vence em <strong>${data.days_remaining} dias</strong> (${data.expiration_date}).</p>
            <p>Para continuar utilizando todos os recursos do LeadsBase Pro sem interrupção, renove sua assinatura agora.</p>
            <a href="${data.renewal_url || '#'}" class="button">Renovar Agora</a>
            <p style="margin-top: 20px;">Se você já renovou ou tem dúvidas, entre em contato conosco.</p>
          </div>
          <div class="footer">
            <p>LeadsBase Pro - Sua plataforma de prospecção de leads</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
  
  payment_confirmed: (data) => ({
    subject: `✅ Pagamento confirmado - ${data.plan_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Pagamento Confirmado</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.user_name || 'Cliente'}</strong>,</p>
            <p>Seu pagamento foi confirmado com sucesso!</p>
            <div class="details">
              <p><strong>Plano:</strong> ${data.plan_name}</p>
              <p><strong>Valor:</strong> R$ ${data.amount}</p>
              <p><strong>Período:</strong> ${data.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}</p>
              <p><strong>Válido até:</strong> ${data.valid_until}</p>
            </div>
            <p>Sua assinatura está ativa e você pode utilizar todos os recursos do seu plano.</p>
          </div>
          <div class="footer">
            <p>LeadsBase Pro - Sua plataforma de prospecção de leads</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcome: (data) => ({
    subject: `🎉 Bem-vindo ao LeadsBase Pro!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.user_name || 'Cliente'}</strong>,</p>
            <p>Sua conta foi criada com sucesso no LeadsBase Pro!</p>
            <p>Agora você pode começar a prospectar leads qualificados para o seu negócio.</p>
            <a href="${data.dashboard_url || '#'}" class="button">Acessar Dashboard</a>
          </div>
          <div class="footer">
            <p>LeadsBase Pro - Sua plataforma de prospecção de leads</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  subscription_renewed: (data) => ({
    subject: `🔄 Assinatura renovada com sucesso`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Assinatura Renovada</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.user_name || 'Cliente'}</strong>,</p>
            <p>Sua assinatura foi renovada com sucesso!</p>
            <div class="details">
              <p><strong>Plano:</strong> ${data.plan_name}</p>
              <p><strong>Novo período:</strong> ${data.period_start} a ${data.period_end}</p>
            </div>
            <p>Obrigado por continuar conosco!</p>
          </div>
          <div class="footer">
            <p>LeadsBase Pro - Sua plataforma de prospecção de leads</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  test_email: (data) => ({
    subject: `🧪 Email de teste - LeadsBase Pro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .success { background: #10B981; color: white; padding: 15px; border-radius: 6px; text-align: center; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 Email de Teste</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>✅ Configuração SMTP funcionando!</strong>
            </div>
            <p style="margin-top: 20px;">Este é um email de teste enviado às <strong>${data.timestamp}</strong>.</p>
            <p>Se você está recebendo este email, significa que sua configuração SMTP está correta.</p>
          </div>
          <div class="footer">
            <p>LeadsBase Pro - Sua plataforma de prospecção de leads</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get SMTP configuration from database
    const { data: configData, error: configError } = await supabase
      .from("payment_configs")
      .select("smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_email, smtp_from_name")
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching SMTP config:", configError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch SMTP configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const smtpConfig = configData as SmtpConfig | null;

    if (!smtpConfig?.smtp_enabled) {
      return new Response(
        JSON.stringify({ error: "SMTP is not enabled" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!smtpConfig.smtp_host || !smtpConfig.smtp_user || !smtpConfig.smtp_password) {
      return new Response(
        JSON.stringify({ error: "SMTP configuration is incomplete" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRequest: EmailRequest = await req.json();

    // Validate required fields
    if (!emailRequest.to) {
      return new Response(
        JSON.stringify({ error: "Missing required field: to" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle template-based emails
    let subject = emailRequest.subject;
    let html = emailRequest.html;

    if (emailRequest.template && emailTemplates[emailRequest.template]) {
      const templateFn = emailTemplates[emailRequest.template];
      const rendered = templateFn(emailRequest.templateData || {});
      subject = rendered.subject;
      html = rendered.html;
    }

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing subject or html content" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.smtp_host,
        port: smtpConfig.smtp_port,
        tls: smtpConfig.smtp_secure,
        auth: {
          username: smtpConfig.smtp_user,
          password: smtpConfig.smtp_password,
        },
      },
    });

    // Prepare recipients
    const recipients = Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to];

    // Send email
    await client.send({
      from: `${smtpConfig.smtp_from_name} <${smtpConfig.smtp_from_email}>`,
      to: recipients,
      subject: subject,
      content: emailRequest.text || "",
      html: html,
    });

    await client.close();

    console.log(`Email sent successfully to ${recipients.join(", ")}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        recipients: recipients.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
