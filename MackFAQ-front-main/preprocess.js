const fs = require('fs');
require('dotenv').config();

const embedder = fs.readFileSync('./_embedder.js').toString();
fs.writeFileSync('./public/embedder.js', embedder.replace(/\{\{VUE_APP_FRONT_HOST\}\}/, process.env.VUE_APP_FRONT_HOST || process.env.VUE_APP_API_HOST));