-- Add SMTP configuration columns to payment_configs table
ALTER TABLE public.payment_configs 
ADD COLUMN IF NOT EXISTS smtp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS smtp_host text,
ADD COLUMN IF NOT EXISTS smtp_port integer DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_secure boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS smtp_user text,
ADD COLUMN IF NOT EXISTS smtp_password text,
ADD COLUMN IF NOT EXISTS smtp_from_email text,
ADD COLUMN IF NOT EXISTS smtp_from_name text DEFAULT 'LeadsBase Pro';

-- Add comment for documentation
COMMENT ON COLUMN public.payment_configs.smtp_enabled IS 'Whether SMTP email sending is enabled';
COMMENT ON COLUMN public.payment_configs.smtp_host IS 'SMTP server host (e.g., smtp.gmail.com)';
COMMENT ON COLUMN public.payment_configs.smtp_port IS 'SMTP server port (typically 587 for TLS, 465 for SSL)';
COMMENT ON COLUMN public.payment_configs.smtp_secure IS 'Use TLS/SSL for SMTP connection';
COMMENT ON COLUMN public.payment_configs.smtp_user IS 'SMTP authentication username';
COMMENT ON COLUMN public.payment_configs.smtp_password IS 'SMTP authentication password';
COMMENT ON COLUMN public.payment_configs.smtp_from_email IS 'From email address for outgoing emails';
COMMENT ON COLUMN public.payment_configs.smtp_from_name IS 'From name for outgoing emails';