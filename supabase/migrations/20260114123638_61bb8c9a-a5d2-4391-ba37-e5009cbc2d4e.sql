-- Drop existing RESTRICTIVE policies on empresas
DROP POLICY IF EXISTS "Admins can delete empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can view empresas" ON public.empresas;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can view all empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view empresas" 
ON public.empresas 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert empresas" 
ON public.empresas 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update empresas" 
ON public.empresas 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete empresas" 
ON public.empresas 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));