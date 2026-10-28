# Book with Salomé ☕💻⚡🗣️

Aplicación web para reservar citas con Salomé. Hecha con **Next.js 15 (App Router)**, **Tailwind CSS v4**, **Lucide Icons** y **Supabase**.

## Funcionalidades

- Selector de tipo de reunión (café, sesión de estudio, charla express, chisme).
- Calendario visual: solo días futuros y dentro de los próximos 60 días.
- Grid de horarios (10:00 AM, 11:30 AM, 03:00 PM, 04:30 PM): oculta horarios pasados y ocupados.
- Formulario validado con **zod** (en el cliente y otra vez en el servidor).
- Server Action que inserta en Supabase. Una restricción `UNIQUE (booking_date, booking_time)` evita la doble reserva.
- Modal de éxito con enlace para guardar el evento en **Google Calendar**.
- Todos los horarios usan la zona horaria **America/Bogota**.

## Estructura

```
app/
  actions/booking.ts        # Server Actions: createBooking, getBookedSlots
  globals.css               # Tailwind v4 + animaciones
  layout.tsx                # Fuentes y metadatos
  page.tsx                  # Hero + formulario
components/booking/
  BookingForm.tsx           # Componente principal (estado, validación, envío)
  MeetingTypeSelector.tsx
  DatePicker.tsx
  TimeSlotGrid.tsx
  SuccessModal.tsx
lib/
  constants.ts              # Tipos de reunión, horarios, zona horaria
  date.ts                   # Utilidades de fecha (independientes del huso horario)
  validation.ts             # Esquema zod compartido
  calendar.ts               # Generador de enlaces de Google Calendar
  supabase.ts               # Cliente de Supabase (solo servidor)
supabase/schema.sql         # Tabla, RLS y función RPC
```

## Puesta en marcha

1. **Supabase:** abre el SQL Editor de tu proyecto y ejecuta `supabase/schema.sql`.
2. **Variables de entorno:** copia `.env.example` a `.env.local` y complétalo:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-publishable-o-anon-key
   ```
   La URL es la base del proyecto (**sin** `/rest/v1/`).
3. **Instalación y desarrollo:**
   ```bash
   npm install
   npm run dev
   ```
   Abre http://localhost:3000.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en *Settings → Environment Variables*.
3. Despliega.

## Seguridad

- RLS activado: `anon` solo puede **insertar** reservas (para hoy o fechas futuras).
- No hay política de `SELECT`: nadie puede leer nombres, correos ni notas con la anon key.
- Los horarios ocupados se consultan con la función `get_booked_slots(date)`, que solo devuelve horas.
- Salomé ve las reservas desde el panel de Supabase (Table Editor).
