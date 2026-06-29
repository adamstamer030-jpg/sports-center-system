import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' ضروري لأن الأبليكيشن هيتفتح من ملف محلي (file://) بعد البناء
export default defineConfig({
  base: './',
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
