import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { jsonResponse } from "@/lib/utils";

export const GET: APIRoute = async () => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Consultas en paralelo
    const [actionsRes, usersRes] = await Promise.all([
      supabaseAdmin.from("logs").select("action"),
      supabaseAdmin.from("logs").select("performed_by_email"),
    ]);

    const { data: actionsData, error: aErr } = actionsRes;
    const { data: usersData, error: uErr } = usersRes;

    if (aErr || uErr) {
      console.error(
        "[api/logs/meta] Error al obtener metadatos:",
        aErr ?? uErr
      );
      return jsonResponse({ message: "Error interno del servidor" }, 500);
    }

    // Acciones únicas, sin null y sin espacios sobrantes
    const actions = [
      ...new Set(
        (actionsData ?? [])
          .map((row) => row.action as string | null)
          .filter((a): a is string => a != null)
          .map((a) => a.trim())
          .filter((a) => a.length > 0)
      ),
    ];

    // Emails únicos, sin null y limpios
    const uniqueEmails = [
      ...new Set(
        (usersData ?? [])
          .map((row) => row.performed_by_email as string | null)
          .filter((e): e is string => e != null)
          .map((e) => e.trim())
          .filter((e) => e.length > 0)
      ),
    ];

    const users = uniqueEmails.map((email) => ({ email }));

    return jsonResponse({ actions, users }, 200);
  } catch (err) {
    console.error("[api/logs/meta] Error inesperado:", err);
    return jsonResponse({ message: "Error inesperado" }, 500);
  }
};
