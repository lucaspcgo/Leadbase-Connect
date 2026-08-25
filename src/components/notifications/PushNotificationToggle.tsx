import { Bell, BellOff, Loader2, Send, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

const AUTO_PUSH_PROMPTED_KEY = 'pwa-push-auto-prompted';

interface PushNotificationToggleProps {
  variant?: 'full' | 'compact';
}

// Check if device is iOS
function getIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

// Check iOS version (needs 16.4+ for push)
function getIOSVersion(): number | null {
  if (typeof navigator === 'undefined') return null;
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}

export function PushNotificationToggle({ variant = 'full' }: PushNotificationToggleProps) {
  const { user } = useAuth();
  const { isStandalone } = usePWA();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  const isIOS = getIsIOS();
  const iosVersion = getIOSVersion();
  const iosSupportsWebPush = iosVersion !== null && iosVersion >= 16;

  // iOS-specific: push only works in standalone mode on iOS 16.4+
  const iosNeedsStandalone = isIOS && !isStandalone;
  const iosVersionTooOld = isIOS && !iosSupportsWebPush;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleSendTestNotification = async () => {
    if (!user) return;
    
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: '🔔 Teste de Notificação',
          body: 'Suas notificações push estão funcionando corretamente!',
          url: '/configuracoes'
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Notificação de teste enviada!');
      } else {
        toast.error(data?.message || 'Erro ao enviar notificação');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleResetPushPrompt = () => {
    localStorage.removeItem(AUTO_PUSH_PROMPTED_KEY);
    toast.success('Solicitação de notificações resetada!', {
      description: 'Na próxima vez que abrir o app instalado, você será solicitado novamente.'
    });
  };

  const hasBeenPrompted = localStorage.getItem(AUTO_PUSH_PROMPTED_KEY) === 'true';

  // iOS version too old - show warning
  if (isIOS && iosVersionTooOld) {
    if (variant === 'compact') return null;
    
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>iOS 16.4+ necessário:</strong> Seu dispositivo está com uma versão do iOS que não suporta notificações push em aplicativos web. Atualize para iOS 16.4 ou superior.
        </AlertDescription>
      </Alert>
    );
  }

  // iOS not in standalone mode - show instructions
  if (iosNeedsStandalone) {
    if (variant === 'compact') return null;
    
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Adicione à Tela Inicial:</strong> No iOS, notificações push só funcionam quando o app está instalado na Tela Inicial. Toque no ícone de compartilhar (📤) no Safari e selecione "Adicionar à Tela Inicial".
        </AlertDescription>
      </Alert>
    );
  }

  if (!isSupported) {
    if (variant === 'compact') return null;
    
    return (
      <Alert>
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          Seu navegador não suporta notificações push.
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <Switch
          id="push-notifications"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading || permission === 'denied'}
        />
        <Label htmlFor="push-notifications" className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          Notificações Push
        </Label>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas quando novas empresas corresponderem aos seus filtros salvos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === 'denied' && (
          <Alert variant="destructive">
            <BellOff className="h-4 w-4" />
            <AlertDescription>
              As notificações foram bloqueadas no navegador. 
              Acesse as configurações do navegador para permitir notificações.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-base">
              {isSubscribed ? 'Notificações ativadas' : 'Ativar notificações'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? 'Você receberá alertas sobre novas empresas' 
                : 'Ative para receber alertas em tempo real'}
            </p>
          </div>
          
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Switch
              id="push-toggle"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={permission === 'denied'}
            />
          )}
        </div>

        {!isSubscribed && permission !== 'denied' && (
          <Button 
            onClick={subscribe} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Ativar Notificações
          </Button>
        )}

        {isSubscribed && (
          <Button 
            onClick={handleSendTestNotification} 
            disabled={isSendingTest}
            variant="outline"
            className="w-full"
          >
            {isSendingTest ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar Notificação de Teste
          </Button>
        )}

        {/* Reset prompt option - only show if user has been prompted and is using PWA or was prompted before */}
        {hasBeenPrompted && !isSubscribed && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Solicitação automática</p>
                <p className="text-xs text-muted-foreground">
                  Você já foi solicitado para ativar notificações
                </p>
              </div>
              <Button 
                onClick={handleResetPushPrompt}
                variant="ghost"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
