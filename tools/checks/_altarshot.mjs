import { chromium } from 'playwright';
const WHICH = process.argv[2] || 'radha-damodar';
const BACK = Number(process.argv[3] || 3.6);
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:760,height:560} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.deities && window.vrindavan?.ctx?.ui,null,{timeout:220000});
const info = await p.evaluate(async ({which, back}) => {
  const THREE = await import('three');
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) ctx.time.setPhase('day', true);
  await new Promise(r => setTimeout(r, 1200));
  const rec = (ctx.deities.panels||[]).find(r => r.loc.id === which);
  if (!rec) return { error:'no panel', have:(ctx.deities.panels||[]).map(r=>r.loc.id) };
  const m = rec.mesh.position, yaw = rec.mesh.rotation.y;
  const cx = m.x + Math.sin(yaw)*back, cy = m.y + 0.15, cz = m.z + Math.cos(yaw)*back;
  const cam = ctx.camera.clone();
  cam.fov = 55; cam.near = 0.1; cam.updateProjectionMatrix();
  cam.position.set(cx, cy, cz);
  cam.lookAt(m.x, m.y, m.z);
  ctx.camera = cam;
  ctx.renderer.render(ctx.scene, cam);

  // what stands between the camera and the panel?
  const dir = new THREE.Vector3(m.x-cx, m.y-cy, m.z-cz).normalize();
  const ray = new THREE.Raycaster(new THREE.Vector3(cx,cy,cz), dir, 0.05, back + 1);
  const hits = ray.intersectObjects(ctx.scene.children, true)
    .filter(h => h.object.visible && h.object.type !== 'Points')
    .slice(0, 6)
    .map(h => ({ o: h.object.name || h.object.type, d: +h.distance.toFixed(2) }));
  const size = rec.mesh.geometry.parameters;
  // put every hit into the temple's own frame so it can be named
  const loc = ctx.data.LOCATION_BY_ID.get(which);
  const cs = Math.cos(-loc.rot), sn = Math.sin(-loc.rot);
  const toLocal = (wx, wz) => { const dx = wx - loc.pos[0], dz = wz - loc.pos[1];
    return [ +(dx * cs - dz * sn).toFixed(2), +(dx * sn + dz * cs).toFixed(2) ]; };
  const W = loc.build.w * 0.5 - 1.2, D = loc.build.d * 0.5 - 1.2;
  const local = ray.intersectObjects(ctx.scene.children, true)
    .filter(h => h.object.visible).slice(0, 5)
    .map(h => ({ o: h.object.name, d: +h.distance.toFixed(2), lxz: toLocal(h.point.x, h.point.z),
                 ly: +h.point.y.toFixed(2) }));
  return { loc:which, altar:rec.altar.name, visible:rec.mesh.visible,
           img: rec.mat.map && rec.mat.map.image ? [rec.mat.map.image.width, rec.mat.map.image.height] : null,
           panelSize: [size.width, size.height].map(n=>+n.toFixed(2)),
           panel:[m.x,m.y,m.z].map(n=>+n.toFixed(2)),
           build: { w: loc.build.w, d: loc.build.d, W: +W.toFixed(2), D: +D.toFixed(2),
                    doorW: +Math.min(W*0.6, 3).toFixed(2), gz: +(-D*0.68).toFixed(2) },
           panelLocal: toLocal(m.x, m.z), camLocal: toLocal(cx, cz), hits: local };
}, { which: WHICH, back: BACK });
console.log(JSON.stringify(info, null, 1));
await p.waitForTimeout(1000);
await p.screenshot({ path:`docs/shots/altar-${WHICH}.png`, timeout:90000 });
await b.close(); process.exit(0);
