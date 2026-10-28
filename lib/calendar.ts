import { TIMEZONE } from '@/lib/constants';

export interface CalendarEventProps {
  title: string;
  description: string;
  date: string; // Formato 'YYYY-MM-DD'
  time: string; // Formato 'HH:mm' (24 hrs, ej. '15:30')
  durationMinutes?: number;
  location?: string;
  /** Zona horaria en la que se interpretan date/time. */
  timeZone?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Formato "flotante" que entiende Google Calendar: YYYYMMDDTHHmmss */
function formatLocal(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
  );
}

/**
 * Genera un enlace "Añadir a Google Calendar".
 * En lugar de convertir a UTC con la zona del navegador (que puede no ser la de Salomé),
 * enviamos la hora local + el parámetro `ctz`, y Google hace la conversión correcta.
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  date,
  time,
  durationMinutes = 30,
  location,
  timeZone = TIMEZONE,
}: CalendarEventProps): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  // Se usa Date.UTC solo como "calculadora" de fechas (maneja cambios de día/mes).
  const start = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${formatLocal(start)}/${formatLocal(end)}`,
    ctz: timeZone,
  });
  if (location) params.set('location', location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
