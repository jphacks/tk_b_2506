-- Add additional constraints and indexes for the introductions table
-- Migration: 003_add_constraints_and_indexes.sql
-- Description: Adds data validation constraints and performance indexes

-- Add check constraints for data validation
ALTER TABLE public.introductions 
ADD CONSTRAINT check_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE public.introductions 
ADD CONSTRAINT check_one_liner_length 
CHECK (LENGTH(one_liner) <= 120);

ALTER TABLE public.introductions 
ADD CONSTRAINT check_affiliation_length 
CHECK (LENGTH(affiliation) <= 500);

ALTER TABLE public.introductions 
ADD CONSTRAINT check_research_topic_length 
CHECK (LENGTH(research_topic) <= 500);

-- Add additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_introductions_name ON public.introductions(name);
CREATE INDEX IF NOT EXISTS idx_introductions_affiliation ON public.introductions(affiliation);
CREATE INDEX IF NOT EXISTS idx_introductions_research_topic ON public.introductions(research_topic);

-- Create a full-text search index for interests
CREATE INDEX IF NOT EXISTS idx_introductions_interests_fts 
ON public.introductions USING gin(to_tsvector('english', interests));

-- Create a composite index for public introductions ordered by creation date
CREATE INDEX IF NOT EXISTS idx_introductions_public_created_at 
ON public.introductions(is_public, created_at DESC) 
WHERE is_public = true;

-- Create a function to search introductions by interests
CREATE OR REPLACE FUNCTION search_introductions_by_interests(search_term TEXT)
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
    AND (
        i.interests ILIKE '%' || search_term || '%'
        OR i.research_topic ILIKE '%' || search_term || '%'
        OR i.affiliation ILIKE '%' || search_term || '%'
    )
    ORDER BY i.created_at DESC;
END;
$$;

-- Grant execute permission on the search function
GRANT EXECUTE ON FUNCTION search_introductions_by_interests(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_introductions_by_interests(TEXT) TO anon;

-- Create a function to get introduction statistics
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

-- Grant execute permission on the stats function
GRANT EXECUTE ON FUNCTION get_introduction_stats() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION search_introductions_by_interests(TEXT) IS 'Search public introductions by interests, research topic, or affiliation';
COMMENT ON FUNCTION get_introduction_stats() IS 'Get statistics about introductions (total, public, private, recent)';
