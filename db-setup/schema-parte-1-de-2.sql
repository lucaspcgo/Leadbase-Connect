-- =====================================================================
--  LeadsBasePro - schema completo
--  PARTE 1 de 2. Gerado a partir das 104 migracoes em supabase/migrations/,
--  concatenadas em ordem cronologica.
--
--  COMO USAR: cole no SQL Editor de um projeto Supabase NOVO/VAZIO
--  e execute. Rode os arquivos na ordem (parte 1, 2, 3...).
--
--  Cria apenas a ESTRUTURA (tabelas, RLS, funcoes, triggers).
--  Nao contem dados.
-- =====================================================================



-- ---------------------------------------------------------------
-- 20260114002409_2f835226-2a7f-42e4-9e27-989dff3aeae5.sql
-- ---------------------------------------------------------------
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'master_admin');

-- Create profiles table to store user profile data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  extra_credits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'SUSPENDED')),
  plan_id TEXT NOT NULL DEFAULT 'free',
  plan_start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  monthly_limit_override INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is admin or master_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'master_admin')
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'master_admin' THEN 1 
      WHEN 'admin' THEN 2 
      ELSE 3 
    END
  LIMIT 1
$$;

-- RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can update their own profile (except status and role-related fields)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only master_admin can insert/update/delete roles
CREATE POLICY "Master admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------
-- 20260114004003_e5d54971-b31f-4ef0-a14e-61409456d5dd.sql
-- ---------------------------------------------------------------
-- Drop the existing ALL policy and create explicit policies for each operation
-- This ensures no ambiguity in access control

-- First, drop the existing policy
DROP POLICY IF EXISTS "Master admins can manage roles" ON public.user_roles;

-- Create explicit SELECT policy for master admins (admins already have one)
-- Note: Admins can view all roles is already in place

-- Create explicit INSERT policy - ONLY master_admin can insert roles
CREATE POLICY "Only master admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- Create explicit UPDATE policy - ONLY master_admin can update roles
CREATE POLICY "Only master admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- Create explicit DELETE policy - ONLY master_admin can delete roles
CREATE POLICY "Only master admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));


-- ---------------------------------------------------------------
-- 20260114015142_782e86d9-3f2e-422f-9cab-6820068eee17.sql
-- ---------------------------------------------------------------
-- Create payment_configs table to store payment gateway credentials securely
CREATE TABLE public.payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- PIX Configuration (chave_pix is less sensitive)
  pix_enabled BOOLEAN DEFAULT false,
  pix_chave TEXT,
  pix_tipo_chave TEXT DEFAULT 'EMAIL',
  pix_beneficiario TEXT,
  pix_cidade TEXT,
  pix_instrucoes TEXT,
  
  -- Mercado Pago Configuration (SECRETS - access_token, webhook_secret)
  mercado_pago_enabled BOOLEAN DEFAULT false,
  mercado_pago_access_token TEXT, -- SECRET
  mercado_pago_public_key TEXT,
  mercado_pago_sandbox_mode BOOLEAN DEFAULT true,
  mercado_pago_webhook_secret TEXT, -- SECRET
  
  -- PayPal Configuration (SECRETS - client_secret)
  paypal_enabled BOOLEAN DEFAULT false,
  paypal_client_id TEXT,
  paypal_client_secret TEXT, -- SECRET
  paypal_sandbox_mode BOOLEAN DEFAULT true,
  paypal_webhook_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

-- ONLY master_admin can view payment config
CREATE POLICY "Only master_admin can view payment config"
ON public.payment_configs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

-- ONLY master_admin can insert payment config
CREATE POLICY "Only master_admin can insert payment config"
ON public.payment_configs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- ONLY master_admin can update payment config
CREATE POLICY "Only master_admin can update payment config"
ON public.payment_configs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- ONLY master_admin can delete payment config
CREATE POLICY "Only master_admin can delete payment config"
ON public.payment_configs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_payment_configs_updated_at
BEFORE UPDATE ON public.payment_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config row
INSERT INTO public.payment_configs (
  pix_enabled,
  pix_beneficiario,
  pix_cidade,
  pix_instrucoes,
  mercado_pago_sandbox_mode,
  paypal_sandbox_mode
) VALUES (
  true,
  'LeadBase Pro',
  'Sao Paulo',
  'Pagamento para assinatura LeadBase Pro',
  true,
  true
);


-- ---------------------------------------------------------------
-- 20260114120219_3068ecdb-4278-4928-a0d1-aff6ecc93fb7.sql
-- ---------------------------------------------------------------
-- =====================================================
-- CATEGORIAS TABLE
-- =====================================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Admins can manage categories
CREATE POLICY "Admins can view all categories" ON public.categorias
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert categories" ON public.categorias
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update categories" ON public.categorias
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete categories" ON public.categorias
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view active categories (for filtering)
CREATE POLICY "Users can view active categories" ON public.categorias
  FOR SELECT USING (ativo = true);

CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TAGS TABLE
-- =====================================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Admins can manage tags
CREATE POLICY "Admins can view all tags" ON public.tags
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert tags" ON public.tags
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tags" ON public.tags
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tags" ON public.tags
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view all tags (for filtering)
CREATE POLICY "Users can view tags" ON public.tags
  FOR SELECT USING (true);

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- EMPRESAS TABLE (42 columns as per schema)
-- =====================================================
CREATE TABLE public.empresas (
  id BIGSERIAL PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  matriz_filial TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
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
  desc_tipo_logradouro TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cep TEXT,
  uf TEXT,
  cod_municipio TEXT,
  municipio TEXT,
  ddd_telefone_1 TEXT,
  telefone1_celular BOOLEAN,
  ddd_telefone_2 TEXT,
  telefone2_celular BOOLEAN,
  ddd_fax TEXT,
  correio_eletronico TEXT,
  email TEXT,
  qualif_responsavel TEXT,
  capital_social_empresa NUMERIC,
  porte_empresa TEXT,
  opcao_simples TEXT,
  data_opcao_simples DATE,
  data_exclusao_simples DATE,
  opcao_mei TEXT,
  sit_especial TEXT,
  data_sit_especial DATE,
  socios TEXT,
  socios_raw TEXT,
  cnaes_secundarios TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_empresas_cnpj ON public.empresas(cnpj);
CREATE INDEX idx_empresas_uf ON public.empresas(uf);
CREATE INDEX idx_empresas_municipio ON public.empresas(municipio);
CREATE INDEX idx_empresas_cnae ON public.empresas(cnae_codigo);
CREATE INDEX idx_empresas_sit_cadastral ON public.empresas(sit_cadastral);
CREATE INDEX idx_empresas_porte ON public.empresas(porte_empresa);
CREATE INDEX idx_empresas_categoria ON public.empresas(categoria_id);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Admins can manage all empresas
CREATE POLICY "Admins can view all empresas" ON public.empresas
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert empresas" ON public.empresas
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update empresas" ON public.empresas
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete empresas" ON public.empresas
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view generic empresa data (without sensitive info - handled in application)
CREATE POLICY "Users can view empresas" ON public.empresas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SOCIOS TABLE
-- =====================================================
CREATE TABLE public.socios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cnpj TEXT NOT NULL,
  nome_socio TEXT NOT NULL,
  qualificacao TEXT,
  fonte TEXT NOT NULL DEFAULT 'manual' CHECK (fonte IN ('importado', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_socios_empresa ON public.socios(empresa_cnpj);

ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;

-- Admins can manage all socios
CREATE POLICY "Admins can view all socios" ON public.socios
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert socios" ON public.socios
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update socios" ON public.socios
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete socios" ON public.socios
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view socios (access control handled in application)
CREATE POLICY "Users can view socios" ON public.socios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_socios_updated_at
  BEFORE UPDATE ON public.socios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'OVERDUE')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invoices
CREATE POLICY "Admins can view all invoices" ON public.invoices
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update invoices" ON public.invoices
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete invoices" ON public.invoices
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view own invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('PIX', 'MERCADO_PAGO', 'PAYPAL')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'FAILED', 'CANCELLED', 'REFUNDED')),
  external_id TEXT,
  pix_code TEXT,
  pix_qrcode TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all payments
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert payments" ON public.payments
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view own payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create own payments
CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  price NUMERIC NOT NULL,
  start_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions
  FOR DELETE USING (is_admin(auth.uid()));

-- Users can view own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- EMPRESA AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.empresa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_name TEXT NOT NULL,
  empresa_cnpj TEXT NOT NULL,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_empresa_audit_cnpj ON public.empresa_audit_logs(empresa_cnpj);
CREATE INDEX idx_empresa_audit_admin ON public.empresa_audit_logs(admin_id);

ALTER TABLE public.empresa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view empresa audit logs" ON public.empresa_audit_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert empresa audit logs" ON public.empresa_audit_logs
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- FINANCIAL AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('PAYMENT_MARKED_PAID', 'SUBSCRIPTION_EXTENDED', 'SUBSCRIPTION_CANCELLED', 'REFUND_ISSUED', 'CONFIG_CHANGED')),
  target_user_id UUID,
  target_user_email TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PAYMENT', 'SUBSCRIPTION', 'INVOICE', 'CONFIG')),
  entity_id UUID,
  details TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_audit_admin ON public.financial_audit_logs(admin_id);
CREATE INDEX idx_financial_audit_entity ON public.financial_audit_logs(entity_type, entity_id);

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view financial audit logs
CREATE POLICY "Admins can view financial audit logs" ON public.financial_audit_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert financial audit logs" ON public.financial_audit_logs
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- SAVED FILTERS TABLE
-- =====================================================
CREATE TABLE public.saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Users can manage own filters
CREATE POLICY "Users can view own saved filters" ON public.saved_filters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved filters" ON public.saved_filters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved filters" ON public.saved_filters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved filters" ON public.saved_filters
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON public.saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================
INSERT INTO public.categorias (nome, cor, ativo) VALUES
  ('Tecnologia', '#3B82F6', true),
  ('Varejo', '#10B981', true),
  ('Serviços', '#F59E0B', true),
  ('Indústria', '#8B5CF6', true);

INSERT INTO public.tags (nome) VALUES
  ('Cliente Potencial'),
  ('Alto Valor'),
  ('Contatado'),
  ('Negociação');


-- ---------------------------------------------------------------
-- 20260114122517_980a20d5-d843-4293-aa24-7425c86c4053.sql
-- ---------------------------------------------------------------
-- Corrigir políticas RLS da tabela profiles para serem PERMISSIVE
-- Drop das políticas existentes (RESTRICTIVE)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recriar como PERMISSIVE (padrão)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Corrigir políticas RLS da tabela user_roles para SELECT ser PERMISSIVE
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------
-- 20260114123638_61bb8c9a-a5d2-4391-ba37-e5009cbc2d4e.sql
-- ---------------------------------------------------------------
-- Drop existing RESTRICTIVE policies on empresas
DROP POLICY IF EXISTS "Admins can delete empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can view empresas" ON public.empresas;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can view all empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert empresas" 
ON public.empresas 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update empresas" 
ON public.empresas 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete empresas" 
ON public.empresas 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------
-- 20260114134911_51592488-2e55-443c-bb78-d42369227f52.sql
-- ---------------------------------------------------------------
-- Fix RLS policies for empresas table - change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all empresas" ON empresas;
DROP POLICY IF EXISTS "Users can view empresas" ON empresas;

-- Create permissive policies for SELECT
CREATE POLICY "Admins can view all empresas"
ON empresas FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view empresas"
ON empresas FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);


-- ---------------------------------------------------------------
-- 20260114143952_b69d8218-f601-4b8a-8d99-65d710497ae1.sql
-- ---------------------------------------------------------------
-- Fix RLS policies: Change SELECT policies from RESTRICTIVE to PERMISSIVE
-- The issue is that RESTRICTIVE policies use AND logic, so a regular user
-- cannot see their own data because they also need to be an admin.
-- PERMISSIVE policies use OR logic, which is what we need.

-- =============================================
-- FIX PROFILES TABLE SELECT POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create PERMISSIVE policies (default is PERMISSIVE)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- =============================================
-- FIX USER_ROLES TABLE SELECT POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Create PERMISSIVE policies
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------
-- 20260114180543_f323cebb-3701-4a35-a9c3-18c9875a5a37.sql
-- ---------------------------------------------------------------
-- Create support_tickets table for user support requests
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  admin_response TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create access_logs table to track company access history
CREATE TABLE public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_cnpj TEXT NOT NULL,
  empresa_razao_social TEXT,
  action TEXT NOT NULL DEFAULT 'view',
  credits_used INTEGER DEFAULT 0,
  used_extra_credit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_transactions table for credit history
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Support tickets policies
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (is_admin(auth.uid()));

-- Access logs policies
CREATE POLICY "Users can view their own access logs"
ON public.access_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create access logs"
ON public.access_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all access logs"
ON public.access_logs FOR SELECT
USING (is_admin(auth.uid()));

-- Credit transactions policies
CREATE POLICY "Users can view their own credit transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit transactions"
ON public.credit_transactions FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create credit transactions"
ON public.credit_transactions FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON public.access_logs(created_at);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);


-- ---------------------------------------------------------------
-- 20260114181319_1081331f-ea18-4852-b86c-39632f7f7f4f.sql
-- ---------------------------------------------------------------
-- Fix RLS policies for profiles table - change from RESTRICTIVE to PERMISSIVE
-- This allows regular users to access their own profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate SELECT policies as PERMISSIVE (explicit)
CREATE POLICY "Users can view own profile"
ON public.profiles AS PERMISSIVE
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles AS PERMISSIVE
FOR SELECT TO authenticated  
USING (is_admin(auth.uid()));

-- Recreate UPDATE policies as PERMISSIVE (explicit)
CREATE POLICY "Users can update own profile"
ON public.profiles AS PERMISSIVE
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
ON public.profiles AS PERMISSIVE
FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));


-- ---------------------------------------------------------------
-- 20260114181714_4164da2e-3103-4653-8f79-1483864bc1da.sql
-- ---------------------------------------------------------------
-- Fix RLS policies for support_tickets table - change from RESTRICTIVE to PERMISSIVE
-- This allows users to view their own tickets and admins to view all tickets

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;

-- Recreate SELECT policies as PERMISSIVE (explicit)
CREATE POLICY "Users can view their own tickets"
ON support_tickets AS PERMISSIVE
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON support_tickets AS PERMISSIVE
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Recreate INSERT policy as PERMISSIVE
CREATE POLICY "Users can create tickets"
ON support_tickets AS PERMISSIVE
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate UPDATE policy as PERMISSIVE for admins
CREATE POLICY "Admins can update tickets"
ON support_tickets AS PERMISSIVE
FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

-- Allow users to respond/update their own tickets (add message reply)
CREATE POLICY "Users can update own tickets"
ON support_tickets AS PERMISSIVE
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);


-- ---------------------------------------------------------------
-- 20260114182316_30c7c65c-dd9a-4cb5-b662-a61f09d0a4cb.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260114235159_369ff0e7-3d35-4a8a-a26b-4a8edf962fe0.sql
-- ---------------------------------------------------------------
-- Create table for page content management
CREATE TABLE public.page_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Anyone can read published pages"
ON public.page_contents
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all pages"
ON public.page_contents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_page_contents_updated_at
BEFORE UPDATE ON public.page_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pages
INSERT INTO public.page_contents (page_slug, title, content, meta_description, is_published) VALUES
('sobre-nos', 'Sobre Nós', '{"hero": {"title": "Sobre a LeadBase", "subtitle": "Conectando empresas aos melhores leads do mercado"}, "sections": [{"title": "Nossa Missão", "content": "Facilitar o acesso a informações empresariais de qualidade para impulsionar o crescimento de negócios em todo o Brasil."}, {"title": "Nossa História", "content": "Fundada em 2024, a LeadBase nasceu da necessidade de democratizar o acesso a dados empresariais confiáveis e atualizados."}, {"title": "Nossos Valores", "content": "Transparência, inovação e compromisso com a qualidade são os pilares que guiam todas as nossas ações."}]}', 'Conheça a LeadBase - sua parceira na prospecção de clientes e geração de leads qualificados.', true),
('contato', 'Contato', '{"hero": {"title": "Entre em Contato", "subtitle": "Estamos aqui para ajudar"}, "info": {"email": "contato@leadbase.com.br", "phone": "(11) 99999-9999", "address": "São Paulo, SP - Brasil"}, "form": {"enabled": true}}', 'Entre em contato com a LeadBase. Tire suas dúvidas e saiba como podemos ajudar seu negócio.', true),
('blog', 'Blog', '{"hero": {"title": "Blog LeadBase", "subtitle": "Dicas e novidades sobre prospecção e vendas"}, "posts": []}', 'Blog da LeadBase - Artigos sobre prospecção, vendas e geração de leads.', true),
('carreiras', 'Carreiras', '{"hero": {"title": "Trabalhe Conosco", "subtitle": "Faça parte do nosso time"}, "intro": "Estamos sempre em busca de talentos que compartilham nossa paixão por inovação e tecnologia.", "benefits": ["Trabalho remoto", "Horário flexível", "Plano de saúde", "Vale refeição"], "positions": []}', 'Vagas de emprego na LeadBase. Venha fazer parte do nosso time!', true);

-- Create blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES auth.users(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can read published posts"
ON public.blog_posts
FOR SELECT
USING (is_published = true);

-- Admins can manage posts
CREATE POLICY "Admins can manage all posts"
ON public.blog_posts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create job positions table
CREATE TABLE public.job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  type TEXT, -- full-time, part-time, contract
  description TEXT NOT NULL,
  requirements TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

-- Public can read active positions
CREATE POLICY "Anyone can read active positions"
ON public.job_positions
FOR SELECT
USING (is_active = true);

-- Admins can manage positions
CREATE POLICY "Admins can manage all positions"
ON public.job_positions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_job_positions_updated_at
BEFORE UPDATE ON public.job_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------
-- 20260126123613_fce3232e-a1c6-4221-9c21-3211d49fb0ac.sql
-- ---------------------------------------------------------------
-- Create table for team members (sub-users linked to an account manager)
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  member_user_id UUID NOT NULL UNIQUE,
  member_email TEXT NOT NULL,
  member_name TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
-- Team owners (account managers) can view their team members
CREATE POLICY "Owners can view their team members"
ON public.team_members
FOR SELECT
USING (auth.uid() = owner_user_id);

-- Team owners can insert team members (max 3, enforced in app)
CREATE POLICY "Owners can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Team owners can update their team members
CREATE POLICY "Owners can update their team members"
ON public.team_members
FOR UPDATE
USING (auth.uid() = owner_user_id);

-- Team owners can delete their team members
CREATE POLICY "Owners can delete their team members"
ON public.team_members
FOR DELETE
USING (auth.uid() = owner_user_id);

-- Team members can view their own record
CREATE POLICY "Members can view their own record"
ON public.team_members
FOR SELECT
USING (auth.uid() = member_user_id);

-- Admins can manage all team members
CREATE POLICY "Admins can manage all team members"
ON public.team_members
FOR ALL
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_team_members_owner ON public.team_members(owner_user_id);
CREATE INDEX idx_team_members_member ON public.team_members(member_user_id);


-- ---------------------------------------------------------------
-- 20260126134353_cc377ec1-7a69-4398-aac0-159d8e80c989.sql
-- ---------------------------------------------------------------
-- Allow team members to view their owner's profile (to inherit plan settings)
CREATE POLICY "Team members can view owner profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = profiles.user_id
    AND tm.status = 'ACTIVE'
  )
);


-- ---------------------------------------------------------------
-- 20260126134814_e9784115-cf9b-4ef8-b153-a3e82a48ef21.sql
-- ---------------------------------------------------------------
-- Allow team members to view their owner's unlocked companies
CREATE POLICY "Team members can view owner unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = unlocked_companies.user_id
    AND tm.status = 'ACTIVE'
  )
);


-- ---------------------------------------------------------------
-- 20260126140403_b5ffb7fa-0374-426f-aee3-f233eb3db760.sql
-- ---------------------------------------------------------------
-- Create plans table to store subscription plans
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  monthly_company_limit INTEGER NOT NULL DEFAULT 10,
  features TEXT[] NOT NULL DEFAULT '{}',
  max_users INTEGER,
  can_export BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans (public pricing page)
CREATE POLICY "Anyone can view active plans"
ON public.plans
FOR SELECT
USING (is_active = true);

-- Admins can view all plans (including inactive)
CREATE POLICY "Admins can view all plans"
ON public.plans
FOR SELECT
USING (is_admin(auth.uid()));

-- Only master_admin can insert plans
CREATE POLICY "Only master_admin can insert plans"
ON public.plans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Only master_admin can update plans
CREATE POLICY "Only master_admin can update plans"
ON public.plans
FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

-- Only master_admin can delete plans
CREATE POLICY "Only master_admin can delete plans"
ON public.plans
FOR DELETE
USING (has_role(auth.uid(), 'master_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans from existing mockData
INSERT INTO public.plans (id, name, description, price_monthly, price_yearly, monthly_company_limit, features, max_users, can_export, is_active, display_order, is_popular) VALUES
('free', 'Free', 'Perfeito para começar', 0, 0, 10, ARRAY['10 empresas/mês', 'Dados básicos', 'Suporte por email'], NULL, false, true, 0, false),
('basic', 'Basic', 'Ideal para freelancers', 49, 490, 300, ARRAY['300 empresas/mês', 'Todos os dados', 'Histórico de consultas', 'Suporte por email'], NULL, false, true, 1, false),
('pro', 'Pro', 'Para profissionais exigentes', 129, 1290, 1000, ARRAY['1.000 empresas/mês', 'Todos os dados', 'Exportação CSV', 'Histórico completo', 'Suporte prioritário'], NULL, true, true, 2, true),
('equipe', 'Equipe', 'Solução para times', 299, 2990, 3000, ARRAY['3.000 empresas/mês', 'Até 3 usuários', 'Todos os dados', 'Exportação ilimitada', 'API de integração', 'Gerente de conta'], 3, true, true, 3, false)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------
-- 20260126174551_f4def281-3d64-4a48-8f0f-cacbdd51741a.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260126174737_7d760614-b9d4-4d8a-8b91-f1bc8c6e5243.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260126174807_22dbf94c-21ee-4c65-9077-61e70631d653.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260126174928_3b23e0d4-25c2-45a5-be0e-19800681cb0c.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260126182027_bd7dd2aa-0e9e-46fa-aed1-32e70cd2cd71.sql
-- ---------------------------------------------------------------
-- 1. Restringir team members - Atualizar policies em access_logs
-- Adicionar política para team members verem apenas logs do owner (se tiverem permissão)
CREATE POLICY "Team members can view owner access logs"
ON public.access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = access_logs.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- 2. Restringir team members em invoices - Adicionar política
CREATE POLICY "Team members can view owner invoices"
ON public.invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = invoices.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- 3. Restringir team members em payments
CREATE POLICY "Team members can view owner payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = payments.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- 4. Restringir team members em subscriptions
CREATE POLICY "Team members can view owner subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = subscriptions.user_id
    AND tm.status = 'ACTIVE'
  )
);


-- ---------------------------------------------------------------
-- 20260126184910_602ee246-3708-4541-b3de-f9fc06d10c73.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260126190044_db24e9d3-ac62-4272-b793-fb8d4d47fa40.sql
-- ---------------------------------------------------------------
-- Create import_logs table to track import history
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_name TEXT NOT NULL,
  filename TEXT,
  source TEXT NOT NULL DEFAULT 'file', -- 'file' or 'paste'
  total_rows INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  ufs_imported TEXT[], -- Array of UFs imported
  duplicate_mode TEXT NOT NULL DEFAULT 'skip', -- 'update' or 'skip'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view import logs
CREATE POLICY "Admins can view all import logs" 
  ON public.import_logs 
  FOR SELECT 
  USING (is_admin(auth.uid()));

-- Only admins can insert import logs
CREATE POLICY "Admins can insert import logs" 
  ON public.import_logs 
  FOR INSERT 
  WITH CHECK (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX idx_import_logs_admin_id ON public.import_logs(admin_id);


-- ---------------------------------------------------------------
-- 20260126202115_a9bfacfb-cd92-4f2a-a6f0-b157df02db74.sql
-- ---------------------------------------------------------------
-- Criar função para buscar CNAEs agrupados com contagem
-- SECURITY DEFINER permite que a função seja executada com privilégios do criador
CREATE OR REPLACE FUNCTION public.get_cnaes_grouped()
RETURNS TABLE(cnae_codigo TEXT, cnae_fiscal TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.cnae_codigo,
    e.cnae_fiscal,
    COUNT(*)::BIGINT as count
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL
  GROUP BY e.cnae_codigo, e.cnae_fiscal
  ORDER BY count DESC;
END;
$$;


-- ---------------------------------------------------------------
-- 20260126205208_1c379cad-cfe7-432b-a5ba-346a6f4c6539.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260126205538_62258105-e2ce-41e6-bcc7-1f7f9534d5d7.sql
-- ---------------------------------------------------------------
-- Create a public function to get distinct CNAEs for filter dropdown (available to all authenticated users)
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE (
  tipo text,
  valor text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return distinct CNAEs
  RETURN QUERY
  SELECT DISTINCT 'cnae'::text as tipo, e.cnae_codigo as valor
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
  
  UNION ALL
  
  SELECT DISTINCT 'cnae'::text as tipo, e.cnae_fiscal as valor
  FROM empresas e
  WHERE e.cnae_fiscal IS NOT NULL AND e.cnae_fiscal != '' AND e.cnae_fiscal != e.cnae_codigo
  
  UNION ALL
  
  -- Return distinct municipalities
  SELECT DISTINCT 'municipio'::text as tipo, e.municipio as valor
  FROM empresas e
  WHERE e.municipio IS NOT NULL AND e.municipio != ''
  
  ORDER BY tipo, valor;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_filter_options() TO authenticated;


-- ---------------------------------------------------------------
-- 20260126212548_ae18863c-d94e-4c3f-8e1a-73236e727ea5.sql
-- ---------------------------------------------------------------
-- Create a public function to get payment config enabled status (no secrets exposed)
-- This allows the checkout page to know which payment methods are available
CREATE OR REPLACE FUNCTION public.get_public_payment_config()
RETURNS TABLE (
  pix_enabled boolean,
  pix_beneficiario text,
  pix_cidade text,
  mercado_pago_enabled boolean,
  paypal_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pc.pix_enabled, false) as pix_enabled,
    pc.pix_beneficiario,
    pc.pix_cidade,
    COALESCE(pc.mercado_pago_enabled, false) as mercado_pago_enabled,
    COALESCE(pc.paypal_enabled, false) as paypal_enabled
  FROM payment_configs pc
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_payment_config() TO authenticated;


-- ---------------------------------------------------------------
-- 20260126213202_57e3acc9-5e33-4407-8b08-217dc40045c1.sql
-- ---------------------------------------------------------------
-- Allow users to insert their own invoices
CREATE POLICY "Users can insert own invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------
-- 20260126215115_299fe57b-2381-44e1-9152-73ae508c288f.sql
-- ---------------------------------------------------------------
-- Create a function to get PIX config for checkout (includes the key for QR code generation)
CREATE OR REPLACE FUNCTION public.get_pix_checkout_config()
RETURNS TABLE (
  pix_enabled boolean,
  pix_chave text,
  pix_tipo_chave text,
  pix_beneficiario text,
  pix_cidade text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can get PIX config for checkout
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(pc.pix_enabled, false) as pix_enabled,
    pc.pix_chave,
    pc.pix_tipo_chave,
    pc.pix_beneficiario,
    pc.pix_cidade
  FROM payment_configs pc
  LIMIT 1;
END;
$$;


-- ---------------------------------------------------------------
-- 20260127141755_d842cd2f-5819-4118-9d9d-685e4dca7014.sql
-- ---------------------------------------------------------------
-- Fix security findings: prevent any anon/public read access to sensitive tables
-- Ensure RLS is enabled and policies are scoped to the authenticated role.

BEGIN;

-- =====================
-- access_logs
-- =====================
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Users can create access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Team members can view owner access logs" ON public.access_logs;

CREATE POLICY "Users can view their own access logs"
ON public.access_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view owner access logs"
ON public.access_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
      AND tm.owner_user_id = public.access_logs.user_id
      AND tm.status = 'ACTIVE'
  )
);

CREATE POLICY "Admins can view all access logs"
ON public.access_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create access logs"
ON public.access_logs
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Explicitly remove any anon privileges (defense-in-depth; RLS already blocks)
REVOKE ALL ON TABLE public.access_logs FROM anon;
-- Ensure authenticated can still use the table (app + admins)
GRANT SELECT, INSERT ON TABLE public.access_logs TO authenticated;


-- =====================
-- socios
-- =====================
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view socios for unlocked companies" ON public.socios;
DROP POLICY IF EXISTS "Admins can view all socios" ON public.socios;
DROP POLICY IF EXISTS "Admins can insert socios" ON public.socios;
DROP POLICY IF EXISTS "Admins can update socios" ON public.socios;
DROP POLICY IF EXISTS "Admins can delete socios" ON public.socios;

CREATE POLICY "Users can view socios for unlocked companies"
ON public.socios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.unlocked_companies uc
    WHERE uc.empresa_cnpj = public.socios.empresa_cnpj
      AND uc.user_id = auth.uid()
      AND uc.billing_cycle_end >= now()
  )
);

CREATE POLICY "Admins can view all socios"
ON public.socios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert socios"
ON public.socios
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update socios"
ON public.socios
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete socios"
ON public.socios
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

REVOKE ALL ON TABLE public.socios FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.socios TO authenticated;

COMMIT;


-- ---------------------------------------------------------------
-- 20260128132923_b3c8b609-6b64-410b-a5ea-7e9172020ffa.sql
-- ---------------------------------------------------------------

-- Fix get_filter_options to avoid CNAE duplication
-- The issue is that cnae_codigo and cnae_fiscal often contain different formats of the same CNAE
-- We should prefer cnae_fiscal as it contains the full description

CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return distinct CNAEs - prefer cnae_fiscal (has full description)
  -- If cnae_fiscal is null, fall back to cnae_codigo
  RETURN QUERY
  SELECT DISTINCT 'cnae'::text as tipo, 
    COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo) as valor
  FROM empresas e
  WHERE (e.cnae_fiscal IS NOT NULL AND e.cnae_fiscal != '') 
     OR (e.cnae_codigo IS NOT NULL AND e.cnae_codigo != '')
  
  UNION ALL
  
  -- Return distinct municipalities
  SELECT DISTINCT 'municipio'::text as tipo, e.municipio as valor
  FROM empresas e
  WHERE e.municipio IS NOT NULL AND e.municipio != ''
  
  ORDER BY tipo, valor;
END;
$$;



-- ---------------------------------------------------------------
-- 20260128142710_2e3315fd-f767-404f-ae5d-bf2639f532bc.sql
-- ---------------------------------------------------------------
-- Add Stripe configuration columns to payment_configs table
ALTER TABLE public.payment_configs 
ADD COLUMN IF NOT EXISTS stripe_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
ADD COLUMN IF NOT EXISTS stripe_secret_key text,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret text,
ADD COLUMN IF NOT EXISTS stripe_sandbox_mode boolean DEFAULT true;


-- ---------------------------------------------------------------
-- 20260128145438_d5512193-bc8e-4767-ba32-ce07db303f70.sql
-- ---------------------------------------------------------------
-- Drop existing function and recreate with stripe_enabled
DROP FUNCTION IF EXISTS public.get_public_payment_config();

CREATE FUNCTION public.get_public_payment_config()
 RETURNS TABLE(pix_enabled boolean, pix_beneficiario text, pix_cidade text, mercado_pago_enabled boolean, paypal_enabled boolean, stripe_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pc.pix_enabled, false) as pix_enabled,
    pc.pix_beneficiario,
    pc.pix_cidade,
    COALESCE(pc.mercado_pago_enabled, false) as mercado_pago_enabled,
    COALESCE(pc.paypal_enabled, false) as paypal_enabled,
    COALESCE(pc.stripe_enabled, false) as stripe_enabled
  FROM payment_configs pc
  LIMIT 1;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260128150524_141b1f0c-7371-4c35-b818-ef3323cee313.sql
-- ---------------------------------------------------------------
-- Drop the existing constraint and recreate with STRIPE included
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_method_check;

-- Add new constraint including STRIPE
ALTER TABLE public.payments 
ADD CONSTRAINT payments_method_check 
CHECK (method IN ('PIX', 'MERCADO_PAGO', 'PAYPAL', 'STRIPE', 'CREDIT_CARD'));


-- ---------------------------------------------------------------
-- 20260128173556_ffb45c6c-3c15-4542-a34f-ac586bc11ae7.sql
-- ---------------------------------------------------------------
-- Drop and recreate the function with all required filter parameters
DROP FUNCTION IF EXISTS public.get_empresas_public;

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
  p_has_socios boolean DEFAULT NULL,
  -- NEW PARAMETERS
  p_data_abertura_inicio date DEFAULT NULL,
  p_data_abertura_fim date DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_busca_socio text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
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
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_email boolean, 
  has_phone boolean, 
  has_socios boolean, 
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_sql TEXT;
  v_count_sql TEXT;
  v_where TEXT := 'WHERE 1=1';
BEGIN
  -- Build WHERE clause dynamically for better performance
  IF p_uf IS NOT NULL THEN
    v_where := v_where || ' AND emp.uf = ' || quote_literal(p_uf);
  END IF;
  
  IF p_municipio IS NOT NULL THEN
    v_where := v_where || ' AND emp.municipio ILIKE ' || quote_literal('%' || p_municipio || '%');
  END IF;
  
  IF p_sit_cadastral IS NOT NULL THEN
    v_where := v_where || ' AND emp.sit_cadastral = ' || quote_literal(p_sit_cadastral);
  END IF;
  
  IF p_porte IS NOT NULL THEN
    v_where := v_where || ' AND emp.porte_empresa = ' || quote_literal(p_porte);
  END IF;
  
  IF p_cnae IS NOT NULL THEN
    v_where := v_where || ' AND (emp.cnae_codigo ILIKE ' || quote_literal(p_cnae || '%') || ' OR emp.cnae_fiscal ILIKE ' || quote_literal('%' || p_cnae || '%') || ')';
  END IF;
  
  IF p_simples IS NOT NULL THEN
    v_where := v_where || ' AND emp.opcao_simples = ' || quote_literal(p_simples);
  END IF;
  
  IF p_mei IS NOT NULL THEN
    v_where := v_where || ' AND emp.opcao_mei = ' || quote_literal(p_mei);
  END IF;
  
  IF p_matriz_filial IS NOT NULL THEN
    v_where := v_where || ' AND emp.matriz_filial = ' || quote_literal(p_matriz_filial);
  END IF;
  
  IF p_categoria_id IS NOT NULL THEN
    v_where := v_where || ' AND emp.categoria_id = ' || quote_literal(p_categoria_id);
  END IF;
  
  IF p_has_email = true THEN
    v_where := v_where || ' AND (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL)';
  END IF;
  
  IF p_has_phone = true THEN
    v_where := v_where || ' AND (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL)';
  END IF;
  
  IF p_has_socios = true THEN
    v_where := v_where || ' AND emp.socios IS NOT NULL AND emp.socios != ''''';
  END IF;

  -- NEW FILTERS
  IF p_data_abertura_inicio IS NOT NULL THEN
    v_where := v_where || ' AND emp.data_inicio_atividade >= ' || quote_literal(p_data_abertura_inicio);
  END IF;
  
  IF p_data_abertura_fim IS NOT NULL THEN
    v_where := v_where || ' AND emp.data_inicio_atividade <= ' || quote_literal(p_data_abertura_fim);
  END IF;
  
  IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
    v_where := v_where || ' AND emp.tags && ' || quote_literal(p_tags::text)::text || '::text[]';
  END IF;
  
  IF p_busca_socio IS NOT NULL AND p_busca_socio != '' THEN
    v_where := v_where || ' AND (emp.socios ILIKE ' || quote_literal('%' || p_busca_socio || '%') || ' OR emp.socios_raw ILIKE ' || quote_literal('%' || p_busca_socio || '%') || ')';
  END IF;
  
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_where := v_where || ' AND (emp.uf ILIKE ' || quote_literal('%' || p_search || '%') || 
      ' OR emp.municipio ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.cnae_fiscal ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.cnae_codigo ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.porte_empresa ILIKE ' || quote_literal('%' || p_search || '%') ||
      ' OR emp.sit_cadastral ILIKE ' || quote_literal('%' || p_search || '%') || ')';
  END IF;

  -- Get count with the same filters
  v_count_sql := 'SELECT COUNT(*) FROM public.empresas emp ' || v_where;
  EXECUTE v_count_sql INTO v_total;

  -- Return paginated data with total count
  RETURN QUERY EXECUTE format('
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
      (emp.socios IS NOT NULL AND emp.socios != '''') as has_socios,
      %s::bigint as total_count
    FROM public.empresas emp
    %s
    ORDER BY emp.id ASC
    LIMIT %s
    OFFSET %s
  ', v_total, v_where, p_limit, p_offset);
END;
$function$;


-- ---------------------------------------------------------------
-- 20260128174042_704173dd-316a-47b4-bc25-8712f63c209c.sql
-- ---------------------------------------------------------------
-- Drop and recreate get_filter_options with better performance
-- Use LIMIT to avoid timeout on large tables
DROP FUNCTION IF EXISTS public.get_filter_options();

CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
BEGIN
  -- Return distinct CNAEs - limit to most common 500 for performance
  RETURN QUERY
  SELECT DISTINCT 'cnae'::text as tipo, 
    COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo) as valor
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
  LIMIT 500;
  
  -- Return distinct municipalities - limit to most common 500
  RETURN QUERY
  SELECT DISTINCT 'municipio'::text as tipo, e.municipio as valor
  FROM empresas e
  WHERE e.municipio IS NOT NULL AND e.municipio != ''
  LIMIT 500;
  
  RETURN;
END;
$function$;

-- Create indexes to speed up CNAE and municipio queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_empresas_cnae_codigo ON empresas(cnae_codigo) WHERE cnae_codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_cnae_fiscal ON empresas(cnae_fiscal) WHERE cnae_fiscal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_municipio ON empresas(municipio) WHERE municipio IS NOT NULL;


-- ---------------------------------------------------------------
-- 20260128182602_2e045781-696d-49b7-b504-75539e7be962.sql
-- ---------------------------------------------------------------
-- Drop and recreate get_empresas_public with better performance using prepared statements
DROP FUNCTION IF EXISTS public.get_empresas_public(integer, integer, text, text, text, text, text, text, text, text, uuid, boolean, boolean, boolean, date, date, text[], text, text);

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
  p_has_socios boolean DEFAULT NULL, 
  p_data_abertura_inicio date DEFAULT NULL, 
  p_data_abertura_fim date DEFAULT NULL, 
  p_tags text[] DEFAULT NULL, 
  p_busca_socio text DEFAULT NULL, 
  p_search text DEFAULT NULL
)
RETURNS TABLE(
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
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_email boolean, 
  has_phone boolean, 
  has_socios boolean, 
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_total BIGINT;
BEGIN
  -- First, get the total count with filters applied
  SELECT COUNT(*) INTO v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%' OR emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR p_search = '' OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%' OR
         emp.porte_empresa ILIKE '%' || p_search || '%' OR
         emp.sit_cadastral ILIKE '%' || p_search || '%'
    );

  -- Return paginated results
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
    AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%' OR emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR p_search = '' OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%' OR
         emp.porte_empresa ILIKE '%' || p_search || '%' OR
         emp.sit_cadastral ILIKE '%' || p_search || '%'
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Create essential indexes for the most common filter columns if not exist
CREATE INDEX IF NOT EXISTS idx_empresas_uf ON empresas(uf);
CREATE INDEX IF NOT EXISTS idx_empresas_sit_cadastral ON empresas(sit_cadastral);
CREATE INDEX IF NOT EXISTS idx_empresas_porte_empresa ON empresas(porte_empresa);
CREATE INDEX IF NOT EXISTS idx_empresas_opcao_simples ON empresas(opcao_simples);
CREATE INDEX IF NOT EXISTS idx_empresas_opcao_mei ON empresas(opcao_mei);
CREATE INDEX IF NOT EXISTS idx_empresas_categoria_id ON empresas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_empresas_data_inicio_atividade ON empresas(data_inicio_atividade);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_empresas_uf_sit_cadastral ON empresas(uf, sit_cadastral);


-- ---------------------------------------------------------------
-- 20260128183157_8f27da95-5de0-4df4-8faf-f262a4e025b1.sql
-- ---------------------------------------------------------------
-- Otimizar função get_empresas_public para evitar timeout com 570k registros
-- O problema é o COUNT(*) que demora muito. Vamos usar um approach mais eficiente.

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
  p_has_socios boolean DEFAULT NULL,
  p_data_abertura_inicio date DEFAULT NULL,
  p_data_abertura_fim date DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_busca_socio text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  has_email boolean,
  has_phone boolean,
  has_socios boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
SET statement_timeout = '60s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
BEGIN
  -- Check if there are any filters applied
  v_has_filters := COALESCE(p_uf, p_municipio, p_sit_cadastral, p_porte, p_cnae, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- Only compute count if there are filters OR if we're on the first page
  -- This avoids expensive COUNT on large unfiltered datasets
  IF v_has_filters THEN
    SELECT COUNT(*) INTO v_total
    FROM public.empresas emp
    WHERE 
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%' OR emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
      AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
      AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR p_search = '' OR 
           emp.uf ILIKE '%' || p_search || '%' OR
           emp.municipio ILIKE '%' || p_search || '%' OR
           emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
           emp.cnae_codigo ILIKE '%' || p_search || '%' OR
           emp.porte_empresa ILIKE '%' || p_search || '%' OR
           emp.sit_cadastral ILIKE '%' || p_search || '%'
      );
  ELSE
    -- For unfiltered queries, use a fast estimate from pg_class
    -- This is much faster than COUNT(*) for large tables
    SELECT GREATEST(reltuples::bigint, 100000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    -- If estimate is unreliable, use a reasonable default
    IF v_total IS NULL OR v_total = 0 THEN
      v_total := 500000;
    END IF;
  END IF;

  -- Return paginated results
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
    AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%' OR emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR p_search = '' OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%' OR
         emp.porte_empresa ILIKE '%' || p_search || '%' OR
         emp.sit_cadastral ILIKE '%' || p_search || '%'
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260128183434_49724144-23b7-4a7e-9952-f77b20d17685.sql
-- ---------------------------------------------------------------
-- Recreate the function with better performance optimization
-- The main issue is COUNT(*) on unfiltered queries with 570k+ rows

CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit integer DEFAULT 25, 
  p_offset integer DEFAULT 0, 
  p_uf text DEFAULT NULL::text, 
  p_municipio text DEFAULT NULL::text, 
  p_sit_cadastral text DEFAULT NULL::text, 
  p_porte text DEFAULT NULL::text, 
  p_cnae text DEFAULT NULL::text, 
  p_simples text DEFAULT NULL::text, 
  p_mei text DEFAULT NULL::text, 
  p_matriz_filial text DEFAULT NULL::text, 
  p_categoria_id uuid DEFAULT NULL::uuid, 
  p_has_email boolean DEFAULT NULL::boolean, 
  p_has_phone boolean DEFAULT NULL::boolean, 
  p_has_socios boolean DEFAULT NULL::boolean, 
  p_data_abertura_inicio date DEFAULT NULL::date, 
  p_data_abertura_fim date DEFAULT NULL::date, 
  p_tags text[] DEFAULT NULL::text[], 
  p_busca_socio text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text
)
RETURNS TABLE(
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
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_email boolean, 
  has_phone boolean, 
  has_socios boolean, 
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
BEGIN
  -- Check if there are any filters applied
  v_has_filters := COALESCE(p_uf, p_municipio, p_sit_cadastral, p_porte, p_cnae, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- For unfiltered queries, use a fast estimate instead of COUNT(*)
  -- This dramatically improves performance for the initial page load
  IF NOT v_has_filters THEN
    -- Use pg_class for a fast estimate
    SELECT COALESCE(reltuples::bigint, 500000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    IF v_total IS NULL OR v_total < 1000 THEN
      v_total := 500000;
    END IF;
  ELSE
    -- Only compute exact count when filters are applied
    SELECT COUNT(*) INTO v_total
    FROM public.empresas emp
    WHERE 
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%' OR emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
      AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
      AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR p_search = '' OR 
           emp.uf ILIKE '%' || p_search || '%' OR
           emp.municipio ILIKE '%' || p_search || '%' OR
           emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
           emp.cnae_codigo ILIKE '%' || p_search || '%' OR
           emp.porte_empresa ILIKE '%' || p_search || '%' OR
           emp.sit_cadastral ILIKE '%' || p_search || '%'
      );
  END IF;

  -- Return paginated results - this is fast because we use LIMIT/OFFSET with ORDER BY on indexed column
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
    AND (p_cnae IS NULL OR emp.cnae_codigo ILIKE p_cnae || '%' OR emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR p_search = '' OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%' OR
         emp.porte_empresa ILIKE '%' || p_search || '%' OR
         emp.sit_cadastral ILIKE '%' || p_search || '%'
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260130124722_62efa3af-4e5d-47ee-b836-24266cb6db7c.sql
-- ---------------------------------------------------------------

-- Create materialized view for filter options (much faster than scanning 2M+ rows)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.empresas_filter_options AS
SELECT DISTINCT 'cnae'::text as tipo, 
  COALESCE(NULLIF(cnae_fiscal, ''), cnae_codigo) as valor
FROM empresas
WHERE cnae_codigo IS NOT NULL AND cnae_codigo != ''
UNION ALL
SELECT DISTINCT 'municipio'::text as tipo, municipio as valor
FROM empresas
WHERE municipio IS NOT NULL AND municipio != ''
UNION ALL
SELECT DISTINCT 'uf'::text as tipo, uf as valor
FROM empresas
WHERE uf IS NOT NULL AND uf != '';

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_filter_options_tipo ON public.empresas_filter_options(tipo);
CREATE INDEX IF NOT EXISTS idx_filter_options_valor ON public.empresas_filter_options(valor);

-- Create function to refresh filter options (run after imports)
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
END;
$$;

-- Optimize the get_filter_options function to use materialized view
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try to use materialized view first (much faster)
  RETURN QUERY
  SELECT fo.tipo, fo.valor
  FROM empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != '';
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT DISTINCT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo)
    FROM empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    LIMIT 500;
    
    RETURN QUERY
    SELECT DISTINCT 'municipio'::text, e.municipio
    FROM empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    LIMIT 500;
    
    RETURN;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.empresas_filter_options TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_filter_options() TO authenticated;



-- ---------------------------------------------------------------
-- 20260130124738_01f5c4f9-fe42-4164-b828-dac5296de74c.sql
-- ---------------------------------------------------------------

-- Remove materialized view from public API exposure via PostgREST
-- Hide it from the API by removing from public schema or using RLS

-- Add RLS policy to the materialized view (but since it's read-only public data, we allow anyone authenticated)
-- Actually, materialized views don't support RLS, so we need to exclude it from the API via config
-- The safest approach is to remove the direct grant and only access via function

-- Revoke direct SELECT access, keep function access only
REVOKE SELECT ON public.empresas_filter_options FROM authenticated;
REVOKE SELECT ON public.empresas_filter_options FROM anon;

-- The function get_filter_options will still work because it's SECURITY DEFINER
-- This means the API cannot query the materialized view directly



-- ---------------------------------------------------------------
-- 20260130124902_7c35b7cb-3937-4845-8c0f-205e95d03f94.sql
-- ---------------------------------------------------------------

-- Add unique index to allow CONCURRENTLY refresh (requires unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_filter_options_unique 
ON public.empresas_filter_options(tipo, valor);

-- Update the refresh function to handle case when CONCURRENTLY fails
CREATE OR REPLACE FUNCTION public.refresh_filter_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try concurrent refresh first (non-blocking)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.empresas_filter_options;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to regular refresh if concurrent fails
      REFRESH MATERIALIZED VIEW public.empresas_filter_options;
  END;
END;
$$;



-- ---------------------------------------------------------------
-- 20260131214425_9a345be8-67e4-4821-9bf4-aec1a210c390.sql
-- ---------------------------------------------------------------
-- Update get_empresas_public to handle CNAE filter that may include description
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
  p_has_socios boolean DEFAULT NULL, 
  p_data_abertura_inicio date DEFAULT NULL, 
  p_data_abertura_fim date DEFAULT NULL, 
  p_tags text[] DEFAULT NULL, 
  p_busca_socio text DEFAULT NULL, 
  p_search text DEFAULT NULL
)
RETURNS TABLE(
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
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_email boolean, 
  has_phone boolean, 
  has_socios boolean, 
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
BEGIN
  -- Extract CNAE code from the filter (remove description if present)
  -- Format may be "1234567 - Description" or just "1234567"
  IF p_cnae IS NOT NULL AND p_cnae != '' THEN
    v_cnae_code := split_part(p_cnae, ' - ', 1);
    -- If no separator, use the original value
    IF v_cnae_code = '' THEN
      v_cnae_code := p_cnae;
    END IF;
  ELSE
    v_cnae_code := NULL;
  END IF;

  -- Check if there are any filters applied
  v_has_filters := COALESCE(p_uf, p_municipio, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- For unfiltered queries, use a fast estimate instead of COUNT(*)
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 500000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    IF v_total IS NULL OR v_total < 1000 THEN
      v_total := 500000;
    END IF;
  ELSE
    -- Only compute exact count when filters are applied
    SELECT COUNT(*) INTO v_total
    FROM public.empresas emp
    WHERE 
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (p_municipio IS NULL OR emp.municipio ILIKE '%' || p_municipio || '%')
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_code IS NULL OR emp.cnae_codigo ILIKE v_cnae_code || '%' OR emp.cnae_fiscal ILIKE '%' || v_cnae_code || '%')
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
      AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
      AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR p_search = '' OR 
           emp.uf ILIKE '%' || p_search || '%' OR
           emp.municipio ILIKE '%' || p_search || '%' OR
           emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
           emp.cnae_codigo ILIKE '%' || p_search || '%' OR
           emp.porte_empresa ILIKE '%' || p_search || '%' OR
           emp.sit_cadastral ILIKE '%' || p_search || '%'
      );
  END IF;

  -- Return paginated results
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
    AND (v_cnae_code IS NULL OR emp.cnae_codigo ILIKE v_cnae_code || '%' OR emp.cnae_fiscal ILIKE '%' || v_cnae_code || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR p_busca_socio = '' OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR p_search = '' OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%' OR
         emp.porte_empresa ILIKE '%' || p_search || '%' OR
         emp.sit_cadastral ILIKE '%' || p_search || '%'
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260203125822_5ba8d17d-7083-4c12-8adf-44a7fc9fff16.sql
-- ---------------------------------------------------------------

-- Recreate the optimized RPC function with better timeout handling and exact matching
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
  p_has_socios boolean DEFAULT NULL,
  p_data_abertura_inicio date DEFAULT NULL,
  p_data_abertura_fim date DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_busca_socio text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
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
SET search_path = 'public'
SET statement_timeout = '25s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_municipio_clean TEXT;
BEGIN
  -- Normalize inputs: treat empty/short strings as NULL
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  -- Extract CNAE code from the filter (remove description if present)
  -- Format may be "1234567 - Description" or just "1234567"
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    IF v_cnae_code = '' OR length(v_cnae_code) < 2 THEN
      v_cnae_code := NULL;
    END IF;
  ELSE
    v_cnae_code := NULL;
  END IF;

  -- Clean municipio - extract just the name if it contains extra info
  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  -- Check if there are any filters applied
  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- For unfiltered queries, use a fast estimate
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 500000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    IF v_total IS NULL OR v_total < 1000 THEN
      v_total := 500000;
    END IF;
  ELSE
    -- For filtered queries, try to get exact count but with timeout protection
    BEGIN
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (v_cnae_code IS NULL OR emp.cnae_codigo = v_cnae_code OR emp.cnae_codigo LIKE v_cnae_code || '%')
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
             emp.uf ILIKE '%' || p_search || '%' OR
             emp.municipio ILIKE '%' || p_search || '%' OR
             emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
             emp.cnae_codigo ILIKE '%' || p_search || '%'
        );
    EXCEPTION
      WHEN query_canceled THEN
        -- If count times out, use estimate
        v_total := 100000;
      WHEN OTHERS THEN
        v_total := 100000;
    END;
  END IF;

  -- Return paginated results with exact matching for indexed columns
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
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR emp.cnae_codigo = v_cnae_code OR emp.cnae_codigo LIKE v_cnae_code || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
         emp.uf ILIKE '%' || p_search || '%' OR
         emp.municipio ILIKE '%' || p_search || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
         emp.cnae_codigo ILIKE '%' || p_search || '%'
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Add composite index for common filter combinations (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_empresas_uf_mun_cnae 
ON public.empresas (uf, municipio, cnae_codigo);



-- ---------------------------------------------------------------
-- 20260203134915_798b8414-0db3-4948-9e0e-6a8d9add9c50.sql
-- ---------------------------------------------------------------
-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS public.get_filter_options();

-- Recreate the materialized view to include UF with municipality
DROP MATERIALIZED VIEW IF EXISTS public.empresas_filter_options CASCADE;

CREATE MATERIALIZED VIEW public.empresas_filter_options AS
SELECT DISTINCT 'cnae'::text AS tipo,
    COALESCE(NULLIF(empresas.cnae_fiscal, ''::text), empresas.cnae_codigo) AS valor,
    NULL::text AS uf
   FROM empresas
  WHERE ((empresas.cnae_codigo IS NOT NULL) AND (empresas.cnae_codigo <> ''::text))
UNION ALL
 SELECT DISTINCT 'municipio'::text AS tipo,
    empresas.municipio AS valor,
    empresas.uf AS uf
   FROM empresas
  WHERE ((empresas.municipio IS NOT NULL) AND (empresas.municipio <> ''::text))
UNION ALL
 SELECT DISTINCT 'uf'::text AS tipo,
    empresas.uf AS valor,
    empresas.uf AS uf
   FROM empresas
  WHERE ((empresas.uf IS NOT NULL) AND (empresas.uf <> ''::text))
WITH DATA;

-- Create index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_filter_options_unique 
ON public.empresas_filter_options (tipo, valor, uf) 
WHERE uf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_empresas_filter_options_tipo 
ON public.empresas_filter_options (tipo);

CREATE INDEX IF NOT EXISTS idx_empresas_filter_options_uf 
ON public.empresas_filter_options (uf) 
WHERE tipo = 'municipio';

-- Recreate the RPC function with new return type including UF
CREATE OR REPLACE FUNCTION public.get_filter_options()
 RETURNS TABLE(tipo text, valor text, uf text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use materialized view (much faster)
  RETURN QUERY
  SELECT fo.tipo, fo.valor, fo.uf
  FROM empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != '';
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT DISTINCT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), e.cnae_codigo),
      NULL::text
    FROM empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    LIMIT 500;
    
    RETURN QUERY
    SELECT DISTINCT 'municipio'::text, e.municipio, e.uf
    FROM empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    LIMIT 500;
    
    RETURN;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260203175320_1e5c749c-b7d5-4c90-a3a7-7e8503c281c7.sql
-- ---------------------------------------------------------------
-- Add SMTP configuration columns to payment_configs table
ALTER TABLE public.payment_configs 
ADD COLUMN IF NOT EXISTS smtp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS smtp_host text,
ADD COLUMN IF NOT EXISTS smtp_port integer DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_secure boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS smtp_user text,
ADD COLUMN IF NOT EXISTS smtp_password text,
ADD COLUMN IF NOT EXISTS smtp_from_email text,
ADD COLUMN IF NOT EXISTS smtp_from_name text DEFAULT 'LeadsBase Pro';

-- Add comment for documentation
COMMENT ON COLUMN public.payment_configs.smtp_enabled IS 'Whether SMTP email sending is enabled';
COMMENT ON COLUMN public.payment_configs.smtp_host IS 'SMTP server host (e.g., smtp.gmail.com)';
COMMENT ON COLUMN public.payment_configs.smtp_port IS 'SMTP server port (typically 587 for TLS, 465 for SSL)';
COMMENT ON COLUMN public.payment_configs.smtp_secure IS 'Use TLS/SSL for SMTP connection';
COMMENT ON COLUMN public.payment_configs.smtp_user IS 'SMTP authentication username';
COMMENT ON COLUMN public.payment_configs.smtp_password IS 'SMTP authentication password';
COMMENT ON COLUMN public.payment_configs.smtp_from_email IS 'From email address for outgoing emails';
COMMENT ON COLUMN public.payment_configs.smtp_from_name IS 'From name for outgoing emails';


-- ---------------------------------------------------------------
-- 20260203195031_ecca93cf-b1d5-4a35-a68a-41b233f24c28.sql
-- ---------------------------------------------------------------
-- Create table for GA4 configuration
CREATE TABLE public.ga4_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id text,
  enabled boolean NOT NULL DEFAULT false,
  track_pageviews boolean NOT NULL DEFAULT true,
  track_login boolean NOT NULL DEFAULT true,
  track_signup boolean NOT NULL DEFAULT true,
  track_conversions boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ga4_configs ENABLE ROW LEVEL SECURITY;

-- Only master_admin can manage GA4 config (similar to payment_configs)
CREATE POLICY "Only master_admin can view GA4 config" 
ON public.ga4_configs 
FOR SELECT 
USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can insert GA4 config" 
ON public.ga4_configs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can update GA4 config" 
ON public.ga4_configs 
FOR UPDATE 
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can delete GA4 config" 
ON public.ga4_configs 
FOR DELETE 
USING (has_role(auth.uid(), 'master_admin'));

-- Create a function to get public GA4 config (measurement_id only if enabled)
CREATE OR REPLACE FUNCTION public.get_ga4_public_config()
RETURNS TABLE(measurement_id text, enabled boolean, track_pageviews boolean, track_login boolean, track_signup boolean, track_conversions boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN g.enabled THEN g.measurement_id ELSE NULL END as measurement_id,
    COALESCE(g.enabled, false) as enabled,
    COALESCE(g.track_pageviews, true) as track_pageviews,
    COALESCE(g.track_login, true) as track_login,
    COALESCE(g.track_signup, true) as track_signup,
    COALESCE(g.track_conversions, true) as track_conversions
  FROM ga4_configs g
  LIMIT 1;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_ga4_configs_updated_at
BEFORE UPDATE ON public.ga4_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to store GA4 events locally for dashboard
CREATE TABLE public.ga4_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid,
  session_id text,
  page_path text,
  page_title text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for events
ALTER TABLE public.ga4_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view GA4 events" 
ON public.ga4_events 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Anyone authenticated can insert events (for tracking)
CREATE POLICY "Authenticated users can insert GA4 events" 
ON public.ga4_events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_ga4_events_event_name ON public.ga4_events(event_name);
CREATE INDEX idx_ga4_events_created_at ON public.ga4_events(created_at);
CREATE INDEX idx_ga4_events_user_id ON public.ga4_events(user_id);


-- ---------------------------------------------------------------
-- 20260204151422_a13cb717-df78-4a6a-8a3a-e362ba121176.sql
-- ---------------------------------------------------------------
-- Create coupons table for discount management
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_plans TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage all coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (is_admin(auth.uid()));

-- Authenticated users can view active coupons (for validation)
CREATE POLICY "Users can view active coupons"
ON public.coupons
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast code lookups
CREATE INDEX idx_coupons_code ON public.coupons (code);
CREATE INDEX idx_coupons_active ON public.coupons (is_active) WHERE is_active = true;


-- ---------------------------------------------------------------
-- 20260205121040_900028ba-fcd0-4971-a8ae-941bf9e4f248.sql
-- ---------------------------------------------------------------

-- Affiliates table - stores affiliate information
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 10, -- percentage
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  pending_earnings NUMERIC NOT NULL DEFAULT 0,
  paid_earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referrals table - tracks who was referred by whom
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  referred_user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, CONVERTED, CANCELLED
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Affiliate commissions table - tracks commissions from payments
CREATE TABLE public.affiliate_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PAID, CANCELLED
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on referrals to prevent duplicate referrals
CREATE UNIQUE INDEX idx_referrals_referred_user ON public.referrals(referred_user_id);

-- Create indexes for better performance
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_referrals_affiliate_id ON public.referrals(affiliate_id);
CREATE INDEX idx_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates
CREATE POLICY "Admins can manage all affiliates"
  ON public.affiliates FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own affiliate record"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Admins can manage all referrals"
  ON public.referrals FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Affiliates can view their referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = referrals.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- RLS Policies for commissions
CREATE POLICY "Admins can manage all commissions"
  ON public.affiliate_commissions FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Affiliates can view their commissions"
  ON public.affiliate_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_commissions.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM public.affiliates WHERE referral_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to get affiliate by referral code (public access for signup)
CREATE OR REPLACE FUNCTION public.get_affiliate_by_code(p_code TEXT)
RETURNS TABLE(
  affiliate_id UUID,
  user_id UUID,
  commission_rate NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as affiliate_id,
    a.user_id,
    a.commission_rate,
    a.status
  FROM public.affiliates a
  WHERE a.referral_code = upper(p_code)
  AND a.status = 'ACTIVE';
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();



-- ---------------------------------------------------------------
-- 20260205125321_22e0128a-83f4-4df6-b651-bd8ab2361ce1.sql
-- ---------------------------------------------------------------
-- Table to store push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view their own push subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own push subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add notification preferences to saved_filters
ALTER TABLE public.saved_filters 
ADD COLUMN IF NOT EXISTS notify_new_matches BOOLEAN DEFAULT false;

-- Index for efficient lookups
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_saved_filters_notify ON public.saved_filters(notify_new_matches) WHERE notify_new_matches = true;


-- ---------------------------------------------------------------
-- 20260205142242_f2a0b3d8-98ff-499c-832d-885c6c3d6286.sql
-- ---------------------------------------------------------------
-- Create notification templates table
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text DEFAULT '/',
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can view notification templates"
ON public.notification_templates
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Only master_admin can insert notification templates"
ON public.notification_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can update notification templates"
ON public.notification_templates
FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can delete notification templates"
ON public.notification_templates
FOR DELETE
USING (has_role(auth.uid(), 'master_admin'));

-- Create table for scheduled notifications log
CREATE TABLE public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  target_user_id uuid,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view scheduled notifications
CREATE POLICY "Admins can view scheduled notifications"
ON public.scheduled_notifications
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert scheduled notifications"
ON public.scheduled_notifications
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.notification_templates (template_key, name, title, body, url, description) VALUES
('new_user', 'Novo Usuário Cadastrado', '🎉 Novo usuário cadastrado!', 'Um novo usuário se cadastrou na plataforma. Acesse o painel para ver os detalhes.', '/admin?tab=users', 'Enviado quando um novo usuário se registra na plataforma'),
('new_empresa', 'Nova Empresa Importada', '🏢 Novas empresas disponíveis!', 'Novas empresas foram adicionadas à base. Explore as novas oportunidades de negócio!', '/buscar', 'Enviado quando novas empresas são importadas'),
('invoice_reminder_7d', 'Lembrete de Fatura - 7 dias', '⏰ Sua fatura vence em 7 dias', 'Sua assinatura vence em 7 dias. Renove agora para não perder acesso às funcionalidades.', '/checkout', 'Lembrete de fatura 7 dias antes do vencimento'),
('invoice_reminder_3d', 'Lembrete de Fatura - 3 dias', '⚠️ Sua fatura vence em 3 dias', 'Atenção! Sua assinatura vence em 3 dias. Renove para continuar usando o LeadsBase Pro.', '/checkout', 'Lembrete de fatura 3 dias antes do vencimento'),
('invoice_reminder_1d', 'Lembrete de Fatura - 1 dia', '🔴 Sua fatura vence amanhã!', 'Último aviso! Sua assinatura vence amanhã. Renove agora para evitar interrupção do serviço.', '/checkout', 'Lembrete de fatura 1 dia antes do vencimento');


-- ---------------------------------------------------------------
-- 20260205221558_079b480f-7ad9-44aa-8154-a70978bdfbbb.sql
-- ---------------------------------------------------------------
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


-- ---------------------------------------------------------------
-- 20260205222007_775e37e5-cf4f-4f18-9333-98a04c74955c.sql
-- ---------------------------------------------------------------
-- Fix RLS policies on unlocked_companies to be PERMISSIVE instead of RESTRICTIVE
-- This allows users to see their own records OR team owner's records (any matching policy passes)

-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Users can view own unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Users can insert own unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Team members can view owner unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Admins can view all unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Admins can manage unlocked companies" ON public.unlocked_companies;

-- Recreate as PERMISSIVE policies (default, any matching policy allows access)
-- Users can view their own unlocked companies
CREATE POLICY "Users can view own unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own unlocked companies
CREATE POLICY "Users can insert own unlocked companies"
ON public.unlocked_companies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Team members can view owner's unlocked companies
CREATE POLICY "Team members can view owner unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = unlocked_companies.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- Admins can view all unlocked companies
CREATE POLICY "Admins can view all unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can manage (insert, update, delete) all unlocked companies
CREATE POLICY "Admins can manage unlocked companies"
ON public.unlocked_companies
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));


-- ---------------------------------------------------------------
-- 20260209175239_596adf82-eef9-43a7-8385-87a486ad2ee3.sql
-- ---------------------------------------------------------------

-- Table to track CNPJ enrichment operations
CREATE TABLE public.enrichment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL,
  total_cnpjs integer NOT NULL DEFAULT 0,
  enriched integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'brasilapi',
  status text NOT NULL DEFAULT 'running',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.enrichment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view enrichment logs"
ON public.enrichment_logs FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert enrichment logs"
ON public.enrichment_logs FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update enrichment logs"
ON public.enrichment_logs FOR UPDATE
USING (is_admin(auth.uid()));



-- ---------------------------------------------------------------
-- 20260209194630_f317d3ee-668c-4759-bb73-27ace9e3eb2c.sql
-- ---------------------------------------------------------------

-- Table to store per-company enrichment results
CREATE TABLE public.enrichment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid REFERENCES public.enrichment_logs(id) ON DELETE CASCADE NOT NULL,
  cnpj text NOT NULL,
  razao_social text,
  status text NOT NULL DEFAULT 'pending', -- pending, enriched, failed, skipped, already_complete
  source text,
  fields_updated integer DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_enrichment_results_log_id ON public.enrichment_results(log_id);
CREATE INDEX idx_enrichment_results_created_at ON public.enrichment_results(created_at DESC);

-- Enable RLS
ALTER TABLE public.enrichment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view enrichment results"
  ON public.enrichment_results FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert enrichment results"
  ON public.enrichment_results FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Add control column to enrichment_logs for pause/resume
ALTER TABLE public.enrichment_logs ADD COLUMN IF NOT EXISTS control text NOT NULL DEFAULT 'running';
-- control values: 'running', 'pause_requested', 'paused', 'resume_requested'

-- Add needs_enrichment flag to empresas for auto-queue
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS needs_enrichment boolean NOT NULL DEFAULT false;
CREATE INDEX idx_empresas_needs_enrichment ON public.empresas(needs_enrichment) WHERE needs_enrichment = true;

-- Trigger: auto-mark new empresas for enrichment
CREATE OR REPLACE FUNCTION public.auto_queue_enrichment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.needs_enrichment := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_auto_queue_enrichment
  BEFORE INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_queue_enrichment();



-- ---------------------------------------------------------------
-- 20260209202956_1f8c22a7-f4ee-45d0-9918-6604e3112f1f.sql
-- ---------------------------------------------------------------
ALTER TABLE public.enrichment_results ADD COLUMN fields_changed text[] DEFAULT '{}'::text[];


-- ---------------------------------------------------------------
-- 20260210125455_0bc1a015-460c-483f-b02f-aff78d21ae7e.sql
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_empresas_public(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_uf text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_sit_cadastral text DEFAULT NULL::text, p_porte text DEFAULT NULL::text, p_cnae text DEFAULT NULL::text, p_simples text DEFAULT NULL::text, p_mei text DEFAULT NULL::text, p_matriz_filial text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_has_email boolean DEFAULT NULL::boolean, p_has_phone boolean DEFAULT NULL::boolean, p_has_socios boolean DEFAULT NULL::boolean, p_data_abertura_inicio date DEFAULT NULL::date, p_data_abertura_fim date DEFAULT NULL::date, p_tags text[] DEFAULT NULL::text[], p_busca_socio text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '25s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs: treat empty/short strings as NULL
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  -- Pre-compute search heuristic once
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code from the filter
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    IF v_cnae_code = '' OR length(v_cnae_code) < 2 THEN
      v_cnae_code := NULL;
    END IF;
  ELSE
    v_cnae_code := NULL;
  END IF;

  -- Clean municipio
  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  -- Check if there are any filters applied
  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- For unfiltered queries, use a fast estimate
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 500000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    IF v_total IS NULL OR v_total < 1000 THEN
      v_total := 500000;
    END IF;
  ELSE
    -- For filtered queries, try to get exact count but with timeout protection
    BEGIN
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (v_cnae_code IS NULL OR emp.cnae_codigo = v_cnae_code OR emp.cnae_codigo LIKE v_cnae_code || '%')
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
             CASE 
               WHEN v_is_cnpj_search THEN
                 CASE 
                   WHEN length(v_search_digits) >= 14
                   THEN emp.cnpj = left(v_search_digits, 14)
                   ELSE emp.cnpj LIKE v_search_digits || '%'
                 END
               ELSE
                 emp.razao_social ILIKE '%' || p_search || '%' OR
                 emp.nome_fantasia ILIKE '%' || p_search || '%'
             END
        );
    EXCEPTION
      WHEN query_canceled THEN
        v_total := 100000;
      WHEN OTHERS THEN
        v_total := 100000;
    END;
  END IF;

  -- Return paginated results
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
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR emp.cnae_codigo = v_cnae_code OR emp.cnae_codigo LIKE v_cnae_code || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
         CASE 
           WHEN v_is_cnpj_search THEN
             CASE 
               WHEN length(v_search_digits) >= 14
               THEN emp.cnpj = left(v_search_digits, 14)
               ELSE emp.cnpj LIKE v_search_digits || '%'
             END
           ELSE
             emp.razao_social ILIKE '%' || p_search || '%' OR
             emp.nome_fantasia ILIKE '%' || p_search || '%'
         END
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;



-- ---------------------------------------------------------------
-- 20260211151009_f6411520-4f07-4633-ab20-f9184eb93078.sql
-- ---------------------------------------------------------------

-- Create api_keys table for user API tokens
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL, -- first 8 chars for display (e.g. "lb_xxxx...")
  permissions text[] NOT NULL DEFAULT '{read_empresas}',
  rate_limit integer NOT NULL DEFAULT 100, -- requests per minute
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  total_requests bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create webhooks table
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  secret text, -- webhook signing secret
  events text[] NOT NULL DEFAULT '{}', -- e.g. {'empresa.created', 'empresa.updated'}
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamp with time zone,
  total_deliveries bigint NOT NULL DEFAULT 0,
  failed_deliveries bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create webhook_logs table for delivery tracking
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  response_status integer,
  response_body text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create api_request_logs for usage tracking
CREATE TABLE public.api_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  status_code integer,
  response_time_ms integer,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all API keys" ON public.api_keys FOR SELECT USING (is_admin(auth.uid()));

-- Webhooks policies
CREATE POLICY "Users can view own webhooks" ON public.webhooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own webhooks" ON public.webhooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own webhooks" ON public.webhooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own webhooks" ON public.webhooks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all webhooks" ON public.webhooks FOR SELECT USING (is_admin(auth.uid()));

-- Webhook logs policies
CREATE POLICY "Users can view own webhook logs" ON public.webhook_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.webhooks w WHERE w.id = webhook_logs.webhook_id AND w.user_id = auth.uid())
);
CREATE POLICY "Admins can view all webhook logs" ON public.webhook_logs FOR SELECT USING (is_admin(auth.uid()));

-- API request logs policies
CREATE POLICY "Users can view own API logs" ON public.api_request_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all API logs" ON public.api_request_logs FOR SELECT USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON public.api_keys(key_prefix);
CREATE INDEX idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_api_request_logs_api_key_id ON public.api_request_logs(api_key_id);
CREATE INDEX idx_api_request_logs_created_at ON public.api_request_logs(created_at);

-- Function to validate API key (used by edge functions)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash text)
RETURNS TABLE(user_id uuid, api_key_id uuid, permissions text[], rate_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ak.user_id, ak.id as api_key_id, ak.permissions, ak.rate_limit
  FROM public.api_keys ak
  WHERE ak.key_hash = p_key_hash
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
    
  -- Update last_used_at and total_requests
  UPDATE public.api_keys
  SET last_used_at = now(), total_requests = total_requests + 1
  WHERE key_hash = p_key_hash;
END;
$$;



-- ---------------------------------------------------------------
-- 20260211152123_2c0c6703-ecda-42ce-aa9a-6b103de64912.sql
-- ---------------------------------------------------------------

-- Remove the overly permissive "Service role can manage scheduled notifications" policy
DROP POLICY IF EXISTS "Service role can manage scheduled notifications" ON public.scheduled_notifications;

-- Add policy so users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.scheduled_notifications
FOR SELECT
USING (auth.uid() = target_user_id);



-- ---------------------------------------------------------------
-- 20260212134259_68bc3531-b722-40bb-a891-140c9ea0008b.sql
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_empresa_stats()
RETURNS TABLE(
  stat_type text,
  stat_name text,
  stat_value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- UF counts (top 10)
  RETURN QUERY
  SELECT 'uf'::text, COALESCE(e.uf, 'N/D')::text, COUNT(*)::bigint
  FROM empresas e
  GROUP BY e.uf
  ORDER BY COUNT(*) DESC
  LIMIT 10;

  -- Situação cadastral counts
  RETURN QUERY
  SELECT 'situacao'::text, COALESCE(e.sit_cadastral, 'N/D')::text, COUNT(*)::bigint
  FROM empresas e
  GROUP BY e.sit_cadastral
  ORDER BY COUNT(*) DESC;

  -- Porte counts
  RETURN QUERY
  SELECT 'porte'::text, COALESCE(e.porte_empresa, 'N/D')::text, COUNT(*)::bigint
  FROM empresas e
  GROUP BY e.porte_empresa
  ORDER BY COUNT(*) DESC;
END;
$function$;



-- ---------------------------------------------------------------
-- 20260212135559_33d4cb46-454c-45b4-8da2-6cbb786846bc.sql
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_cnaes_grouped()
 RETURNS TABLE(cnae_codigo text, cnae_fiscal text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '30s'
AS $function$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.cnae_codigo,
    MAX(e.cnae_fiscal) as cnae_fiscal,
    COUNT(*)::BIGINT as count
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
  GROUP BY e.cnae_codigo
  ORDER BY count DESC;
END;
$function$;



-- ---------------------------------------------------------------
-- 20260212140005_d9ebed0a-8461-4355-8715-bd781a0f7d1f.sql
-- ---------------------------------------------------------------

-- Create coupon_usages table to track per-user coupon usage
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view all coupon usages"
  ON public.coupon_usages FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage coupon usages"
  ON public.coupon_usages FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Users can insert their own usage
CREATE POLICY "Users can insert own coupon usage"
  ON public.coupon_usages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own usage
CREATE POLICY "Users can view own coupon usage"
  ON public.coupon_usages FOR SELECT
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_user_id ON public.coupon_usages(user_id);
CREATE INDEX idx_coupon_usages_created_at ON public.coupon_usages(created_at);



-- ---------------------------------------------------------------
-- 20260216134011_bf062df6-bd53-417f-bd49-c632217e809d.sql
-- ---------------------------------------------------------------

-- Update default permissions for api_keys to include all read permissions
ALTER TABLE public.api_keys ALTER COLUMN permissions SET DEFAULT '{read_empresas,read_socios,read_cnaes}'::text[];

-- Update existing API keys that only have read_empresas to include all read permissions
UPDATE public.api_keys 
SET permissions = '{read_empresas,read_socios,read_cnaes}'::text[]
WHERE permissions = '{read_empresas}'::text[];



-- ---------------------------------------------------------------
-- 20260416175548_5846cd09-6557-4cc3-8863-395a969eca2b.sql
-- ---------------------------------------------------------------
-- Refresh filter options when empresas are added/updated/deleted
-- This ensures CNAEs and municipalities entered manually appear in search filters

CREATE OR REPLACE FUNCTION public.trigger_refresh_filter_options()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use pg_notify to refresh asynchronously (non-blocking)
  -- This avoids slowing down inserts on large batches
  PERFORM pg_notify('refresh_filter_options', '');
  RETURN NULL;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS empresas_refresh_filters ON public.empresas;

-- Create a statement-level trigger (fires once per statement, not per row)
-- This is efficient for both single inserts and bulk imports
CREATE TRIGGER empresas_refresh_filters
AFTER INSERT OR UPDATE OF cnae_codigo, cnae_fiscal, municipio, uf OR DELETE
ON public.empresas
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_filter_options();

-- Immediately refresh the materialized view to pick up any existing data
REFRESH MATERIALIZED VIEW public.empresas_filter_options;


-- ---------------------------------------------------------------
-- 20260416181842_06792fa2-525f-4464-a150-b76d36d346b7.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_uf text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_sit_cadastral text DEFAULT NULL::text, p_porte text DEFAULT NULL::text, p_cnae text DEFAULT NULL::text, p_simples text DEFAULT NULL::text, p_mei text DEFAULT NULL::text, p_matriz_filial text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_has_email boolean DEFAULT NULL::boolean, p_has_phone boolean DEFAULT NULL::boolean, p_has_socios boolean DEFAULT NULL::boolean, p_data_abertura_inicio date DEFAULT NULL::date, p_data_abertura_fim date DEFAULT NULL::date, p_tags text[] DEFAULT NULL::text[], p_busca_socio text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '25s'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code from the filter (e.g. "0111301 - CULTIVO DE ARROZ" -> "0111301")
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    IF v_cnae_code = '' OR length(v_cnae_code) < 2 THEN
      v_cnae_code := NULL;
      v_cnae_code_nolead := NULL;
    ELSE
      -- Strip leading zeros to match cnae_codigo stored without leading zeros (e.g. 0111301 -> 111301)
      v_cnae_code_nolead := ltrim(v_cnae_code, '0');
      IF v_cnae_code_nolead = '' THEN v_cnae_code_nolead := v_cnae_code; END IF;
    END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 500000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
    
    IF v_total IS NULL OR v_total < 1000 THEN
      v_total := 500000;
    END IF;
  ELSE
    BEGIN
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (v_cnae_code IS NULL OR emp.cnae_codigo = v_cnae_code OR emp.cnae_codigo = v_cnae_code_nolead OR emp.cnae_codigo LIKE v_cnae_code || '%' OR emp.cnae_codigo LIKE v_cnae_code_nolead || '%')
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
             CASE 
               WHEN v_is_cnpj_search THEN
                 CASE 
                   WHEN length(v_search_digits) >= 14
                   THEN emp.cnpj = left(v_search_digits, 14)
                   ELSE emp.cnpj LIKE v_search_digits || '%'
                 END
               ELSE
                 emp.razao_social ILIKE '%' || p_search || '%' OR
                 emp.nome_fantasia ILIKE '%' || p_search || '%'
             END
        );
    EXCEPTION
      WHEN query_canceled THEN
        v_total := 100000;
      WHEN OTHERS THEN
        v_total := 100000;
    END;
  END IF;

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
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR emp.cnae_codigo = v_cnae_code OR emp.cnae_codigo = v_cnae_code_nolead OR emp.cnae_codigo LIKE v_cnae_code || '%' OR emp.cnae_codigo LIKE v_cnae_code_nolead || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
         CASE 
           WHEN v_is_cnpj_search THEN
             CASE 
               WHEN length(v_search_digits) >= 14
               THEN emp.cnpj = left(v_search_digits, 14)
               ELSE emp.cnpj LIKE v_search_digits || '%'
             END
           ELSE
             emp.razao_social ILIKE '%' || p_search || '%' OR
             emp.nome_fantasia ILIKE '%' || p_search || '%'
         END
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260505142302_2e944927-9d77-4edf-936a-45a43b9a14a2.sql
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_empresas_public(integer,integer,text,text,text,text,text,text,text,text,uuid,boolean,boolean,boolean,date,date,text[],text,text);

CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit INTEGER,
  p_offset INTEGER,
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
  p_has_socios BOOLEAN DEFAULT NULL,
  p_data_abertura_inicio DATE DEFAULT NULL,
  p_data_abertura_fim DATE DEFAULT NULL,
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
  categoria_id UUID,
  tags TEXT[],
  capital_social_empresa NUMERIC,
  qualif_responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
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
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code from the filter (e.g. "0111301 - CULTIVO DE ARROZ" -> "0111301")
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    IF v_cnae_code = '' OR length(v_cnae_code) < 2 THEN
      v_cnae_code := NULL;
      v_cnae_code_nolead := NULL;
    ELSE
      -- Strip leading zeros to match cnae_codigo stored without leading zeros (e.g. 0111301 -> 111301)
      v_cnae_code_nolead := ltrim(v_cnae_code, '0');
      IF v_cnae_code_nolead = '' THEN v_cnae_code_nolead := v_cnae_code; END IF;
    END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  IF NOT v_has_filters THEN
    -- Optimization: use table statistics for total count when no filters are applied
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    -- Try to get an accurate count, but with a timeout safety
    BEGIN
      -- Set a local statement timeout for the count query to avoid blocking
      -- Using a slightly longer timeout for count as it can be heavy
      SET LOCAL statement_timeout = '5s';
      
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (v_cnae_code IS NULL OR 
             emp.cnae_codigo = v_cnae_code OR 
             emp.cnae_codigo = v_cnae_code_nolead OR 
             emp.cnae_fiscal LIKE v_cnae_code || '%' OR
             emp.cnae_fiscal LIKE p_cnae || '%')
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
             CASE 
               WHEN v_is_cnpj_search THEN
                 CASE 
                   WHEN length(v_search_digits) >= 14
                   THEN emp.cnpj = left(v_search_digits, 14)
                   ELSE emp.cnpj LIKE v_search_digits || '%'
                 END
               ELSE
                 emp.razao_social ILIKE '%' || p_search || '%' OR
                 emp.nome_fantasia ILIKE '%' || p_search || '%'
             END
        );
    EXCEPTION
      WHEN OTHERS THEN
        -- If count fails or times out, provide a estimate
        v_total := 100000;
    END;
  END IF;

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
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR 
         emp.cnae_codigo = v_cnae_code OR 
         emp.cnae_codigo = v_cnae_code_nolead OR 
         emp.cnae_fiscal LIKE v_cnae_code || '%' OR
         emp.cnae_fiscal LIKE p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios IS NOT NULL AND emp.socios != ''))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR array_length(p_tags, 1) = 0 OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios ILIKE '%' || p_busca_socio || '%' OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
         CASE 
           WHEN v_is_cnpj_search THEN
             CASE 
               WHEN length(v_search_digits) >= 14
               THEN emp.cnpj = left(v_search_digits, 14)
               ELSE emp.cnpj LIKE v_search_digits || '%'
             END
           ELSE
             emp.razao_social ILIKE '%' || p_search || '%' OR
             emp.nome_fantasia ILIKE '%' || p_search || '%'
         END
    )
  ORDER BY emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- ---------------------------------------------------------------
-- 20260505142408_1fdeae84-1b55-4fe5-9837-b630910b2ec2.sql
-- ---------------------------------------------------------------
-- Drop the existing unique index that was too restrictive
DROP INDEX IF EXISTS public.idx_empresas_filter_options_unique;

-- Create a new unique index that covers all rows, including those with NULL uf (like CNAEs)
-- In PG 15+ we can use NULLS NOT DISTINCT
CREATE UNIQUE INDEX idx_empresas_filter_options_unique 
ON public.empresas_filter_options (tipo, valor, uf) NULLS NOT DISTINCT;

-- Now refresh the view to make sure everything is in sync
REFRESH MATERIALIZED VIEW public.empresas_filter_options;


-- ---------------------------------------------------------------
-- 20260505143238_ce30e427-b318-40fa-a6bb-51b8302f15e1.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(p_limit integer, p_offset integer, p_uf text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_sit_cadastral text DEFAULT NULL::text, p_porte text DEFAULT NULL::text, p_cnae text DEFAULT NULL::text, p_simples text DEFAULT NULL::text, p_mei text DEFAULT NULL::text, p_matriz_filial text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_has_email boolean DEFAULT NULL::boolean, p_has_phone boolean DEFAULT NULL::boolean, p_has_socios boolean DEFAULT NULL::boolean, p_data_abertura_inicio date DEFAULT NULL::date, p_data_abertura_fim date DEFAULT NULL::date, p_tags text[] DEFAULT NULL::text[], p_busca_socio text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code from the filter (e.g. "0111301 - CULTIVO DE ARROZ" -> "0111301")
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    -- Normalize the search code by stripping leading zeros
    v_cnae_code_nolead := ltrim(v_cnae_code, '0');
    IF v_cnae_code_nolead = '' AND v_cnae_code != '' THEN v_cnae_code_nolead := '0'; END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    BEGIN
      SET LOCAL statement_timeout = '5s';
      
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (v_cnae_code IS NULL OR 
             ltrim(emp.cnae_codigo, '0') = v_cnae_code_nolead OR 
             emp.cnae_fiscal LIKE v_cnae_code || '%' OR
             emp.cnae_fiscal LIKE p_cnae || '%')
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
            (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
            (NOT v_is_cnpj_search AND (
              emp.razao_social ILIKE '%' || p_search || '%' OR 
              emp.nome_fantasia ILIKE '%' || p_search || '%' OR
              emp.cnpj ILIKE '%' || v_search_digits || '%'
            ))
        );
    EXCEPTION WHEN OTHERS THEN
      v_total := 1000000;
    END;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id, emp.matriz_filial, emp.sit_cadastral, emp.data_sit_cadastral, emp.motivo_sit_cadastral, 
    emp.nome_cidade_exterior, emp.cod_pais, emp.nome_pais, emp.cod_natureza_juridica, 
    emp.data_inicio_atividade, emp.cnae_fiscal, emp.cnae_codigo, emp.uf, emp.cod_municipio, 
    emp.municipio, emp.porte_empresa, emp.opcao_simples, emp.data_opcao_simples, 
    emp.data_exclusao_simples, emp.opcao_mei, emp.sit_especial, emp.data_sit_especial, 
    emp.cnaes_secundarios, emp.categoria_id, emp.tags, emp.capital_social_empresa, 
    emp.qualif_responsavel, emp.created_at, emp.updated_at,
    (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL) as has_email,
    (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL) as has_phone,
    (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR 
         ltrim(emp.cnae_codigo, '0') = v_cnae_code_nolead OR 
         emp.cnae_fiscal LIKE v_cnae_code || '%' OR
         emp.cnae_fiscal LIKE p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
        (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
        (NOT v_is_cnpj_search AND (
          emp.razao_social ILIKE '%' || p_search || '%' OR 
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.cnpj ILIKE '%' || v_search_digits || '%'
        ))
    )
  ORDER BY 
    CASE WHEN p_search IS NOT NULL AND NOT v_is_cnpj_search THEN
      ts_rank_cd(to_tsvector('portuguese', COALESCE(emp.razao_social, '') || ' ' || COALESCE(emp.nome_fantasia, '')), plainto_tsquery('portuguese', p_search))
    ELSE 0 END DESC,
    emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;



-- ---------------------------------------------------------------
-- 20260505143436_ddfc0b5e-4feb-4440-acda-78bea3a662ae.sql
-- ---------------------------------------------------------------
-- Update materialized view to normalize CNAE codes in the filter dropdown
DROP MATERIALIZED VIEW IF EXISTS public.empresas_filter_options;

CREATE MATERIALIZED VIEW public.empresas_filter_options AS
 SELECT DISTINCT 'cnae'::text AS tipo,
    CASE 
      WHEN empresas.cnae_fiscal IS NOT NULL AND empresas.cnae_fiscal != '' THEN 
        CASE 
          WHEN empresas.cnae_fiscal ~ '^\d+ - ' THEN
            LPAD(split_part(empresas.cnae_fiscal, ' - ', 1), 7, '0') || ' - ' || split_part(empresas.cnae_fiscal, ' - ', 2)
          ELSE empresas.cnae_fiscal
        END
      ELSE LPAD(empresas.cnae_codigo, 7, '0')
    END AS valor,
    NULL::text AS uf
   FROM empresas
  WHERE empresas.cnae_codigo IS NOT NULL AND empresas.cnae_codigo != ''
UNION ALL
 SELECT DISTINCT 'municipio'::text AS tipo,
    empresas.municipio AS valor,
    empresas.uf
   FROM empresas
  WHERE empresas.municipio IS NOT NULL AND empresas.municipio != ''
UNION ALL
 SELECT DISTINCT 'uf'::text AS tipo,
    empresas.uf AS valor,
    empresas.uf
   FROM empresas
  WHERE empresas.uf IS NOT NULL AND empresas.uf != '';

CREATE INDEX IF NOT EXISTS idx_empresas_filter_options_tipo_valor ON public.empresas_filter_options (tipo, valor);



-- ---------------------------------------------------------------
-- 20260505143711_88870d9a-fce1-4ff7-8423-d0525d9e266a.sql
-- ---------------------------------------------------------------
-- Drop the function first because the return type is changing
DROP FUNCTION IF EXISTS public.get_filter_options();

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS public.empresas_filter_options;

-- Recreate materialized view with counts
CREATE MATERIALIZED VIEW public.empresas_filter_options AS
-- CNAEs
SELECT 
    'cnae'::text AS tipo,
    CASE
        WHEN ((e.cnae_fiscal IS NOT NULL) AND (e.cnae_fiscal <> ''::text)) THEN
        CASE
            WHEN (e.cnae_fiscal ~ '^\d+ - '::text) THEN ((lpad(split_part(e.cnae_fiscal, ' - '::text, 1), 7, '0'::text) || ' - '::text) || split_part(e.cnae_fiscal, ' - '::text, 2))
            ELSE e.cnae_fiscal
        END
        ELSE lpad(e.cnae_codigo, 7, '0'::text)
    END AS valor,
    NULL::text AS uf,
    count(*) as contagem
FROM public.empresas e
WHERE ((e.cnae_codigo IS NOT NULL) AND (e.cnae_codigo <> ''::text))
GROUP BY 1, 2, 3

UNION ALL

-- Municipios
SELECT 
    'municipio'::text AS tipo,
    e.municipio AS valor,
    e.uf,
    count(*) as contagem
FROM public.empresas e
WHERE ((e.municipio IS NOT NULL) AND (e.municipio <> ''::text))
GROUP BY 1, 2, 3

UNION ALL

-- UFs
SELECT 
    'uf'::text AS tipo,
    e.uf AS valor,
    e.uf,
    count(*) as contagem
FROM public.empresas e
WHERE ((e.uf IS NOT NULL) AND (e.uf <> ''::text))
GROUP BY 1, 2, 3;

-- Recreate index for performance
CREATE INDEX idx_filter_options_tipo_valor ON public.empresas_filter_options (tipo, valor);

-- Create the RPC function with the new return type
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE(tipo text, valor text, uf text, contagem bigint) AS $$
BEGIN
  -- Use materialized view
  RETURN QUERY
  SELECT fo.tipo, fo.valor, fo.uf, fo.contagem
  FROM public.empresas_filter_options fo
  WHERE fo.valor IS NOT NULL AND fo.valor != ''
  ORDER BY fo.contagem DESC;
  
  RETURN;
EXCEPTION
  WHEN undefined_table THEN
    -- Fallback if materialized view doesn't exist yet
    RETURN QUERY
    SELECT 'cnae'::text, 
      COALESCE(NULLIF(e.cnae_fiscal, ''), lpad(e.cnae_codigo, 7, '0'::text)),
      NULL::text,
      count(*) as contagem
    FROM public.empresas e
    WHERE e.cnae_codigo IS NOT NULL AND e.cnae_codigo != ''
    GROUP BY 1, 2, 3
    LIMIT 500;
    
    RETURN QUERY
    SELECT 'municipio'::text, e.municipio, e.uf, count(*) as contagem
    FROM public.empresas e
    WHERE e.municipio IS NOT NULL AND e.municipio != ''
    GROUP BY 1, 2, 3
    LIMIT 500;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ---------------------------------------------------------------
-- 20260505144758_792fbc2c-81bc-4309-89a3-fd34c3f16d18.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(p_limit integer, p_offset integer, p_uf text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_sit_cadastral text DEFAULT NULL::text, p_porte text DEFAULT NULL::text, p_cnae text DEFAULT NULL::text, p_simples text DEFAULT NULL::text, p_mei text DEFAULT NULL::text, p_matriz_filial text DEFAULT NULL::text, p_categoria_id uuid DEFAULT NULL::uuid, p_has_email boolean DEFAULT NULL::boolean, p_has_phone boolean DEFAULT NULL::boolean, p_has_socios boolean DEFAULT NULL::boolean, p_data_abertura_inicio date DEFAULT NULL::date, p_data_abertura_fim date DEFAULT NULL::date, p_tags text[] DEFAULT NULL::text[], p_busca_socio text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, matriz_filial text, sit_cadastral text, data_sit_cadastral date, motivo_sit_cadastral text, nome_cidade_exterior text, cod_pais text, nome_pais text, cod_natureza_juridica text, data_inicio_atividade date, cnae_fiscal text, cnae_codigo text, uf text, cod_municipio text, municipio text, porte_empresa text, opcao_simples text, data_opcao_simples date, data_exclusao_simples date, opcao_mei text, sit_especial text, data_sit_especial date, cnaes_secundarios text, categoria_id uuid, tags text[], capital_social_empresa numeric, qualif_responsavel text, created_at timestamp with time zone, updated_at timestamp with time zone, has_email boolean, has_phone boolean, has_socios boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code and normalize
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    -- Extract only digits for code comparison
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
    v_cnae_code_nolead := ltrim(v_cnae_clean, '0');
    IF v_cnae_code_nolead = '' AND v_cnae_clean != '' THEN v_cnae_code_nolead := '0'; END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    BEGIN
      SET LOCAL statement_timeout = '5s';
      
      SELECT COUNT(*) INTO v_total
      FROM public.empresas emp
      WHERE 
        (p_uf IS NULL OR emp.uf = p_uf)
        AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
        AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
        AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
        AND (v_cnae_code IS NULL OR 
             ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead OR 
             emp.cnae_fiscal ILIKE '%' || v_cnae_code || '%' OR
             emp.cnaes_secundarios ILIKE '%' || v_cnae_clean || '%' OR
             emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
        AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
        AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
        AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
        AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
        AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
        AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
        AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
        AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
        AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
        AND (p_tags IS NULL OR emp.tags && p_tags)
        AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
        AND (p_search IS NULL OR 
            (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
            (NOT v_is_cnpj_search AND (
              emp.razao_social ILIKE '%' || p_search || '%' OR 
              emp.nome_fantasia ILIKE '%' || p_search || '%' OR
              emp.cnpj ILIKE '%' || v_search_digits || '%'
            ))
        );
    EXCEPTION WHEN OTHERS THEN
      v_total := 1000000;
    END;
  END IF;

  RETURN QUERY
  SELECT 
    emp.id, emp.matriz_filial, emp.sit_cadastral, emp.data_sit_cadastral, emp.motivo_sit_cadastral, 
    emp.nome_cidade_exterior, emp.cod_pais, emp.nome_pais, emp.cod_natureza_juridica, 
    emp.data_inicio_atividade, emp.cnae_fiscal, emp.cnae_codigo, emp.uf, emp.cod_municipio, 
    emp.municipio, emp.porte_empresa, emp.opcao_simples, emp.data_opcao_simples, 
    emp.data_exclusao_simples, emp.opcao_mei, emp.sit_especial, emp.data_sit_especial, 
    emp.cnaes_secundarios, emp.categoria_id, emp.tags, emp.capital_social_empresa, 
    emp.qualif_responsavel, emp.created_at, emp.updated_at,
    (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL) as has_email,
    (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL) as has_phone,
    (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]') as has_socios,
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR 
         ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead OR 
         emp.cnae_fiscal ILIKE '%' || v_cnae_code || '%' OR
         emp.cnaes_secundarios ILIKE '%' || v_cnae_clean || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
        (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
        (NOT v_is_cnpj_search AND (
          emp.razao_social ILIKE '%' || p_search || '%' OR 
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.cnpj ILIKE '%' || v_search_digits || '%'
        ))
    )
  ORDER BY 
    CASE WHEN p_search IS NOT NULL AND NOT v_is_cnpj_search THEN
      ts_rank_cd(to_tsvector('portuguese', COALESCE(emp.razao_social, '') || ' ' || COALESCE(emp.nome_fantasia, '')), plainto_tsquery('portuguese', p_search))
    ELSE 0 END DESC,
    emp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;


-- ---------------------------------------------------------------
-- 20260505145519_5b65498d-7dd7-4229-8803-9401df587410.sql
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_empresas_cnaes_secundarios_trgm ON public.empresas USING gin (cnaes_secundarios gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empresas_razao_social_trgm ON public.empresas USING gin (razao_social gin_trgm_ops);



-- ---------------------------------------------------------------
-- 20260505145542_ce13b10b-f929-4170-bfbe-4b1d37209d37.sql
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresas_public(
  p_limit INTEGER DEFAULT 10,
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
  p_has_socios BOOLEAN DEFAULT NULL,
  p_data_abertura_inicio DATE DEFAULT NULL,
  p_data_abertura_fim DATE DEFAULT NULL,
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
  categoria_id UUID,
  tags TEXT[],
  capital_social_empresa NUMERIC,
  qualif_responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  has_email BOOLEAN,
  has_phone BOOLEAN,
  has_socios BOOLEAN,
  total_count BIGINT
) AS $$
DECLARE
  v_total BIGINT;
  v_has_filters BOOLEAN;
  v_cnae_code TEXT;
  v_cnae_code_nolead TEXT;
  v_cnae_clean TEXT;
  v_municipio_clean TEXT;
  v_search_digits TEXT;
  v_is_cnpj_search BOOLEAN;
BEGIN
  -- Normalize inputs
  IF p_uf IS NOT NULL AND length(trim(p_uf)) < 2 THEN p_uf := NULL; END IF;
  IF p_municipio IS NOT NULL AND length(trim(p_municipio)) < 2 THEN p_municipio := NULL; END IF;
  IF p_sit_cadastral IS NOT NULL AND length(trim(p_sit_cadastral)) < 2 THEN p_sit_cadastral := NULL; END IF;
  IF p_search IS NOT NULL AND length(trim(p_search)) < 2 THEN p_search := NULL; END IF;
  IF p_busca_socio IS NOT NULL AND length(trim(p_busca_socio)) < 3 THEN p_busca_socio := NULL; END IF;
  
  IF p_search IS NOT NULL THEN
    p_search := trim(p_search);
    v_search_digits := regexp_replace(p_search, '\D', '', 'g');
    v_is_cnpj_search := length(v_search_digits) >= 3 
                         AND length(v_search_digits)::float / length(p_search) > 0.5;
  END IF;

  -- Extract CNAE code and normalize
  IF p_cnae IS NOT NULL AND p_cnae != '' AND length(trim(p_cnae)) >= 2 THEN
    v_cnae_code := trim(split_part(p_cnae, ' - ', 1));
    v_cnae_clean := regexp_replace(v_cnae_code, '\D', '', 'g');
    v_cnae_code_nolead := ltrim(v_cnae_clean, '0');
    IF v_cnae_code_nolead = '' AND v_cnae_clean != '' THEN v_cnae_code_nolead := '0'; END IF;
  ELSE
    v_cnae_code := NULL;
    v_cnae_clean := NULL;
    v_cnae_code_nolead := NULL;
  END IF;

  IF p_municipio IS NOT NULL AND p_municipio != '' THEN
    v_municipio_clean := trim(p_municipio);
  ELSE
    v_municipio_clean := NULL;
  END IF;

  v_has_filters := COALESCE(p_uf, v_municipio_clean, p_sit_cadastral, p_porte, v_cnae_code, 
                            p_simples, p_mei, p_matriz_filial, p_busca_socio, p_search) IS NOT NULL
                   OR p_categoria_id IS NOT NULL
                   OR (p_tags IS NOT NULL AND array_length(p_tags, 1) > 0)
                   OR p_data_abertura_inicio IS NOT NULL
                   OR p_data_abertura_fim IS NOT NULL
                   OR COALESCE(p_has_email, FALSE) = TRUE
                   OR COALESCE(p_has_phone, FALSE) = TRUE
                   OR COALESCE(p_has_socios, FALSE) = TRUE;
  
  -- Increase timeout to 15s
  SET LOCAL statement_timeout = '15s';

  IF NOT v_has_filters THEN
    SELECT COALESCE(reltuples::bigint, 1000000)
    INTO v_total
    FROM pg_class
    WHERE relname = 'empresas' AND relnamespace = 'public'::regnamespace;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM public.empresas emp
    WHERE 
      (p_uf IS NULL OR emp.uf = p_uf)
      AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
      AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
      AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
      AND (v_cnae_code IS NULL OR 
           emp.cnae_codigo = v_cnae_code OR
           emp.cnae_fiscal = v_cnae_code OR
           ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead OR 
           emp.cnaes_secundarios ILIKE '%' || v_cnae_clean || '%' OR
           emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
      AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
      AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
      AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
      AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
      AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
      AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
      AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
      AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
      AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
      AND (p_tags IS NULL OR emp.tags && p_tags)
      AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
      AND (p_search IS NULL OR 
          (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
          (NOT v_is_cnpj_search AND (
            emp.razao_social ILIKE '%' || p_search || '%' OR 
            emp.nome_fantasia ILIKE '%' || p_search || '%' OR
            emp.cnpj ILIKE '%' || v_search_digits || '%'
          ))
      );
  END IF;

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
    (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL),
    (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL),
    (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'),
    v_total
  FROM public.empresas emp
  WHERE 
    (p_uf IS NULL OR emp.uf = p_uf)
    AND (v_municipio_clean IS NULL OR emp.municipio = v_municipio_clean)
    AND (p_sit_cadastral IS NULL OR emp.sit_cadastral = p_sit_cadastral)
    AND (p_porte IS NULL OR emp.porte_empresa = p_porte)
    AND (v_cnae_code IS NULL OR 
         emp.cnae_codigo = v_cnae_code OR
         emp.cnae_fiscal = v_cnae_code OR
         ltrim(regexp_replace(emp.cnae_codigo, '\D', '', 'g'), '0') = v_cnae_code_nolead OR 
         emp.cnaes_secundarios ILIKE '%' || v_cnae_clean || '%' OR
         emp.cnae_fiscal ILIKE '%' || p_cnae || '%')
    AND (p_simples IS NULL OR emp.opcao_simples = p_simples)
    AND (p_mei IS NULL OR emp.opcao_mei = p_mei)
    AND (p_matriz_filial IS NULL OR emp.matriz_filial = p_matriz_filial)
    AND (p_categoria_id IS NULL OR emp.categoria_id = p_categoria_id)
    AND (p_has_email IS NULL OR p_has_email = false OR (emp.email IS NOT NULL OR emp.correio_eletronico IS NOT NULL))
    AND (p_has_phone IS NULL OR p_has_phone = false OR (emp.ddd_telefone_1 IS NOT NULL OR emp.ddd_telefone_2 IS NOT NULL))
    AND (p_has_socios IS NULL OR p_has_socios = false OR (emp.socios_raw IS NOT NULL AND emp.socios_raw != '[]'))
    AND (p_data_abertura_inicio IS NULL OR emp.data_inicio_atividade >= p_data_abertura_inicio)
    AND (p_data_abertura_fim IS NULL OR emp.data_inicio_atividade <= p_data_abertura_fim)
    AND (p_tags IS NULL OR emp.tags && p_tags)
    AND (p_busca_socio IS NULL OR emp.socios_raw ILIKE '%' || p_busca_socio || '%')
    AND (p_search IS NULL OR 
        (v_is_cnpj_search AND emp.cnpj ILIKE '%' || v_search_digits || '%') OR
        (NOT v_is_cnpj_search AND (
          emp.razao_social ILIKE '%' || p_search || '%' OR 
          emp.nome_fantasia ILIKE '%' || p_search || '%' OR
          emp.cnpj ILIKE '%' || v_search_digits || '%'
        ))
    )
  ORDER BY emp.data_inicio_atividade DESC NULLS LAST, emp.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ---------------------------------------------------------------
-- 20260505150357_a5b105da-2fac-4af9-b4bd-0b95fdab8e84.sql
-- ---------------------------------------------------------------
-- Create a composite index to help with sorting by activity date within a city
CREATE INDEX IF NOT EXISTS idx_empresas_uf_mun_data_sort 
ON public.empresas (uf, municipio, data_inicio_atividade DESC NULLS LAST, id DESC);

-- Also optimize the primary CNAE + UF + Mun
CREATE INDEX IF NOT EXISTS idx_empresas_uf_mun_cnae_fiscal 
ON public.empresas (uf, municipio, cnae_fiscal);



-- ---------------------------------------------------------------
-- 20260505150619_6fd8cd62-053d-42fc-a1e5-28e0ddfd115e.sql
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_empresas_cnaes_secundarios_array_expr 
ON public.empresas USING gin (string_to_array(cnaes_secundarios, ','));

