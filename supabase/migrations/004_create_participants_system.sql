-- Create participants and location tracking system
-- Migration: 004_create_participants_system.sql
-- Description: Creates tables for managing conference participants and their location history via QR scans

-- ============================================
-- Table Creation
-- ============================================

-- Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    introduction_id UUID REFERENCES public.introductions(id) ON DELETE SET NULL,
    current_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, conference_id)
);

-- Create participant_locations table (QR scan history)
CREATE TABLE IF NOT EXISTS public.participant_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participant_meet_requests table for managing meeting requests between participants
CREATE TABLE IF NOT EXISTS public.participant_meet_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE NOT NULL,
    from_participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
    to_participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_meet_req_status CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    CONSTRAINT check_meet_req_self CHECK (from_participant_id != to_participant_id),
    UNIQUE(conference_id, from_participant_id, to_participant_id)
);

-- ============================================
-- Indexes
-- ============================================

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conference ON public.participants(conference_id);
CREATE INDEX IF NOT EXISTS idx_participants_location ON public.participants(current_location_id);
CREATE INDEX IF NOT EXISTS idx_participants_introduction ON public.participants(introduction_id);

-- Indexes for participant_locations
CREATE INDEX IF NOT EXISTS idx_participant_locations_participant ON public.participant_locations(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_locations_location ON public.participant_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_participant_locations_scanned_at ON public.participant_locations(scanned_at);

CREATE INDEX IF NOT EXISTS meet_req_to_idx ON public.participant_meet_requests (to_participant_id, status);
CREATE INDEX IF NOT EXISTS meet_req_from_idx ON public.participant_meet_requests (from_participant_id, status);
CREATE INDEX IF NOT EXISTS meet_req_conf_idx ON public.participant_meet_requests (conference_id);

-- Composite index for location history queries
CREATE INDEX IF NOT EXISTS idx_participant_locations_history
ON public.participant_locations(participant_id, scanned_at DESC);

-- ============================================
-- Triggers
-- ============================================

-- Create trigger for participants updated_at
CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON public.participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for participant_meet_requests updated_at
CREATE TRIGGER update_participant_meet_requests_updated_at
    BEFORE UPDATE ON public.participant_meet_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Documentation
-- ============================================

-- Table comments
COMMENT ON TABLE public.participants IS 'Stores conference participation records linking users to conferences';
COMMENT ON COLUMN public.participants.current_location_id IS 'Current location of the participant (updated via QR scan)';
COMMENT ON COLUMN public.participants.introduction_id IS 'Link to user introduction for this conference';

COMMENT ON TABLE public.participant_locations IS 'Stores QR code scan history for participant location tracking';
COMMENT ON COLUMN public.participant_locations.scanned_at IS 'Timestamp when the QR code was scanned';
