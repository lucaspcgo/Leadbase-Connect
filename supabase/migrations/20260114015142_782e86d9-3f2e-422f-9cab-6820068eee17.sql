-- Create payment_configs table to store payment gateway credentials securely
CREATE TABLE public.payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- PIX Configuration (chave_pix is less sensitive)
  pix_enabled BOOLEAN DEFAULT false,
  pix_chave TEXT,
  pix_tipo_chave TEXT DEFAULT 'EMAIL',
  pix_beneficiario TEXT,
  pix_cidade TEXT,
  pix_instrucoes TEXT,
  
  -- Mercado Pago Configuration (SECRETS - access_token, webhook_secret)
  mercado_pago_enabled BOOLEAN DEFAULT false,
  mercado_pago_access_token TEXT, -- SECRET
  mercado_pago_public_key TEXT,
  mercado_pago_sandbox_mode BOOLEAN DEFAULT true,
  mercado_pago_webhook_secret TEXT, -- SECRET
  
  -- PayPal Configuration (SECRETS - client_secret)
  paypal_enabled BOOLEAN DEFAULT false,
  paypal_client_id TEXT,
  paypal_client_secret TEXT, -- SECRET
  paypal_sandbox_mode BOOLEAN DEFAULT true,
  paypal_webhook_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

-- ONLY master_admin can view payment config
CREATE POLICY "Only master_admin can view payment config"
ON public.payment_configs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

-- ONLY master_admin can insert payment config
CREATE POLICY "Only master_admin can insert payment config"
ON public.payment_configs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- ONLY master_admin can update payment config
CREATE POLICY "Only master_admin can update payment config"
ON public.payment_configs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- ONLY master_admin can delete payment config
CREATE POLICY "Only master_admin can delete payment config"
ON public.payment_configs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_payment_configs_updated_at
BEFORE UPDATE ON public.payment_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config row
INSERT INTO public.payment_configs (
  pix_enabled,
  pix_beneficiario,
  pix_cidade,
  pix_instrucoes,
  mercado_pago_sandbox_mode,
  paypal_sandbox_mode
) VALUES (
  true,
  'LeadBase Pro',
  'Sao Paulo',
  'Pagamento para assinatura LeadBase Pro',
  true,
  true
);