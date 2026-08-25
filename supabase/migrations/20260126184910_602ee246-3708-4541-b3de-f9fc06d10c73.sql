-- Create a function to get empresa CNPJ by ID (for unlocking purposes)
-- This function uses SECURITY DEFINER to bypass RLS and allow looking up CNPJ
CREATE OR REPLACE FUNCTION public.get_empresa_for_unlock(p_empresa_id bigint)
RETURNS TABLE(
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
  user_id_param uuid;
  empresa_cnpj text;
  unlocked boolean;
BEGIN
  -- Get current user ID
  user_id_param := auth.uid();
  
  -- User must be authenticated
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get the empresa CNPJ first
  SELECT e.cnpj INTO empresa_cnpj
  FROM empresas e
  WHERE e.id = p_empresa_id;
  
  IF empresa_cnpj IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user is admin or has unlocked this company
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = user_id_param 
    AND ur.role IN ('admin', 'master_admin')
  ) OR EXISTS (
    SELECT 1 FROM unlocked_companies uc 
    WHERE uc.user_id = user_id_param 
    AND uc.empresa_cnpj = empresa_cnpj 
    AND uc.billing_cycle_end >= now()
  ) OR EXISTS (
    -- Also check if user is a team member and owner has unlocked
    SELECT 1 FROM team_members tm 
    JOIN unlocked_companies uc ON uc.user_id = tm.owner_user_id
    WHERE tm.member_user_id = user_id_param 
    AND tm.status = 'ACTIVE'
    AND uc.empresa_cnpj = empresa_cnpj 
    AND uc.billing_cycle_end >= now()
  ) INTO unlocked;
  
  -- Return empresa data with unlock status
  RETURN QUERY
  SELECT 
    e.id,
    e.cnpj,
    e.razao_social,
    e.nome_fantasia,
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
    e.desc_tipo_logradouro,
    e.logradouro,
    e.numero,
    e.complemento,
    e.bairro,
    e.cep,
    e.uf,
    e.cod_municipio,
    e.municipio,
    e.ddd_telefone_1,
    e.telefone1_celular,
    e.ddd_telefone_2,
    e.telefone2_celular,
    e.ddd_fax,
    e.correio_eletronico,
    e.email,
    e.qualif_responsavel,
    e.capital_social_empresa,
    e.porte_empresa,
    e.opcao_simples,
    e.data_opcao_simples,
    e.data_exclusao_simples,
    e.opcao_mei,
    e.sit_especial,
    e.data_sit_especial,
    e.socios,
    e.socios_raw,
    e.cnaes_secundarios,
    e.categoria_id,
    e.tags,
    e.matriz_filial,
    e.created_at,
    e.updated_at,
    unlocked as is_unlocked
  FROM empresas e
  WHERE e.id = p_empresa_id;
END;
$$;