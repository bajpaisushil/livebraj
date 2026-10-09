/**
 * Kaliya Ghat as it is now the river has gone — and a basin the ground opens
 * for.
 *
 * It was a generic riverfront: a 70 m arcade wall with four chhatris and a
 * sixteen-tread flight cut toward a river 540 m away, and the wall stood
 * across the Parikrama Marg. Now it is OSM's fenced strip along the marg with
 * the kadamba at OSM's own node, the round Old Kaliya Temple at OSM's round
 * building, and the ghat's floor a dry court 2.2 m down — which the ground
 * mesh had no way to show until a place could declare a basin (queue item
 * 19): the quads it touches come out, the rest of them are laid back exactly.
 *
 * This asks: is the court really below the ground, can you see down into it,
 * can you walk in from the marg, down the steps and back, does the tree stand
 * where OSM has it and the temple where OSM has it, is the river really gone,
 * and is the marg clear.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const __PORT = server.address().port;

const res = []; const check = (n, pass, d) => { res.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.buildings, null, { timeout: 220000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(600);

const out = await p.evaluate(async () => {
  const THREE = await import('three');
  const ctx = window.vrindavan.ctx, w = ctx.world, t = w.terrain;
  const pos = ctx.player.position;
  const loc = ctx.data.LOCATION_BY_ID.get('kaliya-ghat');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];

  // the court
  const court = w.colliders.find((c) => c.tag === 'kaliya-court');
  const paving = t.sampleHeight(...P(-12, -4)) + 0.1;
  // can you see down into it: the first thing straight down over its middle
  const [cx, cz] = P(-3, -5.5);
  ctx.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(cx, 60, cz), new THREE.Vector3(0, -1, 0), 0, 200);
  const meshes = [];
  ctx.scene.traverse((o) => { if (o.isMesh && o.visible && !/^Yamuna$|Sky|Skirt/.test(o.name || '')) meshes.push(o); });
  const hits = ray.intersectObjects(meshes, false).filter((h) => h.object.name !== 'Players');
  const firstDown = hits.length ? { y: +hits[0].point.y.toFixed(2), name: hits[0].object.name } : null;
  const groundHit = hits.find((h) => h.object.name === 'Ground' || h.object.name === 'GroundBasins');
  // and the ground round it is whole: everywhere the opened quads cover that
  // is not the court, straight down finds the ground at the terrain's height
  const inBasin = (x, z) => {
    const dx = x - loc.pos[0], dz = z - loc.pos[1];
    const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs, q = loc.basin;
    return lx > q.lx0 - 1 && lx < q.lx1 + 1 && lz > q.lz0 - 1 && lz < q.lz1 + 1;
  };
  let whole = 0, holed = 0; const holedAt = [];
  for (const h of t.holes.filter((q) => q.owner === 'kaliya-ghat')) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const x = h.x0 + (i + 0.5) * (h.x1 - h.x0) / 6, z = h.z0 + (j + 0.5) * (h.z1 - h.z0) / 6;
        if (inBasin(x, z)) continue;
        const r2 = new THREE.Raycaster(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0), 0, 200);
        const g = r2.intersectObjects(meshes, false).find((q) => q.object.name === 'Ground' || q.object.name === 'GroundBasins');
        if (g && Math.abs(g.point.y - t.sampleHeight(x, z)) < 0.12) whole++;
        else { holed++; if (holedAt.length < 3) holedAt.push([Math.round(x), Math.round(z)]); }
      }
    }
  }

  // walking
  const place = (q) => { pos.set(q[0], w.standHeight(q[0], q[1], 99), q[1]); };
  const go = (q, cap = 900) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, low = Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.5) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y);
      n++;
    }
    ctx.input.move.y = 0;
    return { miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: +pos.y.toFixed(2), low: +low.toFixed(2) };
  };
  const walk = {};
  // from the Parikrama Marg, in at the gate
  place(P(-13.1, -16.5));
  walk.gate = go(P(-13.1, -5.0));
  // across to the head of the court's steps, down them, and back
  walk.head = go(P(-3.0, 3.0));
  walk.down = go(P(-3.0, -5.0), 600);
  walk.up = go(P(-3.0, 3.2), 600);
  // to the tree's platform
  walk.tree = go(P(-15.5, 2.8), 600);

  // where the tree and the temple are, against OSM
  const toW = (lat, lon) => [(lon - 77.6905) * 98740.61682392536, -(lat - 27.57998) * 110812.71176130591];
  const treeOSM = [-591.4, 195.7], templeOSM = [-573.9, 174.1];
  const plat = w.colliders.find((c) => c.tag === 'kaliya-kadamba-platform');
  const drum = w.colliders.filter((c) => c.type === 'circle' && c.r > 3 && c.r < 3.6 && Math.hypot(c.x - templeOSM[0], c.z - templeOSM[1]) < 6)[0];

  // the river is gone: nothing within 450 m of the ghat is water
  let wetNear = null;
  for (let r = 50; r <= 450 && !wetNear; r += 25) {
    for (let a = 0; a < 64; a++) {
      const x = loc.pos[0] + Math.cos(a / 64 * Math.PI * 2) * r, z = loc.pos[1] + Math.sin(a / 64 * Math.PI * 2) * r;
      if (w.isWater(x, z)) { wetNear = [Math.round(x), Math.round(z), r]; break; }
    }
  }

  // the Parikrama Marg past the ghat is clear: walk its way past the fence
  // (r99418389) end to end, which the old arcade wall stood across
  place([-599.71, 179.35]);
  walk.marg = go([-564.21, 151.8], 1200);

  // no generated house inside the fence
  const rects = [loc.compound, ...(loc.compound.also || [])];
  let inside = 0;
  for (const lot of w.buildings.interiors) {
    const dx = lot.x - loc.pos[0], dz = lot.z - loc.pos[1];
    const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;
    if (rects.some((q) => lx > q.lx0 && lx < q.lx1 && lz > q.lz0 && lz < q.lz1)) inside++;
  }
  void toW;
  return {
    court: court ? court.top : null, paving, firstDown, whole, holed, holedAt, groundOver: groundHit ? +groundHit.point.y.toFixed(2) : null,
    holes: t.holes.filter((h) => h.owner === 'kaliya-ghat').length,
    walk,
    tree: plat ? +Math.hypot(plat.x - treeOSM[0], plat.z - treeOSM[1]).toFixed(2) : null,
    temple: drum ? +Math.hypot(drum.x - templeOSM[0], drum.z - templeOSM[1]).toFixed(2) : null,
    wetNear, inside,
  };
});

const near = (a, b2, tol) => a !== null && Math.abs(a - b2) <= tol;
check('the court is the ghat\'s floor, 2.2 m below the paving', out.court !== null && near(out.paving - out.court, 2.2, 0.15),
  out.court === null ? 'no court' : `${(out.paving - out.court).toFixed(2)} m down`);
check('the ground opens for it: straight down over the court you see the court floor',
  !!out.firstDown && near(out.firstDown.y, out.court, 0.1) && out.holes > 0,
  out.firstDown ? `first hit ${out.firstDown.name} at ${out.firstDown.y}${out.groundOver !== null ? ', ground at ' + out.groundOver : ''}; ${out.holes} ground quads opened` : 'nothing hit');
check('and the ground round it is whole, at the terrain\'s height', out.holed === 0 && out.whole > 20,
  `${out.whole} points found it, ${out.holed} found a hole${out.holedAt.length ? ' — at ' + JSON.stringify(out.holedAt) : ''}`);
check('in from the Parikrama Marg at the gate', out.walk.gate.miss < 0.8, `${out.walk.gate.miss} m short`);
check('down the steps into the court', out.walk.down.miss < 0.8 && near(out.walk.down.y, out.court, 0.15),
  `${out.walk.down.miss} m short, at ${out.walk.down.y} (court ${out.court === null ? '—' : out.court.toFixed(2)})`);
check('and back up them', out.walk.up.miss < 0.8 && out.walk.up.y > out.paving - 0.4, `${out.walk.up.miss} m short, at ${out.walk.up.y}`);
check('the kadamba stands where OSM has it, on its platform', out.tree !== null && out.tree < 1.0 && out.walk.tree.miss < 0.8,
  `${out.tree} m from node 3417299004; reached ${out.walk.tree.miss} m short`);
check('the round Old Kaliya Temple is where OSM has it', out.temple !== null && out.temple < 1.0, `${out.temple} m from way 334669313`);
check('the river is gone: no water within 450 m', out.wetNear === null, out.wetNear ? `water at ${out.wetNear}` : '');
check('the Parikrama Marg past the ghat is clear', out.walk.marg.miss < 0.8, `${out.walk.marg.miss} m short of the far end`);
check('no generated house inside the fence', out.inside === 0, `${out.inside}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
