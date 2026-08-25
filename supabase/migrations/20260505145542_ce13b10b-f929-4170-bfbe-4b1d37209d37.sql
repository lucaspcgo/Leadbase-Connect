CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_uf TEXT DEFAULT NULL,
  p_municipio TEXT DEFAULT NULL,
  p_sit_cadastral TEXT DEFAULT NULL,
  p_porte TEXT DEFAULT NULL,
  p_cnae TEXT DEFAULT NULL,
  p_simples TEXT DEFAULT NULL,
  p_mei TEXT DEFAULT NULL,
  p_matriz_filial TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_has_email BOOLEAN DEFAULT NULL,
  p_has_phone BOOLEAN DEFAULT NULL,
  p_has_socios BOOLEAN DEFAULT NULL,
  p_data_abertura_inicio DATE DEFAULT NULL,
  p_data_abertura_fim DATE DEFAULT NULL,
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
  categoria_id UUID,
  tags TEXT[],
  capital_social_empresa NUMERIC,
  qualif_responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  has_email BOOLEAN,
  has_phone BOOLEAN,
  has_socios BOOLEAN,
  total_count BIGINT
) AS $$
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
  
  -- Increase timeout to 15s
  SET LOCAL statement_timeout = '15s';

  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    SELECT COUNT(*) INTO v_total
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
           emp.cnaes_secundarios ILIKE '%' || v_cnae_clean || '%' OR
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
      );
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
         emp.cnaes_secundarios ILIKE '%' || v_cnae_clean || '%' OR
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
