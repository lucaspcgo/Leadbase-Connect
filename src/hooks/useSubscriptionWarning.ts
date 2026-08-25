import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionWarningState {
  daysRemaining: number | null;
  expirationDate: Date | null;
  isExpiringSoon: boolean; // <= 5 days
  isExpired: boolean;
  hasActiveSubscription: boolean;
  showWarningPopup: boolean;
  dismissPopup: () => void;
  loading: boolean;
}

const WARNING_DAYS_THRESHOLD = 5;
const POPUP_DISMISSED_KEY = 'subscription_warning_dismissed';

export const useSubscriptionWarning = (): SubscriptionWarningState => {
  const { user, isTeamMember, teamOwnerInfo } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // If user is a team member, check owner's subscription
      const userIdToCheck = isTeamMember && teamOwnerInfo ? teamOwnerInfo.ownerId : user.id;

      // Fetch active subscription
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('current_period_end, status, plan_id')
        .eq('user_id', userIdToCheck)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setLoading(false);
        return;
      }

      if (subscription && subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setExpirationDate(endDate);
        setDaysRemaining(diffDays);
        setHasActiveSubscription(true);

        // Check if popup should be shown (5 days or less and not dismissed today)
        if (diffDays <= WARNING_DAYS_THRESHOLD && diffDays > 0) {
          const dismissedDate = localStorage.getItem(POPUP_DISMISSED_KEY);
          const today = new Date().toDateString();
          
          if (dismissedDate !== today) {
            setShowWarningPopup(true);
          }
        }
      } else {
        // Check if user has a paid plan in profile but no active subscription
        // This might indicate an expired subscription
        if (user.plan && user.plan.id !== 'free') {
          setHasActiveSubscription(false);
          setDaysRemaining(0);
        }
      }
    } catch (err) {
      console.error('Error in fetchSubscriptionData:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isTeamMember, teamOwnerInfo]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const dismissPopup = useCallback(() => {
    const today = new Date().toDateString();
    localStorage.setItem(POPUP_DISMISSED_KEY, today);
    setShowWarningPopup(false);
  }, []);

  const isExpiringSoon = daysRemaining !== null && daysRemaining <= WARNING_DAYS_THRESHOLD && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  return {
    daysRemaining,
    expirationDate,
    isExpiringSoon,
    isExpired,
    hasActiveSubscription,
    showWarningPopup,
    dismissPopup,
    loading,
  };
};
