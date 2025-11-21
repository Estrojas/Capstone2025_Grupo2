import type { APIRoute, APIContext } from "astro";
import { createServerSupabase, getSessionSafe } from "@/lib/supabase/supabaseServer";
import { jsonResponse, getClientIp } from "@/lib/utils"; 
import type { ProfileWithRelations } from "@/types/Profile";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin"
import { logAction as persistLog } from "@/lib/logWriter";

// Tipo para campos cambiados
interface ChangedFields {[key: string]: { before: any; after: any };}


// Obtener usuario por ID
export const GET: APIRoute = async ({ params, request, cookies }: APIContext) => {
    try {
        const { user: authUser, supabase } = await getSessionSafe({ request, cookies });
        const { user_id } = params; // obtenemos el id desde la ruta dinámica
        
        // Verificación de Autenticación
        if (!authUser) {
            return jsonResponse({ error: "No autenticado" }, 401);
        }
        if (!user_id) {
            return jsonResponse({ error: "ID de usuario no proporcionado" }, 400);
        }
        
        // Autorización Manual (Respuesta rápida)
        // Verificamos si es su propio perfil o si es Admin.
        const isSelf = user_id === authUser.id;
        const isAdmin = authUser.role === 'admin';

        // Si no es su ID y no es Admin/Manager, denegamos.
        if (!isSelf && !isAdmin) {
            return jsonResponse({ error: "Permiso denegado para ver este perfil" }, 403);
        }

        // Búsqueda del usuario en la tabla
        const { data, error } = await supabase
            .from("user_profiles")
            .select(`
                user_id,
                names,
                last_name_1,
                last_name_2,
                email,
                role,
                status,
                area_id,
                campus_id,
                campus:campus_id ( campus_name ),
                area:area_id ( area_name )
            `)
            .eq("user_id", user_id)
            .single();

        if (error) {
            return jsonResponse({ error: error.message || "Error al obtener perfil (RLS)" }, 500);
        }

        if (!data) {
            return jsonResponse({ error: "Usuario no encontrado" }, 404);
        }

        // Retornar el perfil del usuario encontrado, y el as unknown es para evitar conflicto de tipos
        return jsonResponse({ user: data as unknown as ProfileWithRelations }, 200);
        
    } catch (err) {
        console.error("Error GET /users/[user_id]:", err);
        return jsonResponse({ error: "Error interno al obtener el usuario" }, 500);
    }
};


// Actualizar usuario
export const PUT: APIRoute = async ({params, request, cookies}) => {
    try {
        const user_id = params.user_id; // obtenemos el id desde la ruta dinámica
        if (!user_id) return jsonResponse({ error:"Falta user_id"}, 400);

        // nos aseguramos de que haya sesion
        const supabase = createServerSupabase({ request, cookies});
        const { data: actorData } = await supabase.auth.getUser(); 
        const actor = actorData?.user; // usuario que realiza la acción
        if (!actor) return jsonResponse({ error:"No autenticado"},401)

        // variables para payloads
        const supabaseAdmin = getSupabaseAdmin();
        const updates = await request.json().catch(() => ({})); // actualizaciones desde el body
        const userAgent = request.headers.get("user-agent") || "unknown";
        const ip = getClientIp(request);
        

        // leer datos actuales del usuario
        const { data: currentUser, error: fetchErr } = await supabaseAdmin
            .from("user_profiles")
            .select("*")
            .eq("user_id", user_id)
            .single();

        if (fetchErr) return jsonResponse({ error: fetchErr.message ?? "Usuario no encontrado" }, 404);
        if (!currentUser) return jsonResponse({ error: "Usuario no encontrado" }, 404);

        // actualizar usuario
        const { data: updatedUser, error: updateErr } = await supabaseAdmin
            .from("user_profiles")
            .update(updates)
            .eq("user_id", user_id)
            .select()
            .single();

        if (updateErr) return jsonResponse({ error: updateErr.message ?? "Error al actualizar"}, 500);

        // capturar campos cambiados
        const changedFields: ChangedFields = {};
        for (const key of Object.keys(updates)) { // recorrer keys del payload
            const before = currentUser?.[key]; // valor antes de la actualización
            const beforeStr = typeof before === "object" ? JSON.stringify(before):String(before); // convertir a string para comparar
            const after = updates[key]; // valor después de la actualización
            const afterStr = typeof after === "object" ? JSON.stringify(after):String(after); // convertir a string para comparar
            if (beforeStr !== afterStr) changedFields[key] = { before, after }; // si cambió, guardar en el objeto
        };

        // logs para debug
        // console.log("Params en DELETE:", params);
        // console.log("URL:", request.url);
        // console.log("IP detectada:", ip, "Headers:", Object.fromEntries(request.headers));

        // Log de actualización
        await persistLog({
            user_id,
            action: "Usuario actualizado",
            ip_address: ip,
            user_agent: userAgent,
            user_email: updatedUser.email ?? null,
            user_full_name: `${updatedUser.names ?? ""} ${updatedUser.last_name_1 ?? ""} ${updatedUser.last_name_2 ?? ""}`.trim(),
            performed_by: actor.id,
            performed_by_email: actor.email ?? null,
            details: changedFields,
        });

        return new Response(JSON.stringify({ message: "Usuario actualizado correctamente" }), { status: 200 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        console.error("Error PUT /users/[user_id]:", message);
        return new Response(`Error al actualizar usuario: ${message}`, { status: 500 });
    }
};


// Eliminar usuario
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
    try {        
        const user_id = params.user_id;
        if (!user_id) return jsonResponse({ error: "Falta user_id" }, 400);

        const supabase = createServerSupabase({ request, cookies });
        const { data: actorData } = await supabase.auth.getUser();
        const actor = actorData?.user;
        if (!actor) return jsonResponse({ error: "No autenticado" }, 401);

        const supabaseAdmin = getSupabaseAdmin();
        // Obtener datos antes de eliminar
        const { data: user, error: fetchError } = await supabaseAdmin
            .from("user_profiles")
            .select("names, last_name_1, last_name_2, email")
            .eq("user_id", user_id)
            .single();

        if (fetchError) throw new Error("Usuario no encontrado");

        
        const fullName = `${user.names ?? ""} ${user.last_name_1 ?? ""} ${user.last_name_2 ?? ""}`.trim();
        const ip = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || "unknown";
        // log para debug
        // console.log("IP detectada:", ip, "Headers:", Object.fromEntries(request.headers));

        // Log antes de eliminar
        await persistLog({
            user_id: user_id,
            action: "Usuario eliminado",
            ip_address: ip,
            user_agent: userAgent,
            user_email: user.email,
            user_full_name: fullName,
            performed_by: actor.id,
            performed_by_email: actor.email,
            details: { motivo: "Eliminación de usuario" },
            });

        // Eliminar registros
        await supabaseAdmin
                .from("user_profiles")
                .delete()
                .eq("user_id", user_id);

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id); // eliminar de Auth
        if (authError) throw new Error(authError.message); // si hay error al eliminar de Auth

        return new Response(JSON.stringify({ message: "Usuario eliminado correctamente" }), { status: 200 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        console.error("Error DELETE /users/[user_id]:", message);
        return new Response(`Error al eliminar usuario: ${message}`, { status: 500 });
    }
};