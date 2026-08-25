
-- Create materialized view for filter options (much faster than scanning 2M+ rows)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.empresas_filter_options AS
SELECT DISTINCT 'cnae'::text as tipo, 
  COALESCE(NULLIF(cnae_fiscal, ''), cnae_codigo) as valor
FROM empresas
WHERE cnae_codigo IS NOT NULL AND cnae_codigo != ''
UNION ALL
SELECT DISTINCT 'municipio'::text as tipo, municipio as valor
FROM empresas
WHERE municipio IS NOT NULL AND municipio != ''
UNION ALL
SELECT DISTINCT 'uf'::text as tipo, uf as valor
FROM empresas
WHERE uf IS NOT NULL AND uf != '';

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_filter_options_tipo ON public.empresas_filter_options(tipo);
CREATE INDEX IF NOT EXISTS idx_filter_options_valor ON public.empresas_filter_options(valor);

-- Create function to refresh filter options (run after imports)
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
END;
$$;

-- Optimize the get_filter_options function to use materialized view
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try to use materialized view first (much faster)
  RETURN QUERY
  SELECT fo.tipo, fo.valor
  FROM empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != '';
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT DISTINCT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo)
    FROM empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    LIMIT 500;
    
    RETURN QUERY
    SELECT DISTINCT 'municipio'::text, e.municipio
    FROM empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    LIMIT 500;
    
    RETURN;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.empresas_filter_options TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_filter_options() TO authenticated;
