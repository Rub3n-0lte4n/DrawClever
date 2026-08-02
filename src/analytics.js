/**
 * Draw Clever Architecture — analytics
 *
 * Vercel Web Analytics (pageviews + custom events) and Speed Insights (Core
 * Web Vitals). Both are cookieless and first-party: in production they load
 * a same-origin script from /_vercel/insights/script.js and
 * /_vercel/speed-insights/script.js and beacon back to same-origin paths
 * under those same prefixes, so the existing CSP's `script-src 'self'` and
 * `connect-src 'self' …` already permit them — nothing in vercel.json needs
 * to change. Both packages ship a browser bundle at their package root, so
 * this file is a plain ES module: Vite bundles it into /assets like
 * site.js, it is never inline, and it does not touch the CSP hash contract
 * in scripts/verify-csp.mjs.
 *
 * Until Web Analytics / Speed Insights are switched on for this project in
 * the Vercel dashboard, both `inject()` calls below are inert (the script
 * tag 404s quietly and each package logs a console notice) — see this
 * agent's report for the exact dashboard steps.
 */
import { inject, track } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

inject();
injectSpeedInsights();

/**
 * Fire-and-forget wrapper. Analytics must never be the reason a click or a
 * form submit breaks, so every call is swallowed.
 */
function safeTrack(name, properties) {
  try {
    track(name, properties);
  } catch {
    /* no-op */
  }
}

/* ── Contact intent: every link that points at the contact page ─────────────
   Covers the nav "Contact" link, every "Start a Project" button, and the
   services-page project-type rows — all of them already point at /contact,
   so this needs no markup changes, just a delegated listener. */
document.addEventListener(
  'click',
  function (e) {
    const a = e.target.closest('a[href="/contact"]');
    if (!a) return;
    safeTrack('cta_contact_click', {
      label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 80),
      from_page: location.pathname,
    });
  },
  { capture: true }
);

/* ── Outbound email intent: hello@drawclever.com links ───────────────────────
   A real enquiry path that bypasses the form entirely (footer, contact
   details block, form's "prefer email" note). Undercounting this
   undercounts total demand. */
document.addEventListener(
  'click',
  function (e) {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    safeTrack('mailto_click', { from_page: location.pathname });
  },
  { capture: true }
);

/* ── Contact form funnel (contact.html only) ─────────────────────────────────
   Reads only the native <form id="contact-form"> element and its own
   `submit` event — nothing from src/contact-form.js's internals — so this
   keeps working whether the form posts to Web3Forms directly or through a
   future /api/contact proxy.

   This captures *attempts*, not confirmed sends: a submit can still fail
   after this fires. The true "enquiry_submitted" conversion (sent vs.
   mailto-fallback) needs one small hook inside the code that owns the
   submit handler — see this agent's report for the exact two-line patch
   and where it goes. The listener for that event is already wired up below
   so no further change to this file is needed once that hook lands. */
const form = document.getElementById('contact-form');
if (form) {
  let started = false;
  form.addEventListener('focusin', function () {
    if (started) return;
    started = true;
    safeTrack('enquiry_form_started');
  });
  form.addEventListener('submit', function () {
    safeTrack('enquiry_form_submit_attempted', {
      project_type: String(new FormData(form).get('type') || ''),
    });
  });
}

/* Real conversion, once contact-form.js (or its future /api/contact.js
   proxy) dispatches it. detail.status is 'sent' for a confirmed API/Web3Forms
   success, 'fallback' for the mailto: fallback path — both are enquiries
   reaching the studio, but they are worth telling apart because a rising
   'fallback' rate signals the primary send path is failing. */
document.addEventListener('dc:enquiry', function (e) {
  const detail = (e && e.detail) || {};
  safeTrack('enquiry_submitted', {
    status: detail.status === 'fallback' ? 'fallback' : 'sent',
    project_type: String(detail.project_type || ''),
  });
});

/* ── Portfolio filter usage (projects.html only) ─────────────────────────────
   Which category a visitor asks to see is a direct read on which part of
   the portfolio is pulling interest — useful for what to shoot/feature next. */
document.querySelectorAll('.pf-filter[data-filter]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    safeTrack('portfolio_filter_click', { filter: btn.dataset.filter || '' });
  });
});

/* ── Outbound social clicks (Instagram / Pinterest / X) ──────────────────────
   Low priority relative to enquiries, but cheap to add from markup that
   already exists, and tells the client whether social is sending anyone
   here at all. */
document.addEventListener(
  'click',
  function (e) {
    const a = e.target.closest(
      'a[href^="https://www.instagram.com/"], a[href^="https://pinterest.com/"], a[href^="https://x.com/"]'
    );
    if (!a) return;
    const network = a.hostname.replace(/^www\./, '').split('.')[0];
    safeTrack('social_click', { network, from_page: location.pathname });
  },
  { capture: true }
);
