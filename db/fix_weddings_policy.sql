-- ============================================
-- FIX FOR WEDDINGS TABLE RLS POLICY
-- ============================================

-- Drop the existing weddings INSERT policy
DROP POLICY IF EXISTS "Users can create weddings" ON weddings;

-- Create a simpler policy that allows authenticated users to create weddings
CREATE POLICY "Authenticated users can create weddings"
ON weddings FOR INSERT
TO authenticated
WITH CHECK (true);
