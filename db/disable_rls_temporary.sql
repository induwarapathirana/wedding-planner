-- ============================================
-- TEMPORARY FIX: DISABLE RLS FOR TESTING
-- This will let you create a wedding to verify everything else works
-- ============================================

-- Temporarily disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE weddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items DISABLE ROW LEVEL SECURITY;

-- Now try creating your wedding. It should work!
-- After confirming it works, we'll re-enable RLS with proper policies
