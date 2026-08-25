import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPayments } from '@/hooks/useAdminPayments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CreditCard, 
  FileText, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useMemo } from 'react';

interface AdminUserFinanceiroProps {
  userId: string;
  userEmail: string;
}

const AdminUserFinanceiro = ({ userId, userEmail }: AdminUserFinanceiroProps) => {
  const { user } = useAuth();
  const { 
    payments: allPayments, 
    invoices: allInvoices, 
    subscriptions: allSubscriptions,
    loading,
    approvePayment,
    cancelSubscription,
    extendSubscription,
  } = useAdminPayments();

  // Filter data for this specific user
  const payments = useMemo(() => 
    allPayments.filter(p => p.user_id === userId), 
    [allPayments, userId]
  );
  
  const invoices = useMemo(() => 
    allInvoices.filter(i => i.user_id === userId), 
    [allInvoices, userId]
  );
  
  const subscription = useMemo(() => 
    allSubscriptions.find(s => s.user_id === userId && (s.status === 'ACTIVE' || s.status === 'PENDING')), 
    [allSubscriptions, userId]
  );

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        Histórico Financeiro
      </h3>

      {/* Current Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinatura Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-medium">{subscription.plan_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={
                  subscription.status === 'ACTIVE' ? 'bg-success/20 text-success' :
                  subscription.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                  'bg-muted text-muted-foreground'
                }>
                  {subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ciclo</p>
                <p className="font-medium">{subscription.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <p className="font-mono text-sm">{formatDate(subscription.current_period_end)}</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              {subscription.status === 'ACTIVE' && user && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => extendSubscription(subscription.id, 30)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Prorrogar 30 dias
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive"
                    onClick={() => cancelSubscription(subscription.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum pagamento encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        payment.status === 'APPROVED' ? 'bg-success/20 text-success' :
                        payment.status === 'PENDING' ? 'bg-warning/20 text-warning' :
                        payment.status === 'FAILED' ? 'bg-destructive/20 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.status === 'PENDING' && user && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => approvePayment(payment.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoices History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Faturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhuma fatura encontrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(invoice.created_at)}
                    </TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell className="font-medium">
                      R$ {invoice.amount.toLocaleString()}
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
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserFinanceiro;
