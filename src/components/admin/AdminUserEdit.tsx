import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { plans } from '@/data/mockData';
import { 
  ArrowLeft, Save, Ban, CheckCircle, Shield, ShieldCheck, Crown,
  Plus, Minus, Coins, AlertTriangle, Trash2, Loader2
} from 'lucide-react';
import { User, UserRole, UserStatus } from '@/types';

const AdminUserEdit = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, isAdmin } = useAuth();
  const { 
    getUserById, updateUser, deleteUser, blockUser, unblockUser, 
    changeUserRole, changeUserPlan, adjustCredits, canManageRole,
    isMasterAdmin, getMasterAdminCount, isLoading,
    extendUserPlan, setUserPlanExpiry
  } = useUsers();
  
  const user = userId ? getUserById(userId) : null;
  
  const [formData, setFormData] = useState<Partial<User>>({});
  const [diasPersonalizados, setDiasPersonalizados] = useState('');
  const [prorrogando, setProrrogando] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUserRole = currentUser?.role as UserRole || 'USER';
  const isMasterAdminUser = currentUser ? isMasterAdmin(currentUser.id) : false;
  const isTargetMasterAdmin = user ? isMasterAdmin(user.id) : false;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        monthlyLimit: user.monthlyLimit,
      });
      setNewRole(user.role);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Carregando dados do usuário...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Usuário não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/admin/usuarios')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!currentUser) return;
    
    // Collect all changes to save at once
    const updates: Partial<User> = {};
    
    if (formData.name !== user.name) {
      updates.name = formData.name;
    }
    if (formData.email !== user.email) {
      updates.email = formData.email;
    }
    if (formData.monthlyLimit !== user.monthlyLimit) {
      updates.monthlyLimit = formData.monthlyLimit;
    }
    
    if (Object.keys(updates).length === 0) {
      toast({ title: 'Nenhuma alteração', description: 'Não há alterações para salvar' });
      return;
    }
    
    await updateUser(user.id, updates, currentUser.id, currentUser.name);
    
    toast({ title: 'Usuário atualizado', description: 'Todas as alterações foram salvas com sucesso' });
  };

  const handlePasswordChange = async () => {
    if (!currentUser || !newPassword || newPassword !== confirmPassword || newPassword.length < 6) {
      toast({ title: 'Erro', description: 'Verifique os campos de senha', variant: 'destructive' });
      return;
    }
    
    // In a real app, this would call an API to change the password
    // For mock, we'll just simulate success and log the action
    await updateUser(user.id, {}, currentUser.id, currentUser.name);
    
    toast({ title: 'Senha alterada', description: 'A nova senha foi definida com sucesso' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleBlock = async () => {
    if (!currentUser || !blockReason.trim()) {
      toast({ title: 'Erro', description: 'Informe o motivo do bloqueio', variant: 'destructive' });
      return;
    }
    
    if (isTargetMasterAdmin) {
      toast({ title: 'Erro', description: 'Não é possível bloquear um Master Admin', variant: 'destructive' });
      return;
    }
    
    const success = await blockUser(user.id, blockReason, currentUser.id, currentUser.name);
    if (success) {
      toast({ title: 'Usuário bloqueado' });
      setShowBlockDialog(false);
      setBlockReason('');
    }
  };

  const handleUnblock = async () => {
    if (!currentUser) return;
    
    const success = await unblockUser(user.id, currentUser.id, currentUser.name);
    if (success) {
      toast({ title: 'Usuário desbloqueado' });
    }
  };

  const handleCreditAdjust = async () => {
    if (!currentUser || creditAmount === 0 || !creditReason.trim()) {
      toast({ title: 'Erro', description: 'Informe quantidade e motivo', variant: 'destructive' });
      return;
    }
    
    await adjustCredits(user.id, creditAmount, creditReason, currentUser.id, currentUser.name);
    toast({ title: 'Créditos ajustados', description: `${creditAmount > 0 ? '+' : ''}${creditAmount} créditos` });
    setShowCreditDialog(false);
    setCreditAmount(0);
    setCreditReason('');
  };

  const handleRoleChange = async () => {
    if (!currentUser) return;
    
    const result = await changeUserRole(user.id, newRole, currentUser.id, currentUser.name, currentUserRole);
    if (result.success) {
      toast({ title: 'Role alterada' });
      setShowRoleDialog(false);
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handlePlanChange = async (planId: string) => {
    if (!currentUser) return;
    
    const plan = planId === 'none' ? null : plans.find(p => p.id === planId);
    await changeUserPlan(
      user.id, 
      planId === 'none' ? null : planId,
      formData.monthlyLimit,
      currentUser.id, 
      currentUser.name
    );
    toast({ title: 'Plano alterado', description: plan ? `Agora: ${plan.name}` : 'Plano removido' });
  };

  const handleMonthlyLimitChange = async () => {
    if (!currentUser) return;
    
    await changeUserPlan(
      user.id,
      user.plan?.id || null,
      formData.monthlyLimit,
      currentUser.id,
      currentUser.name
    );
    toast({ title: 'Limite mensal atualizado' });
  };

  const handleExtendPlan = async (dias: number) => {
    if (!user || !Number.isFinite(dias) || dias < 1) {
      toast({
        title: 'Número de dias inválido',
        description: 'Informe um número inteiro maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    setProrrogando(true);
    const novaData = await extendUserPlan(user.id, dias);
    setProrrogando(false);

    if (!novaData) {
      toast({
        title: 'Não foi possível prorrogar',
        description: 'Verifique sua conexão e se você tem permissão de administrador.',
        variant: 'destructive',
      });
      return;
    }

    setDiasPersonalizados('');
    toast({
      title: `Plano prorrogado por ${dias} dia${dias > 1 ? 's' : ''}`,
      description: `Nova validade: ${novaData.toLocaleDateString('pt-BR')}`,
    });
  };

  const handleRemoveExpiry = async () => {
    if (!user) return;

    setProrrogando(true);
    const ok = await setUserPlanExpiry(user.id, null);
    setProrrogando(false);

    toast(ok
      ? { title: 'Validade removida', description: 'O plano deste cliente não expira mais.' }
      : { title: 'Não foi possível remover a validade', variant: 'destructive' as const });
  };

  const handleDelete = async () => {
    if (!currentUser || !user) return;
    
    if (isTargetMasterAdmin) {
      toast({ title: 'Erro', description: 'Não é possível excluir um Master Admin', variant: 'destructive' });
      return;
    }
    
    setIsDeleting(true);
    try {
      console.log('Starting user deletion for:', user.id, user.name);
      const success = await deleteUser(user.id, currentUser.id, currentUser.name);
      console.log('Delete result:', success);
      
      if (success) {
        toast({ title: 'Usuário excluído', description: 'O usuário foi removido permanentemente do sistema' });
        // Navigate with a slight delay to ensure state updates propagate
        setTimeout(() => {
          navigate('/admin/usuarios', { replace: true });
        }, 100);
      } else {
        toast({ title: 'Erro', description: 'Não foi possível excluir o usuário. Verifique os logs.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast({ title: 'Erro', description: 'Erro inesperado ao excluir usuário.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'MASTER_ADMIN':
        return <Crown className="h-4 w-4" />;
      case 'ADMIN':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const canChangeRole = canManageRole(currentUserRole, user.role) && 
    (user.role !== 'MASTER_ADMIN' || getMasterAdminCount() > 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/usuarios/${user.id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Usuário</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isTargetMasterAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. O usuário {user.name} será permanentemente excluído do sistema e perderá todo o acesso.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      'Confirmar Exclusão'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input 
                value={formData.name || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Defina uma nova senha para o acesso do usuário ao painel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nova Senha</Label>
              <Input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div>
              <Label>Confirmar Senha</Label>
              <Input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handlePasswordChange}
              disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 6}
            >
              <Save className="h-4 w-4 mr-2" /> Salvar Nova Senha
            </Button>
            {newPassword && newPassword.length < 6 && (
              <p className="text-xs text-destructive">A senha deve ter no mínimo 6 caracteres</p>
            )}
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </CardContent>
        </Card>

        {/* Role Management */}
        <Card>
          <CardHeader>
            <CardTitle>Role e Permissões</CardTitle>
            <CardDescription>
              {isMasterAdminUser 
                ? 'Como Master Admin, você pode alterar qualquer role.' 
                : 'Apenas Master Admin pode promover/rebaixar admins.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTargetMasterAdmin ? (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg text-warning-foreground">
                <Crown className="h-4 w-4" />
                <span className="text-sm">Este é um Master Admin protegido - role não pode ser alterada</span>
              </div>
            ) : (
              <div>
                <Label>Permissão</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      <SelectItem value="USER">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" /> Usuário
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Admin
                        </div>
                      </SelectItem>
                      {isMasterAdminUser && (
                        <SelectItem value="MASTER_ADMIN">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4" /> Master Admin
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={handleRoleChange}
                    disabled={newRole === user.role}
                  >
                    Salvar Permissão
                  </Button>
                </div>
                {newRole === 'MASTER_ADMIN' && newRole !== user.role && (
                  <div className="flex items-center gap-2 p-3 mt-3 bg-warning/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm">Master Admins têm acesso total e não podem ser bloqueados ou excluídos.</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Permissão atual:</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {getRoleIcon(user.role)}
                {user.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge 
                  variant={user.status === 'ACTIVE' ? 'outline' : 'destructive'}
                  className={user.status === 'ACTIVE' ? 'text-success border-success' : ''}
                >
                  {user.status === 'ACTIVE' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {user.status === 'BLOCKED' && <Ban className="h-3 w-3 mr-1" />}
                  {user.status}
                </Badge>
                {user.blockedReason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Motivo: {user.blockedReason}
                  </p>
                )}
              </div>
              
              {!isTargetMasterAdmin && (
                <>
                  {user.status === 'ACTIVE' ? (
                    <Button variant="destructive" size="sm" onClick={() => setShowBlockDialog(true)}>
                      <Ban className="h-4 w-4 mr-2" /> Bloquear
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleUnblock}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Desbloquear
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Management */}
        <Card>
          <CardHeader>
            <CardTitle>Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Plano Atual</Label>
              <Select 
                value={user.plan?.id || 'none'} 
                onValueChange={handlePlanChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Sem Plano</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Validade do plano</Label>
                {(() => {
                  if (!user.planExpiresAt) {
                    return (
                      <Badge variant="outline">Não expira</Badge>
                    );
                  }
                  const dias = Math.ceil(
                    (user.planExpiresAt.getTime() - Date.now()) / 86400000
                  );
                  if (dias < 0) {
                    return <Badge variant="destructive">Vencido</Badge>;
                  }
                  return (
                    <Badge
                      variant="outline"
                      className={dias <= 7 ? 'text-destructive border-destructive' : 'text-success border-success'}
                    >
                      {dias === 0 ? 'Vence hoje' : `${dias} dia${dias > 1 ? 's' : ''}`}
                    </Badge>
                  );
                })()}
              </div>

              <p className="text-sm text-muted-foreground">
                {user.planExpiresAt
                  ? `Vence em ${user.planExpiresAt.toLocaleDateString('pt-BR')}. Ao vencer, o cliente volta para o plano Free automaticamente.`
                  : 'Sem data de vencimento: o cliente mantém este plano até alguém alterar.'}
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  { rotulo: '+7 dias', dias: 7 },
                  { rotulo: '+1 mês', dias: 30 },
                  { rotulo: '+3 meses', dias: 90 },
                  { rotulo: '+6 meses', dias: 180 },
                  { rotulo: '+1 ano', dias: 365 },
                ].map(opcao => (
                  <Button
                    key={opcao.dias}
                    variant="outline"
                    size="sm"
                    disabled={prorrogando}
                    onClick={() => handleExtendPlan(opcao.dias)}
                  >
                    {opcao.rotulo}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={diasPersonalizados}
                  onChange={(e) => setDiasPersonalizados(e.target.value)}
                  placeholder="Outro número de dias"
                />
                <Button
                  variant="outline"
                  disabled={prorrogando || !diasPersonalizados}
                  onClick={() => handleExtendPlan(parseInt(diasPersonalizados, 10))}
                >
                  Prorrogar
                </Button>
              </div>

              {user.planExpiresAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={prorrogando}
                  onClick={handleRemoveExpiry}
                >
                  Remover validade (não expirar)
                </Button>
              )}
            </div>

            <div>
              <Label>Limite Mensal (override)</Label>
              <div className="flex gap-2">
                <Input 
                  type="number"
                  value={formData.monthlyLimit || ''} 
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    monthlyLimit: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder={`Padrão: ${user.plan?.monthlyCompanyLimit || 0}`}
                />
                <Button variant="outline" onClick={handleMonthlyLimitChange}>
                  Aplicar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para usar o limite padrão do plano
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Credit Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Coins className="h-5 w-5" /> Créditos Extras
              </span>
              <span className="text-2xl font-bold text-primary">{user.extraCredits}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setCreditAmount(10); setShowCreditDialog(true); }}
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar Créditos
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setCreditAmount(-10); setShowCreditDialog(true); }}
              >
                <Minus className="h-4 w-4 mr-2" /> Remover Créditos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" /> Bloquear Usuário
            </DialogTitle>
            <DialogDescription>
              O usuário {user.name} não poderá acessar a plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Motivo do Bloqueio *</Label>
              <Textarea 
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Informe o motivo do bloqueio..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={!blockReason.trim()}>
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" /> Ajustar Créditos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Quantidade</Label>
              <Input 
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valores negativos removem créditos
              </p>
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea 
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Informe o motivo do ajuste..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreditAdjust} disabled={creditAmount === 0 || !creditReason.trim()}>
              {creditAmount > 0 ? 'Adicionar' : 'Remover'} Créditos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminUserEdit;
