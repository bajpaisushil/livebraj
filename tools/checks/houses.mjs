/**
 * You can walk into a house, and you can SEE that you can.
 *
 * "am unable to enter any house like pokemon rpg as it should"
 *
 * Two questions, because the fault turned out to be the second one:
 *
 *   1. CAN a body walk from the street through the door? interior.mjs never
 *      asked this — it put the player in the middle of a room with
 *      position.set(). Walked properly, 150 of 150 houses let you in.
 *   2. Does the doorway LOOK like a way in? It did not: a lila mural was
 *      centred at 2.05 m and up to 2.9 m square, filling every doorway edge
 *      to edge, and the damp band ran across the threshold. You do not walk
 *      into a painting. So this casts rays from a person's eye at the door
 *      opening and fails if a mural is the first thing they hit.
 *
 * Movement replicates Player._updateMovement: step, world.collide(p, 0.42,
 * feet), crowd.collideAgents(p, 0.42), world.standHeight.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('../../client/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let pth = decodeURIComponent(req.url.split('?')[0]);
    if (pth.endsWith('/')) pth += 'index.html';
    const body = await readFile(join(ROOT, pth));
    res.writeHead(200, { 'content-type': TYPES[extname(pth)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const res = [];
const check = (name, ok, detail = '') => {
  res.push(!!ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
// wait for what the check reads: the buildings AND the interior system's volumes
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.buildings?.interiors?.length
  && window.vrindavan?.ctx?.interior?.volumes?.length, null, { timeout: 220000 });

const out = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, W = ctx.world, C = ctx.crowd;
  const THREE = await import('three');
  const R = 0.42, STEP_UP = 0.52;
  const all = W.buildings.interiors;
  const N = Math.min(120, all.length);
  const step = Math.max(1, Math.floor(all.length / N));
  const murals = [];
  ctx.scene.traverse((o) => { if (o.isMesh && /^Murals_/.test(o.name || '')) murals.push(o); });
  ctx.scene.updateMatrixWorld(true);

  let walked = 0, tested = 0, paintedOver = 0;
  const bad = [];
  for (let i = 0; i < all.length && tested < N; i += step) {
    const lot = all[i];
    if (!lot.doorAt) continue;
    tested++;
    const [dx, dz] = lot.doorAt;
    let nx = dx - lot.x, nz = dz - lot.z;
    const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;

    // 1. walk it
    let x = dx + nx * 3.0, z = dz + nz * 3.0;
    let feet = W.standHeight(x, z, W.groundHeight(x, z));
    for (let k = 0; k < 160 && feet !== null && feet !== undefined; k++) {
      let vx = lot.x - x, vz = lot.z - z;
      const d = Math.hypot(vx, vz);
      if (d < 0.6) break;
      vx /= d; vz /= d;
      const q = { x: x + vx * 0.09, y: 0, z: z + vz * 0.09 };
      W.collide(q, R, feet);
      if (C && C.collideAgents) C.collideAgents(q, R);
      const h = W.standHeight(q.x, q.z, feet);
      if (h === null || h === undefined || h - feet > STEP_UP) break;
      x = q.x; z = q.z; feet = h;
    }
    if ((dx - x) * nx + (dz - z) * nz > 0.8) walked++;

    // 2. look at it: eye 3.5 m out, rays at three heights through the opening.
    // The opening runs 0.7-3.2 m over the lot's ground on the facade's numbers.
    const g = lot.y || 0;
    const eye = new THREE.Vector3(dx + nx * 3.5, g + 1.6, dz + nz * 3.5);
    let hit = false;
    for (const hgt of [1.1, 1.9, 2.7]) {
      const tgt = new THREE.Vector3(dx, g + hgt, dz);
      const dir = tgt.clone().sub(eye);
      const len = dir.length();
      const ray = new THREE.Raycaster(eye, dir.normalize(), 0.05, len + 0.2);
      if (ray.intersectObjects(murals, false).length) { hit = true; break; }
    }
    if (hit) { paintedOver++; if (bad.length < 3) bad.push({ kind: lot.roomKind, at: [+dx.toFixed(1), +dz.toFixed(1)] }); }
  }
  /*
   * 3. The THRESHOLD. Crossing the door is the Pokemon moment, so the
   * "you are inside" rectangle must agree with the house to the metre: in
   * 1.2 m through the door you are inside, out 1.2 m in the lane you are
   * not. InteriorSystem read house rotations in the box frame while houses
   * are built in the mirror frame, and 154 of 721 failed the first half,
   * 42 the second, before that was fixed.
   */
  const sys = ctx.interior;
  const key = (x, z) => Math.round(x * 10) + ',' + Math.round(z * 10);
  const vols = new Map(sys.volumes.filter((v) => v.house).map((v) => [key(v.x, v.z), v]));
  let inOk = 0, outOk = 0, thr = 0;
  for (const lot of all) {
    const v = vols.get(key(lot.x, lot.z));
    if (!v || !lot.doorAt) continue;
    thr++;
    const [dx, dz] = lot.doorAt;
    let nx = dx - lot.x, nz = dz - lot.z; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    if (sys._contains(v, dx - nx * 1.2, dz - nz * 1.2, 1.0)) inOk++;
    if (!sys._contains(v, dx + nx * 1.2, dz + nz * 1.2, 1.0)) outOk++;
  }
  return { total: all.length, tested, walked, paintedOver, bad, muralMeshes: murals.length, thr, inOk, outOk };
});

check('there are houses to walk into', out.total > 100, `${out.total} enterable interiors`);
check('a person can walk from the street through the door into every one tested',
  out.walked === out.tested, `${out.walked}/${out.tested}`);
check('there are murals in the town at all (so the next check means something)',
  out.muralMeshes > 0, `${out.muralMeshes} mural meshes`);
check('no doorway has a painting across it',
  out.paintedOver === 0, out.paintedOver ? `${out.paintedOver} painted over, e.g. ${JSON.stringify(out.bad)}` : `${out.tested} doors clear at eye height`);
check('one step through the door and the house knows you are inside',
  out.inOk === out.thr, `${out.inOk}/${out.thr} houses`);
check('one step back into the lane and it knows you are not',
  out.outOk === out.thr, `${out.outOk}/${out.thr} houses`);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed === res.length ? 0 : 1);
