import type { APIRoute } from "astro";
import { createServerSupabase } from "@/lib/supabase/supabaseServer";
import { jsonResponse, getClientIp } from "@/lib/utils";
import { logAction } from "@/lib/logWriter";

// límites simples para la contraseña
const MIN_PASS = 6;
const MAX_PASS = 72;

export const PUT: APIRoute = async ({ request, cookies }) => {
    try {
        const supabase = createServerSupabase({ request, cookies });

        // obtener usuario autenticado
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
            return jsonResponse({ ok: false, message: "No autenticado." }, 401);
        }
        const actor = userData.user;

        // leer body y validar contraseña
        const body = await request.json().catch(() => ({}));
        const password: string | undefined = body?.password;

        if (!password || typeof password !== "string") {
            return jsonResponse({ ok: false, message: "Falta contraseña." }, 400);
        }

        if (password.length < MIN_PASS) {
            return jsonResponse(
                { ok: false, message: `La contraseña debe tener al menos ${MIN_PASS} caracteres.` },
                400
            );
        }

        if (password.length > MAX_PASS) {
            return jsonResponse(
                { ok: false, message: `La contraseña no puede exceder ${MAX_PASS} caracteres.` },
                400
            );
        }

        // actualizar contraseña del propio usuario
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
            return jsonResponse(
                { ok: false, message: updateErr.message ?? "Error al actualizar contraseña." },
                500
            );
        }

        // log
        const ip = getClientIp(request);
        const userAgent = request.headers.get("user-agent") || "unknown";

        await logAction({
            user_id: actor.id,
            action: "Contraseña actualizada",
            ip_address: ip,
            user_agent: userAgent,
            user_email: actor.email ?? null,
            user_full_name: null,
            performed_by: actor.id,
            performed_by_email: actor.email ?? null,
            details: { selfService: true },
        });

        
        return jsonResponse({ ok: true, message: "Contraseña actualizada correctamente." }, 200);

    } catch (err: any) {
        console.error("Error PUT /api/auth/password:", err);
        return jsonResponse(
            { ok: false, message: err?.message || "Error interno al cambiar contraseña." },
            500
        );
    }
};