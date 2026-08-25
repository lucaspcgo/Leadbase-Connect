import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  Key, Webhook, Plus, Trash2, Copy, Eye, EyeOff, RefreshCw, 
  Activity, Clock, Shield, ExternalLink, Code, Zap, Globe,
  AlertCircle, CheckCircle2, XCircle, Loader2, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Generate a random API key
const generateApiKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'lb_';
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

// Simple hash function for client-side (in production, hash server-side)
const hashKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const AVAILABLE_PERMISSIONS = [
  { id: 'read_empresas', label: 'Consultar empresas', description: 'Buscar e visualizar dados de empresas' },
  { id: 'read_socios', label: 'Consultar sócios', description: 'Visualizar dados de sócios' },
  { id: 'read_cnaes', label: 'Consultar CNAEs', description: 'Listar CNAEs disponíveis' },
  { id: 'webhook_manage', label: 'Gerenciar webhooks', description: 'Criar e gerenciar webhooks' },
];

const WEBHOOK_EVENTS = [
  { id: 'empresa.created', label: 'Empresa Criada', description: 'Nova empresa adicionada' },
  { id: 'empresa.updated', label: 'Empresa Atualizada', description: 'Dados de empresa alterados' },
  { id: 'empresa.enriched', label: 'Empresa Enriquecida', description: 'Dados enriquecidos via API' },
  { id: 'user.signup', label: 'Novo Usuário', description: 'Novo cadastro de usuário' },
  { id: 'payment.completed', label: 'Pagamento Concluído', description: 'Pagamento confirmado' },
];

interface ApiKey {
  id: string;
  name: string;
  user_id: string;
  key_prefix: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  total_requests: number;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  name: string | null;
  plan_id: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  total_deliveries: number;
  failed_deliveries: number;
  created_at: string;
}

const AdminApiIntegracoes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showNewWebhookDialog, setShowNewWebhookDialog] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  
  // New key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyUserId, setNewKeyUserId] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read_empresas']);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
  
  // New webhook form
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, webhooksRes, profilesRes] = await Promise.all([
        supabase.from('api_keys').select('*').order('created_at', { ascending: false }),
        supabase.from('webhooks').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, name, plan_id'),
      ]);
      
      if (keysRes.data) setApiKeys(keysRes.data as any);
      if (webhooksRes.data) setWebhooks(webhooksRes.data as any);
      if (profilesRes.data) setUserProfiles(profilesRes.data as UserProfile[]);
    } catch (err) {
      console.error('Error fetching API data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserDisplayName = useCallback((userId: string) => {
    const profile = userProfiles.find(p => p.user_id === userId);
    return profile?.name || 'Usuário desconhecido';
  }, [userProfiles]);

  const getUserPlan = useCallback((userId: string) => {
    const profile = userProfiles.find(p => p.user_id === userId);
    return profile?.plan_id || 'free';
  }, [userProfiles]);

  const userOptions = userProfiles.map(p => ({
    value: p.user_id,
    label: `${p.name || 'Sem nome'} (${p.plan_id})`,
  }));

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !user) return;
    
    const targetUserId = newKeyUserId || user.id;

    try {
      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const keyPrefix = rawKey.substring(0, 10) + '...';

      const { error } = await supabase.from('api_keys').insert({
        user_id: targetUserId,
        name: newKeyName,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: newKeyPermissions,
        rate_limit: newKeyRateLimit,
      } as any);

      if (error) throw error;

      setNewKeyRevealed(rawKey);
      toast({ title: 'API Key criada!', description: 'Copie a chave agora, ela não será exibida novamente.' });
      fetchData();
      setNewKeyName('');
      setNewKeyUserId('');
      setNewKeyPermissions(['read_empresas']);
      setNewKeyRateLimit(100);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleKey = async (id: string, active: boolean) => {
    const { error } = await supabase.from('api_keys').update({ is_active: active } as any).eq('id', id);
    if (!error) {
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: active } : k));
      toast({ title: active ? 'Key ativada' : 'Key desativada' });
    }
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (!error) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast({ title: 'API Key removida' });
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || !user) return;

    try {
      const webhookSecret = 'whsec_' + generateApiKey().substring(3);

      const { error } = await supabase.from('webhooks').insert({
        user_id: user.id,
        name: newWebhookName,
        url: newWebhookUrl,
        secret: webhookSecret,
        events: newWebhookEvents,
      } as any);

      if (error) throw error;

      toast({ title: 'Webhook criado!', description: 'O webhook começará a receber eventos.' });
      fetchData();
      setShowNewWebhookDialog(false);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookEvents([]);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    const { error } = await supabase.from('webhooks').update({ is_active: active } as any).eq('id', id);
    if (!error) {
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: active } : w));
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    if (!error) {
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Webhook removido' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Conteúdo copiado para a área de transferência.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API & Integrações</h1>
        <p className="text-muted-foreground mt-1">Gerencie tokens de acesso, webhooks e integrações externas</p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Zap className="h-4 w-4" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="uso" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Uso da API
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Chaves de API</CardTitle>
                <CardDescription>Gerencie os tokens de autenticação para acesso à API</CardDescription>
              </div>
              <Dialog open={showNewKeyDialog} onOpenChange={(open) => { setShowNewKeyDialog(open); if (!open) setNewKeyRevealed(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Nova API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Nova API Key</DialogTitle>
                  </DialogHeader>
                  
                  {newKeyRevealed ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-semibold text-green-500">Chave criada com sucesso!</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Copie a chave abaixo. Ela não será exibida novamente.</p>
                        <div className="flex items-center gap-2">
                          <Input value={newKeyRevealed} readOnly className="font-mono text-xs" />
                          <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKeyRevealed)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => { setShowNewKeyDialog(false); setNewKeyRevealed(null); }}>Fechar</Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Usuário vinculado</Label>
                        <SearchableSelect
                          options={userOptions}
                          value={newKeyUserId}
                          onValueChange={setNewKeyUserId}
                          placeholder="Selecione o usuário..."
                          searchPlaceholder="Buscar usuário..."
                          emptyMessage="Nenhum usuário encontrado."
                        />
                        {newKeyUserId && (
                          <p className="text-xs text-muted-foreground">
                            Plano: <Badge variant="outline" className="text-xs">{getUserPlan(newKeyUserId)}</Badge> — A chave respeitará os limites deste plano.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Nome da chave</Label>
                        <Input placeholder="Ex: Integração CRM" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Permissões</Label>
                        <div className="space-y-2">
                          {AVAILABLE_PERMISSIONS.map(perm => (
                            <div key={perm.id} className="flex items-start gap-2">
                              <Checkbox
                                checked={newKeyPermissions.includes(perm.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setNewKeyPermissions(prev => [...prev, perm.id]);
                                  else setNewKeyPermissions(prev => prev.filter(p => p !== perm.id));
                                }}
                              />
                              <div>
                                <p className="text-sm font-medium">{perm.label}</p>
                                <p className="text-xs text-muted-foreground">{perm.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Rate Limit (req/min)</Label>
                        <Select value={String(newKeyRateLimit)} onValueChange={v => setNewKeyRateLimit(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30/min</SelectItem>
                            <SelectItem value="60">60/min</SelectItem>
                            <SelectItem value="100">100/min</SelectItem>
                            <SelectItem value="300">300/min</SelectItem>
                            <SelectItem value="1000">1000/min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || !newKeyUserId}>Criar Chave</Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma API Key criada ainda</p>
                  <p className="text-sm">Crie uma chave para começar a usar a API</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Usuário / Plano</TableHead>
                      <TableHead>Chave</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">{getUserDisplayName(key.user_id)}</div>
                          <Badge variant="outline" className="text-xs mt-0.5">{getUserPlan(key.user_id)}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.permissions.map(p => (
                              <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{key.rate_limit}/min</TableCell>
                        <TableCell>
                          <span className="text-sm">{key.total_requests.toLocaleString()} req</span>
                          {key.last_used_at && (
                            <p className="text-xs text-muted-foreground">
                              Último uso: {format(new Date(key.last_used_at), 'dd/MM HH:mm', { locale: ptBR })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch checked={key.is_active} onCheckedChange={v => handleToggleKey(key.id, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteKey(key.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Webhooks</CardTitle>
                <CardDescription>Configure endpoints para receber eventos em tempo real</CardDescription>
              </div>
              <Dialog open={showNewWebhookDialog} onOpenChange={setShowNewWebhookDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input placeholder="Ex: Notificação CRM" value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>URL do endpoint</Label>
                      <Input placeholder="https://seu-servidor.com/webhook" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Eventos</Label>
                      <div className="space-y-2">
                        {WEBHOOK_EVENTS.map(event => (
                          <div key={event.id} className="flex items-start gap-2">
                            <Checkbox
                              checked={newWebhookEvents.includes(event.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setNewWebhookEvents(prev => [...prev, event.id]);
                                else setNewWebhookEvents(prev => prev.filter(e => e !== event.id));
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium">{event.label}</p>
                              <p className="text-xs text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewWebhookDialog(false)}>Cancelar</Button>
                      <Button onClick={handleCreateWebhook} disabled={!newWebhookName.trim() || !newWebhookUrl.trim()}>Criar</Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum webhook configurado</p>
                  <p className="text-sm">Crie um webhook para receber notificações de eventos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map(wh => (
                    <Card key={wh.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{wh.name}</h4>
                            <Badge variant={wh.is_active ? 'default' : 'secondary'}>
                              {wh.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{wh.url}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wh.events.map(e => (
                              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{wh.total_deliveries} entregas</span>
                            {wh.failed_deliveries > 0 && (
                              <span className="text-destructive">{wh.failed_deliveries} falhas</span>
                            )}
                            {wh.last_triggered_at && (
                              <span>Último: {format(new Date(wh.last_triggered_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={wh.is_active} onCheckedChange={v => handleToggleWebhook(wh.id, v)} />
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteWebhook(wh.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integracoes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Zap className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">n8n</CardTitle>
                    <CardDescription>Automação de workflows</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Conecte o n8n para criar automações poderosas. Use a API Key para autenticar e os Webhooks para receber eventos em tempo real.
                </p>
                <div className="p-3 bg-muted rounded-lg text-xs font-mono space-y-1">
                  <p className="text-muted-foreground">// Configuração no n8n</p>
                  <p>URL Base: <span className="text-primary">{window.location.origin}/api/v1</span></p>
                  <p>Auth: <span className="text-primary">Header → Authorization: Bearer SUA_API_KEY</span></p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href="https://docs.n8n.io/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Documentação n8n
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Globe className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Typebot</CardTitle>
                    <CardDescription>Chatbots inteligentes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Integre o Typebot para criar chatbots que consultam dados de empresas automaticamente usando a API.
                </p>
                <div className="p-3 bg-muted rounded-lg text-xs font-mono space-y-1">
                  <p className="text-muted-foreground">// Bloco HTTP Request no Typebot</p>
                  <p>GET {window.location.origin}/api/v1/empresas?cnpj=00000000000000</p>
                  <p>Headers: Authorization: Bearer SUA_API_KEY</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href="https://docs.typebot.io/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Documentação Typebot
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Code className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">API REST</CardTitle>
                    <CardDescription>Integração customizada</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Acesse todos os dados via API REST. Ideal para integrar com qualquer sistema personalizado.
                </p>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href="/api" target="_blank">
                    <ExternalLink className="h-4 w-4" /> Ver Documentação Completa
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Zapier / Make</CardTitle>
                    <CardDescription>Em breve</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Integração com Zapier e Make em desenvolvimento. Por enquanto, use os webhooks para conectar com essas plataformas.
                </p>
                <Badge variant="secondary" className="mt-3">Em desenvolvimento</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="uso" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Key className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{apiKeys.length}</p>
                    <p className="text-sm text-muted-foreground">API Keys ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {apiKeys.reduce((acc, k) => acc + k.total_requests, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total de requisições</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Webhook className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {webhooks.reduce((acc, w) => acc + w.total_deliveries, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Webhooks entregues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uso por Chave</CardTitle>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Crie uma API Key para começar a rastrear o uso.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chave</TableHead>
                      <TableHead>Requisições</TableHead>
                      <TableHead>Último uso</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <span className="font-medium">{key.name}</span>
                          <br />
                          <code className="text-xs text-muted-foreground">{key.key_prefix}</code>
                        </TableCell>
                        <TableCell>{key.total_requests.toLocaleString()}</TableCell>
                        <TableCell>
                          {key.last_used_at 
                            ? format(new Date(key.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : 'Nunca'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.is_active ? 'default' : 'secondary'}>
                            {key.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminApiIntegracoes;
