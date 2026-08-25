import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCnpj } from '@/lib/empresaParser';
import { Eye, Edit, Mail, Phone } from 'lucide-react';
import { Empresa } from '@/types';

interface EmpresasCompactViewProps {
  empresas: Partial<Empresa>[];
  onView: (cnpj: string) => void;
  onEdit: (cnpj: string) => void;
  getCategoriaById: (id: string) => { nome: string; cor?: string } | undefined;
}

const EmpresasCompactView = ({ empresas, onView, onEdit, getCategoriaById }: EmpresasCompactViewProps) => {
  return (
    <div className="space-y-1">
      {empresas.map((emp) => {
        const hasEmail = !!(emp.email || emp.correio_eletronico);
        const hasPhone = !!(emp.ddd_telefone_1 || emp.ddd_telefone_2);
        const cat = emp.categoria_id ? getCategoriaById(emp.categoria_id) : null;

        return (
          <div 
            key={emp.id} 
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
          >
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {emp.nome_fantasia || emp.razao_social || 'Sem nome'}
                  </span>
                  <Badge 
                    variant={emp.sit_cadastral === 'ATIVA' ? 'default' : 'destructive'}
                    className="text-[10px] px-1 py-0"
                  >
                    {emp.sit_cadastral || '-'}
                  </Badge>
                  {cat && (
                    <Badge 
                      className="text-[10px] px-1 py-0"
                      style={{ backgroundColor: cat.cor || undefined }}
                    >
                      {cat.nome}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{formatCnpj(emp.cnpj || '')}</span>
                  <span>•</span>
                  <span>{emp.municipio}/{emp.uf}</span>
                  {hasEmail && <Mail className="h-3 w-3 text-primary" />}
                  {hasPhone && <Phone className="h-3 w-3 text-success" />}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onView(emp.cnpj || '')}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(emp.cnpj || '')}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmpresasCompactView;
