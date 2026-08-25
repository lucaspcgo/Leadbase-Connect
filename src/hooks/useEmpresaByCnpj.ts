import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empresa } from '@/types';

interface DbEmpresa {
  id: number;
  cnpj: string;
  matriz_filial: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  sit_cadastral: string | null;
  data_sit_cadastral: string | null;
  motivo_sit_cadastral: string | null;
  nome_cidade_exterior: string | null;
  cod_pais: string | null;
  nome_pais: string | null;
  cod_natureza_juridica: string | null;
  data_inicio_atividade: string | null;
  cnae_fiscal: string | null;
  cnae_codigo: string | null;
  desc_tipo_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  cod_municipio: string | null;
  municipio: string | null;
  ddd_telefone_1: string | null;
  telefone1_celular: boolean | null;
  ddd_telefone_2: string | null;
  telefone2_celular: boolean | null;
  ddd_fax: string | null;
  correio_eletronico: string | null;
  email: string | null;
  qualif_responsavel: string | null;
  capital_social_empresa: number | null;
  porte_empresa: string | null;
  opcao_simples: string | null;
  data_opcao_simples: string | null;
  data_exclusao_simples: string | null;
  opcao_mei: string | null;
  sit_especial: string | null;
  data_sit_especial: string | null;
  socios: string | null;
  socios_raw: string | null;
  cnaes_secundarios: string | null;
  categoria_id: string | null;
  tags: string[] | null;
  updated_at: string;
  created_at: string;
}

const dbToEmpresa = (db: DbEmpresa): Empresa => ({
  id: db.id,
  cnpj: db.cnpj,
  matriz_filial: db.matriz_filial,
  razao_social: db.razao_social,
  nome_fantasia: db.nome_fantasia,
  sit_cadastral: db.sit_cadastral,
  data_sit_cadastral: db.data_sit_cadastral ? new Date(db.data_sit_cadastral) : null,
  motivo_sit_cadastral: db.motivo_sit_cadastral,
  nome_cidade_exterior: db.nome_cidade_exterior,
  cod_pais: db.cod_pais,
  nome_pais: db.nome_pais,
  cod_natureza_juridica: db.cod_natureza_juridica,
  data_inicio_atividade: db.data_inicio_atividade ? new Date(db.data_inicio_atividade) : null,
  cnae_fiscal: db.cnae_fiscal,
  cnae_codigo: db.cnae_codigo,
  desc_tipo_logradouro: db.desc_tipo_logradouro,
  logradouro: db.logradouro,
  numero: db.numero,
  complemento: db.complemento,
  bairro: db.bairro,
  cep: db.cep,
  uf: db.uf,
  cod_municipio: db.cod_municipio,
  municipio: db.municipio,
  ddd_telefone_1: db.ddd_telefone_1,
  telefone1_celular: db.telefone1_celular,
  ddd_telefone_2: db.ddd_telefone_2,
  telefone2_celular: db.telefone2_celular,
  ddd_fax: db.ddd_fax,
  correio_eletronico: db.correio_eletronico,
  email: db.email,
  qualif_responsavel: db.qualif_responsavel,
  capital_social_empresa: db.capital_social_empresa,
  porte_empresa: db.porte_empresa,
  opcao_simples: db.opcao_simples,
  data_opcao_simples: db.data_opcao_simples ? new Date(db.data_opcao_simples) : null,
  data_exclusao_simples: db.data_exclusao_simples ? new Date(db.data_exclusao_simples) : null,
  opcao_mei: db.opcao_mei,
  sit_especial: db.sit_especial,
  data_sit_especial: db.data_sit_especial ? new Date(db.data_sit_especial) : null,
  socios: db.socios,
  socios_raw: db.socios_raw,
  cnaes_secundarios: db.cnaes_secundarios,
  categoria_id: db.categoria_id,
  tags: db.tags || [],
  updated_at: db.updated_at ? new Date(db.updated_at) : null,
  created_at: db.created_at ? new Date(db.created_at) : null,
});
const normalizeCnpj = (cnpj: string): string => {
  return cnpj.replace(/\D/g, '').padStart(14, '0');
};

export const useEmpresaByCnpj = (cnpj: string | undefined) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresa = useCallback(async () => {
    if (!cnpj) {
      setLoading(false);
      setEmpresa(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const normalizedCnpj = normalizeCnpj(cnpj);
      
      // Admin fetches from full empresas table
      const { data, error: fetchError } = await supabase
        .from('empresas')
        .select('*')
        .eq('cnpj', normalizedCnpj)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching empresa:', fetchError);
        setError('Erro ao buscar empresa');
        setEmpresa(null);
        return;
      }

      if (data) {
        setEmpresa(dbToEmpresa(data as DbEmpresa));
      } else {
        setEmpresa(null);
      }
    } catch (err) {
      console.error('Error fetching empresa:', err);
      setError('Erro ao buscar empresa');
      setEmpresa(null);
    } finally {
      setLoading(false);
    }
  }, [cnpj]);

  useEffect(() => {
    fetchEmpresa();
  }, [fetchEmpresa]);

  return { empresa, loading, error, refetch: fetchEmpresa };
};
