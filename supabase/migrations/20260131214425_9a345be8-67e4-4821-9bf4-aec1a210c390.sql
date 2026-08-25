-- Update get_empresas_public to handle CNAE filter that may include description
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 25, 
  p_offset integer DEFAULT 0, 
  p_uf text DEFAULT NULL, 
  p_municipio text DEFAULT NULL, 
  p_sit_cadastral text DEFAULT NULL, 
  p_porte text DEFAULT NULL, 
  p_cnae text DEFAULT NULL, 
  p_simples text DEFAULT NULL, 
  p_mei text DEFAULT NULL, 
  p_matriz_filial text DEFAULT NULL, 
  p_categoria_id uuid DEFAULT NULL, 
  p_has_email boolean DEFAULT NULL, 
  p_has_phone boolean DEFAULT NULL, 
  p_has_socios boolean DEFAULT NULL, 
  p_data_abertura_inicio date DEFAULT NULL, 
  p_data_abertura_fim date DEFAULT NULL, 
  p_tags text[] DEFAULT NULL, 
  p_busca_socio text DEFAULT NULL, 
  p_search text DEFAULT NULL
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
SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
BEGIN
  -- Extract CNAE code from the filter (remove description if present)
  -- Format may be "1234567 - Description" or just "1234567"
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_code := split_part(p_cnae, ' - ', 1);
    -- If no separator, use the original value
    IF v_cnae_code = '' THEN
      v_cnae_code := p_cnae;
    END IF;
  ELSE
    v_cnae_code := NULL;
  END IF;

  -- Check if there are any filters applied
  v_has_filters := COALESCE(p_uf, p_municipio, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- For unfiltered queries, use a fast estimate instead of COUNT(*)
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 500000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    IF v_total IS NULL OR v_total < 1000 THEN
      v_total := 500000;
    END IF;
  ELSE
    -- Only compute exact count when filters are applied
    SELECT COUNT(*) INTO v_total
    FROM public.empresas emp
    WHERE 
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_code IS NULL OR emp.cnae_codigo ILIKE v_cnae_code || '%' OR emp.cnae_fiscal ILIKE '%' || v_cnae_code || '%')
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
      AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
      AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR p_search = '' OR 
           emp.uf ILIKE '%' || p_search || '%' OR
           emp.municipio ILIKE '%' || p_search || '%' OR
           emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
           emp.cnae_codigo ILIKE '%' || p_search || '%' OR
           emp.porte_empresa ILIKE '%' || p_search || '%' OR
           emp.sit_cadastral ILIKE '%' || p_search || '%'
      );
  END IF;

  -- Return paginated results
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
    (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL) as has_email,
    (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL) as has_phone,
    (emp.socios IS NOT NULL AND emp.socios != '') as has_socios,
    v_total as total_count
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR emp.cnae_codigo ILIKE v_cnae_code || '%' OR emp.cnae_fiscal ILIKE '%' || v_cnae_code || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR p_search = '' OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%' OR
         emp.porte_empresa ILIKE '%' || p_search || '%' OR
         emp.sit_cadastral ILIKE '%' || p_search || '%'
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;