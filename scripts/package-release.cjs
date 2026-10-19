'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildOffline } = require('./build-offline.cjs');

const sourceDirectories = ['.github', 'dist', 'docs', 'scripts', 'tests'];
const sourceFiles = ['.editorconfig', '.gitattributes', '.gitignore', 'package.json', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];
const isText = name => /\.(?:html|css|js|cjs|json|md|yml|yaml|txt)$/.test(name) || ['LICENSE', '.editorconfig', '.gitattributes', '.gitignore'].includes(path.basename(name));
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');

function collectSources(root) {
  const files = [];
  function visit(relative) {
    const info = fs.lstatSync(path.join(root, relative));
    // A source package must never copy a symlink into private directories.
    if (info.isSymbolicLink()) throw new Error(`Symlinks cannot be packaged: ${relative}`);
    if (info.isDirectory()) {
      for (const name of fs.readdirSync(path.join(root, relative))) visit(`${relative}/${name}`);
    } else if (info.isFile()) files.push(relative);
  }
  for (const relative of [...sourceDirectories, ...sourceFiles]) {
    if (fs.existsSync(path.join(root, relative))) visit(relative);
  }
  return files.sort();
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP STORE avoids platform-dependent compressor output. Fixed timestamps,
// sorted UTF-8 paths and normalized text produce the same bytes on all hosts.
function createZip(entries) {
  const records = [], directory = [];
  let offset = 0;
  for (const entry of entries) {
    if (entry.name.startsWith('/') || entry.name.split('/').some(p => p === '..') || entry.name.includes('\\')) throw new Error('Unsafe ZIP path.');
    const name = Buffer.from(entry.name, 'utf8'), data = Buffer.from(entry.data), crc = crc32(data);
    if (name.length > 0xffff || data.length > 0xffffffff) throw new Error('ZIP entry is too large.');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(33, 12); // 1980-01-01, 00:00:00
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    records.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    directory.push(central, name);
    offset += local.length + name.length + data.length;
  }
  if (entries.length > 0xffff) throw new Error('Too many ZIP entries.');
  const centralData = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, centralData, end]);
}

function packageRelease(root = path.resolve(__dirname, '..')) {
  const built = buildOffline(root);
  const name = `cable-breadboard-lab-v${built.version}`;
  const htmlName = path.basename(built.target), zipName = `${name}.zip`;
  const entries = collectSources(root).map(relative => {
    let data = fs.readFileSync(path.join(root, relative));
    if (isText(relative)) data = Buffer.from(data.toString('utf8').replace(/\r\n?/g, '\n'));
    return { name: `${name}/${relative}`, data };
  });
  entries.push({ name: `${name}/release/${htmlName}`, data: Buffer.from(built.html) });
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const zip = createZip(entries), release = path.dirname(built.target);
  fs.writeFileSync(path.join(release, zipName), zip);
  const hashes = `${sha256(built.html)}  ${htmlName}\n${sha256(zip)}  ${zipName}\n`;
  fs.writeFileSync(path.join(release, 'SHA256SUMS.txt'), hashes);
  // Verify written files, so disk-write problems fail before publication.
  for (const line of hashes.trim().split('\n')) {
    const [expected, file] = line.split('  ');
    if (sha256(fs.readFileSync(path.join(release, file))) !== expected) throw new Error(`Checksum mismatch: ${file}`);
  }
  return { version: built.version, directory: release, files: [htmlName, zipName, 'SHA256SUMS.txt'], hashes };
}

if (require.main === module) {
  const result = packageRelease();
  console.log(`Packaged v${result.version} in release/:\n${result.files.join('\n')}`);
  console.log(result.hashes.trim());
}

module.exports = { packageRelease, createZip, collectSources, sha256 };
