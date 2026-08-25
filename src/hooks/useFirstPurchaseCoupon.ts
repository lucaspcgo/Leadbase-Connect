import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FIRST_PURCHASE_COUPON_CODE = 'PRIMEIRA5';
const FIRST_PURCHASE_DISCOUNT = 5; // 5% discount

export interface FirstPurchaseCouponResult {
  coupon: {
    code: string;
    discount: number;
  } | null;
  alreadyUsed: boolean;
}

export const useFirstPurchaseCoupon = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if user is eligible for first purchase coupon
  const checkEligibility = useCallback(async (): Promise<FirstPurchaseCouponResult> => {
    if (!user) {
      return { coupon: null, alreadyUsed: false };
    }

    setLoading(true);
    try {
      // Check if user has any previous payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'APPROVED')
        .limit(1);

      if (paymentsError) {
        console.error('Error checking payments:', paymentsError);
        return { coupon: null, alreadyUsed: false };
      }

      // If user has previous approved payments, they're not eligible
      if (payments && payments.length > 0) {
        return { coupon: null, alreadyUsed: true };
      }

      // Check if the first purchase coupon exists, if not create it
      const { data: existingCoupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', FIRST_PURCHASE_COUPON_CODE)
        .maybeSingle();

      if (couponError) {
        console.error('Error checking first purchase coupon:', couponError);
        return { coupon: null, alreadyUsed: false };
      }

      // If coupon doesn't exist, create it (this is an admin action, but we'll check if it exists)
      if (!existingCoupon) {
        // Coupon needs to be created by admin - return the expected code
        return {
          coupon: {
            code: FIRST_PURCHASE_COUPON_CODE,
            discount: FIRST_PURCHASE_DISCOUNT,
          },
          alreadyUsed: false,
        };
      }

      // Check if coupon is active
      if (!existingCoupon.is_active) {
        return { coupon: null, alreadyUsed: false };
      }

      // Return coupon info
      return {
        coupon: {
          code: existingCoupon.code,
          discount: existingCoupon.discount_value,
        },
        alreadyUsed: false,
      };
    } catch (error) {
      console.error('Error in checkEligibility:', error);
      return { coupon: null, alreadyUsed: false };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    checkEligibility,
    loading,
    couponCode: FIRST_PURCHASE_COUPON_CODE,
    discountPercentage: FIRST_PURCHASE_DISCOUNT,
  };
};

// Function to ensure the first purchase coupon exists in the database
export const ensureFirstPurchaseCouponExists = async (): Promise<boolean> => {
  try {
    const { data: existingCoupon, error: checkError } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', FIRST_PURCHASE_COUPON_CODE)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking coupon existence:', checkError);
      return false;
    }

    if (existingCoupon) {
      return true; // Coupon already exists
    }

    // Create the first purchase coupon
    const { error: insertError } = await supabase
      .from('coupons')
      .insert({
        code: FIRST_PURCHASE_COUPON_CODE,
        description: 'Cupom de primeira compra - 5% de desconto',
        discount_type: 'PERCENTAGE',
        discount_value: FIRST_PURCHASE_DISCOUNT,
        min_purchase: 0,
        max_uses: null, // Unlimited uses (each user can only use once due to payment check)
        valid_from: new Date().toISOString(),
        valid_until: null, // Never expires
        is_active: true,
        applicable_plans: [], // Applies to all plans
      });

    if (insertError) {
      console.error('Error creating first purchase coupon:', insertError);
      return false;
    }

    console.log('First purchase coupon created successfully');
    return true;
  } catch (error) {
    console.error('Error in ensureFirstPurchaseCouponExists:', error);
    return false;
  }
};
