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