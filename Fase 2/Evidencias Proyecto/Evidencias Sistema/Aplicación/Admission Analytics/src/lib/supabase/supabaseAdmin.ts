import { createClient } from "@supabase/supabase-js";

// si la clave no esta configurada evita que se intente crear un cliente
function requiredEnv(name: string): string {
  // server env (runtime)
  if (typeof process !== 'undefined' && (process.env as any)[name]) {
    return (process.env as any)[name] as string;
  }
  // build-time via import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta.env as any)[name]) {
    return (import.meta.env as any)[name] as string;
  }
  throw new Error(`[supabaseAdmin] env no encontrado: ${name}`);
}

export function getSupabaseAdmin() {
  // Variables privadas (solo servidor)
  const SUPABASE_URL = requiredEnv("SUPABASE_URL");
  const SERVICE_ROLE = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    // Desactivamos la persistencia, ya que este cliente opera sin sesión de usuario
    auth: { autoRefreshToken: false, persistSession: false },
  });
}