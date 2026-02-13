// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/homework-easy-times/', // ⚠️ שנה את זה לשם הרפוזיטורי שלך!
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true
  }
});
