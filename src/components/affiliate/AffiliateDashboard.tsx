import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyAffiliate } from '@/hooks/useAffiliates';
import { 
  Link2, 
  DollarSign, 
  Users, 
  TrendingUp,
  Copy, 
  Check,
  Clock,
  Share2,
  ExternalLink,
  Loader2,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const AffiliateDashboard = () => {
  const { affiliate, referrals, commissions, loading, getReferralLink } = useMyAffiliate();
  const [copiedLink, setCopiedLink] = useState(false);

  const referralLink = getReferralLink();

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success('Link copiado!', {
        description: 'Link de indicação copiado para a área de transferência'
      });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareLink = () => {
    if (referralLink && navigator.share) {
      navigator.share({
        title: 'Convite para LeadsBase Pro',
        text: 'Junte-se ao LeadsBase Pro e tenha acesso a milhares de leads qualificados!',
        url: referralLink,
      });
    } else if (referralLink) {
      copyLink();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Você ainda não é afiliado</h3>
          <p className="text-muted-foreground mb-4">
            Entre em contato com nossa equipe para se tornar um afiliado e começar a ganhar comissões.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/contato'}>
            Fale Conosco
          </Button>
        </CardContent>
      </Card>
    );
  }

  const conversionRate = affiliate.total_referrals > 0 
    ? ((referrals.filter(r => r.status === 'CONVERTED').length / affiliate.total_referrals) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Programa de Afiliados</h2>
          <p className="text-muted-foreground">
            Gerencie suas indicações e acompanhe suas comissões
          </p>
        </div>
        <Badge variant={affiliate.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {affiliate.status === 'ACTIVE' ? 'Ativo' : affiliate.status}
        </Badge>
      </div>

      {/* Referral Link Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Seu Link de Indicação
          </CardTitle>
          <CardDescription>
            Compartilhe este link e ganhe {affiliate.commission_rate}% de comissão em cada venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="text-sm flex-1 truncate">
                {referralLink}
              </code>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyLink} variant="outline">
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-success" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
              <Button onClick={shareLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Código:</span>
            <code className="bg-primary/10 px-2 py-1 rounded font-bold text-primary">
              {affiliate.referral_code}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliate.total_referrals}</div>
            <p className="text-xs text-muted-foreground">
              {referrals.filter(r => r.status === 'CONVERTED').length} convertidas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <Progress value={parseFloat(conversionRate)} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ganhos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              R$ {affiliate.pending_earnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {affiliate.paid_earnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: R$ {affiliate.total_earnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Referrals and Commissions */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">
            Indicações ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="commissions">
            Comissões ({commissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Suas Indicações</CardTitle>
              <CardDescription>
                Usuários que se cadastraram usando seu link de indicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você ainda não tem indicações</p>
                  <p className="text-sm">Compartilhe seu link para começar a ganhar!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Convertido em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map(referral => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">
                          {referral.referred_user_email}
                        </TableCell>
                        <TableCell>
                          {format(referral.created_at, "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(referral.status)}
                        </TableCell>
                        <TableCell>
                          {referral.converted_at 
                            ? format(referral.converted_at, "dd/MM/yyyy", { locale: ptBR })
                            : '-'
                          }
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
              <CardTitle>Suas Comissões</CardTitle>
              <CardDescription>
                Histórico de comissões geradas pelas suas indicações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você ainda não tem comissões</p>
                  <p className="text-sm">Quando suas indicações realizarem compras, você verá aqui!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor da Venda</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map(commission => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          {format(commission.created_at, "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          R$ {commission.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {commission.commission_rate}%
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {commission.commission_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(commission.status)}
                        </TableCell>
                        <TableCell>
                          {commission.paid_at 
                            ? format(commission.paid_at, "dd/MM/yyyy", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateDashboard;
