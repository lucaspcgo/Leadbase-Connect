-- Fix RLS policies for support_tickets table - change from RESTRICTIVE to PERMISSIVE
-- This allows users to view their own tickets and admins to view all tickets

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;

-- Recreate SELECT policies as PERMISSIVE (explicit)
CREATE POLICY "Users can view their own tickets"
ON support_tickets AS PERMISSIVE
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON support_tickets AS PERMISSIVE
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Recreate INSERT policy as PERMISSIVE
CREATE POLICY "Users can create tickets"
ON support_tickets AS PERMISSIVE
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate UPDATE policy as PERMISSIVE for admins
CREATE POLICY "Admins can update tickets"
ON support_tickets AS PERMISSIVE
FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

-- Allow users to respond/update their own tickets (add message reply)
CREATE POLICY "Users can update own tickets"
ON support_tickets AS PERMISSIVE
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);