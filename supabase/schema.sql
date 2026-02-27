create table if not exists public.bookings (
  id text primary key,
  reservation_code text unique not null,
  customer_id text null,
  guest_name text null,
  guest_phone text null,
  driver_id text null,
  pickup_location jsonb not null,
  dropoff_location jsonb not null,
  pickup_time timestamptz not null,
  passenger_count int not null,
  adults int null,
  children int null,
  vehicle_type text not null,
  is_immediate boolean not null default false,
  flight_number text null,
  name_board text null,
  return_trip jsonb null,
  extras jsonb null,
  status text not null,
  base_price numeric not null default 0,
  final_price numeric null,
  payment_status text null,
  payment_method text null,
  paid_at timestamptz null,
  route jsonb null,
  picked_up_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_id_idx on public.bookings (customer_id);
create index if not exists bookings_guest_phone_idx on public.bookings (guest_phone);
create index if not exists bookings_reservation_lookup_idx on public.bookings (guest_phone, reservation_code);
create index if not exists bookings_pickup_time_idx on public.bookings (pickup_time);
create index if not exists bookings_status_idx on public.bookings (status);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Drivers table
create table if not exists public.drivers (
  id text primary key,
  name text not null default 'Sürücü',
  email text,
  phone text,
  address text,
  password_hash text,
  password_salt text,
  vehicle_type text not null default 'sedan',
  vehicle_model text,
  license_plate text,
  docs jsonb,
  location_lat double precision default 0,
  location_lng double precision default 0,
  available boolean default false,
  approved boolean default false,
  rejected_reason text,
  driver_per_km double precision,
  platform_fee_percent double precision,
  custom_pricing boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists drivers_email_idx on public.drivers (email);
create index if not exists drivers_approved_idx on public.drivers (approved);
create index if not exists drivers_available_idx on public.drivers (available);
create index if not exists drivers_location_idx on public.drivers (location_lat, location_lng);

