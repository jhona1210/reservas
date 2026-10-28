'use client';

import { useEffect, useRef } from 'react';
import { CalendarDays, CalendarPlus, Clock, Mail, RotateCcw, Sparkles, User, X } from 'lucide-react';
import { generateGoogleCalendarUrl } from '@/lib/calendar';
import { getMeetingType, TIMEZONE_LABEL } from '@/lib/constants';
import { formatDateLong, formatDuration, formatTime12h } from '@/lib/date';
import type { ConfirmedBooking } from '@/lib/validation';

interface SuccessModalProps {
  booking: ConfirmedBooking;
  onClose: () => void;
}

export default function SuccessModal({ booking, onClose }: SuccessModalProps) {
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const meeting = getMeetingType(booking.meeting_type);

  const calendarUrl = generateGoogleCalendarUrl({
    title: `${meeting.emoji} ${meeting.label} con Salomé`,
    description: [
      `Reserva confirmada en Book with Salomé.`,
      `Plan: ${meeting.label} (${formatDuration(meeting.durationMinutes)})`,
      `Reservado por: ${booking.guest_name} (${booking.guest_email})`,
      booking.notes ? `Notas: ${booking.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    date: booking.booking_date,
    time: booking.booking_time,
    durationMinutes: meeting.durationMinutes,
  });

  // Foco inicial, cierre con Escape y bloqueo de scroll del body.
  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const details = [
    { icon: Sparkles, label: 'Plan', value: `${meeting.emoji} ${meeting.label}` },
    { icon: CalendarDays, label: 'Fecha', value: formatDateLong(booking.booking_date) },
    {
      icon: Clock,
      label: 'Hora',
      value: `${formatTime12h(booking.booking_time)} · ${formatDuration(meeting.durationMinutes)}`,
    },
    { icon: User, label: 'Nombre', value: booking.guest_name },
    { icon: Mail, label: 'Correo', value: booking.guest_email },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 animate-overlay-in bg-stone-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 px-6 pt-8 pb-14 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X className="size-4" />
          </button>
          <div className="mx-auto mb-3 grid size-14 animate-pop place-items-center rounded-full bg-white/20 text-3xl ring-4 ring-white/20 backdrop-blur">
            🎉
          </div>
          <h2 id="success-title" className="text-2xl font-semibold tracking-tight">
            ¡Reserva confirmada!
          </h2>
          <p className="mt-1 text-sm text-white/85">
            Salomé ya tiene tu espacio apartado. Nos vemos pronto.
          </p>
        </div>

        <div className="-mt-8 px-5 pb-6">
          <dl className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3">
                <Icon className="size-4 shrink-0 text-violet-600" aria-hidden />
                <dt className="w-16 shrink-0 text-xs font-medium text-stone-500">{label}</dt>
                <dd className="min-w-0 flex-1 truncate text-right text-sm font-medium text-stone-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-center text-[11px] text-stone-400">
            {TIMEZONE_LABEL} · Código #{booking.id.slice(0, 8).toUpperCase()}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <a
              ref={primaryRef}
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              <CalendarPlus className="size-4" aria-hidden />
              Añadir a Google Calendar
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <RotateCcw className="size-4" aria-hidden />
              Agendar otra cita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

