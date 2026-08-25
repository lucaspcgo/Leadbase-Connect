import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAffiliates } from '@/hooks/useAffiliates';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Link2, 
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Clock,
  Ban,
  Loader2,
  Search,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Affiliate, AffiliateCommission, CommissionStatus } from '@/types/affiliate';
import AffiliateReports from './AffiliateReports';

const AdminAfiliados = () => {
  const { toast } = useToast();
  const {
    affiliates,
    commissions,
    stats,
    loading,
    fetchAffiliates,
    fetchCommissions,
    createAffiliate,
    updateAffiliate,
    deleteAffiliate,
    updateCommissionStatus,
  } = useAffiliates();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newCommissionRate, setNewCommissionRate] = useState('10');
  const [newReferralCode, setNewReferralCode] = useState('');
  const [editCommissionRate, setEditCommissionRate] = useState('');
  const [editReferralCode, setEditReferralCode] = useState('');
  const [editStatus, setEditStatus] = useState('');
  
  // User search for creating affiliates
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Copy to clipboard
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  // Search users for affiliate creation
  const searchUsers = async (email: string) => {
    if (email.length < 3) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      // Search in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .ilike('name', `%${email}%`)
        .limit(10);

      if (error) throw error;

      setUserSearchResults((data || []).map(p => ({
        id: p.user_id,
        email: p.name || 'N/A', // Using name as we don't have email in profiles
        name: p.name || 'N/A',
      })));
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleCreateAffiliate = async () => {
    if (!selectedUserId) {
      toast({ title: 'Erro', description: 'Selecione um usuário', variant: 'destructive' });
      return;
    }

    // Check if user is already an affiliate
    const existingAffiliate = affiliates.find(a => a.user_id === selectedUserId);
    if (existingAffiliate) {
      toast({ title: 'Erro', description: 'Este usuário já é um afiliado', variant: 'destructive' });
      return;
    }

    setCreateLoading(true);
    const result = await createAffiliate({
      user_id: selectedUserId,
      commission_rate: parseFloat(newCommissionRate) || 10,
      referral_code: newReferralCode || undefined,
    });

    setCreateLoading(false);

    if (result) {
      toast({ title: 'Sucesso', description: 'Afiliado criado com sucesso!' });
      setIsCreateOpen(false);
      resetCreateForm();
    } else {
      toast({ title: 'Erro', description: 'Não foi possível criar o afiliado', variant: 'destructive' });
    }
  };

  const handleUpdateAffiliate = async () => {
    if (!selectedAffiliate) return;

    const success = await updateAffiliate(selectedAffiliate.id, {
      commission_rate: parseFloat(editCommissionRate),
      referral_code: editReferralCode,
      status: editStatus as Affiliate['status'],
    });

    if (success) {
      toast({ title: 'Sucesso', description: 'Afiliado atualizado!' });
      setIsEditOpen(false);
    } else {
      toast({ title: 'Erro', description: 'Não foi possível atualizar', variant: 'destructive' });
    }
  };

  const handleDeleteAffiliate = async (affiliateId: string) => {
    const success = await deleteAffiliate(affiliateId);
    if (success) {
      toast({ title: 'Sucesso', description: 'Afiliado removido!' });
    } else {
      toast({ title: 'Erro', description: 'Não foi possível remover', variant: 'destructive' });
    }
  };

  const handleCommissionStatusChange = async (commissionId: string, status: CommissionStatus) => {
    const success = await updateCommissionStatus(commissionId, status as 'APPROVED' | 'PAID' | 'CANCELLED');
    if (success) {
      toast({ title: 'Sucesso', description: 'Status da comissão atualizado!' });
    } else {
      toast({ title: 'Erro', description: 'Não foi possível atualizar', variant: 'destructive' });
    }
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/cadastro?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: 'Copiado!', description: 'Link de indicação copiado para a área de transferência' });
  };

  const resetCreateForm = () => {
    setNewUserEmail('');
    setNewCommissionRate('10');
    setNewReferralCode('');
    setSelectedUserId('');
    setUserSearchResults([]);
  };

  const openEditDialog = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setEditCommissionRate(affiliate.commission_rate.toString());
    setEditReferralCode(affiliate.referral_code);
    setEditStatus(affiliate.status);
    setIsEditOpen(true);
  };

  const filteredAffiliates = affiliates.filter(a =>
    a.referral_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-success text-white">Ativo</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">Suspenso</Badge>;
      case 'PENDING':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'CONVERTED':
        return <Badge className="bg-success text-white"><Check className="h-3 w-3 mr-1" />Convertido</Badge>;
      case 'APPROVED':
        return <Badge className="bg-primary text-white">Aprovado</Badge>;
      case 'PAID':
        return <Badge className="bg-success text-white"><DollarSign className="h-3 w-3 mr-1" />Pago</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetCreateForm(); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Afiliado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Afiliado</DialogTitle>
              <DialogDescription>
                Adicione um usuário como afiliado do programa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Buscar Usuário</Label>
                <Input
                  placeholder="Digite o nome do usuário..."
                  value={newUserEmail}
                  onChange={(e) => {
                    setNewUserEmail(e.target.value);
                    searchUsers(e.target.value);
                  }}
                />
                {searchingUsers && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </div>
                )}
                {userSearchResults.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {userSearchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setNewUserEmail(user.name);
                          setUserSearchResults([]);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                          selectedUserId === user.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="font-medium">{user.name}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUserId && (
                  <Badge variant="secondary" className="mt-2">
                    Usuário selecionado: {newUserEmail}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label>Taxa de Comissão (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Código de Indicação (opcional)</Label>
                <Input
                  placeholder="Deixe em branco para gerar automaticamente"
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAffiliate} disabled={createLoading || !selectedUserId}>
                {createLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Afiliado'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAffiliates || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeAffiliates || 0} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.convertedReferrals || 0} convertidas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.totalCommissions || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              R$ {(stats?.pendingCommissions || 0).toFixed(2)} pendentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Comissões Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {(stats?.paidCommissions || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="affiliates">
        <TabsList>
          <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="affiliates" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lista de Afiliados</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar afiliado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAffiliates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum afiliado encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Indicações</TableHead>
                      <TableHead>Ganhos Pendentes</TableHead>
                      <TableHead>Ganhos Pagos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map(affiliate => (
                      <TableRow key={affiliate.id}>
                        <TableCell className="font-medium">
                          {affiliate.user_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {affiliate.referral_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyReferralLink(affiliate.referral_code)}
                            >
                              {copiedCode === affiliate.referral_code ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{affiliate.commission_rate}%</TableCell>
                        <TableCell>{affiliate.total_referrals}</TableCell>
                        <TableCell>R$ {affiliate.pending_earnings.toFixed(2)}</TableCell>
                        <TableCell className="text-success">
                          R$ {affiliate.paid_earnings.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(affiliate)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Afiliado</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover este afiliado? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAffiliate(affiliate.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comissões</CardTitle>
              <CardDescription>
                Gerencie as comissões geradas pelas indicações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma comissão registrada ainda
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Usuário Indicado</TableHead>
                      <TableHead>Valor Pagamento</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map(commission => {
                      const affiliate = affiliates.find(a => a.id === commission.affiliate_id);
                      return (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {format(commission.created_at, "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{affiliate?.user_name || 'N/A'}</TableCell>
                          <TableCell>{commission.referred_user_email || 'N/A'}</TableCell>
                          <TableCell>R$ {commission.amount.toFixed(2)}</TableCell>
                          <TableCell>{commission.commission_rate}%</TableCell>
                          <TableCell className="font-medium">
                            R$ {commission.commission_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(commission.status)}</TableCell>
                          <TableCell>
                            <Select
                              value={commission.status}
                              onValueChange={(value) => handleCommissionStatusChange(commission.id, value as CommissionStatus)}
                              disabled={commission.status === 'PAID' || commission.status === 'CANCELLED'}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pendente</SelectItem>
                                <SelectItem value="APPROVED">Aprovado</SelectItem>
                                <SelectItem value="PAID">Pago</SelectItem>
                                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
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

        <TabsContent value="reports" className="mt-4">
          <AffiliateReports />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Afiliado</DialogTitle>
            <DialogDescription>
              Atualize as informações do afiliado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Taxa de Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editCommissionRate}
                onChange={(e) => setEditCommissionRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Código de Indicação</Label>
              <Input
                value={editReferralCode}
                onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateAffiliate}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAfiliados;
