#!/usr/bin/env node
/* Image pipeline, run before every build (npm "prebuild").

   1. Widths: every assets/img/*.png|jpg|jpeg over 200 KB whose name has no
      "-<width>" suffix (an upload such as "ACT.png") gets
      "<base>-960.webp", "<base>-1440.webp" and "<base>-1920.webp" (quality
      78). Nothing is upscaled: widths above the source's are dropped and the
      source's own width is written instead. The srcset filter in
      .eleventy.js finds these siblings and lists them.

   2. Portraits (phones held upright): "<base>-portrait-<h>.webp" next to
      the landscape file. For the pictures a phone shows full-screen (the
      PORTRAITS list below) a PLACEHOLDER is cut from the widest landscape
      file: a 9:19.5 crop, centred across, focal point 42% down, at the
      source's full height. A portrait the owner adds ("<base>-portrait.png",
      "-portrait-1600.jpg", "-portrait-<n>.webp") always wins: a png/jpg is
      converted to "<base>-portrait-<h>.webp", and the placeholder (listed
      in assets/img/_portraits.json) is removed and never written again.

   Idempotent: an output that exists and is newer than its source is
   skipped, so a second run writes nothing. Prints what it wrote. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'assets', 'img');
const LEDGER = path.join(DIR, '_portraits.json');
const MIN_BYTES = 200 * 1024;
const WIDTHS = [960, 1440, 1920];
const QUALITY = 78;
const RATIO = 9 / 19.5;   // portrait crop, width / height
const FOCAL_Y = 0.42;     // faces sit high

// The pictures a phone shows full-screen, by base name (the file name
// without "-<width>" and extension). The source is the widest file of that
// base on disk.
const PORTRAITS = [
  'hero',                    // home hero poster
  'reel-poster',             // speaking hero poster
  'permission',              // home chap stills
  'feeling lonely at work',  // speaking chap stills
  'chap-feel',
  'ACT',
  'on stage',                // keys rest
  'keys-stage',              // keys talk stills
  'out-aisle',               //   (and the speaking walk-out)
  'room-offsite',
  'keynote',                 // home out ("idea") and the bleed
  'act-terrace',             // speaking chap: Trust's first still
  'pos-honest',              // speaking chap: the takeaways (positive stills; Trust is out-aisle)
  'pos-curiosity', 'pos-shared', 'pos-confidence',
];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isRaster = f => /\.(png|jpe?g)$/i.test(f);
const newer = (out, src) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;

async function main() {
  const t0 = Date.now();
  const files = fs.readdirSync(DIR);
  const wrote = [];
  let bytes = 0;
  const write = async (pipeline, out) => {
    await pipeline.webp({ quality: QUALITY }).toFile(out);
    const n = fs.statSync(out).size; bytes += n;
    wrote.push(`${path.basename(out)} (${(n / 1024).toFixed(0)} KB)`);
  };

  // 1. widths for uploads
  for (const f of files) {
    if (!isRaster(f)) continue;
    const stem = f.replace(/\.[^.]+$/, '');
    if (/-\d+$/.test(stem) || /-portrait$/.test(stem)) continue;
    const src = path.join(DIR, f);
    if (fs.statSync(src).size <= MIN_BYTES) continue;
    const { width } = await sharp(src).metadata();
    const ws = [...new Set(WIDTHS.map(w => Math.min(w, width)))];
    for (const w of ws) {
      const out = path.join(DIR, `${stem}-${w}.webp`);
      if (newer(out, src)) continue;
      await write(sharp(src).resize({ width: w, withoutEnlargement: true }), out);
    }
  }

  // 2. portraits
  let ledger = [];
  try { ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch (e) { /* first run */ }
  const now = () => fs.readdirSync(DIR);
  for (const base of PORTRAITS) {
    const reP = new RegExp(`^${esc(base)}-portrait(?:-(\\d+))?\\.(webp|png|jpe?g)$`, 'i');
    const portraits = now().filter(f => reP.test(f));
    const owners = portraits.filter(f => !ledger.includes(f));
    if (owners.length) {
      // the owner's portrait wins: drop our placeholder, convert png/jpg
      for (const f of portraits.filter(f => ledger.includes(f))) {
        fs.unlinkSync(path.join(DIR, f));
        wrote.push(`removed placeholder ${f}`);
      }
      ledger = ledger.filter(f => !reP.test(f));
      for (const f of owners.filter(isRaster)) {
        const src = path.join(DIR, f);
        const { height } = await sharp(src).metadata();
        const out = path.join(DIR, `${base}-portrait-${height}.webp`);
        if (newer(out, src)) continue;
        await write(sharp(src), out);
      }
      continue;
    }
    if (portraits.length) continue; // our placeholder is there already
    // source: the widest landscape file of this base
    const reL = new RegExp(`^${esc(base)}(?:-(\\d+))?\\.(webp|png|jpe?g)$`, 'i');
    let best = null;
    for (const f of now().filter(f => reL.test(f))) {
      const m = await sharp(path.join(DIR, f)).metadata();
      if (!best || m.width > best.w) best = { f, w: m.width, h: m.height };
    }
    if (!best) { console.warn(`images: no source for portrait "${base}"`); continue; }
    let cw = Math.round(best.h * RATIO), ch = best.h;
    if (cw > best.w) { cw = best.w; ch = Math.round(best.w / RATIO); }
    const left = Math.round((best.w - cw) / 2);
    const top = Math.round(Math.min(Math.max(best.h * FOCAL_Y - ch * FOCAL_Y, 0), best.h - ch));
    const name = `${base}-portrait-${ch}.webp`;
    await write(sharp(path.join(DIR, best.f)).extract({ left, top, width: cw, height: ch }), path.join(DIR, name));
    ledger.push(name);
  }
  ledger.sort();
  const txt = JSON.stringify(ledger, null, 2) + '\n';
  if (!fs.existsSync(LEDGER) || fs.readFileSync(LEDGER, 'utf8') !== txt) fs.writeFileSync(LEDGER, txt);

  const ms = Date.now() - t0;
  if (wrote.length) {
    const n = wrote.filter(w => !w.startsWith('removed')).length;
    console.log(`images: wrote ${n} file(s), ${(bytes / 1048576).toFixed(2)} MB, in ${ms} ms`);
    wrote.forEach(w => console.log('  ' + w));
  } else {
    console.log(`images: up to date (${ms} ms)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
