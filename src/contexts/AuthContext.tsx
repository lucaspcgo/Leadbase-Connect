import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, Plan } from '@/types';
import { DbPlan, dbPlanToPlan } from '@/hooks/usePlans';

type AppRole = 'user' | 'admin' | 'master_admin';

interface TeamOwnerInfo {
  ownerId: string;
  ownerEmail?: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  isTeamMember: boolean; // True if user is a sub-account (created by a team owner)
  teamOwnerInfo: TeamOwnerInfo | null; // Info about the team owner if user is a sub-account
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  updateExtraCredits: (amount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [teamOwnerInfo, setTeamOwnerInfo] = useState<TeamOwnerInfo | null>(null);

  // Fetch user profile and role from database
  const fetchUserData = useCallback(async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      // Fetch profile (if missing, create it once)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      let resolvedProfile = profile;

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Some environments may not have the "new user" trigger wired.
      // If the profile row doesn't exist yet, create it using the user's own session (RLS allows insert for own user_id).
      if (!resolvedProfile) {
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.id,
            name: (authUser.user_metadata as { name?: string } | null)?.name || authUser.email,
          });

        if (createProfileError) {
          // If it's a race and the row was created elsewhere, we can ignore and retry the select.
          console.error('Error creating missing profile:', createProfileError);
        }

        const { data: profileRetry, error: profileRetryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (profileRetryError) {
          console.error('Error fetching profile after create:', profileRetryError);
          return null;
        }

        resolvedProfile = profileRetry;
      }

      if (!resolvedProfile) {
        // If we still couldn't get a profile, we can't build the app user object reliably.
        return null;
      }

      // Fetch role using the database function
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: authUser.id });

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      const role = roleData as AppRole | null;
      setUserRole(role);

      // Map database role to app role
      const mappedRole = role === 'master_admin' ? 'MASTER_ADMIN' : role === 'admin' ? 'ADMIN' : 'USER';

      // Check if user is a team member (sub-account) and get owner's plan if so
      let effectivePlanId = resolvedProfile.plan_id;
      let effectivePlanStartDate = resolvedProfile.plan_start_date;
      let effectivePlanExpiresAt = resolvedProfile.plan_expires_at;

      // Plano vencido cai para free na hora, sem esperar o cron horario do
      // servidor. Sem isto o cliente continuaria com o plano pago ate a
      // proxima passagem da rotina de expiracao.
      if (
        effectivePlanExpiresAt &&
        new Date(effectivePlanExpiresAt).getTime() < Date.now() &&
        effectivePlanId !== 'free'
      ) {
        effectivePlanId = 'free';
        effectivePlanExpiresAt = null;
      }
      let teamMemberStatus = false;
      let ownerInfo: TeamOwnerInfo | null = null;
      
       // A user can be associated to a team as a sub-account. We must detect this reliably.
       // Using order+limit avoids maybeSingle() errors when there are multiple rows (e.g. the same user linked to more than one owner).
       const { data: teamMembership, error: teamMembershipError } = await supabase
         .from('team_members')
         .select('owner_user_id, status, created_at')
         .eq('member_user_id', authUser.id)
         .eq('status', 'ACTIVE') // Only consider active memberships
         .order('created_at', { ascending: false })
         .limit(1)
         .maybeSingle();

       if (teamMembershipError) {
         console.error('Error fetching team membership:', teamMembershipError);
       }

       console.log('Team membership check for user:', authUser.id, 'Result:', teamMembership);

       if (teamMembership) {
         // User is a team member (sub-account)
         teamMemberStatus = true;
         ownerInfo = { ownerId: teamMembership.owner_user_id };

         // Fetch owner's profile to inherit plan settings
         const { data: ownerProfile, error: ownerProfileError } = await supabase
           .from('profiles')
           .select('plan_id, plan_start_date, plan_expires_at')
           .eq('user_id', teamMembership.owner_user_id)
           .single();

         if (ownerProfileError) {
           console.error('Error fetching owner profile:', ownerProfileError);
         }

         if (ownerProfile) {
           effectivePlanId = ownerProfile.plan_id;
           effectivePlanStartDate = ownerProfile.plan_start_date;
           effectivePlanExpiresAt = ownerProfile.plan_expires_at;

           // O membro herda tambem o vencimento: se o plano do dono venceu,
           // a equipe inteira cai para free junto.
           if (
             effectivePlanExpiresAt &&
             new Date(effectivePlanExpiresAt).getTime() < Date.now() &&
             effectivePlanId !== 'free'
           ) {
             effectivePlanId = 'free';
             effectivePlanExpiresAt = null;
           }

           console.log('Inherited plan from owner:', effectivePlanId);
         }
       }

      // Update team member state
      setIsTeamMember(teamMemberStatus);
      setTeamOwnerInfo(ownerInfo);

      // Fetch plan from database
      let userPlan: Plan | null = null;
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', effectivePlanId)
        .maybeSingle();

      if (planError) {
        console.error('Error fetching plan:', planError);
      }

      if (planData) {
        userPlan = dbPlanToPlan(planData as unknown as DbPlan);
      } else {
        // Fallback to free plan from database
        const { data: freePlan } = await supabase
          .from('plans')
          .select('*')
          .eq('id', 'free')
          .maybeSingle();
        
        if (freePlan) {
          userPlan = dbPlanToPlan(freePlan as unknown as DbPlan);
        }
      }

      // If no plan found, create a default minimal plan
      if (!userPlan) {
        userPlan = {
          id: 'free',
          name: 'Free',
          description: 'Plano gratuito',
          priceMonthly: 0,
          priceYearly: 0,
          monthlyCompanyLimit: 10,
          features: [],
          canExport: false,
        };
      }

      const appUser: User = {
        id: authUser.id,
        email: authUser.email || '',
         name: resolvedProfile.name || authUser.email || '',
        role: mappedRole as 'USER' | 'ADMIN' | 'MASTER_ADMIN',
         status: resolvedProfile.status as 'ACTIVE' | 'BLOCKED' | 'SUSPENDED',
         extraCredits: resolvedProfile.extra_credits || 0,
        plan: userPlan,
        planStartDate: effectivePlanStartDate ? new Date(effectivePlanStartDate) : null,
        planExpiresAt: effectivePlanExpiresAt ? new Date(effectivePlanExpiresAt) : null,
         monthlyLimit: resolvedProfile.monthly_limit_override || undefined,
         createdAt: new Date(resolvedProfile.created_at),
        emailVerified: authUser.email_confirmed_at !== null,
      };

      return appUser;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid blocking the auth state change
        setTimeout(async () => {
          const userData = await fetchUserData(session.user);
          setUser(userData);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setUserRole(null);
        setIsTeamMember(false);
        setTeamOwnerInfo(null);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setSupabaseUser(session.user);
        fetchUserData(session.user).then(userData => {
          setUser(userData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userData = await fetchUserData(data.user);
        if (userData?.status === 'BLOCKED') {
          await supabase.auth.signOut();
          return { success: false, error: 'Sua conta está bloqueada. Entre em contato com o suporte.' };
        }
        setUser(userData);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    
    // Clear all application data from localStorage for security
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('leadbase_')) {
        localStorage.removeItem(key);
      }
    });
    
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    setUserRole(null);
    setIsTeamMember(false);
    setTeamOwnerInfo(null);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Wait a bit for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500));
        const userData = await fetchUserData(data.user);
        setUser(userData);
      }

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
    }
  }, [fetchUserData]);

  const updateExtraCredits = useCallback(async (amount: number) => {
    if (!user || !supabaseUser) return;

    const newCredits = user.extraCredits + amount;

    const { error } = await supabase
      .from('profiles')
      .update({ extra_credits: newCredits })
      .eq('user_id', supabaseUser.id);

    if (!error) {
      setUser(prev => prev ? { ...prev, extraCredits: newCredits } : null);
    }
  }, [user, supabaseUser]);

  const refreshUser = useCallback(async () => {
    if (supabaseUser) {
      const userData = await fetchUserData(supabaseUser);
      setUser(userData);
    }
  }, [supabaseUser, fetchUserData]);

  const isAdmin = userRole === 'admin' || userRole === 'master_admin';
  const isMasterAdmin = userRole === 'master_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAuthenticated: !!user,
        isAdmin,
        isMasterAdmin,
        isTeamMember,
        teamOwnerInfo,
        isLoading,
        login,
        logout,
        register,
        updateExtraCredits,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
