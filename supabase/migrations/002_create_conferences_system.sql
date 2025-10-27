-- Create conferences and locations system
-- Migration: 002_create_conferences_system.sql
-- Description: Creates tables for conference management, location tracking with QR codes, and links introductions to conferences

-- ============================================
-- Table Creation
-- ============================================

-- Create conferences table with all fields including join_password
CREATE TABLE IF NOT EXISTS public.conferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(500),
    join_password VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    CONSTRAINT check_conference_dates CHECK (end_date >= start_date),
    CONSTRAINT check_conference_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Create locations table (QR code enabled locations)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    floor VARCHAR(50),
    building VARCHAR(100),
    location_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    map_x FLOAT,
    map_y FLOAT,

    CONSTRAINT check_location_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT check_qr_code_not_empty CHECK (LENGTH(TRIM(qr_code)) > 0),
    UNIQUE(conference_id, qr_code)
);

-- ============================================
-- Indexes
-- ============================================

-- Indexes for conferences
CREATE INDEX IF NOT EXISTS idx_conferences_dates ON public.conferences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_conferences_active ON public.conferences(is_active);
CREATE INDEX IF NOT EXISTS idx_conferences_created_by ON public.conferences(created_by);
CREATE INDEX IF NOT EXISTS idx_conferences_join_password ON public.conferences(join_password) WHERE join_password IS NOT NULL;

-- Indexes for locations
CREATE INDEX IF NOT EXISTS idx_locations_conference ON public.locations(conference_id);
CREATE INDEX IF NOT EXISTS idx_locations_qr ON public.locations(qr_code);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(location_type);

-- ============================================
-- Triggers
-- ============================================

-- Create trigger for conferences updated_at
CREATE TRIGGER update_conferences_updated_at
    BEFORE UPDATE ON public.conferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Link Introductions to Conferences
-- ============================================

-- Seed a default conference for initial application setup
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

-- Add conference_id column to introductions table
ALTER TABLE public.introductions
ADD COLUMN IF NOT EXISTS conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE;

-- Populate conference_id for existing rows if missing
UPDATE public.introductions
SET conference_id = '11111111-1111-1111-1111-111111111111'
WHERE conference_id IS NULL;

-- Create index for conference_id on introductions
CREATE INDEX IF NOT EXISTS idx_introductions_conference ON public.introductions(conference_id);

-- ============================================
-- Documentation
-- ============================================

-- Table comments
COMMENT ON TABLE public.conferences IS 'Stores conference/academic event information';
COMMENT ON COLUMN public.conferences.id IS 'Unique identifier for the conference';
COMMENT ON COLUMN public.conferences.name IS 'Name of the conference';
COMMENT ON COLUMN public.conferences.start_date IS 'Conference start date';
COMMENT ON COLUMN public.conferences.end_date IS 'Conference end date';
COMMENT ON COLUMN public.conferences.join_password IS 'Password required to join this conference. Only conference creators/admins know this password. NULL means no password required.';
COMMENT ON COLUMN public.conferences.is_active IS 'Whether the conference is currently active';

COMMENT ON TABLE public.locations IS 'Stores locations within conference venues (QR code enabled)';
COMMENT ON COLUMN public.locations.qr_code IS 'Unique QR code identifier for this location';
COMMENT ON COLUMN public.locations.location_type IS 'Type of location (e.g., hall, poster_area, lobby, restaurant)';

COMMENT ON COLUMN public.introductions.conference_id IS 'Linked conference for this introduction';
