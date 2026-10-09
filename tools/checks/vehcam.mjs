/**
 * In a vehicle, the view comes round with the vehicle.
 *
 * "as the lane changes in vehicle change the view to that like update it to
 * front view of vehicle moving direction."
 *
 * The ride used to aim the camera along the direction of travel ONCE, at
 * pull-away, and then never again — so the first corner left you looking at
 * the side of the road. This rides a real route in the real frame loop,
 * touches no look control, and measures how far the view lags the vehicle's
 * heading whenever the vehicle has just turned. Then it swings the view away
 * by hand and checks the swing is left alone while you are looking, and eased
 * back once you stop.
 *
 * This request was dropped once between being asked and being queued; this
 * check is part of making sure that cannot happen quietly again.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('../../client/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let pth = decodeURIComponent(req.url.split('?')[0]);
    if (pth.endsWith('/')) pth += 'index.html';
    const body = await readFile(join(ROOT, pth));
    res.writeHead(200, { 'content-type': TYPES[extname(pth)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const results = [];
const check = (name, ok, detail = '') => {
  results.push(!!ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
/*
 * THE CHECK OWNS THE CLOCK, as traffic.mjs does. The ride ran in the real
 * frame loop and every wait below counted the rig's own seconds, which was
 * honest about time but not about cost: under SwiftShader a parallel suite
 * spent ten minutes here waiting for the compositor to hand out frames, and
 * the lag it measured depended on how many it got. Now the loop is never
 * started; each frame is the game's own _frame() with the clock reading a
 * fixed 1/30 s, drawing nothing but the camera's matrices — which is all the
 * camera's heading needs.
 */
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true,
    get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.crowd?.vehicleInst
  && window.vrindavan?.ctx?.cameraRig, null, { timeout: 220000 });

const out = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw, rig = ctx.cameraRig;
  const app = window.vrindavan;
  ctx.clock.getDelta = () => 1 / 30;
  ctx.renderer.render = (scene, camera) => {
    if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
  };
  ctx.ui._endIntro();
  ctx.ui && ctx.ui.show && ctx.ui.show('world');
  const frame = () => { app._frame(); return Promise.resolve(); };
  for (let i = 0; i < 30; i++) app._frame();
  const angd = (a, c) => { let d = ((a - c) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return Math.abs(d); };

  // board at Chhatikara, the way the rickshaw check does
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  if (!v) return { ok: false, why: 'no vehicle' };
  v.x = chhat.pos[0] + 4; v.z = chhat.pos[1]; v.chartered = false;
  r._acc = 99; r.update(0.5, ctx);
  if (!r.target) return { ok: false, why: 'no hail target' };
  r.board();
  for (let i = 0; i < 400 && r.state === 'boarding'; i++) await frame();
  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return { ok: false, why: 'ISKCON not offered' };
  el.click();
  for (let i = 0; i < 60 && r.state !== 'waiting'; i++) await frame();
  if (!r.startRide()) return { ok: false, why: 'start refused' };

  const car = () => (r.ride && r.ride.car) || r.ride && r.ride.v || v;
  /*
   * COUNT GAME TIME, NOT WALL TIME.
   *
   * In headless Chromium the game loop runs about 0.28 times per rendered
   * frame, each step capped at 0.05 s. The first version of this check waited
   * "7 seconds" for the view to come round, which was about 0.35 s of GAME
   * time — against a camera that deliberately waits 1.8 s of game time before
   * it follows. It failed the camera for the machine being slow. So the rig's
   * own update is hooked: every sample and every wait below is in the game's
   * own seconds, counted from the dt it actually receives.
   */
  let gameT = 0, hold = false;
  const lags = [];
  let prevYaw = null, totalTurn = 0, sampling = false;
  const upd = rig.update.bind(rig);
  rig.update = (dt, c0) => {
    if (hold) rig._lookIdle = 0;                 // a finger on the look control
    const ret = upd(dt, c0);
    gameT += dt || 0;
    const c = car();
    if (sampling && c) {
      if (prevYaw !== null) totalTurn += angd(c.yaw, prevYaw);
      prevYaw = c.yaw;
      if (Math.abs(c.vel || 0) >= 1.5) lags.push(angd(rig.yaw, c.yaw));
    }
    return ret;
  };
  const untilGame = async (secs, cond = () => true) => {
    const start = gameT, wall = performance.now();
    while (gameT - start < secs && cond() && performance.now() - wall < 240000) await frame();
    return gameT - start;
  };

  await untilGame(3.0);                          // pull away and settle
  sampling = true;
  const rode = await untilGame(25.0, () => r.state === 'riding');
  sampling = false;
  lags.sort((a, bb) => a - bb);
  const pct = (q) => lags.length ? lags[Math.min(lags.length - 1, Math.floor(q * lags.length))] : null;

  // now LOOK AWAY by hand, hold it, and see it is respected — then let go
  let respected = null, released = null, trace = [];
  if (car() && r.state === 'riding') {
    const c = car();
    rig.yawTarget = c.yaw + Math.PI * 0.5; rig.yaw = rig.yawTarget;
    const heldYaw = rig.yaw;
    hold = true;
    await untilGame(1.2, () => r.state === 'riding');
    // Did the CAMERA stay where it was put? Not "is it still 90 degrees from
    // the car" — the car keeps turning under you, so that angle changes
    // with the camera perfectly still, and the first version of this failed
    // for exactly that reason on a winding stretch.
    respected = angd(rig.yaw, heldYaw) < 0.15;
    hold = false;
    /*
     * Count only time the vehicle is MOVING. Stopped at a junction there is
     * no direction of travel to come round to — the rig rightly holds still
     * — and the first run of this measured at exactly such a stop, with the
     * rickshaw at 0 m/s, and called that a failure. Released means: within
     * 4 s of moving game time after letting go, the view got back behind it.
     */
    let movingT = 0, best = 99;
    const upd2 = rig.update;
    rig.update = (dt, c0) => {
      const ret = upd2(dt, c0);
      const c = car();
      if (c && Math.abs(c.vel || 0) >= 1.5) {
        movingT += dt || 0;
        best = Math.min(best, angd(rig.yaw, c.yaw));
      }
      return ret;
    };
    const wall = performance.now();
    while (movingT < 4.0 && r.state === 'riding' && performance.now() - wall < 240000) await frame();
    rig.update = upd2;
    released = best < 25 * Math.PI / 180;
    trace = [{ lagDeg: +(angd(rig.yaw, car().yaw) * 180 / Math.PI).toFixed(0), idle: +rig._lookIdle.toFixed(1),
      vel: +(car().vel || 0).toFixed(1), vh: rig.vehicleHeading !== null }];
  }
  rig.update = upd;
  const vh = rig.vehicleHeading;
  r.stopRide && r.stopRide();
  for (let i = 0; i < 30; i++) await frame();
  const deg = (x) => x === null ? null : +(x * 180 / Math.PI).toFixed(1);
  return { ok: true, rodeGameSeconds: +rode.toFixed(1), samples: lags.length, totalTurnDeg: deg(totalTurn),
    medianLagDeg: deg(pct(0.5)), p90LagDeg: deg(pct(0.9)), respected, released, trace,
    headingWhileRiding: vh !== null && vh !== undefined, clearedAfter: rig.vehicleHeading === null };
});

if (!out.ok) {
  check('a ride could be taken', false, out.why);
} else {
  check('the route turns plenty, so the check means something', out.totalTurnDeg > 60,
    `vehicle turned ${out.totalTurnDeg} degrees in total over ${out.samples} moving samples`);
  check('the view keeps looking where the vehicle is going',
    out.medianLagDeg !== null && out.medianLagDeg < 12 && out.p90LagDeg < 35,
    `median lag ${out.medianLagDeg} degrees, 90th percentile ${out.p90LagDeg}`);
  check('looking out of the side is left alone while you are doing it', out.respected === true,
    String(out.respected));
  check('and the view comes back round once you stop', out.released === true,
    `${out.released} ${JSON.stringify(out.trace)}`);
  check('off the vehicle, the rig follows you again', out.clearedAfter === true, String(out.clearedAfter));
}
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log('');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed`);
await b.close(); server.close();
process.exit(passed === results.length ? 0 : 1);
