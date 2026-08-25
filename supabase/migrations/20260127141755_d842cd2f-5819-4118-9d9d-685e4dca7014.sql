-- Fix security findings: prevent any anon/public read access to sensitive tables
-- Ensure RLS is enabled and policies are scoped to the authenticated role.

BEGIN;

-- =====================
-- access_logs
-- =====================
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Users can create access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Team members can view owner access logs" ON public.access_logs;

CREATE POLICY "Users can view their own access logs"
ON public.access_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view owner access logs"
ON public.access_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
      AND tm.owner_user_id = public.access_logs.user_id
      AND tm.status = 'ACTIVE'
  )
);

CREATE POLICY "Admins can view all access logs"
ON public.access_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create access logs"
ON public.access_logs
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Explicitly remove any anon privileges (defense-in-depth; RLS already blocks)
REVOKE ALL ON TABLE public.access_logs FROM anon;
-- Ensure authenticated can still use the table (app + admins)
GRANT SELECT, INSERT ON TABLE public.access_logs TO authenticated;


-- =====================
-- socios
-- =====================
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view socios for unlocked companies" ON public.socios;
DROP POLICY IF EXISTS "Admins can view all socios" ON public.socios;
DROP POLICY IF EXISTS "Admins can insert socios" ON public.socios;
DROP POLICY IF EXISTS "Admins can update socios" ON public.socios;
DROP POLICY IF EXISTS "Admins can delete socios" ON public.socios;

CREATE POLICY "Users can view socios for unlocked companies"
ON public.socios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.unlocked_companies uc
    WHERE uc.empresa_cnpj = public.socios.empresa_cnpj
      AND uc.user_id = auth.uid()
      AND uc.billing_cycle_end >= now()
  )
);

CREATE POLICY "Admins can view all socios"
ON public.socios
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert socios"
ON public.socios
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update socios"
ON public.socios
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete socios"
ON public.socios
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

REVOKE ALL ON TABLE public.socios FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.socios TO authenticated;

COMMIT;