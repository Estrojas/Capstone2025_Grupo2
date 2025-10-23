import type { APIRoute } from "astro";
import { createServerSupabase } from "@/lib/supabase/supabaseServer"; 

// Habilitar o deshabilitar OAuth desde env pública
const OAUTH_ENABLED =
    (import.meta.env.PUBLIC_OAUTH_ENABLED).toLowerCase() === "true"; 

// helper de redirección a errores
const errorRedirect = (redirect: (path: string) => Response, message: string) => {
    return redirect(`/auth/error?m=${encodeURIComponent(message)}`);
};


// handler get
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    // Verificación de habilitación
    if (!OAUTH_ENABLED) { 
        return new Response("Not found", { status: 404 }); 
    }

    const url = new URL(request.url); 
    const code = url.searchParams.get("code"); 
    const next = url.searchParams.get("next") ?? "/dashboard"; 

    // Comprobar si falta el código
    if (!code) {
        return errorRedirect(redirect, "Falta el código de autenticación.");
    }

    // ANTI-CSRF
    const state = url.searchParams.get("state");
    const stateCookie = cookies.get("oauth-state")?.value;
    
    // Si no coincide o falta el estado (CSRF Attack posible)
    if (!state || !stateCookie || state !== stateCookie) {
      // Borramos la cookie de estado antes de redirigir a error
        cookies.delete("oauth-state", { path: "/" });
        return errorRedirect(redirect, "Estado OAuth inválido (posible ataque CSRF).");
    }
    
    // Si es exitoso, borramos la cookie de estado antes de proceder
    cookies.delete("oauth-state", { path: "/" });


    // Intercambio de Código por Sesión
    const supabase = createServerSupabase({ request, cookies });

    const { error } = await supabase.auth.exchangeCodeForSession(code); 

    if (error) {
        const msg = "No se pudo completar el inicio de sesión";
        return errorRedirect(redirect, msg);
    }

    // Sesión creada exitosamente
    return redirect(next);
};