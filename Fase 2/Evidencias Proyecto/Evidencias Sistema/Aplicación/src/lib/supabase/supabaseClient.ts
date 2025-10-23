import { createClient, type Session, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { Profile } from "@/types/Profile"; 


// Cliente Base

// cliente de supabase para el navegador
export const supabaseBrowser = createClient(
    // El '!' (Non-null assertion) es aceptable aquí porque env.d.ts garantiza que estas variables existen.
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            persistSession: true, // guarda sesion entre recargas
            autoRefreshToken: true, // renueva el token antes de expirar
            detectSessionInUrl: true, // útil para ingresos OAuth 
        },
    },
);

// retorno de cliente para no exponer la const anterior
export const getSupabaseBrowser = () => supabaseBrowser;


// Autenticación (Auth)


// obtener sesion de usuario
export async function getCurrentUser() {
    const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser(); // devuelve datos del usuario autenticado
    const { data: { session }, error: sessError } = await supabaseBrowser.auth.getSession(); // obtiene token de la sesion actual
    return {
        data: { user: user as SupabaseAuthUser | null, session: session as Session | null },
        error: userError ?? sessError ?? null,
    };
}

// singup
export async function signUp(user: Profile & { password: string }) {
    const { user_id, email, password, ...rest } = user;

    // crea usuario en auth
    const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({ email, password }); // crea el usuario en el auth de supa
    if (authError || !authData?.user?.id) {
        return { data: null, error: authError ?? new Error("No se pudo crear usuario en Auth.") };
    }

    // inserta perfil sin contraseña
    const profile: Profile = {
        user_id: authData.user.id,
        email,
        ...rest, // ...rest para evitar error de TS si rest tiene campos no declarados en profile
    };

    // inserta perfil
    const { data, error } = await supabaseBrowser.from("user_profiles").insert([profile]).select("*").single();
    return { data, error };
}

// login
export async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    return { data, error };
}

// logout
export async function signOut() {
    const { error } = await supabaseBrowser.auth.signOut();
    return { error };
}


// Perfiles de Usuario (CRUD Básico)


// obtener perfil propio (lado navegador)
export async function getProfile() {
    const { data: { user }, error: userErr } = await supabaseBrowser.auth.getUser(); // obtiene user_id de supa auth
    if (userErr) return { data: null, error: userErr };
    if (!user) return { data: null, error: new Error("No hay usuario autenticado.") };

    // busca el registro del usuario con el user_id
    const { data, error } = await supabaseBrowser
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

    return { data: data as Profile | null, error };
}


// Actualiza/Inserta perfil
export async function upsertProfile(partial: Partial<Profile>) { // partial indica que todos los campos son opcionales
    const { data: { user }, error: userErr } = await supabaseBrowser.auth.getUser(); // obtiene al usuario autenticado
    if (userErr) return { data: null, error: userErr };
    if (!user) return { data: null, error: new Error("No hay usuario autenticado.") };

    const payload: Partial<Profile> = {
        user_id: user.id, // obliga a utilizar el user_id de auth
        email: partial.email ?? user.email ?? "", // intenta de usar partial, si no usa el email desde auth, si no, lo entrega vacio
        ...partial, // el resto de los campos quedan como partial
    };

    const { data, error } = await supabaseBrowser
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" }) // llama al endpoint para hacer un upsert
        .select("*")
        .single();

    return { data: data as Profile | null, error };
}

// Elimina el perfil del usuario autenticado
export async function deleteOwnProfile() {
    const { data: { user }, error: userErr } = await supabaseBrowser.auth.getUser();
    if (userErr) return { data: null, error: userErr };
    if (!user) return { data: null, error: new Error("No hay usuario autenticado.") };

    // Eliminar el perfil de la tabla 'user_profiles'
    const { data: profileData, error: profileError } = await supabaseBrowser
        .from("user_profiles")
        .delete()
        .eq("user_id", user.id)
        .select("*")
        .single();

    if (profileError) return { data: null, error: profileError };
    
    // Cerrar la sesión del usuario para evitar errores de RLS
    await supabaseBrowser.auth.signOut();
    
    return { data: profileData, error: null };
}


// Datos de Referencia (Tablas Públicas)


// obtener campus
export async function getCampus() {
    const { data, error } = await supabaseBrowser.from("campus").select("*");
    // Recomendación: tipar el retorno con 'as Campus[] | null' si tienes el tipo Campus
    return { data, error };
}

// obtener areas
export async function getAreas() {
    const { data, error } = await supabaseBrowser.from("areas").select("*");
    return { data, error };
}

// logs
export async function getLogs() {
    const { data, error } = await supabaseBrowser.from("logs").select("*");
    return { data, error };
}