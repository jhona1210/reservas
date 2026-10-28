import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para uso EXCLUSIVO en el servidor (Server Actions / Server Components).
 * Usa la anon/publishable key, por lo que está sujeto a las políticas RLS:
 *   - Puede INSERTAR reservas.
 *   - NO puede leer la tabla (los datos personales quedan privados).
 *   - Los horarios ocupados se obtienen vía la función RPC `get_booked_slots`.
 */

let client: SupabaseClient | null = null;

function normalizeUrl(raw: string): string {
  // Tolera errores comunes: espacios, slash final o haber pegado la URL de la REST API.
  return raw.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local (o en Vercel).',
    );
  }

  client = createClient(normalizeUrl(supabaseUrl), supabaseAnonKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return client;
}
