'use strict';

const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../dist');
const target = path.resolve(__dirname, '../release/cable-breadboard-lab.html');
let html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');

function replaceAsset(tag, content) {
  if (!html.includes(tag)) throw new Error('Missing expected asset: ' + tag);
  // A replacement callback preserves literal dollar signs in the source code.
  html = html.replace(tag, () => content);
}

for (const file of ['style.css', 'editor.css']) {
  const css = fs.readFileSync(path.join(source, file), 'utf8').replace(/<\/style/gi, '<\\/style');
  replaceAsset(`<link rel="stylesheet" href="${file}">`, `<style>\n${css}\n</style>`);
}
for (const file of ['model.js', 'display-upgrade.js', 'routing.js', 'reference.js', 'app.js']) {
  const js = fs.readFileSync(path.join(source, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  replaceAsset(`<script src="${file}"></script>`, `<script>\n${js}\n</script>`);
}
html = html.replace('<title>接线工作台 · 八路数字电缆对线器</title>', '<title>接线工作台 · 离线版 v0.3.0</title>');
html = html.replace('本地工作区</span>', '离线 · v0.3.0</span>');
if (/<script\b[^>]*\bsrc=|<link\b[^>]*\brel=["']stylesheet["']/i.test(html)) {
  throw new Error('An external runtime asset remains in the offline page.');
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html, 'utf8');
console.log('Built release/cable-breadboard-lab.html (' + fs.statSync(target).size + ' bytes)');
