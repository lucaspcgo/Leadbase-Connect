-- REMOVER política permissiva que expõe dados sensíveis
DROP POLICY IF EXISTS "Authenticated users can view empresas for public view" ON public.empresas;

-- Remover a view problemática
DROP VIEW IF EXISTS public.empresas_public;

-- Criar FUNÇÃO segura que retorna apenas dados públicos
-- Funções com SECURITY DEFINER controlam exatamente o que é retornado
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit INTEGER DEFAULT 25,
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
  p_has_socios BOOLEAN DEFAULT NULL
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  has_email BOOLEAN,
  has_phone BOOLEAN,
  has_socios BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total BIGINT;
BEGIN
  -- Calcular total com filtros
  SELECT COUNT(*) INTO total
  FROM empresas e
  WHERE 
    (p_uf IS NULL OR e.uf = p_uf)
    AND (p_municipio IS NULL OR e.municipio ILIKE '%' || p_municipio || '%')
    AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR e.porte_empresa = p_porte)
    AND (p_cnae IS NULL OR e.cnae_codigo ILIKE p_cnae || '%')
    AND (p_simples IS NULL OR e.opcao_simples = p_simples)
    AND (p_mei IS NULL OR e.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (p_has_email = true AND (e.email IS NOT NULL OR e.correio_eletronico IS NOT NULL)))
    AND (p_has_phone IS NULL OR (p_has_phone = true AND (e.ddd_telefone_1 IS NOT NULL OR e.ddd_telefone_2 IS NOT NULL)))
    AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios != ''));

  -- Retornar dados públicos SEM dados sensíveis
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
    (e.email IS NOT NULL OR e.correio_eletronico IS NOT NULL) as has_email,
    (e.ddd_telefone_1 IS NOT NULL OR e.ddd_telefone_2 IS NOT NULL) as has_phone,
    (e.socios IS NOT NULL AND e.socios != '') as has_socios,
    total as total_count
  FROM empresas e
  WHERE 
    (p_uf IS NULL OR e.uf = p_uf)
    AND (p_municipio IS NULL OR e.municipio ILIKE '%' || p_municipio || '%')
    AND (p_sit_cadastral IS NULL OR e.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR e.porte_empresa = p_porte)
    AND (p_cnae IS NULL OR e.cnae_codigo ILIKE p_cnae || '%')
    AND (p_simples IS NULL OR e.opcao_simples = p_simples)
    AND (p_mei IS NULL OR e.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR e.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR e.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR (p_has_email = true AND (e.email IS NOT NULL OR e.correio_eletronico IS NOT NULL)))
    AND (p_has_phone IS NULL OR (p_has_phone = true AND (e.ddd_telefone_1 IS NOT NULL OR e.ddd_telefone_2 IS NOT NULL)))
    AND (p_has_socios IS NULL OR (p_has_socios = true AND e.socios IS NOT NULL AND e.socios != ''))
  ORDER BY e.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.get_empresas_public TO authenticated;