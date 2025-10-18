-- Create conferences and locations tables
-- Migration: 006_create_conferences_and_locations.sql
-- Description: Creates tables for conference management and location tracking with QR codes

-- Create conferences table
CREATE TABLE IF NOT EXISTS public.conferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    CONSTRAINT check_conference_dates CHECK (end_date >= start_date),
    CONSTRAINT check_conference_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Create locations table (QR code enabled locations)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    floor VARCHAR(50),
    building VARCHAR(100),
    location_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_location_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT check_qr_code_not_empty CHECK (LENGTH(TRIM(qr_code)) > 0),
    UNIQUE(conference_id, qr_code)
);

-- Create indexes for conferences
CREATE INDEX IF NOT EXISTS idx_conferences_dates ON public.conferences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_conferences_active ON public.conferences(is_active);
CREATE INDEX IF NOT EXISTS idx_conferences_created_by ON public.conferences(created_by);

-- Create indexes for locations
CREATE INDEX IF NOT EXISTS idx_locations_conference ON public.locations(conference_id);
CREATE INDEX IF NOT EXISTS idx_locations_qr ON public.locations(qr_code);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(location_type);

-- Create trigger for conferences updated_at
CREATE TRIGGER update_conferences_updated_at
    BEFORE UPDATE ON public.conferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.conferences IS 'Stores conference/academic event information';
COMMENT ON COLUMN public.conferences.id IS 'Unique identifier for the conference';
COMMENT ON COLUMN public.conferences.name IS 'Name of the conference';
COMMENT ON COLUMN public.conferences.start_date IS 'Conference start date';
COMMENT ON COLUMN public.conferences.end_date IS 'Conference end date';
COMMENT ON COLUMN public.conferences.is_active IS 'Whether the conference is currently active';

COMMENT ON TABLE public.locations IS 'Stores locations within conference venues (QR code enabled)';
COMMENT ON COLUMN public.locations.qr_code IS 'Unique QR code identifier for this location';
COMMENT ON COLUMN public.locations.location_type IS 'Type of location (e.g., hall, poster_area, lobby, restaurant)';
