'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Clock,
  Loader2,
  Lock,
  Mail,
  MessageSquareText,
  Sparkles,
  User,
} from 'lucide-react';
import { createBooking, getBookedSlots } from '@/app/actions/booking';
import { getMeetingType, type MeetingTypeId, type TimeSlot } from '@/lib/constants';
import {
  formatDateLong,
  formatDuration,
  formatTime12h,
  getNowInTimeZone,
  isSlotInFuture,
  type ZonedNow,
} from '@/lib/date';
import {
  bookingSchema,
  getFieldErrors,
  type BookingField,
  type ConfirmedBooking,
  type FieldErrors,
} from '@/lib/validation';
import DatePicker from './DatePicker';
import MeetingTypeSelector from './MeetingTypeSelector';
import SuccessModal from './SuccessModal';
import TimeSlotGrid from './TimeSlotGrid';

interface FormState {
  meeting_type: MeetingTypeId | null;
  booking_date: string | null;
  booking_time: TimeSlot | null;
  guest_name: string;
  guest_email: string;
  notes: string;
}

const INITIAL_STATE: FormState = {
  meeting_type: null,
  booking_date: null,
  booking_time: null,
  guest_name: '',
  guest_email: '',
  notes: '',
};

const NOTES_MAX = 500;

export default function BookingForm({ initialNow }: { initialNow: ZonedNow }) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [now, setNow] = useState<ZonedNow>(initialNow);
  const [touched, setTouched] = useState<Partial<Record<BookingField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [isPending, startTransition] = useTransition();
  const slotsRequestId = useRef(0);

  // Reloj: mantiene actualizada la noción de "ahora" para bloquear horarios que van pasando.
  useEffect(() => {
    const id = window.setInterval(() => setNow(getNowInTimeZone()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const loadBookedSlots = useCallback(async (date: string) => {
    const requestId = ++slotsRequestId.current;
    setLoadingSlots(true);
    try {
      const slots = await getBookedSlots(date);
      if (requestId === slotsRequestId.current) setBookedSlots(slots);
    } catch {
      if (requestId === slotsRequestId.current) setBookedSlots([]);
    } finally {
      if (requestId === slotsRequestId.current) setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (form.booking_date) void loadBookedSlots(form.booking_date);
    else setBookedSlots([]);
  }, [form.booking_date, loadBookedSlots]);

  // Si el horario elegido deja de ser válido (pasó o lo ocuparon), se deselecciona.
  useEffect(() => {
    const { booking_date, booking_time } = form;
    if (!booking_date || !booking_time || loadingSlots) return;
    if (bookedSlots.includes(booking_time) || !isSlotInFuture(booking_date, booking_time, now)) {
      setForm((f) => ({ ...f, booking_time: null }));
    }
  }, [form, bookedSlots, now, loadingSlots]);

  // ---------- Validación ----------
  const validation = useMemo(
    () =>
      bookingSchema.safeParse({
        ...form,
        meeting_type: form.meeting_type ?? undefined,
        booking_date: form.booking_date ?? '',
        booking_time: form.booking_time ?? undefined,
      }),
    [form],
  );

  const errors: FieldErrors = useMemo(() => {
    const client = validation.success ? {} : getFieldErrors(validation.error);
    const visible: FieldErrors = {};
    (Object.keys(client) as BookingField[]).forEach((key) => {
      if (submitAttempted || touched[key]) visible[key] = client[key];
    });
    return { ...visible, ...serverFieldErrors };
  }, [validation, submitAttempted, touched, serverFieldErrors]);

  // ---------- Handlers ----------
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setServerError(null);
    setServerFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as BookingField];
      return next;
    });
  };

  const markTouched = (key: BookingField) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

  const handleDateChange = (date: string) => {
    if (date === form.booking_date) return;
    setForm((f) => ({ ...f, booking_date: date, booking_time: null }));
    setServerError(null);
    setServerFieldErrors({});
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setServerError(null);

    if (!validation.success) {
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload = validation.data;
    startTransition(async () => {
      try {
        const result = await createBooking(payload);
        if (result.success) {
          setConfirmed(result.booking);
          void loadBookedSlots(result.booking.booking_date);
          return;
        }
        setServerError(result.message);
        setServerFieldErrors(result.fieldErrors ?? {});
        if (result.slotTaken) {
          setForm((f) => ({ ...f, booking_time: null }));
          void loadBookedSlots(payload.booking_date);
        }
      } catch (err: unknown) {
        console.error('[BookingForm] Error al enviar la reserva:', err);
        const detail = err instanceof Error ? err.message : '';
        setServerError(
          detail
            ? `Error de conexión: ${detail}`
            : 'No pudimos conectar con el servidor. Revisa tu conexión o la terminal de Next.js.',
        );
      }
    });
  };

  const handleCloseModal = useCallback(() => {
    setConfirmed(null);
    // Conservamos nombre y correo por si quiere agendar otra cita.
    setForm((f) => ({ ...INITIAL_STATE, guest_name: f.guest_name, guest_email: f.guest_email }));
    setTouched({});
    setSubmitAttempted(false);
    setServerFieldErrors({});
    setServerError(null);
  }, []);

  const meeting = form.meeting_type ? getMeetingType(form.meeting_type) : null;
  const completedSteps =
    Number(Boolean(form.meeting_type)) +
    Number(Boolean(form.booking_date && form.booking_time)) +
    Number(Boolean(validation.success));

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="animate-fade-up overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-24px_rgb(28_25_23/0.18)] backdrop-blur-xl [animation-delay:120ms]"
      >
        {/* Barra de progreso */}
        <div className="h-1 bg-stone-100">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-sky-300 to-amber-300 transition-all duration-500 ease-out"
            style={{ width: `${(completedSteps / 3) * 100}%` }}
          />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Columna izquierda: plan, fecha y hora */}
          <div className="space-y-10 p-5 sm:p-8">
            <section aria-labelledby="step-1">
              <StepHeader
                id="step-1"
                step={1}
                title="¿Qué plan tenemos?"
                subtitle="Elige el motivo de la reunión."
                done={Boolean(form.meeting_type)}
              />
              <MeetingTypeSelector
                value={form.meeting_type}
                onChange={(id) => update('meeting_type', id)}
                invalid={Boolean(errors.meeting_type)}
              />
              <FieldError message={errors.meeting_type} />
            </section>

            <section aria-labelledby="step-2">
              <StepHeader
                id="step-2"
                step={2}
                title="¿Cuándo te queda bien?"
                subtitle="Solo se muestran días y horarios disponibles."
                done={Boolean(form.booking_date && form.booking_time)}
              />
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                <div aria-invalid={Boolean(errors.booking_date)}>
                  <DatePicker
                    value={form.booking_date}
                    onChange={handleDateChange}
                    now={now}
                    invalid={Boolean(errors.booking_date)}
                  />
                  <FieldError message={errors.booking_date} />
                </div>
                <div aria-invalid={Boolean(errors.booking_time) && Boolean(form.booking_date)}>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <Clock className="size-3.5" aria-hidden />
                    {form.booking_date ? formatDateLong(form.booking_date).split(',')[0] : 'Horarios'}
                  </p>
                  <TimeSlotGrid
                    date={form.booking_date}
                    value={form.booking_time}
                    onChange={(slot) => update('booking_time', slot)}
                    bookedSlots={bookedSlots}
                    loading={loadingSlots}
                    now={now}
                    invalid={Boolean(errors.booking_time)}
                  />
                  {form.booking_date && <FieldError message={errors.booking_time} />}
                </div>
              </div>
            </section>
          </div>

          {/* Columna derecha: datos + resumen */}
          <aside className="border-t border-stone-200/80 bg-stone-50/70 p-5 sm:p-8 lg:border-t-0 lg:border-l">
            <div className="lg:sticky lg:top-8">
              <StepHeader
                id="step-3"
                step={3}
                title="Tus datos"
                subtitle="Para confirmarte la cita."
                done={Boolean(validation.success)}
              />

              <div className="space-y-4">
                <TextField
                  id="guest_name"
                  label="Nombre completo"
                  icon={User}
                  placeholder="Ej. Mariana Gómez"
                  autoComplete="name"
                  value={form.guest_name}
                  onChange={(v) => update('guest_name', v)}
                  onBlur={() => markTouched('guest_name')}
                  error={errors.guest_name}
                />
                <TextField
                  id="guest_email"
                  type="email"
                  label="Correo electrónico"
                  icon={Mail}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  inputMode="email"
                  value={form.guest_email}
                  onChange={(v) => update('guest_email', v)}
                  onBlur={() => markTouched('guest_email')}
                  error={errors.guest_email}
                />

                <div>
                  <label htmlFor="notes" className="mb-1.5 flex items-center justify-between text-sm font-medium text-stone-700">
                    <span>
                      Mensaje o notas <span className="font-normal text-stone-400">(opcional)</span>
                    </span>
                    <span
                      className={`text-[11px] font-normal tabular-nums ${form.notes.length > NOTES_MAX ? 'text-rose-600' : 'text-stone-400'}`}
                    >
                      {form.notes.length}/{NOTES_MAX}
                    </span>
                  </label>
                  <div className="relative">
                    <MessageSquareText className="pointer-events-none absolute top-3 left-3 size-4 text-stone-400" aria-hidden />
                    <textarea
                      id="notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      onBlur={() => markTouched('notes')}
                      placeholder="Cuéntale a Salomé de qué quieres hablar…"
                      aria-invalid={Boolean(errors.notes)}
                      aria-describedby={errors.notes ? 'notes-error' : undefined}
                      className={inputClass(Boolean(errors.notes), 'resize-none py-2.5')}
                    />
                  </div>
                  <FieldError id="notes-error" message={errors.notes} />
                </div>
              </div>

              {/* Resumen */}
              <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold tracking-wide text-stone-500 uppercase">Resumen</p>
                <ul className="space-y-2.5 text-sm">
                  <SummaryRow
                    icon={Sparkles}
                    value={meeting ? `${meeting.emoji} ${meeting.label}` : null}
                    placeholder="Sin plan elegido"
                  />
                  <SummaryRow
                    icon={CalendarDays}
                    value={form.booking_date ? formatDateLong(form.booking_date) : null}
                    placeholder="Sin fecha"
                  />
                  <SummaryRow
                    icon={Clock}
                    value={
                      form.booking_time
                        ? `${formatTime12h(form.booking_time)}${meeting ? ` · ${formatDuration(meeting.durationMinutes)}` : ''}`
                        : null
                    }
                    placeholder="Sin hora"
                  />
                </ul>
              </div>

              {serverError && (
                <div role="alert" className="mt-4 flex animate-fade-up items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{serverError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="group mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgb(28_25_23/0.6)] transition-all hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Confirmando…
                  </>
                ) : (
                  <>
                    Confirmar reserva
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </>
                )}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
                <Lock className="size-3" aria-hidden />
                Tus datos solo los ve Salomé.
              </p>
            </div>
          </aside>
        </div>
      </form>

      {confirmed && <SuccessModal booking={confirmed} onClose={handleCloseModal} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-componentes de presentación                                     */
/* ------------------------------------------------------------------ */

function inputClass(invalid: boolean, extra = '') {
  return [
    'block w-full rounded-xl border bg-white pr-3 pl-9 text-sm text-stone-900 shadow-xs transition placeholder:text-stone-400',
    'focus:outline-none focus:ring-4',
    invalid
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-stone-200 hover:border-stone-300 focus:border-sky-400 focus:ring-sky-100',
    extra,
  ].join(' ');
}

function StepHeader({
  id,
  step,
  title,
  subtitle,
  done,
}: {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  done: boolean;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors duration-300 ${
          done ? 'bg-sky-500 text-white' : 'border border-stone-300 bg-white text-stone-500'
        }`}
        aria-hidden
      >
        {done ? '✓' : step}
      </span>
      <div>
        <h2 id={id} className="text-base font-semibold tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function TextField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  ...rest
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputClass(Boolean(error), 'h-11')}
          {...rest}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  value,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  placeholder: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon className={`size-4 shrink-0 ${value ? 'text-sky-600' : 'text-stone-300'}`} />
      <span className={value ? 'font-medium text-stone-800' : 'text-stone-400'}>{value ?? placeholder}</span>
    </li>
  );
}

