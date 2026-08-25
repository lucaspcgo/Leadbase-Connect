
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
