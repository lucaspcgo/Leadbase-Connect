CREATE INDEX IF NOT EXISTS idx_empresas_cnaes_secundarios_array_expr 
ON public.empresas USING gin (string_to_array(cnaes_secundarios, ','));
