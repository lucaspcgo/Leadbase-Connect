import { Button } from '@/components/ui/button';
import { Building2, Search, AlertCircle } from 'lucide-react';

interface EmpresasEmptyStateProps {
  hasFilters: boolean;
  error: string | null;
  onClearFilters: () => void;
}

const EmpresasEmptyState = ({ hasFilters, error, onClearFilters }: EmpresasEmptyStateProps) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Erro ao carregar empresas</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {error}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma empresa encontrada</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tente ajustar os filtros para encontrar resultados
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Nenhuma empresa na base</h3>
      <p className="text-sm text-muted-foreground">
        Importe empresas para começar a gerenciar sua base de dados
      </p>
    </div>
  );
};

export default EmpresasEmptyState;
