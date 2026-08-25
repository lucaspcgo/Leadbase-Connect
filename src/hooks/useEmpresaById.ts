import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empresa } from '@/types';

interface DbEmpresaForUnlock {
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
  created_at: string;
  updated_at: string;
  is_unlocked: boolean;
}

const dbToEmpresa = (db: DbEmpresaForUnlock): Empresa & { is_unlocked: boolean } => ({
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
  is_unlocked: db.is_unlocked,
});

export interface EmpresaWithUnlockStatus extends Empresa {
  is_unlocked: boolean;
}

export const useEmpresaById = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresaById = useCallback(async (empresaId: number): Promise<EmpresaWithUnlockStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the RPC function that bypasses RLS and returns unlock status
      const { data, error: fetchError } = await supabase
        .rpc('get_empresa_for_unlock', { p_empresa_id: empresaId });

      if (fetchError) {
        console.error('Error fetching empresa by ID:', fetchError);
        setError('Erro ao buscar empresa');
        return null;
      }

      if (data && data.length > 0) {
        return dbToEmpresa(data[0] as DbEmpresaForUnlock);
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching empresa:', err);
      setError('Erro ao buscar empresa');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchEmpresaById, loading, error };
};
