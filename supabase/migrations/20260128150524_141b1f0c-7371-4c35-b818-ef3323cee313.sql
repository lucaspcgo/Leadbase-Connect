-- Drop the existing constraint and recreate with STRIPE included
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_method_check;

-- Add new constraint including STRIPE
ALTER TABLE public.payments 
ADD CONSTRAINT payments_method_check 
CHECK (method IN ('PIX', 'MERCADO_PAGO', 'PAYPAL', 'STRIPE', 'CREDIT_CARD'));