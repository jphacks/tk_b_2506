-- Migration: Add read status to participant_meet_requests table
-- Description: This migration adds is_read column to track notification read status
-- Date: 2025-01-29

-- 1. Add is_read column to participant_meet_requests table
ALTER TABLE public.participant_meet_requests
ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;

-- 2. Add index for better query performance on read status
CREATE INDEX IF NOT EXISTS idx_participant_meet_requests_read_status
ON public.participant_meet_requests (to_participant_id, is_read, created_at DESC);

-- 3. Update existing records to mark them as unread
UPDATE public.participant_meet_requests
SET is_read = false
WHERE is_read IS NULL;

-- 4. Add comment to the new column
COMMENT ON COLUMN public.participant_meet_requests.is_read IS 'Indicates whether the notification has been read by the recipient';

-- 5. Verify the changes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'participant_meet_requests'
          AND column_name = 'is_read'
    ) THEN
        RAISE NOTICE 'SUCCESS: is_read column added to participant_meet_requests table';
    ELSE
        RAISE WARNING 'WARNING: is_read column not found in participant_meet_requests table';
    END IF;
END $$;
