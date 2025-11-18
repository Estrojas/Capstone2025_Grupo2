import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel'; //  Node runtime
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
// Utilizamos loadEnv para asegurarnos de que el sitio se obtenga correctamente
import { loadEnv } from 'vite'

// Cargamos variables de entorno para usar la URL
const env = loadEnv(process.env.NODE_ENV, process.cwd(), ''); // Asegura que se carguen las variables sin el prefijo

export default defineConfig({
  site: env.SITE || 'http://localhost:4321', // Obtiene la url para produccion o fallback del local para dev/build
  output: 'server', // Salida para el adaptador de vercel
  adapter: vercel({
    webAnalytics: { enabled: true },
    // Se puede añadir "edge" o "serverless" para features espicitas
  }),

  vite: {
    resolve: {
      alias: {'@': fileURLToPath(new URL('./src', import.meta.url)), },// Alias para referirce al src
    },
    envPrefix: ['VITE_', 'PUBLIC_'] // Los pregijos para asegurar que las variables privadas sean accesibles
  },
  integrations: [react()]
});