
-- Add qr_code column to map_regions and remove qr_code from locations
-- Migration: 008_add_qr_code_to_map_regions.sql
-- Description: Adds qr_code to map_regions table and removes qr_code from locations table
-- This allows binding a QR code to a specific region within a location

-- ============================================
-- Add qr_code to map_regions table
-- ============================================

-- Add qr_code column to map_regions if it doesn't exist
ALTER TABLE public.map_regions
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255);

-- Add index for qr_code in map_regions
CREATE INDEX IF NOT EXISTS idx_map_regions_qr_code ON public.map_regions(qr_code);

-- Add check constraint for qr_code in map_regions
-- Note: Need to check if constraint exists first, then add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_map_region_qr_code_not_empty'
  ) THEN
    ALTER TABLE public.map_regions
    ADD CONSTRAINT check_map_region_qr_code_not_empty
    CHECK (qr_code IS NULL OR LENGTH(TRIM(qr_code)) > 0);
  END IF;
END $$;

-- ============================================
-- Remove qr_code from locations table
-- ============================================

-- Drop unique constraint on qr_code in locations
ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_qr_code_key;

ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_conference_id_qr_code_key;

-- Drop index for qr_code in locations
DROP INDEX IF EXISTS idx_locations_qr;

-- Drop check constraint for qr_code in locations
ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS check_qr_code_not_empty;

-- Drop qr_code column from locations
ALTER TABLE public.locations
DROP COLUMN IF EXISTS qr_code;

-- ============================================
-- Update comments
-- ============================================

COMMENT ON COLUMN public.map_regions.qr_code IS 'QR code identifier that can be scanned to identify this specific region within a location';
COMMENT ON TABLE public.locations IS 'Stores locations within conference venues (regions can have QR codes)';
