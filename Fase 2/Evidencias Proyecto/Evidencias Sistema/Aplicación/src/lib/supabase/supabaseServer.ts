import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { APIContext } from "astro";

// tipo auxiliar que representa una cookie
type ServerCookie = { name: string; value: string; options?: CookieOptions };
// contexto que contiene request y cookies son parametros que utilizamos en server-side
type Ctx = Pick<APIContext, "request" | "cookies">; 

// configuracion de cookies y dominio
type Options = {
    cookieDomain?: string; // Establece el dominio de las cookies "https://..."
    sameSite?: CookieOptions["sameSite"]; // Controla politicas samsite "lax" | "strict" | "none"
    cookieEncoding?: "raw" | "base64url"; // Como se decodifican las cookies, default "raw"
};


// Función principal para crear el cliente de Supabase para SSR
export function createServerSupabase(ctx: Ctx, opts: Options = {}) {
    // Usamos las variables públicas tipadas por env.d.ts
    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    // PROD es una variable estándar de Vite/Astro
    const isProd = (process.env.NODE_ENV === "production") || import.meta.env.PROD;
    // vercel lo expone la url a travez del process para runtime
    const vercelUrl = (process.env.VERCEL_URL as string) ?? (import.meta.env.VERCEL_URL as string) ?? "";
    const siteUrl = import.meta.env.SITE ?? "";
    // dominio de cookies, permitir por override por opts o usar la url vercel
    const inferredDomain = opts.cookieDomain ?? (vercelUrl ? vercelUrl.split(":")[0]:undefined) ?? (siteUrl ? new URL(siteUrl).host:undefined);
    const sameSite = opts.sameSite ?? "lax"; // valor por defecto "lax" si no se especifica

    // Si se usa subdominios, pon cookieDomain en opts.
    const baseCookie: CookieOptions = {
        path: "/", // cookie disponible en toda la ruta
        httpOnly: true, // inaccesible desde js
        sameSite, // politicas samsite
        secure: isProd, // solo en https si esta en prod
        ...(inferredDomain ? { domain: inferredDomain } : {}), // aplica dominio
    };

    // si alguna infra rompe cookies con ciertos chars, usar cookieEncoding: "base64url"
    const cookieEncoding = opts.cookieEncoding ?? "raw";

    // retorna instancia del cliente de supa configurado para el server
    return createServerClient( url, anon,
        { // manejo de cookies para SSR
            cookies: {
                getAll: (): { name: string; value: string }[] => { // recuper cookies de la peticion http
                    const raw = ctx.request.headers.get("cookie") ?? ""; // obtiene la peticion de la cookie
                    if (!raw) return [];
                    return raw
                            .split(/; */) // divide las cookies con ";", limpia y parsea cada una
                            .filter(Boolean)
                            .map((kv) => {
                                // separa cada cookie con "=" en nombre y valor
                                const i = kv.indexOf("=");
                                const name = decodeURIComponent(i >= 0 ? kv.slice(0, i) : kv);
                                const value = decodeURIComponent(i >= 0 ? kv.slice(i + 1) : "");
                                return { name, value };
                });
            },
            // crea o actualiza cookies en la respuesta http
            setAll: (cookiesArr: ServerCookie[]) => { 
                cookiesArr.forEach(({ name, value, options }) => {
                    ctx.cookies.set(name, value, { ...baseCookie, ...(options ?? {}) }); // usa API de astro para restableser las cookies
            });
            },
        },
            cookieEncoding, // codificacion de cookies para supa
        }
    );
}


// obtiene la sesion actual
export async function getSessionSafe(ctx: Ctx, opts?: Options) {
    const supabase = createServerSupabase(ctx, opts); // crea una instancia de supa usando el contexto actual
    // obtener sesion y usuario
    const { data: sessionData , error: sessionError } = await supabase.auth.getSession(); // llama a la API para obtener la sesion activa
    const { data: userData, error: userError } = await supabase.auth.getUser();

    const error = userError ?? sessionError ?? null

    // si hay problemas obteniendo el usuario, se retorna todo en null
    if (!userData?.user) {
        return { supabase, session: null, user: null, profile: null, error };
    }

    // consulta del perfil
    const { data: profile, error: profileError } = await supabase
            .from("user_profiles") // Asegúrate que el nombre de la tabla es correcto
            .select("user_id, role, names, last_name_1, last_name_2, email")
            .eq("user_id", userData.user.id)
            .maybeSingle();

    if (profileError) {
        console.error("[getSessionSafe] Error al obtener perfil:", profileError);
    }

    return { supabase, session: sessionData?.session ?? null, user: userData.user, profile: profile ?? null, error: error ?? profileError ?? null };
    
}

// obtiene la sesion y lanza error si falla o no existe
export async function getSessionStrict(ctx: Ctx, opts?: Options) {
    const { supabase, session, user, error } = await getSessionSafe(ctx, opts);
    if (error) {
        // Normaliza cualquier error no-Error que venga desde Supabase u otras libs
        const msg = (error && (error.message ?? String(error))) || "Error obteniendo sesión";
        throw new Error(msg);
    }
    if (!session || !user) throw new Error("Sin sesión autenticada.");
    return { supabase, session, user };
}

// exige sesion y devuelve una redirección si no hay
export async function requireSession(ctx: Ctx, redirectTo = "/auth/login", opts?: Options) { 
    const { supabase, session, user } = await getSessionSafe(ctx, opts);
    if (!session || !user) {
        // Devuelve el objeto con la propiedad 'redirect' para que el código llamador lo maneje
        return { supabase, session: null, user: null, redirect: redirectTo };
    }
    return { supabase, session, user, redirect: undefined };
}