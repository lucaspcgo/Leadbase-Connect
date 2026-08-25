import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MetaPixelConfig {
  id?: string;
  pixel_id: string | null;
  enabled: boolean;
  track_pageviews: boolean;
  track_lead: boolean;
  track_complete_registration: boolean;
  track_purchase: boolean;
}

export interface MetaPixelAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

const defaultConfig: MetaPixelConfig = {
  pixel_id: null,
  enabled: false,
  track_pageviews: true,
  track_lead: true,
  track_complete_registration: true,
  track_purchase: true,
};

export const FIELD_LABELS: Record<string, string> = {
  pixel_id: 'ID do Pixel',
  enabled: 'Rastreamento ativado',
  track_pageviews: 'Evento PageView',
  track_lead: 'Evento Lead',
  track_complete_registration: 'Evento CompleteRegistration',
  track_purchase: 'Evento Purchase',
};

export const validatePixelId = (id: string): boolean => /^\d{15,16}$/.test(id.trim());

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ativado' : 'Desativado';
  return String(value);
};

export const useMetaPixelConfig = () => {
  const [config, setConfig] = useState<MetaPixelConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isMasterAdmin, user } = useAuth();
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
      const { data, error } = await (supabase as any)
        .from('meta_pixel_configs')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          pixel_id: data.pixel_id,
          enabled: data.enabled,
          track_pageviews: data.track_pageviews,
          track_lead: data.track_lead,
          track_complete_registration: data.track_complete_registration,
          track_purchase: data.track_purchase,
        });
      }
    } catch (error) {
      console.error('Error fetching Meta Pixel config:', error);
    } finally {
      setLoading(false);
    }
  };

  const logChanges = async (previous: MetaPixelConfig, next: MetaPixelConfig) => {
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData?.user?.id;
    if (!adminId) return;

    const adminName = user?.name || authData.user?.email || 'Admin';

    const entries = (Object.keys(FIELD_LABELS) as (keyof MetaPixelConfig)[])
      .filter(key => (previous[key] ?? null) !== (next[key] ?? null))
      .map(key => ({
        admin_id: adminId,
        admin_name: adminName,
        campo_alterado: key as string,
        valor_anterior: formatValue(previous[key]),
        valor_novo: formatValue(next[key]),
      }));

    if (entries.length === 0) return;

    const { error } = await (supabase as any).from('meta_pixel_audit_logs').insert(entries);
    if (error) console.error('Error logging Meta Pixel changes:', error);
  };

  const saveConfig = async (newConfig: Partial<MetaPixelConfig>) => {
    if (!isMasterAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas Master Admin pode alterar o Pixel da Meta.',
        variant: 'destructive',
      });
      return false;
    }

    setSaving(true);
    try {
      const previous = { ...config };
      const configToSave: Partial<MetaPixelConfig> = { ...config, ...newConfig };
      delete configToSave.id;

      if (config.id) {
        const { error } = await (supabase as any)
          .from('meta_pixel_configs')
          .update(configToSave)
          .eq('id', config.id);
        if (error) throw error;
        setConfig(prev => ({ ...prev, ...newConfig }));
      } else {
        const { data, error } = await (supabase as any)
          .from('meta_pixel_configs')
          .insert(configToSave)
          .select()
          .single();
        if (error) throw error;
        setConfig({ ...(configToSave as MetaPixelConfig), id: data.id });
      }

      await logChanges(previous, configToSave as MetaPixelConfig);

      toast({
        title: 'Sucesso',
        description: 'Configurações do Pixel da Meta salvas com sucesso!',
      });
      return true;
    } catch (error) {
      console.error('Error saving Meta Pixel config:', error);
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



  return { config, loading, saving, saveConfig, validatePixelId, refetch: fetchConfig };
};

// Audit log history of Meta Pixel changes
export const useMetaPixelAuditLogs = () => {
  const [logs, setLogs] = useState<MetaPixelAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { isMasterAdmin } = useAuth();

  const fetchLogs = useCallback(async () => {
    if (!isMasterAdmin) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('meta_pixel_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setLogs((data as MetaPixelAuditLog[]) || []);
    } catch (error) {
      console.error('Error fetching Meta Pixel audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
};


// Public config used by the script injector
export const useMetaPixelPublicConfig = () => {
  const [config, setConfig] = useState<MetaPixelConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_meta_pixel_public_config');
        if (error) throw error;
        if (data && data.length > 0) {
          setConfig({
            pixel_id: data[0].pixel_id,
            enabled: data[0].enabled,
            track_pageviews: data[0].track_pageviews,
            track_lead: data[0].track_lead,
            track_complete_registration: data[0].track_complete_registration,
            track_purchase: data[0].track_purchase,
          });
        }
      } catch (error) {
        console.error('Error fetching public Meta Pixel config:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { config, loading };
};
