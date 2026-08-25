-- Criar função para buscar CNAEs agrupados com contagem
-- SECURITY DEFINER permite que a função seja executada com privilégios do criador
CREATE OR REPLACE FUNCTION public.get_cnaes_grouped()
RETURNS TABLE(cnae_codigo TEXT, cnae_fiscal TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.cnae_codigo,
    e.cnae_fiscal,
    COUNT(*)::BIGINT as count
  FROM empresas e
  WHERE e.cnae_codigo IS NOT NULL
  GROUP BY e.cnae_codigo, e.cnae_fiscal
  ORDER BY count DESC;
END;
$$;