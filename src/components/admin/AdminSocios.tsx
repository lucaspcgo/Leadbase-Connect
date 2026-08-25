import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmpresas } from '@/contexts/EmpresasContext';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCnpj } from '@/lib/empresaParser';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Edit, Trash2, RefreshCw, Users } from 'lucide-react';
import { Socio } from '@/types';

const AdminSocios = () => {
  const { cnpj } = useParams<{ cnpj: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getEmpresaByCnpj } = useEmpresas();
  const { getSociosByEmpresa, addSocio, updateSocio, deleteSocio, extractSociosFromRaw } = useCategoriesTags();
  
  const empresa = cnpj ? getEmpresaByCnpj(cnpj) : null;
  const socios = cnpj ? getSociosByEmpresa(cnpj) : [];
  
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ nome_socio: '', qualificacao: '' });

  if (!empresa) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Empresa não encontrada</h2>
        <Button variant="outline" onClick={() => navigate('/admin/empresas')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    if (!formData.nome_socio.trim()) {
      toast({ title: 'Erro', description: 'Nome do sócio é obrigatório', variant: 'destructive' });
      return;
    }
    
    addSocio({
      empresa_cnpj: empresa.cnpj.replace(/\D/g, '').padStart(14, '0'),
      nome_socio: formData.nome_socio.trim(),
      qualificacao: formData.qualificacao.trim() || null,
      fonte: 'manual',
    });
    
    toast({ title: 'Sócio adicionado' });
    setShowAddDialog(false);
    setFormData({ nome_socio: '', qualificacao: '' });
  };

  const handleEdit = () => {
    if (!editingSocio || !formData.nome_socio.trim()) {
      toast({ title: 'Erro', description: 'Nome do sócio é obrigatório', variant: 'destructive' });
      return;
    }
    
    updateSocio(editingSocio.id, {
      nome_socio: formData.nome_socio.trim(),
      qualificacao: formData.qualificacao.trim() || null,
      fonte: 'manual', // Mark as manually edited
    });
    
    toast({ title: 'Sócio atualizado' });
    setEditingSocio(null);
    setFormData({ nome_socio: '', qualificacao: '' });
  };

  const handleDelete = (id: string) => {
    deleteSocio(id);
    toast({ title: 'Sócio removido' });
  };

  const handleReextract = () => {
    const raw = empresa.socios_raw || empresa.socios;
    if (!raw) {
      toast({ title: 'Erro', description: 'Não há dados de sócios para extrair', variant: 'destructive' });
      return;
    }
    
    const extracted = extractSociosFromRaw(empresa.cnpj, raw);
    toast({ 
      title: 'Extração concluída', 
      description: `${extracted.length} sócio(s) extraído(s)` 
    });
  };

  const openEditDialog = (socio: Socio) => {
    setFormData({ 
      nome_socio: socio.nome_socio, 
      qualificacao: socio.qualificacao || '' 
    });
    setEditingSocio(socio);
  };

  const openAddDialog = () => {
    setFormData({ nome_socio: '', qualificacao: '' });
    setShowAddDialog(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/empresas/${empresa.cnpj}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> Gerenciar Sócios
            </h1>
            <p className="text-muted-foreground">
              {empresa.nome_fantasia || empresa.razao_social} - {formatCnpj(empresa.cnpj)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReextract}>
            <RefreshCw className="h-4 w-4 mr-2" /> Re-extrair
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Sócio
          </Button>
        </div>
      </div>

      {(empresa.socios_raw || empresa.socios) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados Originais Importados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
              {empresa.socios_raw || empresa.socios}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sócios Cadastrados ({socios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {socios.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Qualificação</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socios.map(socio => (
                  <TableRow key={socio.id}>
                    <TableCell className="font-medium">{socio.nome_socio}</TableCell>
                    <TableCell>{socio.qualificacao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={socio.fonte === 'manual' ? 'default' : 'secondary'}>
                        {socio.fonte}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {socio.updated_at.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(socio)}>
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
                            <AlertDialogTitle>Excluir sócio?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja excluir {socio.nome_socio}? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(socio.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum sócio cadastrado</p>
              <p className="text-sm mt-2">
                Clique em "Adicionar Sócio" ou "Re-extrair" para popular a lista
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Sócio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Sócio *</Label>
              <Input 
                value={formData.nome_socio}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_socio: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Qualificação</Label>
              <Input 
                value={formData.qualificacao}
                onChange={(e) => setFormData(prev => ({ ...prev, qualificacao: e.target.value }))}
                placeholder="Ex: Sócio Administrador"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSocio} onOpenChange={(open) => !open && setEditingSocio(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sócio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Sócio *</Label>
              <Input 
                value={formData.nome_socio}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_socio: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Qualificação</Label>
              <Input 
                value={formData.qualificacao}
                onChange={(e) => setFormData(prev => ({ ...prev, qualificacao: e.target.value }))}
                placeholder="Ex: Sócio Administrador"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSocio(null)}>Cancelar</Button>
            <Button onClick={handleEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSocios;
