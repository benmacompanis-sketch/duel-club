import { defineConfig } from 'vite';

// base relativa: el build funciona en cualquier subcarpeta de un hosting estático
export default defineConfig({
  base: './',
  // commit publicado (Vercel o GitHub Actions): las pruebas en vivo esperan a que el sitio tenga esta versión
  define: { __BUILD_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local') },
  server: { port: 5173, open: false },
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
});
