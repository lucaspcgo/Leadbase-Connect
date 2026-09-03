// User and Auth Types
export type UserRole = 'USER' | 'ADMIN' | 'MASTER_ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  extraCredits: number; // Créditos extras (não expiram)
  plan: Plan | null;
  planStartDate: Date | null; // Data de início do plano para calcular renovação
  planExpiresAt: Date | null; // Validade do plano pago. null = não expira
  monthlyLimit?: number; // Override do limite mensal
  createdAt: Date;
  emailVerified: boolean;
  blockedAt?: Date | null;
  blockedReason?: string | null;
  blockedBy?: string | null;
}

// Credit Ledger Entry
export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  amount: number; // positive = add, negative = remove
  reason: string;
  admin_id: string;
  admin_name: string;
  created_at: Date;
}

// Admin Audit Log (for user management)
export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BLOCK' | 'UNBLOCK' | 'ROLE_CHANGE' | 'PLAN_CHANGE' | 'CREDIT_ADJUST';
  target_user_id: string;
  target_user_email: string;
  details: string;
  before_value?: string;
  after_value?: string;
  created_at: Date;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  monthlyCompanyLimit: number; // Limite de empresas por mês
  features: string[];
  maxUsers?: number;
  canExport?: boolean;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number; // 1 crédito = 1 empresa adicional
  price: number;
  popular?: boolean;
}

// Enterprise (Empresa) Types
export interface Empresa {
  id: number;
  cnpj: string;
  matriz_filial: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  sit_cadastral: string | null;
  data_sit_cadastral: Date | null;
  motivo_sit_cadastral: string | null;
  nome_cidade_exterior: string | null;
  cod_pais: string | null;
  nome_pais: string | null;
  cod_natureza_juridica: string | null;
  data_inicio_atividade: Date | null;
  cnae_fiscal: string | null;
  cnae_codigo: string | null;
  desc_tipo_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  cod_municipio: string | null;
  municipio: string | null;
  ddd_telefone_1: string | null;
  telefone1_celular: boolean | null;
  ddd_telefone_2: string | null;
  telefone2_celular: boolean | null;
  ddd_fax: string | null;
  correio_eletronico: string | null;
  email: string | null;
  qualif_responsavel: string | null;
  capital_social_empresa: number | null;
  porte_empresa: string | null;
  opcao_simples: string | null;
  data_opcao_simples: Date | null;
  data_exclusao_simples: Date | null;
  opcao_mei: string | null;
  sit_especial: string | null;
  data_sit_especial: Date | null;
  socios: string | null;
  socios_raw: string | null; // Original imported text
  cnaes_secundarios: string | null;
  categoria_id: string | null;
  tags: string[]; // Array of tag IDs
  updated_at?: Date | null;
  created_at?: Date | null;
}

// Socio (Partner) Type
export interface Socio {
  id: string;
  empresa_cnpj: string;
  nome_socio: string;
  qualificacao: string | null;
  fonte: 'importado' | 'manual';
  updated_at: Date;
}

// Category Type
export interface Categoria {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
}

// Tag Type
export interface Tag {
  id: string;
  nome: string;
}

// Audit Log for empresa changes
export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  empresa_cnpj: string;
  campo_alterado: string;
  valor_anterior: string;
  valor_novo: string;
  data_hora: Date;
}

// Saved Filter
export interface SavedFilter {
  id: string;
  user_id: string;
  nome: string;
  filtros: EmpresaFilters & {
    categoria_id?: string;
    tag_ids?: string[];
    tem_email?: boolean;
    tem_telefone?: boolean;
    tem_socios?: boolean;
    busca_socio?: string;
  };
  is_admin: boolean;
}

// Filter Types
export interface EmpresaFilters {
  uf?: string;
  municipio?: string;
  cnae_codigo?: string;
  sit_cadastral?: string;
  porte_empresa?: string;
  opcao_simples?: string;
  opcao_mei?: string;
  data_inicio_atividade_from?: Date;
  data_inicio_atividade_to?: Date;
  capital_social_from?: number;
  capital_social_to?: number;
  search?: string;
}

// Access Log for auditing (empresa visualizada)
export interface AccessLog {
  id: string;
  userId: string;
  empresaCnpj: string;
  cnpj: string; // normalized CNPJ
  accessedAt: Date;
  usedExtraCredit: boolean; // Se consumiu crédito extra
  billingMonth: string; // YYYY-MM para controle mensal
}

// Unlocked company record (persistência do desbloqueio)
export interface UnlockedCompany {
  id: string;
  user_id: string;
  empresa_cnpj: string;
  empresa_id?: number | null; // ID da empresa (para verificação quando CNPJ não disponível)
  unlocked_at: Date;
  expires_at: Date; // Fim do ciclo atual do plano
  source: 'monthly_limit' | 'extra_credit' | 'database'; // Origem do desbloqueio
}

export interface ConsultaHistorico {
  id: string;
  userId: string;
  empresa: Empresa;
  accessedAt: Date;
  usedExtraCredit: boolean;
}

// Import Types
export interface ImportResult {
  success: boolean;
  totalRows: number;
  inserted: number;
  updated: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalUsers: number;
  totalEmpresas: number;
  totalConsultas: number;
  creditosConsumidos: number;
  receitaEstimada: number;
  usersThisMonth: number;
  consultasThisMonth: number;
}

// User Access Stats
export interface UserAccessStats {
  companiesViewedThisMonth: number;
  monthlyLimit: number;
  extraCredits: number;
  planRenewalDate: Date | null;
  currentBillingMonth: string;
}
