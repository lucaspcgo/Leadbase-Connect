import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Share, Plus, Smartphone, Chrome } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useGA4Events } from '@/hooks/useGA4Events';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, isStandalone, installApp, canPromptInstall } = usePWA();
  const { trackPWAInstallPrompt, trackPWAInstallClick, trackPWAInstallSuccess, trackPWAInstallDismiss } = useGA4Events();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedDate = new Date(wasDismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 3 days for mobile, 7 days for desktop
      const daysToWait = isMobile ? 3 : 7;
      if (daysSinceDismissed < daysToWait) {
        setDismissed(true);
        return;
      }
    }

    // Show prompt faster on mobile (1.5s) vs desktop (3s)
    const delay = isMobile ? 1500 : 3000;
    
    const timer = setTimeout(() => {
      // Show if installable (Android with prompt, or any device without prompt but mobile)
      // Or if iOS (needs manual instructions)
      // And not already installed
      const shouldShow = (isInstallable || isIOS || (isMobile && !isStandalone)) && 
                         !isInstalled && 
                         !isStandalone;
      
      if (shouldShow) {
        setShowPrompt(true);
        // Track prompt shown
        const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
        trackPWAInstallPrompt(platform);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS, isAndroid, isMobile, isStandalone, trackPWAInstallPrompt]);

  const handleInstall = async () => {
    trackPWAInstallClick('prompt');
    const success = await installApp();
    if (success) {
      trackPWAInstallSuccess('prompt');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    trackPWAInstallDismiss('prompt');
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt || dismissed || isInstalled || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-slide-up">
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Instalar Lead Base</CardTitle>
                <CardDescription className="text-xs">
                  Acesse mais rápido direto da sua tela inicial
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para instalar no iOS:
              </p>
              <ol className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium">1</span>
                  <span className="flex items-center gap-1">
                    Toque em <Share className="h-4 w-4 inline" /> Compartilhar
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium">2</span>
                  <span className="flex items-center gap-1">
                    Selecione <Plus className="h-4 w-4 inline" /> Adicionar à Tela de Início
                  </span>
                </li>
              </ol>
              <Button variant="outline" className="w-full" onClick={handleDismiss}>
                Entendi
              </Button>
            </div>
          ) : canPromptInstall ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para instalar o app no seu dispositivo.
              </p>
              <Button size="lg" className="w-full" onClick={handleInstall}>
                <Download className="mr-2 h-5 w-5" />
                Instalar Lead Base
              </Button>
            </div>
          ) : isAndroid ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para instalar no Android:
              </p>
              <ol className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium shrink-0">1</span>
                  <span>
                    Toque no menu <Chrome className="h-4 w-4 inline" /> (⋮) do navegador
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium shrink-0">2</span>
                  <span>
                    Selecione "Instalar app" ou "Adicionar à tela inicial"
                  </span>
                </li>
              </ol>
              <Button variant="outline" className="w-full" onClick={handleDismiss}>
                Entendi
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para instalar, use o menu do seu navegador:
              </p>
              <ol className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium shrink-0">1</span>
                  <span>
                    Clique nos três pontos (⋮) no canto superior direito
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs font-medium shrink-0">2</span>
                  <span>
                    Selecione "Instalar app" ou "Adicionar à tela inicial"
                  </span>
                </li>
              </ol>
              <Button variant="outline" className="w-full" onClick={handleDismiss}>
                Entendi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
