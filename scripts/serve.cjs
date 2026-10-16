'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || process.argv[2] || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};
const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end('Method not allowed');
  }
  let pathname;
  try {
    // Decode before resolving so encoded separators and traversal are checked too.
    pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  } catch {
    response.writeHead(400);
    return response.end('Invalid path');
  }
  if (pathname.includes('\0') || pathname.includes('\\')) {
    response.writeHead(400);
    return response.end('Invalid path');
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    response.writeHead(403);
    return response.end('Forbidden');
  }
  try {
    // Reject symlinks that resolve outside dist even when the URL itself is safe.
    const real = await fs.realpath(file);
    const realRelative = path.relative(root, real);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      response.writeHead(403);
      return response.end('Forbidden');
    }
    const stat = await fs.stat(real);
    if (!stat.isFile()) {
      response.writeHead(404);
      return response.end('Not found');
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(real)] || 'application/octet-stream',
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    });
    response.end(request.method === 'HEAD' ? undefined : await fs.readFile(real));
  } catch (error) {
    if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    response.end(error.code === 'ENOENT' ? 'Not found' : 'Unable to read file');
  }
});
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`接线工作台：http://127.0.0.1:${port}`);
  console.log('Press Ctrl+C to stop.');
});
