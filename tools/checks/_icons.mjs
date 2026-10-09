/**
 * Draw the home-screen icons in client/assets/icons/.
 *
 *   node tools/checks/_icons.mjs
 *
 * Not a check — a one-off, kept so the icons can be made again rather than
 * being four PNGs nobody knows the origin of. It lives here only because this
 * is where Playwright is installed.
 *
 * The icon is the loading screen, which is the first thing anyone sees: वृ, the
 * first syllable of वृन्दावन, in marigold on the same night-brown radial the
 * curtain uses, set in the vendored Tiro Devanagari so it is the very glyph the
 * game draws. Chromium draws it on a canvas and the canvas is the PNG — no image
 * tooling, and nothing that is not already in the repository.
 *
 * The glyph is centred on its INK, measured, not on its line box. Devanagari
 * hangs its vowel signs below the headline, so a glyph centred the way CSS
 * centres text sits visibly low; the first draft of this did exactly that.
 *
 * Three shapes, because the platforms want three different things:
 *
 *   any       a rounded tile with transparent corners, for a desktop shelf or a
 *             launcher that shows the icon as it is drawn.
 *   maskable  full bleed, glyph kept well inside the central 80% circle.
 *             Android crops a maskable icon to its own shape (circle, squircle,
 *             teardrop) and anything outside that safe zone can be cut away.
 *             Without one, Chrome shrinks the "any" icon onto a white disc,
 *             which is the default every un-iconed web app gets.
 *   apple     full bleed, opaque. iOS rounds the corners itself and paints any
 *             transparency black.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.cwd(), 'client');
const OUT = path.join(ROOT, 'assets/icons');
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2' };

const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') {
    r.writeHead(200, { 'content-type': T['.html'] });
    // the glyph must be laid out once for the face to be fetched at all
    r.end('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/vendor/fonts/fonts.css">'
      + '<span style="font-family:\'Tiro Devanagari Hindi\'">वृ</span>');
    return;
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const ICONS = [
  ['icon-192.png', 192, 'any'],
  ['icon-512.png', 512, 'any'],
  ['icon-maskable-512.png', 512, 'maskable'],
  ['apple-touch-icon.png', 180, 'apple'],
];

fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`http://localhost:${PORT}/`);
await p.evaluate(() => document.fonts.ready);
const loaded = await p.evaluate(() => document.fonts.check('40px "Tiro Devanagari Hindi"', 'वृ'));
if (!loaded) throw new Error('Tiro Devanagari did not load — the icon would be drawn in a fallback face');

for (const [name, size, shape] of ICONS) {
  const png = await p.evaluate(({ size, shape }) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');

    if (shape === 'any') {
      // rounded tile; the corners stay transparent
      const r = size * 0.22;
      g.beginPath();
      g.moveTo(r, 0);
      g.arcTo(size, 0, size, size, r);
      g.arcTo(size, size, 0, size, r);
      g.arcTo(0, size, 0, 0, r);
      g.arcTo(0, 0, size, 0, r);
      g.closePath();
      g.clip();
    }
    // the loading curtain's radial: warm at the top-centre, night at the edges
    const bg = g.createRadialGradient(size * 0.5, size * 0.4, 0, size * 0.5, size * 0.4, size * 0.75);
    bg.addColorStop(0, '#2a1c14');
    bg.addColorStop(1, '#120c08');
    g.fillStyle = bg;
    g.fillRect(0, 0, size, size);

    // ink height as a share of the tile: smaller for maskable, whose safe zone
    // is a circle of radius 40%
    const inkH = size * (shape === 'maskable' ? 0.42 : 0.56);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = '100px "Tiro Devanagari Hindi"';
    const m100 = g.measureText('वृ');
    const px = 100 * inkH / (m100.actualBoundingBoxAscent + m100.actualBoundingBoxDescent);
    g.font = `${px}px "Tiro Devanagari Hindi"`;
    const m = g.measureText('वृ');
    // baseline placed so the ink box is centred; then lifted a touch, because
    // the hanging vowel sign is light and the eye centres on the heavy body
    const y = size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 - size * 0.015;
    const x = size / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
    g.shadowColor = 'rgba(232,150,31,.30)';
    g.shadowBlur = size * 0.06;
    g.fillStyle = '#e8961f';
    g.fillText('वृ', x, y);
    return c.toDataURL('image/png');
  }, { size, shape });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`  ${name.padEnd(24)} ${size}x${size}  ${shape.padEnd(8)}  ${fs.statSync(file).size} bytes`);
}
await b.close();
server.close();
