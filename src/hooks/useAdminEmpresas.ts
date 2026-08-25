import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empresa } from '@/types';

export interface AdminEmpresaFilters {
  search?: string;
  uf?: string;
  sit_cadastral?: string;
  categoria_id?: string;
  tag_ids?: string[];
  tem_email?: 'sim' | 'nao' | '';
  tem_telefone?: 'sim' | 'nao' | '';
  tem_socios?: 'sim' | 'nao' | '';
  busca_socio?: string;
  municipio?: string;
  cnae?: string;
  porte?: string;
  simples?: string;
  mei?: string;
  matriz_filial?: string;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
}

interface UseAdminEmpresasResult {
  empresas: Partial<Empresa>[];
  loading: boolean;
  totalCount: number;
  error: string | null;
  refetch: () => void;
  isCached: boolean;
}

// Cache structure for storing page data
interface CacheEntry {
  data: Partial<Empresa>[];
  count: number;
  timestamp: number;
}

// Global cache with 5-minute TTL
const pageCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Generate cache key from filters and pagination
const getCacheKey = (page: number, pageSize: number, filters: AdminEmpresaFilters): string => {
  return JSON.stringify({ page, pageSize, filters });
};

// Check if cache entry is valid
const isCacheValid = (entry: CacheEntry | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

// Clear cache (for manual refresh)
export const clearEmpresasCache = () => {
  pageCache.clear();
};

// Minimal columns for fast list loading
const LIST_COLUMNS = `
  id,
  cnpj,
  razao_social,
  nome_fantasia,
  uf,
  municipio,
  sit_cadastral,
  categoria_id,
  tags,
  email,
  correio_eletronico,
  ddd_telefone_1,
  ddd_telefone_2
`;

// Check if any filter is active
const hasActiveFilters = (filters: AdminEmpresaFilters): boolean => {
  return !!(
    filters.search ||
    filters.uf ||
    filters.sit_cadastral ||
    filters.categoria_id ||
    (filters.tag_ids && filters.tag_ids.length > 0) ||
    filters.tem_email ||
    filters.tem_telefone ||
    filters.tem_socios ||
    filters.busca_socio ||
    filters.municipio ||
    filters.cnae ||
    filters.porte ||
    filters.simples ||
    filters.mei ||
    filters.matriz_filial ||
    filters.data_abertura_inicio ||
    filters.data_abertura_fim
  );
};

export const useAdminEmpresas = (
  page: number,
  pageSize: number,
  filters: AdminEmpresaFilters
): UseAdminEmpresasResult => {
  const [empresas, setEmpresas] = useState<Partial<Empresa>[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEmpresas = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    const cacheKey = getCacheKey(page, pageSize, filters);
    const cachedEntry = pageCache.get(cacheKey);
    
    if (!forceRefresh && isCacheValid(cachedEntry)) {
      setEmpresas(cachedEntry!.data);
      setTotalCount(cachedEntry!.count);
      setLoading(false);
      setIsCached(true);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setIsCached(false);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Always use estimated count to avoid timeouts on 2.4M+ rows
      // Build query with only needed columns for performance
      let query = supabase
        .from('empresas')
        .select(LIST_COLUMNS, { count: 'estimated' });

      // Apply filters only when they have values
      if (filters.search) {
        const searchTerm = filters.search.trim();
        const digitsOnly = searchTerm.replace(/\D/g, '');
        
        // If input is mostly digits (likely a CNPJ), search by CNPJ
        const isLikelyCnpj = digitsOnly.length >= 3 && (digitsOnly.length / searchTerm.length) > 0.5;
        
        if (isLikelyCnpj) {
          if (digitsOnly.length >= 14) {
            query = query.eq('cnpj', digitsOnly.substring(0, 14));
          } else {
            query = query.ilike('cnpj', `${digitsOnly}%`);
          }
        } else {
          // Text search on razao_social and nome_fantasia
          query = query.or(`razao_social.ilike.%${searchTerm}%,nome_fantasia.ilike.%${searchTerm}%`);
        }
      }

      if (filters.uf) {
        query = query.eq('uf', filters.uf);
      }

      if (filters.municipio) {
        query = query.ilike('municipio', `%${filters.municipio}%`);
      }

      if (filters.sit_cadastral) {
        query = query.eq('sit_cadastral', filters.sit_cadastral);
      }

      if (filters.categoria_id) {
        query = query.eq('categoria_id', filters.categoria_id);
      }

      if (filters.tag_ids && filters.tag_ids.length > 0) {
        query = query.overlaps('tags', filters.tag_ids);
      }

      if (filters.cnae) {
        query = query.or(`cnae_codigo.ilike.${filters.cnae}%,cnae_fiscal.ilike.%${filters.cnae}%`);
      }

      if (filters.porte) {
        query = query.eq('porte_empresa', filters.porte);
      }

      if (filters.simples) {
        query = query.eq('opcao_simples', filters.simples);
      }

      if (filters.mei) {
        query = query.eq('opcao_mei', filters.mei);
      }

      if (filters.matriz_filial) {
        query = query.eq('matriz_filial', filters.matriz_filial);
      }

      if (filters.data_abertura_inicio) {
        query = query.gte('data_inicio_atividade', filters.data_abertura_inicio);
      }

      if (filters.data_abertura_fim) {
        query = query.lte('data_inicio_atividade', filters.data_abertura_fim);
      }

      if (filters.tem_email === 'sim') {
        query = query.or('email.neq.null,correio_eletronico.neq.null');
      } else if (filters.tem_email === 'nao') {
        query = query.is('email', null).is('correio_eletronico', null);
      }

      if (filters.tem_telefone === 'sim') {
        query = query.or('ddd_telefone_1.neq.null,ddd_telefone_2.neq.null');
      } else if (filters.tem_telefone === 'nao') {
        query = query.is('ddd_telefone_1', null).is('ddd_telefone_2', null);
      }

      if (filters.tem_socios === 'sim') {
        query = query.not('socios', 'is', null);
      } else if (filters.tem_socios === 'nao') {
        query = query.is('socios', null);
      }

      if (filters.busca_socio) {
        query = query.ilike('socios', `%${filters.busca_socio}%`);
      }

      // Execute query with pagination
      const { data, count, error: queryError } = await query
        .order('id', { ascending: true })
        .range(from, to);

      if (queryError) {
        console.error('Error fetching empresas:', queryError);
        setError(queryError.message);
        setEmpresas([]);
        setTotalCount(0);
        return;
      }

      setEmpresas(data || []);
      
      // Set total count - use the returned count (estimated or exact)
      setTotalCount(count || 0);

      // Store in cache
      pageCache.set(cacheKey, {
        data: data || [],
        count: count || 0,
        timestamp: Date.now(),
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching empresas:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchEmpresas();
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEmpresas]);

  return {
    empresas,
    loading,
    totalCount,
    error,
    refetch: () => fetchEmpresas(true), // Force refresh bypasses cache
    isCached,
  };
};

// Hook for total count only (for dashboard) - uses fast estimate
export const useEmpresasCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Use head request for faster count
        const { count: totalCount, error } = await supabase
          .from('empresas')
          .select('id', { count: 'exact', head: true });
        
        if (error) {
          console.error('Error fetching count:', error);
          setCount(2400000); // Fallback estimate
        } else {
          setCount(totalCount || 0);
        }
      } catch (err) {
        console.error('Error fetching count:', err);
        setCount(2400000); // Fallback estimate
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, []);

  return { count, loading };
};
