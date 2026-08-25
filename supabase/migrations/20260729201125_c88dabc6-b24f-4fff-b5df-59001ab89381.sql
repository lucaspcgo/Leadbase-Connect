CREATE TABLE public.meta_pixel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id text,
  enabled boolean NOT NULL DEFAULT false,
  track_pageviews boolean NOT NULL DEFAULT true,
  track_lead boolean NOT NULL DEFAULT true,
  track_complete_registration boolean NOT NULL DEFAULT true,
  track_purchase boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_pixel_configs TO authenticated;
GRANT ALL ON public.meta_pixel_configs TO service_role;

ALTER TABLE public.meta_pixel_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only master_admin can view Meta Pixel config"
ON public.meta_pixel_configs FOR SELECT
USING (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can insert Meta Pixel config"
ON public.meta_pixel_configs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can update Meta Pixel config"
ON public.meta_pixel_configs FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'))
WITH CHECK (has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Only master_admin can delete Meta Pixel config"
ON public.meta_pixel_configs FOR DELETE
USING (has_role(auth.uid(), 'master_admin'));

CREATE TRIGGER update_meta_pixel_configs_updated_at
BEFORE UPDATE ON public.meta_pixel_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_meta_pixel_public_config()
RETURNS TABLE(pixel_id text, enabled boolean, track_pageviews boolean, track_lead boolean, track_complete_registration boolean, track_purchase boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN m.enabled THEN m.pixel_id ELSE NULL END as pixel_id,
    COALESCE(m.enabled, false) as enabled,
    COALESCE(m.track_pageviews, true) as track_pageviews,
    COALESCE(m.track_lead, true) as track_lead,
    COALESCE(m.track_complete_registration, true) as track_complete_registration,
    COALESCE(m.track_purchase, true) as track_purchase
  FROM meta_pixel_configs m
  LIMIT 1;
END;
$$;