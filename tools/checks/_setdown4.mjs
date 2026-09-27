/** Probe 4: does the set-down drift as the nav graph warms? And how often is it inside? */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(8796, r));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8796/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.interior, null, { timeout: 60000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(600);

const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw, I = ctx.interior;
  const L = ctx.data.LOCATIONS.filter((l) => l.build);
  const sample = () => L.map((l) => {
    const s = r._setDown(l);
    const v = I.volumes.find((q) => I._contains(q, s[0], s[1], 0.82));
    return { id: l.id, d: +Math.hypot(s[0]-l.pos[0], s[1]-l.pos[1]).toFixed(1),
      in: v ? (v.loc ? v.loc.id : 'house') : null,
      clear: ctx.world.isClear(s[0], s[1], 0.35) };
  });
  const cold = sample();
  // warm the graph the way normal play does: lots of drivable A* calls
  let paths = 0;
  for (const a of L) for (const bb of L) {
    if (a === bb) continue;
    if (Math.random() > 0.12) continue;
    if (ctx.nav.path(a.pos[0], a.pos[1], bb.pos[0], bb.pos[1], true)) paths++;
  }
  const warm = sample();
  // count measured/closed edges
  let seen = 0, shut = 0;
  for (const n of ctx.nav._list) for (const e of n.edges) { if (e.open !== undefined) { seen++; if (!e.open) shut++; } }
  const moved = cold.map((c, i) => ({ id: c.id, cold: c.d, warm: warm[i].d, coldIn: c.in, warmIn: warm[i].in,
    coldClear: c.clear, warmClear: warm[i].clear })).filter((q) => q.cold !== q.warm || q.coldIn !== q.warmIn);
  return { paths, seen, shut, moved,
    coldInside: cold.filter((q) => q.in).map((q) => q.id + '->' + q.in),
    warmInside: warm.filter((q) => q.in).map((q) => q.id + '->' + q.in),
    coldSolid: cold.filter((q) => !q.clear).map((q) => q.id),
    warmSolid: warm.filter((q) => !q.clear).map((q) => q.id) };
});
console.log(JSON.stringify(out, null, 2));
await b.close(); server.close();
