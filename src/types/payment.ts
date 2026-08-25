// Payment System Types

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'PIX' | 'MERCADO_PAGO' | 'PAYPAL' | 'STRIPE';
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

// Invoice (Fatura)
export interface Invoice {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  due_date: Date;
  paid_at?: Date;
  created_at: Date;
  description: string;
}

// Payment (Pagamento)
export interface Payment {
  id: string;
  invoice_id: string;
  user_id: string;
  user_email: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  external_id?: string; // ID externo (Mercado Pago, etc)
  pix_code?: string; // Código PIX copia e cola
  pix_qrcode?: string; // Base64 do QR Code
  created_at: Date;
  updated_at: Date;
  paid_at?: Date;
  metadata?: Record<string, any>;
}

// Subscription (Assinatura)
export interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  price: number;
  start_at?: Date;
  current_period_start?: Date;
  current_period_end?: Date; // Data de renovação
  cancelled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Payment Configuration
export interface PixConfig {
  enabled: boolean;
  chave_pix: string;
  tipo_chave: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  beneficiario: string;
  cidade: string;
  instrucoes?: string;
}

export interface MercadoPagoConfig {
  enabled: boolean;
  access_token: string;
  public_key: string;
  sandbox_mode: boolean;
  webhook_secret?: string;
}

export interface PayPalConfig {
  enabled: boolean;
  client_id: string;
  client_secret: string;
  sandbox_mode: boolean;
  webhook_id?: string;
}

export interface StripeConfig {
  enabled: boolean;
  publishable_key: string;
  secret_key: string;
  webhook_secret?: string;
  sandbox_mode: boolean;
}

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_email: string;
  from_name: string;
}

export interface PaymentConfig {
  pix: PixConfig;
  mercado_pago: MercadoPagoConfig;
  paypal: PayPalConfig;
  stripe: StripeConfig;
  smtp?: SmtpConfig;
}

// Checkout Data
export interface CheckoutData {
  plan_id: string;
  plan_name: string;
  plan_price: number; // The actual price based on billing cycle
  billing_cycle: BillingCycle;
  payer_name: string;
  payer_email: string;
  payer_document?: string; // CPF/CNPJ
  payment_method: PaymentMethod;
}

// Financial Audit Log
export interface FinancialAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: 'PAYMENT_MARKED_PAID' | 'SUBSCRIPTION_EXTENDED' | 'SUBSCRIPTION_CANCELLED' | 'REFUND_ISSUED' | 'CONFIG_CHANGED';
  target_user_id?: string;
  target_user_email?: string;
  entity_type: 'PAYMENT' | 'SUBSCRIPTION' | 'INVOICE' | 'CONFIG';
  entity_id?: string;
  details: string;
  before_value?: string;
  after_value?: string;
  created_at: Date;
}
