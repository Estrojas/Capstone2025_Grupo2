import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import type { Log } from "@/lib/supabase/schema"; 

const supabaseAdmin = getSupabaseAdmin()

interface LogEntry {
    user_id?: string | null;
    action: string;
    ip_address?: string | null;
    user_agent?: string | null;
    user_email?: string | null;
    user_full_name?: string | null;
    performed_by?: string | null;
    performed_by_email?: string | null;
    details?: Record<string, any> | null;
}

export async function logAction(entry: LogEntry) {
    try {
        const now = new Date().toISOString(); // UTC
        const { error } = await supabaseAdmin.from("logs").insert([
        {
            user_id: entry.user_id ?? null,
            action: entry.action,
            ip_address: entry.ip_address && entry.ip_address !== "unknown" ? entry.ip_address:  null,
            user_agent: entry.user_agent ?? null,
            user_email: entry.user_email ?? null,
            user_full_name: entry.user_full_name ?? null,
            performed_by: entry.performed_by ?? null,
            performed_by_email: entry.performed_by_email ?? null,
            details: entry.details ?? {},
        },
        ]);

        if (error) {
        console.error("Error insertando log:", error);
        }
    } catch (err) {
        console.error("Error inesperado al crear log:", err);
    }
}