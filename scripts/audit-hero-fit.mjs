#!/usr/bin/env node
/**
 * Draw Clever Architecture — hero fit across languages
 *
 * The hero is a two-column row: a display headline set at 9.4vw beside a
 * ~470px column holding the description and both CTAs. The right column is
 * flex-shrink: 0, and the headline's width is set by its longest word — so
 * when the two stop fitting, the column is pushed past the viewport edge and
 * `body { overflow-x: hidden }` clips it without a scrollbar or an error. The
 * description and the second CTA are simply gone, and nothing in the static
 * suite can see it.
 *
 * This was live in ENGLISH below 900px before the site had any translations
 * (measured on drawclever.vercel.app at 900/820/740). Spanish and Italian only
 * moved the threshold up, to 1440 and 1536, because "Redefinimos" and
 * "Ridefiniamo" are wider than "Redefine" at the same size.
 *
 * So this checks the thing that actually breaks — is the right column inside
 * the viewport — for every language at every viewport in the row range, plus
 * that the absolutely-positioned scroll cue never lands on the CTAs once the
 * hero stacks. Optional; skips cleanly, exit 0, when playwright-core is absent.
 *
 *   npm run build
 *   npm run audit:hero
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDistServer } from './lib/dist-server.mjs';
import { loadChromium, reportSkip, launch } from './lib/browser-optional.mjs';
import { Report, red } from './lib/report.mjs';
import { ALL_LOCALES, DEFAULT_LOCALE } from './i18n-transform.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const chromium = await loadChromium();
if (!chromium) { reportSkip('audit-hero-fit.mjs'); process.exit(0); }

if (!existsSync(resolve(root, 'dist'))) {
  console.error(red('✗ dist/ not found. Run `npm run build` first.'));
  process.exit(1);
}

/** The row layout's whole range, plus the widths either side of each breakpoint. */
const VIEWPORTS = [1920, 1700, 1600, 1536, 1441, 1440, 1366, 1281, 1280, 1180, 1025, 1024, 900, 820, 740, 700];

/** Runs in-page. Passed as a function — a string page.evaluate() drops its argument. */
function measureHero() {
  const vw = document.documentElement.clientWidth;
  const right = document.querySelector('.hero-right');
  const cue = document.querySelector('.hero-scroll');
  const actions = document.querySelector('.hero-actions');
  const out = { overflow: 0, cueOverlap: false };
  if (right) out.overflow = Math.round(right.getBoundingClientRect().right - vw);
  if (cue && actions && getComputedStyle(cue).display !== 'none') {
    const a = cue.getBoundingClientRect(), b = actions.getBoundingClientRect();
    out.cueOverlap = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }
  return out;
}

const report = new Report('audit-hero-fit (locale x viewport)');
const { base, close } = await startDistServer({ root });
const browser = await launch(chromium);

const locales = ALL_LOCALES.filter(
  (l) => l === DEFAULT_LOCALE || existsSync(resolve(root, `src/data/i18n/${l}.json`)),
);

for (const locale of locales) {
  const path = locale === DEFAULT_LOCALE ? '/' : `/${locale}/`;
  for (const width of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(measureHero);
    await page.close();

    report.check(
      `${locale} @${width}: hero right column is inside the viewport`,
      r.overflow <= 0,
      r.overflow > 0 ? `clipped by ${r.overflow}px — the description and second CTA are cut off` : '',
    );
    report.check(
      `${locale} @${width}: scroll cue clear of the CTAs`,
      !r.cueOverlap,
      r.cueOverlap ? 'the centred scroll cue is sitting on top of the action row' : '',
    );
  }
}

await browser.close();
await close();
process.exit(report.summarize() ? 0 : 1);
