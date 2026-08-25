-- Create a composite index to help with sorting by activity date within a city
CREATE INDEX IF NOT EXISTS idx_empresas_uf_mun_data_sort 
ON public.empresas (uf, municipio, data_inicio_atividade DESC NULLS LAST, id DESC);

-- Also optimize the primary CNAE + UF + Mun
CREATE INDEX IF NOT EXISTS idx_empresas_uf_mun_cnae_fiscal 
ON public.empresas (uf, municipio, cnae_fiscal);
