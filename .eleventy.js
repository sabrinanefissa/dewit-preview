/* Eleventy build: content/*.json -> src/_includes templates -> _site/.
   assets/, css/ and js/ are copied through untouched. */
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // https:, mailto:, tel:, //host

module.exports = function (eleventyConfig) {
  // tokens.css is generated (theme.json -> css/tokens.css.njk); only
  // the hand-written css/*.css files are passed through untouched. src/admin (Sveltia CMS) is
  // static and copied through as-is too.
  eleventyConfig.addPassthroughCopy({ assets: 'assets', 'css/*.css': 'css', js: 'js', 'src/admin': 'admin' });

  // 1 -> "01"
  eleventyConfig.addFilter('pad2', n => String(n).padStart(2, '0'));

  // Prefix a root-relative content path with the page's root ("" or "../").
  // Absolute URLs, scheme links (https:, mailto:, tel:) and in-page
  // fragments ("#care-talk") pass through.
  const root = (p, r) => (p == null ? '' : (SCHEME.test(p) || p[0] === '#') ? p : (r || '') + p);
  eleventyConfig.addFilter('root', root);

  // One image path -> its srcset candidate string, derived from disk: strip
  // the trailing "-<digits>" from the file name, glob the same directory for
  // "<base>-<w>.<ext>" siblings (the file itself included), and return them
  // sorted by width, root-prefixed: "a-860.webp 860w, a-1280.webp 1280w".
  // A file whose name has no trailing "-<digits>" (an upload such as
  // "ACT.png") lists the "<base>-<w>.webp" files tools/images.js derives
  // from it (webp candidates under a png src are fine: the browser picks
  // from the srcset). No sibling widths on disk returns "" (the template
  // then omits the attribute). Spaces in file names are written %20.
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const url = (file, r) => root(file, r).replace(/ /g, '%20');
  const siblings = (dir, re) => {
    let files;
    try { files = fs.readdirSync(path.join(__dirname, dir)); } catch (e) { return []; }
    const out = [];
    files.forEach(f => { const mm = re.exec(f); if (mm) out.push({ f, n: parseInt(mm[1], 10), file: dir === '.' ? f : `${dir}/${f}` }); });
    return out;
  };
  eleventyConfig.addFilter('srcset', (src, r) => {
    if (!src) return '';
    const dir = path.posix.dirname(src);
    const m = /^(.*)-(\d+)(\.[A-Za-z0-9]+)$/.exec(src);
    let re, min = 2;
    if (m) {
      re = new RegExp(`^${escRe(path.posix.basename(m[1]))}-(\\d+)${escRe(m[3])}$`);
    } else {
      const u = /^(.*)\.(png|jpe?g)$/i.exec(src);
      if (!u) return '';
      re = new RegExp(`^${escRe(path.posix.basename(u[1]))}-(\\d+)\\.webp$`);
      min = 1;
    }
    const cands = siblings(dir, re);
    if (cands.length < min) return '';
    cands.sort((a, b) => a.n - b.n);
    return cands.map(c => `${url(c.file, r)} ${c.n}w`).join(', ');
  });

  // One image path -> the srcset of its portrait crops for phones held
  // upright: every "<base>-portrait-<n>.webp" next to it (<base> is the
  // name without "-<width>" and extension), with each file's real width
  // read from its WebP header. "" when there is none (the template then
  // renders a plain <img>, no <picture>).
  const webpWidth = file => {
    const b = fs.readFileSync(file);
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return 0;
    const c = b.toString('ascii', 12, 16);
    if (c === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
    if (c === 'VP8L') return 1 + (((b[22] & 0x3f) << 8) | b[21]);
    if (c === 'VP8X') return 1 + b.readUIntLE(24, 3);
    return 0;
  };
  eleventyConfig.addFilter('portrait', (src, r) => {
    if (!src) return '';
    const dir = path.posix.dirname(src);
    const base = path.posix.basename(src).replace(/\.[A-Za-z0-9]+$/, '').replace(/-\d+$/, '');
    const cands = siblings(dir, new RegExp(`^${escRe(base)}-portrait-(\\d+)\\.webp$`))
      .map(c => Object.assign(c, { w: webpWidth(path.join(__dirname, c.file)) }))
      .filter(c => c.w > 0);
    if (!cands.length) return '';
    cands.sort((a, b) => a.w - b.w);
    return cands.map(c => `${url(c.file, r)} ${c.w}w`).join(', ');
  });

  // 7000 -> "7,000"
  eleventyConfig.addFilter('thousands', n => Number(n).toLocaleString('en-US'));

  // Plain text -> HTML-escaped text with one inline mark: *x* becomes
  // <em class="emClass">x</em> (or <em> with no emClass), **x** becomes
  // <strong>x</strong>, and a newline becomes <br>. The source string is
  // plain (real apostrophes, no markup); this is the only place that marks
  // it up again.
  const escapeHtml = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  eleventyConfig.addFilter('inline', (str, emClass) => {
    if (str == null) return new nunjucks.runtime.SafeString('');
    let s = escapeHtml(str);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/\*(.+?)\*/g, emClass ? `<em class="${emClass}">$1</em>` : '<em>$1</em>');
    s = s.replace(/\n/g, '<br>');
    return new nunjucks.runtime.SafeString(s);
  });

  // A heading string -> its words, for a per-word entrance: split on
  // spaces, but an *emphasis* or **bold** run stays one piece even when it
  // spans several words, so each piece still goes through `inline` whole.
  eleventyConfig.addFilter('words', str => {
    if (str == null) return [];
    const out = [];
    const re = /\*\*[^*]+?\*\*\S*|\*[^*]+?\*\S*|\S+/g;
    let m;
    while ((m = re.exec(String(str)))) out.push(m[0]);
    return out;
  });

  // Scroll-fill headings: a heading's words, each wrapped in
  // <span class="fill__w" aria-hidden="true" style="--i:k"> (an *emphasis*
  // run stays one piece, as in `words`), line breaks kept as <br>. The
  // heading itself takes `fillAttrs`: aria-label with the plain text and
  // --n, the word count. CSS fills word k from the heading's --fp (written
  // by the one scroll module) with a 0.12 stagger; no per-word JS.
  // hidden=false leaves the words readable (for a line that is not a
  // heading and so cannot carry an aria-label).
  const wordsOf = str => {
    const out = [];
    const re = /\*\*[^*]+?\*\*\S*|\*[^*]+?\*\S*|\S+/g;
    let m;
    while ((m = re.exec(String(str)))) out.push(m[0]);
    return out;
  };
  eleventyConfig.addFilter('fillWords', (str, emClass, hidden) => {
    if (str == null) return new nunjucks.runtime.SafeString('');
    const inl = eleventyConfig.getFilter('inline');
    const ah = hidden === false ? '' : ' aria-hidden="true"';
    let i = 0;
    const html = String(str).split('\n').map(line => wordsOf(line).map(w =>
      `<span class="fill__w"${ah} style="--i:${i++}">${inl(w, emClass)}</span>`).join(' ')).join('<br>');
    return new nunjucks.runtime.SafeString(html);
  });
  eleventyConfig.addFilter('fillAttrs', (str, label) => {
    const n = String(str == null ? '' : str).split('\n').reduce((a, l) => a + wordsOf(l).length, 0);
    const pl = eleventyConfig.getFilter('plain')(str);
    return new nunjucks.runtime.SafeString(`${label === false ? '' : ` aria-label="${pl}"`} style="--n:${n}"`);
  });

  // The same text with the inline marks taken out, HTML-escaped (for an
  // aria-label).
  eleventyConfig.addFilter('plain', str => new nunjucks.runtime.SafeString(str == null ? '' : escapeHtml(String(str)
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\n/g, ' '))));

  // Resolve a chrome link {href, slug?, overrides?} for the current page:
  // an override for this page wins; a link to the page itself becomes "./"
  // and is marked current; anything else is root-prefixed.
  eleventyConfig.addFilter('navlink', (link, slug, r) => {
    if (link.overrides && link.overrides[slug] != null) return { href: link.overrides[slug], current: false };
    if (link.slug && link.slug === slug) return { href: './', current: true };
    return { href: root(link.href, r), current: false };
  });

  // A page's breadcrumb name: its nav label, else site.crumbs[slug], else
  // its title (plain text, for the BreadcrumbList JSON-LD).
  eleventyConfig.addFilter('crumbName', (slug, site, title) => {
    const n = (site.nav || []).find(l => l.slug === slug);
    const name = (n && n.label) || (site.crumbs && site.crumbs[slug]) || title || slug;
    return String(name).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
  });

  // A block's motion setting: block.settings.motion[key], or the default
  // (today's value) when the block does not set it.
  eleventyConfig.addFilter('motion', (block, key, dflt) => {
    const m = block && block.settings && block.settings.motion;
    const v = m ? m[key] : undefined;
    return v === undefined || v === null || v === '' ? dflt : v;
  });

  // Home's talk cards share the one accent.
  eleventyConfig.addFilter('accentVar', () => 'violet-300');

  // An image's aspect ratio (width / height), read from the file's header
  // (PNG or WebP). Used to size logos to one optical area. 0 when unknown.
  eleventyConfig.addFilter('aspect', src => {
    if (!src) return 0;
    let b;
    try { b = fs.readFileSync(path.join(__dirname, src)); } catch (e) { return 0; }
    let w = 0, h = 0;
    if (b.toString('ascii', 1, 4) === 'PNG') { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
    else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const k = b.toString('ascii', 12, 16);
      if (k === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
      else if (k === 'VP8L') { const n = b.readUInt32LE(21); w = 1 + (n & 0x3FFF); h = 1 + ((n >> 14) & 0x3FFF); }
      else if (k === 'VP8 ') { w = b.readUInt16LE(26) & 0x3FFF; h = b.readUInt16LE(28) & 0x3FFF; }
    }
    return w && h ? Math.round((w / h) * 1000) / 1000 : 0;
  });

  // The page's talks: its shown kn-talk blocks, in page order.
  eleventyConfig.addFilter('talks', blocks => (blocks || []).filter(b => b && b.type === 'kn-talk' && b.enabled !== false));

  // A talk's place among the page's talks, from 1.
  eleventyConfig.addFilter('talkNo', (blocks, id) => (blocks || []).filter(b => b && b.type === 'kn-talk' && b.enabled !== false).findIndex(b => b.id === id) + 1);

  // A block's background tone (data-tone): block.settings.background or the
  // type's own tone today.
  // Sections no longer paint a colour (the page gradient shows through);
  // the value is still written so page JSON keeps building, and an
  // unknown value falls back to the default instead of failing the build.
  const TONES = ['plum', 'damson', 'aubergine', 'violet', 'indigo', 'deep', 'stage', 'ivory', 'cream', 'mist', 'mauve', 'transparent'];
  eleventyConfig.addFilter('tone', (block, dflt) => {
    const v = (block && block.settings && block.settings.background) || dflt;
    return TONES.includes(v) ? v : (dflt || 'transparent');
  });

  // A quote's display lines: block.lines when they join (single spaces)
  // into the quote exactly; a build error when they do not, so the words
  // on the page are always the approved words. [] when there are none.
  eleventyConfig.addFilter('quoteLines', block => {
    const ls = block && block.lines;
    if (!Array.isArray(ls) || !ls.length) return [];
    if (ls.join(' ') !== block.quote) throw new Error(`Quote "${block.id}": lines do not join into the quote word for word`);
    return ls;
  });

  // The no-script text scheme: the 1-based place of the first shown block
  // (the close excluded, it sits in the footer) at or past the switch
  // share of the page's blocks; from there on sections take cream text.
  // A cache-busting stamp for a local css or js file: a short hash of its
  // contents, so a changed file always gets a new URL. tokens.css is built
  // from theme.json, its template and the page data, so it hashes those.
  const crypto = require('crypto');
  const stampCache = new Map();
  const TOKEN_SOURCES = ['content/theme.json', 'src/css/tokens.css.njk'];
  eleventyConfig.on('eleventy.before', () => stampCache.clear());
  eleventyConfig.addFilter('stamp', file => {
    if (!file) return '';
    if (stampCache.has(file)) return stampCache.get(file);
    const h = crypto.createHash('sha1');
    let srcs = [file];
    if (/(^|\/)tokens\.css$/.test(file)) {
      const pd = path.join(__dirname, 'content/pages');
      srcs = TOKEN_SOURCES.concat(fs.readdirSync(pd).filter(f => f.endsWith('.json')).sort().map(f => `content/pages/${f}`));
    }
    srcs.forEach(f => { try { h.update(fs.readFileSync(path.join(__dirname, f))); } catch (e) { h.update(f); } });
    const v = h.digest('hex').slice(0, 10);
    stampCache.set(file, v);
    return v;
  });

  // Build error unless every rendered block has an id, the ids are valid
  // HTML ids, and no two ids on the page collide: block ids, the ids the
  // blocks derive from them (<id>-h, <id>-live, <id>-tab-N, ...), a steps
  // block's final-stage anchor, and the layout's own ids. Prints nothing.
  const CHROME_IDS = ['loader', 'loaderBar', 'nav', 'drawer', 'main'];
  const ID_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
  eleventyConfig.addFilter('assertUniqueIds', (doc) => {
    const where = `content/pages/${doc.slug}.json`;
    const seen = new Map(CHROME_IDS.map(id => [id, 'the layout']));
    if (doc.footer && doc.footer.id) seen.set(doc.footer.id, 'the footer');
    const claim = (id, owner) => {
      if (!ID_RE.test(id)) throw new Error(`${where}: ${owner} has an invalid id "${id}" (a letter, then letters, digits, - or _)`);
      if (seen.has(id)) throw new Error(`${where}: duplicate id "${id}" (${owner} and ${seen.get(id)}); every block needs its own id`);
      seen.set(id, owner);
    };
    (doc.blocks || []).forEach((b, i) => {
      if (b.enabled === false) return;
      const owner = `block ${i + 1} (${b.type})`;
      if (!b.id) throw new Error(`${where}: ${owner} has no id`);
      claim(b.id, owner);
      if (b.type === 'steps' && b.final && b.final.id) claim(b.final.id, `${owner} final stage`);
    });
    // the ids the templates derive from each block id must not collide either
    (doc.blocks || []).forEach((b, i) => {
      if (b.enabled === false) return;
      const owner = `block ${i + 1} (${b.type})`;
      const n = (b.talks || b.chapters || []).length;
      ['h', 'live', 'hint'].forEach(s => claim(`${b.id}-${s}`, `${owner} (derived)`));
      for (let k = 1; k <= n; k++) {
        claim(`${b.id}-tab-${k}`, `${owner} (derived)`);
        claim(`${b.id}-panel-${k}`, `${owner} (derived)`);
      }
    });
    return '';
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
};
