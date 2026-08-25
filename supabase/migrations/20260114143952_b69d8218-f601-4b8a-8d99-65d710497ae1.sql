-- Fix RLS policies: Change SELECT policies from RESTRICTIVE to PERMISSIVE
-- The issue is that RESTRICTIVE policies use AND logic, so a regular user
-- cannot see their own data because they also need to be an admin.
-- PERMISSIVE policies use OR logic, which is what we need.

-- =============================================
-- FIX PROFILES TABLE SELECT POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create PERMISSIVE policies (default is PERMISSIVE)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- =============================================
-- FIX USER_ROLES TABLE SELECT POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Create PERMISSIVE policies
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));