import { createClient } from "@supabase/supabase-js";

// si la clave no esta configurada evita que se intente crear un cliente
function requiredEnv(name: string): string {
  // process env hace el runtime en el server, el import meta hace el fallback en local
  const v = (process.env as any)[name] ?? (import.meta.env as any).env?.[name];
  if (!v) throw new Error(`[supabaseAdmin] missing env ${name}`);
  return v as string;
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