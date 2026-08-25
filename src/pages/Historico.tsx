import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionBlocker } from '@/components/subscription/SubscriptionBlocker';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePdf } from '@/lib/invoicePdfGenerator';
import { 
  Building2, 
  Coins, 
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  Loader2,
  CreditCard,
  FileText,
  Download,
  Crown
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AccessLog {
  id: string;
  empresa_cnpj: string;
  empresa_razao_social: string | null;
  action: string;
  credits_used: number;
  used_extra_credit: boolean;
  created_at: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  price: number;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  description: string | null;
}

const Historico = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch access logs for current user
        const { data: logsData, error: logsError } = await supabase
          .from('access_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (logsError) {
          console.error('Error fetching access logs:', logsError);
        } else if (logsData) {
          setAccessLogs(logsData);
        }

        // Fetch credit transactions for current user
        const { data: creditsData, error: creditsError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (creditsError) {
          console.error('Error fetching credit transactions:', creditsError);
        } else if (creditsData) {
          setCreditTransactions(creditsData);
        }

        // Fetch subscriptions for current user
        const { data: subsData, error: subsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (subsError) {
          console.error('Error fetching subscriptions:', subsError);
        } else if (subsData) {
          setSubscriptions(subsData);
        }

        // Fetch invoices for current user (only paid invoices)
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'PAID')
          .order('created_at', { ascending: false });

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError);
        } else if (invoicesData) {
          setInvoices(invoicesData);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatCnpj = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const getTransactionBadge = (type: string, amount: number) => {
    if (amount > 0) {
      return <Badge className="bg-success/10 text-success">+{amount}</Badge>;
    }
    return <Badge variant="destructive">{amount}</Badge>;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SubscriptionBlocker>
      <MainLayout>
        <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Histórico</h1>
          <p className="text-muted-foreground">Acompanhe suas atividades e transações</p>
        </div>

        <Tabs defaultValue="empresas" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="empresas" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresas Acessadas
            </TabsTrigger>
            <TabsTrigger value="creditos" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Créditos
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresas" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Empresas Visualizadas
                </CardTitle>
                <CardDescription>
                  Histórico de empresas que você desbloqueou e visualizou
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : accessLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma empresa acessada ainda</p>
                    <p className="text-sm">Quando você desbloquear empresas, elas aparecerão aqui</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatCnpj(log.empresa_cnpj)}
                          </TableCell>
                          <TableCell>
                            {log.empresa_razao_social || '-'}
                          </TableCell>
                          <TableCell>
                            {log.used_extra_credit ? (
                              <Badge variant="secondary">Crédito Extra</Badge>
                            ) : (
                              <Badge variant="outline">Limite Mensal</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creditos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Histórico de Créditos
                </CardTitle>
                <CardDescription>
                  Transações de créditos extras
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : creditTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma transação de créditos ainda</p>
                    <p className="text-sm">Compre créditos extras ou receba ajustes para ver o histórico</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(transaction.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {transaction.amount > 0 ? (
                                <ArrowUpCircle className="h-4 w-4 text-success" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4 text-destructive" />
                              )}
                              {transaction.type}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTransactionBadge(transaction.type, transaction.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {transaction.reason || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-6 space-y-6">
            {/* Current Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Plano Atual
                </CardTitle>
                <CardDescription>
                  Informações sobre sua assinatura atual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma assinatura encontrada</p>
                    <p className="text-sm">Você está no plano gratuito</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptions.filter(s => s.status === 'ACTIVE').slice(0, 1).map((sub) => (
                      <div key={sub.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Plano</p>
                          <p className="font-medium">{sub.plan_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className={
                            sub.status === 'ACTIVE' ? 'bg-success/20 text-success' :
                            sub.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                            sub.status === 'CANCELLED' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }>
                            {sub.status === 'ACTIVE' ? 'Ativo' : 
                             sub.status === 'PENDING' ? 'Pendente' :
                             sub.status === 'CANCELLED' ? 'Cancelado' : sub.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ciclo</p>
                          <p className="font-medium">{sub.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Vencimento</p>
                          <p className="font-mono text-sm">
                            {sub.current_period_end ? formatDate(sub.current_period_end) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Faturas
                </CardTitle>
                <CardDescription>
                  Histórico de faturas e comprovantes de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma fatura encontrada</p>
                    <p className="text-sm">Suas faturas aparecerão aqui quando você contratar um plano</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(invoice.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {invoice.description || `Assinatura ${invoice.plan_name}`}
                          </TableCell>
                          <TableCell className="font-medium">
                            R$ {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDate(invoice.due_date)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              invoice.status === 'PAID' ? 'bg-success/20 text-success' :
                              invoice.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                              invoice.status === 'OVERDUE' ? 'bg-destructive/20 text-destructive' :
                              'bg-muted text-muted-foreground'
                            }>
                              {invoice.status === 'PAID' ? 'Pago' :
                               invoice.status === 'PENDING' ? 'Pendente' :
                               invoice.status === 'OVERDUE' ? 'Vencida' :
                               invoice.status === 'CANCELLED' ? 'Cancelada' : invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateInvoicePdf(invoice)}
                              title="Baixar fatura em PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </MainLayout>
    </SubscriptionBlocker>
  );
};

export default Historico;
