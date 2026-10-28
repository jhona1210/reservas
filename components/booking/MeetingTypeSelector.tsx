'use client';

import { Check, Clock } from 'lucide-react';
import { MEETING_TYPES, type MeetingTypeId } from '@/lib/constants';
import { formatDuration } from '@/lib/date';

interface MeetingTypeSelectorProps {
  value: MeetingTypeId | null;
  onChange: (id: MeetingTypeId) => void;
  invalid?: boolean;
}

export default function MeetingTypeSelector({ value, onChange, invalid }: MeetingTypeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Tipo de reunión" aria-invalid={invalid} className="grid gap-3 sm:grid-cols-2">
      {MEETING_TYPES.map((type) => {
        const selected = value === type.id;
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type.id)}
            className={[
              'group relative flex items-start gap-4 rounded-2xl border bg-white p-4 text-left transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2',
              selected
                ? 'border-sky-500 shadow-[0_0_0_1px_rgb(14_165_233),0_8px_24px_-8px_rgb(14_165_233/0.3)] bg-sky-50/20'
                : invalid
                  ? 'border-rose-300 hover:border-rose-400'
                  : 'border-stone-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md',
            ].join(' ')}
          >
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-xl text-2xl transition-transform duration-200 group-hover:scale-105 ${type.accent}`}
              aria-hidden
            >
              {type.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block pr-6 text-sm font-semibold text-stone-900">{type.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-500">{type.description}</span>
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                <Clock className="size-3" aria-hidden />
                {formatDuration(type.durationMinutes)}
              </span>
            </span>
            <span
              className={[
                'absolute top-3 right-3 grid size-5 place-items-center rounded-full transition-all duration-200',
                selected ? 'scale-100 bg-sky-500 text-white' : 'scale-75 border border-stone-300 bg-white text-transparent',
              ].join(' ')}
              aria-hidden
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

