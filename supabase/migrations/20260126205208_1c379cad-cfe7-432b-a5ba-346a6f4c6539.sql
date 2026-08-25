-- A função get_empresas_public precisa ter SECURITY DEFINER 
-- para bypassar RLS (ela já tem, mas vamos recriar para garantir)
-- e também precisamos garantir que a política RLS não cause conflito

-- Primeiro, vamos dropar e recriar a função com SECURITY DEFINER explícito
DROP FUNCTION IF EXISTS public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, uuid, boolean, boolean, boolean);

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
  p_has_socios boolean DEFAULT NULL
)
RETURNS TABLE (
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
  created_at timestamptz,
  updated_at timestamptz,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Calcular total com filtros (bypassa RLS por ser SECURITY DEFINER)
  SELECT COUNT(*) INTO v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (p_has_email = true AND (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL)))
    AND (p_has_phone IS NULL OR (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL)))
    AND (p_has_socios IS NULL OR (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != ''));

  -- Retornar dados públicos SEM dados sensíveis
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
    AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (p_has_email = true AND (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL)))
    AND (p_has_phone IS NULL OR (p_has_phone = true AND (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL)))
    AND (p_has_socios IS NULL OR (p_has_socios = true AND emp.socios IS NOT NULL AND emp.socios != ''))
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_empresas_public TO authenticated;

-- Também corrigir a função get_empresa_for_unlock para evitar ambiguidade
DROP FUNCTION IF EXISTS public.get_empresa_for_unlock(bigint);

CREATE OR REPLACE FUNCTION public.get_empresa_for_unlock(p_empresa_id bigint)
RETURNS TABLE (
  id bigint,
  cnpj text,
  razao_social text,
  nome_fantasia text,
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
  desc_tipo_logradouro text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cep text,
  uf text,
  cod_municipio text,
  municipio text,
  ddd_telefone_1 text,
  telefone1_celular boolean,
  ddd_telefone_2 text,
  telefone2_celular boolean,
  ddd_fax text,
  correio_eletronico text,
  email text,
  qualif_responsavel text,
  capital_social_empresa numeric,
  porte_empresa text,
  opcao_simples text,
  data_opcao_simples date,
  data_exclusao_simples date,
  opcao_mei text,
  sit_especial text,
  data_sit_especial date,
  socios text,
  socios_raw text,
  cnaes_secundarios text,
  categoria_id uuid,
  tags text[],
  matriz_filial text,
  created_at timestamptz,
  updated_at timestamptz,
  is_unlocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_empresa_cnpj text;
  v_unlocked boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- User must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get the empresa CNPJ first
  SELECT emp.cnpj INTO v_empresa_cnpj
  FROM public.empresas emp
  WHERE emp.id = p_empresa_id;
  
  IF v_empresa_cnpj IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user is admin or has unlocked this company
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = v_user_id 
    AND ur.role IN ('admin', 'master_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.unlocked_companies uc 
    WHERE uc.user_id = v_user_id 
    AND uc.empresa_cnpj = v_empresa_cnpj 
    AND uc.billing_cycle_end >= now()
  ) OR EXISTS (
    -- Also check if user is a team member and owner has unlocked
    SELECT 1 FROM public.team_members tm 
    JOIN public.unlocked_companies uc ON uc.user_id = tm.owner_user_id
    WHERE tm.member_user_id = v_user_id 
    AND tm.status = 'ACTIVE'
    AND uc.empresa_cnpj = v_empresa_cnpj 
    AND uc.billing_cycle_end >= now()
  ) INTO v_unlocked;
  
  -- Return empresa data with unlock status
  RETURN QUERY
  SELECT 
    emp.id,
    emp.cnpj,
    emp.razao_social,
    emp.nome_fantasia,
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
    emp.desc_tipo_logradouro,
    emp.logradouro,
    emp.numero,
    emp.complemento,
    emp.bairro,
    emp.cep,
    emp.uf,
    emp.cod_municipio,
    emp.municipio,
    emp.ddd_telefone_1,
    emp.telefone1_celular,
    emp.ddd_telefone_2,
    emp.telefone2_celular,
    emp.ddd_fax,
    emp.correio_eletronico,
    emp.email,
    emp.qualif_responsavel,
    emp.capital_social_empresa,
    emp.porte_empresa,
    emp.opcao_simples,
    emp.data_opcao_simples,
    emp.data_exclusao_simples,
    emp.opcao_mei,
    emp.sit_especial,
    emp.data_sit_especial,
    emp.socios,
    emp.socios_raw,
    emp.cnaes_secundarios,
    emp.categoria_id,
    emp.tags,
    emp.matriz_filial,
    emp.created_at,
    emp.updated_at,
    v_unlocked as is_unlocked
  FROM public.empresas emp
  WHERE emp.id = p_empresa_id;
END;
$$;

-- Garantir permissão de execução
GRANT EXECUTE ON FUNCTION public.get_empresa_for_unlock TO authenticated;