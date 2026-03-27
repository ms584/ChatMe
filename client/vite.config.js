import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Only proxy GitHub OAuth routes to backend — NOT /auth/callback (that's a React route)
      '/auth/github': 'http://localhost:5000',
      '/auth/me': 'http://localhost:5000',
      '/auth/logout': 'http://localhost:5000',
      '/conversations': 'http://localhost:5000',
      '/messages': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
