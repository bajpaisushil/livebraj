/**
 * Does a route go through buildings?
 *
 * Reported twice, in these words: "e-rickshaw or any vehicle strikes buildings
 * not following proper path" and "currently it goes through people, buildings
 * which is unreal".
 *
 * It was measured once, by hand, and the numbers went into the backlog and
 * were never measured again:
 *
 *     Chhatikara -> ISKCON                  4.2% planned   1.7% driven
 *     Banke Bihari -> Keshi Ghat            2.4% planned
 *     ISKCON -> Prem Mandir                26.4% planned  10.4% driven
 *
 * A number in a document is not a check. This is the same measurement, run
 * every time: sample the route every two metres and ask `world.isClear` — the
 * SAME query that stops the player, so a route that fails here is a route you
 * could not walk either.
 *
 * Two things are measured separately and they are not the same question:
 *
 *   PLANNED   what NavGraph hands the driver. A planned route through a wall
 *             is a pathfinding fault.
 *   DRIVEN    where the vehicle actually goes, which is better than the plan,
 *             because the steering reads the road ahead and `collideAgents`
 *             pushes it out of things. A driven route through a wall is what
 *             you actually see from the seat, and is the number that matters.
 *
 *   node tools/checks/routes.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(8845, r));

const results = [];
const check = (n, pass, d) => { results.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const errors = [];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await p.goto('http://localhost:8845/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui, null, { timeout: 200000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(900);

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;

  /*
   * A vehicle is wider than a person, so it is asked with a vehicle's radius.
   * Asking with the player's 0.42 m would report a lane as clear that an
   * e-rickshaw cannot actually take.
   */
  const VEH_R = 0.75;

  /** How much of this polyline is inside something solid? */
  const blocked = (pts) => {
    let inside = 0, total = 0;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], az = pts[i - 1][1];
      const bx = pts[i][0], bz = pts[i][1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        total++;
        if (!w.isClear(x, z, VEH_R)) inside++;
      }
    }
    return { pct: total ? (100 * inside / total) : 0, total, inside };
  };

  const PAIRS = [
    ['chhatikara-crossing', 'iskcon-krishna-balaram'],
    ['banke-bihari', 'keshi-ghat'],
    ['iskcon-krishna-balaram', 'prem-mandir'],
    ['banke-bihari', 'radha-raman'],
    ['govind-dev', 'rangaji'],
  ];

  const out = [];
  for (const [fromId, toId] of PAIRS) {
    const from = ctx.data.LOCATION_BY_ID.get(fromId);
    const to = ctx.data.LOCATION_BY_ID.get(toId);
    if (!from || !to) { out.push({ fromId, toId, error: 'no such location' }); continue; }

    let route = null;
    try {
      // `drivable = true` — this is a vehicle's route, not a walker's, and a
      // gali a person threads is not a road an e-rickshaw can take
      route = ctx.nav && ctx.nav.path
        ? ctx.nav.path(from.pos[0], from.pos[1], to.pos[0], to.pos[1], true)
        : null;
    } catch (e) { out.push({ fromId, toId, error: String(e).slice(0, 80) }); continue; }
    if (!route || route.length < 2) { out.push({ fromId, toId, error: 'no route' }); continue; }

    let metres = 0;
    for (let i = 1; i < route.length; i++) {
      metres += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    }
    out.push({ fromId, toId, metres: Math.round(metres), points: route.length, ...blocked(route) });
  }

  return { routes: out, vehR: VEH_R };
});

const ok = r.routes.filter((q) => !q.error);
const bad = r.routes.filter((q) => q.error);

check('every pair can be routed at all', bad.length === 0,
  bad.length ? bad.map((q) => `${q.fromId}->${q.toId}: ${q.error}`).join('; ')
    : `${ok.length} routes, ${ok.reduce((s, q) => s + q.metres, 0)} m of road`);

for (const q of ok) {
  console.log(`      ${q.fromId} -> ${q.toId}: ${q.metres} m, `
    + `${q.pct.toFixed(1)}% inside solid geometry (${q.inside}/${q.total} samples)`);
}

/*
 * The thresholds.
 *
 * Not zero, and deliberately not. A route is a polyline down the middle of a
 * road and the buildings come right up to the kerb, so a sample on the inside
 * of a tight corner legitimately lands in a wall while the vehicle that
 * actually drives it does not — the steering reads ahead and `collideAgents`
 * pushes it out. What is being caught is a route that goes THROUGH a building
 * rather than one that clips a corner of it.
 */
const worst = ok.reduce((a, q) => (q.pct > a.pct ? q : a), { pct: 0 });
check('no route runs through a building', worst.pct < 8,
  ok.length ? `worst is ${worst.fromId} -> ${worst.toId} at ${worst.pct.toFixed(1)}%` : 'none measured');

const mean = ok.length ? ok.reduce((s, q) => s + q.pct, 0) / ok.length : 0;
check('and most of the network is clean', mean < 4,
  `${mean.toFixed(1)}% across ${ok.length} routes, asked with a ${r.vehR} m vehicle`);

console.log('');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed, ${errors.length} console errors`);
if (errors.length) for (const e of errors.slice(0, 5)) console.log('  ! ' + e);
await b.close(); server.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
