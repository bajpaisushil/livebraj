/**
 * Shri Garud Govind Ji and its kund at Chhatikara (queue item 22).
 *
 * Seven hundred metres from the start, on the road into Vrindavan, the game
 * had a surveyed point and nothing built. Now the temple of Govind seated on
 * Garuda and its kund, measured on ESRI z19 and built from brajrasik.org's
 * photographs: the tank sunk in its basin with its jali railing, the railed
 * platform out over the water and the ghat at the far end; the lime-green
 * compound, the white court, the sanctum under its small white shikhara.
 *
 * This asks: is it where the imagery has it, is the kund sunk and the ground
 * round it whole, can you walk in from the road to darshan, out to the kund
 * and down to the water and back, onto the platform, does the water's edge
 * hold, and has the town kept out.
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
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.buildings
  && window.vrindavan?.ctx?.cameraRig, null, { timeout: 240000 });

const out = await p.evaluate(async () => {
  const THREE = await import('three');
  const app = window.vrindavan, ctx = app.ctx, w = ctx.world, t = w.terrain;
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const pos = ctx.player.position;
  const loc = ctx.data.LOCATION_BY_ID.get('garud-govind');
  if (!loc) return { missing: true };
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  // the builder works in the tank's frame; the pin is (70, 82) of it
  const P = (lx, lz) => { const a = lx - 70, c = lz - 82; return [loc.pos[0] + a * cs - c * sn, loc.pos[1] + a * sn + c * cs]; };
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn + 70, -dx * sn + dz * cs + 82]; };
  const tag = (s) => w.colliders.filter((c) => c.tag === s);

  // where it is, against the imagery: the tank's measured west corner, the
  // white top over the sanctum, and the surveyed point on the tank
  const tankW = P(0, 0), shikhara = P(56.0, 69.0), tankMid = P(25, 38.75);
  const imagery = { tankW: Math.hypot(tankW[0] + 6276.2, tankW[1] - 1444.5), shikhara: Math.hypot(shikhara[0] + 6186.0, shikhara[1] - 1447.0),
    surveyed: Math.hypot(tankMid[0] + 6234.48, tankMid[1] - 1448.32) };

  // the levels: the walk, and the water by its knee-high solid
  const walkTop = tag('garud-walk')[0] ? tag('garud-walk')[0].top : null;
  const water = tag('garud-water')[0];
  ctx.scene.updateMatrixWorld(true);
  const meshes = [];
  ctx.scene.traverse((o) => { if (o.isMesh && o.visible && !/^Yamuna$|Sky|Skirt/.test(o.name || '')) meshes.push(o); });
  const down = (lx, lz) => {
    const [x, z] = P(lx, lz);
    const hits = new THREE.Raycaster(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0), 0, 200).intersectObjects(meshes, false)
      .filter((h) => h.object.name !== 'Players');
    return hits.length ? { y: +hits[0].point.y.toFixed(2), name: hits[0].object.name } : null;
  };
  const seenWater = down(25, 40);
  // the ground round the pit is whole
  const inPit = (x, z) => { const [lx, lz] = L(x, z); return lx > 1.5 && lx < 48.5 && lz > 1.5 && lz < 83.5; };
  let whole = 0, holed = 0; const holedAt = [];
  const holes = t.holes.filter((h) => h.owner === 'garud-govind');
  for (const h of holes) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const x = h.x0 + (i + 0.5) * (h.x1 - h.x0) / 5, z = h.z0 + (j + 0.5) * (h.z1 - h.z0) / 5;
        if (inPit(x, z)) continue;
        const g = new THREE.Raycaster(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0), 0, 200).intersectObjects(meshes, false)
          .find((q) => q.object.name === 'Ground' || q.object.name === 'GroundBasins');
        if (g && Math.abs(g.point.y - t.sampleHeight(x, z)) < 0.12) whole++;
        else { holed++; if (holedAt.length < 3) holedAt.push([Math.round(x), Math.round(z)]); }
      }
    }
  }

  /* ---- walking ---- */
  const place = (q, feet = 99) => { pos.set(q[0], w.standHeight(q[0], q[1], feet), q[1]); ctx.player._standY = null; };
  const go = (q, cap = 900) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, lo = Infinity, hi = -Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.45) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      lo = Math.min(lo, pos.y); hi = Math.max(hi, pos.y);
      n++;
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 20; i++) ctx.player.update(1 / 30, ctx);
    return { miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: +pos.y.toFixed(2), lo: +lo.toFixed(2), hi: +hi.toFixed(2) };
  };
  const route = (pts) => {
    let worst = 0, at = null;
    for (const q of pts) {
      const r = go(P(...q));
      if (r.miss > worst) { worst = r.miss; at = q; }
      if (r.miss > 1.5) break;
    }
    return { worst: +worst.toFixed(2), at, y: +pos.y.toFixed(2) };
  };
  const walk = {};
  // from the road, in at the gate, across the court, up onto the mandapa to darshan
  place(P(73, 119));
  walk.inn = route([[73, 113], [73, 106], [73, 90], [71.5, 69], [65.1, 69]]);
  const anchor = w.anchors && w.anchors['garud-govind'];
  walk.atDarshan = anchor ? +Math.hypot(pos.x - anchor.darshan.x, pos.z - anchor.darshan.z).toFixed(2) : null;
  walk.darshanY = +pos.y.toFixed(2);
  const floor = tag('temple-floor').filter((c) => Math.hypot(c.x - P(60, 69)[0], c.z - P(60, 69)[1]) < 12)[0];
  // out by the door to the kund and down the ghat to the water's edge
  walk.out = route([[71.5, 69], [73, 84], [56, 84.2], [48, 85.6], [25, 85.6], [25, 83.4], [25, 75.2]]);   // the last tread is 75.0-75.68
  walk.ghatY = +pos.y.toFixed(2);
  const lowest = Math.min(...tag('garud-ghat-steps').map((c) => c.top));
  // the water's edge holds, for ten seconds of pressing at it
  {
    const [tx, tz] = P(25, 40);
    ctx.input.bodyRelative = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let deepest = Infinity, low = Infinity;
    for (let i = 0; i < 300; i++) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      deepest = Math.min(deepest, L(pos.x, pos.z)[1]);
      low = Math.min(low, pos.y);
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 20; i++) ctx.player.update(1 / 30, ctx);
    walk.edgeLz = +deepest.toFixed(2); walk.edgeLow = +low.toFixed(2);
  }
  // and back up the ghat to its head
  place(P(25, 75.4), lowest + 0.05);
  walk.up = route([[25, 79], [25, 84.2]]);
  walk.headY = +pos.y.toFixed(2);
  // the platform out over the water: down its six steps from the south-west walk
  place(P(-1.5, 32));
  walk.platform = route([[1.0, 32], [6.0, 32]]);
  walk.platformY = +pos.y.toFixed(2);
  const platTop = tag('garud-platform')[0] ? tag('garud-platform')[0].top : null;

  // no generated house in the compound: the town's buildings are untagged boxes
  const rects = [loc.compound, ...(loc.compound.also || [])];
  let inside = 0;
  for (const c of w.colliders) {
    if (c.type !== 'box' || c.tag || c.standOnly) continue;
    const dx = c.x - loc.pos[0], dz = c.z - loc.pos[1];
    const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;
    if (rects.some((q) => lx > q.lx0 && lx < q.lx1 && lz > q.lz0 && lz < q.lz1)) inside++;
  }
  return {
    imagery: Object.fromEntries(Object.entries(imagery).map(([k, v]) => [k, +v.toFixed(2)])),
    walkTop, waterTop: water ? water.top : null, seenWater, whole, holed, holedAt, holes: holes.length,
    walk, floor: floor ? floor.top : null, lowest, platTop, inside,
    anchor: anchor ? { facing: +anchor.facing.toFixed(2), altarIn: (() => { const [lx, lz] = L(anchor.altar.x, anchor.altar.z); return lx > 51.5 && lx < 61.5 && lz > 63 && lz < 75; })() } : null,
  };
});

if (out.missing) { console.log('  FAIL  there is a Garud Govind at all'); process.exit(1); }
const near = (a, b2, tol) => a !== null && a !== undefined && Math.abs(a - b2) <= tol;
const o = out, Wk = o.walk;
check('it stands where the imagery has it', o.imagery.tankW < 0.5 && o.imagery.shikhara < 3 && o.imagery.surveyed < 6,
  `tank corner ${o.imagery.tankW} m, shikhara ${o.imagery.shikhara} m, the surveyed tank point ${o.imagery.surveyed} m`);
check('the kund is sunk: the ground opens for it and you see the water', !!o.seenWater && o.seenWater.name === 'GarudKundWater'
  && near(o.walkTop - o.seenWater.y, 2.1, 0.1) && o.holes > 0,
  o.seenWater ? `${o.seenWater.name} ${(o.walkTop - o.seenWater.y).toFixed(2)} m below the walk; ${o.holes} ground quads opened` : 'nothing hit');
check('and the ground round it is whole', o.holed === 0 && o.whole > 20, `${o.whole} points found it, ${o.holed} found a hole${o.holedAt.length ? ' — at ' + JSON.stringify(o.holedAt) : ''}`);
check('in from the road at the gate, across the court, up to darshan', Wk.inn.worst < 0.8 && near(Wk.darshanY, o.floor, 0.15) && Wk.atDarshan !== null && Wk.atDarshan < 0.8,
  `${Wk.inn.worst} m short at worst${Wk.inn.at ? ' (at ' + Wk.inn.at + ')' : ''}, at ${Wk.darshanY} (floor ${o.floor}), ${Wk.atDarshan} m from the darshan spot`);
check('Govind on Garuda is in the sanctum, and darshan faces Him', !!o.anchor && o.anchor.altarIn,
  o.anchor ? `facing ${o.anchor.facing}` : 'no anchor');
check('out by the door to the kund and down the ghat to the water', Wk.out.worst < 0.8 && near(Wk.ghatY, o.lowest, 0.15),
  `${Wk.out.worst} m short at worst${Wk.out.at ? ' (at ' + Wk.out.at + ')' : ''}, at ${Wk.ghatY} (lowest step ${o.lowest && o.lowest.toFixed(2)})`);
check('the water\'s edge holds, and nothing puts you in it', Wk.edgeLz > 74.6 && Wk.edgeLow > o.lowest - 0.1,
  `never past lz ${Wk.edgeLz} (the water ends at 75), never lower than ${Wk.edgeLow}`);
check('and back up the ghat to its head', Wk.up.worst < 0.8 && near(Wk.headY, o.walkTop, 0.2), `${Wk.up.worst} m short, at ${Wk.headY}`);
check('down onto the platform out over the water', Wk.platform.worst < 0.8 && near(Wk.platformY, o.platTop, 0.15),
  `${Wk.platform.worst} m short, at ${Wk.platformY} (platform ${o.platTop && o.platTop.toFixed(2)})`);
check('no generated house in the compound', o.inside === 0, `${o.inside}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
