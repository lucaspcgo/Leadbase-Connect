import { useState, useEffect, useCallback } from 'react';
import { Empresa } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DB_NAME = 'leadbase_offline';
const DB_VERSION = 1;
const STORE_NAME = 'empresas';

interface OfflineEmpresa extends Empresa {
  cachedAt: number;
}

// IndexedDB helpers
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('cnpj', 'cnpj', { unique: true });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
};

const getAllFromStore = async <T>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

const putToStore = async <T>(db: IDBDatabase, storeName: string, item: T): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const deleteFromStore = async (db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const clearStore = async (db: IDBDatabase, storeName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export function useOfflineEmpresas() {
  const { user, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineEmpresas, setOfflineEmpresas] = useState<OfflineEmpresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached empresas on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    loadCachedEmpresas();
  }, [isAuthenticated, user?.id]);

  const loadCachedEmpresas = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await openDatabase();
      const cached = await getAllFromStore<OfflineEmpresa>(db, STORE_NAME);
      
      // Sort by most recently cached
      cached.sort((a, b) => b.cachedAt - a.cachedAt);
      setOfflineEmpresas(cached);
      
      // Find last sync time
      if (cached.length > 0) {
        const mostRecent = Math.max(...cached.map(e => e.cachedAt));
        setLastSyncAt(new Date(mostRecent));
      }
    } catch (error) {
      console.error('Error loading cached empresas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cache a single empresa
  const cacheEmpresa = useCallback(async (empresa: Empresa) => {
    try {
      const db = await openDatabase();
      const offlineEmpresa: OfflineEmpresa = {
        ...empresa,
        cachedAt: Date.now(),
      };
      await putToStore(db, STORE_NAME, offlineEmpresa);
      
      // Update state
      setOfflineEmpresas(prev => {
        const filtered = prev.filter(e => e.id !== empresa.id);
        return [offlineEmpresa, ...filtered];
      });
      setLastSyncAt(new Date());
    } catch (error) {
      console.error('Error caching empresa:', error);
    }
  }, []);

  // Remove empresa from cache
  const removeCachedEmpresa = useCallback(async (empresaId: number) => {
    try {
      const db = await openDatabase();
      await deleteFromStore(db, STORE_NAME, empresaId);
      setOfflineEmpresas(prev => prev.filter(e => e.id !== empresaId));
    } catch (error) {
      console.error('Error removing cached empresa:', error);
    }
  }, []);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    try {
      const db = await openDatabase();
      await clearStore(db, STORE_NAME);
      setOfflineEmpresas([]);
      setLastSyncAt(null);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, []);

  // Sync unlocked empresas from server
  const syncUnlockedEmpresas = useCallback(async () => {
    if (!isOnline || !user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Fetch unlocked companies for current user
      const { data: unlockedData, error: unlockedError } = await supabase
        .from('unlocked_companies')
        .select('empresa_cnpj, empresa_id')
        .eq('user_id', user.id)
        .gte('billing_cycle_end', new Date().toISOString());
      
      if (unlockedError) throw unlockedError;
      
      if (!unlockedData || unlockedData.length === 0) {
        return;
      }

      // Fetch full empresa data for each unlocked company
      const empresaIds = unlockedData
        .filter(u => u.empresa_id !== null)
        .map(u => u.empresa_id as number);
      
      if (empresaIds.length === 0) return;

      const db = await openDatabase();
      
      for (const empresaId of empresaIds) {
        // Use RPC to get full empresa data
        const { data: empresaData, error: empresaError } = await supabase
          .rpc('get_empresa_for_unlock', { p_empresa_id: empresaId });
        
        if (empresaError || !empresaData || empresaData.length === 0) continue;
        
        const empresa = empresaData[0];
        const offlineEmpresa: OfflineEmpresa = {
          id: empresa.id,
          cnpj: empresa.cnpj,
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          sit_cadastral: empresa.sit_cadastral,
          data_sit_cadastral: empresa.data_sit_cadastral ? new Date(empresa.data_sit_cadastral) : null,
          motivo_sit_cadastral: empresa.motivo_sit_cadastral,
          nome_cidade_exterior: empresa.nome_cidade_exterior,
          cod_pais: empresa.cod_pais,
          nome_pais: empresa.nome_pais,
          cod_natureza_juridica: empresa.cod_natureza_juridica,
          data_inicio_atividade: empresa.data_inicio_atividade ? new Date(empresa.data_inicio_atividade) : null,
          cnae_fiscal: empresa.cnae_fiscal,
          cnae_codigo: empresa.cnae_codigo,
          desc_tipo_logradouro: empresa.desc_tipo_logradouro,
          logradouro: empresa.logradouro,
          numero: empresa.numero,
          complemento: empresa.complemento,
          bairro: empresa.bairro,
          cep: empresa.cep,
          uf: empresa.uf,
          cod_municipio: empresa.cod_municipio,
          municipio: empresa.municipio,
          ddd_telefone_1: empresa.ddd_telefone_1,
          telefone1_celular: empresa.telefone1_celular,
          ddd_telefone_2: empresa.ddd_telefone_2,
          telefone2_celular: empresa.telefone2_celular,
          ddd_fax: empresa.ddd_fax,
          correio_eletronico: empresa.correio_eletronico,
          email: empresa.email,
          qualif_responsavel: empresa.qualif_responsavel,
          capital_social_empresa: empresa.capital_social_empresa,
          porte_empresa: empresa.porte_empresa,
          opcao_simples: empresa.opcao_simples,
          data_opcao_simples: empresa.data_opcao_simples ? new Date(empresa.data_opcao_simples) : null,
          data_exclusao_simples: empresa.data_exclusao_simples ? new Date(empresa.data_exclusao_simples) : null,
          opcao_mei: empresa.opcao_mei,
          sit_especial: empresa.sit_especial,
          data_sit_especial: empresa.data_sit_especial ? new Date(empresa.data_sit_especial) : null,
          socios: empresa.socios,
          socios_raw: empresa.socios_raw,
          cnaes_secundarios: empresa.cnaes_secundarios,
          categoria_id: empresa.categoria_id,
          tags: empresa.tags || [],
          matriz_filial: empresa.matriz_filial,
          cachedAt: Date.now(),
        };
        
        await putToStore(db, STORE_NAME, offlineEmpresa);
      }
      
      // Reload cached data
      await loadCachedEmpresas();
    } catch (error) {
      console.error('Error syncing unlocked empresas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, user?.id, loadCachedEmpresas]);

  // Get empresa from cache by ID
  const getFromCache = useCallback((empresaId: number): OfflineEmpresa | undefined => {
    return offlineEmpresas.find(e => e.id === empresaId);
  }, [offlineEmpresas]);

  // Get empresa from cache by CNPJ
  const getFromCacheByCnpj = useCallback((cnpj: string): OfflineEmpresa | undefined => {
    const normalizedCnpj = cnpj.replace(/\D/g, '');
    return offlineEmpresas.find(e => e.cnpj?.replace(/\D/g, '') === normalizedCnpj);
  }, [offlineEmpresas]);

  return {
    isOnline,
    isLoading,
    offlineEmpresas,
    lastSyncAt,
    cacheEmpresa,
    removeCachedEmpresa,
    clearCache,
    syncUnlockedEmpresas,
    getFromCache,
    getFromCacheByCnpj,
    cachedCount: offlineEmpresas.length,
  };
}
