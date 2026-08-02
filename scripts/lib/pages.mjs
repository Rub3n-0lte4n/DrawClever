/**
 * Canonical page/route inventory, kept in one place so every layer of the
 * suite agrees with `verify-csp.mjs`'s PAGES list and with vite.config.js's
 * rollupOptions.input. `404.html` is deliberately excluded from ROUTES: it
 * is never a navigable page in its own right, only the fallback document —
 * see check-static.mjs's sitemap check and dist-server.mjs's 404 handling.
 */
export const PAGE_FILES = ['index.html', 'about-us.html', 'services.html', 'projects.html', 'contact.html', '404.html'];

export const ROUTES = [
  { path: '/', file: 'index.html', name: 'home' },
  { path: '/projects', file: 'projects.html', name: 'projects' },
  { path: '/about-us', file: 'about-us.html', name: 'about-us' },
  { path: '/services', file: 'services.html', name: 'services' },
  { path: '/contact', file: 'contact.html', name: 'contact' },
];
