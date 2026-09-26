import { defineConfig } from 'vite';
import handlebars from 'vite-plugin-handlebars';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  plugins: [
    handlebars({
      partialDirectory: fileURLToPath(new URL('./src/components', import.meta.url)),
    }),
  ],
});
