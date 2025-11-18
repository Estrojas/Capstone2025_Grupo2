import type { APIRoute } from "astro";
import { createServerSupabase } from "@/lib/supabase/supabaseServer"; 
import { logAction } from "@/lib/logWriter";
import { getClientIp } from "@/lib/utils";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    try {
        const supabase = createServerSupabase({ request, cookies }); 

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user ?? null;

        const ip = getClientIp(request);
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const fullName = user?.user_metadata.full_name || user?.email || 'unknown';

        if (user) {
            await logAction({
                user_id: user.id,
                action: "Cierre de sesión",
                ip_address: ip,
                user_agent: userAgent,
                user_email: user.email ?? null,
                user_full_name: fullName,
                performed_by: user.id,
                performed_by_email: user.email ?? null,
                details: { metodo: "signOut" },
            });
        }

        await supabase.auth.signOut();  // Limpiar sesión y cookies del servidor/navegador
        return redirect("/auth/login"); // Redirigir
    } catch (error) {
        console.error ("Error en signout:", error);
        return redirect("/auth/login"); // Redirigir incluso en error
    }
};