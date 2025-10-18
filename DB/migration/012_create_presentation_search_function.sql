-- Create presentation search function based on user interests
-- Migration: 012_create_presentation_search_function.sql
-- Description: Creates a function to search presentations by user's interest tags

-- Function to search presentations based on user interests
CREATE OR REPLACE FUNCTION search_presentations_by_user_interests(
    p_user_id UUID,
    p_conference_id UUID
)
RETURNS TABLE (
    id UUID,
    conference_id UUID,
    title TEXT,
    abstract TEXT,
    pdf_url TEXT,
    ai_summary TEXT,
    presentation_type TEXT,
    location_id UUID,
    presenter_name TEXT,
    presenter_affiliation TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    matched_tags TEXT[],
    match_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.conference_id,
        p.title::TEXT,
        p.abstract,
        p.pdf_url,
        p.ai_summary,
        p.presentation_type::TEXT,
        p.location_id,
        p.presenter_name::TEXT,
        p.presenter_affiliation::TEXT,
        p.scheduled_at,
        p.created_at,
        p.updated_at,
        ARRAY_AGG(DISTINCT t.name)::TEXT[] as matched_tags,
        COUNT(DISTINCT t.id) as match_count
    FROM presentations p
    JOIN presentation_tags pt ON p.id = pt.presentation_id
    JOIN tags t ON pt.tag_id = t.id
    WHERE pt.tag_id IN (
        SELECT tag_id FROM user_interests WHERE user_id = p_user_id
    )
    AND p.conference_id = p_conference_id
    GROUP BY p.id, p.conference_id, p.title, p.abstract, p.pdf_url, p.ai_summary,
             p.presentation_type, p.location_id, p.presenter_name, p.presenter_affiliation,
             p.scheduled_at, p.created_at, p.updated_at
    ORDER BY match_count DESC, p.scheduled_at NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_presentations_by_user_interests(UUID, UUID)
IS 'ユーザーの興味タグに基づいてプレゼンテーションを検索。matched_tagsとmatch_countは計算フィールド。';
