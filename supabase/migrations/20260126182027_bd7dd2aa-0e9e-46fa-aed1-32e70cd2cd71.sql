-- 1. Restringir team members - Atualizar policies em access_logs
-- Adicionar política para team members verem apenas logs do owner (se tiverem permissão)
CREATE POLICY "Team members can view owner access logs"
ON public.access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = access_logs.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- 2. Restringir team members em invoices - Adicionar política
CREATE POLICY "Team members can view owner invoices"
ON public.invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = invoices.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- 3. Restringir team members em payments
CREATE POLICY "Team members can view owner payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = payments.user_id
    AND tm.status = 'ACTIVE'
  )
);

-- 4. Restringir team members em subscriptions
CREATE POLICY "Team members can view owner subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = subscriptions.user_id
    AND tm.status = 'ACTIVE'
  )
);