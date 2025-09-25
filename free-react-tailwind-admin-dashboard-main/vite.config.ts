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
    // Global API URL variable
    __API_URL__: '"https://apihrms.innovyxtechlabs.com/"',
   
  },
  server: {
    // Set the port you want to use
    port: 3000, // or any port you prefer

    // Bind to 0.0.0.0 to allow external devices to connect
    host: '0.0.0.0',

    // Allow access from specific domains or IPs (optional)
    allowedHosts: ['hrms.innovyxtechlabs.com'],

    // Alternatively, you can allow all hosts (use with caution)
    // allowedHosts: 'all',
  },
});
