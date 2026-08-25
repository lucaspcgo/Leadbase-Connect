import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  owner_user_id: string;
  member_user_id: string;
  member_email: string;
  member_name: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  created_at: string;
  updated_at: string;
}

const MAX_TEAM_MEMBERS = 3;

export const useTeamMembers = () => {
  const { user, isTeamMember: isTeamMemberFromContext, isLoading: authLoading } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isEquipePlan = user?.plan?.id === 'equipe';
  // Only the plan owner can add members, not sub-accounts (use context for team member check)
  const isTeamMember = isTeamMemberFromContext;
  const isOwner = isEquipePlan && !isTeamMember;
  const canAddMore = teamMembers.length < MAX_TEAM_MEMBERS && isOwner;

  const fetchTeamMembers = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Only fetch team members if user is the owner (not a sub-account)
      // isTeamMember comes from AuthContext now
      if (!isTeamMember) {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setTeamMembers((data as TeamMember[]) || []);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Erro ao carregar membros da equipe');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isTeamMember]);

  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (authLoading) {
      return;
    }
    
    if (isEquipePlan) {
      fetchTeamMembers();
    } else {
      setLoading(false);
    }
  }, [isEquipePlan, fetchTeamMembers, authLoading]);

  const addTeamMember = async (email: string, name: string, password: string): Promise<boolean> => {
    if (!user?.id || !isEquipePlan) {
      toast.error('Funcionalidade disponível apenas para o plano Equipe');
      return false;
    }

    if (!canAddMore) {
      toast.error(`Limite máximo de ${MAX_TEAM_MEMBERS} membros atingido`);
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email inválido');
      return false;
    }

    // Validate password
    if (!password || password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    // Check if email already exists in team
    if (teamMembers.some(m => m.member_email.toLowerCase() === email.toLowerCase())) {
      toast.error('Este email já está na sua equipe');
      return false;
    }

    try {
      setCreating(true);

      // Call edge function to create user and team member
      const { data, error } = await supabase.functions.invoke('create-team-member', {
        body: {
          email: email.toLowerCase().trim(),
          password,
          name: name.trim(),
          ownerUserId: user.id,
        },
      });

      if (error) {
        console.error('Error calling create-team-member:', error);
        toast.error('Erro ao adicionar membro');
        return false;
      }

      if (data.error) {
        toast.error(data.error);
        return false;
      }

      setTeamMembers(prev => [...prev, data.teamMember as TeamMember]);
      toast.success('Membro adicionado com sucesso!', {
        description: `${name} (${email}) foi adicionado à sua equipe.`
      });
      return true;
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error('Erro ao adicionar membro');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const removeTeamMember = async (memberId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Membro removido da equipe');
      return true;
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Erro ao remover membro');
      return false;
    }
  };

  const updateTeamMemberStatus = async (memberId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status })
        .eq('id', memberId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      setTeamMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, status } : m)
      );
      toast.success(`Status do membro atualizado para ${status === 'ACTIVE' ? 'Ativo' : 'Inativo'}`);
      return true;
    } catch (error) {
      console.error('Error updating team member:', error);
      toast.error('Erro ao atualizar status');
      return false;
    }
  };

  return {
    teamMembers,
    loading: loading || authLoading, // Include auth loading state
    creating,
    isEquipePlan,
    isOwner,        // true if user owns the plan (not a sub-account)
    isTeamMember,   // true if user is a sub-account
    canAddMore,
    maxMembers: MAX_TEAM_MEMBERS,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberStatus,
    refetch: fetchTeamMembers
  };
};
