import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AccessLog, UserAccessStats, UnlockedCompany } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AccessContextType {
  accessLogs: AccessLog[];
  unlockedCompanies: UnlockedCompany[];
  getAccessStats: () => UserAccessStats;
  canAccessCompany: (empresaCnpj: string) => { allowed: boolean; reason?: string; requiresExtraCredit?: boolean };
  accessCompany: (empresaCnpj: string, empresaId?: number) => Promise<boolean>;
  isCompanyUnlocked: (empresaCnpj: string) => boolean;
  isCompanyUnlockedById: (empresaId: number) => boolean; // Check by ID
  hasExceededLimit: () => boolean;
  getViewedCompaniesThisMonth: () => string[];
  fetchFullEmpresaData: (empresaCnpj: string) => Promise<any | null>;
  teamUnlockedCompanies: UnlockedCompany[]; // Companies unlocked by team (owner + members)
  loadingUnlocked: boolean; // Loading state for unlocked companies
}

const CreditContext = createContext<AccessContextType | undefined>(undefined);

// Helper to get current billing month (YYYY-MM)
const getCurrentBillingMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Helper to calculate renewal date (end of current billing cycle)
const getNextRenewalDate = (planStartDate: Date | null): Date | null => {
  if (!planStartDate) return null;
  const renewal = new Date(planStartDate);
  const now = new Date();
  
  // Move to next month after plan start that's in the future
  while (renewal <= now) {
    renewal.setMonth(renewal.getMonth() + 1);
  }
  return renewal;
};

// Helper to get cycle end date for unlocking
const getCycleEndDate = (planStartDate: Date | null): Date => {
  if (!planStartDate) {
    // For free users without plan, use end of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
  
  const renewal = getNextRenewalDate(planStartDate);
  if (renewal) {
    // Set to end of day before renewal
    renewal.setHours(23, 59, 59, 999);
    return renewal;
  }
  
  // Fallback: end of current month
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
};

export const CreditProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateExtraCredits, isAuthenticated, isTeamMember, teamOwnerInfo } = useAuth();
  
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [unlockedCompanies, setUnlockedCompanies] = useState<UnlockedCompany[]>([]);
  const [teamUnlockedCompanies, setTeamUnlockedCompanies] = useState<UnlockedCompany[]>([]);
  const [loadingUnlocked, setLoadingUnlocked] = useState(true);

  // Fetch unlocked companies from database on mount
  // For team members, also fetch owner's unlocked companies
  useEffect(() => {
    const fetchUnlockedCompanies = async () => {
      if (!user) {
        setUnlockedCompanies([]);
        setTeamUnlockedCompanies([]);
        setLoadingUnlocked(false);
        return;
      }

      try {
        // Determine which user_id to query for unlocked companies
        // If user is a team member, we need to query both their own AND the owner's
        const userIdsToQuery: string[] = [user.id];
        
        if (isTeamMember && teamOwnerInfo?.ownerId) {
          userIdsToQuery.push(teamOwnerInfo.ownerId);
        }

        const { data, error } = await supabase
          .from('unlocked_companies')
          .select('*')
          .in('user_id', userIdsToQuery)
          .gte('billing_cycle_end', new Date().toISOString());

        if (error) throw error;

        const mapped = (data || []).map(record => ({
          id: record.id,
          user_id: record.user_id,
          empresa_cnpj: record.empresa_cnpj,
          empresa_id: record.empresa_id,
          unlocked_at: new Date(record.unlocked_at),
          expires_at: new Date(record.billing_cycle_end),
          source: 'database' as const
        }));

        // Separate own unlocked from team (owner's) unlocked
        const ownUnlocked = mapped.filter(c => c.user_id === user.id);
        const teamUnlocked = mapped.filter(c => c.user_id !== user.id);

        setUnlockedCompanies(ownUnlocked);
        setTeamUnlockedCompanies(teamUnlocked);
        
        console.log('Unlocked companies loaded:', { own: ownUnlocked.length, team: teamUnlocked.length });
      } catch (error) {
        console.error('Error fetching unlocked companies:', error);
      } finally {
        setLoadingUnlocked(false);
      }
    };

    fetchUnlockedCompanies();
  }, [user, isTeamMember, teamOwnerInfo]);

  // Fetch access logs from database
  useEffect(() => {
    const fetchAccessLogs = async () => {
      if (!user) {
        setAccessLogs([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('access_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const mapped = (data || []).map(log => ({
          id: log.id,
          userId: log.user_id,
          empresaCnpj: log.empresa_cnpj,
          cnpj: log.empresa_cnpj,
          accessedAt: new Date(log.created_at),
          usedExtraCredit: log.used_extra_credit || false,
          billingMonth: getCurrentBillingMonth(),
        }));

        setAccessLogs(mapped);
      } catch (error) {
        console.error('Error fetching access logs:', error);
      }
    };

    fetchAccessLogs();
  }, [user]);

  const normalizeCnpj = (cnpj: string): string => {
    return cnpj.replace(/\D/g, '').padStart(14, '0');
  };

  // Check if company is unlocked for current user or team owner (not expired)
  const isCompanyUnlocked = useCallback((empresaCnpj: string): boolean => {
    if (!user) return false;
    
    const normalizedCnpj = normalizeCnpj(empresaCnpj);
    const now = new Date();
    
    // Check own unlocked companies
    const ownUnlocked = unlockedCompanies.some(
      record => record.empresa_cnpj === normalizedCnpj && 
               new Date(record.expires_at) > now
    );
    
    if (ownUnlocked) return true;
    
    // Check team owner's unlocked companies (for team members)
    if (isTeamMember && teamUnlockedCompanies.length > 0) {
      const teamUnlocked = teamUnlockedCompanies.some(
        record => record.empresa_cnpj === normalizedCnpj && 
                 new Date(record.expires_at) > now
      );
      if (teamUnlocked) return true;
    }
    
    return false;
  }, [unlockedCompanies, teamUnlockedCompanies, user, isTeamMember]);

  // Check if company is unlocked by ID (for when CNPJ is masked)
  const isCompanyUnlockedById = useCallback((empresaId: number): boolean => {
    if (!user || !empresaId) return false;
    
    const now = new Date();
    const numId = Number(empresaId);
    
    // Check own unlocked companies by ID (ensure numeric comparison)
    const ownUnlocked = unlockedCompanies.some(
      record => record.empresa_id !== null && 
               Number(record.empresa_id) === numId && 
               new Date(record.expires_at) > now
    );
    
    if (ownUnlocked) return true;
    
    // Check team owner's unlocked companies (for team members)
    if (isTeamMember && teamUnlockedCompanies.length > 0) {
      const teamUnlocked = teamUnlockedCompanies.some(
        record => record.empresa_id !== null &&
                 Number(record.empresa_id) === numId && 
                 new Date(record.expires_at) > now
      );
      if (teamUnlocked) return true;
    }
    
    return false;
  }, [unlockedCompanies, teamUnlockedCompanies, user, isTeamMember]);

  const getViewedCompaniesThisMonth = useCallback((): string[] => {
    if (!user) return [];
    
    // For team members, count ALL unlocked companies (own + owner's) against the shared limit
    const allUnlocked = [...unlockedCompanies, ...teamUnlockedCompanies];
    
    // Get unique CNPJs from unlocked companies within current billing cycle
    const now = new Date();
    const uniqueCnpjs = [...new Set(
      allUnlocked
        .filter(c => new Date(c.expires_at) > now)
        .map(c => c.empresa_cnpj)
    )];
    
    return uniqueCnpjs;
  }, [unlockedCompanies, teamUnlockedCompanies, user]);

  const getAccessStats = useCallback((): UserAccessStats => {
    if (!user) {
      return {
        companiesViewedThisMonth: 0,
        monthlyLimit: 0,
        extraCredits: 0,
        planRenewalDate: null,
        currentBillingMonth: getCurrentBillingMonth()
      };
    }

    const viewedCompanies = getViewedCompaniesThisMonth();
    const monthlyLimit = user.plan?.monthlyCompanyLimit || 10; // Default to 10 for free

    return {
      companiesViewedThisMonth: viewedCompanies.length,
      monthlyLimit,
      extraCredits: user.extraCredits,
      planRenewalDate: getNextRenewalDate(user.planStartDate),
      currentBillingMonth: getCurrentBillingMonth()
    };
  }, [user, getViewedCompaniesThisMonth]);

  const hasExceededLimit = useCallback((): boolean => {
    if (!user) return true;
    
    const stats = getAccessStats();
    return stats.companiesViewedThisMonth >= stats.monthlyLimit;
  }, [user, getAccessStats]);

  const canAccessCompany = useCallback((empresaCnpj: string): { 
    allowed: boolean; 
    reason?: string; 
    requiresExtraCredit?: boolean 
  } => {
    if (!isAuthenticated || !user) {
      return { allowed: false, reason: 'Você precisa estar logado' };
    }

    const normalizedCnpj = normalizeCnpj(empresaCnpj);
    
    // Check if already unlocked (free to re-access within billing cycle)
    if (isCompanyUnlocked(normalizedCnpj)) {
      return { allowed: true };
    }

    const stats = getAccessStats();
    
    // Check if within monthly limit
    if (stats.companiesViewedThisMonth < stats.monthlyLimit) {
      return { allowed: true };
    }

    // Exceeded limit - check for extra credits
    if (stats.extraCredits > 0) {
      return { 
        allowed: true, 
        requiresExtraCredit: true,
        reason: `Limite mensal atingido. Será usado 1 crédito extra.`
      };
    }

    // No access
    return { 
      allowed: false, 
      reason: `Limite mensal de ${stats.monthlyLimit} empresas atingido. Faça upgrade ou compre créditos extras.`
    };
  }, [isAuthenticated, user, isCompanyUnlocked, getAccessStats]);

  const accessCompany = useCallback(async (empresaCnpj: string, empresaId?: number): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;

    const normalizedCnpj = normalizeCnpj(empresaCnpj);
    const currentMonth = getCurrentBillingMonth();
    
    // Already unlocked - free re-access
    if (isCompanyUnlocked(normalizedCnpj)) {
      return true;
    }

    const { allowed, requiresExtraCredit } = canAccessCompany(normalizedCnpj);
    
    if (!allowed) {
      return false;
    }

    // Consume extra credit if needed
    if (requiresExtraCredit) {
      updateExtraCredits(-1);
    }

    // Create unlock record with expiration
    const cycleEndDate = getCycleEndDate(user.planStartDate);
    
    try {
      // Insert into database
      const { error: dbError } = await supabase
        .from('unlocked_companies')
        .insert({
          user_id: user.id,
          empresa_cnpj: normalizedCnpj,
          empresa_id: empresaId || null,
          billing_cycle_start: new Date().toISOString(),
          billing_cycle_end: cycleEndDate.toISOString(),
        });

      if (dbError) {
        console.error('Error saving unlocked company:', dbError);
      }

      // Create access log in database
      await supabase
        .from('access_logs')
        .insert({
          user_id: user.id,
          empresa_cnpj: normalizedCnpj,
          action: 'view',
          credits_used: requiresExtraCredit ? 1 : 0,
          used_extra_credit: !!requiresExtraCredit,
        });

    } catch (error) {
      console.error('Error recording access:', error);
    }
    
    // Update local state
    const unlockRecord: UnlockedCompany = {
      id: `unlock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
      empresa_cnpj: normalizedCnpj,
      empresa_id: empresaId || null,
      unlocked_at: new Date(),
      expires_at: cycleEndDate,
      source: requiresExtraCredit ? 'extra_credit' : 'monthly_limit'
    };
    
    setUnlockedCompanies(prev => [unlockRecord, ...prev]);

    // Create access log locally
    const log: AccessLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      empresaCnpj: normalizedCnpj,
      cnpj: normalizedCnpj,
      accessedAt: new Date(),
      usedExtraCredit: !!requiresExtraCredit,
      billingMonth: currentMonth,
    };
    
    setAccessLogs(prev => [log, ...prev]);
    return true;
  }, [isAuthenticated, user, isCompanyUnlocked, canAccessCompany, updateExtraCredits]);

  // Fetch full empresa data after unlock
  const fetchFullEmpresaData = useCallback(async (empresaCnpj: string): Promise<any | null> => {
    if (!user) return null;
    
    const normalizedCnpj = normalizeCnpj(empresaCnpj);
    
    // First verify the user has access
    if (!isCompanyUnlocked(normalizedCnpj)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('cnpj', normalizedCnpj)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching full empresa data:', error);
      return null;
    }
  }, [user, isCompanyUnlocked]);

  // Combine all unlocked for display purposes
  const allUnlockedCompanies = [...unlockedCompanies, ...teamUnlockedCompanies];

  return (
    <CreditContext.Provider value={{
      accessLogs,
      unlockedCompanies: allUnlockedCompanies, // Return combined list
      getAccessStats,
      canAccessCompany,
      accessCompany,
      isCompanyUnlocked,
      isCompanyUnlockedById,
      hasExceededLimit,
      getViewedCompaniesThisMonth,
      fetchFullEmpresaData,
      teamUnlockedCompanies,
      loadingUnlocked,
    }}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
};