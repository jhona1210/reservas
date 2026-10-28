'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MAX_DAYS_AHEAD } from '@/lib/constants';
import {
  addDays,
  formatDateLong,
  formatMonthYear,
  isDateBookable,
  parseIsoDate,
  toIsoDate,
  weekdayOf,
  type ZonedNow,
} from '@/lib/date';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
  now: ZonedNow;
  invalid?: boolean;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function DatePicker({ value, onChange, now, invalid }: DatePickerProps) {
  const initial = parseIsoDate(value ?? now.date);
  const [view, setView] = useState({ year: initial.year, monthIndex: initial.monthIndex });

  const today = parseIsoDate(now.date);
  const maxDate = parseIsoDate(addDays(now.date, MAX_DAYS_AHEAD));
  const viewKey = view.year * 12 + view.monthIndex;
  const canGoPrev = viewKey > today.year * 12 + today.monthIndex;
  const canGoNext = viewKey < maxDate.year * 12 + maxDate.monthIndex;

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(view.year, view.monthIndex + delta, 1));
    setView({ year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() });
  };

  const firstOfMonth = toIsoDate(view.year, view.monthIndex, 1);
  const leadingBlanks = (weekdayOf(firstOfMonth) + 6) % 7; // semana inicia en lunes
  const daysInMonth = new Date(Date.UTC(view.year, view.monthIndex + 1, 0)).getUTCDate();

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${invalid ? 'border-rose-300' : 'border-stone-200'}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900" aria-live="polite">
          {formatMonthYear(view.year, view.monthIndex)}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={!canGoPrev}
            aria-label="Mes anterior"
            className="grid size-8 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={!canGoNext}
            aria-label="Mes siguiente"
            className="grid size-8 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1 text-[11px] font-medium tracking-wide text-stone-400">
            {d}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = toIsoDate(view.year, view.monthIndex, day);
          const bookable = isDateBookable(iso, now);
          const selected = value === iso;
          const isToday = iso === now.date;

          return (
            <button
              key={iso}
              type="button"
              disabled={!bookable}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={`${formatDateLong(iso)}${bookable ? '' : ' (no disponible)'}`}
              className={[
                'relative mx-auto grid aspect-square w-full max-w-10 place-items-center rounded-xl text-sm transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                selected
                  ? 'bg-stone-900 font-semibold text-white shadow-md'
                  : bookable
                    ? 'font-medium text-stone-800 hover:bg-sky-50 hover:text-sky-700'
                    : 'cursor-not-allowed text-stone-300 line-through decoration-stone-200',
              ].join(' ')}
            >
              {day}
              {isToday && (
                <span
                  className={`absolute bottom-1 size-1 rounded-full ${selected ? 'bg-white' : 'bg-amber-400'}`}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

