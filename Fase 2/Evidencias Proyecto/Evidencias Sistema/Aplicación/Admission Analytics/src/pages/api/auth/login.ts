import type { APIRoute } from "astro";
import { createServerSupabase } from "@/lib/supabase/supabaseServer"; 
import { loginSchema } from "@/lib/supabase/schema"; 
import { randomBytes } from "node:crypto"; 
import { jsonResponse, handleZodError, normalizeError } from "@/lib/utils"
import { ZodError } from "zod";


// Habilitar o deshabilitar OAuth desde env pública 
const OAUTH_ENABLED =
    (import.meta.env.PUBLIC_OAUTH_ENABLED).toLowerCase() === "true";

// proveedores soportados
const PROVIDERS = [
    "google","github","apple","facebook","discord","twitter", // declaracion de array inmutable con provedores que podemos utilizar
] as const; 
type Provider = (typeof PROVIDERS)[number];  // crea Provider que representan los valores de la lista (solo valores validos)
const isProvider = (p: string): p is Provider =>  // hace que la condicion "p" corresponda a un tipo de proovedor soportado
    (PROVIDERS as readonly string[]).includes(p);


// Iniciar/Obtener OAUTH 
export const GET: APIRoute = async ({ request, cookies }) => {
    try { // valida si OAuth esta activo, si no lo coulta con un status 404
        if (!OAUTH_ENABLED) { 
            return jsonResponse({ ok: false, message: "OAuth deshabilitado." }, 404);
        }

        const url = new URL(request.url);
        const providerParam = url.searchParams.get("provider") ?? "";
        const next = url.searchParams.get("next") ?? "/dashboard";

        if (!isProvider(providerParam)) { // si no es un provider soportado o valido, status 400
            return jsonResponse({ ok: false, message: "Proveedor OAuth no soportado." }, 400);
        }

        const origin = url.origin; // obtiene el dominio actual
        const callbackUrl = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`; // genera URL a la que el proovedor redirigira despues del login

        // Anti-CSRF: guardamos state en cookie httpOnly
        const state = randomBytes(24).toString("hex"); // genera 24 bytes aleatorios (48 caracteres hex)
        const secure = import.meta.env.PROD;
        cookies.set("oauth-state", state, {  // guarda el estado como cookie en httpOnly durante 10 min
            httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 10,  // la cookie solo se envia en https cuando esta en prod
        });

        const supabase = createServerSupabase({ request, cookies });

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: providerParam,  // proveedor seleccionado
            options: { redirectTo: callbackUrl, queryParams: { state } }, 
        });

        // si hay error o no hay URL
        if (error || !data?.url) {
            const msg = error?.message ?? "No se pudo iniciar OAuth";
            return jsonResponse({ ok: false, message: msg }, 400);
        }

        // devolvemos ok true para que rediriga
        return jsonResponse({ ok: true, url: data.url });

    } catch (e) { // captura cualquier excepcion y devuelve status 500
        return jsonResponse({ ok: false, message: String(e) }, 500);
    }
};

// POST para iniciar sesion con credenciales
export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        
        // Obtener y validar el cuerpo JSON y FormData
        const contentType = request.headers.get("content-type") ?? "";
        // Definimos el tipo de datos esperado (email y password)
        let creds;


        if (contentType.includes("application/json")) {
            const body = await request.json().catch(() => ({})); 
            creds = loginSchema.parse(body);
        } else {
            // Manejar FormData 
            const form = await request.formData();
            creds = loginSchema.parse({
                email: form.get("email"),
                password: form.get("password"),
            });
        }
        
        // Crear cliente de servidor (para manejar cookies)
        const supabase = createServerSupabase({ request, cookies });

        // Iniciar sesión con Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword(creds);


        if (error) {
            // Error de autenticación (credenciales inválidas, etc.)
            // return jsonResponse({ ok: false, message: error.message }, 401); 
             throw new Error(error.message); // Siempre Error, nunca objeto plano
        }

        const next = new URL(request.url).searchParams.get("next") ?? "/dashboard";
        
        return jsonResponse({ ok: true, message: "Inicio de sesión exitoso", next});

    } catch (err: unknown) {
        // Manejar errores de Zod o JSON inválido
        if (err instanceof ZodError) {
        return handleZodError(err);
        }

        const normalized = normalizeError(err);
        console.error("Error en /api/auth/login:", normalized);

        return jsonResponse({ ok: false, message: normalized.message }, 500);
    }
};