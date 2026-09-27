import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:400} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world?.buildings,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const bg = ctx.world.buildings;
  const lots = bg.colliders || [];
  const keys = Object.keys(bg).filter(k => Array.isArray(bg[k])).map(k => k + ':' + bg[k].length);
  const res = {};
  for (const id of ['banke-bihari','radha-raman','gopishwar-mahadev']) {
    const loc = ctx.data.LOCATION_BY_ID.get(id);
    const bands = { '0-40': 0, '40-60': 0, '60-100': 0 };
    let nearest = 1e9;
    for (const l of lots) {
      const dd = Math.hypot(l.x - loc.pos[0], l.z - loc.pos[1]);
      nearest = Math.min(nearest, dd);
      if (dd < 40) bands['0-40']++;
      else if (dd < 60) bands['40-60']++;
      else if (dd < 100) bands['60-100']++;
    }
    res[id] = { halfFootprint: Math.max(loc.build.w, loc.build.d) / 2,
      nearestLotCentre: +nearest.toFixed(1), bands };
  }
  return { totalLots: lots.length, arrayKeys: keys, res };
});
console.log('NEAR ' + JSON.stringify(out, null, 1));
await b.close(); process.exit(0);
