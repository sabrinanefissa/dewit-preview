/* Eleventy build: content/*.json -> src/_includes templates -> _site/.
   assets/, css/ and js/ are copied through untouched. */
const SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // https:, mailto:, tel:, //host

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ assets: 'assets', css: 'css', js: 'js' });

  // 1 -> "01"
  eleventyConfig.addFilter('pad2', n => String(n).padStart(2, '0'));

  // Prefix a root-relative content path with the page's root ("" or "../").
  // Absolute URLs and scheme links (https:, mailto:, tel:) pass through.
  const root = (p, r) => (p == null ? '' : SCHEME.test(p) ? p : (r || '') + p);
  eleventyConfig.addFilter('root', root);

  // [{src, w}] -> "a.webp 520w, b.webp 860w" (each src root-prefixed)
  eleventyConfig.addFilter('srcset', (list, r) =>
    (list || []).map(s => `${root(s.src, r)} ${s.w}w`).join(', '));

  // 7000 -> "7,000"
  eleventyConfig.addFilter('thousands', n => Number(n).toLocaleString('en-US'));

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
