// Cache-bust value for css/js: the short git SHA (Vercel's env var, or git
// itself locally), or a timestamp when neither is available.
const { execSync } = require('child_process');
module.exports = () => {
  let v = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
  if (!v) {
    try { v = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
  }
  return { v: v || String(Date.now()) };
};
