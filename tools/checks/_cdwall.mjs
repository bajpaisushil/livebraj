import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world,null,{timeout:240000});
const r = await p.evaluate(() => {
  const w = window.vrindavan.ctx.world;
  const X = -5743.1, Z = 2159;
  // which colliders actually contain this point, ignoring the grid entirely?
  const inside = [];
  for (const c of w.colliders) {
    if (c.type !== 'box') continue;
    const dx = X - c.x, dz = Z - c.z;
    const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
    if (Math.abs(lx) < c.hw + 0.42 && Math.abs(lz) < c.hd + 0.42) {
      inside.push({ hw: +c.hw.toFixed(1), hd: +c.hd.toFixed(1), tag: c.tag || null,
                    standOnly: !!c.standOnly, top: c.top !== undefined ? +c.top.toFixed(2) : null });
    }
  }
  // and what does the grid hand back there?
  const near = w.grid.query(X, Z, 0.42 + 6, []);
  return { isClear: w.isClear(X, Z, 0.42), containing: inside, fromGrid: near.length };
});
console.log(JSON.stringify(r, null, 1));
await b.close(); process.exit(0);
