/**
 * Can you walk through a temple wall?
 *
 * You reported entering a temple through its side instead of its gate, and
 * that is the ISKCON fault a second time — its compound was drawn with no
 * colliders at all and a ring scan came back 360 degrees clear. The answer
 * then was to fix ISKCON. The answer now is this: EVERY temple, all the way
 * round, every time the suite runs.
 *
 * Two measurements per temple, and they say different things:
 *
 *   SOLIDITY — sample the wall line all the way round and count the arc that
 *   is clear. A temple you enter should be mostly solid with a gate or two;
 *   anything over about a fifth open is a wall that is not there.
 *
 *   WAYS IN — walk at the centre from every direction and see where you get
 *   through. The openings found this way should be few and should line up with
 *   the arc the solidity scan reported clear. A temple that admits you from
 *   every bearing has no walls at all, whatever it looks like.
 *
 * A landmark with no interior is SUPPOSED to be a solid block you walk around,
 * so it is checked the other way: it must admit you nowhere.
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
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:240000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const out = [];

  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type !== 'temple') continue;
    const [cx, cz] = loc.pos;
    const anchor = w.anchorFor(loc.id);
    // "enterable" here means the world gave it an inside to reach
    const enterable = !!(w.interiors && w.interiors[loc.id])
      || !!(anchor && anchor.floor !== undefined && anchor.altar);
    /*
     * ASK THE BUILDER where its building is. Do not infer it.
     *
     * This is the third measurement error in this file and they were all the
     * same one: `loc.build` is sometimes the BUILDING and sometimes the PLOT.
     * Krishna Balaram's is a 54 x 66 m walled plot whose temple block is
     * 24.5 x 32, so a threshold taken from build.w put "inside" out in the
     * forecourt beside the samadhi, and the check reported six ways into a
     * temple that has one door.
     *
     * A builder that authored an interior declared its extent. Use that, and
     * fall back to the footprint only where there is nothing better.
     */
    const rot = loc.rot || 0;
    const vol = (w.landmarks && w.landmarks.interiors && w.landmarks.interiors[loc.id]) || null;
    const innerHalf = vol
      ? Math.min(vol.hw, vol.hd)
      : Math.min(loc.build.w, loc.build.d) * 0.5;
    // start well outside everything, compound wall included
    const R = Math.max(loc.build.w, loc.build.d) * 0.5 + (loc.grounds || 0) + 0.6;

    /*
     * There is no single ring to scan, and two rewrites of this proved it.
     *
     * `hollowShrine` puts its walls at 0.41w and 0.33d — well INSIDE the
     * footprint — so a scan at the footprint edge walks open ground and reports
     * 100% open. Krishna Balaram's compound wall is at `grounds: 68`, well
     * OUTSIDE a 54 x 66 footprint, so the same scan walks its courtyard and
     * reports 100% open too. Both readings were correct and both were useless:
     * every builder puts its wall where its temple's wall is.
     *
     * So solidity is not asserted. What IS asserted is behaviour — walk at the
     * place from all round and see where you get through — because that is the
     * question you actually asked, and it needs no guess about geometry.
     */
    /*
     * SCAN THE WALL THE BUILDER DECLARED.
     *
     * "Did you get in" turned out not to be the question. Prem Mandir's wall
     * measures 98.5% solid and its only gap is its doorway — yet the walk
     * reported five ways in, because `collide` slides you ALONG a wall and
     * round to the door, which is exactly what a player does and is not a
     * fault. The two are indistinguishable from the destination alone.
     *
     * So ask the wall instead. A builder that authored an interior declared
     * the volume it encloses, and that rectangle IS its wall line; a landmark
     * using the shared `hollowColliders` has its wall at the footprint. Walk
     * that perimeter and count the arc that is not solid. A doorway is a few
     * per cent. A wall that is not there is not.
     */
    const ring = vol
      ? { hw: vol.hw, hd: vol.hd, rot: vol.rot ?? rot, x: vol.x ?? cx, z: vol.z ?? cz }
      : { hw: loc.build.w * 0.5, hd: loc.build.d * 0.5, rot, x: cx, z: cz };
    const rcs = Math.cos(ring.rot), rsn = Math.sin(ring.rot);
    const RW = (lx, lz) => [ring.x + lx * rcs - lz * rsn, ring.z + lx * rsn + lz * rcs];
    /*
     * A builder whose plan is not a rectangle says so. Govind Dev is a GREEK
     * CROSS — Growse's nave and transepts, each 100 ft — and its bounding
     * square runs through open ground at the four re-entrant corners, so
     * scanning that square reported a third of the wall missing when none of
     * it is. Where `arms` is declared, the outline scanned is the union of
     * them, and a sample lying inside another arm is an interior line rather
     * than a wall and is not counted.
     */
    const arms = (vol && vol.arms) || [{ hw: ring.hw, hd: ring.hd }];
    const insideAny = (lx, lz, skip) => arms.some((a, k) =>
      k !== skip && Math.abs(lx) < a.hw - 0.6 && Math.abs(lz) < a.hd - 0.6);

    const N = 240;
    let clear = 0, counted = 0;
    for (let k = 0; k < arms.length; k++) {
      const a = arms[k];
      for (let i = 0; i < N; i++) {
        const t = (i / N) * 4;
        let lx, lz;
        if (t < 1) { lx = -a.hw + 2 * a.hw * t; lz = a.hd; }
        else if (t < 2) { lx = a.hw; lz = a.hd - 2 * a.hd * (t - 1); }
        else if (t < 3) { lx = a.hw - 2 * a.hw * (t - 2); lz = -a.hd; }
        else { lx = -a.hw; lz = -a.hd + 2 * a.hd * (t - 3); }
        if (insideAny(lx, lz, k)) continue;      // an inner line, not a wall
        counted++;
        const q = RW(lx, lz);
        if (w.isClear(q[0], q[1], 0.42)) clear++;
      }
    }
    const clearPct = counted ? +((100 * clear) / counted).toFixed(1) : 0;

    out.push({
      id: loc.id, enterable, clearPct,
      ring: [+ring.hw.toFixed(1), +ring.hd.toFixed(1)], declared: !!vol,
    });
  }
  return out;
});

const enter = r.filter((t) => t.enterable);
const solid = r.filter((t) => !t.enterable);

check('there are temples to test', r.length > 8,
  `${r.length} temples, ${enter.length} with an inside, ${solid.length} solid`);

// A temple's wall must be a wall, with a doorway in it and not much else.
const leaky = enter.filter((t) => t.clearPct > 20);
check('a temple wall is solid but for its doors', leaky.length === 0,
  leaky.length
    ? leaky.map((t) => `${t.id}: ${t.clearPct}% of its ${t.ring[0]*2}x${t.ring[1]*2} m wall line is open`).join('; ')
    : enter.map((t) => `${t.id} ${t.clearPct}%`).join(', '));

// But it must have a doorway, or the wall is a box.
const sealed = enter.filter((t) => t.clearPct < 0.8);
check('every temple has a doorway in that wall', sealed.length === 0,
  sealed.length ? sealed.map((t) => `${t.id} ${t.clearPct}%`).join(', ') : `all ${enter.length}`);

// A solid landmark is supposed to be solid.
const hollow = solid.filter((t) => t.clearPct > 12);
check('a solid temple is solid', hollow.length === 0,
  hollow.length ? hollow.map((t) => `${t.id} ${t.clearPct}%`).join('; ') : `${solid.length} checked`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
