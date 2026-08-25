import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Categoria, Tag, Socio, AuditLog, SavedFilter } from '@/types';

interface CategoriesTagsContextType {
  // Categories
  categorias: Categoria[];
  addCategoria: (nome: string, cor?: string) => Categoria;
  updateCategoria: (id: string, data: Partial<Categoria>) => void;
  deleteCategoria: (id: string) => void;
  getCategoriaById: (id: string) => Categoria | undefined;
  
  // Tags
  tags: Tag[];
  addTag: (nome: string) => Tag;
  updateTag: (id: string, nome: string) => void;
  deleteTag: (id: string) => void;
  getTagById: (id: string) => Tag | undefined;
  
  // Sócios
  socios: Socio[];
  getSociosByEmpresa: (cnpj: string) => Socio[];
  addSocio: (data: Omit<Socio, 'id' | 'updated_at'>) => Socio;
  updateSocio: (id: string, data: Partial<Omit<Socio, 'id'>>) => void;
  deleteSocio: (id: string) => void;
  extractSociosFromRaw: (cnpj: string, sociosRaw: string) => Socio[];
  
  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'data_hora'>) => void;
  getAuditLogsByEmpresa: (cnpj: string) => AuditLog[];
  
  // Saved Filters
  savedFilters: SavedFilter[];
  addSavedFilter: (filter: Omit<SavedFilter, 'id'>) => SavedFilter;
  deleteSavedFilter: (id: string) => void;
  getSavedFiltersByUser: (userId: string, isAdmin: boolean) => SavedFilter[];
}

const CategoriesTagsContext = createContext<CategoriesTagsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  categorias: 'leadbase_categorias',
  tags: 'leadbase_tags',
  socios: 'leadbase_socios',
  auditLogs: 'leadbase_audit_logs',
  savedFilters: 'leadbase_saved_filters',
};

// Default categories
const defaultCategorias: Categoria[] = [
  { id: 'cat-1', nome: 'Tecnologia', cor: '#3B82F6', ativo: true },
  { id: 'cat-2', nome: 'Varejo', cor: '#10B981', ativo: true },
  { id: 'cat-3', nome: 'Serviços', cor: '#F59E0B', ativo: true },
  { id: 'cat-4', nome: 'Indústria', cor: '#8B5CF6', ativo: true },
];

// Default tags
const defaultTags: Tag[] = [
  { id: 'tag-1', nome: 'Cliente Potencial' },
  { id: 'tag-2', nome: 'Alto Valor' },
  { id: 'tag-3', nome: 'Contatado' },
  { id: 'tag-4', nome: 'Negociação' },
];

export const CategoriesTagsProvider = ({ children }: { children: ReactNode }) => {
  const [categorias, setCategorias] = useState<Categoria[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.categorias);
      return stored ? JSON.parse(stored) : defaultCategorias;
    } catch { return defaultCategorias; }
  });
  
  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.tags);
      return stored ? JSON.parse(stored) : defaultTags;
    } catch { return defaultTags; }
  });
  
  const [socios, setSocios] = useState<Socio[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.socios);
      if (stored) {
        return JSON.parse(stored).map((s: any) => ({
          ...s,
          updated_at: new Date(s.updated_at)
        }));
      }
    } catch {}
    return [];
  });
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.auditLogs);
      if (stored) {
        return JSON.parse(stored).map((l: any) => ({
          ...l,
          data_hora: new Date(l.data_hora)
        }));
      }
    } catch {}
    return [];
  });
  
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.savedFilters);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.categorias, JSON.stringify(categorias));
  }, [categorias]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags));
  }, [tags]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.socios, JSON.stringify(socios));
  }, [socios]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(auditLogs));
  }, [auditLogs]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.savedFilters, JSON.stringify(savedFilters));
  }, [savedFilters]);

  // Categories
  const addCategoria = useCallback((nome: string, cor?: string): Categoria => {
    const newCat: Categoria = {
      id: `cat-${Date.now()}`,
      nome,
      cor: cor || null,
      ativo: true,
    };
    setCategorias(prev => [...prev, newCat]);
    return newCat;
  }, []);
  
  const updateCategoria = useCallback((id: string, data: Partial<Categoria>) => {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);
  
  const deleteCategoria = useCallback((id: string) => {
    setCategorias(prev => prev.filter(c => c.id !== id));
  }, []);
  
  const getCategoriaById = useCallback((id: string) => {
    return categorias.find(c => c.id === id);
  }, [categorias]);

  // Tags
  const addTag = useCallback((nome: string): Tag => {
    const newTag: Tag = { id: `tag-${Date.now()}`, nome };
    setTags(prev => [...prev, newTag]);
    return newTag;
  }, []);
  
  const updateTag = useCallback((id: string, nome: string) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, nome } : t));
  }, []);
  
  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const getTagById = useCallback((id: string) => {
    return tags.find(t => t.id === id);
  }, [tags]);

  // Sócios
  const getSociosByEmpresa = useCallback((cnpj: string): Socio[] => {
    const normalized = cnpj.replace(/\D/g, '').padStart(14, '0');
    return socios.filter(s => s.empresa_cnpj === normalized);
  }, [socios]);
  
  const addSocio = useCallback((data: Omit<Socio, 'id' | 'updated_at'>): Socio => {
    const newSocio: Socio = {
      ...data,
      id: `socio-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      updated_at: new Date(),
    };
    setSocios(prev => [...prev, newSocio]);
    return newSocio;
  }, []);
  
  const updateSocio = useCallback((id: string, data: Partial<Omit<Socio, 'id'>>) => {
    setSocios(prev => prev.map(s => s.id === id ? { ...s, ...data, updated_at: new Date() } : s));
  }, []);
  
  const deleteSocio = useCallback((id: string) => {
    setSocios(prev => prev.filter(s => s.id !== id));
  }, []);
  
  const extractSociosFromRaw = useCallback((cnpj: string, sociosRaw: string): Socio[] => {
    if (!sociosRaw) return [];
    
    const normalized = cnpj.replace(/\D/g, '').padStart(14, '0');
    const extracted: Socio[] = [];
    
    // Try different separators
    const separators = [';', ',', '\n', '|'];
    let parts: string[] = [];
    
    for (const sep of separators) {
      if (sociosRaw.includes(sep)) {
        parts = sociosRaw.split(sep).map(p => p.trim()).filter(Boolean);
        break;
      }
    }
    
    if (parts.length === 0 && sociosRaw.trim()) {
      parts = [sociosRaw.trim()];
    }
    
    parts.forEach(part => {
      // Try to extract name and qualification (format: "NAME - QUALIFICATION" or just "NAME")
      const match = part.match(/^(.+?)(?:\s*[-–]\s*(.+))?$/);
      if (match) {
        const nome = match[1].trim();
        const qualificacao = match[2]?.trim() || null;
        
        if (nome.length > 2) {
          extracted.push({
            id: `socio-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            empresa_cnpj: normalized,
            nome_socio: nome,
            qualificacao,
            fonte: 'importado',
            updated_at: new Date(),
          });
        }
      }
    });
    
    // Add to state
    if (extracted.length > 0) {
      setSocios(prev => {
        // Remove existing socios for this empresa first
        const filtered = prev.filter(s => s.empresa_cnpj !== normalized);
        return [...filtered, ...extracted];
      });
    }
    
    return extracted;
  }, []);

  // Audit Logs
  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'data_hora'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}`,
      data_hora: new Date(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, []);
  
  const getAuditLogsByEmpresa = useCallback((cnpj: string): AuditLog[] => {
    const normalized = cnpj.replace(/\D/g, '').padStart(14, '0');
    return auditLogs.filter(l => l.empresa_cnpj === normalized);
  }, [auditLogs]);

  // Saved Filters
  const addSavedFilter = useCallback((filter: Omit<SavedFilter, 'id'>): SavedFilter => {
    const newFilter: SavedFilter = {
      ...filter,
      id: `filter-${Date.now()}`,
    };
    setSavedFilters(prev => [...prev, newFilter]);
    return newFilter;
  }, []);
  
  const deleteSavedFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  }, []);
  
  const getSavedFiltersByUser = useCallback((userId: string, isAdmin: boolean): SavedFilter[] => {
    return savedFilters.filter(f => f.user_id === userId && f.is_admin === isAdmin);
  }, [savedFilters]);

  return (
    <CategoriesTagsContext.Provider value={{
      categorias,
      addCategoria,
      updateCategoria,
      deleteCategoria,
      getCategoriaById,
      tags,
      addTag,
      updateTag,
      deleteTag,
      getTagById,
      socios,
      getSociosByEmpresa,
      addSocio,
      updateSocio,
      deleteSocio,
      extractSociosFromRaw,
      auditLogs,
      addAuditLog,
      getAuditLogsByEmpresa,
      savedFilters,
      addSavedFilter,
      deleteSavedFilter,
      getSavedFiltersByUser,
    }}>
      {children}
    </CategoriesTagsContext.Provider>
  );
};

export const useCategoriesTags = () => {
  const context = useContext(CategoriesTagsContext);
  if (!context) {
    throw new Error('useCategoriesTags must be used within a CategoriesTagsProvider');
  }
  return context;
};
