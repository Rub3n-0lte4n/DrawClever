/**
 * Draw Clever Architecture — CSP integrity check
 *
 * The site's Content-Security-Policy lives in vercel.json and runs script-src
 * WITHOUT 'unsafe-inline'. The handful of inline <script> blocks that have to
 * stay inline (the pre-paint loader bootstrap) are allowed by SHA-256 hash
 * instead. Those hashes are content-addressed: edit one byte of a bootstrap
 * and the browser silently stops running it.
 *
 * This script recomputes the hashes from the HTML and compares them to the
 * policy. It runs as `prebuild`, so a drifted policy fails the Vercel build
 * instead of shipping a page whose inline script is blocked.
 *
 *   npm run verify:csp          check, exit 1 on drift
 *   npm run verify:csp -- --fix rewrite vercel.json with the correct hashes
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'about-us.html', 'services.html', 'projects.html', 'contact.html', '404.html'];
const fix = process.argv.includes('--fix');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/* ── 1. Hash every inline script the browser will actually execute ──────────
   Skips <script src=…> (covered by 'self') and non-JS types such as
   application/ld+json, which browsers never execute and CSP never blocks. */
const SCRIPT = /<script([^>]*)>([\s\S]*?)<\/script>/g;
const found = new Map();       // hash → [page, …]
const errors = [];

for (const page of PAGES) {
  const html = readFileSync(resolve(root, page), 'utf8');

  if (/<meta[^>]+http-equiv=["']Content-Security-Policy/i.test(html)) {
    errors.push(
      `${page} declares a <meta> CSP. The policy is served as an HTTP header from ` +
      `vercel.json — two policies are enforced as an intersection and drift apart silently. Remove the meta tag.`
    );
  }

  for (const [, attrs, body] of html.matchAll(SCRIPT)) {
    if (/\bsrc=/.test(attrs)) continue;
    const type = attrs.match(/\btype=["']([^"']+)["']/)?.[1];
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type)) continue;
    const hash = 'sha256-' + createHash('sha256').update(body, 'utf8').digest('base64');
    found.set(hash, [...(found.get(hash) ?? []), page]);
  }
}

/* ── 2. Read the hashes the policy currently allows ────────────────────────── */
const vercelPath = resolve(root, 'vercel.json');
const vercel = JSON.parse(readFileSync(vercelPath, 'utf8'));
const cspEntry = vercel.headers
  ?.flatMap((rule) => rule.headers ?? [])
  .find((h) => h.key.toLowerCase() === 'content-security-policy');

if (!cspEntry) {
  console.error(red('✗ vercel.json defines no Content-Security-Policy header.'));
  process.exit(1);
}

const scriptSrc = cspEntry.value.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src'));
if (!scriptSrc) {
  console.error(red('✗ The CSP has no script-src directive.'));
  process.exit(1);
}

if (/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc)) {
  errors.push(
    `script-src contains 'unsafe-inline' or 'unsafe-eval', which defeats the policy's XSS protection. ` +
    `Move the script into src/ so 'self' covers it, or allow it by hash.`
  );
}

const declared = new Set(scriptSrc.match(/'sha256-[A-Za-z0-9+/=]+'/g)?.map((s) => s.slice(1, -1)) ?? []);
const expected = new Set(found.keys());
const missing = [...expected].filter((h) => !declared.has(h));
const stale = [...declared].filter((h) => !expected.has(h));

/* ── 3. Report, or rewrite when asked ──────────────────────────────────────── */
if (fix && (missing.length || stale.length)) {
  const rebuilt = [...expected].map((h) => `'${h}'`).join(' ');
  cspEntry.value = cspEntry.value.replace(
    /script-src[^;]*/,
    `script-src 'self' ${rebuilt}`.trimEnd()
  );
  writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n');
  console.log(green(`✓ vercel.json updated with ${expected.size} inline-script hash(es).`));
  process.exit(errors.length ? 1 : 0);
}

for (const hash of missing) {
  errors.push(`Inline script in ${found.get(hash).join(', ')} is not allowed by the CSP.\n    add: '${hash}'`);
}
for (const hash of stale) {
  errors.push(`CSP allows '${hash}', which no page contains any more. Remove it.`);
}

if (errors.length) {
  console.error(red(`\n✗ CSP check failed (${errors.length}):\n`));
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}\n`));
  console.error(dim('  Run `npm run verify:csp -- --fix` to rewrite the hashes.\n'));
  process.exit(1);
}

console.log(green(`✓ CSP matches the source: ${expected.size} inline script(s) hashed, script-src has no 'unsafe-inline'.`));
