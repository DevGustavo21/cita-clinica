-- ============================================================
-- Clínica Citas — Schema Supabase
-- Pegar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists appointments (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  age           int  not null check (age > 0 and age < 120),
  guardian_name text,                          -- obligatorio si age < 18 (validado en API)
  phone         text not null,
  email         text not null,
  date          date not null,
  time          time not null,
  status        text not null default 'scheduled'
                check (status in ('scheduled','cancelled','completed')),
  cancel_token  uuid not null default gen_random_uuid(),
  reminder_24h_sent_at timestamptz,
  reminder_2h_sent_at  timestamptz,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ★ Regla de oro: solo UNA cita activa por (día, hora).
--   Si dos personas intentan reservar el mismo slot a la vez,
--   la segunda inserción falla a nivel de base de datos.
create unique index if not exists uniq_active_slot
  on appointments (date, time)
  where status = 'scheduled';

create index if not exists idx_appointments_date on appointments (date);
create index if not exists idx_appointments_phone on appointments (phone);

-- Registro de toda notificación enviada (también sirve como "modo demo"
-- cuando no hay credenciales de Twilio configuradas).
create table if not exists notifications_log (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  type           text not null check (type in ('reminder_24h','reminder_2h','cancel_confirmation')),
  channel        text not null default 'demo',   -- 'demo' | 'whatsapp'
  to_phone       text not null,
  message        text not null,
  sent_at        timestamptz not null default now()
);

-- RLS: el acceso se hace solo desde el servidor con service_role,
-- así que bloqueamos el acceso anónimo por completo.
alter table appointments enable row level security;
alter table notifications_log enable row level security;
