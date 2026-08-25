
-- Create api_keys table for user API tokens
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL, -- first 8 chars for display (e.g. "lb_xxxx...")
  permissions text[] NOT NULL DEFAULT '{read_empresas}',
  rate_limit integer NOT NULL DEFAULT 100, -- requests per minute
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  total_requests bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create webhooks table
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  secret text, -- webhook signing secret
  events text[] NOT NULL DEFAULT '{}', -- e.g. {'empresa.created', 'empresa.updated'}
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamp with time zone,
  total_deliveries bigint NOT NULL DEFAULT 0,
  failed_deliveries bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create webhook_logs table for delivery tracking
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  response_status integer,
  response_body text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create api_request_logs for usage tracking
CREATE TABLE public.api_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  status_code integer,
  response_time_ms integer,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all API keys" ON public.api_keys FOR SELECT USING (is_admin(auth.uid()));

-- Webhooks policies
CREATE POLICY "Users can view own webhooks" ON public.webhooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own webhooks" ON public.webhooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own webhooks" ON public.webhooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own webhooks" ON public.webhooks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all webhooks" ON public.webhooks FOR SELECT USING (is_admin(auth.uid()));

-- Webhook logs policies
CREATE POLICY "Users can view own webhook logs" ON public.webhook_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.webhooks w WHERE w.id = webhook_logs.webhook_id AND w.user_id = auth.uid())
);
CREATE POLICY "Admins can view all webhook logs" ON public.webhook_logs FOR SELECT USING (is_admin(auth.uid()));

-- API request logs policies
CREATE POLICY "Users can view own API logs" ON public.api_request_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all API logs" ON public.api_request_logs FOR SELECT USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_api_request_logs_api_key_id ON public.api_request_logs(api_key_id);
CREATE INDEX idx_api_request_logs_created_at ON public.api_request_logs(created_at);

-- Function to validate API key (used by edge functions)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash text)
RETURNS TABLE(user_id uuid, api_key_id uuid, permissions text[], rate_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ak.user_id, ak.id as api_key_id, ak.permissions, ak.rate_limit
  FROM public.api_keys ak
  WHERE ak.key_hash = p_key_hash
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
    
  -- Update last_used_at and total_requests
  UPDATE public.api_keys
  SET last_used_at = now(), total_requests = total_requests + 1
  WHERE key_hash = p_key_hash;
END;
$$;
