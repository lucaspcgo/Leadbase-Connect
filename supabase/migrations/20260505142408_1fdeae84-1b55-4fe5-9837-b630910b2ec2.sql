-- Drop the existing unique index that was too restrictive
DROP INDEX IF EXISTS public.idx_empresas_filter_options_unique;

-- Create a new unique index that covers all rows, including those with NULL uf (like CNAEs)
-- In PG 15+ we can use NULLS NOT DISTINCT
CREATE UNIQUE INDEX idx_empresas_filter_options_unique 
ON public.empresas_filter_options (tipo, valor, uf) NULLS NOT DISTINCT;

-- Now refresh the view to make sure everything is in sync
REFRESH MATERIALIZED VIEW public.empresas_filter_options;