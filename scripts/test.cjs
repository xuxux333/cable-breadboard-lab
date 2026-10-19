'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Restrict discovery to tests/ so local audit and scratch scripts never run.
function findTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return findTests(file);
    return entry.isFile() && /\.test\.cjs$/.test(entry.name) ? [file] : [];
  }).sort();
}

if (require.main === module) {
  const files = findTests(path.resolve(__dirname, '../tests'));
  if (!files.length) throw new Error('No tests found in tests/.');
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}

module.exports = { findTests };
