"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para Client Components (solo autenticación). */
export function crearClienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env"
    );
  }
  return createBrowserClient(url, anonKey);
}
