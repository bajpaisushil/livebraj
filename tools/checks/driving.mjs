/**
 * Taking the wheel.
 *
 * Nobody had ever verified this: the agent that wrote it was killed before its
 * verify phase, so it shipped unproven. The direction assertions matter most —
 * left meaning right has been fixed twice in this project already.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8799,r));

const res = []; const errors = [];
const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};

const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:390,height:844}, hasTouch:true });
p.on('pageerror', e=>errors.push(e.message));
p.on('console', m=>{const t=m.text(); if(m.type()==='error' && !/vibrate/.test(t)) errors.push(t);});
await p.goto('http://localhost:8799/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.cameraRig,null,{timeout:90000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(800);

/* get into a vehicle and take the wheel */
const took = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  r.state='idle'; r.ride=null; r._boarding=null; r.pending=null; r.drive=null;
  let v=null; for (const s of ctx.crowd.vehicleInst) if (s.agents.length){v=s.agents[0];break;}
  v.chartered=false; v.x=ctx.player.position.x+2.5; v.z=ctx.player.position.z;
  r._acc=99; r.update(0.5,ctx);
  if (!r.board()) return { ok:false, why:'could not get in' };
  for (let i=0;i<60;i++) r.update(1/30,ctx);
  await new Promise(s=>setTimeout(s,200));
  const ok = r.takeWheel();
  return { ok, state: r.state, hasDrive: !!r.drive, inputOn: ctx.input ? ctx.input._enabled !== false : null };
});
check('you can take the wheel', took.ok && took.state === 'driving' && took.hasDrive,
  took.ok ? `state ${took.state}, input ${took.inputOn}` : took.why);

/* steering: does it go where you point it? */
const steer = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  if (!r.drive) return { ok:false, why:'not driving' };
  const car = r.drive.car;
  const run = (walk, strafe, n=90) => {
    const before = { x: car.x, z: car.z, yaw: car.yaw };
    ctx.input.walk = walk; ctx.input.strafe = strafe;
    ctx.input.move.y = walk; ctx.input.move.x = strafe;
    for (let i=0;i<n;i++) r.update(1/30, ctx);
    ctx.input.walk = 0; ctx.input.strafe = 0; ctx.input.move.x = 0; ctx.input.move.y = 0;
    const dx = car.x - before.x, dz = car.z - before.z;
    // forward is the car's own nose at the moment it started
    const fx = Math.sin(before.yaw), fz = Math.cos(before.yaw);
    return { moved:+Math.hypot(dx,dz).toFixed(2), along:+(dx*fx+dz*fz).toFixed(2),
             turned:+(((car.yaw - before.yaw + Math.PI*3) % (Math.PI*2)) - Math.PI).toFixed(3) };
  };
  const fwd = run(1, 0);
  const left = run(1, -1);
  const right = run(1, 1);
  return { ok:true, fwd, left, right };
});
check('forward drives forward', steer.ok && steer.fwd.along > 3,
  steer.ok ? `${steer.fwd.moved} m, ${steer.fwd.along} m along its nose` : steer.why);
check('steering left turns left', steer.ok && steer.left.turned < -0.05,
  steer.ok ? `yaw ${steer.left.turned} rad` : '');
check('steering right turns right', steer.ok && steer.right.turned > 0.05,
  steer.ok ? `yaw ${steer.right.turned} rad` : '');

/* it must not drive through walls */
const solid = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  if (!r.drive) return { ok:false, why:'not driving' };
  const car = r.drive.car;
  let n=0, blocked=0;
  ctx.input.walk = 1; ctx.input.move.y = 1;
  for (let i=0;i<900;i++) { r.update(1/30,ctx); if (i%3===0){ n++; if(!ctx.world.isClear(car.x,car.z,0.8)) blocked++; } }
  ctx.input.walk = 0; ctx.input.move.y = 0;
  return { ok:true, n, blocked, pct:+(blocked/Math.max(1,n)*100).toFixed(1) };
});
check('driving does not go through solids', solid.ok && Number(solid.pct) < 3,
  solid.ok ? `${solid.pct}% of ${solid.n} samples inside something` : solid.why);

/* hand back */
const back = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  const ok = r.handBack ? r.handBack() : false;
  await new Promise(s=>setTimeout(s,200));
  return { ok, state: r.state, frozen: ctx.player.frozen === true };
});
check('you can hand the wheel back', back.ok && back.state !== 'driving',
  `state ${back.state}`);

/* it must move like a vehicle, not like a pedestrian, and jaldi must stack */
const pace = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  r.state='idle'; r.ride=null; r._boarding=null; r.pending=null; r.drive=null;
  ctx.cheats.codes.auto();
  /*
   * Wait for YOUR vehicle to exist, not for 300 ms — and then board IT.
   *
   * This slept a fixed 300 ms and boarded whichever vehicle was nearest. On
   * a loaded machine a hired rickshaw from the traffic could be nearer than
   * yours at that instant, and boarding a hired one opens the fare dialog:
   * the check then reported "not driving: offered" about a vehicle it never
   * meant to get into. Same class as every intermittent failure found so far
   * — a clock and a race standing in for the thing actually being tested.
   */
  const findMine = () => { for (const sl of ctx.crowd.vehicleInst) for (const a of sl.agents) if (a.personal) return a; return null; };
  let mine = null;
  for (let i = 0; i < 300 && !(mine = findMine()); i++) await new Promise((s) => requestAnimationFrame(() => s()));
  if (!mine) return { ok:false, why:'no personal vehicle' };
  ctx.player.position.set(mine.x-2, ctx.player.position.y, mine.z);
  r._acc=99; r.update(0.5,ctx);
  r.target = mine;                        // yours, whatever else is parked nearby
  if (!r.board()) return { ok:false, why:'could not board' };
  for (let i=0;i<60;i++) r.update(1/30,ctx);
  if (r.state !== 'driving') return { ok:false, why:'not driving: '+r.state };

  const car = r.drive.car;

  /*
   * Put the car somewhere it can actually be driven, and the SAME somewhere
   * every run.
   *
   * This test was load-flaky in a way that looked like a performance problem
   * and was not: measured 8.4 m/s on a quiet machine, 2.4 on a moderately busy
   * one and 0.2 on a heavily loaded one, from an unchanged scene. The stepping
   * is already fixed at 1/30 of simulated time, so the frame rate cannot be
   * what moved. What moved was the STARTING POINT — the personal vehicle is
   * spawned near wherever the crowd has drifted to, and the crowd drifts in
   * REAL time while the page boots. A slow boot put the car in a gali facing a
   * wall, and a car facing a wall covers no ground however fast it can go.
   *
   * So it starts on the longest straight run of wide road in the world,
   * pointing along it. Same road, same heading, same answer on any machine.
   */
  let best = null;
  for (const road of ctx.data.ROADS) {
    if (road.width < 7) continue;                 // not a gali
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b2 = road.points[i];
      const len = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
      if (!best || len > best.len) best = { a, b: b2, len, name: road.name || road.kind };
    }
  }
  if (!best) return { ok:false, why:'no wide road found' };
  const ux = (best.b[0]-best.a[0])/best.len, uz = (best.b[1]-best.a[1])/best.len;
  car.x = best.a[0] + ux * best.len * 0.1;
  car.z = best.a[1] + uz * best.len * 0.1;
  car.y = ctx.world.groundHeight(car.x, car.z);
  car.yaw = Math.atan2(ux, uz);
  car.speed = 0;
  ctx.player.position.set(car.x, car.y, car.z);

  const run = (n=120) => { const a={x:car.x,z:car.z};
    ctx.input.walk=1; ctx.input.move.y=1;
    for (let i=0;i<n;i++) r.update(1/30,ctx);
    ctx.input.walk=0; ctx.input.move.y=0;
    return Math.hypot(car.x-a.x,car.z-a.z)/(n/30); };
  // accelerate first: measuring from a standstill measures the acceleration,
  // not the cruise, and these vehicles take a few seconds to get going
  run(90);
  const base = run();
  r.setPace(1.6); const j1 = run();
  r.setPace(1.6); const j2 = run();
  return { ok:true, base:+base.toFixed(1), j1:+j1.toFixed(1), j2:+j2.toFixed(1),
           mult:+(r.drive.paceMult||1).toFixed(2),
           road: best.name + ', ' + Math.round(best.len) + ' m straight' };
});
check('driving is faster than walking', pace.ok && pace.base > 4,
  pace.ok ? `${pace.base} m/s cruise (walking is 1.5) on ${pace.road}` : pace.why);
check('jaldi stacks while you drive', pace.ok && pace.j2 > pace.j1 && pace.j1 > pace.base,
  pace.ok ? `${pace.base} -> ${pace.j1} -> ${pace.j2} m/s, mult ${pace.mult}` : pace.why);

console.log('');
if (errors.length) { console.log('ERRORS:'); errors.slice(0,4).forEach(e=>console.log('  '+e)); }
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed, ${errors.length} errors`);
await b.close(); server.close();
process.exit(passed===res.length && !errors.length ? 0 : 1);
