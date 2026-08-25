-- Create a function to get PIX config for checkout (includes the key for QR code generation)
CREATE OR REPLACE FUNCTION public.get_pix_checkout_config()
RETURNS TABLE (
  pix_enabled boolean,
  pix_chave text,
  pix_tipo_chave text,
  pix_beneficiario text,
  pix_cidade text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can get PIX config for checkout
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(pc.pix_enabled, false) as pix_enabled,
    pc.pix_chave,
    pc.pix_tipo_chave,
    pc.pix_beneficiario,
    pc.pix_cidade
  FROM payment_configs pc
  LIMIT 1;
END;
$$;