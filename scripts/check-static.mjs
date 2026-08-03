#!/usr/bin/env node
/**
 * Draw Clever Architecture — static assertions
 *
 * Everything in this file reads source files as text. No server, no
 * browser, no build required — this is the layer that always runs,
 * on any machine, in any CI job, with zero setup.
 *
 *   npm run check:static
 *
 * Checks:
 *   1. Heading outline — exactly one <h1> per page, no skipped levels.
 *   2. No em dashes in visible copy (client rule — see house rules).
 *   3. No extensionless-violating internal links (no href="*.html").
 *   4. sitemap.xml matches the real routes, on the canonical vercel.app host.
 *   5. Every <script type="application/ld+json"> block parses as JSON.
 *   6. No `--fs-*` legacy type tokens have crept back in.
 *   7. public/Renders/* directory names stay hyphenated (spaces break
 *      srcset and Vite — see house rules landmines).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_FILES } from './lib/pages.mjs';
import { Report } from './lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = new Report('check-static');

const read = (rel) => readFileSync(resolve(root, rel), 'utf8');
const pages = Object.fromEntries(PAGE_FILES.map((f) => [f, read(f)]));

/* ── 1. Heading outline ─────────────────────────────────────────────────
   axe-core's "heading-order" rule, applied to source order: a heading may
   drop to any lower level, or stay level, or rise by exactly one — never
   jump more than one level deeper than the previous heading. */
for (const [file, html] of Object.entries(pages)) {
  const headings = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1Count = headings.filter((l) => l === 1).length;
  report.check(`${file}: exactly one <h1>`, h1Count === 1, `found ${h1Count}`);

  let prev = 0;
  let skipped = null;
  for (const level of headings) {
    if (prev !== 0 && level > prev + 1) { skipped = { from: prev, to: level }; break; }
    prev = level;
  }
  report.check(`${file}: no skipped heading levels`, !skipped, skipped ? `h${skipped.from} → h${skipped.to}` : undefined);
}

/* ── 2. No em dashes in visible copy ────────────────────────────────────
   Strips <script>/<style> bodies and HTML comments (source-order code
   comments legitimately use em dashes — see e.g. src/site.css), then
   every remaining tag, leaving only rendered text plus the handful of
   attributes that are also user-facing copy. */
const EM_DASH = /—|&mdash;|&#8212;|&#x2014;/i;
const COPY_ATTRS = ['alt', 'aria-label', 'title', 'content'];

function visibleText(html) {
  let out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  return out;
}

for (const [file, html] of Object.entries(pages)) {
  const text = visibleText(html);
  report.check(`${file}: no em dash in rendered text`, !EM_DASH.test(text));

  const attrHits = [];
  for (const attr of COPY_ATTRS) {
    const re = new RegExp(`${attr}=["']([^"']*)["']`, 'gi');
    for (const m of html.matchAll(re)) {
      if (EM_DASH.test(m[1])) attrHits.push(`${attr}="${m[1].slice(0, 40)}…"`);
    }
  }
  report.check(`${file}: no em dash in alt/aria-label/title/content attributes`, attrHits.length === 0, attrHits.join('; '));
}

/* ── 3. Extensionless internal links ────────────────────────────────────
   Page URLs are extensionless (cleanUrls). An internal href="*.html"
   would still work (Vercel redirects it) but it is a regression against
   the site's own URL contract, not just a style nit. */
for (const [file, html] of Object.entries(pages)) {
  const offenders = [...html.matchAll(/href=["']([^"'#][^"']*\.html[^"']*)["']/gi)]
    .map((m) => m[1])
    .filter((href) => !/^https?:\/\//i.test(href)); // external .html links are someone else's URL scheme
  report.check(`${file}: no internal href="*.html" links`, offenders.length === 0, offenders.join(', '));
}

/* ── 4. sitemap.xml matches the real routes ─────────────────────────────
   The 5 navigable pages, on the canonical drawclever.vercel.app host —
   flipping to drawclever.com early is an explicit house-rule violation. */
{
  const sitemap = read('public/sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const routes = ['/', '/projects', '/about-us', '/services', '/contact'];
  // Every built language carries the same five routes under its own prefix.
  // Derived from the translation files rather than hard-coded, so adding a
  // language cannot leave this check asserting yesterday's route list.
  const langs = ['es', 'ro', 'it'].filter((l) => existsSync(resolve(root, `src/data/i18n/${l}.json`)));
  const expected = new Set([
    ...routes,
    ...langs.flatMap((l) => routes.map((r) => `/${l}${r === '/' ? '/' : r}`)),
  ]);
  const gotPaths = new Set(locs.map((u) => new URL(u).pathname));

  report.check('sitemap.xml: every entry is on drawclever.vercel.app', locs.every((u) => u.startsWith('https://drawclever.vercel.app')));
  report.check(
    `sitemap.xml: paths exactly match the ${routes.length} real routes across ${langs.length + 1} language(s)`,
    gotPaths.size === expected.size && [...expected].every((p) => gotPaths.has(p)),
    `expected {${[...expected].join(', ')}}, got {${[...gotPaths].join(', ')}}`
  );
  report.check('sitemap.xml: no .html extensions', locs.every((u) => !u.endsWith('.html')));
}

/* ── 5. Every JSON-LD block parses ──────────────────────────────────────
   A syntax error here doesn't fail the build or throw in the browser —
   the browser just silently ignores the malformed structured-data block,
   so nothing short of parsing it yourself catches the mistake. */
for (const [file, html] of Object.entries(pages)) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  blocks.forEach((m, i) => {
    let parsed;
    let err;
    try { parsed = JSON.parse(m[1]); } catch (e) { err = e.message; }
    report.check(`${file}: JSON-LD block ${i + 1} parses`, !err, err);
    // A block may be a single typed entity or a @graph of them. The @graph form
    // is what lets the inner pages reference the studio by @id instead of
    // restating it, so @type lives on each node rather than at the top level.
    if (parsed) {
      const nodes = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
      const typed = nodes.length > 0 && nodes.every((n) => !!n['@type']);
      report.check(`${file}: JSON-LD block ${i + 1} has @context and a @type on every node`, !!parsed['@context'] && typed);
    }
  });
}

/* ── 6. No legacy --fs-* tokens ─────────────────────────────────────────
   Type sizing was migrated to the 11 role tokens (--t-body/--t-ui/etc).
   The old value-named --fs-* tokens are gone by design; reintroducing one
   means a stray hardcoded size snuck back in instead of a role token. */
{
  const cssFile = 'src/site.css';
  const css = read(cssFile);
  const hits = [...css.matchAll(/--fs-[\w-]+/g)].map((m) => m[0]);
  report.check(`${cssFile}: no --fs-* tokens`, hits.length === 0, [...new Set(hits)].join(', '));

  for (const [file, html] of Object.entries(pages)) {
    const inlineHits = [...html.matchAll(/--fs-[\w-]+/g)].map((m) => m[0]);
    report.check(`${file}: no --fs-* tokens in inline styles`, inlineHits.length === 0, [...new Set(inlineHits)].join(', '));
  }
}

/* ── 7. Render directory names stay hyphenated ──────────────────────────
   A space in public/Renders/<name>/ breaks srcset (unescaped spaces split
   the candidate list) and Vite's asset resolution. */
{
  const rendersDir = resolve(root, 'public/Renders');
  if (existsSync(rendersDir)) {
    const dirs = readdirSync(rendersDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    const spaced = dirs.filter((d) => /\s/.test(d));
    report.check('public/Renders/*: every project directory is hyphenated (no spaces)', spaced.length === 0, spaced.join(', '));
    report.check('public/Renders/*: found project directories to check', dirs.length > 0);
  } else {
    report.check('public/Renders/ exists', false, 'directory not found');
  }

  // Cross-check: no page references a Renders path with a literal space
  // or its %20 escape — either would indicate a directory rename regressed.
  for (const [file, html] of Object.entries(pages)) {
    const bad = [...html.matchAll(/Renders\/[^"')\s]*%20[^"')\s]*/g)].map((m) => m[0]);
    report.check(`${file}: no %20-escaped spaces in Renders/ paths`, bad.length === 0, bad.join(', '));
  }
}

const ok = report.summarize();
process.exit(ok ? 0 : 1);
