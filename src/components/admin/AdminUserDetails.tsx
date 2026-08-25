import { useNavigate, useParams } from 'react-router-dom';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Edit, Shield, ShieldCheck, Crown, Ban, 
  CheckCircle, AlertTriangle, Clock, Coins, History,
  User, Mail, Calendar, CreditCard, Building2
} from 'lucide-react';
import { UserRole, UserStatus } from '@/types';
import AdminUserAcessos from './AdminUserAcessos';

const AdminUserDetails = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { getUserById, getCreditLedgerByUser, getAuditLogsByUser, isLoading } = useUsers();
  
  const user = userId ? getUserById(userId) : null;
  const creditLedger = userId ? getCreditLedgerByUser(userId) : [];
  const auditLogs = userId ? getAuditLogsByUser(userId) : [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Carregando detalhes do usuário...</p>
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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'MASTER_ADMIN':
        return <Crown className="h-5 w-5 text-warning" />;
      case 'ADMIN':
        return <ShieldCheck className="h-5 w-5 text-primary" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'MASTER_ADMIN':
        return <Badge className="bg-warning text-warning-foreground">Master Admin</Badge>;
      case 'ADMIN':
        return <Badge className="bg-primary">Admin</Badge>;
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="text-success border-success"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'BLOCKED':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Bloqueado</Badge>;
      case 'SUSPENDED':
        return <Badge variant="outline" className="text-warning border-warning"><AlertTriangle className="h-3 w-3 mr-1" />Suspenso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/usuarios')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              {getRoleIcon(user.role)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/usuarios/${user.id}/editar`)}>
          <Edit className="h-4 w-4 mr-2" /> Editar
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="empresas">Empresas Consultadas</TabsTrigger>
          <TabsTrigger value="creditos">Créditos ({creditLedger.length})</TabsTrigger>
          <TabsTrigger value="historico">Alterações ({auditLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" /> Dados do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-mono text-sm">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <div className="mt-1">{getRoleBadge(user.role)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(user.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Verificado</p>
                    <p>{user.emailVerified ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Plano e Créditos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plano Atual</p>
                    <p className="font-medium">{user.plan?.name || 'Nenhum'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Limite Mensal</p>
                    <p className="font-medium">
                      {user.monthlyLimit || user.plan?.monthlyCompanyLimit || 0} empresas
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Créditos Extras</p>
                    <p className="font-mono text-lg font-bold text-primary">{user.extraCredits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Início do Plano</p>
                    <p>{user.planStartDate?.toLocaleDateString('pt-BR') || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cadastro</p>
                    <p>{user.createdAt.toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Início do Plano</p>
                    <p>{user.planStartDate?.toLocaleDateString('pt-BR') || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block Info */}
            {user.status === 'BLOCKED' && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <Ban className="h-4 w-4" /> Informações de Bloqueio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="font-medium">{user.blockedReason || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bloqueado em</p>
                      <p>{user.blockedAt?.toLocaleString('pt-BR') || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bloqueado por</p>
                      <p className="font-mono text-sm">{user.blockedBy || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="empresas">
          <AdminUserAcessos userId={user.id} />
        </TabsContent>

        <TabsContent value="creditos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" /> Histórico de Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creditLedger.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditLedger.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {entry.created_at.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono font-bold ${entry.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                            {entry.amount > 0 ? '+' : ''}{entry.amount}
                          </span>
                        </TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.admin_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação de créditos
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Histórico de Alterações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {log.created_at.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <p>{log.details}</p>
                          {log.before_value && log.after_value && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="text-destructive">{log.before_value}</span>
                              {' → '}
                              <span className="text-success">{log.after_value}</span>
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.admin_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma alteração registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUserDetails;
