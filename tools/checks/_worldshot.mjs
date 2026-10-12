/**
 * Photograph the world from views given on the command line, in world
 * coordinates: name=x,h,z@tx,th,tz (heights over the ground or the water).
 *
 *   OUT=dir [BASE_URL=http://localhost:8093/] node tools/checks/_worldshot.mjs street=-6260,1.7,2140@-6330,2,2180 ...
 */
import { chromium } from 'playwright';
const VIEWS = process.argv.slice(2).map((a) => {
  const [name, rest] = a.split('=');
  const [e, t] = rest.split('@').map((s) => s.split(',').map(Number));
  return [name, e, t];
});
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
for (const [name, e, t] of VIEWS) {
  await p.evaluate(({ e, t }) => {
    const ctx = window.vrindavan.ctx, w = ctx.world;
    const base = (x, z) => Math.max(w.groundHeight(x, z), w.terrain.waterY);
    const cam = ctx.camera.clone();
    cam.fov = 62; cam.near = 0.1; cam.far = 4000; cam.updateProjectionMatrix();
    cam.position.set(e[0], base(e[0], e[2]) + e[1], e[2]);
    cam.lookAt(t[0], base(t[0], t[2]) + t[1], t[2]);
    ctx.player.position.set(e[0], ctx.player.position.y, e[2]);
    if (ctx.time && ctx.time.sun) {
      const d = ctx.time.sunDir;
      ctx.time.sun.target.position.set(t[0], 0, t[2]); ctx.time.sun.target.updateMatrixWorld();
      ctx.time.sun.position.set(t[0] + d.x * 160, d.y * 160 + 20, t[2] + d.z * 160);
    }
    if (ctx.time && ctx.time.sky) ctx.time.sky.position.set(e[0], 0, e[2]);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { e, t });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${process.env.OUT || '.'}/${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
console.log(errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 4).join(' | ') : 'no page errors');
await b.close();
