import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSessionSafe } from "@/lib/supabase/supabaseServer";
import { jsonResponse, getClientIp } from "@/lib/utils";
import { logAction } from "@/lib/logWriter";

const MIN_PASS = 6;
const MAX_PASS = 72;

export const PUT: APIRoute = async ({ request, cookies }) => {
    try {
        // obtener usuario logueado
        const { user: actor, error: sessionError } = await getSessionSafe({ request, cookies });

        if (sessionError || !actor) {return jsonResponse({ ok: false, message: "No autenticado." }, 401);
        }

        // leer body
        const body = await request.json().catch(() => ({} as any));
        const password: string | undefined = body?.password;
        const targetUserId: string | undefined = body?.user_id; // usuario a modificar (opcional)

        // validar password
        if (!password || typeof password !== "string") {
        return jsonResponse({ ok: false, message: "Falta contraseña." }, 400);
        }

        if (password.length < MIN_PASS) {
        return jsonResponse({ ok: false, message: `La contraseña debe tener al menos ${MIN_PASS} caracteres.` },400);
        }

        if (password.length > MAX_PASS) {
        return jsonResponse( { ok: false, message: `La contraseña no puede exceder ${MAX_PASS} caracteres.` }, 400);
        }

        const supabaseAdmin = getSupabaseAdmin();

        // determinar si es cambio propio o de otro usuario
        let finalTargetUserId = actor.id;
        const details: Record<string, any> = { selfService: true };

        if (targetUserId && targetUserId !== actor.id) {
            // cambio de contraseña de otro usuario y chequear rol del actor
            const { data: profile, error: profileErr } = await supabaseAdmin
                .from("user_profiles")
                .select("role")
                .eq("user_id", actor.id)
                .maybeSingle();

            if (profileErr) {
                console.error("[password] Error obteniendo perfil del actor:", profileErr);
                return jsonResponse({ ok: false, message: "No se pudo validar permisos del usuario." },500);
            }

            if (!profile || !["admin", "manager"].includes(profile.role)) {
                return jsonResponse({ ok: false, message: "No tienes permisos para cambiar la contraseña de otros usuarios." },403);
            }

            finalTargetUserId = targetUserId;
            details.selfService = false;
            details.changedUserId = targetUserId;
        }

        // actualizar contraseña del usuario objetivo
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(finalTargetUserId,{ password });

        if (updateErr) {
        console.error("[password] Error al actualizar contraseña:", updateErr);
        return jsonResponse({ ok: false, message: updateErr.message ?? "Error al actualizar contraseña." },500);
        }

        // log
        const ip = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || "unknown";

        await logAction({
            user_id: finalTargetUserId,                
            action: "Contraseña actualizada",
            ip_address: ip,
            user_agent: userAgent,
            user_email: null,                          
            user_full_name: null,
            performed_by: actor.id,                   
            performed_by_email: actor.email ?? null,
            details,
        });

        return jsonResponse({ ok: true, message: "Contraseña actualizada correctamente." },200);

    } catch (err: any) {
        console.error("Error PUT /api/auth/password:", err);
        return jsonResponse({ ok: false, message: err?.message || "Error interno al cambiar contraseña." },500);
    }
};
