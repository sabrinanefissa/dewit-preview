/* Eleventy build: content/*.json -> src/_includes templates -> _site/.
   assets/, css/ and js/ are copied through untouched. */
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // https:, mailto:, tel:, //host

module.exports = function (eleventyConfig) {
  // tokens.css is generated (theme.json -> css/tokens.css.njk); only
  // main.css is passed through untouched. src/admin (Sveltia CMS) is
  // static and copied through as-is too.
  eleventyConfig.addPassthroughCopy({ assets: 'assets', 'css/main.css': 'css/main.css', js: 'js', 'src/admin': 'admin' });

  // 1 -> "01"
  eleventyConfig.addFilter('pad2', n => String(n).padStart(2, '0'));

  // Prefix a root-relative content path with the page's root ("" or "../").
  // Absolute URLs and scheme links (https:, mailto:, tel:) pass through.
  const root = (p, r) => (p == null ? '' : SCHEME.test(p) ? p : (r || '') + p);
  eleventyConfig.addFilter('root', root);

  // One image path -> its srcset candidate string, derived from disk: strip
  // the trailing "-<digits>" from the file name, glob the same directory for
  // "<base>-<w>.<ext>" siblings (the file itself included), and return them
  // sorted by width, root-prefixed: "a-860.webp 860w, a-1280.webp 1280w".
  // A file whose name has no trailing "-<digits>", or that has no sibling
  // widths on disk, returns "" (the template then omits the attribute).
  eleventyConfig.addFilter('srcset', (src, r) => {
    if (!src) return '';
    const m = /^(.*)-(\d+)(\.[A-Za-z0-9]+)$/.exec(src);
    if (!m) return '';
    const [, stem, , ext] = m;
    const dir = path.posix.dirname(src);
    const absDir = path.join(__dirname, dir);
    let files;
    try { files = fs.readdirSync(absDir); } catch (e) { return ''; }
    const base = path.posix.basename(stem);
    const escBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escExt = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escBase}-(\\d+)${escExt}$`);
    const cands = [];
    files.forEach(f => {
      const mm = re.exec(f);
      if (mm) cands.push({ w: parseInt(mm[1], 10), file: dir === '.' ? f : `${dir}/${f}` });
    });
    if (cands.length <= 1) return '';
    cands.sort((a, b) => a.w - b.w);
    return cands.map(c => `${root(c.file, r)} ${c.w}w`).join(', ');
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

  // Resolve a chrome link {href, slug?, overrides?} for the current page:
  // an override for this page wins; a link to the page itself becomes "./"
  // and is marked current; anything else is root-prefixed.
  eleventyConfig.addFilter('navlink', (link, slug, r) => {
    if (link.overrides && link.overrides[slug] != null) return { href: link.overrides[slug], current: false };
    if (link.slug && link.slug === slug) return { href: './', current: true };
    return { href: root(link.href, r), current: false };
  });

  // A block's motion setting: block.settings.motion[key], or the default
  // (today's value) when the block does not set it.
  eleventyConfig.addFilter('motion', (block, key, dflt) => {
    const m = block && block.settings && block.settings.motion;
    const v = m ? m[key] : undefined;
    return v === undefined || v === null || v === '' ? dflt : v;
  });

  // A block's background tone (data-tone): block.settings.background or the
  // type's own tone today.
  const TONES = ['plum', 'plum-2', 'ink', 'paper', 'transparent'];
  eleventyConfig.addFilter('tone', (block, dflt) => {
    const v = (block && block.settings && block.settings.background) || dflt;
    if (!TONES.includes(v)) throw new Error(`Block "${block && block.id}": unknown background "${v}" (one of ${TONES.join(', ')})`);
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
