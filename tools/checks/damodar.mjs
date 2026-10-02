/**
 * Radha Damodar: can you come up the lane, through the portal, across the
 * court and up the hall's steps to the darshan point — and from the court
 * along the passage into Srila Prabhupada's room, on to Rupa Goswami's
 * samadhi in the north yard, and round into the south yard?
 *
 * The plan inside the compound is inferred, so the one thing that must be
 * true of it is that every place in it can be walked to.
 *
 *   node tools/checks/damodar.mjs
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
  const loc = ctx.data.LOCATION_BY_ID.get('radha-damodar');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const pos = ctx.player.position;
  const court = w.groundHeight(...P(15, 4));
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
  place(30, -0.6);                       // on the lane, east of the gate
  r.portal = go(19.5, 1.9);              // through the portal and the gatehouse
  r.court = go(14.0, 4.9);               // into the court
  r.steps = go(10.6, 4.9);               // up the hall's steps
  r.darshan = go(6.6, 4.9);              // to the darshan point
  const vol = ctx.interior.volumes.find((v) => v.loc && v.loc.id === 'radha-damodar');
  r.inside = vol ? ctx.interior._contains(vol, pos.x, pos.z, 1.0) : null;
  // the table and the altar line hold you short of the Deities. Pushed into
  // them for long, the player's own unsticking sets him down elsewhere (here,
  // in the passage beyond the hall's wall), so the walk is short and judged
  // by how far west it got
  r.altar = go(2.6, 4.9, 120);
  r.back = go(11.5, 4.9);
  r.toPass = go(11.0, -1.1);             // the court's north-west corner
  r.pass = go(3.6, -1.1);                // along the passage north of the hall
  r.room = go(3.4, -3.4);                // into Prabhupada's room
  const room = ctx.interior.volumes.find((v) => v.loc && v.loc.id === 'radha-damodar-prabhupada');
  r.inRoom = room ? ctx.interior._contains(room, pos.x, pos.z, 1.0) : null;
  go(3.6, -1.1);
  r.turn = go(-0.1, -1.1);
  r.north = go(-0.1, -9.0);              // north into the samadhi yard
  r.rupa = go(-2.7, -14.6);              // before Rupa Goswami's samadhi
  go(-0.1, -9.0); go(-0.1, -1.1); go(9.0, -1.1); go(11.5, 1.0);
  r.southGo = go(10.4, 11.5);            // round the hall's corner
  r.south = go(0.0, 15.2);               // into the south yard, before Jiva and Krishnadas
  return r;
});
const near = (a, b2, tol) => Math.abs(a - b2) <= tol;
check('up the lane and through the portal into the court', out.portal.miss < 0.8 && out.court.miss < 0.8, `${out.portal.at} then ${out.court.at}`);
check('up the hall\'s steps to the darshan point, inside the temple', out.steps.miss < 0.8 && out.darshan.miss < 0.8 && near(out.darshan.y, 1.0, 0.12) && out.inside === true,
  `${out.darshan.at} at ${out.darshan.y} m, inside ${out.inside}`);
// the altar line is 0.5 m deep at lx 3.6, so a body stops at 4.27; and the
// shila's table is not stood on
check('the altar line keeps you before the Deities, and nobody stands on the shila\'s table', out.altar.west > 4.2 && out.altar.low > 0.9 && out.altar.high < 1.15,
  `got to lx ${out.altar.west}, between ${out.altar.low} and ${out.altar.high} m`);
check('along the passage into Srila Prabhupada\'s room', out.pass.miss < 0.8 && out.room.miss < 0.8 && out.inRoom === true, `${out.room.at}, inside ${out.inRoom}`);
check('north into the samadhi yard, to Rupa Goswami\'s samadhi', out.turn.miss < 0.8 && out.north.miss < 0.8 && out.rupa.miss < 0.8, `${out.north.at} then ${out.rupa.at}`);
check('round into the south yard, before Jiva and Krishnadas', out.southGo.miss < 0.8 && out.south.miss < 0.8, `${out.southGo.at} then ${out.south.at}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
