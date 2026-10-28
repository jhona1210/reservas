-- =====================================================================
--  Book with Salomé — Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--
--  Es idempotente (se puede ejecutar varias veces) y además migra la
--  versión anterior de la tabla `bookings` (booking_time como text,
--  políticas abiertas) SIN borrar datos.
-- =====================================================================

-- 1) Tabla de reservas (instalación nueva) -----------------------------
create table if not exists public.bookings (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  guest_name    text        not null,
  guest_email   text        not null,
  booking_date  date        not null,
  booking_time  time        not null,
  meeting_type  text        not null,
  notes         text,
  status        text        not null    default 'confirmed'
);

comment on table public.bookings is 'Reservas de citas con Salomé (Book with Salomé).';
comment on column public.bookings.status is 'confirmed | cancelled. Cancelar libera el horario.';

-- 2) Migración desde la versión anterior --------------------------------

-- 2a) Quitar la restricción única antigua (se reemplaza en el paso 3).
alter table public.bookings drop constraint if exists unique_booking_slot;
alter table public.bookings drop constraint if exists bookings_unique_slot;

-- 2b) booking_time: text → time  (acepta '15:00', '15:00:00' o '03:00 PM')
do $$
begin
  if (select data_type
        from information_schema.columns
       where table_schema = 'public' and table_name = 'bookings' and column_name = 'booking_time')
     <> 'time without time zone' then
    alter table public.bookings
      alter column booking_time type time using trim(booking_time)::time;
  end if;
end $$;

-- 2c) status: garantizar que exista, tenga default y no sea nulo.
alter table public.bookings add column if not exists status text default 'confirmed';
update public.bookings set status = 'confirmed' where status is null;
alter table public.bookings alter column status set default 'confirmed';
alter table public.bookings alter column status set not null;

-- 3) Restricciones -------------------------------------------------------
--    Los CHECK se agregan como NOT VALID: se aplican a todas las reservas
--    nuevas sin fallar por datos de prueba antiguos.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_status_check') then
    alter table public.bookings add constraint bookings_status_check
      check (status in ('confirmed', 'cancelled')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_guest_name_len') then
    alter table public.bookings add constraint bookings_guest_name_len
      check (char_length(guest_name) between 3 and 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_guest_email_fmt') then
    alter table public.bookings add constraint bookings_guest_email_fmt
      check (char_length(guest_email) <= 254 and guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_meeting_type_chk') then
    alter table public.bookings add constraint bookings_meeting_type_chk
      check (meeting_type in ('coffee', 'focus', 'express', 'gossip')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_time_slot_chk') then
    alter table public.bookings add constraint bookings_time_slot_chk
      check (booking_time in ('10:00', '11:30', '15:00', '16:30')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_notes_len') then
    alter table public.bookings add constraint bookings_notes_len
      check (notes is null or char_length(notes) <= 500) not valid;
  end if;
end $$;

-- 🔒 Anti doble-reserva: un solo registro CONFIRMADO por bloque fecha + hora.
--    Si dos personas confirman a la vez, PostgreSQL rechaza la segunda (código 23505).
--    Al marcar una reserva como 'cancelled', el horario queda libre otra vez.
create unique index if not exists bookings_unique_active_slot
  on public.bookings (booking_date, booking_time)
  where status = 'confirmed';

create index if not exists bookings_booking_date_idx on public.bookings (booking_date);

-- 4) Row Level Security ----------------------------------------------
alter table public.bookings enable row level security;

-- Eliminar políticas antiguas:
--   ⚠️ La de SELECT con using(true) exponía nombres, correos y notas a cualquiera.
--   ⚠️ La de INSERT con check(true) anularía la validación de fechas (las políticas se suman con OR).
drop policy if exists "Permitir inserciones publicas anonimas" on public.bookings;
drop policy if exists "Permitir lectura publica de turnos ocupados" on public.bookings;
drop policy if exists "Public can create bookings" on public.bookings;

-- Permisos a nivel de tabla: anon solo puede insertar (nada de select/update/delete).
revoke all on table public.bookings from anon, authenticated;
grant insert on table public.bookings to anon, authenticated;

-- Política: cualquiera puede crear una reserva confirmada, solo para hoy o
-- los próximos 60 días (hora de Colombia). La validación fina (hora futura,
-- formato) la hace la Server Action.
create policy "Public can create bookings"
  on public.bookings
  for insert
  to anon, authenticated
  with check (
    status = 'confirmed'
    and booking_date >= (now() at time zone 'America/Bogota')::date
    and booking_date <= (now() at time zone 'America/Bogota')::date + 60
  );

-- No hay política de SELECT a propósito: con la anon key nadie puede leer
-- datos personales. Salomé ve todo desde el Dashboard (Table Editor).

-- 5) Horarios ocupados (sin exponer datos personales) ------------------
--    SECURITY DEFINER: corre con permisos del dueño, pero SOLO devuelve
--    las horas confirmadas de una fecha, nada más.
drop function if exists public.get_booked_slots(date);

create function public.get_booked_slots(p_date date)
returns table (booking_time time)
language sql
stable
security definer
set search_path = public
as $$
  select b.booking_time::time
  from public.bookings b
  where b.booking_date = p_date
    and b.status = 'confirmed'
  order by 1;
$$;

revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

-- Refresca la caché de esquema de la API (PostgREST) para que vea los cambios.
notify pgrst, 'reload schema';
