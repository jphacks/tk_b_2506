-- Create helper functions for conference and presentation features
-- Migration: 006_create_helper_functions.sql
-- Description: Creates functions for participant directory and presentation search

-- ============================================
-- Conference Participant Directory Function
-- ============================================

-- Provides a secure directory view of conference participants without relaxing introductions RLS
CREATE OR REPLACE FUNCTION public.get_conference_participant_directory(p_conference_id UUID)
RETURNS TABLE (
    participant_id UUID,
    user_id UUID,
    conference_id UUID,
    introduction_id UUID,
    current_location_id UUID,
    display_name TEXT,
    affiliation TEXT,
    introduction_summary TEXT,
    location JSONB,
    registered_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;

    -- Check if user is registered for this conference
    IF NOT EXISTS (
        SELECT 1
        FROM participants
        WHERE conference_id = p_conference_id
          AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'not registered for this conference';
    END IF;

    -- Return participant directory
    RETURN QUERY
    SELECT
        p.id AS participant_id,
        p.user_id,
        p.conference_id,
        p.introduction_id,
        p.current_location_id,
        COALESCE(i.name, '匿名参加者') AS display_name,
        COALESCE(i.affiliation, '所属未設定') AS affiliation,
        COALESCE(i.one_liner, i.research_topic, i.interests) AS introduction_summary,
        CASE WHEN l.id IS NOT NULL THEN
            jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'floor', l.floor,
                'building', l.building,
                'location_type', l.location_type
            )
        ELSE NULL END AS location,
        p.registered_at,
        p.updated_at
    FROM participants p
    LEFT JOIN introductions i
        ON i.id = p.introduction_id
    LEFT JOIN locations l
        ON l.id = p.current_location_id
    WHERE p.conference_id = p_conference_id;
END;
$$;

-- ============================================
-- Presentation Search by User Interests Function
-- ============================================

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
)
LANGUAGE plpgsql
AS $$
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
        ARRAY_AGG(DISTINCT t.name)::TEXT[] AS matched_tags,
        COUNT(DISTINCT t.id) AS match_count
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
$$;

-- ============================================
-- Permissions
-- ============================================

-- Grant permissions for participant directory function
REVOKE ALL ON FUNCTION public.get_conference_participant_directory(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_conference_participant_directory(UUID) TO authenticated;

-- ============================================
-- Documentation
-- ============================================

COMMENT ON FUNCTION public.get_conference_participant_directory(UUID)
IS 'Returns a directory of all participants in a conference. Only accessible to authenticated users who are registered for the conference.';

COMMENT ON FUNCTION search_presentations_by_user_interests(UUID, UUID)
IS 'ユーザーの興味タグに基づいてプレゼンテーションを検索。matched_tagsとmatch_countは計算フィールド。';
