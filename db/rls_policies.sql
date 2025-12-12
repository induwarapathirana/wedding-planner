-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- WEDDINGS TABLE POLICIES
-- ============================================

-- Users can create weddings
CREATE POLICY "Users can create weddings"
ON weddings FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can view weddings they collaborate on
CREATE POLICY "Users can view weddings they collaborate on"
ON weddings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = weddings.id
    AND collaborators.user_id = auth.uid()
  )
);

-- Users can update weddings where they are owner or editor
CREATE POLICY "Users can update weddings they own or edit"
ON weddings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = weddings.id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can delete weddings they own
CREATE POLICY "Users can delete weddings they own"
ON weddings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = weddings.id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role = 'owner'
  )
);

-- ============================================
-- COLLABORATORS TABLE POLICIES
-- ============================================

-- Users can view collaborators for weddings they're part of
CREATE POLICY "Users can view collaborators for their weddings"
ON collaborators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaborators AS c
    WHERE c.wedding_id = collaborators.wedding_id
    AND c.user_id = auth.uid()
  )
);

-- Users can insert themselves as collaborators (when creating a wedding)
-- This avoids infinite recursion by not checking the collaborators table
CREATE POLICY "Users can insert themselves as collaborators"
ON collaborators FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- BUDGET ITEMS POLICIES
-- ============================================

-- Users can view budget items for weddings they collaborate on
CREATE POLICY "Users can view budget items for their weddings"
ON budget_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = budget_items.wedding_id
    AND collaborators.user_id = auth.uid()
  )
);

-- Users can insert budget items for weddings they collaborate on
CREATE POLICY "Users can insert budget items"
ON budget_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = budget_items.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can update budget items
CREATE POLICY "Users can update budget items"
ON budget_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = budget_items.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can delete budget items
CREATE POLICY "Users can delete budget items"
ON budget_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = budget_items.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- ============================================
-- GUESTS POLICIES
-- ============================================

-- Users can view guests for weddings they collaborate on
CREATE POLICY "Users can view guests for their weddings"
ON guests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = guests.wedding_id
    AND collaborators.user_id = auth.uid()
  )
);

-- Users can insert guests
CREATE POLICY "Users can insert guests"
ON guests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = guests.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can update guests
CREATE POLICY "Users can update guests"
ON guests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = guests.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can delete guests
CREATE POLICY "Users can delete guests"
ON guests FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = guests.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- ============================================
-- CHECKLIST ITEMS POLICIES
-- ============================================

-- Users can view checklist items for weddings they collaborate on
CREATE POLICY "Users can view checklist items for their weddings"
ON checklist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = checklist_items.wedding_id
    AND collaborators.user_id = auth.uid()
  )
);

-- Users can insert checklist items
CREATE POLICY "Users can insert checklist items"
ON checklist_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = checklist_items.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can update checklist items
CREATE POLICY "Users can update checklist items"
ON checklist_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = checklist_items.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);

-- Users can delete checklist items
CREATE POLICY "Users can delete checklist items"
ON checklist_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.wedding_id = checklist_items.wedding_id
    AND collaborators.user_id = auth.uid()
    AND collaborators.role IN ('owner', 'editor')
  )
);
