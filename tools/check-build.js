#!/usr/bin/env node
/* Compares the committed hand-written pages (git HEAD) with the Eleventy
   build in _site/. Both sides are normalised the same way: whitespace runs
   collapse to one space, whitespace next to "<" and ">" is trimmed, and the
   cache-bust "?v=..." query values are stripped. Prints a unified diff of
   whatever is left, one line per tag, and exits 1 if anything differs. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  { name: 'home', committed: 'index.html', built: '_site/index.html' },
  { name: 'speaking', committed: 'speaking/index.html', built: '_site/speaking/index.html' },
];

function normalise(html) {
  return html
    .replace(/\?v=[^"'\s>]*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*>\s*/g, '>')
    .replace(/\s*<\s*/g, '<')
    .trim();
}
// One tag or text run per line so the diff is readable.
function lines(norm) { return norm.replace(/></g, '>\n<').split('\n'); }

let failed = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-build-'));
for (const pg of PAGES) {
  const ref = execFileSync('git', ['show', 'HEAD:' + pg.committed], { cwd: ROOT, encoding: 'utf8' });
  const builtPath = path.join(ROOT, pg.built);
  if (!fs.existsSync(builtPath)) { console.log(`${pg.name}: MISSING ${pg.built} (run npm run build)`); failed++; continue; }
  const out = fs.readFileSync(builtPath, 'utf8');
  const a = path.join(tmp, pg.name + '.committed.html');
  const b = path.join(tmp, pg.name + '.built.html');
  fs.writeFileSync(a, lines(normalise(ref)).join('\n') + '\n');
  fs.writeFileSync(b, lines(normalise(out)).join('\n') + '\n');
  let diff = '';
  try {
    execFileSync('diff', ['-u', '--label', 'HEAD:' + pg.committed, '--label', pg.built, a, b], { encoding: 'utf8' });
  } catch (e) { diff = e.stdout || String(e); }
  if (diff) {
    failed++;
    const n = diff.split('\n').filter(l => /^[+-][^+-]/.test(l)).length;
    console.log(`${pg.name}: ${n} differing line(s)`);
    console.log(diff);
  } else {
    console.log(`${pg.name}: 0 differences (${pg.committed} == ${pg.built} after normalisation)`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
