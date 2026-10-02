/**
 * Radharaman Ghera: can you walk in from the Parikrama Marg — gate, court of
 * houses, gate, court — up to the door, through the vestibule and its four
 * steps, and stand in the inner court before the deity?
 *
 * Every threshold here is a place to be stopped: two gateways 2.3 m wide, a
 * door 1.1 m wide in 0.8 m of wall, a flight inside a 1.6 m vestibule, and a
 * court floor that must meet the top step without overlapping it. So this
 * walks a real player through the whole sequence and watches his feet.
 *
 *   node tools/checks/ghera.mjs
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
  const loc = ctx.data.LOCATION_BY_ID.get('radha-raman');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const pos = ctx.player.position;
  const court = w.groundHeight(...P(1.5, 12));
  const place = (lx, lz) => { const q = P(lx, lz); pos.set(q[0], w.standHeight(q[0], q[1], 99), q[1]); };
  const go = (lx, lz, cap = 900) => {
    const [tx, tz] = P(lx, lz);
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, low = Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.5) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y);
      n++;
    }
    ctx.input.move.y = 0;
    const [ax, az] = L(pos.x, pos.z);
    return { at: [+ax.toFixed(2), +az.toFixed(2)], y: +(pos.y - court).toFixed(2), low: +(low - court).toFixed(2), miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2) };
  };
  const r = {};
  place(-17, 12.4);                      // on the Parikrama Marg, at the outer gate
  r.gate1 = go(-10.0, 12.4);             // through it into the first court
  r.gate2 = go(-6.0, 12.4);              // through the second gate
  r.court2 = go(2.85, 11.5);             // across the second court to the steps
  r.steps = go(2.85, 8.2);               // up them
  r.door = go(2.85, 6.6);                // through the door into the vestibule
  r.inner = go(2.85, 3.2);               // up the four steps into the court
  r.darshan = go(0.4, 0);                // to where you stand for darshan
  const vol = ctx.interior.volumes.find((v) => v.loc && v.loc.id === 'radha-raman');
  r.inside = vol ? ctx.interior._contains(vol, pos.x, pos.z, 1.0) : null;
  r.platform = go(-5.9, 0, 300);         // the platform: Goswamis only, the stairs were removed
  r.out = go(2.85, 4.0);
  r.down = go(2.85, 12.0);               // and back out to the court
  return r;
});
const near = (a, b2, tol) => Math.abs(a - b2) <= tol;
check('in through the outer gate from the Parikrama Marg', out.gate1.miss < 0.8, `${out.gate1.at}`);
check('through the second gate into the temple\'s court', out.gate2.miss < 0.8 && out.court2.miss < 0.8, `${out.gate2.at} then ${out.court2.at}`);
check('up the four steps to the plinth', out.steps.miss < 0.8 && near(out.steps.y, 0.45, 0.2), `${out.steps.at} at ${out.steps.y} m`);
check('through the 1.1 m door into the vestibule', out.door.miss < 0.8 && near(out.door.y, 0.6, 0.12), `${out.door.at} at ${out.door.y} m`);
check('up the vestibule\'s steps onto the court floor', out.inner.miss < 0.8 && near(out.inner.y, 1.2, 0.12) && out.inner.low > 0.4,
  `${out.inner.at} at ${out.inner.y} m, lowest ${out.inner.low} m`);
check('at the darshan point, inside the temple', out.darshan.miss < 0.8 && out.inside === true && near(out.darshan.y, 1.2, 0.1),
  `${out.darshan.at} at ${out.darshan.y} m, inside ${out.inside}`);
check('the antechamber platform is not climbed', out.platform.at[0] > -3.1, `stopped at lx ${out.platform.at[0]}`);
check('and back down and out into the court', out.out.miss < 0.8 && out.down.miss < 0.8 && near(out.down.y, 0, 0.15), `${out.down.at} at ${out.down.y} m`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
