// Every content/pages/*.json, keyed by file name (home, speaking, ...).
// Adds `root`: the relative prefix from the page's folder back to the site
// root ("" for "/", "../" for "/speaking/"), used to prefix every stored path.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '../../content/pages');
module.exports = () => {
  const out = {};
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const depth = String(data.permalink || '/').split('/').filter(Boolean).length;
    data.root = '../'.repeat(depth);
    out[path.basename(f, '.json')] = data;
  }
  return out;
};
