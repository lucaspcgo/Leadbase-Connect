import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Payment, 
  Invoice, 
  Subscription, 
  PaymentConfig, 
  FinancialAuditLog,
  PaymentStatus,
  SubscriptionStatus,
  CheckoutData,
} from '@/types/payment';
import { useAuth } from './AuthContext';
import { usePaymentConfig, dbToPaymentConfig } from '@/hooks/usePaymentConfig';

// Generate simple UUID
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

interface PaymentContextType {
  // Data
  payments: Payment[];
  invoices: Invoice[];
  subscriptions: Subscription[];
  paymentConfig: PaymentConfig;
  financialAuditLogs: FinancialAuditLog[];
  
  // Loading state for config
  configLoading: boolean;
  
  // Checkout
  createCheckout: (data: CheckoutData) => { invoice: Invoice; payment: Payment; subscription: Subscription };
  
  // Payments
  getPaymentsByUser: (userId: string) => Payment[];
  getPaymentById: (id: string) => Payment | undefined;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus, adminId?: string, adminName?: string) => void;
  
  // Invoices
  getInvoicesByUser: (userId: string) => Invoice[];
  getInvoiceById: (id: string) => Invoice | undefined;
  markInvoiceAsPaid: (invoiceId: string, adminId: string, adminName: string) => void;
  
  // Subscriptions
  getSubscriptionByUser: (userId: string) => Subscription | undefined;
  getSubscriptionById: (id: string) => Subscription | undefined;
  activateSubscription: (subscriptionId: string) => void;
  cancelSubscription: (subscriptionId: string, adminId?: string, adminName?: string) => void;
  extendSubscription: (subscriptionId: string, days: number, adminId: string, adminName: string) => void;
  
  // Config (MASTER_ADMIN only) - now async
  updatePaymentConfig: (config: Partial<PaymentConfig>, adminId: string, adminName: string) => Promise<void>;
  
  // Audit
  getFinancialAuditLogs: () => FinancialAuditLog[];
  getAuditLogsByUser: (userId: string) => FinancialAuditLog[];
  
  // PIX Generation
  generatePixCode: (amount: number, description: string) => string;
}

const defaultPaymentConfig: PaymentConfig = {
  pix: {
    enabled: true,
    chave_pix: '',
    tipo_chave: 'EMAIL',
    beneficiario: 'LeadBase Pro',
    cidade: 'Sao Paulo',
    instrucoes: 'Pagamento para assinatura LeadBase Pro',
  },
  mercado_pago: {
    enabled: false,
    access_token: '',
    public_key: '',
    sandbox_mode: true,
    webhook_secret: '',
  },
  paypal: {
    enabled: false,
    client_id: '',
    client_secret: '',
    sandbox_mode: true,
    webhook_id: '',
  },
  stripe: {
    enabled: false,
    publishable_key: '',
    secret_key: '',
    sandbox_mode: true,
    webhook_secret: '',
  },
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Wrap useAuth in try-catch to prevent provider from failing
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user ?? null;
  } catch (e) {
    console.warn('PaymentProvider: AuthContext not available yet');
  }
  
  // Use secure hook for payment config (from database, not localStorage)
  const paymentConfigResult = usePaymentConfig();
  const dbPaymentConfig = paymentConfigResult?.paymentConfig ?? null;
  const configLoading = paymentConfigResult?.loading ?? false;
  const updateConfig = paymentConfigResult?.updateConfig ?? (async () => false);
  
  // Payments, invoices, subscriptions still use localStorage for now (not secrets)
  // These should eventually be moved to database as well
  const [payments, setPayments] = useState<Payment[]>(() => {
    const stored = localStorage.getItem('leadbase_payments');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const stored = localStorage.getItem('leadbase_invoices');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const stored = localStorage.getItem('leadbase_subscriptions');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [financialAuditLogs, setFinancialAuditLogs] = useState<FinancialAuditLog[]>(() => {
    const stored = localStorage.getItem('leadbase_financial_audit_logs');
    return stored ? JSON.parse(stored) : [];
  });

  // Use config from database, fall back to default
  const paymentConfig = dbPaymentConfig || defaultPaymentConfig;

  // Persist non-sensitive data to localStorage
  useEffect(() => {
    localStorage.setItem('leadbase_payments', JSON.stringify(payments));
  }, [payments]);
  
  useEffect(() => {
    localStorage.setItem('leadbase_invoices', JSON.stringify(invoices));
  }, [invoices]);
  
  useEffect(() => {
    localStorage.setItem('leadbase_subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);
  
  // REMOVED: localStorage.setItem('leadbase_payment_config', ...) - now in database
  
  useEffect(() => {
    localStorage.setItem('leadbase_financial_audit_logs', JSON.stringify(financialAuditLogs));
  }, [financialAuditLogs]);

  const addAuditLog = useCallback((log: Omit<FinancialAuditLog, 'id' | 'created_at'>) => {
    const newLog: FinancialAuditLog = {
      ...log,
      id: generateId(),
      created_at: new Date(),
    };
    setFinancialAuditLogs(prev => [newLog, ...prev]);
  }, []);

  // Generate PIX code (simplified EMV format)
  const generatePixCode = useCallback((amount: number, description: string): string => {
    const config = paymentConfig.pix;
    if (!config.enabled || !config.chave_pix) {
      return '';
    }
    
    // Simplified PIX code generation (real implementation would use proper EMV format)
    const pixData = {
      chave: config.chave_pix,
      beneficiario: config.beneficiario,
      cidade: config.cidade,
      valor: amount.toFixed(2),
      descricao: description,
    };
    
    // Generate a mock PIX code (in production, use proper library)
    const code = `00020126${config.chave_pix.length.toString().padStart(2, '0')}${config.chave_pix}5204000053039865802BR5913${config.beneficiario.substring(0, 13)}6008${config.cidade.substring(0, 8)}62070503***6304`;
    return code;
  }, [paymentConfig.pix]);

  // Create checkout (invoice + payment + subscription)
  // Now uses plan data passed directly from checkout page (from database)
  const createCheckout = useCallback((data: CheckoutData) => {
    const amount = data.plan_price;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    
    // Create Invoice
    const invoice: Invoice = {
      id: generateId(),
      user_id: user?.id || data.payer_email,
      user_email: data.payer_email,
      plan_id: data.plan_id,
      plan_name: data.plan_name,
      billing_cycle: data.billing_cycle,
      amount,
      status: 'PENDING',
      due_date: dueDate,
      created_at: now,
      description: `Assinatura ${data.plan_name} - ${data.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}`,
    };
    
    // Create Payment
    const payment: Payment = {
      id: generateId(),
      invoice_id: invoice.id,
      user_id: user?.id || data.payer_email,
      user_email: data.payer_email,
      amount,
      method: data.payment_method,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
      pix_code: data.payment_method === 'PIX' ? generatePixCode(amount, invoice.description) : undefined,
    };
    
    // Create Subscription
    const subscription: Subscription = {
      id: generateId(),
      user_id: user?.id || data.payer_email,
      user_email: data.payer_email,
      plan_id: data.plan_id,
      plan_name: data.plan_name,
      status: 'PENDING',
      billing_cycle: data.billing_cycle,
      price: amount,
      created_at: now,
      updated_at: now,
    };
    
    setInvoices(prev => [...prev, invoice]);
    setPayments(prev => [...prev, payment]);
    setSubscriptions(prev => [...prev, subscription]);
    
    return { invoice, payment, subscription };
  }, [user, generatePixCode]);

  // Payments
  const getPaymentsByUser = useCallback((userId: string) => {
    return payments.filter(p => p.user_id === userId);
  }, [payments]);
  
  const getPaymentById = useCallback((id: string) => {
    return payments.find(p => p.id === id);
  }, [payments]);
  
  const updatePaymentStatus = useCallback((paymentId: string, status: PaymentStatus, adminId?: string, adminName?: string) => {
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        const updated = { 
          ...p, 
          status, 
          updated_at: new Date(),
          paid_at: status === 'APPROVED' ? new Date() : p.paid_at,
        };
        
        // If approved, update invoice and activate subscription
        if (status === 'APPROVED') {
          // Update invoice
          setInvoices(inv => inv.map(i => 
            i.id === p.invoice_id ? { ...i, status: 'PAID' as const, paid_at: new Date() } : i
          ));
          
          // Find and activate subscription
          const invoice = invoices.find(i => i.id === p.invoice_id);
          if (invoice) {
            const sub = subscriptions.find(s => s.user_id === p.user_id && s.status === 'PENDING');
            if (sub) {
              activateSubscription(sub.id);
            }
          }
        }
        
        return updated;
      }
      return p;
    }));
    
    if (adminId && adminName) {
      addAuditLog({
        admin_id: adminId,
        admin_name: adminName,
        action: 'PAYMENT_MARKED_PAID',
        entity_type: 'PAYMENT',
        entity_id: paymentId,
        details: `Status alterado para ${status}`,
        after_value: status,
      });
    }
  }, [invoices, subscriptions, addAuditLog]);

  // Invoices
  const getInvoicesByUser = useCallback((userId: string) => {
    return invoices.filter(i => i.user_id === userId);
  }, [invoices]);
  
  const getInvoiceById = useCallback((id: string) => {
    return invoices.find(i => i.id === id);
  }, [invoices]);
  
  const markInvoiceAsPaid = useCallback((invoiceId: string, adminId: string, adminName: string) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    setInvoices(prev => prev.map(i => 
      i.id === invoiceId ? { ...i, status: 'PAID' as const, paid_at: new Date() } : i
    ));
    
    // Also update related payment
    const payment = payments.find(p => p.invoice_id === invoiceId);
    if (payment) {
      updatePaymentStatus(payment.id, 'APPROVED', adminId, adminName);
    }
    
    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'PAYMENT_MARKED_PAID',
      target_user_id: invoice.user_id,
      target_user_email: invoice.user_email,
      entity_type: 'INVOICE',
      entity_id: invoiceId,
      details: `Fatura marcada como paga manualmente`,
    });
  }, [invoices, payments, updatePaymentStatus, addAuditLog]);

  // Subscriptions
  const getSubscriptionByUser = useCallback((userId: string) => {
    return subscriptions.find(s => s.user_id === userId && (s.status === 'ACTIVE' || s.status === 'PENDING'));
  }, [subscriptions]);
  
  const getSubscriptionById = useCallback((id: string) => {
    return subscriptions.find(s => s.id === id);
  }, [subscriptions]);
  
  const activateSubscription = useCallback((subscriptionId: string) => {
    setSubscriptions(prev => prev.map(s => {
      if (s.id === subscriptionId) {
        const now = new Date();
        const periodEnd = new Date(now);
        if (s.billing_cycle === 'YEARLY') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        
        return {
          ...s,
          status: 'ACTIVE' as SubscriptionStatus,
          start_at: now,
          current_period_start: now,
          current_period_end: periodEnd,
          updated_at: now,
        };
      }
      return s;
    }));
  }, []);
  
  const cancelSubscription = useCallback((subscriptionId: string, adminId?: string, adminName?: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;
    
    setSubscriptions(prev => prev.map(s => 
      s.id === subscriptionId ? { 
        ...s, 
        status: 'CANCELLED' as SubscriptionStatus, 
        cancelled_at: new Date(),
        updated_at: new Date(),
      } : s
    ));
    
    if (adminId && adminName) {
      addAuditLog({
        admin_id: adminId,
        admin_name: adminName,
        action: 'SUBSCRIPTION_CANCELLED',
        target_user_id: sub.user_id,
        target_user_email: sub.user_email,
        entity_type: 'SUBSCRIPTION',
        entity_id: subscriptionId,
        details: `Assinatura ${sub.plan_name} cancelada`,
      });
    }
  }, [subscriptions, addAuditLog]);
  
  const extendSubscription = useCallback((subscriptionId: string, days: number, adminId: string, adminName: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;
    
    setSubscriptions(prev => prev.map(s => {
      if (s.id === subscriptionId && s.current_period_end) {
        const newEnd = new Date(s.current_period_end);
        newEnd.setDate(newEnd.getDate() + days);
        return {
          ...s,
          current_period_end: newEnd,
          updated_at: new Date(),
        };
      }
      return s;
    }));
    
    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'SUBSCRIPTION_EXTENDED',
      target_user_id: sub.user_id,
      target_user_email: sub.user_email,
      entity_type: 'SUBSCRIPTION',
      entity_id: subscriptionId,
      details: `Assinatura prorrogada em ${days} dias`,
    });
  }, [subscriptions, addAuditLog]);

  // Config - now uses database via hook
  const updatePaymentConfigHandler = useCallback(async (config: Partial<PaymentConfig>, adminId: string, adminName: string) => {
    const beforeValue = JSON.stringify(paymentConfig);
    
    const success = await updateConfig(config);
    
    if (success) {
      addAuditLog({
        admin_id: adminId,
        admin_name: adminName,
        action: 'CONFIG_CHANGED',
        entity_type: 'CONFIG',
        details: 'Configurações de pagamento atualizadas',
        before_value: beforeValue,
        after_value: JSON.stringify(config),
      });
    }
  }, [paymentConfig, updateConfig, addAuditLog]);

  // Audit
  const getFinancialAuditLogs = useCallback(() => {
    return financialAuditLogs;
  }, [financialAuditLogs]);
  
  const getAuditLogsByUser = useCallback((userId: string) => {
    return financialAuditLogs.filter(log => log.target_user_id === userId);
  }, [financialAuditLogs]);

  const value: PaymentContextType = {
    payments,
    invoices,
    subscriptions,
    paymentConfig,
    financialAuditLogs,
    configLoading,
    createCheckout,
    getPaymentsByUser,
    getPaymentById,
    updatePaymentStatus,
    getInvoicesByUser,
    getInvoiceById,
    markInvoiceAsPaid,
    getSubscriptionByUser,
    getSubscriptionById,
    activateSubscription,
    cancelSubscription,
    extendSubscription,
    updatePaymentConfig: updatePaymentConfigHandler,
    getFinancialAuditLogs,
    getAuditLogsByUser,
    generatePixCode,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
