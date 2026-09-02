-- Filtrar por CNAE e ordenar por created_at ao mesmo tempo: sem este indice
-- o Postgres acha as linhas do CNAE por um indice e depois ordena o conjunto
-- inteiro (ate 1,07 milhao de linhas no CNAE do vestuario).
set maintenance_work_mem = '512MB';
create index if not exists idx_empresas_cnae_created_sort
  on public.empresas (cnae_codigo, created_at desc, id desc);
analyze public.empresas;
-- Corrige o filtro por CNAE.
--
-- A condicao era:
--   e.cnae_codigo = p_cnae OR e.cnae_codigo = v_cnae_clean
--   OR LPAD(e.cnae_codigo, 7, '0') = LPAD(v_cnae_clean, 7, '0')
--
-- O LPAD sobre a coluna impede o uso de qualquer indice de cnae_codigo. O
-- planejador entao percorria o indice de created_at testando linha a linha.
-- Como a importacao entrou um CNAE por vez, as empresas de cada CNAE ficaram
-- agrupadas no tempo: para achar as do vestuario era preciso pular milhoes de
-- linhas. Resultado: a busca por CNAE estourava o tempo limite (57014).
--
-- Agora o codigo e normalizado uma vez, em v_cnae_clean, para a forma exata
-- da coluna (so digitos, sem zero a esquerda), e a comparacao e uma igualdade
-- simples, que o indice atende.

CREATE OR REPLACE FUNCTION public.get_empresas_public(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_uf text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_sit_cadastral text DEFAULT NULL::text, p_porte text DEFAULT NULL::text, p_cnae text DEFAULT NULL::text, p_simples text DEFAULT NULL::text, p_mei text DEFAULT NULL::text, p_matriz_filial text DEFAULT NULL::text, p_categoria_id text DEFAULT NULL::text, p_has_email boolean DEFAULT NULL::boolean, p_has_phone boolean DEFAULT NULL::boolean, p_has_socios boolean DEFAULT NULL::boolean, p_data_abertura_inicio text DEFAULT NULL::text, p_data_abertura_fim text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_busca_socio text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id text, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_count BIGINT;
    v_cnae_clean TEXT;
BEGIN
    -- Limpeza rápida do CNAE
    -- Normaliza o CNAE para a forma exata em que ele esta gravado na coluna
    -- cnae_codigo: so digitos, sem zero a esquerda (0111301 -> 111301).
    --
    -- O menu de filtros manda "4781400 - COMERCIO VAREJISTA DE ...", entao
    -- primeiro separamos o codigo da descricao. Aplicar o regexp na string
    -- inteira juntaria numeros da descricao ao codigo.
    IF p_cnae IS NOT NULL AND btrim(p_cnae) <> '' THEN
        v_cnae_clean := ltrim(
            regexp_replace(split_part(p_cnae, ' - ', 1), '\D', '', 'g'),
            '0'
        );
        IF v_cnae_clean = '' THEN
            v_cnae_clean := NULL;
        END IF;
    END IF;

    -- Sem nenhum filtro: estimativa instantanea, nao conta 22,6 milhoes.
    IF p_cnae IS NULL AND p_uf IS NULL AND p_municipio IS NULL
       AND p_sit_cadastral IS NULL AND p_porte IS NULL AND p_simples IS NULL
       AND p_mei IS NULL AND p_matriz_filial IS NULL AND p_categoria_id IS NULL
       AND p_has_email IS NULL AND p_has_phone IS NULL AND p_has_socios IS NULL
       AND p_data_abertura_inicio IS NULL AND p_data_abertura_fim IS NULL
       AND p_tags IS NULL AND p_busca_socio IS NULL AND p_search IS NULL THEN

        SELECT GREATEST(reltuples::BIGINT, 0) INTO v_total_count
        FROM pg_class
        WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;

    ELSE
      BEGIN
        SET LOCAL statement_timeout = '5s';
        SELECT COUNT(*) INTO v_total_count
    FROM public.empresas e
    WHERE (v_cnae_clean IS NULL OR e.cnae_codigo = v_cnae_clean)
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
      EXCEPTION WHEN OTHERS THEN
        -- COUNT estourou o tempo: mostra a estimativa da tabela.
        SELECT GREATEST(reltuples::BIGINT, 0) INTO v_total_count
        FROM pg_class
        WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
      END;
    END IF;

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
    WHERE (v_cnae_clean IS NULL OR e.cnae_codigo = v_cnae_clean)
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
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$;
