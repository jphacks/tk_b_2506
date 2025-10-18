-- Add occupation fields to introductions table
-- Migration: 004_add_occupation_fields.sql
-- Description: Adds occupation and occupation_other columns to store user occupation information

-- Add occupation column (VARCHAR for predefined options)
ALTER TABLE public.introductions
ADD COLUMN IF NOT EXISTS occupation VARCHAR(50);

-- Add occupation_other column (VARCHAR for custom occupation input)
ALTER TABLE public.introductions
ADD COLUMN IF NOT EXISTS occupation_other VARCHAR(255);

-- Add check constraint for occupation values
ALTER TABLE public.introductions
ADD CONSTRAINT check_occupation_values
CHECK (occupation IN ('学士課程', '修士課程', '博士課程', 'ポスドク', '教員', '研究者', '企業', 'スタッフ', 'その他') OR occupation IS NULL);

-- Add check constraint for occupation_other length
ALTER TABLE public.introductions
ADD CONSTRAINT check_occupation_other_length
CHECK (LENGTH(occupation_other) <= 255);

-- Add index for occupation field for better query performance
CREATE INDEX IF NOT EXISTS idx_introductions_occupation ON public.introductions(occupation);

-- Add comments for documentation
COMMENT ON COLUMN public.introductions.occupation IS 'User occupation category (predefined options)';
COMMENT ON COLUMN public.introductions.occupation_other IS 'Custom occupation description when "その他" is selected';
