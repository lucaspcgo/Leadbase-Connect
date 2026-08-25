-- Refresh filter options when empresas are added/updated/deleted
-- This ensures CNAEs and municipalities entered manually appear in search filters

CREATE OR REPLACE FUNCTION public.trigger_refresh_filter_options()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use pg_notify to refresh asynchronously (non-blocking)
  -- This avoids slowing down inserts on large batches
  PERFORM pg_notify('refresh_filter_options', '');
  RETURN NULL;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS empresas_refresh_filters ON public.empresas;

-- Create a statement-level trigger (fires once per statement, not per row)
-- This is efficient for both single inserts and bulk imports
CREATE TRIGGER empresas_refresh_filters
AFTER INSERT OR UPDATE OF cnae_codigo, cnae_fiscal, municipio, uf OR DELETE
ON public.empresas
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_filter_options();

-- Immediately refresh the materialized view to pick up any existing data
REFRESH MATERIALIZED VIEW public.empresas_filter_options;