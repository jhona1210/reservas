'use server';

import { getSupabase } from '@/lib/supabase';
import { getNowInTimeZone, isDateBookable, isSlotInFuture, isValidIsoDate } from '@/lib/date';
import {
  bookingSchema,
  getFieldErrors,
  type BookingInput,
  type ConfirmedBooking,
  type FieldErrors,
} from '@/lib/validation';

export type CreateBookingResult =
  | { success: true; booking: ConfirmedBooking }
  | {
      success: false;
      message: string;
      fieldErrors?: FieldErrors;
      /** true si el bloque ya fue tomado por otra persona (para refrescar la UI). */
      slotTaken?: boolean;
    };

/**
 * Crea una reserva en Supabase.
 * 1. Revalida todos los campos en el servidor (zod).
 * 2. Verifica que la fecha/hora sea futura y reservable (hora de Colombia).
 * 3. Inserta; la restricción UNIQUE (booking_date, booking_time) impide la doble reserva
 *    incluso con peticiones simultáneas.
 */
export async function createBooking(input: BookingInput): Promise<CreateBookingResult> {
  try {
    const parsed = bookingSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Revisa los campos marcados antes de continuar.',
        fieldErrors: getFieldErrors(parsed.error),
      };
    }

    const data = parsed.data;
    const now = getNowInTimeZone();

    if (
      !isDateBookable(data.booking_date, now) ||
      !isSlotInFuture(data.booking_date, data.booking_time, now)
    ) {
      return {
        success: false,
        message: 'Ese horario ya no está disponible. Por favor elige otro.',
        fieldErrors: { booking_time: 'Este horario ya pasó o no está disponible.' },
        slotTaken: true,
      };
    }

    // Generamos el id aquí para no necesitar permisos de SELECT (RLS) tras el insert.
    const id = crypto.randomUUID();

    const { error } = await getSupabase()
      .from('bookings')
      .insert({
        id,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        meeting_type: data.meeting_type,
        notes: data.notes || null,
      });

    if (error) {
      // 23505 = unique_violation → alguien reservó ese bloque primero.
      if (error.code === '23505') {
        return {
          success: false,
          message: '¡Uy! Alguien acaba de reservar ese horario. Elige otro, por favor.',
          fieldErrors: { booking_time: 'Este horario acaba de ser reservado.' },
          slotTaken: true,
        };
      }

      console.error('[createBooking] Error de Supabase:', error);
      return {
        success: false,
        message: `Error al guardar en Supabase: ${error.message || 'Error desconocido'}`,
      };
    }

    return { success: true, booking: { ...data, id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[createBooking] Error no controlado en la Server Action:', message);
    return {
      success: false,
      message: `Error en el servidor: ${message}`,
    };
  }
}

/**
 * Devuelve los bloques ocupados ('HH:mm') de una fecha, sin exponer datos personales.
 * Usa la función RPC `get_booked_slots` definida en supabase/schema.sql.
 */
export async function getBookedSlots(date: string): Promise<string[]> {
  if (typeof date !== 'string' || !isValidIsoDate(date)) return [];

  const { data, error } = await getSupabase().rpc('get_booked_slots', { p_date: date });

  if (error) {
    console.error('[getBookedSlots] Error de Supabase:', error);
    return [];
  }

  // PostgreSQL devuelve 'HH:mm:ss' → normalizamos a 'HH:mm'.
  return ((data ?? []) as { booking_time: string }[]).map((row) => row.booking_time.slice(0, 5));
}
