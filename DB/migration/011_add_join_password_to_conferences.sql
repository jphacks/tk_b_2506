-- Add join_password column to conferences table
-- Migration: 011_add_join_password_to_conferences.sql
-- Description: Adds join_password column for conference access control

-- Add join_password column
ALTER TABLE public.conferences
ADD COLUMN IF NOT EXISTS join_password VARCHAR(255);

-- Add index for join_password lookups (optional but useful)
CREATE INDEX IF NOT EXISTS idx_conferences_join_password
ON public.conferences(join_password)
WHERE join_password IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.conferences.join_password
IS 'Password required to join this conference. Only conference creators/admins know this password. NULL means no password required.';
