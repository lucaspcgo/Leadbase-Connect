import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  History, 
  FileSpreadsheet, 
  ClipboardPaste, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  User
} from 'lucide-react';
import { useImportLogs, ImportLog } from '@/hooks/useImportLogs';

const ImportHistory = () => {
  const { logs, loading, error, fetchLogs } = useImportLogs();
  const [isOpen, setIsOpen] = useState(true);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceIcon = (source: string) => {
    return source === 'file' ? (
      <FileSpreadsheet className="h-4 w-4 text-primary" />
    ) : (
      <ClipboardPaste className="h-4 w-4 text-secondary-foreground" />
    );
  };

  const getSourceLabel = (source: string) => {
    return source === 'file' ? 'Arquivo' : 'Colado';
  };

  const getStatusBadge = (log: ImportLog) => {
    if (log.errors_count > 0) {
      return <Badge variant="destructive">Com erros</Badge>;
    }
    if (log.inserted > 0 || log.updated > 0) {
      return <Badge className="bg-success/10 text-success">Sucesso</Badge>;
    }
    return <Badge variant="secondary">Nada importado</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Erro ao carregar histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={fetchLogs} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Importações
              </CardTitle>
              <CardDescription>
                Últimas {logs.length} importações realizadas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma importação realizada ainda</p>
                <p className="text-sm">Importe empresas para ver o histórico aqui</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Inseridas</TableHead>
                      <TableHead className="text-center">Atualizadas</TableHead>
                      <TableHead className="text-center">Ignoradas</TableHead>
                      <TableHead>UFs</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSourceIcon(log.source)}
                            <span className="text-sm">{getSourceLabel(log.source)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={log.filename || '-'}>
                          {log.filename || '-'}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {log.total_rows.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-success font-medium">
                            {log.inserted.toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-primary font-medium">
                            {log.updated.toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground">
                            {log.skipped.toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.ufs_imported && log.ufs_imported.length > 0 ? (
                            <div className="flex flex-wrap gap-1 min-w-[120px] max-w-[300px]">
                              {log.ufs_imported.map((uf, index) => (
                                <Badge key={`${uf}-${index}`} variant="outline" className="text-xs px-2 py-0.5">
                                  {uf}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.duplicate_mode === 'update' ? 'default' : 'secondary'}>
                            {log.duplicate_mode === 'update' ? 'Atualizar' : 'Pular'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="max-w-[100px] truncate" title={log.admin_name}>
                              {log.admin_name}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default ImportHistory;
