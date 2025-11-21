import { createServerSupabase } from "@/lib/supabase/supabaseServer";

export async function GET({ params, cookies }) {
    try {
        const supabase = createServerSupabase({ cookies });
        const { id } = params;


        const { data: visita, error } = await supabase
            .from('visitas_col')
            .select('*')
            .eq('id_visita', id)
            .single();
        
        if (error) {
            console.error("❌ Error de Supabase:", error);
            return new Response(
                JSON.stringify({ error: error.message }), 
                { status: 500 }
            );
        }

        if (!visita) {
            return new Response(
                JSON.stringify({ error: "Visita no encontrada" }), 
                { status: 404 }
            );
        }


        return new Response(
            JSON.stringify({ success: true, visita }), 
            { status: 200 }
        );

    } catch (error) {
        console.error("❌ Error en el endpoint:", error);
        return new Response(
            JSON.stringify({ error: error.message }), 
            { status: 500 }
        );
    }
}