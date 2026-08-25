
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
