import { type EmailOtpType } from '@supabase/supabase-js' // define valores type para verificacion OTP
import { type APIRoute } from 'astro'
import { createServerSupabase } from '@/lib/supabase/supabaseServer' 


// Helper de redirección a error (para unificar el manejo de errores de Auth)
const errorRedirect = (redirect: (path: string) => Response, message: string) => {
    return redirect(`/auth/error?m=${encodeURIComponent(message)}`);
};


export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const requestUrl = new URL(request.url) // crea solicitud url
    const token_hash = requestUrl.searchParams.get('token_hash') // extrae token enviado para verificar OTP
    const type = requestUrl.searchParams.get('type') as EmailOtpType | null // extrae el tipo OTP "magic link","recovery", etc...
    const next = requestUrl.searchParams.get('next') || '/' // Aseguramos que la ruta por defecto es /dashboard

    // Si existe el token, verifica
    if (token_hash && type) {
        // crea instancia en la sesion actual
        const supabase = createServerSupabase({ request, cookies })
        
        // valida token OTP recibido
        const { error } = await supabase.auth.verifyOtp({
            type, // tipo de verificacion "signup","magic link", etc...
            token_hash, // token unico recibido en la URL
        })

        // Manejo de resultado
        if (!error) {
            // si no hay error redirige con next
            return redirect(next)
        }
        
        // Error de verificación
        console.error('Error verificando OTP:', error)
        // Redirigir a la página de error centralizada de Auth
        return errorRedirect(redirect, "No se pudo verificar el enlace de autenticación.");
    }

    // Si no hay token o tipo, redirige a error genérico (o 404)
    return errorRedirect(redirect, "Enlace de verificación inválido o incompleto.");
}