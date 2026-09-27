/**
 * Can you walk down the ghat steps — and back up, and across open ground?
 *
 * The steps were drawn and never made solid: sixteen quads a ghat with no
 * collider near them, so you walked through the whole flight at terrain height.
 * Then they were made solid and you still could not get down them, because a
 * ghat is cut INTO the bank: every tread but the first sits BELOW the terrain
 * and the ground query only ever raised you. A real ghat dropped 0.01 m in 14 s.
 *
 * So this walks a real player down a real flight, turns him round and walks him
 * back up it, asks the ground query about every ghat in the town, checks the
 * treads are shaped like treads, and then walks him over open ground — because
 * the cheap way to make a descent work is to stop treating the terrain as the
 * floor, and that drops you through the world.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = process.env.STAIRS_ROOT || path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8801,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8801/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:120000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(900);

/**
 * Helpers installed in the page.
 *
 * A flight is recovered from its own treads: their centres march down it, so
 * they give the axis, the height and the length without anyone having to guess
 * where the river is. The walk aims the CAMERA, because stick-up means away
 * from the camera and that is the only heading the player actually obeys —
 * setting his yaw and hoping was how the old check walked fourteen seconds in
 * the wrong direction and reported a flat ghat. And it re-aims at a point a few
 * metres ahead on the flight's own centreline every frame, because a ghat has a
 * town around it: on a fixed heading one arcade wall slid him six metres
 * sideways off the steps, which is a reasonable thing for a person to do and
 * useless for a check that means to measure those particular treads.
 */
await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;

  window.__flight = (loc) => {
    const near = w.colliders.filter(c => c.tag === 'ghat-step' && Math.hypot(c.x - loc.pos[0], c.z - loc.pos[1]) < 25)
      .sort((a, b) => Math.hypot(a.x - loc.pos[0], a.z - loc.pos[1]) - Math.hypot(b.x - loc.pos[0], b.z - loc.pos[1]));
    if (near.length < 2) return null;
    const c0 = near[0], c1 = near[1], last = near[near.length - 1];
    const d = Math.hypot(c1.x - c0.x, c1.z - c0.z);
    const ux = (c1.x - c0.x) / d, uz = (c1.z - c0.z) / d;
    // A tread is a shallow box a long way wider than it is deep, and its
    // shallow axis has to point down the flight or its footprint is not the
    // step it is drawn as. The centres give the flight's own axis, so the two
    // can be compared without having to trust either one of them.
    const square = Math.abs(ux * -Math.sin(c0.rot) + uz * Math.cos(c0.rot));
    return { id: loc.id, x: c0.x, z: c0.z, ux, uz, treads: near.length, square: +square.toFixed(3),
      top: c0.top, height: c0.top - last.top, length: d * near.length };
  };
  window.__flights = () => ctx.data.LOCATIONS.filter(l => l.type === 'ghat').map(window.__flight).filter(Boolean);

  /** Which lane down a flight has nothing standing in it — an arcade, a stall, people. */
  window.__lane = (f) => {
    let best = { lat: 0, blocked: 99 };
    for (const lat of [0, 8, -8, 16, -16, 24, -24]) {
      const px = f.x + f.uz * lat, pz = f.z - f.ux * lat;
      let blocked = 0;
      for (let t = -2; t <= f.length; t += 1) {
        if (!w.isClear(px + f.ux * t, pz + f.uz * t, 0.6, 'ghat-step')) blocked++;
      }
      if (blocked < best.blocked) best = { lat, blocked };
      if (!blocked) break;
    }
    return best;
  };

  window.__walkAxis = (f, lat, toT, cap = 900) => {
    const px = f.x + f.uz * lat, pz = f.z - f.ux * lat;
    const pos = ctx.player.position;
    const at = () => (pos.x - px) * f.ux + (pos.z - pz) * f.uz;
    const dir = toT > at() ? 1 : -1;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    const track = [], gap = [];
    let n = 0, low = pos.y, high = pos.y;
    while (n < cap && (toT - at()) * dir > 0.4) {
      const aim = dir > 0 ? Math.min(at() + 3, toT) : Math.max(at() - 3, toT);
      ctx.camera.rotation.set(0, Math.atan2(px + f.ux * aim - pos.x, pz + f.uz * aim - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      low = Math.min(low, pos.y); high = Math.max(high, pos.y);
      if (n % 15 === 0) { track.push(+pos.y.toFixed(2)); gap.push(+(pos.y - w.groundHeight(pos.x, pos.z)).toFixed(2)); }
      n++;
    }
    ctx.input.move.y = 0;
    return { frames: n, t: +at().toFixed(1), off: +((pos.x - px) * f.uz - (pos.z - pz) * f.ux).toFixed(1),
      y: +pos.y.toFixed(2), low: +low.toFixed(2), high: +high.toFixed(2), track, gap };
  };

  window.__walkTo = (tx, tz, cap = 600) => {
    const pos = ctx.player.position;
    const x0 = pos.x, z0 = pos.z;
    ctx.input.bodyRelative = false; ctx.input.strafe = 0; ctx.input.walk = 0;
    ctx.input.running = false; ctx.input.move.x = 0; ctx.input.move.y = 1;
    const gap = [];
    let n = 0;
    while (n < cap && Math.hypot(tx - pos.x, tz - pos.z) > 0.7) {
      ctx.camera.rotation.set(0, Math.atan2(tx - pos.x, tz - pos.z) + Math.PI, 0);
      ctx.player.update(1 / 30, ctx);
      if (n % 15 === 0) gap.push(+(pos.y - w.groundHeight(pos.x, pos.z)).toFixed(2));
      n++;
    }
    ctx.input.move.y = 0;
    return { frames: n, moved: +Math.hypot(pos.x - x0, pos.z - z0).toFixed(1), y: +pos.y.toFixed(2), gap };
  };
});

const r1 = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  return { treads: w.colliders.filter(c => c.tag === 'ghat-step').length,
    ghats: ctx.data.LOCATIONS.filter(l => l.type === 'ghat').length };
});
check('ghat treads are solid', r1.treads > 40, `${r1.treads} treads across ${r1.ghats} ghats`);

/* ---- down a real flight, and back up it ---- */
const walk = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  // the flight whose treads are squarest to it, walked down the clearest lane:
  // this check is about the steps, not about the arcade or the crowd on them
  const f = window.__flights().sort((a, b) => b.square - a.square)[0];
  if (!f) return { ok:false, why:'no ghat treads' };
  const lane = window.__lane(f);
  const px = f.x + f.uz * lane.lat, pz = f.z - f.ux * lane.lat;
  const sx = px - f.ux * 2, sz = pz - f.uz * 2;
  ctx.player.position.set(sx, w.standHeight(sx, sz, 99), sz);
  ctx.player.setYaw(Math.atan2(f.ux, f.uz));
  const y0 = ctx.player.position.y;
  const down = window.__walkAxis(f, lane.lat, f.length - 0.6);
  const up = window.__walkAxis(f, lane.lat, -2);
  return { ok:true, id:f.id, lane:lane.lat, flight:+f.height.toFixed(2), from:+y0.toFixed(2),
    dropped:+(y0 - down.low).toFixed(2), climbed:+(up.y - down.low).toFixed(2), down, up };
});
check('you descend the flight instead of gliding over it',
  walk.ok && walk.dropped > walk.flight * 0.6,
  walk.ok ? `${walk.id} lane ${walk.lane} m: ${walk.from} m -> ${walk.down.low} m, dropped ${walk.dropped} of a ${walk.flight} m flight, ${walk.down.t} m down it\n        track ${JSON.stringify(walk.down.track)}` : walk.why);
check('and you can climb back up it',
  walk.ok && walk.climbed > walk.dropped * 0.8 && walk.up.y > walk.from - 0.45,
  walk.ok ? `back up to ${walk.up.y} m from ${walk.down.low} m, climbed ${walk.climbed} m of the ${walk.dropped} m he came down\n        track ${JSON.stringify(walk.up.track)}` : walk.why);

/* ---- every ghat in the town, not just the one ---- */
const all = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  return window.__flights().map((f) => {
    // no player: step the ground query down the flight feeding it its own
    // answer, which is what the walk does one sub-step at a time
    let feet = w.standHeight(f.x - f.ux * 2, f.z - f.uz * 2, 99);
    const top = feet;
    let low = feet;
    for (let t = -2; t <= f.length; t += 0.25) {
      feet = w.standHeight(f.x + f.ux * t, f.z + f.uz * t, feet);
      low = Math.min(low, feet);
    }
    return { id: f.id, height: +f.height.toFixed(2), dropped: +(top - low).toFixed(2) };
  });
});
check('the ground goes down every flight in the town, not just one',
  all.length > 0 && all.every(g => g.dropped > g.height * 0.5),
  all.map(g => `${g.id} ${g.dropped}/${g.height}`).join(', '));

/* ---- are the treads shaped like treads at all? ---- */
const square = await p.evaluate(() => window.__flights().map(f => ({ id: f.id, square: f.square })));
const allSquare = square.length > 0 && square.every(f => f.square > 0.98);
check('every flight\'s treads lie square across it', allSquare,
  square.map(f => `${f.id} ${f.square}`).join(', ') + (allSquare ? '' :
    '\n        A tread is 0.95 m deep and up to 120 m wide, so one turned out of true is a long\n' +
    '        diagonal bar lying across the whole flight at the height of a single step, and you\n' +
    '        climb back onto it as fast as you step off it. TerrainBuilder._buildGhats maps its\n' +
    '        local frame with p(lx,lz) = [cx + lx*cs + lz*sn, cz - lx*sn + lz*cs], which is the\n' +
    '        TRANSPOSE of the one MeshBuilder.box, BuildingGenerator and LandmarkGenerator use,\n' +
    '        so the tread it hands over as rot: ang wants to be rot: -ang.'));

/* ---- and open ground still holds you up ---- */
const open = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  // somewhere with nothing built underfoot at all: the ground query asked from
  // the terrain must answer the terrain, or something is standing there
  const clear = (x, z) => !w.isWater(x, z) && Math.abs(w.standHeight(x, z, w.groundHeight(x, z)) - w.groundHeight(x, z)) < 0.01;
  let start = null, yaw = 0;
  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type === 'ghat') continue;
    for (const a of [0, 1.6, 3.1, 4.7]) {
      const x = loc.pos[0] + Math.sin(a) * 70, z = loc.pos[1] + Math.cos(a) * 70;
      let ok = true;
      for (let t = 0; t <= 14; t += 1) ok = ok && clear(x + Math.sin(a) * t, z + Math.cos(a) * t);
      if (ok) { start = [x, z]; yaw = a; break; }
    }
    if (start) break;
  }
  if (!start) return { ok:false, why:'nowhere open found' };
  ctx.player.position.set(start[0], w.standHeight(start[0], start[1], 99), start[1]);
  ctx.player.setYaw(yaw);
  const run = window.__walkTo(start[0] + Math.sin(yaw) * 12, start[1] + Math.cos(yaw) * 12);
  return { ok:true, at:[+start[0].toFixed(0), +start[1].toFixed(0)], run,
    worst:+Math.max(...run.gap.map(Math.abs)).toFixed(2) };
});
check('open ground neither swallows you nor leaves you hovering',
  open.ok && open.run.moved > 8 && open.worst < 0.25,
  open.ok ? `walked ${open.run.moved} m at ${open.at}, worst gap to the terrain ${open.worst} m  ${JSON.stringify(open.run.gap)}` : open.why);

console.log('');
if (errs.length) { console.log('ERRORS:'); errs.slice(0,3).forEach(e=>console.log('  '+e)); }
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errs.length} errors`);
await b.close(); server.close();
process.exit(passed===res.length && !errs.length ? 0 : 1);
