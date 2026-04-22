import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from "vite-plugin-svgr"; // Added missing import
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  define: {
    // This handles the URL dynamically based on environment
    __API_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production'
        ? 'https://apihrms.innovyxtechlabs.com/api/'
        : '/api/'
    ),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3009,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://apihrms.innovyxtechlabs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/media': {
        target: 'https://apihrms.innovyxtechlabs.com',
        changeOrigin: true,
      },
    },
  },
});
