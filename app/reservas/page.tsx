import { ArrowLeft, Heart, ShieldCheck, Users } from 'lucide-react';
import { getAllBookings } from '@/app/actions/booking';
import BookingsList from '@/components/booking/BookingsList';
import { TIMEZONE_LABEL } from '@/lib/constants';
import { getNowInTimeZone } from '@/lib/date';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reservas agendadas — Book with Salomé',
  description: 'Consulta quién ha reservado un espacio y qué tipo de plan agendaron con Salomé.',
};

export default async function ReservasPage() {
  const now = getNowInTimeZone();
  const res = await getAllBookings();

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* Fondo decorativo en azul clarito y amarillo */}
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

        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-xs backdrop-blur transition hover:border-sky-300 hover:bg-sky-50/70 hover:text-sky-900"
        >
          <ArrowLeft className="size-3.5" />
          <span>Agendar una cita</span>
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* Hero */}
        <section className="mx-auto max-w-3xl animate-fade-up pt-8 pb-10 text-center sm:pt-12 sm:pb-12">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1 text-xs font-medium text-sky-800 shadow-xs">
            <Users className="size-3.5 text-sky-600" />
            Panel de citas agendadas
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-stone-900 sm:text-5xl">
            Reservas con{' '}
            <span className="inline-flex items-center gap-2 align-middle">
              <span className="relative inline-block rounded-2xl bg-amber-200/80 px-3.5 py-1 font-bold text-stone-950 shadow-sm ring-2 ring-amber-300/80">
                Salomé
              </span>
              <Heart className="inline size-7 fill-amber-400 text-amber-500 drop-shadow-sm sm:size-9" aria-label="corazón" />
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-pretty text-stone-600 sm:text-lg">
            Consulta quién ha reservado un espacio, qué plan eligieron y sus detalles de contacto.
          </p>
        </section>

        {/* Componente interactivo de listado de reservas */}
        <BookingsList
          initialBookings={res.success ? res.bookings : []}
          initialError={res.success ? null : res.message}
          requiresPermission={!res.success && Boolean(res.requiresPermission)}
        />

        <p className="mt-8 text-center text-xs text-stone-500">
          Todos los horarios están calculados en {TIMEZONE_LABEL}.
        </p>
      </main>

      <footer className="border-t border-stone-200/80 py-8 text-center text-xs text-stone-500">
        © {now.date.slice(0, 4)} Book with <span className="font-medium text-stone-700">Salomé</span>{' '}
        <Heart className="inline size-3.5 fill-amber-400 text-amber-500 align-text-bottom" aria-hidden /> · Hecho con ☕ y buena energía
      </footer>
    </div>
  );
}
