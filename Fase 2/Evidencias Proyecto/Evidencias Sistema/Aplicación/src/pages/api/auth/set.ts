import type { APIRoute } from "astro";
import { createServerSupabase } from "@/lib/supabase/supabaseServer";
import { jsonResponse } from "@/lib/utils";


// si llega directo al endpoint sin pasar por middleware
export const OPTIONS: APIRoute = () => new Response(null, { status: 204 }); 

// GET de prueba permite testear en el navegador que la ruta existe
export const GET: APIRoute = () =>
    jsonResponse({ ok: true, msg: "auth/set alive" }, 200);


// Sincronizacion de sesion
export const POST: APIRoute = async (ctx) => {
    try {
        const supabase = createServerSupabase({ request: ctx.request, cookies: ctx.cookies });

        let body: any; // cuerpo de la peticion

        // Intentar leer el cuerpo JSON
        try {
            body = await ctx.request.json();
        } catch {
            // Si el cuerpo no es JSON válido
            return jsonResponse({ ok: false, message: "JSON inválido" }, 400);
        }

        const { event, session } = body ?? {};

        // Validar y establecer/eliminar la sesión
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            // validar que en la sesión exista el token
            if (!session) {
                return jsonResponse({ ok: false, message: "Falta 'session' en el body" }, 400);
            }
            // Guarda la sesión en las cookies del server (setea sb-access-token, sb-refresh-token)
            await supabase.auth.setSession(session); 
        } else if (event === "SIGNED_OUT") {
            // Cierra la sesión activa del servidor (elimina las cookies sb-*)
            await supabase.auth.signOut(); 
        } 
        
        return new Response(null, { status: 204 }); 
        
    } catch (e: any) {
        // Captura de cualquier error inesperado
        return jsonResponse({ ok: false, message: String(e?.message ?? e) }, 500);
    }
};