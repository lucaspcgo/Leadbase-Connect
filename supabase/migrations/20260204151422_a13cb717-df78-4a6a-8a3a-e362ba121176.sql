-- Create coupons table for discount management
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_plans TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage all coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (is_admin(auth.uid()));

-- Authenticated users can view active coupons (for validation)
CREATE POLICY "Users can view active coupons"
ON public.coupons
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast code lookups
CREATE INDEX idx_coupons_code ON public.coupons (code);
CREATE INDEX idx_coupons_active ON public.coupons (is_active) WHERE is_active = true;