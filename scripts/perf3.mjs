#!/usr/bin/env node
/**
 * Draw Clever Architecture — mobile audit: CLS + frame pacing
 *
 *   1. Cumulative Layout Shift, measured the way README.md documents the
 *      site's own CLS work was measured: CDP `Network.emulateNetworkConditions`
 *      at 150ms latency / 1.5Mbps, so fonts and the hero/banner image land
 *      well after first paint the way they do on a real connection.
 *      Un-throttled localhost loads everything before layout has a chance
 *      to shift, which would make this check pass for the wrong reason.
 *   2. Frame pacing during a scripted scroll — a coarse jank smoke test
 *      (generous thresholds; this does NOT re-litigate the grain-drift
 *      A/B in site.css, which was already measured at 4x CPU throttle and
 *      found to be a wash — see the comment there). This just catches an
 *      actual regression, like a synchronous layout thrash or infinite
 *      loop, not fine-grained frame-budget accounting.
 *
 * Optional — see scripts/README.md. Skips cleanly, exit 0, when
 * playwright-core isn't installed.
 *
 *   npm run build
 *   npm run audit:perf
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDistServer } from './lib/dist-server.mjs';
import { ROUTES } from './lib/pages.mjs';
import { CONTEXT_OPTS } from './lib/viewports.mjs';
import { loadChromium, reportSkip, launch } from './lib/browser-optional.mjs';
import { Report, red, dim } from './lib/report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const chromium = await loadChromium();
if (!chromium) { reportSkip('perf3.mjs'); process.exit(0); }

if (!existsSync(resolve(root, 'dist'))) {
  console.error(red('✗ dist/ not found. Run `npm run build` first.'));
  process.exit(1);
}

// Matches README.md's documented CLS methodology exactly.
const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.5 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 };
// CLS: the site targets 0.0000 (see README); a small non-zero allowance
// covers font/image timing jitter inherent to a real (if simulated)
// network without turning this into a flaky hair-trigger.
const CLS_BUDGET = 0.05;
// Frame pacing: a coarse jank floor, not a perf benchmark — see file header.
const P95_FRAME_BUDGET_MS = 50;

const report = new Report('perf3 (CLS + frame pacing)');
const { base, close } = await startDistServer({ root });
const browser = await launch(chromium);

for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ...CONTEXT_OPTS });
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', NETWORK);

  // Registered via addInitScript so the PerformanceObserver is live from
  // the very first paint — layout shifts caused by font/image arrival
  // happen early, and attaching the observer after `goto` resolves would
  // already have missed them.
  await page.addInitScript(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      window.__cls = null; // layout-shift not supported in this browser
    }
  });

  await page.goto(base + route.path, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500); // settle past the 450–4500ms loader window under throttling

  const cls = await page.evaluate(() => window.__cls);
  if (cls === null) {
    report.skip(`${route.path}: layout-shift not supported by this browser build`);
  } else {
    report.check(`${route.path}: CLS <= ${CLS_BUDGET} under throttled load (150ms/1.5Mbps)`, cls <= CLS_BUDGET, `measured ${cls.toFixed(4)}`);
  }

  await page.close();
}

/* ── Frame pacing during a scripted scroll ──────────────────────────────── */
for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ...CONTEXT_OPTS });
  await page.goto(base + route.path, { waitUntil: 'networkidle' });
  await page
    .waitForFunction(() => document.documentElement.classList.contains('dc-ready'), { timeout: 6000 })
    .catch(() => {});
  await page.waitForTimeout(450);

  const frames = await page.evaluate(async () => {
    const deltas = [];
    let last = performance.now();
    let rafId;
    const collect = () => {
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      rafId = requestAnimationFrame(collect);
    };
    rafId = requestAnimationFrame(collect);

    const duration = 2200;
    const start = performance.now();
    const scrollStep = () => {
      window.scrollBy(0, 6);
      if (performance.now() - start < duration) requestAnimationFrame(scrollStep);
    };
    requestAnimationFrame(scrollStep);

    await new Promise((r) => setTimeout(r, duration + 100));
    cancelAnimationFrame(rafId);
    return deltas;
  });

  if (frames.length < 5) {
    report.skip(`${route.path}: too few frames captured to judge pacing (${frames.length})`);
  } else {
    const sorted = [...frames].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    report.check(
      `${route.path}: p95 frame time <= ${P95_FRAME_BUDGET_MS}ms while scrolling`,
      p95 <= P95_FRAME_BUDGET_MS,
      `p95 ${p95.toFixed(1)}ms over ${frames.length} frames, max ${Math.max(...frames).toFixed(1)}ms`
    );
  }
  await page.close();
}

await browser.close();
await close();
const ok = report.summarize();
if (!ok) {
  console.error(dim('\n  CLS/frame-pacing failures are measured against the real dist/ build under throttled network. Reproduce before assuming the check is buggy — and don\'t use this to re-litigate the grain-drift decision in site.css.\n'));
}
process.exit(ok ? 0 : 1);
