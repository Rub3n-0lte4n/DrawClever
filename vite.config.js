import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Draw Clever v2 — Vite config
 *
 * Single-page static site (homepage, done deeply). Assets in /public are
 * served verbatim, so relative paths like "./Renders/..." and
 * "./Logo Variants/..." in HTML and JS work in dev AND in the build.
 *
 * `base: './'` emits RELATIVE asset URLs, so the built site runs from any
 * location — opened from disk, served at a domain root, or published under a
 * GitHub Pages project subpath (…github.io/Draw-Clever-v2/) — with no config
 * change. That portability is why we avoid a hard-coded `/Repo/` base.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  root: __dirname,
  publicDir: resolve(__dirname, 'public'),

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        index:    resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
        about:    resolve(__dirname, 'about-us.html'),
        services: resolve(__dirname, 'services.html'),
        contact:  resolve(__dirname, 'contact.html'),
        notFound: resolve(__dirname, '404.html'),
      },
    },
  },

  server: { port: 5174, open: true },
});
