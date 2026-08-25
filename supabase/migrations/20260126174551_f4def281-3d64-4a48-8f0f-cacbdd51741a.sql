-- 1. Recriar a view empresas_public com security_invoker para herdar RLS
DROP VIEW IF EXISTS public.empresas_public;

CREATE VIEW public.empresas_public
WITH (security_invoker = on)
AS
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

-- 2. Criar política RLS para a view (via tabela base empresas)
-- A view com security_invoker já herda as políticas da tabela empresas

-- 3. Corrigir política da tabela socios - só permitir acesso se empresa desbloqueada ou admin
DROP POLICY IF EXISTS "Users can view socios" ON public.socios;

CREATE POLICY "Users can view socios for unlocked companies"
ON public.socios
FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM public.unlocked_companies uc
    WHERE uc.empresa_cnpj = socios.empresa_cnpj
    AND uc.user_id = auth.uid()
    AND uc.billing_cycle_end >= now()
  )
);

-- 4. Limitar visibilidade de admin_id em credit_transactions para usuários
-- Criar view segura para transações de crédito do usuário
CREATE OR REPLACE VIEW public.credit_transactions_user
WITH (security_invoker = on)
AS
SELECT 
  id,
  user_id,
  amount,
  type,
  reason,
  created_at
  -- Omitir admin_id para usuários comuns
FROM public.credit_transactions;

-- 5. Restringir campos visíveis de team_members para o próprio membro
-- O owner pode ver tudo, mas membros só veem seu próprio registro básico
-- Já existe RLS apropriada, mantendo como está

-- 6. Garantir que profiles não exponha dados sensíveis para team members
-- Criar view restrita para team members
CREATE OR REPLACE VIEW public.profiles_team_view
WITH (security_invoker = on)
AS
SELECT 
  user_id,
  name,
  plan_id,
  plan_start_date,
  status
  -- Omitir extra_credits e monthly_limit_override
FROM public.profiles;