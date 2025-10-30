-- Migration: Create function to get user by email from auth.users
-- Description: Allows secure user lookup by email for LINE authentication
-- Date: 2025-01-30

-- Create function to get user ID by email
CREATE OR REPLACE FUNCTION public.get_user_by_email (
  user_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1
  );
END;
$$;

-- Restrict permissions - only service_role can call this
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM anon, authenticated, public;

-- Grant to service_role (implicit, but explicit is better)
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_user_by_email(TEXT) IS 'Safely retrieves user ID by email from auth.users. Can only be called by service_role.';
