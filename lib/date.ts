import { AVAILABLE_WEEKDAYS, MAX_DAYS_AHEAD, TIMEZONE, TIME_SLOTS } from '@/lib/constants';

/**
 * Utilidades de fecha independientes del huso horario del servidor/navegador.
 * Las fechas se manejan como strings ISO 'YYYY-MM-DD' y las horas como 'HH:mm',
 * siempre interpretadas en TIMEZONE (America/Bogota).
 */

export interface ZonedNow {
  /** Fecha actual en TIMEZONE, formato YYYY-MM-DD. */
  date: string;
  /** Minutos transcurridos desde la medianoche en TIMEZONE. */
  minutes: number;
}

export function getNowInTimeZone(timeZone: string = TIMEZONE): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(Date.UTC(year, monthIndex, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseIsoDate(iso: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, monthIndex: month - 1, day };
}

export function addDays(iso: string, days: number): string {
  const { year, monthIndex, day } = parseIsoDate(iso);
  return toIsoDate(year, monthIndex, day + days);
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(iso: string): number {
  const { year, monthIndex, day } = parseIsoDate(iso);
  return new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
}

export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const { year, monthIndex, day } = parseIsoDate(iso);
  return toIsoDate(year, monthIndex, day) === iso;
}

export function isSlotInFuture(date: string, time: string, now: ZonedNow): boolean {
  if (date > now.date) return true;
  if (date < now.date) return false;
  return timeToMinutes(time) > now.minutes;
}

/** Un día es reservable si está en rango, es día hábil y le queda al menos un bloque futuro. */
export function isDateBookable(date: string, now: ZonedNow): boolean {
  if (!isValidIsoDate(date)) return false;
  if (date < now.date || date > addDays(now.date, MAX_DAYS_AHEAD)) return false;
  if (!AVAILABLE_WEEKDAYS.includes(weekdayOf(date))) return false;
  return TIME_SLOTS.some((slot) => isSlotInFuture(date, slot, now));
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(hour12)}:${pad(m)} ${suffix}`;
}

export function formatDateLong(iso: string): string {
  const { year, monthIndex, day } = parseIsoDate(iso);
  const text = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthIndex, day)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMonthYear(year: number, monthIndex: number): string {
  const text = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

