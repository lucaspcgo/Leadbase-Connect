import { useState } from 'react';
import { usePlans, DbPlan, PlanFormData } from '@/hooks/usePlans';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Star, 
  StarOff,
  Eye,
  EyeOff,
  CreditCard,
  Users,
  FileSpreadsheet,
  Building2,
  Loader2,
  X
} from 'lucide-react';

const AdminPlanos = () => {
  const { isMasterAdmin } = useAuth();
  const { plans, loading, createPlan, updatePlan, deletePlan, togglePlanActive, togglePlanPopular } = usePlans();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DbPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<DbPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<PlanFormData>({
    id: '',
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    monthly_company_limit: 10,
    features: [],
    max_users: null,
    can_export: false,
    is_active: true,
    display_order: 0,
    is_popular: false,
  });
  
  const [featuresText, setFeaturesText] = useState('');

  // isMasterAdmin comes from useAuth()

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      monthly_company_limit: 10,
      features: [],
      max_users: null,
      can_export: false,
      is_active: true,
      display_order: plans.length,
      is_popular: false,
    });
    setFeaturesText('');
    setEditingPlan(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({ ...prev, display_order: plans.length }));
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan: DbPlan) => {
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      price_monthly: Number(plan.price_monthly),
      price_yearly: Number(plan.price_yearly),
      monthly_company_limit: plan.monthly_company_limit,
      features: plan.features || [],
      max_users: plan.max_users,
      can_export: plan.can_export,
      is_active: plan.is_active,
      display_order: plan.display_order,
      is_popular: plan.is_popular,
    });
    setFeaturesText((plan.features || []).join('\n'));
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.id.trim() || !formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    const features = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const planData = { ...formData, features };

    let success = false;
    if (editingPlan) {
      success = await updatePlan(editingPlan.id, planData);
    } else {
      success = await createPlan(planData);
    }

    setIsSubmitting(false);

    if (success) {
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    
    setIsSubmitting(true);
    const success = await deletePlan(planToDelete.id);
    setIsSubmitting(false);
    
    if (success) {
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const confirmDelete = (plan: DbPlan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = async (plan: DbPlan) => {
    await togglePlanActive(plan.id, !plan.is_active);
  };

  const handleTogglePopular = async (plan: DbPlan) => {
    await togglePlanPopular(plan.id, !plan.is_popular);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Configure os planos de assinatura do sistema</p>
        </div>
        {isMasterAdmin && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        )}
      </div>

      {!isMasterAdmin && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="pt-6">
            <p className="text-warning-foreground">
              Apenas Master Admins podem editar planos. Você pode visualizar os planos configurados.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Planos Cadastrados
          </CardTitle>
          <CardDescription>
            {plans.length} plano(s) configurado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Preço Mensal</TableHead>
                <TableHead>Preço Anual</TableHead>
                <TableHead>Limite Empresas</TableHead>
                <TableHead>Recursos</TableHead>
                <TableHead>Status</TableHead>
                {isMasterAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-mono text-sm">{plan.display_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      {plan.is_popular && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {plan.id}</p>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(Number(plan.price_monthly))}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(Number(plan.price_yearly))}
                    {Number(plan.price_monthly) > 0 && (
                      <span className="block text-xs text-success">
                        Economia: {formatCurrency(Number(plan.price_monthly) * 12 - Number(plan.price_yearly))}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {plan.monthly_company_limit.toLocaleString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.can_export && (
                        <Badge variant="outline" className="text-xs">
                          <FileSpreadsheet className="h-3 w-3 mr-1" />
                          Exportar
                        </Badge>
                      )}
                      {plan.max_users && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {plan.max_users} usuários
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        +{(plan.features || []).length} recursos
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {isMasterAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(plan)}
                          title={plan.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {plan.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePopular(plan)}
                          title={plan.is_popular ? 'Remover destaque' : 'Destacar como popular'}
                        >
                          {plan.is_popular ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(plan)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(plan)}
                          className="text-destructive hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isMasterAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Nenhum plano cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? 'Altere as informações do plano. As mudanças afetarão novos assinantes.'
                : 'Preencha as informações para criar um novo plano.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID do Plano *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder="pro, basic, equipe..."
                  disabled={!!editingPlan}
                />
                <p className="text-xs text-muted-foreground">Identificador único, não pode ser alterado depois</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Pro, Basic, Equipe..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Para profissionais exigentes..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Preço Mensal (R$)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_yearly">Preço Anual (R$)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: parseFloat(e.target.value) || 0 }))}
                />
                {formData.price_monthly > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sugestão (2 meses grátis): {formatCurrency(formData.price_monthly * 10)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_company_limit">Limite de Empresas/Mês</Label>
                <Input
                  id="monthly_company_limit"
                  type="number"
                  min="1"
                  value={formData.monthly_company_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_company_limit: parseInt(e.target.value) || 10 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_users">Máx. Usuários (opcional)</Label>
                <Input
                  id="max_users"
                  type="number"
                  min="1"
                  value={formData.max_users || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_users: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Recursos (um por linha)</Label>
              <Textarea
                id="features"
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder="1.000 empresas/mês&#10;Exportação CSV&#10;Suporte prioritário"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Estes textos aparecem na página de preços e checkout
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="can_export"
                  checked={formData.can_export}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_export: checked }))}
                />
                <Label htmlFor="can_export">Permite Exportação</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Plano Ativo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                />
                <Label htmlFor="is_popular">Destacar como Popular</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.id.trim() || !formData.name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano <strong>"{planToDelete?.name}"</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Planos em uso por usuários não podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPlanos;
