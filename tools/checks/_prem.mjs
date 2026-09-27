import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8810,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8810/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('prem-mandir');
  const [cx, cz] = loc.pos, rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, lz) => [cx + lx*cs - lz*sn, cz + lx*sn + lz*cs];
  const W = loc.build.w*0.5, D = loc.build.d*0.5;
  const out = { w: loc.build.w, d: loc.build.d, grounds: loc.grounds, kind: loc.build.kind,
                door: Math.min(loc.build.w*0.3, 6), gaps: [] };

  // walk the hollowColliders wall line itself
  const N = 200;
  let clear = 0;
  for (let i = 0; i < N; i++) {
    const t = (i/N)*4;
    let lx, lz;
    if (t<1){lx=-W+2*W*t; lz=D;} else if (t<2){lx=W; lz=D-2*D*(t-1);}
    else if (t<3){lx=W-2*W*(t-2); lz=-D;} else {lx=-W; lz=-D+2*D*(t-3);}
    const q = P(lx,lz);
    if (w.isClear(q[0],q[1],0.42)) { clear++; out.gaps.push([Math.round(lx),Math.round(lz)]); }
  }
  out.wallClearPct = +(100*clear/N).toFixed(1);
  out.gaps = out.gaps.slice(0,14);

  // how many colliders does this landmark actually own near its wall?
  let near = 0;
  for (const c of w.colliders) {
    if (Math.abs(c.x-cx) < W+8 && Math.abs(c.z-cz) < D+8) near++;
  }
  out.collidersNear = near;
  return out;
});

check('Prem Mandir has a wall at its footprint', r.wallClearPct < 20,
  `${r.wallClearPct}% of the ${r.w} x ${r.d} m wall line is clear (door is ${r.door} m), ` +
  `${r.collidersNear} colliders nearby — gaps at ${JSON.stringify(r.gaps)}`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
