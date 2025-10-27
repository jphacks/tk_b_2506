-- Create storage buckets for abstracts and maps
-- Migration: 007_init_storage.sql
-- Description: Initializes storage buckets and RLS policies for public file access

INSERT INTO storage.buckets
    (id, name, public)
VALUES
    ('abstracts', 'abstracts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets
    (id, name, public)
VALUES
    ('maps', 'maps', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "public can select in abstracts and maps" ON storage.objects;
DROP POLICY IF EXISTS "public can insert in abstracts and maps" ON storage.objects;
DROP POLICY IF EXISTS "public can update in abstracts and maps" ON storage.objects;
DROP POLICY IF EXISTS "public can delete in abstracts and maps" ON storage.objects;

-- Create RLS policies for storage objects
CREATE POLICY "public can select in abstracts and maps"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id IN ('abstracts', 'maps'));

CREATE POLICY "public can insert in abstracts and maps"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id IN ('abstracts', 'maps'));

CREATE POLICY "public can update in abstracts and maps"
    ON storage.objects
    FOR UPDATE
    TO public
    USING (bucket_id IN ('abstracts', 'maps'))
    WITH CHECK (bucket_id IN ('abstracts', 'maps'));

CREATE POLICY "public can delete in abstracts and maps"
    ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id IN ('abstracts', 'maps'));