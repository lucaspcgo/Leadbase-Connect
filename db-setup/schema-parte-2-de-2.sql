-- =====================================================================
--  LeadsBasePro - schema completo
--  PARTE 2 de 2. Gerado a partir das 104 migracoes em supabase/migrations/,
--  concatenadas em ordem cronologica.
--
--  COMO USAR: cole no SQL Editor de um projeto Supabase NOVO/VAZIO
--  e execute. Rode os arquivos na ordem (parte 1, 2, 3...).
--
--  Cria apenas a ESTRUTURA (tabelas, RLS, funcoes, triggers).
--  Nao contem dados.
-- =====================================================================



-- ---------------------------------------------------------------
-- 20260505150733_4416f7ce-5536-4a89-9d3c-4237bb0ada3a.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10, 
  p_offset integer DEFAULT 0, 
  p_uf text DEFAULT NULL::text, 
  p_municipio text DEFAULT NULL::text, 
  p_sit_cadastral text DEFAULT NULL::text, 
  p_porte text DEFAULT NULL::text, 
  p_cnae text DEFAULT NULL::text, 
  p_simples text DEFAULT NULL::text, 
  p_mei text DEFAULT NULL::text, 
  p_matriz_filial text DEFAULT NULL::text, 
  p_categoria_id uuid DEFAULT NULL::uuid, 
  p_has_email boolean DEFAULT NULL::boolean, 
  p_has_phone boolean DEFAULT NULL::boolean, 
  p_has_socios boolean DEFAULT NULL::boolean, 
  p_data_abertura_inicio date DEFAULT NULL::date, 
  p_data_abertura_fim date DEFAULT NULL::date, 
  p_tags text[] DEFAULT NULL::text[], 
  p_busca_socio text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code and normalize
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
    v_cnae_code_nolead := ltrim(v_cnae_clean, '0');
    IF v_cnae_code_nolead = '' AND v_cnae_clean != '' THEN v_cnae_code_nolead := '0'; END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- Increase timeout to 30s to handle large datasets
  SET LOCAL statement_timeout = '30s';

  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    -- Optimized count for CNAE searches using UNION
    IF v_cnae_code IS NOT NULL THEN
      SELECT COUNT(*) INTO v_total FROM (
        SELECT id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND emp.cnae_codigo = v_cnae_code
        UNION
        SELECT id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND emp.cnae_fiscal = v_cnae_code
        UNION
        SELECT id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead
        UNION
        SELECT id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
      ) AS count_subquery;
      
      -- If there are other filters besides UF, Mun and CNAE, we need a more restrictive count.
      -- However, for the most common case (UF + Mun + CNAE), the above is correct and fast.
      -- If other filters exist, we'll apply them in a second pass if needed, 
      -- but for simplicity and performance, we'll assume the primary filters are UF+Mun+CNAE.
    ELSE
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
            (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
            (NOT v_is_cnpj_search AND (
              emp.razao_social ILIKE '%' || p_search || '%' OR 
              emp.nome_fantasia ILIKE '%' || p_search || '%' OR
              emp.cnpj ILIKE '%' || v_search_digits || '%'
            ))
        );
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL),
    (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL),
    (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'),
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR 
         emp.cnae_codigo = v_cnae_code OR
         emp.cnae_fiscal = v_cnae_code OR
         ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead OR 
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean] OR
         emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
        (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
        (NOT v_is_cnpj_search AND (
          emp.razao_social ILIKE '%' || p_search || '%' OR 
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.cnpj ILIKE '%' || v_search_digits || '%'
        ))
    )
  ORDER BY emp.data_inicio_atividade DESC NULLS LAST, emp.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$



-- ---------------------------------------------------------------
-- 20260505150759_7c19d2af-bdd8-47ce-82cb-ee5a74336fd8.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10, 
  p_offset integer DEFAULT 0, 
  p_uf text DEFAULT NULL::text, 
  p_municipio text DEFAULT NULL::text, 
  p_sit_cadastral text DEFAULT NULL::text, 
  p_porte text DEFAULT NULL::text, 
  p_cnae text DEFAULT NULL::text, 
  p_simples text DEFAULT NULL::text, 
  p_mei text DEFAULT NULL::text, 
  p_matriz_filial text DEFAULT NULL::text, 
  p_categoria_id uuid DEFAULT NULL::uuid, 
  p_has_email boolean DEFAULT NULL::boolean, 
  p_has_phone boolean DEFAULT NULL::boolean, 
  p_has_socios boolean DEFAULT NULL::boolean, 
  p_data_abertura_inicio date DEFAULT NULL::date, 
  p_data_abertura_fim date DEFAULT NULL::date, 
  p_tags text[] DEFAULT NULL::text[], 
  p_busca_socio text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code and normalize
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
    v_cnae_code_nolead := ltrim(v_cnae_clean, '0');
    IF v_cnae_code_nolead = '' AND v_cnae_clean != '' THEN v_cnae_code_nolead := '0'; END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- Increase timeout to 30s to handle large datasets
  SET LOCAL statement_timeout = '30s';

  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    -- Optimized count for CNAE searches using UNION
    IF v_cnae_code IS NOT NULL THEN
      SELECT COUNT(*) INTO v_total FROM (
        SELECT emp.id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND emp.cnae_codigo = v_cnae_code
        UNION
        SELECT emp.id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND emp.cnae_fiscal = v_cnae_code
        UNION
        SELECT emp.id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead
        UNION
        SELECT emp.id FROM public.empresas emp WHERE (p_uf IS NULL OR emp.uf = p_uf) AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) AND string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
      ) AS count_subquery;
    ELSE
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
            (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
            (NOT v_is_cnpj_search AND (
              emp.razao_social ILIKE '%' || p_search || '%' OR 
              emp.nome_fantasia ILIKE '%' || p_search || '%' OR
              emp.cnpj ILIKE '%' || v_search_digits || '%'
            ))
        );
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL),
    (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL),
    (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'),
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR 
         emp.cnae_codigo = v_cnae_code OR
         emp.cnae_fiscal = v_cnae_code OR
         ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead OR 
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean] OR
         emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
        (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
        (NOT v_is_cnpj_search AND (
          emp.razao_social ILIKE '%' || p_search || '%' OR 
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.cnpj ILIKE '%' || v_search_digits || '%'
        ))
    )
  ORDER BY emp.data_inicio_atividade DESC NULLS LAST, emp.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$



-- ---------------------------------------------------------------
-- 20260505150958_bbc59b22-1ff1-4fc0-b28c-34800045007b.sql
-- ---------------------------------------------------------------
-- Create a table to store search performance metrics
CREATE TABLE IF NOT EXISTS public.search_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_type TEXT NOT NULL,
    filters JSONB,
    execution_time_ms INTEGER NOT NULL,
    results_count INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.search_performance_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Users can insert search logs" 
ON public.search_performance_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to view logs (for dashboard/monitoring)
CREATE POLICY "Users can view search logs" 
ON public.search_performance_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Add index for performance analysis
CREATE INDEX idx_search_logs_type_created ON public.search_performance_logs (search_type, created_at DESC);
CREATE INDEX idx_search_logs_execution_time ON public.search_performance_logs (execution_time_ms);


-- ---------------------------------------------------------------
-- 20260505151121_074dfd56-240c-42dc-bfbd-e331b0274d29.sql
-- ---------------------------------------------------------------
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



-- ---------------------------------------------------------------
-- 20260505151714_8c694a5f-be9e-4553-be6f-a247ddc2a91b.sql
-- ---------------------------------------------------------------
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



-- ---------------------------------------------------------------
-- 20260505152717_ebd2eb73-ec90-43b4-9456-51cc0e92de8a.sql
-- ---------------------------------------------------------------
-- Create a unique index to allow CONCURRENTLY refresh
-- We use COALESCE for 'uf' because it can be NULL and unique indexes treat NULLs as distinct
CREATE UNIQUE INDEX IF NOT EXISTS idx_filter_options_unique_concurrent 
ON public.empresas_filter_options (tipo, valor, COALESCE(uf, ''));

-- Update refresh_filter_options to be more robust
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Now that we have a unique index, CONCURRENTLY should work
  -- We still use a block to handle cases where it might fail (e.g. if the view is being created)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
  EXCEPTION
    WHEN OTHERS THEN
      REFRESH MATERIALIZED VIEW public.empresas_filter_options;
  END;
END;
$function$;

-- Add search_path to get_filter_options
CREATE OR REPLACE FUNCTION public.get_filter_options()
 RETURNS TABLE(tipo text, valor text, uf text, contagem bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use materialized view
  RETURN QUERY
  SELECT fo.tipo, fo.valor, fo.uf, fo.contagem
  FROM public.empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != ''
  ORDER BY fo.contagem DESC;
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), lpad(e.cnae_codigo, 7, '0'::text)),
      NULL::text,
      count(*) as contagem
    FROM public.empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    GROUP BY 1, 2, 3
    LIMIT 500;
    
    RETURN QUERY
    SELECT 'municipio'::text, e.municipio, e.uf, count(*) as contagem
    FROM public.empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    GROUP BY 1, 2, 3
    LIMIT 500;
    
    RETURN;
END;
$function$;



-- ---------------------------------------------------------------
-- 20260505201531_01fd89bf-ab2b-4eac-a665-208f7ef08f43.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260505201916_52461d9e-e17b-4983-8382-ac3a9bb9a661.sql
-- ---------------------------------------------------------------
-- Update get_empresas_public to fix CNAE search ambiguity
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Cleanup and normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code (digits only) for exact matching
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    -- Get only the numeric part from "0112101 - CULTIVO..." -> "0112101"
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  -- Determine if we have any filters to optimize count
  v_has_filters := (p_uf IS NOT NULL OR p_municipio IS NOT NULL OR p_sit_cadastral IS NOT NULL OR 
                   p_porte IS NOT NULL OR v_cnae_code IS NOT NULL OR p_simples IS NOT NULL OR 
                   p_mei IS NOT NULL OR p_matriz_filial IS NOT NULL OR p_categoria_id IS NOT NULL OR 
                   p_has_email IS NOT NULL OR p_has_phone IS NOT NULL OR p_has_socios IS NOT NULL OR 
                   p_data_abertura_inicio IS NOT NULL OR p_data_abertura_fim IS NOT NULL OR 
                   p_tags IS NOT NULL OR p_busca_socio IS NOT NULL OR p_search IS NOT NULL);

  IF NOT v_has_filters THEN
    -- If no filters, use estimate for performance
    SELECT reltuples::BIGINT INTO v_total FROM pg_class 
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    -- Optimized count for CNAE searches
    IF v_cnae_clean IS NOT NULL THEN
      SELECT COUNT(*) INTO v_total FROM (
        SELECT emp.id FROM public.empresas emp 
        WHERE (p_uf IS NULL OR emp.uf = p_uf) 
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) 
        AND (
          emp.cnae_codigo = v_cnae_clean OR 
          split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
          string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
        )
      ) AS count_subquery;
    ELSE
      -- Fallback generic count (limited for performance if too complex, but usually fine)
      v_total := 100000; -- Placeholder if count takes too long, or run exact count
      -- For this specific fix, we focus on the CNAE path
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    emp.has_email,
    emp.has_phone,
    emp.has_socios,
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_clean IS NULL OR (
         emp.cnae_codigo = v_cnae_clean OR 
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR emp.has_email = p_has_email)
    AND (p_has_phone IS NULL OR emp.has_phone = p_has_phone)
    AND (p_has_socios IS NULL OR emp.has_socios = p_has_socios)
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(emp.socios) s 
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN 
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR 
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260505202138_b0ec37f2-3ae3-449a-9a4c-0af92a7a6de2.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Cleanup and normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code (digits only) for exact matching
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  -- Count logic remains same as before but uses virtual fields or expressions
  v_has_filters := (p_uf IS NOT NULL OR p_municipio IS NOT NULL OR p_sit_cadastral IS NOT NULL OR 
                   p_porte IS NOT NULL OR v_cnae_code IS NOT NULL OR p_simples IS NOT NULL OR 
                   p_mei IS NOT NULL OR p_matriz_filial IS NOT NULL OR p_categoria_id IS NOT NULL OR 
                   p_has_email IS NOT NULL OR p_has_phone IS NOT NULL OR p_has_socios IS NOT NULL OR 
                   p_data_abertura_inicio IS NOT NULL OR p_data_abertura_fim IS NOT NULL OR 
                   p_tags IS NOT NULL OR p_busca_socio IS NOT NULL OR p_search IS NOT NULL);

  IF NOT v_has_filters THEN
    SELECT reltuples::BIGINT INTO v_total FROM pg_class 
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    SELECT COUNT(*) INTO v_total FROM (
      SELECT emp.id FROM public.empresas emp 
      WHERE (p_uf IS NULL OR emp.uf = p_uf) 
      AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) 
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_clean IS NULL OR (
           emp.cnae_codigo = v_cnae_clean OR 
           split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
           string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
      ))
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
          (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
          (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_activity >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_activity <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s 
          WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
      ))
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN 
            regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR 
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
    ) AS count_subquery;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '') as has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_clean IS NULL OR (
         emp.cnae_codigo = v_cnae_clean OR 
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s 
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN 
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR 
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260505202315_1cb074a1-71d6-4cab-8fe1-3050f1becaab.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Cleanup and normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code (digits only) for exact matching
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  -- Count logic
  v_has_filters := (p_uf IS NOT NULL OR p_municipio IS NOT NULL OR p_sit_cadastral IS NOT NULL OR 
                   p_porte IS NOT NULL OR v_cnae_code IS NOT NULL OR p_simples IS NOT NULL OR 
                   p_mei IS NOT NULL OR p_matriz_filial IS NOT NULL OR p_categoria_id IS NOT NULL OR 
                   p_has_email IS NOT NULL OR p_has_phone IS NOT NULL OR p_has_socios IS NOT NULL OR 
                   p_data_abertura_inicio IS NOT NULL OR p_data_abertura_fim IS NOT NULL OR 
                   p_tags IS NOT NULL OR p_busca_socio IS NOT NULL OR p_search IS NOT NULL);

  IF NOT v_has_filters THEN
    SELECT reltuples::BIGINT INTO v_total FROM pg_class 
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    SELECT COUNT(*) INTO v_total FROM (
      SELECT emp.id FROM public.empresas emp 
      WHERE (p_uf IS NULL OR emp.uf = p_uf) 
      AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) 
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_clean IS NULL OR (
           emp.cnae_codigo = v_cnae_clean OR 
           split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
           string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
      ))
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
          (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
          (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s 
          WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
      ))
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN 
            regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR 
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
    ) AS count_subquery;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '') as has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_clean IS NULL OR (
         emp.cnae_codigo = v_cnae_clean OR 
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s 
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN 
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR 
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260505202936_c7f9363f-1a7c-466b-b0bc-3a6e340e2186.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_clean TEXT;
  v_cnae_nolead TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- CNAE Normalization: "0112101 - CULTIVO..." -> "0112101" AND "112101"
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_clean := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_clean, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  ELSE
    v_cnae_clean := NULL;
    v_cnae_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  -- Optimized count for CNAE
  IF v_cnae_clean IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total FROM (
      SELECT 1 FROM public.empresas emp 
      WHERE (p_uf IS NULL OR emp.uf = p_uf) 
      AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean) 
      AND (
        emp.cnae_codigo = v_cnae_clean OR 
        emp.cnae_codigo = v_cnae_nolead OR
        split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
        split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_nolead OR
        string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean] OR
        string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
      )
    ) AS count_subquery;
  ELSE
    SELECT reltuples::BIGINT INTO v_total FROM pg_class 
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '') as has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_clean IS NULL OR (
         emp.cnae_codigo = v_cnae_clean OR 
         emp.cnae_codigo = v_cnae_nolead OR
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_nolead OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean] OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s 
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN 
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR 
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260506005216_57839ffc-4db9-4795-8438-80a59b19f1be.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_clean TEXT;
  v_cnae_nolead TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- CNAE Normalization: "0112101 - CULTIVO..." -> "0112101" AND "112101"
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_clean := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_clean, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  ELSE
    v_cnae_clean := NULL;
    v_cnae_nolead := NULL;
  END IF;

  -- Calculate total count with ALL filters applied for accurate pagination
  SELECT COUNT(*) INTO v_total
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_clean IS NULL OR (
         emp.cnae_codigo = v_cnae_clean OR
         emp.cnae_codigo = v_cnae_nolead OR
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_nolead OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean] OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ));

  RETURN QUERY
  SELECT
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '') as has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_clean IS NULL OR (
         emp.cnae_codigo = v_cnae_clean OR
         emp.cnae_codigo = v_cnae_nolead OR
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_clean OR
         split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_nolead OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_clean] OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260506005324_3b04ce7a-6bae-45fb-bfac-d69bf49f0e31.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_target TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- CNAE Normalization: Always pad to 7 digits for absolute precision
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_target := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
  ELSE
    v_cnae_target := NULL;
  END IF;

  -- Calculate total count with ALL filters applied
  SELECT COUNT(*) INTO v_total
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_target IS NULL OR (
         lpad(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), 7, '0') = v_cnae_target OR
         lpad(regexp_replace(split_part(emp.cnae_fiscal, ' - ', 1), '\D', '', 'g'), 7, '0') = v_cnae_target OR
         EXISTS (
           SELECT 1 FROM unnest(string_to_array(emp.cnaes_secundarios, ',')) s
           WHERE lpad(regexp_replace(s, '\D', '', 'g'), 7, '0') = v_cnae_target
         )
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ));

  RETURN QUERY
  SELECT
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '') as has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_target IS NULL OR (
         lpad(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), 7, '0') = v_cnae_target OR
         lpad(regexp_replace(split_part(emp.cnae_fiscal, ' - ', 1), '\D', '', 'g'), 7, '0') = v_cnae_target OR
         EXISTS (
           SELECT 1 FROM unnest(string_to_array(emp.cnaes_secundarios, ',')) s
           WHERE lpad(regexp_replace(s, '\D', '', 'g'), 7, '0') = v_cnae_target
         )
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN emp.socios ~ '^\[.*\]$' THEN emp.socios::jsonb ELSE '[]'::jsonb END) s
        WHERE s->>'nome' ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          regexp_replace(emp.cnpj, '\D', '', 'g') ILIKE '%' || v_search_digits || '%'
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260506010045_627e7dc6-99cd-4d1f-a56f-4fe6c8961d20.sql
-- ---------------------------------------------------------------
-- Add trigram index for faster text searches on nome_fantasia
CREATE INDEX IF NOT EXISTS idx_empresas_nome_fantasia_trgm ON public.empresas USING gin (nome_fantasia gin_trgm_ops);

-- Optimize the search function
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL::text,
  p_municipio text DEFAULT NULL::text,
  p_sit_cadastral text DEFAULT NULL::text,
  p_porte text DEFAULT NULL::text,
  p_cnae text DEFAULT NULL::text,
  p_simples text DEFAULT NULL::text,
  p_mei text DEFAULT NULL::text,
  p_matriz_filial text DEFAULT NULL::text,
  p_categoria_id uuid DEFAULT NULL::uuid,
  p_has_email boolean DEFAULT NULL::boolean,
  p_has_phone boolean DEFAULT NULL::boolean,
  p_has_socios boolean DEFAULT NULL::boolean,
  p_data_abertura_inicio date DEFAULT NULL::date,
  p_data_abertura_fim date DEFAULT NULL::date,
  p_tags text[] DEFAULT NULL::text[],
  p_busca_socio text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(
  id bigint,
  matriz_filial text,
  sit_cadastral text,
  data_sit_cadastral date,
  motivo_sit_cadastral text,
  nome_cidade_exterior text,
  cod_pais text,
  nome_pais text,
  cod_natureza_juridica text,
  data_inicio_atividade date,
  cnae_fiscal text,
  cnae_codigo text,
  uf text,
  cod_municipio text,
  municipio text,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  capital_social_empresa numeric,
  qualif_responsavel text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_target TEXT;
  v_cnae_nolead TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalization
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- CNAE Normalization
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_target := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_target, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  ELSE
    v_cnae_target := NULL;
    v_cnae_nolead := NULL;
  END IF;

  -- Use a single query for both data and count if appropriate, 
  -- but for Supabase RPCs, we often need the total_count in every row.
  -- To optimize, we'll ensure the WHERE clause is identical and uses indexes.

  RETURN QUERY
  WITH filtered_count AS (
    SELECT COUNT(*) as total
    FROM public.empresas emp
    WHERE
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_target IS NULL OR (
           emp.cnae_codigo = v_cnae_target OR
           emp.cnae_codigo = v_cnae_nolead OR
           (emp.cnae_fiscal IS NOT NULL AND (
             split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_target OR
             split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_nolead
           )) OR
           string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_target] OR
           string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
      ))
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
          (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
          (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR (
          emp.socios ILIKE '%' || p_busca_socio || '%'
      ))
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN
            (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
            (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
  )
  SELECT
    emp.id,
    emp.matriz_filial,
    emp.sit_cadastral,
    emp.data_sit_cadastral,
    emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior,
    emp.cod_pais,
    emp.nome_pais,
    emp.cod_natureza_juridica,
    emp.data_inicio_atividade,
    emp.cnae_fiscal,
    emp.cnae_codigo,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.capital_social_empresa,
    emp.qualif_responsavel,
    emp.created_at,
    emp.updated_at,
    (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '') as has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') as has_socios,
    (SELECT total FROM filtered_count)
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_target IS NULL OR (
         emp.cnae_codigo = v_cnae_target OR
         emp.cnae_codigo = v_cnae_nolead OR
         (emp.cnae_fiscal IS NOT NULL AND (
           split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_target OR
           split_part(emp.cnae_fiscal, ' - ', 1) = v_cnae_nolead
         )) OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_target] OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email = true AND (emp.email IS NOT NULL AND emp.email != '' OR emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) OR
        (p_has_email = false AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '')) OR
        (p_has_phone = false AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (p_has_socios = false AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR (
        emp.socios ILIKE '%' || p_busca_socio || '%'
    ))
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
          (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260506010845_6f6b9db0-8177-460f-8d1b-b0f64c3ef4ef.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10, p_offset integer DEFAULT 0,
  p_uf text DEFAULT NULL, p_municipio text DEFAULT NULL,
  p_sit_cadastral text DEFAULT NULL, p_porte text DEFAULT NULL,
  p_cnae text DEFAULT NULL, p_simples text DEFAULT NULL,
  p_mei text DEFAULT NULL, p_matriz_filial text DEFAULT NULL,
  p_categoria_id uuid DEFAULT NULL, p_has_email boolean DEFAULT NULL,
  p_has_phone boolean DEFAULT NULL, p_has_socios boolean DEFAULT NULL,
  p_data_abertura_inicio date DEFAULT NULL, p_data_abertura_fim date DEFAULT NULL,
  p_tags text[] DEFAULT NULL, p_busca_socio text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_target TEXT;
  v_cnae_nolead TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
  v_count_cap INT := 10001;
BEGIN
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_target := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_target, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  END IF;

  -- Capped count: stop at 10001 to avoid timeouts on huge result sets
  SELECT COUNT(*) INTO v_total FROM (
    SELECT 1 FROM public.empresas emp
    WHERE
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_target IS NULL OR (
           emp.cnae_codigo = v_cnae_target OR
           emp.cnae_codigo = v_cnae_nolead OR
           string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_target] OR
           string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
      ))
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
          (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
          (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN
            (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
            (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
    LIMIT v_count_cap
  ) sub;

  RETURN QUERY
  SELECT
    emp.id, emp.matriz_filial, emp.sit_cadastral, emp.data_sit_cadastral, emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior, emp.cod_pais, emp.nome_pais, emp.cod_natureza_juridica, emp.data_inicio_atividade,
    emp.cnae_fiscal, emp.cnae_codigo, emp.uf, emp.cod_municipio, emp.municipio, emp.porte_empresa,
    emp.opcao_simples, emp.data_opcao_simples, emp.data_exclusao_simples, emp.opcao_mei,
    emp.sit_especial, emp.data_sit_especial, emp.cnaes_secundarios, emp.categoria_id, emp.tags,
    emp.capital_social_empresa, emp.qualif_responsavel, emp.created_at, emp.updated_at,
    ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) AS has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') AS has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') AS has_socios,
    v_total AS total_count
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_target IS NULL OR (
         emp.cnae_codigo = v_cnae_target OR
         emp.cnae_codigo = v_cnae_nolead OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_target] OR
         string_to_array(emp.cnaes_secundarios, ',') @> ARRAY[v_cnae_nolead]
    ))
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
        (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
        (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
          (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260506012046_95c2f2c9-5a0a-449c-9dc9-9159bc06b3e5.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(p_limit integer DEFAULT 10, p_offset integer DEFAULT 0, p_uf text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_sit_cadastral text DEFAULT NULL::text, p_porte text DEFAULT NULL::text, p_cnae text DEFAULT NULL::text, p_simples text DEFAULT NULL::text, p_mei text DEFAULT NULL::text, p_matriz_filial text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_has_email boolean DEFAULT NULL::boolean, p_has_phone boolean DEFAULT NULL::boolean, p_has_socios boolean DEFAULT NULL::boolean, p_data_abertura_inicio date DEFAULT NULL::date, p_data_abertura_fim date DEFAULT NULL::date, p_tags text[] DEFAULT NULL::text[], p_busca_socio text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_target TEXT;
  v_cnae_nolead TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
  v_count_cap INT := 10001;
BEGIN
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_target := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_target, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  END IF;

  SELECT COUNT(*) INTO v_total FROM (
    SELECT 1 FROM public.empresas emp
    WHERE
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_target IS NULL OR emp.cnae_codigo = v_cnae_target OR emp.cnae_codigo = v_cnae_nolead)
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
          (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
          (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN
            (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
            (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
    LIMIT v_count_cap
  ) sub;

  RETURN QUERY
  SELECT
    emp.id, emp.matriz_filial, emp.sit_cadastral, emp.data_sit_cadastral, emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior, emp.cod_pais, emp.nome_pais, emp.cod_natureza_juridica, emp.data_inicio_atividade,
    emp.cnae_fiscal, emp.cnae_codigo, emp.uf, emp.cod_municipio, emp.municipio, emp.porte_empresa,
    emp.opcao_simples, emp.data_opcao_simples, emp.data_exclusao_simples, emp.opcao_mei,
    emp.sit_especial, emp.data_sit_especial, emp.cnaes_secundarios, emp.categoria_id, emp.tags,
    emp.capital_social_empresa, emp.qualif_responsavel, emp.created_at, emp.updated_at,
    ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) AS has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') AS has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') AS has_socios,
    v_total AS total_count
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_target IS NULL OR emp.cnae_codigo = v_cnae_target OR emp.cnae_codigo = v_cnae_nolead)
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
        (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
        (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
          (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260511163139_dfbb409b-08fb-4442-8dd0-625f9fdf577e.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10, 
  p_offset integer DEFAULT 0, 
  p_uf text DEFAULT NULL::text, 
  p_municipio text DEFAULT NULL::text, 
  p_sit_cadastral text DEFAULT NULL::text, 
  p_porte text DEFAULT NULL::text, 
  p_cnae text DEFAULT NULL::text, 
  p_simples text DEFAULT NULL::text, 
  p_mei text DEFAULT NULL::text, 
  p_matriz_filial text DEFAULT NULL::text, 
  p_categoria_id uuid DEFAULT NULL::uuid, 
  p_has_email boolean DEFAULT NULL::boolean, 
  p_has_phone boolean DEFAULT NULL::boolean, 
  p_has_socios boolean DEFAULT NULL::boolean, 
  p_data_abertura_inicio date DEFAULT NULL::date, 
  p_data_abertura_fim date DEFAULT NULL::date, 
  p_tags text[] DEFAULT NULL::text[], 
  p_busca_socio text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(
  id bigint, 
  matriz_filial text, 
  sit_cadastral text, 
  data_sit_cadastral date, 
  motivo_sit_cadastral text, 
  nome_cidade_exterior text, 
  cod_pais text, 
  nome_pais text, 
  cod_natureza_juridica text, 
  data_inicio_atividade date, 
  cnae_fiscal text, 
  cnae_codigo text, 
  uf text, 
  cod_municipio text, 
  municipio text, 
  porte_empresa text, 
  opcao_simples text, 
  data_opcao_simples date, 
  data_exclusao_simples date, 
  opcao_mei text, 
  sit_especial text, 
  data_sit_especial date, 
  cnaes_secundarios text, 
  categoria_id uuid, 
  tags text[], 
  capital_social_empresa numeric, 
  qualif_responsavel text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_email boolean, 
  has_phone boolean, 
  has_socios boolean, 
  total_count bigint
)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_target TEXT;
  v_cnae_nolead TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
  v_count_cap INT := 10001;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  -- Detect CNPJ search
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Prepare CNAE targets
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_target := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_target, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  END IF;

  -- Get total count (capped for performance)
  SELECT COUNT(*) INTO v_total FROM (
    SELECT 1 FROM public.empresas emp
    WHERE
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_target IS NULL OR 
           emp.cnae_codigo = v_cnae_target OR 
           emp.cnae_codigo = v_cnae_nolead OR
           emp.cnaes_secundarios ILIKE '%' || v_cnae_target || '%' OR
           emp.cnaes_secundarios ILIKE '%' || v_cnae_nolead || '%')
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
          (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
          (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN
            (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
            (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
    LIMIT v_count_cap
  ) sub;

  RETURN QUERY
  SELECT
    emp.id, emp.matriz_filial, emp.sit_cadastral, emp.data_sit_cadastral, emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior, emp.cod_pais, emp.nome_pais, emp.cod_natureza_juridica, emp.data_inicio_atividade,
    emp.cnae_fiscal, emp.cnae_codigo, emp.uf, emp.cod_municipio, emp.municipio, emp.porte_empresa,
    emp.opcao_simples, emp.data_opcao_simples, emp.data_exclusao_simples, emp.opcao_mei,
    emp.sit_especial, emp.data_sit_especial, emp.cnaes_secundarios, emp.categoria_id, emp.tags,
    emp.capital_social_empresa, emp.qualif_responsavel, emp.created_at, emp.updated_at,
    ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) AS has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') AS has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') AS has_socios,
    v_total AS total_count
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_target IS NULL OR 
         emp.cnae_codigo = v_cnae_target OR 
         emp.cnae_codigo = v_cnae_nolead OR
         emp.cnaes_secundarios ILIKE '%' || v_cnae_target || '%' OR
         emp.cnaes_secundarios ILIKE '%' || v_cnae_nolead || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
        (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
        (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
          (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260511163640_7afd7536-faca-4381-9f01-24bcffca54cf.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 10, 
  p_offset integer DEFAULT 0, 
  p_uf text DEFAULT NULL::text, 
  p_municipio text DEFAULT NULL::text, 
  p_sit_cadastral text DEFAULT NULL::text, 
  p_porte text DEFAULT NULL::text, 
  p_cnae text DEFAULT NULL::text, 
  p_simples text DEFAULT NULL::text, 
  p_mei text DEFAULT NULL::text, 
  p_matriz_filial text DEFAULT NULL::text, 
  p_categoria_id uuid DEFAULT NULL::uuid, 
  p_has_email boolean DEFAULT NULL::boolean, 
  p_has_phone boolean DEFAULT NULL::boolean, 
  p_has_socios boolean DEFAULT NULL::boolean, 
  p_data_abertura_inicio date DEFAULT NULL::date, 
  p_data_abertura_fim date DEFAULT NULL::date, 
  p_tags text[] DEFAULT NULL::text[], 
  p_busca_socio text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text
)
 RETURNS TABLE(
  id bigint, 
  matriz_filial text, 
  sit_cadastral text, 
  data_sit_cadastral date, 
  motivo_sit_cadastral text, 
  nome_cidade_exterior text, 
  cod_pais text, 
  nome_pais text, 
  cod_natureza_juridica text, 
  data_inicio_atividade date, 
  cnae_fiscal text, 
  cnae_codigo text, 
  uf text, 
  cod_municipio text, 
  municipio text, 
  porte_empresa text, 
  opcao_simples text, 
  data_opcao_simples date, 
  data_exclusao_simples date, 
  opcao_mei text, 
  sit_especial text, 
  data_sit_especial date, 
  cnaes_secundarios text, 
  categoria_id uuid, 
  tags text[], 
  capital_social_empresa numeric, 
  qualif_responsavel text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_email boolean, 
  has_phone boolean, 
  has_socios boolean, 
  total_count bigint
)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_cnae_target TEXT;
  v_cnae_nolead TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
  v_count_cap INT := 10001;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;

  -- Detect CNPJ search
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Prepare CNAE targets (ensure 7 digits with leading zeros)
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_target := lpad(regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'), 7, '0');
    v_cnae_nolead := ltrim(v_cnae_target, '0');
    IF v_cnae_nolead = '' THEN v_cnae_nolead := '0'; END IF;
  END IF;

  -- Get total count (capped for performance)
  SELECT COUNT(*) INTO v_total FROM (
    SELECT 1 FROM public.empresas emp
    WHERE
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      -- EXACT match on primary CNAE only
      AND (v_cnae_target IS NULL OR 
           emp.cnae_codigo = v_cnae_target OR 
           emp.cnae_codigo = v_cnae_nolead)
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (
          (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
          (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
      ))
      AND (p_has_phone IS NULL OR (
          (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
          (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
      ))
      AND (p_has_socios IS NULL OR (
          (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
          (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
      ))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR (
          CASE WHEN v_is_cnpj_search THEN
            (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
            (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
          ELSE
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR
            emp.razao_social ILIKE '%' || p_search || '%'
          END
      ))
    LIMIT v_count_cap
  ) sub;

  RETURN QUERY
  SELECT
    emp.id, emp.matriz_filial, emp.sit_cadastral, emp.data_sit_cadastral, emp.motivo_sit_cadastral,
    emp.nome_cidade_exterior, emp.cod_pais, emp.nome_pais, emp.cod_natureza_juridica, emp.data_inicio_atividade,
    emp.cnae_fiscal, emp.cnae_codigo, emp.uf, emp.cod_municipio, emp.municipio, emp.porte_empresa,
    emp.opcao_simples, emp.data_opcao_simples, emp.data_exclusao_simples, emp.opcao_mei,
    emp.sit_especial, emp.data_sit_especial, emp.cnaes_secundarios, emp.categoria_id, emp.tags,
    emp.capital_social_empresa, emp.qualif_responsavel, emp.created_at, emp.updated_at,
    ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != '')) AS has_email,
    (emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') AS has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '[]') AS has_socios,
    v_total AS total_count
  FROM public.empresas emp
  WHERE
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio = p_municipio)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    -- EXACT match on primary CNAE only
    AND (v_cnae_target IS NULL OR 
         emp.cnae_codigo = v_cnae_target OR 
         emp.cnae_codigo = v_cnae_nolead)
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (
        (p_has_email AND ((emp.email IS NOT NULL AND emp.email != '') OR (emp.correio_eletronico IS NOT NULL AND emp.correio_eletronico != ''))) OR
        (NOT p_has_email AND (emp.email IS NULL OR emp.email = '') AND (emp.correio_eletronico IS NULL OR emp.correio_eletronico = ''))
    ))
    AND (p_has_phone IS NULL OR (
        (p_has_phone AND emp.ddd_telefone_1 IS NOT NULL AND emp.ddd_telefone_1 != '') OR
        (NOT p_has_phone AND (emp.ddd_telefone_1 IS NULL OR emp.ddd_telefone_1 = ''))
    ))
    AND (p_has_socios IS NULL OR (
        (p_has_socios AND emp.socios IS NOT NULL AND emp.socios != '[]') OR
        (NOT p_has_socios AND (emp.socios IS NULL OR emp.socios = '[]'))
    ))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR (
        CASE WHEN v_is_cnpj_search THEN
          (length(v_search_digits) = 14 AND emp.cnpj = v_search_digits) OR
          (length(v_search_digits) < 14 AND emp.cnpj LIKE v_search_digits || '%')
        ELSE
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.razao_social ILIKE '%' || p_search || '%'
        END
    ))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260511170050_032ec134-df1a-4ec4-a349-ba0b5beba74f.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpar CNAE (remover pontuação e garantir 7 dígitos)
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := LPAD(REGEXP_REPLACE(p_cnae, '\D', '', 'g'), 7, '0');
    END IF;

    -- Primeiro, contar o total de resultados (usando a mesma lógica de filtro)
    -- Isso é necessário para a paginação correta
    SELECT COUNT(*) INTO v_total_count
    FROM empresas_public e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean) -- Busca exata no principal
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR e.has_email = p_has_email)
      AND (p_has_phone IS NULL OR e.has_phone = p_has_phone)
      AND (p_has_socios IS NULL OR e.has_socios = p_has_socios)
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fIM IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.busca_socio ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ));

    -- Retornar os dados paginados
    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples,
        e.data_exclusao_simples,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial,
        e.cnaes_secundarios,
        e.categoria_id,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        e.has_email,
        e.has_phone,
        e.has_socios,
        v_total_count
    FROM empresas_public e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean) -- Busca exata no principal
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR e.has_email = p_has_email)
      AND (p_has_phone IS NULL OR e.has_phone = p_has_phone)
      AND (p_has_socios IS NULL OR e.has_socios = p_has_socios)
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fIM IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.busca_socio ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------
-- 20260511170307_379790f6-5f64-4d40-a5d9-7680ee92f245.sql
-- ---------------------------------------------------------------
-- Drop the possible conflicting versions first to clean up
DROP FUNCTION IF EXISTS public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, text, text, text[], text, text);
DROP FUNCTION IF EXISTS public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, uuid, boolean, boolean, boolean, date, date, text[], text, text);

-- Create the single correct version with text parameters (easier for PostgREST/Vite to handle)
CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpar CNAE
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := LPAD(REGEXP_REPLACE(p_cnae, '\D', '', 'g'), 7, '0');
    END IF;

    -- Contar total
    SELECT COUNT(*) INTO v_total_count
    FROM empresas_public e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR e.has_email = p_has_email)
      AND (p_has_phone IS NULL OR e.has_phone = p_has_phone)
      AND (p_has_socios IS NULL OR e.has_socios = p_has_socios)
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.busca_socio ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ));

    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples,
        e.data_exclusao_simples,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial,
        e.cnaes_secundarios,
        e.categoria_id,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        e.has_email,
        e.has_phone,
        e.has_socios,
        v_total_count
    FROM empresas_public e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR e.has_email = p_has_email)
      AND (p_has_phone IS NULL OR e.has_phone = p_has_phone)
      AND (p_has_socios IS NULL OR e.has_socios = p_has_socios)
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.busca_socio ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------
-- 20260511170410_7f3775d8-ede0-499a-87d5-f5d678713e2a.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpar CNAE
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := LPAD(REGEXP_REPLACE(p_cnae, '\D', '', 'g'), 7, '0');
    END IF;

    -- Contar total usando a tabela correta 'empresas'
    SELECT COUNT(*) INTO v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      -- Busca simplificada em socios para evitar custos de processamento pesados
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ));

    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral::DATE,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade::DATE,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples::DATE,
        e.data_exclusao_simples::DATE,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial::DATE,
        e.cnaes_secundarios,
        e.categoria_id,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        (e.email IS NOT NULL AND e.email <> '') as has_email,
        (e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') as has_phone,
        (e.socios IS NOT NULL AND e.socios <> '') as has_socios,
        v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------
-- 20260511170500_c1e1fb8b-ded9-4846-80f9-7221d5ae9ebc.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpar CNAE
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := LPAD(REGEXP_REPLACE(p_cnae, '\D', '', 'g'), 7, '0');
    END IF;

    -- Contar total
    SELECT COUNT(*) INTO v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID) -- Casting added here
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ));

    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral::DATE,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade::DATE,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples::DATE,
        e.data_exclusao_simples::DATE,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial::DATE,
        e.cnaes_secundarios,
        e.categoria_id::TEXT,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        (e.email IS NOT NULL AND e.email <> '') as has_email,
        (e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') as has_phone,
        (e.socios IS NOT NULL AND e.socios <> '') as has_socios,
        v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR e.cnae_codigo = v_cnae_clean)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID) -- Casting added here
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------
-- 20260511170728_3034e8e8-718f-4679-a8b5-5268933807b9.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpar CNAE para busca numérica pura
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := REGEXP_REPLACE(p_cnae, '\D', '', 'g');
    END IF;

    -- Contar total
    SELECT COUNT(*) INTO v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR (
          e.cnae_codigo = p_cnae OR 
          e.cnae_codigo = v_cnae_clean OR 
          LPAD(REGEXP_REPLACE(e.cnae_codigo, '\D', '', 'g'), 7, '0') = LPAD(v_cnae_clean, 7, '0')
      ))
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ));

    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral::DATE,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade::DATE,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples::DATE,
        e.data_exclusao_simples::DATE,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial::DATE,
        e.cnaes_secundarios,
        e.categoria_id::TEXT,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        (e.email IS NOT NULL AND e.email <> '') as has_email,
        (e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') as has_phone,
        (e.socios IS NOT NULL AND e.socios <> '') as has_socios,
        v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR (
          e.cnae_codigo = p_cnae OR 
          e.cnae_codigo = v_cnae_clean OR 
          LPAD(REGEXP_REPLACE(e.cnae_codigo, '\D', '', 'g'), 7, '0') = LPAD(v_cnae_clean, 7, '0')
      ))
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------
-- 20260511171114_a496acb0-891b-4498-8f99-710771da983b.sql
-- ---------------------------------------------------------------
-- Must drop to change return types (id from integer to bigint)
DROP FUNCTION IF EXISTS public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, text, text, text[], text, text);

CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpar CNAE
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := REGEXP_REPLACE(p_cnae, '\D', '', 'g');
    END IF;

    -- Contar total
    SELECT COUNT(*) INTO v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR (
          e.cnae_codigo = p_cnae OR 
          e.cnae_codigo = v_cnae_clean OR 
          LPAD(REGEXP_REPLACE(e.cnae_codigo, '\D', '', 'g'), 7, '0') = LPAD(v_cnae_clean, 7, '0')
      ))
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ));

    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples,
        e.data_exclusao_simples,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial,
        e.cnaes_secundarios,
        e.categoria_id::TEXT,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        (e.email IS NOT NULL AND e.email <> '') as has_email,
        (e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') as has_phone,
        (e.socios IS NOT NULL AND e.socios <> '') as has_socios,
        v_total_count
    FROM public.empresas e
    WHERE (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR (
          e.cnae_codigo = p_cnae OR 
          e.cnae_codigo = v_cnae_clean OR 
          LPAD(REGEXP_REPLACE(e.cnae_codigo, '\D', '', 'g'), 7, '0') = LPAD(v_cnae_clean, 7, '0')
      ))
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (
          e.razao_social ~* p_search OR 
          e.nome_fantasia ~* p_search OR 
          e.cnpj ~* p_search
      ))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------
-- 20260511171359_c17c824e-9d88-4c80-bc41-c122bbb35f03.sql
-- ---------------------------------------------------------------
-- Create index for faster CNAE searches if not exists
CREATE INDEX IF NOT EXISTS idx_empresas_cnae_codigo ON public.empresas (cnae_codigo);

-- Re-optimize the function for speed
CREATE OR REPLACE FUNCTION public.get_empresas_public(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_uf TEXT DEFAULT NULL,
    p_municipio TEXT DEFAULT NULL,
    p_sit_cadastral TEXT DEFAULT NULL,
    p_porte TEXT DEFAULT NULL,
    p_cnae TEXT DEFAULT NULL,
    p_simples TEXT DEFAULT NULL,
    p_mei TEXT DEFAULT NULL,
    p_matriz_filial TEXT DEFAULT NULL,
    p_categoria_id TEXT DEFAULT NULL,
    p_has_email BOOLEAN DEFAULT NULL,
    p_has_phone BOOLEAN DEFAULT NULL,
    p_has_socios BOOLEAN DEFAULT NULL,
    p_data_abertura_inicio TEXT DEFAULT NULL,
    p_data_abertura_fim TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_busca_socio TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    matriz_filial TEXT,
    sit_cadastral TEXT,
    data_sit_cadastral DATE,
    motivo_sit_cadastral TEXT,
    nome_cidade_exterior TEXT,
    cod_pais TEXT,
    nome_pais TEXT,
    cod_natureza_juridica TEXT,
    data_inicio_atividade DATE,
    cnae_fiscal TEXT,
    cnae_codigo TEXT,
    uf TEXT,
    cod_municipio TEXT,
    municipio TEXT,
    porte_empresa TEXT,
    opcao_simples TEXT,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei TEXT,
    sit_especial TEXT,
    data_sit_especial DATE,
    cnaes_secundarios TEXT,
    categoria_id TEXT,
    tags TEXT[],
    capital_social_empresa NUMERIC,
    qualif_responsavel TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    has_email BOOLEAN,
    has_phone BOOLEAN,
    has_socios BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpeza rápida do CNAE
    IF p_cnae IS NOT NULL THEN
        v_cnae_clean := REGEXP_REPLACE(p_cnae, '\D', '', 'g');
    END IF;

    -- Estimativa de count ou count real (otimizado)
    -- Para buscas nacionais por CNAE, tentamos ser o mais direto possível
    SELECT COUNT(*) INTO v_total_count
    FROM public.empresas e
    WHERE (p_cnae IS NULL OR e.cnae_codigo = p_cnae OR e.cnae_codigo = v_cnae_clean OR LPAD(e.cnae_codigo, 7, '0') = LPAD(v_cnae_clean, 7, '0'))
      AND (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (e.razao_social ~* p_search OR e.nome_fantasia ~* p_search OR e.cnpj ~* p_search));

    RETURN QUERY
    SELECT 
        e.id,
        e.matriz_filial,
        e.sit_cadastral,
        e.data_sit_cadastral,
        e.motivo_sit_cadastral,
        e.nome_cidade_exterior,
        e.cod_pais,
        e.nome_pais,
        e.cod_natureza_juridica,
        e.data_inicio_atividade,
        e.cnae_fiscal,
        e.cnae_codigo,
        e.uf,
        e.cod_municipio,
        e.municipio,
        e.porte_empresa,
        e.opcao_simples,
        e.data_opcao_simples,
        e.data_exclusao_simples,
        e.opcao_mei,
        e.sit_especial,
        e.data_sit_especial,
        e.cnaes_secundarios,
        e.categoria_id::TEXT,
        e.tags,
        e.capital_social_empresa,
        e.qualif_responsavel,
        e.created_at,
        e.updated_at,
        (e.email IS NOT NULL AND e.email <> '') as has_email,
        (e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') as has_phone,
        (e.socios IS NOT NULL AND e.socios <> '') as has_socios,
        v_total_count
    FROM public.empresas e
    WHERE (p_cnae IS NULL OR e.cnae_codigo = p_cnae OR e.cnae_codigo = v_cnae_clean OR LPAD(e.cnae_codigo, 7, '0') = LPAD(v_cnae_clean, 7, '0'))
      AND (p_uf IS NULL OR e.uf = p_uf)
      AND (p_municipio IS NULL OR e.municipio = p_municipio)
      AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR e.porte_empresa = p_porte)
      AND (p_simples IS NULL OR e.opcao_simples = p_simples)
      AND (p_mei IS NULL OR e.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id::UUID)
      AND (p_has_email IS NULL OR (p_has_email = true AND e.email IS NOT NULL AND e.email <> '') OR (p_has_email = false AND (e.email IS NULL OR e.email = '')))
      AND (p_has_phone IS NULL OR (p_has_phone = true AND e.ddd_telefone_1 IS NOT NULL AND e.ddd_telefone_1 <> '') OR (p_has_phone = false AND (e.ddd_telefone_1 IS NULL OR e.ddd_telefone_1 = '')))
      AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios <> '') OR (p_has_socios = false AND (e.socios IS NULL OR e.socios = '')))
      AND (p_data_abertura_inicio IS NULL OR e.data_inicio_atividade >= p_data_abertura_inicio::DATE)
      AND (p_data_abertura_fim IS NULL OR e.data_inicio_atividade <= p_data_abertura_fim::DATE)
      AND (p_tags IS NULL OR e.tags @> p_tags)
      AND (p_busca_socio IS NULL OR e.socios ~* p_busca_socio)
      AND (p_search IS NULL OR (e.razao_social ~* p_search OR e.nome_fantasia ~* p_search OR e.cnpj ~* p_search))
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ---------------------------------------------------------------
-- 20260714132615_3ef9289f-6b02-451b-9b83-d921bb6f8ce6.sql
-- ---------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;


-- ---------------------------------------------------------------
-- 20260729201125_c88dabc6-b24f-4fff-b5df-59001ab89381.sql
-- ---------------------------------------------------------------
CREATE TABLE public.meta_pixel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id text,
  enabled boolean NOT NULL DEFAULT false,
  track_pageviews boolean NOT NULL DEFAULT true,
  track_lead boolean NOT NULL DEFAULT true,
  track_complete_registration boolean NOT NULL DEFAULT true,
  track_purchase boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_pixel_configs TO authenticated;
GRANT ALL ON public.meta_pixel_configs TO service_role;

ALTER TABLE public.meta_pixel_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master_admin can view Meta Pixel config"
ON public.meta_pixel_configs FOR SELECT
USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can insert Meta Pixel config"
ON public.meta_pixel_configs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can update Meta Pixel config"
ON public.meta_pixel_configs FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can delete Meta Pixel config"
ON public.meta_pixel_configs FOR DELETE
USING (has_role(auth.uid(), 'master_admin'));

CREATE TRIGGER update_meta_pixel_configs_updated_at
BEFORE UPDATE ON public.meta_pixel_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_meta_pixel_public_config()
RETURNS TABLE(pixel_id text, enabled boolean, track_pageviews boolean, track_lead boolean, track_complete_registration boolean, track_purchase boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN m.enabled THEN m.pixel_id ELSE NULL END as pixel_id,
    COALESCE(m.enabled, false) as enabled,
    COALESCE(m.track_pageviews, true) as track_pageviews,
    COALESCE(m.track_lead, true) as track_lead,
    COALESCE(m.track_complete_registration, true) as track_complete_registration,
    COALESCE(m.track_purchase, true) as track_purchase
  FROM meta_pixel_configs m
  LIMIT 1;
END;
$$;


-- ---------------------------------------------------------------
-- 20260729204634_ebb4132f-7714-423a-ba8c-4e8e2ad2d705.sql
-- ---------------------------------------------------------------
CREATE TABLE public.meta_pixel_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  campo_alterado text NOT NULL,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.meta_pixel_audit_logs TO authenticated;
GRANT ALL ON public.meta_pixel_audit_logs TO service_role;

ALTER TABLE public.meta_pixel_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can view meta pixel audit logs"
ON public.meta_pixel_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can insert meta pixel audit logs"
ON public.meta_pixel_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin') AND admin_id = auth.uid());

CREATE INDEX idx_meta_pixel_audit_logs_created_at ON public.meta_pixel_audit_logs (created_at DESC);
