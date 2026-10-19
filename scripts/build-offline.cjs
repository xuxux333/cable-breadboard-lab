'use strict';

const fs = require('node:fs');
const path = require('node:path');
function readText(file) {
  try {
    // LF normalization also makes an existing CRLF worktree reproducible.
    return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  } catch (error) {
    throw new Error(`Unable to read build input ${path.basename(file)}: ${error.message}`);
  }
}

function checkCss(css, file) {
  if (/@import\b/i.test(css)) throw new Error(`CSS @import is not self-contained: ${file}`);
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!/^(?:data:|#)/i.test(match[2])) throw new Error(`External CSS url() in ${file}`);
  }
}

function checkOffline(html) {
  if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel\s*=\s*["']stylesheet["']/i.test(html)) {
    throw new Error('An external runtime asset remains in the offline page.');
  }
  // Inspect markup, not HTML strings used by the application renderer.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  for (const match of markup.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)) {
    for (const attr of match[0].matchAll(/\b(href|src|poster|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const name = attr[1], value = attr[2] ?? attr[3] ?? attr[4];
      if (name.toLowerCase() === 'srcset') throw new Error('Non-contained srcset requires explicit inlining.');
      if (value.startsWith('#') || /^data:/i.test(value)) continue;
      if (name.toLowerCase() === 'href' && match[1].toLowerCase() === 'a' && /^https?:\/\//i.test(value)) continue;
      throw new Error(`Non-contained ${name} in offline markup: ${value}`);
    }
  }
  for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) checkCss(style[1], 'inline style');
}

function buildOffline(root = path.resolve(__dirname, '..')) {
  const source = path.join(root, 'dist');
  const target = path.join(root, 'release/cable-breadboard-lab.html');
  const { version } = JSON.parse(readText(path.join(root, 'package.json')));
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('Invalid package version.');
  let html = readText(path.join(source, 'index.html'));

  function replaceOnce(pattern, replacement, label) {
    const matches = typeof pattern === 'string' ? html.split(pattern).length - 1 : [...html.matchAll(new RegExp(pattern.source, 'gi'))].length;
    if (matches !== 1) throw new Error(`Expected exactly one ${label}, found ${matches}.`);
    // A replacement callback preserves literal dollar signs in the source code.
    html = html.replace(pattern, () => replacement);
  }

  // Edit the document shell before inlining JS that may contain SVG <title> strings.
  replaceOnce(/<title>[^<]*<\/title>/i, `<title>接线工作台 · 离线版 v${version}</title>`, 'page title');
  replaceOnce('本地工作区</span>', `离线 · v${version}</span>`, 'workspace status');
  // Older source versions used a home link that breaks next to the standalone file.
  html = html.replace(/\bhref\s*=\s*(["'])\.\/index\.html\1/gi, 'href="#"');

  for (const file of ['style.css', 'editor.css']) {
    const css = readText(path.join(source, file));
    checkCss(css, file);
    if (/<\/style/i.test(css)) throw new Error(`HTML raw-text closing tag in ${file}`);
    replaceOnce(`<link rel="stylesheet" href="${file}">`, `<style>\n${css}\n</style>`, file);
  }
  for (const file of ['model.js', 'display-upgrade.js', 'routing.js', 'app.js']) {
    const js = readText(path.join(source, file));
    // HTML enters special parser states for these sequences even in JS strings.
    // Reject them rather than rewriting arbitrary JavaScript syntax.
    if (/<!--|<script\b/i.test(js)) throw new Error(`HTML script parser trap in ${file}`);
    const escaped = js.replace(/<\/script/gi, '<\\/script');
    replaceOnce(`<script src="${file}"></script>`, `<script>\n${escaped}\n</script>`, file);
  }
  checkOffline(html);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');
  return { target, html, version };
}

if (require.main === module) {
  const { target } = buildOffline();
  console.log(`Built release/${path.basename(target)} (${fs.statSync(target).size} bytes)`);
}

module.exports = { buildOffline, checkOffline, readText };
