/**
 * Photograph the trains (TrainSystem) and the closed metre gauge.
 *
 *   OUT=dir [BASE_URL=http://localhost:8093/] node tools/checks/_trainshot.mjs
 *
 * A southbound train is stood on the first main track with its head `ahead`
 * metres past the Govardhan road's over-bridge, and the camera put where each
 * view says, in metres along the line (u, toward Mathura) and left of it (v).
 */
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(process.env.BASE_URL || 'http://localhost:8093/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.props && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.trains, null, { timeout: 240000 });
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  // the trains stand where they are put
  ctx.trains.update = () => {};
  ctx.ui._endIntro && ctx.ui._endIntro();
  ctx.ui.show('world');
  document.getElementById('hud')?.classList.remove('show');
  if (ctx.time) {
    ctx.time.setPhase('day', true);
    ctx.time._apply(ctx.data.TIME_OF_DAY.day, true);
  }
  ctx.scene.traverse((o) => { if (/^Night:/.test(o.name || '')) o.visible = false; });
  await new Promise((r) => setTimeout(r, 900));
});
const VIEWS = [
  // name, train: [track index, head past the bridge (m), kind], eye [u, v, h], look [u, v, h]
  ['coming', [0, 60, 'passenger'], [140, 16, 1.7], [0, 0, 4]],
  ['beside', [0, 140, 'passenger'], [80, 9, 1.7], [40, 0, 2.5]],
  ['freight', [2, 200, 'freight'], [60, -26, 1.7], [110, 0, 2.5]],
  ['bridge', [1, 80, 'passenger'], [-60, 30, 12], [10, 0, 3]],
  ['loco', [0, 60, 'passenger'], [74, 10, 2.2], [48, 0, 4.2]],
];
const only = process.argv.slice(2);
for (const [name, train, eye, look] of VIEWS) {
  if (only.length && !only.includes(name)) continue;
  await p.evaluate(({ train, eye, look }) => {
    const ctx = window.vrindavan.ctx, TS = ctx.trains;
    const A = TS.paths[train[0]];
    // the over-bridge on this track
    const { P, cum } = A;
    let sB = 0, best = Infinity;
    for (let s = 0; s < A.L; s += 1) {
      let i = 1; while (i < P.length - 1 && cum[i] < s) i++;
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
      const x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, z = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t;
      const d = Math.hypot(x + 6830, z - 2410);
      if (d < best) { best = d; sB = s; }
    }
    const pt = (s) => {
      let i = 1; while (i < P.length - 1 && cum[i] < s) i++;
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
      const dx = P[i][0] - P[i - 1][0], dz = P[i][1] - P[i - 1][1], l = Math.hypot(dx, dz);
      return { x: P[i - 1][0] + dx * t, z: P[i - 1][1] + dz * t, ux: dx / l, uz: dz / l };
    };
    for (const q of TS.paths) q.next = 1e9;
    let t;
    do { t = TS._makeUp(A); } while (t.kind !== train[2]);
    t.head = sB + train[1];
    TS.trains = [t];
    TS._place(ctx);
    const o = pt(sB);
    const at = ([u, v]) => [o.x + o.ux * u + o.uz * v, o.z + o.uz * u - o.ux * v];
    const [ex, ez] = at(eye), [tx, tz] = at(look);
    const g = ctx.world.groundHeight(ex, ez), gt = ctx.world.groundHeight(tx, tz);
    ctx.player.position.set(ex + 300, ctx.player.position.y, ez + 300);
    const cam = ctx.camera.clone();
    cam.fov = 60; cam.near = 0.1; cam.far = 4000; cam.updateProjectionMatrix();
    cam.position.set(ex, g + eye[2], ez);
    cam.lookAt(tx, gt + look[2], tz);
    if (ctx.time && ctx.time.sun) {
      const d = ctx.time.sunDir;
      ctx.time.sun.target.position.set(tx, 0, tz);
      ctx.time.sun.target.updateMatrixWorld();
      ctx.time.sun.position.set(tx + d.x * 160, d.y * 160 + 20, tz + d.z * 160);
    }
    if (ctx.time && ctx.time.sky) ctx.time.sky.position.set(ex, 0, ez);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { train, eye, look });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${process.env.OUT || 'docs/shots'}/train-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
// the closed metre gauge in town, where it crosses Parikram Marg
if (!only.length || only.includes('metre-gauge')) await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  ctx.trains.trains = []; ctx.trains._place(ctx);
  const x = -700, z = 1228, tx = -640, tz = 1150;
  const cam = ctx.camera.clone();
  cam.fov = 60; cam.near = 0.1; cam.far = 4000; cam.updateProjectionMatrix();
  cam.position.set(x, ctx.world.groundHeight(x, z) + 2.2, z);
  cam.lookAt(tx, ctx.world.groundHeight(tx, tz) + 0.5, tz);
  if (ctx.time && ctx.time.sun) {
    const d = ctx.time.sunDir;
    ctx.time.sun.target.position.set(tx, 0, tz); ctx.time.sun.target.updateMatrixWorld();
    ctx.time.sun.position.set(tx + d.x * 160, d.y * 160 + 20, tz + d.z * 160);
  }
  if (ctx.time && ctx.time.sky) ctx.time.sky.position.set(x, 0, z);
  ctx.player.position.set(x + 300, ctx.player.position.y, z + 300);
  ctx.camera = cam;
  ctx.renderer.render(ctx.scene, cam);
});
if (!only.length || only.includes('metre-gauge')) {
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${process.env.OUT || 'docs/shots'}/train-metre-gauge.png`, timeout: 90000 });
  console.log('shot metre-gauge');
}
console.log(errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 4).join(' | ') : 'no page errors');
await b.close();
