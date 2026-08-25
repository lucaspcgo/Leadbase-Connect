import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Coupon } from '@/hooks/useCoupons';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, DollarSign, Percent, Ticket, Users, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  user_email: string;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  original_amount: number;
  created_at: string;
}

interface CouponUsageReportProps {
  coupons: Coupon[];
}

export const CouponUsageReport = ({ coupons }: CouponUsageReportProps) => {
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [loadingUsages, setLoadingUsages] = useState(true);

  useEffect(() => {
    const fetchUsages = async () => {
      setLoadingUsages(true);
      const { data, error } = await supabase
        .from('coupon_usages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setUsages(data as CouponUsage[]);
      }
      setLoadingUsages(false);
    };
    fetchUsages();
  }, []);

  const stats = useMemo(() => {
    const totalUses = coupons.reduce((acc, c) => acc + c.current_uses, 0);

    // Real savings from usages table
    const totalRealSavings = usages.reduce((acc, u) => acc + (u.discount_amount || 0), 0);
    const totalOriginalAmount = usages.reduce((acc, u) => acc + (u.original_amount || 0), 0);

    // Estimated savings from coupons without usage records
    const ESTIMATED_AVERAGE_ORDER = 100;
    const estimatedSavings = coupons
      .filter(c => c.current_uses > 0)
      .reduce((acc, c) => {
        const savingsPerUse = c.discount_type === 'PERCENTAGE'
          ? (ESTIMATED_AVERAGE_ORDER * c.discount_value / 100)
          : c.discount_value;
        return acc + savingsPerUse * c.current_uses;
      }, 0);

    const totalSavings = totalRealSavings > 0 ? totalRealSavings : estimatedSavings;
    const averagePerUse = totalUses > 0 ? totalSavings / totalUses : 0;

    // Unique users
    const uniqueUsers = new Set(usages.map(u => u.user_id)).size;

    // Usage by coupon
    const usageByCoupon = coupons
      .filter(c => c.current_uses > 0)
      .sort((a, b) => b.current_uses - a.current_uses)
      .slice(0, 10);

    // Usage by user (top 10)
    const userMap = new Map<string, { email: string; count: number; totalDiscount: number }>();
    usages.forEach(u => {
      const existing = userMap.get(u.user_id) || { email: u.user_email, count: 0, totalDiscount: 0 };
      existing.count += 1;
      existing.totalDiscount += u.discount_amount || 0;
      userMap.set(u.user_id, existing);
    });
    const topUsers = Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly usage trend
    const monthlyMap = new Map<string, number>();
    usages.forEach(u => {
      const month = format(new Date(u.created_at), 'yyyy-MM');
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
    });
    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => ({
        label: format(new Date(month + '-01'), 'MMM/yy', { locale: ptBR }),
        count,
      }));

    return {
      totalUses,
      totalSavings,
      averagePerUse,
      uniqueUsers,
      totalOriginalAmount,
      isEstimated: totalRealSavings === 0,
      usageByCoupon,
      topUsers,
      monthlyTrend,
    };
  }, [coupons, usages]);

  if (coupons.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Relatório de Uso de Cupons</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Usos</p>
                <p className="text-3xl font-bold">{stats.totalUses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Economia Gerada {stats.isEstimated && '(estimada)'}
                </p>
                <p className="text-3xl font-bold">
                  R$ {stats.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Percent className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média por Uso</p>
                <p className="text-3xl font-bold">
                  R$ {stats.averagePerUse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuários Únicos</p>
                <p className="text-3xl font-bold">{stats.uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Coupons by Usage */}
        {stats.usageByCoupon.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cupons Mais Utilizados</CardTitle>
              <CardDescription>Ranking por número de utilizações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.usageByCoupon.map((coupon, i) => {
                const max = stats.usageByCoupon[0]?.current_uses || 1;
                const pct = (coupon.current_uses / max) * 100;
                return (
                  <div key={coupon.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {coupon.code}
                        </Badge>
                        <span className="text-muted-foreground">
                          {coupon.discount_type === 'PERCENTAGE'
                            ? `${coupon.discount_value}%`
                            : `R$ ${coupon.discount_value.toFixed(2)}`}
                        </span>
                      </div>
                      <span className="font-medium">{coupon.current_uses} usos</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Monthly Trend */}
        {stats.monthlyTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tendência Mensal</CardTitle>
              <CardDescription>Uso de cupons nos últimos meses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.monthlyTrend.map((month, i) => {
                const max = Math.max(...stats.monthlyTrend.map(m => m.count));
                const pct = max > 0 ? (month.count / max) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="capitalize">{month.label}</span>
                      </div>
                      <span className="font-medium">{month.count} usos</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Uso por Usuário</CardTitle>
          <CardDescription>
            Detalhamento de quais usuários utilizaram cupons
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsages ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : usages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum registro de uso detalhado ainda.</p>
              <p className="text-sm mt-1">
                Os dados aparecerão quando novos cupons forem utilizados no checkout.
              </p>
            </div>
          ) : (
            <>
              {/* Top Users Summary */}
              {stats.topUsers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Top Usuários por Uso de Cupom
                  </h4>
                  <div className="space-y-2">
                    {stats.topUsers.map((user, i) => (
                      <div key={user.userId} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-5">{i + 1}.</span>
                          <span className="truncate max-w-[200px]">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{user.count} usos</Badge>
                          <span className="text-success font-medium whitespace-nowrap">
                            R$ {user.totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Usages Table */}
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Últimas Utilizações
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Cupom</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead className="text-right">Economia</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usages.slice(0, 20).map((usage) => (
                      <TableRow key={usage.id}>
                        <TableCell className="truncate max-w-[180px]">
                          {usage.user_email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {usage.coupon_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {usage.discount_type === 'PERCENTAGE'
                            ? `${usage.discount_value}%`
                            : `R$ ${usage.discount_value.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-right text-success font-medium">
                          {usage.discount_amount > 0
                            ? `R$ ${usage.discount_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {format(new Date(usage.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
