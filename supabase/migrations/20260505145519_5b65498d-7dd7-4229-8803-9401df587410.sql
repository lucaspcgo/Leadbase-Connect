CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_empresas_cnaes_secundarios_trgm ON public.empresas USING gin (cnaes_secundarios gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empresas_razao_social_trgm ON public.empresas USING gin (razao_social gin_trgm_ops);
