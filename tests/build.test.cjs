'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildOffline, checkOffline } = require('../scripts/build-offline.cjs');
const { packageRelease } = require('../scripts/package-release.cjs');
const { findTests } = require('../scripts/test.cjs');

function fixture(t, newline = '\n') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cable-build-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'dist'));
  const write = (file, text) => fs.writeFileSync(path.join(root, file), text.replace(/\n/g, newline));
  write('package.json', '{"version":"9.8.7"}\n');
  write('dist/index.html', '<!doctype html>\n<title>A changed source title</title>\n<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="editor.css">\n<a class="brand" href="./index.html">home</a>\n<span>本地工作区</span>\n' + ['model.js', 'display-upgrade.js', 'routing.js', 'app.js'].map(file => `<script src="${file}"></script>`).join('\n') + '\n');
  write('dist/style.css', 'body { color: #123; }\n');
  write('dist/editor.css', 'button { border: 0; }\n');
  for (const file of ['model.js', 'display-upgrade.js', 'routing.js', 'app.js']) write(`dist/${file}`, '// a script\n');
  return { root, write };
}

test('offline build uses package version, repairs standalone navigation and is LF/CRLF reproducible', t => {
  const lf = fixture(t), crlf = fixture(t, '\r\n');
  const first = buildOffline(lf.root), second = buildOffline(crlf.root);
  assert.equal(first.html, second.html);
  assert.match(first.html, /离线版 v9\.8\.7/);
  assert.match(first.html, /离线 · v9\.8\.7/);
  assert.match(first.html, /class="brand" href="#"/);
  assert(!first.html.includes('\r'));
  assert(!first.html.includes('<script src='));
  const left = packageRelease(lf.root), right = packageRelease(crlf.root);
  assert.deepEqual(fs.readFileSync(path.join(left.directory, left.files[1])), fs.readFileSync(path.join(right.directory, right.files[1])));
});

test('inline replacement preserves literal dollars and escapes script closing sequences', t => {
  const f = fixture(t), text = "$& $` $' </script>";
  f.write('dist/app.js', `const sample = ${JSON.stringify(text)};\n`);
  const { html } = buildOffline(f.root);
  assert(html.includes(text.replace('</script>', '<\\/script>')));
  assert.equal([...html.matchAll(/<\/script>/g)].length, 4);
});

test('embedded SVG title strings are not mistaken for the document title', t => {
  const f = fixture(t);
  f.write('dist/app.js', 'const svg = "<svg><title>part</title></svg>";');
  const { html } = buildOffline(f.root);
  assert.match(html, /<title>接线工作台 · 离线版 v9\.8\.7<\/title>/);
  assert(html.includes('<svg><title>part</title></svg>'));
});

test('HTML script parser traps fail explicitly before an offline artifact is emitted', t => {
  const f = fixture(t);
  for (const trap of ['<!--', '<script>']) {
    f.write('dist/app.js', `const trap = ${JSON.stringify(trap)};`);
    assert.throws(() => buildOffline(f.root), /parser trap in app\.js/);
  }
  assert(!fs.existsSync(path.join(f.root, 'release/cable-breadboard-lab.html')));
});

test('offline validation rejects relative navigation, loaded remote assets and CSS imports', t => {
  for (const html of ['<a href="other.html">page</a>', '<a href=other.html>page</a>', '<img src=https://example.org/image.png>', '<img src="https://example.org/image.png">', '<img srcset="data:image/png,0 1x, https://example.org/image.png 2x">', '<script src="other.js"></script>', '<style>@import "other.css";</style>', '<style>body{background:url(./image.png)}</style>']) {
    assert.throws(() => checkOffline(html), /Non-contained|external runtime|not self-contained|External CSS/i);
  }
  assert.doesNotThrow(() => checkOffline('<a href="https://www.ti.com/">manual</a><svg><use href="#icon"/></svg>'));
  const f = fixture(t);
  f.write('dist/editor.css', 'body {background:url(https://example.org/test.png)}');
  assert.throws(() => buildOffline(f.root), /External CSS url/);
});

test('missing or duplicate build markers fail rather than silently skipping version or assets', t => {
  const f = fixture(t), index = fs.readFileSync(path.join(f.root, 'dist/index.html'), 'utf8');
  f.write('dist/index.html', index.replace('本地工作区', 'changed status'));
  assert.throws(() => buildOffline(f.root), /workspace status, found 0/);
  f.write('dist/index.html', index + '<title>duplicate</title>');
  assert.throws(() => buildOffline(f.root), /page title, found 2/);
});

function readStoredZip(zip) {
  const entries = new Map();
  let cursor = 0;
  while (zip.readUInt32LE(cursor) === 0x04034b50) {
    assert.equal(zip.readUInt16LE(cursor + 8), 0, 'portable ZIP STORE entries');
    const size = zip.readUInt32LE(cursor + 18), nameLength = zip.readUInt16LE(cursor + 26), extraLength = zip.readUInt16LE(cursor + 28);
    const name = zip.subarray(cursor + 30, cursor + 30 + nameLength).toString('utf8');
    const start = cursor + 30 + nameLength + extraLength;
    entries.set(name, zip.subarray(start, start + size));
    cursor = start + size;
  }
  assert.equal(zip.readUInt32LE(cursor), 0x02014b50, 'ZIP central directory follows files');
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50, 'ZIP has an end record');
  assert.equal(zip.readUInt16LE(zip.length - 12), entries.size);
  return entries;
}

test('release packaging is reproducible, has a top directory and verifiable SHA256 assets', t => {
  const f = fixture(t);
  f.write('README.md', 'Example source package\n');
  fs.mkdirSync(path.join(f.root, '.git'));
  fs.writeFileSync(path.join(f.root, '.git/private'), 'private-history');
  fs.mkdirSync(path.join(f.root, 'review'));
  fs.writeFileSync(path.join(f.root, 'review/scratch.test.cjs'), 'private-review');
  const first = packageRelease(f.root);
  const readZip = () => fs.readFileSync(path.join(first.directory, first.files[1]));
  const bytes = readZip(), entries = readStoredZip(bytes);
  assert([...entries.keys()].every(name => name.startsWith('cable-breadboard-lab-v9.8.7/')));
  assert.equal(entries.get('cable-breadboard-lab-v9.8.7/README.md').toString(), 'Example source package\n');
  assert(entries.has('cable-breadboard-lab-v9.8.7/release/cable-breadboard-lab.html'));
  assert(!bytes.includes(Buffer.from('private-history')));
  assert(!bytes.includes(Buffer.from('private-review')));
  for (const line of first.hashes.trim().split('\n')) {
    const [hash, name] = line.split('  ');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(first.directory, name))).digest('hex'), hash);
  }
  packageRelease(f.root);
  assert.deepEqual(readZip(), bytes);
});

test('test discovery includes new nested tests and excludes review scratch files', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'tests/nested'), { recursive: true });
  fs.mkdirSync(path.join(f.root, 'review'));
  f.write('tests/a.test.cjs', '');
  f.write('tests/nested/b.test.cjs', '');
  f.write('tests/helper.cjs', '');
  f.write('review/scratch.test.cjs', '');
  assert.deepEqual(findTests(path.join(f.root, 'tests')).map(file => path.relative(f.root, file).replace(/\\/g, '/')), ['tests/a.test.cjs', 'tests/nested/b.test.cjs']);
});
