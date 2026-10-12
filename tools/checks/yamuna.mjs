/**
 * The Yamuna round its south-eastern loop (import.mjs, TerrainBuilder).
 *
 * The river leaves the world by its east edge north of Keshi Ghat and comes
 * back in round its south-eastern loop, out by the south edge. Only the
 * longest stretch of its line was imported, and the terrain draws water
 * only near that line, so the loop — 2.3 km of the river inside its own
 * riverbank polygons, open water 112-286 m wide on ESRI (210 m at the middle
 * of 22 sections measured across it) — was dry ground.
 *
 * This asks: is the loop water all along it, and as wide as the river
 * runs; is nothing built, planted or routed in it; does the road bridge east
 * of the town stand on piers well over it, and can you walk across; does
 * the pontoon off Keshi Ghat still float; does the bridge being built beside
 * it stop at the water, as it does; and does "walk to the Yamuna" from
 * beside the loop take you to its bank.
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
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true, get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.props
  && window.vrindavan?.ctx?.nav && window.vrindavan?.ctx?.map, null, { timeout: 240000 });

const out = await p.evaluate(() => {
  const app = window.vrindavan, ctx = app.ctx, w = ctx.world;
  Math.random = ctx.rngAt(1);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const R = ctx.data.RIVER, ROADS = ctx.data.ROADS, nav = ctx.nav;
  if (!R.more || !R.more.length) return { missing: true };
  const waterY = w.terrain.waterY;
  const B = ctx.data.WORLD.bounds;
  const inside = (x, z, m = 0) => x > B.minX + m && x < B.maxX - m && z > B.minZ + m && z < B.maxZ - m;
  // the loop's own ground: the box round its line inside the world
  let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity;
  for (const { points: line } of R.more) for (const [x, z] of line) if (inside(x, z)) { lx0 = Math.min(lx0, x); lx1 = Math.max(lx1, x); lz0 = Math.min(lz0, z); lz1 = Math.max(lz1, z); }
  lx0 -= 250; lx1 += 250; lz0 -= 250; lz1 += 250;
  const inLoop = (x, z) => x > lx0 && x < lx1 && z > lz0 && z < lz1;

  /* ---- the water, along the loop's line and across it ---- */
  let n = 0, wet = 0; const dryAt = [], widths = [];
  for (const { points: line } of R.more) {
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i];
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let s = 0; s < L; s += 15) {
        const x = ax + ux * s, z = az + uz * s;
        if (!inside(x, z, 30)) continue;
        n++;
        if (w.isWater(x, z)) wet++; else if (dryAt.length < 4) dryAt.push([Math.round(x), Math.round(z)]);
        if (n % 10 === 0 && w.isWater(x, z)) {
          let across = 0;
          for (const side of [1, -1]) {
            let d = 0;
            while (d < 300 && w.isWater(x - uz * side * d, z + ux * side * d)) d += 2;
            across += d;
          }
          widths.push(across);
        }
      }
    }
  }
  widths.sort((a, c) => a - c);

  /* ---- nothing in it: built, planted or walked ---- */
  const BRIDGE = /^bridge-/;
  const builtIn = w.colliders.filter((c) => inLoop(c.x, c.z) && !BRIDGE.test(c.tag || '') && w.isWater(c.x, c.z));
  const trees = [];
  w.props.group.traverse((o) => {
    if (!o.isInstancedMesh || !/^Trees_/.test(o.name || '')) return;
    const e = o.instanceMatrix.array;
    for (let i = 0; i < o.count; i++) trees.push([e[i * 16 + 12], e[i * 16 + 14]]);
  });
  const treesIn = trees.filter(([x, z]) => inLoop(x, z) && w.isWater(x, z)).length;
  const treesOnBank = trees.filter(([x, z]) => inLoop(x, z) && !w.isWater(x, z)).length;
  const navIn = [];
  for (const node of nav.nodes.values()) if (!node.deck && inLoop(node.x, node.z) && w.isWater(node.x, node.z)) navIn.push([Math.round(node.x), Math.round(node.z)]);

  /* ---- the road bridge east of the town ---- */
  const road = (id) => ROADS.find((r) => r.id === id);
  const g = (x, z) => w.groundHeight(x, z);
  const top = (x, z) => w.standHeight(x, z, Math.max(g(x, z), waterY) + 30);
  const along = (r, f) => {
    const P = r.points; let L = 0; const cum = [0];
    for (let i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(L); }
    const s = f * L;
    let i = 1; while (i < P.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return { p: [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t], L };
  };
  const br = road('r99427151');
  let overWater = 0, lowest = Infinity, highest = -Infinity, piers = 0;
  if (br) {
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const [x, z] = along(br, f).p;
      if (!w.isWater(x, z)) continue;
      overWater++;
      lowest = Math.min(lowest, top(x, z) - waterY);
      highest = Math.max(highest, top(x, z) - waterY);
    }
    const P = br.points;
    for (const c of w.colliders) {
      if (c.tag !== 'bridge-pier' || !w.isWater(c.x, c.z)) continue;
      const ax = P[0][0], az = P[0][1], dx = P[P.length - 1][0] - ax, dz = P[P.length - 1][1] - az, L2 = dx * dx + dz * dz;
      const k = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / L2));
      if (Math.hypot(c.x - ax - dx * k, c.z - az - dz * k) < 6) piers++;
    }
  }
  // walked across, end to end
  const pos = ctx.player.position;
  const place = (q, feet) => { pos.set(q[0], w.standHeight(q[0], q[1], feet), q[1]); ctx.player._standY = null; };
  const go = (q, cap = 1500) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let k = 0, jump = 0, wetFeet = 0;
    while (k < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.45) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      const px = pos.x, pz = pos.z;
      ctx.player.update(1 / 30, ctx);
      jump = Math.max(jump, Math.hypot(pos.x - px, pos.z - pz));
      if (w.isWater(pos.x, pos.z) && pos.y < waterY + 0.3) wetFeet++;
      k++;
    }
    ctx.input.move.y = 0;
    return { miss: Math.hypot(tx - pos.x, tz - pos.z), jump, wetFeet };
  };
  let walk = null;
  if (br) {
    const a = along(br, 0).p;
    place(a, g(...a));
    let worst = 0, jump = 0, wetFeet = 0;
    for (let f = 0.05; f <= 1.0001; f += 0.05) {
      const r = go(along(br, f).p);
      worst = Math.max(worst, r.miss); jump = Math.max(jump, r.jump); wetFeet += r.wetFeet;
      if (r.miss > 2) break;
    }
    walk = { worst: +worst.toFixed(2), jump: +jump.toFixed(2), wetFeet };
  }

  /* ---- the pontoon off Keshi Ghat ---- */
  const pon = road('r670922315');
  let float = null;
  if (pon) {
    const hs = [];
    for (let f = 0; f <= 1.0001; f += 0.02) { const [x, z] = along(pon, f).p; if (w.isWater(x, z)) hs.push(top(x, z) - waterY); }
    if (hs.length) float = { n: hs.length, lo: +Math.min(...hs).toFixed(2), hi: +Math.max(...hs).toFixed(2) };
  }

  /* ---- the bridge being built: its approaches, and nothing across ---- */
  const appr = ROADS.filter((r) => /^r1514020216/.test(r.id));
  let apprWet = 0, apprN = 0;
  for (const r of appr) for (let f = 0; f <= 1.0001; f += 0.01) { apprN++; if (w.isWater(...along(r, f).p)) apprWet++; }

  /* ---- "walk to the Yamuna", from beside the loop ---- */
  const near = nav.nearest(700, 2330);
  let target = null;
  if (near) {
    place([near.x, near.z], g(near.x, near.z));
    const t = ctx.map._riverTarget();
    if (t) {
      let edge = Infinity;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) for (let d = 0; d < 40; d += 2) if (w.isWater(t.pos[0] + Math.cos(a) * d, t.pos[1] + Math.sin(a) * d)) { edge = Math.min(edge, d); break; }
      target = { from: [Math.round(near.x), Math.round(near.z)], to: t.pos.map(Math.round), d: Math.round(Math.hypot(t.pos[0] - near.x, t.pos[1] - near.z)), dry: !w.isWater(...t.pos), edge };
    }
  }

  return {
    n, wet, dryAt, widthMed: widths[widths.length >> 1] || 0, widthMin: widths[0] || 0, widths: widths.length,
    builtIn: builtIn.length, builtAt: builtIn.slice(0, 3).map((c) => [Math.round(c.x), Math.round(c.z), c.tag || '']),
    treesIn, treesOnBank, navIn: navIn.length, navAt: navIn.slice(0, 3),
    bridge: !!br, overWater, lowest: +lowest.toFixed(2), highest: +highest.toFixed(2), piers, walk, float,
    appr: appr.map((r) => r.id), apprWet, apprN, target,
  };
});

if (out.missing) {
  check('the Yamuna runs round its south-eastern loop', false, 'RIVER has no `more`: only the longest stretch was imported');
} else {
  check('the Yamuna runs round its south-eastern loop, water all along it',
    out.n > 100 && out.wet / out.n > 0.97, `${out.wet} of ${out.n} points along its line are water${out.dryAt.length ? '; dry at ' + JSON.stringify(out.dryAt) : ''}`);
  // ESRI z16, 22 sections across it: 112-286 m of open water, 210 m the middle one
  check('as wide as the river runs there', out.widths >= 5 && out.widthMin >= 100 && Math.abs(out.widthMed - 210) < 50,
    `${out.widths} sections across it: ${out.widthMin} m at the narrowest, ${out.widthMed} m the middle one (ESRI: 112-286 m, 210 the middle)`);
  check('nothing built, planted or routed in it',
    out.builtIn === 0 && out.treesIn === 0 && out.navIn === 0,
    `${out.builtIn} colliders${out.builtAt.length ? ' ' + JSON.stringify(out.builtAt) : ''}, ${out.treesIn} trees (${out.treesOnBank} on its banks), ${out.navIn} path nodes${out.navAt.length ? ' ' + JSON.stringify(out.navAt) : ''} in the water`);
  /*
   * It starts at the north-western bank, its first 20 m over land, so its deck
   * climbs over the water's edge there: in the river the approach embankments
   * are on the roads either side, and here the climb is on the bridge.
   */
  check('the road bridge east of the town stands on piers well over it',
    out.bridge && out.overWater >= 10 && out.highest > 8 && out.lowest > 2.5 && out.piers >= 3,
    `${out.overWater} of its points over the water, the deck ${out.lowest}-${out.highest} m over it; ${out.piers} piers in the river`);
  check('and you can walk across it, dry',
    !!out.walk && out.walk.worst < 2 && out.walk.jump < 0.3 && out.walk.wetFeet === 0,
    out.walk ? `${out.walk.worst} m short at worst, longest stride ${out.walk.jump} m, ${out.walk.wetFeet} steps in the water` : 'no bridge');
  check('the pontoon off Keshi Ghat still floats', !!out.float && out.float.lo > 0.6 && out.float.hi < 1.3,
    out.float ? `${out.float.n} points over the water, ${out.float.lo}-${out.float.hi} m over it` : 'no pontoon over water');
  check('the bridge being built beside it stops at the water, both banks\' approaches kept',
    out.appr.length === 2 && out.apprWet === 0, `${out.appr.join(', ')}: ${out.apprWet} of ${out.apprN} points in the water`);
  check('"walk to the Yamuna" from beside the loop goes to its bank',
    !!out.target && out.target.d < 500 && out.target.dry && out.target.edge < 20,
    out.target ? `from ${JSON.stringify(out.target.from)} to ${JSON.stringify(out.target.to)}, ${out.target.d} m, ${out.target.dry ? 'dry' : 'IN THE WATER'}, ${out.target.edge} m from the edge` : 'no target');
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
if (errs.length) for (const e of errs.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === res.length && !errs.length ? 0 : 1);
