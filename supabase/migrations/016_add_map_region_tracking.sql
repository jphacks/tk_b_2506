-- Migration: Add map region tracking for precise location
-- Description: Tracks which specific desk/table (map_region) a participant is at
-- Date: 2025-01-30

-- ============================================
-- 1. Add current_map_region_id to participants table
-- ============================================
-- This stores the participant's CURRENT desk/table location

ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS current_map_region_id UUID REFERENCES public.map_regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participants_current_map_region
ON public.participants(current_map_region_id);

COMMENT ON COLUMN public.participants.current_map_region_id IS 'Current map region (desk/table) where the participant is located';

-- ============================================
-- 2. Update participant_locations table
-- ============================================
-- Change map_region_id from TEXT to UUID and add foreign key

-- First, check if the column exists and is TEXT
DO $$
BEGIN
    -- If column exists as TEXT, drop it
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'participant_locations'
          AND column_name = 'map_region_id'
          AND data_type = 'text'
    ) THEN
        ALTER TABLE public.participant_locations DROP COLUMN map_region_id;
    END IF;
END $$;

-- Add map_region_id as UUID with foreign key
ALTER TABLE public.participant_locations
ADD COLUMN IF NOT EXISTS map_region_id UUID REFERENCES public.map_regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participant_locations_map_region
ON public.participant_locations(map_region_id);

COMMENT ON COLUMN public.participant_locations.map_region_id IS 'Map region (desk/table) that was scanned at this location';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
    -- Check participants.current_map_region_id
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'participants'
          AND column_name = 'current_map_region_id'
    ) THEN
        RAISE NOTICE 'SUCCESS: current_map_region_id column added to participants table';
    ELSE
        RAISE WARNING 'WARNING: current_map_region_id column not found in participants table';
    END IF;

    -- Check participant_locations.map_region_id
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'participant_locations'
          AND column_name = 'map_region_id'
    ) THEN
        RAISE NOTICE 'SUCCESS: map_region_id column added to participant_locations table';
    ELSE
        RAISE WARNING 'WARNING: map_region_id column not found in participant_locations table';
    END IF;
END $$;
