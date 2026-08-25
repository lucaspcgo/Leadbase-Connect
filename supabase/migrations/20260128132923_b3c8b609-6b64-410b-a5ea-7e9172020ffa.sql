
-- Fix get_filter_options to avoid CNAE duplication
-- The issue is that cnae_codigo and cnae_fiscal often contain different formats of the same CNAE
-- We should prefer cnae_fiscal as it contains the full description

CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return distinct CNAEs - prefer cnae_fiscal (has full description)
  -- If cnae_fiscal is null, fall back to cnae_codigo
  RETURN QUERY
  SELECT DISTINCT 'cnae'::text as tipo, 
    COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo) as valor
  FROM empresas e
  WHERE (e.cnae_fiscal IS NOT NULL AND e.cnae_fiscal != '') 
     OR (e.cnae_codigo IS NOT NULL AND e.cnae_codigo != '')
  
  UNION ALL
  
  -- Return distinct municipalities
  SELECT DISTINCT 'municipio'::text as tipo, e.municipio as valor
  FROM empresas e
  WHERE e.municipio IS NOT NULL AND e.municipio != ''
  
  ORDER BY tipo, valor;
END;
$$;
