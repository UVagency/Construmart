import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:           resolve(__dirname, 'index.html'),
        vr:             resolve(__dirname, 'vr/index.html'),
        experience:     resolve(__dirname, 'experience.html'),
        experience_vr:  resolve(__dirname, 'vr/experience.html'),
        success:        resolve(__dirname, 'success.html'),
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
