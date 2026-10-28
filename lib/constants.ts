/**
 * Configuración central de la agenda de Salomé.
 * Todo lo que es "regla de negocio" vive aquí para poder ajustarlo sin tocar la UI.
 */

/** Zona horaria en la que Salomé atiende. Todas las fechas/horas se interpretan aquí. */
export const TIMEZONE = 'America/Bogota';
export const TIMEZONE_LABEL = 'Hora de Colombia (GMT-5)';

/** Cuántos días hacia adelante se puede reservar. */
export const MAX_DAYS_AHEAD = 60;

/** Días de la semana disponibles (0 = domingo, 6 = sábado). */
export const AVAILABLE_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6];

/** Bloques horarios ofrecidos (formato 24 h, HH:mm). */
export const TIME_SLOTS = ['10:00', '11:30', '15:00', '16:30'] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const MEETING_TYPE_IDS = ['coffee', 'focus', 'express', 'gossip'] as const;
export type MeetingTypeId = (typeof MEETING_TYPE_IDS)[number];

export interface MeetingType {
  id: MeetingTypeId;
  label: string;
  emoji: string;
  description: string;
  durationMinutes: number;
  /** Clases de Tailwind para el fondo del emoji. */
  accent: string;
}

export const MEETING_TYPES: readonly MeetingType[] = [
  {
    id: 'coffee',
    label: 'Tomar un café',
    emoji: '☕',
    description: 'Una pausa tranquila para ponernos al día con algo rico.',
    durationMinutes: 45,
    accent: 'bg-amber-100/80',
  },
  {
    id: 'focus',
    label: 'Sesión de estudio / trabajo',
    emoji: '💻',
    description: 'Modo concentración: cada quien en lo suyo, pero acompañados.',
    durationMinutes: 90,
    accent: 'bg-sky-100/80',
  },
  {
    id: 'express',
    label: 'Charla express',
    emoji: '⚡',
    description: 'Directo al grano: una pregunta, una idea o un saludo rápido.',
    durationMinutes: 15,
    accent: 'bg-yellow-100/80',
  },
  {
    id: 'gossip',
    label: 'Chisme / Actualización de vida',
    emoji: '🗣️',
    description: 'Todo lo que ha pasado desde la última vez. Sin filtro.',
    durationMinutes: 60,
    accent: 'bg-amber-100/80',
  },
];

export function getMeetingType(id: MeetingTypeId): MeetingType {
  const found = MEETING_TYPES.find((m) => m.id === id);
  if (!found) throw new Error(`Tipo de reunión desconocido: ${id}`);
  return found;
}

