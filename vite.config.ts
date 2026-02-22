import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  base: '/toppa-inc/',
  plugins: [react()],
  define: {
    // 'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://us-central1-gen-lang-client-0841897546.cloudfunctions.net/toppa_app_api'),
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/workers/**',
      '**/tsumikiri/**',
      'test/unit/**',
      'src/api/**/*.test.*',
    ],
  },
});
