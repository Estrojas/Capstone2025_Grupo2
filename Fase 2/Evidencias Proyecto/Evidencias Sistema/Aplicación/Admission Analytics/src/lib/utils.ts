import { ZodError } from "zod";

/**
 * Crea una respuesta JSON estandarizada.
 * @param body Objeto a serializar como JSON.
 * @param status Código de estado HTTP (por defecto 200).
 */
export function jsonResponse<T>(body: T, status = 200): Response { // respuesta JSON estandarizada
    return new Response(JSON.stringify(body), { // convertir body a JSON
        status, // codigo de estado HTTP
        headers: { // headers de la respuesta
        "Content-Type": "application/json", // tipo de contenido JSON
        },
    });
}

/**
 * Maneja errores de validación de Zod, devolviendo formato uniforme.
 * @param err Instancia de ZodError.
 */
export function handleZodError(err: ZodError): Response { // maneja errores de validacion Zod
    const fieldErrors: Record<string, string[]> = {}; // objeto para errores por campo

    for (const issue of err.errors) { // iterar sobre cada error
        const key = (issue.path[0] ?? "_base") as string; // obtener campo o _base para errores generales
        if (!fieldErrors[key]) fieldErrors[key] = []; // inicializar array si no existe
        fieldErrors[key].push(issue.message); // agregar mensaje de error al campo
    }

    console.warn("[Validation Error]", fieldErrors); // para debug

    return jsonResponse( // respuesta con errores de validacion
        { ok: false, message: "Error de validación", errors: fieldErrors }, // cuerpo de la respuesta
        400 // codigo HTTP 400 Bad Request
    );
}

/**
 * Normaliza cualquier valor de error en una instancia Error estándar.
 * @param err Valor de error desconocido.
 */
export function normalizeError(err: unknown): Error { // normaliza cualquier error a instancia Error
    if (err instanceof Error) return err; // si ya es Error, retornar tal cual

    if (typeof err === "object" && err !== null && "message" in err) { // si es objeto con propiedad message
        const message = (err as { message?: string }).message ?? "Error desconocido"; // obtener mensaje
        return new Error(message); // retornar nueva instancia Error
    }

    if (typeof err === "string") { // si es string, crear Error con ese mensaje
        return new Error(err); // retornar nuevo error
    }

    try { // intentar convertir a string
        return new Error(JSON.stringify(err)); // retornar Error con string JSON
    } catch { // si falla, retornar mensaje por defecto
        return new Error("Error desconocido");
    }
}

/**
 * Obtiene la IP del cliente desde la solicitud, considerando proxies.
 * @param request Objeto Request de la API.
*/

export function getClientIp(request: Request): string | null {
    const headers = request.headers; // obtener headers de la solicitud
    const headerKeys = [ // posibles headers que pueden contener la IP del cliente
        "x-forwarded-for",
        "cf-connecting-ip",
        "x-real-ip",
        "client-ip",
        "fastly-client-ip",
        "true-client-ip",
        "x-cluster-client-ip",
        "x-forwarded",
        "forwarded-for",
        "forwarded",
    ];

    for (const key of headerKeys) { // iteracion de headers
        const value = headers.get(key); // obtener valor del header

        if (value && value.toLowerCase() !== "unknown") { // si el header existe y no es "unknown"
            const ip = value.split(",")[0].trim(); // en caso de multiples IPs, tomar la primera
            
            if (ip) // si hay una IP valida
                return ip; // se retorna
        }
    }

    const maybeIp = (request as any).ip ?? null; // intentar obtener IP directa

    if (maybeIp && maybeIp.toLowerCase?.() !== "unknown")  // si es valida y no es "unknown"
        return maybeIp; // se retorna

    return "127.0.0.1"; // ip por defecto
    }


// Convierte un string "YYYY-MM-DD" a un objeto Date en hora local.
export function toLocalDate(dateStr: string): Date | null { 
    if (!dateStr) return null; // si no hay fecha, retornar null

    const [y,m,d] = dateStr.split("-").map(Number); // separar y convertir a números

    if (!y || !m || !d) return null; // si falta algún componente, retornar null

    return new Date(Date.UTC(y, m - 1, d)); // hora local inicio del día
}

// Genera un rango de fechas en formato ISO para consultas.
export function rangeDate(date_from: string, date_to: string){
    const fromDate = toLocalDate(date_from); // convertir fecha desde
    const toDate = toLocalDate(date_to); // convertir fecha hasta

    const fromIso = fromDate ? fromDate.toISOString() : null; // formato ISO
    const toIso = toDate ? new Date(toDate.getTime() + 24*60*60*1000).toISOString() : null; // sumar un día

    return { fromIso, toIso }; // retornar objeto con fechas en ISO

}


