import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Esta es la experiencia MOBILE, servida desde la raíz del dominio
// (construmart.uv.agency/). La versión VR (Quest) vive en el otro repo bajo
// /vr. Por eso el base es '/' siempre (no '/vr/').
export default defineConfig(() => ({
  base: '/',
  plugins: [basicSsl()],
  server: {
    host: true,
    https: {},
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
}));
