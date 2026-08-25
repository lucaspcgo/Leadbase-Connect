-- SECURITY FIX: Protect sensitive contact data in empresas table
-- Step 1: Create unlocked_companies table to track which companies each user has unlocked

CREATE TABLE IF NOT EXISTS public.unlocked_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_cnpj text NOT NULL,
  empresa_id bigint,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  billing_cycle_start timestamp with time zone NOT NULL DEFAULT now(),
  billing_cycle_end timestamp with time zone NOT NULL DEFAULT (now() + interval '1 month'),
  UNIQUE(user_id, empresa_cnpj)
);

-- Enable RLS on unlocked_companies
ALTER TABLE public.unlocked_companies ENABLE ROW LEVEL SECURITY;

-- Users can only see their own unlocked companies
CREATE POLICY "Users can view own unlocked companies"
ON public.unlocked_companies FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own unlocked companies
CREATE POLICY "Users can insert own unlocked companies"
ON public.unlocked_companies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all unlocked companies
CREATE POLICY "Admins can view all unlocked companies"
ON public.unlocked_companies FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admins can manage all unlocked companies
CREATE POLICY "Admins can manage unlocked companies"
ON public.unlocked_companies FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Step 2: Create a public view that excludes sensitive contact information
CREATE OR REPLACE VIEW public.empresas_public
WITH (security_invoker = on) AS
SELECT 
  id,
  -- Generic business info (visible to all)
  uf,
  municipio,
  cod_municipio,
  sit_cadastral,
  data_sit_cadastral,
  motivo_sit_cadastral,
  cnae_fiscal,
  cnae_codigo,
  cnaes_secundarios,
  porte_empresa,
  opcao_simples,
  data_opcao_simples,
  data_exclusao_simples,
  opcao_mei,
  matriz_filial,
  data_inicio_atividade,
  sit_especial,
  data_sit_especial,
  cod_natureza_juridica,
  capital_social_empresa,
  cod_pais,
  nome_pais,
  nome_cidade_exterior,
  qualif_responsavel,
  categoria_id,
  tags,
  created_at,
  updated_at,
  -- Indicate if contact data exists (without exposing actual values)
  (email IS NOT NULL OR correio_eletronico IS NOT NULL) AS has_email,
  (ddd_telefone_1 IS NOT NULL OR ddd_telefone_2 IS NOT NULL) AS has_phone,
  (socios IS NOT NULL OR socios_raw IS NOT NULL) AS has_socios
FROM public.empresas;

-- Step 3: Drop existing overly permissive SELECT policies for regular users
DROP POLICY IF EXISTS "Users can view empresas" ON empresas;

-- Step 4: Create new restrictive policy - regular users can ONLY access if admin or if unlocked
CREATE POLICY "Users can only view empresas if unlocked or admin"
ON empresas FOR SELECT
TO authenticated
USING (
  -- Admins can see everything
  is_admin(auth.uid())
  OR
  -- Regular users can only see companies they have unlocked
  EXISTS (
    SELECT 1 FROM public.unlocked_companies uc
    WHERE uc.empresa_cnpj = empresas.cnpj
    AND uc.user_id = auth.uid()
    AND uc.billing_cycle_end >= now()
  )
);

-- Step 5: Grant SELECT on the view to authenticated users
GRANT SELECT ON public.empresas_public TO authenticated;

-- Step 6: Add comment for documentation
COMMENT ON VIEW public.empresas_public IS 'Public view of empresas table that hides sensitive contact information. Use this for search/listing. Full data available only for unlocked companies or to admins.';
COMMENT ON TABLE public.unlocked_companies IS 'Tracks which companies each user has unlocked, with billing cycle info for re-access logic.';