import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empresa } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { ParseError, ErrorType } from '@/lib/empresaParser';
import { MUNICIPIOS_BRASIL } from '@/data/municipiosBrasil';
import { notifyEmpresasCatalogUpdated, subscribeEmpresasCatalogUpdated } from '@/lib/empresasCatalogSync';

export interface ImportError extends ParseError {
  cnpj?: string;
}

export interface ImportReport {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface EmpresaFilters {
  search?: string;
  uf?: string;
  sitCadastral?: string;
  porte?: string;
  municipio?: string;
  cnae?: string;
  simples?: string;
  mei?: string;
  matrizFilial?: string;
  categoriaId?: string;
  tags?: string[];
  dataAberturaInicio?: string;
  dataAberturaFim?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasSocios?: boolean;
  socioName?: string;
}

interface DbEmpresa {
  id: number;
  cnpj: string;
  matriz_filial: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  sit_cadastral: string | null;
  data_sit_cadastral: string | null;
  motivo_sit_cadastral: string | null;
  nome_cidade_exterior: string | null;
  cod_pais: string | null;
  nome_pais: string | null;
  cod_natureza_juridica: string | null;
  data_inicio_atividade: string | null;
  cnae_fiscal: string | null;
  cnae_codigo: string | null;
  desc_tipo_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  cod_municipio: string | null;
  municipio: string | null;
  ddd_telefone_1: string | null;
  telefone1_celular: boolean | null;
  ddd_telefone_2: string | null;
  telefone2_celular: boolean | null;
  ddd_fax: string | null;
  correio_eletronico: string | null;
  email: string | null;
  qualif_responsavel: string | null;
  capital_social_empresa: number | null;
  porte_empresa: string | null;
  opcao_simples: string | null;
  data_opcao_simples: string | null;
  data_exclusao_simples: string | null;
  opcao_mei: string | null;
  sit_especial: string | null;
  data_sit_especial: string | null;
  socios: string | null;
  socios_raw: string | null;
  cnaes_secundarios: string | null;
  categoria_id: string | null;
  tags: string[] | null;
}

const dbToEmpresa = (db: DbEmpresa): Empresa => ({
  id: db.id,
  cnpj: db.cnpj,
  matriz_filial: db.matriz_filial,
  razao_social: db.razao_social,
  nome_fantasia: db.nome_fantasia,
  sit_cadastral: db.sit_cadastral,
  data_sit_cadastral: db.data_sit_cadastral ? new Date(db.data_sit_cadastral) : null,
  motivo_sit_cadastral: db.motivo_sit_cadastral,
  nome_cidade_exterior: db.nome_cidade_exterior,
  cod_pais: db.cod_pais,
  nome_pais: db.nome_pais,
  cod_natureza_juridica: db.cod_natureza_juridica,
  data_inicio_atividade: db.data_inicio_atividade ? new Date(db.data_inicio_atividade) : null,
  cnae_fiscal: db.cnae_fiscal,
  cnae_codigo: db.cnae_codigo,
  desc_tipo_logradouro: db.desc_tipo_logradouro,
  logradouro: db.logradouro,
  numero: db.numero,
  complemento: db.complemento,
  bairro: db.bairro,
  cep: db.cep,
  uf: db.uf,
  cod_municipio: db.cod_municipio,
  municipio: db.municipio,
  ddd_telefone_1: db.ddd_telefone_1,
  telefone1_celular: db.telefone1_celular,
  ddd_telefone_2: db.ddd_telefone_2,
  telefone2_celular: db.telefone2_celular,
  ddd_fax: db.ddd_fax,
  correio_eletronico: db.correio_eletronico,
  email: db.email,
  qualif_responsavel: db.qualif_responsavel,
  capital_social_empresa: db.capital_social_empresa,
  porte_empresa: db.porte_empresa,
  opcao_simples: db.opcao_simples,
  data_opcao_simples: db.data_opcao_simples ? new Date(db.data_opcao_simples) : null,
  data_exclusao_simples: db.data_exclusao_simples ? new Date(db.data_exclusao_simples) : null,
  opcao_mei: db.opcao_mei,
  sit_especial: db.sit_especial,
  data_sit_especial: db.data_sit_especial ? new Date(db.data_sit_especial) : null,
  socios: db.socios,
  socios_raw: db.socios_raw,
  cnaes_secundarios: db.cnaes_secundarios,
  categoria_id: db.categoria_id,
  tags: db.tags || [],
});

const empresaToDb = (empresa: Partial<Empresa>): Partial<DbEmpresa> => {
  const db: Record<string, unknown> = {};
  
  if (empresa.cnpj !== undefined) db.cnpj = empresa.cnpj;
  if (empresa.matriz_filial !== undefined) db.matriz_filial = empresa.matriz_filial;
  if (empresa.razao_social !== undefined) db.razao_social = empresa.razao_social;
  if (empresa.nome_fantasia !== undefined) db.nome_fantasia = empresa.nome_fantasia;
  if (empresa.sit_cadastral !== undefined) db.sit_cadastral = empresa.sit_cadastral;
  if (empresa.data_sit_cadastral !== undefined) db.data_sit_cadastral = empresa.data_sit_cadastral?.toISOString().split('T')[0] || null;
  if (empresa.motivo_sit_cadastral !== undefined) db.motivo_sit_cadastral = empresa.motivo_sit_cadastral;
  if (empresa.nome_cidade_exterior !== undefined) db.nome_cidade_exterior = empresa.nome_cidade_exterior;
  if (empresa.cod_pais !== undefined) db.cod_pais = empresa.cod_pais;
  if (empresa.nome_pais !== undefined) db.nome_pais = empresa.nome_pais;
  if (empresa.cod_natureza_juridica !== undefined) db.cod_natureza_juridica = empresa.cod_natureza_juridica;
  if (empresa.data_inicio_atividade !== undefined) db.data_inicio_atividade = empresa.data_inicio_atividade?.toISOString().split('T')[0] || null;
  if (empresa.cnae_fiscal !== undefined) db.cnae_fiscal = empresa.cnae_fiscal;
  if (empresa.cnae_codigo !== undefined) {
    const digits = String(empresa.cnae_codigo).replace(/\D/g, '');
    db.cnae_codigo = digits.padStart(7, '0');
  }
  if (empresa.desc_tipo_logradouro !== undefined) db.desc_tipo_logradouro = empresa.desc_tipo_logradouro;
  if (empresa.logradouro !== undefined) db.logradouro = empresa.logradouro;
  if (empresa.numero !== undefined) db.numero = empresa.numero;
  if (empresa.complemento !== undefined) db.complemento = empresa.complemento;
  if (empresa.bairro !== undefined) db.bairro = empresa.bairro;
  if (empresa.cep !== undefined) db.cep = empresa.cep;
  if (empresa.uf !== undefined) db.uf = empresa.uf;
  if (empresa.cod_municipio !== undefined) db.cod_municipio = empresa.cod_municipio;
  if (empresa.municipio !== undefined) db.municipio = empresa.municipio;
  if (empresa.ddd_telefone_1 !== undefined) db.ddd_telefone_1 = empresa.ddd_telefone_1;
  if (empresa.telefone1_celular !== undefined) db.telefone1_celular = empresa.telefone1_celular;
  if (empresa.ddd_telefone_2 !== undefined) db.ddd_telefone_2 = empresa.ddd_telefone_2;
  if (empresa.telefone2_celular !== undefined) db.telefone2_celular = empresa.telefone2_celular;
  if (empresa.ddd_fax !== undefined) db.ddd_fax = empresa.ddd_fax;
  if (empresa.correio_eletronico !== undefined) db.correio_eletronico = empresa.correio_eletronico;
  if (empresa.email !== undefined) db.email = empresa.email;
  if (empresa.qualif_responsavel !== undefined) db.qualif_responsavel = empresa.qualif_responsavel;
  if (empresa.capital_social_empresa !== undefined) db.capital_social_empresa = empresa.capital_social_empresa;
  if (empresa.porte_empresa !== undefined) db.porte_empresa = empresa.porte_empresa;
  if (empresa.opcao_simples !== undefined) db.opcao_simples = empresa.opcao_simples;
  if (empresa.data_opcao_simples !== undefined) db.data_opcao_simples = empresa.data_opcao_simples?.toISOString().split('T')[0] || null;
  if (empresa.data_exclusao_simples !== undefined) db.data_exclusao_simples = empresa.data_exclusao_simples?.toISOString().split('T')[0] || null;
  if (empresa.opcao_mei !== undefined) db.opcao_mei = empresa.opcao_mei;
  if (empresa.sit_especial !== undefined) db.sit_especial = empresa.sit_especial;
  if (empresa.data_sit_especial !== undefined) db.data_sit_especial = empresa.data_sit_especial?.toISOString().split('T')[0] || null;
  if (empresa.socios !== undefined) db.socios = empresa.socios;
  if (empresa.socios_raw !== undefined) db.socios_raw = empresa.socios_raw;
  if (empresa.cnaes_secundarios !== undefined) db.cnaes_secundarios = empresa.cnaes_secundarios;
  if (empresa.categoria_id !== undefined) db.categoria_id = empresa.categoria_id;
  if (empresa.tags !== undefined) db.tags = empresa.tags;
  
  return db as Partial<DbEmpresa>;
};

export interface ImportProgress {
  total: number;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  isComplete: boolean;
  startTime: number;
  estimatedTimeRemaining: number | null;
}

export interface PaginatedResult {
  empresas: Empresa[];
  totalCount: number;
  loading: boolean;
}

// Interface for public view data (excludes sensitive fields)
interface DbEmpresaPublic {
  id: number;
  uf: string | null;
  municipio: string | null;
  cod_municipio: string | null;
  sit_cadastral: string | null;
  data_sit_cadastral: string | null;
  motivo_sit_cadastral: string | null;
  cnae_fiscal: string | null;
  cnae_codigo: string | null;
  cnaes_secundarios: string | null;
  porte_empresa: string | null;
  opcao_simples: string | null;
  data_opcao_simples: string | null;
  data_exclusao_simples: string | null;
  opcao_mei: string | null;
  matriz_filial: string | null;
  data_inicio_atividade: string | null;
  sit_especial: string | null;
  data_sit_especial: string | null;
  cod_natureza_juridica: string | null;
  capital_social_empresa: number | null;
  cod_pais: string | null;
  nome_pais: string | null;
  nome_cidade_exterior: string | null;
  qualif_responsavel: string | null;
  categoria_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  has_email: boolean;
  has_phone: boolean;
  has_socios: boolean;
}

// Interface for RPC function result
interface DbEmpresaPublicRpc {
  id: number;
  matriz_filial: string | null;
  sit_cadastral: string | null;
  data_sit_cadastral: string | null;
  motivo_sit_cadastral: string | null;
  nome_cidade_exterior: string | null;
  cod_pais: string | null;
  nome_pais: string | null;
  cod_natureza_juridica: string | null;
  data_inicio_atividade: string | null;
  cnae_fiscal: string | null;
  cnae_codigo: string | null;
  uf: string | null;
  cod_municipio: string | null;
  municipio: string | null;
  porte_empresa: string | null;
  opcao_simples: string | null;
  data_opcao_simples: string | null;
  data_exclusao_simples: string | null;
  opcao_mei: string | null;
  sit_especial: string | null;
  data_sit_especial: string | null;
  cnaes_secundarios: string | null;
  categoria_id: string | null;
  tags: string[] | null;
  capital_social_empresa: number | null;
  qualif_responsavel: string | null;
  created_at: string;
  updated_at: string;
  has_email: boolean;
  has_phone: boolean;
  has_socios: boolean;
  total_count: number;
}

// Convert public view data to partial Empresa (without sensitive fields)
const dbPublicToEmpresa = (db: DbEmpresaPublic): Partial<Empresa> => ({
  id: db.id,
  uf: db.uf,
  municipio: db.municipio,
  cod_municipio: db.cod_municipio,
  sit_cadastral: db.sit_cadastral,
  data_sit_cadastral: db.data_sit_cadastral ? new Date(db.data_sit_cadastral) : null,
  motivo_sit_cadastral: db.motivo_sit_cadastral,
  cnae_fiscal: db.cnae_fiscal,
  cnae_codigo: db.cnae_codigo,
  cnaes_secundarios: db.cnaes_secundarios,
  porte_empresa: db.porte_empresa,
  opcao_simples: db.opcao_simples,
  data_opcao_simples: db.data_opcao_simples ? new Date(db.data_opcao_simples) : null,
  data_exclusao_simples: db.data_exclusao_simples ? new Date(db.data_exclusao_simples) : null,
  opcao_mei: db.opcao_mei,
  matriz_filial: db.matriz_filial,
  data_inicio_atividade: db.data_inicio_atividade ? new Date(db.data_inicio_atividade) : null,
  sit_especial: db.sit_especial,
  data_sit_especial: db.data_sit_especial ? new Date(db.data_sit_especial) : null,
  cod_natureza_juridica: db.cod_natureza_juridica,
  capital_social_empresa: db.capital_social_empresa,
  cod_pais: db.cod_pais,
  nome_pais: db.nome_pais,
  nome_cidade_exterior: db.nome_cidade_exterior,
  qualif_responsavel: db.qualif_responsavel,
  categoria_id: db.categoria_id,
  tags: db.tags || [],
  // Mark that this is from public view (sensitive data hidden)
  cnpj: '**.***/****-**', // Masked
  razao_social: 'Empresa #' + db.id, // Masked
  nome_fantasia: null,
  email: db.has_email ? '[Email disponível após desbloqueio]' : null,
  correio_eletronico: null,
  ddd_telefone_1: db.has_phone ? '[Telefone disponível após desbloqueio]' : null,
  ddd_telefone_2: null,
  ddd_fax: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cep: null,
  socios: db.has_socios ? '[Sócios disponíveis após desbloqueio]' : null,
  socios_raw: null,
});

// Convert RPC result to partial Empresa (without sensitive fields)
const dbPublicRpcToEmpresa = (db: DbEmpresaPublicRpc): Partial<Empresa> => ({
  id: db.id,
  uf: db.uf,
  municipio: db.municipio,
  cod_municipio: db.cod_municipio,
  sit_cadastral: db.sit_cadastral,
  data_sit_cadastral: db.data_sit_cadastral ? new Date(db.data_sit_cadastral) : null,
  motivo_sit_cadastral: db.motivo_sit_cadastral,
  cnae_fiscal: db.cnae_fiscal,
  cnae_codigo: db.cnae_codigo,
  cnaes_secundarios: db.cnaes_secundarios,
  porte_empresa: db.porte_empresa,
  opcao_simples: db.opcao_simples,
  data_opcao_simples: db.data_opcao_simples ? new Date(db.data_opcao_simples) : null,
  data_exclusao_simples: db.data_exclusao_simples ? new Date(db.data_exclusao_simples) : null,
  opcao_mei: db.opcao_mei,
  matriz_filial: db.matriz_filial,
  data_inicio_atividade: db.data_inicio_atividade ? new Date(db.data_inicio_atividade) : null,
  sit_especial: db.sit_especial,
  data_sit_especial: db.data_sit_especial ? new Date(db.data_sit_especial) : null,
  cod_natureza_juridica: db.cod_natureza_juridica,
  capital_social_empresa: db.capital_social_empresa,
  cod_pais: db.cod_pais,
  nome_pais: db.nome_pais,
  nome_cidade_exterior: db.nome_cidade_exterior,
  qualif_responsavel: db.qualif_responsavel,
  categoria_id: db.categoria_id,
  tags: db.tags || [],
  // Mark that this is from RPC (sensitive data hidden)
  cnpj: '**.***/****-**', // Masked
  razao_social: 'Empresa #' + db.id, // Masked
  nome_fantasia: null,
  email: db.has_email ? '[Email disponível após desbloqueio]' : null,
  correio_eletronico: null,
  ddd_telefone_1: db.has_phone ? '[Telefone disponível após desbloqueio]' : null,
  ddd_telefone_2: null,
  ddd_fax: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cep: null,
  socios: db.has_socios ? '[Sócios disponíveis após desbloqueio]' : null,
  socios_raw: null,
});

// Hook for paginated search with server-side filtering - uses public view for security
export const useEmpresasPaginated = (
  page: number,
  pageSize: number,
  filters: EmpresaFilters
) => {
  const [empresas, setEmpresas] = useState<Partial<Empresa>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTimeout, setIsTimeout] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout>();
  // Track if we've done an initial fetch to avoid showing loading on dialog close
  const hasFetchedRef = useRef(false);

  // Stabilize user ID to avoid re-fetching when user object reference changes
  const userId = user?.id;

  // Serialize filters to a stable string to avoid re-fetching on object reference changes
  const filtersKey = JSON.stringify(filters);

  const fetchPaginated = useCallback(async () => {
    if (!userId) {
      setEmpresas([]);
      setLoading(false);
      return;
    }

    const startTime = performance.now();
    const parsedFilters: EmpresaFilters = JSON.parse(filtersKey);
    
    try {
      setLoading(true);
      setIsTimeout(false);

      // Always use the optimized RPC for listing (avoids PostgREST `.or()` pitfalls and is faster on large datasets)
      const { data, error } = await supabase.rpc('get_empresas_public', {
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
        p_uf: parsedFilters.uf || null,
        p_municipio: parsedFilters.municipio || null,
        p_sit_cadastral: parsedFilters.sitCadastral || null,
        p_porte: parsedFilters.porte || null,
        p_cnae: parsedFilters.cnae || null,
        p_simples: parsedFilters.simples || null,
        p_mei: parsedFilters.mei || null,
        p_matriz_filial: parsedFilters.matrizFilial || null,
        p_categoria_id: parsedFilters.categoriaId || null,
        p_has_email: parsedFilters.hasEmail || null,
        p_has_phone: parsedFilters.hasPhone || null,
        p_has_socios: parsedFilters.hasSocios || null,
        p_data_abertura_inicio: parsedFilters.dataAberturaInicio || null,
        p_data_abertura_fim: parsedFilters.dataAberturaFim || null,
        p_tags: parsedFilters.tags && parsedFilters.tags.length > 0 ? parsedFilters.tags : null,
        p_busca_socio: parsedFilters.socioName || null,
        p_search: parsedFilters.search || null,
      });

      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);

      if (error) throw error;

      let resultsCount = 0;
      if (data && data.length > 0) {
        resultsCount = data[0].total_count;
        setTotalCount(Number(resultsCount) || 0);
        setEmpresas(data.map((row: DbEmpresaPublicRpc) => dbPublicRpcToEmpresa(row)));
      } else {
        setEmpresas([]);
        setTotalCount(0);
      }

      // Log performance metrics via RPC to ensure security and proper pathing
      supabase.rpc('log_search_performance', {
        p_search_type: 'cnae_search_paginated',
        p_filters: parsedFilters as any,
        p_execution_time_ms: executionTime,
        p_results_count: resultsCount,
        p_user_id: userId
      }).then(({ error: logError }) => {
        if (logError) console.error('Error saving performance log:', logError);
      });

      hasFetchedRef.current = true;
    } catch (error: any) {
      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);
      
      console.error('Error fetching empresas:', error);

      // Log error performance metrics via RPC
      supabase.rpc('log_search_performance', {
        p_search_type: 'cnae_search_paginated',
        p_filters: parsedFilters as any,
        p_execution_time_ms: executionTime,
        p_results_count: 0,
        p_error_message: error.message || 'Unknown error',
        p_user_id: userId
      }).then(({ error: logError }) => {
        if (logError) console.error('Error saving performance log:', logError);
      });
      
      const isTimeoutError = error?.message?.includes('timeout') || 
                             error?.code === '57014' || 
                             error?.message?.includes('statement timeout');
      
      if (isTimeoutError) {
        setIsTimeout(true);
      } else {
        const message =
          typeof error === 'object' && error && 'message' in error
            ? String((error as { message?: unknown }).message)
            : 'Erro ao carregar empresas';
        toast.error(message || 'Erro ao carregar empresas');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, page, pageSize, filtersKey]);

  // Debounce filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchPaginated();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchPaginated]);

  useEffect(() => {
    return subscribeEmpresasCatalogUpdated(() => {
      void fetchPaginated();
    });
  }, [fetchPaginated]);

  return {
    empresas,
    loading,
    isTimeout,
    totalCount,
    refetch: fetchPaginated,
  };
};

// Interface for municipality with UF
export interface MunicipioWithUf {
  nome: string;
  uf: string;
  contagem?: number;
}

export interface CNAEOption {
  valor: string;
  contagem: number;
}

// Hook for getting filter options (municipalities, CNAEs, UFs) - uses RPC function for all users
// Municipalities are merged with the full IBGE list (5.570) so users can pick any city,
// not only those that already have registered companies.
export const useEmpresasFilterOptions = () => {
  const [municipios, setMunicipios] = useState<MunicipioWithUf[]>([]);
  const [cnaes, setCnaes] = useState<CNAEOption[]>([]);
  const [ufs, setUfs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const userId = user?.id;

  const fetchOptions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use RPC function that uses materialized view for fast response
      const { data, error } = await supabase.rpc('get_filter_options');

      if (error) {
        console.error('Error fetching filter options:', error);
        setLoading(false);
        return;
      }

      // Always seed with the full IBGE municipalities list (5.570) so every Brazilian city
      // is available regardless of whether companies have been imported for it yet.
      const baseMunicipios: MunicipioWithUf[] = MUNICIPIOS_BRASIL.map(m => ({
        nome: m.nome,
        uf: m.uf,
      }));
      const baseUfs = Array.from(new Set(MUNICIPIOS_BRASIL.map(m => m.uf)));

      if (data) {
        const cnaeValues = data
          .filter((row: any) => row.tipo === 'cnae')
          .map((row: any) => ({
            valor: row.valor,
            contagem: Number(row.contagem)
          }))
          .filter((c: CNAEOption) => c.valor);

        // Merge DB municipalities (covers any custom names not in IBGE) with the full list
        const dbMunicipios: MunicipioWithUf[] = data
          .filter((row: any) => row.tipo === 'municipio')
          .map((row: any) => ({
            nome: row.valor,
            uf: row.uf || '',
            contagem: Number(row.contagem)
          }))
          .filter((m: MunicipioWithUf) => m.nome);

        const ufValues = data
          .filter((row: any) => row.tipo === 'uf')
          .map((row: any) => row.valor)
          .filter(Boolean);

        // Deduplicate and sort CNAEs by count (desc) then value
        const uniqueCnaes: CNAEOption[] = [];
        const seenCnaes = new Set();
        cnaeValues.forEach((c: CNAEOption) => {
          if (!seenCnaes.has(c.valor)) {
            uniqueCnaes.push(c);
            seenCnaes.add(c.valor);
          }
        });
        setCnaes(uniqueCnaes.sort((a, b) => b.contagem - a.contagem || a.valor.localeCompare(b.valor)));

        // Deduplicate by nome+uf (IBGE list first, then any extras from DB)
        const merged = [...baseMunicipios, ...dbMunicipios];
        const seen = new Set<string>();
        const uniqueMunicipios = merged.filter(m => {
          const key = `${m.nome}|${m.uf}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setMunicipios(uniqueMunicipios.sort((a, b) => a.nome.localeCompare(b.nome)));

        setUfs([...new Set([...baseUfs, ...(ufValues as string[])])].sort());
      } else {
        setMunicipios(baseMunicipios.sort((a, b) => a.nome.localeCompare(b.nome)));
        setUfs(baseUfs.sort());
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchOptions();

    return subscribeEmpresasCatalogUpdated(() => {
      void fetchOptions();
    });
  }, [fetchOptions]);

  return { municipios, cnaes, ufs, loading, refetch: fetchOptions };
};

// Function to refresh filter options (call after import)
export const refreshFilterOptions = async () => {
  try {
    const { error } = await supabase.rpc('refresh_filter_options');
    if (error) {
      console.error('Error refreshing filter options:', error);
      return;
    }

    notifyEmpresasCatalogUpdated();
  } catch (error) {
    console.error('Error refreshing filter options:', error);
  }
};

// Original hook for admin operations (full data loading)
export const useEmpresas = (options?: { autoFetch?: boolean }) => {
  const autoFetch = options?.autoFetch ?? true;
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const { user } = useAuth();

  // Fetch all empresas with pagination to bypass 1000 limit
  const fetchEmpresas = useCallback(async () => {
    try {
      setLoading(true);
      
      // First get total count
      const { count, error: countError } = await supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch in batches of 1000 to bypass the limit
      const PAGE_SIZE = 1000;
      const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
      const allEmpresas: Empresa[] = [];

      for (let page = 0; page < totalPages; page++) {
        const { data, error } = await supabase
          .from('empresas')
          .select('*')
          .order('id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;
        if (data) {
          allEmpresas.push(...data.map(dbToEmpresa));
        }
      }

      setEmpresas(allEmpresas);
    } catch (error) {
      console.error('Error fetching empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!autoFetch) {
      // Import screens don't need to prefetch the full empresas table.
      setLoading(false);
      return;
    }
    fetchEmpresas();
  }, [user, autoFetch, fetchEmpresas]);

  const normalizeCnpj = (cnpj: string): string => {
    return cnpj.replace(/\D/g, '').padStart(14, '0');
  };

  const normalizeCnae = (cnae: string): string => {
    if (!cnae) return '';
    const digits = cnae.replace(/\D/g, '');
    return digits.padStart(7, '0');
  };

  const getEmpresaByCnpj = useCallback((cnpj: string): Empresa | undefined => {
    const normalized = normalizeCnpj(cnpj);
    return empresas.find(e => normalizeCnpj(e.cnpj) === normalized);
  }, [empresas]);

  const getEmpresaById = useCallback((id: number): Empresa | undefined => {
    return empresas.find(e => e.id === id);
  }, [empresas]);

  // Batch import with progress tracking - uses upsert for efficient duplicate handling
  const addEmpresas = useCallback(async (
    newEmpresas: Empresa[], 
    handleDuplicates: 'update' | 'skip',
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportReport> => {
    const report: ImportReport = {
      total: newEmpresas.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    const startTime = Date.now();
    const progress: ImportProgress = {
      total: newEmpresas.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      isComplete: false,
      startTime,
      estimatedTimeRemaining: null
    };

    setImportProgress(progress);
    onProgress?.(progress);

    // Let the UI paint the progress card before heavy work starts (important for large files)
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // Step 1: Remove duplicates within the spreadsheet itself (keep first occurrence)
    const seenCnpjs = new Set<string>();
    const uniqueEmpresas: Empresa[] = [];
    let duplicatesInFile = 0;

    for (const empresa of newEmpresas) {
      if (!empresa.cnpj) {
        report.errors.push({ 
          row: uniqueEmpresas.length + duplicatesInFile + 1, 
          message: 'CNPJ obrigatório',
          errorType: 'missing_required',
          field: 'cnpj',
          fieldLabel: 'CNPJ'
        });
        progress.errors++;
        duplicatesInFile++;
        continue;
      }

      const normalizedCnpj = normalizeCnpj(empresa.cnpj);
      
      if (seenCnpjs.has(normalizedCnpj)) {
        // Duplicate within the same file - skip
        duplicatesInFile++;
        report.skipped++;
        progress.skipped++;
        continue;
      }

      seenCnpjs.add(normalizedCnpj);
      uniqueEmpresas.push({ ...empresa, cnpj: normalizedCnpj });
    }

    progress.processed = duplicatesInFile;
    setImportProgress({ ...progress });
    onProgress?.({ ...progress });

    if (uniqueEmpresas.length === 0) {
      progress.isComplete = true;
      progress.estimatedTimeRemaining = 0;
      setImportProgress({ ...progress });
      onProgress?.({ ...progress });
      return report;
    }

    const BATCH_SIZE = 100;
    const batches: Empresa[][] = [];
    
    for (let i = 0; i < uniqueEmpresas.length; i += BATCH_SIZE) {
      batches.push(uniqueEmpresas.slice(i, i + BATCH_SIZE));
    }

    // Step 2: Process batches
    for (const batch of batches) {
      if (handleDuplicates === 'update') {
        // Use upsert - will insert new and update existing based on CNPJ
        const dataToUpsert = batch.map(empresa => empresaToDb(empresa));
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: upsertedData, error } = await supabase
          .from('empresas')
          .upsert(dataToUpsert as any, { 
            onConflict: 'cnpj',
            ignoreDuplicates: false 
          })
          .select('id, cnpj');

        if (error) {
          console.error('Upsert error:', error);
          report.errors.push({ 
            row: progress.processed + 1, 
            message: `Erro ao processar lote: ${error.message}`,
            errorType: 'database_error'
          });
          progress.errors += batch.length;
        } else {
          // Upsert doesn't tell us which were inserts vs updates
          // We count all as "inserted/updated"
          report.inserted += batch.length;
          progress.inserted += batch.length;
        }
      } else {
        // Skip mode - insert only NEW records, ignore duplicates at DB-level (no huge GET ?in=... URLs)
        const dataToUpsert = batch.map((empresa) => empresaToDb(empresa));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: insertedRows, error } = await supabase
          .from('empresas')
          .upsert(dataToUpsert as any, {
            onConflict: 'cnpj',
            ignoreDuplicates: true,
          })
          .select('cnpj');

        if (error) {
          console.error('Insert/ignore-duplicates error:', error);
          report.errors.push({
            row: progress.processed + 1,
            message: `Erro ao inserir lote: ${error.message}`,
            errorType: 'database_error',
          });
          progress.errors += batch.length;
        } else {
          const insertedCount = insertedRows?.length || 0;
          const skippedCount = batch.length - insertedCount;

          report.inserted += insertedCount;
          progress.inserted += insertedCount;

          report.skipped += skippedCount;
          progress.skipped += skippedCount;
        }
      }

      progress.processed += batch.length;
      
      // Calculate estimated time remaining
      const elapsedTime = Date.now() - startTime;
      const averageTimePerItem = elapsedTime / progress.processed;
      const remainingItems = progress.total - progress.processed;
      progress.estimatedTimeRemaining = Math.round(averageTimePerItem * remainingItems);
      
      setImportProgress({ ...progress });
      onProgress?.({ ...progress });
    }

    progress.isComplete = true;
    progress.estimatedTimeRemaining = 0;
    setImportProgress({ ...progress });
    onProgress?.({ ...progress });

    // Refresh the filter options and notify the search screen automatically
    await refreshFilterOptions();

    // Refresh the list in background
    if (autoFetch) {
      fetchEmpresas();
    }
    return report;
  }, [fetchEmpresas, autoFetch]);

  const updateEmpresa = useCallback(async (id: number, data: Partial<Empresa>) => {
    try {
      const dbData = empresaToDb(data);
      const { error } = await supabase
        .from('empresas')
        .update(dbData)
        .eq('id', id);

      if (error) throw error;
      
      setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      toast.success('Empresa atualizada com sucesso');
    } catch (error) {
      console.error('Error updating empresa:', error);
      toast.error('Erro ao atualizar empresa');
    }
  }, []);

  const deleteEmpresa = useCallback(async (id: number) => {
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEmpresas(prev => prev.filter(e => e.id !== id));
      toast.success('Empresa excluída com sucesso');
    } catch (error) {
      console.error('Error deleting empresa:', error);
      toast.error('Erro ao excluir empresa');
    }
  }, []);

  const clearEmpresas = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .neq('id', 0); // Delete all

      if (error) throw error;
      
      setEmpresas([]);
      toast.success('Todas as empresas foram removidas');
    } catch (error) {
      console.error('Error clearing empresas:', error);
      toast.error('Erro ao limpar empresas');
    }
  }, []);

  return {
    empresas,
    loading,
    totalCount,
    importProgress,
    addEmpresas,
    updateEmpresa,
    deleteEmpresa,
    clearEmpresas,
    getEmpresaById,
    getEmpresaByCnpj,
    refetch: fetchEmpresas,
  };
};
