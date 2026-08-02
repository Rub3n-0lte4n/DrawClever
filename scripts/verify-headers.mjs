#!/usr/bin/env node
/**
 * Draw Clever Architecture — header/CSP replay check
 *
 * `scripts/verify-csp.mjs` proves the *source* HTML's inline scripts match
 * the hashes declared in vercel.json. This script proves something
 * different and complementary: that the built `dist/` output, served the
 * way Vercel actually serves it, delivers the full security header
 * contract — CSP, HSTS, COOP, X-Frame-Options, Permissions-Policy and the
 * rest — over real HTTP, on every real route, AND on a 404.
 *
 * That last part encodes a fact worth not re-discovering: Vercel applies
 * `vercel.json` headers to 404 responses too. A check that only ever
 * requests real pages would never notice a security header quietly
 * missing from the error path — which is exactly the path an attacker
 * probes first.
 *
 * Needs no browser. Requires a build:
 *
 *   npm run build
 *   npm run verify:headers
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDistServer } from './lib/dist-server.mjs';
import { ROUTES } from './lib/pages.mjs';
import { Report, red, dim } from './lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(resolve(root, 'dist'))) {
  console.error(red('✗ dist/ not found. Run `npm run build` first.'));
  process.exit(1);
}

const report = new Report('verify-headers');
const { base, close } = await startDistServer({ root });

/* ── helpers ─────────────────────────────────────────────────────────── */
const SCRIPT = /<script([^>]*)>([\s\S]*?)<\/script>/g;

function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(SCRIPT)) {
    if (/\bsrc=/.test(attrs)) continue;
    const type = attrs.match(/\btype=["']([^"']+)["']/)?.[1];
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type)) continue;
    hashes.add('sha256-' + createHash('sha256').update(body, 'utf8').digest('base64'));
  }
  return hashes;
}

function directive(csp, name) {
  return csp.split(';').map((d) => d.trim()).find((d) => d === name || d.startsWith(name + ' '));
}

/* ── 1. Every real route: full header contract + CSP integrity ─────────── */
// The CSP is one global policy shared by every route (see vercel.json's
// single "/(.*)" header rule) — script-src's hash list is the UNION of
// every page's inline scripts, not any one page's. So "does this page's
// hash appear in script-src" is a per-page check, but "is every declared
// hash actually used somewhere" is only meaningful once every route has
// been seen, hence the two-pass structure below.
let declaredHashes = null;
const allFoundHashes = new Set();

for (const route of ROUTES) {
  const res = await fetch(base + route.path);
  const body = await res.text();
  const label = `${route.path} (${res.status})`;

  report.check(`${label}: responds 200`, res.status === 200);

  const csp = res.headers.get('content-security-policy');
  report.check(`${label}: has Content-Security-Policy`, !!csp);
  if (csp) {
    const scriptSrc = directive(csp, 'script-src');
    report.check(`${label}: script-src present`, !!scriptSrc);
    report.check(
      `${label}: script-src has no 'unsafe-inline'/'unsafe-eval'`,
      !!scriptSrc && !/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc)
    );

    declaredHashes ??= new Set(scriptSrc?.match(/'sha256-[A-Za-z0-9+/=]+'/g)?.map((s) => s.slice(1, -1)) ?? []);
    const found = inlineScriptHashes(body);
    found.forEach((h) => allFoundHashes.add(h));
    const missing = [...found].filter((h) => !declaredHashes.has(h));
    report.check(
      `${label}: every inline script hash is allowed`,
      missing.length === 0,
      missing.length ? `missing from CSP: ${missing.join(', ')}` : undefined
    );
  }
  report.check(`${label}: no <meta> CSP tag in the served HTML`, !/<meta[^>]+http-equiv=["']Content-Security-Policy/i.test(body));

  const hsts = res.headers.get('strict-transport-security');
  report.check(`${label}: Strict-Transport-Security is set`, !!hsts);
  report.check(`${label}: HSTS max-age is at least a year`, !!hsts && /max-age=(\d+)/.test(hsts) && Number(hsts.match(/max-age=(\d+)/)[1]) >= 31536000);
  report.check(`${label}: HSTS includes includeSubDomains`, !!hsts && /includeSubDomains/i.test(hsts));
  report.check(`${label}: HSTS omits preload (deliberate — see README domain handoff notes)`, !!hsts && !/preload/i.test(hsts));

  report.check(`${label}: Cross-Origin-Opener-Policy: same-origin`, res.headers.get('cross-origin-opener-policy') === 'same-origin');
  report.check(`${label}: X-Frame-Options: DENY`, res.headers.get('x-frame-options') === 'DENY');
  report.check(`${label}: X-Content-Type-Options: nosniff`, res.headers.get('x-content-type-options') === 'nosniff');
  report.check(`${label}: Referrer-Policy is set`, !!res.headers.get('referrer-policy'));

  const pp = res.headers.get('permissions-policy');
  report.check(`${label}: Permissions-Policy is set`, !!pp);
  if (pp) {
    const features = pp.split(',').map((f) => f.trim()).filter(Boolean);
    report.check(`${label}: Permissions-Policy declares features`, features.length > 0);
    report.check(
      `${label}: every Permissions-Policy feature uses a restrictive empty allowlist`,
      features.every((f) => /^[\w-]+=\(\)$/.test(f)),
      'expected every "feature=()" — a non-empty allowlist would grant, not restrict'
    );
  }
}

/* ── 2. A path that doesn't exist: the 404 must carry the same headers ─── */
// This also serves 404.html's body, which has its OWN inline bootstrap
// script (see the "standalone" note in README.md) — feed its hash into the
// union before checking for stale hashes below.
{
  const res = await fetch(base + '/this-route-does-not-exist-' + Date.now());
  const body = await res.text();
  report.check('404 route: responds 404', res.status === 404);
  report.check('404 route: still carries Content-Security-Policy', !!res.headers.get('content-security-policy'));
  report.check('404 route: still carries Strict-Transport-Security', !!res.headers.get('strict-transport-security'));
  report.check('404 route: still carries Cross-Origin-Opener-Policy', res.headers.get('cross-origin-opener-policy') === 'same-origin');
  report.check('404 route: still carries X-Frame-Options', res.headers.get('x-frame-options') === 'DENY');
  report.check('404 route: still carries Permissions-Policy', !!res.headers.get('permissions-policy'));

  const found404 = inlineScriptHashes(body);
  found404.forEach((h) => allFoundHashes.add(h));
  if (declaredHashes) {
    const missing = [...found404].filter((h) => !declaredHashes.has(h));
    report.check(
      '404.html: its inline script hash is allowed',
      missing.length === 0,
      missing.length ? `missing from CSP: ${missing.join(', ')}` : undefined
    );
  }
}

/* Now that every route (including the 404 fallback) has been scanned, any
   declared hash that was never used anywhere is genuinely stale. */
if (declaredHashes) {
  const stale = [...declaredHashes].filter((h) => !allFoundHashes.has(h));
  report.check(
    'CSP has no stale script hashes across the whole site',
    stale.length === 0,
    stale.length ? `stale: ${stale.join(', ')}` : undefined
  );
}

/* ── 3. Immutable caching on the asset routes vercel.json names ────────── */
{
  const assetPaths = findSampleAssetPaths(root);
  for (const p of assetPaths) {
    const res = await fetch(base + encodeURI(p));
    report.check(`${p}: Cache-Control is immutable`, /public,\s*max-age=31536000,\s*immutable/.test(res.headers.get('cache-control') ?? ''));
  }
  report.check('found at least one Renders/ and one Logo asset to sample', assetPaths.length >= 2);
}

function findSampleAssetPaths(root) {
  const out = [];
  try {
    const rendersDir = resolve(root, 'dist/Renders');
    const projectDir = readdirSync(rendersDir).find((f) => !f.includes('.'));
    if (projectDir) {
      const file = readdirSync(resolve(rendersDir, projectDir)).find((f) => /\.(jpg|avif|webp)$/i.test(f));
      if (file) out.push(`/Renders/${projectDir}/${file}`);
    }
    const logoDir = resolve(root, 'dist/Logo Variants');
    const logoFile = readdirSync(logoDir).find((f) => f.endsWith('.png'));
    if (logoFile) out.push(`/Logo Variants/${logoFile}`);
  } catch {
    // dist layout changed — the checks above just find nothing to sample, which is fine
  }
  return out;
}

await close();
const ok = report.summarize();
if (!ok) console.error(dim('\n  If a check here looks wrong, verify against `npm run verify:csp` first — that one owns source-of-truth hash drift.\n'));
process.exit(ok ? 0 : 1);
