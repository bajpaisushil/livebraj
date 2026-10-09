/**
 * Does a passenger sit IN the vehicle — and stay sitting?
 *
 * Every ride put the passenger's head through the roof. Two faults: the
 * seat height was applied to the soles of a standing body, so the hips sat at
 * 1.5 m; and the sitting-down action ended after 1.4 s, so the passenger
 * stood up for the rest of the journey (its last key says `hold`, and nothing
 * honoured it). And the roofs were 1.47 m for everything, where an e-rickshaw
 * stands 1.73-1.87 m and an auto 1.70. This boards each kind of hired vehicle
 * through the game's own loop and measures the seated body against the roof,
 * the moment the ride sets off and again twenty seconds into it.
 *
 *   node tools/checks/seated.mjs
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.addInitScript(() => { let app = null; Object.defineProperty(window, 'vrindavan', { configurable: true, get: () => app,
  set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; } }); });
await p.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.crowd?.vehicleInst && window.vrindavan?.ctx?.ui, null, { timeout: 200000 });
const out = await p.evaluate(() => {
  const app = window.vrindavan, ctx = app.ctx, r = ctx.rickshaw;
  ctx.clock.getDelta = () => 1 / 30;
  ctx.renderer.render = () => {};
  ctx.ui._endIntro(); ctx.ui.show('world');
  for (let i = 0; i < 30; i++) app._frame();
  const Box3 = ctx.player.root.position.constructor; // Vector3 — find Box3 via the scene
  const rows = [];
  for (const [idx, id] of [[0, 'cycle-rickshaw'], [1, 'e-rickshaw'], [2, 'auto'], [3, 'tempo'], [4, 'taxi']]) {
    r.leave(); for (let i = 0; i < 3; i++) app._frame();
    const from = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
    ctx.player.placeAt(ctx, from.pos[0], from.pos[1]);
    const v = ctx.crowd.vehicleInst[idx].agents.find((a) => !a.personal);
    for (const sl of ctx.crowd.vehicleInst) for (const a of sl.agents) if (a !== v && Math.hypot(a.x - from.pos[0], a.z - from.pos[1]) < 30) a.x += 300;
    v.chartered = false; v.x = ctx.player.position.x + 3; v.z = ctx.player.position.z; v.vel = 0;
    r._acc = 99; r.update(0.5, ctx); r.board();
    for (let i = 0; i < 90; i++) app._frame();
    const el = document.querySelector('.rk-row[data-go="iskcon-krishna-balaram"], [data-go="iskcon-krishna-balaram"]');
    el.click(); r.startRide();
    // the highest point of the seated body, from every mesh under the player's root
    const P = new (ctx.player.root.position.constructor)();
    // the body's highest and lowest points above the road: the crown and the
    // soles. Standing up does not move the crown — the hips are on the seat
    // either way — it straightens the legs, and the soles go through the floor
    const extent = () => {
      ctx.player.root.updateMatrixWorld(true);
      let top = -Infinity, bot = Infinity;
      ctx.player.root.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          P.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (P.y > top) top = P.y; if (P.y < bot) bot = P.y;
        }
      });
      const car = r.ride.car, g = ctx.world.groundHeight(car.x, car.z);
      return { crown: top - g, soles: bot - g };
    };
    for (let i = 0; i < 60; i++) app._frame();
    const early = extent();
    for (let i = 0; i < 600 && r.ride; i++) app._frame();
    if (!r.ride) { rows.push({ id, why: 'arrived before the second look' }); continue; }
    const later = extent();
    const V = r.vehicle;
    const roof = V.canopy ? V.h - 0.12 : V.h;
    rows.push({ id, roof: +roof.toFixed(3), early: +early.crown.toFixed(3), later: +later.crown.toFixed(3),
      solesEarly: +early.soles.toFixed(3), solesLater: +later.soles.toFixed(3),
      action: ctx.player._action ? ctx.player._action.name : null });
  }
  return rows;
});
const results = [];
const check = (n, pass, d) => { results.push(!!pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
for (const row of out) {
  if (row.why) { check(`${row.id}: measured`, false, row.why); continue; }
  // under the roof, and not sunk into the floor: a seated adult's crown is
  // well up under a rickshaw's canopy, within a quarter-metre of it
  check(`${row.id}: the passenger's head is under the roof, feet on the floor`,
    row.early <= row.roof && row.early >= row.roof - 0.25 && row.solesEarly > -0.1,
    `crown ${row.early} m, roof underside ${row.roof} m; soles ${row.solesEarly} m`);
  check(`${row.id}: ...and twenty seconds on, still sitting`,
    row.later <= row.roof && row.solesLater > -0.1 && Math.abs(row.solesLater - row.solesEarly) < 0.05 && row.action === 'sit',
    `crown ${row.later} m, soles ${row.solesLater} m, action ${row.action}`);
}
console.log('');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed`);
await b.close(); server.close();
process.exit(passed === results.length ? 0 : 1);
