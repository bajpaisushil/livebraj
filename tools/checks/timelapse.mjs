/**
 * A long ride is a TIME-LAPSE of the town, not a rickshaw at 94 km/h.
 *
 * "E-rickshaws doing 94 km/h": a ride from Chhatikara used to be squeezed
 * into its five minutes by driving the vehicle faster, up to 26 m/s planned
 * and 34 allowed. Now the vehicle keeps the speed it really has on each kind
 * of road (RoadSpeeds) and a journey too long to sit through is shown faster
 * as a whole — the walkers, the traffic, the ride, all at one rate that the
 * ride bar says out loud. This holds it to that, through the game's own frame
 * loop rather than by stepping the ride by hand, because the rate lives in the
 * loop (GameApp._frame, `ctx.timeScale`):
 *
 *   1. a short hop is not sped up at all, and says nothing about it;
 *   2. a long one is shown at the rate its honest length calls for, the ride
 *      bar says that rate, and the loop really runs the world at it — the
 *      crowd gets exactly the time the ride does;
 *   3. the vehicle never goes faster than it can, in the town's own time:
 *      an e-rickshaw never past 25 km/h, which is the law (CMVR rule 2(cb));
 *   4. every way out puts the town back on its own clock: arriving, saying
 *      stop, "Start from here" mid-ride, and taking the wheel yourself;
 *   5. and the five minutes are kept, in the passenger's own time.
 *
 * THE CHECK OWNS THE CLOCK, as traffic.mjs does: the loop is never started,
 * and each real frame here is the game's own _frame() with the clock reading a
 * fixed 1/30 s. Math.random is the game's seeded generator.
 *
 *   node tools/checks/timelapse.mjs
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
const PORT = server.address().port;   // the OS's choice: fixed ports collided under all.mjs -j

const results = [];
const check = (n, pass, d) => { results.push(!!pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const errors = [];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true,
    get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.crowd?.vehicleInst
  && window.vrindavan?.ctx?.ui, null, { timeout: 200000 });

const out = await p.evaluate(() => {
  const app = window.vrindavan, ctx = app.ctx, r = ctx.rickshaw;
  if (app._raf || ctx.__simAccum !== undefined) return { ok: false, why: 'the loop ran on the wall clock first' };
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.renderer.render = (scene, camera) => {
    if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
  };
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const frames = (n) => { for (let i = 0; i < n; i++) app._frame(); };
  frames(30);

  // how much of the world's time the crowd is given, frame by frame
  let crowdT = 0;
  const crowdUpdate = ctx.crowd.update.bind(ctx.crowd);
  ctx.crowd.update = (dt, c) => { crowdT += dt; return crowdUpdate(dt, c); };

  const IDX = { 'cycle-rickshaw': 0, 'e-rickshaw': 1, auto: 2, tempo: 3, taxi: 4 };
  const hire = (fromId, type, toId) => {
    r.leave();
    frames(2);
    const from = ctx.data.LOCATIONS.find((l) => l.id === fromId);
    ctx.player.placeAt(ctx, from.pos[0], from.pos[1]);
    const v = ctx.crowd.vehicleInst[IDX[type]].agents.find((a) => !a.personal);
    if (!v) return 'no ' + type;
    for (const sl of ctx.crowd.vehicleInst) for (const a of sl.agents) {
      if (a !== v && Math.hypot(a.x - from.pos[0], a.z - from.pos[1]) < 30) a.x += 300;
    }
    v.chartered = false; v.x = ctx.player.position.x + 3; v.z = ctx.player.position.z; v.vel = 0;
    r._acc = 99; r.update(0.5, ctx);
    if (!r.target || r.target !== v) return 'could not hail the ' + type;
    if (!r.board()) return 'could not board';
    frames(60);
    // a named place, or else the nearest he offers (the list is nearest first)
    const el = toId ? document.querySelector(`.rk-row[data-go="${toId}"], [data-go="${toId}"]`) : document.querySelector('.rk-row[data-go]');
    if (!el) return (toId || 'anything') + ' not offered';
    el.click();
    if (!r.startRide()) return 'would not start';
    return null;
  };
  const hud = () => ((document.querySelector('#ride-hud .rh-left') || {}).textContent || '');
  const res = {};

  /* 1. a short hop */
  {
    const why = hire('chhatikara-crossing', 'e-rickshaw', 'iskcon-krishna-balaram');
    if (why) return { ok: false, why: 'long ride: ' + why };
    // the long one first, measured below; the short one is laid from the
    // same dialog's nearest offer afterwards
  }

  /* 2 and 3. the long one, through the loop */
  {
    const R = r.ride;
    res.long = { total: Math.round(R.total), honest: Math.round(R.honest), lapse: R.lapse, type: r.vehicle.id };
    const sim0 = ctx.__simAccum;
    crowdT = 0;
    let fastest = 0, frameN = 0, nowSum = 0, tooFast = 0, offRate = 0;
    let last = { x: R.car.x, z: R.car.z, sim: ctx.__simAccum, unwedged: R.unwedged, pts: R.pts };
    for (; frameN < 300 && r.ride; frameN++) {
      // the rate this frame is asked to run at, against what it then ran
      const asked = ctx.timeScale, before = ctx.__simAccum;
      app._frame();
      offRate = Math.max(offRate, Math.abs((ctx.__simAccum - before) * 30 - asked));
      const car = r.ride && r.ride.car;
      if (!car) break;
      const dSim = ctx.__simAccum - last.sim;
      const placed = r.ride && ((r.ride.unwedged || 0) !== (last.unwedged || 0) || r.ride.pts !== last.pts);
      if (dSim > 1e-6 && !placed) {
        const v = Math.hypot(car.x - last.x, car.z - last.z) / dSim;
        fastest = Math.max(fastest, v); if (v * 3.6 > 25.5) tooFast++;
      }
      if (placed) res.placements = (res.placements || 0) + 1;
      last = { x: car.x, z: car.z, sim: ctx.__simAccum, unwedged: r.ride && r.ride.unwedged, pts: r.ride && r.ride.pts };
      nowSum += ctx.timeScaleNow;
    }
    res.long.frames = frameN;
    res.long.simPerFrame = (ctx.__simAccum - sim0) / frameN;
    res.long.crowdPerFrame = crowdT / frameN;
    res.long.achieved = nowSum / frameN;
    res.long.fastestKmh = fastest * 3.6;
    res.long.tooFast = tooFast;
    res.long.hud = hud();
    res.long.rate = ctx.timeScale;
    res.long.offRate = offRate;
    // the ride bar's own rounding of the rate it is running at now
    res.long.rateText = (ctx.timeScale >= 10 || Math.abs(ctx.timeScale - Math.round(ctx.timeScale)) < 0.05)
      ? String(Math.round(ctx.timeScale)) : ctx.timeScale.toFixed(1);
  }

  /* 4a. "Start from here" mid-ride: out at once, and the town's own clock */
  {
    const set = ctx.data.LOCATIONS.find((l) => l.id === 'banke-bihari');
    r.leave();
    ctx.player.placeAt(ctx, set.pos[0], set.pos[1]);
    const sim0 = ctx.__simAccum;
    frames(30);
    res.leave = { scale: ctx.timeScale, now: ctx.timeScaleNow, simPerFrame: (ctx.__simAccum - sim0) / 30, state: r.state };
  }

  /* 4b. saying stop */
  {
    const why = hire('chhatikara-crossing', 'e-rickshaw', 'iskcon-krishna-balaram');
    if (why) return { ok: false, why: 'stop ride: ' + why };
    frames(30);
    const during = ctx.timeScale;
    r.stopRide();
    const sim0 = ctx.__simAccum;
    frames(30);
    res.stop = { during, scale: ctx.timeScale, simPerFrame: (ctx.__simAccum - sim0) / 30, state: r.state };
  }

  /* 4c. taking the wheel */
  {
    const why = hire('chhatikara-crossing', 'e-rickshaw', 'iskcon-krishna-balaram');
    if (why) return { ok: false, why: 'wheel ride: ' + why };
    frames(30);
    const during = ctx.timeScale;
    r.takeWheel();
    const sim0 = ctx.__simAccum;
    frames(30);
    res.wheel = { during, scale: ctx.timeScale, simPerFrame: (ctx.__simAccum - sim0) / 30, state: r.state };
    r.stopRide();
    frames(5);
  }

  /* 1 again, now: a short hop — ISKCON to Prem Mandir, the closest two
     places every driver knows, about half a kilometre apart */
  {
    const why = hire('iskcon-krishna-balaram', 'e-rickshaw', 'prem-mandir');
    if (why) res.short = { why };
    else {
      const R = r.ride;
      res.short = { total: Math.round(R.total), honest: Math.round(R.honest), lapse: R.lapse, scale: ctx.timeScale };
      frames(30);
      res.short.hud = hud();
      r.stopRide();
      frames(5);
    }
  }

  /* 5. the whole long ride through the loop, counted in real frames */
  {
    const why = hire('chhatikara-crossing', 'e-rickshaw', 'iskcon-krishna-balaram');
    if (why) return { ok: false, why: 'whole ride: ' + why };
    let n = 0;
    for (; n < 30 * 600 && r.ride; n++) app._frame();
    res.whole = { arrived: !r.ride, seconds: n / 30, scaleAfter: ctx.timeScale };
  }
  ctx.crowd.update = crowdUpdate;
  return { ok: true, ...res };
});

if (!out.ok) {
  check('a ride could be taken', false, out.why);
} else {
  const L = out.long;
  console.log(`  (the long ride: ${L.total} m by ${L.type}, ${Math.round(L.honest / 60)} min of the town's time, shown at x${L.lapse})`);
  if (out.placements) console.log(`  (${out.placements} placement(s) back onto the route in those frames — not driving, so not timed)`);
  check('a long ride is shown as a time-lapse, at the rate its length calls for',
    L.lapse > 1 && L.honest / L.lapse <= 240 + 1e-6, `x${L.lapse}: ${Math.round(L.honest)} s of the town in ${Math.round(L.honest / L.lapse)} s of yours`);
  check('the ride bar says so', L.hud.includes('time-lapse \u00d7' + L.rateText), `"${L.hud}", running at x${L.rate.toFixed(2)}`);
  check('the loop really runs the world at that rate, frame by frame', L.offRate < 0.01 && Math.abs(L.achieved - L.simPerFrame * 30) < 0.01,
    `${(L.simPerFrame * 30).toFixed(2)} s of the town a second of yours on average; the furthest one frame strayed from its rate ${L.offRate.toFixed(4)}`);
  check('the whole town, not just the ride: the crowd gets the same time', Math.abs(L.crowdPerFrame - L.simPerFrame) < 1e-6,
    `crowd ${(L.crowdPerFrame * 30).toFixed(3)} s a second, ride ${(L.simPerFrame * 30).toFixed(3)}`);
  check('and the vehicle never goes faster than it can: 25 km/h, in the town\'s own time',
    L.tooFast === 0 && L.fastestKmh <= 25.5, `fastest ${L.fastestKmh.toFixed(1)} km/h over ${L.frames} frames`);
  check('"Start from here" mid-ride puts the town back on its own clock', out.leave.scale === 1
    && Math.abs(out.leave.simPerFrame * 30 - 1) < 1e-6 && out.leave.state === 'idle',
    `x${out.leave.scale}, ${(out.leave.simPerFrame * 30).toFixed(3)} s a second, ${out.leave.state}`);
  check('so does saying stop', out.stop.during > 1 && out.stop.scale === 1 && Math.abs(out.stop.simPerFrame * 30 - 1) < 1e-6,
    `x${out.stop.during} riding, x${out.stop.scale} after, ${(out.stop.simPerFrame * 30).toFixed(3)} s a second`);
  check('and taking the wheel: nobody steers a time-lapse', out.wheel.during > 1 && out.wheel.scale === 1
    && Math.abs(out.wheel.simPerFrame * 30 - 1) < 1e-6 && out.wheel.state === 'driving',
    `x${out.wheel.during} riding, x${out.wheel.scale} at the wheel`);
  if (out.short.why) check('a short hop is not sped up', false, out.short.why);
  else check('a short hop is not sped up, and says nothing about it',
    out.short.honest <= 240 && out.short.lapse === 1 && out.short.scale === 1 && !/time-lapse/.test(out.short.hud),
    `${out.short.total} m, ${Math.round(out.short.honest)} s of the town's time: "${out.short.hud}"`);
  check('the whole long ride, through the loop, inside five minutes of yours', out.whole.arrived && out.whole.seconds <= 300
    && out.whole.scaleAfter === 1, `${out.whole.arrived ? 'arrived' : 'NOT arrived'} in ${out.whole.seconds.toFixed(0)} s; x${out.whole.scaleAfter} after`);
}
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log('');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed`);
await b.close(); server.close();
process.exit(passed === results.length ? 0 : 1);
