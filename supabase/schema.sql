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
  type           text not null check (type in ('reminder_24h','reminder_2h','cancel_confirmation','reschedule')),
  channel        text not null default 'demo',   -- 'demo' | 'whatsapp'
  to_phone       text not null,
  message        text not null,
  sent_at        timestamptz not null default now()
);

-- ============================================================
-- Expedientes médicos (pacientes + historial de consultas)
-- ============================================================

create table if not exists patients (
  id                      uuid primary key default gen_random_uuid(),
  first_name              text not null,
  last_name               text not null,
  birth_date              date,
  gender                  text,            -- 'F' | 'M' | 'Otro'
  email                   text,
  phone                   text,
  photo_url               text,            -- opcional
  address                 text,
  blood_type              text,            -- 'O+', 'A-', etc.
  allergies               text,            -- alergias conocidas
  chronic_conditions      text,            -- enfermedades crónicas
  current_medications     text,            -- medicamentos actuales
  emergency_contact_name  text,
  emergency_contact_phone text,
  notes                   text,            -- notas generales del expediente
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_patients_last_name on patients (last_name);
create index if not exists idx_patients_first_name on patients (first_name);

-- Entradas del expediente: una por consulta/visita.
create table if not exists medical_records (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  visit_date      date not null default current_date,
  reason          text,            -- motivo de la consulta
  diagnosis       text,            -- diagnóstico
  weight_kg       numeric,         -- peso (kg)
  height_cm       numeric,         -- estatura (cm)
  blood_pressure  text,            -- presión arterial, ej. '120/80'
  observations    text,            -- observaciones del doctor
  recommendations text,            -- recomendaciones médicas
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_records_patient on medical_records (patient_id, visit_date desc, created_at desc);

-- RLS: el acceso se hace solo desde el servidor con service_role,
-- así que bloqueamos el acceso anónimo por completo.
alter table appointments enable row level security;
alter table notifications_log enable row level security;
alter table patients enable row level security;
alter table medical_records enable row level security;

-- Almacenamiento de fotos de pacientes:
-- el bucket 'patient-photos' (público) se crea automáticamente desde la API
-- la primera vez que se sube una foto. No requiere configuración manual.

-- ── Migración para bases ya creadas ────────────────────────
-- Si la tabla notifications_log ya existía, ejecuta esto para
-- permitir el nuevo tipo de notificación de reprogramación:
--
--   alter table notifications_log drop constraint if exists notifications_log_type_check;
--   alter table notifications_log add constraint notifications_log_type_check
--     check (type in ('reminder_24h','reminder_2h','cancel_confirmation','reschedule'));
