'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Clock,
  Heart,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { getAllBookings, type BookingRecord } from '@/app/actions/booking';
import { getMeetingType, MEETING_TYPES, type MeetingTypeId } from '@/lib/constants';
import { formatDateLong, formatDuration, formatTime12h, getNowInTimeZone } from '@/lib/date';

interface BookingsListProps {
  initialBookings: BookingRecord[];
  initialError?: string | null;
  requiresPermission?: boolean;
}

export default function BookingsList({
  initialBookings,
  initialError,
  requiresPermission = false,
}: BookingsListProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>(initialBookings);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(requiresPermission);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [isRefreshing, startTransition] = useTransition();

  const now = getNowInTimeZone();

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getAllBookings();
      if (res.success) {
        setBookings(res.bookings);
        setError(null);
        setShowPermissionBanner(false);
      } else {
        setError(res.message);
        setShowPermissionBanner(Boolean(res.requiresPermission));
      }
    });
  };

  // Filtrado de reservas
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((item) => {
      // Filtro de texto (nombre, correo o notas)
      if (q) {
        const nameMatch = item.guest_name.toLowerCase().includes(q);
        const emailMatch = item.guest_email.toLowerCase().includes(q);
        const notesMatch = item.notes ? item.notes.toLowerCase().includes(q) : false;
        if (!nameMatch && !emailMatch && !notesMatch) return false;
      }

      // Filtro por tipo de reunión
      if (selectedType !== 'all' && item.meeting_type !== selectedType) {
        return false;
      }

      // Filtro por fecha (próximas vs pasadas)
      if (dateFilter === 'upcoming') {
        if (item.booking_date < now.date) return false;
      } else if (dateFilter === 'past') {
        if (item.booking_date >= now.date) return false;
      }

      return true;
    });
  }, [bookings, search, selectedType, dateFilter, now.date]);

  // Métricas rápidas
  const totalUpcoming = useMemo(() => {
    return bookings.filter((b) => b.booking_date >= now.date).length;
  }, [bookings, now.date]);

  return (
    <div className="space-y-8">
      {/* Aviso si Supabase requiere conceder permiso SELECT en RLS */}
      {showPermissionBanner && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="space-y-2 text-sm text-amber-950">
              <p className="font-semibold">
                Nota de configuración de Supabase (Row Level Security):
              </p>
              <p className="text-amber-800">
                Para que la página pueda listar las reservas existentes, debes habilitar la política
                de lectura en Supabase. Ve a <strong>Supabase Dashboard → SQL Editor</strong> y
                ejecuta:
              </p>
              <pre className="overflow-x-auto rounded-xl bg-stone-900 p-3 font-mono text-xs text-amber-200">
                grant select on table public.bookings to anon, authenticated;{'\n'}
                create policy &quot;Permitir ver reservas&quot; on public.bookings for select to anon,
                authenticated using (true);
              </pre>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
              >
                <RefreshCw className="size-3.5" />
                Reintentar cargar reservas
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showPermissionBanner && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-xs backdrop-blur">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Total de reservas</span>
            <Users className="size-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            {bookings.length}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-xs backdrop-blur">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Próximas citas</span>
            <CalendarDays className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            {totalUpcoming}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-xs backdrop-blur sm:col-span-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Estado agenda</span>
            <Sparkles className="size-4 text-sky-500" />
          </div>
          <p className="mt-2 text-sm font-semibold text-stone-800">
            {totalUpcoming > 0 ? `${totalUpcoming} pendientes` : 'Al día ✨'}
          </p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-xs backdrop-blur md:flex-row md:items-center md:justify-between">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o mensaje…"
            className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/70 pr-3 pl-9 text-sm text-stone-900 transition placeholder:text-stone-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 focus:outline-none"
          />
        </div>

        {/* Filtro por tipo de reunión */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 rounded-xl border border-stone-200 bg-stone-50/70 px-3 text-xs font-medium text-stone-700 transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 focus:outline-none"
          >
            <option value="all">Todos los planes</option>
            {MEETING_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>

          {/* Filtro por tiempo */}
          <div className="flex rounded-xl border border-stone-200 bg-stone-50/70 p-0.5">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                dateFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('upcoming')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                dateFilter === 'upcoming'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Próximas
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('past')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                dateFilter === 'past'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Pasadas
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refrescar lista"
            className="grid size-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-xs transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de reservas */}
      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white/60 px-6 py-16 text-center backdrop-blur">
          <div className="grid size-14 place-items-center rounded-full bg-amber-100/70 text-2xl ring-4 ring-amber-50">
            📅
          </div>
          <h3 className="mt-4 text-base font-semibold text-stone-900">
            No se encontraron reservas
          </h3>
          <p className="mt-1 max-w-sm text-sm text-stone-500">
            {search || selectedType !== 'all' || dateFilter !== 'all'
              ? 'No hay reservas que coincidan con los filtros seleccionados.'
              : 'Aún nadie ha agendado una cita. Comparte el enlace para empezar a recibir reservas.'}
          </p>
          <a
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800"
          >
            Agendar una cita ahora
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredBookings.map((item) => {
            let meetingInfo = null;
            try {
              meetingInfo = getMeetingType(item.meeting_type as MeetingTypeId);
            } catch {
              meetingInfo = {
                id: item.meeting_type as MeetingTypeId,
                label: item.meeting_type,
                emoji: '🗓️',
                description: '',
                durationMinutes: 45,
                accent: 'bg-stone-100',
              };
            }

            const isUpcoming = item.booking_date >= now.date;
            const isToday = item.booking_date === now.date;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:border-sky-300 hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Encabezado de la tarjeta: Tipo de reunión y estado */}
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-900 ${meetingInfo.accent}`}
                    >
                      <span className="text-base">{meetingInfo.emoji}</span>
                      <span>{meetingInfo.label}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        isToday
                          ? 'border border-amber-300 bg-amber-100 text-amber-800'
                          : isUpcoming
                            ? 'border border-sky-200 bg-sky-50 text-sky-700'
                            : 'border border-stone-200 bg-stone-100 text-stone-600'
                      }`}
                    >
                      {isToday ? '¡Hoy!' : isUpcoming ? 'Próxima' : 'Pasada'}
                    </span>
                  </div>

                  {/* Datos de la persona que reservó */}
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-900 text-xs font-bold text-white shadow-xs">
                        {item.guest_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {item.guest_name}
                        </p>
                        <a
                          href={`mailto:${item.guest_email}`}
                          className="flex items-center gap-1 truncate text-xs text-stone-500 transition hover:text-sky-600"
                        >
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{item.guest_email}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Fecha y hora agendada */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 rounded-xl bg-stone-100/70 p-2.5 text-stone-700">
                      <CalendarDays className="size-4 shrink-0 text-sky-600" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-stone-400">Fecha</span>
                        <span className="truncate font-medium">
                          {formatDateLong(item.booking_date).split(',')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-stone-100/70 p-2.5 text-stone-700">
                      <Clock className="size-4 shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-stone-400">Hora</span>
                        <span className="truncate font-medium">
                          {formatTime12h(item.booking_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mensaje o notas (si las dejó) */}
                  {item.notes && (
                    <div className="rounded-xl border border-stone-100 bg-amber-50/40 p-3 text-xs text-stone-700">
                      <div className="mb-1 flex items-center gap-1 font-medium text-amber-800">
                        <MessageSquareText className="size-3.5" />
                        <span>Mensaje:</span>
                      </div>
                      <p className="leading-relaxed text-stone-600">{item.notes}</p>
                    </div>
                  )}
                </div>

                {/* Pie de la tarjeta */}
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-400">
                  <span>
                    Código: <strong className="font-mono font-medium text-stone-600">#{item.id.slice(0, 8).toUpperCase()}</strong>
                  </span>
                  <span>{formatDuration(meetingInfo.durationMinutes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

