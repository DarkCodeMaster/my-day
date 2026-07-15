import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['animal-island-vue'],
  },
  build: {
    sourcemap: true,
    target: 'esnext',
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: [
        __dirname,
        resolve(__dirname, '../animal-island-vue'),
      ],
    },
  },
});
