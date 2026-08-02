/**
 * Selector → documented floor (px), read off src/site.css's 11 role tokens
 * (`--t-body-lg/body/body-sm/caption`, `--t-ui/label/micro`,
 * `--t-d-sm/md/lg/xl`). Only the prose/UI roles have a legibility floor
 * worth asserting; the four `--t-d-*` display tokens clamp to 21px+ at
 * their smallest and are excluded.
 *
 * The selector lists below are every selector in site.css that consumes
 * each token (grepped, not guessed) — if a new selector starts consuming
 * `var(--t-caption)`, add it here so the floor check actually covers it.
 */
export const FLOORS = {
  '--t-body': 16,     // reading
  '--t-body-sm': 15,  // dense prose
  '--t-caption': 14,  // captions
  '--t-ui': 13,       // UI
  '--t-label': 12,    // labels
  '--t-micro': 11.5,  // micro
};

export const ROLE_SELECTORS = {
  '--t-body': ['.drawer-foot .l', '.banner .sub', '.sec-head .intro', '.field input', '.field select', '.field textarea', '.acc-a-i'],
  '--t-body-sm': ['.office .b', '.fb-caption p', '.tenet-b'],
  '--t-caption': ['.btn-lg', '.pc-loc', '.foot-bottom p', '.form-note'],
  '--t-ui': ['.btn', '.link', '.nav-links a:not(.btn)', '.drawer-social a', '.tenet-n', '.foot-nav a', '.foot-social a'],
  '--t-label': ['.eyebrow', '.drawer-foot .e', '.crumbs', '.stat .l', '.tag', '.to-top', '.field label', '.lb-loc', '.lb-counter'],
  '--t-micro': ['.office .t', '.pc-cat', '.lb-cat', '.lb-zoom-hint'],
};

/**
 * The flat, de-duplicated candidate list — every selector above, regardless
 * of which role it was grepped under. `.banner .sub` is a cautionary tale
 * for why: it consumes `--t-body` at wide viewports but a `max-width`
 * media query reassigns it to `--t-body-sm` below a breakpoint (see
 * site.css ~line 583/640), same specificity, later in the cascade, so the
 * narrow rule wins. A static selector→role map would check it against the
 * wrong floor at 320px. verify.mjs resolves the *actual* role live, per
 * element, per viewport, by matching the element's computed font-size
 * against each token's own current value — this list only says which
 * elements are worth asking.
 */
export const ALL_SELECTORS = [...new Set(Object.values(ROLE_SELECTORS).flat())];

