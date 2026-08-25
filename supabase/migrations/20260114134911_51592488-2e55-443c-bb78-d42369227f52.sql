-- Fix RLS policies for empresas table - change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all empresas" ON empresas;
DROP POLICY IF EXISTS "Users can view empresas" ON empresas;

-- Create permissive policies for SELECT
CREATE POLICY "Admins can view all empresas"
ON empresas FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view empresas"
ON empresas FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);