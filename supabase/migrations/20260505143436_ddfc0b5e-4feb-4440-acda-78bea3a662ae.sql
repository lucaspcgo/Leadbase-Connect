-- Update materialized view to normalize CNAE codes in the filter dropdown
DROP MATERIALIZED VIEW IF EXISTS public.empresas_filter_options;

CREATE MATERIALIZED VIEW public.empresas_filter_options AS
 SELECT DISTINCT 'cnae'::text AS tipo,
    CASE 
      WHEN empresas.cnae_fiscal IS NOT NULL AND empresas.cnae_fiscal != '' THEN 
        CASE 
          WHEN empresas.cnae_fiscal ~ '^\d+ - ' THEN
            LPAD(split_part(empresas.cnae_fiscal, ' - ', 1), 7, '0') || ' - ' || split_part(empresas.cnae_fiscal, ' - ', 2)
          ELSE empresas.cnae_fiscal
        END
      ELSE LPAD(empresas.cnae_codigo, 7, '0')
    END AS valor,
    NULL::text AS uf
   FROM empresas
  WHERE empresas.cnae_codigo IS NOT NULL AND empresas.cnae_codigo != ''
UNION ALL
 SELECT DISTINCT 'municipio'::text AS tipo,
    empresas.municipio AS valor,
    empresas.uf
   FROM empresas
  WHERE empresas.municipio IS NOT NULL AND empresas.municipio != ''
UNION ALL
 SELECT DISTINCT 'uf'::text AS tipo,
    empresas.uf AS valor,
    empresas.uf
   FROM empresas
  WHERE empresas.uf IS NOT NULL AND empresas.uf != '';

CREATE INDEX IF NOT EXISTS idx_empresas_filter_options_tipo_valor ON public.empresas_filter_options (tipo, valor);
