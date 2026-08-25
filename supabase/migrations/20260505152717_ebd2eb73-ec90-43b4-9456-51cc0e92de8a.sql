-- Create a unique index to allow CONCURRENTLY refresh
-- We use COALESCE for 'uf' because it can be NULL and unique indexes treat NULLs as distinct
CREATE UNIQUE INDEX IF NOT EXISTS idx_filter_options_unique_concurrent 
ON public.empresas_filter_options (tipo, valor, COALESCE(uf, ''));

-- Update refresh_filter_options to be more robust
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Now that we have a unique index, CONCURRENTLY should work
  -- We still use a block to handle cases where it might fail (e.g. if the view is being created)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
  EXCEPTION
    WHEN OTHERS THEN
      REFRESH MATERIALIZED VIEW public.empresas_filter_options;
  END;
END;
$function$;

-- Add search_path to get_filter_options
CREATE OR REPLACE FUNCTION public.get_filter_options()
 RETURNS TABLE(tipo text, valor text, uf text, contagem bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
