import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/utils";

// Endpoint de prueba ping
export const GET: APIRoute = ({ request }) => {
    const { pathname } = new URL(request.url);
    
    const body = {
        ok: true, // estado
        route: pathname,        // ruta del endpoint
        time: new Date().toISOString(), // hora actual en ISO
        message: "Pong!",    // mensaje
        // env: import.meta.env.MODE, // Descomentar para debug
    };

    return jsonResponse(body, 200); 
};