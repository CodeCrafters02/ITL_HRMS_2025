import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import checker from 'vite-plugin-checker'; // Add this

// Stamps every build with an id (in index.html and /version.json) so a cached page can detect that a newer deploy exists
const buildId = Date.now().toString(36);
const buildVersion = (): Plugin => ({
    name: 'build-version',
    transformIndexHtml: (html, ctx) => html.replace('__BUILD_ID__', ctx.server ? 'dev' : buildId),
    generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId }) });
    },
});

export default defineConfig({
    plugins: [
        react(),
        buildVersion(),
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