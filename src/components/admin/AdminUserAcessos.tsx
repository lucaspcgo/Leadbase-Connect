import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Loader2, Coins, Unlock, Clock } from 'lucide-react';

interface AdminUserAcessosProps {
  userId: string;
}

interface UnlockedCompany {
  id: string;
  empresa_cnpj: string;
  empresa_id: number | null;
  unlocked_at: string;
  billing_cycle_end: string;
  razao_social?: string;
  nome_fantasia?: string;
  municipio?: string;
  uf?: string;
}

interface AccessLog {
  id: string;
  empresa_cnpj: string;
  empresa_razao_social: string | null;
  action: string;
  credits_used: number | null;
  used_extra_credit: boolean | null;
  created_at: string;
}

const AdminUserAcessos = ({ userId }: AdminUserAcessosProps) => {
  // Fetch unlocked companies with empresa details
  const { data: unlockedCompanies = [], isLoading: isLoadingUnlocked } = useQuery({
    queryKey: ['admin-user-unlocked-companies', userId],
    queryFn: async () => {
      // First get unlocked companies
      const { data: unlocked, error: unlockedError } = await supabase
        .from('unlocked_companies')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (unlockedError) throw unlockedError;

      // Get empresa details for each unlocked company
      const empresaIds = (unlocked || [])
        .filter(u => u.empresa_id)
        .map(u => u.empresa_id);

      let empresasMap: Record<number, any> = {};
      
      if (empresaIds.length > 0) {
        const { data: empresas, error: empresasError } = await supabase
          .from('empresas')
          .select('id, razao_social, nome_fantasia, municipio, uf')
          .in('id', empresaIds);

        if (!empresasError && empresas) {
          empresasMap = empresas.reduce((acc, emp) => {
            acc[emp.id] = emp;
            return acc;
          }, {} as Record<number, any>);
        }
      }

      // Merge data
      return (unlocked || []).map(u => ({
        ...u,
        razao_social: u.empresa_id ? empresasMap[u.empresa_id]?.razao_social : null,
        nome_fantasia: u.empresa_id ? empresasMap[u.empresa_id]?.nome_fantasia : null,
        municipio: u.empresa_id ? empresasMap[u.empresa_id]?.municipio : null,
        uf: u.empresa_id ? empresasMap[u.empresa_id]?.uf : null,
      })) as UnlockedCompany[];
    },
  });

  // Fetch access logs for credit usage history
  const { data: accessLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['admin-user-access-logs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccessLog[];
    },
  });

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatCnpj = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isLoading = isLoadingUnlocked || isLoadingLogs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate summary stats
  const totalUnlocked = unlockedCompanies.length;
  const activeUnlocked = unlockedCompanies.filter(u => !isExpired(u.billing_cycle_end)).length;
  const totalCreditsUsed = accessLogs.reduce((sum, log) => sum + (log.credits_used || 0), 0);
  const extraCreditsUsed = accessLogs.filter(log => log.used_extra_credit).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Desbloqueadas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalUnlocked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Ativas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeUnlocked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Créditos Usados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalCreditsUsed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Extras Usados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{extraCreditsUsed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Unlocked Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresas Desbloqueadas ({totalUnlocked})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unlockedCompanies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlockedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap font-mono text-sm">
                      {formatDate(company.unlocked_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCnpj(company.empresa_cnpj)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate">
                        {company.razao_social || company.nome_fantasia || (
                          <span className="text-muted-foreground italic">ID: {company.empresa_id}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.municipio && company.uf ? (
                        <span className="text-sm">
                          {company.municipio}/{company.uf}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired(company.billing_cycle_end) ? (
                        <Badge variant="secondary">Expirado</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(company.billing_cycle_end)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma empresa desbloqueada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Access Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Histórico de Acessos ({accessLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accessLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Créditos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap font-mono text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCnpj(log.empresa_cnpj)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.action === 'unlock' ? 'Desbloqueio' : 
                         log.action === 'view' ? 'Visualização' : log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.credits_used && log.credits_used > 0 ? (
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-warning" />
                          <span className="font-mono">-{log.credits_used}</span>
                          {log.used_extra_credit && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              Extra
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum acesso registrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserAcessos;
