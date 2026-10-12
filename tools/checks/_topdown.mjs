/**
 * A straight-down photograph of the world, to lay beside satellite imagery
 * of the same ground at the same scale (measurement, never tracing).
 *
 *   OUT=file.png [BASE_URL=http://localhost:8093/] node tools/checks/_topdown.mjs <x> <z> <half_m> [px]
 *
 * North is up, as on the imagery: +x east to the right, +z south downward.
 */
import { chromium } from 'playwright';
const [cx, cz, half, px = '800'] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: px, height: px } });
await p.goto(process.env.BASE_URL || 'http://localhost:8093/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.props && window.vrindavan?.ctx?.ui, null, { timeout: 240000 });
await p.evaluate(async ({ cx, cz, half }) => {
  const ctx = window.vrindavan.ctx;
  const THREE = await import('three');
  ctx.ui._endIntro && ctx.ui._endIntro();
  ctx.ui.show('world');
  document.getElementById('hud')?.classList.remove('show');
  document.querySelectorAll('.ui-interactive, #dpad, .dpad, #joystick').forEach((e) => { e.style.display = 'none'; });
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); }
  ctx.scene.traverse((o) => { if (/^Night:/.test(o.name || '')) o.visible = false; });
  if (ctx.scene.fog) ctx.scene.fog = null;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 1, 2000);
  cam.position.set(cx, 800, cz);
  cam.up.set(0, 0, -1);           // north (-z) up the frame
  cam.lookAt(cx, 0, cz);
  ctx.player.position.set(cx, ctx.player.position.y, cz);
  if (ctx.time && ctx.time.sun) {
    const d = ctx.time.sunDir;
    ctx.time.sun.target.position.set(cx, 0, cz); ctx.time.sun.target.updateMatrixWorld();
    ctx.time.sun.position.set(cx + d.x * 160, d.y * 160 + 20, cz + d.z * 160);
  }
  ctx.camera = cam;
  await new Promise((r) => setTimeout(r, 1500));
  ctx.renderer.render(ctx.scene, cam);
}, { cx, cz, half });
await p.waitForTimeout(1200);
await p.screenshot({ path: process.env.OUT || 'topdown.png', timeout: 90000 });
console.log('shot');
await b.close();
