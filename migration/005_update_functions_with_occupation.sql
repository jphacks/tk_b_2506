-- Update database functions to include occupation fields
-- Migration: 005_update_functions_with_occupation.sql
-- Description: Updates get_public_introductions and search_introductions_by_interests functions to include occupation data

-- Update get_public_introductions function to include occupation fields
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

-- Update search_introductions_by_interests function to include occupation fields
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

-- Grant execute permission on the updated functions to authenticated users
GRANT EXECUTE ON FUNCTION get_public_introductions() TO authenticated;
GRANT EXECUTE ON FUNCTION search_introductions_by_interests(TEXT) TO authenticated;
