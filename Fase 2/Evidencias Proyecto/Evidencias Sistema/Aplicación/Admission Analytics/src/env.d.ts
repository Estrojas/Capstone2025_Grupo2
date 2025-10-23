// Referencia a los tipos generados por Astro, con esto traemos los tipos generados por Astro (.props,.request,etc...)
/// <reference types="astro/client" />  

// Definir tipos para variables de entorno
interface ImportMetaEnv {
    // Variables Públicas (cliente y servidor) Astro expone estas variables al cliente si usan el prefijo PUBLIC_
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;

    // Ajustamos el tipo de la variable booleana
    readonly PUBLIC_OAUTH_ENABLED: 'true' | 'false'; 
    
    // Añadimos la variable 'SITE' que defini en .env y usamos en astro.config.mjs
    readonly SITE: string;
    readonly VERCEL_URL?: string;

    // Variables Privadas (servidor) usadas en el frontmatter de .astro, endpoints de API, y middleware
    // readonly SUPABASE_URL: string;
    // readonly SUPABASE_SERVICE_ROLE_KEY: string;
    // readonly NODE_ENV: 'development' | 'production' | 'test';

}

// Extender ImportMeta para incluir env
interface ImportMeta {
    readonly env: ImportMetaEnv;
}