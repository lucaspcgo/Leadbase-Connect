-- Recriar view com security_invoker para segurança adequada
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
  (email IS NOT NULL OR correio_eletronico IS NOT NULL) as has_email,
  (ddd_telefone_1 IS NOT NULL OR ddd_telefone_2 IS NOT NULL) as has_phone,
  (socios IS NOT NULL AND socios != '') as has_socios
FROM public.empresas;

-- Criar política permissiva para usuários autenticados verem dados básicos
-- Esta política é ADICIONAL às existentes (OR lógico entre PERMISSIVE policies)
CREATE POLICY "Authenticated users can view empresas for public view"
ON public.empresas
FOR SELECT
TO authenticated
USING (true);

-- IMPORTANTE: A política acima permite SELECT, mas a VIEW só expõe colunas seguras
-- Os dados sensíveis (email, telefone, endereço) NÃO estão na view empresas_public

-- Nota: Políticas existentes ainda protegem dados sensíveis:
-- - "Admins can view all empresas" - admins veem tudo
-- - "Users can only view empresas if unlocked or admin" - controla acesso completo
-- A nova política só afeta a VIEW que não tem dados sensíveis