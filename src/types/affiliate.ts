// Affiliate System Types

export type AffiliateStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'CANCELLED';
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  commission_rate: number; // percentage
  status: AffiliateStatus;
  total_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  created_at: Date;
  updated_at: Date;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface Referral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referred_user_email: string;
  status: ReferralStatus;
  converted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  payment_id?: string;
  subscription_id?: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  status: CommissionStatus;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
  // Joined data
  referred_user_email?: string;
  plan_name?: string;
}

export interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  convertedReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
}

export interface CreateAffiliateData {
  user_id: string;
  commission_rate?: number;
  referral_code?: string;
}
