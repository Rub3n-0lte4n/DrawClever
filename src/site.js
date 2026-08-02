/**
 * Draw Clever Architecture — shared site behaviour
 * Loaded on every page: nav solidify + scroll progress, scroll reveals,
 * full-bleed parallax, smooth in-page anchors, mobile drawer, FAQ accordion.
 */

// LOADER reveal — release the first-paint loader once fonts + the hero/banner
// image are ready, then hand off to the header on-load animation (dc-ready).
(function () {
  const h = document.documentElement;
  if (!h.classList.contains('dc-loading')) return; // fonts cached → already dc-ready
  const MIN = 450, MAX = 4500, start = performance.now();
  let done = false;
  function reveal() {
    if (done) return; done = true;
    const wait = Math.max(0, MIN - (performance.now() - start));
    setTimeout(() => { h.classList.remove('dc-loading'); h.classList.add('dc-ready'); }, wait);
  }
  function criticalImage() {
    const el = document.querySelector('.hero-bg, .banner-bg');
    let url = '';
    if (el) { const m = (getComputedStyle(el).backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/); if (m) url = m[1]; }
    if (!url) return Promise.resolve();
    return new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = url; });
  }
  const fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.all([fonts, criticalImage()]).then(reveal);
  setTimeout(reveal, MAX); // failsafe — never hang
})();

// Modern scroll engine? CSS scroll-driven animations take over the full-bleed
// cinematography (and the lede scrub) where supported; JS parallax is the fallback.
const SCROLL_DRIVEN = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline: view()');

// NAV solidify + scroll progress (scaleX, so the bar never triggers layout)
const nav = document.getElementById('nav');
const progress = document.getElementById('progress');

// Reading scrollHeight forces a synchronous layout. Doing it inside the scroll
// handler cost ~1.5ms on every event — around a tenth of a 16.7ms frame, paid
// continuously while scrolling — so the scrollable distance is cached and
// remeasured only when the document can actually have changed size (the
// accordion, the portfolio filter and the drawer all resize it).
let scrollRange = 0;
const measure = () => { scrollRange = document.documentElement.scrollHeight - window.innerHeight; };
measure();
window.addEventListener('resize', measure, { passive: true });
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(document.documentElement);

let wasScrolled = null;
function onScroll() {
  const y = window.scrollY;
  const scrolled = y > 40;
  // Only touch the class list on an actual change; toggling it every event
  // invalidates style for the whole nav subtree for nothing.
  if (nav && scrolled !== wasScrolled) { nav.classList.toggle('scrolled', scrolled); wasScrolled = scrolled; }
  if (progress) progress.style.transform = 'scaleX(' + (scrollRange > 0 ? y / scrollRange : 0) + ')';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// REVEAL on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// BLUR-UP — fade each card / full-bleed image in once it has decoded
// (the tiny --lqip placeholder shows immediately; this swaps to the real image).
document.querySelectorAll('.pc img, .fullbleed .fb-img').forEach((img) => {
  const reveal = () => img.classList.add('loaded');
  if (img.complete && img.naturalWidth > 0) reveal();
  else {
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  }
});

// FULL-BLEED parallax (fallback only: scroll-driven CSS owns these where supported)
const parallaxEls = SCROLL_DRIVEN ? [] : [...document.querySelectorAll('[data-parallax]')];
if (parallaxEls.length) {
  let ticking = false;
  const run = () => {
    parallaxEls.forEach((img) => {
      const host = img.closest('.fullbleed') || img.parentElement;
      const r = host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
      img.style.transform = `translateY(${(p - 0.5) * 12}%)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(run); ticking = true; } }, { passive: true });
  run();
}

// SMOOTH in-page anchors (cross-page links navigate normally). The `behavior`
// option overrides the stylesheet's scroll-behavior, so reduced motion has to
// be honoured here too — the CSS opt-in alone would not stop these. Read at
// click time so changing the OS setting takes effect without a reload.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const behavior = reduceMotion.matches ? 'auto' : 'smooth';
    if (id === '#' || id === '#top') { e.preventDefault(); window.scrollTo({ top: 0, behavior }); return; }
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior });
    // preventDefault() also cancels the fragment navigation, and the fragment
    // navigation is what moves focus to the target. Without this the skip link
    // scrolled the page and left focus where it was, so the next Tab went
    // straight back into the nav it had just skipped: a skip link that skips
    // nothing (WCAG 2.4.1). preventScroll because scrollIntoView already
    // decided how to travel, and reduced motion may have asked it not to.
    if (t.tabIndex >= 0 || t.hasAttribute('tabindex')) t.focus({ preventScroll: true });
  });
});

// MOBILE DRAWER — a modal overlay (role="dialog" aria-modal="true" in the markup)
(function () {
  const t = document.querySelector('.nav-toggle');
  const d = document.getElementById('drawer');
  if (!t || !d) return;
  const isOpen = () => document.body.classList.contains('menu-open');
  // The drawer paints edge to edge at z-index 150 over an opaque backdrop, with
  // the toggle above it at 200. Every other tab stop on the page is therefore
  // BEHIND the sheet, and WCAG 2.2's 2.4.11 says a focused control may not be
  // entirely hidden by author content — so while the drawer is open, focus stays
  // in it. The toggle is part of the loop because it is the visible close.
  const loop = () => [t, ...d.querySelectorAll('a[href]')];
  const set = (open) => {
    const was = isOpen();
    document.body.classList.toggle('menu-open', open);
    t.setAttribute('aria-expanded', open);
    t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    d.setAttribute('aria-hidden', !open);
    if (open && !was) {
      // The drawer is `visibility: hidden` when closed, and a hidden element
      // cannot take focus — wait for the style to land before reaching for it.
      requestAnimationFrame(() => { const a = isOpen() && d.querySelector('a[href]'); if (a) a.focus(); });
    } else if (!open && was && d.contains(document.activeElement)) {
      t.focus();   // never drop focus to the body on close
    }
  };
  t.addEventListener('click', () => set(!isOpen()));
  d.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return set(false);
    if (e.key !== 'Tab' || !isOpen()) return;
    const f = loop(), first = f[0], last = f[f.length - 1];
    if (!f.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) set(false); });
})();

// FAQ ACCORDION (single-open)
(function () {
  const qs = [...document.querySelectorAll('.acc-q')];
  if (!qs.length) return;
  // A closed panel is a 0fr grid row under `overflow: hidden`. That hides it on
  // screen but leaves every answer in the accessibility tree, so a screen reader
  // read all four whatever aria-expanded claimed. Syncing aria-hidden next to
  // the class is what actually closes them.
  const sync = () => qs.forEach((btn) => {
    const open = btn.closest('.acc-item').classList.contains('open');
    btn.setAttribute('aria-expanded', String(open));
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (panel) panel.setAttribute('aria-hidden', String(!open));
  });
  qs.forEach((btn) => btn.addEventListener('click', () => {
    const item = btn.closest('.acc-item');
    const open = item.classList.contains('open');
    document.querySelectorAll('.acc-item.open').forEach((el) => el.classList.remove('open'));
    if (!open) item.classList.add('open');
    sync();
  }));
  sync();
})();

// MANIFESTO WORD-SCRUB — wrap the lede's words so each brightens on its own
// view() timeline as it scrolls through the fold. Only where scroll-driven
// animations exist; elsewhere (and under reduced motion) the text is untouched.
(function () {
  if (!SCROLL_DRIVEN) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lede = document.querySelector('.manifesto-lede p');
  if (!lede) return;
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          const s = document.createElement('span');
          s.className = 'lede-w';
          s.textContent = tok;
          frag.appendChild(s);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === Node.ELEMENT_NODE) wrap(n); // descend into .gold accents
    });
  };
  wrap(lede);
})();

// COUNT-UP — roll .stat .n figures up when a stat row first enters view.
// Only genuine quantities roll. A year has no meaningful intermediate values
// (2014 counts up through "147"), and a figure under 10 spends most of the
// roll reading 0 or 1, so both read as broken data rather than as motion.
// A row animates only when every figure in it qualifies — one rolling number
// beside three static ones looks like a bug, not a decision. Figures that
// don't qualify are never written to, so they simply render as authored.
(function () {
  const rows = document.querySelectorAll('.stats');
  if (!rows.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // Split "50+" / "5★" / "2,000" / "2014" into prefix, figure and suffix, and
  // decide whether the figure is something a viewer can watch accumulate.
  const read = (el) => {
    const m = el.textContent.trim().match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!m) return null;                                // non-numeric (e.g. "—")
    const pre = m[1], raw = m[2], post = m[3];
    const target = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(target)) return null;
    const isYear = !pre && !post && /^\d{4}$/.test(raw) && target >= 1900 && target <= 2100;
    const grouped = raw.includes(',');
    const decimals = (raw.split('.')[1] || '').length;
    const fmt = (v) => {
      const n = v.toFixed(decimals);
      const s = grouped ? Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n;
      return pre + s + post;
    };
    return { el, target, fmt, countable: !isYear && target >= 10 };
  };

  rows.forEach((row) => {
    const figures = [...row.querySelectorAll('.n')].map(read).filter(Boolean);
    if (!figures.length || !figures.every((f) => f.countable)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        const dur = 1300, t0 = performance.now();
        const paint = (v) => figures.forEach((f) => { f.el.textContent = f.fmt(f.target * v); });
        paint(0);
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          paint(easeOut(p));
          if (p < 1) requestAnimationFrame(tick); else paint(1);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    obs.observe(row);
  });
})();

// HEADLINE LINE-REVEAL — wrap display headings into masked lines that rise on
// scroll, carrying the hero's per-line entrance to every section headline.
// Targets only display headlines (those with a <br> or a .gold accent); skips
// the hero (its own animation) and banner heads (animated on load via dc-head).
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heads = [...document.querySelectorAll('h1, h2')].filter((h) =>
    !h.closest('.hero-title, .dc-head') && (h.querySelector('br') || h.querySelector('.gold'))
  );
  if (!heads.length) return;
  heads.forEach((h) => {
    if (h.dataset.rl) return;
    h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i)
      .map((ln, i) => `<span class="ln"><span class="ln-i" style="--i:${i}">${ln.trim()}</span></span>`)
      .join('');
    h.dataset.rl = '1';
    h.classList.add('rl');
  });
  if (reduce) { heads.forEach((h) => h.classList.add('shown')); return; }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('shown'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  heads.forEach((h) => obs.observe(h));
})();
