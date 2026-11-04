import { defineConfig } from 'vite';

// base relativa: el build funciona en cualquier subcarpeta de un hosting estático
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
});
