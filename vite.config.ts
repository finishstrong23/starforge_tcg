import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Use relative paths so assets load correctly in Capacitor's file:// context
  base: './',
  build: {
    outDir: 'dist',
    // Generate source maps for easier mobile debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // Allow access from devices on the same network for Capacitor live reload
    host: true,
  },
});
