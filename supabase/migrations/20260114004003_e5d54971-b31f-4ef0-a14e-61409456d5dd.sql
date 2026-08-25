-- Drop the existing ALL policy and create explicit policies for each operation
-- This ensures no ambiguity in access control

-- First, drop the existing policy
DROP POLICY IF EXISTS "Master admins can manage roles" ON public.user_roles;

-- Create explicit SELECT policy for master admins (admins already have one)
-- Note: Admins can view all roles is already in place

-- Create explicit INSERT policy - ONLY master_admin can insert roles
CREATE POLICY "Only master admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- Create explicit UPDATE policy - ONLY master_admin can update roles
CREATE POLICY "Only master admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- Create explicit DELETE policy - ONLY master_admin can delete roles
CREATE POLICY "Only master admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));