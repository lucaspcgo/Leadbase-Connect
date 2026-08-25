-- Drop and recreate get_filter_options with better performance
-- Use LIMIT to avoid timeout on large tables
DROP FUNCTION IF EXISTS public.get_filter_options();

CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
BEGIN
  -- Return distinct CNAEs - limit to most common 500 for performance
  RETURN QUERY
  SELECT DISTINCT 'cnae'::text as tipo, 
    COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo) as valor
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
  LIMIT 500;
  
  -- Return distinct municipalities - limit to most common 500
  RETURN QUERY
  SELECT DISTINCT 'municipio'::text as tipo, e.municipio as valor
  FROM empresas e
  WHERE e.municipio IS NOT NULL AND e.municipio != ''
  LIMIT 500;
  
  RETURN;
END;
$function$;

-- Create indexes to speed up CNAE and municipio queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_empresas_cnae_codigo ON empresas(cnae_codigo) WHERE cnae_codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_cnae_fiscal ON empresas(cnae_fiscal) WHERE cnae_fiscal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_municipio ON empresas(municipio) WHERE municipio IS NOT NULL;