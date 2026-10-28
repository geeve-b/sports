import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:5050';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Same-origin /api in dev so the httpOnly auth cookie just works.
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          // Bootstrap 5.3 still uses @import and global functions.
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api'],
          quietDeps: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            motion: ['framer-motion'],
          },
        },
      },
    },
  };
});
