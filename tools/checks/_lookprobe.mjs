import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.cameraRig && window.vrindavan?.ctx?.crowd?.vehicleInst,null,{timeout:220000});
const out = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw, rig = ctx.cameraRig;
  const frame = () => new Promise((res) => requestAnimationFrame(() => res()));
  ctx.ui && ctx.ui.show && ctx.ui.show('world');
  const log = [];
  const orig = rig._readLook.bind(rig);
  rig._readLook = (c, dt, st) => {
    const lk = c.input && c.input.look ? { x: c.input.look.x, y: c.input.look.y } : null;
    const before = rig._lookIdle;
    orig(c, dt, st);
    log.push({ dt: +dt.toFixed(4), lk, before: +before.toFixed(2), after: +rig._lookIdle.toFixed(2), state: r.state });
  };
  // idle on foot first, then a ride
  for (let i = 0; i < 30; i++) await frame();
  const onFoot = log.slice(-5);
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  ctx.player.position.set(chhat.pos[0], ctx.player.position.y, chhat.pos[1]);
  let v = null; for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  v.x = chhat.pos[0] + 4; v.z = chhat.pos[1]; v.chartered = false;
  r._acc = 99; r.update(0.5, ctx); r.board();
  for (let i = 0; i < 400 && r.state === 'boarding'; i++) await frame();
  for (let i = 0; i < 200 && !document.querySelector('[data-go="iskcon-krishna-balaram"]'); i++) await frame();
  const btn = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!btn) return { err: 'no dialog', state: r.state };
  btn.click();
  for (let i = 0; i < 60 && r.state !== 'waiting'; i++) await frame();
  r.startRide();
  const mark = log.length;
  for (let i = 0; i < 120; i++) await frame();
  const riding = log.slice(mark + 60, mark + 70);
  rig._readLook = orig;
  return { onFoot, riding, readsPerFrame: +(log.length / (30 + 120 + 400)).toFixed(2) };
});
console.log(JSON.stringify(out, null, 1));
await b.close(); process.exit(0);
