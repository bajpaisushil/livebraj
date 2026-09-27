import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:240000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const out = [];
  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type !== 'temple') continue;
    const a = w.anchorFor(loc.id);
    if (!a || !a.altar) continue;
    const seats = (a.altars && a.altars.length) ? a.altars : [a.altar];
    const yaw = a.darshan ? Math.atan2(a.darshan.x - a.altar.x, a.darshan.z - a.altar.z) : loc.rot;
    for (const seat of seats) {
      // walk straight at the Deities from 6 m in front
      const sx = seat.x + Math.sin(yaw) * 6, sz = seat.z + Math.cos(yaw) * 6;
      const pt = { x: sx, y: 0, z: sz };
      let best = 6;
      for (let k = 0; k < 90; k++) {
        pt.x -= Math.sin(yaw) * 0.12; pt.z -= Math.cos(yaw) * 0.12;
        w.collide(pt, 0.42, w.groundHeight(pt.x, pt.z));
        best = Math.min(best, Math.hypot(pt.x - seat.x, pt.z - seat.z));
      }
      out.push({ id: loc.id, closest: +best.toFixed(2) });
    }
  }
  return out;
});
const through = r.filter(x => x.closest < 0.7);
console.log(`${r.length} altars walked at; ${through.length} let you reach the Deities`);
if (through.length) console.log('  ', JSON.stringify(through.slice(0, 6)));
else console.log('   closest approach ranged ' + Math.min(...r.map(x=>x.closest)).toFixed(2)
  + ' to ' + Math.max(...r.map(x=>x.closest)).toFixed(2) + ' m');
await b.close(); process.exit(0);
