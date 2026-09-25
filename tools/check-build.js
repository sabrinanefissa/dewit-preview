#!/usr/bin/env node
/* Compares the committed hand-written pages (git HEAD) with the Eleventy
   build in _site/. Both sides are normalised the same way: whitespace runs
   collapse to one space, whitespace next to "<" and ">" is trimmed, and the
   cache-bust "?v=..." query values are stripped. Prints a unified diff of
   whatever is left, one line per tag, then every difference at attribute
   level. Since the blocks became instances (step 16) the only differences
   allowed are attribute-level: an id removed (a JS-only hook), an id or an
   ARIA reference renamed to the block-derived form (<block id>-h, -live,
   -tab-N, ...), and data-* / style attributes added (motion settings,
   tones, counts). Exits 1 on anything else. */
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

// Split one normalised tag line into its name, attributes and trailing text.
function parseTag(line) {
  const m = line.match(/^<([a-zA-Z0-9]+)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*\/?>(.*)$/s);
  if (!m) return null;
  const attrs = {}; const re = /\s+([^\s=>]+)(?:="([^"]*)")?/g; let x;
  while ((x = re.exec(m[2]))) attrs[x[1]] = x[2] === undefined ? '' : x[2];
  return { tag: m[1], attrs, rest: m[3] };
}
const RENAMEABLE = new Set(['id', 'aria-labelledby', 'aria-controls', 'aria-describedby']);
// Pair the -/+ lines of each hunk and describe them attribute by attribute.
// Returns { changes: [text], bad: [text] }.
function classify(diff) {
  const changes = [], bad = [];
  let minus = [], plus = [];
  function flush() {
    if (minus.length !== plus.length) bad.push(`unpaired hunk: -${minus.length} +${plus.length} lines\n    ${minus.concat(plus).join('\n    ')}`);
    for (let i = 0; i < Math.min(minus.length, plus.length); i++) {
      const A = parseTag(minus[i]), B = parseTag(plus[i]);
      if (!A || !B || A.tag !== B.tag || A.rest !== B.rest) { bad.push(`not attribute-level:\n    - ${minus[i]}\n    + ${plus[i]}`); continue; }
      const d = [];
      for (const k of new Set([...Object.keys(A.attrs), ...Object.keys(B.attrs)])) {
        if (!(k in B.attrs)) { d.push(`removed ${k}="${A.attrs[k]}"`); if (k !== 'id') bad.push(`<${A.tag}> removed ${k}`); }
        else if (!(k in A.attrs)) { d.push(`added ${k}="${B.attrs[k]}"`); if (!/^data-/.test(k) && k !== 'style') bad.push(`<${A.tag}> added ${k}`); }
        else if (A.attrs[k] !== B.attrs[k]) { d.push(`${k} "${A.attrs[k]}" -> "${B.attrs[k]}"`); if (!RENAMEABLE.has(k)) bad.push(`<${A.tag}> changed ${k}`); }
      }
      const cls = A.attrs.class ? '.' + A.attrs.class.split(' ').join('.') : '';
      changes.push(`<${A.tag}${cls}> ${d.join('; ')}`);
    }
    minus = []; plus = [];
  }
  for (const l of diff.split('\n')) {
    if (l.startsWith('---') || l.startsWith('+++')) continue;
    if (l.startsWith('-')) { if (plus.length) flush(); minus.push(l.slice(1)); }
    else if (l.startsWith('+')) plus.push(l.slice(1));
    else flush();
  }
  flush();
  return { changes, bad };
}

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
    const n = diff.split('\n').filter(l => /^[+-][^+-]/.test(l)).length;
    console.log(`${pg.name}: ${n} differing line(s)`);
    console.log(diff);
    const { changes, bad } = classify(diff);
    console.log(`${pg.name}: ${changes.length} tag(s) differ at attribute level:`);
    changes.forEach(c => console.log('  ' + c));
    if (bad.length) {
      failed++;
      console.log(`${pg.name}: ${bad.length} difference(s) NOT allowed:`);
      bad.forEach(b => console.log('  ' + b));
    } else {
      console.log(`${pg.name}: OK, every difference is an allowed attribute-level change`);
    }
  } else {
    console.log(`${pg.name}: 0 differences (${pg.committed} == ${pg.built} after normalisation)`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
