import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { Users, UserPlus, Trash2, UserCheck, UserX, Mail, User, Lock, Eye, EyeOff } from 'lucide-react';

const TeamManager = () => {
  const {
    teamMembers,
    loading,
    creating,
    isEquipePlan,
    isOwner,
    isTeamMember,
    canAddMore,
    maxMembers,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberStatus
  } = useTeamMembers();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Don't render if not on Equipe plan (and auth is done loading)
  // If loading is true, we wait to check the plan
  if (!loading && !isEquipePlan) {
    return null;
  }

  // Show loading state while auth or team data is loading
  if (loading) {
    // If we already know it's not equipe plan, don't show loading
    if (isEquipePlan === false) {
      return null;
    }
    return (
      <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <Skeleton className="h-5 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show limited view for team members (sub-accounts)
  if (isTeamMember) {
    return (
      <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Plano Equipe
          </CardTitle>
          <CardDescription>
            Você está vinculado a uma conta Equipe como membro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p>
              <strong>Nota:</strong> Você tem acesso aos benefícios do plano Equipe através da conta do administrador.
              Apenas o titular do plano pode gerenciar os membros da equipe.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAddMember = async () => {
    if (!newMemberEmail || !newMemberName || !newMemberPassword) return;

    const success = await addTeamMember(newMemberEmail, newMemberName, newMemberPassword);
    if (success) {
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberPassword('');
      setIsAddDialogOpen(false);
    }
  };

  const getStatusBadge = (status: TeamMember['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-emerald-500">Ativo</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">Pendente</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          Gerente de Contas
        </CardTitle>
        <CardDescription>
          Gerencie os membros da sua equipe. Você pode adicionar até {maxMembers} usuários que compartilharão os benefícios do seu plano.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Usage indicator */}
        <div className="mb-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>{teamMembers.length}</strong> de <strong>{maxMembers}</strong> membros adicionados
            </span>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canAddMore}>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
                <DialogDescription>
                  Adicione um novo membro para compartilhar os benefícios do plano Equipe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member-name">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="member-name"
                      placeholder="Nome do membro"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="member-email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-password">Senha de Acesso</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="member-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newMemberPassword}
                      onChange={(e) => setNewMemberPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O membro usará este email e senha para acessar o painel.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddMember} 
                  disabled={!newMemberEmail || !newMemberName || !newMemberPassword || newMemberPassword.length < 6 || creating}
                >
                  {creating ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team members list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum membro adicionado ainda.</p>
            <p className="text-sm">Clique em "Adicionar Membro" para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.member_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{member.member_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(member.status)}
                  
                  {/* Toggle status button */}
                  {member.status !== 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateTeamMemberStatus(
                        member.id,
                        member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                      )}
                      title={member.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                    >
                      {member.status === 'ACTIVE' ? (
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                      )}
                    </Button>
                  )}

                  {/* Remove member button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover <strong>{member.member_name}</strong> da sua equipe? 
                          Esta pessoa perderá acesso aos benefícios do plano.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeTeamMember(member.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p>
            <strong>Nota:</strong> Os membros da equipe compartilham o limite mensal de {3000} empresas do plano Equipe.
            Cada membro pode visualizar empresas usando a cota compartilhada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamManager;
