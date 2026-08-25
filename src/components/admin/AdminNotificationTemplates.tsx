import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Save, Loader2, Edit2, X, Check, FileText, Clock, User, Building2, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NotificationTemplate {
  id: string;
  template_key: string;
  name: string;
  title: string;
  body: string;
  url: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const getTemplateIcon = (key: string) => {
  if (key.includes('user')) return <User className="h-5 w-5" />;
  if (key.includes('empresa')) return <Building2 className="h-5 w-5" />;
  if (key.includes('invoice') || key.includes('reminder')) return <CreditCard className="h-5 w-5" />;
  return <Bell className="h-5 w-5" />;
};

const getTemplateCategory = (key: string) => {
  if (key.includes('user')) return { label: 'Usuários', color: 'bg-blue-100 text-blue-800' };
  if (key.includes('empresa')) return { label: 'Empresas', color: 'bg-green-100 text-green-800' };
  if (key.includes('invoice') || key.includes('reminder')) return { label: 'Faturas', color: 'bg-orange-100 text-orange-800' };
  return { label: 'Geral', color: 'bg-gray-100 text-gray-800' };
};

const AdminNotificationTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('template_key');
      
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (template: Partial<NotificationTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          title: template.title,
          body: template.body,
          url: template.url,
          is_active: template.is_active,
        })
        .eq('id', template.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast({
        title: 'Template atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    },
  });

  // Toggle active status
  const toggleActive = async (template: NotificationTemplate) => {
    const { error } = await supabase
      .from('notification_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    toast({
      title: template.is_active ? 'Template desativado' : 'Template ativado',
    });
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate({ ...template });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    updateMutation.mutate(editingTemplate);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group templates by category
  const groupedTemplates = templates?.reduce((acc, template) => {
    const category = getTemplateCategory(template.template_key);
    if (!acc[category.label]) {
      acc[category.label] = [];
    }
    acc[category.label].push(template);
    return acc;
  }, {} as Record<string, NotificationTemplate[]>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Notificação</h1>
          <p className="text-muted-foreground">
            Configure mensagens automáticas para eventos do sistema
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Notificações de Usuários:</strong> Enviadas automaticamente quando um novo usuário se cadastra.
          </p>
          <p>
            <strong>Notificações de Empresas:</strong> Enviadas quando novas empresas são importadas na base.
          </p>
          <p>
            <strong>Lembretes de Fatura:</strong> Enviados automaticamente 7, 3 e 1 dia(s) antes do vencimento da assinatura.
          </p>
          <p className="flex items-center gap-2 pt-2">
            <Clock className="h-4 w-4" />
            As notificações são processadas automaticamente pelo sistema.
          </p>
        </CardContent>
      </Card>

      {/* Templates by category */}
      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Badge variant="secondary" className={getTemplateCategory(categoryTemplates[0]?.template_key || '').color}>
              {category}
            </Badge>
            <span className="text-sm text-muted-foreground font-normal">
              ({categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''})
            </span>
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {categoryTemplates.map((template) => (
              <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getTemplateIcon(template.template_key)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => toggleActive(template)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <p className="font-semibold text-sm">{template.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{template.body}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {template.url}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>
              {editingTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Notificação</Label>
                <Input
                  id="title"
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {editingTemplate.title.length}/50 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Mensagem</Label>
                <Textarea
                  id="body"
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {editingTemplate.body.length}/200 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Link de destino</Label>
                <Input
                  id="url"
                  value={editingTemplate.url}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, url: e.target.value })}
                  placeholder="/dashboard"
                />
              </div>

              {/* Preview */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{editingTemplate.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{editingTemplate.body}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNotificationTemplates;
