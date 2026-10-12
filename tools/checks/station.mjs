/**
 * Vrindaban Road station: its platforms and foot over-bridge (StationBuilder).
 *
 * The station on the main line at Chhatikara had no platforms, and its foot
 * over-bridge — two footways OSM carries over all eight tracks — was laid on
 * the ground across them: walkers crossed the line at grade where the
 * trains now run. OSM maps the three platforms as areas.
 *
 * This asks: are the platforms there, high-level, beside their tracks and
 * clear of every train; is nothing built or planted on them; does the
 * over-bridge clear the contact wire; can you walk up a platform's ramp,
 * climb the over-bridge from the west platform, cross, and come down onto
 * the island and the east side; and does no path cross the tracks at grade.
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
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.props
  && window.vrindavan?.ctx?.nav && window.vrindavan?.ctx?.trains, null, { timeout: 240000 });

const out = await p.evaluate(async () => {
  const app = window.vrindavan, ctx = app.ctx, w = ctx.world, t = w.terrain;
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const RAIL = ctx.data.RAIL;
  if (!RAIL.platforms || !RAIL.platforms.length || !t.onPlatform) return { missing: true };
  const { strip, onPlatform } = await import('/src/game/world/StationBuilder.js');
  const { RAIL_TOP, WIRE_OVER_RAIL } = await import('/src/game/world/RailBuilder.js');
  const strips = RAIL.platforms.map((q) => strip(q.points));
  const g = (x, z) => w.groundHeight(x, z);
  const B = ctx.data.WORLD.bounds;
  const inside = (x, z) => x > B.minX && x < B.maxX && z > B.minZ && z < B.maxZ;

  /* ---- the platforms: how high over the rail, and how far from it ---- */
  const pieces = w.colliders.filter((c) => c.tag === 'platform');
  const heights = pieces.map((c) => c.top - (g(c.x, c.z) + RAIL_TOP));
  // the nearest track centre to a platform's edge, as built: each piece's long sides
  let edgeMin = Infinity;
  for (const c of pieces) {
    const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0);
    for (const lx of [-c.hw, 0, c.hw]) for (const lz of [-c.hd, c.hd]) {
      edgeMin = Math.min(edgeMin, t.railDistance(c.x + lx * cs - lz * sn, c.z + lx * sn + lz * cs));
    }
  }

  /* ---- a train through on each main track: never in a platform ---- */
  const TS = ctx.trains;
  let carsSeen = 0, carsIn = 0;
  const sat = (c, o) => {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ax = fz, az = -fx;
    const cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0);
    const bx = [cs, sn], bz = [-sn, cs];
    const dx = o.x - c.x, dz = o.z - c.z;
    for (const [nx, nz] of [[fx, fz], [ax, az], bx, bz]) {
      const ra = c.hl * Math.abs(fx * nx + fz * nz) + c.hw * Math.abs(ax * nx + az * nz);
      const rb = o.hw * Math.abs(bx[0] * nx + bx[1] * nz) + o.hd * Math.abs(bz[0] * nx + bz[1] * nz);
      if (Math.abs(dx * nx + dz * nz) > ra + rb) return false;
    }
    return true;
  };
  for (const q of TS.paths) {
    for (const r of TS.paths) r.next = 1e9;
    TS.trains = [];
    const tr = TS._makeUp(q);
    TS.trains.push(tr);
    for (tr.head = 0; tr.head < q.L + tr.len; tr.head += 6) {
      TS._place(ctx);
      for (const c of TS.cars) {
        carsSeen++;
        for (const o of pieces) if (Math.abs(o.x - c.x) < 20 && Math.abs(o.z - c.z) < 20 && sat(c, o)) { carsIn++; break; }
      }
    }
  }
  TS.trains = []; TS._place(ctx);

  /* ---- nothing on them but what a platform has ---- */
  const OWN = /^(platform|platform-ramp|shelter-post|fob-|rail-mast|bridge-)/;
  const builtOn = w.colliders.filter((c) => !OWN.test(c.tag || '') && t.onPlatform(c.x, c.z));
  const trees = [];
  w.props.group.traverse((o) => {
    if (!o.isInstancedMesh || !/^Trees_/.test(o.name || '')) return;
    const e = o.instanceMatrix.array;
    for (let i = 0; i < o.count; i++) trees.push([e[i * 16 + 12], e[i * 16 + 14]]);
  });
  const treesOn = trees.filter(([x, z]) => t.onPlatform(x, z)).length;

  /* ---- the over-bridge over the wire ---- */
  const deck = w.colliders.filter((c) => c.tag === 'fob-deck');
  let clearMin = Infinity, overTrack = 0;
  for (const c of deck) {
    if (t.railDistance(c.x, c.z) > 1.5) continue;
    overTrack++;
    clearMin = Math.min(clearMin, c.base - (g(c.x, c.z) + RAIL_TOP) - WIRE_OVER_RAIL);
  }

  /* ---- walking: a ramp, then up, across and down ---- */
  const pos = ctx.player.position;
  const place = (q, feet) => { pos.set(q[0], w.standHeight(q[0], q[1], feet), q[1]); ctx.player._standY = null; };
  const go = (q, cap = 900) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let k = 0, jump = 0;
    while (k < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.45) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      const px = pos.x, pz = pos.z;
      ctx.player.update(1 / 30, ctx);
      jump = Math.max(jump, Math.hypot(pos.x - px, pos.z - pz));
      k++;
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 10; i++) ctx.player.update(1 / 30, ctx);
    return { miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: pos.y, jump };
  };
  const route = (pts) => {
    let worst = 0, jump = 0; const ys = [];
    for (const q of pts) { const r = go(q); worst = Math.max(worst, r.miss); jump = Math.max(jump, r.jump); ys.push(+(r.y - g(...q)).toFixed(2)); if (r.miss > 2) break; }
    return { worst: +worst.toFixed(2), jump: +jump.toFixed(2), ys };
  };
  // up the west platform's north ramp from the ground
  const west = strips.reduce((m, s) => (!m || s.w > m.w ? s : m), null);
  const wm = (west.c0 + west.c1) / 2;
  place(west.at(west.a0 - 14, wm), g(...west.at(west.a0 - 14, wm)));
  const ramp = route([west.at(west.a0 - 6, wm), west.at(west.a0 + 6, wm)]);
  const onWest = +(pos.y - (g(pos.x, pos.z) + RAIL_TOP)).toFixed(2);

  // the over-bridge: OSM's footways, in order; up the west stair, across to the island
  const fob = ctx.data.ROADS.filter((r) => r.fob);
  const way = (id) => fob.find((r) => r.id === id);
  const st = way('r797709238'), w1 = way('r797709244'), w2 = way('r797709242');
  let climb = null, island = null, east = null, deckY = null;
  if (st && w1 && w2) {
    place(st.points[0], g(...st.points[0]) + 2);
    climb = route([st.points[0], st.points[1]]);
    deckY = +(pos.y - (g(pos.x, pos.z) + RAIL_TOP)).toFixed(2);
    // across, and down the stair onto the island
    // the island: the platform the deck's jog stands over
    const isl = strips.find((s) => onPlatform([s], ...w1.points[2]));
    const ist = w.colliders.filter((c) => c.tag === 'fob-stair' && isl && onPlatform([isl], c.x, c.z));
    // the island stair's foot: its lowest piece
    const foot = ist.reduce((m, c) => (!m || c.top < m.top ? c : m), null);
    if (foot) {
      // and on along the platform, 15 m past the stair's foot (its far end is past the world's)
      const o = isl.at(0, 0), fa = (foot.x - o[0]) * isl.ux + (foot.z - o[1]) * isl.uz;
      const dir = fa > (isl.a0 + isl.a1) / 2 ? -1 : 1;
      island = route([w1.points[1], w1.points[2], [foot.x, foot.z], isl.at(fa + dir * 15, (isl.c0 + isl.c1) / 2)]);
      island.on = +(pos.y - (g(pos.x, pos.z) + RAIL_TOP)).toFixed(2);
    }
    // back up, across the east tracks, and down at the deck's east end
    const est = w.colliders.filter((c) => c.tag === 'fob-stair' && Math.hypot(c.x - w2.points[1][0], c.z - w2.points[1][1]) < 16);
    const efoot = est.reduce((m, c) => (!m || c.top < m.top ? c : m), null);
    if (foot && efoot) {
      const back = w1.points[2];
      east = route([[foot.x, foot.z], back, w2.points[1], [efoot.x, efoot.z]]);
      const ex = efoot.x + (efoot.x - w2.points[1][0]) * 0.3, ez = efoot.z + (efoot.z - w2.points[1][1]) * 0.3;
      go([ex, ez]);
      east.down = +(pos.y - g(pos.x, pos.z)).toFixed(2);
    }
  }

  /* ---- no path across the tracks at grade, anywhere ---- */
  const cross = (p1, p2, p3, p4) => {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-9) return false;
    const a = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
    const c = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    return a >= 0 && a <= 1 && c >= 0 && c <= 1;
  };
  const main = RAIL.tracks.filter((q) => !q.dismantled);
  let atGrade = 0; const atGradeAt = [];
  for (const n of ctx.nav.nodes.values()) {
    if (n.deck) continue;
    for (const e of n.edges) {
      const m = ctx.nav.nodes.get(e.to);
      if (!m || m.deck) continue;
      for (const q of main) for (let j = 1; j < q.points.length; j++) {
        if (cross([n.x, n.z], [m.x, m.z], q.points[j - 1], q.points[j])) { atGrade++; if (atGradeAt.length < 3) atGradeAt.push([Math.round(n.x), Math.round(n.z)]); }
      }
    }
  }

  return {
    platforms: RAIL.platforms.length, pieces: pieces.length,
    hLo: +Math.min(...heights).toFixed(3), hHi: +Math.max(...heights).toFixed(3), edgeMin: +edgeMin.toFixed(2),
    carsSeen, carsIn, builtOn: builtOn.length, builtAt: builtOn.slice(0, 3).map((c) => [Math.round(c.x), Math.round(c.z), c.tag || '']),
    treesOn, overTrack, clearMin: +clearMin.toFixed(2),
    ramp, onWest, climb, deckY, island, east, atGrade, atGradeAt,
  };
});

if (out.missing) {
  check('Vrindaban Road has its platforms', false, 'no RAIL.platforms, or the terrain cannot say what is on one');
} else {
  check('Vrindaban Road\'s three platforms, as OSM maps them, high-level',
    out.platforms === 3 && out.pieces > 50 && out.hLo > 0.8 && out.hHi < 0.88,
    `${out.platforms} platforms, ${out.pieces} pieces in the world, ${out.hLo}-${out.hHi} m over the rail (760-840 mm)`);
  check('each beside its track, and clear of every train', out.edgeMin > 1.62 && out.carsSeen > 500 && out.carsIn === 0,
    `edges ${out.edgeMin} m from a track's centre at the nearest; ${out.carsIn} of ${out.carsSeen} vehicles touching one`);
  check('nothing built or planted on them', out.builtOn === 0 && out.treesOn === 0,
    `${out.builtOn} colliders${out.builtAt.length ? ' ' + JSON.stringify(out.builtAt) : ''}, ${out.treesOn} trees`);
  check('the over-bridge clears the contact wire', out.overTrack > 5 && out.clearMin > 1.2,
    `${out.overTrack} pieces of deck over a track, ${out.clearMin} m over the wire at the least`);
  check('up a platform\'s ramp from the ground', out.ramp.worst < 1 && out.ramp.jump < 0.3 && Math.abs(out.onWest - 0.84) < 0.1,
    `${out.ramp.worst} m short, standing ${out.onWest} m over the rail`);
  check('up the west platform\'s stair onto the over-bridge', !!out.climb && out.climb.worst < 1 && out.climb.jump < 0.3 && out.deckY > 6.5,
    out.climb ? `${out.climb.worst} m short, the deck ${out.deckY} m over the rail` : 'no over-bridge');
  check('across, and down onto the island platform', !!out.island && out.island.worst < 1 && out.island.jump < 0.3 && Math.abs(out.island.on - 0.84) < 0.1,
    out.island ? `${out.island.worst} m short at worst, standing ${out.island.on} m over the rail; heights on the way ${out.island.ys.join(', ')}` : 'no island stair');
  check('and on across the east tracks and down', !!out.east && out.east.worst < 1 && out.east.jump < 0.3 && out.east.down < 0.3,
    out.east ? `${out.east.worst} m short at worst, ending ${out.east.down} m over the ground` : 'no east stair');
  check('no path crosses the tracks at grade', out.atGrade === 0,
    `${out.atGrade} path edges across a running track${out.atGradeAt.length ? ' at ' + JSON.stringify(out.atGradeAt) : ''}`);
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
if (errs.length) for (const e of errs.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === res.length && !errs.length ? 0 : 1);
