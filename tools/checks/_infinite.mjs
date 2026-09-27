import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:400} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const [cx, cz] = loc.pos;
  const seen = new Map();
  // sweep the whole campus and collect every collider with no top
  for (let dx = -60; dx <= 60; dx += 1.5) {
    for (let dz = -60; dz <= 60; dz += 1.5) {
      for (const c of (W.grid.query(cx + dx, cz + dz, 2) || [])) {
        if (c.top !== undefined || c.standOnly) continue;
        const k = (c.tag || '(untagged)') + '|' + (c.type === 'box'
          ? `${(c.hw*2).toFixed(1)}x${(c.hd*2).toFixed(1)}` : `r${c.r.toFixed(1)}`)
          + '|' + c.x.toFixed(1) + ',' + c.z.toFixed(1);
        if (!seen.has(k)) seen.set(k, {
          tag: c.tag || '(untagged)', type: c.type,
          size: c.type === 'box' ? [+(c.hw*2).toFixed(1), +(c.hd*2).toFixed(1)] : +c.r.toFixed(1),
          rel: [+(c.x - cx).toFixed(1), +(c.z - cz).toFixed(1)],
        });
      }
    }
  }
  const all = [...seen.values()];
  const byTag = {};
  for (const c of all) {
    byTag[c.tag] = byTag[c.tag] || { count: 0, biggest: 0, example: null };
    byTag[c.tag].count++;
    const span = Array.isArray(c.size) ? Math.max(...c.size) : c.size * 2;
    if (span > byTag[c.tag].biggest) { byTag[c.tag].biggest = +span.toFixed(1); byTag[c.tag].example = c; }
  }
  return { totalInfinite: all.length, byTag };
});
console.log('INF ' + JSON.stringify(out, null, 1));
await b.close(); process.exit(0);
