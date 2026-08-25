import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGA4Config } from '@/hooks/useGA4Config';
import { 
  BarChart3, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Save,
  Eye,
  MousePointerClick,
  LogIn,
  UserPlus,
  CreditCard
} from 'lucide-react';

const AdminGA4Config = () => {
  const { config, loading, saving, saveConfig, validateMeasurementId } = useGA4Config();
  
  const [measurementId, setMeasurementId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [trackPageviews, setTrackPageviews] = useState(true);
  const [trackLogin, setTrackLogin] = useState(true);
  const [trackSignup, setTrackSignup] = useState(true);
  const [trackConversions, setTrackConversions] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setMeasurementId(config.measurement_id || '');
      setEnabled(config.enabled);
      setTrackPageviews(config.track_pageviews);
      setTrackLogin(config.track_login);
      setTrackSignup(config.track_signup);
      setTrackConversions(config.track_conversions);
    }
  }, [config, loading]);

  const handleMeasurementIdChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setMeasurementId(upperValue);
    
    if (upperValue && !validateMeasurementId(upperValue)) {
      setValidationError('Formato inválido. Use o formato G-XXXXXXXXXX');
    } else {
      setValidationError(null);
    }
  };

  const handleSave = async () => {
    if (measurementId && !validateMeasurementId(measurementId)) {
      setValidationError('Formato inválido. Use o formato G-XXXXXXXXXX');
      return;
    }

    await saveConfig({
      measurement_id: measurementId || null,
      enabled,
      track_pageviews: trackPageviews,
      track_login: trackLogin,
      track_signup: trackSignup,
      track_conversions: trackConversions,
    });
  };

  const getStatus = () => {
    if (!config.measurement_id) {
      return { label: 'Não configurado', variant: 'secondary' as const, icon: AlertTriangle };
    }
    if (!config.enabled) {
      return { label: 'Desativado', variant: 'outline' as const, icon: XCircle };
    }
    if (!validateMeasurementId(config.measurement_id)) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Google Analytics 4</h1>
            <p className="text-muted-foreground">Configure o rastreamento de métricas</p>
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
            Configuração do GA4
          </CardTitle>
          <CardDescription>
            Insira o Measurement ID do seu Google Analytics 4 para começar a rastrear eventos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="measurement-id">Measurement ID</Label>
            <Input
              id="measurement-id"
              placeholder="G-XXXXXXXXXX"
              value={measurementId}
              onChange={(e) => handleMeasurementIdChange(e.target.value)}
              className={validationError ? 'border-destructive' : ''}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Encontre seu Measurement ID em: Google Analytics → Admin → Data Streams → Web
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="font-medium">Ativar rastreamento</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, o script do GA4 será injetado em todas as páginas
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!measurementId}
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
          <CardDescription>
            Configure quais eventos serão rastreados automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Page Views</Label>
                  <p className="text-xs text-muted-foreground">Visualizações de página</p>
                </div>
              </div>
              <Switch
                checked={trackPageviews}
                onCheckedChange={setTrackPageviews}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Login</Label>
                  <p className="text-xs text-muted-foreground">Eventos de login</p>
                </div>
              </div>
              <Switch
                checked={trackLogin}
                onCheckedChange={setTrackLogin}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Cadastro</Label>
                  <p className="text-xs text-muted-foreground">Criação de conta</p>
                </div>
              </div>
              <Switch
                checked={trackSignup}
                onCheckedChange={setTrackSignup}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Conversões</Label>
                  <p className="text-xs text-muted-foreground">Pagamentos e upgrades</p>
                </div>
              </div>
              <Switch
                checked={trackConversions}
                onCheckedChange={setTrackConversions}
              />
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
    </div>
  );
};

export default AdminGA4Config;
