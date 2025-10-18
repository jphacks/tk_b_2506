-- Create user interest and saved presentation tables
-- Migration: 009_create_user_features.sql
-- Description: Creates tables for user interests and saved presentations

-- Create user_interests table
CREATE TABLE IF NOT EXISTS public.user_interests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, tag_id)
);

-- Create saved_presentations table
CREATE TABLE IF NOT EXISTS public.saved_presentations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    notes TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, presentation_id)
);

-- Create indexes for user_interests
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_tag ON public.user_interests(tag_id);

-- Create indexes for saved_presentations
CREATE INDEX IF NOT EXISTS idx_saved_presentations_user ON public.saved_presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_presentations_presentation ON public.saved_presentations(presentation_id);
CREATE INDEX IF NOT EXISTS idx_saved_presentations_saved_at ON public.saved_presentations(saved_at);

-- Add comments for documentation
COMMENT ON TABLE public.user_interests IS 'Stores user topic interests (linked to tags)';
COMMENT ON COLUMN public.user_interests.tag_id IS 'Tag representing the topic of interest';

COMMENT ON TABLE public.saved_presentations IS 'Stores presentations saved by users (primarily for poster sessions)';
COMMENT ON COLUMN public.saved_presentations.notes IS 'User notes about the saved presentation';
COMMENT ON COLUMN public.saved_presentations.saved_at IS 'Timestamp when the presentation was saved';
