import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmpresaByCnpj } from '@/hooks/useEmpresaByCnpj';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCnpj } from '@/lib/empresaParser';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Edit, Users, History, Building2, Phone, MapPin, 
  Tag, FolderOpen, Clock, Loader2, Zap, Sparkles, RefreshCw, 
  Receipt, Scale
} from 'lucide-react';

const AdminEmpresaDetails = () => {
  const { cnpj } = useParams<{ cnpj: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, loading, error, refetch } = useEmpresaByCnpj(cnpj);
  const { getCategoriaById, getTagById, getSociosByEmpresa, getAuditLogsByEmpresa } = useCategoriesTags();
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ status: string; fieldsUpdated?: number; source?: string } | null>(null);
  const socios = cnpj ? getSociosByEmpresa(cnpj) : [];
  const auditLogs = cnpj ? getAuditLogsByEmpresa(cnpj) : [];
  const categoria = empresa?.categoria_id ? getCategoriaById(empresa.categoria_id) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando empresa...</span>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Empresa não encontrada</h2>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <Button variant="outline" onClick={() => navigate('/admin/empresas')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/empresas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {empresa.nome_fantasia || empresa.razao_social}
            </h1>
            <p className="text-muted-foreground font-mono">{formatCnpj(empresa.cnpj)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={async () => {
              setEnriching(true);
              setEnrichResult(null);
              try {
                const cleanCnpj = empresa.cnpj.replace(/\D/g, '').padStart(14, '0');
                const { data, error: err } = await supabase.functions.invoke('enrich-cnpj', {
                  body: { mode: 'single', cnpjs: [cleanCnpj], onlyEmpty: false },
                });
                if (err) throw err;
                console.log('Enrich response:', data);
                
                if (data?.enriched > 0) {
                  setEnrichResult({ status: 'enriched', fieldsUpdated: data.enriched, source: 'brasilapi/receitaws' });
                  toast({ title: 'Dados enriquecidos!', description: `Empresa atualizada com sucesso` });
                  refetch();
                } else if (data?.skipped > 0) {
                  setEnrichResult({ status: 'already_complete' });
                  toast({ title: 'Dados já completos', description: 'Todos os campos já estão preenchidos.' });
                } else if (data?.failed > 0) {
                  toast({ title: 'Não foi possível enriquecer', description: 'APIs externas não retornaram dados para este CNPJ.', variant: 'destructive' });
                } else {
                  toast({ title: 'Não foi possível enriquecer', variant: 'destructive' });
                }
              } catch (e: any) {
                console.error('Enrich error:', e);
                toast({ title: 'Erro', description: e.message, variant: 'destructive' });
              } finally {
                setEnriching(false);
              }
            }}
            disabled={enriching}
          >
            {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Enriquecer
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/empresas/${empresa.cnpj}/editar`)}>
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/empresas/${empresa.cnpj}/socios`)}>
            <Users className="h-4 w-4 mr-2" /> Sócios
          </Button>
        </div>
      </div>

      {/* Enrichment Result Banner */}
      {enrichResult?.status === 'enriched' && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <Sparkles className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700">
              {enrichResult.fieldsUpdated} campo(s) atualizado(s) via {enrichResult.source}
            </p>
            <p className="text-xs text-muted-foreground">Os dados abaixo foram atualizados com informações da Receita Federal</p>
          </div>
        </div>
      )}
      {enrichResult?.status === 'already_complete' && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <RefreshCw className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-sm font-medium text-blue-700">Todos os campos já estão preenchidos — nenhuma atualização necessária</p>
        </div>
      )}

      {/* Last Update Info */}
      {empresa.updated_at && (
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Última atualização: {empresa.updated_at.toLocaleString('pt-BR')}
        </p>
      )}

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="socios">Sócios ({socios.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({auditLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Razão Social</p>
                  <p className="font-medium">{empresa.razao_social || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nome Fantasia</p>
                  <p className="font-medium">{empresa.nome_fantasia || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Situação Cadastral</p>
                  <Badge variant={empresa.sit_cadastral === 'ATIVA' ? 'default' : 'destructive'}>
                    {empresa.sit_cadastral || '-'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Porte</p>
                  <p className="font-medium">{empresa.porte_empresa || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CNAE Principal</p>
                  <p className="font-medium">{empresa.cnae_fiscal || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Natureza Jurídica</p>
                  <p className="font-medium">{empresa.cod_natureza_juridica || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Abertura</p>
                  <p className="font-medium">
                    {empresa.data_inicio_atividade 
                      ? empresa.data_inicio_atividade.toLocaleDateString('pt-BR') 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Matriz/Filial</p>
                  <p className="font-medium">{empresa.matriz_filial || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Regime Tributário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Regime Tributário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Simples Nacional</p>
                    <Badge variant={empresa.opcao_simples === 'SIM' ? 'default' : 'secondary'} className="mt-1">
                      {empresa.opcao_simples || 'Não informado'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">MEI</p>
                    <Badge variant={empresa.opcao_mei === 'SIM' ? 'default' : 'secondary'} className="mt-1">
                      {empresa.opcao_mei || 'Não informado'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data Opção Simples</p>
                    <p className="font-medium">
                      {empresa.data_opcao_simples 
                        ? empresa.data_opcao_simples.toLocaleDateString('pt-BR') 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data Exclusão Simples</p>
                    <p className="font-medium">
                      {empresa.data_exclusao_simples 
                        ? empresa.data_exclusao_simples.toLocaleDateString('pt-BR') 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capital Social</p>
                    <p className="font-medium text-base">
                      {empresa.capital_social_empresa 
                        ? `R$ ${empresa.capital_social_empresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Porte</p>
                    <p className="font-medium">{empresa.porte_empresa || '-'}</p>
                  </div>
                </div>
                
                {/* Regime inferido */}
                <div className="border-t pt-3">
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Scale className="h-3 w-3" /> Regime Provável
                  </p>
                  <p className="font-medium">
                    {(() => {
                      const simples = empresa.opcao_simples?.toUpperCase() ?? '';
                      const mei = empresa.opcao_mei?.toUpperCase() ?? '';
                      const isMei = mei === 'SIM' || mei === 'S';
                      const isSimples = simples === 'SIM' || simples === 'S';
                      const isNotSimples = simples === 'NAO' || simples === 'N' || simples.includes('NAO OPTANTE');
                      
                      // MEI tem prioridade — no banco, MEI vem com opcao_simples='NAO OPTANTE'
                      if (isMei) return 'MEI (Microempreendedor Individual)';
                      if (isSimples) return 'Simples Nacional';
                      if (isNotSimples) {
                        const capital = empresa.capital_social_empresa ?? 0;
                        const porte = empresa.porte_empresa?.toUpperCase() ?? '';
                        if (capital > 78_000_000) {
                          return 'Lucro Real (obrigatório — capital social acima de R$ 78 milhões)';
                        }
                        if (capital > 4_800_000 || porte === 'DEMAIS') {
                          return 'Provável Lucro Real (capital social elevado ou porte grande)';
                        }
                        if (capital > 0) {
                          return 'Provável Lucro Presumido (capital social até R$ 4,8 milhões)';
                        }
                        return 'Lucro Presumido ou Lucro Real (capital social não informado para determinar)';
                      }
                      return 'Não determinado — enriqueça os dados para identificar';
                    })()}
                  </p>
                  {(empresa.opcao_simples?.toUpperCase() === 'NAO' || empresa.opcao_simples?.toUpperCase() === 'N' || empresa.opcao_simples?.toUpperCase().includes('NAO OPTANTE')) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Baseado no capital social de {empresa.capital_social_empresa 
                        ? `R$ ${empresa.capital_social_empresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : 'não informado'} e porte {empresa.porte_empresa || 'não informado'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Telefone 1</p>
                  <p className="font-medium">{empresa.ddd_telefone_1 || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone 2</p>
                  <p className="font-medium">{empresa.ddd_telefone_2 || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{empresa.email || empresa.correio_eletronico || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-medium">
                  {empresa.desc_tipo_logradouro} {empresa.logradouro}, {empresa.numero}
                  {empresa.complemento && ` - ${empresa.complemento}`}
                </p>
                <p>{empresa.bairro}</p>
                <p>{empresa.municipio}/{empresa.uf} - CEP: {empresa.cep}</p>
              </CardContent>
            </Card>

            {/* Categories and Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" /> Categorização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Categoria</p>
                  {categoria ? (
                    <Badge style={{ backgroundColor: categoria.cor || undefined }}>
                      {categoria.nome}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Não categorizada</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {empresa.tags?.length > 0 ? (
                      empresa.tags.map(tagId => {
                        const tag = getTagById(tagId);
                        return tag ? (
                          <Badge key={tagId} variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag.nome}
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-muted-foreground">Nenhuma tag</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="socios">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sócios</CardTitle>
              <Button size="sm" onClick={() => navigate(`/admin/empresas/${empresa.cnpj}/socios`)}>
                <Edit className="h-4 w-4 mr-2" /> Gerenciar
              </Button>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : empresa.socios_raw ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Sócios extraídos dos dados importados:</p>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const parsed = JSON.parse(empresa.socios_raw);
                        const list = Array.isArray(parsed) ? parsed : [parsed];
                        return list
                          .map((s: any) => typeof s === 'string' ? s : s?.nome_socio || s?.nome || '')
                          .filter((n: string) => n.length > 0)
                          .map((nome: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm">{nome}</span>
                            </div>
                          ));
                      } catch {
                        // Fallback: split by pipe for non-JSON data
                        return empresa.socios_raw!
                          .split('|')
                          .map((s: string) => s.trim())
                          .filter((s: string) => s.length > 0)
                          .map((nome: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm">{nome}</span>
                            </div>
                          ));
                      }
                    })()}
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum sócio cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Histórico de Alterações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Anterior</TableHead>
                      <TableHead>Novo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {log.data_hora.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{log.admin_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.campo_alterado}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-destructive">
                          {log.valor_anterior || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-success">
                          {log.valor_novo || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma alteração registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEmpresaDetails;
