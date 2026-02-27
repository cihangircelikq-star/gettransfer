-- ═══════════════════════════════════════════════════════════════════════════
-- ÖDEME SİSTEMİ TABLOLARI - GetTransfer
-- ═══════════════════════════════════════════════════════════════════════════

-- Ödemeler tablosu
create table if not exists public.payments (
  id text primary key,
  booking_id text not null references public.bookings(id) on delete cascade,
  
  -- Ödeme bilgileri
  amount numeric not null,
  currency text not null default 'TRY',
  method text not null, -- 'cash', 'qr_turinvoice', 'card' (yakında)
  
  -- Durum
  status text not null default 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Şoför bilgileri
  driver_id text not null,
  driver_received_at timestamptz, -- Şoför ödemeyi ne zaman aldı
  
  -- Müşteri bilgileri
  customer_id text,
  guest_name text,
  guest_phone text,
  
  -- QR Kod (Turinvoice) için
  qr_code_id text, -- Turinvoice'dan gelen QR ID
  qr_code_url text, -- QR kod URL'si
  qr_expires_at timestamptz, -- QR kod son kullanma tarihi
  turinvoice_payment_id text, -- Turinvoice ödeme ID
  turinvoice_response jsonb, -- Turinvoice'dan gelen tam yanıt
  
  -- Kart ödemesi için (gelecek)
  stripe_payment_intent_id text,
  stripe_response jsonb,
  
  -- Muhasebe
  platform_fee numeric default 0, -- Platform komisyonu
  driver_earning numeric, -- Şoför kazancı
  recorded_in_accounting boolean default false, -- Muhasebeye kaydedildi mi
  
  -- Zaman damgaları
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists payments_booking_id_idx on public.payments (booking_id);
create index if not exists payments_driver_id_idx on public.payments (driver_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists payments_method_idx on public.payments (method);
create index if not exists payments_created_at_idx on public.payments (created_at);

-- Muhasebe kayıtları tablosu
create table if not exists public.accounting (
  id text primary key,
  payment_id text references public.payments(id) on delete set null,
  booking_id text references public.bookings(id) on delete set null,
  
  -- İşlem türü
  type text not null, -- 'income', 'expense', 'refund', 'commission'
  
  -- Tutarlar
  gross_amount numeric not null, -- Brüt tutar
  platform_fee numeric default 0, -- Platform komisyonu
  net_amount numeric not null, -- Net tutar (şoföre kalan)
  currency text not null default 'TRY',
  
  -- Taraflar
  driver_id text,
  customer_id text,
  
  -- Açıklama
  description text,
  metadata jsonb,
  
  -- Zaman
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists accounting_driver_id_idx on public.accounting (driver_id);
create index if not exists accounting_type_idx on public.accounting (type);
create index if not exists accounting_date_idx on public.accounting (transaction_date);
create index if not exists accounting_payment_id_idx on public.accounting (payment_id);

-- Şoför ödeme yöntemleri ayarları
create table if not exists public.driver_payment_settings (
  driver_id text primary key references public.drivers(id) on delete cascade,
  
  -- Aktif ödeme yöntemleri
  accept_cash boolean default true,
  accept_qr_turinvoice boolean default true,
  accept_card boolean default false, -- Gelecekte aktif edilecek
  
  -- Turinvoice hesap bilgileri
  turinvoice_account_id text,
  turinvoice_merchant_id text,
  turinvoice_verified boolean default false,
  
  -- Zaman damgaları
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ödeme işlem logları (audit için)
create table if not exists public.payment_logs (
  id text primary key,
  payment_id text references public.payments(id) on delete cascade,
  
  action text not null, -- 'created', 'qr_generated', 'qr_scanned', 'completed', 'failed', 'refunded'
  old_status text,
  new_status text,
  
  details jsonb,
  ip_address text,
  user_agent text,
  
  created_at timestamptz not null default now()
);

create index if not exists payment_logs_payment_id_idx on public.payment_logs (payment_id);
create index if not exists payment_logs_created_at_idx on public.payment_logs (created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- Şoför günlük kazanç görünümü
create or replace view driver_daily_earnings as
select 
  driver_id,
  date(completed_at) as earning_date,
  count(*) as total_rides,
  sum(amount) as total_earnings,
  sum(platform_fee) as total_fees,
  sum(driver_earning) as net_earnings,
  sum(case when method = 'cash' then amount else 0 end) as cash_earnings,
  sum(case when method = 'qr_turinvoice' then amount else 0 end) as qr_earnings
from public.payments
where status = 'completed'
group by driver_id, date(completed_at);

-- Ödeme özeti görünümü
create or replace view payment_summary as
select 
  p.id,
  p.booking_id,
  p.amount,
  p.currency,
  p.method,
  p.status,
  p.driver_id,
  d.name as driver_name,
  b.pickup_location,
  b.dropoff_location,
  b.pickup_time,
  p.created_at,
  p.completed_at
from public.payments p
left join public.drivers d on d.id = p.driver_id
left join public.bookings b on b.id = p.booking_id;
