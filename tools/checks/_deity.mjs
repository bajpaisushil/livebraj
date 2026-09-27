import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.deities && window.vrindavan?.ctx?.world,null,{timeout:200000});
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, D = ctx.deities;
  const out = { panels: (D.panels||[]).length, detail: [] };
  for (const rec of (D.panels||[])) {
    const a = ctx.world.anchorFor(rec.loc.id);
    out.detail.push({
      loc: rec.loc.id,
      altarName: rec.altar.name,
      visible: rec.mesh.visible,
      hasTexture: !!rec.mat.map,
      panel: [ +rec.mesh.position.x.toFixed(1), +rec.mesh.position.y.toFixed(2), +rec.mesh.position.z.toFixed(1) ],
      altarAnchor: a && a.altar ? [ +a.altar.x.toFixed(1), +a.altar.y.toFixed(2), +a.altar.z.toFixed(1) ] : null,
      offsetFromAltar: a && a.altar
        ? +Math.hypot(rec.mesh.position.x-a.altar.x, rec.mesh.position.z-a.altar.z).toFixed(2) : null,
      size: [rec.mesh.geometry.parameters.width, rec.mesh.geometry.parameters.height],
    });
  }
  return out;
}), null, 1));
await b.close(); process.exit(0);
