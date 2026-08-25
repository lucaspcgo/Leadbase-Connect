import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyStats {
  date: string;
  users: number;
  sessions: number;
  pageviews: number;
}

interface EventCount {
  event_name: string;
  count: number;
}

interface AnalyticsData {
  totalUsers: number;
  totalSessions: number;
  totalPageviews: number;
  engagementRate: number;
  totalConversions: number;
  eventCounts: EventCount[];
  dailyStats: DailyStats[];
}

interface AnalyticsExportProps {
  analytics: AnalyticsData;
  dateRange: string;
}

const AnalyticsExport = ({ analytics, dateRange }: AnalyticsExportProps) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const formatEventName = (name: string) => {
    const translations: Record<string, string> = {
      page_view: 'Visualização de Página',
      login: 'Login',
      logout: 'Logout',
      sign_up: 'Cadastro',
      dashboard_access: 'Acesso ao Dashboard',
      button_click: 'Clique em Botão',
      conversion: 'Conversão',
      purchase: 'Compra',
      plan_upgrade: 'Upgrade de Plano',
      company_unlock: 'Desbloqueio de Empresa',
      search: 'Busca',
    };
    return translations[name] || name;
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'today': return 'Hoje';
      case '7days': return 'Últimos 7 dias';
      case '30days': return 'Últimos 30 dias';
      default: return dateRange;
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      // Create CSV content
      let csvContent = '';
      
      // Summary section
      csvContent += 'RESUMO DE ANALYTICS\n';
      csvContent += `Período,${getDateRangeLabel()}\n`;
      csvContent += `Exportado em,${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
      
      csvContent += 'MÉTRICAS GERAIS\n';
      csvContent += `Métrica,Valor\n`;
      csvContent += `Total de Usuários,${analytics.totalUsers}\n`;
      csvContent += `Total de Sessões,${analytics.totalSessions}\n`;
      csvContent += `Total de Pageviews,${analytics.totalPageviews}\n`;
      csvContent += `Taxa de Engajamento,${analytics.engagementRate}%\n`;
      csvContent += `Total de Conversões,${analytics.totalConversions}\n\n`;
      
      // Events section
      csvContent += 'EVENTOS\n';
      csvContent += 'Evento,Quantidade\n';
      analytics.eventCounts.forEach(event => {
        csvContent += `${formatEventName(event.event_name)},${event.count}\n`;
      });
      csvContent += '\n';
      
      // Daily stats section
      csvContent += 'ESTATÍSTICAS DIÁRIAS\n';
      csvContent += 'Data,Usuários,Sessões,Pageviews\n';
      analytics.dailyStats.forEach(day => {
        csvContent += `${format(new Date(day.date), 'dd/MM/yyyy', { locale: ptBR })},${day.users},${day.sessions},${day.pageviews}\n`;
      });

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Exportação concluída',
        description: 'Arquivo CSV baixado com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    setExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        dateRange: getDateRangeLabel(),
        summary: {
          totalUsers: analytics.totalUsers,
          totalSessions: analytics.totalSessions,
          totalPageviews: analytics.totalPageviews,
          engagementRate: analytics.engagementRate,
          totalConversions: analytics.totalConversions,
        },
        events: analytics.eventCounts.map(e => ({
          name: e.event_name,
          displayName: formatEventName(e.event_name),
          count: e.count,
        })),
        dailyStats: analytics.dailyStats,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Exportação concluída',
        description: 'Arquivo JSON baixado com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AnalyticsExport;
