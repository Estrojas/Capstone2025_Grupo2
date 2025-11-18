import type { APIRoute, APIContext } from "astro";
import { createServerSupabase, getSessionSafe } from "@/lib/supabase/supabaseServer"; 
import { jsonResponse } from "@/lib/utils";

export const GET: APIRoute = async (ctx: APIContext) => {
    try {
        // Autorización
        const { user, supabase } = await getSessionSafe(ctx);

        if (!user) {
            return jsonResponse({ error: "No autenticado. Acceso denegado por RLS." }, 401);
        }
        
        // Consultas 
        const [campusPromise, areasPromise] = await Promise.all([
             // Consulta Campus 
            supabase
                .from("campus")
                .select("campus_id, campus_name")
                .order("campus_name"),

             // Consulta Áreas
            supabase
                .from("areas")
                .select("area_id, area_name")
                .order("area_name"),
        ]);
        
        // Extracción de resultados
        const { data: campus, error: campusErr } = campusPromise;
        const { data: areas, error: areaErr } = areasPromise;

        if (campusErr || areaErr) {
            console.error("Error cargando listas:", { campusErr, areaErr });
            // Devolvemos 403 si RLS falló o 500 si fue un error de DB
            return jsonResponse({ 
                ok: false, 
                message: "Error de servidor o RLS al cargar catálogos.",
                details: campusErr?.message || areaErr?.message
            }, 500);
        }

        return jsonResponse({ ok: true, campus, areas });
        
    } catch (e) {
        console.error("Error inesperado en lookup.ts:", e);
        return jsonResponse({ ok: false, message: "Error interno inesperado." }, 500);
    }
};