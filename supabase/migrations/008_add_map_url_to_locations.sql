-- Add map_url to locations table
-- Migration: 008_add_map_url_to_locations.sql
-- Description: Adds map_url column to locations table for storing map images and deprecates floor/building columns

-- Add map_url column to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS map_url TEXT;

