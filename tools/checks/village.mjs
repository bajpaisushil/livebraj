/**
 * Chhatikara, built as deep as it is (BuildingGenerator `rows`, a district's
 * `ground`).
 *
 * Everybody starts in Chhatikara, and the game drew it as a fringe of houses
 * along each road round open lawn: ESRI shows a carpet of flat roofs between
 * the roads on bare trodden earth. The village is now built three rows deep
 * behind every street (two behind the road bands), and its ground is earth.
 *
 * This asks: are the back rows there; does every gap between two houses
 * still either share a wall or leave a lane to walk down; does nothing stand
 * on a road; is the ground earth in the village and grass in the fields
 * round it; and is the start still clear.
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
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?.props, null, { timeout: 240000 });

const out = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, w = ctx.world, t = w.terrain;
  const lots = w.buildings && w.buildings.lots;
  if (!lots) return { missing: true };
  const { obb, obbGap, TOWN } = await import('/src/game/world/BuildingGenerator.js');
  const { pointInPolygon } = await import('/src/engine/math/Curves.js');
  const D = ctx.data.DISTRICTS.filter((d) => d.group === 'chhatikara');
  const village = D.find((d) => d.id === 'chhatikara');
  const inV = (x, z) => D.some((d) => pointInPolygon(x, z, d.poly));
  const vl = lots.filter((l) => inV(l.x, l.z));

  // the back rows: houses with a house between them and the road
  const back = vl.filter((l) => t.roadDistance(l.x, l.z) > 20).length;

  // the lane rule, over every pair of the village's houses
  const A = {}, B = {};
  let pairs = 0, pockets = 0, overlaps = 0; const pocketAt = [];
  for (let i = 0; i < vl.length; i++) {
    const a = vl[i];
    obb(a.x, a.z, a.w, a.d, a.rot, A);
    for (let j = i + 1; j < vl.length; j++) {
      const c = vl[j];
      if (Math.abs(c.x - a.x) > 30 || Math.abs(c.z - a.z) > 30) continue;
      const g = obbGap(A, obb(c.x, c.z, c.w, c.d, c.rot, B));
      if (g > TOWN.laneMin + 1) continue;
      pairs++;
      if (g < -TOWN.partyOverlap - 0.01) overlaps++;
      else if (g > TOWN.partyMax + 0.01 && g < TOWN.laneMin - 0.01) { pockets++; if (pocketAt.length < 3) pocketAt.push([Math.round(a.x), Math.round(a.z), +g.toFixed(2)]); }
    }
  }

  // nothing on a road: each house's corners and middle off every carriageway, by the roads' own lines
  let vx0 = Infinity, vx1 = -Infinity, vz0 = Infinity, vz1 = -Infinity;
  for (const l of vl) { vx0 = Math.min(vx0, l.x); vx1 = Math.max(vx1, l.x); vz0 = Math.min(vz0, l.z); vz1 = Math.max(vz1, l.z); }
  const segs = [];
  for (const r of ctx.data.ROADS) {
    if (r.fob) continue;
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1], c = r.points[i];
      if (Math.max(a[0], c[0]) < vx0 - 40 || Math.min(a[0], c[0]) > vx1 + 40 || Math.max(a[1], c[1]) < vz0 - 40 || Math.min(a[1], c[1]) > vz1 + 40) continue;
      segs.push({ a, c, half: r.width / 2 });
    }
  }
  const onCarriageway = (x, z) => segs.some(({ a, c, half }) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1;
    const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
    return Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k) < half;
  });
  let onRoad = 0; const onRoadAt = [];
  for (const l of vl) {
    obb(l.x, l.z, l.w, l.d, l.rot, A);
    const pts = [[l.x, l.z]];
    for (const su of [-1, 1]) for (const sv of [-1, 1]) pts.push([l.x + A.ux * A.hw * su + A.vx * A.hd * sv, l.z + A.uz * A.hw * su + A.vz * A.hd * sv]);
    if (pts.some(([x, z]) => onCarriageway(x, z))) { onRoad++; if (onRoadAt.length < 3) onRoadAt.push([Math.round(l.x), Math.round(l.z)]); }
  }

  // the ground: earth in the village, grass in the fields round it
  const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const earth = [], field = [];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of village.poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  for (let x = x0; x < x1; x += 23) for (let z = z0; z < z1; z += 23) {
    if (t.roadDistance(x, z) < 12) continue;
    const inside = pointInPolygon(x, z, village.poly);
    let edge = Infinity;
    for (let i = 0; i < village.poly.length; i++) {
      const a = village.poly[i], c = village.poly[(i + 1) % village.poly.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1;
      const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
      edge = Math.min(edge, Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k));
    }
    if (edge < 30 || D.some((d) => d !== village && pointInPolygon(x, z, d.poly))) continue;
    (inside ? earth : field).push(hex(t.groundColor(x, z)));
  }
  const isEarth = ([r, g, bl]) => r > g && g > bl && r - bl > 25;
  const isGreen = ([r, g]) => g > r;

  // the start: where a first launch puts you is ground you fit on
  const pin = ctx.data.LOCATION_BY_ID ? ctx.data.LOCATION_BY_ID.get('chhatikara-crossing') : null;
  const P = ctx.player.position;
  const startClear = w.fits(P.x, P.z, 0.42, P.y);

  return {
    lots: vl.length, back, rows: village.rows || 1, pairs, pockets, overlaps, pocketAt, onRoad, onRoadAt,
    earth: earth.length, earthOk: earth.filter(isEarth).length, field: field.length, fieldOk: field.filter(isGreen).length,
    earthEg: earth[0], fieldEg: field[0], startClear, start: [Math.round(P.x), Math.round(P.z)], pin: pin ? pin.pos.map(Math.round) : null,
  };
});

if (out.missing) {
  check('Chhatikara is built as deep as it is', false, 'the buildings do not expose their lots');
} else {
  check('Chhatikara is built behind its streets, not just along them',
    out.lots > 900 && out.back > out.lots * 0.25,
    `${out.lots} houses in the village, ${out.back} of them more than 20 m from any road (${out.rows} rows deep)`);
  check('every gap between two houses shares a wall or leaves a lane', out.pockets === 0 && out.overlaps === 0,
    `${out.pairs} neighbouring pairs: ${out.pockets} pockets${out.pocketAt.length ? ' at ' + JSON.stringify(out.pocketAt) : ''}, ${out.overlaps} overlapping`);
  check('nothing stands on a road', out.onRoad === 0, `${out.onRoad} houses with a corner on a carriageway${out.onRoadAt.length ? ' at ' + JSON.stringify(out.onRoadAt) : ''}`);
  check('the village stands on bare earth, the fields round it are grass',
    out.earth > 100 && out.earthOk / out.earth > 0.95 && out.field > 50 && out.fieldOk / out.field > 0.95,
    `earth at ${out.earthOk} of ${out.earth} points in it (e.g. rgb ${out.earthEg}), grass at ${out.fieldOk} of ${out.field} round it (e.g. ${out.fieldEg})`);
  const fromPin = out.pin ? Math.hypot(out.start[0] - out.pin[0], out.start[1] - out.pin[1]) : Infinity;
  check('and the start, at the crossing, is clear', out.startClear && fromPin < 120,
    `you start at ${JSON.stringify(out.start)}, ${Math.round(fromPin)} m from the crossing's pin, ${out.startClear ? 'on ground you fit' : 'INSIDE SOMETHING'}`);
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
if (errs.length) for (const e of errs.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === res.length && !errs.length ? 0 : 1);
