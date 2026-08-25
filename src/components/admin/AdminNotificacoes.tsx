import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Send, Users, Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface NotificationForm {
  title: string;
  body: string;
  url: string;
}

const AdminNotificacoes = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    body: '',
    url: '/',
  });
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // Fetch subscription stats
  const { data: subscriptionStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['push-subscription-stats'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      // Get unique users count
      const { data: uniqueUsers, error: usersError } = await supabase
        .from('push_subscriptions')
        .select('user_id');
      
      if (usersError) throw usersError;
      
      const uniqueUserIds = new Set(uniqueUsers?.map(s => s.user_id) || []);
      
      return {
        totalSubscriptions: count || 0,
        uniqueUsers: uniqueUserIds.size,
      };
    },
  });

  const handleInputChange = (field: keyof NotificationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSendResult(null);
  };

  const handleSendNotification = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e a mensagem.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast-notification', {
        body: {
          title: form.title,
          body: form.body,
          url: form.url || '/',
        },
      });

      if (error) throw error;

      setSendResult({
        sent: data.sent || 0,
        failed: data.failed || 0,
      });

      if (data.sent > 0) {
        toast({
          title: 'Notificações enviadas!',
          description: `${data.sent} notificação(ões) enviada(s) com sucesso.`,
        });
        
        // Clear form on success
        setForm({ title: '', body: '', url: '/' });
      } else {
        toast({
          title: 'Nenhuma notificação enviada',
          description: 'Não há usuários inscritos para receber notificações.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar as notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações Push</h1>
          <p className="text-muted-foreground">
            Envie notificações para usuários que instalaram o app
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos Inscritos</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? '...' : subscriptionStats?.totalSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de dispositivos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? '...' : subscriptionStats?.uniqueUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários com notificações ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enviar Notificação
          </CardTitle>
          <CardDescription>
            A notificação será enviada para todos os usuários que instalaram o app e ativaram as notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Nova funcionalidade disponível!"
              value={form.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {form.title.length}/50 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              placeholder="Ex: Confira as novidades que preparamos para você..."
              value={form.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {form.body.length}/200 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Link (opcional)</Label>
            <Input
              id="url"
              placeholder="Ex: /dashboard ou /precos"
              value={form.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Para onde o usuário será direcionado ao clicar na notificação
            </p>
          </div>

          {/* Preview */}
          {(form.title || form.body) && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Prévia da notificação:</p>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {form.title || 'Título da notificação'}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {form.body || 'Mensagem da notificação'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {sendResult && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Resultado: <Badge variant="secondary">{sendResult.sent} enviada(s)</Badge>
                {sendResult.failed > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {sendResult.failed} falha(s)
                  </Badge>
                )}
              </span>
            </div>
          )}

          <Button
            onClick={handleSendNotification}
            disabled={isSending || !form.title.trim() || !form.body.trim()}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Notificação para Todos
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            1. Usuários que instalaram o app PWA e ativaram as notificações nas configurações
            serão notificados.
          </p>
          <p>
            2. A notificação aparecerá mesmo se o usuário não estiver com o app aberto.
          </p>
          <p>
            3. Ao clicar na notificação, o usuário será direcionado para o link especificado.
          </p>
          <p>
            4. Dispositivos que não receberam a notificação (por estarem offline ou com
            subscriptions inválidas) são automaticamente removidos da lista.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificacoes;
