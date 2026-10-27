/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  // El worker de SQLite se emite como módulo ES: importa sqlite-wasm y usa
  // `import.meta.url` para localizar el .wasm.
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
