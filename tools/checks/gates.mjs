/**
 * Can you walk in through the gates?
 *
 * The compound wall was drawn and never collided — five box meshes, no
 * colliders, a ring scan 360 degrees clear. So the gate did not read as a gate
 * because nothing anywhere else stopped you. The wall is solid now, which means
 * the gates have to actually work.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8802,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8802/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(async () => {
  const THREE = await import('three');
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const [cx, cz] = loc.pos, rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  // the builder's own frame: p(lx, lz) -> world
  const P = (lx, lz) => [cx + lx*cs - lz*sn, cz + lx*sn + lz*cs];
  /*
   * ASK THE BUILDER where its compound wall is.
   *
   * This computed `build.w/2 + 6`, which was right until the campus was given
   * room for everything the research says it holds — and then every sample
   * landed in open ground inside the wall and the check reported all four
   * sides missing. `interior.compound` is the builder's own statement of where
   * its wall and gates are.
   */
  const vol = (w.landmarks && w.landmarks.interiors && w.landmarks.interiors[loc.id]) || null;
  const comp = (vol && vol.compound) || null;
  const W = comp ? comp.hw : loc.build.w*0.5 + 6;
  const D = comp ? comp.hd : loc.build.d*0.5 + 6;

  const out = { wallAt: { W: Math.round(W), D: Math.round(D) } };

  // is the wall solid where it should be?
  const solidAt = (lx, lz) => !w.isClear(...(() => { const q = P(lx, lz); return [q[0], q[1], 0.5]; })());
  out.wallSolid = { front: solidAt(20, D), back: solidAt(20, -D), left: solidAt(-W, 0), right: solidAt(W, 0) };

  // are the two gate openings actually open?
  const openAt = (lx, lz) => { const q = P(lx, lz); return w.isClear(q[0], q[1], 0.5); };
  out.mainGateOpen = openAt(0, D);
  out.backGateOpen = openAt(0, -D);

  // walk in through each gate
  const walkThrough = (lz, label) => {
    // Start just outside the gate, not 1.35 x the wall distance: at 53 m behind
    // ISKCON there are buildings, and once the wall fix made long colliders
    // solid everywhere the walk was spawning INSIDE one and reporting a blocked
    // gate. A start point that is not clear is a broken test, not a failure, so
    // it is checked rather than assumed.
    const outside = P(0, lz * 1.16), inside = P(0, 0);
    out['start_' + label] = w.isClear(outside[0], outside[1], 0.42);
    ctx.player.position.set(outside[0], w.groundHeight(outside[0], outside[1]), outside[1]);
    const head = Math.atan2(inside[0]-outside[0], inside[1]-outside[1]);
    ctx.player.setYaw && ctx.player.setYaw(head);
    // Body-relative "up" means AWAY FROM THE CAMERA, resolved from the rig and
    // then latched — `setYaw` moves the avatar's body and not its heading. So
    // both walks used to set off in the same world direction: the front one
    // went in, the back one went out, and the back gate was blamed for it.
    // Point the rig, then re-latch by releasing the stick and pressing again.
    if (ctx.cameraRig) { ctx.cameraRig.yaw = head; ctx.cameraRig.yawTarget = head; }
    ctx.input.walk = 0; ctx.input.strafe = 0; ctx.input.bodyRelative = true;
    ctx.player.update(1/30, ctx);
    ctx.input.walk = 1; ctx.input.move.y = 1;
    /*
     * Walk far enough to arrive. 1400 steps of 1/30 s is about 70 m at walking
     * pace, which was ample for a 39 m compound and is not for an 88 m one —
     * both traces descended steadily and simply stopped short. Scale it to the
     * distance, with half again for going round things.
     */
    let best = 1e9; const trace = [];
    const steps = Math.ceil((Math.hypot(outside[0]-cx, outside[1]-cz) / 1.5) * 30 * 1.6);
    for (let i=0;i<steps;i++){
      ctx.player.update(1/30, ctx);
      best = Math.min(best, Math.hypot(ctx.player.position.x-cx, ctx.player.position.z-cz));
      if (i % Math.max(1, Math.floor(steps / 7)) === 0) trace.push(Math.round(best));
    }
    ctx.input.walk = 0; ctx.input.move.y = 0;
    out['trace_' + label] = trace;      // plateau = blocked, still falling = out of steps
    return Math.round(best);
  };
  // how wide is each gate really, measured rather than assumed?
  const span = (lz) => {
    let lo = 0, hi = 0;
    for (let t = 0; t < 30; t += 0.25) { const q = P(t, lz); if (!w.isClear(q[0], q[1], 0.42)) break; hi = t; }
    for (let t = 0; t > -30; t -= 0.25) { const q = P(t, lz); if (!w.isClear(q[0], q[1], 0.42)) break; lo = t; }
    return [+lo.toFixed(2), +hi.toFixed(2)];
  };
  out.mainSpan = span(D);
  out.backSpan = span(-D);
  // and a lane straight through the back gate, to find what stops him
  out.backLane = [];
  for (let t = -1.5; t <= 1.5; t += 0.25) {
    const q = P(0, -D * t);
    out.backLane.push([+( -D * t).toFixed(1), w.isClear(q[0], q[1], 0.42) ? 1 : 0]);
  }
  /*
   * CAN YOU SEE THROUGH IT.
   *
   * This file proved you could WALK through the gate and never that you could
   * SEE through it, and those are different questions: Srila Prabhupada's
   * samadhi stood dead on the gate axis, 13 m of white marble across a 9 m
   * opening, so the gateway read as a blank wall while remaining perfectly
   * walkable. "Iskcon main gate is showing no gate open but a wall."
   */
  const sight = (lz, label) => {
    /*
     * The test is the GATEWAY, not the view beyond it. Seeing the temple's own
     * mass through the back gate at 3.6 m is correct — that is the thing you
     * came to see. So the ray stops 9 m past the gate line, and only at the
     * heights a person's eye is actually at.
     */
    const from = P(0, lz * 1.28), to = P(0, lz - Math.sign(lz) * 9);
    const gy = w.groundHeight(from[0], from[1]);
    const dir = new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]).normalize();
    const span = Math.hypot(to[0] - from[0], to[1] - from[1]);
    let worst = null;
    for (const h of [0.8, 1.6, 2.4]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(from[0], gy + h, from[1]), dir, 0.05, span);
      const hit = ray.intersectObjects(ctx.scene.children, true).filter((x) => x.object.visible)[0];
      if (hit) worst = { h, o: hit.object.name || hit.object.type, d: +hit.distance.toFixed(1) };
    }
    out['sight_' + label] = worst;
    return !worst;
  };
  out.seeMain = sight(D, 'main');
  out.seeBack = sight(-D, 'back');

  out.throughMain = walkThrough(D, 'main');
  out.throughBack = walkThrough(-D, 'back');
  return out;
});

console.log('  wall at W/D:', JSON.stringify(r.wallAt), ' main gate span:', JSON.stringify(r.mainSpan), ' back gate span:', JSON.stringify(r.backSpan));
console.log('  back lane (local z, clear?):', JSON.stringify(r.backLane));
check('the wall is solid on all four sides',
  r.wallSolid.front && r.wallSolid.back && r.wallSolid.left && r.wallSolid.right,
  JSON.stringify(r.wallSolid));
check('the main gate is open', r.mainGateOpen, String(r.mainGateOpen));
check('the back gate is open', r.backGateOpen, String(r.backGateOpen));
check('you can walk in through the main gate', r.throughMain < 28, `reached ${r.throughMain} m from the temple`);
check('you can SEE through the main gate, not just walk through it', r.seeMain,
  r.seeMain ? 'clear at every height' : `blocked by ${JSON.stringify(r.sight_main)}`);
check('you can see through the back gate', r.seeBack,
  r.seeBack ? 'clear at every height' : `blocked by ${JSON.stringify(r.sight_back)}`);
check('both walks start on clear ground', r.start_main && r.start_back,
  `main ${r.start_main}, back ${r.start_back}`);
check('you can walk in through the back gate', r.throughBack < 32,
  `reached ${r.throughBack} m from the temple; trace ${JSON.stringify(r.trace_back)} vs main ${JSON.stringify(r.trace_main)}`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
