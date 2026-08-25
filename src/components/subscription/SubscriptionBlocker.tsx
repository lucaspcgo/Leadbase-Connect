import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptionWarning } from '@/hooks/useSubscriptionWarning';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionBlockerProps {
  children: ReactNode;
  /** If true, shows a full-page blocker. If false, shows inline blocker */
  fullPage?: boolean;
}

/**
 * Component that blocks access when subscription is expired.
 * Wraps protected content and shows a renewal message when subscription has expired.
 */
export const SubscriptionBlocker = ({ children, fullPage = true }: SubscriptionBlockerProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isMasterAdmin, isTeamMember } = useAuth();
  const { isExpired, hasActiveSubscription, loading, daysRemaining } = useSubscriptionWarning();

  // Don't block if not authenticated - let auth guards handle that
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // Admins and Master Admins are never blocked by subscription expiration
  if (isAdmin || isMasterAdmin) {
    return <>{children}</>;
  }

  // Team members (sub-accounts) are never blocked - they use the owner's plan
  // The plan is already inherited from the owner in AuthContext
  if (isTeamMember) {
    return <>{children}</>;
  }

  // Don't block while loading
  if (loading) {
    return <>{children}</>;
  }

  // Free plan users don't need an active subscription to access basic features
  // Only block users who HAD a paid subscription that is now expired
  if (!hasActiveSubscription && user.plan?.id === 'free') {
    return <>{children}</>;
  }

  // If subscription is expired, show blocker
  if (isExpired) {
    if (fullPage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <div className="bg-card rounded-lg shadow-lg border border-destructive/30 overflow-hidden">
              {/* Header */}
              <div className="bg-destructive/10 p-6 text-center border-b border-destructive/20">
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                  <Lock className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-destructive">Acesso Bloqueado</h1>
                <p className="text-muted-foreground mt-2">Sua assinatura expirou</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">O que isso significa?</p>
                    <p className="text-muted-foreground mt-1">
                      Sua assinatura do plano <strong>{user.plan?.name}</strong> expirou e você não tem mais acesso às funcionalidades premium.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Para continuar usando o sistema:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Renove sua assinatura do plano atual</li>
                    <li>Ou escolha um novo plano que atenda suas necessidades</li>
                  </ul>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Seus dados estão seguros!</strong> Eles serão mantidos por 30 dias. 
                    Após esse período, poderão ser excluídos permanentemente.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex flex-col gap-3">
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={() => navigate('/precos')}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Renovar Assinatura
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Inline blocker (for partial page blocking)
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-destructive/5 rounded-lg border border-destructive/20">
        <Lock className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Acesso Bloqueado</h2>
        <p className="text-muted-foreground text-center mb-4">
          Sua assinatura expirou. Renove para continuar acessando esta funcionalidade.
        </p>
        <Button onClick={() => navigate('/precos')}>
          <CreditCard className="h-4 w-4 mr-2" />
          Renovar Agora
        </Button>
      </div>
    );
  }

  // Subscription is valid, show children
  return <>{children}</>;
};

/**
 * HOC to wrap entire pages that require active subscription
 */
export const withSubscriptionCheck = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function WithSubscriptionCheckWrapper(props: P) {
    return (
      <SubscriptionBlocker fullPage>
        <WrappedComponent {...props} />
      </SubscriptionBlocker>
    );
  };
};
