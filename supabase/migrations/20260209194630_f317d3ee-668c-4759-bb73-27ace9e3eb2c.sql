
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
