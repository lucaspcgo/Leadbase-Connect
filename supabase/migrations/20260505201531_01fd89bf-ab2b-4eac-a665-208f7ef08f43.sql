-- Make refresh_filter_options resilient: disable statement_timeout inside the function
-- so that large refreshes (2.5M+ rows) complete instead of silently failing.
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '0'
AS $function$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
  EXCEPTION
    WHEN OTHERS THEN
      REFRESH MATERIALIZED VIEW public.empresas_filter_options;
  END;
END;
$function$;

-- Also refresh immediately so newly imported CNAEs (0112101, 0111399, etc.) show up now
SELECT public.refresh_filter_options();