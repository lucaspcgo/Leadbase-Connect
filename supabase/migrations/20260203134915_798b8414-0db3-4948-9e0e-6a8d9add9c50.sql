-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS public.get_filter_options();

-- Recreate the materialized view to include UF with municipality
DROP MATERIALIZED VIEW IF EXISTS public.empresas_filter_options CASCADE;

CREATE MATERIALIZED VIEW public.empresas_filter_options AS
SELECT DISTINCT 'cnae'::text AS tipo,
    COALESCE(NULLIF(empresas.cnae_fiscal, ''::text), empresas.cnae_codigo) AS valor,
    NULL::text AS uf
   FROM empresas
  WHERE ((empresas.cnae_codigo IS NOT NULL) AND (empresas.cnae_codigo <> ''::text))
UNION ALL
 SELECT DISTINCT 'municipio'::text AS tipo,
    empresas.municipio AS valor,
    empresas.uf AS uf
   FROM empresas
  WHERE ((empresas.municipio IS NOT NULL) AND (empresas.municipio <> ''::text))
UNION ALL
 SELECT DISTINCT 'uf'::text AS tipo,
    empresas.uf AS valor,
    empresas.uf AS uf
   FROM empresas
  WHERE ((empresas.uf IS NOT NULL) AND (empresas.uf <> ''::text))
WITH DATA;

-- Create index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_filter_options_unique 
ON public.empresas_filter_options (tipo, valor, uf) 
WHERE uf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_empresas_filter_options_tipo 
ON public.empresas_filter_options (tipo);

CREATE INDEX IF NOT EXISTS idx_empresas_filter_options_uf 
ON public.empresas_filter_options (uf) 
WHERE tipo = 'municipio';

-- Recreate the RPC function with new return type including UF
CREATE OR REPLACE FUNCTION public.get_filter_options()
 RETURNS TABLE(tipo text, valor text, uf text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use materialized view (much faster)
  RETURN QUERY
  SELECT fo.tipo, fo.valor, fo.uf
  FROM empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != '';
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT DISTINCT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo),
      NULL::text
    FROM empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    LIMIT 500;
    
    RETURN QUERY
    SELECT DISTINCT 'municipio'::text, e.municipio, e.uf
    FROM empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    LIMIT 500;
    
    RETURN;
END;
$function$;