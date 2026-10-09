/**
 * Do the bridges carry their roads, and does the ground go on under them?
 *
 * Every road was a ribbon on the terrain, a bridge too: NH 44's flyover at
 * Chhatikara, where everybody starts, crossed the junction at grade, and the
 * road over the Yamuna ran down the riverbed under the water (queue items
 * 12 and 24). Bridges.js lifts them. This walks it rather than looking at it:
 * the deck stands where the flyover does, a ramp you can climb, a parapet that
 * keeps you on, a road under it you can walk along without touching it, a
 * camera that is not stopped there, a network that never joins the deck to
 * the road it crosses, a pontoon over the water, and a vehicle that drives up
 * onto the deck rather than along the ground under it.
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
// the check owns the clock: the game loop is held and every step is ours
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true, get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.crowd
  && window.vrindavan?.ctx?.nav, null, { timeout: 240000 });

const out = await p.evaluate(() => {
  const app = window.vrindavan, ctx = app.ctx, w = ctx.world;
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const pos = ctx.player.position;
  const ROADS = ctx.data.ROADS;
  const road = (id) => ROADS.find((r) => r.id === id);
  const fly = [road('r973946075'), road('r973946074')];        // NH 44's two carriageways over Chhatikara
  const pontoon = road('r670922315');                            // over the Yamuna, north-east of town
  if (fly.some((r) => !r || !r.bridge) || !pontoon || !pontoon.bridge) return { missing: true };

  // a point a fraction of the way along a road, and the way it runs there
  const along = (r, f) => {
    const P = r.points; let L = 0; const cum = [0];
    for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(L); }
    const s = f * L;
    let i = 1; while (i < P.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    const ux = (P[i][0] - P[i - 1][0]) / ((cum[i] - cum[i - 1]) || 1), uz = (P[i][1] - P[i - 1][1]) / ((cum[i] - cum[i - 1]) || 1);
    return { p: [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t], ux, uz, L };
  };
  const g = (x, z) => w.groundHeight(x, z);
  const top = (x, z) => w.standHeight(x, z, g(x, z) + 30);      // the highest surface over a spot

  /* ---- the deck, where the flyover is ---- */
  const lifts = fly.map((r) => { const m = along(r, 0.5).p; return +(top(...m) - g(...m)).toFixed(2); });

  /* ---- a ramp a body can climb: follow it from the foot, a metre at a time ---- */
  const climbs = fly.map((r) => {
    const L = along(r, 0).L;
    let feet = null, hi = 0;
    for (let s = 0; s <= L * 0.5; s += 1) {
      const q = along(r, s / L).p;
      feet = feet === null ? g(...q) : w.standHeight(q[0], q[1], feet);
      hi = Math.max(hi, feet - g(...q));
    }
    return +hi.toFixed(2);
  });

  /* ---- walking ---- */
  const place = (q, feet) => { pos.set(q[0], w.standHeight(q[0], q[1], feet), q[1]); ctx.player._standY = null; };
  const go = (q, cap = 1200) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, lo = Infinity, hi = -Infinity, overG = -Infinity, jump = 0;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.45) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      const px = pos.x, pz = pos.z;
      ctx.player.update(1 / 30, ctx);
      /*
       * A step longer than a stride is not walking: wedged for 1.5 s, the
       * player is lifted out to the nearest free ground, which for a thin
       * wall is its far side. Through a solid parapet, that read as walking
       * under it.
       */
      jump = Math.max(jump, Math.hypot(pos.x - px, pos.z - pz));
      lo = Math.min(lo, pos.y); hi = Math.max(hi, pos.y); overG = Math.max(overG, pos.y - g(pos.x, pos.z));
      n++;
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 15; i++) ctx.player.update(1 / 30, ctx);
    return { miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: +pos.y.toFixed(2), lo: +lo.toFixed(2), hi: +hi.toFixed(2), overG: +overG.toFixed(2), jump: +jump.toFixed(2) };
  };

  // up the ramp and along the deck to the middle, on the first carriageway
  const r0 = fly[0];
  place(along(r0, 0).p, g(...along(r0, 0).p));
  let up = null, worst = 0;
  for (let f = 0.05; f <= 0.5001; f += 0.05) {
    up = go(along(r0, f).p);
    worst = Math.max(worst, up.miss);
    if (up.miss > 2) break;
  }
  const mid = along(r0, 0.5);
  const onDeck = { worst: +worst.toFixed(2), y: up.y, deck: +top(...mid.p).toFixed(2) };

  // then for the outer side, as far as the deck goes and twenty metres more
  const half = r0.width / 2;
  // the outer side is the one away from the other carriageway
  const other = along(fly[1], 0.5).p;
  const nx = -mid.uz, nz = mid.ux;
  const side = ((other[0] - mid.p[0]) * nx + (other[1] - mid.p[1]) * nz) > 0 ? -1 : 1;
  const off = [mid.p[0] + nx * side * (half + 20), mid.p[1] + nz * side * (half + 20)];
  go(off, 900);
  /*
   * Where you stopped: still on the deck, at its edge — no deck two metres
   * further out. (The player will not walk off a drop like this one at all,
   * so it is not the parapet that stops you here; the parapet is asked on its
   * own, below.)
   */
  const wx = nx * side, wz = nz * side;
  const beyond = [pos.x + wx * 2, pos.z + wz * 2];
  // the parapet nearest where you stopped: does it stop a body on the deck,
  // and leave alone one on the road under it?
  let par = null, pd = Infinity;
  for (const c of w.colliders) {
    if (c.tag !== 'bridge-parapet') continue;
    const d = Math.hypot(c.x - pos.x, c.z - pos.z);
    if (d < pd) { pd = d; par = c; }
  }
  const edge = {
    y: +pos.y.toFixed(2), deck: +top(pos.x, pos.z).toFixed(2),
    beyond: +(top(...beyond) - g(...beyond)).toFixed(2),
    stopsDeck: par ? !w.fits(par.x, par.z, 0.42, top(pos.x, pos.z)) : false,
    freesGround: par ? w.fits(par.x, par.z, 0.42, g(par.x, par.z)) : false,
  };

  /*
   * Under it: across, between two piers, from the service road on one side
   * to the service road on the other — measured from between the two
   * carriageways, since the shops line both service roads beyond.
   */
  const mid2 = along(r0, 0.5 + 6 / mid.L);
  let best = null;
  { const P = fly[1].points;
    for (let i = 1; i < P.length; i++) {
      const ax = P[i - 1][0], az = P[i - 1][1], bx = P[i][0], bz = P[i][1];
      const L2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
      const tt = Math.max(0, Math.min(1, ((mid2.p[0] - ax) * (bx - ax) + (mid2.p[1] - az) * (bz - az)) / L2));
      const q = [ax + (bx - ax) * tt, az + (bz - az) * tt];
      const d = Math.hypot(q[0] - mid2.p[0], q[1] - mid2.p[1]);
      if (!best || d < best.d) best = { q, d };
    } }
  const pair = [(mid2.p[0] + best.q[0]) / 2, (mid2.p[1] + best.q[1]) / 2];
  const reach = best.d / 2 + half + 3;
  const a = [pair[0] - nx * reach, pair[1] - nz * reach];
  const c = [pair[0] + nx * reach, pair[1] + nz * reach];
  place(a, g(...a));
  const under = go(c);
  under.span = +(2 * reach).toFixed(1);

  // and the camera there, at the height it rides behind you
  const camUnder = !w._blocked(mid2.p[0], mid2.p[1], g(...mid2.p) + 2.6, 0.2);

  /* ---- the network: the deck meets the ground only where a span lands ---- */
  const ends = [];
  for (const r of ROADS) if (r.bridge) { ends.push(r.points[0], r.points[r.points.length - 1]); }
  let joins = 0, deckNodes = 0; const joinAt = [];
  for (const n of ctx.nav.nodes.values()) {
    if (!n.deck) continue;
    deckNodes++;
    for (const e of n.edges) {
      const m = ctx.nav.nodes.get(e.to);
      if (!m || m.deck) continue;
      if (ends.some((q) => Math.hypot(q[0] - m.x, q[1] - m.z) < 12)) continue;
      joins++; if (joinAt.length < 3) joinAt.push([Math.round(m.x), Math.round(m.z)]);
    }
  }

  /* ---- the pontoon: over the water, never in it ---- */
  let overWater = Infinity, wet = 0;
  { const L = along(pontoon, 0).L;
    for (let s = 0; s <= L; s += 2) {
      const q = along(pontoon, s / L).p;
      if (!w.terrain.isWater(q[0], q[1])) continue;
      wet++;
      overWater = Math.min(overWater, top(...q) - (-3.6));
    } }

  /* ---- a vehicle on the flyover drives up onto it ---- */
  let ride = null;
  { const crowd = ctx.crowd;
    const all = []; for (const s of crowd.vehicleInst) for (const v of s.agents) all.push(v);
    const v = all[0];
    const foot = along(r0, 0).p;
    const startNode = ctx.nav.nearest(foot[0], foot[1]);
    const firstDeck = startNode && startNode.edges.map((e) => ctx.nav.nodes.get(e.to)).find((m) => m && m.deck);
    if (v && firstDeck) {
      v.x = startNode.x; v.z = startNode.z; v.y = g(v.x, v.z); v.vel = 0; v.round = null; v.nextPick = null;
      v.prev = startNode; v.target = firstDeck; v.node = firstDeck; v.lane = 0; v.idle = 0; v.greeting = 0;
      v.yaw = Math.atan2(firstDeck.x - startNode.x, firstDeck.z - startNode.z);
      // until it is past the middle, or a minute and a half: on a deck leg it
      // is on the deck, never under it
      let hi = 0, under = 0, frames = 0;
      const midP = along(r0, 0.5).p;
      for (let i = 0; i < 30 * 90; i++) {
        crowd.update(1 / 30, ctx);
        const over = v.y - g(v.x, v.z);
        if (over > hi) hi = over;
        if (v.prev && v.prev.deck && v.target && v.target.deck) {
          frames++;
          if (v.y < top(v.x, v.z) - 0.5) under++;
        }
        if (Math.hypot(v.x - midP[0], v.z - midP[1]) < 6) break;
      }
      ride = { hi: +hi.toFixed(2), under, frames };
    } }

  return { lifts, climbs, onDeck, edge, under, camUnder, joins, joinAt, deckNodes, overWater: +overWater.toFixed(2), wet, ride };
});

if (out.missing) {
  check('the flyover and the pontoon are carried as bridges', false, 'a bridge road is missing, or not marked');
} else {
  check('NH 44 stands on its flyover at Chhatikara, both carriageways',
    out.lifts.every((h) => h > 6.5 && h < 8.5), `${out.lifts.join(' and ')} m over the ground at mid-span`);
  check('its ramp can be climbed a step at a time',
    out.climbs.every((h) => h > 6.5), `followed from the foot, a body is ${out.climbs.join(' and ')} m up by mid-span`);
  check('walked up the ramp, you are on the deck in the middle',
    out.onDeck.worst < 1.5 && Math.abs(out.onDeck.y - out.onDeck.deck) < 0.3,
    `${out.onDeck.worst} m short at worst, at ${out.onDeck.y} (deck ${out.onDeck.deck})`);
  check('walked at the side, you stay on the deck at its edge',
    Math.abs(out.edge.y - out.edge.deck) < 0.3 && out.edge.beyond < 0.5,
    `for 30 s: at ${out.edge.y} (deck ${out.edge.deck}), ${out.edge.beyond} m of deck 2 m further out`);
  check('the parapet stops a body on the deck, and not one on the road under it',
    out.edge.stopsDeck && out.edge.freesGround, `on the deck: ${out.edge.stopsDeck ? 'stopped' : 'NOT stopped'}; under it: ${out.edge.freesGround ? 'free' : 'STOPPED'}`);
  check('under it, you walk straight across on the ground',
    out.under.miss < 1 && out.under.overG < 0.6 && out.under.jump < 0.3,
    `${out.under.span} m across: ${out.under.miss} m short, never more than ${out.under.overG} m over the ground, `
    + `${out.under.jump < 0.3 ? 'walking all the way' : 'LIFTED OUT ' + out.under.jump + ' m — something stopped it'}`);
  check('and the camera is not stopped under the deck', out.camUnder, '');
  check('the deck meets the ground only where a span lands',
    out.deckNodes > 50 && out.joins === 0, `${out.deckNodes} deck nodes, ${out.joins} joined to the road under them${out.joinAt.length ? ' at ' + JSON.stringify(out.joinAt) : ''}`);
  check('the pontoon is over the Yamuna, not in it',
    out.wet > 5 && out.overWater > 0.5, `${out.wet} samples over the water, the deck ${out.overWater} m above it at its lowest`);
  check('a vehicle on the flyover drives up onto the deck, and stays on it',
    !!out.ride && out.ride.hi > 6.5 && out.ride.frames > 100 && out.ride.under === 0,
    out.ride ? `${out.ride.hi} m up; under the deck in ${out.ride.under} of ${out.ride.frames} frames on it` : 'no vehicle to drive');
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
if (errs.length) for (const e of errs.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === res.length && !errs.length ? 0 : 1);
