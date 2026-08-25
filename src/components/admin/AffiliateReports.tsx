import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAffiliates } from '@/hooks/useAffiliates';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, TrendingUp, Users, DollarSign, Percent } from 'lucide-react';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

const AffiliateReports = () => {
  const { affiliates, referrals, commissions, stats, loading, fetchReferrals, fetchCommissions } = useAffiliates();

  // Calculate monthly data for the last 6 months
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthReferrals = referrals.filter(r => 
        isWithinInterval(new Date(r.created_at), { start, end })
      );
      
      const monthConversions = monthReferrals.filter(r => r.status === 'CONVERTED');
      
      const monthCommissions = commissions.filter(c => 
        isWithinInterval(new Date(c.created_at), { start, end })
      );
      
      const totalCommissionAmount = monthCommissions.reduce(
        (sum, c) => sum + Number(c.commission_amount), 0
      );
      
      const paidCommissions = monthCommissions
        .filter(c => c.status === 'PAID')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0);

      months.push({
        month: format(date, 'MMM', { locale: ptBR }),
        fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
        referrals: monthReferrals.length,
        conversions: monthConversions.length,
        conversionRate: monthReferrals.length > 0 
          ? ((monthConversions.length / monthReferrals.length) * 100).toFixed(1)
          : 0,
        totalCommissions: totalCommissionAmount,
        paidCommissions,
      });
    }
    return months;
  }, [referrals, commissions]);

  // Top affiliates by earnings
  const topAffiliates = useMemo(() => {
    return [...affiliates]
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, 5)
      .map(a => ({
        name: a.user_name || a.referral_code,
        totalEarnings: a.total_earnings,
        referrals: a.total_referrals,
        pendingEarnings: a.pending_earnings,
      }));
  }, [affiliates]);

  // Commission status distribution
  const commissionStatusData = useMemo(() => {
    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      PAID: 0,
      CANCELLED: 0,
    };
    
    commissions.forEach(c => {
      if (statusCounts.hasOwnProperty(c.status)) {
        statusCounts[c.status as keyof typeof statusCounts]++;
      }
    });

    return [
      { name: 'Pendente', value: statusCounts.PENDING, color: '#ffc658' },
      { name: 'Aprovado', value: statusCounts.APPROVED, color: '#8884d8' },
      { name: 'Pago', value: statusCounts.PAID, color: '#82ca9d' },
      { name: 'Cancelado', value: statusCounts.CANCELLED, color: '#ff7300' },
    ].filter(s => s.value > 0);
  }, [commissions]);

  // Calculate overall metrics
  const metrics = useMemo(() => {
    const totalReferrals = referrals.length;
    const convertedReferrals = referrals.filter(r => r.status === 'CONVERTED').length;
    const overallConversionRate = totalReferrals > 0 
      ? ((convertedReferrals / totalReferrals) * 100).toFixed(1)
      : '0';
    
    const avgCommissionRate = affiliates.length > 0
      ? (affiliates.reduce((sum, a) => sum + a.commission_rate, 0) / affiliates.length).toFixed(1)
      : '10';

    const avgEarningsPerAffiliate = affiliates.length > 0
      ? (affiliates.reduce((sum, a) => sum + a.total_earnings, 0) / affiliates.length).toFixed(2)
      : '0';

    return {
      overallConversionRate,
      avgCommissionRate,
      avgEarningsPerAffiliate,
    };
  }, [referrals, affiliates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Taxa de Conversão Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overallConversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              de todas as indicações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Comissão Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgCommissionRate}%</div>
            <p className="text-xs text-muted-foreground">
              taxa média dos afiliados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ganho Médio/Afiliado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.avgEarningsPerAffiliate}</div>
            <p className="text-xs text-muted-foreground">
              total por afiliado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Afiliados Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeAffiliates || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.totalAffiliates || 0} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Referrals & Conversions */}
        <Card>
          <CardHeader>
            <CardTitle>Indicações e Conversões Mensais</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'referrals' ? 'Indicações' : 'Conversões']}
                  labelFormatter={(label) => monthlyData.find(m => m.month === label)?.fullMonth || label}
                />
                <Legend formatter={(value) => value === 'referrals' ? 'Indicações' : 'Conversões'} />
                <Bar dataKey="referrals" fill="#8884d8" name="referrals" />
                <Bar dataKey="conversions" fill="#82ca9d" name="conversions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Commissions */}
        <Card>
          <CardHeader>
            <CardTitle>Comissões Mensais (R$)</CardTitle>
            <CardDescription>Total vs Pago por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`R$ ${Number(value).toFixed(2)}`]}
                  labelFormatter={(label) => monthlyData.find(m => m.month === label)?.fullMonth || label}
                />
                <Legend formatter={(value) => value === 'totalCommissions' ? 'Total Gerado' : 'Total Pago'} />
                <Line 
                  type="monotone" 
                  dataKey="totalCommissions" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="totalCommissions"
                />
                <Line 
                  type="monotone" 
                  dataKey="paidCommissions" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="paidCommissions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status das Comissões</CardTitle>
            <CardDescription>Situação atual de todas as comissões</CardDescription>
          </CardHeader>
          <CardContent>
            {commissionStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={commissionStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {commissionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhuma comissão registrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Affiliates */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Afiliados</CardTitle>
            <CardDescription>Por total de ganhos</CardDescription>
          </CardHeader>
          <CardContent>
            {topAffiliates.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAffiliates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Ganhos']}
                  />
                  <Bar dataKey="totalEarnings" fill="#82ca9d" name="Ganhos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum afiliado registrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conversão Mensal (%)</CardTitle>
          <CardDescription>Evolução da taxa de conversão ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Taxa de Conversão']}
                labelFormatter={(label) => monthlyData.find(m => m.month === label)?.fullMonth || label}
              />
              <Line 
                type="monotone" 
                dataKey="conversionRate" 
                stroke="#ffc658" 
                strokeWidth={2}
                dot={{ fill: '#ffc658' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateReports;
