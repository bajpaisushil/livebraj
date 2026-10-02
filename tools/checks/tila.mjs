/**
 * Madan Mohan's mound: can you climb it, walk its court, go into the old
 * temple, and come down and take darshan in the new one?
 *
 * The tila is built, not terrain: a court 9.5 m up on floor strips over the
 * precinct's own outline, one stair on its west face, and a new temple at
 * street level across the lane. Each of those is a place a pilgrim can be
 * stranded — a sliver between the top tread and the court, a strip that stops
 * short of the parapet, a doorway with no floor through the wall, a ledge you
 * fall onto and cannot leave — so this walks a real player through all of it
 * and watches his feet.
 *
 *   node tools/checks/tila.mjs
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
  const loc = ctx.data.LOCATION_BY_ID.get('madan-mohan');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const pos = ctx.player.position;
  // the builder stands its levels on the highest ground under each footprint
  let yG = -Infinity;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
    const q = P(-31 + 62 * i / 6, -29 + 58 * j / 6);
    yG = Math.max(yG, w.groundHeight(q[0], q[1]));
  }
  const court = w.colliders.find((c) => c.tag === 'mm-court');
  const COURT = court ? court.top : NaN;
  const place = (lx, lz) => { const q = P(lx, lz); pos.set(q[0], w.standHeight(q[0], q[1], 99), q[1]); };
  // walk toward a builder-frame point; the lowest the feet went over the mound is the thing to watch
  const go = (lx, lz, cap = 900) => {
    const [tx, tz] = P(lx, lz);
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, low = Infinity, far = -Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.6) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y);
      far = Math.max(far, L(pos.x, pos.z)[1]);
      n++;
    }
    ctx.input.move.y = 0;
    const [ax, az] = L(pos.x, pos.z);
    return { at: [+ax.toFixed(2), +az.toFixed(2)], y: +(pos.y - yG).toFixed(2), low: +(low - yG).toFixed(2), miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), n, far: +far.toFixed(2) };
  };
  const r = { court: +(COURT - yG).toFixed(2) };
  place(-6.5, -50);
  r.foot = +(pos.y - yG).toFixed(2);
  r.up = go(-6.5, -16);                 // up the stair, two flights and the landing
  r.across = go(0.2, 18.3);             // across the court to the nave's middle south opening
  r.inNave = go(5.85, 18.3);            // through 1.7 m of wall into the nave
  go(5.85, 22.6);                       // line up on the axis: the door is 1.5 m
  // at the east door: railed, over the drop. Pressed against the rail long
  // enough, the player's own unsticking sets him back in the nave, so what
  // counts is how far he got, not where he ends
  r.eastDoor = go(5.85, 27.2, 240);
  r.back = go(5.85, 16);
  r.out = go(-1.2, 16);                 // out through the opening again
  r.chapel = go(-3.55, 3.2);            // to the chapel's steps
  r.edge = go(-30, 0, 600);             // to the south parapet: it must hold you
  r.down0 = go(-6.5, -16.5);
  r.down = go(-6.5, -50);               // and back down the stair
  // the new temple, from the lane
  place(-33.2, -30);
  r.lane = go(-33.2, 15);
  r.laneY = +(pos.y - yG).toFixed(2);
  r.hall = go(-38.6, 15);
  const vol = ctx.interior.volumes.find((v) => v.loc && v.loc.id === 'madan-mohan');
  r.inside = vol ? ctx.interior._contains(vol, pos.x, pos.z, 1.0) : null;
  r.toAltar = go(-43.75, 15, 600);      // the altar line stops you short of the Deities
  return r;
});
const near = (a, b2, tol) => Math.abs(a - b2) <= tol;
check('the court is 9.5 m up', near(out.court, 9.5, 0.05), `${out.court} m`);
check('the stair climbs from the lane to the court', near(out.foot, 0, 0.3) && near(out.up.y, out.court, 0.1) && out.up.miss < 1,
  `foot ${out.foot} m -> ${out.up.y} m at ${out.up.at}, ${out.up.miss} m short`);
check('the court holds you all the way to the nave', out.across.low > out.court - 0.1 && out.across.miss < 1,
  `lowest ${out.across.low} m, ${out.across.miss} m short of the opening`);
check('a side opening takes you into the nave, on its floor', out.inNave.miss < 1 && near(out.inNave.y, out.court + 0.45, 0.06),
  `${out.inNave.y} m at ${out.inNave.at}`);
check('the east door is railed: you walk into its passage and no further', out.eastDoor.far > 24.3 && out.eastDoor.far < 25.8 && out.eastDoor.low > out.court,
  `got to lz ${out.eastDoor.far} of a wall ending at 25.66, lowest ${out.eastDoor.low} m`);
check('back out through the wall and to the chapel steps', out.out.miss < 1 && out.chapel.miss < 1.2 && out.chapel.low > out.court - 0.1,
  `${out.out.at} then ${out.chapel.at} at ${out.chapel.y} m`);
check('the south parapet holds you on the court', out.edge.low > out.court - 0.1 && out.edge.at[0] > -30.5,
  `stopped at ${out.edge.at}, lowest ${out.edge.low} m`);
check('and back down the stair to the lane', out.down0.miss < 1 && near(out.down.y, 0, 0.3) && out.down.miss < 1,
  `${out.down.y} m at ${out.down.at}`);
check('the lane leads to the new temple and into its hall', out.lane.miss < 1 && out.hall.miss < 1 && near(out.hall.y - out.laneY, 0.45, 0.15) && out.inside === true,
  `lane ${out.lane.at}, hall ${out.hall.at}, its floor ${(out.hall.y - out.laneY).toFixed(2)} m over the lane, inside ${out.inside}`);
check('the altar line keeps you before the Deities, not on Them', out.toAltar.at[0] > -42.4,
  `stopped at lx ${out.toAltar.at[0]}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
