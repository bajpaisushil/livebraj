/**
 * The Yamuna where it is, and Keshi Ghat stepping down into it.
 *
 * The river was a constant 130 m band on a 30-point centreline, 0.55 m below
 * the town: at Keshi Ghat the water began 30 m out from steps that stand in
 * it, at Chir, Imli Tala and Kaliya 20-35 m short of where it really starts,
 * and wherever the town's ground dipped half a metre the water plane showed
 * through as a pond. Keshi Ghat itself was a generic arcade wall with four
 * chhatris on a sixteen-tread flight that ended on sand.
 *
 * This measures, against ESRI imagery of February 2024 (measurement only) and
 * the plan in Sinha & Dhariwal (ISVS 2024): where the water starts on the
 * same five rays out from the ghats; that no field is flooded; that the water
 * stands at the foot of Keshi Ghat's steps the whole length of the front; and
 * that a body can come down from the town through the pink block, walk the
 * promenade, go down the steps into the river and back, out onto a burj, and
 * down to the boat landing.
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
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.buildings, null, { timeout: 200000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(600);

const out = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world, t = w.terrain;
  const pos = ctx.player.position;
  // the game's own projection (import.mjs): metres per degree at Banke Bihari
  const toW = (lat, lon) => [(lon - 77.6905) * 98740.61682392536, -(lat - 27.57998) * 110812.71176130591];

  /* ---- 1. where the water starts, on the rays measured on the imagery ---- */
  const RAYS = {
    'keshi-ghat': [27.5872629, 77.6987417, 327, 0],
    'chir-ghat': [27.5854985, 77.6966316, 315, 61],
    'imli-tala': [27.5835148, 77.6941441, 324, 80],
    'yugal-ghat': [27.5815351, 77.6910818, 354, 171],
    'kaliya-ghat': [27.578328, 77.6846537, 13, 546],
  };
  const starts = {};
  for (const [id, [la, lo, brg, img]] of Object.entries(RAYS)) {
    const [x0, z0] = toW(la, lo);
    const ux = Math.sin(brg * Math.PI / 180), uz = -Math.cos(brg * Math.PI / 180);
    let at = null;
    for (let d = 0; d <= 800; d += 1) {
      if (w.isWater(x0 + ux * d, z0 + uz * d)) { at = d; break; }
    }
    starts[id] = { at, img };
  }

  /* ---- 2. no flooded fields ---- */
  const cl = ctx.data.RIVER.points;
  const dcl = (x, z) => {
    let best = Infinity;
    for (let i = 1; i < cl.length; i++) {
      const ax = cl[i - 1][0], az = cl[i - 1][1], dx = cl[i][0] - ax, dz = cl[i][1] - az;
      const L2 = dx * dx + dz * dz || 1;
      const s = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      best = Math.min(best, Math.hypot(x - ax - dx * s, z - az - dz * s));
    }
    return best;
  };
  let ponds = 0, sampled = 0; const pondAt = [];
  for (let x = -1400; x <= 2200; x += 20) {
    for (let z = -1400; z <= 700; z += 20) {
      if (dcl(x, z) < 320) continue;
      sampled++;
      if (w.isWater(x, z)) { ponds++; if (pondAt.length < 3) pondAt.push([x, z]); }
    }
  }

  /* ---- 3. Keshi Ghat ---- */
  const FRONT = { A: [802, -792.5], B: [859, -830.8], C: [891, -844] };
  const run = (o, e) => { const L = Math.hypot(e[0] - o[0], e[1] - o[1]); const ux = (e[0] - o[0]) / L, uz = (e[1] - o[1]) / L;
    // s along, m landward (the river is on the left going south-west to north-east)
    return { len: L, W: (s, m) => [o[0] + ux * s - uz * m, o[1] + uz * s + ux * m] }; };
  const SW = run(FRONT.A, FRONT.B), NE = run(FRONT.B, FRONT.C);
  const prom = w.colliders.find((c) => c.tag === 'keshi-promenade');
  const Y0 = prom ? prom.top : null;
  const treads = w.colliders.filter((c) => c.tag === 'ghat-step' && Math.hypot(c.x - 845, c.z + 820) < 90);
  const tops = [...new Set(treads.map((c) => +c.top.toFixed(3)))].sort((a, b2) => b2 - a);
  const waterY = t.waterY;
  const lowestDry = tops.filter((y) => y > waterY).pop();
  // the water at the foot of the flight, all along the front
  let wet = 0, dryAt = [], probes = 0;
  const FOOT_M = -5 - 0.55 * 15 - 1.0;
  for (const [R, s0, s1] of [[SW, -20, SW.len], [NE, 0, NE.len - 2]]) {
    for (let s = s0; s <= s1; s += 5) {
      probes++;
      const q = R.W(s, FOOT_M);
      if (w.isWater(q[0], q[1])) wet++; else if (dryAt.length < 3) dryAt.push(q.map((v) => +v.toFixed(0)));
    }
  }
  // walking
  const place = (q) => { pos.set(q[0], w.standHeight(q[0], q[1], 99), q[1]); };
  const go = (q, cap = 900) => {
    const [tx, tz] = q;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0, low = Infinity, high = -Infinity;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.5) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y); high = Math.max(high, pos.y);
      n++;
    }
    ctx.input.move.y = 0;
    return { miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: +pos.y.toFixed(2), low: +low.toFixed(2), high: +high.toFixed(2), wade: +w.waterDepth(pos.x, pos.z).toFixed(2) };
  };
  const walk = {};
  // from the town, behind the pink block, down its passage onto the promenade
  place(SW.W(37.7, 21));
  walk.passage = go(SW.W(37.7, -2.5));
  // along the promenade to Keshi Ghat proper, in front of the Hanuman shrine —
  // on its river side, past the two shrines that stand out on it
  go(SW.W(37.7, -4.0));
  walk.along = go(NE.W(10.6, -3.9));
  // down the steps into the Yamuna, and back up
  walk.down = go(NE.W(10.6, -15.0), 700);
  walk.up = go(NE.W(10.6, -3.9), 700);
  // out along a neck onto a burj
  go(NE.W(20.2, -3.0));
  walk.burj = go(NE.W(20.2, -8.9), 300);
  // and down to the boat landing past the Yamunaji shrine — and back up from it,
  // which is the half that needs the flight: anyone can drop off a ledge
  go(NE.W(20.2, -3.0));
  go(NE.W(33.0, -2.5));
  walk.landing = go(NE.W(46.0, -2.5), 600);
  walk.fromLanding = go(NE.W(30.0, -2.5), 600);
  // standing on a dry tread over the river: no water, feet on the stone
  // the lowest tread still above the water, which is out over the river
  const dryK = tops.filter((y) => y > waterY + 0.1).length - 1, dryTop = tops[dryK];
  place(NE.W(10.6, -5 - 0.55 * (dryK + 0.5)));
  for (let i = 0; i < 40; i++) ctx.player.update(1 / 30, ctx);
  walk.onTread = { depth: +w.waterDepth(pos.x, pos.z).toFixed(3), y: +pos.y.toFixed(3), top: dryTop,
    bed: +w.groundHeight(pos.x, pos.z).toFixed(2), wet: w.isWater(pos.x, pos.z) };

  // the aarti: where you stand and where the lamp goes
  const a = w.anchors ? w.anchors['keshi-ghat'] : (w.anchorFor ? w.anchorFor('keshi-ghat') : null);
  const aarti = a ? {
    stand: w.standHeight(a.darshan.x, a.darshan.z, 99),
    altarWet: w.isWater(a.altar.x, a.altar.z),
  } : null;

  // no generated house inside the palaces
  const loc = ctx.data.LOCATION_BY_ID.get('keshi-ghat');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const rects = [loc.compound, ...(loc.compound.also || [])];
  let inside = 0;
  for (const lot of w.buildings.interiors) {
    const dx = lot.x - loc.pos[0], dz = lot.z - loc.pos[1];
    const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;
    if (rects.some((q) => lx > q.lx0 && lx < q.lx1 && lz > q.lz0 && lz < q.lz1)) inside++;
  }
  const kinds = Object.fromEntries(['r673572958', 'r1537934884'].map((id) => [id, (ctx.data.ROADS.find((r) => r.id === id) || {}).kind]));

  return { starts, ponds, sampled, pondAt, Y0, tops: tops.length, lowestDry, waterY, wet, probes, dryAt, walk, aarti,
    burjes: w.colliders.filter((c) => c.tag === 'keshi-burj').length, inside, kinds };
});

const near = (a, b2, tol) => a !== null && Math.abs(a - b2) <= tol;
for (const [id, s] of Object.entries(out.starts)) {
  check(`${id}: the water starts where the imagery has it`, near(s.at, s.img, 15),
    `${s.at === null ? 'no water' : s.at + ' m'} out, imagery ${s.img} m`);
}
check('no field in the town is flooded', out.ponds === 0,
  `${out.ponds} of ${out.sampled} points over 320 m from the river are water${out.pondAt.length ? ' — ' + JSON.stringify(out.pondAt) : ''}`);
check('Keshi Ghat has its promenade and a flight of fifteen treads', out.Y0 !== null && out.tops === 15,
  `promenade at ${out.Y0 === null ? '—' : out.Y0.toFixed(2)}, ${out.tops} tread heights`);
check('the Yamuna stands at the foot of the steps the whole length of the front', out.wet === out.probes,
  `${out.wet}/${out.probes} probes${out.dryAt.length ? ' — dry at ' + JSON.stringify(out.dryAt) : ''}`);
check('the last dry tread is just above the water', out.lowestDry !== undefined && out.lowestDry - out.waterY < 0.45,
  `${(out.lowestDry - out.waterY).toFixed(2)} m above it`);
check('eight burjes stand on the steps', out.burjes === 8, `${out.burjes}`);
const W = out.walk;
check('from the town, down the passage through the pink block onto the promenade',
  W.passage.miss < 0.8 && near(W.passage.y, out.Y0, 0.12), `${W.passage.miss} m short, at ${W.passage.y} (promenade ${out.Y0.toFixed(2)})`);
check('along the promenade to Keshi Ghat proper', W.along.miss < 0.8 && near(W.along.y, out.Y0, 0.12), `${W.along.miss} m short, at ${W.along.y}`);
check('down the steps into the Yamuna', W.down.low < out.waterY + 0.1 && W.down.wade > 0,
  `down to ${W.down.low}, the water at ${out.waterY}, wading ${W.down.wade} m`);
check('and back up them', W.up.miss < 0.8 && near(W.up.y, out.Y0, 0.12), `${W.up.miss} m short, at ${W.up.y}`);
check('out along a neck onto a burj', W.burj.miss < 0.8 && near(W.burj.y, out.Y0, 0.2), `${W.burj.miss} m short, at ${W.burj.y}`);
check('down to the boat landing at the north-east end, and back up', W.landing.miss < 0.8 && W.landing.y < out.Y0 - 1.0
  && W.fromLanding.miss < 0.8 && near(W.fromLanding.y, out.Y0, 0.12),
  `down to ${W.landing.y}, back up ${W.fromLanding.miss} m short at ${W.fromLanding.y}`);
check('a dry tread over the river is dry underfoot', W.onTread.wet && W.onTread.depth === 0 && near(W.onTread.y, W.onTread.top, 0.03),
  `over ${W.onTread.wet ? 'water, the bed at ' + W.onTread.bed : 'land'}: depth ${W.onTread.depth}, feet at ${W.onTread.y} on a tread at ${W.onTread.top}`);
check('the aarti: you stand on a dry tread and the lamp goes out over the water',
  !!out.aarti && out.aarti.altarWet && out.aarti.stand > out.waterY && out.aarti.stand < out.waterY + 0.6,
  out.aarti ? `standing at ${out.aarti.stand.toFixed(2)}, the water at ${out.waterY}` : 'no anchor');
check('no generated house stands inside the palaces', out.inside === 0, `${out.inside}`);
check('the promenade is a walk, not a road', out.kinds.r673572958 === 'gali' && out.kinds.r1537934884 === 'gali', JSON.stringify(out.kinds));
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
