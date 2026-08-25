
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
