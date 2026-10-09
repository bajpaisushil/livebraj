/**
 * Brahma Kund as the Braj Foundation restored it — and what a basin 9 m deep
 * asks of the world.
 *
 * It was a 46 m square of stacked boxes buried in a terrain that covered
 * them, 5 m off the real tank. Now it is the old walled pit at its measured
 * centre, the garden 6 m below the street, the octagon of stepwell flights
 * 3.2 m further down to green water, Brahma on the lotus in the middle, the
 * saints between their bastions, the way in from the lane down past the
 * gatehouse. Three things in the world had to learn about a basin that deep:
 * the river's plane, which is under the whole map and showed through the
 * hole as a flooded tank; standing, which lifted you to the street whenever
 * you stepped off a ledge down there; and the camera, which would not go
 * below the street.
 *
 * This asks: is it as deep as the photographs, can you see down into it and
 * not the river, can you walk in from the lane all the way down to darshan
 * at the water and back, is a ledge a drop and not a lift, does the water's
 * edge hold, does the camera come down with you, is the ground round it
 * whole, and has the town kept off it.
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
  const loc = ctx.data.LOCATION_BY_ID.get('brahma-kund');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const tags = (tag) => w.colliders.filter((c) => c.tag === tag);
  const street = t.sampleHeight(...P(0, 36));

  // the levels, off the builder's own surfaces
  const garden = tags('kund-garden'), landings = tags('kund-landing');
  const YG = garden.length ? garden[0].top : null;
  const Y2 = landings.length ? Math.min(...landings.map((c) => c.top)) : null;
  const Y1 = landings.length ? Math.max(...landings.map((c) => c.top)) : null;

  // what you see straight down, leaving out the river's plane (a raycast
  // does not run its shader; the pixels below do) and the sky
  ctx.scene.updateMatrixWorld(true);
  const meshes = [];
  ctx.scene.traverse((o) => { if (o.isMesh && o.visible && !/^Yamuna$|Sky|Skirt/.test(o.name || '')) meshes.push(o); });
  const down = (lx, lz) => {
    const [x, z] = P(lx, lz);
    const hits = new THREE.Raycaster(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0), 0, 200).intersectObjects(meshes, false)
      .filter((h) => h.object.name !== 'Players');
    return hits.length ? { y: +hits[0].point.y.toFixed(2), name: hits[0].object.name } : null;
  };
  const seen = { garden: down(-16.2, 2), water: down(4.5, 3.5) };

  // the ground round the pit is whole: everywhere the opened quads cover
  // that is not the basin, straight down finds the ground at the terrain
  const inBasin = (x, z) => {
    const [lx, lz] = L(x, z);
    return loc.basin.some((q) => lx > q.lx0 - 1 && lx < q.lx1 + 1 && lz > q.lz0 - 1 && lz < q.lz1 + 1);
  };
  let whole = 0, holed = 0; const holedAt = [];
  const holes = t.holes.filter((h) => h.owner === 'brahma-kund');
  for (const h of holes) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const x = h.x0 + (i + 0.5) * (h.x1 - h.x0) / 6, z = h.z0 + (j + 0.5) * (h.z1 - h.z0) / 6;
        if (inBasin(x, z)) continue;
        const g = new THREE.Raycaster(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0), 0, 200).intersectObjects(meshes, false)
          .find((q) => q.object.name === 'Ground' || q.object.name === 'GroundBasins');
        if (g && Math.abs(g.point.y - t.sampleHeight(x, z)) < 0.12) whole++;
        else { holed++; if (holedAt.length < 3) holedAt.push([Math.round(x), Math.round(z)]); }
      }
    }
  }

  /*
   * The river is not drawn in the pit. Its plane is under the whole map at
   * the river's level, 2.6 m above the garden; from above, the pit read as a
   * flooded tank. Rendered from over the kund, nothing in the pit may come
   * out the plane's teal.
   */
  const pix = (() => {
    const N = 48, rt = new THREE.WebGLRenderTarget(N, N);
    // by day, and without the pool's own water: what is asked is whether the
    // river's plane shows, and a glossy pool at night shows the moon
    if (ctx.time && ctx.time.setPhase) { ctx.time.setPhase('day', true); if (ctx.time._apply) ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); }
    const own = [];
    ctx.scene.traverse((o) => { if (o.isMesh && o.name === 'BrahmaKundWater' && o.visible) { o.visible = false; own.push(o); } });
    const [cx, cz] = P(-1, 0);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
    cam.position.set(cx, street + 70, cz + 0.01);
    cam.lookAt(cx, street - 6, cz);
    cam.updateMatrixWorld(true);
    ctx.renderer.setRenderTarget(rt);
    ctx.renderer.render(ctx.scene, cam);
    const buf = new Uint8Array(N * N * 4);
    ctx.renderer.readRenderTargetPixels(rt, 0, 0, N, N, buf);
    ctx.renderer.setRenderTarget(null);
    rt.dispose();
    for (const o of own) o.visible = true;
    // the middle of the frame, which is the pit at this height (±15 m)
    let teal = 0, n = 0, sr = 0, sb = 0;
    for (let y = 11; y < 37; y++) {
      for (let x = 11; x < 37; x++) {
        const k = (y * N + x) * 4, r = buf[k], g = buf[k + 1], bl = buf[k + 2];
        n++; sr += r; sb += bl;
        if (bl - r > 40 && bl > g - 25 && bl > 100) teal++;
      }
    }
    // and on the whole the pit is pink, red and green, not blue: the plane
    // seen from overhead is half glare, so a pixel count alone is weak
    return { teal, n, blue: +((sb - sr) / n).toFixed(1) };
  })();

  /* ---- walking ---- */
  const place = (q, feet = 99) => { pos.set(q[0], w.standHeight(q[0], q[1], feet), q[1]); ctx.player._standY = null; };
  const go = (q, cap = 900) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, low = Infinity, high = -Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.45) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y); high = Math.max(high, pos.y);
      n++;
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 20; i++) ctx.player.update(1 / 30, ctx);   // settle onto what is underfoot
    return { miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: +pos.y.toFixed(2), low: +low.toFixed(2), high: +high.toFixed(2) };
  };
  const route = (pts) => {
    let worst = 0, high = -Infinity, low = Infinity, at = null;
    for (const q of pts) {
      const r = go(P(...q));
      if (r.miss > worst) { worst = r.miss; at = q; }
      high = Math.max(high, r.high); low = Math.min(low, r.low);
      if (r.miss > 1.5) break;
    }
    return { worst: +worst.toFixed(2), at, y: +pos.y.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2) };
  };
  // round the mid landing (apothem 12.3) from the south side to the north,
  // by the west: side middles and the corners between them
  const ring = (n, k0, k1) => {
    const pts = [];
    for (let k = k0; k <= k1; k++) {
      const a = k * Math.PI / 4, R = n / Math.cos(Math.PI / 8), a2 = a + Math.PI / 8;
      pts.push([n * Math.cos(a), n * Math.sin(a)]);
      if (k < k1) pts.push([R * Math.cos(a2), R * Math.sin(a2)]);
    }
    return pts;
  };
  const walk = {};
  // from the lane, in at the forecourt, down the broad flight to the terrace
  place(P(0, 41.5));
  walk.inn = route([[0, 37], [0, 34.4], [0, 25.0]]);
  walk.terrace = +pos.y.toFixed(2);
  // down the flight beside the gatehouse to the garden
  walk.down = route([[5.4, 24.2], [5.4, 18.1], [5.4, 16.0]]);
  walk.garden = +pos.y.toFixed(2);
  // onto the octagon's corner, down the south side's flight to its bay,
  // round the mid landing to the north, down to the water, to darshan
  walk.octagon = route([[5.3, 13.6], [1.0, 13.6], [0, 12.3], ...ring(12.3, 2, 6).slice(1), [0, -11.0], [3.9, -11.0], [3.9, -9.8], [0, -9.8]]);
  const anchor = w.anchors && w.anchors['brahma-kund'];
  walk.atDarshan = anchor ? +Math.hypot(pos.x - anchor.darshan.x, pos.z - anchor.darshan.z).toFixed(2) : null;
  walk.darshanY = +pos.y.toFixed(2);
  /*
   * The water's edge holds: walk at Brahma from the landing for ten seconds.
   * Long enough for the unstick to fire — which must not find you a place
   * in the pool either — and you are never in the water or below the landing.
   */
  {
    const [tx, tz] = P(0, -2.5);
    ctx.input.bodyRelative = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let minR = Infinity, low = Infinity;
    for (let i = 0; i < 300; i++) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      minR = Math.min(minR, Math.hypot(...L(pos.x, pos.z)));
      low = Math.min(low, pos.y);
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 20; i++) ctx.player.update(1 / 30, ctx);
    walk.edgeR = +minR.toFixed(2);
    walk.edgeLow = +low.toFixed(2);
  }
  // and back up and out to the lane, the same way
  place(P(0, -9.8), Y2 + 0.05);
  walk.out = route([[3.9, -9.8], [3.9, -11.0], [0, -11.0], [0, -12.3], ...ring(12.3, 2, 6).slice(0, -1).reverse(), [1.0, 13.6], [5.3, 13.6], [5.4, 16.0], [5.4, 18.1], [5.4, 24.2], [0, 25.0], [0, 34.4], [0, 39]]);
  walk.lane = +pos.y.toFixed(2);

  /*
   * A ledge down here is a drop. From the mid landing on the west side,
   * walk straight off its edge where the lower flight has already reached
   * the water landing: you come down 1.6 m onto it. Before, nothing within
   * a step underfoot meant "stand on the terrain" — the street, 7.6 m up.
   */
  place(P(-12.3, -3.6), Y1 + 0.05);
  const ledgeFrom = +pos.y.toFixed(2);
  walk.ledge = go(P(-9.7, -3.6), 300);

  /*
   * The camera comes down with you. On the north water landing facing
   * Brahma, frames stepped by the game's own loop: the rig must sit below
   * the street, above what is under it, and off your head.
   */
  place(P(0, -9.8), Y2 + 0.05);
  if (ctx.player.setYaw && anchor) ctx.player.setYaw(anchor.facing);
  for (let i = 0; i < 150; i++) app._frame();
  const cam = ctx.camera.position;
  const camAt = L(cam.x, cam.z);
  const camera = {
    y: +cam.y.toFixed(2),
    floor: +w.floorUnder(cam.x, cam.z, cam.y).toFixed(2),
    head: +Math.hypot(cam.x - pos.x, cam.y - (pos.y + 1.6), cam.z - pos.z).toFixed(2),
    at: [+camAt[0].toFixed(1), +camAt[1].toFixed(1)],
    player: +pos.y.toFixed(2),
  };

  // no generated house in the compound: the town's buildings are untagged boxes
  const rects = [loc.compound, ...(loc.compound.also || [])];
  let inside = 0;
  for (const c of w.colliders) {
    if (c.type !== 'box' || c.tag || c.standOnly) continue;
    const [lx, lz] = L(c.x, c.z);
    if (rects.some((q) => lx > q.lx0 && lx < q.lx1 && lz > q.lz0 && lz < q.lz1)) inside++;
  }

  // where it is: the octagon's centre on the imagery, the old pin 6 m off
  const centre = [1076.0, -375.0];
  return {
    street: +street.toFixed(2), YG, Y1, Y2,
    seen, whole, holed, holedAt, holes: holes.length, pix, walk, ledgeFrom, camera, inside,
    fromCentre: +Math.hypot(loc.pos[0] - centre[0], loc.pos[1] - centre[1]).toFixed(2),
    anchor: anchor ? { facing: +anchor.facing.toFixed(2), altarR: +Math.hypot(...L(anchor.altar.x, anchor.altar.z)).toFixed(2) } : null,
  };
});

const near = (a, b2, tol) => a !== null && a !== undefined && Math.abs(a - b2) <= tol;
const o = out, W = o.walk;
check('it stands on the tank the imagery shows', o.fromCentre < 1.0, `${o.fromCentre} m from the octagon's measured centre`);
check('the garden is the old kund\'s bed, 6 m below the street', near(o.street - o.YG, 6.0, 0.25),
  o.YG === null ? 'no garden' : `${(o.street - o.YG).toFixed(2)} m down`);
check('and the water landing 3.2 m below the garden, two tiers of ten risers', near(o.YG - o.Y1, 1.6, 0.01) && near(o.Y1 - o.Y2, 1.6, 0.01),
  `${(o.YG - o.Y1).toFixed(2)} + ${(o.Y1 - o.Y2).toFixed(2)} m`);
check('the ground opens for it: straight down you see the garden and the water, not the street',
  !!o.seen.garden && near(o.seen.garden.y, o.YG, 0.12) && !!o.seen.water && o.seen.water.name === 'BrahmaKundWater' && o.holes > 0,
  `garden: ${o.seen.garden && o.seen.garden.name} at ${o.seen.garden && o.seen.garden.y}; water: ${o.seen.water && o.seen.water.name} at ${o.seen.water && o.seen.water.y}; ${o.holes} ground quads opened`);
check('and the ground round it is whole, at the terrain\'s height', o.holed === 0 && o.whole > 20,
  `${o.whole} points found it, ${o.holed} found a hole${o.holedAt.length ? ' — at ' + JSON.stringify(o.holedAt) : ''}`);
check('the river\'s plane is not drawn in the pit', o.pix.teal === 0 && o.pix.blue < 5,
  `${o.pix.teal} of ${o.pix.n} pixels over the pit the river's teal; blue over red ${o.pix.blue} on average`);
check('in from the lane and down the broad flight to the terrace', W.inn.worst < 0.8 && near(W.terrace, o.street - 3.0, 0.3),
  `${W.inn.worst} m short at worst, terrace at ${W.terrace}`);
check('down beside the gatehouse into the garden', W.down.worst < 0.8 && near(W.garden, o.YG, 0.15), `${W.down.worst} m short, at ${W.garden}`);
check('round the octagon and down to the water, to darshan before Brahma',
  W.octagon.worst < 0.8 && near(W.darshanY, o.Y2, 0.15) && W.atDarshan !== null && W.atDarshan < 0.8,
  `${W.octagon.worst} m short at worst${W.octagon.at ? ' (at ' + W.octagon.at + ')' : ''}, at ${W.darshanY}, ${W.atDarshan} m from the darshan spot; highest ${W.octagon.high}`);
check('Brahma is at the centre and the darshan spot faces him', !!o.anchor && o.anchor.altarR < 0.1 && Math.abs(o.anchor.facing) < 0.1,
  o.anchor ? `altar ${o.anchor.altarR} m from the centre, facing ${o.anchor.facing}` : 'no anchor');
check('nobody walks into the water, and nothing puts you in it', W.edgeR > 8.8 && W.edgeLow > o.Y2 - 0.1,
  `never nearer the centre than ${W.edgeR} m, never lower than ${W.edgeLow} (landing ${o.Y2.toFixed(2)})`);
check('a ledge down here is a drop, not a lift to the street', near(W.ledge.y, o.Y2, 0.15) && W.ledge.high <= o.ledgeFrom + 0.3,
  `from ${o.ledgeFrom} to ${W.ledge.y}, never above ${W.ledge.high} (street ${o.street})`);
check('and back up and out to the lane', W.out.worst < 0.8 && near(W.lane, o.street, 0.3), `${W.out.worst} m short at worst${W.out.at ? ' (at ' + W.out.at + ')' : ''}, at ${W.lane}`);
check('the camera comes down with you, and stays off your head',
  o.camera.y < o.street - 2 && o.camera.y > o.camera.floor + 0.3 && o.camera.head > 1.5,
  `camera at ${o.camera.y} (street ${o.street}, floor under it ${o.camera.floor}), ${o.camera.head} m from your head, at ${o.camera.at}`);
check('no generated house in the compound', o.inside === 0, `${o.inside}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
