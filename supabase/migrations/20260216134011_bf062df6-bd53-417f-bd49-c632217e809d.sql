
-- Update default permissions for api_keys to include all read permissions
ALTER TABLE public.api_keys ALTER COLUMN permissions SET DEFAULT '{read_empresas,read_socios,read_cnaes}'::text[];

-- Update existing API keys that only have read_empresas to include all read permissions
UPDATE public.api_keys 
SET permissions = '{read_empresas,read_socios,read_cnaes}'::text[]
WHERE permissions = '{read_empresas}'::text[];
