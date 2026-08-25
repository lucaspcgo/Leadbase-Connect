import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Affiliate, Referral, AffiliateCommission, AffiliateStats, CreateAffiliateData, ReferralStatus, CommissionStatus } from '@/types/affiliate';
import { useAuth } from '@/contexts/AuthContext';

export const useAffiliates = () => {
  const { isAdmin } = useAuth();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all affiliates (admin only)
  const fetchAffiliates = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch user emails for each affiliate
      const affiliatesWithUsers: Affiliate[] = [];
      for (const aff of data || []) {
        // Try to get user email from auth.users via profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', aff.user_id)
          .single();

        affiliatesWithUsers.push({
          ...aff,
          user_name: profile?.name || 'N/A',
          created_at: new Date(aff.created_at),
          updated_at: new Date(aff.updated_at),
        } as Affiliate);
      }

      setAffiliates(affiliatesWithUsers);
    } catch (err) {
      console.error('Error fetching affiliates:', err);
      setError('Erro ao carregar afiliados');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch referrals for an affiliate
  const fetchReferrals = useCallback(async (affiliateId?: string) => {
    if (!isAdmin && !affiliateId) return;
    
    try {
      let query = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setReferrals((data || []).map(r => ({
        ...r,
        status: r.status as ReferralStatus,
        created_at: new Date(r.created_at),
        updated_at: new Date(r.updated_at),
        converted_at: r.converted_at ? new Date(r.converted_at) : undefined,
      })));
    } catch (err) {
      console.error('Error fetching referrals:', err);
    }
  }, [isAdmin]);

  // Fetch commissions
  const fetchCommissions = useCallback(async (affiliateId?: string) => {
    if (!isAdmin && !affiliateId) return;
    
    try {
      let query = supabase
        .from('affiliate_commissions')
        .select(`
          *,
          referrals (referred_user_email),
          subscriptions (plan_name)
        `)
        .order('created_at', { ascending: false });

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setCommissions((data || []).map(c => ({
        ...c,
        status: c.status as CommissionStatus,
        referred_user_email: (c.referrals as any)?.referred_user_email,
        plan_name: (c.subscriptions as any)?.plan_name,
        created_at: new Date(c.created_at),
        updated_at: new Date(c.updated_at),
        paid_at: c.paid_at ? new Date(c.paid_at) : undefined,
      })));
    } catch (err) {
      console.error('Error fetching commissions:', err);
    }
  }, [isAdmin]);

  // Calculate stats
  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data: affiliatesData } = await supabase
        .from('affiliates')
        .select('status, total_earnings, pending_earnings, paid_earnings');

      const { data: referralsData } = await supabase
        .from('referrals')
        .select('status');

      const { data: commissionsData } = await supabase
        .from('affiliate_commissions')
        .select('status, commission_amount');

      const totalAffiliates = affiliatesData?.length || 0;
      const activeAffiliates = affiliatesData?.filter(a => a.status === 'ACTIVE').length || 0;
      const totalReferrals = referralsData?.length || 0;
      const convertedReferrals = referralsData?.filter(r => r.status === 'CONVERTED').length || 0;
      const totalCommissions = commissionsData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const pendingCommissions = commissionsData?.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const paidCommissions = commissionsData?.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      setStats({
        totalAffiliates,
        activeAffiliates,
        totalReferrals,
        convertedReferrals,
        totalCommissions,
        pendingCommissions,
        paidCommissions,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [isAdmin]);

  // Create new affiliate
  const createAffiliate = useCallback(async (data: CreateAffiliateData): Promise<Affiliate | null> => {
    if (!isAdmin) return null;

    try {
      // Generate referral code if not provided
      let referralCode = data.referral_code;
      if (!referralCode) {
        const { data: codeData, error: codeError } = await supabase.rpc('generate_referral_code');
        if (codeError) throw codeError;
        referralCode = codeData;
      }

      const { data: newAffiliate, error: createError } = await supabase
        .from('affiliates')
        .insert({
          user_id: data.user_id,
          referral_code: referralCode?.toUpperCase(),
          commission_rate: data.commission_rate || 10,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchAffiliates();
      await fetchStats();

      return {
        ...newAffiliate,
        created_at: new Date(newAffiliate.created_at),
        updated_at: new Date(newAffiliate.updated_at),
      } as Affiliate;
    } catch (err) {
      console.error('Error creating affiliate:', err);
      setError('Erro ao criar afiliado');
      return null;
    }
  }, [isAdmin, fetchAffiliates, fetchStats]);

  // Update affiliate
  const updateAffiliate = useCallback(async (
    affiliateId: string,
    updates: Partial<Pick<Affiliate, 'commission_rate' | 'status' | 'referral_code'>>
  ): Promise<boolean> => {
    if (!isAdmin) return false;

    try {
      const { error: updateError } = await supabase
        .from('affiliates')
        .update({
          ...updates,
          referral_code: updates.referral_code?.toUpperCase(),
        })
        .eq('id', affiliateId);

      if (updateError) throw updateError;

      await fetchAffiliates();
      return true;
    } catch (err) {
      console.error('Error updating affiliate:', err);
      setError('Erro ao atualizar afiliado');
      return false;
    }
  }, [isAdmin, fetchAffiliates]);

  // Delete affiliate
  const deleteAffiliate = useCallback(async (affiliateId: string): Promise<boolean> => {
    if (!isAdmin) return false;

    try {
      const { error: deleteError } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliateId);

      if (deleteError) throw deleteError;

      await fetchAffiliates();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Error deleting affiliate:', err);
      setError('Erro ao excluir afiliado');
      return false;
    }
  }, [isAdmin, fetchAffiliates, fetchStats]);

  // Update commission status
  const updateCommissionStatus = useCallback(async (
    commissionId: string,
    status: 'APPROVED' | 'PAID' | 'CANCELLED'
  ): Promise<boolean> => {
    if (!isAdmin) return false;

    try {
      const updateData: any = { status };
      if (status === 'PAID') {
        updateData.paid_at = new Date().toISOString();
      }

      const { data: commission, error: fetchError } = await supabase
        .from('affiliate_commissions')
        .select('affiliate_id, commission_amount')
        .eq('id', commissionId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('affiliate_commissions')
        .update(updateData)
        .eq('id', commissionId);

      if (updateError) throw updateError;

      // Update affiliate earnings if status changed to PAID
      if (status === 'PAID' && commission) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('pending_earnings, paid_earnings')
          .eq('id', commission.affiliate_id)
          .single();

        if (affiliate) {
          await supabase
            .from('affiliates')
            .update({
              pending_earnings: Math.max(0, Number(affiliate.pending_earnings) - Number(commission.commission_amount)),
              paid_earnings: Number(affiliate.paid_earnings) + Number(commission.commission_amount),
            })
            .eq('id', commission.affiliate_id);
        }
      }

      // Send email notification for APPROVED or PAID status
      if (status === 'APPROVED' || status === 'PAID') {
        try {
          await supabase.functions.invoke('send-affiliate-commission-email', {
            body: { commission_id: commissionId, status },
          });
        } catch (emailErr) {
          console.error('Error sending commission email:', emailErr);
          // Don't fail the operation if email fails
        }
      }

      await fetchCommissions();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Error updating commission:', err);
      setError('Erro ao atualizar comissão');
      return false;
    }
  }, [isAdmin, fetchCommissions, fetchStats]);

  // Initial fetch
  useEffect(() => {
    if (isAdmin) {
      fetchAffiliates();
      fetchStats();
    }
  }, [isAdmin, fetchAffiliates, fetchStats]);

  return {
    affiliates,
    referrals,
    commissions,
    stats,
    loading,
    error,
    fetchAffiliates,
    fetchReferrals,
    fetchCommissions,
    fetchStats,
    createAffiliate,
    updateAffiliate,
    deleteAffiliate,
    updateCommissionStatus,
  };
};

// Hook for user's own affiliate data
export const useMyAffiliate = () => {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyAffiliate = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAffiliate({
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        } as Affiliate);

        // Fetch referrals
        const { data: referralsData } = await supabase
          .from('referrals')
          .select('*')
          .eq('affiliate_id', data.id)
          .order('created_at', { ascending: false });

        setReferrals((referralsData || []).map(r => ({
          ...r,
          status: r.status as ReferralStatus,
          created_at: new Date(r.created_at),
          updated_at: new Date(r.updated_at),
          converted_at: r.converted_at ? new Date(r.converted_at) : undefined,
        })));

        // Fetch commissions
        const { data: commissionsData } = await supabase
          .from('affiliate_commissions')
          .select('*')
          .eq('affiliate_id', data.id)
          .order('created_at', { ascending: false });

        setCommissions((commissionsData || []).map(c => ({
          ...c,
          status: c.status as CommissionStatus,
          created_at: new Date(c.created_at),
          updated_at: new Date(c.updated_at),
          paid_at: c.paid_at ? new Date(c.paid_at) : undefined,
        })));
      }
    } catch (err) {
      console.error('Error fetching my affiliate:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyAffiliate();
  }, [fetchMyAffiliate]);

  const getReferralLink = useCallback(() => {
    if (!affiliate) return null;
    return `${window.location.origin}/cadastro?ref=${affiliate.referral_code}`;
  }, [affiliate]);

  return {
    affiliate,
    referrals,
    commissions,
    loading,
    getReferralLink,
    refresh: fetchMyAffiliate,
  };
};
