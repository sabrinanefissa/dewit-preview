// Site-wide chrome: content/site.json
const fs = require('fs');
const path = require('path');
module.exports = () => JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/site.json'), 'utf8'));
