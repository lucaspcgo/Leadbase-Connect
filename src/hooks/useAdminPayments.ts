import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  user_id: string;
  user_email: string;
  invoice_id: string | null;
  amount: number;
  method: string;
  status: string;
  external_id: string | null;
  pix_code: string | null;
  pix_qrcode: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: unknown;
}

interface Invoice {
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
  created_at: string;
  updated_at: string;
  description: string | null;
}

interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: string;
  price: number;
  status: string;
  start_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useAdminPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all payments
  const fetchPayments = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar pagamentos');
    }
  }, []);

  // Fetch all invoices
  const fetchInvoices = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar faturas');
    }
  }, []);

  // Fetch all subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar assinaturas');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchPayments(), fetchInvoices(), fetchSubscriptions()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchPayments, fetchInvoices, fetchSubscriptions]);

  // Approve payment and activate subscription
  const approvePayment = useCallback(async (paymentId: string) => {
    if (!user) return false;

    try {
      // Get the payment details
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Pagamento não encontrado');

      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'APPROVED',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Update invoice if exists
      if (payment.invoice_id) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.invoice_id);

        if (invoiceError) throw invoiceError;
      }

      // Find and activate pending subscription for this user
      const pendingSub = subscriptions.find(
        s => s.user_id === payment.user_id && s.status === 'PENDING'
      );

      if (pendingSub) {
        const now = new Date();
        const periodEnd = new Date(now);
        if (pendingSub.billing_cycle === 'YEARLY') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'ACTIVE',
            start_at: now.toISOString(),
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', pendingSub.id);

        if (subError) throw subError;

        // Update user profile with new plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            plan_id: pendingSub.plan_id,
            plan_start_date: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('user_id', payment.user_id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Log the action
      await supabase.from('financial_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.name,
        action: 'PAYMENT_MARKED_PAID',
        target_user_id: payment.user_id,
        target_user_email: payment.user_email,
        entity_type: 'PAYMENT',
        entity_id: paymentId,
        details: `Pagamento aprovado manualmente - R$ ${payment.amount}`,
      });

      // Refresh data
      await Promise.all([fetchPayments(), fetchInvoices(), fetchSubscriptions()]);

      toast({ title: 'Pagamento aprovado', description: 'O plano foi ativado com sucesso.' });
      return true;
    } catch (err) {
      console.error('Error approving payment:', err);
      toast({ 
        title: 'Erro', 
        description: err instanceof Error ? err.message : 'Erro ao aprovar pagamento',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, payments, subscriptions, fetchPayments, fetchInvoices, fetchSubscriptions, toast]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    if (!user) return false;

    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) throw new Error('Assinatura não encontrada');

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (subError) throw subError;

      // Log the action
      await supabase.from('financial_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.name,
        action: 'SUBSCRIPTION_CANCELLED',
        target_user_id: subscription.user_id,
        target_user_email: subscription.user_email,
        entity_type: 'SUBSCRIPTION',
        entity_id: subscriptionId,
        details: `Assinatura ${subscription.plan_name} cancelada`,
      });

      await fetchSubscriptions();
      toast({ title: 'Assinatura cancelada', description: 'A assinatura foi cancelada.' });
      return true;
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      toast({ 
        title: 'Erro', 
        description: err instanceof Error ? err.message : 'Erro ao cancelar assinatura',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, subscriptions, fetchSubscriptions, toast]);

  // Extend subscription
  const extendSubscription = useCallback(async (subscriptionId: string, days: number) => {
    if (!user) return false;

    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) throw new Error('Assinatura não encontrada');
      if (!subscription.current_period_end) throw new Error('Data de término não encontrada');

      const newEnd = new Date(subscription.current_period_end);
      newEnd.setDate(newEnd.getDate() + days);

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (subError) throw subError;

      // Log the action
      await supabase.from('financial_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.name,
        action: 'SUBSCRIPTION_EXTENDED',
        target_user_id: subscription.user_id,
        target_user_email: subscription.user_email,
        entity_type: 'SUBSCRIPTION',
        entity_id: subscriptionId,
        details: `Assinatura prorrogada em ${days} dias`,
      });

      await fetchSubscriptions();
      toast({ title: 'Assinatura prorrogada', description: `Prorrogada em ${days} dias.` });
      return true;
    } catch (err) {
      console.error('Error extending subscription:', err);
      toast({ 
        title: 'Erro', 
        description: err instanceof Error ? err.message : 'Erro ao prorrogar assinatura',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, subscriptions, fetchSubscriptions, toast]);

  // Mark invoice as paid
  const markInvoiceAsPaid = useCallback(async (invoiceId: string) => {
    if (!user) return false;

    try {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) throw new Error('Fatura não encontrada');

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Find and approve related payment
      const payment = payments.find(p => p.invoice_id === invoiceId);
      if (payment && payment.status === 'PENDING') {
        await approvePayment(payment.id);
      }

      // Log the action
      await supabase.from('financial_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.name,
        action: 'PAYMENT_MARKED_PAID',
        target_user_id: invoice.user_id,
        target_user_email: invoice.user_email,
        entity_type: 'INVOICE',
        entity_id: invoiceId,
        details: `Fatura marcada como paga manualmente`,
      });

      await fetchInvoices();
      toast({ title: 'Fatura paga', description: 'A fatura foi marcada como paga.' });
      return true;
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      toast({ 
        title: 'Erro', 
        description: err instanceof Error ? err.message : 'Erro ao marcar fatura como paga',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, invoices, payments, approvePayment, fetchInvoices, toast]);

  return {
    payments,
    invoices,
    subscriptions,
    loading,
    error,
    approvePayment,
    cancelSubscription,
    extendSubscription,
    markInvoiceAsPaid,
    refetch: async () => {
      setLoading(true);
      await Promise.all([fetchPayments(), fetchInvoices(), fetchSubscriptions()]);
      setLoading(false);
    },
  };
};
