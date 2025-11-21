import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { jsonResponse } from "@/lib/utils";

export const GET: APIRoute = async () => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Consultas en paralelo
    const [actionsRes, usersRes] = await Promise.all([ 
      supabaseAdmin.from("logs").select("action"), // obtener acciones únicas
      supabaseAdmin.from("logs").select("performed_by_email"), // obtener emails únicos
    ]);

    const { data: actionsData, error: aErr } = actionsRes; // acciones obtenidas
    const { data: usersData, error: uErr } = usersRes; // usuarios obtenidos

    if (aErr || uErr) { // si hay error con los usuarios o acciones
      console.error("[api/logs/meta] Error al obtener metadatos:", aErr ?? uErr);
      return jsonResponse({ message: "Error interno del servidor" }, 500);
    }

    // Acciones únicas, sin null y sin espacios sobrantes
    const actions = [ ...new Set(
      (actionsData ?? [])
          .map((row) => row.action as string | null) // obtener acción
          .filter((a): a is string => a != null) // filtrar nulls
          .map((a) => a.trim()) // limpiar espacios
          .filter((a) => a.length > 0) // filtrar vacíos
      ),
    ];

    // Emails únicos, sin null y limpios
    const uniqueEmails = [...new Set(
        (usersData ?? [])
          .map((row) => row.performed_by_email as string | null) // obtener email
          .filter((e): e is string => e != null)
          .map((e) => e.trim())
          .filter((e) => e.length > 0)
      ),
    ];

    // Formatear usuarios como objetos con propiedad email
    const users = uniqueEmails.map((email) => ({ email }));

    return jsonResponse({ actions, users }, 200);
    
  } catch (err) {
    console.error("[api/logs/meta] Error inesperado:", err);
    return jsonResponse({ message: "Error inesperado" }, 500);
  }
};
