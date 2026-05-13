import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:        resolve(__dirname, 'index.html'),
        main_vr:     resolve(__dirname, 'index_vr.html'),
        experience:  resolve(__dirname, 'experience.html'),
        experience_vr: resolve(__dirname, 'experience_vr.html'),
        success:     resolve(__dirname, 'success.html'),
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
