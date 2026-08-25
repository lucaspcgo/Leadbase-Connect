-- Drop the function first because the return type is changing
DROP FUNCTION IF EXISTS public.get_filter_options();

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS public.empresas_filter_options;

-- Recreate materialized view with counts
CREATE MATERIALIZED VIEW public.empresas_filter_options AS
-- CNAEs
SELECT 
    'cnae'::text AS tipo,
    CASE
        WHEN ((e.cnae_fiscal IS NOT NULL) AND (e.cnae_fiscal <> ''::text)) THEN
        CASE
            WHEN (e.cnae_fiscal ~ '^\d+ - '::text) THEN ((lpad(split_part(e.cnae_fiscal, ' - '::text, 1), 7, '0'::text) || ' - '::text) || split_part(e.cnae_fiscal, ' - '::text, 2))
            ELSE e.cnae_fiscal
        END
        ELSE lpad(e.cnae_codigo, 7, '0'::text)
    END AS valor,
    NULL::text AS uf,
    count(*) as contagem
FROM public.empresas e
WHERE ((e.cnae_codigo IS NOT NULL) AND (e.cnae_codigo <> ''::text))
GROUP BY 1, 2, 3

UNION ALL

-- Municipios
SELECT 
    'municipio'::text AS tipo,
    e.municipio AS valor,
    e.uf,
    count(*) as contagem
FROM public.empresas e
WHERE ((e.municipio IS NOT NULL) AND (e.municipio <> ''::text))
GROUP BY 1, 2, 3

UNION ALL

-- UFs
SELECT 
    'uf'::text AS tipo,
    e.uf AS valor,
    e.uf,
    count(*) as contagem
FROM public.empresas e
WHERE ((e.uf IS NOT NULL) AND (e.uf <> ''::text))
GROUP BY 1, 2, 3;

-- Recreate index for performance
CREATE INDEX idx_filter_options_tipo_valor ON public.empresas_filter_options (tipo, valor);

-- Create the RPC function with the new return type
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text, uf text, contagem bigint) AS $$
BEGIN
  -- Use materialized view
  RETURN QUERY
  SELECT fo.tipo, fo.valor, fo.uf, fo.contagem
  FROM public.empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != ''
  ORDER BY fo.contagem DESC;
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), lpad(e.cnae_codigo, 7, '0'::text)),
      NULL::text,
      count(*) as contagem
    FROM public.empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    GROUP BY 1, 2, 3
    LIMIT 500;
    
    RETURN QUERY
    SELECT 'municipio'::text, e.municipio, e.uf, count(*) as contagem
    FROM public.empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    GROUP BY 1, 2, 3
    LIMIT 500;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
