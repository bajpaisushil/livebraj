/**
 * Can you walk through a long wall?
 *
 * Colliders go into the spatial grid keyed on their CENTRE, and both `collide`
 * and `isClear` query that grid at `radius + 6`. A wall segment is ONE box, as
 * long as the wall — ISKCON's front wall is a single 57 m collider. So a long
 * wall occupies ONE grid cell, and standing against it twenty metres from its
 * midpoint puts you outside every cell the query looks in: the box is never
 * tested, and you walk straight through it.
 *
 * You reported exactly this — "i am able to bypass the walls" — and the gate
 * work was verified by sampling near the middle of each side, which is the one
 * place the bug does not show.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8803,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8803/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(() => {
  const w = window.vrindavan.ctx.world;
  /*
   * FLOORS ARE NOT WALLS.
   *
   * Temple floors are declared across a whole interior, so the Chaar Dham's is
   * a 96 x 96 m box — long enough to look like a wall to this scan, and
   * legitimately clear to `isClear`, which treats a floor as ground. 17 of 680
   * samples "stood inside solid geometry" that was in fact a courtyard.
   */
  const long = w.colliders.filter(c => c.type === 'box' && c.hw * 2 > 18 && !c.standOnly);
  const boxes = long.slice().sort((a, b) => b.hw - a.hw).slice(0, 40);
  const out = { nLong: long.length, longest: boxes.length ? +(boxes[0].hw * 2).toFixed(1) : 0,
                tested: 0, holes: [] };
  for (const c of boxes) {
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    for (let t = -0.92; t <= 0.921; t += 0.115) {
      const lx = t * c.hw;
      const x = c.x + lx * cs, z = c.z + lx * sn;
      out.tested++;
      // dead centre of a solid box: nothing can legitimately stand here
      if (w.isClear(x, z, 0.42)) {
        out.holes.push({ at: [+x.toFixed(1), +z.toFixed(1)], wallLen: +(c.hw * 2).toFixed(1),
                         mFromMid: +Math.abs(lx).toFixed(1) });
      }
    }
  }
  out.nHoles = out.holes.length;
  out.worstGap = out.holes.reduce((m, h) => Math.max(m, h.mFromMid), 0);
  out.holes = out.holes.slice(0, 4);

  // And the question the player's own collision asks, at the end of the longest
  // WALL — not the longest box. The longest box in the world is a 120 m ghat
  // tread, and `collide` deliberately does not stop you on one: a collider
  // carrying `top` within a step of your feet is something you walk ONTO. This
  // check failed on that and the failure was its own.
  const s = boxes.find((c) => c.top === undefined);
  if (s) {
    const cs = Math.cos(s.rot), sn = Math.sin(s.rot), lx = s.hw * 0.85;
    const p = { x: s.x + lx * cs, y: 0, z: s.z + lx * sn };
    const b0 = [p.x, p.z];
    w.collide(p, 0.42, w.groundHeight(p.x, p.z));
    out.pushedOut = +Math.hypot(p.x - b0[0], p.z - b0[1]).toFixed(3);
    out.wallTested = +(s.hw * 2).toFixed(1);
  }
  return out;
});

check('the world has long wall segments at all', r.nLong > 0,
  `${r.nLong} boxes over 18 m, longest ${r.longest} m`);
check('no walkable hole inside a solid wall', r.nHoles === 0,
  `${r.nHoles} of ${r.tested} samples stood clear inside solid geometry` +
  (r.holes.length ? `, worst ${r.worstGap} m from the midpoint — e.g. ${JSON.stringify(r.holes[0])}` : ''));
check('collide() pushes you out of a wall near its end', r.pushedOut > 0.01,
  `pushed ${r.pushedOut} m out of a ${r.wallTested} m wall`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
