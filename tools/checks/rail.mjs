/**
 * The railways, and the bridges over them (queue item 24).
 *
 * Two lines cross the world and the game had neither, so its rail
 * over-bridges crossed nothing: the New Delhi-Mathura main line through
 * Chhatikara, four broad-gauge tracks wired for electric traction, with the
 * loops of Vrindaban Road station; and the metre gauge from Mathura into
 * Vrindavan. RailBuilder.js lays them from OSM.
 *
 * This asks: are they there, at their gauges; is the track clear — no house
 * on it, no tree, no mast, no bridge pier; does each over-bridge clear its
 * track by the height a wired line needs; and can you walk across the line,
 * as everybody at Chhatikara does.
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

const out = await p.evaluate(() => {
  const app = window.vrindavan, ctx = app.ctx, w = ctx.world, t = w.terrain;
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const RAIL = ctx.data.RAIL;
  if (!RAIL || !RAIL.tracks.length || !t.railDistance) return { missing: true };
  const len = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
  const B = ctx.data.WORLD.bounds;
  const inside = (x, z) => x > B.minX + 2 && x < B.maxX - 2 && z > B.minZ + 2 && z < B.maxZ - 2;

  // the lines, by gauge
  const broad = RAIL.tracks.filter((q) => Math.abs(q.gauge - 1.676) < 0.01);
  const metre = RAIL.tracks.filter((q) => Math.abs(q.gauge - 1.0) < 0.01);
  const km = (list) => +(list.reduce((n, q) => n + len(q.points), 0) / 1000).toFixed(2);
  const mains = broad.filter((q) => q.kind === 'main').length;
  const wired = broad.every((q) => q.electrified);

  // the track itself, every 4 m, inside the world: nothing built or planted on it
  let samples = 0, built = 0; const builtAt = [];
  for (const q of RAIL.tracks) {
    const P = q.points;
    for (let i = 1; i < P.length; i++) {
      const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      for (let s = 0; s < L; s += 4) {
        const x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * (s / L), z = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (s / L);
        if (!inside(x, z)) continue;
        samples++;
        // a pedestrian's foot on the sleepers fits; a house or a pier does not
        if (!w.fits(x, z, 0.35, w.groundHeight(x, z))) { built++; if (builtAt.length < 3) builtAt.push([Math.round(x), Math.round(z)]); }
      }
    }
  }
  // trees: where the scatter actually put them, read off its instances
  const trees = [];
  if (w.props && w.props.group) {
    w.props.group.traverse((o) => {
      if (!o.isInstancedMesh || !/^Trees_/.test(o.name || '')) return;
      const e = o.instanceMatrix.array;
      for (let i = 0; i < o.count; i++) trees.push([e[i * 16 + 12], e[i * 16 + 14]]);
    });
  }
  let treeOn = 0;
  for (const [x, z] of trees) if (t.railDistance(x, z) < 2.5) treeOn++;

  // masts beside their track and on no other; piers on no track
  const masts = w.colliders.filter((c) => c.tag === 'rail-mast');
  const mastOn = masts.filter((c) => t.railDistance(c.x, c.z) < 2.2).length;
  const piers = w.colliders.filter((c) => c.tag === 'bridge-pier');
  const pierOn = piers.filter((c) => t.railDistance(c.x, c.z) < 2.5).length;

  // the over-bridges: the deck over the track, measured where they cross it
  const roads = ctx.data.ROADS.filter((r) => r.bridge);
  const cross = (p1, p2, p3, p4) => {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-9) return null;
    const a = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
    const c = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    return a >= 0 && a <= 1 && c >= 0 && c <= 1 ? [p1[0] + a * (p2[0] - p1[0]), p1[1] + a * (p2[1] - p1[1])] : null;
  };
  const clear = [];
  for (const r of roads) {
    if (len(r.points) < 60) continue;          // a culvert, or the station footbridge, laid on the ground
    for (const q of RAIL.tracks) {
      for (let i = 1; i < r.points.length; i++) {
        for (let j = 1; j < q.points.length; j++) {
          const x = cross(r.points[i - 1], r.points[i], q.points[j - 1], q.points[j]);
          if (!x || !inside(...x)) continue;
          const g = w.groundHeight(...x);
          clear.push({ road: r.id, track: q.kind, wired: !!q.electrified, over: +(w.standHeight(x[0], x[1], g + 30) - g).toFixed(2) });
        }
      }
    }
  }

  // walk across the main line, square to it, where it runs through Chhatikara
  const main = broad.find((q) => q.kind === 'main');
  let walk = null;
  if (main) {
    const P = main.points, k = Math.floor(P.length / 2);
    const a0 = P[Math.max(0, k - 1)], a1 = P[k];
    const ux = a1[0] - a0[0], uz = a1[1] - a0[1], ul = Math.hypot(ux, uz) || 1;
    const nx = -uz / ul, nz = ux / ul;
    const mid = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2];
    // far enough to cross all four tracks and the loops beside them
    const A = [mid[0] - nx * 30, mid[1] - nz * 30], C = [mid[0] + nx * 30, mid[1] + nz * 30];
    const pos = ctx.player.position;
    pos.set(A[0], w.groundHeight(...A), A[1]); ctx.player._standY = null;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0; ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, jump = 0;
    while (n < 1500 && Math.hypot(C[0] - pos.x, C[1] - pos.z) > 0.5) {
      ctx.camera.rotation.set(0, Math.atan2(C[0] - pos.x, C[1] - pos.z) + Math.PI, 0);
      const px = pos.x, pz = pos.z;
      ctx.player.update(1 / 30, ctx);
      jump = Math.max(jump, Math.hypot(pos.x - px, pos.z - pz));
      n++;
    }
    ctx.input.move.y = 0;
    walk = { miss: +Math.hypot(C[0] - pos.x, C[1] - pos.z).toFixed(2), jump: +jump.toFixed(2) };
  }

  return { broadKm: km(broad), metreKm: km(metre), mains, wired, samples, built, builtAt, trees: trees.length, treeOn,
    masts: masts.length, mastOn, piers: piers.length, pierOn, clear, walk, stations: RAIL.stations.map((s) => s.name) };
});

if (out.missing) {
  check('the railways are in the world', false, 'no RAIL data, or the terrain has no railDistance');
} else {
  check('the New Delhi-Mathura main line runs through Chhatikara, four tracks, wired',
    out.broadKm > 3 && out.mains >= 4 && out.wired, `${out.broadKm} km of broad gauge, ${out.mains} main tracks, ${out.wired ? 'all wired' : 'NOT all wired'}`);
  check('and the metre gauge from Mathura comes into Vrindavan',
    out.metreKm > 2 && out.stations.some((s) => /Vrindavan/i.test(s)), `${out.metreKm} km; stations: ${out.stations.join(', ')}`);
  check('nothing is built on the track',
    out.samples > 1000 && out.built === 0, `${out.built} of ${out.samples} points along it blocked${out.builtAt.length ? ' at ' + JSON.stringify(out.builtAt) : ''}`);
  check('no tree grows on it', out.treeOn === 0, `${out.treeOn} of ${out.trees} trees within 2.5 m of a track`);
  check('the masts stand beside their track, and on no other', out.masts > 40 && out.mastOn === 0, `${out.masts} masts, ${out.mastOn} on a track`);
  check('and no bridge pier stands on one', out.pierOn === 0, `${out.pierOn} of ${out.piers} piers`);
  /*
   * The road over a wired track stands at least 8 m over it (7 m under the
   * girders: the contact wire is at 5.6); over the metre gauge, unwired, 6.
   */
  check('every over-bridge clears its track, and a wired one its wire',
    out.clear.length >= 2 && out.clear.every((c) => c.over > (c.wired ? 8 : 6)),
    out.clear.map((c) => `${c.road} over ${c.track}${c.wired ? ' (wired)' : ''}: ${c.over} m`).filter((s, i, a) => a.indexOf(s) === i).slice(0, 6).join('; '));
  check('you can walk across the main line',
    !!out.walk && out.walk.miss < 1 && out.walk.jump < 0.3, out.walk ? `60 m across: ${out.walk.miss} m short, ${out.walk.jump < 0.3 ? 'walking all the way' : 'LIFTED OUT — something stopped you'}` : 'no main line');
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
if (errs.length) for (const e of errs.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === res.length && !errs.length ? 0 : 1);
