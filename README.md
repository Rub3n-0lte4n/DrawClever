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
  veil. (A WebGL depth-parallax module remains in `src/hero.js` but is currently
  unused; the `three` dependency can be dropped if it stays that way.)
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
npm run dev      # http://localhost:5174
npm run build    # → dist/
npm run preview  # serve the production build
```

Built with **Vite**. `base: './'` emits relative asset URLs, so the build runs from
a domain root, a GitHub Pages project subpath, or straight off disk — no config change.

## Structure

```
index.html  projects.html  about-us.html  services.html  contact.html  404.html
src/
  site.css                 # shared design system (chrome, primitives, lightbox)
  site.js                  # shared behaviour (nav, reveals, drawer, parallax, FAQ)
  hero.js                  # WebGL depth-parallax hero (currently unused)
  lightbox.js              # project gallery lightbox + manifest
public/
  Renders/<Project>/…       # project photography (+ depth_map_output.png)
  Logo Variants/…           # brand marks
  Fonts/…                   # self-hosted Inter + Playfair Display / Playfair Display SC
vercel.json                # Vite framework preset for Vercel
```

### Add a project

1. Drop images in `public/Renders/<Project Name>/`.
2. Add an entry to `PROJECTS` in `src/lightbox.js` (key = the card's `data-project`).
3. Add a card (with `data-project` + `data-cat`) to the grid in `projects.html`
   and/or the Selected Works grid in `index.html`.

---

© 2026 Draw Clever — *We redefine the luxury life.*
