-- Revogar execução pública por padrão para segurança
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- generate_referral_code
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated;

-- handle_new_user (Trigger function - used by service_role)
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- validate_api_key
ALTER FUNCTION public.validate_api_key(text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_api_key(text) TO authenticated;

-- get_empresa_stats
ALTER FUNCTION public.get_empresa_stats() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_empresa_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empresa_stats() TO authenticated;

-- get_affiliate_by_code
ALTER FUNCTION public.get_affiliate_by_code(text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_affiliate_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_by_code(text) TO authenticated;

-- get_public_payment_config
ALTER FUNCTION public.get_public_payment_config() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_public_payment_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO authenticated;

-- trigger_refresh_filter_options
ALTER FUNCTION public.trigger_refresh_filter_options() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.trigger_refresh_filter_options() FROM PUBLIC;

-- get_empresa_for_unlock
ALTER FUNCTION public.get_empresa_for_unlock(bigint) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_empresa_for_unlock(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empresa_for_unlock(bigint) TO authenticated;

-- is_admin
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- log_search_performance (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_search_performance') THEN
        ALTER FUNCTION public.log_search_performance(text, integer, integer, uuid) SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.log_search_performance(text, integer, integer, uuid) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.log_search_performance(text, integer, integer, uuid) TO authenticated;
    END IF;
END $$;
