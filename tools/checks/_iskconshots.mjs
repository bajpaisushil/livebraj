/**
 * Krishna Balaram's campus from where a pilgrim stands. Views are given in the
 * builder's own frame (origin the temple's centre, +lz toward the road), so
 * they survive the site being moved or turned.
 *
 *   node tools/checks/_iskconshots.mjs
 */
import { chromium } from 'playwright';
const VIEWS = [
  // name, eye [lx, h, lz], looking at [lx, h, lz]
  ['road', [4, 1.6, 64], [0.9, 6, 30]],
  ['gate', [0.9, 1.6, 50.5], [0.9, 7, 27.5]],
  ['samadhi', [-6, 1.7, 51], [-12.5, 5.0, 38]],
  ['murti', [-12.48, 3.0, 42.6], [-12.48, 2.4, 35]],
  ['arch', [0.9, 1.6, 34], [0.9, 8.5, 26]],
  ['kiosks', [-13.6, 1.6, 17.2], [-15.5, 1.8, -8]],
  ['market', [30, 1.8, 44], [45, 2.5, 30]],
  ['campus', [-40, 26, 75], [25, 4, -5]],
];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui, null, { timeout: 220000 });
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  document.getElementById('hud')?.classList.remove('show');
  if (ctx.time) {
    ctx.time.setPhase('day', true);
    ctx.time._apply(ctx.data.TIME_OF_DAY.day, true);
    ctx.time.update = () => {
      const c = ctx.camera;
      if (c && ctx.time.sky) ctx.time.sky.position.set(c.position.x, 0, c.position.z);
    };
  }
  await new Promise((r) => setTimeout(r, 900));
});
for (const [name, eye, look] of VIEWS) {
  await p.evaluate(({ eye, look }) => {
    const ctx = window.vrindavan.ctx;
    const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
    const [x0, z0] = loc.pos, cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
    const P = (lx, lz) => [x0 + lx * cs - lz * sn, z0 + lx * sn + lz * cs];
    const [ex, ez] = P(eye[0], eye[2]), [tx, tz] = P(look[0], look[2]);
    const g = ctx.world.groundHeight(ex, ez), gt = ctx.world.groundHeight(tx, tz);
    // keep the player and the crowd from standing in the picture
    ctx.player.position.set(ex + 200, ctx.player.position.y, ez + 200);
    const cam = ctx.camera.clone();
    cam.fov = 62; cam.near = 0.1; cam.updateProjectionMatrix();
    cam.position.set(ex, g + eye[1] + 0.05, ez);
    cam.lookAt(tx, gt + look[1], tz);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { eye, look });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `docs/shots/iskcon-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
await b.close();
