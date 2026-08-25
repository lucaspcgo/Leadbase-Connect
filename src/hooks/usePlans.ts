import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plan } from '@/types';

export interface DbPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  monthly_company_limit: number;
  features: string[];
  max_users: number | null;
  can_export: boolean;
  is_active: boolean;
  display_order: number;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFormData {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  monthly_company_limit: number;
  features: string[];
  max_users: number | null;
  can_export: boolean;
  is_active: boolean;
  display_order: number;
  is_popular: boolean;
}

// Convert database plan to frontend Plan type
export const dbPlanToPlan = (dbPlan: DbPlan): Plan => ({
  id: dbPlan.id,
  name: dbPlan.name,
  description: dbPlan.description || '',
  priceMonthly: Number(dbPlan.price_monthly),
  priceYearly: Number(dbPlan.price_yearly),
  monthlyCompanyLimit: dbPlan.monthly_company_limit,
  features: dbPlan.features || [],
  maxUsers: dbPlan.max_users || undefined,
  canExport: dbPlan.can_export,
});

export const usePlans = () => {
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Type assertion since we know the structure
      setPlans((data || []) as unknown as DbPlan[]);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Erro ao carregar planos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (planData: PlanFormData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('plans')
        .insert({
          id: planData.id,
          name: planData.name,
          description: planData.description || null,
          price_monthly: planData.price_monthly,
          price_yearly: planData.price_yearly,
          monthly_company_limit: planData.monthly_company_limit,
          features: planData.features,
          max_users: planData.max_users,
          can_export: planData.can_export,
          is_active: planData.is_active,
          display_order: planData.display_order,
          is_popular: planData.is_popular,
        });

      if (error) throw error;

      toast({
        title: 'Plano criado',
        description: `O plano "${planData.name}" foi criado com sucesso.`,
      });

      await fetchPlans();
      return true;
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updatePlan = async (planId: string, planData: Partial<PlanFormData>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (planData.name !== undefined) updateData.name = planData.name;
      if (planData.description !== undefined) updateData.description = planData.description || null;
      if (planData.price_monthly !== undefined) updateData.price_monthly = planData.price_monthly;
      if (planData.price_yearly !== undefined) updateData.price_yearly = planData.price_yearly;
      if (planData.monthly_company_limit !== undefined) updateData.monthly_company_limit = planData.monthly_company_limit;
      if (planData.features !== undefined) updateData.features = planData.features;
      if (planData.max_users !== undefined) updateData.max_users = planData.max_users;
      if (planData.can_export !== undefined) updateData.can_export = planData.can_export;
      if (planData.is_active !== undefined) updateData.is_active = planData.is_active;
      if (planData.display_order !== undefined) updateData.display_order = planData.display_order;
      if (planData.is_popular !== undefined) updateData.is_popular = planData.is_popular;

      const { error } = await supabase
        .from('plans')
        .update(updateData)
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Plano atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });

      await fetchPlans();
      return true;
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deletePlan = async (planId: string): Promise<boolean> => {
    try {
      // Check if plan is in use
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId);

      if (count && count > 0) {
        toast({
          title: 'Não é possível excluir',
          description: `Este plano está sendo usado por ${count} usuário(s). Desative-o ao invés de excluir.`,
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Plano excluído',
        description: 'O plano foi removido com sucesso.',
      });

      await fetchPlans();
      return true;
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const togglePlanActive = async (planId: string, isActive: boolean): Promise<boolean> => {
    return updatePlan(planId, { is_active: isActive });
  };

  const togglePlanPopular = async (planId: string, isPopular: boolean): Promise<boolean> => {
    return updatePlan(planId, { is_popular: isPopular });
  };

  // Get plans as frontend Plan type (for compatibility with existing code)
  const plansAsPlanType: Plan[] = plans.map(dbPlanToPlan);

  return {
    plans,
    plansAsPlanType,
    loading,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    togglePlanPopular,
  };
};

// Hook for fetching active plans only (for public pages)
export const useActivePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivePlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        const dbPlans = (data || []) as unknown as DbPlan[];
        setPlans(dbPlans.map(dbPlanToPlan));
      } catch (error) {
        console.error('Error fetching active plans:', error);
        // Fallback to empty array
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePlans();
  }, []);

  return { plans, loading };
};
