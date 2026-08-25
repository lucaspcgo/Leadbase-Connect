-- Update get_empresa_for_unlock to NOT automatically unlock for admins
-- Admins should consume credits like regular users (for tracking purposes)
-- Only the unlocked_companies table check determines unlock status

CREATE OR REPLACE FUNCTION public.get_empresa_for_unlock(p_empresa_id bigint)
 RETURNS TABLE(id bigint, cnpj text, razao_social text, nome_fantasia text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, desc_tipo_logradouro text, logradouro text, numero text, complemento text, bairro text, cep text, uf text, cod_municipio text, municipio text, ddd_telefone_1 text, telefone1_celular boolean, ddd_telefone_2 text, telefone2_celular boolean, ddd_fax text, correio_eletronico text, email text, qualif_responsavel text, capital_social_empresa numeric, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, socios text, socios_raw text, cnaes_secundarios text, categoria_id uuid, tags text[], matriz_filial text, created_at timestamp with time zone, updated_at timestamp with time zone, is_unlocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Check if user has unlocked this company (same logic for all users including admins)
  -- Admins now consume credits like regular users for tracking purposes
  SELECT EXISTS (
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
$function$;