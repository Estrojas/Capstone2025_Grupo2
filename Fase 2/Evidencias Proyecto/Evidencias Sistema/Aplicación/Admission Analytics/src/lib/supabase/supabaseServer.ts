import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { APIContext } from "astro";

// contexto que contiene request y cookies son parametros que utilizamos en server-side
type Ctx = Pick<APIContext, "request" | "cookies">;

// configuracion de cookies
type Options = {
  sameSite?: CookieOptions["sameSite"];      // "lax" | "strict" | "none"
  cookieEncoding?: "raw" | "base64url";      // codificación de las cookies
};

// Función principal para crear el cliente de Supabase para SSR
export function createServerSupabase(ctx: Ctx, opts: Options = {}) {
    // Usamos las variables públicas tipadas por env.d.ts
    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
        throw new Error("[createServerSupabase] Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY");
    }

    // PROD es una variable estándar de Vite/Astro
    const isProd = process.env.NODE_ENV === "production" || import.meta.env.PROD;
    const sameSite = opts.sameSite ?? "lax"; // valor por defecto "lax" si no se especifica

    // No fijamos "domain" => la cookie queda asociada al host actual.
    const baseCookie: CookieOptions = {
        path: "/",       // cookie disponible en toda la ruta
        httpOnly: true,  // inaccesible desde JS del navegador
        sameSite,        // políticas sameSite
        secure: isProd,  // solo en https si está en prod
    };

    // si alguna infra rompe cookies con ciertos chars, usar cookieEncoding: "base64url"
    const cookieEncoding = opts.cookieEncoding ?? "base64url";

    // retorna instancia del cliente de supa configurado para el server
    return createServerClient(url, anon, {
        // manejo de cookies para SSR
        cookies: {
        get(name) { // obtiene el valor de la cookie
            return ctx.cookies.get(name)?.value; // Astro cookies devuelven un objeto con 'value'
        },
        set(name, value, options) { // fijamos el valor de la cookie
            ctx.cookies.set(name, value, { // Astro usa `set` para crear/modificar cookies
            ...baseCookie, 
            ...(options ?? {}), 
            });
        },
        remove(name, options) {
            // Astro usa `delete` para borrar cookies
            ctx.cookies.delete(name, { // elimina la cookie
            path: "/", 
            ...(options ?? {}),
            });
        },
        },
        cookieEncoding,
    });
    }

// obtiene la sesion actual
export async function getSessionSafe(ctx: Ctx, opts?: Options) {
    const supabase = createServerSupabase(ctx, opts); // crea una instancia de supa usando el contexto actual

    // obtener sesion y usuario
    const {
        data: sessionData,
        error: sessionError,
    } = await supabase.auth.getSession(); // llama a la API para obtener la sesion activa

    const {
        data: userData,
        error: userError,
    } = await supabase.auth.getUser(); // llama a la API para obtener el usuario actual

    const error = userError ?? sessionError ?? null; // prioriza errores

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

    return {
        supabase,
        session: sessionData?.session ?? null,
        user: userData.user,
        profile: profile ?? null,
        error: error ?? profileError ?? null,
    };
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
