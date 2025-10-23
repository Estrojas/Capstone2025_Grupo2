import type { APIRoute, APIContext } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { jsonResponse } from "@/lib/utils";

export const GET: APIRoute = async (ctx: APIContext) => {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // Hacemos las dos consultas a la base de datos al mismo tiempo
        const [actionsPromise, usersPromise] = await Promise.all([
        supabaseAdmin.from("logs").select("action").neq("action", null),
        supabaseAdmin.from("logs").select("performed_by_email").neq("performed_by_email", null),
        ]);

        // Extraccion de error
        const { data: actionsData, error: aErr } = actionsPromise;
        const { data: usersData, error: uErr } = usersPromise;

        // si alguna de las consultas fallo
        if (aErr || uErr) {
        console.error("Error al obtener metadatos de logs:", aErr ?? uErr);
        return new Response(JSON.stringify({ message: "Error interno del servidor" }), { status: 500 });
        }

        // Usamos set para obtener valores únicos y luego lo convertimos de nuevo a un array
        const actions = [...new Set((actionsData ?? []).map((log) => log.action))];
        const uniqueEmails = [...new Set((usersData ?? []).map((log) => log.performed_by_email))];

        // Transformamos el array de emails en un array de objetos
        const users = uniqueEmails.map(email => ({ email }));

        return new Response(JSON.stringify({ actions, users }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Error inesperado en API logs/meta.ts:", err);
        return jsonResponse({ message: "Error inesperado" }, 500);
    }
};