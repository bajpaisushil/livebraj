/** Probe 5: warm graph, ride to Banke Bihari, does InteriorSystem say you are INSIDE? */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8795,r));
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
await p.goto('http://localhost:8795/', { waitUntil:'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.interior, null, { timeout: 60000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(600);

const out = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw, I = ctx.interior;
  const L = ctx.data.LOCATIONS.filter((l) => l.build);
  // warm the graph the way a session of play does
  for (const a of L) for (const bb of L) { if (a !== bb && Math.random() < 0.12) ctx.nav.path(a.pos[0],a.pos[1],bb.pos[0],bb.pos[1],true); }
  const dest = L.find((l) => l.id === 'banke-bihari');
  const set = r._setDown(dest);
  let sx = dest.pos[0] + 500, sz = dest.pos[1] + 200;
  const n = ctx.nav.nearestDrivable(sx, sz); if (n) { sx = n.x; sz = n.z; }
  r.state='idle'; r.ride=null; r.drive=null; r._boarding=null; r.pending=null;
  ctx.state.discovered.clear(); ctx.state.discovered.add('banke-bihari');
  ctx.player.position.set(sx, ctx.player.position.y, sz);
  let v=null; for (const slot of ctx.crowd.vehicleInst) { if (slot.agents.length) { v = slot.agents[0]; break; } }
  v.chartered=false; v.x=sx+2; v.z=sz;
  r._acc=99; r.update(0.5, ctx);
  if (!r.target) return { why:'no hail target' };
  if (!r.board()) return { why:'could not board' };
  for (let i=0;i<60;i++) r.update(1/30, ctx);
  await new Promise(res=>setTimeout(res,150));
  const el = document.querySelector('[data-go="banke-bihari"]');
  if (!el) return { why:'not offered' };
  el.click(); await new Promise(res=>setTimeout(res,150));
  if (!r.startRide()) return { why:'start refused' };
  const used = r.ride.d.set.slice();
  for (let i=0;i<30000 && r.ride;i++) r.update(1/30, ctx);
  const e = ctx.player.position;
  // let the interior system see where the player is
  for (let i=0;i<40;i++) I.update(1/30, ctx);
  return {
    setDist: +Math.hypot(used[0]-dest.pos[0], used[1]-dest.pos[1]).toFixed(1),
    endDist: +Math.hypot(e.x-dest.pos[0], e.z-dest.pos[1]).toFixed(1),
    interiorInside: I.inside ? (I.inside.loc ? I.inside.loc.id : 'house') : null,
    blend: +(I.blend ?? 0).toFixed(2),
    clearAtEnd: ctx.world.isClear(e.x, e.z, 0.35),
  };
});
console.log('RESULT', JSON.stringify(out));
await b.close(); server.close();
