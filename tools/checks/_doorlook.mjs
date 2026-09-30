import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:720,height:480} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world?.buildings?.interiors?.length && window.vrindavan?.ctx?.ui,null,{timeout:220000});
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true);
    ctx.time.update = () => { const c = ctx.camera; if (c && ctx.time.sky) ctx.time.sky.position.set(c.position.x, 0, c.position.z); }; }
  await new Promise(r => setTimeout(r, 900));
});
for (const k of [40, 200, 410]) {
  const info = await p.evaluate((k) => {
    const ctx = window.vrindavan.ctx;
    const lot = ctx.world.buildings.interiors[k];
    const [dx, dz] = lot.doorAt;
    let nx = dx - lot.x, nz = dz - lot.z; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    const cx = dx + nx * 4.2, cz = dz + nz * 4.2;
    const g = ctx.world.groundHeight(cx, cz);
    const cam = ctx.camera.clone(); cam.fov = 60; cam.near = 0.05; cam.updateProjectionMatrix();
    cam.position.set(cx, g + 1.6, cz);
    cam.lookAt(dx, g + 1.0, dz);
    ctx.camera = cam;
    // park the player out of shot so it does not hide the door
    ctx.player.root.position.set(cx + nx * 30, g, cz + nz * 30);
    ctx.renderer.render(ctx.scene, cam);
    return { k, kind: lot.roomKind, name: lot.interiorName };
  }, k);
  console.log(JSON.stringify(info));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `docs/shots/door-${k}.png` });
}
await b.close(); process.exit(0);
