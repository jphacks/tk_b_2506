-- Create introductions table for conference self-introductions
-- Migration: 001_create_introductions_table.sql
-- Description: Creates the main table for storing conference self-introductions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the introductions table
CREATE TABLE IF NOT EXISTS public.introductions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    affiliation VARCHAR(500),
    research_topic VARCHAR(500),
    interests TEXT,
    one_liner VARCHAR(120),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_introductions_created_by ON public.introductions(created_by);
CREATE INDEX IF NOT EXISTS idx_introductions_is_public ON public.introductions(is_public);
CREATE INDEX IF NOT EXISTS idx_introductions_created_at ON public.introductions(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_introductions_updated_at
    BEFORE UPDATE ON public.introductions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.introductions IS 'Stores conference self-introduction data';
COMMENT ON COLUMN public.introductions.id IS 'Unique identifier for the introduction';
COMMENT ON COLUMN public.introductions.name IS 'Display name for the conference (required)';
COMMENT ON COLUMN public.introductions.affiliation IS 'University, company, or research institution';
COMMENT ON COLUMN public.introductions.research_topic IS 'Current research field or topic';
COMMENT ON COLUMN public.introductions.interests IS 'Research interests (comma-separated)';
COMMENT ON COLUMN public.introductions.one_liner IS 'Short message to other participants (max 120 chars)';
COMMENT ON COLUMN public.introductions.is_public IS 'Whether the introduction is visible to other participants';
COMMENT ON COLUMN public.introductions.created_by IS 'User who created this introduction';
