-- Re-create the logging function if it was accidentally dropped or misconfigured
CREATE OR REPLACE FUNCTION public.log_search_performance(
    p_search_type text,
    p_execution_time_ms integer,
    p_results_count integer,
    p_user_id uuid,
    p_filters jsonb DEFAULT NULL,
    p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.search_performance_logs (
        search_type,
        execution_time_ms,
        results_count,
        user_id,
        filters,
        error_message
    ) VALUES (
        p_search_type,
        p_execution_time_ms,
        p_results_count,
        p_user_id,
        p_filters,
        p_error_message
    );
END;
$$;

-- Grant permissions for logging
REVOKE ALL ON FUNCTION public.log_search_performance(text, integer, integer, uuid, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_search_performance(text, integer, integer, uuid, jsonb, text) TO authenticated;

-- Ensure get_empresas_public has correct search_path and permissions
-- The definition was retrieved earlier, we just ensure it's properly set up
ALTER FUNCTION public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, uuid, boolean, boolean, boolean, date, date, text[], text, text) 
SET search_path TO 'public';

REVOKE ALL ON FUNCTION public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, uuid, boolean, boolean, boolean, date, date, text[], text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, uuid, boolean, boolean, boolean, date, date, text[], text, text) TO authenticated;
