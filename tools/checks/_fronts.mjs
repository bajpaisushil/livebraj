import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world?.buildings?.interiors?.length,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, A = ctx.world.anchors;
  return ctx.data.LOCATIONS.map((l) => {
    if (l.grounds) return { id: l.id, grounds: true };
    const a = A[l.id];
    if (!a || !a.altar || !a.darshan) return { id: l.id, grounds: true };
    const now = Math.atan2(a.darshan.x - a.altar.x, a.darshan.z - a.altar.z);
    const was = Math.atan2(Math.sin(l.rot), Math.cos(l.rot));
    let d = ((now - was) * 180 / Math.PI) % 360; if (d > 180) d -= 360; if (d < -180) d += 360;
    return { id: l.id, rotDeg: +(l.rot * 180 / Math.PI).toFixed(1), frontMovedDeg: +d.toFixed(0) };
  }).filter((r) => !r.grounds && Math.abs(r.frontMovedDeg) > 5);
});
console.log('FRONTS ' + JSON.stringify(out, null, 1));
await b.close(); process.exit(0);
