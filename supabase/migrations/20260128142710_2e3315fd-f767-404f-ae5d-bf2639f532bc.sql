-- Add Stripe configuration columns to payment_configs table
ALTER TABLE public.payment_configs 
ADD COLUMN IF NOT EXISTS stripe_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
ADD COLUMN IF NOT EXISTS stripe_secret_key text,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret text,
ADD COLUMN IF NOT EXISTS stripe_sandbox_mode boolean DEFAULT true;