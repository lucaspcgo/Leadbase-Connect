import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Save, 
  Shield, 
  Eye,
  EyeOff,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Server
} from 'lucide-react';

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_email: string;
  from_name: string;
}

const defaultSmtpConfig: SmtpConfig = {
  enabled: false,
  host: '',
  port: 587,
  secure: true,
  user: '',
  password: '',
  from_email: '',
  from_name: 'LeadsBase Pro',
};

const AdminSmtpConfig = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(defaultSmtpConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Fetch SMTP config from database
  useEffect(() => {
    const fetchConfig = async () => {
      if (!isMasterAdmin) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('payment_configs')
          .select('smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_email, smtp_from_name')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching SMTP config:', error);
          return;
        }

        if (data) {
          setSmtpConfig({
            enabled: data.smtp_enabled ?? false,
            host: data.smtp_host ?? '',
            port: data.smtp_port ?? 587,
            secure: data.smtp_secure ?? true,
            user: data.smtp_user ?? '',
            password: data.smtp_password ?? '',
            from_email: data.smtp_from_email ?? '',
            from_name: data.smtp_from_name ?? 'LeadsBase Pro',
          });
        }
      } catch (err) {
        console.error('Error fetching SMTP config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [isMasterAdmin]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Get existing config ID
      const { data: existingConfig } = await supabase
        .from('payment_configs')
        .select('id')
        .limit(1)
        .maybeSingle();

      const updateData = {
        smtp_enabled: smtpConfig.enabled,
        smtp_host: smtpConfig.host,
        smtp_port: smtpConfig.port,
        smtp_secure: smtpConfig.secure,
        smtp_user: smtpConfig.user,
        smtp_password: smtpConfig.password,
        smtp_from_email: smtpConfig.from_email,
        smtp_from_name: smtpConfig.from_name,
        updated_at: new Date().toISOString(),
      };

      if (existingConfig?.id) {
        const { error } = await supabase
          .from('payment_configs')
          .update(updateData)
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_configs')
          .insert(updateData);

        if (error) throw error;
      }

      // Log the action
      await supabase.from('financial_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.name,
        action: 'CONFIG_CHANGED',
        entity_type: 'CONFIG',
        details: 'Configurações SMTP atualizadas',
      });

      toast({ title: 'Configurações salvas', description: 'Configurações SMTP atualizadas com sucesso.' });
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({ title: 'Erro', description: 'Digite um email para teste.', variant: 'destructive' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          template: 'test_email',
          templateData: {
            timestamp: new Date().toLocaleString('pt-BR'),
          },
        },
      });

      if (error) throw error;

      setTestResult('success');
      toast({ title: 'Email enviado!', description: `Email de teste enviado para ${testEmail}` });
    } catch (error) {
      console.error('Error sending test email:', error);
      setTestResult('error');
      toast({ 
        title: 'Erro ao enviar', 
        description: error instanceof Error ? error.message : 'Não foi possível enviar o email de teste.',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isMasterAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações de Email (SMTP)</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <Shield className="h-12 w-12" />
              <div>
                <p className="font-medium text-foreground">Acesso Restrito</p>
                <p>Apenas o MASTER_ADMIN pode alterar as configurações de email.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações de Email (SMTP)</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando configurações...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações de Email (SMTP)</h1>
        <p className="text-muted-foreground">Configure seu servidor SMTP para envio de emails</p>
      </div>

      <div className="flex items-center gap-2 text-sm bg-green-500/10 text-green-600 p-3 rounded-lg">
        <Shield className="h-5 w-5" />
        <span>As credenciais SMTP são armazenadas de forma segura no banco de dados.</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Servidor SMTP
              </CardTitle>
              <CardDescription>
                Configure os dados do seu servidor SMTP para envio de emails
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="smtp-enabled">Ativo</Label>
              <Switch 
                id="smtp-enabled"
                checked={smtpConfig.enabled}
                onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Host do Servidor SMTP</Label>
              <Input 
                id="smtp-host"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
              <p className="text-xs text-muted-foreground">Ex: smtp.gmail.com, smtp.office365.com</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Porta</Label>
              <Select 
                value={smtpConfig.port.toString()} 
                onValueChange={(v) => setSmtpConfig(prev => ({ ...prev, port: parseInt(v) }))}
              >
                <SelectTrigger id="smtp-port">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="25">25 (SMTP padrão)</SelectItem>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="587">587 (TLS - recomendado)</SelectItem>
                  <SelectItem value="2525">2525 (Alternativa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Usuário / Email</Label>
              <Input 
                id="smtp-user"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                placeholder="seu-email@dominio.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-password">Senha / App Password</Label>
              <div className="flex gap-2">
                <Input 
                  id="smtp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={smtpConfig.password}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Para Gmail, use uma "Senha de App"</p>
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">Email de Envio (From)</Label>
              <Input 
                id="smtp-from-email"
                type="email"
                value={smtpConfig.from_email}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_email: e.target.value }))}
                placeholder="noreply@seudominio.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">Nome do Remetente</Label>
              <Input 
                id="smtp-from-name"
                value={smtpConfig.from_name}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, from_name: e.target.value }))}
                placeholder="LeadsBase Pro"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="smtp-secure">Usar TLS/SSL</Label>
            <Switch 
              id="smtp-secure"
              checked={smtpConfig.secure}
              onCheckedChange={(checked) => setSmtpConfig(prev => ({ ...prev, secure: checked }))}
            />
            {smtpConfig.secure && (
              <Badge variant="secondary">Conexão Segura</Badge>
            )}
          </div>

          <Separator />

          {/* Test Email Section */}
          <div className="bg-muted p-4 rounded-lg space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Testar Configuração
            </h4>
            <div className="flex gap-2">
              <Input 
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email-para-teste@exemplo.com"
                className="max-w-md"
              />
              <Button 
                variant="secondary"
                onClick={handleTestEmail}
                disabled={testing || !smtpConfig.enabled}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Teste
              </Button>
            </div>
            {testResult === 'success' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Email enviado com sucesso!</span>
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Falha ao enviar email. Verifique as configurações.</span>
              </div>
            )}
            {!smtpConfig.enabled && (
              <p className="text-xs text-muted-foreground">Ative o SMTP para testar o envio de emails.</p>
            )}
          </div>
          
          <Separator />
          
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações SMTP
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As novas configurações SMTP serão aplicadas imediatamente para todos os envios de email.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave}>
                    Salvar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Templates de Email Disponíveis
          </CardTitle>
          <CardDescription>
            Estes são os templates de email que serão enviados automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">⚠️ Aviso de Vencimento</h4>
              <p className="text-sm text-muted-foreground">Enviado 5 dias antes da assinatura expirar</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">✅ Confirmação de Pagamento</h4>
              <p className="text-sm text-muted-foreground">Enviado quando um pagamento é aprovado</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">🎉 Boas-vindas</h4>
              <p className="text-sm text-muted-foreground">Enviado ao criar uma nova conta</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">🔄 Renovação de Assinatura</h4>
              <p className="text-sm text-muted-foreground">Enviado quando a assinatura é renovada</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSmtpConfig;
