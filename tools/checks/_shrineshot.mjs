import { chromium } from 'playwright';
const IDS = process.argv.slice(2);
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:440} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:220000});
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); ctx.time.update = () => {}; }
  // draw the night veils back: they are correct at night and in the way here
  ctx.scene.traverse((o) => { if (o.name && o.name.startsWith('Night:')) o.visible = false; });
  if (ctx.curtains) ctx.curtains.update = () => {};
  await new Promise(r => setTimeout(r, 900));
});
for (const id of IDS) {
  const info = await p.evaluate((which) => {
    const ctx = window.vrindavan.ctx;
    const a = ctx.world.anchorFor(which);
    if (!a || !a.altar) return { error: 'no anchor' };
    const d = a.darshan;
    // The interior is its own mesh and InteriorSystem culls it on the PLAYER's
    // position, not the camera's. Moving only the camera leaves you looking at
    // the outside of a building whose inside has been dropped.
    ctx.player.position.set(d.x, ctx.world.groundHeight(d.x, d.z) + 0.1, d.z);
    if (ctx.interior) ctx.interior.update(0.5, ctx);
    const cam = ctx.camera.clone();
    cam.fov = 68; cam.near = 0.05; cam.updateProjectionMatrix();
    // stand where a worshipper stands, but closer in
    const t = Number(process.argv[3] || 0.55);
    cam.position.set(a.altar.x + (d.x - a.altar.x) * t, a.altar.y + 0.55, a.altar.z + (d.z - a.altar.z) * t);
    cam.lookAt(a.altar.x, a.altar.y - 0.15, a.altar.z);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
    return { id: which, altar: [a.altar.x, a.altar.y, a.altar.z].map(n => +n.toFixed(1)) };
  }, id);
  console.log(JSON.stringify(info));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `docs/shots/shrine-${id}.png`, timeout: 90000 });
}
await b.close(); process.exit(0);
