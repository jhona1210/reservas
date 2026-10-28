import { CalendarCheck, Heart, ShieldCheck, Zap } from 'lucide-react';
import BookingForm from '@/components/booking/BookingForm';
import { TIMEZONE_LABEL } from '@/lib/constants';
import { getNowInTimeZone } from '@/lib/date';

// La disponibilidad depende de la hora actual: no se debe prerenderizar de forma estática.
export const dynamic = 'force-dynamic';

const FEATURES = [
  { icon: Zap, label: 'Confirmación instantánea' },
  { icon: CalendarCheck, label: 'Directo a Google Calendar' },
  { icon: ShieldCheck, label: 'Sin crear cuenta' },
];

export default function HomePage() {
  const now = getNowInTimeZone();

  return (
    <div className="relative isolate overflow-hidden">
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-200/50 via-amber-100/40 to-sky-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(120_113_108/0.12)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      {/* Navbar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-500 font-bold text-lg text-white shadow-sm ring-2 ring-amber-300/60 transition group-hover:scale-105">
            S
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-stone-900">
            Book with{' '}
            <span className="rounded-md bg-amber-100/90 px-1.5 py-0.5 font-bold text-stone-900 ring-1 ring-amber-200">
              Salomé
            </span>
            <Heart className="size-4 fill-amber-400 text-amber-500 drop-shadow-xs" aria-hidden />
          </span>
        </a>
        <span className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-stone-600 backdrop-blur sm:inline-flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Agenda abierta
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* Hero */}
        <section className="mx-auto max-w-3xl animate-fade-up pt-10 pb-12 text-center sm:pt-16 sm:pb-16">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1 text-xs font-medium text-sky-800 shadow-xs">
            ✨ Reserva en menos de un minuto
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-stone-900 sm:text-6xl">
            Agenda un espacio con{' '}
            <span className="inline-flex items-center gap-2 align-middle">
              <span className="relative inline-block rounded-2xl bg-amber-200/80 px-3.5 py-1 font-bold text-stone-950 shadow-sm ring-2 ring-amber-300/80">
                Salomé
              </span>
              <Heart className="inline size-8 fill-amber-400 text-amber-500 drop-shadow-sm transition-transform hover:scale-110 sm:size-11" aria-label="corazón" />
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-stone-600 sm:text-lg">
            Elige el plan, el día y la hora. Del café a la sesión de chisme: tú propones,{' '}
            <span className="font-semibold text-stone-900">Salomé</span> llega puntual.
          </p>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-stone-600">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-sky-600" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <BookingForm initialNow={now} />

        <p className="mt-6 text-center text-xs text-stone-500">
          Todos los horarios están en {TIMEZONE_LABEL}.
        </p>
      </main>

      <footer className="border-t border-stone-200/80 py-8 text-center text-xs text-stone-500">
        © {now.date.slice(0, 4)} Book with <span className="font-medium text-stone-700">Salomé</span>{' '}
        <Heart className="inline size-3.5 fill-amber-400 text-amber-500 align-text-bottom" aria-hidden /> · Hecho con ☕ y buena energía
      </footer>
    </div>
  );
}

