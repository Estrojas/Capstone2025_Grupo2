import { createServerSupabase } from "@/lib/supabase/supabaseServer";

export async function POST({ request, cookies }) {
    try {
        const supabase = createServerSupabase({ cookies });
        const data = await request.json();
        

        const {
            RBD,
            region,
            comuna,
            nom_com,
            date_from,
            date_to,
            page = 1,
            limit = 10
        } = data;
        

        // Construir query base
        let query = supabase
            .from('visitas_col')
            .select('*', { count: 'exact' });

        // Aplicar filtros/
        if (RBD) {
            query = query.eq('RBD', RBD);
        }

        if (date_from) {
            query = query.gte('fecha_visita', date_from);
        }

        if (date_to) {
            // Agregar un día para incluir todo el día seleccionado
            const endDate = new Date(date_to);
            endDate.setDate(endDate.getDate() + 1);
            query = query.lt('fecha_visita', endDate.toISOString());
        }
        if (comuna) {
            query = query.eq('comuna', comuna);
        }
        if (region) {
            query = query.eq('region', region);
        }

        // Ordenar por fecha descendente (más recientes primero)
        query = query
                .order('fecha_visita', { ascending: false })
                .order('created_at', { ascending: false });

        // Paginación
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        // Ejecutar query
        const { data: visitas, error, count } = await query;

        if (error) {
            console.error("Error de Supabase:", error);
            return new Response(
                JSON.stringify({ error: error.message }), 
                { 
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }
        
        // Calcular total de páginas
        const totalPages = Math.ceil(count / limit);

        return new Response(
            JSON.stringify({ 
                success: true,
                visitas: visitas || [],
                totalVisitas: count || 0,
                totalPages: totalPages,
                currentPage: page
            }), 
            { 
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );

    } catch (error) {
        console.error(" Error en el endpoint:", error);
        return new Response(
            JSON.stringify({ error: error.message }), 
            { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}