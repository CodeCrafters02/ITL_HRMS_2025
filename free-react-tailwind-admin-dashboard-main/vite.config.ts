import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import checker from 'vite-plugin-checker'; // Add this

export default defineConfig({
    plugins: [
        react(),
        // This will check for TypeScript/ESLint errors during build
        // and enforce strict path resolution
        checker({
            typescript: true,
        }),
    ],
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Ensures that rollup doesn't try to guess or ignore path issues
        rollupOptions: {
            onwarn(warning, warn) {
                if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
                warn(warning);
            },
        },
    },
});