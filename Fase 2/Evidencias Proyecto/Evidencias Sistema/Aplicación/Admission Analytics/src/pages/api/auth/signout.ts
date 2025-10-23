import type { APIRoute } from "astro";
import { createServerSupabase } from "@/lib/supabase/supabaseServer"; 

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const supabase = createServerSupabase({ request, cookies }); 
    await supabase.auth.signOut();  // Limpiar sesión y cookies del servidor/navegador
    return redirect("/auth/login"); // Redirigir
};