import type { APIRoute, APIContext } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSessionSafe } from "@/lib/supabase/supabaseServer";
import { createUserSchema } from "@/lib/supabase/schema";
import { ZodError, z } from "zod";
import type { Profile } from "@/types/Profile";
import { jsonResponse, handleZodError } from "@/lib/utils";
import { logAction } from "@/lib/logWriter";
import { getClientIp } from "@/lib/utils";

// tipos
type CreateUserPayload = z.infer<typeof createUserSchema>;

type AuthUser = {
        user_id: string;
        role: Profile["role"];
        status: Profile["status"];
        email: string;
};

// valida rol y estado
async function requireRole( ctx: APIContext, roles: Array<Profile["role"]> ): Promise<AuthUser | Response> {
        const { user: authUser, supabase } = await getSessionSafe(ctx);

        if (!authUser) { 
                return jsonResponse({ ok: false, message: "No autenticado" }, 401);
        }

        const { data: me, error } = await supabase
                .from("user_profiles")
                .select("role, status")
                .eq("user_id", authUser.id)
                .single();

        if (error || !me) { 
                return jsonResponse({ ok: false, message: "Perfil no encontrado" }, 404);
        }

        if (me.status !== "active") { 
                return jsonResponse({ ok: false, message: "Usuario inactivo" }, 403);
        }

        if (!roles.includes(me.role as Profile["role"])) { 
                return jsonResponse({ ok: false, message: "Sin permisos" }, 403);
        }

        // retorna datos del usuario autenticado
        return {
                user_id: authUser.id,
                role: me.role as Profile["role"],
                status: me.status as Profile["status"],
                email: authUser.email ?? "unknown",
        };
}


// --- CREAR USUARIO ---
export const POST: APIRoute = async (ctx) => {
        const request = ctx.request;
        const supabaseAdmin = getSupabaseAdmin();

        try {
                // validar permisos
                const authResult = await requireRole(ctx, ["admin", "manager"]);
                if (authResult instanceof Response) return authResult;

                const actor = authResult;
                const json = await ctx.request.json().catch(() => ({}));

                let payload: CreateUserPayload;
                
                try {
                        payload = createUserSchema.parse(json);

                } catch (err) {
                        if (err instanceof ZodError) return handleZodError(err);
                        throw err;
                }

                const { password, ...profilePayload } = payload;

                // Crear en Auth
                const { data, error } = await supabaseAdmin.auth.admin.createUser({
                        email: profilePayload.email,
                        password,
                        email_confirm: true,
                });

                if (error || !data?.user) {
                        return jsonResponse({ ok: false, message: error?.message ?? "Error al crear usuario en Auth",},400);
                }

                const user_id = data.user.id;
                const now = new Date().toISOString();

                // Insertar perfil
                const profileInsert: Partial<Profile> = {
                        user_id,
                        ...profilePayload,
                        created_at: now,
                        updated_at: now,
                };

                const { error: insertError } = await supabaseAdmin
                        .from("user_profiles")
                        .upsert([profileInsert], { onConflict: "user_id" });


                // datos para el log
                const ip = getClientIp(request);
                const fullName = `${json.names} ${json.last_name_1 ?? ''} ${json.last_name_2 ?? ''}`.trim();
                const userAgent = request.headers.get('user-agent') || 'unknown';
                

                // si falla la creacion de usuario lo registramos y hacemos rollback
                if (insertError) {
                        await supabaseAdmin.auth.admin.deleteUser(user_id);

                        await logAction({
                                user_id: user_id,
                                action: "Error al crear usuario",
                                ip_address: ip,
                                user_agent: userAgent,
                                user_email: json.email,
                                user_full_name: fullName,
                                performed_by: actor?.user_id ?? null,
                                performed_by_email: actor?.email ?? null,
                                details: {
                                        motivo: "Fallo al insertar perfil",
                                        error: insertError.message,
                                },
                        });
                        
                        return jsonResponse({ ok: false, message: "Error al crear perfil" }, 500);
                }

                await logAction({
                        user_id: user_id,
                        action: "Usuario creado",
                        ip_address: ip,
                        user_agent: userAgent,
                        user_email: json.email,
                        user_full_name: fullName,
                        performed_by: actor?.user_id ?? null,
                        performed_by_email: actor?.email ?? null,
                        details: {
                                role: profilePayload.role,
                                status: profilePayload.status,
                                area_id: profilePayload.area_id,
                                campus_id: profilePayload.campus_id,
                                },
                });

                return jsonResponse({ ok: true, user_id }, 201);
        } catch (e: any) {
                return jsonResponse({ ok: false, message: String(e?.message ?? e) }, 500);
        }
};
