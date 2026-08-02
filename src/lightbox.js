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
  // A dialog's description is read once, on entry, and can be muted by the user
  // — the right place for keys nothing on screen can advertise.
  lb.setAttribute('aria-describedby', 'lb-keys');
  // The stage comes before the controls so the controls paint above it: a zoomed
  // image is bigger than its frame, and in the old order it buried the arrows.
  // prev / counter / next share a .lb-rail wrapper. On a desktop the rail is
  // `display: contents`, so it generates no box and those three keep resolving
  // their absolute positions against .lb exactly as before; on a phone the rail
  // becomes the flex row that puts them on one line under the caption.
  // The counter is aria-hidden because "01 / 06" reads as "zero one slash zero
  // six"; .lb-live carries the same position as a sentence, and is the only
  // thing that speaks when stepping (nothing moves focus, and swapping an
  // <img>'s src and alt announces nothing at all).
  lb.innerHTML = `
    <figure class="lb-stage"><img class="lb-img" alt="" decoding="async" /></figure>
    <button class="lb-close" type="button" aria-label="Close gallery">
      <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
    </button>
    <div class="lb-caption">
      <div class="lb-meta"><span class="lb-cat"></span><span class="lb-title"></span><span class="lb-loc"></span></div>
    </div>
    <div class="lb-rail">
      <button class="lb-prev" type="button" aria-label="Previous photo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 6 9 12 15 18"/></svg>
      </button>
      <span class="lb-counter" aria-hidden="true"></span>
      <button class="lb-next" type="button" aria-label="Next photo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
      </button>
    </div>
    <span class="lb-zoom-hint" aria-hidden="true">Pinch or double-tap to zoom</span>
    <p class="lb-live" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0"></p>
    <p id="lb-keys" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0">Left and right arrows move through the gallery. Press plus or minus to zoom the photo, and zero to reset it. While zoomed, the arrows pan instead of stepping.</p>`;
  document.body.appendChild(lb);
  bindGestures(lb.querySelector('.lb-stage'));
  return lb;
}

/* ────────────── ZOOM + SWIPE (touch) ──────────────
 * A landscape render on a portrait phone is width-bound: it can never be more
 * than about a fifth of the screen, so looking closer has to be possible.
 * Double-tap zooms toward the tapped point, pinch scales continuously, and a
 * one-finger drag pans while zoomed. Swipe-to-step is suppressed the moment the
 * image is zoomed, or the two gestures would fight over the same drag.
 */
const MAX_SCALE = 2.6;
let zoom = { s: 1, x: 0, y: 0 };
const pointers = new Map();
let pinch = null;          // { d, s } starting distance + scale
let pan = null;            // { x, y, ox, oy }
let lastTap = 0;

function applyZoom(stage) {
  const img = stage.querySelector('.lb-img');
  const on = zoom.s > 1.01;
  if (on) {
    // Clamp the pan so the image can never be dragged off its own frame. Measure
    // with offsetWidth, not getBoundingClientRect: the rect already has the
    // current transform baked in, so it would be stale against the new scale.
    const maxX = Math.max(0, img.offsetWidth * (zoom.s - 1) / 2);
    const maxY = Math.max(0, img.offsetHeight * (zoom.s - 1) / 2);
    zoom.x = Math.max(-maxX, Math.min(maxX, zoom.x));
    zoom.y = Math.max(-maxY, Math.min(maxY, zoom.y));
  } else {
    zoom.x = zoom.y = 0;
  }
  stage.classList.toggle('is-zoomed', on);
  img.style.transform = on ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})` : '';
}

function resetZoom() {
  const stage = document.querySelector('.lb-stage');
  zoom = { s: 1, x: 0, y: 0 };
  pinch = pan = null;
  pointers.clear();
  if (stage) { stage.classList.remove('is-zoomed', 'is-pinching'); const im = stage.querySelector('.lb-img'); if (im) im.style.transform = ''; }
}

function bindGestures(stage) {
  const dist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (pointers.size === 2) {
      pinch = { d: dist(), s: zoom.s };
      pan = null;
      stage.classList.add('is-pinching');
    } else if (pointers.size === 1) {
      pan = { x: e.clientX, y: e.clientY, ox: zoom.x, oy: zoom.y };
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { ...pointers.get(e.pointerId), x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const d = dist();
      if (pinch.d > 0) {
        zoom.s = Math.max(1, Math.min(MAX_SCALE, pinch.s * (d / pinch.d)));
        applyZoom(stage);
      }
      e.preventDefault();
    } else if (pan && zoom.s > 1.01 && pointers.size === 1) {
      zoom.x = pan.ox + (e.clientX - pan.x);
      zoom.y = pan.oy + (e.clientY - pan.y);
      applyZoom(stage);
      e.preventDefault();
    }
  }, { passive: false });   // preventDefault has to be allowed to land

  const release = (e) => {
    const start = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) { pinch = null; stage.classList.remove('is-pinching'); }

    if (!start || e.type === 'pointercancel') { if (!pointers.size) pan = null; return; }
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const moved = Math.hypot(dx, dy);

    // Double-tap toggles zoom, aimed at the point that was tapped.
    if (moved < 12 && performance.now() - start.t < 320) {
      const now = performance.now();
      if (now - lastTap < 320) {
        lastTap = 0;
        if (zoom.s > 1.01) { zoom = { s: 1, x: 0, y: 0 }; }
        else {
          const r = stage.getBoundingClientRect();
          const s = 2.2;
          zoom = { s, x: (r.left + r.width / 2 - e.clientX) * (s - 1), y: (r.top + r.height / 2 - e.clientY) * (s - 1) };
        }
        applyZoom(stage);
        if (!pointers.size) pan = null;
        return;
      }
      lastTap = now;
    }

    // Swipe steps the gallery — but only at rest. While zoomed the same drag is
    // a pan, and stepping on it would yank the image out from under the finger.
    if (zoom.s <= 1.01 && Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? +1 : -1);
    if (!pointers.size) pan = null;
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
}

/* ────────────── ALT TEXT ──────────────
 * `${title} — photo 3` is a filename read aloud, not a description, and on an
 * architecture portfolio the render IS the work. These were written by opening
 * each file under public/Renders and describing what is in it. They cover the
 * fourteen renders that also appear on the pages; the rest of the gallery falls
 * back to an honest position line rather than to an invented description.
 * Keyed by `<folder>/<file>` so it lines up with the manifest above.
 */
const ALT = {
  'Casa-Marbella/07-scaled.jpg':
    'A white villa of stacked glazed volumes above a mosaic-tiled infinity pool, with an open-air kitchen and a long dining counter on the stone terrace below.',
  'Casa-Marbella/04-scaled.jpg':
    'The villa at dusk, its glazed rooms glowing warm above a sunken terrace lounge gathered around a lit fire table, with water spilling down the pool wall behind.',
  'Casa-Marbella/01-scaled.jpg':
    'The villa seen head on from the beach, two floors of interiors open behind a glass wall above a mosaic-clad infinity pool whose water falls the full width of the terrace.',
  'Penthouse-Oradea/21.jpg':
    'A rooftop terrace under a pale timber pergola, where a curved stone bar and an outdoor kitchen stand against walls of clipped ivy, lit by slim glass pendants.',
  'Penthouse-Oradea/27.jpg':
    'A living room under a coffered ceiling and a crystal chandelier, where a buttoned cream sofa and a round marble table face a glazed wall onto the terrace, with the dining room and kitchen open beyond.',
  'Florida-House/01.jpg':
    'A two-storey house in white render and dark ribbed timber, reached across a lawn on a broad ribbon of pale stone pavers, with tall palms overhead and cars drawn up under a timber car port.',
  'Casa-Corebeanca/103.jpg':
    'A cream rendered villa under a clay pantile roof, its columned loggia opening onto a wide lawn, with a matching roofed pavilion sheltering the pool terrace beyond.',
  'Casa-Corebeanca/110.jpg':
    "The villa's garden front seen across a timber deck, where an arcaded loggia holds a sheltered lounge and round concrete daybeds face the lawn under a cantilevered parasol.",
  'Casa-Corebeanca/120.jpg':
    'Round concrete daybeds and tall glass lanterns on a timber deck beside a plunge pool, under a wide white parasol, with the tiled loggia and its flowering trees beyond.',
  'Apartment-in-Oradea/01-6-scaled.jpg':
    'An entrance hall in pale marble, where a dark bronze panelled door faces a floating stone console and a round olive velvet stool, under a cluster of slim brass pendants.',
  'Apartment-in-Oradea/03-6-scaled.jpg':
    'A living room in white wall panelling, where a long black ribbon fireplace runs below the screen and sage velvet seating faces a marble-clad kitchen wall beyond the dining table.',
  'Event-Hall-Baia-Mare/02_2-Photo-scaled.jpg':
    'An empty ballroom in white marble, its floor banded with black inlay between fluted columns, lit by crystal basket chandeliers hung from a coffered and cove-lit ceiling.',
  'Boutique-Mosilor/03-scaled.jpg':
    "A lit entrance court at night, where the building's name stands in gold on a book-matched marble wall above dark stone paving framed by clipped hedges.",
  'UAV-Library/74.jpg':
    'A library workroom lined floor to ceiling with archive binders, where two timber desks face a grey wall of recessed niches and a full-height case of bound volumes stands opposite.',
};

function describe(project, i) {
  return ALT[`${project.folder.replace(/^Renders\//, '')}/${project.images[i]}`] || '';
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

  // Destination: the stage box, at the photo's natural aspect.
  // The caps used to be hardcoded as 92vw × 82vh centred in the viewport, which
  // is no longer where the stage lands: on a portrait phone the frame is a
  // centred column of image + caption + rail, so the image sits at the TOP of a
  // centred group rather than in the middle of the screen. Rather than restate
  // any of that here, the caps are read back off the stylesheet (--lb-stage-h is
  // registered as <length>, so getComputedStyle resolves its dvh to pixels) and
  // the vertical offset is measured from the caption and rail, which are already
  // laid out by the time this runs. Nothing to keep in sync by hand.
  const nar = src.naturalWidth / src.naturalHeight;
  const lb = document.getElementById('lb');
  const stage = lb && lb.querySelector('.lb-stage');
  const lbCS = lb && getComputedStyle(lb);
  let maxW = innerWidth * .92, maxH = innerHeight * .82, band = 0;
  if (stage && lbCS) {
    // Guard the fallback by the UNIT, not by the magnitude. An engine without
    // @property hands a custom property back exactly as specified, so this reads
    // "82dvh" (or "56dvh" on a phone) and parseFloat turns that into 82 — a
    // number that sails straight past a bare `> 40` check and then aims the
    // morph at an 82 PIXEL stage. Registration as <length> is precisely what
    // makes the computed value an absolute length, so the unit is the thing to
    // test. Measured: Safari 26.5, Chrome and Firefox 153 all return px here,
    // and an unregistered property returns "82dvh" in all three.
    // max-width is a real property and always resolves to px, so it only needs
    // the magnitude check.
    const hRaw = lbCS.getPropertyValue('--lb-stage-h').trim();
    const h = /px$/.test(hRaw) ? parseFloat(hRaw) : NaN;
    const w = parseFloat(getComputedStyle(stage).maxWidth);
    if (h > 40) maxH = h;   // NaN fails this, falling back to innerHeight * .82
    if (w > 40) maxW = w;
    band = parseFloat(lbCS.paddingBottom) || 0;
    if (lbCS.flexDirection === 'column') {
      // Centring a group of (image + everything under it) inside the content box
      // puts the image's top exactly where centring the image alone inside a box
      // shortened by TWICE that everything would put it. Summing the in-flow
      // siblings rather than naming them means adding one later cannot break the
      // aim. Absolutely positioned children (the close button) are not in the
      // column and are skipped.
      const gap = parseFloat(lbCS.rowGap) || 0;
      let below = 0;
      for (const el of lb.children) {
        if (el === stage || getComputedStyle(el).position !== 'static') continue;
        below += el.getBoundingClientRect().height + gap;
      }
      band += 2 * below;
    }
  }
  const dW = Math.min(maxW, maxH * nar), dH = Math.min(maxH, maxW / nar);
  const dx = (innerWidth - dW) / 2, dy = (innerHeight - band - dH) / 2;

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
  resetZoom();
  // "Project gallery" named every gallery the same. Name it for the project the
  // visitor actually opened, so the dialog announces where they landed.
  lb.setAttribute('aria-label', `${project.title}, gallery`);
  render();
  // Un-hide BEFORE the flip: the stage has to be laid out for flipOpen to read
  // its resolved max-width back off the stylesheet. The clone rides above the
  // dialog (z-index 1001 over 1000), so the backdrop fading in underneath it is
  // exactly what should happen.
  lb.removeAttribute('hidden');
  flipOpen(card);
  requestAnimationFrame(() => { lb.classList.add('lb-open'); announce(); });
  document.documentElement.classList.add('lb-locked');
  lb.querySelector('.lb-close').focus();
}

function close() {
  const lb = document.getElementById('lb');
  if (!lb) return;
  lb.classList.remove('lb-open');
  document.documentElement.classList.remove('lb-locked');
  resetZoom();
  state = null;
  setTimeout(() => lb.setAttribute('hidden', ''), 320);
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

function step(delta) {
  if (!state) return;
  const n = state.project.images.length;
  state.idx = (state.idx + delta + n) % n;
  resetZoom();   // a new photo starts at rest, never inheriting the last pan
  render();
  announce();
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
  const desc = describe(project, idx);
  img.setAttribute('alt', desc || `${project.title}, photo ${idx + 1} of ${project.images.length}`);
  document.querySelector('.lb-cat').textContent = project.cat;
  document.querySelector('.lb-title').textContent = project.title;
  document.querySelector('.lb-loc').textContent = project.location;
  document.querySelector('.lb-counter').textContent =
    `${String(idx + 1).padStart(2, '0')} / ${String(project.images.length).padStart(2, '0')}`;
}

// Everything a sighted user gets from stepping (a new photo, a new position) is
// silent otherwise: focus stays on the arrow it was on, and re-pointing an <img>
// announces nothing. Kept out of render() because a live region inside a
// `hidden` (display:none) dialog is not observed, so the open path calls it once
// the dialog is up.
function announce(extra) {
  const live = document.querySelector('.lb-live');
  if (!live) return;
  if (extra) { live.textContent = extra; return; }
  if (!state) return;
  const { project, idx } = state;
  const desc = describe(project, idx);
  live.textContent = `Photo ${idx + 1} of ${project.images.length}.` + (desc ? ` ${desc}` : '');
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

/* Zoom, from the keyboard. The gesture path above bails on `pointerType ===
   'mouse'`, so until now looking closer at a render was a touch-only ability —
   WCAG 2.1.1 wants the same functionality without a pointer. The key map mirrors
   the touch behaviour rather than inventing a second one: + / - / 0 stand in for
   pinch and double-tap, and while zoomed the arrows pan instead of stepping,
   exactly as swipe-to-step is suppressed while zoomed. */
const KZOOM_STEP = 0.4;

function keyZoom(delta) {
  const stage = document.querySelector('.lb-stage');
  if (!stage) return;
  const before = zoom.s;
  zoom = delta === 0
    ? { s: 1, x: 0, y: 0 }
    : { ...zoom, s: Math.max(1, Math.min(MAX_SCALE, Math.round((zoom.s + delta) * 100) / 100)) };
  applyZoom(stage);
  if (zoom.s !== before) announce(zoom.s > 1.01 ? `Zoomed to ${Math.round(zoom.s * 100)} percent.` : 'Zoom reset.');
}

function keyPan(dx, dy) {
  const stage = document.querySelector('.lb-stage');
  const img = stage && stage.querySelector('.lb-img');
  if (!img) return;
  zoom.x += dx * img.offsetWidth * 0.12;
  zoom.y += dy * img.offsetHeight * 0.12;
  applyZoom(stage);
}

function onKey(e) {
  if (!state) return;
  if (e.key === 'Escape') return close();
  if (e.key === '+' || e.key === '=') { e.preventDefault(); return keyZoom(+KZOOM_STEP); }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); return keyZoom(-KZOOM_STEP); }
  if (e.key === '0')                  { e.preventDefault(); return keyZoom(0); }
  const zoomed = zoom.s > 1.01;
  if (e.key === 'ArrowLeft')  { if (zoomed) { e.preventDefault(); return keyPan(+1, 0); } return step(-1); }
  if (e.key === 'ArrowRight') { if (zoomed) { e.preventDefault(); return keyPan(-1, 0); } return step(+1); }
  if (e.key === 'ArrowUp')    { if (zoomed) { e.preventDefault(); return keyPan(0, +1); } return; }
  if (e.key === 'ArrowDown')  { if (zoomed) { e.preventDefault(); return keyPan(0, -1); } return; }
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
