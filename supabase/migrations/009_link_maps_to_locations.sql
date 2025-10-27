-- Link maps directly to locations and simplify map_regions
-- Migration: 009_link_maps_to_locations.sql
-- Description: Adds a location reference to maps (one map per location) and removes the location dependency from map_regions.

-- ============================================
-- Add location reference to maps
-- ============================================

ALTER TABLE public.maps
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.maps.location_id IS 'Location that this map represents (one map per location).';

-- Backfill location_id using existing map_regions relationships if available
WITH ranked_locations AS (
    SELECT
        map_id,
        location_id,
        ROW_NUMBER() OVER (
            PARTITION BY map_id
            ORDER BY updated_at DESC NULLS LAST,
                     created_at DESC NULLS LAST,
                     id DESC
        ) AS rn
    FROM public.map_regions
    WHERE location_id IS NOT NULL
)
UPDATE public.maps AS m
SET location_id = rl.location_id
FROM ranked_locations AS rl
WHERE m.id = rl.map_id
  AND m.location_id IS NULL
  AND rl.rn = 1;

-- Enforce single map per location (allowing multiple maps only when location_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_maps_location_unique
ON public.maps(location_id)
WHERE location_id IS NOT NULL;

-- Ensure the referenced location matches the map conference
CREATE OR REPLACE FUNCTION public.ensure_map_location_same_conference()
RETURNS TRIGGER AS $$
DECLARE
    loc_conf UUID;
BEGIN
    IF NEW.location_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT conference_id INTO loc_conf FROM public.locations WHERE id = NEW.location_id;

    IF loc_conf IS NULL THEN
        RAISE EXCEPTION 'Referenced location (id=%) does not exist', NEW.location_id;
    END IF;

    IF NEW.conference_id <> loc_conf THEN
        RAISE EXCEPTION 'maps.conference_id (%) must match locations.conference_id (%)', NEW.conference_id, loc_conf;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maps_location_conference_check ON public.maps;

CREATE TRIGGER trg_maps_location_conference_check
    BEFORE INSERT OR UPDATE ON public.maps
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_map_location_same_conference();

-- ============================================
-- Simplify map_regions (remove location dependency)
-- ============================================

ALTER TABLE public.map_regions
DROP CONSTRAINT IF EXISTS map_regions_location_id_fkey;

ALTER TABLE public.map_regions
DROP COLUMN IF EXISTS location_id;

DROP INDEX IF EXISTS idx_map_regions_location;

COMMENT ON TABLE public.map_regions IS 'Defines interactive regions within a map (linked via map_id).';
