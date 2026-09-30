/**
 * Every arch lies IN its wall, not across it.
 *
 * cuspedArch spans along (cos R, sin R). Measured in isolation with a 4 m
 * arch at builder rot 0: passing `rot` gives 4.0 m along the long axis and
 * 0.6 m across; passing `rot + PI/2` gives 0.6 along and 4.0 across. So an
 * arch handed the wrong one of the two stands perpendicular to its own wall
 * — a fin sticking out of the building instead of an opening in it.
 *
 * The codebase disagreed with itself about which to pass: ISKCON used `rot`
 * for its doorway and `rot + PI/2` for its verandah, on walls running the
 * same way. With 77 call sites across builders in two mirror-image local
 * frames, reading them one at a time is how the error spread. So this check
 * knows nothing about any builder's conventions. It records every arch the
 * world actually builds (LandmarkGenerator's opt-in recorder), finds the wall
 * collider each one sits in, and asks one question of the pair: are they
 * parallel?
 *
 *   |span . wallAxis| >= 0.9   in the wall       — correct
 *   |span . wallAxis| <= 0.35  across the wall   — the bug
 *   an arch with no long wall within 1.2 m is free-standing and not judged
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

const verbose = process.argv.includes('--list');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
await p.addInitScript(() => { globalThis.__recordArches = true; });
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world && globalThis.__archLog,
  null, { timeout: 220000 });

const out = await p.evaluate(() => {
  const W = window.vrindavan.ctx.world;
  const log = globalThis.__archLog || [];
  const byOwner = {};
  let inWall = 0, across = 0, oblique = 0, free = 0;
  const byLine = {};
  const examples = {};
  for (const a of log) {
    const own = a.owner || '(none)';
    const o = byOwner[own] || (byOwner[own] = { total: 0, inWall: 0, across: 0, oblique: 0, free: 0 });
    o.total++;
    const sx = Math.cos(a.rot), sz = Math.sin(a.rot);
    // the nearest LONG, THIN box collider — a wall, not a pier or a floor
    let best = null, bestD = 1.2;
    for (const c of (W.grid.query(a.x, a.z, 8) || [])) {
      if (c.type !== 'box' || c.standOnly || c.floor) continue;
      /*
       * A wall must actually REACH the arch. The Krishna Balaram arcade stands
       * at 4 m and the staircase treads under it top out at 1.1-1.3 m; judged
       * against a tread, two correct bays came back "across". Anything whose
       * top is below the arch's springing is a step, a kerb or a plinth.
       */
      if (c.top !== undefined && c.top < a.y + 0.5) continue;
      const long = Math.max(c.hw, c.hd), thin = Math.min(c.hw, c.hd);
      if (long * 2 < 1.6 || long < thin * 2.5) continue;
      const cr = Math.cos(c.rot), sr = Math.sin(c.rot);
      const dx = a.x - c.x, dz = a.z - c.z;
      const lx = dx * cr + dz * sr, lz = -dx * sr + dz * cr;
      const d = Math.hypot(Math.max(Math.abs(lx) - c.hw, 0), Math.max(Math.abs(lz) - c.hd, 0));
      /*
       * Judge an arch only against a wall it sits ALONGSIDE — its centre must
       * project onto the wall's length, not off the end of it. At a courtyard
       * corner the nearest box can be the perpendicular wall that ENDS there,
       * and judging against that flagged correctly built ISKCON bays as
       * standing across their wall. The first cut of this check did exactly
       * that; the code, read by hand, was right.
       */
      const along = c.hw >= c.hd ? Math.abs(lx) : Math.abs(lz);
      if (along > long - 0.25) continue;
      if (d < bestD) { bestD = d; best = c; }
    }
    const L = byLine[a.line] || (byLine[a.line] = { line: a.line, owners: {}, inWall: 0, across: 0, oblique: 0, free: 0 });
    L.owners[own] = 1;
    if (!best) { free++; o.free++; L.free++; continue; }
    const cr = Math.cos(best.rot), sr = Math.sin(best.rot);
    const ax = best.hw >= best.hd ? [cr, sr] : [-sr, cr];
    const dot = Math.abs(sx * ax[0] + sz * ax[1]);
    if (dot >= 0.9) { inWall++; o.inWall++; L.inWall++; }
    else if (dot <= 0.35) {
      across++; o.across++; L.across++;
      (examples[own] = examples[own] || []).length < 2
        && examples[own].push({ at: [+a.x.toFixed(1), +a.z.toFixed(1)], y: +a.y.toFixed(1), w: +a.w.toFixed(1) });
    } else { oblique++; o.oblique++; L.oblique++; }
  }
  return { total: log.length, inWall, across, oblique, free, byOwner, examples, byLine };
});

const judged = out.inWall + out.across + out.oblique;
check('the world builds arches, and they were recorded', out.total > 50, `${out.total} arches recorded`);
check('most arches are close enough to a wall to be judged', judged > out.total * 0.4,
  `${judged} judged, ${out.free} free-standing`);
const bad = Object.entries(out.byOwner).filter(([, o]) => o.across > 0)
  .sort((a, bb) => bb[1].across - a[1].across);
check('no arch stands ACROSS its wall', out.across === 0,
  out.across ? `${out.across} across, in: ${bad.map(([k, o]) => `${k} ${o.across}/${o.total}`).join(', ')}` : `${out.inWall} in their walls`);
check('no arch sits at an odd angle to its wall', out.oblique === 0, `${out.oblique} oblique`);

if (process.argv.includes('--lines')) {
  console.log('');
  console.log('  per CALL SITE (line: in wall / across / oblique / free) — owners');
  for (const L of Object.values(out.byLine).sort((a, bb) => a.line - bb.line)) {
    if (!L.across && !L.oblique && !process.argv.includes('--all')) continue;
    console.log(`    L${String(L.line).padEnd(5)} ${String(L.inWall).padStart(3)} ${String(L.across).padStart(3)} ${String(L.oblique).padStart(3)} ${String(L.free).padStart(3)}   ${Object.keys(L.owners).join(', ')}`);
  }
}
if (verbose || out.across) {
  console.log('');
  console.log('  per landmark (in wall / across / oblique / free-standing):');
  for (const [k, o] of Object.entries(out.byOwner).sort((a, bb) => bb[1].across - a[1].across)) {
    console.log(`    ${k.padEnd(26)} ${String(o.inWall).padStart(4)} ${String(o.across).padStart(4)} ${String(o.oblique).padStart(4)} ${String(o.free).padStart(4)}`
      + (out.examples[k] ? `   e.g. ${JSON.stringify(out.examples[k][0])}` : ''));
  }
}

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed === res.length ? 0 : 1);
