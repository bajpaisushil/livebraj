/**
 * Photograph Vrindaban Road station (StationBuilder) with a train in it.
 *
 *   OUT=dir [BASE_URL=http://localhost:8093/] node tools/checks/_stationshot.mjs [name ...]
 *
 * Views in the main line's own frame at the station: metres along it toward
 * Mathura from the main track's bend, and across it (north-east positive);
 * heights over whatever is under the point.
 */
import { chromium } from 'playwright';
const only = process.argv.slice(2);
const VIEWS = [
  ['west', [505, -47, 1.7], [556, -20, 6]],
  ['side', [470, 32, 8], [565, -22, 3]],
  ['aerial', [430, 70, 48], [575, -20, 0]],
  ['island', [600, -16, 1.7], [556, -16, 6]],
  ['under', [540, -2.5, 1.7], [575, -2.5, 4]],
];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(process.env.BASE_URL || 'http://localhost:8093/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.props && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.trains, null, { timeout: 240000 });
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.trains.update = () => {};
  ctx.ui._endIntro && ctx.ui._endIntro();
  ctx.ui.show('world');
  document.getElementById('hud')?.classList.remove('show');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); }
  ctx.scene.traverse((o) => { if (/^Night:/.test(o.name || '')) o.visible = false; });
  // a train for Delhi standing through the station, its head 40 m past the bridge
  const TS = ctx.trains;
  const A = TS.paths.find((q) => q.track.id === 't1310963070') || TS.paths[0];
  let t; do { t = TS._makeUp(A); } while (t.kind !== 'passenger');
  t.head = 420; TS.trains = [t]; TS._place(ctx);
  await new Promise((r) => setTimeout(r, 900));
});
for (const [name, eye, look] of VIEWS) {
  if (only.length && !only.includes(name)) continue;
  await p.evaluate(({ eye, look }) => {
    const ctx = window.vrindavan.ctx, w = ctx.world;
    const o = [-6989.19, 2182.68], u = [0.5876, 0.8091], n = [0.8091, -0.5876];
    const at = ([a, c]) => [o[0] + u[0] * a + n[0] * c, o[1] + u[1] * a + n[1] * c];
    const [ex, ez] = at(eye), [tx, tz] = at(look);
    const base = (x, z) => w.standHeight(x, z, w.groundHeight(x, z) + 1.6);
    const cam = ctx.camera.clone();
    cam.fov = 62; cam.near = 0.1; cam.far = 4000; cam.updateProjectionMatrix();
    cam.position.set(ex, base(ex, ez) + eye[2], ez);
    cam.lookAt(tx, w.groundHeight(tx, tz) + look[2], tz);
    ctx.player.position.set(ex + 300, ctx.player.position.y, ez + 300);
    if (ctx.time && ctx.time.sun) {
      const d = ctx.time.sunDir;
      ctx.time.sun.target.position.set(tx, 0, tz); ctx.time.sun.target.updateMatrixWorld();
      ctx.time.sun.position.set(tx + d.x * 160, d.y * 160 + 20, tz + d.z * 160);
    }
    if (ctx.time && ctx.time.sky) ctx.time.sky.position.set(ex, 0, ez);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { eye, look });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${process.env.OUT || 'docs/shots'}/station-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
console.log(errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 4).join(' | ') : 'no page errors');
await b.close();
