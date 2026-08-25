import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetaPixelConfig, useMetaPixelAuditLogs } from '@/hooks/useMetaPixelConfig';
import MetaPixelAuditLog from '@/components/admin/MetaPixelAuditLog';

import {
  Facebook,
  Settings2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Eye,
  MousePointerClick,
  UserPlus,
  CreditCard,
  Target,
} from 'lucide-react';

const AdminMetaPixelConfig = () => {
  const { config, loading, saving, saveConfig, validatePixelId } = useMetaPixelConfig();
  const { logs, loading: logsLoading, refetch: refetchLogs } = useMetaPixelAuditLogs();


  const [pixelId, setPixelId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [trackPageviews, setTrackPageviews] = useState(true);
  const [trackLead, setTrackLead] = useState(true);
  const [trackRegistration, setTrackRegistration] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setPixelId(config.pixel_id || '');
      setEnabled(config.enabled);
      setTrackPageviews(config.track_pageviews);
      setTrackLead(config.track_lead);
      setTrackRegistration(config.track_complete_registration);
      setTrackPurchase(config.track_purchase);
    }
  }, [config, loading]);

  const handlePixelIdChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    setPixelId(clean);

    if (!clean) {
      setValidationError(null);
      setEnabled(false);
      return;
    }
    if (clean.length < 15) {
      setValidationError('O ID do Pixel deve conter 15 ou 16 dígitos numéricos.');
      setEnabled(false);
      return;
    }
    if (!validatePixelId(clean)) {
      setValidationError('O ID do Pixel deve conter 15 ou 16 dígitos numéricos.');
      setEnabled(false);
      return;
    }
    setValidationError(null);
  };

  const handleSave = async () => {
    if (pixelId && !validatePixelId(pixelId)) {
      setValidationError('O ID do Pixel deve conter 15 ou 16 dígitos numéricos.');
      return;
    }

    if (enabled && !validatePixelId(pixelId)) {
      setValidationError('Informe um ID de Pixel válido antes de ativar o rastreamento.');
      return;
    }

    await saveConfig({
      pixel_id: pixelId || null,
      enabled,
      track_pageviews: trackPageviews,
      track_lead: trackLead,
      track_complete_registration: trackRegistration,
      track_purchase: trackPurchase,
    });

    refetchLogs();
  };



  const getStatus = () => {
    if (!config.pixel_id) {
      return { label: 'Não configurado', variant: 'secondary' as const, icon: AlertTriangle };
    }
    if (!config.enabled) {
      return { label: 'Desativado', variant: 'outline' as const, icon: XCircle };
    }
    if (!validatePixelId(config.pixel_id)) {
      return { label: 'Erro de configuração', variant: 'destructive' as const, icon: XCircle };
    }
    return { label: 'Conectado', variant: 'default' as const, icon: CheckCircle2 };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Facebook className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Pixel da Meta</h1>
            <p className="text-muted-foreground">Rastreie conversões do Facebook e Instagram Ads</p>
          </div>
        </div>
        <Badge variant={status.variant} className="flex items-center gap-1">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuração do Pixel
          </CardTitle>
          <CardDescription>
            Insira o ID do Pixel da Meta para começar a rastrear eventos no site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="pixel-id">ID do Pixel</Label>
            <Input
              id="pixel-id"
              inputMode="numeric"
              placeholder="Ex: 123456789012345"
              value={pixelId}
              onChange={(e) => handlePixelIdChange(e.target.value)}
              className={validationError ? 'border-destructive' : ''}
            />
            {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            <p className="text-xs text-muted-foreground">
              Encontre em: Meta Events Manager → Fontes de dados → Seu Pixel → ID
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="font-medium">Ativar rastreamento</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, o script do Pixel será injetado em todas as páginas
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!validatePixelId(pixelId)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5" />
            Eventos Automáticos
          </CardTitle>
          <CardDescription>Escolha quais eventos serão enviados para a Meta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>PageView</Label>
                  <p className="text-xs text-muted-foreground">Visualizações de página</p>
                </div>
              </div>
              <Switch checked={trackPageviews} onCheckedChange={setTrackPageviews} />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Lead</Label>
                  <p className="text-xs text-muted-foreground">Contatos e interesse</p>
                </div>
              </div>
              <Switch checked={trackLead} onCheckedChange={setTrackLead} />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>CompleteRegistration</Label>
                  <p className="text-xs text-muted-foreground">Cadastros concluídos</p>
                </div>
              </div>
              <Switch checked={trackRegistration} onCheckedChange={setTrackRegistration} />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Purchase</Label>
                  <p className="text-xs text-muted-foreground">Pagamentos aprovados</p>
                </div>
              </div>
              <Switch checked={trackPurchase} onCheckedChange={setTrackPurchase} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !!validationError}>
          {saving ? (
            <>Salvando...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      <MetaPixelAuditLog logs={logs} loading={logsLoading} onRefresh={refetchLogs} />
    </div>

  );
};

export default AdminMetaPixelConfig;
