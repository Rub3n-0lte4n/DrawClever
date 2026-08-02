#!/usr/bin/env node
/**
 * Draw Clever Architecture — mobile audit: type floors + console cleanliness
 *
 *   1. Computed font-size for every selector that consumes one of the 11
 *      role tokens is checked against that role's documented floor, at the
 *      narrowest viewport (320px) — the clamp()'s minimum bound means the
 *      floor holds at every width, but 320 is where a broken clamp would
 *      show first.
 *   2. Every real page loads with zero console errors AND zero console
 *      warnings (Permissions-Policy parsing issues show up as warnings,
 *      not errors — an errors-only run would miss them) and zero uncaught
 *      exceptions.
 *
 * Optional — see scripts/README.md. Skips cleanly, exit 0, when
 * playwright-core isn't installed.
 *
 *   npm run build
 *   npm run audit:type
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDistServer } from './lib/dist-server.mjs';
import { ROUTES } from './lib/pages.mjs';
import { CONTEXT_OPTS } from './lib/viewports.mjs';
import { waitForPageReady } from './lib/wait-ready.mjs';
import { loadChromium, reportSkip, launch } from './lib/browser-optional.mjs';
import { FLOORS, ALL_SELECTORS } from './lib/type-roles.mjs';
import { Report, red, dim } from './lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const chromium = await loadChromium();
if (!chromium) { reportSkip('verify.mjs'); process.exit(0); }

if (!existsSync(resolve(root, 'dist'))) {
  console.error(red('✗ dist/ not found. Run `npm run build` first.'));
  process.exit(1);
}

const report = new Report('verify (type floors + console)');
const { base, close } = await startDistServer({ root });
const browser = await launch(chromium);

/* ── 1. Type floors at the narrowest viewport ───────────────────────────── */
// Resolves which --t-* token is actually driving each element's font-size
// live, in-browser, rather than trusting a static selector→role map — see
// the comment on ALL_SELECTORS for why a fixed map is wrong at breakpoints
// that reassign a selector to a different token.
function measureRoles({ selectors, tokenNames }) {
  const out = [];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) { out.push({ sel, found: false }); continue; }
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    let matchedToken = null;
    for (const tok of tokenNames) {
      const tokVal = parseFloat(cs.getPropertyValue(tok));
      if (!Number.isNaN(tokVal) && Math.abs(tokVal - size) < 0.06) { matchedToken = tok; break; }
    }
    out.push({ sel, found: true, size, matchedToken });
  }
  return out;
}

{
  const tokenNames = Object.keys(FLOORS);
  const ctx = await browser.newPage({ viewport: { width: 320, height: 568 }, ...CONTEXT_OPTS });
  for (const route of ROUTES) {
    await ctx.goto(base + route.path, { waitUntil: 'networkidle' });
    await waitForPageReady(ctx);

    const results = await ctx.evaluate(measureRoles, { selectors: ALL_SELECTORS, tokenNames });
    for (const r of results) {
      if (!r.found) continue; // selector doesn't exist on this page — nothing to check
      if (r.matchedToken) {
        const floor = FLOORS[r.matchedToken];
        report.check(
          `${route.path}: ${r.sel} (${r.matchedToken}) is >= ${floor}px`,
          r.size >= floor - 0.1,
          `computed ${r.size}px`
        );
      } else {
        // Doesn't match any of the 6 role tokens' live values (e.g. it's
        // sized by something other than a --t-* token). Fall back to the
        // global micro floor — the lowest of the 11 documented floors —
        // as a safety net rather than silently skipping it.
        report.check(
          `${route.path}: ${r.sel} (unmatched role token) clears the global 11.5px micro floor`,
          r.size >= 11.5 - 0.1,
          `computed ${r.size}px`
        );
      }
    }
  }
  await ctx.close();
}

/* ── 2. Console cleanliness — errors AND warnings, plus uncaught JS ─────── */
{
  for (const route of ROUTES) {
    const ctx = await browser.newPage({ viewport: { width: 390, height: 844 }, ...CONTEXT_OPTS });
    const messages = [];
    ctx.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') messages.push(`[console.${type}] ${msg.text()}`);
    });
    ctx.on('pageerror', (err) => messages.push(`[uncaught] ${err.message}`));

    await ctx.goto(base + route.path, { waitUntil: 'networkidle' });
    await waitForPageReady(ctx);

    report.check(
      `${route.path}: zero console errors/warnings and zero uncaught exceptions`,
      messages.length === 0,
      messages.slice(0, 5).join(' | ')
    );
    await ctx.close();
  }
}

await browser.close();
await close();
const ok = report.summarize();
if (!ok) {
  console.error(dim('\n  Type-floor and console failures are measured against the real dist/ build in an actual browser. Reproduce before assuming the check is buggy.\n'));
}
process.exit(ok ? 0 : 1);
