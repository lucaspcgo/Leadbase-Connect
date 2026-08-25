-- Allow team members to view their owner's unlocked companies
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