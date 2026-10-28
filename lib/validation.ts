import { z } from 'zod';
import { MEETING_TYPE_IDS, TIME_SLOTS } from '@/lib/constants';
import { isValidIsoDate } from '@/lib/date';

/**
 * Esquema compartido entre cliente (validación en vivo) y servidor (Server Action).
 * El servidor SIEMPRE vuelve a validar: nunca se confía en el cliente.
 */
export const bookingSchema = z.object({
  meeting_type: z.enum(MEETING_TYPE_IDS, {
    errorMap: () => ({ message: 'Elige qué plan quieres hacer con Salomé.' }),
  }),
  booking_date: z
    .string({ invalid_type_error: 'Selecciona un día en el calendario.' })
    .refine(isValidIsoDate, 'Selecciona un día en el calendario.'),
  booking_time: z.enum(TIME_SLOTS, {
    errorMap: () => ({ message: 'Selecciona un horario disponible.' }),
  }),
  guest_name: z
    .string({ invalid_type_error: 'Escribe tu nombre completo.' })
    .trim()
    .min(3, 'Escribe tu nombre completo (mínimo 3 caracteres).')
    .max(100, 'El nombre es demasiado largo (máximo 100 caracteres).'),
  guest_email: z
    .string({ invalid_type_error: 'Escribe tu correo electrónico.' })
    .trim()
    .toLowerCase()
    .min(1, 'Escribe tu correo electrónico.')
    .max(254, 'El correo es demasiado largo.')
    .email('Ese correo no parece válido (ej. nombre@correo.com).'),
  notes: z
    .string()
    .trim()
    .max(500, 'Las notas no pueden superar los 500 caracteres.')
    .optional()
    .default(''),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;
export type BookingField = keyof BookingInput;
export type FieldErrors = Partial<Record<BookingField, string>>;

export interface ConfirmedBooking extends BookingData {
  id: string;
}

export function getFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as BookingField | undefined;
    if (field && !result[field]) result[field] = issue.message;
  }
  return result;
}

