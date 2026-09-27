/**
 * Routing smoke test — runs the real NavGraph over the real imported roads and
 * checks that every landmark is reachable from Banke Bihari by a route that is
 * plausibly longer than the straight line but not absurdly so.
 *
 *   node tools/checks/nav-smoke.mjs
 */
import content from '../../client/src/content/index.js';
import { NavGraph } from '../../client/src/game/navigation/NavGraph.js';

const ctx = { data: content };
const t0 = performance.now();
const nav = new NavGraph(ctx);
const buildMs = performance.now() - t0;
console.log(`graph built in ${buildMs.toFixed(0)} ms\n`);

const from = content.LOCATION_BY_ID.get('banke-bihari');
let fails = 0, slowest = 0, worstRatio = 0, worst = '';
const times = [];

for (const loc of content.LOCATIONS) {
  if (loc.id === from.id) continue;
  const t = performance.now();
  const path = nav.path(from.pos[0], from.pos[1], loc.pos[0], loc.pos[1]);
  const ms = performance.now() - t;
  times.push(ms);
  slowest = Math.max(slowest, ms);

  if (!path) { console.log(`  UNREACHABLE  ${loc.id}`); fails++; continue; }
  const len = NavGraph.length(path);
  const crow = Math.hypot(loc.pos[0] - from.pos[0], loc.pos[1] - from.pos[1]);
  const ratio = len / Math.max(crow, 1);
  if (ratio > worstRatio) { worstRatio = ratio; worst = loc.id; }
  const flag = ratio > 2.2 ? '  <-- detour' : '';
  console.log(`  ${loc.id.padEnd(24)} ${String(Math.round(len)).padStart(5)} m route / ${String(Math.round(crow)).padStart(5)} m direct  x${ratio.toFixed(2)}  ${ms.toFixed(1)}ms${flag}`);
  if (ratio > 4) fails++;
}

const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`\nroutes: ${times.length}  avg ${avg.toFixed(1)}ms  slowest ${slowest.toFixed(1)}ms`);
console.log(`worst detour ratio x${worstRatio.toFixed(2)} (${worst})`);

// parikrama sanity
const pari = content.PARIKRAMA;
let loop = 0;
for (let i = 1; i < pari.points.length; i++) {
  loop += Math.hypot(pari.points[i][0] - pari.points[i - 1][0], pari.points[i][1] - pari.points[i - 1][1]);
}
const gap = Math.hypot(pari.points[0][0] - pari.points[pari.points.length - 1][0],
                       pari.points[0][1] - pari.points[pari.points.length - 1][1]);
console.log(`parikrama: ${(loop / 1000).toFixed(2)} km, closing gap ${gap.toFixed(1)} m, ${pari.stops.length} stops`);

if (fails) { console.log(`\nFAILURES: ${fails}`); process.exit(1); }
console.log('\nall landmarks reachable.');
