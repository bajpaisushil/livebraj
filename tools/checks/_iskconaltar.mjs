import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:820,height:520} });
await p.addInitScript(`window.__side = ${process.argv[2] || 0};`);
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.deities,null,{timeout:220000});
const info = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); ctx.time.update = () => {}; }
  await new Promise(r => setTimeout(r, 1200));
  const id = 'iskcon-krishna-balaram';
  const a = ctx.world.anchorFor(id);
  const rec = (ctx.deities.panels||[]).find(r => r.loc.id === id);
  const cam = ctx.camera.clone();
  cam.fov = 62; cam.near = 0.05; cam.updateProjectionMatrix();
  // stand in the middle of the hall, facing all three bays
  const want = Number(window.__side ?? 0);
  const c = (a.altars||[]).find(x => x.side === want) || a.altar;
  const d = a.darshan;
  const t = 0.42;
  cam.position.set(c.x + (d.x - c.x) * t, (c.y||a.altar.y) + 1.2, c.z + (d.z - c.z) * t);
  cam.lookAt(c.x, (c.y||a.altar.y) - 0.1, c.z);
  ctx.camera = cam;
  ctx.renderer.render(ctx.scene, cam);
  return {
    altarsPublished: (a.altars||[]).map(x => ({ side: x.side, at: [+x.x.toFixed(1), +x.y.toFixed(2), +x.z.toFixed(1)] })),
    panel: rec ? { side: rec.altar.side, name: rec.altar.name,
                   at: [+rec.mesh.position.x.toFixed(1), +rec.mesh.position.y.toFixed(2), +rec.mesh.position.z.toFixed(1)],
                   visible: rec.mesh.visible } : null,
    distToItsAltar: rec && a.altars
      ? +Math.hypot(rec.mesh.position.x - a.altars.find(x=>x.side===rec.altar.side).x,
                    rec.mesh.position.z - a.altars.find(x=>x.side===rec.altar.side).z).toFixed(2) : null,
  };
});
console.log(JSON.stringify(info, null, 1));
await p.waitForTimeout(900);
await p.screenshot({ path: `docs/shots/iskcon-altar-${process.argv[2]||0}.png`, timeout: 90000 });
await b.close(); process.exit(0);
