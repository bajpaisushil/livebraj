/**
 * Does anything stand inside a wall?
 *
 * The planting pass tests `isClear` before it puts a bush down, and its own
 * verifier still found four inside building solids, up to 0.76 m through. The
 * reason was the same one that let you walk through walls: `isClear` looked
 * colliders up in a grid keyed on their CENTRE, so it saw a hut and missed a
 * fifty-metre compound wall whose centre was twenty metres up the road.
 *
 * `WorldService._index` fixed the lookup. This measures whether the planting
 * followed.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto(`http://localhost:${__PORT}/`,{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const out = { bushes: 0, clashes: [], worst: 0 };
  const pos = [];
  ctx.scene.traverse((o) => {
    if (!o.isInstancedMesh || !/bush/i.test(o.name || '')) return;
    const e = new Float32Array(16);
    for (let i = 0; i < o.count; i++) {
      o.instanceMatrix.array && e.set(o.instanceMatrix.array.subarray(i * 16, i * 16 + 16));
      pos.push([e[12], e[14]]);
    }
  });
  out.bushes = pos.length;
  for (const [x, z] of pos) {
    if (w.isClear(x, z, 0.0)) continue;
    let depth = 2.0;
    for (let d = 0.1; d <= 2.0; d += 0.1) {
      if (w.isClear(x + d, z, 0) || w.isClear(x - d, z, 0) ||
          w.isClear(x, z + d, 0) || w.isClear(x, z - d, 0)) { depth = d; break; }
    }
    out.clashes.push({ at: [+x.toFixed(1), +z.toFixed(1)], depth: +depth.toFixed(1) });
    out.worst = Math.max(out.worst, depth);
  }
  out.n = out.clashes.length;
  out.clashes = out.clashes.slice(0, 5);
  return out;
});

check('there are bushes to test', r.bushes > 0, r.bushes + ' bushes');
check('no bush stands inside a solid', r.n === 0,
  r.n + ' of ' + r.bushes + ' inside something' +
  (r.n ? ', worst ' + r.worst + ' m in — e.g. ' + JSON.stringify(r.clashes[0]) : ''));

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
