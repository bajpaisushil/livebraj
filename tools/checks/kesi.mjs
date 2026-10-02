/**
 * Jugal Kishor: can you come up the axial flight onto the platform where the
 * porch was, and keep darshan at the locked door — and are the door and the
 * plinth really shut?
 *
 *   node tools/checks/kesi.mjs
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const __PORT = server.address().port;

const res = []; const check = (n, pass, d) => { res.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui, null, { timeout: 160000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(900);

const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('jugal-kishore');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const pos = ctx.player.position;
  const court = w.groundHeight(...P(0, 18));
  const place = (lx, lz) => { const q = P(lx, lz); pos.set(q[0], w.standHeight(q[0], q[1], 99), q[1]); };
  const go = (lx, lz, cap = 900) => {
    const [tx, tz] = P(lx, lz);
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, low = Infinity, west = Infinity, high = -Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.5) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y); high = Math.max(high, pos.y);
      west = Math.min(west, L(pos.x, pos.z)[0]);
      n++;
    }
    ctx.input.move.y = 0;
    const [ax, az] = L(pos.x, pos.z);
    return { at: [+ax.toFixed(2), +az.toFixed(2)], y: +(pos.y - court).toFixed(2), low: +(low - court).toFixed(2), miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), west: +west.toFixed(2), high: +(high - court).toFixed(2) };
  };
  const r = {};
  place(0, 20);                          // east of the temple, on the lane
  r.steps = go(0, 13.0);                 // up the axial flight
  r.platform = go(0, 10.4);              // onto the platform, at the door
  const a = w.anchorFor ? w.anchorFor('jugal-kishore') : null;
  r.darshanAt = a && a.darshan ? L(a.darshan.x, a.darshan.z).map((v) => +v.toFixed(2)) : null;
  r.door = go(0, 6.0, 150);              // the door is locked: you stop at it
  go(0, 13.5); go(9.0, 13.5);
  r.side = go(9.0, 4.0);                 // along the north side
  r.plinth = go(0.0, 4.0, 150);          // and the plinth is not walked up onto from the side
  return r;
});
const near = (a, b2, tol) => Math.abs(a - b2) <= tol;
check('up the axial flight onto the platform', out.steps.miss < 0.8 && out.platform.miss < 0.8 && near(out.platform.y, 1.1, 0.12),
  `${out.platform.at} at ${out.platform.y} m`);
check('darshan is kept on the platform, at the door', !!out.darshanAt && near(out.darshanAt[1], 10.5, 0.6) && near(out.darshanAt[0], 0, 0.5), `${out.darshanAt}`);
check('the door is locked: you stop at it', out.door.west === undefined ? out.door.at[1] > 9.3 : out.door.at[1] > 9.3, `stopped at lz ${out.door.at[1]}`);
check('the plinth holds you off from the side', out.side.miss < 0.8 && out.plinth.at[0] > 5.0 && out.plinth.high < 0.6,
  `${out.side.at}, stopped at lx ${out.plinth.at[0]}, at most ${out.plinth.high} m`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
