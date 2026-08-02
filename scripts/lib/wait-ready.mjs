/**
 * Every page runs a pre-paint loader that holds `<html class="dc-loading">`
 * until fonts are ready (min 450ms, max 4500ms fallback — see the inline
 * bootstrap script and the CLS notes in README.md), then swaps to
 * `dc-ready`. Measuring geometry, computed styles or pixels before that
 * swap catches the site mid-entrance-animation, not its settled state.
 *
 * This also covers the transition-read landmine: several properties this
 * suite reads (colors, transforms) are in a page's `transition:` list, and
 * reading them in the same tick as a state change returns the
 * pre-transition value. The fixed 450ms tail below waits that out.
 */
export async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page
    .waitForFunction(() => document.documentElement.classList.contains('dc-ready'), { timeout: 6000 })
    .catch(() => {});
  await page.waitForTimeout(450);
}
