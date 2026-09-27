/**
 * Dev server for phone testing.
 *
 *   node tools/dev-server.mjs
 *
 * Serves client/ on every network interface and prints the URL to open on your
 * phone. Same Wi-Fi, no install, no rebuild — edit a file, pull to refresh, see
 * it. This is the iteration loop; the APK is only for testing real app
 * behaviour like haptics, fullscreen and true offline.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client');
const PORT = Number(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    // never cache during development, or the phone will serve you yesterday
    'cache-control': 'no-store, must-revalidate',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const n of nets[name]) {
      if (n.family === 'IPv4' && !n.internal) addrs.push(n.address);
    }
  }
  console.log('\n  VRINDAVAN DHAM — dev server\n');
  console.log(`  on this Mac       http://localhost:${PORT}`);
  for (const a of addrs) console.log(`  on your phone     http://${a}:${PORT}`);
  console.log('\n  Same Wi-Fi. Open it in Chrome or Safari, then Add to Home Screen');
  console.log('  to get it fullscreen with no browser chrome.\n');
});
