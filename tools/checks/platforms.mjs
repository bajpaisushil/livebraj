/**
 * You cannot walk INTO a raised floor, and you can always get ONTO a flight.
 *
 * "i get vanished under stairs on walking instead of stepping up" — at Prem
 * Mandir, after it had been rebuilt once. Two faults, neither of which any
 * check could see:
 *
 *   1. The jagati was `standOnly`. collide() never blocks on those, and
 *      standHeight() will not lift you more than a step onto one, so from the
 *      paving the body walked straight on at ground level into the side of a
 *      2.4 m platform — 34 m under the marble, walked from the east.
 *   2. The broad flight started from a plaza drawn 0.65 m up that had no
 *      floor, so its first tread was a full metre over the feet trying to
 *      take it. steps.mjs walks every flight tread to tread, but it STARTS ON
 *      the bottom tread, so a flight nobody can get onto passed.
 *
 * So this asks both questions of every raised floor and every flight in the
 * world, with the player's own movement — step, world.collide(p, 0.42, feet),
 * world.standHeight(p, feet), no blocking on a tall rise because the player
 * has none — and then walks Prem Mandir end to end: paving, broad flight,
 * jagati, the kursi's steps, the door, the darshan spot.
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

const res = [];
const check = (name, ok, detail = '') => {
  res.push(!!ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.standables?.length
  && window.vrindavan?.ctx?.interior?.volumes?.length, null, { timeout: 220000 });

const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const R = 0.42;
  const nearest = (x, z) => {
    let best = null, bd = 1e9;
    for (const l of ctx.data.LOCATIONS) {
      const d = Math.hypot(l.pos[0] - x, l.pos[1] - z);
      if (d < bd) { bd = d; best = l.id; }
    }
    return best;
  };
  /** one tick of the player's own movement */
  const tick = (st, tx, tz, stepLen = 0.09) => {
    const dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return d;
    const k = Math.min(stepLen, d) / d;
    const q = { x: st.x + dx * k, y: 0, z: st.z + dz * k };
    W.collide(q, R, st.feet);
    st.feet = W.standHeight(q.x, q.z, st.feet);
    st.x = q.x; st.z = q.z;
    return d;
  };
  // world <-> a normalised box collider's own frame (see WorldService._overlaps)
  const toW = (c, lx, lz) => [c.x + lx * c.cos + lz * c.sin, c.z - lx * c.sin + lz * c.cos];
  const toL = (c, x, z) => { const dx = x - c.x, dz = z - c.z; return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos]; };

  /* ---- 1. raised floors: walk into every side from open ground ---- */
  const floors = W.standables.filter((c) => c.type === 'box' && c.tag === 'temple-floor' && !c.soft
    && c.top - W.groundHeight(c.x, c.z) > 0.6);
  const insideOther = (x, z, self) => floors.some((f) => f !== self && W._overlaps(f, x, z, 0.3));
  /*
   * A STOREY CEILING IS NOT A PLATFORM.
   *
   * Ashta Sakhi's darshan floor is 4.75 m up over a row of shops, and walking
   * in off the lane and about under it is the whole point of a ground floor.
   * A raised floor is a MASS you must not be inside only where there is no
   * room under it — so a walk-in is excused where the floor has standing
   * headroom over the ground AND the spot is inside a declared interior
   * volume, which is to say a room somebody is meant to be able to enter.
   * Prem Mandir's 1.36 m kursi has no headroom and is still judged, as is
   * Krishna Balaram's 0.92 m hall floor.
   */
  const HEADROOM = 2.2;
  const vols = (ctx.interior && ctx.interior.volumes) || [];
  const aRoom = (x, z) => vols.some((v) => ctx.interior._contains(v, x, z, 1.0));
  let approaches = 0, skipped = 0;
  const intrusions = [];
  for (const c of floors) {
    const sides = [[1, 0, c.hw, c.hd], [-1, 0, c.hw, c.hd], [0, 1, c.hd, c.hw], [0, -1, c.hd, c.hw]];
    for (const [ux, uz, half, along] of sides) {
      for (const t of [-0.8, -0.4, 0, 0.4, 0.8]) {
        // a point 2.5 m out from this side, and a walk 5 m straight in
        const lx0 = ux ? ux * (half + 2.5) : t * along, lz0 = uz ? uz * (half + 2.5) : t * along;
        const [sx, sz] = toW(c, lx0, lz0);
        const g = W.groundHeight(sx, sz);
        const feet0 = W.standHeight(sx, sz, g);
        if (feet0 - g > 0.3 || !W.isClear(sx, sz, R) || insideOther(sx, sz, c)) { skipped++; continue; }
        approaches++;
        const [tx, tz] = toW(c, ux ? ux * (half - 2.5) : t * along, uz ? uz * (half - 2.5) : t * along);
        const st = { x: sx, z: sz, feet: feet0 };
        let worst = 0;
        for (let k = 0; k < 90; k++) {
          if (tick(st, tx, tz) < 0.1) break;
          const [lx, lz] = toL(c, st.x, st.z);
          const inside = Math.min(c.hw - Math.abs(lx), c.hd - Math.abs(lz));
          if (inside > 0.5 && st.feet < c.top - 0.6
            && !(c.top - W.groundHeight(st.x, st.z) >= HEADROOM && aRoom(st.x, st.z))) {
            worst = Math.max(worst, inside);
          }
        }
        if (worst > 0) intrusions.push({ at: nearest(c.x, c.z), floorOver: +(c.top - W.groundHeight(c.x, c.z)).toFixed(2), inside: +worst.toFixed(1) });
      }
    }
  }
  const byPlace = {};
  for (const i of intrusions) byPlace[i.at] = (byPlace[i.at] || 0) + 1;

  /* ---- 2. every flight that rises from the ground can be got onto ---- */
  const treads = W.standables.filter((c) => c.tag && /step/.test(c.tag));
  const parent = treads.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < treads.length; i++) {
    for (let j = i + 1; j < treads.length; j++) {
      const a = treads[i], c = treads[j];
      if (a.tag === c.tag && Math.abs(a.x - c.x) < 3.6 && Math.abs(a.z - c.z) < 3.6
        && Math.hypot(a.x - c.x, a.z - c.z) <= 3.6) { const ra = find(i), rc = find(j); if (ra !== rc) parent[rc] = ra; }
    }
  }
  const flights = new Map();
  treads.forEach((t, i) => { const k = find(i); if (!flights.has(k)) flights.set(k, []); flights.get(k).push(t); });
  let flightsTested = 0, flightsSkipped = 0;
  const unreachable = [];
  for (const [, list] of flights) {
    if (list.length < 3) continue;
    const levels = [];
    for (const t of list) {
      const lv = levels.find((q) => Math.abs(q.top - t.top) < 0.05);
      if (lv) { lv.sx += t.x; lv.sz += t.z; lv.n++; } else levels.push({ top: t.top, sx: t.x, sz: t.z, n: 1 });
    }
    for (const lv of levels) { lv.x = lv.sx / lv.n; lv.z = lv.sz / lv.n; }
    levels.sort((a, c) => a.top - c.top);
    if (levels.length < 3 || levels[levels.length - 1].top - levels[0].top < 0.5) continue;
    const L0 = levels[0], L1 = levels[1];
    // a flight cut DOWN into a bank (a ghat) is got onto from the top: not this test
    if (L0.top < W.groundHeight(L0.x, L0.z) - 0.05) { flightsSkipped++; continue; }
    let dx = L0.x - L1.x, dz = L0.z - L1.z; const dl = Math.hypot(dx, dz);
    if (dl < 0.1) { flightsSkipped++; continue; }
    dx /= dl; dz /= dl;
    const sx = L0.x + dx * 1.6, sz = L0.z + dz * 1.6;
    if (!W.isClear(sx, sz, R)) { flightsSkipped++; continue; }
    /*
     * A FLIGHT IS APPROACHED FROM ITS OWN LANDING, not from the terrain.
     *
     * Asking standHeight from the terrain under the foot of Prem Mandir's
     * kursi steps puts the walker on the ground UNDER the jagati — 2.09 m
     * below a flight that starts on the marble — and then reports a flight
     * nobody can climb. What it had actually found was a start point inside
     * the platform. A person at the foot of a flight is standing on whatever
     * that flight rises from, so the query starts from the bottom tread.
     */
    const st = { x: sx, z: sz, feet: W.standHeight(sx, sz, L0.top) };
    if (Math.abs(st.feet - L0.top) > 0.8) { flightsSkipped++; continue; }
    flightsTested++;
    const start = st.feet;
    for (const lv of levels) for (let k = 0; k < 80; k++) if (tick(st, lv.x, lv.z) < 0.1) break;
    const top = levels[levels.length - 1].top;
    if (st.feet < top - 0.06) {
      unreachable.push({ at: nearest(L0.x, L0.z), tag: L0.tag, firstRiser: +(L0.top - start).toFixed(2),
        reached: +(st.feet - start).toFixed(2), of: +(top - start).toFixed(2) });
    }
  }

  /* ---- 3. Prem Mandir end to end ---- */
  const loc = ctx.data.LOCATION_BY_ID.get('prem-mandir');
  const [x0, z0] = loc.pos, cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [x0 + lx * cs - lz * sn, z0 + lx * sn + lz * cs];
  const A = W.anchors['prem-mandir'];
  const route = [P(100, 0), P(60, 0), P(36, 0), P(29, 0), [A.darshan.x, A.darshan.z]];
  const [sx, sz] = route[0];
  const st = { x: sx, z: sz, feet: W.standHeight(sx, sz, W.groundHeight(sx, sz)) };
  const trace = [];
  let lowest = Infinity;
  for (const [tx, tz] of route.slice(1)) {
    for (let k = 0; k < 900; k++) {
      if (tick(st, tx, tz) < 0.1) break;
      if (k % 40 === 0) trace.push(+(st.feet - W.groundHeight(x0, z0)).toFixed(2));
    }
  }
  const endGap = Math.hypot(st.x - A.darshan.x, st.z - A.darshan.z);
  return {
    floors: floors.length, approaches, skipped, intrusions: intrusions.length, byPlace, sample: intrusions.slice(0, 4),
    flightsTested, flightsSkipped, unreachable,
    prem: { endGap: +endGap.toFixed(2), feet: +st.feet.toFixed(2), floor: +A.floor.toFixed(2), trace },
  };
});

check('there are raised floors to test', out.floors > 5 && out.approaches > 20,
  `${out.floors} raised floors, ${out.approaches} approaches from open ground (${out.skipped} starts not in the open)`);
check('no raised floor can be walked into from the ground beside it', out.intrusions === 0,
  out.intrusions ? `${out.intrusions} walk-ins: ${JSON.stringify(out.byPlace)} e.g. ${JSON.stringify(out.sample)}` : 'every side blocks or is climbed');
check('every flight that rises from the ground can be got onto and climbed', out.flightsTested >= 3 && out.unreachable.length === 0,
  `${out.flightsTested} flights walked from the ground up (${out.flightsSkipped} cut into banks or boxed in)`
  + (out.unreachable.length ? ` — cannot climb: ${JSON.stringify(out.unreachable.slice(0, 4))}` : ''));
check('Prem Mandir: paving, broad flight, jagati, kursi steps and the door, to the darshan spot',
  out.prem.endGap < 0.6 && Math.abs(out.prem.feet - out.prem.floor) < 0.05,
  `ended ${out.prem.endGap} m from it, feet ${out.prem.feet} against the temple floor ${out.prem.floor}; feet over ground along the way ${JSON.stringify(out.prem.trace)}`);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed === res.length ? 0 : 1);
