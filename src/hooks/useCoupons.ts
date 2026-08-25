import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  applicable_plans: string[];
  created_at: string;
  updated_at: string;
}

export interface CouponInsert {
  code: string;
  description?: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_purchase?: number;
  max_uses?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
  applicable_plans?: string[];
}

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as Coupon[]) || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os cupons.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const createCoupon = async (coupon: CouponInsert): Promise<boolean> => {
    try {
      const { error } = await supabase.from('coupons').insert({
        code: coupon.code.toUpperCase().trim(),
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase || 0,
        max_uses: coupon.max_uses,
        valid_from: coupon.valid_from,
        valid_until: coupon.valid_until,
        is_active: coupon.is_active ?? true,
        applicable_plans: coupon.applicable_plans || [],
      });

      if (error) throw error;

      toast({
        title: 'Cupom criado!',
        description: `Cupom ${coupon.code} criado com sucesso.`,
      });

      await fetchCoupons();
      return true;
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast({
        title: 'Erro',
        description: error.message?.includes('duplicate') 
          ? 'Já existe um cupom com este código.' 
          : 'Não foi possível criar o cupom.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<CouponInsert>): Promise<boolean> => {
    try {
      const updateData: any = { ...updates };
      if (updates.code) {
        updateData.code = updates.code.toUpperCase().trim();
      }

      const { error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupom atualizado!',
        description: 'Cupom atualizado com sucesso.',
      });

      await fetchCoupons();
      return true;
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      toast({
        title: 'Erro',
        description: error.message?.includes('duplicate') 
          ? 'Já existe um cupom com este código.' 
          : 'Não foi possível atualizar o cupom.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCoupon = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupom excluído!',
        description: 'Cupom excluído com sucesso.',
      });

      await fetchCoupons();
      return true;
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cupom.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleCouponStatus = async (id: string, is_active: boolean): Promise<boolean> => {
    return updateCoupon(id, { is_active });
  };

  return {
    coupons,
    loading,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
};

// Hook for validating and applying coupons in checkout
export const useValidateCoupon = () => {
  const [validating, setValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const validateCoupon = async (code: string, planId: string, amount: number): Promise<Coupon | null> => {
    if (!code.trim()) {
      setAppliedCoupon(null);
      return null;
    }

    setValidating(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Cupom inválido',
          description: 'Este cupom não existe ou está inativo.',
          variant: 'destructive',
        });
        setAppliedCoupon(null);
        return null;
      }

      const coupon = data as Coupon;
      const now = new Date();

      // Check validity dates
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        toast({
          title: 'Cupom inválido',
          description: 'Este cupom ainda não está válido.',
          variant: 'destructive',
        });
        setAppliedCoupon(null);
        return null;
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast({
          title: 'Cupom expirado',
          description: 'Este cupom já expirou.',
          variant: 'destructive',
        });
        setAppliedCoupon(null);
        return null;
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast({
          title: 'Cupom esgotado',
          description: 'Este cupom já atingiu o limite de utilizações.',
          variant: 'destructive',
        });
        setAppliedCoupon(null);
        return null;
      }

      // Check minimum purchase
      if (coupon.min_purchase > 0 && amount < coupon.min_purchase) {
        toast({
          title: 'Valor mínimo não atingido',
          description: `O valor mínimo para usar este cupom é R$ ${coupon.min_purchase.toFixed(2)}.`,
          variant: 'destructive',
        });
        setAppliedCoupon(null);
        return null;
      }

      // Check applicable plans
      if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
        if (!coupon.applicable_plans.includes(planId)) {
          toast({
            title: 'Cupom não aplicável',
            description: 'Este cupom não é válido para o plano selecionado.',
            variant: 'destructive',
          });
          setAppliedCoupon(null);
          return null;
        }
      }

      // Coupon is valid!
      toast({
        title: 'Cupom aplicado!',
        description: coupon.discount_type === 'PERCENTAGE'
          ? `Desconto de ${coupon.discount_value}% aplicado.`
          : `Desconto de R$ ${coupon.discount_value.toFixed(2)} aplicado.`,
      });

      setAppliedCoupon(coupon);
      return coupon;
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar o cupom.',
        variant: 'destructive',
      });
      setAppliedCoupon(null);
      return null;
    } finally {
      setValidating(false);
    }
  };

  const calculateDiscount = (amount: number): number => {
    if (!appliedCoupon) return 0;

    if (appliedCoupon.discount_type === 'PERCENTAGE') {
      return Math.round((amount * appliedCoupon.discount_value / 100) * 100) / 100;
    }

    return Math.min(appliedCoupon.discount_value, amount);
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
  };

  const incrementCouponUsage = async (
    couponId: string, 
    options?: { userEmail?: string; discountAmount?: number; originalAmount?: number; paymentId?: string }
  ): Promise<boolean> => {
    try {
      // Update the counter on coupons table
      const { error } = await supabase.rpc('increment_coupon_usage' as any, { coupon_id: couponId });
      
      if (error) {
        const { error: updateError } = await supabase
          .from('coupons')
          .update({ current_uses: (appliedCoupon?.current_uses || 0) + 1 })
          .eq('id', couponId);
        
        if (updateError) throw updateError;
      }

      // Record per-user usage in coupon_usages table
      if (appliedCoupon) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('coupon_usages').insert({
            coupon_id: couponId,
            user_id: user.id,
            user_email: options?.userEmail || user.email || '',
            coupon_code: appliedCoupon.code,
            discount_type: appliedCoupon.discount_type,
            discount_value: appliedCoupon.discount_value,
            discount_amount: options?.discountAmount || 0,
            original_amount: options?.originalAmount || 0,
            payment_id: options?.paymentId || null,
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error incrementing coupon usage:', error);
      return false;
    }
  };

  return {
    validating,
    appliedCoupon,
    validateCoupon,
    calculateDiscount,
    clearCoupon,
    incrementCouponUsage,
  };
};
