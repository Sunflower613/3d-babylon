import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.resolve(repoRoot, 'dist-blueprint-test');
const host = process.env.BLUEPRINT_STATIC_HOST || '0.0.0.0';
const port = Number(process.env.BLUEPRINT_STATIC_PORT || 3000);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp'
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);

  if (cleanPath === '/' || cleanPath === '/blueprint3d-babylon/example' || cleanPath === '/blueprint3d-babylon/example/' || cleanPath === '/blueprint3d-babylon/example/index.html') {
    return path.join(distRoot, 'index.html');
  }

  if (cleanPath === '/__health') {
    return '__health__';
  }

  const candidates = [];
  if (cleanPath.startsWith('/blueprint3d-babylon/example/')) {
    candidates.push(cleanPath.slice('/blueprint3d-babylon/example/'.length));
  }
  if (cleanPath.startsWith('/assets/')) {
    candidates.push(cleanPath.slice(1));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(distRoot, candidate);
    if (resolved.startsWith(distRoot + path.sep) || resolved === distRoot) {
      return resolved;
    }
  }

  return null;
}

function pickEncoding(req, ext) {
  if (!['.html', '.js', '.css', '.json', '.svg'].includes(ext)) return null;
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (/\bbr\b/.test(acceptEncoding)) return 'br';
  if (/\bgzip\b/.test(acceptEncoding)) return 'gzip';
  return null;
}

const server = http.createServer((req, res) => {
  const target = resolveRequestPath(req.url || '/');

  if (target === '__health__') {
    return send(res, 200, JSON.stringify({ ok: true, mode: 'blueprint-static', distRoot }), {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
  }

  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  const ext = path.extname(target).toLowerCase();
  const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  const headers = {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl,
    'Vary': 'Accept-Encoding'
  };
  const encoding = pickEncoding(req, ext);
  if (encoding === 'br') {
    headers['Content-Encoding'] = 'br';
  } else if (encoding === 'gzip') {
    headers['Content-Encoding'] = 'gzip';
  }
  res.writeHead(200, headers);

  const stream = fs.createReadStream(target);
  if (encoding === 'br') {
    stream.pipe(zlib.createBrotliCompress()).pipe(res);
    return;
  }
  if (encoding === 'gzip') {
    stream.pipe(zlib.createGzip()).pipe(res);
    return;
  }
  stream.pipe(res);
});

server.listen(port, host, () => {
  console.log(`[blueprint-static] serving ${distRoot} on http://${host}:${port}`);
});

server.on('error', (error) => {
  console.error('[blueprint-static] server error:', error);
  process.exitCode = 1;
});
