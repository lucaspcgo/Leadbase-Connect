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