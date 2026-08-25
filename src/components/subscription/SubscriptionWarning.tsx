import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, XCircle, CreditCard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSubscriptionWarning } from '@/hooks/useSubscriptionWarning';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const SubscriptionWarningBanner = () => {
  const navigate = useNavigate();
  const { 
    daysRemaining, 
    expirationDate, 
    isExpiringSoon, 
    isExpired, 
    hasActiveSubscription,
    loading 
  } = useSubscriptionWarning();

  if (loading || !hasActiveSubscription) return null;

  // Show warning banner when 15 days or less remaining
  if (daysRemaining !== null && daysRemaining > 15) return null;

  const formattedDate = expirationDate 
    ? format(expirationDate, "dd 'de' MMMM", { locale: ptBR })
    : '';

  if (isExpired) {
    return (
      <Alert variant="destructive" className="mx-4 my-2 border-destructive/50 bg-destructive/10">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">Assinatura Vencida</AlertTitle>
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span>
            Sua assinatura expirou. Renove agora para continuar acessando o sistema.
          </span>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => navigate('/precos')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Renovar Agora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpiringSoon) {
    return (
      <Alert className="mx-4 my-2 border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="font-semibold text-warning">Atenção: Assinatura Vencendo!</AlertTitle>
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span>
            Sua assinatura vence em <strong>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</strong> ({formattedDate}). 
            Renove para evitar bloqueio do acesso.
          </span>
          <Button 
            size="sm"
            className="bg-warning text-warning-foreground hover:bg-warning/90"
            onClick={() => navigate('/precos')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Renovar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show subtle reminder for 6-15 days
  if (daysRemaining !== null && daysRemaining <= 15) {
    return (
      <Alert className="mx-4 my-2 border-muted bg-muted/50">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <AlertTitle className="text-muted-foreground">Lembrete de Renovação</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Sua assinatura vence em <strong>{daysRemaining} dias</strong> ({formattedDate}).
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export const SubscriptionWarningPopup = () => {
  const navigate = useNavigate();
  const { 
    daysRemaining, 
    expirationDate, 
    showWarningPopup, 
    dismissPopup,
    loading 
  } = useSubscriptionWarning();

  if (loading || !showWarningPopup) return null;

  const formattedDate = expirationDate 
    ? format(expirationDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <Dialog open={showWarningPopup} onOpenChange={(open) => !open && dismissPopup()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-warning/20 p-3">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-xl">Atenção: Assinatura Vencendo!</DialogTitle>
              <DialogDescription className="mt-1">
                Sua assinatura está próxima do vencimento
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-warning">{daysRemaining}</p>
              <p className="text-sm text-muted-foreground">
                {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Data de vencimento:</strong> {formattedDate}
            </p>
            <p className="text-muted-foreground">
              Após o vencimento, seu acesso ao sistema será <strong className="text-destructive">bloqueado</strong> até 
              que o pagamento seja regularizado.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">O que acontece após o vencimento?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Acesso ao sistema será suspenso</li>
              <li>Dados permanecem salvos por 30 dias</li>
              <li>Após 30 dias, dados podem ser excluídos</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={dismissPopup} className="w-full sm:w-auto">
            Lembrar Depois
          </Button>
          <Button 
            className="w-full sm:w-auto bg-warning text-warning-foreground hover:bg-warning/90"
            onClick={() => {
              dismissPopup();
              navigate('/precos');
            }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Renovar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
