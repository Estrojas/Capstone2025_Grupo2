import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { jsonResponse, rangeDate } from "@/lib/utils";

const ITEMS_PER_PAGE = 20; // registros por página

export const GET: APIRoute = async ({ url }) => {
    try {
        const supabaseAdmin = getSupabaseAdmin(); 
        const params = url.searchParams; // obtener parámetros de búsqueda

        // Filtros desde la URL (normalizados)
        const rawAction = params.get("action");
        const rawPerformedBy = params.get("performed_by");
        const rawDateFrom = params.get("date_from");
        const rawDateTo = params.get("date_to");
        const page = parseInt(params.get("page") ?? "1", 10);

        const action = rawAction ? rawAction.replace(/\+/g, " ").trim() : "";
        const performed_by = (rawPerformedBy ?? "").trim();
        const date_from = (rawDateFrom ?? "").trim();
        const date_to = (rawDateTo ?? "").trim();


        // para debug
        // console.log("[api/logs] filtros recibidos:", { action, performed_by, date_from, page,});

        // Base de la consulta
        let query = supabaseAdmin.from("logs").select("*", { count: "exact" });

        // Filtro por acción
        if (action) {
            query = query.eq("action", action);
        }

        // Filtro por usuario que ejecutó
        if (performed_by) {
            query = query.eq("performed_by_email", performed_by);
        }

        // Filtros de fecha
        const { fromIso, toIso } = rangeDate(date_from, date_to);

        if (fromIso){
            // para debug
            // console.log("[api/logs] gte created_at:", fromIso);
            query = query.gte("created_at", fromIso);
        }

        if (toIso){
            // para debug
            // console.log("[api/logs] lt created_at:", toIso);
            query = query.lt("created_at", toIso);
        }


        // Paginación
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // ordenar por fecha descendente y aplicar rango
        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data: logs, error, count } = await query; // ejecutar consulta

        // para debug
        // console.log("[api/logs] resultado Supabase:", { error, count, rows: logs?.length ?? 0,});

        if (error) {
            console.error("[api/logs] Error al buscar logs:", error);
            return jsonResponse({ message: "Error al buscar logs" }, 500);
        }

        const totalLogs = count ?? 0;
        const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

        return jsonResponse({ logs: logs ?? [], totalPages, currentPage: page, totalLogs, }, 200);
        
    } catch (err) {
        console.error("[api/logs] Error inesperado:", err);
        return jsonResponse({ message: "Error inesperado" }, 500);
    }
};
