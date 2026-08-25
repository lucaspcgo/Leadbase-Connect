import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { SubscriptionBlocker } from '@/components/subscription/SubscriptionBlocker';
import { EmpresaMobileCard } from '@/components/empresas/EmpresaMobileCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { useEmpresasPaginated, useEmpresasFilterOptions, EmpresaFilters, MunicipioWithUf } from '@/hooks/useEmpresas';
import { useEmpresaById } from '@/hooks/useEmpresaById';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { useGA4Events } from '@/hooks/useGA4Events';
import { useMetaPixelEvents } from '@/hooks/useMetaPixelEvents';
import { useIsMobile } from '@/hooks/use-mobile';
import { ufList, sitCadastralOptions, porteEmpresaOptions } from '@/data/mockData';
import { Empresa } from '@/types';
import { 
  Search, Eye, Phone, Mail, MapPin, Users, Building2, AlertTriangle, Zap, Coins, 
  CheckCircle2, Lock, Unlock, ChevronDown, ChevronUp, Filter, X, Save, Bookmark,
  Home, Activity, UserCheck, Download, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const BuscarEmpresas = () => {
  const { user, isAuthenticated } = useAuth();
  const { canAccessCompany, accessCompany, isCompanyUnlocked, isCompanyUnlockedById, getAccessStats, loadingUnlocked } = useCredits();
  const { categorias, tags: allTags, savedFilters, addSavedFilter, deleteSavedFilter, getSavedFiltersByUser } = useCategoriesTags();
  const { fetchEmpresaById, loading: loadingEmpresaDetails } = useEmpresaById();
  const { trackSearch, trackButtonClick, trackCompanyUnlock } = useGA4Events();
  const { trackLead } = useMetaPixelEvents();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Basic filters
  const [search, setSearch] = useState('');
  const [uf, setUf] = useState('');
  const [sitCadastral, setSitCadastral] = useState('');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [municipio, setMunicipio] = useState('');
  const [cnae, setCnae] = useState('');
  const [porte, setPorte] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('');
  const [matrizFilial, setMatrizFilial] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dataAberturaInicio, setDataAberturaInicio] = useState('');
  const [dataAberturaFim, setDataAberturaFim] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasSocios, setHasSocios] = useState(false);
  const [socioName, setSocioName] = useState('');
  
  // UI State
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [loadingFullData, setLoadingFullData] = useState(false);
  
  // Selection state for export (using IDs instead of CNPJs since CNPJs are masked)
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());
  
  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Validation: CNAE used to require location, but now we allow broad searches
  const cnaeRequiresLocation = false; // Removed restriction as requested

  // Build filters object for server-side filtering
  const filters: EmpresaFilters = useMemo(() => ({
    search: search || undefined,
    uf: uf || undefined,
    sitCadastral: sitCadastral || undefined,
    municipio: municipio || undefined,
    // CNAE filter no longer requires location
    cnae: cnae || undefined,
    porte: porte || undefined,
    simples: regimeTributario === 'simples' ? 'SIM' : regimeTributario === 'lucro' ? 'NAO OPTANTE' : undefined,
    mei: regimeTributario === 'mei' ? 'S' : regimeTributario === 'lucro' ? 'N' : undefined,
    matrizFilial: matrizFilial || undefined,
    categoriaId: categoriaId || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    dataAberturaInicio: dataAberturaInicio || undefined,
    dataAberturaFim: dataAberturaFim || undefined,
    hasEmail: hasEmail || undefined,
    hasPhone: hasPhone || undefined,
    hasSocios: hasSocios || undefined,
    socioName: socioName || undefined,
  }), [search, uf, sitCadastral, municipio, cnae, cnaeRequiresLocation, porte, regimeTributario, matrizFilial,
      categoriaId, selectedTags, dataAberturaInicio, dataAberturaFim,
      hasEmail, hasPhone, hasSocios, socioName]);

  // Use paginated hook with server-side filtering
  const { empresas, loading: loadingEmpresas, isTimeout, totalCount, refetch } = useEmpresasPaginated(
    currentPage,
    itemsPerPage,
    filters
  );

  // Load filter options (municipalities, CNAEs)
  const { municipios: municipiosList, cnaes: cnaesList, loading: loadingOptions } = useEmpresasFilterOptions();

  // Filter municipalities by selected UF
  const filteredMunicipios = useMemo(() => {
    if (!uf) {
      // If no UF selected, show all municipalities
      return municipiosList;
    }
    // Filter municipalities that belong to the selected UF
    return municipiosList.filter(m => m.uf === uf);
  }, [municipiosList, uf]);

  // Clear municipality when UF changes (if the current municipality is not in the new UF)
  useEffect(() => {
    if (municipio && uf) {
      const municipioExists = municipiosList.some(m => m.nome === municipio && m.uf === uf);
      if (!municipioExists) {
        setMunicipio('');
      }
    }
  }, [uf, municipio, municipiosList]);

  // Memoize stats to ensure reactivity when unlocked companies change
  // Recalculate when loadingUnlocked changes (data finished loading from server)
  const stats = useMemo(() => {
    if (!isAuthenticated || loadingUnlocked) return null;
    return getAccessStats();
  }, [isAuthenticated, getAccessStats, loadingUnlocked]);

  // User saved filters
  const userSavedFilters = useMemo(() => {
    if (!user) return [];
    return getSavedFiltersByUser(user.id, user.role === 'ADMIN' || user.role === 'MASTER_ADMIN');
  }, [user, savedFilters, getSavedFiltersByUser]);

  // Check if any advanced filter is active
  const hasActiveAdvancedFilters = municipio || cnae || porte || regimeTributario || matrizFilial ||
    categoriaId || selectedTags.length > 0 || dataAberturaInicio || dataAberturaFim || 
    hasEmail || hasPhone || hasSocios || socioName;

  // Reset to page 1 when filters change and track search
  useEffect(() => {
    setCurrentPage(1);
    const hasFilters = search || uf || sitCadastral || municipio || cnae || porte || regimeTributario || matrizFilial ||
      categoriaId || selectedTags.length > 0 || dataAberturaInicio || dataAberturaFim ||
      hasEmail || hasPhone || hasSocios || socioName;
    if (hasFilters) {
      const searchTerm = search || uf || municipio || cnae || 'filtros';
      trackSearch(searchTerm);
    }
  }, [search, uf, sitCadastral, municipio, cnae, porte, regimeTributario, matrizFilial,
      categoriaId, selectedTags, dataAberturaInicio, dataAberturaFim,
      hasEmail, hasPhone, hasSocios, socioName]);


  // Clear all filters
  const clearAllFilters = () => {
    setSearch('');
    setUf('');
    setSitCadastral('');
    setMunicipio('');
    setCnae('');
    setPorte('');
    setRegimeTributario('');
    setMatrizFilial('');
    setCategoriaId('');
    setSelectedTags([]);
    setDataAberturaInicio('');
    setDataAberturaFim('');
    setHasEmail(false);
    setHasPhone(false);
    setHasSocios(false);
    setSocioName('');
  };

  // Apply saved filter
  const applySavedFilter = (filter: any) => {
    const config = filter.filtros;
    setUf(config.uf || '');
    setSitCadastral(config.sit_cadastral || '');
    setMunicipio(config.municipio || '');
    setCnae(config.cnae_codigo || '');
    setCategoriaId(config.categoria_id || '');
    setSelectedTags(config.tag_ids || []);
    setDataAberturaInicio(config.data_inicio_atividade_from ? new Date(config.data_inicio_atividade_from).toISOString().split('T')[0] : '');
    setDataAberturaFim(config.data_inicio_atividade_to ? new Date(config.data_inicio_atividade_to).toISOString().split('T')[0] : '');
    setHasEmail(config.tem_email || false);
    setHasPhone(config.tem_telefone || false);
    setHasSocios(config.tem_socios || false);
    setSocioName(config.busca_socio || '');
    if (config.municipio || config.cnae_codigo || 
        config.categoria_id || config.tag_ids?.length > 0 || 
        config.data_inicio_atividade_from || config.data_inicio_atividade_to || config.tem_email || 
        config.tem_telefone || config.tem_socios || config.busca_socio) {
      setShowAdvancedFilters(true);
    }
    toast({ title: 'Filtro aplicado', description: `Filtro "${filter.nome}" foi aplicado.` });
  };

  // Save current filter
  const handleSaveFilter = () => {
    if (!filterName.trim() || !user) return;
    
    addSavedFilter({
      nome: filterName,
      user_id: user.id,
      is_admin: user.role === 'ADMIN' || user.role === 'MASTER_ADMIN',
      filtros: {
        uf: uf || undefined,
        municipio: municipio || undefined,
        cnae_codigo: cnae || undefined,
        sit_cadastral: sitCadastral || undefined,
        data_inicio_atividade_from: dataAberturaInicio ? new Date(dataAberturaInicio) : undefined,
        data_inicio_atividade_to: dataAberturaFim ? new Date(dataAberturaFim) : undefined,
        categoria_id: categoriaId || undefined,
        tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
        tem_email: hasEmail || undefined,
        tem_telefone: hasPhone || undefined,
        tem_socios: hasSocios || undefined,
        busca_socio: socioName || undefined,
      }
    });
    
    setShowSaveFilterDialog(false);
    setFilterName('');
    toast({ title: 'Filtro salvo', description: 'Seu filtro foi salvo com sucesso.' });
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '').padStart(14, '0');
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  // Track recently unlocked company IDs to force UI refresh
  const [recentlyUnlockedIds, setRecentlyUnlockedIds] = useState<Set<number>>(new Set());

  const handleViewEmpresa = async (empresa: Empresa) => {
    if (!isAuthenticated) {
      toast({ title: 'Faça login', description: 'Você precisa estar logado para ver detalhes.', variant: 'destructive' });
      return;
    }

    setLoadingFullData(true);
    setShowDetails(true);

    try {
      // Fetch full data by ID using RPC that returns unlock status
      const fullData = await fetchEmpresaById(empresa.id);
      
      if (!fullData) {
        toast({ title: 'Erro', description: 'Não foi possível carregar os dados da empresa.', variant: 'destructive' });
        setShowDetails(false);
        setLoadingFullData(false);
        return;
      }

      // Check if already unlocked using the is_unlocked field from RPC
      // Also ensure local state is aware of this unlock (for UI updates)
      if (fullData.is_unlocked) {
        // Ensure this empresa is tracked locally for immediate UI updates
        if (empresa.id && !recentlyUnlockedIds.has(empresa.id)) {
          setRecentlyUnlockedIds(prev => new Set([...prev, empresa.id as number]));
        }
        setSelectedEmpresa(fullData);
        setLoadingFullData(false);
        return;
      }

      const { allowed, reason, requiresExtraCredit } = canAccessCompany(fullData.cnpj);
      
      if (!allowed) {
        setShowDetails(false);
        setShowLimitDialog(true);
        setLoadingFullData(false);
        return;
      }

      // If requires extra credit, show confirmation
      if (requiresExtraCredit) {
        toast({ 
          title: 'Usando crédito extra', 
          description: 'Será consumido 1 crédito extra para desbloquear esta empresa.',
        });
      }

      const success = await accessCompany(fullData.cnpj, fullData.id);
      if (success) {
        // Track company unlock event
        trackCompanyUnlock(fullData.id?.toString() || fullData.cnpj);

        // Meta Pixel: desbloqueio de empresa consome crédito => Lead
        trackLead({
          content_name: fullData.razao_social || fullData.cnpj,
          content_ids: [String(fullData.id ?? fullData.cnpj)],
          value: requiresExtraCredit ? 1 : 0,
        });
        
        toast({ 
          title: 'Empresa desbloqueada!', 
          description: 'Os dados completos agora estão disponíveis até o fim do seu ciclo atual.',
        });
        
        // Mark this empresa as recently unlocked to update UI immediately
        // Use fullData.id as it's the definitive ID from the database
        const empresaId = fullData.id || empresa.id;
        if (empresaId) {
          setRecentlyUnlockedIds(prev => new Set([...prev, empresaId as number]));
        }
        
        setSelectedEmpresa(fullData);
      } else {
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Error loading empresa details:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados da empresa.', variant: 'destructive' });
      setShowDetails(false);
    } finally {
      setLoadingFullData(false);
    }
  };

  // Check if company is unlocked - use ID since CNPJ may be masked for regular users
  // Also check recentlyUnlockedIds for immediate UI feedback
  // Wait for unlocked data to load before returning false
  const isUnlockedById = useCallback((empresaId: number) => {
    if (!isAuthenticated) return false;
    // Ensure we're comparing numbers correctly
    const numId = Number(empresaId);
    if (isNaN(numId)) return false;
    
    // Check recently unlocked first (immediate feedback)
    if (recentlyUnlockedIds.has(numId)) return true;
    
    // If still loading, don't mark as unlocked yet (will update when load completes)
    // This ensures UI updates reactively once data loads
    
    // Then check via context
    return isCompanyUnlockedById(numId);
  }, [isAuthenticated, recentlyUnlockedIds, isCompanyUnlockedById]);
  
  const isUnlocked = (cnpj: string) => isAuthenticated && isCompanyUnlocked(cnpj);

  // Selection handlers (using IDs since CNPJs are masked)
  const toggleSelectForExport = (empresaId: number) => {
    const newSelected = new Set(selectedForExport);
    if (newSelected.has(empresaId)) {
      newSelected.delete(empresaId);
    } else {
      newSelected.add(empresaId);
    }
    setSelectedForExport(newSelected);
  };

  const selectAllUnlocked = () => {
    const unlockedIds = empresas
      .filter(emp => emp.id && isUnlockedById(emp.id))
      .map(emp => emp.id as number);
    setSelectedForExport(new Set([...selectedForExport, ...unlockedIds]));
  };

  const clearSelection = () => {
    setSelectedForExport(new Set());
  };

  // Unlock all selected companies
  const handleUnlockSelected = async () => {
    if (selectedForExport.size === 0) {
      toast({ 
        title: 'Nenhuma empresa selecionada', 
        description: 'Selecione pelo menos uma empresa para desbloquear.',
        variant: 'destructive'
      });
      return;
    }

    // Get empresas that are not yet unlocked
    const notUnlockedIds = Array.from(selectedForExport).filter(id => !isUnlockedById(id));
    
    if (notUnlockedIds.length === 0) {
      toast({ 
        title: 'Todas já desbloqueadas', 
        description: 'Todas as empresas selecionadas já foram desbloqueadas.',
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const newlyUnlockedIds: number[] = [];

    // For batch unlock, we need to fetch the full data for each empresa
    for (const empresaId of notUnlockedIds) {
      const fullData = await fetchEmpresaById(empresaId);
      if (fullData && fullData.cnpj) {
        const { allowed } = canAccessCompany(fullData.cnpj);
        if (allowed) {
          const success = await accessCompany(fullData.cnpj, empresaId);
          if (success) {
            successCount++;
            newlyUnlockedIds.push(empresaId);
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      }
    }

    // Update recently unlocked IDs for immediate UI feedback
    if (newlyUnlockedIds.length > 0) {
      setRecentlyUnlockedIds(prev => new Set([...prev, ...newlyUnlockedIds]));
    }

    if (successCount > 0) {
      toast({ 
        title: 'Empresas desbloqueadas!', 
        description: `${successCount} empresa(s) desbloqueada(s) com sucesso.${failCount > 0 ? ` ${failCount} falharam (limite atingido).` : ''}`,
      });
    } else {
      toast({ 
        title: 'Limite atingido', 
        description: 'Você não tem créditos suficientes para desbloquear as empresas selecionadas.',
        variant: 'destructive'
      });
    }
  };

  // State for export loading
  const [exportLoading, setExportLoading] = useState(false);

  // Export to Excel - fetches complete data for selected companies
  const handleExportExcel = async () => {
    if (selectedForExport.size === 0) {
      toast({ 
        title: 'Nenhuma empresa selecionada', 
        description: 'Selecione pelo menos uma empresa desbloqueada para exportar.',
        variant: 'destructive'
      });
      return;
    }

    setExportLoading(true);
    
    try {
      // Fetch complete data for each selected company
      const empresaIds = Array.from(selectedForExport);
      
      // Process in smaller batches to avoid timeout issues
      const batchSize = 10;
      const allEmpresas: (Empresa & { is_unlocked: boolean } | null)[] = [];
      
      for (let i = 0; i < empresaIds.length; i += batchSize) {
        const batch = empresaIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(id => fetchEmpresaById(id))
        );
        allEmpresas.push(...batchResults);
      }
      
      // Filter out nulls - include all fetched companies that exist
      const validEmpresas = allEmpresas.filter((emp): emp is Empresa & { is_unlocked: boolean } => {
        if (!emp) return false;
        // Accept if is_unlocked is true, or if we could fetch the data (meaning user has access)
        return emp.is_unlocked === true || emp.cnpj !== undefined;
      });
      
      if (validEmpresas.length === 0) {
        toast({ 
          title: 'Nenhuma empresa disponível', 
          description: 'Não foi possível obter os dados das empresas selecionadas. Verifique se estão desbloqueadas.',
          variant: 'destructive'
        });
        setExportLoading(false);
        return;
      }
      
      const data = validEmpresas.map(emp => ({
        'Nome Fantasia': emp.nome_fantasia || '-',
        'Razão Social': emp.razao_social || '-',
        'CNPJ': emp.cnpj || '-',
        'Telefone 1': emp.ddd_telefone_1 || '-',
        'Telefone 2': emp.ddd_telefone_2 || '-',
        'Email': emp.email || emp.correio_eletronico || '-',
        'UF': emp.uf || '-',
        'Município': emp.municipio || '-',
        'Endereço': emp.logradouro ? `${emp.desc_tipo_logradouro || ''} ${emp.logradouro}, ${emp.numero || 'S/N'}${emp.complemento ? ` - ${emp.complemento}` : ''}`.trim() : '-',
        'Bairro': emp.bairro || '-',
        'CEP': emp.cep || '-',
        'CNAE': emp.cnae_codigo || '-',
        'Atividade': emp.cnae_fiscal || '-',
        'Porte': emp.porte_empresa || '-',
        'Situação': emp.sit_cadastral || '-',
        'Capital Social': emp.capital_social_empresa ? `R$ ${Number(emp.capital_social_empresa).toLocaleString('pt-BR')}` : '-',
        'Sócios': emp.socios || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');

      // Auto-size columns
      const colWidths = [
        { wch: 40 }, // Nome Fantasia
        { wch: 50 }, // Razão Social
        { wch: 20 }, // CNPJ
        { wch: 18 }, // Telefone 1
        { wch: 18 }, // Telefone 2
        { wch: 35 }, // Email
        { wch: 5 },  // UF
        { wch: 25 }, // Município
        { wch: 60 }, // Endereço
        { wch: 25 }, // Bairro
        { wch: 12 }, // CEP
        { wch: 12 }, // CNAE
        { wch: 50 }, // Atividade
        { wch: 15 }, // Porte
        { wch: 15 }, // Situação
        { wch: 18 }, // Capital Social
        { wch: 80 }, // Sócios
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `empresas_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({ 
        title: 'Exportação concluída!', 
        description: `${data.length} empresa(s) exportada(s) para Excel.`
      });
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast({ 
        title: 'Erro na exportação', 
        description: error?.message || 'Ocorreu um erro ao exportar as empresas. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Use ID-based check since CNPJ is masked for regular users (and list data may be masked)
  const unlockedCount = empresas.filter((emp) => emp.id && isUnlockedById(emp.id)).length;

  // Render skeleton rows for loading state
  const renderSkeletonRows = () => {
    return Array.from({ length: itemsPerPage }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
      </TableRow>
    ));
  };

  return (
    <SubscriptionBlocker>
      <MainLayout hideFooter>
        <div className="container py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Search className="h-5 w-5 sm:h-6 sm:w-6" /> Buscar Empresas
              </h1>
              <p className="text-sm text-muted-foreground">Encontre leads B2B qualificados</p>
            </div>
            {isAuthenticated && stats && (
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {stats.companiesViewedThisMonth} / {stats.monthlyLimit}
                </Badge>
                {stats.extraCredits > 0 && (
                  <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                    <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    +{stats.extraCredits}
                  </Badge>
                )}
              </div>
            )}
          </div>

        {/* Plan Info - Responsive */}
        <Card className="mb-4 bg-muted/50">
          <CardContent className="p-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-muted-foreground">Plano:</span>
              <Badge className="text-xs">{user?.plan?.name || 'Free'}</Badge>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <span className="hidden sm:inline">{stats?.monthlyLimit || 10} empresas/mês</span>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <span className="hidden sm:flex items-center gap-1">
                <Lock className="h-3 w-3" /> Dados ocultos até desbloquear
              </span>
              {stats?.planRenewalDate && (
                <span className="text-muted-foreground sm:ml-auto text-xs">
                  Renova: {stats.planRenewalDate.toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Filter Chips - Responsive */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1">
          <Button 
            size="sm" 
            variant={sitCadastral === 'ATIVA' ? 'default' : 'outline'}
            onClick={() => setSitCadastral(sitCadastral === 'ATIVA' ? '' : 'ATIVA')}
            className="gap-1 text-xs h-7 sm:h-8 sm:text-sm"
          >
            <Activity className="h-3 w-3" /> Ativas
          </Button>
          <Button 
            size="sm" 
            variant={hasEmail ? 'default' : 'outline'}
            onClick={() => setHasEmail(!hasEmail)}
            className="gap-1 text-xs h-7 sm:h-8 sm:text-sm"
          >
            <Mail className="h-3 w-3" /> Email
          </Button>
          <Button 
            size="sm" 
            variant={hasPhone ? 'default' : 'outline'}
            onClick={() => setHasPhone(!hasPhone)}
            className="gap-1 text-xs h-7 sm:h-8 sm:text-sm"
          >
            <Phone className="h-3 w-3" /> Tel
          </Button>
          <Button 
            size="sm" 
            variant={hasSocios ? 'default' : 'outline'}
            onClick={() => setHasSocios(!hasSocios)}
            className="gap-1 text-xs h-7 sm:h-8 sm:text-sm"
          >
            <UserCheck className="h-3 w-3" /> Sócios
          </Button>
          
          {/* Saved Filters */}
          {userSavedFilters.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l">
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              {userSavedFilters.map(filter => (
                <Button
                  key={filter.id}
                  size="sm"
                  variant="ghost"
                  onClick={() => applySavedFilter(filter)}
                  className="text-xs"
                >
                  {filter.nome}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="pt-6 overflow-x-hidden">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Busca Geral</label>
                <Input 
                  placeholder="Buscar por UF, Município, CNAE..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="h-10" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Estado (UF)</label>
                <Select value={uf || "all"} onValueChange={(v) => setUf(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos</SelectItem>
                    {ufList.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Atividade Principal (CNAE)</label>
                <SearchableSelect
                  options={cnaesList.map(c => ({ value: c.valor, label: `${c.valor} (${c.contagem})` }))}
                  value={cnae}
                  onValueChange={setCnae}
                  placeholder="Selecione o CNAE..."
                  searchPlaceholder="Buscar CNAE..."
                  emptyMessage="Nenhum CNAE encontrado."
                  disabled={loadingOptions}
                />
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Avançados
                    {hasActiveAdvancedFilters && (
                      <Badge variant="secondary" className="ml-1">{
                         [municipio, cnae, porte, regimeTributario, matrizFilial, categoriaId, 
                          selectedTags.length > 0, dataAberturaInicio, dataAberturaFim,
                          hasEmail, hasPhone, hasSocios, socioName].filter(Boolean).length
                      }</Badge>
                    )}
                    {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                
                <div className="flex items-center gap-2">
                  {(search || uf || sitCadastral || hasActiveAdvancedFilters) && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                      <X className="h-4 w-4" /> Limpar Filtros
                    </Button>
                  )}
                  {isAuthenticated && (search || uf || sitCadastral || hasActiveAdvancedFilters) && (
                    <Button variant="outline" size="sm" onClick={() => setShowSaveFilterDialog(true)} className="gap-1">
                      <Save className="h-4 w-4" /> Salvar Filtro
                    </Button>
                  )}
                </div>
              </div>

              <CollapsibleContent className="mt-4 space-y-4">
                {/* Row 1: Município, Situação Cadastral */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Cidade da Empresa</label>
                    <SearchableSelect
                      options={filteredMunicipios.map(m => ({ value: m.nome, label: m.contagem ? `${m.nome} (${m.contagem})` : m.nome }))}
                      value={municipio}
                      onValueChange={setMunicipio}
                      placeholder={uf ? "Selecione o município..." : "Selecione um estado primeiro..."}
                      searchPlaceholder="Buscar município..."
                      emptyMessage={uf ? "Nenhum município encontrado." : "Selecione um estado para ver as cidades."}
                      disabled={loadingOptions}
                    />
                  </div>
                  
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Situação Cadastral</label>
                    <Select value={sitCadastral || "all"} onValueChange={(v) => setSitCadastral(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todas</SelectItem>
                        {sitCadastralOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Porte, Simples, MEI, Matriz/Filial */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Porte da Empresa</label>
                    <Select value={porte || "all"} onValueChange={(v) => setPorte(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Porte" /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="MICRO EMPRESA">Micro Empresa</SelectItem>
                        <SelectItem value="DEMAIS">Demais</SelectItem>
                        <SelectItem value="NAO INFORMADO">Não Informado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Regime Tributário</label>
                    <Select value={regimeTributario || "all"} onValueChange={(v) => setRegimeTributario(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Regime" /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="simples">Simples Nacional</SelectItem>
                        <SelectItem value="lucro">Lucro Presumido / Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Matriz / Filial</label>
                    <Select value={matrizFilial || "all"} onValueChange={(v) => setMatrizFilial(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="MATRIZ">Matriz</SelectItem>
                        <SelectItem value="FILIAL">Filial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Categoria, Busca Sócio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Segmento/Categoria</label>
                    <Select value={categoriaId || "all"} onValueChange={(v) => setCategoriaId(v === "all" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">Todas</SelectItem>
                        {categorias.filter(c => c.ativo).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              {c.cor && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor }} />}
                              {c.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Buscar por Nome do Sócio</label>
                    <Input 
                      placeholder="Digite o nome do sócio..." 
                      value={socioName} 
                      onChange={(e) => setSocioName(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Row 3: Data de abertura */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Abertura (De)</label>
                    <Input 
                      type="date" 
                      value={dataAberturaInicio} 
                      onChange={(e) => setDataAberturaInicio(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">Abertura (Até)</label>
                    <Input 
                      type="date" 
                      value={dataAberturaFim} 
                      onChange={(e) => setDataAberturaFim(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Tags Selection */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <Button
                          key={tag.id}
                          size="sm"
                          variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                          onClick={() => {
                            if (selectedTags.includes(tag.id)) {
                              setSelectedTags(selectedTags.filter(t => t !== tag.id));
                            } else {
                              setSelectedTags([...selectedTags, tag.id]);
                            }
                          }}
                          className="text-xs"
                        >
                          {tag.nome}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Results Summary & Actions */}
        {/* Results Summary & Actions */}

        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-muted-foreground">
              {loadingEmpresas ? (
                <Skeleton className="h-4 w-32 sm:w-40 inline-block" />
              ) : (
                <>
                  <strong>{totalCount.toLocaleString('pt-BR')}</strong> empresas
                  {!isMobile && unlockedCount > 0 && ` • ${unlockedCount} desbloqueadas`}
                </>
              )}
            </span>
            {selectedForExport.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedForExport.size} selecionada(s)
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={selectAllUnlocked}
              disabled={unlockedCount === 0}
              className="text-xs sm:text-sm"
            >
              {isMobile ? 'Sel. Todas' : 'Selecionar Desbloqueadas'}
            </Button>
            {selectedForExport.size > 0 && (
              <>
                <Button size="sm" variant="ghost" onClick={clearSelection} className="text-xs sm:text-sm">
                  Limpar
                </Button>
                {!isMobile && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleUnlockSelected}
                    className="gap-1"
                  >
                    <Unlock className="h-4 w-4" /> Desbloquear
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleExportExcel}
                  className="gap-1 text-xs sm:text-sm"
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      {!isMobile && 'Exportar'}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error States */}
        {isTimeout && (
          <Alert variant="destructive" className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">Consulta muito abrangente</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                A busca demorou mais do que o esperado devido ao grande volume de dados. 
                Isso geralmente acontece quando os filtros são muito amplos (ex: um CNAE muito comum em todo o Brasil).
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="bg-white dark:bg-background border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                >
                  Tentar novamente
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAdvancedFilters(true)}
                  className="bg-white dark:bg-background border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                >
                  Adicionar mais filtros (ex: UF ou Município)
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Results - Mobile Cards or Desktop Table */}
        {isMobile ? (
          // Mobile: Card-based layout
          <div className="space-y-3">
            {loadingEmpresas ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-8 w-full mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : empresas.length === 0 && !isTimeout ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma empresa encontrada.
                </CardContent>
              </Card>
            ) : (
              empresas.map((empresa) => {
                const unlocked = empresa.id ? isUnlockedById(empresa.id) : false;
                return (
                  <EmpresaMobileCard
                    key={empresa.id}
                    empresa={empresa}
                    isUnlocked={unlocked}
                    isSelected={empresa.id ? selectedForExport.has(empresa.id) : false}
                    onToggleSelect={() => empresa.id && toggleSelectForExport(empresa.id)}
                    onView={() => empresa.id && handleViewEmpresa(empresa as Empresa)}
                  />
                );
              })
            )}
          </div>
        ) : (
          // Desktop: Table layout
          <Card>
            <CardContent className="p-0 overflow-auto">
              {isTimeout && (
                <div className="p-6">
                  <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold">Consulta muito abrangente</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      A busca demorou mais do que o esperado devido ao grande volume de dados. Isso geralmente acontece quando os filtros são muito amplos (ex: um CNAE muito comum em todo o Brasil).
                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => refetch()} 
                          className="bg-white border-amber-300 hover:bg-amber-100"
                        >
                          Tentar novamente
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAdvancedFilters(true)}
                          className="bg-white border-amber-300 hover:bg-amber-100"
                        >
                          Adicionar mais filtros (ex: UF ou Município)
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={empresas.length > 0 && empresas.every(e => e.id && selectedForExport.has(e.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelected = new Set(selectedForExport);
                            empresas.forEach(e => e.id && newSelected.add(e.id));
                            setSelectedForExport(newSelected);
                          } else {
                            const newSelected = new Set(selectedForExport);
                            empresas.forEach(e => e.id && newSelected.delete(e.id));
                            setSelectedForExport(newSelected);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Município</TableHead>
                    <TableHead>CNAE</TableHead>
                    <TableHead>Porte</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEmpresas ? (
                    renderSkeletonRows()
                  ) : empresas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {isTimeout ? "A busca demorou muito. Tente refinar seus filtros." : "Nenhuma empresa encontrada com os filtros atuais."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    empresas.map((empresa) => {
                      const unlocked = empresa.id ? isUnlockedById(empresa.id) : false;
                      return (
                        <TableRow key={empresa.id} className={unlocked ? 'bg-success/5' : ''}>
                          <TableCell>
                            <Checkbox 
                              checked={empresa.id ? selectedForExport.has(empresa.id) : false}
                              onCheckedChange={() => empresa.id && toggleSelectForExport(empresa.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{empresa.uf || '-'}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {empresa.municipio || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {empresa.cnae_fiscal || empresa.cnae_codigo || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {empresa.porte_empresa || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={empresa.sit_cadastral === 'ATIVA' ? 'default' : 'secondary'}
                              className={empresa.sit_cadastral === 'ATIVA' ? 'bg-success' : ''}
                            >
                              {empresa.sit_cadastral || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant={unlocked ? 'outline' : 'default'}
                              onClick={() => empresa.id && handleViewEmpresa(empresa as Empresa)}
                              className="gap-1"
                            >
                              {unlocked ? (
                                <>
                                  <Eye className="h-4 w-4" /> Ver Detalhes
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-4 w-4" /> Desbloquear
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2">
            {!isMobile && <span className="text-sm text-muted-foreground">Exibir:</span>}
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-16 sm:w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="75">75</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            {!isMobile && <span className="text-sm text-muted-foreground">por página</span>}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loadingEmpresas}
              className="h-8 px-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground px-1 sm:px-2">
              {currentPage}/{totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loadingEmpresas}
              className="h-8 px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Company Details Dialog */}
        <Dialog open={showDetails} onOpenChange={(open) => {
          if (!loadingFullData) setShowDetails(open);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {loadingFullData ? 'Carregando...' : (selectedEmpresa?.nome_fantasia || selectedEmpresa?.razao_social || 'Detalhes da Empresa')}
              </DialogTitle>
              <DialogDescription>
                {loadingFullData ? 'Buscando dados completos da empresa...' : 'Dados completos da empresa desbloqueada'}
              </DialogDescription>
            </DialogHeader>
            
            {loadingFullData ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando dados da empresa...</p>
              </div>
            ) : selectedEmpresa && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">CNPJ</label>
                    <p className="font-mono">{formatCnpj(selectedEmpresa.cnpj)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Razão Social</label>
                    <p>{selectedEmpresa.razao_social || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nome Fantasia</label>
                    <p>{selectedEmpresa.nome_fantasia || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Situação Cadastral</label>
                    <Badge 
                      variant={selectedEmpresa.sit_cadastral === 'ATIVA' ? 'default' : 'secondary'}
                      className={selectedEmpresa.sit_cadastral === 'ATIVA' ? 'bg-green-500' : ''}
                    >
                      {selectedEmpresa.sit_cadastral || '-'}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Contato
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Telefone 1</label>
                      {selectedEmpresa.ddd_telefone_1 ? (
                        <a 
                          href={`https://api.whatsapp.com/send?phone=55${selectedEmpresa.ddd_telefone_1.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-success hover:underline"
                        >
                          <Zap className="h-4 w-4" />
                          {selectedEmpresa.ddd_telefone_1}
                        </a>
                      ) : (
                        <p>-</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Telefone 2</label>
                      {selectedEmpresa.ddd_telefone_2 ? (
                        <a 
                          href={`https://api.whatsapp.com/send?phone=55${selectedEmpresa.ddd_telefone_2.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-success hover:underline"
                        >
                          <Zap className="h-4 w-4" />
                          {selectedEmpresa.ddd_telefone_2}
                        </a>
                      ) : (
                        <p>-</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      {(selectedEmpresa.email || selectedEmpresa.correio_eletronico) ? (
                        <a 
                          href={`mailto:${selectedEmpresa.email || selectedEmpresa.correio_eletronico}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          {selectedEmpresa.email || selectedEmpresa.correio_eletronico}
                        </a>
                      ) : (
                        <p>-</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                  </h4>
                  <p>
                    {[
                      selectedEmpresa.desc_tipo_logradouro,
                      selectedEmpresa.logradouro,
                      selectedEmpresa.numero,
                      selectedEmpresa.complemento,
                      selectedEmpresa.bairro,
                      selectedEmpresa.municipio,
                      selectedEmpresa.uf,
                      selectedEmpresa.cep
                    ].filter(Boolean).join(', ') || '-'}
                  </p>
                </div>

                {/* Partners */}
                {(selectedEmpresa.socios || selectedEmpresa.socios_raw) && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Sócios
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedEmpresa.socios || selectedEmpresa.socios_raw}
                    </p>
                  </div>
                )}

                {/* Activity & Registration */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Atividade & Cadastro
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">CNAE Principal</label>
                      <p>{selectedEmpresa.cnae_fiscal || selectedEmpresa.cnae_codigo || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Natureza Jurídica</label>
                      <p>{selectedEmpresa.cod_natureza_juridica || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Porte</label>
                      <p>{selectedEmpresa.porte_empresa || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Matriz/Filial</label>
                      <p>{selectedEmpresa.matriz_filial || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Data de Abertura</label>
                      <p>{selectedEmpresa.data_inicio_atividade ? new Date(selectedEmpresa.data_inicio_atividade).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Situação Cadastral em</label>
                      <p>{selectedEmpresa.data_sit_cadastral ? new Date(selectedEmpresa.data_sit_cadastral).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                    {selectedEmpresa.cnaes_secundarios && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">CNAEs Secundários</label>
                        <p className="text-xs mt-1 whitespace-pre-wrap">{selectedEmpresa.cnaes_secundarios}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax Regime */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Regime Tributário
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Simples Nacional</label>
                      <Badge variant={['SIM', 'S'].includes(selectedEmpresa.opcao_simples?.toUpperCase() ?? '') ? 'default' : 'secondary'} className="mt-1">
                        {selectedEmpresa.opcao_simples || 'Não informado'}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">MEI</label>
                      <Badge variant={selectedEmpresa.opcao_mei === 'SIM' ? 'default' : 'secondary'} className="mt-1">
                        {selectedEmpresa.opcao_mei || 'Não informado'}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Data Opção Simples</label>
                      <p>{selectedEmpresa.data_opcao_simples ? new Date(selectedEmpresa.data_opcao_simples).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Data Exclusão Simples</label>
                      <p>{selectedEmpresa.data_exclusao_simples ? new Date(selectedEmpresa.data_exclusao_simples).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Capital Social</label>
                      <p className="font-medium">
                        {selectedEmpresa.capital_social_empresa 
                          ? `R$ ${selectedEmpresa.capital_social_empresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Regime Provável</label>
                      <p className="font-medium text-primary">
                        {(() => {
                          const simples = selectedEmpresa.opcao_simples?.toUpperCase() ?? '';
                          const mei = selectedEmpresa.opcao_mei?.toUpperCase() ?? '';
                          const isMei = mei === 'SIM' || mei === 'S';
                          const isSimples = simples === 'SIM' || simples === 'S';
                          const isNotSimples = simples === 'NAO' || simples === 'N' || simples.includes('NAO OPTANTE');
                          
                          // MEI tem prioridade — no banco, MEI vem com opcao_simples='NAO OPTANTE'
                          if (isMei) return 'MEI (Microempreendedor Individual)';
                          if (isSimples) return 'Simples Nacional';
                          if (isNotSimples) {
                            const capital = selectedEmpresa.capital_social_empresa ?? 0;
                            const porte = selectedEmpresa.porte_empresa?.toUpperCase() ?? '';
                            if (capital > 78_000_000) return 'Lucro Real';
                            if (capital > 4_800_000 || porte === 'DEMAIS') return 'Provável Lucro Real';
                            if (capital > 0) return 'Provável Lucro Presumido';
                            return 'Lucro Presumido ou Real';
                          }
                          return 'Não determinado';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setShowDetails(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Limit Reached Dialog */}
        <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Limite Atingido
              </DialogTitle>
            </DialogHeader>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Você atingiu seu limite mensal</AlertTitle>
              <AlertDescription>
                Seu plano permite {stats?.monthlyLimit || 0} empresas por mês e você já utilizou todas.
                {stats?.extraCredits === 0 && ' Você também não possui créditos extras.'}
              </AlertDescription>
            </Alert>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowLimitDialog(false)}>
                Fechar
              </Button>
              <Button onClick={() => navigate('/creditos')}>
                <Coins className="h-4 w-4 mr-2" />
                Comprar Créditos
              </Button>
              <Button onClick={() => navigate('/precos')}>
                Upgrade de Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Filter Dialog */}
        <Dialog open={showSaveFilterDialog} onOpenChange={setShowSaveFilterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Salvar Filtro
              </DialogTitle>
              <DialogDescription>
                Dê um nome para este filtro para acessá-lo rapidamente depois.
              </DialogDescription>
            </DialogHeader>
            <Input 
              placeholder="Ex: Empresas de TI em SP"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveFilterDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </MainLayout>
    </SubscriptionBlocker>
  );
};

export default BuscarEmpresas;
