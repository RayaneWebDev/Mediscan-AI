import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('/scheduler/')
  ) {
    return 'react-vendor';
  }

  if (id.includes('/lucide-react/')) {
    return 'ui-vendor';
  }

  if (
    id.includes('/jspdf/') ||
    id.includes('/html2canvas/') ||
    id.includes('/canvg/') ||
    id.includes('/dompurify/')
  ) {
    return 'export-vendor';
  }

  return 'vendor';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
