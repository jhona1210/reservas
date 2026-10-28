-- =====================================================================
--  Book with Salomé — Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
--  Es idempotente: se puede ejecutar varias veces sin romper nada, y
--  también adapta una tabla `bookings` creada previamente (sin borrar datos).
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
  notes         text
);

-- 1b) Adaptar una tabla existente -------------------------------------
--     Si `bookings` ya existía (p. ej. con booking_time como text), se
--     agregan las columnas faltantes y se convierten los tipos.
alter table public.bookings add column if not exists created_at   timestamptz not null default now();
alter table public.bookings add column if not exists guest_name   text;
alter table public.bookings add column if not exists guest_email  text;
alter table public.bookings add column if not exists booking_date date;
alter table public.bookings add column if not exists booking_time time;
alter table public.bookings add column if not exists meeting_type text;
alter table public.bookings add column if not exists notes        text;

do $$
begin
  -- booking_date → date
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'bookings' and column_name = 'booking_date') <> 'date' then
    alter table public.bookings alter column booking_date type date using booking_date::date;
  end if;

  -- booking_time → time  (acepta '15:00', '15:00:00' o '03:00 PM')
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'bookings' and column_name = 'booking_time') <> 'time without time zone' then
    alter table public.bookings alter column booking_time type time using booking_time::time;
  end if;

  -- Columnas heredadas que no usa esta app (p. ej. `status`): si son NOT NULL
  -- sin valor por defecto, bloquearían los inserts. Se vuelven opcionales.
  declare
    col record;
  begin
    for col in
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bookings'
        and is_nullable = 'NO'
        and column_default is null
        and column_name not in ('id', 'created_at', 'guest_name', 'guest_email',
                                'booking_date', 'booking_time', 'meeting_type', 'notes')
    loop
      execute format('alter table public.bookings alter column %I drop not null', col.column_name);
    end loop;
  end;
end $$;

alter table public.bookings alter column guest_name   set not null;
alter table public.bookings alter column guest_email  set not null;
alter table public.bookings alter column booking_date set not null;
alter table public.bookings alter column booking_time set not null;
alter table public.bookings alter column meeting_type set not null;

-- 1c) Restricciones (se crean solo si no existen) ----------------------
--     Los CHECK se agregan como NOT VALID: se aplican a reservas nuevas
--     sin fallar por datos de prueba antiguos.
do $$
begin
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

  -- 🔒 Anti doble-reserva: un solo registro por bloque fecha + hora.
  --    Si dos personas confirman a la vez, PostgreSQL rechaza la segunda (código 23505).
  if not exists (select 1 from pg_constraint where conname = 'bookings_unique_slot') then
    alter table public.bookings add constraint bookings_unique_slot unique (booking_date, booking_time);
  end if;
end $$;

comment on table public.bookings is 'Reservas de citas con Salomé (Book with Salomé).';

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
  order by 1;
$$;

revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

-- Refresca la caché de esquema de la API (PostgREST) para que vea los cambios.
notify pgrst, 'reload schema';
