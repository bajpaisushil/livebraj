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
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const [cx, cz] = loc.pos, rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, lz) => [cx + lx*cs - lz*sn, cz + lx*sn + lz*cs];
  const out = { hallLeaks: [], compoundLeaks: [] };

  // the HALL: walk at the temple block itself from inside the compound
  const HW = loc.build.w*0.5, HD = loc.build.d*0.5;
  const N = 180;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const R0 = Math.max(HW, HD) + 12;
    const sx = cx + Math.cos(a)*R0, sz = cz + Math.sin(a)*R0;
    if (!w.isClear(sx, sz, 0.42)) continue;
    const pt = { x: sx, y: 0, z: sz };
    let best = R0;
    for (let k = 0; k < 220; k++) {
      pt.x -= Math.cos(a)*0.16; pt.z -= Math.sin(a)*0.16;
      w.collide(pt, 0.42, w.groundHeight(pt.x, pt.z));
      best = Math.min(best, Math.hypot(pt.x-cx, pt.z-cz));
    }
    if (best < Math.min(HW, HD) * 0.5) out.hallLeaks.push(Math.round(a*180/Math.PI));
  }

  // the COMPOUND wall, at `grounds`
  const G = loc.grounds || 68;
  let clear = 0;
  for (let i = 0; i < 360; i++) {
    const a = (i/360)*Math.PI*2;
    if (w.isClear(cx + Math.cos(a)*G, cz + Math.sin(a)*G, 0.42)) { clear++; out.compoundLeaks.push(Math.round(a*180/Math.PI)); }
  }
  out.compoundClearPct = +(100*clear/360).toFixed(1);
  out.compoundLeaks = out.compoundLeaks.slice(0, 10);
  out.hallCount = out.hallLeaks.length;
  out.hallLeaks = out.hallLeaks.slice(0, 10);
  out.HW = HW; out.HD = HD; out.G = G;
  return r0(out);
  function r0(o){return o;}
});

check('the ISKCON compound wall is solid but for its gates', r.compoundClearPct < 14,
  `${r.compoundClearPct}% of the 68 m wall line is clear — e.g. bearings ${JSON.stringify(r.compoundLeaks)}`);
check('the temple hall is not walk-through', r.hallCount < 14,
  `reached the middle of the ${r.HW*2} x ${r.HD*2} m hall from ${r.hallCount} of 180 bearings — e.g. ${JSON.stringify(r.hallLeaks)}`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
