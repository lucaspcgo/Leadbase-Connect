import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_STORAGE_KEY = 'leadbase_referral_code';

/**
 * Hook to manage referral code tracking
 */
export const useReferral = () => {
  // Store referral code from URL
  const storeReferralCode = useCallback((code: string) => {
    if (code && code.length > 0) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, code.toUpperCase());
      console.log('[Referral] Stored referral code:', code.toUpperCase());
    }
  }, []);

  // Get stored referral code
  const getStoredReferralCode = useCallback((): string | null => {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  }, []);

  // Clear stored referral code
  const clearReferralCode = useCallback(() => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  }, []);

  // Process referral after user registration
  const processReferral = useCallback(async (userId: string, userEmail: string): Promise<boolean> => {
    const referralCode = getStoredReferralCode();
    
    if (!referralCode) {
      console.log('[Referral] No referral code found');
      return false;
    }

    try {
      console.log('[Referral] Processing referral with code:', referralCode);

      // Get affiliate by referral code using public function
      const { data: affiliateData, error: affiliateError } = await supabase
        .rpc('get_affiliate_by_code', { p_code: referralCode });

      if (affiliateError) {
        console.error('[Referral] Error getting affiliate:', affiliateError);
        clearReferralCode();
        return false;
      }

      if (!affiliateData || affiliateData.length === 0) {
        console.log('[Referral] No active affiliate found for code:', referralCode);
        clearReferralCode();
        return false;
      }

      const affiliate = affiliateData[0];

      // Don't allow self-referral
      if (affiliate.user_id === userId) {
        console.log('[Referral] Self-referral not allowed');
        clearReferralCode();
        return false;
      }

      // Create referral record using service role via edge function
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('process-referral', {
        body: {
          affiliate_id: affiliate.affiliate_id,
          referred_user_id: userId,
          referred_user_email: userEmail,
        },
      });

      if (response.error) {
        console.error('[Referral] Error creating referral:', response.error);
        // Don't clear code on error - might be temporary
        return false;
      }

      console.log('[Referral] Referral processed successfully');
      clearReferralCode();
      return true;
    } catch (err) {
      console.error('[Referral] Error processing referral:', err);
      return false;
    }
  }, [getStoredReferralCode, clearReferralCode]);

  return {
    storeReferralCode,
    getStoredReferralCode,
    clearReferralCode,
    processReferral,
  };
};
