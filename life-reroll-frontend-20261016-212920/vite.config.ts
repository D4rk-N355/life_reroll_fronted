import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Frontend-only handoff; /api requires a separate backend.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  build: { outDir: 'dist' },
  server: { host: '127.0.0.1', port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false } } },
  preview: { host: '127.0.0.1', port: 4173, proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false } } },
});
