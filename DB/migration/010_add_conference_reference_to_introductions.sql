-- Add conference reference to introductions and seed default conference
-- Migration: 010_add_conference_reference_to_introductions.sql
-- Description: Links introductions to conferences and seeds a default conference record

-- Seed a default conference that can be used by the application
INSERT INTO public.conferences (
    id,
    name,
    description,
    start_date,
    end_date,
    location,
    is_active
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Main Conference',
    'Default conference seeded for initial application setup',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '2 days',
    'TBD',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Add conference_id column to introductions if it does not exist
ALTER TABLE public.introductions
ADD COLUMN IF NOT EXISTS conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE;

-- Populate conference_id for existing rows if missing
UPDATE public.introductions
SET conference_id = '11111111-1111-1111-1111-111111111111'
WHERE conference_id IS NULL;

-- Create an index for conference_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_introductions_conference ON public.introductions(conference_id);

-- Add documentation
COMMENT ON COLUMN public.introductions.conference_id IS 'Linked conference for this introduction';
