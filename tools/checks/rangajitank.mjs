/**
 * Rangaji's tank, sunk into its court where the imagery has it.
 *
 * It stood on a 2.5 m terrace — "from within the court it reads as the sunken
 * tank; from outside it shows a plinth" — because the ground could not be cut,
 * and 8 m west and 6 m north of the tank the imagery shows. A basin cuts the
 * ground now (brahmakund.mjs has what that asks of the world): the pit at its
 * measured place, the courts' flags to its rim, a flight down from the gate on
 * the avenue, revetted sides over broad steps, the kiosks on their pedestals.
 *
 * This asks: is it where the imagery has it and below its court, is the river
 * kept out of it, can you go in at the gate and down to the water and back,
 * does the water's edge hold and does a kiosk's balustrade, does the camera
 * come down with you, and is the ground round it whole.
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
  const loc = ctx.data.LOCATION_BY_ID.get('rangaji');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const WC = [-34.2, -84.85];                         // the water's centre, in the frame

  // the rim and the water, off the builder's own surfaces
  const ghat = w.colliders.filter((c) => c.tag === 'rangaji-ghat');
  const rev = w.colliders.filter((c) => c.tag === 'rangaji-revetment');
  const RIM = rev.length ? Math.max(...rev.map((c) => c.top)) : null;
  const low = ghat.length ? Math.min(...ghat.map((c) => c.top)) : null;
  const court = t.sampleHeight(...P(-14, -40));

  ctx.scene.updateMatrixWorld(true);
  const meshes = [];
  ctx.scene.traverse((o) => { if (o.isMesh && o.visible && !/^Yamuna$|Sky|Skirt/.test(o.name || '')) meshes.push(o); });
  const down = (lx, lz) => {
    const [x, z] = P(lx, lz);
    const hits = new THREE.Raycaster(new THREE.Vector3(x, 80, z), new THREE.Vector3(0, -1, 0), 0, 200).intersectObjects(meshes, false)
      .filter((h) => h.object.name !== 'Players');
    return hits.length ? { y: +hits[0].point.y.toFixed(2), name: hits[0].object.name, x, z } : null;
  };
  const water = down(...WC);
  const waterAt = water ? [+water.x.toFixed(1), +water.z.toFixed(1)] : null;

  // the ground round the pit is whole
  const inPit = (x, z) => { const [lx, lz] = L(x, z), q = loc.basin; return lx > q.lx0 - 1 && lx < q.lx1 + 1 && lz > q.lz0 - 1 && lz < q.lz1 + 1; };
  let whole = 0, holed = 0; const holedAt = [];
  const holes = t.holes.filter((h) => h.owner === 'rangaji');
  for (const h of holes) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const x = h.x0 + (i + 0.5) * (h.x1 - h.x0) / 6, z = h.z0 + (j + 0.5) * (h.z1 - h.z0) / 6;
        if (inPit(x, z)) continue;
        const g = new THREE.Raycaster(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0), 0, 200).intersectObjects(meshes, false)
          .find((q) => q.object.name === 'Ground' || q.object.name === 'GroundBasins');
        if (g && Math.abs(g.point.y - t.sampleHeight(x, z)) < 0.12) whole++;
        else { holed++; if (holedAt.length < 3) holedAt.push([Math.round(x), Math.round(z)]); }
      }
    }
  }

  // the river's plane is not drawn in it: rendered from above, the pit is
  // not blue (the plane, 0.6 m under the tank's water, would tint it)
  const pix = (() => {
    const N = 48, rt = new THREE.WebGLRenderTarget(N, N);
    // by day, and without the pool's own water: what is asked is whether the
    // river's plane shows, and a glossy pool at night shows the moon
    if (ctx.time && ctx.time.setPhase) { ctx.time.setPhase('day', true); if (ctx.time._apply) ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); }
    const own = [];
    ctx.scene.traverse((o) => { if (o.isMesh && o.name === 'RangajiTankWater' && o.visible) { o.visible = false; own.push(o); } });
    const [cx, cz] = P(...WC);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    cam.position.set(cx, court + 70, cz + 0.01);
    cam.lookAt(cx, court - 3, cz);
    cam.updateMatrixWorld(true);
    ctx.renderer.setRenderTarget(rt);
    ctx.renderer.render(ctx.scene, cam);
    const buf = new Uint8Array(N * N * 4);
    ctx.renderer.readRenderTargetPixels(rt, 0, 0, N, N, buf);
    window.__pixbuf = Array.from(buf);
    ctx.renderer.setRenderTarget(null);
    rt.dispose();
    for (const o of own) o.visible = true;
    let teal = 0, n = 0, sr = 0, sb = 0;
    for (let y = 12; y < 36; y++) {
      for (let x = 12; x < 36; x++) {
        const k = (y * N + x) * 4, r = buf[k], g = buf[k + 1], bl = buf[k + 2];
        n++; sr += r; sb += bl;
        if (bl - r > 40 && bl > g - 25 && bl > 100) teal++;
      }
    }
    return { teal, n, blue: +((sb - sr) / n).toFixed(1) };
  })();

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
  const walk = {};
  // from the avenue, in at the gate, down the flight to its foot
  place(P(-6, -83.7));
  walk.gate = go(P(-12.6, -83.7));
  walk.down = go(P(-17.9, -83.7));                   // the last tread is -17.79..-17.36
  // the water's edge holds, for ten seconds of pressing at it
  {
    const [tx, tz] = P(...WC);
    ctx.input.bodyRelative = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let deepest = Infinity, lowest = Infinity;
    for (let i = 0; i < 300; i++) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      const [lx] = L(pos.x, pos.z);
      deepest = Math.min(deepest, lx);
      lowest = Math.min(lowest, pos.y);
    }
    ctx.input.move.y = 0;
    for (let i = 0; i < 20; i++) ctx.player.update(1 / 30, ctx);
    walk.edgeLx = +deepest.toFixed(2);
    walk.edgeLow = +lowest.toFixed(2);
  }
  // the camera comes down with you: at the flight's foot facing up it, so the
  // camera is behind you over the water — where "never under the street" put
  // it above the rim
  place(P(-17.55, -83.7), low + 0.05);
  {
    const a = P(-6, -83.7), q = P(-17.55, -83.7), yaw = Math.atan2(a[0] - q[0], a[1] - q[1]);
    if (ctx.player.setYaw) ctx.player.setYaw(yaw);
    // the rig keeps a heading of its own: put it behind you
    if (ctx.cameraRig) { ctx.cameraRig.yaw = ctx.cameraRig.yawTarget = yaw; ctx.cameraRig.heading = yaw; }
  }
  for (let i = 0; i < 150; i++) app._frame();
  const cam = ctx.camera.position;
  const camera = { y: +cam.y.toFixed(2), floor: +w.floorUnder(cam.x, cam.z, cam.y).toFixed(2),
    head: +Math.hypot(cam.x - pos.x, cam.y - (pos.y + 1.6), cam.z - pos.z).toFixed(2),
    at: L(cam.x, cam.z).map((v) => +v.toFixed(1)) };
  // and back up to the avenue
  place(P(-17.55, -83.7), low + 0.05);
  walk.up = go(P(-12.6, -83.7));
  walk.out = go(P(-6, -83.7));
  // onto the west kiosk's platform from the court, and its balustrade holds
  place(P(-36.85, -57.0));
  walk.kiosk = go(P(-36.85, -63.0));
  // pressing on toward the water, for less than the unstick waits
  walk.over = go(P(-36.85, -75.0), 40);

  return {
    RIM, low, court: +court.toFixed(2), water, waterAt, whole, holed, holedAt, holes: holes.length, pix, walk, camera,
    // the water's centre against the imagery's (1296.1, -296.5)
    fromImagery: water ? +Math.hypot(water.x - 1296.1, water.z + 296.5).toFixed(2) : null,
  };
});

if (process.env.PIXDUMP) {
  const buf = await p.evaluate(() => window.__pixbuf);
  fs.writeFileSync(process.env.PIXDUMP, JSON.stringify(buf));
}
const near = (a, b2, tol) => a !== null && a !== undefined && Math.abs(a - b2) <= tol;
const o = out, Wk = o.walk;
check('the water is where the imagery has it', o.fromImagery !== null && o.fromImagery < 1.0,
  `${o.fromImagery} m from the measured centre, at ${JSON.stringify(o.waterAt)}`);
check('sunk: the steps go down 2.6 m from a rim at the court\'s level', near(o.RIM - o.low, 2.6, 0.05) && o.RIM - o.court < 0.6,
  `rim ${o.RIM && o.RIM.toFixed(2)}, lowest step ${o.low && o.low.toFixed(2)}, court ground ${o.court}`);
check('the ground opens for it: straight down over the middle is the water', !!o.water && o.water.name === 'RangajiTankWater' && o.water.y < o.RIM - 2.5 && o.holes > 0,
  o.water ? `${o.water.name} at ${o.water.y}; ${o.holes} ground quads opened` : 'nothing hit');
check('and the ground round it is whole, at the terrain\'s height', o.holed === 0 && o.whole > 20,
  `${o.whole} points found it, ${o.holed} found a hole${o.holedAt.length ? ' — at ' + JSON.stringify(o.holedAt) : ''}`);
check('the river\'s plane is not drawn in it', o.pix.teal === 0 && o.pix.blue < 5,
  `${o.pix.teal} of ${o.pix.n} pixels teal; blue over red ${o.pix.blue} on average`);
check('in at the gate from the avenue and down the flight to the water', Wk.gate.miss < 0.8 && Wk.down.miss < 0.8 && near(Wk.down.y, o.low, 0.15),
  `${Wk.gate.miss} / ${Wk.down.miss} m short, at ${Wk.down.y} (lowest step ${o.low && o.low.toFixed(2)})`);
check('the water\'s edge holds, and nothing puts you in it', Wk.edgeLx > -18.4 && Wk.edgeLow > o.low - 0.1,
  `never past lx ${Wk.edgeLx} (the water starts at -18.0), never lower than ${Wk.edgeLow}`);
// (how far down the camera comes is brahmakund.mjs's to ask: a 2.8 m pit leaves the
// camera's own height above the rim either way)
check('the camera stays off your head down here, and over what is under it', o.camera.y > o.camera.floor + 0.3 && o.camera.head > 1.5,
  `camera at ${o.camera.y} (rim ${o.RIM && o.RIM.toFixed(2)}, floor under it ${o.camera.floor}), ${o.camera.head} m from your head, at ${o.camera.at}`);
check('and back up the flight and out to the avenue', Wk.up.miss < 0.8 && Wk.out.miss < 0.8 && Wk.out.y > o.RIM - 0.3,
  `${Wk.up.miss} / ${Wk.out.miss} m short, at ${Wk.out.y}`);
check('onto a kiosk from the court, and its balustrade holds', Wk.kiosk.miss < 0.8 && near(Wk.kiosk.y, o.RIM, 0.15) && Wk.over.lo > o.RIM - 0.3,
  `${Wk.kiosk.miss} m short, at ${Wk.kiosk.y}; pressing on toward the water, never below ${Wk.over.lo}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
