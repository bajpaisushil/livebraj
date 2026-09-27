/**
 * Can you walk DOWN every flight, as well as up?
 *
 * `stairs.mjs` covers the ghats. This covers every OTHER flight in the world —
 * the temple altar steps, Banke Bihari's, anything a builder tags with a tread
 * top — because you reported not being able to get down the steps by the
 * Deities at Krishna Balaram and said to fix it everywhere, not just there.
 *
 * Down is the harder direction and the one that broke: going up, `standHeight`
 * lifts you onto the next tread; coming down, anything that keeps you at the
 * height you were at leaves you walking on air over the flight and then
 * stopping at its edge.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8811,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8811/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;

  const treads = w.standables.filter((c) => c.tag && /step/.test(c.tag));

  /*
   * Group treads into flights by CONNECTIVITY, not by a grid.
   *
   * This used to bucket on Math.round(x / 18), which splits any flight wider
   * than eighteen metres into slices — and Keshi Ghat's is about fifty. Each
   * slice then held treads from the same few levels, so `lo` and `hi` were side
   * by side rather than one above the other, and the walk set off ACROSS the
   * face of the ghat instead of down it. The check was reporting the bucketing.
   *
   * Union-find over "within JOIN metres and the same tag" gives the whole ghat
   * as one flight however wide it is, and keeps two separate stairs apart.
   */
  const JOIN = 3.6;
  const parent = treads.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };

  // a grid only to keep the pairwise search cheap; it does not decide anything
  const cell = JOIN, buckets = new Map();
  treads.forEach((t, i) => {
    const k = Math.floor(t.x / cell) + ',' + Math.floor(t.z / cell);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(i);
  });
  treads.forEach((t, i) => {
    const gx = Math.floor(t.x / cell), gz = Math.floor(t.z / cell);
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      const near = buckets.get((gx + ox) + ',' + (gz + oz));
      if (!near) continue;
      for (const j of near) {
        if (j <= i) continue;
        const u = treads[j];
        if (u.tag !== t.tag) continue;
        if (Math.hypot(u.x - t.x, u.z - t.z) <= JOIN) union(i, j);
      }
    }
  });

  const flights = new Map();
  treads.forEach((t, i) => {
    const k = find(i);
    if (!flights.has(k)) flights.set(k, []);
    flights.get(k).push(t);
  });

  const out = { flights: 0, treads: treads.length, bad: [] };
  for (const [, list] of flights) {
    if (list.length < 3) continue;
    list.sort((a, b) => a.top - b.top);
    const lo = list[0], hi = list[list.length - 1];
    const drop = +(hi.top - lo.top).toFixed(2);
    if (drop < 0.2) continue;
    out.flights++;
    const key = lo.tag + '@' + Math.round(lo.x) + ',' + Math.round(lo.z);

    /*
     * Walk the flight the way a person does: tread to tread.
     *
     * The previous version worked out one straight fall line for the whole
     * flight and walked it. That is right for a straight stair and wrong for a
     * ghat, which curves with the bank — measured, the walk left the treads
     * after about four risers and reported 1.36 m descended of 5.1 m. Fitting
     * a better line does not help, because there is no line; the flight bends.
     *
     * So: group the treads into LEVELS by height, take each level's centroid,
     * and walk from one down to the next. That follows a curve, handles a
     * flight built from several boxes per level, and is a fair description of
     * what a pilgrim actually does on these steps. It needs no fall line at
     * all, which is the part that kept being subtly wrong.
     */
    const levels = [];
    for (const t of list) {
      const lv = levels.find((q) => Math.abs(q.top - t.top) < 0.05);
      if (lv) { lv.sx += t.x; lv.sz += t.z; lv.n++; }
      else levels.push({ top: t.top, sx: t.x, sz: t.z, n: 1 });
    }
    for (const lv of levels) { lv.x = lv.sx / lv.n; lv.z = lv.sz / lv.n; }
    levels.sort((a2, b2) => b2.top - a2.top);          // highest first

    const walk = (order) => {
      const pt = { x: order[0].x, y: 0, z: order[0].z };
      let feet = w.standHeight(pt.x, pt.z, order[0].top);
      let lo2 = feet, hi2 = feet;
      for (let i = 1; i < order.length; i++) {
        const tgt = order[i];
        // step toward this level's centre, and give up on it rather than
        // grinding if something is genuinely in the way
        for (let k = 0; k < 120; k++) {
          const dx2 = tgt.x - pt.x, dz2 = tgt.z - pt.z;
          const dd = Math.hypot(dx2, dz2);
          if (dd < 0.1) break;
          const st = Math.min(0.09, dd);
          pt.x += (dx2 / dd) * st; pt.z += (dz2 / dd) * st;
          w.collide(pt, 0.42, feet);
          feet = w.standHeight(pt.x, pt.z, feet);
          if (feet < lo2) lo2 = feet;
          if (feet > hi2) hi2 = feet;
        }
      }
      return { lo: lo2, hi: hi2, end: feet };
    };

    const down = walk(levels);
    const up = walk(levels.slice().reverse());
    const got = +(levels[0].top - down.lo).toFixed(2);
    const back = +(up.hi - up.lo).toFixed(2);
    const run = +levels.reduce((s2, lv, i) => i
      ? s2 + Math.hypot(lv.x - levels[i - 1].x, lv.z - levels[i - 1].z) : 0, 0).toFixed(1);
    const fit = levels.length + ' levels';

    out.bad.push({ key, fit, drop, run: +run.toFixed(1), descended: got, climbed: back,
                   treads: list.length, ok: got >= drop * 0.6 && back >= drop * 0.6 });
  }
  out.all = out.bad.slice();
  out.bad = out.bad.filter((x) => !x.ok);
  out.nBad = out.bad.length;
  return out;
});

check('there are flights to test', r.flights > 2,
  `${r.flights} flights, ${r.treads} treads`);
console.log('  every flight:');
for (const f of r.all) console.log('   ', JSON.stringify(f));
check('every flight can be walked DOWN and back up', r.nBad === 0,
  r.nBad ? `${r.nBad} of ${r.flights} failed — ` + JSON.stringify(r.bad[0])
         : `all ${r.flights} flights`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
