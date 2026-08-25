import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Public payment config - only shows which methods are enabled (no secrets)
export interface PublicPaymentMethods {
  pix_enabled: boolean;
  pix_beneficiario: string | null;
  pix_cidade: string | null;
  mercado_pago_enabled: boolean;
  paypal_enabled: boolean;
  stripe_enabled: boolean;
}

const defaultConfig: PublicPaymentMethods = {
  pix_enabled: false,
  pix_beneficiario: null,
  pix_cidade: null,
  mercado_pago_enabled: false,
  paypal_enabled: false,
  stripe_enabled: false,
};

export const usePublicPaymentConfig = () => {
  const [config, setConfig] = useState<PublicPaymentMethods>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_public_payment_config');

      if (fetchError) {
        console.error('Error fetching public payment config:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        setConfig({
          pix_enabled: data[0].pix_enabled ?? false,
          pix_beneficiario: data[0].pix_beneficiario,
          pix_cidade: data[0].pix_cidade,
          mercado_pago_enabled: data[0].mercado_pago_enabled ?? false,
          paypal_enabled: data[0].paypal_enabled ?? false,
          stripe_enabled: data[0].stripe_enabled ?? false,
        });
      }
    } catch (err) {
      console.error('Error fetching public payment config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
};
