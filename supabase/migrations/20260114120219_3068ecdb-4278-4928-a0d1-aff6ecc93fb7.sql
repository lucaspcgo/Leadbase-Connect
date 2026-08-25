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