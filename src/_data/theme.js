// Design tokens: content/theme.json -> css/tokens.css.njk
const fs = require('fs');
const path = require('path');
module.exports = () => JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/theme.json'), 'utf8'));
