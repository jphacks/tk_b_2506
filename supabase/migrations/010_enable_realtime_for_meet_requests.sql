-- Migration: Enable Realtime for participant_meet_requests table
-- Description: This migration enables Supabase Realtime for the participant_meet_requests table
-- Date: 2025-01-29

-- 1. Enable Row Level Security (RLS) for participant_meet_requests table
ALTER TABLE public.participant_meet_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.participant_meet_requests;
DROP POLICY IF EXISTS "Users can create meet requests" ON public.participant_meet_requests;
DROP POLICY IF EXISTS "Users can update their own meet requests" ON public.participant_meet_requests;
DROP POLICY IF EXISTS "Users can delete their own meet requests" ON public.participant_meet_requests;

-- 3. Create comprehensive RLS policies for participant_meet_requests
-- Policy 1: Allow authenticated users to read meet requests where they are sender or receiver
CREATE POLICY "Users can read their meet requests" ON public.participant_meet_requests
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT p.user_id
            FROM public.participants p
            WHERE p.id = participant_meet_requests.from_participant_id
               OR p.id = participant_meet_requests.to_participant_id
        )
    );

-- Policy 2: Allow authenticated users to create meet requests
CREATE POLICY "Users can create meet requests" ON public.participant_meet_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (
            SELECT p.user_id
            FROM public.participants p
            WHERE p.id = participant_meet_requests.from_participant_id
        )
    );

-- Policy 3: Allow authenticated users to update their own meet requests
CREATE POLICY "Users can update their meet requests" ON public.participant_meet_requests
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT p.user_id
            FROM public.participants p
            WHERE p.id = participant_meet_requests.from_participant_id
               OR p.id = participant_meet_requests.to_participant_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT p.user_id
            FROM public.participants p
            WHERE p.id = participant_meet_requests.from_participant_id
               OR p.id = participant_meet_requests.to_participant_id
        )
    );

-- Policy 4: Allow authenticated users to delete their own meet requests
CREATE POLICY "Users can delete their meet requests" ON public.participant_meet_requests
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT p.user_id
            FROM public.participants p
            WHERE p.id = participant_meet_requests.from_participant_id
               OR p.id = participant_meet_requests.to_participant_id
        )
    );

-- 4. Add participant_meet_requests table to Supabase Realtime publication
-- This enables real-time updates for the table
-- Check if table is already in publication before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'participant_meet_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_meet_requests;
        RAISE NOTICE 'SUCCESS: participant_meet_requests table added to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'INFO: participant_meet_requests table is already in supabase_realtime publication';
    END IF;
END $$;

-- 5. Verify the setup
-- Check if the table is added to the publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'participant_meet_requests'
    ) THEN
        RAISE NOTICE 'SUCCESS: participant_meet_requests table added to supabase_realtime publication';
    ELSE
        RAISE WARNING 'WARNING: participant_meet_requests table not found in supabase_realtime publication';
    END IF;
END $$;

-- 6. Check RLS status
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = 'participant_meet_requests'
          AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'SUCCESS: Row Level Security is enabled for participant_meet_requests table';
    ELSE
        RAISE WARNING 'WARNING: Row Level Security is not enabled for participant_meet_requests table';
    END IF;
END $$;

-- 7. Display current policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'participant_meet_requests'
ORDER BY policyname;
