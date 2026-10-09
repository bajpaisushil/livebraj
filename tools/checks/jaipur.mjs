/**
 * The Jaipur Mandir, on its real site, entered the way it is entered.
 *
 * It stood for its whole life here as a curated pin 1 km south-west of the
 * building it named (OSM way 679447890). Now it stands on that way's centre,
 * and its gate faces EAST — the survey's working assumption, settled by the
 * imagery: the drive from Mathura Road meets the middle of the east range.
 *
 * So this walks a real player in from the drive, as a pilgrim arriving by
 * rickshaw does: up the forecourt's steps, through the gateway and the street
 * range's passage, across the east court on its axial path, up the five
 * risers to the shrine's terrace, through the great arch into the dark hall,
 * to the darshan point before Radha Madhav — and checks the walled core lets
 * nobody in any other way.
 *
 *   node tools/checks/jaipur.mjs
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
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.interior, null, { timeout: 160000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(900);

// OSM way 679447890's centre, in world metres (the importer's toWorld)
const OSM = [(77.6903564 - 77.69050) * 98740.61682392536, -(27.5722227 - 27.57998) * 110812.71176130591];

const out = await p.evaluate((OSM) => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const all = ctx.data.LOCATIONS.filter((l) => l.id === 'jaipur-mandir');
  const loc = all[0];
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const pos = ctx.player.position;
  const drive = w.groundHeight(...P(100, 8));
  const place = (lx, lz) => { const q = P(lx, lz); pos.set(q[0], w.standHeight(q[0], q[1], w.groundHeight(q[0], q[1])), q[1]); };
  const go = (lx, lz, cap = 1200) => {
    const [tx, tz] = P(lx, lz);
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
    const [ax, az] = L(pos.x, pos.z);
    return { at: [+ax.toFixed(2), +az.toFixed(2)], y: +(pos.y - drive).toFixed(2), low: +(low - drive).toFixed(2), high: +(high - drive).toFixed(2), miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2) };
  };
  const r = { count: all.length, pos: loc.pos, off: Math.hypot(loc.pos[0] - OSM[0], loc.pos[1] - OSM[1]) };
  // the old pin's ground: 27.56720 / 77.68190, nothing of the temple there now
  const old = [(77.68190 - 77.69050) * 98740.61682392536, -(27.56720 - 27.57998) * 110812.71176130591];
  r.oldLeft = w.colliders.filter((c) => Math.hypot(c.x - old[0], c.z - old[1]) < 60 && /^jm-/.test(c.tag || '')).length;
  // in from the drive
  place(100, 8);
  r.foot = go(92.5, 8);                 // to the foot of the forecourt's steps
  r.fore = go(86, 8);                   // up them, onto the forecourt
  r.gate = go(79.5, 0);                 // to the gateway, on the axis
  r.passage = go(66, 0);                // through the street range
  r.court = go(58, 0);                  // into the east court
  r.path = go(28.2, 0);                 // along the axial path to the shrine's steps
  r.terrace = go(22.5, 0);              // up the five risers
  r.arch = go(17.0, 0);                 // through the great arch
  r.darshan = go(-3.6, 0);              // to the darshan point
  const vol = ctx.interior.volumes.find((v) => v.loc && v.loc.id === 'jaipur-mandir');
  r.inside = vol ? ctx.interior._contains(vol, pos.x, pos.z, 1.0) : null;
  const a = w.anchors['jaipur-mandir'];
  r.anchorOff = Math.hypot(a.darshan.x - pos.x, a.darshan.z - pos.z);
  r.altarBeyond = L(a.altar.x, a.altar.z)[0] < -8.4;
  r.sanctum = go(-12, 0, 400);          // the altar is not walked onto
  // and back out
  r.back = go(17.0, 0);
  r.down = go(30, 0);
  r.out = go(86, 0);
  // no other way in: from outside the west wall, walk east at the block
  place(-56, 0);
  r.west = go(-30, 0, 600);
  // nor over the north range from the wood
  place(0, -48);
  r.north = go(0, -30, 600);
  return r;
}, OSM);

const near = (a, b2, tol) => Math.abs(a - b2) <= tol;
console.log(`  (the walk, heights over the drive: forecourt ${out.fore.y}, court ${out.court.y}, terrace ${out.terrace.y}, hall ${out.darshan.y})`);
check('one Jaipur Mandir, on OSM way 679447890\'s centre', out.count === 1 && out.off < 1.0,
  `${out.count} location(s), ${out.off.toFixed(2)} m from the way's centre, at [${out.pos.map((v) => v.toFixed(1))}]`);
check('nothing of it left where the old pin stood, 1 km south-west', out.oldLeft === 0, `${out.oldLeft} of its colliders there`);
check('from the drive up the broad steps onto the forecourt', out.foot.miss < 0.8 && out.fore.miss < 0.8 && out.fore.y > 0.3,
  `${out.fore.at} at ${out.fore.y} m`);
check('through the gateway on the EAST and the street range\'s passage', out.gate.miss < 0.8 && out.passage.miss < 0.8,
  `${out.gate.at} then ${out.passage.at}`);
check('into the east court, along the axial path to the shrine\'s steps', out.court.miss < 0.8 && out.path.miss < 0.8 && near(out.path.y, out.court.y, 0.05),
  `${out.path.at} at ${out.path.y} m`);
check('up five risers to the terrace, 1.15 m', out.terrace.miss < 0.8 && near(out.terrace.y - out.court.y, 1.15, 0.05),
  `${out.terrace.at}, ${(out.terrace.y - out.court.y).toFixed(2)} m over the court`);
check('through the great arch into the hall', out.arch.miss < 0.8 && near(out.arch.y, out.terrace.y, 0.05), `${out.arch.at} at ${out.arch.y} m`);
check('at the darshan point, inside the hall, before Radha Madhav', out.darshan.miss < 0.8 && out.inside === true && out.anchorOff < 1.0 && out.altarBeyond,
  `${out.darshan.at}, inside=${out.inside}, ${out.anchorOff.toFixed(2)} m from the anchor`);
// the threshold of the sanctum, yes; the altar platform (front at lx -9.8), no
check('to the sanctum\'s threshold, and not onto the altar', out.sanctum.at[0] > -9.9 && out.sanctum.at[0] < -8.0, `stopped at lx ${out.sanctum.at[0]}`);
check('and back out, down the steps, to the forecourt', out.back.miss < 0.8 && out.down.miss < 0.8 && out.out.miss < 0.8 && near(out.down.y, out.court.y, 0.05),
  `${out.out.at} at ${out.out.y} m`);
check('no way in through the west range', out.west.at[0] < -44.5, `stopped at lx ${out.west.at[0]}`);
check('nor through the north range', out.north.at[1] < -38.5, `stopped at lz ${out.north.at[1]}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed === res.length ? 0 : 1);
