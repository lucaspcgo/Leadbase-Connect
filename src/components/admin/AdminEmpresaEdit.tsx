import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmpresaByCnpj } from '@/hooks/useEmpresaByCnpj';
import { useCategoriesTags } from '@/contexts/CategoriesTagsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { refreshFilterOptions, useEmpresasFilterOptions } from '@/hooks/useEmpresas';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCnpj } from '@/lib/empresaParser';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Tag, X, Loader2 } from 'lucide-react';
import { Empresa } from '@/types';
import { ufList, sitCadastralOptions, porteEmpresaOptions } from '@/data/mockData';

const AdminEmpresaEdit = () => {
  const { cnpj } = useParams<{ cnpj: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { empresa, loading, error, refetch } = useEmpresaByCnpj(cnpj);
  const { categorias, tags, addAuditLog, extractSociosFromRaw } = useCategoriesTags();
  const { cnaes: cnaesList, loading: loadingOptions } = useEmpresasFilterOptions();
  
  const [formData, setFormData] = useState<Partial<Empresa>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [originalData, setOriginalData] = useState<Partial<Empresa>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (empresa) {
      const initial = { ...empresa };
      setFormData(initial);
      setOriginalData(initial);
      setSelectedTags(empresa.tags || []);
    }
  }, [empresa]);

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

  const handleChange = (field: keyof Empresa, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes: { campo: string; anterior: string; novo: string }[] = [];
      
      const fieldsToCompare: (keyof Empresa)[] = [
        'razao_social', 'nome_fantasia', 'sit_cadastral', 'porte_empresa',
        'uf', 'municipio', 'logradouro', 'numero', 'bairro', 'cep',
        'ddd_telefone_1', 'ddd_telefone_2', 'email', 'cnae_fiscal',
        'capital_social_empresa', 'opcao_simples', 'opcao_mei', 'categoria_id'
      ];
      
      fieldsToCompare.forEach(field => {
        const oldVal = String(originalData[field] ?? '');
        const newVal = String(formData[field] ?? '');
        if (oldVal !== newVal) {
          changes.push({ campo: field, anterior: oldVal, novo: newVal });
        }
      });
      
      const oldTags = (originalData.tags || []).sort().join(',');
      const newTags = selectedTags.sort().join(',');
      if (oldTags !== newTags) {
        changes.push({ campo: 'tags', anterior: oldTags, novo: newTags });
      }
      
      // Update in Supabase
      const updateData: Record<string, any> = {};
      fieldsToCompare.forEach(field => {
        if (formData[field] !== undefined) {
          updateData[field] = formData[field];
        }
      });
      updateData.tags = selectedTags;
      updateData.complemento = formData.complemento;
      if (formData.socios_raw !== undefined) {
        updateData.socios_raw = formData.socios_raw;
      }

      const { error: updateError } = await supabase
        .from('empresas')
        .update(updateData)
        .eq('id', empresa.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh filter options if CNAE/município/UF changed
      const filterFieldsChanged = changes.some(c => 
        ['cnae_codigo', 'cnae_fiscal', 'municipio', 'uf'].includes(c.campo)
      );
      if (filterFieldsChanged) {
        await refreshFilterOptions();
      }
      
      // Log audit
      changes.forEach(change => {
        addAuditLog({
          admin_id: user?.id || 'unknown',
          admin_name: user?.name || 'Admin',
          empresa_cnpj: empresa.cnpj,
          campo_alterado: change.campo,
          valor_anterior: change.anterior,
          valor_novo: change.novo,
        });
      });
      
      // Extract socios if socios_raw changed
      if (formData.socios_raw && formData.socios_raw !== originalData.socios_raw) {
        extractSociosFromRaw(empresa.cnpj, formData.socios_raw);
      }
      
      toast({ 
        title: 'Empresa atualizada', 
        description: changes.length > 0 
          ? `${changes.length} campo(s) alterado(s)` 
          : 'Nenhuma alteração detectada'
      });
      
      navigate(`/admin/empresas/${empresa.cnpj}`);
    } catch (err: any) {
      console.error('Error saving empresa:', err);
      toast({ 
        title: 'Erro ao salvar', 
        description: err.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/empresas/${empresa.cnpj}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Empresa</h1>
            <p className="text-muted-foreground font-mono">{formatCnpj(empresa.cnpj)}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Razão Social</Label>
                <Input 
                  value={formData.razao_social || ''} 
                  onChange={(e) => handleChange('razao_social', e.target.value)} 
                />
              </div>
              <div className="col-span-2">
                <Label>Nome Fantasia</Label>
                <Input 
                  value={formData.nome_fantasia || ''} 
                  onChange={(e) => handleChange('nome_fantasia', e.target.value)} 
                />
              </div>
              <div>
                <Label>Situação Cadastral</Label>
                <Select 
                  value={formData.sit_cadastral || ''} 
                  onValueChange={(v) => handleChange('sit_cadastral', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {sitCadastralOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Porte</Label>
                <Select 
                  value={formData.porte_empresa || ''} 
                  onValueChange={(v) => handleChange('porte_empresa', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {porteEmpresaOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CNAE (Atividade Principal)</Label>
                <SearchableSelect
                  options={cnaesList.map(c => ({ value: c.valor, label: `${c.valor} (${c.contagem})` }))}
                  value={formData.cnae_codigo || ''}
                  onValueChange={(v) => {
                    const selectedCnae = cnaesList.find(c => c.valor === v);
                    handleChange('cnae_codigo', v);
                    // Also update description if available
                    if (selectedCnae) {
                      handleChange('cnae_fiscal', selectedCnae.valor); // Assuming the list has values
                    }
                  }}
                  placeholder="Selecione o CNAE..."
                  searchPlaceholder="Buscar CNAE..."
                  emptyMessage="Nenhum CNAE encontrado."
                  disabled={loadingOptions}
                />
              </div>
              <div>
                <Label>Capital Social</Label>
                <Input 
                  type="number"
                  value={formData.capital_social_empresa || ''} 
                  onChange={(e) => handleChange('capital_social_empresa', parseFloat(e.target.value) || null)} 
                />
              </div>
              <div>
                <Label>Simples Nacional</Label>
                <Select 
                  value={formData.opcao_simples || ''} 
                  onValueChange={(v) => handleChange('opcao_simples', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="SIM">SIM</SelectItem>
                    <SelectItem value="NAO">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>MEI</Label>
                <Select 
                  value={formData.opcao_mei || ''} 
                  onValueChange={(v) => handleChange('opcao_mei', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="SIM">SIM</SelectItem>
                    <SelectItem value="NAO">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input 
                  value={formData.logradouro || ''} 
                  onChange={(e) => handleChange('logradouro', e.target.value)} 
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input 
                  value={formData.numero || ''} 
                  onChange={(e) => handleChange('numero', e.target.value)} 
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input 
                  value={formData.complemento || ''} 
                  onChange={(e) => handleChange('complemento', e.target.value)} 
                />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input 
                  value={formData.bairro || ''} 
                  onChange={(e) => handleChange('bairro', e.target.value)} 
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input 
                  value={formData.cep || ''} 
                  onChange={(e) => handleChange('cep', e.target.value)} 
                />
              </div>
              <div>
                <Label>UF</Label>
                <Select 
                  value={formData.uf || ''} 
                  onValueChange={(v) => handleChange('uf', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {ufList.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Município</Label>
                <Input 
                  value={formData.municipio || ''} 
                  onChange={(e) => handleChange('municipio', e.target.value)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone 1</Label>
                <Input 
                  value={formData.ddd_telefone_1 || ''} 
                  onChange={(e) => handleChange('ddd_telefone_1', e.target.value)} 
                />
              </div>
              <div>
                <Label>Telefone 2</Label>
                <Input 
                  value={formData.ddd_telefone_2 || ''} 
                  onChange={(e) => handleChange('ddd_telefone_2', e.target.value)} 
                />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email || ''} 
                  onChange={(e) => handleChange('email', e.target.value)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category and Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Categoria e Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select 
                value={formData.categoria_id || 'none'} 
                onValueChange={(v) => handleChange('categoria_id', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categorias.filter(c => c.ativo).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        {cat.cor && (
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.cor }}
                          />
                        )}
                        {cat.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge 
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag.id)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.nome}
                    {selectedTags.includes(tag.id) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sócios Raw */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados de Sócios (Bruto)</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Texto original dos sócios (para re-processamento)</Label>
            <Textarea 
              value={formData.socios_raw || formData.socios || ''} 
              onChange={(e) => handleChange('socios_raw', e.target.value)}
              placeholder="Ex: João Silva - Sócio Administrador; Maria Santos - Sócio"
              className="mt-2"
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Ao salvar, o sistema tentará extrair automaticamente os sócios deste texto.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEmpresaEdit;
