'use client';

import { CalendarDays } from 'lucide-react';
import { TIME_SLOTS, type TimeSlot } from '@/lib/constants';
import { formatTime12h, isSlotInFuture, type ZonedNow } from '@/lib/date';

interface TimeSlotGridProps {
  date: string | null;
  value: TimeSlot | null;
  onChange: (slot: TimeSlot) => void;
  bookedSlots: string[];
  loading: boolean;
  now: ZonedNow;
  invalid?: boolean;
}

export default function TimeSlotGrid({
  date,
  value,
  onChange,
  bookedSlots,
  loading,
  now,
  invalid,
}: TimeSlotGridProps) {
  if (!date) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-6 text-center">
        <CalendarDays className="size-6 text-stone-400" aria-hidden />
        <p className="text-sm text-stone-500">Primero elige un día en el calendario.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" aria-busy="true" aria-label="Cargando horarios">
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="h-12 animate-pulse rounded-xl bg-stone-100" />
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Horario" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
      {TIME_SLOTS.map((slot) => {
        const booked = bookedSlots.includes(slot);
        const past = !isSlotInFuture(date, slot, now);
        const disabled = booked || past;
        const selected = value === slot;

        return (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(slot)}
            className={[
              'flex h-12 items-center justify-between rounded-xl border px-4 text-sm font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1',
              selected
                ? 'border-sky-500 bg-sky-500 text-white shadow-[0_8px_20px_-8px_rgb(14_165_233/0.45)]'
                : disabled
                  ? 'cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300'
                  : invalid
                    ? 'border-rose-300 bg-white text-stone-800 hover:border-sky-400'
                    : 'border-stone-200 bg-white text-stone-800 hover:border-sky-400 hover:text-sky-700',
            ].join(' ')}
          >
            <span className={disabled ? 'line-through' : ''}>{formatTime12h(slot)}</span>
            {disabled && (
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                {booked ? 'Ocupado' : 'Pasó'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

