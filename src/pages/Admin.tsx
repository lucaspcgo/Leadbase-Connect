import { useState, useRef, useMemo, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresas, ImportReport } from '@/hooks/useEmpresas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { mockDashboardMetrics } from '@/data/mockData';
import { parseEmpresaData, ParseResult, formatCnpj, detectSeparator, shouldIgnoreHeader, mapHeader, normalizeCnpj, parseDate, parseNumber } from '@/lib/empresaParser';
import { Empresa } from '@/types';
import AdminEmpresasList from '@/components/admin/AdminEmpresasList';
import AdminEmpresaDetails from '@/components/admin/AdminEmpresaDetails';
import AdminEmpresaEdit from '@/components/admin/AdminEmpresaEdit';
import AdminSocios from '@/components/admin/AdminSocios';
import AdminCategorias from '@/components/admin/AdminCategorias';
import AdminTags from '@/components/admin/AdminTags';
import AdminUsersList from '@/components/admin/AdminUsersList';
import AdminUserDetails from '@/components/admin/AdminUserDetails';
import AdminUserEdit from '@/components/admin/AdminUserEdit';
import AdminPagamentos from '@/components/admin/AdminPagamentos';
import AdminConfiguracoes from '@/components/admin/AdminConfiguracoes';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminChamados from '@/components/admin/AdminChamados';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  LayoutDashboard, 
  Upload, 
  ClipboardPaste, 
  Users, 
  CreditCard, 
  BarChart3,
  Database,
  ArrowLeft,
  Building2,
  TrendingUp,
  Coins,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Trash2,
  Search,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Clock
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

import { Settings, MessageCircle, Mail } from 'lucide-react';

import { Menu, X as XIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

import { FileText } from 'lucide-react';
import AdminConteudo from '@/components/admin/AdminConteudo';
import AdminCnaes from '@/components/admin/AdminCnaes';
import AdminPlanos from '@/components/admin/AdminPlanos';
import ImportHistory from '@/components/admin/ImportHistory';
import ImportErrorsDetail from '@/components/admin/ImportErrorsDetail';
import AdminSmtpConfig from '@/components/admin/AdminSmtpConfig';
import { useImportLogs } from '@/hooks/useImportLogs';

import { Briefcase, LineChart, Ticket, UserPlus, Bell, FileEdit, Zap, Globe, Facebook } from 'lucide-react';
import AdminGA4Config from '@/components/admin/AdminGA4Config';
import AdminGA4Dashboard from '@/components/admin/AdminGA4Dashboard';
import AdminMetaPixelConfig from '@/components/admin/AdminMetaPixelConfig';
import AdminCupons from '@/components/admin/AdminCupons';
import AdminAfiliados from '@/components/admin/AdminAfiliados';
import AdminNotificacoes from '@/components/admin/AdminNotificacoes';
import AdminNotificationTemplates from '@/components/admin/AdminNotificationTemplates';
import AdminEnriquecimento from '@/components/admin/AdminEnriquecimento';
import AdminApiIntegracoes from '@/components/admin/AdminApiIntegracoes';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/importar', icon: Upload, label: 'Importar' },
  { to: '/admin/colar', icon: ClipboardPaste, label: 'Colar Dados' },
  { to: '/admin/empresas', icon: Building2, label: 'Empresas' },
  { to: '/admin/cnaes', icon: Briefcase, label: 'CNAEs' },
  { to: '/admin/categorias', icon: BarChart3, label: 'Categorias' },
  { to: '/admin/tags', icon: BarChart3, label: 'Tags' },
  { to: '/admin/planos', icon: CreditCard, label: 'Planos' },
  { to: '/admin/cupons', icon: Ticket, label: 'Cupons' },
  { to: '/admin/afiliados', icon: UserPlus, label: 'Afiliados' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuários' },
  { to: '/admin/chamados', icon: MessageCircle, label: 'Chamados' },
  { to: '/admin/pagamentos', icon: DollarSign, label: 'Pagamentos' },
  { to: '/admin/analytics', icon: LineChart, label: 'Analytics (GA4)' },
  { to: '/admin/meta-pixel', icon: Facebook, label: 'Pixel da Meta', badge: 'Novo' },
  { to: '/admin/notificacoes', icon: Bell, label: 'Notificações' },
  { to: '/admin/templates', icon: FileEdit, label: 'Templates' },
  { to: '/admin/enriquecimento', icon: Zap, label: 'Enriquecimento' },
  { to: '/admin/conteudo', icon: FileText, label: 'Conteúdo' },
  { to: '/admin/api', icon: Globe, label: 'API & Integrações' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Pagamentos' },
  { to: '/admin/email', icon: Mail, label: 'Email (SMTP)' },
];

const AdminSidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();

  return (
    <>
      <Link to="/" className="flex items-center gap-2 mb-8" onClick={onNavigate}>
        <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
          <Database className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg">Admin</span>
      </Link>
      <nav className="space-y-1">
        {adminLinks.map(link => {
          const isActive = link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50'
              }`}
            >
              <link.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{link.label}</span>
              {'badge' in link && link.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 pt-4 border-t border-sidebar-border">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao app
        </Link>
      </div>
    </>
  );
};

const AdminSidebar = () => {
  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-sidebar text-sidebar-foreground h-screen sticky top-0 shrink-0">
      <div className="flex-1 overflow-y-auto p-4">
        <AdminSidebarContent />
      </div>
    </aside>
  );
};

const AdminMobileHeader = () => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="md:hidden sticky top-0 z-50 flex items-center justify-between p-4 bg-sidebar border-b">
      <Link to="/" className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
          <Database className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold">Admin</span>
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground p-0 overflow-y-auto">
          <div className="p-4">
            <AdminSidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// AdminDashboard moved to src/components/admin/AdminDashboard.tsx

const AdminColar = () => {
  const [data, setData] = useState('');
  const [duplicateMode, setDuplicateMode] = useState<'update' | 'skip'>('update');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const { toast } = useToast();
  const { addEmpresas, importProgress } = useEmpresas({ autoFetch: false });
  const { createLog } = useImportLogs();

  // Format time in mm:ss
  const formatTime = (ms: number | null) => {
    if (ms === null || ms <= 0) return '--:--';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Prevent accidental page close during import
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isImporting) {
        e.preventDefault();
        e.returnValue = 'A importação ainda está em andamento. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isImporting]);

  // Handle navigation interception
  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (isImporting) {
      e.preventDefault();
      setPendingNavigation(to);
      setShowExitDialog(true);
    }
  };

  const confirmExit = () => {
    setIsImporting(false);
    setShowExitDialog(false);
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    }
  };

  // Parser flexível que aceita qualquer formato de dados
  const parseFlexibleData = (rawData: string): Partial<Empresa>[] => {
    const lines = rawData.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) return [];

    const separator = detectSeparator(rawData);
    const headerLine = lines[0];
    const rawHeaders = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Mapear headers para campos da Empresa
    const fieldMapping: (keyof Empresa | null)[] = rawHeaders.map(header => {
      if (shouldIgnoreHeader(header)) return null;
      return mapHeader(header);
    });

    // Identificar colunas não mapeadas para campos extras
    const extraColumns: { index: number; name: string }[] = [];
    rawHeaders.forEach((header, index) => {
      if (!shouldIgnoreHeader(header) && !fieldMapping[index]) {
        extraColumns.push({ index, name: header });
      }
    });

    const empresas: Partial<Empresa>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCsvLine(line, separator);
      
      const empresa: Partial<Empresa> = {};
      let extraData: Record<string, string> = {};
      
      for (let j = 0; j < values.length; j++) {
        const value = values[j]?.trim().replace(/^["']|["']$/g, '') || '';
        
        const field = fieldMapping[j];
        if (field) {
          if (field === 'cnpj') {
            if (value) {
              empresa.cnpj = normalizeCnpj(value);
            }
          } else if (field.includes('data_')) {
            (empresa as any)[field] = parseDate(value);
          } else if (field === 'capital_social_empresa') {
            empresa.capital_social_empresa = parseNumber(value);
          } else if (field === 'telefone1_celular' || field === 'telefone2_celular') {
            (empresa as any)[field] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'sim';
          } else if (field === 'cnae_codigo') {
            const digits = value.replace(/\D/g, '');
            empresa.cnae_codigo = digits.padStart(7, '0');
          } else if (field === 'socios_raw' || field === 'socios') {
            // Sempre salvar em socios_raw para manter o texto original
            empresa.socios_raw = value || null;
            empresa.socios = value || null;
          } else {
            (empresa as any)[field] = value || null;
          }
        } else if (value && j < rawHeaders.length) {
          // Salvar dados de colunas não mapeadas
          const headerName = rawHeaders[j];
          if (headerName && !shouldIgnoreHeader(headerName)) {
            extraData[headerName] = value;
          }
        }
      }

      // Se houver dados extras, adicionar como observações ou campo especial
      if (Object.keys(extraData).length > 0) {
        const extraInfo = Object.entries(extraData)
          .map(([key, val]) => `${key}: ${val}`)
          .join(' | ');
        
        // Adicionar aos dados extras existentes ou criar novo
        if (empresa.complemento) {
          empresa.complemento = `${empresa.complemento} | EXTRAS: ${extraInfo}`;
        } else {
          empresa.complemento = `EXTRAS: ${extraInfo}`;
        }
      }

      // Se não tem CNPJ, gerar um temporário baseado na linha
      if (!empresa.cnpj) {
        const tempCnpj = `TEMP${Date.now()}${i}`.slice(0, 14).padStart(14, '0');
        empresa.cnpj = tempCnpj;
      }

      empresas.push(empresa);
    }

    return empresas;
  };

  // Parser para linha CSV
  const parseCsvLine = (line: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const handleDirectImport = async () => {
    if (!data.trim()) {
      toast({ title: 'Erro', description: 'Cole os dados primeiro.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);

    try {
      const empresas = parseFlexibleData(data);
      
      if (empresas.length === 0) {
        toast({ 
          title: 'Aviso', 
          description: 'Nenhuma empresa encontrada nos dados colados.',
          variant: 'destructive' 
        });
        setIsImporting(false);
        return;
      }

      // Start import - progress will be tracked via importProgress state
      toast({ 
        title: 'Importação iniciada', 
        description: `Processando ${empresas.length} empresas em lotes...` 
      });

      const report = await addEmpresas(empresas as Empresa[], duplicateMode);
      setImportReport(report);
      
      // Log the import
      await createLog({
        source: 'paste',
        total_rows: report.total,
        inserted: report.inserted,
        updated: report.updated,
        skipped: report.skipped,
        errors_count: report.errors.length,
        duplicate_mode: duplicateMode,
      });
      
      toast({ 
        title: 'Importação concluída!', 
        description: `${report.inserted} inseridas, ${report.updated} atualizadas. Os filtros de busca foram atualizados automaticamente.`,
        duration: 8000,
      });
      
      setData('');
    } catch (error) {
      toast({ 
        title: 'Erro na importação', 
        description: 'Ocorreu um erro ao processar os dados.',
        variant: 'destructive' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setData('');
    setImportReport(null);
  };

  const previewData = () => {
    if (!data.trim()) return [];
    const empresas = parseFlexibleData(data);
    return empresas.slice(0, 5);
  };

  const preview = data.trim() ? previewData() : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Colar Dados</h1>
      
      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importação em andamento</AlertDialogTitle>
            <AlertDialogDescription>
              A importação ainda está em andamento. Se você sair agora, o processo será interrompido e os dados restantes não serão importados.
              <br /><br />
              <strong>Progresso atual:</strong> {importProgress?.processed || 0} de {importProgress?.total || 0} empresas processadas.
              <br />
              <strong>Faltam:</strong> {(importProgress?.total || 0) - (importProgress?.processed || 0)} empresas
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              Continuar Importação
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive hover:bg-destructive/90">
              Sair e Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress indicator during import */}
      {isImporting && importProgress && !importProgress.isComplete && (
        <Card className="mb-4 border-primary/50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Importando dados em lotes...
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tempo restante: {formatTime(importProgress.estimatedTimeRemaining)}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main progress slider */}
              <div className="relative">
                <Slider
                  value={[(importProgress.processed / importProgress.total) * 100]}
                  max={100}
                  step={0.1}
                  disabled
                  className="cursor-default"
                />
              </div>
              
              {/* Progress details */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {importProgress.processed} de {importProgress.total} processados
                </span>
                <span className="font-medium text-primary">
                  {Math.round((importProgress.processed / importProgress.total) * 100)}%
                </span>
              </div>

              {/* Remaining count */}
              <div className="flex items-center justify-center p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {importProgress.total - importProgress.processed}
                  </p>
                  <p className="text-sm text-muted-foreground">empresas restantes</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="p-2 bg-muted rounded">
                  <span className="font-bold text-green-600">{importProgress.inserted}</span>
                  <span className="text-muted-foreground ml-1">inseridas</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="font-bold text-yellow-600">{importProgress.updated}</span>
                  <span className="text-muted-foreground ml-1">atualizadas</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="font-bold">{importProgress.skipped}</span>
                  <span className="text-muted-foreground ml-1">ignoradas</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="font-bold text-destructive">{importProgress.errors}</span>
                  <span className="text-muted-foreground ml-1">erros</span>
                </div>
              </div>

              {/* Warning message */}
              <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Não feche esta página durante a importação. Os dados restantes não serão salvos.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {importReport ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Importação Concluída
            </CardTitle>
            <CardDescription className="text-success font-medium">
              A base de dados e os filtros de busca (CNAE, Municípios) foram atualizados em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">{importReport.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-success">{importReport.inserted}</p>
                <p className="text-sm text-muted-foreground">Inseridas</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-warning">{importReport.updated}</p>
                <p className="text-sm text-muted-foreground">Atualizadas</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-muted-foreground">{importReport.skipped}</p>
                <p className="text-sm text-muted-foreground">Ignoradas</p>
              </div>
            </div>
            
            {importReport.errors.length > 0 && (
              <ImportErrorsDetail 
                errors={importReport.errors}
              />
            )}
            
            <div className="flex gap-2">
              <Button onClick={resetForm}>Nova Importação</Button>
              <Link to="/admin/empresas">
                <Button variant="outline">Ver Empresas</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5" />
                Cole os dados das empresas
              </CardTitle>
              <CardDescription>
                Cole os dados copiados do Excel ou CSV. O sistema vai importar automaticamente em lotes de 50, 
                permitindo ver o progresso em tempo real.
                <br />
                <span className="text-primary font-medium">Upload otimizado - suporta milhares de registros!</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Cole aqui os dados copiados do Excel (formato CSV ou TSV)...&#10;&#10;Exemplo:&#10;CNPJ;RAZAO_SOCIAL;NOME_FANTASIA;UF;MUNICIPIO;CAMPO_EXTRA&#10;12345678000190;EMPRESA LTDA;NOME FANTASIA;SP;SAO PAULO;INFO ADICIONAL"
                className="min-h-[200px] font-mono text-sm"
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={isImporting}
              />
              
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Duplicados (mesmo CNPJ):</span>
                  <Select value={duplicateMode} onValueChange={(v: 'update' | 'skip') => setDuplicateMode(v)} disabled={isImporting}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="update">Atualizar</SelectItem>
                      <SelectItem value="skip">Ignorar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleDirectImport} 
                  disabled={!data.trim() || isImporting}
                  className="ml-auto"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    'Importar Agora'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Prévia dos dados (primeiras 5 linhas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>Nome Fantasia</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead>Município</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Sócios</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((emp, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">
                            {emp.cnpj ? (emp.cnpj.startsWith('TEMP') ? 
                              <Badge variant="outline" className="text-xs">Auto-gerado</Badge> : 
                              formatCnpj(emp.cnpj)) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{emp.razao_social || '-'}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{emp.nome_fantasia || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={emp.sit_cadastral === 'ATIVA' ? 'default' : 'secondary'} className="text-xs">
                              {emp.sit_cadastral || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{emp.uf || '-'}</TableCell>
                          <TableCell className="max-w-[100px] truncate">{emp.municipio || '-'}</TableCell>
                          <TableCell className="text-xs">{emp.ddd_telefone_1 || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{emp.correio_eletronico || emp.email || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">
                            {emp.socios_raw || emp.socios || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total de linhas detectadas: {parseFlexibleData(data).length}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Import History */}
      <div className="mt-8">
        <ImportHistory />
      </div>
    </div>
  );
};

const AdminImportar = () => {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<'update' | 'skip'>('skip');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { addEmpresas, importProgress } = useEmpresas({ autoFetch: false });
  const { createLog } = useImportLogs();

  // Formatar tempo restante
  const formatTime = (ms: number | null): string => {
    if (ms === null || ms <= 0) return 'Calculando...';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Agrupar empresas por UF
  const empresasByUF = useMemo(() => {
    if (!parseResult) return {};
    const grouped: Record<string, typeof parseResult.empresas> = {};
    parseResult.empresas.forEach(emp => {
      const uf = emp.uf || 'SEM UF';
      if (!grouped[uf]) grouped[uf] = [];
      grouped[uf].push(emp);
    });
    // Ordenar por UF
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {} as Record<string, typeof parseResult.empresas>);
  }, [parseResult]);

  const ufList = Object.keys(empresasByUF);
  const totalSelected = selectedUFs.reduce((acc, uf) => acc + (empresasByUF[uf]?.length || 0), 0);

  // Empresas filtradas pelos estados selecionados
  const filteredEmpresas = useMemo(() => {
    if (selectedUFs.length === 0) return [];
    return selectedUFs.flatMap(uf => empresasByUF[uf] || []);
  }, [selectedUFs, empresasByUF]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportReport(null);
    setSelectedUFs([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseEmpresaData(content);
      setParseResult(result);
      
      if (result.errors.length > 0 && result.empresas.length === 0) {
        toast({ title: 'Erro na validação', description: result.errors[0].message, variant: 'destructive' });
      } else {
        toast({ 
          title: 'Arquivo processado', 
          description: `${result.empresas.length} empresas válidas de ${result.totalRows} linhas.` 
        });
      }
    };
    reader.onerror = () => {
      toast({ title: 'Erro', description: 'Falha ao ler o arquivo.', variant: 'destructive' });
    };
    reader.readAsText(file);
  };

  const handleToggleUF = (uf: string) => {
    setSelectedUFs(prev => 
      prev.includes(uf) 
        ? prev.filter(u => u !== uf) 
        : [...prev, uf]
    );
  };

  const handleSelectAllUFs = () => {
    if (selectedUFs.length === ufList.length) {
      setSelectedUFs([]);
    } else {
      setSelectedUFs([...ufList]);
    }
  };

  const handleImport = async () => {
    if (filteredEmpresas.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um estado para importar.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    
    try {
      const report = await addEmpresas(filteredEmpresas as Empresa[], duplicateMode);
      setImportReport(report);

      // Log the import
      await createLog({
        filename: fileName,
        source: 'file',
        total_rows: report.total,
        inserted: report.inserted,
        updated: report.updated,
        skipped: report.skipped,
        errors_count: report.errors.length,
        ufs_imported: selectedUFs,
        duplicate_mode: duplicateMode,
      });
      
      toast({ 
        title: 'Importação concluída!', 
        description: `${report.inserted} inseridas, ${report.updated} atualizadas, ${report.skipped} ignoradas. Os filtros de busca foram atualizados automaticamente.`,
        duration: 8000,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setFileName('');
    setParseResult(null);
    setImportReport(null);
    setSelectedUFs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Importar Planilha</h1>
      
      {/* Barra de progresso durante importação */}
      {isImporting && importProgress && !importProgress.isComplete && (
        <Card className="mb-4 border-primary/50 shadow-lg animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Importando dados em lotes...
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tempo restante: {formatTime(importProgress.estimatedTimeRemaining)}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bar */}
              <Progress 
                value={(importProgress.processed / importProgress.total) * 100} 
                className="h-3"
              />
              
              {/* Progress details */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {importProgress.processed.toLocaleString('pt-BR')} de {importProgress.total.toLocaleString('pt-BR')} processados
                </span>
                <span className="font-medium text-primary">
                  {Math.round((importProgress.processed / importProgress.total) * 100)}%
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3 pt-2">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-primary">{importProgress.total.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-xl font-bold text-success">{importProgress.inserted.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Inseridas</p>
                </div>
                <div className="text-center p-3 bg-warning/10 rounded-lg">
                  <p className="text-xl font-bold text-warning">{importProgress.updated.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Atualizadas</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-muted-foreground">{importProgress.skipped.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Ignoradas</p>
                </div>
              </div>

              {/* Remaining count */}
              <div className="flex items-center justify-center p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {(importProgress.total - importProgress.processed).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">empresas restantes</p>
                </div>
              </div>

              {importProgress.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{importProgress.errors} erro(s) encontrado(s)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {importReport ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Importação Concluída
            </CardTitle>
            <CardDescription className="text-success font-medium">
              A base de dados e os filtros de busca (CNAE, Municípios) foram atualizados em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">{importReport.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-success">{importReport.inserted}</p>
                <p className="text-sm text-muted-foreground">Inseridas</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-warning">{importReport.updated}</p>
                <p className="text-sm text-muted-foreground">Atualizadas</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-muted-foreground">{importReport.skipped}</p>
                <p className="text-sm text-muted-foreground">Ignoradas</p>
              </div>
            </div>
            
            {importReport.errors.length > 0 && (
              <ImportErrorsDetail 
                errors={importReport.errors}
              />
            )}
            
            <Button onClick={resetForm}>Nova Importação</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div 
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {fileName ? (
                  <>
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium mb-2">{fileName}</p>
                    <p className="text-muted-foreground">Clique para selecionar outro arquivo</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Arraste um arquivo CSV ou clique para selecionar</p>
                    <p className="text-muted-foreground mb-4">Formatos suportados: .csv, .txt, .tsv</p>
                    <Button variant="outline">Selecionar Arquivo</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seleção por Estado */}
          {parseResult && parseResult.empresas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Selecionar Estados para Importar
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Selecione os estados que deseja importar. Importar por estado torna o processo mais leve.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="selectAll"
                      checked={selectedUFs.length === ufList.length && ufList.length > 0}
                      onCheckedChange={handleSelectAllUFs}
                    />
                    <label htmlFor="selectAll" className="text-sm cursor-pointer">
                      Selecionar todos ({parseResult.empresas.length} empresas)
                    </label>
                  </div>
                  {selectedUFs.length > 0 && (
                    <Badge variant="default">
                      {selectedUFs.length} estado(s) - {totalSelected} empresas
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-auto p-1">
                  {ufList.map(uf => (
                    <div 
                      key={uf}
                      onClick={() => handleToggleUF(uf)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedUFs.includes(uf) 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={selectedUFs.includes(uf)}
                          onCheckedChange={() => handleToggleUF(uf)}
                        />
                        <span className="font-medium">{uf}</span>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {empresasByUF[uf]?.length || 0}
                      </Badge>
                    </div>
                  ))}
                </div>

                {selectedUFs.length > 0 && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Duplicados (mesmo CNPJ):</span>
                      <Select value={duplicateMode} onValueChange={(v: 'update' | 'skip') => setDuplicateMode(v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="skip">Ignorar</SelectItem>
                          <SelectItem value="update">Atualizar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleImport} 
                      className="ml-auto"
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>Importar {totalSelected.toLocaleString('pt-BR')} empresas</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {parseResult.empresas.length > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  Resultado da Validação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <Badge variant="outline">{parseResult.totalRows} linhas</Badge>
                  <Badge variant="default">{parseResult.empresas.length} válidas</Badge>
                  {parseResult.errors.length > 0 && (
                    <Badge variant="destructive">{parseResult.errors.length} erros</Badge>
                  )}
                  {parseResult.unmappedColumns.length > 0 && (
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      {parseResult.unmappedColumns.length} colunas não mapeadas
                    </Badge>
                  )}
                </div>
                
                {/* Detailed errors and unmapped columns */}
                {(parseResult.errors.length > 0 || parseResult.unmappedColumns.length > 0) && (
                  <div className="mb-4">
                    <ImportErrorsDetail 
                      errors={parseResult.errors}
                      unmappedColumns={parseResult.unmappedColumns}
                      mappedHeaders={parseResult.mappedHeaders}
                    />
                  </div>
                )}
                
                {filteredEmpresas.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Prévia (primeiras 10 empresas selecionadas):</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>CNPJ</TableHead>
                            <TableHead>Razão Social</TableHead>
                            <TableHead>Nome Fantasia</TableHead>
                            <TableHead>UF</TableHead>
                            <TableHead>Município</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmpresas.slice(0, 10).map((emp, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{emp.cnpj ? formatCnpj(emp.cnpj) : '-'}</TableCell>
                              <TableCell>{emp.razao_social || '-'}</TableCell>
                              <TableCell>{emp.nome_fantasia || '-'}</TableCell>
                              <TableCell>{emp.uf || '-'}</TableCell>
                              <TableCell>{emp.municipio || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Import History */}
      <div className="mt-8">
        <ImportHistory />
      </div>
    </div>
  );
};

const AdminEmpresas = () => {
  const { empresas, deleteEmpresa, clearEmpresas } = useEmpresas();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const { toast } = useToast();
  const itemsPerPage = 20;

  const filteredEmpresas = empresas.filter(emp => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      emp.cnpj.includes(search.replace(/\D/g, '')) ||
      emp.razao_social?.toLowerCase().includes(searchLower) ||
      emp.nome_fantasia?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredEmpresas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmpresas = filteredEmpresas.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = (id: number) => {
    deleteEmpresa(id);
    toast({ title: 'Empresa excluída', description: 'A empresa foi removida da base.' });
  };

  const handleClearAll = () => {
    clearEmpresas();
    toast({ title: 'Base limpa', description: 'Todas as empresas foram removidas.' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">{empresas.length} empresas na base</p>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Base
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar toda a base?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá remover todas as {empresas.length} empresas da base. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por CNPJ, Razão Social ou Nome Fantasia..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmpresas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa na base'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmpresas.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono">{formatCnpj(emp.cnpj)}</TableCell>
                      <TableCell>{emp.razao_social || '-'}</TableCell>
                      <TableCell>{emp.nome_fantasia || '-'}</TableCell>
                      <TableCell>{emp.uf || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={emp.sit_cadastral === 'ATIVA' ? 'default' : 'secondary'}>
                          {emp.sit_cadastral || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedEmpresa(emp)}>
                          <Eye className="h-4 w-4" />
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
                                Deseja excluir {emp.razao_social || emp.cnpj}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(emp.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEmpresas.length)} de {filteredEmpresas.length}
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

      {/* Detail Modal */}
      {selectedEmpresa && (
        <AlertDialog open={!!selectedEmpresa} onOpenChange={() => setSelectedEmpresa(null)}>
          <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedEmpresa.razao_social || 'Detalhes da Empresa'}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>CNPJ:</strong> {formatCnpj(selectedEmpresa.cnpj)}</div>
              <div><strong>Nome Fantasia:</strong> {selectedEmpresa.nome_fantasia || '-'}</div>
              <div><strong>Situação:</strong> {selectedEmpresa.sit_cadastral || '-'}</div>
              <div><strong>Porte:</strong> {selectedEmpresa.porte_empresa || '-'}</div>
              <div><strong>UF:</strong> {selectedEmpresa.uf || '-'}</div>
              <div><strong>Município:</strong> {selectedEmpresa.municipio || '-'}</div>
              <div><strong>Bairro:</strong> {selectedEmpresa.bairro || '-'}</div>
              <div><strong>CEP:</strong> {selectedEmpresa.cep || '-'}</div>
              <div className="col-span-2"><strong>Endereço:</strong> {selectedEmpresa.logradouro || '-'}, {selectedEmpresa.numero || 's/n'}</div>
              <div><strong>Telefone 1:</strong> {selectedEmpresa.ddd_telefone_1 || '-'}</div>
              <div><strong>Telefone 2:</strong> {selectedEmpresa.ddd_telefone_2 || '-'}</div>
              <div className="col-span-2"><strong>Email:</strong> {selectedEmpresa.email || selectedEmpresa.correio_eletronico || '-'}</div>
              <div><strong>CNAE:</strong> {selectedEmpresa.cnae_codigo || '-'}</div>
              <div><strong>Capital Social:</strong> {selectedEmpresa.capital_social_empresa ? `R$ ${selectedEmpresa.capital_social_empresa.toLocaleString()}` : '-'}</div>
              <div><strong>Simples:</strong> {selectedEmpresa.opcao_simples || '-'}</div>
              <div><strong>MEI:</strong> {selectedEmpresa.opcao_mei || '-'}</div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

const Admin = () => {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Carregando acesso administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminMobileHeader />
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/colar" element={<AdminColar />} />
            <Route path="/importar" element={<AdminImportar />} />
            <Route path="/empresas" element={<AdminEmpresasList />} />
            <Route path="/empresas/:cnpj" element={<AdminEmpresaDetails />} />
            <Route path="/empresas/:cnpj/editar" element={<AdminEmpresaEdit />} />
            <Route path="/empresas/:cnpj/socios" element={<AdminSocios />} />
            <Route path="/cnaes" element={<AdminCnaes />} />
            <Route path="/categorias" element={<AdminCategorias />} />
            <Route path="/tags" element={<AdminTags />} />
            <Route path="/planos" element={<AdminPlanos />} />
            <Route path="/cupons" element={<AdminCupons />} />
            <Route path="/afiliados" element={<AdminAfiliados />} />
            <Route path="/usuarios" element={<AdminUsersList />} />
            <Route path="/usuarios/:userId" element={<AdminUserDetails />} />
            <Route path="/usuarios/:userId/editar" element={<AdminUserEdit />} />
            <Route path="/chamados" element={<AdminChamados />} />
            <Route path="/pagamentos" element={<AdminPagamentos />} />
            <Route path="/analytics" element={<AdminGA4Dashboard />} />
            <Route path="/analytics/config" element={<AdminGA4Config />} />
            <Route path="/meta-pixel" element={<AdminMetaPixelConfig />} />
            <Route path="/notificacoes" element={<AdminNotificacoes />} />
            <Route path="/templates" element={<AdminNotificationTemplates />} />
            <Route path="/configuracoes" element={<AdminConfiguracoes />} />
            <Route path="/email" element={<AdminSmtpConfig />} />
            <Route path="/enriquecimento" element={<AdminEnriquecimento />} />
            <Route path="/conteudo" element={<AdminConteudo />} />
            <Route path="/api" element={<AdminApiIntegracoes />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Admin;
