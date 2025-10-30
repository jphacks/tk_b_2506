-- Migration: Add LINE notification trigger for meet requests
-- Description: Adds database trigger to send LINE notifications when meet requests are created
-- Date: 2025-01-30

-- 1. Add LINE user ID column to participants table
ALTER TABLE participants
ADD COLUMN line_user_id TEXT;

-- 2. Add index for LINE user ID
CREATE INDEX IF NOT EXISTS idx_participants_line_user_id
ON participants(line_user_id);

-- 3. Create function to send LINE notification for meet requests
CREATE OR REPLACE FUNCTION notify_line_meet_request()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    message_text TEXT;
    line_user_id TEXT;
BEGIN
    -- Get sender's name
    SELECT
        COALESCE(i.name, i.affiliation, '他の参加者') INTO sender_name
    FROM participants p
    LEFT JOIN introductions i ON p.introduction_id = i.id
    WHERE p.id = NEW.from_participant_id;

    -- Get recipient's LINE user ID
    SELECT p.line_user_id INTO line_user_id
    FROM participants p
    WHERE p.id = NEW.to_participant_id;

    -- Only send notification if LINE user ID exists
    IF line_user_id IS NOT NULL THEN
        -- Build message text
        message_text := '送信者: ' || sender_name || E'\n' ||
                       'メッセージ: ' || COALESCE(NEW.message, 'メッセージをご確認ください。');

        -- Call Edge Function to send LINE notification
        PERFORM net.http_post(
            url := 'https://cqudhplophskbgzepoti.supabase.co/functions/v1/send-line-notification',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
            body := json_build_object(
                'userId', line_user_id,
                'message', message_text,
                'type', 'meet_request'
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for meet request notifications
DROP TRIGGER IF EXISTS trigger_notify_line_meet_request ON participant_meet_requests;
CREATE TRIGGER trigger_notify_line_meet_request
    AFTER INSERT ON participant_meet_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_line_meet_request();

-- 5. Add comment to the new column
COMMENT ON COLUMN participants.line_user_id IS 'LINE user ID for sending notifications via LINE Messaging API';

-- 6. Verify the changes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'participants'
          AND column_name = 'line_user_id'
    ) THEN
        RAISE NOTICE 'SUCCESS: LINE notification trigger added for meet requests';
    ELSE
        RAISE WARNING 'WARNING: LINE user ID column not found in participants table';
    END IF;
END $$;
