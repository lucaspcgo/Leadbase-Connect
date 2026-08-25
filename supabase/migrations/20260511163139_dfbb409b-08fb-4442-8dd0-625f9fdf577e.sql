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