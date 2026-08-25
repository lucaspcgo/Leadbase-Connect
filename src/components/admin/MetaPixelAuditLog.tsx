import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { History, RefreshCw, ArrowRight } from 'lucide-react';
import { FIELD_LABELS, MetaPixelAuditLog as AuditLog } from '@/hooks/useMetaPixelConfig';

interface MetaPixelAuditLogProps {
  logs: AuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const MetaPixelAuditLog = ({ logs, loading, onRefresh }: MetaPixelAuditLogProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
          <CardDescription>
            Registro de ativações, desativações e mudanças no ID e nos eventos do Pixel
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma alteração registrada até o momento.
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {FIELD_LABELS[log.campo_alterado] || log.campo_alterado}
                    </Badge>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground line-through">
                        {log.valor_anterior || '—'}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{log.valor_novo || '—'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">por {log.admin_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetaPixelAuditLog;
