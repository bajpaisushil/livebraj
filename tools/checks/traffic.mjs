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

/*
 * One seed, so one run is the same as the next. `--seed=N` for another.
 *
 * 1 is the first seed tried, not the luckiest, and a fixed seed does not make
 * the town safe. Swept over seeds 1-30, the 45 s below read 2 overlaps or fewer
 * on 24 of them. The six that did not were mostly one pair of vehicles meeting
 * head-on along the same leg and stopping nose to nose for good: seed 7 is an
 * auto and a cab 0.79 m apart, 305 m from you, for the last 39 s, each with
 * the other dead ahead and its throttle at zero. That is the town. It is also
 * why the old check failed 2 runs in 12, run one at a time, while a parallel
 * suite took the blame. `--seed=7` shows it again.
 *
 * Swept again 2026-10-09 when the e-rickshaw went from 1.4 m to its real
 * 1.0 m: over seeds 1-60, 46 green at 1.0 m against 49 at 1.4 — the same
 * standoffs reshuffled among the seeds, every failure a head-on pair. They
 * come from vehicles driving the leg's centreline in both directions; the
 * fix is keeping left, as India does (queue item 21), not a wider cone.
 */
const SEED = Number((process.argv.find((a) => a.startsWith('--seed=')) || '').slice(7)) || 1;

const results = [];
const check = (n, pass, d) => { results.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const errors = [];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

/*
 * THE CHECK OWNS THE CLOCK.
 *
 * The 45 s below were always taken in fixed steps. What came before them was
 * not: this booted the town, let the game's own loop run for 900 ms of wall
 * clock, and measured from wherever that left everybody. Under SwiftShader the
 * loop runs when the compositor lets it, which is not often. Measured with the
 * machine busy, those 900 ms got through four frames and 0.09 s of simulated
 * time on one run and no frames at all on the next, on top of the 0.25-0.5 s
 * the intro had run before the check could see the town. Every one of those
 * frames drew on an unseeded Math.random. So every run started from a
 * different town, and 45 s of traffic is chaotic: start it a hair apart and
 * it ends nowhere near.
 *
 * So the loop never starts. main.js hands the app to `window.vrindavan` before
 * it boots, and the property is trapped here so that `start()`, the last
 * thing boot does, marks the loop running and asks for no frames. The check
 * then calls the game's own `_frame()` itself, with the clock reading a fixed
 * 1/30 s whatever the wall clock says. That runs every system, in GameApp's
 * order, at GameApp's sub-step. Math.random becomes the game's own seeded
 * generator. The renderer is cut down to the matrix update at the top of
 * `WebGLRenderer.render`, which is the only part of drawing the simulation can
 * see: the camera's matrices feed the speech bubble's projection.
 */
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true,
    get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui, null, { timeout: 200000 });
const held = await p.evaluate((seed) => {
  const app = window.vrindavan, ctx = app.ctx;
  // not one step may have run on the wall clock, or none of what follows holds
  if (app._raf || ctx.__simAccum !== undefined) return false;
  Math.random = ctx.rngAt(seed);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.renderer.render = (scene, camera) => {
    if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
  };
  // The intro hands over to the avatar screen on a setTimeout of its own, so a
  // slow boot used to arrive in the world from one screen and a quick boot
  // from another. End it the way its timer would, so they all arrive alike.
  ctx.ui._endIntro();
  ctx.ui.show('world');
  // the 900 ms this used to wait, as 27 frames of the game's own loop
  for (let i = 0; i < 27; i++) app._frame();
  return true;
}, SEED);
if (!held) {
  console.log('  FAIL  the game loop ran on the wall clock before the check took it over');
  await b.close(); server.close();
  process.exit(1);
}

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
console.log(`${passed}/${results.length} passed, ${errors.length} console errors (seed ${SEED})`);
if (errors.length) for (const e of errors.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
