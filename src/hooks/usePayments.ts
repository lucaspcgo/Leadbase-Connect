import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Invoice, Payment, Subscription, FinancialAuditLog, CheckoutData, PaymentStatus } from '@/types/payment';
import { useAuth } from '@/contexts/AuthContext';
import { plans, creditPackages } from '@/data/mockData';
import { toast } from 'sonner';

interface DbInvoice {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbPayment = {
  id: string;
  invoice_id: string | null;
  user_id: string;
  user_email: string;
  amount: number;
  method: string;
  status: string;
  external_id: string | null;
  pix_code: string | null;
  pix_qrcode: string | null;
  paid_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface DbSubscription {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  price: number;
  start_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbFinancialAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_user_id: string | null;
  target_user_email: string | null;
  entity_type: string;
  entity_id: string | null;
  details: string;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
}

export const usePayments = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [financialAuditLogs, setFinancialAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [invoicesRes, paymentsRes, subscriptionsRes, auditLogsRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        isAdmin ? supabase.from('financial_audit_logs').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      ]);

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data.map((i: DbInvoice) => ({
          id: i.id,
          user_id: i.user_id,
          user_email: i.user_email,
          plan_id: i.plan_id,
          plan_name: i.plan_name,
          billing_cycle: i.billing_cycle as 'MONTHLY' | 'YEARLY',
          amount: i.amount,
          status: i.status as Invoice['status'],
          due_date: new Date(i.due_date),
          paid_at: i.paid_at ? new Date(i.paid_at) : undefined,
          description: i.description || '',
          created_at: new Date(i.created_at),
        })));
      }

      if (paymentsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPayments((paymentsRes.data as any[]).map((p) => ({
          id: p.id,
          invoice_id: p.invoice_id || '',
          user_id: p.user_id,
          user_email: p.user_email,
          amount: p.amount,
          method: p.method as Payment['method'],
          status: p.status as Payment['status'],
          external_id: p.external_id || undefined,
          pix_code: p.pix_code || undefined,
          pix_qrcode: p.pix_qrcode || undefined,
          paid_at: p.paid_at ? new Date(p.paid_at) : undefined,
          metadata: p.metadata || undefined,
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at),
        })));
      }

      if (subscriptionsRes.data) {
        setSubscriptions(subscriptionsRes.data.map((s: DbSubscription) => ({
          id: s.id,
          user_id: s.user_id,
          user_email: s.user_email,
          plan_id: s.plan_id,
          plan_name: s.plan_name,
          status: s.status as Subscription['status'],
          billing_cycle: s.billing_cycle as 'MONTHLY' | 'YEARLY',
          price: s.price,
          start_at: s.start_at ? new Date(s.start_at) : undefined,
          current_period_start: s.current_period_start ? new Date(s.current_period_start) : undefined,
          current_period_end: s.current_period_end ? new Date(s.current_period_end) : undefined,
          cancelled_at: s.cancelled_at ? new Date(s.cancelled_at) : undefined,
          created_at: new Date(s.created_at),
          updated_at: new Date(s.updated_at),
        })));
      }

      if (auditLogsRes.data) {
        setFinancialAuditLogs((auditLogsRes.data as DbFinancialAuditLog[]).map((l) => ({
          id: l.id,
          admin_id: l.admin_id,
          admin_name: l.admin_name,
          action: l.action as FinancialAuditLog['action'],
          target_user_id: l.target_user_id || undefined,
          target_user_email: l.target_user_email || undefined,
          entity_type: l.entity_type as FinancialAuditLog['entity_type'],
          entity_id: l.entity_id || undefined,
          details: l.details,
          before_value: l.before_value || undefined,
          after_value: l.after_value || undefined,
          created_at: new Date(l.created_at),
        })));
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const generatePixCode = useCallback((amount: number, description: string): string => {
    return `00020126580014BR.GOV.BCB.PIX0136${Date.now()}5204000053039865802BR5925LEADBASE PRO6009SAO PAULO62070503***630${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, []);

  const createCheckout = useCallback(async (data: CheckoutData): Promise<{ invoice: Invoice; payment: Payment; subscription: Subscription } | null> => {
    if (!user) return null;

    try {
      const plan = plans.find(p => p.id === data.plan_id);
      if (!plan) {
        toast.error('Plano não encontrado');
        return null;
      }

      const amount = data.billing_cycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          user_email: data.payer_email,
          plan_id: data.plan_id,
          plan_name: plan.name,
          billing_cycle: data.billing_cycle,
          amount,
          status: 'PENDING',
          due_date: dueDate.toISOString(),
          description: `Assinatura ${plan.name} - ${data.billing_cycle === 'MONTHLY' ? 'Mensal' : 'Anual'}`,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create payment
      const pixCode = data.payment_method === 'PIX' ? generatePixCode(amount, plan.name) : undefined;
      
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceData.id,
          user_id: user.id,
          user_email: data.payer_email,
          amount,
          method: data.payment_method,
          status: 'PENDING',
          pix_code: pixCode,
          metadata: { payer_name: data.payer_name, payer_document: data.payer_document },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          user_email: data.payer_email,
          plan_id: data.plan_id,
          plan_name: plan.name,
          status: 'PENDING',
          billing_cycle: data.billing_cycle,
          price: amount,
        })
        .select()
        .single();

      if (subscriptionError) throw subscriptionError;

      await fetchData();

      toast.success('Checkout criado com sucesso');
      
      return {
        invoice: {
          id: invoiceData.id,
          user_id: invoiceData.user_id,
          user_email: invoiceData.user_email,
          plan_id: invoiceData.plan_id,
          plan_name: invoiceData.plan_name,
          billing_cycle: invoiceData.billing_cycle as 'MONTHLY' | 'YEARLY',
          amount: invoiceData.amount,
          status: invoiceData.status as Invoice['status'],
          due_date: new Date(invoiceData.due_date),
          description: invoiceData.description || '',
          created_at: new Date(invoiceData.created_at),
        },
        payment: {
          id: paymentData.id,
          invoice_id: paymentData.invoice_id || '',
          user_id: paymentData.user_id,
          user_email: paymentData.user_email,
          amount: paymentData.amount,
          method: paymentData.method as Payment['method'],
          status: paymentData.status as Payment['status'],
          pix_code: paymentData.pix_code || undefined,
          created_at: new Date(paymentData.created_at),
          updated_at: new Date(paymentData.updated_at),
        },
        subscription: {
          id: subscriptionData.id,
          user_id: subscriptionData.user_id,
          user_email: subscriptionData.user_email,
          plan_id: subscriptionData.plan_id,
          plan_name: subscriptionData.plan_name,
          status: subscriptionData.status as Subscription['status'],
          billing_cycle: subscriptionData.billing_cycle as 'MONTHLY' | 'YEARLY',
          price: subscriptionData.price,
          created_at: new Date(subscriptionData.created_at),
          updated_at: new Date(subscriptionData.updated_at),
        },
      };
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erro ao criar checkout');
      return null;
    }
  }, [user, generatePixCode, fetchData]);

  const updatePaymentStatus = useCallback(async (paymentId: string, status: PaymentStatus, adminId?: string, adminName?: string) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === 'APPROVED') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      // Log the action if admin
      if (adminId && adminName && status === 'APPROVED') {
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
          await supabase.from('financial_audit_logs').insert({
            admin_id: adminId,
            admin_name: adminName,
            action: 'PAYMENT_MARKED_PAID',
            target_user_id: payment.user_id,
            target_user_email: payment.user_email,
            entity_type: 'PAYMENT',
            entity_id: paymentId,
            details: `Pagamento marcado como aprovado manualmente`,
            before_value: payment.status,
            after_value: status,
          });
        }
      }

      await fetchData();
      toast.success('Status do pagamento atualizado');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Erro ao atualizar pagamento');
    }
  }, [payments, fetchData]);

  const markInvoiceAsPaid = useCallback(async (invoiceId: string, adminId: string, adminName: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'PAID', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) throw error;

      const invoice = invoices.find(i => i.id === invoiceId);
      if (invoice) {
        await supabase.from('financial_audit_logs').insert({
          admin_id: adminId,
          admin_name: adminName,
          action: 'PAYMENT_MARKED_PAID',
          target_user_id: invoice.user_id,
          target_user_email: invoice.user_email,
          entity_type: 'INVOICE',
          entity_id: invoiceId,
          details: `Fatura marcada como paga manualmente`,
          before_value: invoice.status,
          after_value: 'PAID',
        });
      }

      await fetchData();
      toast.success('Fatura marcada como paga');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Erro ao marcar fatura como paga');
    }
  }, [invoices, fetchData]);

  const activateSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const now = new Date();
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      const periodEnd = new Date(now);
      if (subscription?.billing_cycle === 'YEARLY') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'ACTIVE',
          start_at: now.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      await fetchData();
      toast.success('Assinatura ativada');
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Erro ao ativar assinatura');
    }
  }, [subscriptions, fetchData]);

  const cancelSubscription = useCallback(async (subscriptionId: string, adminId?: string, adminName?: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (subscription && adminId && adminName) {
        await supabase.from('financial_audit_logs').insert({
          admin_id: adminId,
          admin_name: adminName,
          action: 'SUBSCRIPTION_CANCELLED',
          target_user_id: subscription.user_id,
          target_user_email: subscription.user_email,
          entity_type: 'SUBSCRIPTION',
          entity_id: subscriptionId,
          details: `Assinatura cancelada`,
          before_value: subscription.status,
          after_value: 'CANCELLED',
        });
      }

      await fetchData();
      toast.success('Assinatura cancelada');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  }, [subscriptions, fetchData]);

  const extendSubscription = useCallback(async (subscriptionId: string, days: number, adminId: string, adminName: string) => {
    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) return;

      const currentEnd = subscription.current_period_end || new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + days);

      const { error } = await supabase
        .from('subscriptions')
        .update({ current_period_end: newEnd.toISOString() })
        .eq('id', subscriptionId);

      if (error) throw error;

      await supabase.from('financial_audit_logs').insert({
        admin_id: adminId,
        admin_name: adminName,
        action: 'SUBSCRIPTION_EXTENDED',
        target_user_id: subscription.user_id,
        target_user_email: subscription.user_email,
        entity_type: 'SUBSCRIPTION',
        entity_id: subscriptionId,
        details: `Assinatura estendida em ${days} dias`,
        before_value: currentEnd.toISOString(),
        after_value: newEnd.toISOString(),
      });

      await fetchData();
      toast.success(`Assinatura estendida em ${days} dias`);
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Erro ao estender assinatura');
    }
  }, [subscriptions, fetchData]);

  const getPaymentsByUser = useCallback((userId: string) => {
    return payments.filter(p => p.user_id === userId);
  }, [payments]);

  const getInvoicesByUser = useCallback((userId: string) => {
    return invoices.filter(i => i.user_id === userId);
  }, [invoices]);

  const getSubscriptionsByUser = useCallback((userId: string) => {
    return subscriptions.filter(s => s.user_id === userId);
  }, [subscriptions]);

  const getActiveSubscription = useCallback((userId: string) => {
    return subscriptions.find(s => s.user_id === userId && s.status === 'ACTIVE');
  }, [subscriptions]);

  return {
    loading,
    invoices,
    payments,
    subscriptions,
    financialAuditLogs,
    createCheckout,
    updatePaymentStatus,
    markInvoiceAsPaid,
    activateSubscription,
    cancelSubscription,
    extendSubscription,
    getPaymentsByUser,
    getInvoicesByUser,
    getSubscriptionsByUser,
    getActiveSubscription,
    generatePixCode,
    refetch: fetchData,
  };
};
