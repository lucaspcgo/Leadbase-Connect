-- Drop and recreate the function with all required filter parameters
DROP FUNCTION IF EXISTS public.get_empresas_public;

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
  -- NEW PARAMETERS
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
AS $function$
DECLARE
  v_total BIGINT;
  v_sql TEXT;
  v_count_sql TEXT;
  v_where TEXT := 'WHERE 1=1';
BEGIN
  -- Build WHERE clause dynamically for better performance
  IF p_uf IS NOT NULL THEN
    v_where := v_where || ' AND emp.uf = ' || quote_literal(p_uf);
  END IF;
  
  IF p_municipio IS NOT NULL THEN
    v_where := v_where || ' AND emp.municipio ILIKE ' || quote_literal('%' || p_municipio || '%');
  END IF;
  
  IF p_sit_cadastral IS NOT NULL THEN
    v_where := v_where || ' AND emp.sit_cadastral = ' || quote_literal(p_sit_cadastral);
  END IF;
  
  IF p_porte IS NOT NULL THEN
    v_where := v_where || ' AND emp.porte_empresa = ' || quote_literal(p_porte);
  END IF;
  
  IF p_cnae IS NOT NULL THEN
    v_where := v_where || ' AND (emp.cnae_codigo ILIKE ' || quote_literal(p_cnae || '%') || ' OR emp.cnae_fiscal ILIKE ' || quote_literal('%' || p_cnae || '%') || ')';
  END IF;
  
  IF p_simples IS NOT NULL THEN
    v_where := v_where || ' AND emp.opcao_simples = ' || quote_literal(p_simples);
  END IF;
  
  IF p_mei IS NOT NULL THEN
    v_where := v_where || ' AND emp.opcao_mei = ' || quote_literal(p_mei);
  END IF;
  
  IF p_matriz_filial IS NOT NULL THEN
    v_where := v_where || ' AND emp.matriz_filial = ' || quote_literal(p_matriz_filial);
  END IF;
  
  IF p_categoria_id IS NOT NULL THEN
    v_where := v_where || ' AND emp.categoria_id = ' || quote_literal(p_categoria_id);
  END IF;
  
  IF p_has_email = true THEN
    v_where := v_where || ' AND (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL)';
  END IF;
  
  IF p_has_phone = true THEN
    v_where := v_where || ' AND (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL)';
  END IF;
  
  IF p_has_socios = true THEN
    v_where := v_where || ' AND emp.socios IS NOT NULL AND emp.socios != ''''';
  END IF;

  -- NEW FILTERS
  IF p_data_abertura_inicio IS NOT NULL THEN
    v_where := v_where || ' AND emp.data_inicio_atividade >= ' || quote_literal(p_data_abertura_inicio);
  END IF;
  
  IF p_data_abertura_fim IS NOT NULL THEN
    v_where := v_where || ' AND emp.data_inicio_atividade <= ' || quote_literal(p_data_abertura_fim);
  END IF;
  
  IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
    v_where := v_where || ' AND emp.tags && ' || quote_literal(p_tags::text)::text || '::text[]';
  END IF;
  
  IF p_busca_socio IS NOT NULL AND p_busca_socio != '' THEN
    v_where := v_where || ' AND (emp.socios ILIKE ' || quote_literal('%' || p_busca_socio || '%') || ' OR emp.socios_raw ILIKE ' || quote_literal('%' || p_busca_socio || '%') || ')';
  END IF;
  
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_where := v_where || ' AND (emp.uf ILIKE ' || quote_literal('%' || p_search || '%') || 
      ' OR emp.municipio ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.cnae_fiscal ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.cnae_codigo ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.porte_empresa ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.sit_cadastral ILIKE ' || quote_literal('%' || p_search || '%') || ')';
  END IF;

  -- Get count with the same filters
  v_count_sql := 'SELECT COUNT(*) FROM public.empresas emp ' || v_where;
  EXECUTE v_count_sql INTO v_total;

  -- Return paginated data with total count
  RETURN QUERY EXECUTE format('
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
      (emp.socios IS NOT NULL AND emp.socios != '''') as has_socios,
      %s::bigint as total_count
    FROM public.empresas emp
    %s
    ORDER BY emp.id ASC
    LIMIT %s
    OFFSET %s
  ', v_total, v_where, p_limit, p_offset);
END;
$function$;