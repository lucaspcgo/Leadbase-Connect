
-- Remove materialized view from public API exposure via PostgREST
-- Hide it from the API by removing from public schema or using RLS

-- Add RLS policy to the materialized view (but since it's read-only public data, we allow anyone authenticated)
-- Actually, materialized views don't support RLS, so we need to exclude it from the API via config
-- The safest approach is to remove the direct grant and only access via function

-- Revoke direct SELECT access, keep function access only
REVOKE SELECT ON public.empresas_filter_options FROM authenticated;
REVOKE SELECT ON public.empresas_filter_options FROM anon;

-- The function get_filter_options will still work because it's SECURITY DEFINER
-- This means the API cannot query the materialized view directly
