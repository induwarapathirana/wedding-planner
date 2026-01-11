-- 1. Allow Users to INSERT their own profile
-- This is required because if the automatic trigger fails, the web app tries to manually create the profile.
-- Without this policy, that manual creation is blocked by security rules.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Ensure UPDATE policy allows updating role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Relax name constraint (Just in case it was re-added)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_length;

-- 4. Ensure role column exists (Final check)
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'couple';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
