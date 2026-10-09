/**
 * Typed words, driver talk, and a map that does not stop the ride.
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

const results = []; const errors = [];
const check = (n, pass, d) => { results.push(pass); console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`); };

const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => { const t=m.text(); if (m.type()==='error' && !/vibrate/.test(t)) errors.push(t); });
await p.goto(`http://localhost:${__PORT}/`,{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.cheats && window.vrindavan?.ctx?.rickshaw,null,{timeout:60000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(700);

check('cheat system is wired', await p.evaluate(()=>!!window.vrindavan.ctx.cheats), '');

/* typing a vehicle word puts one beside you */
const before = await p.evaluate(()=>window.vrindavan.ctx.crowd.vehicleInst.reduce((n,s)=>n+s.agents.length,0));
await p.keyboard.type('rickshaw', { delay: 25 });
await p.waitForTimeout(400);
const after = await p.evaluate(()=>{
  const ctx = window.vrindavan.ctx;
  const total = ctx.crowd.vehicleInst.reduce((n,s)=>n+s.agents.length,0);
  const pp = ctx.player.position;
  // the one we just asked for is the LAST in the e-rickshaw slot, not whichever
  // ambient vehicle happens to be driving over us at the time
  const slot = ctx.crowd.vehicleInst.find(s => s.agents.length && s.agents[s.agents.length-1].spawnedByWord);
  const mine = slot ? slot.agents[slot.agents.length-1] : null;
  const near = mine ? Math.hypot(mine.x-pp.x, mine.z-pp.z) : -1;
  return { total, near: Math.round(near * 10) / 10, found: !!mine };
});
// the per-type fleet is capacity-capped, so a spawn may replace rather than
// add — what matters is that one is now within reach
check('typing "rickshaw" puts one beside you', after.near > 0.5 && after.near < 14,
  `${before} -> ${after.total} vehicles, nearest ${after.near} m`);

/* typing in a text field must NOT trigger it */
const ignored = await p.evaluate(async ()=>{
  const i = document.createElement('input'); document.body.appendChild(i); i.focus();
  const n0 = window.vrindavan.ctx.crowd.vehicleInst.reduce((n,s)=>n+s.agents.length,0);
  for (const ch of 'rath') i.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true}));
  await new Promise(r=>setTimeout(r,200));
  const n1 = window.vrindavan.ctx.crowd.vehicleInst.reduce((n,s)=>n+s.agents.length,0);
  i.remove();
  return n1 === n0;
});
check('typing into a field does not fire a cheat', ignored, String(ignored));

/* start a ride, then ask him to hurry */
const pace = await p.evaluate(async ()=>{
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  /*
   * A LONG ride, from a known place. This used to take whichever destination
   * the dialog listed first from wherever the player happened to be, which
   * could be a few hundred metres off — so five seconds in he was already
   * braking to set you down, and "hurry" was measured against a car that was
   * stopping. The same run rickshaw.mjs times: Chhatikara to ISKCON, 5.5 km.
   */
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  r.state='idle'; r.ride=null; r._boarding=null; r.pending=null;
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v=null; for (const s of ctx.crowd.vehicleInst) if (s.agents.length){v=s.agents[0];break;}
  v.chartered=false; v.x=chhat.pos[0]+4; v.z=chhat.pos[1];
  r._acc=99; r.update(0.5,ctx);
  if (!r.board()) return { ok:false, why:'could not get in' };
  for (let i=0;i<90;i++) r.update(1/30,ctx);
  await new Promise(res=>setTimeout(res,200));
  const el=document.querySelector('[data-go="iskcon-krishna-balaram"]') || document.querySelector('.rk-row[data-go]');
  if(!el) return {ok:false,why:'no destinations'};
  el.click(); await new Promise(res=>setTimeout(res,200));
  if (!r.startRide()) return { ok:false, why:'start refused' };

  /*
   * Measured over a stretch of road, not a moment of it. Two seconds of
   * driving was decided by whatever the two seconds held — a bend, a cow, the
   * car in front — and went 12.9 m/s before jaldi and 9.3 after on one run
   * and the other way on the next. So: twenty seconds at the agreed pace,
   * then jaldi and twenty seconds more, on the same long road, in fixed steps.
   */
  for (let i=0;i<150;i++) r.update(1/30,ctx);
  const m0 = r.ride.paceMult;
  /*
   * Two answers from each stretch: metres per second of the TOWN's time, which
   * is the driver leaning on it, and metres per second of YOURS, which is that
   * and the time-lapse the ride is shown at together (`ctx.timeScale`).
   */
  const leg = () => {
    const a = r.ride.metres; let mine = 0;
    for (let i=0;i<600 && r.ride;i++) { const k = ctx.timeScale || 1; r.update(1/30,ctx); mine += (1/30) / k; }
    return r.ride ? { town: (r.ride.metres - a) / 20, yours: (r.ride.metres - a) / mine, rate: ctx.timeScale } : { town: 0, yours: 0, rate: 1 };
  };
  /*
   * The SAME twenty seconds of road, twice: once as agreed, then put back
   * exactly where it was and driven again after a jaldi. Two different
   * stretches compared the bends in them as much as the driver — with a
   * cycle rickshaw at its own 12 km/h, more than the driver. Nothing else
   * moves here: only the ride is stepped.
   */
  const car = r.ride.car;
  const R = r.ride;
  const keys = ['i','metres','t','real','was','stall','lost','skips','mps','ema','emaW','catchup','paceMult','urge'];
  const snap = { car: { x: car.x, z: car.z, yaw: car.yaw, vel: car.vel, stuck: car.stuck }, ride: {} };
  for (const k of keys) snap.ride[k] = R[k];
  const slow = leg();
  if (!r.ride) return { ok:false, why:'the ride ended inside the first stretch' };
  Object.assign(car, snap.car);
  Object.assign(r.ride, snap.ride);
  // what he aims for on the road under him, asked and then asked to hurry
  const aim0 = r.ride.roadAt(r.ride.i);
  const okFast = r.setPace(1.6);
  const aim1 = r.ride.roadAt(r.ride.i);
  const fast = leg();
  return { ok:true, m0, mult:r.ride ? r.ride.paceMult : 0, okFast,
    aim0:+(aim0*3.6).toFixed(1), aim1:+(aim1*3.6).toFixed(1),
    slowRun:+slow.town.toFixed(1), fastRun:+fast.town.toFixed(1),
    slowYours:+slow.yours.toFixed(1), fastYours:+fast.yours.toFixed(1),
    rate0:+(slow.rate||1).toFixed(2), rate1:+(fast.rate||1).toFixed(2) };
});
/*
 * Not the 1.6 the button asks for, and it cannot be: the driver leans toward
 * the most the road allows (RoadSpeeds), which for a cycle rickshaw on the
 * Chhatikara road is 12 km/h to 16 and on a street 11 to 13 — half of what
 * there is on the first ask, so +9% on a street — and the bends and his own
 * slow pull-away take some of that back. So what is held to account is what
 * he AIMS for on this road, which must really rise (5% is less than any road
 * gives a first jaldi), and that he then covers the same road faster.
 */
check('asking the driver to hurry actually speeds him up',
  pace.ok && pace.okFast && pace.aim1 > pace.aim0 * 1.05 && pace.fastRun > pace.slowRun,
  pace.ok ? `aims for ${pace.aim0} -> ${pace.aim1} km/h; ${pace.slowRun} -> ${pace.fastRun} m per second of the town's time on the same road, mult ${pace.mult}` : pace.why);
/*
 * ...and the ride takes less of YOUR time by much more than that, because the
 * rate it is shown at goes up by the same 1.6. That is where a hurry goes now,
 * rather than into a rickshaw at 94 km/h.
 */
check('and the ride takes less of your time: the time-lapse runs faster too',
  pace.ok && pace.rate1 > pace.rate0 && pace.fastYours > pace.slowYours * 1.5,
  pace.ok ? `${pace.slowYours} -> ${pace.fastYours} m per second of yours, shown at x${pace.rate0} -> x${pace.rate1}` : pace.why);

/* the talk buttons exist on the bar */
const btns = await p.evaluate(()=>['ride-start','ride-fast','ride-slow','ride-stop'].filter(id=>!!document.getElementById(id)));
check('the ride bar carries start, jaldi, slow and stop', btns.length === 4, btns.join(', '));

/* opening the map must not stop the ride */
const live = await p.evaluate(async ()=>{
  const ctx = window.vrindavan.ctx, app = window.vrindavan, r = ctx.rickshaw;
  if (!r.ride) return { ok:false, why:'no ride running' };
  ctx.ui.show('map');
  await new Promise(res=>setTimeout(res,300));
  const paused = app.paused;
  const a = { x: ctx.player.position.x, z: ctx.player.position.z };
  for (let i=0;i<60;i++) r.update(1/30,ctx);
  const moved = Math.hypot(ctx.player.position.x-a.x, ctx.player.position.z-a.z);
  ctx.ui.show('world');
  return { ok:true, paused, moved: Math.round(moved) };
});
check('the ride keeps going while the map is open',
  live.ok && live.paused === false && live.moved > 5,
  live.ok ? `paused=${live.paused}, moved ${live.moved} m with the map up` : live.why);

/* the same words must work without a keyboard */
const mobile = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show("menu");
  await new Promise(r=>setTimeout(r,300));
  const input = document.getElementById("code-input");
  const go = document.getElementById("code-go");
  if (!input || !go) return { ok:false, why:"no code field in the menu" };
  const before = ctx.crowd.vehicleInst.reduce((n,s)=>n+s.agents.length,0);
  const pp = { x: ctx.player.position.x, z: ctx.player.position.z };
  input.value = "auto";
  go.click();
  await new Promise(r=>setTimeout(r,400));
  let near = 1e9;
  for (const s of ctx.crowd.vehicleInst) for (const a of s.agents) near = Math.min(near, Math.hypot(a.x-pp.x, a.z-pp.z));
  return { ok:true, screen: ctx.ui.screen, near: Math.round(near) };
});
check("cheat words work without a keyboard", mobile.ok && mobile.near < 14,
  mobile.ok ? `nearest vehicle ${mobile.near} m, screen ${mobile.screen}` : mobile.why);

/* a vehicle you asked for is YOURS: it waits, and you drive it */
const rath = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  r.state='idle'; r.ride=null; r._boarding=null; r.pending=null; r.drive=null;
  ctx.ui.show('world');
  await new Promise(s=>setTimeout(s,250));

  const before = { x: ctx.player.position.x, z: ctx.player.position.z };
  ctx.cheats.codes.rath();
  await new Promise(s=>setTimeout(s,300));

  // find the one we just asked for
  let mine = null;
  for (const sl of ctx.crowd.vehicleInst) for (const a of sl.agents) if (a.personal) mine = a;
  if (!mine) return { ok:false, why:'no personal vehicle spawned' };
  const spawnAt = { x: mine.x, z: mine.z };
  const dist = Math.hypot(mine.x-before.x, mine.z-before.z);

  // it must NOT drive off on its own
  for (let i=0;i<180;i++) ctx.crowd.update(1/30, ctx);
  const wandered = Math.hypot(mine.x-spawnAt.x, mine.z-spawnAt.z);

  // walking up to it should offer to DRIVE, not to hire. Traffic that happens
  // to be passing is moved on first: a hired rickshaw nearer than yours is,
  // correctly, the one you are offered, and this is a test of ownership
  for (const sl of ctx.crowd.vehicleInst) for (const a of sl.agents) {
    if (a !== mine && Math.hypot(a.x - mine.x, a.z - mine.z) < 20) { a.x += 400; a.z += 400; }
  }
  let label = null;
  const off = ctx.bus.on('ui:prompt', d => { if (d.id === 'rickshaw') label = d.label; });
  // the prompt only fires on a TRANSITION, so clear the target first
  r.target = null;
  ctx.player.position.set(mine.x - 2, ctx.player.position.y, mine.z);
  r._acc = 99; r.update(0.5, ctx);
  if (off) off();

  // and boarding it should put you at the wheel, with no fare dialog
  const boarded = r.board();
  for (let i=0;i<60;i++) r.update(1/30, ctx);
  await new Promise(s=>setTimeout(s,200));

  return { ok:true, dist:+dist.toFixed(1), wandered:+wandered.toFixed(2), label,
           boarded, state: r.state, driving: !!r.drive,
           dialogOpen: document.querySelector('.rk-row[data-go]') !== null && r.state === 'offered' };
});
check('a rath you asked for waits for you', rath.ok && rath.wandered < 1.5,
  rath.ok ? `spawned ${rath.dist} m away, drifted ${rath.wandered} m in 6 s` : rath.why);
check('it offers to be DRIVEN, not hired', rath.ok && /drive/i.test(rath.label || ''),
  rath.ok ? `prompt "${rath.label}"` : '');
check('getting in puts you at the wheel', rath.ok && rath.state === 'driving' && rath.driving,
  rath.ok ? `state ${rath.state}` : '');
check('no fare dialog for your own vehicle', rath.ok && !rath.dialogOpen, String(rath.dialogOpen));

console.log('');
if (errors.length) { console.log('ERRORS:'); errors.slice(0,4).forEach(e=>console.log('  '+e)); }
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed, ${errors.length} errors`);
await b.close(); server.close();
process.exit(passed===results.length && !errors.length ? 0 : 1);
