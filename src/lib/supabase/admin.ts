import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente admin de Supabase (service role): alta/gestión de usuarios en Auth.
 * SOLO servidor — `server-only` rompe el build si algo lo importa en cliente.
 */
export function crearClienteSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env"
    );
  }
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
