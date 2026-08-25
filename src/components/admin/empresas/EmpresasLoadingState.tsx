import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { ViewMode } from './EmpresasViewTabs';

interface EmpresasLoadingStateProps {
  viewMode: ViewMode;
}

const EmpresasLoadingState = ({ viewMode }: EmpresasLoadingStateProps) => {
  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div className="space-y-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-2 border-b">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
    );
  }

  // Table view loading
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando empresas...</p>
    </div>
  );
};

export default EmpresasLoadingState;
