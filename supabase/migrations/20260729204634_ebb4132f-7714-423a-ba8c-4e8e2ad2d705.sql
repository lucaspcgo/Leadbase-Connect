CREATE TABLE public.meta_pixel_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text NOT NULL DEFAULT '',
  campo_alterado text NOT NULL,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.meta_pixel_audit_logs TO authenticated;
GRANT ALL ON public.meta_pixel_audit_logs TO service_role;

ALTER TABLE public.meta_pixel_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can view meta pixel audit logs"
ON public.meta_pixel_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admins can insert meta pixel audit logs"
ON public.meta_pixel_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin') AND admin_id = auth.uid());

CREATE INDEX idx_meta_pixel_audit_logs_created_at ON public.meta_pixel_audit_logs (created_at DESC);