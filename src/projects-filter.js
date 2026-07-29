/**
 * Draw Clever Architecture — portfolio filter
 *
 * Lives in its own module (rather than inline in projects.html) so the site's
 * Content-Security-Policy can run script-src without 'unsafe-inline' —
 * bundled output is covered by 'self'.
 */

/* Portfolio filter, animated. Leaving cards fade out, the grid reflows with a
   FLIP slide for survivors, and incoming cards stagger in. Falls back to an
   instant toggle under reduced-motion or without Web Animations. */
(function () {
  const grid  = document.querySelector('.pf-grid');
  if (!grid) return;
  const pills = [...document.querySelectorAll('.pf-filter')];
  const cards = [...document.querySelectorAll('.pf-grid .pc')];
  const EASE  = 'cubic-bezier(.16,1,.3,1)';
  const plain = matchMedia('(prefers-reduced-motion: reduce)').matches || !('animate' in Element.prototype);
  let busy = false;

  const wants = (c, f) => f === 'all' || (c.dataset.cat || '').split(' ').includes(f);

  function apply(f) {
    const leaving  = cards.filter((c) => !c.classList.contains('hide') && !wants(c, f));
    const entering = cards.filter((c) =>  c.classList.contains('hide') &&  wants(c, f));
    const staying  = cards.filter((c) => !c.classList.contains('hide') &&  wants(c, f));

    if (plain) { cards.forEach((c) => c.classList.toggle('hide', !wants(c, f))); return; }

    busy = true;
    const commit = () => {
      const first = new Map(staying.map((c) => [c, c.getBoundingClientRect()]));   // FIRST
      leaving.forEach((c) => { c.classList.add('hide'); c.style.opacity = ''; c.style.transform = ''; });
      entering.forEach((c) => c.classList.remove('hide'));                          // layout change
      staying.forEach((c) => {                                                      // LAST → INVERT/PLAY
        const a = first.get(c), b = c.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) c.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0,0)' }],
          { duration: 540, easing: EASE }
        );
      });
      const base = staying.length ? 110 : 0;
      entering.forEach((c, i) => {
        c.getAnimations().forEach((an) => an.cancel());                             // clear any stale fade
        c.animate(
          [{ opacity: 0, transform: 'translateY(18px) scale(.985)' }, { opacity: 1, transform: 'none' }],
          { duration: 560, delay: base + i * 55, easing: EASE, fill: 'backwards' }
        );
      });
      busy = false;
    };

    if (!leaving.length) { commit(); return; }
    let pending = leaving.length;
    leaving.forEach((c) => {
      const an = c.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }],
        { duration: 220, easing: EASE, fill: 'forwards' }
      );
      an.onfinish = an.oncancel = () => { if (--pending === 0) commit(); };
    });
  }

  pills.forEach((p) => p.addEventListener('click', () => {
    if (busy || p.classList.contains('active')) return;
    pills.forEach((x) => x.classList.remove('active'));
    p.classList.add('active');
    apply(p.dataset.filter);
  }));
})();
