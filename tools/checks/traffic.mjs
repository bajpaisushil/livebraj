/**
 * Does anybody give way?
 *
 * Vehicles have always queued properly behind whatever is in front of them —
 * `_vehicleAhead` looks down a nine-metre cone off the nose and lifts off. What
 * it cannot see is anything CROSSING: at a junction two vehicles are each
 * outside the other's cone right up until they are in the same place, and then
 * they drive through one another.
 *
 * So this sets up the junction by hand. Two vehicles, right angles, timed to
 * arrive together, nothing else nearby. Then it watches.
 *
 * It also checks the other half, which is the one that quietly ruins a town:
 * that a QUEUE does not brake for itself. A yield rule applied to vehicles
 * travelling the same way makes a whole line of traffic stop for no reason, and
 * that reads far worse than the fault it fixes.
 *
 *   node tools/checks/traffic.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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
await new Promise((r) => server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide

const results = [];
const check = (n, pass, d) => { results.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const errors = [];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui, null, { timeout: 200000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(900);

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, crowd = ctx.crowd;

  const all = [];
  for (let ti = 0; ti < crowd.vehicleInst.length; ti++) {
    for (const a of crowd.vehicleInst[ti].agents) all.push({ a, ti });
  }
  if (all.length < 2) return { ok: false, why: `only ${all.length} vehicles` };

  /*
   * The DECISION is tested directly, not by staging a crash.
   *
   * The first version of this check put two vehicles at right angles in an
   * empty field and watched. They never met: `_stepVehicleAgent` steers every
   * agent back toward its own road, so setting `a.yaw` by hand lasts exactly
   * one frame and the two wandered off to a closest approach of nine metres.
   * It was measuring the steering, not the giving way.
   *
   * `_crossYield` is a pure function of where two vehicles are and how fast
   * they are going, so it can simply be ASKED. The scene is left alone.
   */
  const A = all[0], B = all[1];
  const save = [A, B].map((q) => ({ x: q.a.x, z: q.a.z, yaw: q.a.yaw, sp: q.a.speed, th: q.a.throttle }));
  const FAR = 6000;
  const park = all.slice(2);
  const parked = park.map((q) => ({ x: q.a.x, z: q.a.z }));
  park.forEach((q, i) => { q.a.x = FAR + i * 7; q.a.z = FAR; });
  const px = ctx.player.position.x, pz = ctx.player.position.z;
  ctx.player.position.set(FAR + 900, ctx.player.position.y, FAR + 900);

  /** Put the pair in a configuration and ask each what it would do. */
  const ask = (ax, az, ayaw, bx, bz, byaw) => {
    A.a.x = ax; A.a.z = az; A.a.yaw = ayaw; A.a.speed = 6; A.a.throttle = 1;
    B.a.x = bx; B.a.z = bz; B.a.yaw = byaw; B.a.speed = 6; B.a.throttle = 1;
    return { a: crowd._crossYield(A.a, A.ti), b: crowd._crossYield(B.a, B.ti) };
  };

  const C = 5000;
  // right angles, both 9 m out, arriving together
  const junction = ask(C - 9, C, Math.PI / 2, C, C - 9, 0);
  /*
   * The same junction with one of them nearer to it. Three metres against
   * five, not two against eleven: at eleven the first one is clean through
   * before the second arrives, so there is correctly no conflict at all and
   * asking who yields is asking the wrong question.
   */
  const committed = ask(C - 3, C, Math.PI / 2, C, C - 5, 0);
  // one behind the other, same direction
  const queue = ask(C, C, Math.PI / 2, C - 11, C, Math.PI / 2);
  // oncoming, on their own sides of the road
  const passing = ask(C - 14, C, Math.PI / 2, C + 14, C + 3.4, -Math.PI / 2);
  // crossing, but far enough apart that they clear each other
  const clear = ask(C - 40, C, Math.PI / 2, C, C - 9, 0);

  /*
   * And the thing that actually matters, measured on the real town rather than
   * on a rig: over a stretch of simulated time, how often do two vehicles end
   * up in the same place? Nothing is staged — this is the traffic as it runs.
   */
  park.forEach((q, i) => { q.a.x = parked[i].x; q.a.z = parked[i].z; });
  [A, B].forEach((q, i) => {
    q.a.x = save[i].x; q.a.z = save[i].z; q.a.yaw = save[i].yaw;
    q.a.speed = save[i].sp; q.a.throttle = save[i].th;
  });
  ctx.player.position.set(px, ctx.player.position.y, pz);

  let overlaps = 0, samples = 0, stopped = 0;
  for (let step = 0; step < 30 * 45; step++) {
    crowd.update(1 / 30, ctx);
    if (step % 15) continue;
    samples++;
    let moving = 0;
    for (let i = 0; i < all.length; i++) {
      if ((all[i].a.throttle ?? 1) > 0.5) moving++;
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].a.x - all[j].a.x, all[i].a.z - all[j].a.z);
        if (d < 1.5) overlaps++;
      }
    }
    if (moving < all.length * 0.4) stopped++;
  }

  return { ok: true, vehicles: all.length,
    junction, committed, queue, passing, clear,
    overlaps, samples, stalledSamples: stopped };
});

if (!r.ok) {
  check('there are vehicles to test', false, r.why);
} else {
  check('there are vehicles to test', r.vehicles >= 2, `${r.vehicles} on the road`);

  const one = (q) => (q.a < 0.9) !== (q.b < 0.9);
  check('at a junction, exactly one gives way',
    one(r.junction),
    `throttle ceilings ${r.junction.a.toFixed(2)} and ${r.junction.b.toFixed(2)}`);

  check('the one already into the junction is the one that goes',
    r.committed.a > 0.9 && r.committed.b < 0.9,
    `the committed vehicle got ${r.committed.a.toFixed(2)}, `
    + `the one still coming got ${r.committed.b.toFixed(2)}`);

  /*
   * The three that must NOT fire. A yield rule that also catches following,
   * oncoming and comfortably-clear traffic stops the whole town, and a town of
   * stationary vehicles is a worse bug than one where they overlap.
   */
  check('a queue does not brake for itself',
    r.queue.a > 0.9 && r.queue.b > 0.9,
    `${r.queue.a.toFixed(2)} and ${r.queue.b.toFixed(2)}`);

  check('oncoming traffic on its own side does not brake',
    r.passing.a > 0.9 && r.passing.b > 0.9,
    `${r.passing.a.toFixed(2)} and ${r.passing.b.toFixed(2)}`);

  check('nobody brakes for a vehicle that will clear them',
    r.clear.a > 0.9 && r.clear.b > 0.9,
    `${r.clear.a.toFixed(2)} and ${r.clear.b.toFixed(2)} at 40 m out`);

  // and the town itself, unstaged
  check('vehicles rarely end up in the same place',
    r.overlaps <= 2,
    `${r.overlaps} overlapping pair(s) across ${r.samples} samples of `
    + `${r.vehicles} vehicles over 45 s`);

  check('and the traffic has not simply stopped',
    r.stalledSamples < r.samples * 0.25,
    `${r.stalledSamples} of ${r.samples} samples had most of the town halted`);
}

console.log('');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed, ${errors.length} console errors`);
if (errors.length) for (const e of errors.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
