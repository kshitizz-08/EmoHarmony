import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // Tell esbuild that .js files may contain JSX (CRA-compatible naming)
    esbuild: {
        loader: 'jsx',
        include: /src\/.*\.js$/,
        exclude: [],
    },

    // Pre-bundle recharts so Vite handles CJS correctly
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },

    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },

    build: {
        outDir: 'build',
        sourcemap: false,
    },
})
