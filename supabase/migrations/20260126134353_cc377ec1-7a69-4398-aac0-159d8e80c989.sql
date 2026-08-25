-- Allow team members to view their owner's profile (to inherit plan settings)
CREATE POLICY "Team members can view owner profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.member_user_id = auth.uid()
    AND tm.owner_user_id = profiles.user_id
    AND tm.status = 'ACTIVE'
  )
);