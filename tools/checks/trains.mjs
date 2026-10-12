/**
 * Trains on the New Delhi-Mathura main line (TrainSystem.js).
 *
 * The line through Chhatikara carries every train between Delhi and both
 * Agra and Kota, and the world had its four tracks with nothing on them.
 * This asks: do trains run, on all four tracks and on no closed line; do
 * they keep left, as Indian Railways does; is every vehicle on its rails,
 * at its own size, clear of the masts and the bridge piers; does a train
 * sound and brake for you on the line, stop short when it can, and — when it
 * cannot — put you off to the side rather than carry you along; and is
 * anybody in the crowd ever inside one.
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
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true, get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.props, null, { timeout: 240000 });

const out = await p.evaluate(async () => {
  const app = window.vrindavan, ctx = app.ctx, w = ctx.world, TS = ctx.trains;
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.ui._endIntro();
  ctx.ui.show('world');
  if (!TS || !TS.paths || !TS.paths.length) return { missing: true };
  const { STOCK, project } = await import('/src/game/transport/TrainSystem.js');
  const { RAIL_TOP, WIRE_OVER_RAIL } = await import('/src/game/world/RailBuilder.js');
  const RAIL = ctx.data.RAIL;
  const dt = 1 / 30;
  const B = ctx.data.WORLD.bounds;
  const inside = (x, z) => x > B.minX && x < B.maxX && z > B.minZ && z < B.maxZ;
  const at = (path, s) => {
    const { P, cum } = path; let i = 1;
    while (i < P.length - 1 && cum[i] < s) i++;
    const t = Math.max(0, Math.min(1, (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    const dx = P[i][0] - P[i - 1][0], dz = P[i][1] - P[i - 1][1], l = Math.hypot(dx, dz) || 1;
    return { x: P[i - 1][0] + dx * t, z: P[i - 1][1] + dz * t, ux: dx / l, uz: dz / l };
  };
  // the time a vehicle's body overlaps a point, as a depth (0 if it does not)
  const depth = (c, x, z) => {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), dx = x - c.x, dz = z - c.z;
    const pa = c.hl - Math.abs(dx * fx + dz * fz), pc = c.hw - Math.abs(dx * fz - dz * fx);
    return pa > 0 && pc > 0 ? Math.min(pa, pc) : 0;
  };
  const deepest = (x, z, y) => {
    let d = 0;
    for (const c of TS.cars) if (!(Number.isFinite(y) && Math.abs(y - c.y) > 3)) d = Math.max(d, depth(c, x, z));
    return d;
  };
  const quiet = () => { for (const q of TS.paths) q.next = 1e9; TS.trains = []; TS._place(ctx); };
  const P0 = ctx.player.position;
  const still = () => { ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0; ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 0; };
  const putPlayer = (x, z) => { P0.set(x, w.groundHeight(x, z), z); ctx.player._standY = null; };

  /* ---- what runs, and where: seventy minutes of the timetable ---- */
  const seen = new Map();            // train -> record
  let overSpeed = 0, maxV = { passenger: 0, freight: 0 };
  let renderOff = 0, renderYaw = 0, renderY = 0, renderN = 0, renderWorst = null;
  let mastHits = 0, pierHits = 0, carsSeen = 0;
  const masts = w.colliders.filter((c) => c.tag === 'rail-mast');
  const piers = w.colliders.filter((c) => c.tag === 'bridge-pier');
  const sat = (c, o) => {
    // a vehicle's body against a box collider, separating axes
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ax = fz, az = -fx;
    const cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0);
    const bx = [cs, sn], bz = [-sn, cs];
    const dx = o.x - c.x, dz = o.z - c.z;
    for (const [nx, nz] of [[fx, fz], [ax, az], bx, bz]) {
      const ra = c.hl * Math.abs(fx * nx + fz * nz) + c.hw * Math.abs(ax * nx + az * nz);
      // the world keeps a box by its half sizes (WorldService._addColliders)
      const rb = o.hw * Math.abs(bx[0] * nx + bx[1] * nz) + o.hd * Math.abs(bz[0] * nx + bz[1] * nz);
      if (Math.abs(dx * nx + dz * nz) > ra + rb) return false;
    }
    return true;
  };
  const near = (list, c) => list.filter((o) => Math.abs(o.x - c.x) < 20 && Math.abs(o.z - c.z) < 20);
  for (let i = 0, n = Math.round(4200 / 0.2); i < n; i++) {
    TS.update(0.2, ctx);
    for (const t of TS.trains) {
      if (!seen.has(t)) seen.set(t, { path: t.path.track.id, kind: t.kind, cars: t.cars.length, len: t.len, first: null, last: null });
      const r = seen.get(t);
      const h = at(t.path, Math.min(t.head, t.path.L));
      if (t.head > 50 && t.head < t.path.L - 50) { if (!r.first) r.first = [h.x, h.z]; r.last = [h.x, h.z]; }
      maxV[t.kind] = Math.max(maxV[t.kind], t.v);
      if (t.v > (t.kind === 'passenger' ? 36 : 20.8) + 0.01) overSpeed++;
    }
    // every 2 s, against the masts and piers
    if (i % 10 === 5) {
      for (const c of TS.cars) {
        carsSeen++;
        for (const m of near(masts, c)) if (depth({ ...c, hl: c.hl + m.r, hw: c.hw + m.r }, m.x, m.z) > 0) mastHits++;
        for (const o of near(piers, c)) if (sat(c, o)) pierHits++;
      }
    }
    // every 20 s, the vehicles as drawn, measured off their instances
    if (i % 100 !== 50) continue;
    for (const [kind, m] of Object.entries(TS.inst)) {
      const e = m.instanceMatrix.array;
      for (let k = 0; k < m.count; k++) {
        const x = e[k * 16 + 12], y = e[k * 16 + 13], z = e[k * 16 + 14];
        const yaw = Math.atan2(e[k * 16 + 8], e[k * 16 + 10]);
        let best = null;
        for (const q of TS.paths) { const pr = project(q, x, z); if (!best || pr.d < best.d) best = { d: pr.d, q, s: pr.s }; }
        const dir = at(best.q, best.s);
        let dy = Math.abs(yaw - Math.atan2(dir.ux, dir.uz)) % (Math.PI * 2);
        if (dy > Math.PI) dy = Math.PI * 2 - dy;
        renderN++;
        if (best.d > renderOff) { renderOff = best.d; renderWorst = [Math.round(x), Math.round(z), kind]; }
        renderYaw = Math.max(renderYaw, dy * 180 / Math.PI);
        renderY = Math.max(renderY, Math.abs(y - (w.groundHeight(x, z) + RAIL_TOP)));
      }
    }
  }
  const trains = [...seen.values()];
  const byPath = {};
  for (const q of TS.paths) byPath[q.track.id] = 0;
  for (const r of trains) byPath[r.path] = (byPath[r.path] || 0) + 1;

  /* ---- which way: on the left of its pair, going the way it goes ---- */
  const ref = [-6900, 2300];
  const foot = TS.paths.map((q) => { const pr = project(q, ...ref); const a = at(q, pr.s); return { q, x: a.x, z: a.z, ux: a.ux, uz: a.uz }; });
  const sides = [];
  for (const f of foot) {
    let pair = null;
    for (const g of foot) if (g !== f && (!pair || Math.hypot(g.x - f.x, g.z - f.z) < Math.hypot(pair.x - f.x, pair.z - f.z))) pair = g;
    // the way its trains actually went, from where they were seen
    const runs = trains.filter((r) => r.path === f.q.track.id && r.first && r.last);
    const hx = runs.reduce((n, r) => n + r.last[0] - r.first[0], 0), hz = runs.reduce((n, r) => n + r.last[1] - r.first[1], 0);
    const hl = Math.hypot(hx, hz) || 1;
    // left of a heading (x east, z south) is (hz, -hx)
    const left = ((f.x - pair.x) * (hz / hl) + (f.z - pair.z) * (-hx / hl));
    sides.push({ id: f.q.track.id, to: hz > 0 ? 'Mathura' : 'Delhi', pairGap: +Math.hypot(pair.x - f.x, pair.z - f.z).toFixed(1), left: +left.toFixed(2) });
  }

  /* ---- the stock at its own size, measured off the geometry ---- */
  const sizes = {};
  for (const [kind, m] of Object.entries(TS.inst)) {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    sizes[kind] = { l: +(bb.max.z - bb.min.z).toFixed(2), w: +(bb.max.x - bb.min.x).toFixed(2), h: +(bb.max.y - bb.min.y).toFixed(2), want: STOCK[kind] };
  }

  /* ---- you, on the line: far enough ahead for it to stop ---- */
  quiet();
  const A = TS.paths.find((q) => q.track.name) || TS.paths[0];
  let horns = 0;
  const off = ctx.bus.on('sfx', (e) => { if (e.name === 'trainhorn') horns++; });
  const sMe = 760, me = at(A, sMe);
  putPlayer(me.x, me.z);
  A.next = 0;
  let stopAt = null, stopV = null, inMe = 0, frames = 0;
  still();
  while (frames++ < 90 * 30) {
    ctx.player.update(dt, ctx); TS.update(dt, ctx);
    inMe = Math.max(inMe, deepest(P0.x, P0.z, P0.y));
    const t = TS.trains[0];
    if (t && t.v < 0.05 && t.head > 100) { stopAt = sMe - t.head; stopV = t.v; break; }
  }
  const hornsStop = horns;
  // and when you step off, it goes on
  const lx = me.uz, lz = -me.ux;               // left of the line going to Mathura: away from the others
  putPlayer(me.x + lx * 9, me.z + lz * 9);
  let wentOn = false;
  for (let k = 0; k < 120 * 30 && TS.trains.length; k++) {
    ctx.player.update(dt, ctx); TS.update(dt, ctx);
    if (TS.trains[0] && TS.trains[0].head > sMe + 60) { wentOn = true; break; }
  }

  /* ---- you, on the line: too late for it to stop ---- */
  quiet();
  putPlayer(me.x + lx * 9, me.z + lz * 9);
  A.next = 0;
  horns = 0;
  for (let k = 0; k < 120 * 30; k++) {
    TS.update(dt, ctx);
    if (TS.trains[0] && TS.trains[0].head > sMe - 90) break;
  }
  const t2 = TS.trains[0];
  const lineV = t2 ? t2.line : 0;
  putPlayer(me.x, me.z);
  let inLate = 0, minV = Infinity, contact = false;
  const s0 = project(A, P0.x, P0.z).s;
  for (let k = 0; k < 60 * 30 && TS.trains.length; k++) {
    still();
    ctx.player.update(dt, ctx); TS.update(dt, ctx);
    inLate = Math.max(inLate, deepest(P0.x, P0.z, P0.y));
    const t = TS.trains[0];
    if (!t) break;
    if (t.head > sMe - 2 && !contact) { contact = true; minV = t.v; }
    if (t.head - t.len > sMe + 5) break;
  }
  const after = project(A, P0.x, P0.z);
  off();

  /* ---- the crowd: some of them on the line as trains come ---- */
  quiet();
  const sC = 520, c0 = at(A, sC);
  putPlayer(c0.x + lx * 30, c0.z + lz * 30);
  for (const q of TS.paths) q.next = 0;
  const people = [];
  for (const slot of ctx.crowd.peopleInst) for (const a of slot.agents) if (people.length < 8) people.push(a);
  people.forEach((a, i) => {
    const q = TS.paths[i % TS.paths.length], s = sC - 60 + 30 * Math.floor(i / TS.paths.length), pt = at(q, s);
    a.x = pt.x; a.z = pt.z; a.y = w.groundHeight(pt.x, pt.z);
  });
  let inCrowd = 0, pushed = 0;
  const was = people.map((a) => [a.x, a.z]);
  for (let k = 0; k < 45 * 30; k++) {
    ctx.crowd.update(dt, ctx); TS.update(dt, ctx);
    const all = [...ctx.crowd.peopleInst.flatMap((s) => s.agents), ...ctx.crowd.cows, ...ctx.crowd.dogs];
    for (const a of all) inCrowd = Math.max(inCrowd, deepest(a.x, a.z, a.y));
  }
  people.forEach((a, i) => { if (Math.hypot(a.x - was[i][0], a.z - was[i][1]) > 0.5) pushed++; });

  return {
    trains: trains.map((r) => ({ path: r.path, kind: r.kind, cars: r.cars, len: Math.round(r.len) })),
    byPath, metreRun: TS.paths.some((q) => q.track.kind !== 'main' || q.track.dismantled),
    maxV, overSpeed, renderN, renderOff: +renderOff.toFixed(3), renderWorst, renderYaw: +renderYaw.toFixed(2), renderY: +renderY.toFixed(3),
    carsSeen, mastHits, pierHits, masts: masts.length, piers: piers.length,
    sides, sizes, wire: WIRE_OVER_RAIL,
    stopAt: stopAt === null ? null : +stopAt.toFixed(1), hornsStop, inMe: +inMe.toFixed(3), wentOn,
    lineV: +lineV.toFixed(1), minV: minV === Infinity ? null : +minV.toFixed(1), contact, horns, inLate: +inLate.toFixed(3),
    carried: +Math.abs(after.s - s0).toFixed(2), aside: +after.d.toFixed(2),
    inCrowd: +inCrowd.toFixed(3), pushed,
    dismantled: RAIL.tracks.filter((q) => q.dismantled).map((q) => q.id),
  };
});

if (out.missing) {
  check('trains run on the main line', false, 'no TrainSystem, or no main-line track');
} else {
  const kinds = out.trains.reduce((m, t) => ((m[t.kind] = (m[t.kind] || 0) + 1), m), {});
  check('trains run on all four main-line tracks, expresses and freight',
    Object.keys(out.byPath).length === 4 && Object.values(out.byPath).every((n) => n >= 1) && kinds.passenger >= 1 && kinds.freight >= 1,
    `${out.trains.length} in 70 minutes: ${kinds.passenger || 0} expresses, ${kinds.freight || 0} freight; by track ${JSON.stringify(out.byPath)}`);
  check('and nothing on the metre gauge, closed and taken up since 2023',
    !out.metreRun && out.dismantled.length >= 1, `dismantled: ${out.dismantled.join(', ') || 'none'}`);
  check('each keeps left, as Indian Railways runs',
    out.sides.length === 4 && out.sides.every((s) => s.left > 2 && s.pairGap < 8),
    out.sides.map((s) => `${s.id} to ${s.to}: ${s.left} m left of its pair`).join('; '));
  const bad = Object.entries(out.sizes).filter(([k, s]) => Math.abs(s.l - s.want.l) > 0.15 || Math.abs(s.w - s.want.w) > 0.08
    || Math.abs(s.h - (/wap7|wag9/.test(k) ? out.wire : s.want.h)) > 0.05);
  check('every vehicle at its own size (the locomotives\' pantograph at the wire)', bad.length === 0,
    Object.entries(out.sizes).map(([k, s]) => `${k} ${s.l}×${s.w}×${s.h}`).join(', '));
  check('every vehicle on its rails, as drawn',
    out.renderN > 200 && out.renderOff < 0.3 && out.renderYaw < 3 && out.renderY < 0.03,
    `${out.renderN} measured: ${out.renderOff} m off the track at worst${out.renderWorst ? ' ' + JSON.stringify(out.renderWorst) : ''}, ${out.renderYaw}° off its line, ${out.renderY} m off the rail top`);
  check('at line speed, and no faster', out.overSpeed === 0 && out.maxV.passenger > 29 && out.maxV.freight > 14,
    `fastest express ${(out.maxV.passenger * 3.6).toFixed(0)} km/h, freight ${(out.maxV.freight * 3.6).toFixed(0)} km/h`);
  check('clear of every mast and bridge pier', out.carsSeen > 1000 && out.mastHits === 0 && out.pierHits === 0,
    `${out.carsSeen} vehicles against ${out.masts} masts and ${out.piers} piers: ${out.mastHits + out.pierHits} touching`);
  check('on the line ahead of one, it sounds and stops short of you',
    out.stopAt !== null && out.stopAt > 3 && out.stopAt < 80 && out.hornsStop >= 1 && out.inMe === 0,
    out.stopAt === null ? 'it never stopped' : `stopped ${out.stopAt} m short, ${out.hornsStop} horn${out.hornsStop === 1 ? '' : 's'}`);
  check('and goes on when you step off', out.wentOn, out.wentOn ? 'gone past' : 'still standing there');
  check('stepping on too late: it brakes, and puts you off to the side, never through you, never along',
    out.contact && out.minV < out.lineV && out.horns >= 1 && out.inLate === 0 && out.carried < 1.5 && out.aside > 1.9,
    `${out.lineV} m/s down to ${out.minV} at you; ${out.inLate} m inside; carried ${out.carried} m, put ${out.aside} m off the line`);
  check('nobody in the crowd is ever inside one', out.inCrowd < 0.02 && out.pushed >= 4,
    `${out.pushed} of 8 put on the line were moved off; deepest anybody was inside: ${out.inCrowd} m`);
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
if (errs.length) for (const e of errs.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === res.length && !errs.length ? 0 : 1);
