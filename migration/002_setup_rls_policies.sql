-- Setup Row Level Security (RLS) policies for introductions table
-- Migration: 002_setup_rls_policies.sql
-- Description: Configures security policies for the introductions table

-- Enable RLS on the introductions table
ALTER TABLE public.introductions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view all public introductions
CREATE POLICY "Public introductions are viewable by everyone"
    ON public.introductions
    FOR SELECT
    USING (is_public = true);

-- Policy 2: Users can view their own introductions (both public and private)
CREATE POLICY "Users can view their own introductions"
    ON public.introductions
    FOR SELECT
    USING (auth.uid() = created_by);

-- Policy 3: Authenticated users can create introductions
CREATE POLICY "Authenticated users can create introductions"
    ON public.introductions
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy 4: Users can update their own introductions
CREATE POLICY "Users can update their own introductions"
    ON public.introductions
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy 5: Users can delete their own introductions
CREATE POLICY "Users can delete their own introductions"
    ON public.introductions
    FOR DELETE
    USING (auth.uid() = created_by);

-- Create a function to get public introductions for anonymous users
CREATE OR REPLACE FUNCTION get_public_introductions()
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    affiliation VARCHAR(500),
    research_topic VARCHAR(500),
    interests TEXT,
    one_liner VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.affiliation,
        i.research_topic,
        i.interests,
        i.one_liner,
        i.created_at
    FROM public.introductions i
    WHERE i.is_public = true
    ORDER BY i.created_at DESC;
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_public_introductions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_introductions() TO anon;

-- Add comments for documentation
COMMENT ON FUNCTION get_public_introductions() IS 'Returns all public introductions for anonymous and authenticated users';
