import { Empresa } from '@/types';

export type ErrorType = 
  | 'missing_required' 
  | 'invalid_format' 
  | 'column_mismatch' 
  | 'parse_error'
  | 'database_error';

export interface ParseError {
  row: number;
  message: string;
  field?: string;
  fieldLabel?: string;
  originalValue?: string;
  errorType: ErrorType;
}

export interface UnmappedColumn {
  header: string;
  sampleValues: string[];
  columnIndex: number;
}

export interface ParseResult {
  empresas: Partial<Empresa>[];
  errors: ParseError[];
  headers: string[];
  mappedHeaders: { header: string; field: keyof Empresa | null; index: number }[];
  unmappedColumns: UnmappedColumn[];
  totalRows: number;
}

// Column name mappings (Excel/CSV headers -> Empresa fields)
const COLUMN_MAPPINGS: Record<string, keyof Empresa> = {
  // CNPJ
  'cnpj': 'cnpj',
  'cnpj_basico': 'cnpj',
  
  // Matriz/Filial
  'matriz_filial': 'matriz_filial',
  'matriz/filial': 'matriz_filial',
  
  // Razão Social
  'razao_social': 'razao_social',
  'razão social': 'razao_social',
  'razao social': 'razao_social',
  
  // Nome Fantasia
  'nome_fantasia': 'nome_fantasia',
  'nome fantasia': 'nome_fantasia',
  
  // Situação Cadastral
  'sit_cadastral': 'sit_cadastral',
  'situacao_cadastral': 'sit_cadastral',
  'situação cadastral': 'sit_cadastral',
  'situacao cadastral': 'sit_cadastral',
  
  // Data Situação Cadastral
  'data_sit_cadastral': 'data_sit_cadastral',
  'data situacao cadastral': 'data_sit_cadastral',
  
  // Outros campos cadastrais
  'motivo_sit_cadastral': 'motivo_sit_cadastral',
  'nome_cidade_exterior': 'nome_cidade_exterior',
  
  // País
  'cod_pais': 'cod_pais',
  'nome_pais': 'nome_pais',
  
  // Natureza Jurídica
  'cod_natureza_juridica': 'cod_natureza_juridica',
  'natureza juridica': 'cod_natureza_juridica',
  
  // Data Início Atividade
  'data_inicio_atividade': 'data_inicio_atividade',
  'data inicio atividade': 'data_inicio_atividade',
  'data abertura': 'data_inicio_atividade',
  
  // CNAE
  'cnae_fiscal': 'cnae_fiscal',
  'cnae fiscal': 'cnae_fiscal',
  'cnae_codigo': 'cnae_codigo',
  'cnae': 'cnae_codigo',
  
  // Endereço
  'desc_tipo_logradouro': 'desc_tipo_logradouro',
  'tipo logradouro': 'desc_tipo_logradouro',
  'logradouro': 'logradouro',
  'endereco': 'logradouro',
  'endereço': 'logradouro',
  'numero': 'numero',
  'número': 'numero',
  'complemento': 'complemento',
  'bairro': 'bairro',
  'cep': 'cep',
  'uf': 'uf',
  'estado': 'uf',
  'cod_municipio': 'cod_municipio',
  'municipio': 'municipio',
  'município': 'municipio',
  'cidade': 'municipio',
  
  // Telefones
  'ddd_telefone_1': 'ddd_telefone_1',
  'telefone_1': 'ddd_telefone_1',
  'telefone 1': 'ddd_telefone_1',
  'telefone': 'ddd_telefone_1',
  'ddd_telefone_2': 'ddd_telefone_2',
  'telefone_2': 'ddd_telefone_2',
  'telefone 2': 'ddd_telefone_2',
  'ddd_fax': 'ddd_fax',
  'fax': 'ddd_fax',
  
  // Email
  'correio_eletronico': 'correio_eletronico',
  'email': 'email',
  'e-mail': 'email',
  
  // Responsável e Capital
  'qualif_responsavel': 'qualif_responsavel',
  'capital_social_empresa': 'capital_social_empresa',
  'capital social': 'capital_social_empresa',
  'capital': 'capital_social_empresa',
  
  // Porte
  'porte_empresa': 'porte_empresa',
  'porte': 'porte_empresa',
  
  // Simples Nacional
  'opcao_simples': 'opcao_simples',
  'simples': 'opcao_simples',
  'simples nacional': 'opcao_simples',
  'data_opcao_simples': 'data_opcao_simples',
  'data_exclusao_simples': 'data_exclusao_simples',
  
  // MEI
  'opcao_mei': 'opcao_mei',
  'mei': 'opcao_mei',
  
  // Situação Especial
  'sit_especial': 'sit_especial',
  'data_sit_especial': 'data_sit_especial',
  
  // Sócios - mapear para socios_raw para guardar texto original
  'socios': 'socios_raw',
  'sócios': 'socios_raw',
  'socios_raw': 'socios_raw',
  
  // CNAEs Secundários
  'cnaes_secundarios': 'cnaes_secundarios',
  'cnaes secundarios': 'cnaes_secundarios',
};

/**
 * Detect the separator used in the CSV/TSV data
 */
export function detectSeparator(data: string): string {
  const firstLine = data.split('\n')[0] || '';
  
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  
  if (tabCount >= semicolonCount && tabCount >= commaCount) return '\t';
  if (semicolonCount >= commaCount) return ';';
  return ',';
}

/**
 * Normalize CNPJ to 14 digits
 */
export function normalizeCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  return digits.padStart(14, '0');
}

/**
 * Normalize CNAE to 7 digits
 */
export function normalizeCnae(cnae: string): string {
  if (!cnae) return '';
  // Se já tiver a descrição (formato "XXXXXXX - Descrição"), extrair só o código
  if (cnae.includes(' - ')) {
    cnae = cnae.split(' - ')[0];
  }
  const digits = cnae.replace(/\D/g, '');
  return digits.padStart(7, '0');
}

/**
 * Parse a date string from various formats
 */
export function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  
  // Try DD/MM/YYYY format
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  
  // Try YYYY-MM-DD format
  const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  }
  
  // Try Excel serial date number
  const serialDate = parseFloat(value);
  if (!isNaN(serialDate) && serialDate > 0) {
    // Excel serial date starts from 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + serialDate * 24 * 60 * 60 * 1000);
  }
  
  // Try parsing as ISO date
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

/**
 * Parse a number value
 */
export function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  // Remove currency symbols and thousands separators
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}

// Headers to ignore (e.g., index columns from pandas)
const IGNORED_HEADERS = [
  'unnamed: 0',
  'unnamed:0',
  'index',
  '__index__',
  '',
];

/**
 * Check if a header should be ignored
 */
export function shouldIgnoreHeader(header: string): boolean {
  const normalized = header.toLowerCase().trim();
  return IGNORED_HEADERS.some(ignored => normalized === ignored || normalized.startsWith('unnamed'));
}

/**
 * Map a header to an Empresa field
 */
export function mapHeader(header: string): keyof Empresa | null {
  // First check if it should be ignored
  if (shouldIgnoreHeader(header)) {
    return null;
  }

  const originalLower = header.toLowerCase().trim();
  const normalized = originalLower.replace(/_/g, ' ').replace(/\s+/g, ' ');
  const underscored = originalLower.replace(/\s+/g, '_').replace(/\//g, '_');
  
  // Direct match with original lowercase
  if (COLUMN_MAPPINGS[originalLower]) {
    return COLUMN_MAPPINGS[originalLower];
  }
  
  // Direct match with normalized (spaces)
  if (COLUMN_MAPPINGS[normalized]) {
    return COLUMN_MAPPINGS[normalized];
  }
  
  // Try underscore version
  if (COLUMN_MAPPINGS[underscored]) {
    return COLUMN_MAPPINGS[underscored];
  }
  
  // Check if it's already a valid field name
  const empresaFields: (keyof Empresa)[] = [
    'cnpj', 'matriz_filial', 'razao_social', 'nome_fantasia', 'sit_cadastral',
    'data_sit_cadastral', 'motivo_sit_cadastral', 'nome_cidade_exterior', 'cod_pais',
    'nome_pais', 'cod_natureza_juridica', 'data_inicio_atividade', 'cnae_fiscal',
    'cnae_codigo', 'desc_tipo_logradouro', 'logradouro', 'numero', 'complemento',
    'bairro', 'cep', 'uf', 'cod_municipio', 'municipio', 'ddd_telefone_1',
    'telefone1_celular', 'ddd_telefone_2', 'telefone2_celular', 'ddd_fax',
    'correio_eletronico', 'email', 'qualif_responsavel', 'capital_social_empresa',
    'porte_empresa', 'opcao_simples', 'data_opcao_simples', 'data_exclusao_simples',
    'opcao_mei', 'sit_especial', 'data_sit_especial', 'socios', 'socios_raw', 'cnaes_secundarios'
  ];
  
  if (empresaFields.includes(underscored as keyof Empresa)) {
    return underscored as keyof Empresa;
  }
  
  if (empresaFields.includes(originalLower as keyof Empresa)) {
    return originalLower as keyof Empresa;
  }
  
  return null;
}

// Human-readable field labels for better error messages
const FIELD_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  matriz_filial: 'Matriz/Filial',
  razao_social: 'Razão Social',
  nome_fantasia: 'Nome Fantasia',
  sit_cadastral: 'Situação Cadastral',
  data_sit_cadastral: 'Data Situação Cadastral',
  motivo_sit_cadastral: 'Motivo Situação Cadastral',
  nome_cidade_exterior: 'Nome Cidade Exterior',
  cod_pais: 'Código País',
  nome_pais: 'Nome País',
  cod_natureza_juridica: 'Código Natureza Jurídica',
  data_inicio_atividade: 'Data Início Atividade',
  cnae_fiscal: 'CNAE Fiscal',
  cnae_codigo: 'Código CNAE',
  desc_tipo_logradouro: 'Tipo Logradouro',
  logradouro: 'Logradouro',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cep: 'CEP',
  uf: 'UF',
  cod_municipio: 'Código Município',
  municipio: 'Município',
  ddd_telefone_1: 'Telefone 1',
  telefone1_celular: 'Telefone 1 é Celular',
  ddd_telefone_2: 'Telefone 2',
  telefone2_celular: 'Telefone 2 é Celular',
  ddd_fax: 'Fax',
  correio_eletronico: 'Correio Eletrônico',
  email: 'Email',
  qualif_responsavel: 'Qualificação Responsável',
  capital_social_empresa: 'Capital Social',
  porte_empresa: 'Porte Empresa',
  opcao_simples: 'Opção Simples',
  data_opcao_simples: 'Data Opção Simples',
  data_exclusao_simples: 'Data Exclusão Simples',
  opcao_mei: 'Opção MEI',
  sit_especial: 'Situação Especial',
  data_sit_especial: 'Data Situação Especial',
  socios: 'Sócios',
  socios_raw: 'Sócios (Texto Original)',
  cnaes_secundarios: 'CNAEs Secundários',
};

/**
 * Parse CSV/TSV data into Empresa objects with detailed error reporting
 */
export function parseEmpresaData(data: string): ParseResult {
  const result: ParseResult = {
    empresas: [],
    errors: [],
    headers: [],
    mappedHeaders: [],
    unmappedColumns: [],
    totalRows: 0
  };

  const lines = data.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    result.errors.push({ 
      row: 0, 
      message: 'Dados insuficientes. É necessário pelo menos uma linha de cabeçalho e uma linha de dados.',
      errorType: 'parse_error'
    });
    return result;
  }

  const separator = detectSeparator(data);
  const headerLine = lines[0];
  const rawHeaders = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  result.headers = rawHeaders;
  
  // Map headers to Empresa fields and track unmapped columns
  const fieldMapping: (keyof Empresa | null)[] = rawHeaders.map(mapHeader);
  
  // Build mappedHeaders and unmappedColumns lists
  rawHeaders.forEach((header, index) => {
    const field = fieldMapping[index];
    result.mappedHeaders.push({ header, field, index });
    
    // If header is not ignored and not mapped, it's unmapped
    if (!shouldIgnoreHeader(header) && field === null) {
      result.unmappedColumns.push({
        header,
        sampleValues: [],
        columnIndex: index
      });
    }
  });
  
  // Check if we have CNPJ column
  const cnpjIndex = fieldMapping.indexOf('cnpj');
  if (cnpjIndex === -1) {
    result.errors.push({ 
      row: 0, 
      message: 'Coluna CNPJ não encontrada. Verifique se o cabeçalho contém uma coluna "CNPJ".',
      errorType: 'missing_required',
      field: 'cnpj',
      fieldLabel: 'CNPJ'
    });
    return result;
  }
  
  result.totalRows = lines.length - 1;

  // Collect sample values for unmapped columns (first 3 non-empty values)
  const unmappedSampleCount: number[] = result.unmappedColumns.map(() => 0);
  const MAX_SAMPLES = 3;

  // Parse each data row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCsvLine(line, separator);
    
    if (values.length !== rawHeaders.length) {
      result.errors.push({ 
        row: i, 
        message: `Número de colunas diferente do cabeçalho (esperado: ${rawHeaders.length}, encontrado: ${values.length})`,
        errorType: 'column_mismatch',
        originalValue: values.slice(0, 5).join(', ') + (values.length > 5 ? '...' : '')
      });
      continue;
    }
    
    // Collect samples for unmapped columns
    result.unmappedColumns.forEach((col, idx) => {
      if (unmappedSampleCount[idx] < MAX_SAMPLES) {
        const value = values[col.columnIndex]?.trim();
        if (value) {
          col.sampleValues.push(value.length > 50 ? value.substring(0, 47) + '...' : value);
          unmappedSampleCount[idx]++;
        }
      }
    });
    
    const empresa: Partial<Empresa> = {};
    let hasError = false;
    
    for (let j = 0; j < values.length; j++) {
      const field = fieldMapping[j];
      if (!field) continue;
      
      const value = values[j].trim().replace(/^["']|["']$/g, '');
      const headerName = rawHeaders[j];
      
      if (field === 'cnpj') {
        if (!value) {
          result.errors.push({ 
            row: i, 
            message: 'CNPJ vazio ou inválido - campo obrigatório',
            errorType: 'missing_required',
            field: 'cnpj',
            fieldLabel: 'CNPJ',
            originalValue: value || '(vazio)'
          });
          hasError = true;
          break;
        }
        empresa.cnpj = normalizeCnpj(value);
      } else if (field === 'cnae_codigo') {
        empresa.cnae_codigo = normalizeCnae(value);
      } else if (field.includes('data_')) {
        const parsedDate = parseDate(value);
        if (value && !parsedDate) {
          // Date parsing failed but we'll still continue - just log a warning
          result.errors.push({
            row: i,
            message: `Data em formato não reconhecido. Valor ignorado.`,
            errorType: 'invalid_format',
            field,
            fieldLabel: FIELD_LABELS[field] || headerName,
            originalValue: value
          });
        }
        (empresa as any)[field] = parsedDate;
      } else if (field === 'capital_social_empresa') {
        const parsedNumber = parseNumber(value);
        if (value && parsedNumber === null) {
          result.errors.push({
            row: i,
            message: `Valor numérico em formato não reconhecido. Valor ignorado.`,
            errorType: 'invalid_format',
            field,
            fieldLabel: FIELD_LABELS[field] || headerName,
            originalValue: value
          });
        }
        empresa.capital_social_empresa = parsedNumber;
      } else if (field === 'telefone1_celular' || field === 'telefone2_celular') {
        (empresa as any)[field] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'sim';
      } else {
        (empresa as any)[field] = value || null;

        // Auto-populate cnae_codigo if we have cnae_fiscal but cnae_codigo is missing
        if (field === 'cnae_fiscal' && value && !empresa.cnae_codigo) {
          empresa.cnae_codigo = normalizeCnae(value);
        }
      }
    }
    
    if (!hasError && empresa.cnpj) {
      result.empresas.push(empresa);
    }
  }

  return result;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Format CNPJ for display
 */
export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '').padStart(14, '0');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}
