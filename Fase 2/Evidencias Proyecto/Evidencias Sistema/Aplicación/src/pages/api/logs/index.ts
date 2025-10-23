
import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { jsonResponse } from "@/lib/utils";

const ITEMS_PER_PAGE = 20; // Indice por pagina

export const GET: APIRoute = async ({ url }) => {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        // Parametros URL
        const params = url.searchParams;

        // Leemos todos los posibles filtros desde la URL
        const action = params.get("action");
        const performed_by = params.get("performed_by");
        const date_from = params.get("date_from");
        const date_to = params.get("date_to");
        const page = parseInt(params.get("page") || "1", 10);

        // Empezamos a construir la consulta a Supabase
        let query = supabaseAdmin
        .from("logs")
        .select("*", { count: "exact" }); // `count: "exact"` es para la paginación

        // Añadimos las condiciones a la consulta solo si los filtros vienen en la URL
        if (action) query = query.eq("action", action);
        if (performed_by) query = query.eq("performed_by_email", performed_by);
        if (date_from) query = query.gte("created_at", new Date(date_from).toISOString());
        if (date_to) {
            const endDate = new Date(date_to);
            endDate.setHours(23, 59, 59, 999); // Asegura que se incluya todo el día
            query = query.lte("created_at", endDate.toISOString());
        }

        // Calculamos el rango de resultados para la paginación
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // Aplicamos orden y paginación a la consulta
        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data: logs, error, count } = await query;

        if (error) {
            console.error("Error al buscar logs:", error);
            return new Response(JSON.stringify({ message: "Error al buscar logs" }), { status: 500 });
        }

        // Calculo del numero de total de paginas
        const totalPages = Math.ceil((count ?? 0) / ITEMS_PER_PAGE);

        return new Response(JSON.stringify(
            { logs, totalPages, currentPage: page, totalLogs: count ?? 0, }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Error inesperado en API logs/index.ts:", err);
        return new Response(JSON.stringify({ message: "Error inesperado" }), { status: 500 });
    }
};