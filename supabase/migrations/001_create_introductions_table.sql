-- Create introductions table for conference self-introductions
-- Migration: 001_create_introductions_table.sql
-- Description: Creates the introductions table with all necessary constraints, indexes, RLS policies, and helper functions

-- ============================================
-- Table Creation
-- ============================================

-- Create the introductions table with all fields
-- Note: Using gen_random_uuid() which is built-in to PostgreSQL 13+
CREATE TABLE IF NOT EXISTS public.introductions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    affiliation VARCHAR(500),
    research_topic VARCHAR(500),
    interests TEXT,
    one_liner VARCHAR(120),
    occupation VARCHAR(50),
    occupation_other VARCHAR(255),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Data validation constraints
    CONSTRAINT check_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT check_one_liner_length CHECK (LENGTH(one_liner) <= 120),
    CONSTRAINT check_affiliation_length CHECK (LENGTH(affiliation) <= 500),
    CONSTRAINT check_research_topic_length CHECK (LENGTH(research_topic) <= 500),
    CONSTRAINT check_occupation_values CHECK (occupation IN ('学士課程', '修士課程', '博士課程', 'ポスドク', '教員', '研究者', '企業', 'スタッフ', 'その他') OR occupation IS NULL),
    CONSTRAINT check_occupation_other_length CHECK (LENGTH(occupation_other) <= 255)
);

-- ============================================
-- Indexes
-- ============================================

-- Basic indexes for common queries
CREATE INDEX IF NOT EXISTS idx_introductions_created_by ON public.introductions(created_by);
CREATE INDEX IF NOT EXISTS idx_introductions_is_public ON public.introductions(is_public);
CREATE INDEX IF NOT EXISTS idx_introductions_created_at ON public.introductions(created_at);
CREATE INDEX IF NOT EXISTS idx_introductions_name ON public.introductions(name);
CREATE INDEX IF NOT EXISTS idx_introductions_affiliation ON public.introductions(affiliation);
CREATE INDEX IF NOT EXISTS idx_introductions_research_topic ON public.introductions(research_topic);
CREATE INDEX IF NOT EXISTS idx_introductions_occupation ON public.introductions(occupation);

-- Full-text search index for interests
CREATE INDEX IF NOT EXISTS idx_introductions_interests_fts
ON public.introductions USING gin(to_tsvector('english', interests));

-- Composite index for public introductions ordered by creation date
CREATE INDEX IF NOT EXISTS idx_introductions_public_created_at
ON public.introductions(is_public, created_at DESC)
WHERE is_public = true;

-- ============================================
-- Triggers and Functions
-- ============================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_introductions_updated_at
    BEFORE UPDATE ON public.introductions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on the introductions table
ALTER TABLE public.introductions ENABLE ROW LEVEL SECURITY;

-- Users can view all public introductions
CREATE POLICY "Public introductions are viewable by everyone"
    ON public.introductions
    FOR SELECT
    USING (is_public = true);

-- Users can view their own introductions (both public and private)
CREATE POLICY "Users can view their own introductions"
    ON public.introductions
    FOR SELECT
    USING (auth.uid() = created_by);

-- Authenticated users can create introductions
CREATE POLICY "Authenticated users can create introductions"
    ON public.introductions
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Users can update their own introductions
CREATE POLICY "Users can update their own introductions"
    ON public.introductions
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Users can delete their own introductions
CREATE POLICY "Users can delete their own introductions"
    ON public.introductions
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get public introductions for anonymous users
CREATE OR REPLACE FUNCTION get_public_introductions()
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    affiliation VARCHAR(500),
    research_topic VARCHAR(500),
    interests TEXT,
    one_liner VARCHAR(120),
    occupation VARCHAR(50),
    occupation_other VARCHAR(255),
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
        i.occupation,
        i.occupation_other,
        i.created_at
    FROM public.introductions i
    WHERE i.is_public = true
    ORDER BY i.created_at DESC;
END;
$$;

-- Function to search introductions by interests
CREATE OR REPLACE FUNCTION search_introductions_by_interests(search_term TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    affiliation VARCHAR(500),
    research_topic VARCHAR(500),
    interests TEXT,
    one_liner VARCHAR(120),
    occupation VARCHAR(50),
    occupation_other VARCHAR(255),
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
        i.occupation,
        i.occupation_other,
        i.created_at
    FROM public.introductions i
    WHERE i.is_public = true
    AND (
        i.interests ILIKE '%' || search_term || '%'
        OR i.name ILIKE '%' || search_term || '%'
        OR i.affiliation ILIKE '%' || search_term || '%'
        OR i.research_topic ILIKE '%' || search_term || '%'
        OR i.occupation ILIKE '%' || search_term || '%'
        OR i.occupation_other ILIKE '%' || search_term || '%'
    )
    ORDER BY i.created_at DESC;
END;
$$;

-- Function to get introduction statistics
CREATE OR REPLACE FUNCTION get_introduction_stats()
RETURNS TABLE (
    total_introductions BIGINT,
    public_introductions BIGINT,
    private_introductions BIGINT,
    recent_introductions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_introductions,
        COUNT(*) FILTER (WHERE is_public = true) as public_introductions,
        COUNT(*) FILTER (WHERE is_public = false) as private_introductions,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_introductions
    FROM public.introductions;
END;
$$;

-- ============================================
-- Permissions
-- ============================================

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION get_public_introductions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_introductions() TO anon;
GRANT EXECUTE ON FUNCTION search_introductions_by_interests(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_introductions_by_interests(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_introduction_stats() TO authenticated;

-- ============================================
-- Documentation
-- ============================================

-- Table comments
COMMENT ON TABLE public.introductions IS 'Stores conference self-introduction data';
COMMENT ON COLUMN public.introductions.id IS 'Unique identifier for the introduction';
COMMENT ON COLUMN public.introductions.name IS 'Display name for the conference (required)';
COMMENT ON COLUMN public.introductions.affiliation IS 'University, company, or research institution';
COMMENT ON COLUMN public.introductions.research_topic IS 'Current research field or topic';
COMMENT ON COLUMN public.introductions.interests IS 'Research interests (comma-separated)';
COMMENT ON COLUMN public.introductions.one_liner IS 'Short message to other participants (max 120 chars)';
COMMENT ON COLUMN public.introductions.occupation IS 'User occupation category (predefined options)';
COMMENT ON COLUMN public.introductions.occupation_other IS 'Custom occupation description when "その他" is selected';
COMMENT ON COLUMN public.introductions.is_public IS 'Whether the introduction is visible to other participants';
COMMENT ON COLUMN public.introductions.created_by IS 'User who created this introduction';

-- Function comments
COMMENT ON FUNCTION get_public_introductions() IS 'Returns all public introductions for anonymous and authenticated users';
COMMENT ON FUNCTION search_introductions_by_interests(TEXT) IS 'Search public introductions by interests, research topic, or affiliation';
COMMENT ON FUNCTION get_introduction_stats() IS 'Get statistics about introductions (total, public, private, recent)';
