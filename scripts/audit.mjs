#!/usr/bin/env node
/**
 * Draw Clever Architecture — mobile audit: overflow + tap targets
 *
 * The half of the mobile pass that needs a real browser: horizontal
 * overflow and `pointer: coarse` tap-target sizing, across six viewports
 * (four portrait, two landscape). Optional — see scripts/README.md for the
 * one install command. Skips cleanly, exit 0, when playwright-core isn't
 * present.
 *
 *   npm run build
 *   npm run audit:tap
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDistServer } from './lib/dist-server.mjs';
import { ROUTES } from './lib/pages.mjs';
import { VIEWPORTS, CONTEXT_OPTS } from './lib/viewports.mjs';
import { waitForPageReady } from './lib/wait-ready.mjs';
import { loadChromium, reportSkip, launch } from './lib/browser-optional.mjs';
import { Report, red, dim } from './lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const chromium = await loadChromium();
if (!chromium) { reportSkip('audit.mjs'); process.exit(0); }

if (!existsSync(resolve(root, 'dist'))) {
  console.error(red('✗ dist/ not found. Run `npm run build` first.'));
  process.exit(1);
}

const report = new Report('audit (overflow + tap targets)');
const { base, close } = await startDistServer({ root });
const browser = await launch(chromium);

// A synthetic 404 belongs in the sweep too: it's a real page a visitor can
// land on, and it carries its own tap targets (nav-free, but still a link
// home) — see the "404.html is standalone" note in README.md.
const PAGES = [...ROUTES, { path: '/this-page-does-not-exist', name: '404' }];

/** Runs in-page. Passed as a function, not a string — string page.evaluate()
 *  silently drops its argument and returns null for everything. */
function measurePage() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  const overflow = {
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: vw,
  };

  const SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]';
  const targets = [];
  for (const el of document.querySelectorAll(SELECTOR)) {
    // checkVisibility() with NO options only catches display:none — NOT
    // opacity:0 or visibility:hidden. The mobile drawer nav is exactly
    // that pattern (`.drawer { opacity:0; visibility:hidden; pointer-events:none }`
    // until `body.menu-open`), and without these two flags its links read
    // back a real, positive, in-viewport rect while genuinely unreachable.
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    // Off-canvas (unfocused skip link, the botcheck honeypot at left:-9999px)
    // is not a real target a coarse pointer can reach — skip it.
    if (rect.right <= 0 || rect.left >= vw || rect.bottom <= 0 || rect.top >= vh) continue;
    // checkVisibility (even with both flags) still can't see z-index
    // stacking, ancestor overflow:hidden clipping, or pointer-events:none —
    // confirm a real hit-test at the box's own center actually lands on
    // this element (or a descendant of it, e.g. an icon span inside a button).
    const cx = Math.min(Math.max(rect.left + rect.width / 2, 0), vw - 1);
    const cy = Math.min(Math.max(rect.top + rect.height / 2, 0), vh - 1);
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(hit === el || el.contains(hit))) continue;

    // Expand the box by any absolutely-positioned ::before/::after hit-area
    // (see `.office .b a`, `.drawer-foot .l a`, `.form-note a` in
    // site.css — an inline link's real tap target is bigger than its own
    // line-box, and measuring the <a> rect alone reports a false failure).
    let top = rect.top, right = rect.right, bottom = rect.bottom, left = rect.left;
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (cs.content === 'none' || (cs.position !== 'absolute' && cs.position !== 'fixed')) continue;
      const pt = parseFloat(cs.top), pr = parseFloat(cs.right), pb = parseFloat(cs.bottom), pl = parseFloat(cs.left);
      if (!Number.isNaN(pt)) top = Math.min(top, rect.top + pt);
      if (!Number.isNaN(pb)) bottom = Math.max(bottom, rect.bottom - pb);
      if (!Number.isNaN(pl)) left = Math.min(left, rect.left + pl);
      if (!Number.isNaN(pr)) right = Math.max(right, rect.right - pr);
    }

    const w = right - left, h = bottom - top;
    const name = el.tagName.toLowerCase() +
      (el.id ? `#${el.id}` : '') +
      (el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '') +
      ' "' + (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 30) + '"';
    targets.push({ name, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 });
  }
  return { overflow, targets };
}

const FLOOR = 44;
const TOLERANCE = 0.5; // sub-pixel layout rounding

for (const page of PAGES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, ...CONTEXT_OPTS });
    let navFailed = false;
    try {
      await ctx.goto(base + page.path, { waitUntil: 'networkidle', timeout: 15000 });
    } catch {
      navFailed = true;
    }
    if (navFailed) { report.check(`${page.path} @ ${vp.name}: page loads`, false); await ctx.close(); continue; }

    await waitForPageReady(ctx);
    const { overflow, targets } = await ctx.evaluate(measurePage);
    const label = `${page.name ?? page.path} @ ${vp.name}`;

    const widest = Math.max(overflow.docScrollWidth, overflow.bodyScrollWidth);
    report.check(
      `${label}: no horizontal overflow`,
      widest - overflow.clientWidth <= TOLERANCE,
      `scrollWidth ${widest}px > clientWidth ${overflow.clientWidth}px (+${Math.round(widest - overflow.clientWidth)}px)`
    );

    const undersized = targets.filter((t) => t.w < FLOOR - TOLERANCE || t.h < FLOOR - TOLERANCE);
    report.check(
      `${label}: all ${targets.length} tap target(s) are >= 44x44`,
      undersized.length === 0,
      undersized.slice(0, 5).map((t) => `${t.name} is ${t.w}x${t.h}`).join('; ') + (undersized.length > 5 ? ` (+${undersized.length - 5} more)` : '')
    );

    await ctx.close();
  }
}

/* One bounded press/release smoke test for the mouse-down-on-<a>-navigates
   landmine: without a capture-phase preventDefault, mousedown+up on a real
   <a href> mid-measurement navigates the page and destroys the execution
   context mid-script. This proves the guard actually works, on one live
   nav link, rather than re-deriving the failure on every run. */
{
  const ctx = await browser.newPage({ viewport: { width: 390, height: 844 }, ...CONTEXT_OPTS });
  await ctx.goto(base + '/', { waitUntil: 'networkidle' });
  await waitForPageReady(ctx);
  // .foot-nav is in normal document flow at every viewport (unlike
  // .nav-links, which is display:none below the ~860px nav breakpoint) —
  // scroll it into view so the press lands on a real, on-screen target.
  await ctx.locator('.foot-nav a').first().scrollIntoViewIfNeeded();
  await ctx.evaluate(() => {
    document.addEventListener('click', (e) => { if (e.target.closest('.foot-nav a')) e.preventDefault(); }, { capture: true });
  });
  const link = ctx.locator('.foot-nav a').first();
  const box = await link.boundingBox();
  let survived = box !== null;
  try {
    if (box) {
      await ctx.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await ctx.mouse.down();
      await ctx.waitForTimeout(80);
      await ctx.mouse.up();
      await ctx.evaluate(() => document.title); // context still alive?
    }
  } catch {
    survived = false;
  }
  report.check('press/release on a real <a href> does not destroy the page context (capture-phase preventDefault installed)', survived);
  report.check('press/release did not navigate away from /', ctx.url().endsWith('/') || ctx.url() === base + '/', `ended at ${ctx.url()}`);
  await ctx.close();
}

await browser.close();
await close();
const ok = report.summarize();
if (!ok) {
  console.error(dim('\n  Overflow/tap-target failures are measured against the real dist/ build. If one looks wrong, reproduce it in a real browser at the same viewport before assuming the check is buggy.\n'));
}
process.exit(ok ? 0 : 1);
