import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminEmpresas, AdminEmpresaFilters } from '@/hooks/useAdminEmpresas';
import { useEmpresasFilterOptions, refreshFilterOptions } from '@/hooks/useEmpresas';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCnpj } from '@/lib/empresaParser';
import { useToast } from '@/hooks/use-toast';
import { ufList, sitCadastralOptions, porteOptions, simplesOptions, meiOptions, matrizFilialOptions } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Eye, Edit, Trash2, Tag, ChevronDown, ChevronUp,
  Mail, Phone, Users, Filter, X, Save, Bookmark, Building2, Zap, RefreshCw
} from 'lucide-react';
import { Empresa } from '@/types';
import EmpresasViewTabs, { ViewMode } from './empresas/EmpresasViewTabs';
import EmpresasCompactView from './empresas/EmpresasCompactView';
import EmpresasCardsView from './empresas/EmpresasCardsView';
import EmpresasLoadingState from './empresas/EmpresasLoadingState';
import EmpresasEmptyState from './empresas/EmpresasEmptyState';
import AdminAddEmpresaDialog from './AdminAddEmpresaDialog';
import { Plus } from 'lucide-react';

const AdminEmpresasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { categorias, tags, savedFilters, addSavedFilter, deleteSavedFilter, getSavedFiltersByUser } = useCategoriesTags();
  const { cnaes: cnaesList, loading: loadingOptions } = useEmpresasFilterOptions();
  
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [selectedEmpresas, setSelectedEmpresas] = useState<number[]>([]);
  const [bulkCategoria, setBulkCategoria] = useState('');
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showAddEmpresa, setShowAddEmpresa] = useState(false);
  
  const [filters, setFilters] = useState<AdminEmpresaFilters>({
    uf: '',
    sit_cadastral: '',
    categoria_id: '',
    tag_ids: [],
    tem_email: '',
    tem_telefone: '',
    tem_socios: '',
    busca_socio: '',
    // New filters
    municipio: '',
    cnae: '',
    porte: '',
    simples: '',
    mei: '',
    matriz_filial: '',
    data_abertura_inicio: '',
    data_abertura_fim: '',
  });
  
  const userFilters = user ? getSavedFiltersByUser(user.id, true) : [];

  // Memoize filters with search
  const activeFilters = useMemo(() => ({
    ...filters,
    search: search || undefined,
  }), [filters, search]);

  // Use server-side pagination
  const { empresas, loading, totalCount, error, refetch, isCached } = useAdminEmpresas(
    currentPage,
    itemsPerPage,
    activeFilters
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const handleDelete = async (id: number, cnpj: string) => {
    const { error } = await supabase.from('empresas').delete().eq('cnpj', cnpj);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    refetch();
    toast({ title: 'Empresa excluída' });
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm('Esta ação irá excluir TODAS as empresas. Continuar?');
    if (!confirmed) return;
    
    const { error } = await supabase.from('empresas').delete().neq('id', 0);
    if (error) {
      toast({ title: 'Erro ao limpar base', description: error.message, variant: 'destructive' });
      return;
    }
    refetch();
    toast({ title: 'Base limpa' });
  };

  const toggleSelect = (id: number) => {
    setSelectedEmpresas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEmpresas.length === empresas.length) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(empresas.map(e => e.id as number));
    }
  };

  const handleBulkAssign = async () => {
    for (const id of selectedEmpresas) {
      const updates: Record<string, unknown> = {};
      if (bulkCategoria && bulkCategoria !== 'none') {
        updates.categoria_id = bulkCategoria;
      }
      if (bulkTags.length > 0) {
        const emp = empresas.find(e => e.id === id);
        updates.tags = [...new Set([...(emp?.tags || []), ...bulkTags])];
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('empresas').update(updates).eq('id', id);
      }
    }
    
    refetch();
    toast({ title: 'Empresas atualizadas', description: `${selectedEmpresas.length} empresa(s) modificada(s)` });
    setShowBulkAssign(false);
    setSelectedEmpresas([]);
    setBulkCategoria('');
    setBulkTags([]);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim() || !user) return;
    
    addSavedFilter({
      user_id: user.id,
      nome: filterName,
      filtros: { 
        ...filters, 
        search,
        tem_email: filters.tem_email === 'sim' ? true : filters.tem_email === 'nao' ? false : undefined,
        tem_telefone: filters.tem_telefone === 'sim' ? true : filters.tem_telefone === 'nao' ? false : undefined,
        tem_socios: filters.tem_socios === 'sim' ? true : filters.tem_socios === 'nao' ? false : undefined,
      },
      is_admin: true,
    });
    
    toast({ title: 'Filtro salvo' });
    setShowSaveFilter(false);
    setFilterName('');
  };

  const applyFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setFilters({
        uf: filter.filtros.uf || '',
        sit_cadastral: filter.filtros.sit_cadastral || '',
        categoria_id: filter.filtros.categoria_id || '',
        tag_ids: filter.filtros.tag_ids || [],
        tem_email: filter.filtros.tem_email ? 'sim' : filter.filtros.tem_email === false ? 'nao' : '',
        tem_telefone: filter.filtros.tem_telefone ? 'sim' : filter.filtros.tem_telefone === false ? 'nao' : '',
        tem_socios: filter.filtros.tem_socios ? 'sim' : filter.filtros.tem_socios === false ? 'nao' : '',
        busca_socio: filter.filtros.busca_socio || '',
        municipio: filter.filtros.municipio || '',
        cnae: '',
        porte: filter.filtros.porte_empresa || '',
        simples: filter.filtros.opcao_simples || '',
        mei: filter.filtros.opcao_mei || '',
        matriz_filial: '',
        data_abertura_inicio: '',
        data_abertura_fim: '',
      });
      if (filter.filtros.search) setSearch(filter.filtros.search);
      setCurrentPage(1);
    }
  };

  const clearFilters = () => {
    setFilters({
      uf: '',
      sit_cadastral: '',
      categoria_id: '',
      tag_ids: [],
      tem_email: '',
      tem_telefone: '',
      tem_socios: '',
      busca_socio: '',
      municipio: '',
      cnae: '',
      porte: '',
      simples: '',
      mei: '',
      matriz_filial: '',
      data_abertura_inicio: '',
      data_abertura_fim: '',
    });
    setSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : !!v
  );

  const getCategoriaById = (id: string) => categorias.find(c => c.id === id);

  // Quick filter chips
  const quickFilters = [
    { label: 'Ativas', onClick: () => setFilters(f => ({ ...f, sit_cadastral: 'ATIVA' })) },
    { label: 'Com Email', onClick: () => setFilters(f => ({ ...f, tem_email: 'sim' })) },
    { label: 'Com Telefone', onClick: () => setFilters(f => ({ ...f, tem_telefone: 'sim' })) },
    { label: 'Matriz', onClick: () => setFilters(f => ({ ...f, matriz_filial: 'MATRIZ' })) },
    { label: 'Com Sócios', onClick: () => setFilters(f => ({ ...f, tem_socios: 'sim' })) },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Empresas
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {totalCount.toLocaleString('pt-BR')} empresas na base
            {isCached && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                Cache
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowAddEmpresa(true)}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} title="Atualizar dados">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {selectedEmpresas.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowBulkAssign(true)}>
              <Tag className="h-4 w-4 mr-1" />
              Atribuir ({selectedEmpresas.length})
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Limpar Base</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar toda a base?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover todas as {totalCount.toLocaleString('pt-BR')} empresas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickFilters.map((qf, i) => (
          <Badge 
            key={i} 
            variant="outline" 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={qf.onClick}
          >
            {qf.label}
          </Badge>
        ))}
        {userFilters.length > 0 && (
          <>
            <span className="text-muted-foreground">|</span>
            {userFilters.map(f => (
              <Badge 
                key={f.id} 
                variant="secondary" 
                className="cursor-pointer hover:bg-accent group"
                onClick={() => applyFilter(f.id)}
              >
                <Bookmark className="h-3 w-3 mr-1" />
                {f.nome}
                <X 
                  className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100" 
                  onClick={(e) => { e.stopPropagation(); deleteSavedFilter(f.id); }}
                />
              </Badge>
            ))}
          </>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          {/* Search and Filter Toggle */}
          <div className="space-y-3 mb-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por CNPJ, Razão Social, Nome Fantasia..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={showFilters ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtros
                {hasActiveFilters && <Badge className="ml-1" variant="secondary">!</Badge>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSaveFilter(true)}>
                <Save className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Salvar</span>
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Basic Filters */}
          {showFilters && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg mb-4">
              {/* Row 1: Basic filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">UF</label>
                  <Select value={filters.uf || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, uf: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      {ufList.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Município</label>
                  <Input 
                    value={filters.municipio || ''}
                    onChange={(e) => setFilters(f => ({ ...f, municipio: e.target.value }))}
                    placeholder="Digite o município..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Situação</label>
                  <Select value={filters.sit_cadastral || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, sit_cadastral: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todas</SelectItem>
                      {sitCadastralOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Porte</label>
                  <Select value={filters.porte || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, porte: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      {porteOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: More filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">CNAE (Atividade Principal)</label>
                  <SearchableSelect
                    options={cnaesList.map(c => ({ value: c.valor, label: `${c.valor} (${c.contagem})` }))}
                    value={filters.cnae || ''}
                    onValueChange={(v) => setFilters(f => ({ ...f, cnae: v }))}
                    placeholder="Selecione o CNAE..."
                    searchPlaceholder="Buscar CNAE..."
                    emptyMessage="Nenhum CNAE encontrado."
                    disabled={loadingOptions}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Matriz/Filial</label>
                  <Select value={filters.matriz_filial || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, matriz_filial: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      {matrizFilialOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Simples Nacional</label>
                  <Select value={filters.simples || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, simples: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      {simplesOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">MEI</label>
                  <Select value={filters.mei || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, mei: v === 'all' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      {meiOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced filters toggle */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full"
              >
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} Filtros Avançados
              </Button>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Categoria</label>
                      <Select value={filters.categoria_id || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, categoria_id: v === 'all' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="all">Todas</SelectItem>
                          {categorias.filter(c => c.ativo).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tem Email</label>
                      <Select value={filters.tem_email || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, tem_email: (v === 'all' ? '' : v) as AdminEmpresaFilters['tem_email'] }))}>
                        <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="all">Qualquer</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tem Telefone</label>
                      <Select value={filters.tem_telefone || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, tem_telefone: (v === 'all' ? '' : v) as AdminEmpresaFilters['tem_telefone'] }))}>
                        <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="all">Qualquer</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tem Sócios</label>
                      <Select value={filters.tem_socios || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, tem_socios: (v === 'all' ? '' : v) as AdminEmpresaFilters['tem_socios'] }))}>
                        <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="all">Qualquer</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Data Abertura (De)</label>
                      <Input 
                        type="date"
                        value={filters.data_abertura_inicio || ''}
                        onChange={(e) => setFilters(f => ({ ...f, data_abertura_inicio: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Data Abertura (Até)</label>
                      <Input 
                        type="date"
                        value={filters.data_abertura_fim || ''}
                        onChange={(e) => setFilters(f => ({ ...f, data_abertura_fim: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Busca por Sócio</label>
                      <Input 
                        value={filters.busca_socio || ''}
                        onChange={(e) => setFilters(f => ({ ...f, busca_socio: e.target.value }))}
                        placeholder="Nome do sócio..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                      {tags.map(tag => (
                        <Badge 
                          key={tag.id}
                          variant={filters.tag_ids?.includes(tag.id) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => setFilters(f => ({
                            ...f,
                            tag_ids: f.tag_ids?.includes(tag.id) 
                              ? f.tag_ids.filter(t => t !== tag.id)
                              : [...(f.tag_ids || []), tag.id]
                          }))}
                        >
                          {tag.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results info, view mode, and items per page */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Carregando...' : `${totalCount.toLocaleString('pt-BR')} resultados`}
              </p>
              <EmpresasViewTabs viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Exibir:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {loading && <EmpresasLoadingState viewMode={viewMode} />}

          {/* Empty State */}
          {!loading && empresas.length === 0 && (
            <EmpresasEmptyState 
              hasFilters={hasActiveFilters || !!search}
              error={error}
              onClearFilters={clearFilters}
            />
          )}

          {/* Compact View */}
          {!loading && empresas.length > 0 && viewMode === 'compact' && (
            <EmpresasCompactView
              empresas={empresas}
              onView={(cnpj) => navigate(`/admin/empresas/${cnpj}`)}
              onEdit={(cnpj) => navigate(`/admin/empresas/${cnpj}/editar`)}
              getCategoriaById={getCategoriaById}
            />
          )}

          {/* Cards View */}
          {!loading && empresas.length > 0 && viewMode === 'cards' && (
            <EmpresasCardsView
              empresas={empresas}
              onView={(cnpj) => navigate(`/admin/empresas/${cnpj}`)}
              onEdit={(cnpj) => navigate(`/admin/empresas/${cnpj}/editar`)}
              getCategoriaById={getCategoriaById}
            />
          )}

          {/* Table View */}
          {!loading && empresas.length > 0 && viewMode === 'table' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={empresas.length > 0 && selectedEmpresas.length === empresas.length}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((emp) => {
                    const cat = emp.categoria_id ? getCategoriaById(emp.categoria_id) : null;
                    const hasEmail = !!(emp.email || emp.correio_eletronico);
                    const hasPhone = !!(emp.ddd_telefone_1 || emp.ddd_telefone_2);
                    
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedEmpresas.includes(emp.id as number)}
                            onCheckedChange={() => toggleSelect(emp.id as number)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{formatCnpj(emp.cnpj || '')}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-xs">{emp.nome_fantasia || emp.razao_social || '-'}</p>
                            {emp.nome_fantasia && emp.razao_social && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">{emp.razao_social}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{emp.uf || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={emp.sit_cadastral === 'ATIVA' ? 'default' : 'destructive'}>
                            {emp.sit_cadastral || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cat ? (
                            <Badge style={{ backgroundColor: cat.cor || undefined }}>
                              {cat.nome}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {hasEmail && <Mail className="h-4 w-4 text-primary" />}
                            {hasPhone && <Phone className="h-4 w-4 text-success" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/empresas/${emp.cnpj}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/empresas/${emp.cnpj}/editar`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja excluir {emp.razao_social || emp.cnpj}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(emp.id as number, emp.cnpj || '')}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalCount)} de {totalCount.toLocaleString('pt-BR')}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Categoria/Tags em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {selectedEmpresas.length} empresa(s) selecionada(s)
            </p>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={bulkCategoria || 'none'} onValueChange={setBulkCategoria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Não alterar</SelectItem>
                  {categorias.filter(c => c.ativo).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Adicionar Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge 
                    key={tag.id}
                    variant={bulkTags.includes(tag.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setBulkTags(prev => 
                      prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                    )}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.nome}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancelar</Button>
            <Button onClick={handleBulkAssign}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Filter Dialog */}
      <Dialog open={showSaveFilter} onOpenChange={setShowSaveFilter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome do Filtro</label>
              <Input 
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Ex: Empresas ativas com email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveFilter(false)}>Cancelar</Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminAddEmpresaDialog
        open={showAddEmpresa}
        onOpenChange={setShowAddEmpresa}
        onSuccess={refetch}
      />
    </div>
  );
};

export default AdminEmpresasList;
