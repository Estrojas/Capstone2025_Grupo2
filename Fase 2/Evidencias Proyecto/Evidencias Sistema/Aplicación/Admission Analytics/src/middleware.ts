import { defineMiddleware } from "astro:middleware";
import { getSessionSafe } from "./lib/supabase/supabaseServer"; 

// Definicion de rutas


// Rutas o prefijos estáticos (no requieren autenticación ni procesamiento)
const STATIC_PREFIXES_BASE = [
    "/_astro", "/_image", "/assets", "/favicon", "/robots.txt", "/sitemap.xml", "/images", "/img", "/fonts", "/js",
];

// Rutas de módulos para entorno de desarrollo (Vite)
const DEV_MODULE_PREFIXES = [
    "/@fs", "/@vite", "/@id", "/node_modules", "/src", "/lib",
]

// Unificación de entornos estáticos
const STATIC_PREFIXES = import.meta.env.DEV ? [...STATIC_PREFIXES_BASE, ...DEV_MODULE_PREFIXES] : STATIC_PREFIXES_BASE;


// Rutas abiertas (no requieren sesión activa)
const OPEN_PREFIXES = [
    "/api", "/_actions", "/auth/login", "/auth/logout",
];

// Helper para verificar si una ruta coincide con la lista
const matches = (p: string, list: string[]) => 
    list.some((x) => p === x || p.startsWith(x + "/")); // coincidencia exacta o prefijo


// Middleware global
export const onRequest = defineMiddleware(async (ctx, next) => { 
    const { pathname } = new URL(ctx.request.url); // mapeo de la ruta solicitada

  // Manejo de Solicitudes OPTIONS/HEAD y Rutas Estáticas/Abiertas
    if (
        ctx.request.method === "OPTIONS" || 
        ctx.request.method === "HEAD" ||
        matches(pathname, STATIC_PREFIXES) || matches(pathname, OPEN_PREFIXES) // Pasan sin autenticacion
    ) {
        return next();
    }

  // Verificar sesion
    const { user } = await getSessionSafe(ctx);

  // Redirección para rutas raíz
    if (pathname === "/") {
        return user ? next() : ctx.redirect("/auth/login");
    }

    // Redirección para rutas protegidas (si no hay usuario, vamos al login)
    if (!user) {
        // Redirige al login, incluyendo la ruta actual en la URL si es necesario
        const redirectPath = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
        return ctx.redirect(redirectPath);
    }

    // Si tiene sesión activa y accede a la página de login, redirige al dashboard.
    if (pathname.startsWith("/auth/login")) {
        // Si está logueado y va a login, mandamos al dashboard
        return ctx.redirect("/");
    }

  // Continuar con la petición si todo es válido
    return next();
});
