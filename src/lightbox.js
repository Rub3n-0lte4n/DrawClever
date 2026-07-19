/**
 * Draw Clever Architecture — Project Lightbox
 *
 * Click any project card (or its arrow) → fullscreen gallery for that project.
 * Keyboard nav (←/→/Esc), focus trap, swipe on touch, neighbour preloading,
 * click-outside to close. Markup is injected once on first open.
 *
 * Images: the stage loads `<name>-1600.avif` next to each listed JPG (browsers
 * without AVIF, or a missing derivative, fall back to the original JPG).
 *
 * Adding a project: drop the folder under public/Renders/<Name>/ (no spaces in
 * names), generate a 1600px AVIF per image (sips → avifenc, see git history),
 * and add an entry below. The key must match the card's `data-project`.
 */

/* ────────────── PROJECT MANIFEST ────────────── */
const PROJECTS = {
  'casa-marbella': {
    title: 'Casa Marbella', location: 'Marbella, Spain', cat: 'Architecture · Residential',
    folder: 'Renders/Casa-Marbella',
    images: ['04-scaled.jpg', '01-scaled.jpg', '02-1-scaled.jpg', '05-scaled.jpg', '07-scaled.jpg', '09-scaled.jpg'],
  },
  'penthouse-oradea': {
    title: 'Penthouse Oradea', location: 'Oradea, Romania', cat: 'Interior Design',
    folder: 'Renders/Penthouse-Oradea',
    images: ['21.jpg', '20-2.jpg', '15-1.jpg', '10-2.jpg', '27.jpg', '28.jpg', '29.jpg', '30-1.jpg',
             '31-1.jpg', '33.jpg', '35-1.jpg', '36-2.jpg', '37.jpg', '38.jpg', '45.jpg', '46.jpg',
             '51.jpg', '57.jpg', '58.jpg', '60.jpg', '64.jpg', '65.jpg', '66.jpg', '68.jpg'],
  },
  'florida-house': {
    title: 'Florida House', location: 'Florida, USA', cat: 'Architecture',
    folder: 'Renders/Florida-House',
    images: ['01.jpg', '02.jpg', '03.jpg', '04.jpg', '05-scaled.jpg', '06.jpg', '07.jpg'],
  },
  'casa-corbeanca': {
    title: 'Villa Corbeanca', location: 'Corbeanca, Romania', cat: 'Architecture · Residential',
    folder: 'Renders/Casa-Corebeanca',
    images: ['103.jpg', '110.jpg', '112.jpg', '113-1.jpg', '120.jpg', '123.jpg', '128.jpg', '131.jpg', '133.jpg', '135.jpg'],
  },
  'event-hall-baia-mare': {
    title: 'Grand Event Hall', location: 'Baia Mare, Romania', cat: 'Interior Design · Commercial',
    folder: 'Renders/Event-Hall-Baia-Mare',
    images: ['01_1-Photo-scaled.jpg', '01_20-Foto-scaled.jpg', '02_19-Foto-scaled.jpg',
             '02_2-Photo-scaled.jpg', '03_11-Foto-scaled.jpg', '04_4-Photo-scaled.jpg'],
  },
  'boutique-mosilor': {
    title: 'Boutique Moșilor', location: 'Bucharest, Romania', cat: 'Architecture · Residential',
    folder: 'Renders/Boutique-Mosilor',
    images: ['01-scaled.jpg', '02-scaled.jpg', '03-scaled.jpg', '04-scaled.jpg', '05-scaled.jpg',
             '06-scaled.jpg', '60_1-Photo-scaled.jpg', '60_4-Photo-scaled.jpg'],
  },
  'apartment-in-oradea': {
    title: 'Apartment in Oradea', location: 'Oradea, Romania', cat: 'Interior Design',
    folder: 'Renders/Apartment-in-Oradea',
    images: ['01-6-scaled.jpg', '01-7-scaled.jpg', '01-8-scaled.jpg', '02-10-scaled.jpg', '02-8-scaled.jpg',
             '02-9-scaled.jpg', '03-6-scaled.jpg', '03-7-scaled.jpg', '03-8-scaled.jpg', '04-4-scaled.jpg',
             '04-5-scaled.jpg', '05-5-scaled.jpg', '06-4-scaled.jpg', '06-5-scaled.jpg', '06-6-scaled.jpg'],
  },
  'uav-library': {
    title: 'University Library', location: 'Arad, Romania', cat: 'Architecture · Cultural',
    folder: 'Renders/UAV-Library',
    images: ['71.jpg', '70-1.jpg', '74.jpg', '75.jpg', '76.jpg', '77.jpg', '80.jpg', '81.jpg'],
  },
};

/* ────────────── MARKUP (injected once) ────────────── */
function buildLightbox() {
  if (document.getElementById('lb')) return document.getElementById('lb');
  const lb = document.createElement('div');
  lb.id = 'lb'; lb.className = 'lb'; lb.setAttribute('hidden', '');
  lb.setAttribute('aria-modal', 'true'); lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Project gallery');
  lb.innerHTML = `
    <button class="lb-close" type="button" aria-label="Close gallery">
      <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
    </button>
    <button class="lb-prev" type="button" aria-label="Previous photo">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 6 9 12 15 18"/></svg>
    </button>
    <button class="lb-next" type="button" aria-label="Next photo">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
    </button>
    <figure class="lb-stage"><img class="lb-img" alt="" decoding="async" /></figure>
    <div class="lb-caption">
      <div class="lb-meta"><span class="lb-cat"></span><span class="lb-title"></span><span class="lb-loc"></span></div>
      <span class="lb-counter"></span>
    </div>`;
  document.body.appendChild(lb);

  // Swipe navigation (touch/pen): a horizontal drag ≥ 45px steps the gallery.
  const stage = lb.querySelector('.lb-stage');
  let sx = null, sy = null;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? +1 : -1);
  });
  stage.addEventListener('pointercancel', () => { sx = sy = null; });
  return lb;
}

/* ────────────── IMAGE SOURCES ────────────── */
// One-time AVIF support probe (1×1 test image). Resolves long before the
// first gallery can open; until/unless it passes we serve the original JPG.
let avifOK = false;
(function () {
  const im = new Image();
  im.onload = () => { avifOK = im.naturalWidth > 0; };
  im.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
})();

// Preferred URL for image i of a project; `jpgOnly` forces the fallback.
function srcFor(project, i, jpgOnly) {
  const jpg = `./${project.folder}/${project.images[i]}`;
  if (jpgOnly || !avifOK) return jpg;
  return jpg.replace(/\.jpg$/, '-1600.avif');
}

/* ────────────── BEHAVIOUR ────────────── */
let state = null;          // { slug, project, idx }
let lastFocused = null;

/* Shared-element open — the clicked card's image travels to the stage.
   A fixed clone morphs rect-to-rect using paired keyframes (wrapper scale ×
   image counter-scale, sampled along an ease-out curve) so pixels are never
   stretched, then hands off to the real stage image once it has faded in.
   Skipped under reduced motion, without Web Animations, or with no usable rect
   (those cases keep the plain crossfade open). */
function flipOpen(card) {
  if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('animate' in Element.prototype)) return;
  const src = card.querySelector('img');
  if (!src || !src.currentSrc || !src.naturalWidth) return;
  const a = src.getBoundingClientRect();
  if (a.width < 8 || a.height < 8 || a.bottom < 0 || a.top > innerHeight) return;

  document.querySelectorAll('.lb-flip').forEach((el) => el.remove());

  // Destination: the stage box (92vw × 82vh) at the photo's natural aspect.
  const nar = src.naturalWidth / src.naturalHeight;
  const maxW = innerWidth * .92, maxH = innerHeight * .82;
  const dW = Math.min(maxW, maxH * nar), dH = Math.min(maxH, maxW / nar);
  const dx = (innerWidth - dW) / 2, dy = (innerHeight - dH) / 2;

  const wrap = document.createElement('div');
  wrap.className = 'lb-flip';
  wrap.style.cssText = `position:fixed;left:0;top:0;width:${a.width}px;height:${a.height}px;overflow:hidden;z-index:1001;pointer-events:none;transform-origin:0 0;will-change:transform;`;
  const im = document.createElement('img');
  im.src = src.currentSrc; im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;transform-origin:50% 50%;will-change:transform;';
  wrap.appendChild(im);
  document.body.appendChild(wrap);

  const N = 26, DUR = 560, ease = (t) => 1 - Math.pow(1 - t, 5);
  const wk = [], ik = [];
  for (let i = 0; i <= N; i++) {
    const p = ease(i / N);
    const W = a.width + (dW - a.width) * p, H = a.height + (dH - a.height) * p;
    const x = a.left + (dx - a.left) * p,   y = a.top + (dy - a.top) * p;
    const sx = W / a.width, sy = H / a.height, g = Math.max(sx, sy);
    wk.push({ transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})` });
    ik.push({ transform: `scale(${g / sx}, ${g / sy})` });
  }
  const anim = wrap.animate(wk, { duration: DUR, easing: 'linear', fill: 'forwards' });
  im.animate(ik, { duration: DUR, easing: 'linear', fill: 'forwards' });

  // Hand off once the morph is done and the real image is in (capped so the
  // clone can never get stuck over the gallery).
  const t0 = performance.now();
  const handoff = () => {
    const real = document.querySelector('.lb-img');
    if ((real && real.classList.contains('is-in')) || performance.now() - t0 > 4000) {
      wrap.style.transition = 'opacity .24s ease';
      wrap.style.opacity = '0';
      setTimeout(() => wrap.remove(), 300);
    } else requestAnimationFrame(handoff);
  };
  anim.finished.then(() => requestAnimationFrame(handoff)).catch(() => wrap.remove());
}

function show(slug, card) {
  const project = PROJECTS[slug];
  if (!project) { console.warn('[DrawClever] no project for slug:', slug); return; }
  lastFocused = document.activeElement;
  const lb = buildLightbox();
  state = { slug, project, idx: 0 };
  render();
  flipOpen(card);
  lb.removeAttribute('hidden');
  requestAnimationFrame(() => lb.classList.add('lb-open'));
  document.documentElement.classList.add('lb-locked');
  lb.querySelector('.lb-close').focus();
}

function close() {
  const lb = document.getElementById('lb');
  if (!lb) return;
  lb.classList.remove('lb-open');
  document.documentElement.classList.remove('lb-locked');
  state = null;
  setTimeout(() => lb.setAttribute('hidden', ''), 320);
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

function step(delta) {
  if (!state) return;
  const n = state.project.images.length;
  state.idx = (state.idx + delta + n) % n;
  render();
  preloadNeighbours();
}

function render() {
  if (!state) return;
  const { project, idx } = state;
  const img = document.querySelector('.lb-img');
  const stage = document.querySelector('.lb-stage');
  img.classList.remove('is-in');
  stage.classList.add('lb-loading');
  img.onload = () => { stage.classList.remove('lb-loading'); requestAnimationFrame(() => img.classList.add('is-in')); };
  img.onerror = () => {
    // Missing/failed AVIF derivative → retry once with the original JPG.
    const jpg = srcFor(project, idx, true);
    if (img.getAttribute('src') !== jpg) { img.setAttribute('src', jpg); return; }
    stage.classList.remove('lb-loading');
  };
  img.setAttribute('src', srcFor(project, idx));
  img.setAttribute('alt', `${project.title} — photo ${idx + 1}`);
  document.querySelector('.lb-cat').textContent = project.cat;
  document.querySelector('.lb-title').textContent = project.title;
  document.querySelector('.lb-loc').textContent = project.location;
  document.querySelector('.lb-counter').textContent =
    `${String(idx + 1).padStart(2, '0')} / ${String(project.images.length).padStart(2, '0')}`;
}

function preloadNeighbours() {
  if (!state) return;
  const { project, idx } = state;
  const n = project.images.length;
  [(idx + 1) % n, (idx - 1 + n) % n].forEach((i) => {
    const im = new Image(); im.src = srcFor(project, i);
  });
}

/* ────────────── EVENTS ────────────── */
function onClickDocument(e) {
  const card = e.target.closest('[data-project]');
  const lbOpen = document.getElementById('lb') && !document.getElementById('lb').hasAttribute('hidden');
  if (card && !lbOpen) { e.preventDefault(); show(card.dataset.project, card); return; }

  const lb = document.getElementById('lb');
  if (!lb || lb.hasAttribute('hidden')) return;
  if (e.target.closest('.lb-close')) return close();
  if (e.target.closest('.lb-prev'))  return step(-1);
  if (e.target.closest('.lb-next'))  return step(+1);
  if (!e.target.closest('.lb-stage') && !e.target.closest('.lb-caption') &&
      !e.target.closest('.lb-prev')  && !e.target.closest('.lb-next')) close();
}

function onKey(e) {
  if (!state) return;
  if (e.key === 'Escape')     return close();
  if (e.key === 'ArrowLeft')  return step(-1);
  if (e.key === 'ArrowRight') return step(+1);
  if (e.key === 'Tab') {
    // Focus trap — keep Tab/Shift+Tab cycling through the dialog's controls.
    const lb = document.getElementById('lb');
    const btns = lb.querySelectorAll('button');
    const first = btns[0], last = btns[btns.length - 1];
    if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// Keyboard access: let Enter/Space open a focused card.
function onCardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('[data-project]');
  if (card) { e.preventDefault(); show(card.dataset.project, card); }
}

function init() {
  document.addEventListener('click', onClickDocument);
  document.addEventListener('keydown', onKey);
  document.querySelectorAll('[data-project]').forEach((c) => {
    c.setAttribute('tabindex', '0');
    c.setAttribute('role', 'button');
    c.addEventListener('keydown', onCardKey);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
