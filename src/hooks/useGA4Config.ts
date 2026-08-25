import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GA4Config {
  id?: string;
  measurement_id: string | null;
  enabled: boolean;
  track_pageviews: boolean;
  track_login: boolean;
  track_signup: boolean;
  track_conversions: boolean;
}

const defaultConfig: GA4Config = {
  measurement_id: null,
  enabled: false,
  track_pageviews: true,
  track_login: true,
  track_signup: true,
  track_conversions: true,
};

export const useGA4Config = () => {
  const [config, setConfig] = useState<GA4Config>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isMasterAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isMasterAdmin) {
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, [isMasterAdmin]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ga4_configs')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          id: data.id,
          measurement_id: data.measurement_id,
          enabled: data.enabled,
          track_pageviews: data.track_pageviews,
          track_login: data.track_login,
          track_signup: data.track_signup,
          track_conversions: data.track_conversions,
        });
      }
    } catch (error) {
      console.error('Error fetching GA4 config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: Partial<GA4Config>) => {
    if (!isMasterAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas Master Admin pode alterar configurações do GA4.',
        variant: 'destructive',
      });
      return false;
    }

    setSaving(true);
    try {
      const configToSave = { ...config, ...newConfig };
      delete configToSave.id;

      if (config.id) {
        const { error } = await supabase
          .from('ga4_configs')
          .update(configToSave)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ga4_configs')
          .insert(configToSave)
          .select()
          .single();

        if (error) throw error;
        setConfig({ ...configToSave, id: data.id });
      }

      setConfig(prev => ({ ...prev, ...newConfig }));
      toast({
        title: 'Sucesso',
        description: 'Configurações do GA4 salvas com sucesso!',
      });
      return true;
    } catch (error) {
      console.error('Error saving GA4 config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validateMeasurementId = (id: string): boolean => {
    const regex = /^G-[A-Z0-9]{10}$/;
    return regex.test(id);
  };

  return {
    config,
    loading,
    saving,
    saveConfig,
    validateMeasurementId,
    refetch: fetchConfig,
  };
};

// Hook for public GA4 config (used by the script injector)
export const useGA4PublicConfig = () => {
  const [config, setConfig] = useState<GA4Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicConfig();
  }, []);

  const fetchPublicConfig = async () => {
    try {
      const { data, error } = await supabase.rpc('get_ga4_public_config');

      if (error) throw error;

      if (data && data.length > 0) {
        setConfig({
          measurement_id: data[0].measurement_id,
          enabled: data[0].enabled,
          track_pageviews: data[0].track_pageviews,
          track_login: data[0].track_login,
          track_signup: data[0].track_signup,
          track_conversions: data[0].track_conversions,
        });
      }
    } catch (error) {
      console.error('Error fetching public GA4 config:', error);
    } finally {
      setLoading(false);
    }
  };

  return { config, loading };
};
