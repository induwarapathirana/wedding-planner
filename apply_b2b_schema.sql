-- 1. Create the user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('couple', 'planner', 'vendor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add 'role' column to profiles if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'couple';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. Create Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    planner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    wedding_date date,
    budget numeric,
    status text DEFAULT 'lead', -- 'lead', 'active', 'completed'
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS on Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies for Clients (Planner access only)
DROP POLICY IF EXISTS "Planners can view their own clients" ON public.clients;
CREATE POLICY "Planners can view their own clients" ON public.clients
    FOR SELECT USING (planner_id = auth.uid());

DROP POLICY IF EXISTS "Planners can insert their own clients" ON public.clients;
CREATE POLICY "Planners can insert their own clients" ON public.clients
    FOR INSERT WITH CHECK (planner_id = auth.uid());

DROP POLICY IF EXISTS "Planners can update their own clients" ON public.clients;
CREATE POLICY "Planners can update their own clients" ON public.clients
    FOR UPDATE USING (planner_id = auth.uid());

DROP POLICY IF EXISTS "Planners can delete their own clients" ON public.clients;
CREATE POLICY "Planners can delete their own clients" ON public.clients
    FOR DELETE USING (planner_id = auth.uid());
