import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        experience: resolve(__dirname, 'experience.html'),
        success: resolve(__dirname, 'success.html')
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
