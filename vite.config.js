import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    headers: {
      'Content-Security-Policy': 'frame-ancestors *'
    }
  },
  preview: {
    port: 4173,
    headers: {
      'Content-Security-Policy': 'frame-ancestors *'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 2000
  }
});
