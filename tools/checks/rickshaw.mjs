/**
 * Can you actually take a ride?
 *
 * Stands the player at a hireable vehicle, asserts the prompt appears, opens
 * the fare dialog, picks a destination and checks the ride starts and moves.
 * The awkward case is deliberate: a pedestrian parked closer than the vehicle,
 * which used to suppress the prompt entirely.
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
await new Promise((r) => server.listen(8791, r));

const results = [];
const errors = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/navigator\.vibrate/.test(t)) errors.push(t); });
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await p.goto('http://localhost:8791/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.crowd
  && window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.ui, null, { timeout: 60000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(600);

/* ---- 1. are there hireable vehicles at all? ---- */
const fleet = await p.evaluate(() => {
  const c = window.vrindavan.ctx.crowd;
  const out = {};
  c.vehicleInst.forEach((slot, i) => {
    const t = c.constructor.VEHICLES ? c.constructor.VEHICLES[i] : null;
    out[i] = slot.agents.length;
  });
  return { slots: c.vehicleInst.length, counts: out };
});
check('vehicles exist', fleet.slots > 0, JSON.stringify(fleet.counts));

/* ---- 2. stand at a hireable vehicle, with a pedestrian even closer ---- */
const setup = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const c = ctx.crowd;
  // find any hireable vehicle
  let v = null, vi = -1;
  for (let i = 0; i < c.vehicleInst.length; i++) {
    const slot = c.vehicleInst[i];
    if (slot.agents.length) { v = slot.agents[0]; vi = i; break; }
  }
  if (!v) return { ok: false };
  // stand 3 m from it
  ctx.player.position.set(v.x + 3, ctx.player.position.y, v.z);
  // and park a pedestrian 1 m away — nearer than the vehicle
  const person = c.peopleInst.find((s) => s.agents.length)?.agents[0];
  if (person) { person.x = ctx.player.position.x + 1; person.z = ctx.player.position.z; }
  return {
    ok: true,
    vehicleAt: [Math.round(v.x), Math.round(v.z)],
    personDist: person ? 1 : null,
  };
});
check('placed at a vehicle with a person nearer', setup.ok,
  setup.ok ? `vehicle ${setup.vehicleAt}, person 1 m away` : 'no vehicle found');

/* ---- 3. does the hail prompt appear? ---- */
const prompt = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const seen = [];
  const off = ctx.bus.on('ui:prompt', (d) => seen.push(d));
  ctx.rickshaw._acc = 99;                       // skip the 0.4 s throttle
  ctx.rickshaw.update(0.5, ctx);
  await new Promise((r) => setTimeout(r, 120));
  if (off) off();
  return {
    prompts: seen.map((s) => `${s.id}:${s.label}`),
    target: !!ctx.rickshaw.target,
    vehicle: ctx.rickshaw.vehicle ? ctx.rickshaw.vehicle.label : null,
  };
});
check('hail prompt appears despite the nearer person', prompt.target,
  prompt.prompts.join(', ') || 'no prompt emitted');
check('prompt names the vehicle', !!prompt.vehicle, prompt.vehicle || 'none');

/* ---- 3b. a brand-new player, nothing discovered, must still get offers ---- */
const fresh = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.state.discovered.clear();
  ctx.rickshaw.board();
  for (let i = 0; i < 60; i++) ctx.rickshaw.update(1 / 30, ctx);
  await new Promise((r) => setTimeout(r, 250));
  const el = document.querySelector('#rickshaw-dialog, .rickshaw-dialog, [data-rickshaw]');
  const rows = el ? [...el.querySelectorAll('[data-go]')] : [];
  return { n: rows.length, names: rows.slice(0, 4).map((r) => r.textContent.trim().split('\n')[0].trim()) };
});
check('a new player is still offered the famous places', fresh.n > 0,
  `${fresh.n} destinations: ${fresh.names.join(', ')}`);

/* ---- 4. open the fare dialog ---- */
const dlg = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.rickshaw.board();
  for (let i = 0; i < 60; i++) ctx.rickshaw.update(1 / 30, ctx);
  await new Promise((r) => setTimeout(r, 250));
  const el = document.querySelector('#rickshaw-dialog, .rickshaw-dialog, [data-rickshaw]');
  const txt = (el && el.textContent) || document.body.innerText;
  const fares = (txt.match(/₹\s?\d+/g) || []).slice(0, 4);
  return { shown: !!el, fares, buttons: el ? el.querySelectorAll('button').length : 0 };
});
check('fare dialog opens with destinations and fares', dlg.fares.length > 0,
  `${dlg.buttons} options, fares ${dlg.fares.join(' ')}`);

/* ---- 5. take the ride and check it moves ---- */
const ride = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const r = ctx.rickshaw;

  // a clean board, so this does not depend on whatever the last block left behind
  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  v.chartered = false;
  v.x = ctx.player.position.x + 2.5; v.z = ctx.player.position.z;
  r._acc = 99; r.update(0.5, ctx);
  if (!r.board()) return { state0: 'board refused', riding: false, moved: 0, rides: 0 };
  for (let i = 0; i < 60; i++) r.update(1 / 30, ctx);
  await new Promise((res) => setTimeout(res, 200));

  // .rk-row, not just [data-go] — the main menu has a data-go="map" button
  // that sits earlier in the document and was being clicked instead.
  const el = document.querySelector('.rk-row[data-go]');
  if (!el) return { state0: 'no destinations', riding: false, moved: 0, rides: 0 };
  el.click();
  await new Promise((res) => setTimeout(res, 200));
  if (r.state !== 'waiting') return { state0: 'did not wait: ' + r.state, riding: false, moved: 0, rides: 0 };
  if (!r.startRide()) return { state0: 'start refused', riding: false, moved: 0, rides: 0 };

  const start = { x: ctx.player.position.x, z: ctx.player.position.z };
  const state0 = r.state;
  for (let i = 0; i < 90; i++) r.update(1 / 30, ctx);
  const end = { x: ctx.player.position.x, z: ctx.player.position.z };
  return {
    state0,
    riding: r.state === 'riding' || !!r.ride,
    moved: Math.round(Math.hypot(end.x - start.x, end.z - start.z)),
    rides: ctx.state.ridesTaken,
  };
});
check('picking a destination then saying start begins the ride', ride.riding || ride.moved > 5,
  `state ${ride.state0}, moved ${ride.moved} m, ridesTaken ${ride.rides}`);

/* ---- 6. from spawn, ask for ISKCON, and end up at ISKCON ---- */
const trip = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const r = ctx.rickshaw;
  const dest = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');

  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  ctx.state.discovered.clear();
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  v.chartered = false;
  v.x = chhat.pos[0] + 2; v.z = chhat.pos[1];
  r._acc = 99; r.update(0.5, ctx);
  if (!r.target) return { ok: false, why: 'no hail target at spawn' };

  if (!r.board()) return { ok: false, why: 'could not get in' };
  for (let i = 0; i < 60; i++) r.update(1 / 30, ctx);
  await new Promise((res) => setTimeout(res, 200));

  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return { ok: false, why: 'ISKCON not offered' };
  el.click();
  await new Promise((res) => setTimeout(res, 200));
  if (r.state !== 'waiting') return { ok: false, why: 'driver did not wait, state ' + r.state };
  if (!r.startRide()) return { ok: false, why: 'start refused' };
  if (!r.ride) return { ok: false, why: 'ride did not start' };

  const pts = r.ride.pts.length;
  const routed = pts > 4;                      // a 2-point fallback means no route
  const start = { x: ctx.player.position.x, z: ctx.player.position.z };
  const startD = Math.hypot(dest.pos[0] - start.x, dest.pos[1] - start.z);

  // drive it to completion, with a generous frame budget
  for (let i = 0; i < 20000 && r.ride; i++) r.update(1 / 30, ctx);

  const end = { x: ctx.player.position.x, z: ctx.player.position.z };
  return {
    ok: true, routed, pts,
    startDist: Math.round(startD),
    endDist: Math.round(Math.hypot(dest.pos[0] - end.x, dest.pos[1] - end.z)),
    finished: !r.ride,
  };
});
check('the ride follows a real road route, not a straight line',
  trip.ok && trip.routed, trip.ok ? `${trip.pts} path points` : trip.why);
check('asking for ISKCON ends you at ISKCON',
  trip.ok && trip.endDist < 60,
  trip.ok ? `started ${trip.startDist} m away, ended ${trip.endDist} m away` : trip.why);

/* ---- 7. you ride IN the vehicle, and it moves with you ---- */
const seated = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const r = ctx.rickshaw;
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  r.state = 'idle'; r.ride = null;
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  v.x = chhat.pos[0] + 2; v.z = chhat.pos[1];
  r._acc = 99; r.update(0.5, ctx);
  r.board();
  for (let i = 0; i < 60; i++) { r.update(1 / 30, ctx); }
  await new Promise((res) => setTimeout(res, 200));
  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return { ok: false, why: 'ISKCON not offered' };
  el.click();
  await new Promise((res) => setTimeout(res, 150));
  if (r.state !== 'waiting') return { ok: false, why: 'driver did not wait, state ' + r.state };
  if (!r.startRide()) return { ok: false, why: 'start refused' };
  if (!r.ride) return { ok: false, why: 'ride did not start' };

  const car = r.ride.car;
  const gaps = [];
  for (let i = 0; i < 300; i++) {
    r.update(1 / 30, ctx);
    if (!r.ride) break;
    if (i % 40 === 0) {
      gaps.push(Math.hypot(car.x - ctx.player.position.x, car.z - ctx.player.position.z));
    }
  }
  return {
    ok: true,
    chartered: !!car.chartered,
    hudShown: document.getElementById('ride-hud')?.classList.contains('show'),
    maxGap: Math.max(...gaps).toFixed(2),
    carMoved: Math.round(Math.hypot(car.x - chhat.pos[0], car.z - chhat.pos[1])),
  };
});
check('the vehicle is chartered and drives with you', seated.ok && seated.chartered && seated.carMoved > 50,
  seated.ok ? `vehicle moved ${seated.carMoved} m` : seated.why);
check('you stay seated in it, never more than a metre off',
  seated.ok && Number(seated.maxGap) < 1.2, seated.ok ? `max gap ${seated.maxGap} m` : seated.why);
check('the riding HUD is on screen', seated.ok && seated.hudShown === true, String(seated.hudShown));

/* ---- 8. saying stop pulls over, mid-route ---- */
const stopped = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const r = ctx.rickshaw;
  if (!r.ride) return { ok: false, why: 'no ride in progress' };
  const before = { x: ctx.player.position.x, z: ctx.player.position.z };
  const car = r.ride.car;
  const ok = r.stopRide();
  await new Promise((res) => setTimeout(res, 150));
  const after = { x: ctx.player.position.x, z: ctx.player.position.z };
  return {
    ok: true, returned: ok,
    stillRiding: r.state === 'riding' || !!r.ride,
    released: !car.chartered,
    steppedOut: Math.hypot(after.x - before.x, after.z - before.z).toFixed(1),
    inputBack: ctx.input ? ctx.input._enabled !== false : null,
    hudHidden: !document.getElementById('ride-hud')?.classList.contains('show'),
  };
});
check('stop ends the ride where you are', stopped.ok && stopped.returned && !stopped.stillRiding,
  stopped.ok ? `state cleared` : stopped.why);
check('the vehicle is released back to traffic', stopped.ok && stopped.released, String(stopped.released));
check('you step out beside it and get control back',
  stopped.ok && Number(stopped.steppedOut) > 0.4 && stopped.inputBack !== false,
  stopped.ok ? `stepped ${stopped.steppedOut} m, input ${stopped.inputBack}` : '');
check('the riding HUD is dismissed', stopped.ok && stopped.hudHidden, String(stopped.hudHidden));

/* ---- 9. the beat: get in, he waits, you say start, you say stop ---- */
const beat = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const r = ctx.rickshaw;
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  v.x = chhat.pos[0] + 4; v.z = chhat.pos[1]; v.chartered = false;
  r._acc = 99; r.update(0.5, ctx);
  if (!r.target) return { ok: false, why: 'no hail target' };

  const standing = { x: ctx.player.position.x, z: ctx.player.position.z };

  // 1. get in
  const boarded = r.board();
  const midStates = [];
  for (let i = 0; i < 60; i++) { r.update(1 / 30, ctx); midStates.push(r.state); }
  await new Promise((res) => setTimeout(res, 200));
  const seatedAt = { x: ctx.player.position.x, z: ctx.player.position.z };
  const walkedToIt = Math.hypot(seatedAt.x - standing.x, seatedAt.z - standing.z);
  const onSeat = Math.hypot(seatedAt.x - v.x, seatedAt.z - v.z);
  const dialogOpen = r.state === 'offered';

  // 2. agree a fare — he must then WAIT
  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return { ok: false, why: 'ISKCON not offered after boarding' };
  el.click();
  await new Promise((res) => setTimeout(res, 150));
  const waiting = r.state === 'waiting';
  const movedWhileWaiting = (() => {
    const a = { x: v.x, z: v.z };
    for (let i = 0; i < 60; i++) r.update(1 / 30, ctx);
    return Math.hypot(v.x - a.x, v.z - a.z);
  })();
  const hudWaiting = document.getElementById('ride-hud')?.classList.contains('waiting');

  // 3. say start
  /*
   * DRIVE UNTIL HE HAS PULLED AWAY, not for a fixed number of steps.
   *
   * This ran exactly 120 steps at 1/30 s — four seconds of simulated time —
   * and then asserted he had covered more than 20 m, which needs an average
   * of 5 m/s from a standing start. That is a knife edge: an e-rickshaw
   * accelerating out of a turn does 13 m in four seconds and the check calls
   * it a failure, which is what it reported once tonight and then passed on
   * a re-run with no code change in between.
   *
   * The question this check is really asking is "does saying start pull him
   * away" — so drive until he HAS pulled away, with a generous ceiling, and
   * let the distance be the evidence rather than the clock.
   */
  const started = r.startRide();
  const before = { x: v.x, z: v.z };
  let rolled = 0;
  for (let i = 0; i < 900; i++) {          // up to 30 s of simulated time
    r.update(1 / 30, ctx);
    rolled = Math.hypot(v.x - before.x, v.z - before.z);
    if (!r.ride || rolled > 25) break;
  }

  // 4. say stop
  const stopped = r.stopRide();

  return {
    ok: true, boarded,
    sawBoarding: midStates.includes('boarding'),
    walkedToIt: walkedToIt.toFixed(2),
    onSeat: onSeat.toFixed(2),
    dialogOpen, waiting,
    movedWhileWaiting: movedWhileWaiting.toFixed(2),
    hudWaiting, started, rolled: Math.round(rolled), stopped,
    endState: r.state,
  };
});
check('getting in is its own beat, not a teleport',
  beat.ok && beat.boarded && beat.sawBoarding && Number(beat.walkedToIt) > 1,
  beat.ok ? `walked ${beat.walkedToIt} m to the vehicle` : beat.why);
check('you end up on the seat', beat.ok && Number(beat.onSeat) < 1.2,
  beat.ok ? `${beat.onSeat} m from the vehicle centre` : beat.why);
check('he asks where to once you are in', beat.ok && beat.dialogOpen, String(beat.dialogOpen));
check('agreeing a fare does not start him moving',
  beat.ok && beat.waiting && Number(beat.movedWhileWaiting) < 0.5,
  beat.ok ? `state ${beat.waiting ? 'waiting' : '?'}, drifted ${beat.movedWhileWaiting} m in 2 s` : beat.why);
check('the HUD shows the waiting beat', beat.ok && beat.hudWaiting === true, String(beat.hudWaiting));
check('saying start pulls him away', beat.ok && beat.started && beat.rolled > 20,
  beat.ok ? `rolled ${beat.rolled} m` : beat.why);
check('saying stop ends it', beat.ok && (beat.stopped || beat.endState === 'idle'),
  beat.ok ? `ended in ${beat.endState}` : beat.why);

/* ================================================================
 * Does the ride arrive when it says it will?
 *
 * Reported as "it's been 1 min but not yet reached iskcon temple as it showed
 * erlier". The ETA quoted a PLAN — `pace` is worked out up front to hit the
 * 55 s target and capped at 26 m/s — and the road never allows it: `pathLimit`
 * slows him for every bend, `prof.lat` holds him through them, traffic stops
 * him, and he brakes for the last waypoints. Plan 26 m/s, measured nearer 11.
 *
 * Driven at a FIXED step rather than in wall-clock, deliberately. A headless
 * page presents no frames, so a real-time ride measures the harness and the
 * machine's load instead of the game — which is exactly why `driving.mjs` reads
 * 8.4 m/s on a quiet box and 0.2 on a busy one. 1/30 of simulated time is the
 * same on any machine.
 * ================================================================ */
const eta = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;

  // the long run: Chhatikara to ISKCON, which is the one that was reported
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  if (!v) return { ok: false, why: 'no vehicle to hail' };
  v.x = chhat.pos[0] + 4; v.z = chhat.pos[1]; v.chartered = false;
  r._acc = 99; r.update(0.5, ctx);
  if (!r.target) return { ok: false, why: 'no hail target' };

  r.board();
  for (let i = 0; i < 90; i++) r.update(1 / 30, ctx);
  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return { ok: false, why: 'ISKCON not offered' };
  el.click();
  if (!r.startRide()) return { ok: false, why: 'would not start' };

  const dt = 1 / 30;
  const quoted = [];                  // what the HUD promised, and when
  let t = 0, done = false, total = r.ride ? r.ride.total : 0;
  for (let i = 0; i < 30 * 900 && !done; i++) {
    r.update(dt, ctx);
    t += dt;
    if (!r.ride) { done = true; break; }
    // sample the promise at a few points along the way
    if (i % 300 === 0 && r.ride.t > 2) {
      const txt = (document.querySelector('#ride-hud .rh-left') || {}).textContent || '';
      const m = /about (\d+) min/.exec(txt);
      if (m) quoted.push({ at: t, said: Number(m[1]) * 60, metres: r.ride.metres });
      else if (/arriving/.test(txt)) quoted.push({ at: t, said: 25, metres: r.ride.metres });
    }
  }
  // how wrong was each promise, in the end?
  /*
   * Judged against the coarseness of the promise itself. "About 4 min" is a
   * number rounded to the minute, so being 29 s out is the format and not a
   * lie; being two minutes out is. The tolerance is therefore half a minute of
   * rounding plus a quarter of the time still to run.
   */
  const errs = quoted.map((q) => ({
    at: Math.round(q.at), said: q.said, actually: Math.round(t - q.at),
  }));
  const worst = errs.reduce((a, e) => {
    const slack = 30 + e.actually * 0.25;
    const err = Math.abs(e.said - e.actually) / slack;
    return err > a.err ? { err, e } : a;
  }, { err: 0, e: null });

  return { ok: true, arrived: done, seconds: Math.round(t), total: Math.round(total), errs, worst };
});

if (!eta.ok) {
  check('a long ride arrives', false, eta.why);
} else {
  check('a long ride actually arrives', eta.arrived,
    `${eta.total} m in ${eta.seconds} s of ride time`);
  check('and inside the five minutes it promises', eta.arrived && eta.seconds <= 300,
    `${eta.seconds} s, cap 300 s`);
  check('the countdown is not a work of fiction',
    eta.worst.e !== null && eta.worst.err <= 1,
    eta.worst.e
      ? `worst promise: at ${eta.worst.e.at} s it said ${eta.worst.e.said} s `
        + `and took ${eta.worst.e.actually} s — `
        + `${(eta.worst.err * 100).toFixed(0)}% of the slack allowed, `
        + `across ${eta.errs.length} samples`
      : 'never quoted anything');
}

/* ================================================================
 * Does the driver say anything?
 *
 * "The driver says nothing during a ride beyond the toasts" — a five-minute
 * ride across Braj in silence is the part of the rickshaw that still reads as a
 * vehicle rather than a person, and the ride is where most people spend their
 * first ten minutes here.
 *
 * What is checked is not that he talks, which is easy, but that he is BEARABLE:
 * he does not repeat himself, he leaves gaps, and what he says about a place is
 * said while going past that place.
 * ================================================================ */
const talk = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
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
  for (let i = 0; i < 90; i++) r.update(1 / 30, ctx);
  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return { ok: false, why: 'ISKCON not offered' };
  el.click();

  // listen in on the bubble
  const heard = [];
  const orig = ctx.ui.say ? ctx.ui.say.bind(ctx.ui) : null;
  ctx.ui.say = (text, who) => {
    heard.push({ t: r.ride ? r.ride.t : 0, text, onDriver: who === (r.ride && r.ride.car) });
    return orig ? orig(text, who) : undefined;
  };

  if (!r.startRide()) return { ok: false, why: 'would not start' };
  const dt = 1 / 30;
  for (let i = 0; i < 30 * 600 && r.ride; i++) r.update(dt, ctx);
  if (orig) ctx.ui.say = orig;

  let minGap = Infinity;
  for (let i = 1; i < heard.length; i++) minGap = Math.min(minGap, heard[i].t - heard[i - 1].t);
  const texts = heard.map((h) => h.text);
  const repeats = texts.length - new Set(texts).size;

  return {
    ok: true, lines: heard.length, repeats,
    minGap: heard.length > 1 ? minGap : null,
    firstAt: heard.length ? heard[0].t : null,
    allOnDriver: heard.every((h) => h.onDriver),
    sample: texts.slice(0, 3),
  };
});

if (!talk.ok) {
  check('the driver says something on the way', false, talk.why);
} else {
  check('the driver says something on the way', talk.lines >= 3,
    `${talk.lines} line(s), first at ${talk.firstAt === null ? 'n/a' : talk.firstAt.toFixed(0) + ' s'}`
    + (talk.sample.length ? ` — "${talk.sample[0]}"` : ''));

  check('he never says the same thing twice', talk.repeats === 0,
    `${talk.repeats} repeat(s) in ${talk.lines}`);

  check('and he is quiet in between',
    talk.minGap === null || talk.minGap >= 20,
    talk.minGap === null ? 'only one line'
      : `closest two lines ${talk.minGap.toFixed(0)} s apart`);

  check('he speaks over his own head, not into the corner', talk.allOnDriver,
    talk.allOnDriver ? 'every line anchored to the driver'
      : 'some lines were not anchored to him');
}

/* ================================================================
 * Where he sets you down — EVERY landmark, on a WARM graph
 *
 * The only arrival assertion here was `endDist < 60` for ISKCON, which passes
 * trivially for a 54x66 m building and says nothing at all about being
 * indoors. Meanwhile the rickshaw was setting you down *inside Banke Bihari
 * Mandir* — 11.1 m from its centre, with the interior mode actually engaging:
 * camera pulled in, ceiling clipped, standing in the sanctum.
 *
 * Two things this has to do that the old assertion did not.
 *
 * WARM THE GRAPH FIRST. `NavGraph.nearestDrivable` treats an edge it has not
 * measured as drivable, and edges are measured lazily, so the same query
 * answers differently depending on how much routing has already happened.
 * Cold, Banke Bihari answered 18.9 m out and passed; after seventy-odd routing
 * calls it answered 11.1 m and did not. A check that only ever runs cold tests
 * a state the player is almost never in.
 *
 * ASK THE RIGHT QUESTION. Not "how far from the centre" but "is this inside
 * the building" — using `InteriorSystem._contains`, the same test the game
 * uses to decide you are indoors, against the volume the builder declared.
 * ================================================================ */
const drop = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw, io = ctx.interior;
  if (!r || !r._setDown || !io) return { ok: false, why: 'no rickshaw or interior system' };

  const marks = ctx.data.LOCATIONS.filter((l) => l.build && (l.type === 'temple' || l.type === 'ghat'));

  /** Warm the lazy edge measurements the way a session does. */
  let warmed = 0;
  if (ctx.nav && ctx.nav.path) {
    for (let i = 0; i < marks.length && i < 24; i++) {
      const a = marks[i], b = marks[(i * 7 + 3) % marks.length];
      try { ctx.nav.path(a.pos[0], a.pos[1], b.pos[0], b.pos[1], true); warmed++; } catch { /* ignore */ }
    }
  }

  const insideOf = (loc, x, z) => {
    for (const v of io.volumes) {
      if (v.loc && v.loc.id === loc.id) return io._contains(v, x, z, 1.02);
    }
    const half = Math.max(loc.build.w, loc.build.d) * 0.5;
    return Math.hypot(x - loc.pos[0], z - loc.pos[1]) < half * 1.05;
  };

  const bad = [];
  for (const loc of marks) {
    const s = r._setDown(loc);
    if (insideOf(loc, s[0], s[1])) {
      bad.push({ id: loc.id, m: +Math.hypot(s[0] - loc.pos[0], s[1] - loc.pos[1]).toFixed(1) });
    }
  }
  return { ok: true, warmed, tested: marks.length, bad };
});

if (!drop.ok) {
  check('he never sets you down inside the building', false, drop.why);
} else {
  check('he never sets you down inside the building', drop.bad.length === 0,
    drop.bad.length
      ? drop.bad.map((q) => `${q.id} at ${q.m} m`).join(', ')
      : `all ${drop.tested} landmarks, on a graph warmed by ${drop.warmed} routings`);
}

console.log('');
if (errors.length) { console.log('CONSOLE ERRORS:'); errors.slice(0, 5).forEach((e) => console.log('  ' + e)); }
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed, ${errors.length} console errors`);
await b.close(); server.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
