import { defineConfig } from 'vite';
import handlebars from './plugins/handlebars.js';

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
  plugins: [handlebars()],
});
