/**
 * Krishna Balaram's way in, photographed where a pilgrim stands: the road
 * gate, the forecourt, the samadhi's door and the room behind it, the walk
 * under the arch, the west corridor, and the temple's small side doors.
 * Views are in the builder's frame (origin the temple's centre, +lz toward
 * the road). A view may ask for the interior clip, which is what
 * InteriorSystem does over a room you have walked into.
 *
 *   OUT=dir node tools/checks/_kbentry.mjs [name ...]
 */
import { chromium } from 'playwright';
const VIEWS = [
  // name, eye [lx, h, lz], looking at [lx, h, lz], opts
  ['road', [5, 1.6, 64], [0.9, 3.5, 44]],
  ['entry', [0.9, 1.6, 50], [0.9, 6, 20]],
  ['left', [0.9, 1.6, 50], [-10, 2.6, 38]],
  ['samadhidoor', [-12.48, 1.6, 47.5], [-12.48, 2.6, 36]],
  ['samadhiin', [-12.48, 2.95, 38.2], [-12.48, 2.9, 31.5]],
  ['samadhitop', [-12.48, 7.8, 41.2], [-12.48, 1.6, 34.5], { clip: 'room' }],
  ['underarch', [0.9, 1.6, 36], [0.9, 3.2, 18]],
  ['westcorr', [-14.2, 1.6, -15], [-14.2, 1.8, 16]],
  ['westcorrS', [-14.2, 1.6, 15], [-14.2, 1.8, -12]],
  ['westdoor', [-16.2, 1.6, 1.5], [-12.3, 1.5, -1.1]],
  ['sidedoorin', [-8.2, 1.6, 1.2], [-12.3, 1.4, -1.1]],
  ['eastdoor', [16.2, 1.6, 1.5], [12.3, 1.5, -1.1]],
  ['gate2', [-26, 1.6, -21], [-19.6, 2.8, -23.5]],
];
const only = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
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
  // hold the interior system still: no clip unless a view asks for it
  ctx.interior.update = () => {};
  // and draw every culled interior mesh — signs, halls — as if you were near
  for (const m of ctx.interior.meshes) m.mesh.visible = true;
  await new Promise((r) => setTimeout(r, 900));
});
for (const [name, eye, look, opts = {}] of VIEWS) {
  if (only.length && !only.includes(name)) continue;
  await p.evaluate(({ eye, look, opts }) => {
    const ctx = window.vrindavan.ctx;
    const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
    const [x0, z0] = loc.pos, cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
    const P = (lx, lz) => [x0 + lx * cs - lz * sn, z0 + lx * sn + lz * cs];
    const [ex, ez] = P(eye[0], eye[2]), [tx, tz] = P(look[0], look[2]);
    const g = ctx.world.groundHeight(ex, ez), gt = ctx.world.groundHeight(tx, tz);
    ctx.player.position.set(ex + 200, ctx.player.position.y, ez + 200);
    const room = ctx.interior.volumes.find((v) => v.room);
    ctx.interior.clip.constant = opts.clip === 'room' && room ? room.ceil : 1e5;
    const cam = ctx.camera.clone();
    cam.fov = 62; cam.near = 0.1; cam.updateProjectionMatrix();
    cam.position.set(ex, g + eye[1] + 0.05, ez);
    cam.lookAt(tx, gt + look[1], tz);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, { eye, look, opts });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${process.env.OUT || 'docs/shots'}/iskcon-${name}.png`, timeout: 90000 });
  console.log('shot', name);
}
const info = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const room = ctx.interior.volumes.find((v) => v.room);
  return { room: room ? { id: room.loc.id, hw: room.hw, hd: room.hd, ceil: room.ceil } : null };
});
console.log(JSON.stringify(info), errors.length ? 'PAGE ERRORS: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
await b.close();
