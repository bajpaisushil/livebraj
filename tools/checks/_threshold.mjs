// Does InteriorSystem agree with the house about where its door is?
import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:640,height:400} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.interior?.volumes?.length,null,{timeout:220000});
const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, sys = ctx.interior;
  const houses = ctx.world.buildings.interiors;
  const vols = sys.volumes.filter((v) => v.house);
  const key = (x, z) => Math.round(x * 10) + ',' + Math.round(z * 10);
  const byPos = new Map(vols.map((v) => [key(v.x, v.z), v]));
  let offAxis = 0, inOk = 0, outOk = 0, n = 0;
  const bad = [];
  for (const lot of houses) {
    const d = ((lot.rot * 180 / Math.PI) % 90 + 90) % 90;
    const off = Math.min(d, 90 - d) > 5;
    const v = byPos.get(key(lot.x, lot.z));
    if (!v || !lot.doorAt) continue;
    n++; if (off) offAxis++;
    const [dx, dz] = lot.doorAt;
    let nx = dx - lot.x, nz = dz - lot.z; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    const inside = sys._contains(v, dx - nx * 1.2, dz - nz * 1.2, 1.0);   // 1.2 m in through the door
    const street = sys._contains(v, dx + nx * 1.2, dz + nz * 1.2, 1.0);   // 1.2 m out in the lane
    if (inside) inOk++;
    if (!street) outOk++;
    if ((!inside || street) && bad.length < 3) bad.push({ rotDeg: +(lot.rot * 180 / Math.PI).toFixed(0), inside, street });
  }
  return { houses: n, offAxis, insideRecognised: inOk, streetCorrectlyOutside: outOk, bad };
});
console.log('THRESHOLD ' + JSON.stringify(out, null, 1));
await b.close(); process.exit(0);
