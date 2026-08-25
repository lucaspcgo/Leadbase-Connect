import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Building2, BarChart3, DollarSign, TrendingUp, 
  Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';

// Chart configurations
const chartColors = {
  primary: 'hsl(var(--primary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(142 76% 36%)',
  warning: 'hsl(38 92% 50%)',
  muted: 'hsl(var(--muted-foreground))',
  secondary: 'hsl(var(--secondary))',
};

const AdminDashboard = () => {
  const { empresaStats, consultaStats, userMetrics, paymentMetrics, loading } = useAdminMetrics();

  // Stats cards
  const stats = [
    { label: 'Total Usuários', value: userMetrics.totalUsers, icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Empresas na Base', value: empresaStats.total.toLocaleString(), icon: Building2, color: 'text-accent', bgColor: 'bg-accent/10' },
    { label: 'Receita Total', value: `R$ ${paymentMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Receita Mensal', value: `R$ ${paymentMetrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Assinaturas Ativas', value: paymentMetrics.activeSubscriptions, icon: Activity, color: 'text-accent', bgColor: 'bg-accent/10' },
    { label: 'Novos este mês', value: userMetrics.usersThisMonth, icon: Users, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  ];

  // Color palette for list items
  const LIST_COLORS = [chartColors.primary, chartColors.accent, chartColors.success, chartColors.warning, '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  const situacaoConfig = {
    value: { label: 'Quantidade', color: chartColors.primary },
  };

  const ufConfig = {
    value: { label: 'Empresas', color: chartColors.primary },
  };

  const receitaConfig = {
    receita: { label: 'Receita', color: chartColors.success },
  };

  const usuariosConfig = {
    usuarios: { label: 'Novos Usuários', color: chartColors.primary },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard Admin</h1>
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:pt-6 sm:px-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[250px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard Admin</h1>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Última atualização: {format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:pt-6 sm:px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-base sm:text-xl font-bold mt-1 truncate">{stat.value}</p>
                </div>
                <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor} shrink-0`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue and Registrations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Faturamento Mensal
            </CardTitle>
            <CardDescription>Pagamentos aprovados nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={receitaConfig} className="h-[250px] w-full">
              <AreaChart data={paymentMetrics.revenueByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColors.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `R$ ${Number(value).toLocaleString()}`} />} />
                <Area 
                  type="monotone" 
                  dataKey="receita" 
                  stroke={chartColors.success} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorReceita)" 
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Registrations Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Novos Cadastros
            </CardTitle>
            <CardDescription>Registros nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={usuariosConfig} className="h-[250px] w-full">
              <LineChart data={userMetrics.registrationTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" interval={4} />
                <YAxis className="text-xs" allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="usuarios" 
                  stroke={chartColors.primary} 
                  strokeWidth={2}
                  dot={{ fill: chartColors.primary, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Empresas Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Empresas by UF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Empresas por UF
            </CardTitle>
            <CardDescription>Top 10 estados</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ufConfig} className="h-[280px] w-full">
              <BarChart data={empresaStats.byUF} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={35} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill={chartColors.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Empresas by Situação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Situação Cadastral
            </CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {empresaStats.bySituacao.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
              {empresaStats.bySituacao.map((item, i) => {
                const max = Math.max(...empresaStats.bySituacao.map(s => s.value));
                const pct = max > 0 ? (item.value / max) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">{item.value.toLocaleString()}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Empresas by Porte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Porte das Empresas
            </CardTitle>
            <CardDescription>Distribuição por tamanho</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {empresaStats.byPorte.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
              {empresaStats.byPorte.map((item, i) => {
                const max = Math.max(...empresaStats.byPorte.map(s => s.value));
                const pct = max > 0 ? (item.value / max) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">{item.value.toLocaleString()}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users and Financial Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Usuários por Papel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userMetrics.usersByRole.map((item, i) => {
                const total = userMetrics.usersByRole.reduce((s, r) => s + r.value, 0);
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: LIST_COLORS[i % LIST_COLORS.length] }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{item.value} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Users by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Status de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userMetrics.usersByStatus.map((item, i) => {
                const color = item.name === 'Ativos' ? chartColors.success : item.name === 'Bloqueados' ? '#ef4444' : chartColors.warning;
                const total = userMetrics.usersByStatus.reduce((s, r) => s + r.value, 0);
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{item.value} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMetrics.subscriptionsByStatus.length === 0 && <p className="text-sm text-muted-foreground">Sem assinaturas</p>}
              {paymentMetrics.subscriptionsByStatus.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: LIST_COLORS[i % LIST_COLORS.length] }} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">{item.value}x</span>
                    <span className="ml-2 font-semibold">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payments by Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMetrics.paymentsByMethod.length === 0 && <p className="text-sm text-muted-foreground">Sem pagamentos</p>}
              {paymentMetrics.paymentsByMethod.map((item, i) => {
                const total = paymentMetrics.paymentsByMethod.reduce((s, r) => s + r.value, 0);
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: LIST_COLORS[i % LIST_COLORS.length] }} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">{item.value}x ({pct.toFixed(0)}%)</span>
                      <span className="ml-2 font-semibold">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
