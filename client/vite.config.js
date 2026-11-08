import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = { '/api': { target: env.API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } };
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: Number(env.CLIENT_PORT || 5173), strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});
