-- Add phone and address columns to drivers table if they don't exist
-- Run this in Supabase SQL Editor

-- Add phone column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN phone text;
  END IF;
END $$;

-- Add address column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN address text;
  END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
ORDER BY ordinal_position;
