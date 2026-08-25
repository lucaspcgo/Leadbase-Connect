import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminPayments } from '@/hooks/useAdminPayments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard,
  FileText,
  Users,
  RefreshCw,
  Calendar,
  DollarSign,
  Loader2,
  Download
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { generateInvoicePdf } from '@/lib/invoicePdfGenerator';

type PaymentStatusType = 'PENDING' | 'APPROVED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
type SubscriptionStatusType = 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED' | 'UPGRADED';

const statusColors: Record<PaymentStatusType, string> = {
  PENDING: 'bg-warning/20 text-warning',
  APPROVED: 'bg-success/20 text-success',
  FAILED: 'bg-destructive/20 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground',
  REFUNDED: 'bg-primary/20 text-primary',
};

const subscriptionStatusColors: Record<SubscriptionStatusType, string> = {
  PENDING: 'bg-warning/20 text-warning',
  ACTIVE: 'bg-success/20 text-success',
  CANCELLED: 'bg-destructive/20 text-destructive',
  EXPIRED: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-orange-500/20 text-orange-600',
  UPGRADED: 'bg-blue-500/20 text-blue-600',
};

const subscriptionStatusLabels: Record<SubscriptionStatusType, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
  SUSPENDED: 'Suspensa',
  UPGRADED: 'Upgrade',
};

const AdminPagamentos = () => {
  const { 
    payments, 
    invoices, 
    subscriptions,
    loading,
    approvePayment,
    cancelSubscription,
    extendSubscription,
    markInvoiceAsPaid,
    refetch,
  } = useAdminPayments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<typeof payments[0] | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<typeof subscriptions[0] | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Remove duplicate subscriptions - keep only the most recent per user
  const uniqueSubscriptions = subscriptions.reduce((acc, sub) => {
    const existingIndex = acc.findIndex(s => s.user_id === sub.user_id && s.plan_id === sub.plan_id);
    if (existingIndex === -1) {
      acc.push(sub);
    } else {
      // Keep the most recent one
      if (new Date(sub.created_at) > new Date(acc[existingIndex].created_at)) {
        acc[existingIndex] = sub;
      }
    }
    return acc;
  }, [] as typeof subscriptions);

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Filter subscriptions - by default show only ACTIVE (paid) subscriptions
  const filteredSubscriptions = uniqueSubscriptions.filter(s => {
    const matchesSearch = s.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = subscriptionStatusFilter === 'all' || s.status === subscriptionStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprovePayment = async (payment: typeof payments[0]) => {
    setProcessingId(payment.id);
    await approvePayment(payment.id);
    setProcessingId(null);
    setSelectedPayment(null);
  };

  const handleCancelSubscription = async (subscription: typeof subscriptions[0]) => {
    setProcessingId(subscription.id);
    await cancelSubscription(subscription.id);
    setProcessingId(null);
    setSelectedSubscription(null);
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscription) return;
    setProcessingId(selectedSubscription.id);
    await extendSubscription(selectedSubscription.id, extendDays);
    setProcessingId(null);
    setSelectedSubscription(null);
  };

  const handleMarkInvoiceAsPaid = async (invoiceId: string) => {
    setProcessingId(invoiceId);
    await markInvoiceAsPaid(invoiceId);
    setProcessingId(null);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pagamentos</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">Gerencie pagamentos, faturas e assinaturas</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pagamentos</p>
                <p className="text-lg sm:text-2xl font-bold">{payments.length}</p>
              </div>
              <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg sm:text-2xl font-bold text-warning">
                  {payments.filter(p => p.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Assinaturas Ativas</p>
                <p className="text-lg sm:text-2xl font-bold text-success">
                  {uniqueSubscriptions.filter(s => s.status === 'ACTIVE').length}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receita Aprovada</p>
                <p className="text-lg sm:text-2xl font-bold">
                  R$ {payments.filter(p => p.status === 'APPROVED').reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="w-full sm:w-auto flex">
          <TabsTrigger value="payments" className="flex-1 sm:flex-none text-xs sm:text-sm">Pagamentos</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex-1 sm:flex-none text-xs sm:text-sm">Assinaturas</TabsTrigger>
          <TabsTrigger value="invoices" className="flex-1 sm:flex-none text-xs sm:text-sm">Faturas</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="space-y-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por email..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="APPROVED">Aprovado</SelectItem>
                      <SelectItem value="FAILED">Falhou</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      <SelectItem value="REFUNDED">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos Métodos</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="MERCADO_PAGO">Mercado Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum pagamento encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>{payment.user_email}</TableCell>
                        <TableCell className="font-medium">
                          R$ {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[payment.status as PaymentStatusType] || 'bg-muted'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.status === 'PENDING' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-success"
                              onClick={() => handleApprovePayment(payment)}
                              disabled={processingId === payment.id}
                            >
                              {processingId === payment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
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
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="space-y-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por email..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="ACTIVE">Ativas (Pagas)</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="UPGRADED">Upgrades</SelectItem>
                    <SelectItem value="CANCELLED">Canceladas</SelectItem>
                    <SelectItem value="EXPIRED">Expiradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma assinatura encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>{sub.user_email}</TableCell>
                        <TableCell className="font-medium">{sub.plan_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sub.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={subscriptionStatusColors[sub.status as SubscriptionStatusType] || 'bg-muted'}>
                            {subscriptionStatusLabels[sub.status as SubscriptionStatusType] || sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(sub.current_period_end)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setExtendDays(30);
                            }}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          {sub.status === 'ACTIVE' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleCancelSubscription(sub)}
                              disabled={processingId === sub.id}
                            >
                              {processingId === sub.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
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
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma fatura encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
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
                        <TableCell className="font-mono text-sm">
                          {formatDate(invoice.created_at)}
                        </TableCell>
                        <TableCell>{invoice.user_email}</TableCell>
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
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => generateInvoicePdf(invoice)}
                            title="Baixar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'PENDING' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-success"
                              onClick={() => handleMarkInvoiceAsPaid(invoice.id)}
                              disabled={processingId === invoice.id}
                            >
                              {processingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
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
        </TabsContent>
      </Tabs>

      {/* Payment Details Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedPayment.status as PaymentStatusType] || 'bg-muted'}>
                    {selectedPayment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p>{selectedPayment.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-bold">R$ {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método</p>
                  <p>{selectedPayment.method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p>{formatDate(selectedPayment.created_at)}</p>
                </div>
              </div>
              
              {selectedPayment.pix_code && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Código PIX</p>
                  <Input value={selectedPayment.pix_code} readOnly className="font-mono text-xs" />
                </div>
              )}
              
              {selectedPayment.pix_qrcode && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">QR Code</p>
                  <img 
                    src={selectedPayment.pix_qrcode} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 mx-auto border rounded"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedPayment?.status === 'PENDING' && (
              <Button 
                onClick={() => handleApprovePayment(selectedPayment)}
                disabled={processingId === selectedPayment.id}
              >
                {processingId === selectedPayment.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Marcar como Pago
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={!!selectedSubscription} onOpenChange={() => setSelectedSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prorrogar Assinatura</DialogTitle>
            <DialogDescription>
              Prorrogar a assinatura de {selectedSubscription?.user_email}
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-medium">{selectedSubscription.plan_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento Atual</p>
                  <p>{formatDate(selectedSubscription.current_period_end)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Prorrogar por (dias)</p>
                <Input 
                  type="number" 
                  value={extendDays} 
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  min={1}
                  max={365}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubscription(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExtendSubscription}
              disabled={processingId === selectedSubscription?.id}
            >
              {processingId === selectedSubscription?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Prorrogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPagamentos;
