import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { FileText, Plus, Edit, Trash2, Eye, Save, Briefcase, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PageContent {
  id: string;
  page_slug: string;
  title: string;
  content: Record<string, any>;
  meta_description: string | null;
  is_published: boolean;
  updated_at: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

interface JobPosition {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string;
  requirements: string[] | null;
  is_active: boolean;
  created_at: string;
}

const AdminConteudo = () => {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [isNewPost, setIsNewPost] = useState(false);
  const [isNewPosition, setIsNewPosition] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);

    // Fetch pages
    const { data: pagesData } = await supabase
      .from('page_contents')
      .select('*')
      .order('page_slug');

    if (pagesData) setPages(pagesData as unknown as PageContent[]);

    

    // Fetch posts
    const { data: postsData } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsData) setPosts(postsData);

    // Fetch positions
    const { data: positionsData } = await supabase
      .from('job_positions')
      .select('*')
      .order('created_at', { ascending: false });

    if (positionsData) setPositions(positionsData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Page handlers
  const handleSavePage = async (page: PageContent) => {
    const { error } = await supabase
      .from('page_contents')
      .update({
        title: page.title,
        content: page.content,
        meta_description: page.meta_description,
        is_published: page.is_published,
      })
      .eq('id', page.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao salvar página.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Página atualizada!' });
      setEditingPage(null);
      fetchData();
    }
  };

  // Blog post handlers
  const handleSavePost = async (post: BlogPost) => {
    if (isNewPost) {
      const { error } = await supabase.from('blog_posts').insert({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        cover_image: post.cover_image,
        is_published: post.is_published,
        published_at: post.is_published ? new Date().toISOString() : null,
      });

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao criar post.', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          cover_image: post.cover_image,
          is_published: post.is_published,
          published_at: post.is_published && !post.published_at ? new Date().toISOString() : post.published_at,
        })
        .eq('id', post.id);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao salvar post.', variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'Sucesso', description: isNewPost ? 'Post criado!' : 'Post atualizado!' });
    setEditingPost(null);
    setIsNewPost(false);
    fetchData();
  };

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir post.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Post excluído!' });
      fetchData();
    }
  };

  // Job position handlers
  const handleSavePosition = async (position: JobPosition) => {
    if (isNewPosition) {
      const { error } = await supabase.from('job_positions').insert({
        title: position.title,
        department: position.department,
        location: position.location,
        type: position.type,
        description: position.description,
        requirements: position.requirements,
        is_active: position.is_active,
      });

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao criar vaga.', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('job_positions')
        .update({
          title: position.title,
          department: position.department,
          location: position.location,
          type: position.type,
          description: position.description,
          requirements: position.requirements,
          is_active: position.is_active,
        })
        .eq('id', position.id);

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao salvar vaga.', variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'Sucesso', description: isNewPosition ? 'Vaga criada!' : 'Vaga atualizada!' });
    setEditingPosition(null);
    setIsNewPosition(false);
    fetchData();
  };

  const handleDeletePosition = async (id: string) => {
    const { error } = await supabase.from('job_positions').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir vaga.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Vaga excluída!' });
      fetchData();
    }
  };

  const getPageLabel = (slug: string) => {
    const labels: Record<string, string> = {
      'sobre-nos': 'Sobre Nós',
      'contato': 'Contato',
      'blog': 'Blog',
      'carreiras': 'Carreiras',
    };
    return labels[slug] || slug;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="h-6 w-6" />
        Gestão de Conteúdo
      </h1>

      <Tabs defaultValue="pages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="jobs">Vagas</TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Páginas do Site</CardTitle>
              <CardDescription>Edite o conteúdo das páginas institucionais</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{getPageLabel(page.page_slug)}</TableCell>
                      <TableCell>
                        <Badge variant={page.is_published ? 'default' : 'secondary'}>
                          {page.is_published ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(page.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPage(page)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Editar: {getPageLabel(page.page_slug)}</DialogTitle>
                            </DialogHeader>
                            {editingPage && (
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>Título</Label>
                                  <Input
                                    value={editingPage.title}
                                    onChange={(e) =>
                                      setEditingPage({ ...editingPage, title: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Meta Descrição (SEO)</Label>
                                  <Textarea
                                    value={editingPage.meta_description || ''}
                                    onChange={(e) =>
                                      setEditingPage({ ...editingPage, meta_description: e.target.value })
                                    }
                                    rows={2}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Conteúdo (JSON)</Label>
                                  <Textarea
                                    value={JSON.stringify(editingPage.content, null, 2)}
                                    onChange={(e) => {
                                      try {
                                        const parsed = JSON.parse(e.target.value);
                                        setEditingPage({ ...editingPage, content: parsed });
                                      } catch {
                                        // Invalid JSON, ignore
                                      }
                                    }}
                                    rows={12}
                                    className="font-mono text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={editingPage.is_published}
                                    onCheckedChange={(checked) =>
                                      setEditingPage({ ...editingPage, is_published: checked })
                                    }
                                  />
                                  <Label>Publicado</Label>
                                </div>
                                <Button onClick={() => handleSavePage(editingPage)} className="w-full">
                                  <Save className="h-4 w-4 mr-2" />
                                  Salvar Alterações
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blog Tab */}
        <TabsContent value="blog">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Posts do Blog
                </CardTitle>
                <CardDescription>Gerencie os artigos do blog</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setIsNewPost(true);
                  setEditingPost({
                    id: '',
                    slug: '',
                    title: '',
                    excerpt: '',
                    content: '',
                    cover_image: '',
                    is_published: false,
                    published_at: null,
                    created_at: '',
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Post
              </Button>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum post cadastrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>
                          <Badge variant={post.is_published ? 'default' : 'secondary'}>
                            {post.is_published ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsNewPost(false);
                              setEditingPost(post);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Post Edit Dialog */}
          <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isNewPost ? 'Novo Post' : 'Editar Post'}</DialogTitle>
              </DialogHeader>
              {editingPost && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={editingPost.title}
                        onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug (URL)</Label>
                      <Input
                        value={editingPost.slug}
                        onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                        placeholder="meu-artigo"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Resumo</Label>
                    <Textarea
                      value={editingPost.excerpt || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Imagem de Capa (URL)</Label>
                    <Input
                      value={editingPost.cover_image || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, cover_image: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo</Label>
                    <Textarea
                      value={editingPost.content}
                      onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                      rows={10}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingPost.is_published}
                      onCheckedChange={(checked) =>
                        setEditingPost({ ...editingPost, is_published: checked })
                      }
                    />
                    <Label>Publicado</Label>
                  </div>
                  <Button onClick={() => handleSavePost(editingPost)} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {isNewPost ? 'Criar Post' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Vagas de Emprego
                </CardTitle>
                <CardDescription>Gerencie as vagas disponíveis</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setIsNewPosition(true);
                  setEditingPosition({
                    id: '',
                    title: '',
                    department: '',
                    location: '',
                    type: 'full-time',
                    description: '',
                    requirements: [],
                    is_active: true,
                    created_at: '',
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Vaga
              </Button>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma vaga cadastrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.title}</TableCell>
                        <TableCell>{position.department || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={position.is_active ? 'default' : 'secondary'}>
                            {position.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsNewPosition(false);
                              setEditingPosition(position);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir vaga?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePosition(position.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Position Edit Dialog */}
          <Dialog open={!!editingPosition} onOpenChange={() => setEditingPosition(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isNewPosition ? 'Nova Vaga' : 'Editar Vaga'}</DialogTitle>
              </DialogHeader>
              {editingPosition && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título da Vaga</Label>
                      <Input
                        value={editingPosition.title}
                        onChange={(e) =>
                          setEditingPosition({ ...editingPosition, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Input
                        value={editingPosition.department || ''}
                        onChange={(e) =>
                          setEditingPosition({ ...editingPosition, department: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Localização</Label>
                      <Input
                        value={editingPosition.location || ''}
                        onChange={(e) =>
                          setEditingPosition({ ...editingPosition, location: e.target.value })
                        }
                        placeholder="Remoto, São Paulo, etc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Input
                        value={editingPosition.type || ''}
                        onChange={(e) =>
                          setEditingPosition({ ...editingPosition, type: e.target.value })
                        }
                        placeholder="full-time, part-time, contract"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={editingPosition.description}
                      onChange={(e) =>
                        setEditingPosition({ ...editingPosition, description: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Requisitos (um por linha)</Label>
                    <Textarea
                      value={editingPosition.requirements?.join('\n') || ''}
                      onChange={(e) =>
                        setEditingPosition({
                          ...editingPosition,
                          requirements: e.target.value.split('\n').filter((r) => r.trim()),
                        })
                      }
                      rows={4}
                      placeholder="Experiência com React&#10;Conhecimento em TypeScript&#10;Inglês avançado"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingPosition.is_active}
                      onCheckedChange={(checked) =>
                        setEditingPosition({ ...editingPosition, is_active: checked })
                      }
                    />
                    <Label>Vaga Ativa</Label>
                  </div>
                  <Button onClick={() => handleSavePosition(editingPosition)} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {isNewPosition ? 'Criar Vaga' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConteudo;
