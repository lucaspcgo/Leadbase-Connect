import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { refreshFilterOptions, useEmpresasFilterOptions } from '@/hooks/useEmpresas';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ufList, sitCadastralOptions, porteOptions } from '@/data/mockData';
import { Loader2 } from 'lucide-react';

interface AdminAddEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const initialForm = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  email: '',
  ddd_telefone_1: '',
  uf: '',
  municipio: '',
  bairro: '',
  logradouro: '',
  numero: '',
  complemento: '',
  cep: '',
  sit_cadastral: 'ATIVA',
  porte_empresa: '',
  cnae_codigo: '',
  cnae_fiscal: '',
  capital_social_empresa: '',
  matriz_filial: 'MATRIZ',
  socios: '',
};

const AdminAddEmpresaDialog = ({ open, onOpenChange, onSuccess }: AdminAddEmpresaDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState(initialForm);
  const { cnaes: cnaesList, loading: loadingOptions } = useEmpresasFilterOptions();
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const normalizeCnpj = (cnpj: string) => cnpj.replace(/\D/g, '').padStart(14, '0');

  const handleSave = async () => {
    const cnpjClean = form.cnpj.replace(/\D/g, '');
    if (cnpjClean.length < 14) {
      toast({ title: 'CNPJ inválido', description: 'O CNPJ deve ter 14 dígitos.', variant: 'destructive' });
      return;
    }
    if (!form.razao_social.trim()) {
      toast({ title: 'Razão Social obrigatória', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const cnpj = normalizeCnpj(form.cnpj);

      // Check duplicate
      const { data: existing } = await supabase
        .from('empresas')
        .select('id')
        .eq('cnpj', cnpj)
        .maybeSingle();

      if (existing) {
        toast({ title: 'CNPJ já cadastrado', description: 'Já existe uma empresa com este CNPJ.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('empresas').insert({
        cnpj,
        razao_social: form.razao_social.trim().toUpperCase(),
        nome_fantasia: form.nome_fantasia.trim().toUpperCase() || null,
        email: form.email.trim() || null,
        ddd_telefone_1: form.ddd_telefone_1.trim() || null,
        uf: form.uf || null,
        municipio: form.municipio.trim().toUpperCase() || null,
        bairro: form.bairro.trim().toUpperCase() || null,
        logradouro: form.logradouro.trim().toUpperCase() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim().toUpperCase() || null,
        cep: form.cep.replace(/\D/g, '') || null,
        sit_cadastral: form.sit_cadastral || 'ATIVA',
        porte_empresa: form.porte_empresa || null,
        cnae_codigo: form.cnae_codigo.trim() || null,
        cnae_fiscal: form.cnae_fiscal.trim() || null,
        capital_social_empresa: form.capital_social_empresa ? parseFloat(form.capital_social_empresa) : null,
        matriz_filial: form.matriz_filial || 'MATRIZ',
        socios: form.socios.trim() || null,
      });

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        return;
      }

      // Refresh filter options so new CNAE/município/UF appear in search filters immediately
      await refreshFilterOptions();

      toast({ title: 'Empresa adicionada com sucesso!' });
      setForm(initialForm);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Empresa Manualmente</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {/* CNPJ */}
          <div className="sm:col-span-2">
            <Label>CNPJ *</Label>
            <Input
              value={form.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </div>

          {/* Razão Social */}
          <div className="sm:col-span-2">
            <Label>Razão Social *</Label>
            <Input
              value={form.razao_social}
              onChange={(e) => handleChange('razao_social', e.target.value)}
              placeholder="Razão Social da empresa"
            />
          </div>

          {/* Nome Fantasia */}
          <div className="sm:col-span-2">
            <Label>Nome Fantasia</Label>
            <Input
              value={form.nome_fantasia}
              onChange={(e) => handleChange('nome_fantasia', e.target.value)}
              placeholder="Nome Fantasia"
            />
          </div>

          {/* Email */}
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@empresa.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.ddd_telefone_1}
              onChange={(e) => handleChange('ddd_telefone_1', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* UF */}
          <div>
            <Label>UF</Label>
            <Select value={form.uf || 'none'} onValueChange={(v) => handleChange('uf', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">Selecione</SelectItem>
                {ufList.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Município */}
          <div>
            <Label>Município</Label>
            <Input
              value={form.municipio}
              onChange={(e) => handleChange('municipio', e.target.value)}
              placeholder="Nome do município"
            />
          </div>

          {/* Bairro */}
          <div>
            <Label>Bairro</Label>
            <Input
              value={form.bairro}
              onChange={(e) => handleChange('bairro', e.target.value)}
              placeholder="Bairro"
            />
          </div>

          {/* Logradouro */}
          <div>
            <Label>Logradouro</Label>
            <Input
              value={form.logradouro}
              onChange={(e) => handleChange('logradouro', e.target.value)}
              placeholder="Rua, Av..."
            />
          </div>

          {/* Número */}
          <div>
            <Label>Número</Label>
            <Input
              value={form.numero}
              onChange={(e) => handleChange('numero', e.target.value)}
              placeholder="Nº"
            />
          </div>

          {/* Complemento */}
          <div>
            <Label>Complemento</Label>
            <Input
              value={form.complemento}
              onChange={(e) => handleChange('complemento', e.target.value)}
              placeholder="Sala, Andar..."
            />
          </div>

          {/* CEP */}
          <div>
            <Label>CEP</Label>
            <Input
              value={form.cep}
              onChange={(e) => handleChange('cep', e.target.value)}
              placeholder="00000-000"
            />
          </div>

          {/* Situação Cadastral */}
          <div>
            <Label>Situação Cadastral</Label>
            <Select value={form.sit_cadastral} onValueChange={(v) => handleChange('sit_cadastral', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                {sitCadastralOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Porte */}
          <div>
            <Label>Porte</Label>
            <Select value={form.porte_empresa || 'none'} onValueChange={(v) => handleChange('porte_empresa', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">Selecione</SelectItem>
                {porteOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Matriz/Filial */}
          <div>
            <Label>Matriz/Filial</Label>
            <Select value={form.matriz_filial} onValueChange={(v) => handleChange('matriz_filial', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="MATRIZ">Matriz</SelectItem>
                <SelectItem value="FILIAL">Filial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>CNAE (Atividade Principal)</Label>
            <SearchableSelect
              options={cnaesList.map(c => ({ value: c.valor, label: `${c.valor} (${c.contagem})` }))}
              value={form.cnae_codigo}
              onValueChange={(v) => {
                handleChange('cnae_codigo', v);
                const selected = cnaesList.find(c => c.valor === v);
                if (selected) {
                  handleChange('cnae_fiscal', selected.valor);
                }
              }}
              placeholder="Selecione o CNAE..."
              searchPlaceholder="Buscar CNAE..."
              emptyMessage="Nenhum CNAE encontrado."
              disabled={loadingOptions}
            />
          </div>

          {/* Capital Social */}
          <div>
            <Label>Capital Social (R$)</Label>
            <Input
              type="number"
              value={form.capital_social_empresa}
              onChange={(e) => handleChange('capital_social_empresa', e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Sócios */}
          <div className="sm:col-span-2">
            <Label>Sócios</Label>
            <Input
              value={form.socios}
              onChange={(e) => handleChange('socios', e.target.value)}
              placeholder="Nome dos sócios separados por vírgula"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAddEmpresaDialog;
