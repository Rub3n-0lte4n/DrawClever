/**
 * i18n string extraction.
 *
 * Walks the six English pages and pulls every string a visitor can read:
 * text nodes, a whitelist of attributes, <title>, and the prose fields inside
 * the JSON-LD blocks. Writes src/data/i18n/en.json — a flat, sorted list that
 * is the single source for translation and the only thing a reviewer needs
 * to read.
 *
 * Deliberately NOT extracted, because translating them breaks something:
 *   - inline <script> bodies. The CSP pins a SHA-256 per script; changing a
 *     byte makes the page fail to run. See scripts/verify-csp.mjs.
 *   - <style> bodies, class names, URLs, and every JSON-LD field that is an
 *     identifier rather than prose (@id, url, name, addressLocality, ...).
 *   - project names and place names. "Casa Marbella" and "Bucharest" are
 *     proper nouns; a translated portfolio would stop matching the renders.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

export const PAGES = ['index.html', 'about-us.html', 'services.html', 'contact.html', 'projects.html', '404.html'];

/**
 * Extraction reads dist/, not the source pages, and that is deliberate.
 *
 * A source page is not what a visitor reads. The shared chrome arrives via
 * `<!-- @include nav.html -->`, and every portfolio card is generated from
 * src/data/projects.js by `<!-- @cards -->` — so the nav labels, the card
 * categories ("Architecture, Residential") and the gallery aria-labels
 * ("Open the Casa Marbella gallery") exist in no HTML file at all.
 * Extracting from source silently missed all of them.
 *
 * dist/ is the assembled truth, and it is also exactly what the locale
 * transform will substitute against, so the keys match by construction.
 * Run `npm run build` first; `npm run i18n:extract` does both.
 */
export const SRC_DIR = 'dist';

/** Attributes whose value is prose a human reads. */
export const ATTRS = ['alt', 'title', 'placeholder', 'aria-label'];

/** <meta> names/properties whose content is prose. */
export const META = [
  'description', 'og:title', 'og:description', 'og:image:alt',
  'twitter:title', 'twitter:description', 'twitter:image:alt',
];

/** JSON-LD keys that hold prose. Everything else is an identifier. */
export const LD_PROSE = new Set(['description', 'text', 'headline', 'caption']);

const BLOCK = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;

/** Strings that are markup-ish, numeric, or otherwise not worth translating. */
const skip = (s) =>
  !s ||
  s.length < 2 ||
  /^[\s\d.,:;·/&|—–-]+$/.test(s) ||          // punctuation / numerals only
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/.test(s) || // email
  /^https?:\/\//.test(s) ||
  /^[{}[\]()<>]+$/.test(s);

export function extractFromHtml(html) {
  const found = new Set();
  const add = (s) => {
    const t = String(s).replace(/\s+/g, ' ').trim();
    if (!skip(t)) found.add(t);
  };

  // <title>
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) add(decode(title[1]));

  // <meta name|property="..." content="...">
  for (const m of html.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/gi)) {
    if (META.includes(m[1])) add(decode(m[2]));
  }

  // Whitelisted attributes anywhere in the document.
  for (const attr of ATTRS) {
    const re = new RegExp(`\\s${attr}="([^"]*)"`, 'gi');
    for (const m of html.matchAll(re)) add(decode(m[1]));
  }

  // JSON-LD prose fields.
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      walkLd(JSON.parse(m[1]), add);
    } catch {
      /* a malformed block is check-static's problem, not ours */
    }
  }

  // Prose, extracted as LEAF BLOCKS rather than text nodes.
  //
  // Splitting on every tag shreds a sentence the moment it contains inline
  // markup: `We <span class="gold">redefine</span> the luxury life` came out
  // as "We" / "redefine" / "the luxury life". Fragments cannot be translated —
  // word order differs per language, so they can never be reassembled.
  //
  // A unit is therefore the innerHTML of the innermost block that contains no
  // further block, inline tags included. The translator is told to keep those
  // tags, and substitution is a whole-unit swap, so markup survives by
  // construction.
  for (const unit of leafBlocks(html.replace(BLOCK, ' ').replace(COMMENT, ' '))) {
    add(decode(unit));
  }

  return found;
}

/** Block-level tags. An element with one of these inside it is a container, not a unit. */
const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'div', 'section',
  'article', 'header', 'footer', 'nav', 'main', 'aside', 'form', 'fieldset',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'figure', 'figcaption', 'blockquote', 'dl', 'dt', 'dd',
]);
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const VOID = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'use', 'path', 'line', 'polyline', 'circle', 'rect', 'area', 'col', 'embed', 'track', 'wbr']);
/** Never a translation unit and never descended into for one. */
// <select> is NOT opaque: its <option> labels are read by the visitor and have
// to be translated. Only genuinely non-prose subtrees belong here.
const OPAQUE = new Set(['svg', 'script', 'style']);

/**
 * Yields the innerHTML of every element that (a) contains text directly and
 * (b) has no block-level child, keeping only the OUTERMOST such element.
 *
 * "Outermost" is what makes a nav come out as four keys instead of one blob:
 * `<div class="nav-links">` holds only whitespace between its anchors, so it
 * does not qualify and the walk descends to each `<a>`. A paragraph, by
 * contrast, holds text directly, so it qualifies as a whole and its inner
 * `<span class="gold">` is discarded as contained — which is what keeps a
 * sentence in one piece.
 */
export function leafBlocks(html) {
  return leafBlockRanges(html).map(([s, e]) => html.slice(s, e));
}

/** Same walk as leafBlocks, but returns [start, end) offsets so a transform can splice. */
export function leafBlockRanges(html) {
  const candidates = [];
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
  let m;
  let lastEnd = 0;
  let opaqueDepth = 0;

  const noteText = (text) => {
    if (!/\S/.test(text)) return;
    if (stack.length) stack[stack.length - 1].directText = true;
  };

  while ((m = tagRe.exec(html))) {
    const [full, closing, rawName, , selfClose] = m;
    const name = rawName.toLowerCase();
    // Text inside an opaque element belongs to that element, not to the frame
    // below it. Counting it as the parent's own text made a <div> wrapping a
    // <select> look like prose, and it swallowed the sibling <label> with it.
    if (opaqueDepth === 0) noteText(html.slice(lastEnd, m.index));
    lastEnd = m.index + full.length;

    if (OPAQUE.has(name)) {
      // Self-closing <svg/> and the like never open a region.
      if (selfClose !== '/') opaqueDepth += closing ? -1 : 1;
      continue;
    }
    if (opaqueDepth > 0) continue;
    if (VOID.has(name) || selfClose === '/') continue;

    if (!closing) {
      stack.push({ name, start: m.index + full.length, directText: false, blockChild: false, descendantText: false });
    } else {
      let frame;
      while (stack.length && (frame = stack.pop()) && frame.name !== name) { /* unbalanced: check-static's job */ }
      if (!frame || frame.name !== name) continue;

      // A display heading is ALWAYS one unit, even though it holds no text
      // directly. The hero is three line spans:
      //   <h1><span class="row"><span>We Redefine</span></span>
      //       <span class="row"><span>The <em>Luxury</em></span></span>
      //       <span class="row"><span>Life.</span></span></h1>
      // Taken line by line, "The Luxury" is untranslatable in isolation and no
      // language can move a word across the boundary — Romanian came back as
      // "Redefinim / The Luxury / Viață." Taking the whole heading lets the
      // translation rearrange inside it while keeping the .row structure.
      const forced = HEADINGS.has(name) && frame.descendantText;
      if ((frame.directText || forced) && !frame.blockChild) candidates.push([frame.start, m.index]);

      if (stack.length) {
        const parent = stack[stack.length - 1];
        if (BLOCK_TAGS.has(name)) parent.blockChild = true;
        if (frame.directText || frame.descendantText) parent.descendantText = true;
      }
    }
  }

  // Keep only the outermost candidates: drop any range contained in another.
  candidates.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const kept = [];
  let reach = -1;
  for (const [s, e] of candidates) {
    if (s >= reach) { kept.push([s, e]); reach = e; }
  }
  return kept.filter(([s, e]) => /[A-Za-zÀ-ž]/.test(html.slice(s, e).replace(/<[^>]+>/g, '')));
}

function walkLd(node, add) {
  if (Array.isArray(node)) return node.forEach((n) => walkLd(n, add));
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && LD_PROSE.has(k)) add(v);
    else if (typeof v === 'object') walkLd(v, add);
  }
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
   .replace(/&hellip;/g, '…').replace(/&middot;/g, '·');

function main() {
  const all = new Set();
  for (const page of PAGES) {
    const path = resolve(ROOT, SRC_DIR, page);
    if (!existsSync(path)) {
      console.error(`i18n-extract: ${SRC_DIR}/${page} missing. Run \`npm run build\` first.`);
      process.exit(1);
    }
    for (const s of extractFromHtml(readFileSync(path, 'utf8'))) all.add(s);
  }
  const sorted = [...all].sort((a, b) => a.localeCompare(b));
  const out = resolve(ROOT, 'src/data/i18n');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'en.json'), JSON.stringify(sorted, null, 2) + '\n');
  const words = sorted.reduce((n, s) => n + s.split(/\s+/).length, 0);
  console.log(`i18n-extract: ${sorted.length} strings, ${words} words -> src/data/i18n/en.json`);
}

// Compare resolved paths, not URL strings: this repo lives under a directory
// with a space in it, so import.meta.url is percent-encoded and a raw
// `file://${argv[1]}` comparison silently never matches.
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) main();
