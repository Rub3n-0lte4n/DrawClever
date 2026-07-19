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

// NAV solidify + scroll progress
const nav = document.getElementById('nav');
const progress = document.getElementById('progress');
function onScroll() {
  const y = window.scrollY;
  if (nav) nav.classList.toggle('scrolled', y > 40);
  if (progress) {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
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

// FULL-BLEED parallax
const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
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

// SMOOTH in-page anchors (cross-page links navigate normally)
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id === '#' || id === '#top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const t = document.querySelector(id);
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
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

// COUNT-UP — roll .stat .n numbers up when they first enter view.
// Keeps any prefix/suffix (50+, 5★, 2,000) and figure formatting; fires once.
(function () {
  const nums = document.querySelectorAll('.stat .n');
  if (!nums.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      const el = e.target;
      const m = el.textContent.trim().match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (!m) return;                                   // non-numeric (e.g. "—") → leave as-is
      const pre = m[1], raw = m[2], post = m[3];
      const grouped = raw.includes(',');
      const target = parseFloat(raw.replace(/,/g, ''));
      if (!isFinite(target)) return;
      const decimals = (raw.split('.')[1] || '').length;
      const fmt = (v) => {
        const n = v.toFixed(decimals);
        const s = grouped ? Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n;
        return pre + s + post;
      };
      if (reduce) { el.textContent = fmt(target); return; }
      const dur = 1300, t0 = performance.now();
      el.textContent = fmt(0);
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(target * easeOut(p));
        if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(target);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => obs.observe(n));
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
