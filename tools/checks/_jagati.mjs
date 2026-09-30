/**
 * Can you walk INTO a raised platform from the ground?
 *
 * A raised floor is pushed as `standOnly`: collide() never blocks on it and
 * standHeight() will not lift you more than STEP_UP onto it. Inside a walled
 * hall that is fine — the walls stop you. Out in the open, like Prem Mandir's
 * 2.4 m jagati standing in its plaza, nothing does, and the body should walk
 * straight into the moulded side at ground level: "vanished under the stairs".
 *
 * Movement replicates Player._updateMovement / _applyGround exactly: step,
 * world.collide(p, 0.42, feet), world.standHeight(p, feet). No blocking on a
 * too-tall rise, because the player has none.
 *
 *   node tools/checks/_jagati.mjs [location-id]
 */
import { chromium } from 'playwright';

const ID = process.argv[2] || 'prem-mandir';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.standables, null, { timeout: 220000 });

const out = await p.evaluate((id) => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get(id);
  const [x0, z0] = loc.pos, rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, lz) => [x0 + lx * cs - lz * sn, z0 + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - x0, dz = z - z0; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const ground = W.groundHeight(x0, z0);
  const R = 0.42;
  // Prem Mandir's own numbers (buildPremMandir)
  const PL = 55.1, PB = 34.2, PX = 11.05, PZ = -1.0, FL = ground + 2.4, BOW = 17;
  const EAST = PX + PL;
  const inJagati = (lx, lz) => {
    if (Math.abs(lz - PZ) <= PB && Math.abs(lx - PX) <= PL) return true;
    if (lx > EAST && Math.abs(lz - PZ) <= PB) {
      const t = (lz - PZ) / PB; return lx - EAST <= BOW * Math.sqrt(Math.max(0, 1 - t * t));
    }
    return false;
  };
  const depthInside = (lx, lz) => {           // how far past the straight edge, in m
    if (!inJagati(lx, lz)) return 0;
    return Math.min(PB - Math.abs(lz - PZ), lx < EAST ? PL - Math.abs(lx - PX) : 99);
  };
  const walk = (name, from, to) => {
    let [x, z] = P(from[0], from[1]);
    const [tx, tz] = P(to[0], to[1]);
    let feet = W.standHeight(x, z, W.groundHeight(x, z));
    const prof = [];
    let worst = null, maxSink = 0, lastD = 1e9, stalls = 0;
    for (let k = 0; k < 2400; k++) {
      let vx = tx - x, vz = tz - z; const d = Math.hypot(vx, vz);
      if (d < 0.3) break;
      vx /= d; vz /= d;
      const q = { x: x + vx * 0.09, y: 0, z: z + vz * 0.09 };
      W.collide(q, R, feet);
      const h = W.standHeight(q.x, q.z, feet);
      x = q.x; z = q.z; feet = h;
      if (d > lastD - 0.004) { if (++stalls > 60) break; } else stalls = 0;
      lastD = d;
      const [lx, lz] = L(x, z);
      const inside = depthInside(lx, lz);
      if (inside > 0.3 && feet < FL - 0.5 && (!worst || inside > worst.inside))
        worst = { inside: +inside.toFixed(2), feetOverGround: +(feet - ground).toFixed(2), at: [+lx.toFixed(1), +lz.toFixed(1)] };
      if (k % 30 === 0) prof.push([+lx.toFixed(1), +lz.toFixed(1), +(feet - ground).toFixed(2)]);
    }
    const [lx, lz] = L(x, z);
    return { name, end: [+lx.toFixed(1), +lz.toFixed(1)], endFeet: +(feet - ground).toFixed(2), worst, prof: prof.slice(0, 40) };
  };
  const walks = [
    walk('north side, from the park', [PX - 20, PZ - PB - 20], [PX - 20, PZ - PB + 6]),
    walk('south side, from the park', [PX - 20, PZ + PB + 20], [PX - 20, PZ + PB - 6]),
    walk('west end, from the park', [PX - PL - 20, PZ + 5], [PX - PL + 6, PZ + 5]),
    walk('east bow, off the steps', [EAST + BOW + 20, PZ + 24], [EAST - 4, PZ + 24]),
    walk('east, up the broad flight', [EAST + BOW + 20, PZ], [EAST + 1, PZ]),
  ];
  // what surfaces are there at all near the steps?
  const [sx, sz] = P(EAST + BOW + 2, PZ);
  const near = (W.grid.query(sx, sz, 10) || []).filter((c) => c.top !== undefined)
    .map((c) => ({ tag: c.tag, top: +(c.top - ground).toFixed(2), standOnly: c.standOnly }))
    .sort((a, bb) => a.top - bb.top).slice(0, 12);
  return { ground: +ground.toFixed(2), FLrel: 2.4, walks, nearSteps: near };
}, ID);
console.log(JSON.stringify(out, null, 1).replace(/\n\s+(-?[\d.]+,?)(?=\n)/g, ' $1').replace(/\[\n\s+/g, '[').replace(/\n\s+\]/g, ']'));
await b.close();
