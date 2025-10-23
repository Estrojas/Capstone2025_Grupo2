import { ZodError } from "zod";

/**
 * Crea una respuesta JSON estandarizada.
 * @param body Objeto a serializar como JSON.
 * @param status Código de estado HTTP (por defecto 200).
 */
export function jsonResponse<T>(body: T, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
        "Content-Type": "application/json",
        },
    });
}

/**
 * Maneja errores de validación de Zod, devolviendo formato uniforme.
 * @param err Instancia de ZodError.
 */
export function handleZodError(err: ZodError): Response {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of err.errors) {
        const key = (issue.path[0] ?? "_base") as string;
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
    }

    console.warn("[Validation Error]", fieldErrors);

    return jsonResponse(
        { ok: false, message: "Error de validación", errors: fieldErrors },
        400
    );
}

/**
 * Formatea un timestamp ISO en una fecha legible local (Chile).
 * @param timestamp Fecha o string ISO.
 */
export function formatTimestamp(timestamp: string | number | Date): string {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) throw new Error("Invalid date");
        return date.toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        });
    } catch {
        return "Fecha inválida";
    }
}

/**
 * Normaliza cualquier valor de error en una instancia Error estándar.
 * @param err Valor de error desconocido.
 */
export function normalizeError(err: unknown): Error {
    if (err instanceof Error) return err;

    if (typeof err === "object" && err !== null && "message" in err) {
        const message = (err as { message?: string }).message ?? "Error desconocido";
        return new Error(message);
    }

    if (typeof err === "string") {
        return new Error(err);
    }

    try {
        return new Error(JSON.stringify(err));
    } catch {
        return new Error("Error desconocido");
    }
}
