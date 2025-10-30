-- Migration: Remove unique constraint from participant_meet_requests
-- Description: Removes the unique constraint to allow multiple meet requests between the same participants
-- Date: 2025-01-30

-- 1. Drop the unique constraint that prevents multiple requests between same participants
ALTER TABLE public.participant_meet_requests
DROP CONSTRAINT IF EXISTS participant_meet_requests_conference_id_from_participant_id_to_participant_id_key;

-- 2. Add a new index for better query performance (without uniqueness constraint)
CREATE INDEX IF NOT EXISTS idx_participant_meet_requests_participants
ON public.participant_meet_requests (conference_id, from_participant_id, to_participant_id, created_at DESC);

-- 3. Verify the constraint was removed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'participant_meet_requests'
          AND constraint_name = 'participant_meet_requests_conference_id_from_participant_id_to_participant_id_key'
    ) THEN
        RAISE NOTICE 'SUCCESS: Unique constraint removed from participant_meet_requests table';
    ELSE
        RAISE WARNING 'WARNING: Unique constraint still exists in participant_meet_requests table';
    END IF;
END $$;
