import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUsers } from '@/contexts/UsersContext';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmpresaStats {
  total: number;
  byUF: { name: string; value: number }[];
  bySituacao: { name: string; value: number }[];
  byPorte: { name: string; value: number }[];
}

interface ConsultaStats {
  totalConsultas: number;
  creditosConsumidos: number;
}

interface DbSubscription {
  id: string;
  status: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  created_at: string;
}

interface DbPayment {
  id: string;
  status: string;
  method: string;
  amount: number;
  created_at: string;
  paid_at: string | null;
}

export const useAdminMetrics = () => {
  const [empresaStats, setEmpresaStats] = useState<EmpresaStats>({
    total: 0,
    byUF: [],
    bySituacao: [],
    byPorte: [],
  });
  const [consultaStats, setConsultaStats] = useState<ConsultaStats>({
    totalConsultas: 0,
    creditosConsumidos: 0,
  });
  const [dbPayments, setDbPayments] = useState<DbPayment[]>([]);
  const [dbSubscriptions, setDbSubscriptions] = useState<DbSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { users } = useUsers();

  useEffect(() => {
    const fetchAllStats = async () => {
      setLoading(true);
      try {
        // Parallel fetch all data
        const [
          empresaCountResult,
          statsResult,
          consultasResult,
          creditsResult,
          paymentsResult,
          subscriptionsResult,
        ] = await Promise.all([
          // 1. Empresa total count (estimated)
          supabase.from('empresas').select('*', { count: 'estimated', head: true }),
          // 2. Empresa aggregated stats via RPC
          supabase.rpc('get_empresa_stats'),
          // 3. Access logs count
          supabase.from('access_logs').select('*', { count: 'exact', head: true }),
          // 4. Credits used
          supabase.from('access_logs').select('credits_used'),
          // 5. All payments from DB
          supabase.from('payments').select('id, status, method, amount, created_at, paid_at'),
          // 6. All subscriptions from DB
          supabase.from('subscriptions').select('id, status, plan_name, price, billing_cycle, created_at'),
        ]);

        // Process empresa stats
        const byUF: { name: string; value: number }[] = [];
        const bySituacao: { name: string; value: number }[] = [];
        const byPorte: { name: string; value: number }[] = [];

        if (!statsResult.error && statsResult.data) {
          (statsResult.data as any[]).forEach((row: { stat_type: string; stat_name: string; stat_value: number }) => {
            const item = { name: row.stat_name, value: Number(row.stat_value) };
            if (row.stat_type === 'uf') byUF.push(item);
            else if (row.stat_type === 'situacao') bySituacao.push(item);
            else if (row.stat_type === 'porte') byPorte.push(item);
          });
        } else if (statsResult.error) {
          console.error('Error fetching empresa stats RPC:', statsResult.error);
        }

        setEmpresaStats({
          total: empresaCountResult.count || 0,
          byUF,
          bySituacao,
          byPorte,
        });

        // Process consultation stats
        const creditosTotal = creditsResult.data?.reduce((sum, log) => sum + (log.credits_used || 0), 0) || 0;
        setConsultaStats({
          totalConsultas: consultasResult.count || 0,
          creditosConsumidos: creditosTotal,
        });

        // Store DB payments and subscriptions
        setDbPayments((paymentsResult.data as DbPayment[]) || []);
        setDbSubscriptions((subscriptionsResult.data as DbSubscription[]) || []);
      } catch (error) {
        console.error('Error fetching admin metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  // User metrics
  const userMetrics = useMemo(() => {
    const totalUsers = users.length;
    const usersThisMonth = users.filter(u => {
      const createdAt = new Date(u.createdAt);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length;

    const byRole: Record<string, number> = {};
    users.forEach(u => {
      const role = u.role || 'USER';
      byRole[role] = (byRole[role] || 0) + 1;
    });
    const usersByRole = Object.entries(byRole).map(([name, value]) => ({ 
      name: name === 'USER' ? 'Usuários' : name === 'ADMIN' ? 'Admins' : 'Master Admin',
      value 
    }));

    const byStatus: Record<string, number> = {};
    users.forEach(u => {
      const status = u.status || 'ACTIVE';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    const usersByStatus = Object.entries(byStatus).map(([name, value]) => ({ 
      name: name === 'ACTIVE' ? 'Ativos' : name === 'BLOCKED' ? 'Bloqueados' : 'Suspensos',
      value 
    }));

    // Registration trend - last 30 days
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });
    const registrationTrend = last30Days.map(date => {
      const dateStr = format(date, 'dd/MM');
      const count = users.filter(u => {
        const userDate = new Date(u.createdAt);
        return format(userDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      }).length;
      return { name: dateStr, usuarios: count };
    });

    return {
      totalUsers,
      usersThisMonth,
      usersByRole,
      usersByStatus,
      registrationTrend,
    };
  }, [users]);

  // Payment metrics from actual database data
  const paymentMetrics = useMemo(() => {
    const activeSubscriptions = dbSubscriptions.filter(s => s.status === 'ACTIVE').length;
    const pendingPayments = dbPayments.filter(p => p.status === 'PENDING').length;
    
    // Receita total = soma do valor de todas as assinaturas ativas (planos assinados)
    const totalRevenue = dbSubscriptions
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + Number(s.price), 0);

    // Receita mensal = soma dos pagamentos aprovados no mês atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyRevenue = dbPayments
      .filter(p => {
        if (p.status !== 'APPROVED') return false;
        const d = new Date(p.paid_at || p.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Subscriptions by status with count and total value
    const subByStatus: Record<string, { count: number; total: number }> = {};
    dbSubscriptions.forEach(s => {
      if (!subByStatus[s.status]) subByStatus[s.status] = { count: 0, total: 0 };
      subByStatus[s.status].count += 1;
      subByStatus[s.status].total += Number(s.price);
    });
    const subscriptionsByStatus = Object.entries(subByStatus).map(([name, data]) => ({ 
      name: name === 'ACTIVE' ? 'Ativas' : name === 'PENDING' ? 'Pendentes' : name === 'CANCELLED' ? 'Canceladas' : 'Expiradas',
      value: data.count,
      total: data.total,
    }));

    // Métodos de pagamento com valor total (pagamentos aprovados)
    const byMethod: Record<string, { count: number; total: number }> = {};
    dbPayments
      .filter(p => p.status === 'APPROVED')
      .forEach(p => {
        const method = p.method || 'N/D';
        if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
        byMethod[method].count += 1;
        byMethod[method].total += Number(p.amount);
      });
    // If no approved payments, show all payments methods
    if (Object.keys(byMethod).length === 0) {
      dbPayments.forEach(p => {
        const method = p.method || 'N/D';
        if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
        byMethod[method].count += 1;
        byMethod[method].total += Number(p.amount);
      });
    }
    const paymentsByMethod = Object.entries(byMethod)
      .map(([name, data]) => ({ name, value: data.count, total: data.total }))
      .sort((a, b) => b.value - a.value);

    // Revenue by month - last 6 months (from approved payments)
    const revenueByMonth: Record<string, number> = {};
    dbPayments
      .filter(p => p.status === 'APPROVED')
      .forEach(p => {
        const date = new Date(p.paid_at || p.created_at);
        const monthKey = format(date, 'MMM/yy', { locale: ptBR });
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + Number(p.amount);
      });
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = format(date, 'MMM/yy', { locale: ptBR });
      months.push({
        name: monthKey,
        receita: revenueByMonth[monthKey] || 0
      });
    }

    return {
      activeSubscriptions,
      pendingPayments,
      totalRevenue,
      monthlyRevenue,
      subscriptionsByStatus,
      paymentsByMethod,
      revenueByMonth: months,
    };
  }, [dbPayments, dbSubscriptions]);

  return {
    empresaStats,
    consultaStats,
    userMetrics,
    paymentMetrics,
    loading,
  };
};
