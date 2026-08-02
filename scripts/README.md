# Verification suite

Three independent layers, each stricter (and more expensive) than the last.
Every layer is safe to run on a clean clone — the browser layer just skips
itself if its one optional dependency isn't installed.

```
npm run build          # always required first — every layer reads dist/
npm run verify:all      # static + headers + browser (browser auto-skips if unavailable)
```

## Layer 1 — headers/CSP replay (`verify-headers.mjs`)

No browser. Serves `dist/` through a tiny local HTTP server that replays
the exact header rules from `vercel.json` (see `scripts/lib/dist-server.mjs`),
then asserts the real production contract over real HTTP: strict CSP with
no `'unsafe-inline'` in `script-src`, every inline script's hash present, no
stale hashes, no `<meta>` CSP tag, HSTS/COOP/X-Frame-Options/Permissions-
Policy all set — **on every real route and on a 404**, because Vercel
applies `vercel.json` headers to 404 responses too, and a check that only
ever requests real pages would never notice a header quietly missing from
the error path.

This is complementary to, not a replacement for, `verify-csp.mjs` (which
runs as `prebuild` and checks the *source* HTML against `vercel.json`).
This layer checks the *built* `dist/` output served the way Vercel actually
serves it.

```bash
npm run build
npm run verify:headers
```

## Layer 2 — static assertions (`check-static.mjs`)

No browser, no server, no build even. Pure text/regex checks against the
source HTML/CSS: heading outline (one `<h1>`, no skipped levels), no em
dashes in visible copy, no internal `href="*.html"` links, `sitemap.xml`
matches the 5 real routes on the canonical host, every JSON-LD block
parses, no legacy `--fs-*` tokens, `public/Renders/*` directory names stay
hyphenated.

```bash
npm run check:static
```

## Layer 3 — browser (`audit.mjs`, `verify.mjs`, `contrast.mjs`, `perf3.mjs`)

The things only a real browser can prove. **Optional** — `playwright-core`
is not a dependency of this project by default, so these four scripts
detect its absence and exit 0 with a one-line skip message rather than
failing. `npm run build` and layers 1–2 never depend on it.

### Enabling it

`node_modules` in an agent worktree is a symlink to the shared main
checkout — do **not** `npm install` there, it pollutes every other
worktree. In the real checkout (or your own clone), once:

```bash
npm install -D playwright-core
```

No browser download happens — every script launches **system Chrome**
(`channel: 'chrome'`), so Chrome must be installed on the machine running
these.

### Running it

```bash
npm run build
npm run audit:tap        # audit.mjs      — overflow + tap targets
npm run audit:type       # verify.mjs     — type floors + console errors/warnings
npm run audit:contrast   # contrast.mjs   — text-over-photograph contrast
npm run audit:perf       # perf3.mjs      — CLS + frame pacing
npm run audit:mobile     # all four, in that order
```

### What each one checks

- **`audit.mjs`** — no horizontal overflow, and every tap target is
  ≥44×44px under `pointer: coarse`, across six viewports (four portrait,
  two landscape: 320×568, 375×812, 390×844, 768×1024, 844×390, 1024×768).
  Also runs one bounded press/release smoke test on a real `<a href>` to
  prove the capture-phase `preventDefault` guard actually stops the
  press from navigating and destroying the page context mid-measurement.
- **`verify.mjs`** — computed font-size for every element that consumes one
  of the 11 `--t-*` role tokens, checked against that role's documented
  floor (reading 16px, dense prose 15px, captions 14px, UI 13px, labels
  12px, micro 11.5px) at the narrowest viewport. The role is resolved
  *live*, per element, by matching its computed font-size against each
  token's current value — not from a fixed selector map — because some
  selectors (`.banner .sub`) are reassigned to a different token by a
  narrow-viewport media query. Also loads every real page and asserts zero
  console errors **and warnings** (Permissions-Policy parsing issues land
  as warnings, not errors) and zero uncaught exceptions.
- **`contrast.mjs`** — WCAG contrast (floor 4.5:1) for text sitting over a
  photograph (hero, banner headers, full-bleed captions). Hides the text
  via `visibility: hidden` (not `display`, so layout doesn't shift),
  screenshots the element's own box, decodes it to a `<canvas>` **in the
  browser** (no image-decoding npm dependency), and checks the **worst
  pixel row**, not the average — a bright patch of sky behind the top half
  of a heading and a dark wall behind the bottom half average to "fine"
  while the top half is genuinely illegible.
- **`perf3.mjs`** — Cumulative Layout Shift under throttled network (CDP
  `Network.emulateNetworkConditions`, 150ms/1.5Mbps — the same numbers
  README.md documents the site's own CLS work was measured with;
  un-throttled localhost loads everything before layout has a chance to
  shift, which makes CLS pass for the wrong reason), plus a coarse frame-
  pacing smoke test during a scripted scroll. The frame-pacing threshold is
  deliberately generous — it catches an actual jank regression (a
  synchronous layout thrash, an infinite loop), not fine-grained perf
  accounting, and it does **not** re-litigate the grain-drift A/B already
  measured at 4x CPU throttle in `src/site.css`.

## Landmines this suite is already built around

If you're extending these scripts, the failure modes below cost real time
to discover once — don't rediscover them:

- `page.evaluate(someString)` silently drops its argument and returns
  `null` for everything. Always pass a function (or `evaluate(fn, arg)`
  with exactly one arg — bundle multiple values into one object).
- A property in an element's `transition` list, read in the same tick as
  the state change that triggers the transition, returns the
  **pre-transition** value. Wait ~450ms.
- `mouse.down()` on a real `<a href>` navigates the page and destroys the
  execution context mid-script. Install a capture-phase `preventDefault`
  before any press test.
- Capture console **`warning`**, not just `error` — an errors-only run
  misses Permissions-Policy parsing warnings entirely.
- Chrome's mobile emulation (`isMobile: true`) clamps a requested 320px
  viewport to 345px. To actually test 320, pass `isMobile: false,
  hasTouch: true` instead.
- `hasTouch: true` is what makes `(hover: none)` / `(pointer: coarse)`
  media queries match. Without it, every viewport is still tested as if
  from a mouse.
- **`element.checkVisibility()` with no options only checks `display:
  none`** — it does NOT check `opacity: 0` or `visibility: hidden` unless
  you pass `{ opacityProperty: true, visibilityProperty: true }`. The
  mobile drawer nav (`.drawer { opacity: 0; visibility: hidden;
  pointer-events: none }` until `body.menu-open`) is exactly that pattern:
  without the flags, its links read back a real, positive, in-viewport
  rect while genuinely unreachable — a false tap-target pass on elements
  nobody can touch. `checkVisibility()` still can't see z-index stacking,
  ancestor `overflow: hidden` clipping, or `pointer-events: none`
  specifically — cross-check with `document.elementFromPoint()` at the
  candidate box's own center.
- Inline links inside running prose (`.office .b a`, `.drawer-foot .l a`,
  `.form-note a`) grow an invisible `::after` hit area
  (`inset: -14px -6px`) under `pointer: coarse` instead of a `min-height`,
  because a link inside a text line can't take one without breaking the
  line box. Measuring the `<a>` rect alone reports a false tap-target
  failure — expand the box by any absolutely-positioned `::before`/`::after`
  with non-`none` content first.
- For contrast over photographs: screenshot with the text hidden via
  `visibility` (not `display`, which would reflow), decode to canvas, and
  take the **worst row**, not the average.
- Measure CLS with CDP `Network.emulateNetworkConditions` (150ms/1.5Mbps).
  Un-throttled localhost gives meaningless (always-zero) numbers because
  everything, including web fonts, lands before layout ever happens.

## Known findings against `main` (left alone — outside this suite's ownership)

Running `npm run audit:tap` against the current `main` build surfaces two
real, reproduced site defects. Both are in `index.html` / `src/site.css`,
outside `scripts/`'s file ownership for this pass, so they were **not**
fixed here — reported instead:

1. **Home page overflows horizontally below ~372px viewport width.** The
   CTA heading ("Let's design something extraordinary.", `index.html`,
   `#cta h2`) is sized by `.cta h2 { max-width: 15ch; ... }`
   (`src/site.css`). Under the section's `align-items: center` (shrink-to-
   fit sizing), that heading's rendered width bottoms out at ~371px and
   does not wrap into more/shorter lines below it, so at any true viewport
   narrower than ~372px the page gets a genuine horizontal scrollbar.
   Reproduced with JavaScript disabled (rules out the scroll-reveal
   script) and swept across widths 300–390px: overflow is present at every
   width through 360px, gone at 375px. This likely escaped every prior
   pass because Chrome's mobile-emulation panel clamps a requested 320px
   viewport to 345px — and even the emulator's clamped value still
   overflows, but a spot-check at a preset like "iPhone SE / 375" would
   never see it, since 375 already clears the ~372px threshold.
2. **The primary nav fails its own 44px touch-target floor on touch-capable
   devices wide enough to show the desktop nav.** `@media (pointer: coarse)`
   in `src/site.css` (~line 599) raises `.crumbs a`, `.foot-nav a`,
   `.foot-social a`, `.drawer-social a` and `.foot-top > a` to a 44px
   floor, but not `.nav-links a:not(.btn)` — the horizontal nav shown once
   the viewport is wide enough (~860px+) to drop the hamburger/drawer.
   Measured on a real device profile (1024×768, `hasTouch: true` — e.g. an
   iPad in landscape): nav links come out at ~35px tall, under the site's
   own documented 44px floor. Every other touch surface on the site
   accounts for coarse pointers at any width; this one only accounts for
   them below the nav breakpoint.

`npm run audit:mobile` will report these as failures until a future pass
(with `src/site.css` / `index.html` in its ownership) addresses them. That
is by design — this suite is not rigged to pass regardless of what it
finds.
