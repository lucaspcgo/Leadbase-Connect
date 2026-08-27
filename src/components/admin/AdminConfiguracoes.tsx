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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { usePayment } from '@/contexts/PaymentContext';
import { useAuth } from '@/contexts/AuthContext';
import { PixConfig, MercadoPagoConfig, PayPalConfig, StripeConfig } from '@/types/payment';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  CreditCard, 
  Save, 
  Shield, 
  AlertTriangle,
  Eye,
  EyeOff,
  Settings,
  Wallet,
  Loader2
} from 'lucide-react';

const AdminConfiguracoes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { paymentConfig, updatePaymentConfig, configLoading } = usePayment();
  
  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  
  // Default configs to prevent undefined errors
  const defaultPixConfig: PixConfig = {
    enabled: false,
    chave_pix: '',
    tipo_chave: 'EMAIL',
    beneficiario: 'LeadBase Pro',
    cidade: 'Sao Paulo',
    instrucoes: '',
  };

  const defaultMpConfig: MercadoPagoConfig = {
    enabled: false,
    access_token: '',
    public_key: '',
    sandbox_mode: true,
    webhook_secret: '',
  };

  const defaultPaypalConfig: PayPalConfig = {
    enabled: false,
    client_id: '',
    client_secret: '',
    sandbox_mode: true,
    webhook_id: '',
  };

  const defaultStripeConfig: StripeConfig = {
    enabled: false,
    publishable_key: '',
    secret_key: '',
    sandbox_mode: true,
    webhook_secret: '',
  };

  // PIX Config State
  const [pixConfig, setPixConfig] = useState<PixConfig>(defaultPixConfig);
  
  // Mercado Pago Config State
  const [mpConfig, setMpConfig] = useState<MercadoPagoConfig>(defaultMpConfig);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // PayPal Config State
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig>(defaultPaypalConfig);
  const [showPaypalClientSecret, setShowPaypalClientSecret] = useState(false);

  // Stripe Config State
  const [stripeConfig, setStripeConfig] = useState<StripeConfig>(defaultStripeConfig);
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
  const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState(false);

  // Saving states
  const [savingPix, setSavingPix] = useState(false);
  const [savingMp, setSavingMp] = useState(false);
  const [savingPaypal, setSavingPaypal] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);

  // Update local state when config loads from database
  useEffect(() => {
    if (paymentConfig) {
      setPixConfig(paymentConfig.pix ?? defaultPixConfig);
      setMpConfig(paymentConfig.mercado_pago ?? defaultMpConfig);
      setPaypalConfig(paymentConfig.paypal ?? defaultPaypalConfig);
      setStripeConfig(paymentConfig.stripe ?? defaultStripeConfig);
    }
  }, [paymentConfig]);

  const handleSavePixConfig = async () => {
    if (!user) return;
    
    setSavingPix(true);
    try {
      await updatePaymentConfig({ pix: pixConfig }, user.id, user.name);
      toast({ title: 'Configurações salvas', description: 'Configurações do PIX atualizadas.' });
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSavingPix(false);
    }
  };

  const handleSaveMpConfig = async () => {
    if (!user) return;
    
    setSavingMp(true);
    try {
      await updatePaymentConfig({ mercado_pago: mpConfig }, user.id, user.name);
      toast({ title: 'Configurações salvas', description: 'Configurações do Mercado Pago atualizadas.' });
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSavingMp(false);
    }
  };

  const handleSavePaypalConfig = async () => {
    if (!user) return;
    
    setSavingPaypal(true);
    try {
      await updatePaymentConfig({ paypal: paypalConfig }, user.id, user.name);
      toast({ title: 'Configurações salvas', description: 'Configurações do PayPal atualizadas.' });
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSavingPaypal(false);
    }
  };

  const handleSaveStripeConfig = async () => {
    if (!user) return;
    
    setSavingStripe(true);
    try {
      await updatePaymentConfig({ stripe: stripeConfig }, user.id, user.name);
      toast({ title: 'Configurações salvas', description: 'Configurações do Stripe atualizadas.' });
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSavingStripe(false);
    }
  };

  if (!isMasterAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações de Pagamento</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <Shield className="h-12 w-12" />
              <div>
                <p className="font-medium text-foreground">Acesso Restrito</p>
                <p>Apenas o MASTER_ADMIN pode alterar as configurações de pagamento.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações de Pagamento</h1>
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
        <h1 className="text-2xl font-bold">Configurações de Pagamento</h1>
        <p className="text-muted-foreground">Configure os métodos de pagamento disponíveis</p>
      </div>

      <div className="flex items-center gap-2 text-sm bg-warning/10 text-warning p-3 rounded-lg">
        <AlertTriangle className="h-5 w-5" />
        <span>Alterações nas configurações de pagamento afetam imediatamente o checkout.</span>
      </div>

      <div className="flex items-center gap-2 text-sm bg-green-500/10 text-green-600 p-3 rounded-lg">
        <Shield className="h-5 w-5" />
        <span>As credenciais são armazenadas de forma segura no banco de dados com criptografia.</span>
      </div>

      <Tabs defaultValue="pix">
        <TabsList>
          <TabsTrigger value="pix" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            PIX
          </TabsTrigger>
          <TabsTrigger value="mercadopago" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Mercado Pago
          </TabsTrigger>
          <TabsTrigger value="paypal" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            PayPal
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Stripe
          </TabsTrigger>
        </TabsList>

        {/* PIX Configuration */}
        <TabsContent value="pix" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Configuração PIX
                  </CardTitle>
                  <CardDescription>
                    Configure sua chave PIX para receber pagamentos instantâneos
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="pix-enabled">Ativo</Label>
                  <Switch 
                    id="pix-enabled"
                    checked={pixConfig.enabled}
                    onCheckedChange={(checked) => setPixConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tipo-chave">Tipo da Chave</Label>
                  <Select 
                    value={pixConfig.tipo_chave} 
                    onValueChange={(v) => setPixConfig(prev => ({ ...prev, tipo_chave: v as PixConfig['tipo_chave'] }))}
                  >
                    <SelectTrigger id="tipo-chave">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="TELEFONE">Telefone</SelectItem>
                      <SelectItem value="ALEATORIA">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chave-pix">Chave PIX</Label>
                  <Input 
                    id="chave-pix"
                    value={pixConfig.chave_pix}
                    onChange={(e) => setPixConfig(prev => ({ ...prev, chave_pix: e.target.value }))}
                    placeholder="Digite sua chave PIX"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="beneficiario">Nome do Beneficiário</Label>
                  <Input 
                    id="beneficiario"
                    value={pixConfig.beneficiario}
                    onChange={(e) => setPixConfig(prev => ({ ...prev, beneficiario: e.target.value }))}
                    placeholder="Nome que aparecerá no PIX"
                    maxLength={25}
                  />
                  <p className="text-xs text-muted-foreground">Máximo 25 caracteres</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input 
                    id="cidade"
                    value={pixConfig.cidade}
                    onChange={(e) => setPixConfig(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Cidade do beneficiário"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">Máximo 15 caracteres</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instrucoes">Instruções de Pagamento (opcional)</Label>
                <Input 
                  id="instrucoes"
                  value={pixConfig.instrucoes || ''}
                  onChange={(e) => setPixConfig(prev => ({ ...prev, instrucoes: e.target.value }))}
                  placeholder="Instruções exibidas para o pagador"
                />
              </div>
              
              <Separator />
              
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={savingPix}>
                      {savingPix ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Configurações PIX
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As novas configurações de PIX serão aplicadas imediatamente a todos os novos checkouts.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSavePixConfig}>
                        Salvar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mercado Pago Configuration */}
        <TabsContent value="mercadopago" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Configuração Mercado Pago
                  </CardTitle>
                  <CardDescription>
                    Configure a integração com Mercado Pago para aceitar cartões e boleto
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="mp-enabled">Ativo</Label>
                  <Switch 
                    id="mp-enabled"
                    checked={mpConfig.enabled}
                    onCheckedChange={(checked) => setMpConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="sandbox-mode">Modo Sandbox (Teste)</Label>
                <Switch 
                  id="sandbox-mode"
                  checked={mpConfig.sandbox_mode}
                  onCheckedChange={(checked) => setMpConfig(prev => ({ ...prev, sandbox_mode: checked }))}
                />
                {mpConfig.sandbox_mode && (
                  <Badge variant="secondary">Modo Teste Ativo</Badge>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-token">Access Token</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="access-token"
                      type={showAccessToken ? 'text' : 'password'}
                      value={mpConfig.access_token}
                      onChange={(e) => setMpConfig(prev => ({ ...prev, access_token: e.target.value }))}
                      placeholder="APP_USR-XXXXXXXX-XXXXXX..."
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                    >
                      {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Mercado Pago → Suas Integrações → Credenciais
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="public-key">Public Key</Label>
                  <Input 
                    id="public-key"
                    value={mpConfig.public_key}
                    onChange={(e) => setMpConfig(prev => ({ ...prev, public_key: e.target.value }))}
                    placeholder="APP_USR-XXXXXXXX-XXXXXX..."
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">Webhook Secret (opcional)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="webhook-secret"
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={mpConfig.webhook_secret || ''}
                      onChange={(e) => setMpConfig(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      placeholder="Chave secreta para validar webhooks"
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usado para validar as notificações recebidas do Mercado Pago
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuração do Webhook
                </h4>
                <p className="text-sm text-muted-foreground">
                  Configure o seguinte URL no painel do Mercado Pago para receber notificações de pagamento:
                </p>
                <code className="block bg-background p-2 rounded text-sm font-mono">
                  {import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook
                </code>
              </div>
              
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={savingMp}>
                      {savingMp ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Configurações MP
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As novas configurações do Mercado Pago serão aplicadas imediatamente.
                        {!mpConfig.sandbox_mode && (
                          <span className="block mt-2 text-warning font-medium">
                            ⚠️ O modo produção está ativo - pagamentos reais serão processados.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveMpConfig}>
                        Salvar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PayPal Configuration */}
        <TabsContent value="paypal" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Configuração PayPal
                  </CardTitle>
                  <CardDescription>
                    Configure a integração com PayPal para aceitar pagamentos internacionais
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="paypal-enabled">Ativo</Label>
                  <Switch 
                    id="paypal-enabled"
                    checked={paypalConfig.enabled}
                    onCheckedChange={(checked) => setPaypalConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="paypal-sandbox-mode">Modo Sandbox (Teste)</Label>
                <Switch 
                  id="paypal-sandbox-mode"
                  checked={paypalConfig.sandbox_mode}
                  onCheckedChange={(checked) => setPaypalConfig(prev => ({ ...prev, sandbox_mode: checked }))}
                />
                {paypalConfig.sandbox_mode && (
                  <Badge variant="secondary">Modo Teste Ativo</Badge>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paypal-client-id">Client ID</Label>
                  <Input 
                    id="paypal-client-id"
                    value={paypalConfig.client_id}
                    onChange={(e) => setPaypalConfig(prev => ({ ...prev, client_id: e.target.value }))}
                    placeholder="AaBbCcDdEeFf..."
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: PayPal Developer → My Apps & Credentials
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paypal-client-secret">Client Secret</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="paypal-client-secret"
                      type={showPaypalClientSecret ? 'text' : 'password'}
                      value={paypalConfig.client_secret}
                      onChange={(e) => setPaypalConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                      placeholder="EaBbCcDdEeFfGgHh..."
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowPaypalClientSecret(!showPaypalClientSecret)}
                    >
                      {showPaypalClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paypal-webhook-id">Webhook ID (opcional)</Label>
                  <Input 
                    id="paypal-webhook-id"
                    value={paypalConfig.webhook_id || ''}
                    onChange={(e) => setPaypalConfig(prev => ({ ...prev, webhook_id: e.target.value }))}
                    placeholder="ID do webhook configurado no PayPal"
                    className="font-mono"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuração do Webhook
                </h4>
                <p className="text-sm text-muted-foreground">
                  Não há webhook de PayPal implementado neste projeto. Não
                  existe funcao correspondente em <code>supabase/functions/</code>,
                  diferente de Stripe e Mercado Pago. Os pagamentos por PayPal
                  não serão confirmados automaticamente enquanto ela não for
                  criada.
                </p>
              </div>
              
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={savingPaypal}>
                      {savingPaypal ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Configurações PayPal
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As novas configurações do PayPal serão aplicadas imediatamente.
                        {!paypalConfig.sandbox_mode && (
                          <span className="block mt-2 text-warning font-medium">
                            ⚠️ O modo produção está ativo - pagamentos reais serão processados.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSavePaypalConfig}>
                        Salvar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Configuration */}
        <TabsContent value="stripe" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Configuração Stripe
                  </CardTitle>
                  <CardDescription>
                    Configure a integração com Stripe para aceitar pagamentos com cartão de crédito
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="stripe-enabled">Ativo</Label>
                  <Switch 
                    id="stripe-enabled"
                    checked={stripeConfig.enabled}
                    onCheckedChange={(checked) => setStripeConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="stripe-sandbox-mode">Modo Teste</Label>
                <Switch 
                  id="stripe-sandbox-mode"
                  checked={stripeConfig.sandbox_mode}
                  onCheckedChange={(checked) => setStripeConfig(prev => ({ ...prev, sandbox_mode: checked }))}
                />
                {stripeConfig.sandbox_mode && (
                  <Badge variant="secondary">Modo Teste Ativo</Badge>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe-publishable-key">Publishable Key</Label>
                  <Input 
                    id="stripe-publishable-key"
                    value={stripeConfig.publishable_key}
                    onChange={(e) => setStripeConfig(prev => ({ ...prev, publishable_key: e.target.value }))}
                    placeholder="pk_test_XXXXXXXX ou pk_live_XXXXXXXX"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Stripe Dashboard → Developers → API Keys
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stripe-secret-key">Secret Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="stripe-secret-key"
                      type={showStripeSecretKey ? 'text' : 'password'}
                      value={stripeConfig.secret_key}
                      onChange={(e) => setStripeConfig(prev => ({ ...prev, secret_key: e.target.value }))}
                      placeholder="sk_test_XXXXXXXX ou sk_live_XXXXXXXX"
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
                    >
                      {showStripeSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook-secret">Webhook Secret (opcional)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="stripe-webhook-secret"
                      type={showStripeWebhookSecret ? 'text' : 'password'}
                      value={stripeConfig.webhook_secret || ''}
                      onChange={(e) => setStripeConfig(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      placeholder="whsec_XXXXXXXX"
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowStripeWebhookSecret(!showStripeWebhookSecret)}
                    >
                      {showStripeWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usado para validar as notificações recebidas do Stripe
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuração do Webhook
                </h4>
                <p className="text-sm text-muted-foreground">
                  Configure o seguinte URL no painel do Stripe para receber notificações de pagamento:
                </p>
                <code className="block bg-background p-2 rounded text-sm font-mono">
                  {import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook
                </code>
              </div>
              
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={savingStripe}>
                      {savingStripe ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Configurações Stripe
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar alterações?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As novas configurações do Stripe serão aplicadas imediatamente.
                        {!stripeConfig.sandbox_mode && (
                          <span className="block mt-2 text-warning font-medium">
                            ⚠️ O modo produção está ativo - pagamentos reais serão processados.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveStripeConfig}>
                        Salvar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConfiguracoes;
