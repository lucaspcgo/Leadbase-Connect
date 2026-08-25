import { useState, useEffect } from 'react';
import { useCoupons, Coupon, CouponInsert } from '@/hooks/useCoupons';
import { useActivePlans } from '@/hooks/usePlans';
import { ensureFirstPurchaseCouponExists } from '@/hooks/useFirstPurchaseCoupon';
import { CouponUsageReport } from './CouponUsageReport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Ticket, Percent, DollarSign, Calendar, Users, Gift, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminCupons = () => {
  const { coupons, loading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus, fetchCoupons } = useCoupons();
  const { plans } = useActivePlans();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [creatingFirstPurchaseCoupon, setCreatingFirstPurchaseCoupon] = useState(false);
  const [formData, setFormData] = useState<CouponInsert>({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_purchase: 0,
    max_uses: null,
    valid_from: null,
    valid_until: null,
    is_active: true,
    applicable_plans: [],
  });

  // Check if first purchase coupon exists
  const firstPurchaseCouponExists = coupons.some(c => c.code === 'PRIMEIRA5');

  const handleCreateFirstPurchaseCoupon = async () => {
    setCreatingFirstPurchaseCoupon(true);
    try {
      const success = await ensureFirstPurchaseCouponExists();
      if (success) {
        toast({
          title: 'Cupom criado!',
          description: 'Cupom de primeira compra (PRIMEIRA5 - 5% desconto) criado com sucesso.',
        });
        await fetchCoupons();
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível criar o cupom de primeira compra.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating first purchase coupon:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar cupom de primeira compra.',
        variant: 'destructive',
      });
    } finally {
      setCreatingFirstPurchaseCoupon(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_purchase: 0,
      max_uses: null,
      valid_from: null,
      valid_until: null,
      is_active: true,
      applicable_plans: [],
    });
    setEditingCoupon(null);
  };

  const handleCreate = async () => {
    const success = await createCoupon(formData);
    if (success) {
      setIsCreateOpen(false);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!editingCoupon) return;
    const success = await updateCoupon(editingCoupon.id, formData);
    if (success) {
      setEditingCoupon(null);
      resetForm();
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase,
      max_uses: coupon.max_uses,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      is_active: coupon.is_active,
      applicable_plans: coupon.applicable_plans || [],
    });
    setEditingCoupon(coupon);
  };

  const handleTogglePlan = (planId: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_plans: prev.applicable_plans?.includes(planId)
        ? prev.applicable_plans.filter(p => p !== planId)
        : [...(prev.applicable_plans || []), planId],
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: 'Inativo', variant: 'secondary' as const };
    
    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { label: 'Expirado', variant: 'destructive' as const };
    }
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { label: 'Programado', variant: 'outline' as const };
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { label: 'Esgotado', variant: 'destructive' as const };
    }
    
    return { label: 'Ativo', variant: 'default' as const };
  };

  const CouponForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código do Cupom *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="DESCONTO10"
            className="uppercase"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount_type">Tipo de Desconto</Label>
          <Select
            value={formData.discount_type}
            onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'PERCENTAGE' | 'FIXED' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">
                <span className="flex items-center gap-2">
                  <Percent className="h-4 w-4" /> Porcentagem
                </span>
              </SelectItem>
              <SelectItem value="FIXED">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Valor Fixo (R$)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount_value">
            Valor do Desconto {formData.discount_type === 'PERCENTAGE' ? '(%)' : '(R$)'} *
          </Label>
          <Input
            id="discount_value"
            type="number"
            min="0"
            step={formData.discount_type === 'PERCENTAGE' ? '1' : '0.01'}
            max={formData.discount_type === 'PERCENTAGE' ? '100' : undefined}
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_purchase">Valor Mínimo (R$)</Label>
          <Input
            id="min_purchase"
            type="number"
            min="0"
            step="0.01"
            value={formData.min_purchase || ''}
            onChange={(e) => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_uses">Limite de Usos</Label>
          <Input
            id="max_uses"
            type="number"
            min="0"
            value={formData.max_uses || ''}
            onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Ilimitado"
          />
        </div>
        <div className="space-y-2 flex items-center gap-4 pt-6">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Cupom Ativo</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valid_from">Válido a partir de</Label>
          <Input
            id="valid_from"
            type="date"
            value={formData.valid_from ? formData.valid_from.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valid_until">Válido até</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until ? formData.valid_until.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do cupom (opcional)"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Planos Aplicáveis</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Deixe vazio para aplicar a todos os planos.
        </p>
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center space-x-2">
              <Checkbox
                id={`plan-${plan.id}`}
                checked={formData.applicable_plans?.includes(plan.id) || false}
                onCheckedChange={() => handleTogglePlan(plan.id)}
              />
              <Label htmlFor={`plan-${plan.id}`} className="text-sm cursor-pointer">
                {plan.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Cupons de Desconto
          </h1>
          <p className="text-muted-foreground">Gerencie cupons de desconto para seus planos</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!firstPurchaseCouponExists && (
            <Button 
              variant="outline" 
              onClick={handleCreateFirstPurchaseCoupon}
              disabled={creatingFirstPurchaseCoupon}
            >
              <Gift className="h-4 w-4 mr-2" />
              {creatingFirstPurchaseCoupon ? 'Criando...' : 'Criar Cupom Primeira Compra (5%)'}
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cupom
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Cupom</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo cupom de desconto.
                </DialogDescription>
              </DialogHeader>
              <CouponForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!formData.code || !formData.discount_value}>
                  Criar Cupom
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="coupons" className="w-full">
        <TabsList>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Cupons
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="space-y-6 mt-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Cupons</p>
                <p className="text-2xl font-bold">{coupons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <Ticket className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">
                  {coupons.filter(c => c.is_active && (!c.valid_until || new Date(c.valid_until) >= new Date())).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Usos</p>
                <p className="text-2xl font-bold">
                  {coupons.reduce((acc, c) => acc + c.current_uses, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Calendar className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expirados</p>
                <p className="text-2xl font-bold">
                  {coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cupons</CardTitle>
          <CardDescription>Todos os cupons de desconto cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum cupom cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro cupom de desconto para oferecer promoções aos seus clientes.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Cupom
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono font-bold">{coupon.code}</span>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground">{coupon.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {coupon.discount_type === 'PERCENTAGE' ? (
                            <><Percent className="h-3 w-3 mr-1" />{coupon.discount_value}%</>
                          ) : (
                            <>R$ {coupon.discount_value.toFixed(2)}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {coupon.current_uses}
                          {coupon.max_uses ? `/${coupon.max_uses}` : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coupon.valid_from || coupon.valid_until ? (
                            <>
                              {formatDate(coupon.valid_from)} - {formatDate(coupon.valid_until)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sem limite</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={(checked) => toggleCouponStatus(coupon.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Cupom</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o cupom <strong>{coupon.code}</strong>?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCoupon(coupon.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <CouponUsageReport coupons={coupons} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingCoupon} onOpenChange={(open) => { if (!open) { setEditingCoupon(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cupom</DialogTitle>
            <DialogDescription>
              Atualize os dados do cupom de desconto.
            </DialogDescription>
          </DialogHeader>
          <CouponForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingCoupon(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.code || !formData.discount_value}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCupons;
