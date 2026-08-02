# Draw Clever Architecture

The website of Draw Clever — a luxury architecture & interior design atelier
with studios in Romania and Spain.

> **Design language — "Midnight Couture."** Ink-black canvas, warm-white text, and
> the brand's own champagne → bronze **gold ramp** sampled straight from the logo.
> Cinematic, restrained, editorial. Display type is **Playfair Display SC** (the
> brand serif); UI/body is **Inter**.

> **Accessibility & SEO:** WCAG-AA contrast, absolute Open Graph / canonical
> tags + Twitter cards, skip links and an announced contact form, AVIF/WebP imagery
> via `<picture>` and `image-set()`, `font-display: swap`, and SEO plumbing
> (`robots.txt`, `sitemap.xml`, JSON-LD).

## What's here

A complete multi-page site:

| Page | File | |
|---|---|---|
| **Home** | `index.html` | Cinematic still hero, manifesto, selected works, studio, disciplines, tenets, CTA |
| **Portfolio** | `projects.html` | All projects in a filterable gallery (Architecture / Interior / Residential / Commercial), each opening a lightbox |
| **About** | `about-us.html` | Studio story, stats, ethos tenets, the two ateliers |
| **Services** | `services.html` | Five disciplines + the "first sketch to final key" process |
| **Contact** | `contact.html` | Ateliers, project enquiry form, FAQ |
| **404** | `404.html` | Self-contained styled not-found page |

Shared chrome and design system live in **`src/site.css`** + **`src/site.js`**
(loaded by every page); page-specific section styles stay inline per page.

Highlights:

- **Cinematic hero** — a graded full-bleed still with a slow intro zoom and a filmic
  veil.
- **Gold-gradient display type** — headline accents use the logo's exact gold ramp
  via `background-clip: text`.
- **Lightbox galleries** (`src/lightbox.js`) for all 8 projects — keyboard nav,
  focus handling, neighbour preloading.
- Film-grain overlay, scroll-progress bar, scroll reveals, full-bleed parallax
  interludes, a mobile drawer, FAQ accordion, and a full responsive pass.
  Reduced-motion friendly.

## Live preview

Deployed on Vercel (auto-deploys on push to `main`):

**https://drawclever.vercel.app/**

Page URLs are extensionless (`/about-us`) via Vercel `cleanUrls`; old `.html`
URLs redirect. `vercel.json` also sets the security and immutable-cache headers.

## Security

Every security header is served from **`vercel.json`** — there is no `<meta>` CSP.
A meta tag cannot carry `frame-ancestors`, does not cover non-HTML responses, and
is only enforced once the parser reaches it. The header covers 404 responses too.

### The CSP runs without `'unsafe-inline'`

`script-src` is `'self'` plus a **SHA-256 hash per inline script**. That is the
whole point of the policy: with `'unsafe-inline'`, any injected `<script>` runs
and the CSP buys nothing.

Only the pre-paint loader bootstrap is still inline (it has to set a class on
`<html>` before first paint, and an external file would cost a blocking request
on the critical path). Everything else lives in `src/` and is covered by `'self'`
once Vite bundles it.

**If you add or edit an inline `<script>`, the CSP must be updated or the browser
will silently refuse to run it.**

```bash
npm run verify:csp           # check — recomputes hashes from the HTML
npm run verify:csp -- --fix  # rewrite vercel.json with the correct hashes
```

This runs automatically as `prebuild`, so a drifted policy fails the Vercel build
rather than shipping a page whose script is blocked. It also fails if
`'unsafe-inline'` reappears in `script-src`, or if anyone re-adds a `<meta>` CSP.

Adding a **new page-specific script**: put it in `src/`, load it with
`<script type="module" src="/src/your-file.js">`, and Vite bundles it into
`/assets/` where `'self'` already covers it. No hash needed.

### Contact form

The Web3Forms access key in `src/contact-form.js` is public by design, so the
honeypot and `maxlength` caps only shape well-behaved traffic. Anything posting
directly to `api.web3forms.com` skips them entirely. Abuse has to be held off at
the provider:

1. In **app.web3forms.com → Settings**, set **Allowed Domains** to the live host.
   This rejects submissions whose `Origin` is not the site, which is what stops
   the key being reused from someone else's page.
2. Leave the provider's spam filtering on. Add hCaptcha or Turnstile there only
   if spam actually becomes a problem — either one needs a third-party script,
   which means reopening `script-src` and `frame-src` in the CSP.

### Dependencies

```bash
npm audit                    # production surface (this is a static site — none)
npm audit --include=dev      # full build-toolchain surface
```

One low-severity advisory is knowingly left open: **esbuild GHSA-g7r4-m6w7-qqqr**
(CVSS 2.5), an arbitrary file read in the esbuild *dev server* **on Windows**.
The fix is esbuild 0.28, outside the `^0.27.0` range Vite 7 pins, so taking it
means either forcing an out-of-range transitive dependency or a Vite major bump.
Neither is justified: esbuild never runs in production here, builds run on
Vercel's Linux runners, and local development is on macOS. Revisit at the next
Vite major. `postcss` is pinned via `overrides` to keep the patched floor for
GHSA-r28c-9q8g-f849 (CVSS 7.5) even on a clean `npm install`.

### Known and accepted

- **`style-src` keeps `'unsafe-inline'`.** The pages use inline `style=`
  attributes throughout and the motion code sets styles from JS. CSS-only
  injection is a far weaker vector than script injection, and hashing style
  attributes is not workable with dynamic values. Removing it means moving every
  inline style into `site.css` first.
- **`Access-Control-Allow-Origin: *`** is Vercel's platform default for static
  assets. Nothing here is origin-protected, there are no cookies and no
  credentialed endpoints, so there is nothing for a cross-origin read to reach.

## Fonts and layout stability

The display face is doing heavy lifting at 135px+, and Playfair Display SC is
**~21% wider and much taller than Times**. With `font-display: swap` that made
the swap a re-layout, not a repaint: the hero grew 365px → 609px and moved
110px up. Measured CLS was **0.1273**, over Google's 0.1 threshold.

Each page therefore declares a metric-matched fallback:

```css
@font-face { font-family: 'Playfair SC Fallback'; src: local('Times New Roman'), local('Times');
             size-adjust: 120.68%; ascent-override: 89.49%; descent-override: 20.72%; line-gap-override: 0%; }
```

and every `'Playfair Display SC'` stack lists it before `serif`. There is a
second face for `font-style: italic` with its own numbers — the hero's
`<em class="gold">Luxury</em>` needs it, and fixing only the roman actually made
CLS **worse** (0.1273 → 0.1709), because a wider roman fallback widens the gap
the italic still has to close. Both faces matter. `PlayfairDisplaySC-Italic` is
also preloaded on the two pages whose headlines use `.gold`.

Result: **CLS 0.0000** on all five pages, measured over three runs on a
throttled connection (150ms latency, 1.5Mbps) so the fonts land well after
first paint.

Recomputing the numbers, should the fonts ever change:

```
size-adjust      = realAvgWidth / fallbackAvgWidth
ascent-override  = realAscent  / unitsPerEm / sizeAdjust
descent-override = realDescent / unitsPerEm / sizeAdjust
```

measured with canvas `TextMetrics` (`width`, `fontBoundingBoxAscent`,
`fontBoundingBoxDescent`) on both fonts at the same pixel size.

## Domain handoff (when the client's DNS moves)

The client owns **drawclever.com** (renews 2026-09-05); it currently points at
their old host, so all absolute URLs here use the vercel.app domain. To go live
on the real domain:

1. Add the domain to the Vercel project (`vercel domains add drawclever.com`),
   then point the client's DNS at Vercel as Vercel instructs.
2. Flip every absolute URL (canonical, OG, JSON-LD, sitemap, robots, security.txt):

   ```bash
   grep -rl 'drawclever\.vercel\.app' index.html projects.html about-us.html \
     services.html contact.html public | xargs sed -i '' \
     's|https://drawclever.vercel.app|https://drawclever.com|g'
   ```

3. Swap the Web3Forms access key in `src/contact-form.js` for one on the client's
   own account, so enquiries stop routing to the development inbox — then set
   **Allowed Domains** on that new account to `drawclever.com`.

4. **Check `Strict-Transport-Security` before the DNS cutover.** `vercel.json`
   sends `max-age=63072000; includeSubDomains`, which forces HTTPS on *every*
   subdomain of `drawclever.com` for two years, and browsers cache that. The
   client has held the domain since 2018 and their old host is still on
   `185.151.30.142`, so confirm nothing (webmail, a legacy subdomain, an MX-
   adjacent host) is still served over plain HTTP. If anything is, drop
   `includeSubDomains` until it is fixed — it cannot be taken back early. The
   header deliberately omits `preload`; do not add it without the client's
   agreement, since removal from the preload list takes months.

5. Point `public/.well-known/security.txt` at the new domain and confirm the
   `Contact:` mailbox actually receives mail. It currently advertises
   `hello@drawclever.com`, which is not yet a real inbox — a security report
   sent there would bounce. Refresh `Expires:` while you are in the file.

## Brand palette (from the logo)

| Token | Hex | |
|---|---|---|
| Champagne | `#EAD9B0` | lightest gold |
| Light gold | `#D9BD82` | |
| Core gold | `#C8A96A` | the signature |
| Amber | `#B5853F` | |
| Bronze | `#9C6B2E` | deepest ("the VER in CLEVER") |
| Ink | `#0A0908` | canvas |
| Warm white | `#F3EEE6` | text |

The signature gradient is `--grad-gold` in `index.html`.

## Run it

```bash
npm install
npm run dev         # http://localhost:5174
npm run build       # → dist/  (runs verify:csp first)
npm run preview     # serve the production build
npm run verify:csp  # check the CSP still matches the inline scripts
```

Built with **Vite**. `base: './'` emits relative asset URLs, so the build runs from
a domain root, any subpath, or straight off disk — no config change. Extensionless
page URLs work in dev and preview via the small `cleanUrls` plugin in `vite.config.js`.

## Structure

```
index.html  projects.html  about-us.html  services.html  contact.html  404.html
src/
  site.css                 # shared design system (chrome, primitives, lightbox)
  site.js                  # shared behaviour (nav, reveals, drawer, parallax, FAQ)
  lightbox.js              # project gallery lightbox + manifest
  contact-form.js          # contact enquiry submission (contact.html only)
  projects-filter.js       # portfolio category filter (projects.html only)
scripts/
  verify-csp.mjs           # CSP ↔ inline-script hash check, runs as prebuild
public/
  .well-known/security.txt # security contact
  Renders/<Project>/…       # project photography (+ depth_map_output.png)
  Logo Variants/…           # brand marks
  Fonts/…                   # self-hosted Inter + Playfair Display / Playfair Display SC
vercel.json                # Vite preset, cleanUrls, security headers + CSP, cache policy
```

### Add a project

1. Drop images in `public/Renders/<Project Name>/`.
2. Add an entry to `PROJECTS` in `src/lightbox.js` (key = the card's `data-project`).
3. Add a card (with `data-project` + `data-cat`) to the grid in `projects.html`
   and/or the Selected Works grid in `index.html`.

## AI search & agent-readable files

Two files at the site root give AI assistants and answer engines (ChatGPT,
Perplexity, Claude, Gemini) a direct, self-contained summary of the studio
instead of asking them to parse rendered HTML, inline styles and lightbox
markup:

- **`public/llms.txt`** → served at `/llms.txt`. Short summary, page
  links and a compact facts list, following the [llms.txt](https://llmstxt.org)
  convention.
- **`public/llms-full.txt`** → served at `/llms-full.txt`. The text
  content of all six pages in one plain-text document: hero copy, the five
  disciplines/services, the philosophy tenets, studio stats, the full project
  table with location and category, and the contact FAQ.

Both are plain mirrors of what the live pages already say. Nothing in them
goes beyond a published page, and neither invents a fact the site doesn't
already state (no phone number, no named contact, no address beyond city and
country, no awards, no client names, no project budgets or completion dates
per the client's standing instruction on all other site copy).

**Why these exist and what they don't do.** Google's own guidance is that AI
Overviews need no special files at all, they're driven by normal Search
ranking. `llms.txt` and `llms-full.txt` are for the other engines
(ChatGPT, Perplexity, Claude), which do read plain-text context files when
present and reward self-contained, extractable passages. This is a
reasonable, low-cost bet, not a guaranteed ranking lever; treat it the same
way as the JSON-LD in `index.html`, additive and unproven rather than load-bearing.

**Keeping them in sync.** These two files are hand-maintained, not generated.
When page copy changes, such as a new project added to the portfolio or a
service line getting reworded, update `llms-full.txt` to match, and update
`llms.txt` too if the change affects its summary or fact list. A stale
machine-readable file that contradicts the live page is worse than no file.

**Domain handoff.** Both files live in `public/`, so the existing `grep -rl
... public | xargs sed -i ''` command in "Domain handoff" above already
rewrites their `drawclever.vercel.app` references when the client's domain
goes live. No separate step needed.

**Considered and not done.** An `/okf/` (Open Knowledge Format) bundle was
considered and skipped for now: Google's own OKF guidance treats sites under
about ten pages as not worth the overhead, and this site has six. The
`llms.txt`/`llms-full.txt` pair covers the same ground at a fraction of the
maintenance cost. Revisit if the site grows past roughly ten pages or once
an AI engine confirms it actually reads OKF bundles, neither is true today.
A `/pricing.md` file (a pattern some AI-SEO guidance recommends for agents
comparing vendors) was also skipped: this is a bespoke architecture studio
with quoted, per-project pricing, not published rate cards, so there is no
structured pricing to publish without inventing figures the client never gave.

---

© 2026 Draw Clever — *We redefine the luxury life.*
