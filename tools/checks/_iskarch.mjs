import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.addInitScript(() => { globalThis.__recordArches = true; });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && globalThis.__archLog,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const loc2 = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [+(dx*cs + dz*sn).toFixed(1), +(-dx*sn + dz*cs).toFixed(1)]; };
  const rows = [];
  for (const a of globalThis.__archLog.filter((a) => a.owner === 'iskcon-krishna-balaram' && (a.line === 1770 || a.line === 1772))) {
    let best = null, bestD = 1.2;
    for (const c of (W.grid.query(a.x, a.z, 8) || [])) {
      if (c.type !== 'box' || c.standOnly) continue;
      const long = Math.max(c.hw, c.hd), thin = Math.min(c.hw, c.hd);
      if (long * 2 < 1.6 || long < thin * 2.5) continue;
      const cr = Math.cos(c.rot), sr = Math.sin(c.rot);
      const dx = a.x - c.x, dz = a.z - c.z;
      const lx = dx * cr + dz * sr, lz = -dx * sr + dz * cr;
      const along = c.hw >= c.hd ? Math.abs(lx) : Math.abs(lz);
      if (along > long - 0.25) continue;
      const d = Math.hypot(Math.max(Math.abs(lx) - c.hw, 0), Math.max(Math.abs(lz) - c.hd, 0));
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) continue;
    const ax = best.hw >= best.hd ? [Math.cos(best.rot), Math.sin(best.rot)] : [-Math.sin(best.rot), Math.cos(best.rot)];
    const dot = Math.abs(Math.cos(a.rot) * ax[0] + Math.sin(a.rot) * ax[1]);
    rows.push({ line: a.line, local: loc2(a.x, a.z), y: +a.y.toFixed(2), archDeg: +(a.rot*180/Math.PI).toFixed(0),
      wall: { tag: best.tag || '(untagged)', local: loc2(best.x, best.z), len: +(Math.max(best.hw,best.hd)*2).toFixed(1), thick: +(Math.min(best.hw,best.hd)*2).toFixed(2), top: best.top === undefined ? 'inf' : +best.top.toFixed(1) },
      dist: +bestD.toFixed(2), verdict: dot >= 0.9 ? 'in' : dot <= 0.35 ? 'ACROSS' : 'oblique' });
  }
  return rows.filter((r) => r.verdict !== 'in');
});
console.log(JSON.stringify(out, null, 1));
await b.close(); process.exit(0);
