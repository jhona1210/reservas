-- =====================================================================
--  Book with Salomé — Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--  Es idempotente: se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- 1) Tabla de reservas ------------------------------------------------
create table if not exists public.bookings (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  guest_name    text        not null,
  guest_email   text        not null,
  booking_date  date        not null,
  booking_time  time        not null,
  meeting_type  text        not null,
  notes         text,

  constraint bookings_guest_name_len  check (char_length(guest_name) between 3 and 100),
  constraint bookings_guest_email_fmt check (
    char_length(guest_email) <= 254
    and guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint bookings_meeting_type_chk check (meeting_type in ('coffee', 'focus', 'express', 'gossip')),
  constraint bookings_time_slot_chk    check (booking_time in ('10:00', '11:30', '15:00', '16:30')),
  constraint bookings_notes_len        check (notes is null or char_length(notes) <= 500),

  -- 🔒 Anti doble-reserva: un solo registro por bloque fecha + hora.
  --    Si dos personas confirman a la vez, PostgreSQL rechaza la segunda (código 23505).
  constraint bookings_unique_slot unique (booking_date, booking_time)
);

comment on table public.bookings is 'Reservas de citas con Salomé (Book with Salomé).';

create index if not exists bookings_booking_date_idx on public.bookings (booking_date);

-- 2) Row Level Security ----------------------------------------------
alter table public.bookings enable row level security;

-- Permisos a nivel de tabla: anon solo puede insertar (nada de select/update/delete).
revoke all on table public.bookings from anon;
grant insert on table public.bookings to anon, authenticated;

-- Política: cualquiera (anon) puede crear una reserva, pero solo para hoy o fechas futuras
-- (en hora de Colombia). La validación fina (hora futura, formato) la hace la Server Action.
drop policy if exists "Public can create bookings" on public.bookings;
create policy "Public can create bookings"
  on public.bookings
  for insert
  to anon, authenticated
  with check (
    booking_date >= (now() at time zone 'America/Bogota')::date
    and booking_date <= (now() at time zone 'America/Bogota')::date + 60
  );

-- ⚠️ No se crea política de SELECT a propósito: así nadie puede leer
--    nombres, correos ni notas de otras personas usando la anon key.
--    Salomé puede ver todo desde el Dashboard (usa el rol service_role / postgres).

-- 3) Horarios ocupados (sin exponer datos personales) ------------------
--    Función SECURITY DEFINER: corre con permisos del dueño, pero SOLO
--    devuelve las horas ocupadas de una fecha, nada más.
create or replace function public.get_booked_slots(p_date date)
returns table (booking_time time)
language sql
stable
security definer
set search_path = public
as $$
  select b.booking_time
  from public.bookings b
  where b.booking_date = p_date
  order by b.booking_time;
$$;

revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

