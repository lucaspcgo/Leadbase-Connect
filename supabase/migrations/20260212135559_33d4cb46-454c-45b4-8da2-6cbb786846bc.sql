
CREATE OR REPLACE FUNCTION public.get_cnaes_grouped()
 RETURNS TABLE(cnae_codigo text, cnae_fiscal text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '30s'
AS $function$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.cnae_codigo,
    MAX(e.cnae_fiscal) as cnae_fiscal,
    COUNT(*)::BIGINT as count
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
  GROUP BY e.cnae_codigo
  ORDER BY count DESC;
END;
$function$;
