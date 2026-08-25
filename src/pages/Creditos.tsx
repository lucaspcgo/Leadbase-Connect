import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { creditPackages } from '@/data/mockData';
import { useActivePlans } from '@/hooks/usePlans';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { Check, Coins, Zap, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Creditos = () => {
  const { isAuthenticated, user, isTeamMember } = useAuth();
  const { getAccessStats } = useCredits();
  const { plans, loading: plansLoading } = useActivePlans();
  const { toast } = useToast();
  const navigate = useNavigate();

  const stats = isAuthenticated ? getAccessStats() : null;

  // Find the popular plan index
  const popularIndex = plans.findIndex(p => (p as any).is_popular);
  const highlightIndex = popularIndex >= 0 ? popularIndex : 2; // Default to third plan if none is marked

  const handleBuyCredits = (packageId: string, credits: number, price: number) => {
    if (!isAuthenticated) {
      toast({ title: 'Faça login', description: 'Você precisa estar logado para comprar créditos.', variant: 'destructive' });
      return;
    }
    if (isTeamMember) {
      toast({ 
        title: 'Ação não permitida', 
        description: 'Subcontas não podem comprar créditos. Entre em contato com o titular da conta.', 
        variant: 'destructive' 
      });
      return;
    }
    navigate('/checkout', { state: { type: 'credits', packageId, credits, price } });
  };

  const handleSubscribePlan = (planId: string) => {
    if (!isAuthenticated) {
      toast({ title: 'Faça login', description: 'Você precisa estar logado para assinar um plano.', variant: 'destructive' });
      return;
    }
    if (isTeamMember) {
      toast({ 
        title: 'Ação não permitida', 
        description: 'Subcontas não podem alterar o plano. Entre em contato com o titular da conta.', 
        variant: 'destructive' 
      });
      return;
    }
    if (planId === 'free') {
      toast({ title: 'Plano atual', description: 'Você já está no plano gratuito.' });
      return;
    }
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      // Navigate via URL params so checkout can fetch correct price from database
      navigate(`/checkout?plan=${planId}&cycle=MONTHLY`);
    }
  };

  return (
    <MainLayout>
      <div className="container py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4">Créditos e Planos</Badge>
          <h1 className="text-4xl font-bold mb-4">Escolha a melhor opção para você</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Assine um plano ou compre créditos extras para acessar mais empresas</p>
          {isAuthenticated && stats && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Building2 className="h-4 w-4 mr-2" />
                {stats.companiesViewedThisMonth} / {stats.monthlyLimit} este mês
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Coins className="h-4 w-4 mr-2" />
                {stats.extraCredits} créditos extras
              </Badge>
            </div>
          )}
        </div>

        {/* Warning for team members (sub-accounts) */}
        {isAuthenticated && isTeamMember && (
          <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 max-w-2xl mx-auto">
            <p className="text-amber-600 dark:text-amber-400 text-sm text-center">
              <strong>Atenção:</strong> Você está usando uma subconta. Apenas o titular do plano pode comprar créditos ou alterar a assinatura.
            </p>
          </div>
        )}

        {/* Credit Packages */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Coins className="h-6 w-6" /> Créditos Extras</h2>
          <p className="text-muted-foreground mb-6">1 crédito = 1 empresa adicional após atingir seu limite mensal. Créditos não expiram!</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {creditPackages.map(pkg => (
              <Card key={pkg.id} className={pkg.popular ? 'border-primary shadow-lg' : ''}>
                {pkg.popular && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Popular</Badge>}
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold">{pkg.credits}</p>
                  <p className="text-muted-foreground mb-4">empresas</p>
                  <p className="text-2xl font-bold text-primary mb-4">R$ {pkg.price}</p>
                  <Button className="w-full" variant={pkg.popular ? 'default' : 'outline'} onClick={() => handleBuyCredits(pkg.id, pkg.credits, pkg.price)}>
                    Comprar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Zap className="h-6 w-6" /> Planos Mensais</h2>
          <p className="text-muted-foreground mb-6">Acesso a empresas incluídas no plano sem gastar créditos extras</p>
          {plansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-24 mb-4" />
                    <div className="space-y-2 mb-6">
                      {[1, 2, 3].map(j => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {plans.map((plan, i) => (
                <Card key={plan.id} className={i === highlightIndex ? 'border-primary shadow-lg scale-105' : ''}>
                  {i === highlightIndex && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Mais Popular</Badge>}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold mb-1">R$ {plan.priceMonthly}<span className="text-lg font-normal text-muted-foreground">/mês</span></p>
                    <p className="text-sm text-muted-foreground mb-6">{plan.monthlyCompanyLimit} empresas/mês</p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={i === highlightIndex ? 'default' : 'outline'}
                      onClick={() => handleSubscribePlan(plan.id)}
                      disabled={plan.id === 'free'}
                    >
                      {plan.id === 'free' ? 'Plano Gratuito' : `Assinar ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Creditos;
