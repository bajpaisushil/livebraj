/**
 * Rangji Mandir from where a pilgrim stands. Views are given in the
 * builder's own frame (origin the temple's centre, +lz toward the road), so
 * they survive the site being moved or turned.
 *
 *   node tools/checks/_iskconshots.mjs
 */
import { chromium } from 'playwright';
const VIEWS = [
  // name, eye [lx, h, lz], looking at [lx, h, lz] — +lz is WEST, toward the town
  ['street', [6, 1.7, 165], [0, 14, 118]],
  ['framed', [0, 1.7, 132], [0, 12, 92]],
  ['gopuram', [-16, 1.7, 84], [0, 17, 92]],
  ['flagstaff', [-17, 1.8, 58], [1, 9, 56]],
  ['vimana', [6, 2.0, 60], [1, 8, 5]],
  ['tank', [-19.5, 4.4, -57], [-40, 1.5, -80]],
  ['aerial', [-150, 90, 190], [0, 5, 0]],
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
    const loc = ctx.data.LOCATION_BY_ID.get('rangaji');
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
  await p.screenshot({ path: `docs/shots/rangaji-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
await b.close();
