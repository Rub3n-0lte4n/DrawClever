import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Draw Clever Architecture — Vite config
 *
 * Multi-page static site deployed on Vercel. Assets in /public are served
 * verbatim, so paths like "./Renders/..." in HTML and JS work in dev AND in
 * the build. `base: './'` keeps asset URLs relative, so the build also runs
 * straight off disk or from any subpath.
 *
 * Page URLs are extensionless (/about-us). In production Vercel's
 * `cleanUrls` handles that; the tiny plugin below does the same for
 * `vite dev` / `vite preview` by mapping /about-us → about-us.html.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

const cleanUrls = () => {
  const rewrite = (req) => {
    const path = (req.url || '').split('?')[0];
    if (path !== '/' && !path.includes('.') && existsSync(resolve(__dirname, path.slice(1) + '.html'))) {
      req.url = path + '.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    }
  };
  return {
    name: 'clean-urls-dev',
    configureServer(server) { server.middlewares.use((req, _res, next) => { rewrite(req); next(); }); },
    configurePreviewServer(server) { server.middlewares.use((req, _res, next) => { rewrite(req); next(); }); },
  };
};

export default defineConfig({
  base: './',
  root: __dirname,
  publicDir: resolve(__dirname, 'public'),
  plugins: [cleanUrls()],

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
