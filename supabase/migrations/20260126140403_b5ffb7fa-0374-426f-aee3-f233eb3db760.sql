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