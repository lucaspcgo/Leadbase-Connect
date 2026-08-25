import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Unlock, MapPin, Building2, Activity } from 'lucide-react';
import { Empresa } from '@/types';

interface EmpresaMobileCardProps {
  empresa: Partial<Empresa>;
  isUnlocked: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
}

export const EmpresaMobileCard = ({
  empresa,
  isUnlocked,
  isSelected,
  onToggleSelect,
  onView,
}: EmpresaMobileCardProps) => {
  return (
    <Card className={`${isUnlocked ? 'bg-success/5 border-success/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {empresa.uf || '-'}
                </Badge>
                <Badge 
                  variant={empresa.sit_cadastral === 'ATIVA' ? 'default' : 'secondary'}
                  className={`text-xs ${empresa.sit_cadastral === 'ATIVA' ? 'bg-success' : ''}`}
                >
                  {empresa.sit_cadastral || '-'}
                </Badge>
                {isUnlocked && (
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    Desbloqueada
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{empresa.municipio || 'Não informado'}</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs">
                  {empresa.cnae_fiscal || empresa.cnae_codigo || 'CNAE não informado'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{empresa.porte_empresa || 'Porte não informado'}</span>
              </div>
            </div>
            
            <div className="mt-3">
              <Button 
                size="sm" 
                variant={isUnlocked ? 'outline' : 'default'}
                onClick={onView}
                className="w-full gap-1.5"
              >
                {isUnlocked ? (
                  <>
                    <Eye className="h-4 w-4" /> Ver Detalhes
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" /> Desbloquear
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
