-- Fix RLS policies for profiles table - change from RESTRICTIVE to PERMISSIVE
-- This allows regular users to access their own profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate SELECT policies as PERMISSIVE (explicit)
CREATE POLICY "Users can view own profile"
ON public.profiles AS PERMISSIVE
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles AS PERMISSIVE
FOR SELECT TO authenticated  
USING (is_admin(auth.uid()));

-- Recreate UPDATE policies as PERMISSIVE (explicit)
CREATE POLICY "Users can update own profile"
ON public.profiles AS PERMISSIVE
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
ON public.profiles AS PERMISSIVE
FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));