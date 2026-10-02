/**
 * Do people walk on the verge, and is the middle of the road clear?
 *
 * Everyone steered at NavGraph nodes, and those sit on the road CENTRELINE. So
 * the crowd walked down the middle of the carriageway and the vehicles drove
 * through them — "it always strikes everyone". It was never that the rickshaw
 * failed to avoid anybody; there was nowhere for it to go.
 *
 * `terrain.roadDistance(x, z)` is the distance from a point to the nearest road
 * centreline, which is exactly the number this needs. Before the fix a walker
 * on a road measured about zero.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto(`http://localhost:${__PORT}/`,{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.crowd && window.vrindavan?.ctx?.ui,null,{timeout:240000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  // let them walk a while, so everyone has left the node they spawned on
  for (let i = 0; i < 900; i++) ctx.crowd.update(1 / 30, ctx);

  const terrain = ctx.world.terrain;
  /*
   * Only the DRIVABLE kinds. A gali is four metres wide with no kerb and no
   * carriageway — people walk down the middle of one in Braj and vehicles do
   * not use them at all, so `vergeFor` deliberately only nudges walkers there.
   * Counting gali walkers as "in the vehicle channel" measures nothing.
   */
  const DRIVEN = new Set(['trunk', 'highway', 'main', 'parikrama', 'street']);
  const off = [];
  const narrow = [];
  for (const a of ctx.crowd.people) {
    if (!a.walking) continue;                     // a standing figure proves nothing
    const d = terrain.roadDistance(a.x, a.z);
    if (d > 14) continue;                         // not on a road at all
    (DRIVEN.has(a.edgeKind) ? off : narrow).push(d);
  }
  off.sort((x, y) => x - y);
  const at = (q) => (off.length ? +off[Math.floor(off.length * q)].toFixed(2) : -1);

  // the channel a vehicle drives down: a rickshaw is about 1.2 m across
  const inChannel = off.filter((d) => d < 1.2).length;

  // And the vehicles must still be ON the centreline. They live in the
  // per-type instance slots; `crowd.vehicles` is only bookkeeping and carries
  // no position at all, which is what the first draft of this check read.
  const veh = [];
  const diag = { withPrev: 0, noPrev: 0, idle: 0, noTarget: 0, offLeg: [] };
  for (const slot of ctx.crowd.vehicleInst || []) {
    for (const v of slot.agents || []) {
      const d = terrain.roadDistance(v.x, v.z);
      if (d >= 20) continue;
      veh.push(d);
      if (v.prev) diag.withPrev++; else diag.noPrev++;
      if (v.idle > 0) diag.idle++;
      if (!v.target) diag.noTarget++;
      // how far off ITS OWN leg is it, as opposed to off any road at all?
      if (v.prev && v.target) {
        const sx = v.target.x - v.prev.x, sz = v.target.z - v.prev.z;
        const sl = Math.hypot(sx, sz);
        if (sl > 0.5) {
          const ux = sx / sl, uz = sz / sl;
          const ex = v.x - v.prev.x, ez = v.z - v.prev.z;
          diag.offLeg.push(Math.abs(ex * uz - ez * ux));
        }
      }
    }
  }
  veh.sort((x, y) => x - y);
  diag.offLeg.sort((a2, b2) => a2 - b2);
  diag.offLegMedian = diag.offLeg.length ? +diag.offLeg[Math.floor(diag.offLeg.length / 2)].toFixed(2) : -1;
  diag.offLegP90 = diag.offLeg.length ? +diag.offLeg[Math.floor(diag.offLeg.length * 0.9)].toFixed(2) : -1;
  diag.offLeg = diag.offLeg.length;

  /*
   * Clearance: for every vehicle, how close is the nearest WALKING person?
   * A rickshaw is about 1.2 m across and a person about 0.5, so anything under
   * 0.85 m is the two of them occupying the same ground.
   */
  const STRIKE = 0.85;
  const clear = [];
  let strikes = 0, pairs = 0;
  const strikeAt = [];
  for (const slot of ctx.crowd.vehicleInst || []) {
    for (const v of slot.agents || []) {
      let best = Infinity;
      for (const a of ctx.crowd.people) {
        const dx = a.x - v.x, dz = a.z - v.z;
        const dd = Math.hypot(dx, dz);
        if (dd < 12) pairs++;
        if (dd < best) best = dd;
        if (dd < STRIKE) {
          strikes++;
          // where, and what each was doing, so a strike can be found again
          if (strikeAt.length < 3) {
            let near = null, nd = Infinity;
            for (const l of ctx.data.LOCATIONS) {
              const d2 = Math.hypot(l.pos[0] - v.x, l.pos[1] - v.z);
              if (d2 < nd) { nd = d2; near = l.id; }
            }
            strikeAt.push({ at: [Math.round(v.x), Math.round(v.z)], gap: +dd.toFixed(2), near, nearM: Math.round(nd),
              vehicle: { type: slot.type && slot.type.id || slot.id || '?', speed: +(v.speed || 0).toFixed(1), state: v.state || v.mode || '' },
              person: { type: a.type && a.type.id || a.kind || '?', state: a.state || a.mode || '', speed: +(a.speed || 0).toFixed(2) } });
          }
        }
      }
      if (best < Infinity) clear.push(best);
    }
  }
  clear.sort((x, y) => x - y);

  return {
    STRIKE, strikes, pairs, strikeAt,
    clearMin: clear.length ? +clear[0].toFixed(2) : -1,
    clearMedian: clear.length ? +clear[Math.floor(clear.length / 2)].toFixed(2) : -1,
    walkers: off.length, onNarrow: narrow.length,
    p10: at(0.1), median: at(0.5), p90: at(0.9),
    inChannel, inChannelPct: off.length ? +(100 * inChannel / off.length).toFixed(1) : 0,
    vehicles: veh.length,
    vehMedian: veh.length ? +veh[Math.floor(veh.length / 2)].toFixed(2) : -1,
    vehP90: veh.length ? +veh[Math.floor(veh.length * 0.9)].toFixed(2) : -1,
    diag,
  };
});

check('there are walkers on drivable roads to measure', r.walkers > 40,
  `${r.walkers} on a drivable road, ${r.onNarrow} more in galis and on paths (not counted)`);
check('the typical walker is off the centreline', r.median > 1.6,
  `offset from the middle: p10 ${r.p10} m, median ${r.median} m, p90 ${r.p90} m`);

/*
 * The two assertions that used to live here measured `roadDistance`, which is
 * the distance to the NEAREST road of any kind. At a junction a walker
 * correctly on his own verge is a metre from the CROSS street's centreline, and
 * a vehicle faithfully following its leg reads as 3 m off "the road" because
 * NavGraph snaps nodes within 3 m and stitches junctions within 9, so its legs
 * are not exactly the centrelines. Both were measuring the graph, not the
 * behaviour, and both would have failed for ever.
 *
 * What was actually asked for is that the rickshaw stops hitting people. So
 * measure that: the clearance between every vehicle and every walker.
 */
check('vehicles hold their own lane', r.diag.offLegMedian < 2.0,
  `off their own leg: median ${r.diag.offLegMedian} m, p90 ${r.diag.offLegP90} m`
  + ` (${r.diag.withPrev}/${r.diag.withPrev + r.diag.noPrev} on a known leg)`);
check('no vehicle is standing in somebody', r.strikes === 0,
  `${r.strikes} vehicle/person pairs closer than ${r.STRIKE} m`
  + ` | nearest person to a vehicle: min ${r.clearMin} m, median ${r.clearMedian} m`
  + ` | ${r.pairs} pairs within 12 m`
  + (r.strikes ? ` | ${JSON.stringify(r.strikeAt)}` : ''));

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
