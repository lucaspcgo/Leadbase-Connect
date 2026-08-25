
CREATE OR REPLACE FUNCTION public.get_empresa_stats()
RETURNS TABLE(
  stat_type text,
  stat_name text,
  stat_value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- UF counts (top 10)
  RETURN QUERY
  SELECT 'uf'::text, COALESCE(e.uf, 'N/D')::text, COUNT(*)::bigint
  FROM empresas e
  GROUP BY e.uf
  ORDER BY COUNT(*) DESC
  LIMIT 10;

  -- Situação cadastral counts
  RETURN QUERY
  SELECT 'situacao'::text, COALESCE(e.sit_cadastral, 'N/D')::text, COUNT(*)::bigint
  FROM empresas e
  GROUP BY e.sit_cadastral
  ORDER BY COUNT(*) DESC;

  -- Porte counts
  RETURN QUERY
  SELECT 'porte'::text, COALESCE(e.porte_empresa, 'N/D')::text, COUNT(*)::bigint
  FROM empresas e
  GROUP BY e.porte_empresa
  ORDER BY COUNT(*) DESC;
END;
$function$;
