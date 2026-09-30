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
  /*
   * THE FENCE IS WHERE OSM SAYS, AND SO ARE THE GATES.
   *
   * This read a symmetric rectangle, `hw` x `hd`, with a gate at (0, +D) and
   * one at (0, -D) — which was the builder's own guess at a campus nobody had
   * surveyed. The campus is now laid on OSM way 334202001: an 18-node outline
   * with the temple near its WEST edge, the main gate on Bhaktivedanta Swami
   * Marg and the second on the west lane. So the builder declares the line
   * and each gate — where it is, which way is along it (u) and which way is
   * in (v) — and every sample below is taken from that declaration.
   */
  if (!comp || !comp.outline || !comp.gates) return { ok: false, why: 'the builder declares no compound' };
  const G = Object.fromEntries(comp.gates.map((g) => [g.id, g]));
  const main = G.main, back = G.west;
  const out = { ok: true, outlineNodes: comp.outline.length };
  const at = (g, a, v) => P(g.at[0] + g.u[0] * a + g.v[0] * v, g.at[1] + g.u[1] * a + g.v[1] * v);

  // is the wall solid where it should be? the middle of the four long runs,
  // well away from either gate
  const O = comp.outline;
  const mid = (i, j) => P((O[i][0] + O[j][0]) / 2, (O[i][1] + O[j][1]) / 2);
  const solidAt = (q) => !w.isClear(q[0], q[1], 0.5);
  out.wallSolid = { west: solidAt(mid(0, 1)), south: solidAt(mid(12, 13)), east: solidAt(mid(14, 15)), north: solidAt(mid(15, 16)) };

  // are the two gate openings actually open?
  const openAt = (q) => w.isClear(q[0], q[1], 0.5);
  out.mainGateOpen = openAt(at(main, 0, 0));
  out.backGateOpen = openAt(at(back, 0, 0));

  // walk in through each gate, from outside it, toward the temple
  const walkThrough = (g, label) => {
    const outside = at(g, 0, -6), inside = P(0, 0);
    out['start_' + label] = w.isClear(outside[0], outside[1], 0.42);
    ctx.player.position.set(outside[0], w.groundHeight(outside[0], outside[1]), outside[1]);
    const head = Math.atan2(inside[0]-outside[0], inside[1]-outside[1]);
    ctx.player.setYaw && ctx.player.setYaw(head);
    // Body-relative "up" means AWAY FROM THE CAMERA, resolved from the rig and
    // then latched — `setYaw` moves the avatar's body and not its heading.
    if (ctx.cameraRig) { ctx.cameraRig.yaw = head; ctx.cameraRig.yawTarget = head; }
    ctx.input.walk = 0; ctx.input.strafe = 0; ctx.input.bodyRelative = true;
    ctx.player.update(1/30, ctx);
    ctx.input.walk = 1; ctx.input.move.y = 1;
    // far enough to arrive, with half again for going round things
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
  const span = (g) => {
    let lo = 0, hi = 0;
    for (let t = 0; t < 12; t += 0.25) { const q = at(g, t, 0); if (!w.isClear(q[0], q[1], 0.42)) break; hi = t; }
    for (let t = 0; t > -12; t -= 0.25) { const q = at(g, t, 0); if (!w.isClear(q[0], q[1], 0.42)) break; lo = t; }
    return [+lo.toFixed(2), +hi.toFixed(2)];
  };
  out.mainSpan = span(main);
  out.backSpan = span(back);
  out.backLane = [];
  for (let t = -6; t <= 6; t += 1) {
    const q = at(back, 0, t);
    out.backLane.push([t, w.isClear(q[0], q[1], 0.42) ? 1 : 0]);
  }
  /*
   * CAN YOU SEE THROUGH IT.
   *
   * Walking through a gate and seeing through it are different questions:
   * Srila Prabhupada's samadhi once stood dead on the gate axis, and the
   * gateway read as a blank wall while remaining perfectly walkable. The test
   * is the GATEWAY, not the view beyond it — the west gate really does look
   * at the end of Prabhupada's House, 8 m in — so the ray runs from 7 m out
   * to `past` metres in, at the heights an eye is at.
   */
  const sight = (g, label, past) => {
    const from = at(g, 0, -7), to = at(g, 0, past);
    const gy = w.groundHeight(from[0], from[1]);
    const dir = new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]).normalize();
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    let worst = null;
    for (const h of [0.8, 1.6, 2.4]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(from[0], gy + h, from[1]), dir, 0.05, len);
      const hit = ray.intersectObjects(ctx.scene.children, true).filter((x) => x.object.visible)[0];
      if (hit) worst = { h, o: hit.object.name || hit.object.type, d: +hit.distance.toFixed(1) };
    }
    out['sight_' + label] = worst;
    return !worst;
  };
  out.seeMain = sight(main, 'main', 9);
  out.seeBack = sight(back, 'back', 5);

  out.throughMain = walkThrough(main, 'main');
  out.throughBack = walkThrough(back, 'back');
  return out;
});

if (!r.ok) { check('the builder declares its compound wall and gates', false, r.why); }
console.log('  outline nodes:', r.outlineNodes, ' main gate span:', JSON.stringify(r.mainSpan), ' west gate span:', JSON.stringify(r.backSpan));
console.log('  west gate lane (m inward, clear?):', JSON.stringify(r.backLane));
check('the wall is solid on all four sides',
  r.wallSolid && r.wallSolid.west && r.wallSolid.south && r.wallSolid.east && r.wallSolid.north,
  JSON.stringify(r.wallSolid));
check('the main gate is open', r.mainGateOpen, String(r.mainGateOpen));
check('the west (back) gate is open', r.backGateOpen, String(r.backGateOpen));
check('you can walk in through the main gate', r.throughMain < 28, `reached ${r.throughMain} m from the temple`);
check('you can SEE through the main gate, not just walk through it', r.seeMain,
  r.seeMain ? 'clear at every height' : `blocked by ${JSON.stringify(r.sight_main)}`);
check('you can see through the west (back) gate', r.seeBack,
  r.seeBack ? 'clear at every height' : `blocked by ${JSON.stringify(r.sight_back)}`);
check('both walks start on clear ground', r.start_main && r.start_back,
  `main ${r.start_main}, back ${r.start_back}`);
check('you can walk in through the west (back) gate', r.throughBack < 32,
  `reached ${r.throughBack} m from the temple; trace ${JSON.stringify(r.trace_back)} vs main ${JSON.stringify(r.trace_main)}`);

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
