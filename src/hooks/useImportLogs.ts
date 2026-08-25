import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ImportLog {
  id: string;
  admin_id: string;
  admin_name: string;
  filename: string | null;
  source: 'file' | 'paste';
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors_count: number;
  ufs_imported: string[] | null;
  duplicate_mode: 'update' | 'skip';
  created_at: string;
}

export interface CreateImportLog {
  filename?: string | null;
  source: 'file' | 'paste';
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors_count: number;
  ufs_imported?: string[];
  duplicate_mode: 'update' | 'skip';
}

export const useImportLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setLogs(data as ImportLog[] || []);
    } catch (err: any) {
      console.error('Error fetching import logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = async (logData: CreateImportLog): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('import_logs')
        .insert({
          admin_id: user.id,
          admin_name: user.name || user.email || 'Admin',
          filename: logData.filename,
          source: logData.source,
          total_rows: logData.total_rows,
          inserted: logData.inserted,
          updated: logData.updated,
          skipped: logData.skipped,
          errors_count: logData.errors_count,
          ufs_imported: logData.ufs_imported || null,
          duplicate_mode: logData.duplicate_mode,
        });

      if (insertError) {
        throw insertError;
      }

      // Refresh logs after insert
      await fetchLogs();
      return true;
    } catch (err: any) {
      console.error('Error creating import log:', err);
      return false;
    }
  };

  return {
    logs,
    loading,
    error,
    fetchLogs,
    createLog,
  };
};
