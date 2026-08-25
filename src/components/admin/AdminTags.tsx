import { useState } from 'react';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Tag as TagType } from '@/types';

const AdminTags = () => {
  const { toast } = useToast();
  const { tags, addTag, updateTag, deleteTag } = useCategoriesTags();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [nome, setNome] = useState('');

  const handleSave = () => {
    if (!nome.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    
    if (editingTag) {
      updateTag(editingTag.id, nome);
      toast({ title: 'Tag atualizada' });
    } else {
      addTag(nome);
      toast({ title: 'Tag criada' });
    }
    
    setShowDialog(false);
    setEditingTag(null);
    setNome('');
  };

  const handleEdit = (tag: TagType) => {
    setNome(tag.nome);
    setEditingTag(tag);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    deleteTag(id);
    toast({ title: 'Tag excluída' });
  };

  const openAddDialog = () => {
    setNome('');
    setEditingTag(null);
    setShowDialog(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" /> Tags
          </h1>
          <p className="text-muted-foreground">Gerencie as tags para classificar empresas</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" /> Nova Tag
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhuma tag cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                tags.map(tag => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">{tag.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.nome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tag)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja excluir a tag "{tag.nome}"? Ela será removida de todas as empresas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(tag.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da tag"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingTag ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTags;
