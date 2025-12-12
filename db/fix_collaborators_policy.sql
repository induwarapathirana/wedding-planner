-- ============================================
-- FIX FOR COLLABORATORS TABLE RECURSION
-- ============================================

-- Drop ALL existing collaborators policies
DROP POLICY IF EXISTS "Users can view collaborators for their weddings" ON collaborators;
DROP POLICY IF EXISTS "Users can insert collaborators" ON collaborators;
DROP POLICY IF EXISTS "Users can insert themselves as collaborators" ON collaborators;

-- CREATE NEW simplified policies without recursion

-- Users can view collaborator records where they are listed
-- (No recursion - just checks the current row)
CREATE POLICY "Users can view their own collaborator records"
ON collaborators FOR SELECT
USING (user_id = auth.uid());

-- Users can insert themselves as collaborators
-- (No recursion - just checks the user_id)
CREATE POLICY "Users can add themselves as collaborators"
ON collaborators FOR INSERT
WITH CHECK (user_id = auth.uid());
