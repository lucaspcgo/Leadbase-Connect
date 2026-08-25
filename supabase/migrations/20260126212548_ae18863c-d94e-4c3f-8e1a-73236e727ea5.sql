-- Create a public function to get payment config enabled status (no secrets exposed)
-- This allows the checkout page to know which payment methods are available
CREATE OR REPLACE FUNCTION public.get_public_payment_config()
RETURNS TABLE (
  pix_enabled boolean,
  pix_beneficiario text,
  pix_cidade text,
  mercado_pago_enabled boolean,
  paypal_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pc.pix_enabled, false) as pix_enabled,
    pc.pix_beneficiario,
    pc.pix_cidade,
    COALESCE(pc.mercado_pago_enabled, false) as mercado_pago_enabled,
    COALESCE(pc.paypal_enabled, false) as paypal_enabled
  FROM payment_configs pc
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO authenticated;