import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:400} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const [cx, cz] = loc.pos;
  // height profile straight across the ledge line, at the z where it was worst
  const prof = [];
  for (let dx = -2; dx <= 10; dx += 0.25) {
    const x = cx + dx, z = cz - 1.0;
    const g = W.groundHeight(x, z);
    const h = W.standHeight(x, z, g);
    prof.push({ dx: +dx.toFixed(2), stand: h === null ? null : +h.toFixed(2) });
  }
  // and what colliders sit right at the ledge
  const at = (dx, dz) => {
    const x = cx + dx, z = cz + dz;
    const near = W.grid.query(x, z, 1.2) || [];
    return near.filter((c) => W._overlaps(c, x, z, 0.42)).map((c) => ({
      tag: c.tag || '(untagged)', type: c.type,
      top: c.top !== undefined ? +c.top.toFixed(2) : null,
      standOnly: !!c.standOnly, soft: !!c.soft,
      w: c.w ? +c.w.toFixed(1) : null, d: c.d ? +c.d.toFixed(1) : null,
    }));
  };
  return {
    profile: prof,
    at_3_0: at(3.0, -1.0), at_3_2: at(3.2, -1.0), at_3_5: at(3.5, -1.0),
  };
});
console.log('LEDGE ' + JSON.stringify(out));
await b.close(); process.exit(0);
