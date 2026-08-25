import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentConfig, PixConfig, MercadoPagoConfig, PayPalConfig, StripeConfig } from '@/types/payment';
import { useAuth } from '@/contexts/AuthContext';

// Public config that can be exposed to client (no secrets)
export interface PublicPaymentConfig {
  pix_enabled: boolean;
  pix_chave: string;
  pix_tipo_chave: string;
  pix_beneficiario: string;
  pix_cidade: string;
  pix_instrucoes: string;
  mercado_pago_enabled: boolean;
  mercado_pago_public_key: string;
  mercado_pago_sandbox_mode: boolean;
  paypal_enabled: boolean;
  paypal_sandbox_mode: boolean;
  stripe_enabled: boolean;
  stripe_publishable_key: string;
  stripe_sandbox_mode: boolean;
}

// Full config for master_admin only (includes secrets)
export interface FullPaymentConfig extends PublicPaymentConfig {
  id: string;
  mercado_pago_access_token: string;
  mercado_pago_webhook_secret: string;
  paypal_client_id: string;
  paypal_client_secret: string;
  paypal_webhook_id: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
}

const defaultPublicConfig: PublicPaymentConfig = {
  pix_enabled: false,
  pix_chave: '',
  pix_tipo_chave: 'EMAIL',
  pix_beneficiario: 'LeadBase Pro',
  pix_cidade: 'Sao Paulo',
  pix_instrucoes: '',
  mercado_pago_enabled: false,
  mercado_pago_public_key: '',
  mercado_pago_sandbox_mode: true,
  paypal_enabled: false,
  paypal_sandbox_mode: true,
  stripe_enabled: false,
  stripe_publishable_key: '',
  stripe_sandbox_mode: true,
};

const defaultFullConfig: FullPaymentConfig = {
  ...defaultPublicConfig,
  id: '',
  mercado_pago_access_token: '',
  mercado_pago_webhook_secret: '',
  paypal_client_id: '',
  paypal_client_secret: '',
  paypal_webhook_id: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
};

// Convert database row to PaymentConfig format for backward compatibility
export const dbToPaymentConfig = (dbConfig: FullPaymentConfig | null): PaymentConfig => {
  if (!dbConfig) {
    return {
      pix: {
        enabled: false,
        chave_pix: '',
        tipo_chave: 'EMAIL',
        beneficiario: 'LeadBase Pro',
        cidade: 'Sao Paulo',
        instrucoes: '',
      },
      mercado_pago: {
        enabled: false,
        access_token: '',
        public_key: '',
        sandbox_mode: true,
        webhook_secret: '',
      },
      paypal: {
        enabled: false,
        client_id: '',
        client_secret: '',
        sandbox_mode: true,
        webhook_id: '',
      },
      stripe: {
        enabled: false,
        publishable_key: '',
        secret_key: '',
        sandbox_mode: true,
        webhook_secret: '',
      },
    };
  }

  return {
    pix: {
      enabled: dbConfig.pix_enabled,
      chave_pix: dbConfig.pix_chave || '',
      tipo_chave: (dbConfig.pix_tipo_chave as PixConfig['tipo_chave']) || 'EMAIL',
      beneficiario: dbConfig.pix_beneficiario || 'LeadBase Pro',
      cidade: dbConfig.pix_cidade || 'Sao Paulo',
      instrucoes: dbConfig.pix_instrucoes || '',
    },
    mercado_pago: {
      enabled: dbConfig.mercado_pago_enabled,
      access_token: dbConfig.mercado_pago_access_token || '',
      public_key: dbConfig.mercado_pago_public_key || '',
      sandbox_mode: dbConfig.mercado_pago_sandbox_mode,
      webhook_secret: dbConfig.mercado_pago_webhook_secret || '',
    },
    paypal: {
      enabled: dbConfig.paypal_enabled,
      client_id: dbConfig.paypal_client_id || '',
      client_secret: dbConfig.paypal_client_secret || '',
      sandbox_mode: dbConfig.paypal_sandbox_mode,
      webhook_id: dbConfig.paypal_webhook_id || '',
    },
    stripe: {
      enabled: dbConfig.stripe_enabled,
      publishable_key: dbConfig.stripe_publishable_key || '',
      secret_key: dbConfig.stripe_secret_key || '',
      sandbox_mode: dbConfig.stripe_sandbox_mode,
      webhook_secret: dbConfig.stripe_webhook_secret || '',
    },
  };
};

// Convert PaymentConfig to database update format
const paymentConfigToDb = (config: Partial<PaymentConfig>) => {
  const dbUpdate: Record<string, unknown> = {};
  
  if (config.pix) {
    if (config.pix.enabled !== undefined) dbUpdate.pix_enabled = config.pix.enabled;
    if (config.pix.chave_pix !== undefined) dbUpdate.pix_chave = config.pix.chave_pix;
    if (config.pix.tipo_chave !== undefined) dbUpdate.pix_tipo_chave = config.pix.tipo_chave;
    if (config.pix.beneficiario !== undefined) dbUpdate.pix_beneficiario = config.pix.beneficiario;
    if (config.pix.cidade !== undefined) dbUpdate.pix_cidade = config.pix.cidade;
    if (config.pix.instrucoes !== undefined) dbUpdate.pix_instrucoes = config.pix.instrucoes;
  }
  
  if (config.mercado_pago) {
    if (config.mercado_pago.enabled !== undefined) dbUpdate.mercado_pago_enabled = config.mercado_pago.enabled;
    if (config.mercado_pago.access_token !== undefined) dbUpdate.mercado_pago_access_token = config.mercado_pago.access_token;
    if (config.mercado_pago.public_key !== undefined) dbUpdate.mercado_pago_public_key = config.mercado_pago.public_key;
    if (config.mercado_pago.sandbox_mode !== undefined) dbUpdate.mercado_pago_sandbox_mode = config.mercado_pago.sandbox_mode;
    if (config.mercado_pago.webhook_secret !== undefined) dbUpdate.mercado_pago_webhook_secret = config.mercado_pago.webhook_secret;
  }
  
  if (config.paypal) {
    if (config.paypal.enabled !== undefined) dbUpdate.paypal_enabled = config.paypal.enabled;
    if (config.paypal.client_id !== undefined) dbUpdate.paypal_client_id = config.paypal.client_id;
    if (config.paypal.client_secret !== undefined) dbUpdate.paypal_client_secret = config.paypal.client_secret;
    if (config.paypal.sandbox_mode !== undefined) dbUpdate.paypal_sandbox_mode = config.paypal.sandbox_mode;
    if (config.paypal.webhook_id !== undefined) dbUpdate.paypal_webhook_id = config.paypal.webhook_id;
  }

  if (config.stripe) {
    if (config.stripe.enabled !== undefined) dbUpdate.stripe_enabled = config.stripe.enabled;
    if (config.stripe.publishable_key !== undefined) dbUpdate.stripe_publishable_key = config.stripe.publishable_key;
    if (config.stripe.secret_key !== undefined) dbUpdate.stripe_secret_key = config.stripe.secret_key;
    if (config.stripe.sandbox_mode !== undefined) dbUpdate.stripe_sandbox_mode = config.stripe.sandbox_mode;
    if (config.stripe.webhook_secret !== undefined) dbUpdate.stripe_webhook_secret = config.stripe.webhook_secret;
  }
  
  return dbUpdate;
};

export const usePaymentConfig = () => {
  // Safely get user from auth context
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user ?? null;
  } catch (e) {
    console.warn('usePaymentConfig: AuthContext not available');
  }
  
  const [config, setConfig] = useState<FullPaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';

  // Fetch payment config from database (only master_admin can access)
  const fetchConfig = useCallback(async () => {
    if (!isMasterAdmin) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('payment_configs')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching payment config:', fetchError);
        setError(fetchError.message);
        setConfig(null);
      } else if (data) {
        setConfig(data as unknown as FullPaymentConfig);
      } else {
        // No config exists yet, use defaults
        setConfig(defaultFullConfig);
      }
    } catch (err) {
      console.error('Error fetching payment config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update payment config in database
  const updateConfig = useCallback(async (updates: Partial<PaymentConfig>): Promise<boolean> => {
    if (!isMasterAdmin) {
      setError('Only master_admin can update payment config');
      return false;
    }

    try {
      setError(null);
      const dbUpdates = paymentConfigToDb(updates);

      // Get existing config ID or create new
      const { data: existingConfig } = await supabase
        .from('payment_configs')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingConfig?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('payment_configs')
          .update(dbUpdates)
          .eq('id', existingConfig.id);

        if (updateError) {
          console.error('Error updating payment config:', updateError);
          setError(updateError.message);
          return false;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('payment_configs')
          .insert(dbUpdates);

        if (insertError) {
          console.error('Error inserting payment config:', insertError);
          setError(insertError.message);
          return false;
        }
      }

      // Refetch to get updated config
      await fetchConfig();
      return true;
    } catch (err) {
      console.error('Error updating payment config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [isMasterAdmin, fetchConfig]);

  // Convert to PaymentConfig format for backward compatibility
  const paymentConfig = dbToPaymentConfig(config);

  return {
    config,
    paymentConfig,
    loading,
    error,
    updateConfig,
    refetch: fetchConfig,
    isMasterAdmin,
  };
};
