import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

type EventName = 
  | 'page_view'
  | 'login'
  | 'logout'
  | 'sign_up'
  | 'dashboard_access'
  | 'button_click'
  | 'conversion'
  | 'purchase'
  | 'plan_upgrade'
  | 'company_unlock'
  | 'search'
  | 'export_data'
  | 'pwa_install_prompt'
  | 'pwa_install_click'
  | 'pwa_install_success'
  | 'pwa_install_dismiss'
  | 'pwa_banner_click'
  | 'pwa_banner_dismiss';

interface EventParams {
  page_path?: string;
  page_title?: string;
  button_name?: string;
  conversion_type?: string;
  value?: number;
  currency?: string;
  plan_name?: string;
  search_term?: string;
  [key: string]: any;
}

export const useGA4Events = () => {
  const { user } = useAuth();

  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('ga4_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ga4_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const trackEvent = useCallback(async (
    eventName: EventName,
    params: EventParams = {}
  ) => {
    try {
      // Send to Google Analytics if gtag is available
      if (window.gtag) {
        window.gtag('event', eventName, {
          ...params,
          user_id: user?.id,
        });
      }

      // Also store locally for our dashboard
      await supabase.from('ga4_events').insert({
        event_name: eventName,
        user_id: user?.id || null,
        session_id: getSessionId(),
        page_path: params.page_path || window.location.pathname,
        page_title: params.page_title || document.title,
        metadata: params,
      });
    } catch (error) {
      console.error('Error tracking GA4 event:', error);
    }
  }, [user?.id, getSessionId]);

  const trackPageView = useCallback((pagePath?: string, pageTitle?: string) => {
    trackEvent('page_view', {
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
    });
  }, [trackEvent]);

  const trackLogin = useCallback(() => {
    trackEvent('login', {
      method: 'email',
    });
  }, [trackEvent]);

  const trackLogout = useCallback(() => {
    trackEvent('logout');
  }, [trackEvent]);

  const trackSignUp = useCallback(() => {
    trackEvent('sign_up', {
      method: 'email',
    });
  }, [trackEvent]);

  const trackDashboardAccess = useCallback(() => {
    trackEvent('dashboard_access');
  }, [trackEvent]);

  const trackButtonClick = useCallback((buttonName: string) => {
    trackEvent('button_click', {
      button_name: buttonName,
    });
  }, [trackEvent]);

  const trackConversion = useCallback((
    conversionType: string,
    value?: number,
    currency: string = 'BRL'
  ) => {
    trackEvent('conversion', {
      conversion_type: conversionType,
      value,
      currency,
    });
  }, [trackEvent]);

  const trackPurchase = useCallback((
    planName: string,
    value: number,
    currency: string = 'BRL'
  ) => {
    trackEvent('purchase', {
      plan_name: planName,
      value,
      currency,
    });
  }, [trackEvent]);

  const trackPlanUpgrade = useCallback((planName: string) => {
    trackEvent('plan_upgrade', {
      plan_name: planName,
    });
  }, [trackEvent]);

  const trackCompanyUnlock = useCallback((companyId: string) => {
    trackEvent('company_unlock', {
      company_id: companyId,
    });
  }, [trackEvent]);

  const trackSearch = useCallback((searchTerm: string) => {
    trackEvent('search', {
      search_term: searchTerm,
    });
  }, [trackEvent]);

  // PWA Installation tracking
  const trackPWAInstallPrompt = useCallback((platform: 'ios' | 'android' | 'desktop') => {
    trackEvent('pwa_install_prompt', {
      platform,
      source: 'auto_prompt',
    });
  }, [trackEvent]);

  const trackPWAInstallClick = useCallback((source: 'prompt' | 'banner' | 'page') => {
    trackEvent('pwa_install_click', {
      source,
    });
  }, [trackEvent]);

  const trackPWAInstallSuccess = useCallback((source: 'prompt' | 'banner' | 'page') => {
    trackEvent('pwa_install_success', {
      source,
      conversion_type: 'pwa_install',
    });
  }, [trackEvent]);

  const trackPWAInstallDismiss = useCallback((source: 'prompt' | 'banner') => {
    trackEvent('pwa_install_dismiss', {
      source,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackLogin,
    trackLogout,
    trackSignUp,
    trackDashboardAccess,
    trackButtonClick,
    trackConversion,
    trackPurchase,
    trackPlanUpgrade,
    trackCompanyUnlock,
    trackSearch,
    trackPWAInstallPrompt,
    trackPWAInstallClick,
    trackPWAInstallSuccess,
    trackPWAInstallDismiss,
  };
};
