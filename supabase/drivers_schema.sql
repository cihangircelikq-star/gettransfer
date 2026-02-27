-- Drivers table schema for Supabase
-- Run this in Supabase SQL Editor if the table doesn't exist

-- Create drivers table if not exists
CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Sürücü',
  email TEXT,
  phone TEXT,
  address TEXT,
  password_hash TEXT,
  password_salt TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'sedan',
  vehicle_model TEXT,
  license_plate TEXT,
  docs JSONB,
  location_lat DOUBLE PRECISION DEFAULT 0,
  location_lng DOUBLE PRECISION DEFAULT 0,
  available BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  rejected_reason TEXT,
  driver_per_km DOUBLE PRECISION,
  platform_fee_percent DOUBLE PRECISION,
  custom_pricing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS drivers_email_idx ON public.drivers (email);
CREATE INDEX IF NOT EXISTS drivers_approved_idx ON public.drivers (approved);
CREATE INDEX IF NOT EXISTS drivers_available_idx ON public.drivers (available);
CREATE INDEX IF NOT EXISTS drivers_location_idx ON public.drivers (location_lat, location_lng);

-- Add phone and address columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN address TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'docs'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN docs JSONB;
  END IF;
END $$;

-- Enable RLS (Row Level Security)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can do everything on drivers" ON public.drivers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for anon key (read only for approved drivers)
CREATE POLICY "Anon can view approved drivers" ON public.drivers
  FOR SELECT TO anon
  USING (approved = true);

-- Grant permissions
GRANT ALL ON public.drivers TO service_role;
GRANT SELECT ON public.drivers TO anon;
