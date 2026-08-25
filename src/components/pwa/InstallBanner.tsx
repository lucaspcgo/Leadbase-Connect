import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useNavigate } from 'react-router-dom';
import { useGA4Events } from '@/hooks/useGA4Events';

export function InstallBanner() {
  const { isInstalled, isMobile, isStandalone, installApp, canPromptInstall } = usePWA();
  const { trackPWAInstallClick, trackPWAInstallSuccess, trackPWAInstallDismiss } = useGA4Events();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show on mobile, not installed, and not dismissed
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (wasDismissed) {
      const dismissedDate = new Date(wasDismissed);
      const now = new Date();
      const hoursSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);
      
      // Show again after 24 hours
      if (hoursSinceDismissed < 24) {
        setDismissed(true);
        return;
      }
    }

    // Show banner on mobile after a short delay
    const timer = setTimeout(() => {
      if (isMobile && !isInstalled && !isStandalone) {
        setShowBanner(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isMobile, isInstalled, isStandalone]);

  const handleInstall = async () => {
    trackPWAInstallClick('banner');
    if (canPromptInstall) {
      const success = await installApp();
      if (success) {
        trackPWAInstallSuccess('banner');
        setShowBanner(false);
      }
    } else {
      // Navigate to install page for instructions
      navigate('/instalar');
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    trackPWAInstallDismiss('banner');
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', new Date().toISOString());
  };

  if (!showBanner || dismissed || isInstalled || isStandalone || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Smartphone className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                Instale o Lead Base
              </p>
              <p className="text-xs opacity-90 truncate">
                Acesse mais rápido da sua tela inicial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-8 px-3 text-xs"
              onClick={handleInstall}
            >
              <Download className="h-3 w-3 mr-1" />
              Instalar
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
