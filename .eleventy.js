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

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
};
