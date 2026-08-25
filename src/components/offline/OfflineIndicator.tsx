import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineEmpresas } from '@/hooks/useOfflineEmpresas';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  showSyncButton?: boolean;
  className?: string;
}

export function OfflineIndicator({ showSyncButton = true, className }: OfflineIndicatorProps) {
  const { isOnline, isLoading, syncUnlockedEmpresas, cachedCount, lastSyncAt } = useOfflineEmpresas();

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Nunca sincronizado';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Online/Offline status */}
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          "flex items-center gap-1",
          isOnline 
            ? "bg-success/10 text-success hover:bg-success/20" 
            : "bg-destructive/10 text-destructive hover:bg-destructive/20"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
      </Badge>

      {/* Cached count */}
      {cachedCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {cachedCount} {cachedCount === 1 ? 'empresa salva' : 'empresas salvas'}
        </Badge>
      )}

      {/* Last sync */}
      {lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          Sincronizado: {formatLastSync()}
        </span>
      )}

      {/* Sync button */}
      {showSyncButton && isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={syncUnlockedEmpresas}
          disabled={isLoading}
          className="h-7 px-2"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
