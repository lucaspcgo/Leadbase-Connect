import { useState } from 'react';
import { WifiOff, Search, Building2, MapPin, Phone, Mail, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOfflineEmpresas } from '@/hooks/useOfflineEmpresas';
import { formatCNPJ } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function OfflineEmpresasList() {
  const { offlineEmpresas, removeCachedEmpresa, clearCache, isOnline, cachedCount } = useOfflineEmpresas();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmpresas = offlineEmpresas.filter(empresa => {
    const term = searchTerm.toLowerCase();
    return (
      empresa.razao_social?.toLowerCase().includes(term) ||
      empresa.nome_fantasia?.toLowerCase().includes(term) ||
      empresa.cnpj?.includes(term) ||
      empresa.municipio?.toLowerCase().includes(term) ||
      empresa.uf?.toLowerCase().includes(term)
    );
  });

  if (cachedCount === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <WifiOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma empresa salva offline</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Quando você desbloqueia uma empresa, ela é automaticamente salva para 
            visualização offline. Sincronize suas empresas desbloqueadas para acessá-las 
            sem conexão.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nas empresas salvas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Cache
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todas as empresas salvas?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá todas as {cachedCount} empresas do cache offline.
                Você precisará sincronizar novamente para acessá-las sem conexão.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={clearCache} className="bg-destructive text-destructive-foreground">
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {!isOnline && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning">
            Você está offline. Visualizando dados do cache local.
          </span>
        </div>
      )}

      <div className="grid gap-4">
        {filteredEmpresas.map((empresa) => (
          <Card key={empresa.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {empresa.nome_fantasia || empresa.razao_social || 'Empresa sem nome'}
                  </CardTitle>
                  {empresa.razao_social && empresa.nome_fantasia && (
                    <CardDescription className="text-xs mt-1">
                      {empresa.razao_social}
                    </CardDescription>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCachedEmpresa(empresa.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline" className="font-mono">
                  {formatCNPJ(empresa.cnpj || '')}
                </Badge>
                {empresa.sit_cadastral && (
                  <Badge 
                    variant={empresa.sit_cadastral === 'ATIVA' ? 'default' : 'secondary'}
                    className={empresa.sit_cadastral === 'ATIVA' ? 'bg-success/10 text-success' : ''}
                  >
                    {empresa.sit_cadastral}
                  </Badge>
                )}
              </div>

              <div className="grid gap-1.5 text-sm text-muted-foreground">
                {(empresa.municipio || empresa.uf) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{[empresa.municipio, empresa.uf].filter(Boolean).join(' - ')}</span>
                  </div>
                )}
                
                {(empresa.ddd_telefone_1 || empresa.ddd_telefone_2) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{empresa.ddd_telefone_1 || empresa.ddd_telefone_2}</span>
                  </div>
                )}
                
                {(empresa.email || empresa.correio_eletronico) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{empresa.email || empresa.correio_eletronico}</span>
                  </div>
                )}
              </div>

              {empresa.cnae_fiscal && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  CNAE: {empresa.cnae_codigo} - {empresa.cnae_fiscal}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmpresas.length === 0 && searchTerm && (
        <Card>
          <CardContent className="py-8 text-center">
            <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Nenhuma empresa encontrada para "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
