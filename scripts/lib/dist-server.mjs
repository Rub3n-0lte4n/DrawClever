/**
 * Draw Clever Architecture — dist/ replay server
 *
 * Serves the built site the way Vercel does, so header and browser checks
 * run against the real production contract instead of guessing at it:
 *
 *   - headers come from vercel.json's `headers` rules, matched by request
 *     path against each rule's `source` (used as a regex).
 *   - cleanUrls mirrors vercel.json's `"cleanUrls": true` — /about-us maps
 *     to about-us.html.
 *   - a path that matches no file falls back to 404.html served with a
 *     404 status, and — this is the part worth a comment — the matching
 *     header rules still apply. Vercel applies vercel.json headers to 404
 *     responses too; a header check that only ever requests real pages
 *     never notices a security header quietly missing from the error path.
 *
 * This is a close local approximation, not a Vercel routing reimplementation.
 * It is good enough to assert real header values and real page behaviour;
 * it does not reproduce Vercel's full route-matching edge cases.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

export function loadHeaderRules(root) {
  const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
  return (vercel.headers ?? []).map((rule) => ({
    source: rule.source,
    re: new RegExp('^' + rule.source + '$'),
    headers: rule.headers,
  }));
}

export function headersFor(rules, pathname) {
  const out = [];
  for (const rule of rules) if (rule.re.test(pathname)) out.push(...rule.headers);
  return out;
}

/**
 * @param {{root: string, distDir?: string, port?: number}} opts
 * @returns {Promise<{server: import('node:http').Server, port: number, base: string, close: () => Promise<void>}>}
 */
export function startDistServer({ root, distDir = 'dist', port = 0 }) {
  const dist = resolve(root, distDir);
  if (!existsSync(dist)) {
    throw new Error(`${distDir}/ not found at ${dist} — run \`npm run build\` first.`);
  }
  const rules = loadHeaderRules(root);

  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      pathname = req.url;
    }

    for (const h of headersFor(rules, pathname)) res.setHeader(h.key, h.value);

    let filePath = resolve(dist, '.' + pathname);
    let status = 200;

    const isRealFile = existsSync(filePath) && statSync(filePath).isFile();
    if (!isRealFile) {
      const withHtml = filePath + '.html';
      const indexHtml = join(filePath, 'index.html');
      if (pathname !== '/' && !pathname.includes('.') && existsSync(withHtml)) {
        filePath = withHtml; // cleanUrls: /about-us -> about-us.html
      } else if (pathname === '/' && existsSync(resolve(dist, 'index.html'))) {
        filePath = resolve(dist, 'index.html');
      } else if (existsSync(indexHtml)) {
        filePath = indexHtml;
      } else {
        status = 404;
        filePath = resolve(dist, '404.html');
      }
    }

    const body = existsSync(filePath) ? readFileSync(filePath) : Buffer.from('Not found');
    res.statusCode = status;
    res.setHeader('Content-Type', MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
    res.end(body);
  });

  return new Promise((resolvePromise, rejectPromise) => {
    server.on('error', rejectPromise);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      const base = `http://127.0.0.1:${addr.port}`;
      resolvePromise({
        server,
        port: addr.port,
        base,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}
