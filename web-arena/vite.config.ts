import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const crossOriginHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  define: {
    __ARENA_BUILD_REV__: JSON.stringify(Date.now().toString(36)),
  },
  server: {
    headers: crossOriginHeaders,
    fs: {
      allow: ['..'],
    },
  },
  preview: {
    headers: crossOriginHeaders,
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        runner: resolve(__dirname, 'runner.html'),
      },
    },
  },
});
