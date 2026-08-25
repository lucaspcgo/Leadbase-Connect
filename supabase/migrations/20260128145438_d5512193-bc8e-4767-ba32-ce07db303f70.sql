-- Drop existing function and recreate with stripe_enabled
DROP FUNCTION IF EXISTS public.get_public_payment_config();

CREATE FUNCTION public.get_public_payment_config()
 RETURNS TABLE(pix_enabled boolean, pix_beneficiario text, pix_cidade text, mercado_pago_enabled boolean, paypal_enabled boolean, stripe_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pc.pix_enabled, false) as pix_enabled,
    pc.pix_beneficiario,
    pc.pix_cidade,
    COALESCE(pc.mercado_pago_enabled, false) as mercado_pago_enabled,
    COALESCE(pc.paypal_enabled, false) as paypal_enabled,
    COALESCE(pc.stripe_enabled, false) as stripe_enabled
  FROM payment_configs pc
  LIMIT 1;
END;
$function$;