import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
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

/**
 * Build-time HTML partials.
 *
 * The six pages share a nav, a drawer, a footer, a loader and a font block.
 * Kept as copies they drifted: the nav carried aria-label="Primary" on the
 * homepage alone, and index.html's footer grew a stray </div> that browsers
 * silently swallowed. One source can only be wrong once, so it gets reviewed
 * once and fixed once.
 *
 * Usage in a page:
 *   <!-- @include nav.html active="projects" -->
 *
 * Inside a partial:
 *   {{name}}                         a passed attribute, empty if absent
 *   {{#if key=value}}...{{/if}}      emitted only when that attribute matches
 *
 * Runs at `order: 'pre'` so the inlined markup is still an ordinary part of the
 * document when Vite resolves asset URLs and hashes inline scripts. Partials
 * live outside the page tree, so a change to one has to invalidate every page
 * by hand in dev; handleHotUpdate does that.
 */
const htmlPartials = () => {
  const dir = resolve(__dirname, 'src/partials');
  const TAG = /([ \t]*)<!--\s*@include\s+([\w.-]+)([^>]*?)-->/g;

  const render = (html, from, depth = 0) => {
    if (depth > 5) throw new Error(`@include: nested too deep in ${from}`);
    return html.replace(TAG, (_m, indent, file, rest) => {
      const path = resolve(dir, file);
      if (!existsSync(path)) throw new Error(`@include: no partial "${file}" (from ${from})`);
      const vars = Object.fromEntries([...rest.matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
      let body = readFileSync(path, 'utf8').replace(/\s+$/, '');
      body = render(body, file, depth + 1);
      body = body.replace(/\{\{#if\s+([\w-]+)=([^}]*?)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (_x, k, v, inner) => (vars[k] === v.trim() ? inner : ''));
      body = body.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_x, k) => vars[k] ?? '');
      // Re-indent so the built page reads like the hand-written one did.
      return body.split('\n').map((l, i) => (i === 0 || !l ? l : indent + l)).join('\n');
    });
  };

  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => render(html, ctx?.filename || 'page'),
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(dir)) server.ws.send({ type: 'full-reload', path: '*' });
    },
  };
};

export default defineConfig({
  base: './',
  root: __dirname,
  publicDir: resolve(__dirname, 'public'),
  plugins: [htmlPartials(), cleanUrls()],

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
