import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  define: {
    // In development, we use the proxy set up in the server section.
    // In production, you would typically use the full URL.
    __API_URL__: JSON.stringify('/api/'),
  },
  server: {
    // Set the port you want to use
    port: 3009, // or any port you prefer

    // Bind to 0.0.0.0 to allow external devices to connect
    host: '0.0.0.0',

    // Proxy API requests to bypass CORS during development
    proxy: {
      '/api': {
        target: 'https://apihrms.innovyxtechlabs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },

    // Allow access from specific domains or IPs (optional)
    allowedHosts: ['hrms.innovyxtechlabs.com'],
  },
});
