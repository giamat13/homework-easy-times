// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // נתיב יחסי - יעבוד בכל מקום!
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true
  }
});
