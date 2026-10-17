import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const domain = env.VITE_DOMAIN || env.APP_DOMAIN || 'examguard.edu.vn';
  const backendPort = env.PORT || 3011;
  const backendUrl = env.VITE_API_URL || env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;

  return {
    base: '/',
    cacheDir: path.resolve(__dirname, 'node_modules/.vite'),
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.DOMAIN': JSON.stringify(domain),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: ['react-is'],
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
      commonjsOptions: {
        include: [/react-is/, /node_modules/],
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT) || 5173,
      cors: true,
      allowedHosts: [
        domain,
        'examguard.edu.vn',
        '.examguard.edu.vn',
        'localhost',
        '127.0.0.1',
      ],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      host: '0.0.0.0',
      port: 3011,
      cors: true,
      allowedHosts: [
        domain,
        'examguard.edu.vn',
        '.examguard.edu.vn',
        'localhost',
        '127.0.0.1',
      ],
    },
  };
});
