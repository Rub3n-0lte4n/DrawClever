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
function onScroll() {
  const y = window.scrollY;
  if (nav) nav.classList.toggle('scrolled', y > 40);
  if (progress) {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
  }
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
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior }); }
  });
});

// MOBILE DRAWER
(function () {
  const t = document.querySelector('.nav-toggle');
  const d = document.getElementById('drawer');
  if (!t || !d) return;
  const set = (open) => {
    document.body.classList.toggle('menu-open', open);
    t.setAttribute('aria-expanded', open);
    t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    d.setAttribute('aria-hidden', !open);
  };
  t.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
  d.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) set(false); });
})();

// FAQ ACCORDION (single-open)
document.querySelectorAll('.acc-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.acc-item');
    const open = item.classList.contains('open');
    document.querySelectorAll('.acc-item.open').forEach((el) => el.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

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
