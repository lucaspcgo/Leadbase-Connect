import { useState } from 'react';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { Categoria } from '@/types';

const AdminCategorias = () => {
  const { toast } = useToast();
  const { categorias, addCategoria, updateCategoria, deleteCategoria } = useCategoriesTags();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nome: '', cor: '#3B82F6' });

  const handleSave = () => {
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    
    if (editingCat) {
      updateCategoria(editingCat.id, { nome: formData.nome, cor: formData.cor });
      toast({ title: 'Categoria atualizada' });
    } else {
      addCategoria(formData.nome, formData.cor);
      toast({ title: 'Categoria criada' });
    }
    
    setShowDialog(false);
    setEditingCat(null);
    setFormData({ nome: '', cor: '#3B82F6' });
  };

  const handleEdit = (cat: Categoria) => {
    setFormData({ nome: cat.nome, cor: cat.cor || '#3B82F6' });
    setEditingCat(cat);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    deleteCategoria(id);
    toast({ title: 'Categoria excluída' });
  };

  const handleToggleAtivo = (cat: Categoria) => {
    updateCategoria(cat.id, { ativo: !cat.ativo });
  };

  const openAddDialog = () => {
    setFormData({ nome: '', cor: '#3B82F6' });
    setEditingCat(null);
    setShowDialog(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" /> Categorias
          </h1>
          <p className="text-muted-foreground">Gerencie as categorias de empresas</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                categorias.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: cat.cor || '#ccc' }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{cat.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={cat.ativo} 
                          onCheckedChange={() => handleToggleAtivo(cat)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {cat.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
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
                            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja excluir a categoria "{cat.nome}"? Empresas com esta categoria ficarão sem categoria.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(cat.id)}>Excluir</AlertDialogAction>
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
            <DialogTitle>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome da categoria"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-3 mt-2">
                <input 
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <Input 
                  value={formData.cor}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  placeholder="#3B82F6"
                  className="w-32"
                />
                <Badge style={{ backgroundColor: formData.cor }}>
                  Preview
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingCat ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategorias;
