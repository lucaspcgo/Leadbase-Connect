import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useActivePlans } from '@/hooks/usePlans';
import { useAuth } from '@/contexts/AuthContext';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Precos = () => {
  const navigate = useNavigate();
  const { plans, loading } = useActivePlans();
  const { isAuthenticated } = useAuth();

  // Find the popular plan index
  const popularIndex = plans.findIndex(p => (p as any).is_popular);
  const highlightIndex = popularIndex >= 0 ? popularIndex : 1; // Default to second plan if none is marked

  const handleSelectPlan = (planId: string) => {
    if (isAuthenticated) {
      // User is logged in, go directly to checkout with plan
      navigate(`/checkout?plan=${planId}&cycle=MONTHLY`);
    } else {
      // User not logged in, go to registration
      navigate('/cadastro');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-20">
          <div className="text-center mb-12">
            <Skeleton className="h-6 w-20 mx-auto mb-4" />
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader className="text-center pb-2">
                  <Skeleton className="h-8 w-24 mx-auto mb-2" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </CardHeader>
                <CardContent className="pt-4">
                  <Skeleton className="h-12 w-32 mx-auto mb-4" />
                  <div className="space-y-3 mb-8">
                    {[1, 2, 3, 4].map(j => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-20">
        <div className="text-center mb-12">
          <Badge className="mb-4">Preços</Badge>
          <h1 className="text-4xl font-bold mb-4">Planos para todos os tamanhos</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Escolha o plano ideal para sua empresa e comece a prospectar hoje mesmo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.slice(0, 4).map((plan, i) => (
            <Card key={plan.id} className={`relative ${i === highlightIndex ? 'border-primary shadow-xl scale-105 z-10' : ''}`}>
              {i === highlightIndex && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <p className="text-5xl font-bold">
                    R$ {plan.priceMonthly}
                    <span className="text-lg font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ou R$ {plan.priceYearly}/ano (economia de 2 meses)
                  </p>
                  <Badge variant="secondary" className="mt-3">
                    {plan.monthlyCompanyLimit} empresas/mês
                  </Badge>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm">
                      <Check className="h-5 w-5 text-success flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  size="lg"
                  variant={i === highlightIndex ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isAuthenticated ? `Assinar ${plan.name}` : `Começar com ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Precos;
