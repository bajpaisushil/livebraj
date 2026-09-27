import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 820, height: 520 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui, null, { timeout: 240000 });

const info = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); ctx.time.update = () => {}; }
  await new Promise((r) => setTimeout(r, 900));

  const lots = (ctx.world.buildings && ctx.world.buildings.interiors) || [];
  if (!lots.length) return { error: 'no enterable lots' };
  // a hut, so the modest housing is what gets photographed
  const lot = lots.find((l) => l.roomKind === 'hut') || lots[0];
  window.__lot = lot;

  // stand in the street in front of its door and look at it
  const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
  const front = lot.d * 0.5;
  const dx = lot.x + front * sn, dz = lot.z + front * cs;
  const ex = lot.x + (front + 13) * sn, ez = lot.z + (front + 13) * cs;

  ctx.player.position.set(ex, ctx.world.groundHeight(ex, ez) + 0.1, ez);
  if (ctx.interior) ctx.interior.update(0.5, ctx);

  const cam = ctx.camera.clone();
  cam.fov = 58; cam.near = 0.05; cam.updateProjectionMatrix();
  cam.position.set(ex, ctx.world.groundHeight(ex, ez) + 2.4, ez);
  cam.lookAt(dx, ctx.world.groundHeight(dx, dz) + 2.3, dz);
  ctx.camera = cam;
  ctx.renderer.render(ctx.scene, cam);
  return {
    kind: lot.roomKind, name: lot.interiorName,
    size: [+lot.w.toFixed(1), +lot.d.toFixed(1)],
    enterable: lots.length,
  };
});
console.log(JSON.stringify(info));
await p.waitForTimeout(800);
await p.screenshot({ path: 'docs/shots/mural.png', timeout: 90000 });
await b.close();
process.exit(0);
