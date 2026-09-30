/**
 * Photograph any landmark from views given in ITS OWN builder frame (origin
 * loc.pos, turned by loc.rot), so the views survive the site being moved or
 * turned. Heights are over the terrain under the eye / the target.
 *
 *   OUT=dir node tools/checks/_siteshots.mjs <locId> <views.json> [name ...]
 *
 * views.json: [[name, [lx, h, lz], [lx, h, lz], {clip?: roomId}], ...]
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
const [locId, viewsFile, ...only] = process.argv.slice(2);
const VIEWS = JSON.parse(fs.readFileSync(viewsFile, 'utf8'));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.interior, null, { timeout: 220000 });
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
  ctx.interior.update = () => {};
  for (const m of ctx.interior.meshes) m.mesh.visible = true;
  // the clock is frozen here, so the night veils would stay drawn: open them
  ctx.scene.traverse((o) => { if (/^Night:/.test(o.name || '')) o.visible = false; });
  await new Promise((r) => setTimeout(r, 900));
});
for (const [name, eye, look, opts = {}] of VIEWS) {
  if (only.length && !only.includes(name)) continue;
  await p.evaluate(({ locId, eye, look, opts }) => {
    const ctx = window.vrindavan.ctx;
    const loc = ctx.data.LOCATION_BY_ID.get(locId);
    const [x0, z0] = loc.pos, cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
    const P = (lx, lz) => [x0 + lx * cs - lz * sn, z0 + lx * sn + lz * cs];
    const [ex, ez] = P(eye[0], eye[2]), [tx, tz] = P(look[0], look[2]);
    const g = ctx.world.groundHeight(ex, ez), gt = ctx.world.groundHeight(tx, tz);
    ctx.player.position.set(ex + 300, ctx.player.position.y, ez + 300);
    const room = opts.clip ? ctx.interior.volumes.find((v) => v.loc.id === opts.clip) : null;
    ctx.interior.clip.constant = room ? room.ceil : 1e5;
    const cam = ctx.camera.clone();
    cam.fov = opts.fov || 62; cam.near = 0.1; cam.far = 4000; cam.updateProjectionMatrix();
    cam.position.set(ex, g + eye[1], ez);
    cam.lookAt(tx, gt + look[1], tz);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { locId, eye, look, opts });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${process.env.OUT || 'docs/shots'}/${locId}-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
console.log(errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 4).join(' | ') : 'no page errors');
await b.close();
