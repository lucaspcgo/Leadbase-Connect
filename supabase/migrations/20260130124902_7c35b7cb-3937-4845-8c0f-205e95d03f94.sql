
-- Add unique index to allow CONCURRENTLY refresh (requires unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_filter_options_unique 
ON public.empresas_filter_options(tipo, valor);

-- Update the refresh function to handle case when CONCURRENTLY fails
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try concurrent refresh first (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to regular refresh if concurrent fails
      REFRESH MATERIALIZED VIEW public.empresas_filter_options;
  END;
END;
$$;
