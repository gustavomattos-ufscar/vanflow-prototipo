import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@marca': resolve(repoRoot, 'identidade-visual') } },
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
    proxy: { '/api': 'http://localhost:5174' },
  },
  build: { chunkSizeWarningLimit: 900 },
});
