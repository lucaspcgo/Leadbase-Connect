import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { usePayment } from '@/contexts/PaymentContext';
import { useNavigate } from 'react-router-dom';
import { Search, Coins, TrendingUp, Clock, Building2, ArrowRight, Calendar, ArrowUpCircle, XCircle, AlertTriangle, CreditCard, CheckCircle2, Users, Lock, Share2 } from 'lucide-react';
import TeamManager from '@/components/dashboard/TeamManager';
import AffiliateDashboard from '@/components/affiliate/AffiliateDashboard';
import { plans } from '@/data/mockData';
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
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, isAuthenticated, isTeamMember } = useAuth();
  const { getAccessStats, getViewedCompaniesThisMonth } = useCredits();
  const { getSubscriptionByUser, cancelSubscription, subscriptions } = usePayment();
  const navigate = useNavigate();

  // State for cancellation dialog - must be before any conditional returns
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const stats = getAccessStats();
  const viewedCompanies = getViewedCompaniesThisMonth();
  const usagePercentage = (stats.companiesViewedThisMonth / stats.monthlyLimit) * 100;
  
  // Current user plan from auth context
  const currentPlan = user?.plan;
  const isFreePlan = currentPlan?.id === 'free';
  const isPaidPlan = currentPlan && currentPlan.priceMonthly > 0;
  
  // Get user's active subscription from payment context
  const activeSubscription = user?.id ? getSubscriptionByUser(user.id) : null;
  
  // For paid plans, check if there's a subscription or create a virtual one for display
  const hasActiveSubscription = activeSubscription?.status === 'ACTIVE' || (isPaidPlan && !activeSubscription);
  
  // Get available upgrade plans (plans higher than current)
  const currentPlanIndex = plans.findIndex(p => p.id === currentPlan?.id);
  const upgradePlans = plans.filter((_, index) => index > currentPlanIndex && plans[index].priceMonthly > 0);
  
  // Check if user has a cancelled subscription that's still active
  const cancelledButActiveSubscription = user?.id 
    ? subscriptions.find(s => 
        s.user_id === user.id && 
        s.status === 'CANCELLED' && 
        s.current_period_end && 
        new Date(s.current_period_end) > new Date()
      )
    : null;

  // Calculate renewal date for display - use stats.planRenewalDate as fallback
  const renewalDate = activeSubscription?.current_period_end 
    ? new Date(activeSubscription.current_period_end)
    : stats.planRenewalDate || new Date(new Date().setMonth(new Date().getMonth() + 1));

  // Calculate if 90-day minimum period has passed for cancellation
  const subscriptionStartDate = activeSubscription?.start_at 
    ? new Date(activeSubscription.start_at)
    : activeSubscription?.current_period_start 
      ? new Date(activeSubscription.current_period_start)
      : user?.planStartDate 
        ? new Date(user.planStartDate)
        : null;
  
  const MINIMUM_DAYS_BEFORE_CANCEL = 90;
  const canCancelSubscription = (() => {
    if (!subscriptionStartDate) return true; // Allow if no date found (edge case)
    const minCancelDate = new Date(subscriptionStartDate);
    minCancelDate.setDate(minCancelDate.getDate() + MINIMUM_DAYS_BEFORE_CANCEL);
    return new Date() >= minCancelDate;
  })();
  
  const daysUntilCanCancel = (() => {
    if (!subscriptionStartDate) return 0;
    const minCancelDate = new Date(subscriptionStartDate);
    minCancelDate.setDate(minCancelDate.getDate() + MINIMUM_DAYS_BEFORE_CANCEL);
    const diffTime = minCancelDate.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  })();
  
  const minCancelDate = subscriptionStartDate 
    ? new Date(new Date(subscriptionStartDate).setDate(subscriptionStartDate.getDate() + MINIMUM_DAYS_BEFORE_CANCEL))
    : null;

   const handleCancelSubscription = () => {
     if (isTeamMember) {
       toast.error('Ação não permitida', {
         description: 'Subcontas não podem cancelar a assinatura. Entre em contato com o titular do plano.',
       });
       setIsCancelDialogOpen(false);
       return;
     }

    const displayDate = renewalDate.toLocaleDateString('pt-BR');
    
    if (activeSubscription) {
      // Cancel real subscription
      cancelSubscription(activeSubscription.id);
      toast.success('Assinatura cancelada', {
        description: `Você terá acesso até ${displayDate}. Após essa data, seu acesso será bloqueado.`,
      });
    } else if (isPaidPlan && user?.id) {
      // For mock paid plans without subscription record, create one and cancel
      // This simulates the cancellation for demo purposes
      toast.success('Assinatura cancelada', {
        description: `Você terá acesso até ${displayDate}. Após essa data, seu acesso será bloqueado.`,
      });
    }
    
    setIsCancelDialogOpen(false);
  };

   const handleUpgrade = (planId: string) => {
     if (isTeamMember) {
       toast.error('Ação não permitida', {
         description: 'Subcontas não podem alterar o plano. Entre em contato com o titular do plano.',
       });
       return;
     }
    navigate(`/checkout?plan=${planId}&cycle=MONTHLY`);
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Olá, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de controle</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Empresas este mês</p>
                  <p className="text-2xl font-bold">{stats.companiesViewedThisMonth} / {stats.monthlyLimit}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.monthlyLimit - stats.companiesViewedThisMonth} restantes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Créditos Extras</p>
                  <p className="text-2xl font-bold">{stats.extraCredits}</p>
                  <p className="text-xs text-muted-foreground">não expiram</p>
                </div>
                <Coins className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <Badge className="mt-1">{user?.plan?.name || 'Free'}</Badge>
                </div>
                <TrendingUp className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Renovação</p>
                  <p className="text-lg font-medium">
                    {stats.planRenewalDate 
                      ? stats.planRenewalDate.toLocaleDateString('pt-BR') 
                      : '-'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Plan Info - Hidden for team members (sub-accounts) */}
        {!isTeamMember && (
          <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Seu Plano Atual
              </CardTitle>
              <CardDescription>
                Gerencie sua assinatura e veja os benefícios do seu plano
              </CardDescription>
            </CardHeader>
            <CardContent>
            {/* Current Plan Display */}
            <div className="mb-6 p-4 rounded-lg border bg-card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{currentPlan?.name || 'Free'}</h3>
                      <Badge variant={isFreePlan ? 'secondary' : 'default'}>
                        {isFreePlan ? 'Gratuito' : 'Ativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentPlan?.monthlyCompanyLimit || 10} empresas/mês • 
                      {isPaidPlan ? ` R$ ${currentPlan?.priceMonthly}/mês` : ' Sem custo'}
                    </p>
                    {renewalDate && isPaidPlan && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Renovação: {renewalDate.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {upgradePlans.length > 0 && (
                    <Button variant="default" size="sm" onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })}>
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Fazer Upgrade
                    </Button>
                  )}
                  {isPaidPlan && !cancelledButActiveSubscription && (
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('cancel-section')?.scrollIntoView({ behavior: 'smooth' })}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Show warning if subscription is cancelled but still active */}
            {cancelledButActiveSubscription && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Assinatura Cancelada</p>
                  <p className="text-sm text-muted-foreground">
                    Seu acesso permanece ativo até{' '}
                    <strong>
                      {new Date(cancelledButActiveSubscription.current_period_end!).toLocaleDateString('pt-BR')}
                    </strong>
                    . Após essa data, você precisará contratar um plano para continuar acessando os dados.
                    <br />
                    <span className="text-destructive font-medium">
                      Atenção: Após o bloqueio, o plano gratuito não estará disponível para sua conta.
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upgrade Section */}
              <div id="upgrade-section" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-primary" />
                    Fazer Upgrade
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Aumente seu limite de empresas mensais
                  </p>
                </div>
                
                {upgradePlans.length > 0 ? (
                  <div className="space-y-2">
                    {upgradePlans.map(plan => (
                      <div 
                        key={plan.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {plan.monthlyCompanyLimit} empresas/mês
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary">
                            R$ {plan.priceMonthly}/mês
                          </span>
                          <Button size="sm" onClick={() => handleUpgrade(plan.id)}>
                            Upgrade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground italic flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Você já está no plano mais alto disponível.
                    </p>
                  </div>
                )}
              </div>

              {/* Cancel Section */}
              <div id="cancel-section" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Cancelar Assinatura
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Período mínimo de {MINIMUM_DAYS_BEFORE_CANCEL} dias antes do cancelamento
                  </p>
                </div>

                {isPaidPlan && !cancelledButActiveSubscription ? (
                  <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    {/* 90-day lock notice */}
                    {!canCancelSubscription && (
                      <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
                        <Lock className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-warning">Período mínimo ativo</p>
                          <p className="text-sm text-muted-foreground">
                            Conforme acordado na contratação, sua assinatura possui um período mínimo de {MINIMUM_DAYS_BEFORE_CANCEL} dias.
                            {minCancelDate && (
                              <>
                                {' '}Você poderá cancelar a partir de{' '}
                                <strong className="text-foreground">{minCancelDate.toLocaleDateString('pt-BR')}</strong>
                                {' '}({daysUntilCanCancel} dias restantes).
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm mb-3">
                      {canCancelSubscription ? (
                        <>
                          Ao cancelar sua assinatura do <strong>{currentPlan?.name}</strong>, você manterá acesso até o fim do período atual
                          {renewalDate && (
                            <span className="font-medium">
                              {' '}({renewalDate.toLocaleDateString('pt-BR')})
                            </span>
                          )}
                          . Após essa data:
                        </>
                      ) : (
                        <>
                          Quando o período mínimo for concluído, ao cancelar sua assinatura do <strong>{currentPlan?.name}</strong>, você manterá acesso até o fim do período pago. Após essa data:
                        </>
                      )}
                    </p>
                    <ul className="text-sm text-muted-foreground mb-4 space-y-1 list-disc list-inside">
                      <li>Seu acesso será bloqueado</li>
                      <li>O plano gratuito <strong>não</strong> estará disponível</li>
                      <li>Para acessar novamente, será necessário contratar um plano pago</li>
                    </ul>
                    
                    {canCancelSubscription ? (
                      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setIsCancelDialogOpen(true)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar Assinatura
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-2">
                                <p>Tem certeza que deseja cancelar sua assinatura do plano <strong>{currentPlan?.name}</strong>?</p>
                                <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                                  <p className="font-medium text-destructive">Importante:</p>
                                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                                    <li>
                                      Você terá acesso até{' '}
                                      <strong>{renewalDate.toLocaleDateString('pt-BR')}</strong>
                                    </li>
                                    <li>Após essa data, sua conta será bloqueada</li>
                                    <li>O plano gratuito <strong>não</strong> estará disponível para sua conta</li>
                                    <li>Para voltar a acessar, será necessário contratar um plano pago</li>
                                  </ul>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsCancelDialogOpen(false)}>Manter Assinatura</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancelSubscription}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Confirmar Cancelamento
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="opacity-60">
                        <Lock className="mr-2 h-4 w-4" />
                        Cancelamento indisponível ({daysUntilCanCancel} dias restantes)
                      </Button>
                    )}
                  </div>
                ) : cancelledButActiveSubscription ? (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Sua assinatura já foi cancelada. Para continuar usando o sistema após o término do período, contrate um novo plano.
                    </p>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => navigate('/precos')}
                    >
                      Ver Planos Disponíveis
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {isFreePlan 
                        ? 'Você está usando o plano gratuito. Para mais recursos, faça upgrade para um plano pago.'
                        : 'Você não possui uma assinatura ativa no momento.'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => navigate('/precos')}
                    >
                      Ver Planos
                    </Button>
                  </div>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        )}

        {/* Sub-account info card - Shows only for team members */}
        {isTeamMember && (
          <Card className="mb-8 border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Conta Vinculada
              </CardTitle>
              <CardDescription>
                Você está usando uma subconta do plano Equipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 text-sm">
                <p className="mb-2">
                  <strong>Plano:</strong> {currentPlan?.name || 'Equipe'}
                </p>
                <p className="mb-2">
                  <strong>Limite compartilhado:</strong> {currentPlan?.monthlyCompanyLimit || 3000} empresas/mês
                </p>
                <p className="text-muted-foreground">
                  Você compartilha o limite de empresas com a conta principal e outros membros da equipe. 
                  Apenas o titular do plano pode gerenciar a assinatura e adicionar membros.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

         {/* Team Manager - Only the plan owner (not sub-accounts) */}
         {!isTeamMember && (
           <div className="mb-8">
             <TeamManager />
           </div>
         )}

        {/* Affiliate Dashboard Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Programa de Afiliados
              </CardTitle>
              <CardDescription>
                Indique amigos e ganhe comissões em cada venda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AffiliateDashboard />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/buscar')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Buscar Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Pesquise por CNPJ, razão social, localização e mais</p>
              <Button>
                Começar busca <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/creditos')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Comprar Créditos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Adquira créditos extras ou faça upgrade do seu plano</p>
              <Button variant="outline">
                Ver opções <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recently Viewed */}
        {viewedCompanies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Empresas Visualizadas Este Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2">
                Você pode acessar novamente essas {viewedCompanies.length} empresas sem gastar créditos este mês.
              </p>
              <div className="flex flex-wrap gap-2">
                {viewedCompanies.slice(0, 10).map(cnpj => (
                  <Badge key={cnpj} variant="secondary" className="font-mono text-xs">
                    {cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
                  </Badge>
                ))}
                {viewedCompanies.length > 10 && (
                  <Badge variant="outline">+{viewedCompanies.length - 10} mais</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
