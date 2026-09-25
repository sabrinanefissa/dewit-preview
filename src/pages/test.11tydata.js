// The /test/ page only builds when TEST_PAGE=1 (it proves the block system
// on a page nobody links to; it must not ship on an ordinary build).
module.exports = {
  eleventyComputed: {
    permalink: () => (process.env.TEST_PAGE === '1' ? '/test/' : false),
  },
};
