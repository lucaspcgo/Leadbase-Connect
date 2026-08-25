import { useCallback } from 'react';
import { useMetaPixelPublicConfig } from '@/hooks/useMetaPixelConfig';

/**
 * Mapeamento automático dos eventos padrão do Pixel da Meta.
 * Os disparos respeitam as chaves configuradas no Admin → Pixel da Meta.
 */
export const useMetaPixelEvents = () => {
  const { config } = useMetaPixelPublicConfig();

  const fire = useCallback(
    (eventName: string, params?: Record<string, unknown>) => {
      if (!config?.enabled || !config?.pixel_id) return;
      if (typeof window === 'undefined' || !window.fbq) return;
      try {
        window.fbq('track', eventName, params ?? {});
      } catch (error) {
        console.error('Erro ao disparar evento do Pixel da Meta:', error);
      }
    },
    [config]
  );

  /** Lead: ação que consome crédito (desbloqueio de empresa) */
  const trackLead = useCallback(
    (params?: { content_name?: string; content_ids?: string[]; value?: number; currency?: string }) => {
      if (!config?.track_lead) return;
      fire('Lead', { currency: 'BRL', ...params });
    },
    [config, fire]
  );

  /** CompleteRegistration: cadastro concluído */
  const trackCompleteRegistration = useCallback(
    (params?: { content_name?: string; status?: string; value?: number; currency?: string }) => {
      if (!config?.track_complete_registration) return;
      fire('CompleteRegistration', { currency: 'BRL', status: 'completed', ...params });
    },
    [config, fire]
  );

  /** Purchase: pagamento aprovado (plano ou créditos extras) */
  const trackPurchase = useCallback(
    (value: number, params?: { content_name?: string; content_type?: string; currency?: string }) => {
      if (!config?.track_purchase) return;
      fire('Purchase', { value: Number(value) || 0, currency: 'BRL', ...params });
    },
    [config, fire]
  );

  /** InitiateCheckout: início do checkout (sempre atrelado ao Purchase) */
  const trackInitiateCheckout = useCallback(
    (value: number, params?: { content_name?: string; currency?: string }) => {
      if (!config?.track_purchase) return;
      fire('InitiateCheckout', { value: Number(value) || 0, currency: 'BRL', ...params });
    },
    [config, fire]
  );

  return {
    trackLead,
    trackCompleteRegistration,
    trackPurchase,
    trackInitiateCheckout,
    isPixelActive: !!config?.enabled && !!config?.pixel_id,
  };
};

export default useMetaPixelEvents;
