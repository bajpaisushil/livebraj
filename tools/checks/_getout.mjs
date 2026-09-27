import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:400} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const [cx, cz] = loc.pos;
  const R = 0.42, STEP_UP = 0.52;
  // Walk OUT from the altar side toward the courtyard, at many z, and see
  // where the body actually stops. This is the player's own action.
  const rows = [];
  for (let dz = -14; dz <= 14; dz += 0.5) {
    let x = cx - 6.0, z = cz + dz;            // start deep inside, altar side
    let feet = W.standHeight(x, z, W.groundHeight(x, z) + 1.0);
    if (feet === null) { rows.push({ dz:+dz.toFixed(1), start:'no floor' }); continue; }
    let blocked = null, travelled = 0;
    for (let k = 0; k < 400; k++) {           // step outward 0.08 m at a time
      const nx = x + 0.08;
      const q = { x: nx, y: 0, z };
      W.collide(q, R, feet);
      if (Math.hypot(q.x - nx, q.z - z) > 0.02) {
        const near = (W.grid.query(nx, z, 1.0) || []).filter(c => W._overlaps(c, nx, z, R));
        blocked = { why:'collider', at:+(nx-cx).toFixed(2),
          tags: [...new Set(near.map(c => c.tag || '(untagged)'))].slice(0,4) };
        break;
      }
      const h = W.standHeight(nx, z, feet);
      if (h === null) { blocked = { why:'no floor', at:+(nx-cx).toFixed(2) }; break; }
      if (h - feet > STEP_UP) {
        blocked = { why:'riser too tall', at:+(nx-cx).toFixed(2), rise:+(h-feet).toFixed(2) };
        break;
      }
      x = nx; feet = h; travelled += 0.08;
    }
    rows.push({ dz:+dz.toFixed(1), reached:+(x-cx).toFixed(2), feet:+feet.toFixed(2),
      escaped: (x-cx) > 16, blocked });
  }
  return rows;
});
console.log('GETOUT ' + JSON.stringify(out));
await b.close(); process.exit(0);
