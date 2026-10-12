/**
 * Photograph the Yamuna's south-eastern loop and its bridges.
 *
 *   OUT=dir [BASE_URL=http://localhost:8093/] node tools/checks/_yamunashot.mjs [name ...]
 *
 * Views are world coordinates: eye [x, h, z] over the ground (or the water),
 * looking at [x, h, z].
 */
import { chromium } from 'playwright';
const only = process.argv.slice(2);
const VIEWS = [
  ['bridge', [1560, 6, 1500], [1760, 4, 1640]],
  ['loop', [1250, 40, 1700], [800, 0, 2250]],
  ['under', [1700, 1.5, 1530], [1780, 6, 1610]],
  ['unbuilt', [1500, 5, 1520], [1660, 0, 1680]],
  ['broadside', [1640, 3, 1760], [1766, 5, 1627]],
];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(process.env.BASE_URL || 'http://localhost:8093/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.props && window.vrindavan?.ctx?.ui, null, { timeout: 240000 });
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui._endIntro && ctx.ui._endIntro();
  ctx.ui.show('world');
  document.getElementById('hud')?.classList.remove('show');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); }
  ctx.scene.traverse((o) => { if (/^Night:/.test(o.name || '')) o.visible = false; });
  await new Promise((r) => setTimeout(r, 900));
});
for (const [name, eye, look] of VIEWS) {
  if (only.length && !only.includes(name)) continue;
  await p.evaluate(({ eye, look }) => {
    const ctx = window.vrindavan.ctx, w = ctx.world;
    const base = (x, z) => Math.max(w.groundHeight(x, z), w.terrain.waterY);
    const cam = ctx.camera.clone();
    cam.fov = 60; cam.near = 0.1; cam.far = 4000; cam.updateProjectionMatrix();
    cam.position.set(eye[0], base(eye[0], eye[2]) + eye[1], eye[2]);
    cam.lookAt(look[0], base(look[0], look[2]) + look[1], look[2]);
    ctx.player.position.set(eye[0] + 300, ctx.player.position.y, eye[2] + 300);
    if (ctx.time && ctx.time.sun) {
      const d = ctx.time.sunDir;
      ctx.time.sun.target.position.set(look[0], 0, look[2]); ctx.time.sun.target.updateMatrixWorld();
      ctx.time.sun.position.set(look[0] + d.x * 160, d.y * 160 + 20, look[2] + d.z * 160);
    }
    if (ctx.time && ctx.time.sky) ctx.time.sky.position.set(eye[0], 0, eye[2]);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { eye, look });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${process.env.OUT || 'docs/shots'}/yamuna-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
console.log(errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 4).join(' | ') : 'no page errors');
await b.close();
