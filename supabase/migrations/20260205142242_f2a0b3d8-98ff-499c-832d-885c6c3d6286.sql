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