#!/usr/bin/env node
/**
 * Draw Clever Architecture — mobile audit: contrast over photographs
 *
 * Flat-color text-on-background contrast can be computed from two CSS
 * colors. Text laid over a photograph can't — the photo's luminance varies
 * under every glyph, and a single average would hide a legible-on-average,
 * illegible-in-one-corner failure. So for each text block that sits over a
 * `.banner-bg` / `.hero-bg` / `.fb-img` photograph:
 *
 *   1. Hide the text via `visibility: hidden` (not display:none — that
 *      would reflow the photo underneath it) and screenshot the element's
 *      own box, so the crop is exactly what the glyphs would have covered.
 *   2. Decode that screenshot to a <canvas> IN THE BROWSER (an <img> onto
 *      a canvas + getImageData) rather than pulling the PNG into Node —
 *      no image-decoding dependency needed.
 *   3. Average the luminance of each pixel ROW, and take the WORST row,
 *      not the average of the whole crop — a bright cloud behind the top
 *      half of a heading and a dark wall behind the bottom half average to
 *      "fine" while the top half is genuinely unreadable.
 *   4. Contrast the text's own computed color against that worst row.
 *      Floor is 4.5:1 (WCAG AA / the site's documented floor).
 *
 * Optional — see scripts/README.md. Skips cleanly, exit 0, when
 * playwright-core isn't installed.
 *
 *   npm run build
 *   npm run audit:contrast
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDistServer } from './lib/dist-server.mjs';
import { CONTEXT_OPTS } from './lib/viewports.mjs';
import { waitForPageReady } from './lib/wait-ready.mjs';
import { loadChromium, reportSkip, launch } from './lib/browser-optional.mjs';
import { relativeLuminance, contrastRatio, parseRgb } from './lib/color.mjs';
import { Report, red, dim } from './lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const chromium = await loadChromium();
if (!chromium) { reportSkip('contrast.mjs'); process.exit(0); }

if (!existsSync(resolve(root, 'dist'))) {
  console.error(red('✗ dist/ not found. Run `npm run build` first.'));
  process.exit(1);
}

const CONTRAST_FLOOR = 4.5;

// path, selector for the text block, and whether it needs the .reveal
// scroll-trigger first (fullbleed captions start opacity:0 / scaled+
// darkened until their IntersectionObserver fires — see src/site.js's
// REVEAL block and `.fullbleed.reveal picture`'s filter: brightness(.78)).
const TARGETS = [
  { path: '/', selector: '.hero-title', needsReveal: false },
  { path: '/', selector: '.hero-badge', needsReveal: false },
  { path: '/', selector: '.hero-desc', needsReveal: false },
  { path: '/', selector: '.fb-caption h3', needsReveal: true },
  { path: '/', selector: '.fb-caption p', needsReveal: true },
  { path: '/about-us', selector: '.banner-inner h1', needsReveal: false },
  { path: '/about-us', selector: '.banner .sub', needsReveal: false },
  { path: '/about-us', selector: '.fb-caption h3', needsReveal: true },
  { path: '/about-us', selector: '.fb-caption p', needsReveal: true },
  { path: '/services', selector: '.banner-inner h1', needsReveal: false },
  { path: '/services', selector: '.banner .sub', needsReveal: false },
  { path: '/projects', selector: '.banner-inner h1', needsReveal: false },
  { path: '/projects', selector: '.banner .sub', needsReveal: false },
  { path: '/contact', selector: '.banner-inner h1', needsReveal: false },
  { path: '/contact', selector: '.banner .sub', needsReveal: false },
];

const report = new Report('contrast (text over photographs)');
const { base, close } = await startDistServer({ root });
const browser = await launch(chromium);

/** Runs in-page after the crop screenshot is loaded as a data URL: decodes
 *  it to canvas and returns the worst (lowest-luminance-range) row's
 *  average RGB, plus the text element's own computed color. Passed a
 *  function + one arg object — not a template string. */
async function analyzeCrop({ dataUrl, selector }) {
  const el = document.querySelector(selector);
  const color = getComputedStyle(el).color;

  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx2d = canvas.getContext('2d');
  ctx2d.drawImage(img, 0, 0);
  const { data, width, height } = ctx2d.getImageData(0, 0, canvas.width, canvas.height);

  // Per-row average luminance (sRGB → relative luminance), tracking the
  // row with the LOWEST contrast potential (closest to the text's own
  // luminance would need the text color, computed back in Node — so
  // instead we return every row's average RGB and let Node pick the worst
  // against the parsed text color; rows are cheap, this crop is small).
  const rows = [];
  for (let y = 0; y < height; y++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    rows.push([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
  }
  return { color, rows, width, height };
}

const byPath = new Map();
for (const t of TARGETS) {
  if (!byPath.has(t.path)) byPath.set(t.path, []);
  byPath.get(t.path).push(t);
}

for (const [path, targets] of byPath) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ...CONTEXT_OPTS });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await waitForPageReady(page);

  for (const t of targets) {
    const locator = page.locator(t.selector).first();
    const count = await page.locator(t.selector).count();
    if (count === 0) { report.skip(`${t.path} ${t.selector}: not present on this page`); continue; }

    // Scroll the target into view itself (rather than a page-wide sweep
    // then back to 0) so the element we're about to screenshot is
    // guaranteed to be within the live viewport when we clip it —
    // page.screenshot's clip box is viewport-relative, and boundingBox()
    // taken before a later scroll-to-top would go stale.
    await locator.scrollIntoViewIfNeeded();
    if (t.needsReveal) await page.waitForTimeout(900); // IntersectionObserver + the .55s/.9s reveal transitions

    // Hide the text without reflowing (visibility, not display) and shoot
    // exactly its own box.
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.dataset.__contrastPrevVisibility = el.style.visibility;
      el.style.visibility = 'hidden';
    }, t.selector);
    // Reading a property in the transition list in the same tick as a
    // state change returns the PRE-transition value — wait it out.
    await page.waitForTimeout(450);

    const box = await locator.boundingBox();
    if (!box || box.width < 1 || box.height < 1) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        el.style.visibility = el.dataset.__contrastPrevVisibility || '';
      }, t.selector);
      report.skip(`${t.path} ${t.selector}: no visible box to sample (0-size or off-screen)`);
      continue;
    }

    const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.style.visibility = el.dataset.__contrastPrevVisibility || '';
      delete el.dataset.__contrastPrevVisibility;
    }, t.selector);

    const dataUrl = 'data:image/png;base64,' + png.toString('base64');
    const { color, rows } = await page.evaluate(analyzeCrop, { dataUrl, selector: t.selector });

    const textRgb = parseRgb(color);
    if (!textRgb) { report.skip(`${t.path} ${t.selector}: could not parse computed text color "${color}"`); continue; }
    const textL = relativeLuminance(textRgb.r, textRgb.g, textRgb.b);

    let worstRatio = Infinity;
    let worstRow = -1;
    rows.forEach(([r, g, b], i) => {
      const ratio = contrastRatio(textL, relativeLuminance(r, g, b));
      if (ratio < worstRatio) { worstRatio = ratio; worstRow = i; }
    });

    report.check(
      `${t.path} ${t.selector}: worst-row contrast >= ${CONTRAST_FLOOR}:1`,
      worstRatio >= CONTRAST_FLOOR,
      `${worstRatio.toFixed(2)}:1 at row ${worstRow}/${rows.length} (text color ${color})`
    );
  }
  await page.close();
}

await browser.close();
await close();
const ok = report.summarize();
if (!ok) {
  console.error(dim('\n  Contrast failures are measured pixel-by-pixel against the real dist/ build. Reproduce visually before assuming the check is buggy.\n'));
}
process.exit(ok ? 0 : 1);
