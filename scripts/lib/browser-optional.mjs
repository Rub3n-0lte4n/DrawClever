/**
 * playwright-core is an optional dependency of this suite (see
 * scripts/README.md for the one install command). `node_modules` in every
 * agent worktree is a symlink to the shared main checkout, so nothing in
 * scripts/ may assume the package is there — the header and static layers
 * must keep working on a completely clean clone.
 *
 * Every browser-layer script starts with:
 *
 *   const chromium = await loadChromium();
 *   if (!chromium) { reportSkip('audit.mjs'); process.exit(0); }
 *
 * which prints one line and exits 0 (not a failure) when the dependency is
 * absent, so `npm run build` and the static layer are never blocked by it.
 */
import { dim } from './report.mjs';

export async function loadChromium() {
  try {
    const mod = await import('playwright-core');
    return mod.chromium;
  } catch (err) {
    if (err && (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND')) return null;
    throw err;
  }
}

export function reportSkip(scriptName) {
  console.log(dim(`○ ${scriptName}: skipped — playwright-core is not installed in this checkout.`));
  console.log(dim('  Install it once with: npm install -D playwright-core   (see scripts/README.md)'));
}

/** Launches system Chrome via the `chrome` channel — no browser download. */
export function launch(chromium, opts = {}) {
  return chromium.launch({ channel: 'chrome', headless: true, ...opts });
}
