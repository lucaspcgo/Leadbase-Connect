-- As views com security_invoker herdam RLS da tabela base
-- Mas empresas_public precisa ser acessível para usuários autenticados
-- Vamos criar uma abordagem diferente: remover security_invoker e usar RLS na view

-- 1. Recriar empresas_public SEM security_invoker (será acessível via RLS própria)
DROP VIEW IF EXISTS public.empresas_public;

-- View que não expõe dados sensíveis - acessível a todos autenticados
CREATE VIEW public.empresas_public AS
SELECT 
  id,
  matriz_filial,
  sit_cadastral,
  data_sit_cadastral,
  motivo_sit_cadastral,
  nome_cidade_exterior,
  cod_pais,
  nome_pais,
  cod_natureza_juridica,
  data_inicio_atividade,
  cnae_fiscal,
  cnae_codigo,
  uf,
  cod_municipio,
  municipio,
  porte_empresa,
  opcao_simples,
  data_opcao_simples,
  data_exclusao_simples,
  opcao_mei,
  sit_especial,
  data_sit_especial,
  cnaes_secundarios,
  categoria_id,
  tags,
  capital_social_empresa,
  qualif_responsavel,
  created_at,
  updated_at,
  -- Indicadores sem expor dados reais
  (email IS NOT NULL OR correio_eletronico IS NOT NULL) as has_email,
  (ddd_telefone_1 IS NOT NULL OR ddd_telefone_2 IS NOT NULL) as has_phone,
  (socios IS NOT NULL AND socios != '') as has_socios
FROM public.empresas;

-- Conceder acesso à view para usuários autenticados
GRANT SELECT ON public.empresas_public TO authenticated;

-- 2. Remover views desnecessárias que criam confusão
DROP VIEW IF EXISTS public.credit_transactions_user;
DROP VIEW IF EXISTS public.profiles_team_view;

-- As tabelas credit_transactions e profiles já têm RLS adequado
-- Users só veem seus próprios dados, admins veem tudo