import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Categoria, Tag, Socio, AuditLog, SavedFilter } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DbCategoria {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface DbTag {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

interface DbSocio {
  id: string;
  empresa_cnpj: string;
  nome_socio: string;
  qualificacao: string | null;
  fonte: string;
  created_at: string;
  updated_at: string;
}

interface DbAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  empresa_cnpj: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbSavedFilter = {
  id: string;
  user_id: string;
  nome: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtros: any;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export const useCategoriesTags = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [categoriasRes, tagsRes, sociosRes, auditLogsRes, filtersRes] = await Promise.all([
        supabase.from('categorias').select('*').order('nome'),
        supabase.from('tags').select('*').order('nome'),
        supabase.from('socios').select('*').order('nome_socio'),
        supabase.from('empresa_audit_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('saved_filters').select('*').order('nome'),
      ]);

      if (categoriasRes.data) {
        setCategorias(categoriasRes.data.map((c: DbCategoria) => ({
          id: c.id,
          nome: c.nome,
          cor: c.cor,
          ativo: c.ativo,
        })));
      }

      if (tagsRes.data) {
        setTags(tagsRes.data.map((t: DbTag) => ({
          id: t.id,
          nome: t.nome,
        })));
      }

      if (sociosRes.data) {
        setSocios(sociosRes.data.map((s: DbSocio) => ({
          id: s.id,
          empresa_cnpj: s.empresa_cnpj,
          nome_socio: s.nome_socio,
          qualificacao: s.qualificacao,
          fonte: s.fonte as 'importado' | 'manual',
          updated_at: new Date(s.updated_at),
        })));
      }

      if (auditLogsRes.data) {
        setAuditLogs(auditLogsRes.data.map((l: DbAuditLog) => ({
          id: l.id,
          admin_id: l.admin_id,
          admin_name: l.admin_name,
          empresa_cnpj: l.empresa_cnpj,
          campo_alterado: l.campo_alterado,
          valor_anterior: l.valor_anterior || '',
          valor_novo: l.valor_novo || '',
          data_hora: new Date(l.created_at),
        })));
      }

      if (filtersRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSavedFilters((filtersRes.data as any[]).map((f) => ({
          id: f.id,
          user_id: f.user_id,
          nome: f.nome,
          filtros: f.filtros as SavedFilter['filtros'],
          is_admin: f.is_admin,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Categories
  const addCategoria = useCallback(async (nome: string, cor?: string): Promise<Categoria | null> => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert({ nome, cor: cor || null, ativo: true })
        .select()
        .single();

      if (error) throw error;

      const newCat: Categoria = {
        id: data.id,
        nome: data.nome,
        cor: data.cor,
        ativo: data.ativo,
      };
      setCategorias(prev => [...prev, newCat]);
      toast.success('Categoria criada com sucesso');
      return newCat;
    } catch (error) {
      console.error('Error adding categoria:', error);
      toast.error('Erro ao criar categoria');
      return null;
    }
  }, []);

  const updateCategoria = useCallback(async (id: string, data: Partial<Categoria>) => {
    try {
      const { error } = await supabase
        .from('categorias')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      toast.success('Categoria atualizada');
    } catch (error) {
      console.error('Error updating categoria:', error);
      toast.error('Erro ao atualizar categoria');
    }
  }, []);

  const deleteCategoria = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategorias(prev => prev.filter(c => c.id !== id));
      toast.success('Categoria excluída');
    } catch (error) {
      console.error('Error deleting categoria:', error);
      toast.error('Erro ao excluir categoria');
    }
  }, []);

  const getCategoriaById = useCallback((id: string) => {
    return categorias.find(c => c.id === id);
  }, [categorias]);

  // Tags
  const addTag = useCallback(async (nome: string): Promise<Tag | null> => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ nome })
        .select()
        .single();

      if (error) throw error;

      const newTag: Tag = { id: data.id, nome: data.nome };
      setTags(prev => [...prev, newTag]);
      toast.success('Tag criada com sucesso');
      return newTag;
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Erro ao criar tag');
      return null;
    }
  }, []);

  const updateTag = useCallback(async (id: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({ nome })
        .eq('id', id);

      if (error) throw error;

      setTags(prev => prev.map(t => t.id === id ? { ...t, nome } : t));
      toast.success('Tag atualizada');
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Erro ao atualizar tag');
    }
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTags(prev => prev.filter(t => t.id !== id));
      toast.success('Tag excluída');
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Erro ao excluir tag');
    }
  }, []);

  const getTagById = useCallback((id: string) => {
    return tags.find(t => t.id === id);
  }, [tags]);

  // Sócios
  const getSociosByEmpresa = useCallback((cnpj: string): Socio[] => {
    const normalized = cnpj.replace(/\D/g, '').padStart(14, '0');
    return socios.filter(s => s.empresa_cnpj === normalized);
  }, [socios]);

  const addSocio = useCallback(async (data: Omit<Socio, 'id' | 'updated_at'>): Promise<Socio | null> => {
    try {
      const { data: result, error } = await supabase
        .from('socios')
        .insert({
          empresa_cnpj: data.empresa_cnpj,
          nome_socio: data.nome_socio,
          qualificacao: data.qualificacao,
          fonte: data.fonte,
        })
        .select()
        .single();

      if (error) throw error;

      const newSocio: Socio = {
        id: result.id,
        empresa_cnpj: result.empresa_cnpj,
        nome_socio: result.nome_socio,
        qualificacao: result.qualificacao,
        fonte: result.fonte as 'importado' | 'manual',
        updated_at: new Date(result.updated_at),
      };
      setSocios(prev => [...prev, newSocio]);
      toast.success('Sócio adicionado');
      return newSocio;
    } catch (error) {
      console.error('Error adding socio:', error);
      toast.error('Erro ao adicionar sócio');
      return null;
    }
  }, []);

  const updateSocio = useCallback(async (id: string, data: Partial<Omit<Socio, 'id'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.nome_socio) updateData.nome_socio = data.nome_socio;
      if (data.qualificacao !== undefined) updateData.qualificacao = data.qualificacao;
      if (data.fonte) updateData.fonte = data.fonte;

      const { error } = await supabase
        .from('socios')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setSocios(prev => prev.map(s => s.id === id ? { ...s, ...data, updated_at: new Date() } : s));
      toast.success('Sócio atualizado');
    } catch (error) {
      console.error('Error updating socio:', error);
      toast.error('Erro ao atualizar sócio');
    }
  }, []);

  const deleteSocio = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('socios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSocios(prev => prev.filter(s => s.id !== id));
      toast.success('Sócio removido');
    } catch (error) {
      console.error('Error deleting socio:', error);
      toast.error('Erro ao remover sócio');
    }
  }, []);

  const extractSociosFromRaw = useCallback(async (cnpj: string, sociosRaw: string): Promise<Socio[]> => {
    if (!sociosRaw) return [];
    
    const normalized = cnpj.replace(/\D/g, '').padStart(14, '0');
    const extracted: { empresa_cnpj: string; nome_socio: string; qualificacao: string | null; fonte: string }[] = [];
    
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
      const match = part.match(/^(.+?)(?:\s*[-–]\s*(.+))?$/);
      if (match) {
        const nome = match[1].trim();
        const qualificacao = match[2]?.trim() || null;
        
        if (nome.length > 2) {
          extracted.push({
            empresa_cnpj: normalized,
            nome_socio: nome,
            qualificacao,
            fonte: 'importado',
          });
        }
      }
    });
    
    if (extracted.length > 0) {
      try {
        // Delete existing socios for this empresa
        await supabase
          .from('socios')
          .delete()
          .eq('empresa_cnpj', normalized);

        // Insert new ones
        const { data, error } = await supabase
          .from('socios')
          .insert(extracted)
          .select();

        if (error) throw error;

        const newSocios = (data || []).map((s: DbSocio) => ({
          id: s.id,
          empresa_cnpj: s.empresa_cnpj,
          nome_socio: s.nome_socio,
          qualificacao: s.qualificacao,
          fonte: s.fonte as 'importado' | 'manual',
          updated_at: new Date(s.updated_at),
        }));

        setSocios(prev => {
          const filtered = prev.filter(s => s.empresa_cnpj !== normalized);
          return [...filtered, ...newSocios];
        });

        return newSocios;
      } catch (error) {
        console.error('Error extracting socios:', error);
        toast.error('Erro ao extrair sócios');
        return [];
      }
    }
    
    return [];
  }, []);

  // Audit Logs
  const addAuditLog = useCallback(async (log: Omit<AuditLog, 'id' | 'data_hora'>) => {
    try {
      const { error } = await supabase
        .from('empresa_audit_logs')
        .insert({
          admin_id: log.admin_id,
          admin_name: log.admin_name,
          empresa_cnpj: log.empresa_cnpj,
          campo_alterado: log.campo_alterado,
          valor_anterior: log.valor_anterior,
          valor_novo: log.valor_novo,
        });

      if (error) throw error;

      // Refresh audit logs
      const { data } = await supabase
        .from('empresa_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setAuditLogs(data.map((l: DbAuditLog) => ({
          id: l.id,
          admin_id: l.admin_id,
          admin_name: l.admin_name,
          empresa_cnpj: l.empresa_cnpj,
          campo_alterado: l.campo_alterado,
          valor_anterior: l.valor_anterior || '',
          valor_novo: l.valor_novo || '',
          data_hora: new Date(l.created_at),
        })));
      }
    } catch (error) {
      console.error('Error adding audit log:', error);
    }
  }, []);

  const getAuditLogsByEmpresa = useCallback((cnpj: string): AuditLog[] => {
    const normalized = cnpj.replace(/\D/g, '').padStart(14, '0');
    return auditLogs.filter(l => l.empresa_cnpj === normalized);
  }, [auditLogs]);

  // Saved Filters
  const addSavedFilter = useCallback(async (filter: Omit<SavedFilter, 'id'>): Promise<SavedFilter | null> => {
    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .insert([{
          user_id: filter.user_id,
          nome: filter.nome,
          filtros: JSON.parse(JSON.stringify(filter.filtros)),
          is_admin: filter.is_admin,
        }])
        .select()
        .single();

      if (error) throw error;

      const newFilter: SavedFilter = {
        id: data.id,
        user_id: data.user_id,
        nome: data.nome,
        filtros: data.filtros as SavedFilter['filtros'],
        is_admin: data.is_admin,
      };
      setSavedFilters(prev => [...prev, newFilter]);
      toast.success('Filtro salvo');
      return newFilter;
    } catch (error) {
      console.error('Error saving filter:', error);
      toast.error('Erro ao salvar filtro');
      return null;
    }
  }, []);

  const deleteSavedFilter = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedFilters(prev => prev.filter(f => f.id !== id));
      toast.success('Filtro removido');
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast.error('Erro ao remover filtro');
    }
  }, []);

  const getSavedFiltersByUser = useCallback((userId: string, isAdmin: boolean): SavedFilter[] => {
    return savedFilters.filter(f => f.user_id === userId && f.is_admin === isAdmin);
  }, [savedFilters]);

  return {
    loading,
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
    refetch: fetchData,
  };
};
