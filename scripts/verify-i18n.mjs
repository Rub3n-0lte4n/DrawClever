/**
 * Proves the localised build is correct. Run after `npm run build`.
 *
 * Each check exists because it caught something, or because getting it wrong
 * fails silently — which is the dangerous kind for a language nobody on the
 * team reads. A missing translation degrades to English and looks fine; a
 * mis-scoped asset path 404s only on the Spanish page; a stale canonical
 * de-indexes three languages at once.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_LOCALES, DEFAULT_LOCALE, LOCALE_META, ORIGIN, ROUTES } from './i18n-transform.mjs';
import { PAGES } from './i18n-extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

let checks = 0;
const fails = [];
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };

const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const EXEC_SCRIPT = /<script(?![^>]*ld\+json)([^>]*)>([\s\S]*?)<\/script>/g;
const scriptsOf = (html) => [...html.matchAll(EXEC_SCRIPT)].map((m) => m[2]);

const en = JSON.parse(read('src/data/i18n/en.json'));
const active = ALL_LOCALES.filter((l) => l !== DEFAULT_LOCALE && existsSync(resolve(ROOT, `src/data/i18n/${l}.json`)));

if (!active.length) {
  console.log('verify-i18n: no translations present, nothing to check.');
  process.exit(0);
}

/* ── 1. Translation files line up with the extracted source ─────────────── */
for (const locale of active) {
  const map = JSON.parse(read(`src/data/i18n/${locale}.json`));
  const missing = en.filter((k) => !(k in map));
  const extra = Object.keys(map).filter((k) => !en.includes(k));
  ok(!missing.length, `${locale}.json is missing ${missing.length} key(s), first: ${JSON.stringify(missing[0])}`);
  ok(!extra.length, `${locale}.json has ${extra.length} key(s) not in en.json, first: ${JSON.stringify(extra[0])}`);

  // Inline markup has to survive: a dropped </span> silently breaks the layout.
  for (const k of en) {
    const v = map[k];
    if (typeof v !== 'string') continue;
    if (k.includes('<')) {
      ok(k.split('<').length === v.split('<').length,
        `${locale}.json: tag count changed for ${JSON.stringify(k.slice(0, 50))}`);
    }
    ok(!v.includes('—'), `${locale}.json: em dash introduced in ${JSON.stringify(k.slice(0, 40))}`);
  }
}

/* ── 2. Every built locale page ─────────────────────────────────────────── */
for (const locale of active) {
  for (const page of PAGES) {
    const rel = `dist/${locale}/${page}`;
    if (!existsSync(resolve(ROOT, rel))) { ok(false, `${rel} was not built`); continue; }
    const html = read(rel);
    const enHtml = read(`dist/${page}`);

    ok(new RegExp(`<html[^>]*\\slang="${LOCALE_META[locale].lang}"`).test(html), `${rel}: <html lang> is not ${locale}`);

    // Resolve every asset URL against dist/ and require the file to exist.
    //
    // A pattern check is not enough here, in both directions: it flagged the
    // "../Fonts" that Vite correctly emits for a nested page, and it would have
    // missed the srcset case where only the first candidate in each list got
    // rewritten. Resolving the path is the only check that answers the actual
    // question, which is whether the Spanish page 404s.
    const urls = new Set();
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) urls.add(m[1]);
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const c of m[1].split(',')) urls.add(c.trim().split(/\s+/)[0]);
    }
    for (const m of html.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) urls.add(m[1]);

    for (const u of urls) {
      if (/^(https?:|data:|mailto:|tel:|#|\/\/)/.test(u) || !u) continue;
      const abs = u.startsWith('/')
        ? resolve(ROOT, 'dist', u.slice(1))
        : resolve(ROOT, 'dist', locale, u);
      // Extensionless internal routes are cleanUrls' job, not a file on disk.
      if (!/\.[a-zA-Z0-9]{2,5}$/.test(u)) continue;
      ok(existsSync(abs), `${rel}: asset "${u}" resolves to a file that does not exist`);
    }

    // Internal links must stay inside the locale.
    const leaked = [...html.matchAll(/href="\/([a-z-]+)"/g)]
      .map((m) => m[1])
      .filter((p) => ['about-us', 'services', 'contact', 'projects'].includes(p));
    ok(!leaked.length, `${rel}: ${leaked.length} internal link(s) escape the locale, e.g. /${leaked[0]}`);

    // The CSP pins a hash per inline script; a changed byte blocks the loader.
    const a = scriptsOf(enHtml), b = scriptsOf(html);
    ok(a.length === b.length && a.every((s, i) => s === b[i]),
      `${rel}: inline script bytes differ from English, which breaks the CSP hash`);

    const route = ROUTES[page];
    if (route) {
      const want = `${ORIGIN}/${locale}${route === '/' ? '/' : route}`;
      ok(html.includes(`<link rel="canonical" href="${want}"`), `${rel}: canonical is not ${want}`);
      ok(html.includes(`<meta property="og:url" content="${want}"`), `${rel}: og:url is not ${want}`);
      ok(html.includes(`content="${LOCALE_META[locale].og}"`), `${rel}: og:locale is not ${LOCALE_META[locale].og}`);
      for (const l of ALL_LOCALES) {
        ok(html.includes(`hreflang="${LOCALE_META[l].lang}"`), `${rel}: no hreflang for ${l}`);
      }
      ok(html.includes('hreflang="x-default"'), `${rel}: no x-default hreflang`);
    }
  }
}

/* ── 3. English pages still declare their alternates ────────────────────── */
for (const page of Object.keys(ROUTES)) {
  const html = read(`dist/${page}`);
  ok(html.includes('hreflang="x-default"'), `dist/${page}: English page is missing hreflang alternates`);
  ok(/<html[^>]*\slang="en"/.test(html), `dist/${page}: English page lost lang="en"`);
  const withoutAlternates = html
    .replace(/<link rel="alternate"[^>]*>/g, '')
    .replace(/<div class="foot-lang"[\s\S]*?<\/div>/, '');
  ok(!/href="\/(es|ro|it)\//.test(withoutAlternates),
    `dist/${page}: English page body links into a locale outside the switcher`);
}

/* ── 4. The switcher and the sitemap ────────────────────────────────────── */
const sitemap = read('public/sitemap.xml');
ok((sitemap.match(/<url>/g) || []).length === (active.length + 1) * Object.keys(ROUTES).length,
  'sitemap.xml URL count does not match languages x routes');
for (const l of ALL_LOCALES) {
  ok(sitemap.includes(`hreflang="${LOCALE_META[l].lang}"`), `sitemap.xml has no ${l} alternates`);
}
ok(read('dist/index.html').includes('class="foot-lang"'), 'the language switcher is missing from the English footer');

if (fails.length) {
  console.error(red(`\n✗ verify-i18n: ${fails.length} of ${checks} check(s) failed\n`));
  for (const f of fails.slice(0, 25)) console.error(red(`  · ${f}`));
  if (fails.length > 25) console.error(red(`  … and ${fails.length - 25} more`));
  process.exit(1);
}
console.log(green(`✓ verify-i18n: ${checks} check(s) passed across ${active.length} language(s)`));
