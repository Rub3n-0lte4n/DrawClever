/**
 * Draw Clever Architecture — shared pass/fail reporting for the verification
 * suite. Every layer (headers, static, browser) prints in this format so a
 * developer reading CI output does not have to learn four different styles.
 */
const isTTY = process.stdout.isTTY;
const wrap = (code) => (s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const red = wrap(31);
export const green = wrap(32);
export const yellow = wrap(33);
export const dim = wrap(2);
export const bold = wrap(1);

export class Report {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.failures = [];
  }

  /** Record one check. `ok` truthy passes; falsy fails with `detail` attached. */
  check(label, ok, detail) {
    if (ok) {
      this.passed++;
    } else {
      this.failed++;
      this.failures.push(detail ? `${label} — ${detail}` : label);
    }
    return ok;
  }

  skip(reason) {
    this.skipped++;
    console.log(dim(`  ○ skipped: ${reason}`));
  }

  /** Prints the summary and returns true iff every check passed. */
  summarize() {
    const total = this.passed + this.failed;
    console.log('');
    if (this.failed) {
      console.error(
        red(`✗ ${this.name}: ${this.failed}/${total} check(s) failed`) +
        (this.skipped ? dim(` (${this.skipped} skipped)`) : '')
      );
      this.failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
    } else {
      console.log(
        green(`✓ ${this.name}: ${total} check(s) passed`) +
        (this.skipped ? dim(` (${this.skipped} skipped)`) : '')
      );
    }
    return this.failed === 0;
  }
}
