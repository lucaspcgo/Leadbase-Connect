import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCnpj } from '@/lib/empresaParser';
import { Eye, Edit, Mail, Phone, MapPin, Tag } from 'lucide-react';
import { Empresa } from '@/types';

interface EmpresasCardsViewProps {
  empresas: Partial<Empresa>[];
  onView: (cnpj: string) => void;
  onEdit: (cnpj: string) => void;
  getCategoriaById: (id: string) => { nome: string; cor?: string } | undefined;
}

const EmpresasCardsView = ({ empresas, onView, onEdit, getCategoriaById }: EmpresasCardsViewProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {empresas.map((emp) => {
        const hasEmail = !!(emp.email || emp.correio_eletronico);
        const hasPhone = !!(emp.ddd_telefone_1 || emp.ddd_telefone_2);
        const cat = emp.categoria_id ? getCategoriaById(emp.categoria_id) : null;

        return (
          <Card key={emp.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate" title={emp.nome_fantasia || emp.razao_social || ''}>
                    {emp.nome_fantasia || emp.razao_social || 'Sem nome'}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatCnpj(emp.cnpj || '')}
                  </p>
                </div>
                <Badge 
                  variant={emp.sit_cadastral === 'ATIVA' ? 'default' : 'destructive'}
                  className="text-[10px] shrink-0"
                >
                  {emp.sit_cadastral || '-'}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{emp.municipio}/{emp.uf}</span>
                </div>
                
                {cat && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <Badge 
                      className="text-[10px] px-1 py-0"
                      style={{ backgroundColor: cat.cor || undefined }}
                    >
                      {cat.nome}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {hasEmail && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      <Mail className="h-2.5 w-2.5 mr-0.5 text-primary" />
                      Email
                    </Badge>
                  )}
                  {hasPhone && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      <Phone className="h-2.5 w-2.5 mr-0.5 text-success" />
                      Tel
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onView(emp.cnpj || '')}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(emp.cnpj || '')}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EmpresasCardsView;
