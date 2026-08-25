import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  User, 
  Lock, 
  MessageCircle, 
  Settings,
  Loader2,
  CheckCircle2,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
  Reply,
  Bell,
  WifiOff
} from 'lucide-react';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { OfflineEmpresasList } from '@/components/offline/OfflineEmpresasList';

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_name?: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

const Configuracoes = () => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Ticket state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('geral');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user?.name) {
      setName(user.name);
    }
    
    fetchTickets();
  }, [isAuthenticated, navigate, user]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshUser();
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil', { description: error.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao alterar senha', { description: error.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }

    setSubmittingTicket(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
          category: ticketCategory
        });

      if (error) throw error;

      setTicketSubject('');
      setTicketMessage('');
      setTicketCategory('geral');
      toast.success('Chamado aberto com sucesso!', {
        description: 'Nossa equipe responderá em breve.'
      });
      
      fetchTickets();
    } catch (error: any) {
      toast.error('Erro ao abrir chamado', { description: error.message });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-warning/10 text-warning">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-success/10 text-success">Resolvido</Badge>;
      case 'closed':
        return <Badge variant="outline">Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleExpanded = (ticketId: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const handleReply = async (ticketId: string) => {
    if (!replyMessage.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    setSubmittingReply(true);
    try {
      // Update the ticket with the user's reply appended to the message
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Chamado não encontrado');

      const updatedMessage = `${ticket.message}\n\n---\n**Resposta do usuário (${formatDate(new Date().toISOString())}):**\n${replyMessage.trim()}`;
      
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          message: updatedMessage,
          status: 'open', // Reopen if user replies
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      setReplyMessage('');
      setReplyingTo(null);
      toast.success('Resposta enviada!');
      fetchTickets();
    } catch (error: any) {
      toast.error('Erro ao enviar resposta', { description: error.message });
    } finally {
      setSubmittingReply(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'geral': 'Geral',
      'cobranca': 'Cobrança',
      'tecnico': 'Problema Técnico',
      'dados': 'Dados Incorretos',
      'sugestao': 'Sugestão'
    };
    return labels[category] || category;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configurações
          </h1>
          <p className="text-muted-foreground">Gerencie sua conta e abra chamados de suporte</p>
        </div>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="senha" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Senha</span>
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="offline" className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className="hidden sm:inline">Offline</span>
            </TabsTrigger>
            <TabsTrigger value="suporte" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Suporte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="mt-6">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Perfil
                </CardTitle>
                <CardDescription>
                  Atualize seus dados pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input 
                    id="name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <Button 
                  onClick={handleSaveProfile}
                  disabled={savingProfile || name === user?.name}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="senha" className="mt-6">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                </div>
                
                <Button 
                  onClick={handleChangePassword}
                  disabled={savingPassword || !newPassword || !confirmPassword}
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificacoes" className="mt-6">
            <div className="max-w-lg space-y-4">
              <PushNotificationToggle />
              
              <Card>
                <CardHeader>
                  <CardTitle>Sobre as Notificações</CardTitle>
                  <CardDescription>
                    Como funcionam as notificações de novas empresas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Ao ativar as notificações push, você receberá alertas em tempo real 
                    quando novas empresas forem adicionadas ao sistema e corresponderem 
                    aos seus filtros de busca salvos.
                  </p>
                  <p>
                    Para receber notificações de um filtro específico, acesse a página 
                    de busca, salve seus filtros e ative o ícone de sino ao lado do filtro salvo.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="offline" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <WifiOff className="h-5 w-5" />
                        Modo Offline
                      </CardTitle>
                      <CardDescription>
                        Acesse empresas desbloqueadas mesmo sem conexão
                      </CardDescription>
                    </div>
                    <OfflineIndicator showSyncButton />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    As empresas que você desbloqueia são automaticamente salvas no seu
                    dispositivo para acesso offline. Clique em "Sincronizar" para atualizar
                    a lista com suas empresas mais recentes.
                  </p>
                </CardContent>
              </Card>
              
              <OfflineEmpresasList />
            </div>
          </TabsContent>

          <TabsContent value="suporte" className="mt-6 space-y-6">
            {/* New Ticket Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Abrir Chamado
                </CardTitle>
                <CardDescription>
                  Descreva seu problema ou dúvida e nossa equipe responderá em breve
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketSubject">Assunto</Label>
                    <Input 
                      id="ticketSubject" 
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Resumo do seu problema"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ticketCategory">Categoria</Label>
                    <Select value={ticketCategory} onValueChange={setTicketCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="geral">Geral</SelectItem>
                        <SelectItem value="cobranca">Cobrança</SelectItem>
                        <SelectItem value="tecnico">Problema Técnico</SelectItem>
                        <SelectItem value="dados">Dados Incorretos</SelectItem>
                        <SelectItem value="sugestao">Sugestão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ticketMessage">Mensagem</Label>
                  <Textarea 
                    id="ticketMessage" 
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Descreva detalhadamente seu problema ou dúvida..."
                    className="min-h-[120px]"
                  />
                </div>
                
                <Button 
                  onClick={handleSubmitTicket}
                  disabled={submittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                >
                  {submittingTicket ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Chamado
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tickets List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Meus Chamados
                </CardTitle>
                <CardDescription>
                  Acompanhe o status dos seus chamados e responda às mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum chamado aberto</p>
                    <p className="text-sm">Seus chamados aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <Collapsible 
                        key={ticket.id} 
                        open={expandedTickets.has(ticket.id)}
                        onOpenChange={() => toggleExpanded(ticket.id)}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          {/* Header - Always visible */}
                          <CollapsibleTrigger asChild>
                            <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{ticket.subject}</h4>
                                    {ticket.admin_response && (
                                      <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                                        Nova resposta
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(ticket.created_at)} • {getCategoryLabel(ticket.category)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(ticket.status)}
                                  {expandedTickets.has(ticket.id) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {ticket.message.split('\n---\n')[0]}
                              </p>
                            </div>
                          </CollapsibleTrigger>

                          {/* Expanded content */}
                          <CollapsibleContent>
                            <div className="px-4 pb-4 border-t pt-4 space-y-4">
                              {/* Original message */}
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Mensagem original:</p>
                                <p className="text-sm whitespace-pre-wrap">{ticket.message.split('\n---\n')[0]}</p>
                              </div>

                              {/* Conversation history */}
                              {ticket.message.includes('\n---\n') && (
                                <div className="space-y-2">
                                  {ticket.message.split('\n---\n').slice(1).map((part, idx) => (
                                    <div 
                                      key={idx} 
                                      className="p-3 bg-muted/30 rounded-lg border-l-2 border-muted"
                                    >
                                      <p className="text-sm whitespace-pre-wrap">{part}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Admin response */}
                              {ticket.admin_response && (
                                <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                                  <p className="text-sm font-medium text-primary mb-1 flex items-center gap-2">
                                    <Reply className="h-4 w-4" />
                                    Resposta da equipe:
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap">{ticket.admin_response}</p>
                                </div>
                              )}

                              {/* Reply form */}
                              {ticket.status !== 'closed' && (
                                <div className="space-y-3 pt-2">
                                  <Textarea 
                                    placeholder="Digite sua resposta..."
                                    value={replyingTo === ticket.id ? replyMessage : ''}
                                    onChange={(e) => {
                                      setReplyingTo(ticket.id);
                                      setReplyMessage(e.target.value);
                                    }}
                                    onFocus={() => setReplyingTo(ticket.id)}
                                    className="min-h-[80px]"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleReply(ticket.id)}
                                      disabled={submittingReply || !replyMessage.trim() || replyingTo !== ticket.id}
                                    >
                                      {submittingReply && replyingTo === ticket.id ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Enviando...
                                        </>
                                      ) : (
                                        <>
                                          <Reply className="mr-2 h-4 w-4" />
                                          Responder
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {ticket.status === 'closed' && (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  Este chamado foi encerrado e não aceita mais respostas.
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
