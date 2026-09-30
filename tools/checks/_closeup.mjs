// Eye-level close-up of one face of a landmark: node _closeup.mjs <id> <outName> [dist] [side]
import { chromium } from 'playwright';
const [ID, NAME, DIST = '14', SIDE = 'z+'] = process.argv.slice(2);
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:720,height:480} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:220000});
await p.evaluate(async ({ ID, DIST, SIDE }) => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true);
    ctx.time.update = () => { const c = ctx.camera; if (c && ctx.time.sky) ctx.time.sky.position.set(c.position.x, 0, c.position.z); }; }
  await new Promise(r => setTimeout(r, 900));
  const loc = ctx.data.LOCATION_BY_ID.get(ID);
  const [x, z] = loc.pos;
  const d = +DIST;
  const off = { 'z+': [0.6, d], 'z-': [0.6, -d], 'x+': [d, 0.6], 'x-': [-d, 0.6] }[SIDE];
  const cx = x + off[0] * (SIDE[0] === 'z' ? 1 : 1), cz = z + off[1];
  const g = ctx.world.groundHeight(cx, cz);
  const cam = ctx.camera.clone(); cam.fov = 64; cam.near = 0.05; cam.updateProjectionMatrix();
  cam.position.set(cx, g + 3.2, cz);
  cam.lookAt(x + (SIDE[0] === 'x' ? 0 : off[0]), g + 5.5, z + (SIDE[0] === 'z' ? 0 : off[1] * 0));
  ctx.camera = cam;
  ctx.player.root.position.set(cx + 60, g, cz + 60);
  ctx.renderer.render(ctx.scene, cam);
}, { ID, DIST, SIDE });
await p.waitForTimeout(800);
await p.screenshot({ path: `docs/shots/${NAME}.png` });
console.log('shot', NAME); await b.close(); process.exit(0);
