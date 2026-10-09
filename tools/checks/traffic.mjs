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
 * standoffs reshuffled among the seeds, every failure a head-on pair.
 *
 * And again the same day once one-way roads were one way: 52 of 60. Seed 7's
 * pair, probed, was an auto and a cab nose to nose on NH 44 by Chhatikara —
 * a carriageway OSM maps oneway=yes that the game drove both ways. The four
 * long standoffs left (seeds 40, 43, 56, 60) are true head-on meetings on
 * two-way streets: vehicles drive a leg's centreline in both directions
 * (queue item 21, keeping left).
 *
 * Item 21, the same day: vehicles keep left, do not turn round in the road,
 * go round what will not move, and queue by their lengths. And "the same
 * place" is now two BODIES that touch, each its real size, which the old
 * count — any two centres within 1.5 m — was not: measured as bodies, the
 * traffic before this had a pair inside each other for 36-45 s on 16 of 60
 * seeds (cabs queued a metre into each other: the stop was 3.2 m centre to
 * centre, and a cab is 4.1 m long), all invisible to the old count.
 * Measured the same way over seeds 1-60, the traffic before had 44 towns
 * within the limits below and this has 49; this check, run over the same
 * seeds, is green on 51. What is left is brief, but it is there: corners
 * clipped at junctions, and vehicles held among the crowd that gathers round
 * you at the start, which walks through them (seeds 32 and 47: 16-18 s).
 * Queue item 21 keeps the notes.
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
  const save = [A, B].map((q) => ({ x: q.a.x, z: q.a.z, yaw: q.a.yaw, aim: q.a.aimYaw, sp: q.a.speed, th: q.a.throttle }));
  const FAR = 6000;
  const park = all.slice(2);
  const parked = park.map((q) => ({ x: q.a.x, z: q.a.z }));
  park.forEach((q, i) => { q.a.x = FAR + i * 7; q.a.z = FAR; });
  const px = ctx.player.position.x, pz = ctx.player.position.z;
  ctx.player.position.set(FAR + 900, ctx.player.position.y, FAR + 900);

  /** Put the pair in a configuration and ask each what it would do. */
  const ask = (ax, az, ayaw, bx, bz, byaw) => {
    // steering the way it faces: `_vehicleAhead` also looks down the line a
    // vehicle is steering for, and that is still the line of its real road
    A.a.x = ax; A.a.z = az; A.a.yaw = ayaw; A.a.aimYaw = ayaw; A.a.speed = 6; A.a.throttle = 1;
    B.a.x = bx; B.a.z = bz; B.a.yaw = byaw; B.a.aimYaw = byaw; B.a.speed = 6; B.a.throttle = 1;
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
   * Kept left, two vehicles on a street pass 2.1 m apart, centre to centre
   * (CrowdSystem's LANE: 1.05 m each side of the middle). Neither may brake
   * for the other — not in `_crossYield`, and not in `_vehicleAhead`, which
   * took anything within 1.7 m of the nose's line, beyond its width, as in
   * the way. Asked eight metres apart, inside the nine `_vehicleAhead` looks
   * down, and for the widest vehicle on the road (a cab, 1.75 m).
   */
  const lanePass = ask(C - 4, C, Math.PI / 2, C + 4, C + 2.1, -Math.PI / 2);
  const CAB = 1.75 / 2;
  const P0 = ctx.player.position;
  lanePass.aheadA = crowd._vehicleAhead(A.a, CAB, ctx, P0);
  lanePass.aheadB = crowd._vehicleAhead(B.a, CAB, ctx, P0);
  // and one in YOUR lane coming at you is still in the way
  ask(C - 4, C, Math.PI / 2, C + 4, C, -Math.PI / 2);
  const sameLane = crowd._vehicleAhead(A.a, CAB, ctx, P0);
  /*
   * Two vehicles nose to nose, each waiting for the other: after a moment
   * exactly one goes round. And one held by somebody standing in the road
   * goes round them. Asked of `_goRound` directly, as `_crossYield` is
   * above, with what each sees ahead set down by hand as `_vehicleAhead`
   * would leave it.
   */
  const held = (q, o, at, isV, on, r) => {
    q.a.aheadObj = o; q.a.aheadAt = at; q.a.aheadV = isV; q.a.aheadOn = on; q.a.aheadR = r;
  };
  const reset = () => { for (const q of [A, B]) { q.a.round = null; q.a.heldT = 0; q.a.vel = 0; q.a.aheadObj = null; } };
  ask(C, C, 0, C, C + 1, Math.PI);
  reset();
  held(A, B.a, 0.3, true, true, 0.5); held(B, A.a, 0.3, true, true, 0.5);   // gaps, nose to nose
  for (let i = 0; i < 30; i++) { crowd._goRound(A.a, 0.1, 0.5); crowd._goRound(B.a, 0.1, 0.5); }
  const standoff = { a: !!A.a.round, b: !!B.a.round };
  reset();
  const standing = { x: C, z: C + 2 };
  ask(C, C, 0, C - 40, C, 0);
  held(A, standing, 0.5, false, false, 0.35);    // half a metre off the nose
  for (let i = 0; i < 10; i++) crowd._goRound(A.a, 0.1, 0.5);
  const roundSoon = !!A.a.round;
  for (let i = 0; i < 20; i++) crowd._goRound(A.a, 0.1, 0.5);
  const roundSomebody = !!A.a.round && A.a.round.o === standing;
  reset();

  /*
   * And the thing that actually matters, measured on the real town rather than
   * on a rig: over a stretch of simulated time, how often do two vehicles end
   * up in the same place? Nothing is staged — this is the traffic as it runs.
   */
  park.forEach((q, i) => { q.a.x = parked[i].x; q.a.z = parked[i].z; });
  [A, B].forEach((q, i) => {
    q.a.x = save[i].x; q.a.z = save[i].z; q.a.yaw = save[i].yaw; q.a.aimYaw = save[i].aim;
    q.a.speed = save[i].sp; q.a.throttle = save[i].th;
  });
  ctx.player.position.set(px, ctx.player.position.y, pz);

  /*
   * Turning round in the road. A vehicle chose among every drivable edge out
   * of a node, the one it had just driven included, and there is a node every
   * 8 m: about one leg in three was a U-turn, in front of whoever followed.
   * It may turn back only where nothing else it may take, and fits down,
   * leaves the node.
   */
  const DRIVABLE = new Set(['street', 'main', 'highway', 'trunk', 'parikrama', 'stitch']);
  let legs = 0, uturns = 0;
  const nextRoad = crowd._nextRoad.bind(crowd);
  crowd._nextRoad = (a, nav) => {
    const from = a.prev, at = a.node;
    const n = nextRoad(a, nav);
    if (n && from && at) {
      legs++;
      // forced only if nothing else a vehicle may take, and fits down, leaves the node
      const fits = (e) => !nav._edgeOpen || nav._edgeOpen(at, e);
      if (n === from && at.edges.some((e) => DRIVABLE.has(e.kind) && !e.against && e.to !== from.k && fits(e))) uturns++;
    }
    return n;
  };

  /*
   * "In the same place" is two bodies that intersect, each the size it is
   * (`crowd.vehicleTypes`, a few centimetres in from the paint). It was any
   * two centres within 1.5 m, which came to the same thing while every
   * vehicle drove down the middle of the road. Kept left, two e-rickshaws
   * pass 1.5 m apart with half a metre between them, and that is not a
   * collision; nose to tail at 1.5 m is, and so is a cab across a bike. The
   * old count is kept beside it, for comparison.
   */
  const TYPES = crowd.vehicleTypes;
  const body = (q) => {
    const k = TYPES[q.ti];
    return { x: q.a.x, z: q.a.z, fx: Math.sin(q.a.yaw), fz: Math.cos(q.a.yaw), hl: k.l / 2 - 0.05, hw: k.w / 2 - 0.05 };
  };
  // two rectangles meet unless some axis of either separates them
  const touch = (P, Q) => {
    const dx = Q.x - P.x, dz = Q.z - P.z;
    for (const [ax, az] of [[P.fx, P.fz], [P.fz, -P.fx], [Q.fx, Q.fz], [Q.fz, -Q.fx]]) {
      const rp = P.hl * Math.abs(P.fx * ax + P.fz * az) + P.hw * Math.abs(P.fz * ax - P.fx * az);
      const rq = Q.hl * Math.abs(Q.fx * ax + Q.fz * az) + Q.hw * Math.abs(Q.fz * ax - Q.fx * az);
      if (Math.abs(dx * ax + dz * az) > rp + rq) return false;
    }
    return true;
  };
  let overlaps = 0, within15 = 0, samples = 0, stopped = 0, longest = 0;
  const running = new Map();     // how many samples running each pair has touched
  for (let step = 0; step < 30 * 45; step++) {
    crowd.update(1 / 30, ctx);
    if (step % 15) continue;
    samples++;
    let moving = 0;
    for (let i = 0; i < all.length; i++) {
      if ((all[i].a.throttle ?? 1) > 0.5) moving++;
      if (all[i].a.away) continue;
      for (let j = i + 1; j < all.length; j++) {
        if (all[j].a.away) continue;
        const d = Math.hypot(all[i].a.x - all[j].a.x, all[i].a.z - all[j].a.z);
        if (d < 1.5) within15++;
        const k = i * 1000 + j;
        if (d < 5 && touch(body(all[i]), body(all[j]))) {
          overlaps++;
          const n = (running.get(k) || 0) + 1;
          running.set(k, n);
          if (n > longest) longest = n;
        } else running.delete(k);
      }
    }
    if (moving < all.length * 0.4) stopped++;
  }

  crowd._nextRoad = nextRoad;
  return { ok: true, vehicles: all.length,
    junction, committed, queue, passing, clear, lanePass, sameLane, standoff, roundSoon, roundSomebody,
    overlaps, within15, longest, samples, stalledSamples: stopped, legs, uturns };
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

  check('two in their own lanes pass without either braking',
    r.lanePass.a > 0.9 && r.lanePass.b > 0.9 && !Number.isFinite(r.lanePass.aheadA) && !Number.isFinite(r.lanePass.aheadB),
    `ceilings ${r.lanePass.a.toFixed(2)} and ${r.lanePass.b.toFixed(2)}, `
    + `nothing ahead of either: ${!Number.isFinite(r.lanePass.aheadA)} and ${!Number.isFinite(r.lanePass.aheadB)}`);

  check('one coming at you in your own lane is still in the way',
    Number.isFinite(r.sameLane) && r.sameLane < 9, `seen ${r.sameLane} m ahead`);

  check('of two nose to nose, each waiting for the other, exactly one goes round',
    r.standoff.a !== r.standoff.b, `${r.standoff.a} and ${r.standoff.b}`);

  check('somebody standing in the road is waited for a moment, then gone round',
    !r.roundSoon && r.roundSomebody, `going round after 1 s: ${r.roundSoon}, after 3 s: ${r.roundSomebody}`);

  check('nobody brakes for a vehicle that will clear them',
    r.clear.a > 0.9 && r.clear.b > 0.9,
    `${r.clear.a.toFixed(2)} and ${r.clear.b.toFixed(2)} at 40 m out`);

  // and the town itself, unstaged
  /*
   * Two things, and they are different. Two vehicles that STAY in each other
   * are a standoff, or a queue driven into, and that is the fault this was
   * written for: no pair may touch for more than 4 s at a stretch (8 samples
   * half a second apart). A corner clipped at a junction is not that, and is
   * held to "rarely": 15 samples in the 45 s, among 39 vehicles. Measured as
   * bodies, the traffic before keeping left had a pair inside each other for
   * 36-45 s on 16 of 60 seeds; see the header.
   */
  check('vehicles rarely end up in the same place',
    r.longest <= 8 && r.overlaps <= 15,
    `${r.overlaps} sample(s) of a pair touching across ${r.samples} samples of `
    + `${r.vehicles} vehicles over 45 s, the longest ${r.longest * 0.5} s at a stretch `
    + `(${r.within15} with centres within 1.5 m, the old measure)`);

  check('nobody turns round in the road unless the road ends there',
    r.legs > 100 && r.uturns === 0, `${r.uturns} U-turns where the road went on, in ${r.legs} legs driven`);

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
