import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:240000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, lz) => [loc.pos[0] + lx*cs - lz*sn, loc.pos[1] + lx*sn + lz*cs];
  const treads = w.standables.filter(c => c.tag === 'temple-step');
  const info = treads.map(t => ({ top: +t.top.toFixed(3), w: +t.w?.toFixed?.(1), d: +(t.hd*2).toFixed(2) }));

  // walk from the COURT toward the altars, across the flight
  const out = { treads: info, up: [], down: [] };
  let pt = { x: 0, y: 0, z: 0 };
  const start = P(0, 6), end = P(0, -8);
  const dx = end[0]-start[0], dz = end[1]-start[1];
  const d = Math.hypot(dx,dz), ux = dx/d, uz = dz/d;
  pt.x = start[0]; pt.z = start[1];
  let feet = w.standHeight(pt.x, pt.z, w.groundHeight(pt.x, pt.z));
  for (let k = 0; k < 150; k++) {
    const bx = pt.x + ux*0.1, bz = pt.z + uz*0.1;
    pt.x = bx; pt.z = bz;
    w.collide(pt, 0.42, feet);
    const pushed = Math.hypot(pt.x - bx, pt.z - bz);
    feet = w.standHeight(pt.x, pt.z, feet);
    if (k % 10 === 0) {
      // local z of where we actually are, and whether collide shoved us
      const dxl = pt.x - loc.pos[0], dzl = pt.z - loc.pos[1];
      const lz = -dxl*sn + dzl*cs;
      out.up.push({ lz: +lz.toFixed(1), feet: +feet.toFixed(2), pushed: +pushed.toFixed(2) });
    }
  }
  out.reachedUp = +feet.toFixed(2);
  // and back down
  for (let k = 0; k < 150; k++) {
    pt.x -= ux*0.1; pt.z -= uz*0.1;
    w.collide(pt, 0.42, feet);
    feet = w.standHeight(pt.x, pt.z, feet);
    if (k % 15 === 0) out.down.push(+feet.toFixed(2));
  }
  out.reachedDown = +feet.toFixed(2);
  return out;
});
console.log('treads:', JSON.stringify(r.treads));
console.log('walking IN from the court (local z, feet, pushed):');
for (const u of r.up) console.log('   ', JSON.stringify(u));
console.log('walking back OUT:        ', JSON.stringify(r.down), '-> ended at', r.reachedDown);
await b.close(); process.exit(0);
