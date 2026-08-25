-- Fix RLS policies on unlocked_companies to be PERMISSIVE instead of RESTRICTIVE
-- This allows users to see their own records OR team owner's records (any matching policy passes)

-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Users can view own unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Users can insert own unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Team members can view owner unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Admins can view all unlocked companies" ON public.unlocked_companies;
DROP POLICY IF EXISTS "Admins can manage unlocked companies" ON public.unlocked_companies;

-- Recreate as PERMISSIVE policies (default, any matching policy allows access)
-- Users can view their own unlocked companies
CREATE POLICY "Users can view own unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own unlocked companies
CREATE POLICY "Users can insert own unlocked companies"
ON public.unlocked_companies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Team members can view owner's unlocked companies
CREATE POLICY "Team members can view owner unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = unlocked_companies.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- Admins can view all unlocked companies
CREATE POLICY "Admins can view all unlocked companies"
ON public.unlocked_companies
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can manage (insert, update, delete) all unlocked companies
CREATE POLICY "Admins can manage unlocked companies"
ON public.unlocked_companies
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));