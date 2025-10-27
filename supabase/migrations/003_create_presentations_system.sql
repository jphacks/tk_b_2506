-- Create presentations and tags system
-- Migration: 003_create_presentations_system.sql
-- Description: Creates tables for managing presentations, abstracts, AI summaries, and tags

-- ============================================
-- Table Creation
-- ============================================

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_tag_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Create presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    pdf_url TEXT,
    ai_summary TEXT,
    presentation_type VARCHAR(50) NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    presenter_name VARCHAR(255),
    presenter_affiliation VARCHAR(500),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_presentation_type CHECK (presentation_type IN ('oral', 'poster')),
    CONSTRAINT check_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Create presentation_tags junction table
CREATE TABLE IF NOT EXISTS public.presentation_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(presentation_id, tag_id)
);

-- ============================================
-- Indexes
-- ============================================

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);

-- Indexes for presentations
CREATE INDEX IF NOT EXISTS idx_presentations_conference ON public.presentations(conference_id);
CREATE INDEX IF NOT EXISTS idx_presentations_type ON public.presentations(presentation_type);
CREATE INDEX IF NOT EXISTS idx_presentations_scheduled ON public.presentations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_presentations_location ON public.presentations(location_id);

-- Full-text search indexes for presentations
CREATE INDEX IF NOT EXISTS idx_presentations_title_fts
ON public.presentations USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_presentations_abstract_fts
ON public.presentations USING gin(to_tsvector('english', COALESCE(abstract, '')));

-- Indexes for presentation_tags
CREATE INDEX IF NOT EXISTS idx_presentation_tags_presentation ON public.presentation_tags(presentation_id);
CREATE INDEX IF NOT EXISTS idx_presentation_tags_tag ON public.presentation_tags(tag_id);

-- ============================================
-- Triggers
-- ============================================

-- Create trigger for presentations updated_at
CREATE TRIGGER update_presentations_updated_at
    BEFORE UPDATE ON public.presentations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Documentation
-- ============================================

-- Table comments
COMMENT ON TABLE public.tags IS 'Stores tags for categorizing presentations';
COMMENT ON COLUMN public.tags.name IS 'Tag name (unique)';

COMMENT ON TABLE public.presentations IS 'Stores presentation/abstract information';
COMMENT ON COLUMN public.presentations.abstract IS 'Original abstract text extracted from PDF';
COMMENT ON COLUMN public.presentations.pdf_url IS 'URL to the abstract PDF file';
COMMENT ON COLUMN public.presentations.ai_summary IS 'AI-generated summary of the abstract';
COMMENT ON COLUMN public.presentations.presentation_type IS 'Type of presentation: oral or poster';

COMMENT ON TABLE public.presentation_tags IS 'Junction table linking presentations to tags';
