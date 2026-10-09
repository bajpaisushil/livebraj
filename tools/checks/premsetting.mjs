/**
 * Prem Mandir's campus, where the imagery puts it, and its show at its hours.
 *
 * The temple stood 11 m east of its own building: the importer's name match
 * found the PLATFORM's pin and the builder took it for the building's centre.
 * Its setting was a placeholder dome 80 m off, a fountain 27 m out of place,
 * one avenue where there are two, and no gate. This checks what was measured
 * off z19 imagery (PremMandirSetting.js) is where it was measured, that a
 * pilgrim can walk in from the road through the south gate, and that the
 * musical fountain plays when the guides say it does and not otherwise.
 *
 *   node tools/checks/premsetting.mjs
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
const PORT = server.address().port;

const res = []; const check = (n, pass, d) => { res.push(!!pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.shows && window.vrindavan?.ctx?.world?._ready, null, { timeout: 160000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));

// OSM: the building (way 673573044) and the platform (way 491803653), their
// bounding-box centres in world metres
const BUILDING = [-1834.12, 875.08], PLATFORM = [-1823.02, 874.08];

const out = await p.evaluate(({ BUILDING, PLATFORM }) => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const loc = ctx.data.LOCATIONS.find((l) => l.id === 'prem-mandir');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const P = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const L = (x, z) => { const dx = x - loc.pos[0], dz = z - loc.pos[1]; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const r = { pos: loc.pos, offB: Math.hypot(loc.pos[0] - BUILDING[0], loc.pos[1] - BUILDING[1]) };
  // the platform's own floor: the largest stand-on box near the platform's centre
  const big = w.colliders.filter((c) => c.type === 'box' && c.hw > 40 && c.hd > 25 && Math.hypot(c.x - PLATFORM[0], c.z - PLATFORM[1]) < 30);
  big.sort((a, c) => Math.hypot(a.x - PLATFORM[0], a.z - PLATFORM[1]) - Math.hypot(c.x - PLATFORM[0], c.z - PLATFORM[1]));
  r.platOff = big.length ? Math.hypot(big[0].x - PLATFORM[0], big[0].z - PLATFORM[1]) : null;
  // what stands where it was measured: the Prem Bhavan's solid base, the
  // north hall, the fountain's rim, the Kaliya pool's rim
  const near = (lx, lz, pred) => { const q = P(lx, lz); return w.colliders.filter((c) => Math.hypot(c.x - q[0], c.z - q[1]) < 3 && pred(c)).length; };
  r.bhavan = near(-164.6, -88.5, (c) => c.type === 'box' && c.hw > 45 && c.hd > 45 && c.top === undefined);
  r.hall = near(-1.9, -139.5, (c) => c.type === 'box' && c.hw > 40 && c.hd > 16 && c.top === undefined);
  r.fountainRim = w.colliders.filter((c) => c.tag === 'prem-fountain').length;
  r.kaliyaRim = w.colliders.filter((c) => c.tag === 'prem-kaliya').length;
  // the fountain's centre, from its rim
  const rim = w.colliders.filter((c) => c.tag === 'prem-fountain');
  const fc = rim.reduce((a, c) => [a[0] + c.x / rim.length, a[1] + c.z / rim.length], [0, 0]);
  r.fountainAt = L(fc[0], fc[1]).map((v) => +v.toFixed(1));
  // in from the road through the gate, along the west avenue, to the plaza
  const pos = ctx.player.position;
  const go = (lx, lz, cap = 1500) => {
    const [tx, tz] = P(lx, lz);
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    let n = 0;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.5) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx); n++;
    }
    ctx.input.move.y = 0;
    const [ax, az] = L(pos.x, pos.z);
    return { at: [+ax.toFixed(1), +az.toFixed(1)], miss: +Math.hypot(tx - pos.x, tz - pos.z).toFixed(2), y: +(pos.y - w.groundHeight(pos.x, pos.z)).toFixed(2) };
  };
  ctx.player.placeAt(ctx, ...P(-5.2, 140));
  r.road = { at: L(pos.x, pos.z).map((v) => +v.toFixed(1)) };
  r.gate = go(-5.2, 104);                 // through the gate's arch
  r.avenue = go(-15.9, 92);               // onto the west avenue
  r.up = go(-15.9, 50);                   // along it to the plaza
  r.plaza = go(-15.9, 42);
  // THE SHOW
  const S = ctx.shows;
  const live0 = ctx.live && ctx.live.vrindavanTime;
  const at = (month, h) => () => ({ date: new Date(2026, month, 15, Math.floor(h), Math.round((h % 1) * 60)), decimal: h });
  const sch = {};
  ctx.state.settings.liveTime = true;
  ctx.live.vrindavanTime = at(9, 19.2); sch.oct1912 = S.isOn(ctx);   // October: winter hours
  ctx.live.vrindavanTime = at(9, 19.7); sch.oct1942 = S.isOn(ctx);
  ctx.live.vrindavanTime = at(6, 19.7); sch.jul1942 = S.isOn(ctx);   // July: summer hours
  ctx.live.vrindavanTime = at(6, 19.2); sch.jul1912 = S.isOn(ctx);
  ctx.live.vrindavanTime = at(9, 13.0); sch.oct1300 = S.isOn(ctx);
  ctx.live.vrindavanTime = live0;
  ctx.state.settings.liveTime = false;
  const phase0 = ctx.time.phase;
  ctx.time.phase = 'day'; sch.day = S.isOn(ctx);
  ctx.time.phase = 'evening'; sch.evening = S.isOn(ctx);
  // play it, near the fountain, and listen
  const heard = [];
  const off = ctx.bus.on('sfx', (e) => { if (e && (e.name === 'mridanga' || e.name === 'kartal')) heard.push(e.name); });
  pos.set(...P(-1.9, -60)).y = pos.y;
  const q = P(-1.9, -60); pos.x = q[0]; pos.z = q[1];
  S._check = 0;
  let shown = 0, scaled = 0;
  for (let i = 0; i < 120; i++) {
    S.update(1 / 30, ctx);
    for (const j of S.jets) { if (j.visible) shown++; if (j.scale.y > 0.3) scaled++; }
  }
  r.show = { sets: S.jets.length, shown, scaled, beats: heard.length };
  ctx.time.phase = 'day';
  S._check = 0;
  S.update(1 / 30, ctx);
  r.show.afterHidden = S.jets.every((j) => !j.visible);
  ctx.time.phase = phase0;
  if (typeof off === 'function') off();
  r.sch = sch;
  return r;
}, { BUILDING, PLATFORM });

check('the temple stands on its own building (OSM way 673573044)', out.offB < 1.0, `${out.offB.toFixed(2)} m from the outline's centre`);
check('and its platform on the platform\'s (way 491803653)', out.platOff !== null && out.platOff < 1.5, `${out.platOff === null ? 'none found' : out.platOff.toFixed(2) + ' m'}`);
check('the Prem Bhavan\'s base where the imagery has it, 94 m across', out.bhavan > 0, `${out.bhavan} at (-164.6, -88.5)`);
check('the hall north of the fountain, 86 x 34 m', out.hall > 0, `${out.hall}`);
check('the fountain\'s basin at its measured centre', out.fountainRim > 30 && Math.abs(out.fountainAt[0] + 1.9) < 1 && Math.abs(out.fountainAt[1] + 87.3) < 1,
  `${out.fountainRim} rim chords, centred at [${out.fountainAt}]`);
check('the Kaliya pool, its rim solid', out.kaliyaRim > 30, `${out.kaliyaRim} rim chords`);
check('in from the road through the south gate', out.gate.miss < 0.8, `from [${out.road.at}] to [${out.gate.at}]`);
check('along the west avenue to the plaza', out.avenue.miss < 0.8 && out.up.miss < 0.8 && out.plaza.miss < 0.8, `[${out.plaza.at}], ${out.plaza.y} m over the ground`);
const s = out.sch;
check('the show keeps winter hours in October: 19:00-19:30', s.oct1912 && !s.oct1942 && !s.oct1300, JSON.stringify({ '19:12': s.oct1912, '19:42': s.oct1942, '13:00': s.oct1300 }));
check('and summer hours in July: 19:30-20:00', s.jul1942 && !s.jul1912, JSON.stringify({ '19:42': s.jul1942, '19:12': s.jul1912 }));
check('without the live clock, in the evening and only then', s.evening && !s.day, JSON.stringify({ evening: s.evening, day: s.day }));
check('it plays: four sets of jets rise and fall', out.show.sets === 4 && out.show.shown > 0 && out.show.scaled > 0, JSON.stringify(out.show));
// a step every 0.42 s, the mridanga on four of eight and the kartals on the
// even ones: about one sound a step, nine or ten in four seconds
check('with the bhajan\'s beat near the fountain', out.show.beats >= 7, `${out.show.beats} sounds in 4 s`);
check('and nothing of it is there when it is over', out.show.afterHidden === true, String(out.show.afterHidden));
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed === res.length ? 0 : 1);
