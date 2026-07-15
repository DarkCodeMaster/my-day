import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  base: './',
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
    host: '127.0.0.1',
    open: true,
    watch: {
      ignored: ['**/LS*.png'],
    },
    fs: {
      allow: [
        __dirname,
        resolve(__dirname, '../animal-island-vue'),
      ],
    },
  },
});
