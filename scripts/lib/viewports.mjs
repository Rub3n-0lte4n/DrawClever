/**
 * The six viewports the mobile layer checks against, including two
 * landscape ones. `isMobile: false, hasTouch: true` on every entry is
 * deliberate, not copy-paste noise:
 *
 *   - Chrome's mobile emulation (isMobile: true) clamps a requested 320px
 *     viewport to 345px, so a real 320 (iPhone SE portrait) is only
 *     achievable with isMobile: false.
 *   - hasTouch: true is what makes `(hover: none)` / `(pointer: coarse)`
 *     media queries actually match. Without it, every viewport here would
 *     still be tested with a mouse's hover/fine-pointer rules in force.
 */
export const VIEWPORTS = [
  { name: '320x568-portrait', width: 320, height: 568, landscape: false, note: 'iPhone SE portrait — the narrowest real target' },
  { name: '375x812-portrait', width: 375, height: 812, landscape: false, note: 'iPhone X-class portrait' },
  { name: '390x844-portrait', width: 390, height: 844, landscape: false, note: 'iPhone 14-class portrait' },
  { name: '768x1024-portrait', width: 768, height: 1024, landscape: false, note: 'tablet portrait' },
  { name: '844x390-landscape', width: 844, height: 390, landscape: true, note: 'phone turned sideways — documented worst case in src/site.css' },
  { name: '1024x768-landscape', width: 1024, height: 768, landscape: true, note: 'tablet landscape' },
];

export const CONTEXT_OPTS = { isMobile: false, hasTouch: true };
