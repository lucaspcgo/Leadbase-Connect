-- Create a public function to get distinct CNAEs for filter dropdown (available to all authenticated users)
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE (
  tipo text,
  valor text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return distinct CNAEs
  RETURN QUERY
  SELECT DISTINCT 'cnae'::text as tipo, e.cnae_codigo as valor
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
  
  UNION ALL
  
  SELECT DISTINCT 'cnae'::text as tipo, e.cnae_fiscal as valor
  FROM empresas e
  WHERE e.cnae_fiscal IS NOT NULL AND e.cnae_fiscal != '' AND e.cnae_fiscal != e.cnae_codigo
  
  UNION ALL
  
  -- Return distinct municipalities
  SELECT DISTINCT 'municipio'::text as tipo, e.municipio as valor
  FROM empresas e
  WHERE e.municipio IS NOT NULL AND e.municipio != ''
  
  ORDER BY tipo, valor;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_filter_options() TO authenticated;