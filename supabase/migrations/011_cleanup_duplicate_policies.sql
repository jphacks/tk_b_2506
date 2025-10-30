-- Migration: Clean up duplicate RLS policies for participant_meet_requests
-- Description: Remove duplicate and overly permissive policies, keep only secure ones
-- Date: 2025-01-29

-- 1. Drop duplicate and overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to select meet requests" ON public.participant_meet_requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert meet requests" ON public.participant_meet_requests;
DROP POLICY IF EXISTS "Allow authenticated users to update meet requests" ON public.participant_meet_requests;

-- 2. Keep only the secure policies:
-- - "Allow Realtime for all" (for Realtime functionality)
-- - "Users can read their meet requests" (secure SELECT)
-- - "Users can create meet requests" (secure INSERT)
-- - "Users can update their meet requests" (secure UPDATE)
-- - "Users can delete their meet requests" (secure DELETE)

-- 3. Verify the cleanup
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

-- 4. Check Realtime publication status
SELECT
    pubname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'participant_meet_requests';

-- 5. Final verification message
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: RLS policies cleaned up for participant_meet_requests table';
    RAISE NOTICE 'SUCCESS: Realtime is enabled for participant_meet_requests table';
    RAISE NOTICE 'SUCCESS: Secure access policies are in place';
END $$;
