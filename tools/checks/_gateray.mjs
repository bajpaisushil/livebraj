import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:560} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:240000});
const info = await p.evaluate(async () => {
  const THREE = await import('three');
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); ctx.time.update = () => {}; }
  const loc = ctx.data.LOCATION_BY_ID.get('iskcon-krishna-balaram');
  const [cx, cz] = loc.pos, rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, lz) => [cx + lx*cs - lz*sn, cz + lx*sn + lz*cs];
  const D = loc.build.d*0.5 + 6;
  // stand outside the gate, on its centreline
  const out = P(0, D + 12), gy = ctx.world.groundHeight(out[0], out[1]);
  ctx.player.position.set(out[0], gy + 0.1, out[1]);
  if (ctx.interior) ctx.interior.update(0.5, ctx);
  await new Promise(r => setTimeout(r, 700));

  const inn = P(0, D - 12);
  const dir = new THREE.Vector3(inn[0]-out[0], 0, inn[1]-out[1]).normalize();
  const hits = [];
  for (const h of [0.6, 1.5, 2.6, 3.8, 4.8]) {
    const o = new THREE.Vector3(out[0], gy + h, out[1]);
    const ray = new THREE.Raycaster(o, dir, 0.05, 30);
    const r = ray.intersectObjects(ctx.scene.children, true).filter(x => x.object.visible);
    hits.push({ h, first: r[0] ? { o: r[0].object.name || r[0].object.type, d: +r[0].distance.toFixed(1) } : null });
  }
  // and is it physically clear on the centreline?
  const clear = [];
  for (let t = -4; t <= 4; t += 1) {
    const q = P(0, D + t);
    clear.push([t, ctx.world.isClear(q[0], q[1], 0.42) ? 1 : 0]);
  }
  // camera looking at the gate from outside
  const cam = ctx.camera.clone();
  cam.fov = 60; cam.near = 0.05; cam.updateProjectionMatrix();
  cam.position.set(out[0], gy + 2.0, out[1]);
  cam.lookAt(inn[0], gy + 2.6, inn[1]);
  ctx.camera = cam;
  ctx.renderer.render(ctx.scene, cam);
  return { D: +D.toFixed(1), hits, clearOnCentreline: clear };
});
console.log(JSON.stringify(info, null, 1));
await p.waitForTimeout(700);
await p.screenshot({ path: 'docs/shots/iskcon-gate.png', timeout: 90000 });
await b.close(); process.exit(0);
