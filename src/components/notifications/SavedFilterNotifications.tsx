import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface SavedFilterNotificationsProps {
  filterId: string;
  filterName: string;
  notifyEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
}

export function SavedFilterNotifications({ 
  filterId, 
  filterName, 
  notifyEnabled,
  onToggle 
}: SavedFilterNotificationsProps) {
  const { isSubscribed, subscribe } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [enabled, setEnabled] = useState(notifyEnabled);

  const handleToggle = async () => {
    // If trying to enable but not subscribed to push, prompt to subscribe first
    if (!enabled && !isSubscribed) {
      const subscribed = await subscribe();
      if (!subscribed) return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('saved_filters')
        .update({ notify_new_matches: !enabled })
        .eq('id', filterId);

      if (error) throw error;

      setEnabled(!enabled);
      onToggle?.(!enabled);
      
      toast.success(
        !enabled 
          ? `Notificações ativadas para "${filterName}"` 
          : `Notificações desativadas para "${filterName}"`
      );
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-8 w-8 p-0"
      title={enabled ? 'Desativar notificações' : 'Ativar notificações'}
    >
      {enabled ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
