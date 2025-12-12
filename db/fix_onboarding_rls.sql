-- ============================================
-- COMPLETE FIX FOR ONBOARDING FLOW
-- This fixes all RLS policies needed to create a wedding
-- ============================================

-- 1. FIX PROFILES POLICIES
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. FIX WEDDINGS POLICIES
DROP POLICY IF EXISTS "Users can create weddings" ON weddings;
DROP POLICY IF EXISTS "Authenticated users can create weddings" ON weddings;
CREATE POLICY "Authenticated users can create weddings"
ON weddings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 3. FIX COLLABORATORS POLICIES (already done, but ensuring they're correct)
DROP POLICY IF EXISTS "Users can view collaborators for their weddings" ON collaborators;
DROP POLICY IF EXISTS "Users can insert collaborators" ON collaborators;
DROP POLICY IF EXISTS "Users can insert themselves as collaborators" ON collaborators;
DROP POLICY IF EXISTS "Users can add themselves as collaborators" ON collaborators;
DROP POLICY IF EXISTS "Users can view their own collaborator records" ON collaborators;

-- Users can view their own collaborator records
CREATE POLICY "Users can view own collaborator records"
ON collaborators FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can add themselves as collaborators
CREATE POLICY "Users can add self as collaborator"
ON collaborators FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- All done! Try creating your wedding now.
