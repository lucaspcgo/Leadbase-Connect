

# Corrigir Busca Geral na Pagina /buscar

## Problema Identificado

A funcao RPC `get_empresas_public` que alimenta a pagina de busca publica so procura nos campos `uf`, `municipio`, `cnae_fiscal` e `cnae_codigo`. Ela **nao busca** por CNPJ, razao social ou nome fantasia, por isso a busca geral nao retorna resultados para esses campos.

## Solucao

### 1. Atualizar a funcao RPC `get_empresas_public` no banco de dados

Modificar a clausula `p_search` para incluir busca inteligente por CNPJ, razao social e nome fantasia, usando a mesma heuristica do admin (detectar se a entrada e um CNPJ ou texto):

- Se a entrada for majoritariamente digitos (provavel CNPJ): buscar por `cnpj` com igualdade exata (14 digitos) ou prefixo
- Se for texto: buscar por `razao_social` e `nome_fantasia` usando ILIKE com os indices GIN trigram ja existentes
- Manter a busca existente por UF, municipio e CNAE como fallback

### 2. Otimizacao de performance

- Usar `=` (igualdade) para CNPJ completo (14 digitos) para aproveitar o indice B-tree
- Usar `ILIKE` com prefixo para CNPJ parcial
- Os indices GIN trigram em `razao_social` e `nome_fantasia` ja existem e serao aproveitados automaticamente

## Detalhes Tecnicos

A migracao SQL vai recriar a funcao `get_empresas_public` substituindo o bloco de busca atual:

```sql
-- DE (atual - nao busca CNPJ nem nomes):
AND (p_search IS NULL OR 
     emp.uf ILIKE '%' || p_search || '%' OR
     emp.municipio ILIKE '%' || p_search || '%' OR
     emp.cnae_fiscal ILIKE '%' || p_search || '%' OR
     emp.cnae_codigo ILIKE '%' || p_search || '%')

-- PARA (novo - busca inteligente):
AND (p_search IS NULL OR 
     CASE 
       WHEN length(regexp_replace(p_search, '\D', '', 'g')) >= 3 
            AND length(regexp_replace(p_search, '\D', '', 'g'))::float / length(p_search) > 0.5
       THEN
         CASE 
           WHEN length(regexp_replace(p_search, '\D', '', 'g')) >= 14
           THEN emp.cnpj = left(regexp_replace(p_search, '\D', '', 'g'), 14)
           ELSE emp.cnpj LIKE regexp_replace(p_search, '\D', '', 'g') || '%'
         END
       ELSE
         emp.razao_social ILIKE '%' || p_search || '%' OR
         emp.nome_fantasia ILIKE '%' || p_search || '%'
     END)
```

Essa mesma logica sera aplicada tanto na clausula de contagem (`COUNT`) quanto na clausula de resultados (`RETURN QUERY`) dentro da funcao.

**Nenhum arquivo frontend precisa ser alterado** - o campo `search` ja e passado como `p_search` para a RPC. A correcao e 100% no banco de dados.

