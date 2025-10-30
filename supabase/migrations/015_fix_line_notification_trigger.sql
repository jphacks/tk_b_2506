-- Migration: Fix LINE notification trigger
-- Description: Fixes the JSON format issue in the LINE notification trigger
-- Date: 2025-01-30

-- 1. Drop and recreate the function with fixed JSON format
CREATE OR REPLACE FUNCTION notify_line_meet_request()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    message_text TEXT;
    line_user_id TEXT;
    headers_json jsonb;
    body_json jsonb;
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

        -- Build headers
        headers_json := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        );

        -- Build body
        body_json := jsonb_build_object(
            'userId', line_user_id,
            'message', message_text,
            'type', 'meet_request'
        );

        -- Call Edge Function to send LINE notification
        PERFORM net.http_post(
            url := 'https://cqudhplophskbgzepoti.supabase.co/functions/v1/send-line-notification',
            headers := headers_json,
            body := body_json::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: LINE notification trigger fixed';
END $$;
