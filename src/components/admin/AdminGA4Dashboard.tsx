import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { useGA4Analytics } from '@/hooks/useGA4Analytics';
import { useGA4Config } from '@/hooks/useGA4Config';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  Target,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Activity,
  Settings
} from 'lucide-react';
import ConversionFunnel from './analytics/ConversionFunnel';
import AnalyticsExport from './analytics/AnalyticsExport';

type DateRange = 'today' | '7days' | '30days';

const AdminGA4Dashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const { analytics, loading, refetch } = useGA4Analytics(dateRange);
  const { config, loading: configLoading } = useGA4Config();

  const chartConfig = {
    users: {
      label: 'Usuários',
      color: 'hsl(var(--primary))',
    },
    sessions: {
      label: 'Sessões',
      color: 'hsl(var(--secondary))',
    },
    pageviews: {
      label: 'Pageviews',
      color: 'hsl(var(--accent))',
    },
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

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

  if (!configLoading && !config.enabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard Analytics</h1>
              <p className="text-muted-foreground">Métricas do Google Analytics 4</p>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link to="/admin/analytics/config">
              <Settings className="h-4 w-4 mr-2" />
              Configurar GA4
            </Link>
          </Button>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">GA4 não configurado</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Configure o Google Analytics 4 para começar a visualizar as métricas do seu SaaS.
            </p>
            <Button asChild>
              <Link to="/admin/analytics/config">Configurar GA4</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard Analytics</h1>
            <p className="text-muted-foreground">Métricas do Google Analytics 4</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <TabsList>
              <TabsTrigger value="today">Hoje</TabsTrigger>
              <TabsTrigger value="7days">7 dias</TabsTrigger>
              <TabsTrigger value="30days">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          <AnalyticsExport analytics={analytics} dateRange={dateRange} />
          <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/analytics/config">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{analytics.totalSessions}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{analytics.totalPageviews}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{analytics.engagementRate}%</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{analytics.totalConversions}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {analytics.eventCounts.reduce((sum, e) => sum + e.count, 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usuários por Dia</CardTitle>
            <CardDescription>Evolução de usuários no período</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics.dailyStats.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={analytics.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="var(--color-users)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-users)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="var(--color-sessions)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-sessions)' }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pageviews por Dia</CardTitle>
            <CardDescription>Visualizações de página no período</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics.dailyStats.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={analytics.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="pageviews" 
                    fill="var(--color-pageviews)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnel eventCounts={analytics.eventCounts} loading={loading} />

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Mais Acionados</CardTitle>
          <CardDescription>Ranking de eventos no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : analytics.eventCounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum evento registrado no período
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.eventCounts.slice(0, 10).map((event, index) => (
                <div 
                  key={event.event_name}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{formatEventName(event.event_name)}</span>
                  </div>
                  <Badge variant="secondary">{event.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGA4Dashboard;
