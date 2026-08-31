import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole, UserStatus, CreditLedgerEntry, AdminAuditLog, Plan } from '@/types';
import { plans } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface UsersContextType {
  users: User[];
  creditLedger: CreditLedgerEntry[];
  adminAuditLogs: AdminAuditLog[];
  isLoading: boolean;
  
  // User CRUD
  getUsers: () => User[];
  getUserById: (id: string) => User | undefined;
  getUserByEmail: (email: string) => User | undefined;
  refreshUsers: () => Promise<void>;
  updateUser: (id: string, data: Partial<User>, adminId: string, adminName: string) => Promise<void>;
  deleteUser: (id: string, adminId: string, adminName: string) => Promise<boolean>;
  
  // Status management
  blockUser: (id: string, reason: string, adminId: string, adminName: string) => Promise<boolean>;
  unblockUser: (id: string, adminId: string, adminName: string) => Promise<boolean>;
  
  // Role management
  changeUserRole: (id: string, newRole: UserRole, adminId: string, adminName: string, currentAdminRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  
  // Plan management
  changeUserPlan: (id: string, planId: string | null, monthlyLimit: number | undefined, adminId: string, adminName: string) => Promise<void>;
  /** Soma dias a validade do plano. Se ainda ha dias a vencer, soma em cima deles. */
  extendUserPlan: (id: string, days: number, planId?: string) => Promise<Date | null>;
  /** Define a validade diretamente. null remove a validade (plano nao expira). */
  setUserPlanExpiry: (id: string, expiresAt: Date | null) => Promise<boolean>;
  
  // Credit management
  adjustCredits: (userId: string, amount: number, reason: string, adminId: string, adminName: string) => Promise<void>;
  getCreditLedgerByUser: (userId: string) => CreditLedgerEntry[];
  
  // Audit logs
  getAuditLogsByUser: (userId: string) => AdminAuditLog[];
  getRecentAuditLogs: (limit?: number) => AdminAuditLog[];
  
  // RBAC checks
  canManageRole: (adminRole: UserRole, targetRole: UserRole) => boolean;
  isMasterAdmin: (userId: string) => boolean;
  getMasterAdminCount: () => number;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

type AppRole = 'user' | 'admin' | 'master_admin';

export const UsersProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [creditLedger, setCreditLedger] = useState<CreditLedgerEntry[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch users from database
  const fetchUsers = useCallback(async () => {
    try {
      // Fetch all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      // Fetch user emails from auth.users via RPC (if available) or use profile data
      // For now, we'll fetch the email from the auth context or use a placeholder
      
      // Map profiles to User objects
      const mappedUsers: User[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        const role = userRole?.role as AppRole | undefined;
        const mappedRole: UserRole = role === 'master_admin' ? 'MASTER_ADMIN' : role === 'admin' ? 'ADMIN' : 'USER';
        const userPlan = plans.find(p => p.id === profile.plan_id) || plans[0];

        return {
          id: profile.user_id,
          email: profile.name || 'Email não disponível', // Email will be fetched separately if needed
          name: profile.name || '',
          role: mappedRole,
          status: profile.status as UserStatus,
          extraCredits: profile.extra_credits || 0,
          plan: userPlan,
          planStartDate: profile.plan_start_date ? new Date(profile.plan_start_date) : null,
          planExpiresAt: profile.plan_expires_at ? new Date(profile.plan_expires_at) : null,
          monthlyLimit: profile.monthly_limit_override || undefined,
          createdAt: new Date(profile.created_at),
          emailVerified: true,
        };
      });

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch credit transactions from DB
  const fetchCreditLedger = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching credit_transactions:', error);
        return;
      }

      if (data) {
        const mapped: CreditLedgerEntry[] = data.map(row => ({
          id: row.id,
          user_id: row.user_id,
          amount: row.amount,
          reason: row.reason || '',
          admin_id: row.admin_id || '',
          admin_name: '', // Will be resolved if needed
          created_at: new Date(row.created_at),
        }));
        setCreditLedger(mapped);
      }
    } catch (error) {
      console.error('Error in fetchCreditLedger:', error);
    }
  }, []);

  // Fetch financial audit logs from DB
  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('financial_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching financial_audit_logs:', error);
        return;
      }

      if (data) {
        const mapped: AdminAuditLog[] = data.map(row => ({
          id: row.id,
          admin_id: row.admin_id,
          admin_name: row.admin_name,
          action: row.action as AdminAuditLog['action'],
          target_user_id: row.target_user_id || '',
          target_user_email: row.target_user_email || '',
          details: row.details,
          before_value: row.before_value || undefined,
          after_value: row.after_value || undefined,
          created_at: new Date(row.created_at),
        }));
        setAdminAuditLogs(mapped);
      }
    } catch (error) {
      console.error('Error in fetchAuditLogs:', error);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && isAdmin) {
      setIsLoading(true);
      fetchUsers();
      fetchCreditLedger();
      fetchAuditLogs();
    } else {
      setUsers([]);
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, isAdmin, fetchUsers, fetchCreditLedger, fetchAuditLogs]);

  // Add audit log helper - saves to DB and updates local state
  const addAuditLog = useCallback(async (log: Omit<AdminAuditLog, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('financial_audit_logs')
      .insert({
        admin_id: log.admin_id,
        admin_name: log.admin_name,
        action: log.action,
        entity_type: 'user',
        entity_id: log.target_user_id,
        target_user_id: log.target_user_id,
        target_user_email: log.target_user_email,
        details: log.details,
        before_value: log.before_value || null,
        after_value: log.after_value || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving audit log:', error);
      return;
    }

    if (data) {
      const newLog: AdminAuditLog = {
        id: data.id,
        admin_id: data.admin_id,
        admin_name: data.admin_name,
        action: data.action as AdminAuditLog['action'],
        target_user_id: data.target_user_id || '',
        target_user_email: data.target_user_email || '',
        details: data.details,
        before_value: data.before_value || undefined,
        after_value: data.after_value || undefined,
        created_at: new Date(data.created_at),
      };
      setAdminAuditLogs(prev => [newLog, ...prev]);
    }
  }, []);

  // User CRUD
  const getUsers = useCallback(() => users, [users]);

  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);

  const getUserByEmail = useCallback((email: string) => 
    users.find(u => u.email.toLowerCase() === email.toLowerCase()), [users]);

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: string, data: Partial<User>, adminId: string, adminName: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    // Update profile in database
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.extraCredits !== undefined) updateData.extra_credits = data.extraCredits;
    if (data.plan !== undefined) updateData.plan_id = data.plan?.id || 'free';
    if (data.monthlyLimit !== undefined) updateData.monthly_limit_override = data.monthlyLimit;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', id);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }
    }

    // Log changes
    Object.keys(data).forEach(key => {
      const oldVal = String((user as any)[key] ?? '');
      const newVal = String((data as any)[key] ?? '');
      if (oldVal !== newVal) {
        addAuditLog({
          admin_id: adminId,
          admin_name: adminName,
          action: 'UPDATE',
          target_user_id: user.id,
          target_user_email: user.email,
          details: `Campo ${key} alterado`,
          before_value: oldVal,
          after_value: newVal,
        });
      }
    });

    // Refresh users from database
    await fetchUsers();
  }, [users, addAuditLog, fetchUsers]);

  const deleteUser = useCallback(async (id: string, adminId: string, adminName: string): Promise<boolean> => {
    const user = users.find(u => u.id === id);
    if (!user) {
      console.error('User not found for deletion:', id);
      return false;
    }
    
    // Cannot delete MASTER_ADMIN
    if (user.role === 'MASTER_ADMIN') {
      console.error('Cannot delete MASTER_ADMIN');
      return false;
    }

    try {
      console.log('Calling delete-user edge function for userId:', id);
      
      // Call edge function to delete user completely from auth and database
      // user.id is the auth user id (profile.user_id)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Error deleting user:', error);
        return false;
      }

      if (data?.error) {
        console.error('Error from edge function:', data.error);
        return false;
      }

      addAuditLog({
        admin_id: adminId,
        admin_name: adminName,
        action: 'DELETE',
        target_user_id: user.id,
        target_user_email: user.email,
        details: `Usuário ${user.name} excluído permanentemente`,
      });

      // Refresh users from database to ensure UI is in sync
      await fetchUsers();

      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return false;
    }
  }, [users, addAuditLog, fetchUsers]);

  // Status management
  const blockUser = useCallback(async (id: string, reason: string, adminId: string, adminName: string): Promise<boolean> => {
    const user = users.find(u => u.id === id);
    if (!user) return false;
    
    // Cannot block MASTER_ADMIN
    if (user.role === 'MASTER_ADMIN') return false;

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'BLOCKED' })
      .eq('user_id', id);

    if (error) {
      console.error('Error blocking user:', error);
      return false;
    }

    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'BLOCK',
      target_user_id: user.id,
      target_user_email: user.email,
      details: `Usuário bloqueado: ${reason}`,
      before_value: user.status,
      after_value: 'BLOCKED',
    });

    await fetchUsers();
    return true;
  }, [users, addAuditLog, fetchUsers]);

  const unblockUser = useCallback(async (id: string, adminId: string, adminName: string): Promise<boolean> => {
    const user = users.find(u => u.id === id);
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'ACTIVE' })
      .eq('user_id', id);

    if (error) {
      console.error('Error unblocking user:', error);
      return false;
    }

    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'UNBLOCK',
      target_user_id: user.id,
      target_user_email: user.email,
      details: 'Usuário desbloqueado',
      before_value: user.status,
      after_value: 'ACTIVE',
    });

    await fetchUsers();
    return true;
  }, [users, addAuditLog, fetchUsers]);

  // Role management
  const canManageRole = useCallback((adminRole: UserRole, targetRole: UserRole): boolean => {
    // Only MASTER_ADMIN can manage ADMIN or MASTER_ADMIN roles
    if (targetRole === 'MASTER_ADMIN' || targetRole === 'ADMIN') {
      return adminRole === 'MASTER_ADMIN';
    }
    // ADMIN can manage USER roles
    return adminRole === 'MASTER_ADMIN' || adminRole === 'ADMIN';
  }, []);

  const isMasterAdmin = useCallback((userId: string): boolean => {
    const user = users.find(u => u.id === userId);
    return user?.role === 'MASTER_ADMIN';
  }, [users]);

  const getMasterAdminCount = useCallback((): number => {
    return users.filter(u => u.role === 'MASTER_ADMIN').length;
  }, [users]);

  const changeUserRole = useCallback(async (
    id: string, 
    newRole: UserRole, 
    adminId: string, 
    adminName: string,
    currentAdminRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    const user = users.find(u => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    // Check permissions
    if (!canManageRole(currentAdminRole, user.role)) {
      return { success: false, error: 'Sem permissão para gerenciar este usuário' };
    }

    if (!canManageRole(currentAdminRole, newRole)) {
      return { success: false, error: 'Sem permissão para atribuir esta role' };
    }

    // Cannot demote the last MASTER_ADMIN
    if (user.role === 'MASTER_ADMIN' && newRole !== 'MASTER_ADMIN') {
      if (getMasterAdminCount() <= 1) {
        return { success: false, error: 'Não é possível remover o último MASTER_ADMIN' };
      }
    }

    // Map UserRole to app_role
    const dbRole: AppRole = newRole === 'MASTER_ADMIN' ? 'master_admin' : newRole === 'ADMIN' ? 'admin' : 'user';

    // Update role in database
    const { error } = await supabase
      .from('user_roles')
      .update({ role: dbRole })
      .eq('user_id', id);

    if (error) {
      console.error('Error changing role:', error);
      return { success: false, error: 'Erro ao alterar role no banco de dados' };
    }

    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'ROLE_CHANGE',
      target_user_id: user.id,
      target_user_email: user.email,
      details: `Role alterada de ${user.role} para ${newRole}`,
      before_value: user.role,
      after_value: newRole,
    });

    await fetchUsers();
    return { success: true };
  }, [users, canManageRole, getMasterAdminCount, addAuditLog, fetchUsers]);

  // Plan management
  const changeUserPlan = useCallback(async (
    id: string, 
    planId: string | null, 
    monthlyLimit: number | undefined,
    adminId: string, 
    adminName: string
  ) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const newPlan = planId ? plans.find(p => p.id === planId) || null : null;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        plan_id: planId || 'free',
        monthly_limit_override: monthlyLimit || null,
        plan_start_date: new Date().toISOString()
      })
      .eq('user_id', id);

    if (error) {
      console.error('Error changing plan:', error);
      return;
    }

    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'PLAN_CHANGE',
      target_user_id: user.id,
      target_user_email: user.email,
      details: `Plano alterado para ${newPlan?.name || 'Nenhum'}${monthlyLimit ? ` (limite: ${monthlyLimit})` : ''}`,
      before_value: user.plan?.name || 'Nenhum',
      after_value: newPlan?.name || 'Nenhum',
    });

    await fetchUsers();
  }, [users, addAuditLog, fetchUsers]);

  // Validade do plano
  //
  // A soma dos dias e feita no banco, pela funcao prorrogar_plano: ela
  // confere se quem chamou e admin, soma em cima da validade que ja existe
  // (para o cliente nao perder os dias restantes) e registra em
  // financial_audit_logs. Fazer essa conta no navegador deixaria a data
  // depender do relogio da maquina do admin.
  const extendUserPlan = useCallback(async (
    id: string,
    days: number,
    planId?: string
  ): Promise<Date | null> => {
    const { data, error } = await supabase.rpc('prorrogar_plano', {
      p_user_id: id,
      p_dias: days,
      p_plan_id: planId ?? null,
    });

    if (error) {
      console.error('Error extending plan:', error);
      return null;
    }

    await fetchUsers();
    return data ? new Date(data as string) : null;
  }, [fetchUsers]);

  const setUserPlanExpiry = useCallback(async (
    id: string,
    expiresAt: Date | null
  ): Promise<boolean> => {
    // Via RPC, e nao update direto na tabela: a checagem de admin fica no
    // banco, junto com o registro em financial_audit_logs.
    const { error } = await supabase.rpc('definir_validade_plano', {
      p_user_id: id,
      p_expires_at: expiresAt ? expiresAt.toISOString() : null,
    });

    if (error) {
      console.error('Error setting plan expiry:', error);
      return false;
    }

    await fetchUsers();
    return true;
  }, [fetchUsers]);

  // Credit management
  const adjustCredits = useCallback(async (
    userId: string, 
    amount: number, 
    reason: string, 
    adminId: string, 
    adminName: string
  ) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newCredits = Math.max(0, user.extraCredits + amount);

    const { error } = await supabase
      .from('profiles')
      .update({ extra_credits: newCredits })
      .eq('user_id', userId);

    if (error) {
      console.error('Error adjusting credits:', error);
      return;
    }

    // Persist ledger entry to DB
    const { data: txData, error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount,
        reason,
        admin_id: adminId,
        type: amount > 0 ? 'ADD' : 'REMOVE',
      })
      .select()
      .single();

    if (txError) {
      console.error('Error saving credit transaction:', txError);
    } else if (txData) {
      const entry: CreditLedgerEntry = {
        id: txData.id,
        user_id: txData.user_id,
        amount: txData.amount,
        reason: txData.reason || '',
        admin_id: txData.admin_id || '',
        admin_name: adminName,
        created_at: new Date(txData.created_at),
      };
      setCreditLedger(prev => [entry, ...prev]);
    }

    // Audit log
    addAuditLog({
      admin_id: adminId,
      admin_name: adminName,
      action: 'CREDIT_ADJUST',
      target_user_id: user.id,
      target_user_email: user.email,
      details: `${amount > 0 ? '+' : ''}${amount} créditos: ${reason}`,
      before_value: String(user.extraCredits),
      after_value: String(newCredits),
    });

    await fetchUsers();
  }, [users, addAuditLog, fetchUsers]);

  const getCreditLedgerByUser = useCallback((userId: string) => 
    creditLedger.filter(e => e.user_id === userId), [creditLedger]);

  // Audit logs
  const getAuditLogsByUser = useCallback((userId: string) => 
    adminAuditLogs.filter(l => l.target_user_id === userId), [adminAuditLogs]);

  const getRecentAuditLogs = useCallback((limit = 50) => 
    adminAuditLogs.slice(0, limit), [adminAuditLogs]);

  return (
    <UsersContext.Provider value={{
      users,
      creditLedger,
      adminAuditLogs,
      isLoading,
      getUsers,
      getUserById,
      getUserByEmail,
      refreshUsers,
      updateUser,
      deleteUser,
      blockUser,
      unblockUser,
      changeUserRole,
      changeUserPlan,
      extendUserPlan,
      setUserPlanExpiry,
      adjustCredits,
      getCreditLedgerByUser,
      getAuditLogsByUser,
      getRecentAuditLogs,
      canManageRole,
      isMasterAdmin,
      getMasterAdminCount,
    }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
};
