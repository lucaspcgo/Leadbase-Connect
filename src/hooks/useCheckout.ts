import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutData } from '@/types/payment';
// PIX generation is now handled by Mercado Pago API

interface CheckoutResult {
  invoiceId: string;
  paymentId: string;
  subscriptionId: string;
  pixCode: string;
  pixQrCode: string;
  amount: number;
  dueDate: Date;
}

interface PaymentStatus {
  id: string;
  status: string;
  paid_at: string | null;
}

export const useCheckout = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create checkout (invoice, payment, subscription) in database
  const createCheckout = useCallback(async (data: CheckoutData): Promise<CheckoutResult | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

      // 1. Create Invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          user_email: data.payer_email,
          plan_id: data.plan_id,
          plan_name: data.plan_name,
          billing_cycle: data.billing_cycle,
          amount: data.plan_price,
          status: 'PENDING',
          due_date: dueDate.toISOString(),
          description: `Assinatura ${data.plan_name} - ${data.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}`,
        })
        .select()
        .single();

      if (invoiceError || !invoice) {
        console.error('Error creating invoice:', invoiceError);
        throw new Error('Erro ao criar fatura');
      }

      // 2. Create Payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          user_email: data.payer_email,
          invoice_id: invoice.id,
          amount: data.plan_price,
          method: data.payment_method,
          status: 'PENDING',
          pix_code: null,
          pix_qrcode: null,
          metadata: {
            payer_name: data.payer_name,
            payer_document: data.payer_document,
          },
        })
        .select()
        .single();

      if (paymentError || !payment) {
        console.error('Error creating payment:', paymentError);
        throw new Error('Erro ao criar pagamento');
      }


      // 3. Mark existing ACTIVE subscription as UPGRADED (if upgrading)
      const { data: existingActiveSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingActiveSub) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'UPGRADED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingActiveSub.id);
        console.log('[useCheckout] Marked existing subscription as UPGRADED:', existingActiveSub.id);
      }

      // 4. Create new Subscription (PENDING status)
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          user_email: data.payer_email,
          plan_id: data.plan_id,
          plan_name: data.plan_name,
          billing_cycle: data.billing_cycle,
          price: data.plan_price,
          status: 'PENDING',
        })
        .select()
        .single();

      if (subscriptionError || !subscription) {
        console.error('Error creating subscription:', subscriptionError);
        throw new Error('Erro ao criar assinatura');
      }

      let pixCode = '';
      let pixQrCode = '';
      let stripeCheckoutUrl = '';

      // 5. Process payment based on method
      if (data.payment_method === 'MERCADO_PAGO') {
        console.log('[useCheckout] Creating Mercado Pago payment...');
        
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session?.session?.access_token;
        
        if (!accessToken) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        const billingLabel = data.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal';
        const description = `${data.plan_name} ${billingLabel}`;

        const mpResponse = await supabase.functions.invoke('create-mercadopago-payment', {
          body: {
            amount: data.plan_price,
            description,
            payer_email: data.payer_email,
            payer_name: data.payer_name,
            payer_document: data.payer_document,
            external_reference: payment.id,
          },
        });

        if (mpResponse.error) {
          console.error('[useCheckout] Mercado Pago error:', mpResponse.error);
          throw new Error(mpResponse.error.message || 'Erro ao criar pagamento no Mercado Pago');
        }

        const mpData = mpResponse.data;
        
        if (!mpData?.success) {
          throw new Error(`Falha no Mercado Pago: ${mpData?.details || mpData?.error || 'Erro desconhecido'}`);
        }

        pixCode = mpData.pix_code || '';
        pixQrCode = mpData.pix_qrcode_base64 || '';
      } else if (data.payment_method === 'STRIPE') {
        console.log('[useCheckout] Creating Stripe checkout session...');
        
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session?.session?.access_token;
        
        if (!accessToken) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        const billingLabel = data.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal';
        const description = `${data.plan_name} ${billingLabel}`;

        const stripeResponse = await supabase.functions.invoke('create-stripe-checkout', {
          body: {
            amount: data.plan_price,
            description,
            plan_id: data.plan_id,
            plan_name: data.plan_name,
            billing_cycle: data.billing_cycle,
            payer_email: data.payer_email,
            payer_name: data.payer_name,
            external_reference: payment.id,
            success_url: `${window.location.origin}/checkout/success`,
            cancel_url: `${window.location.origin}/checkout?plan=${data.plan_id}&cycle=${data.billing_cycle}`,
          },
        });

        if (stripeResponse.error) {
          console.error('[useCheckout] Stripe error:', stripeResponse.error);
          throw new Error(stripeResponse.error.message || 'Erro ao criar checkout Stripe');
        }

        const stripeData = stripeResponse.data;
        
        if (!stripeData?.success || !stripeData?.checkout_url) {
          throw new Error('Falha ao criar sessão de checkout Stripe');
        }

        stripeCheckoutUrl = stripeData.checkout_url;
        
        // Redirect to Stripe Checkout
        window.location.href = stripeCheckoutUrl;
        return null; // Will redirect
      }

      return {
        invoiceId: invoice.id,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        pixCode: pixCode,
        pixQrCode: pixQrCode,
        amount: data.plan_price,
        dueDate,
      };
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Erro no checkout');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check payment status via edge function (queries Mercado Pago directly)
  const checkPaymentStatus = useCallback(async (paymentId: string): Promise<PaymentStatus | null> => {
    try {
      console.log('[useCheckout] Checking payment status for:', paymentId);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        console.error('[useCheckout] No session for payment status check');
        return null;
      }

      const response = await supabase.functions.invoke('check-payment-status', {
        body: { payment_id: paymentId },
      });

      console.log('[useCheckout] Payment status response:', response);

      if (response.error) {
        console.error('[useCheckout] Error checking payment status:', response.error);
        // Fallback to direct database query
        const { data, error } = await supabase
          .from('payments')
          .select('id, status, paid_at')
          .eq('id', paymentId)
          .single();

        if (error) {
          console.error('Error in fallback payment status check:', error);
          return null;
        }
        return data;
      }

      return {
        id: response.data.payment_id,
        status: response.data.status,
        paid_at: response.data.is_final ? new Date().toISOString() : null,
      };
    } catch (err) {
      console.error('Error checking payment status:', err);
      return null;
    }
  }, []);

  // Get user's pending payments
  const getPendingPayments = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoices(*)')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending payments:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      return [];
    }
  }, [user]);

  return {
    createCheckout,
    checkPaymentStatus,
    getPendingPayments,
    loading,
    error,
  };
};
