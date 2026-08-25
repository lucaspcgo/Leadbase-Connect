-- Create table for team members (sub-users linked to an account manager)
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  member_user_id UUID NOT NULL UNIQUE,
  member_email TEXT NOT NULL,
  member_name TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
-- Team owners (account managers) can view their team members
CREATE POLICY "Owners can view their team members"
ON public.team_members
FOR SELECT
USING (auth.uid() = owner_user_id);

-- Team owners can insert team members (max 3, enforced in app)
CREATE POLICY "Owners can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Team owners can update their team members
CREATE POLICY "Owners can update their team members"
ON public.team_members
FOR UPDATE
USING (auth.uid() = owner_user_id);

-- Team owners can delete their team members
CREATE POLICY "Owners can delete their team members"
ON public.team_members
FOR DELETE
USING (auth.uid() = owner_user_id);

-- Team members can view their own record
CREATE POLICY "Members can view their own record"
ON public.team_members
FOR SELECT
USING (auth.uid() = member_user_id);

-- Admins can manage all team members
CREATE POLICY "Admins can manage all team members"
ON public.team_members
FOR ALL
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_team_members_owner ON public.team_members(owner_user_id);
CREATE INDEX idx_team_members_member ON public.team_members(member_user_id);