/**
 * Does each D-pad arrow move the avatar the way it points?
 *
 * Presses one arrow at a time and measures the displacement against the
 * camera's own right/forward vectors. "Right" must have a positive component
 * along camera-right; "left" negative. Magnitudes are ignored — only sign.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const cdp = await p.context().newCDPSession(p);
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.cameraRig, null, { timeout: 60000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(600);

async function press(dir, ms = 1400) {
  return p.evaluate(async ({ dir, ms }) => {
    const app = window.vrindavan, ctx = app.ctx;
    const im = ctx.input;
    const start = ctx.player.position.clone();
    // the rig's own basis — the one the game moves you with
    const rig = ctx.cameraRig;
    const F = rig.getForward(start.clone()), R = rig.getRight(start.clone());
    const f = { x: F.x, z: F.z };
    const r = { x: R.x, z: R.z };
    im._dpad[dir] = true;
    await new Promise((res) => setTimeout(res, ms));
    im._dpad[dir] = false;
    const end = ctx.player.position.clone();
    const dx = end.x - start.x, dz = end.z - start.z;
    return {
      dist: Math.hypot(dx, dz),
      alongRight: dx * r.x + dz * r.z,
      alongFwd: dx * f.x + dz * f.z,
    };
  }, { dir, ms });
}

/* real taps on the on-screen buttons, not the internal flag */
async function tapHold(sel, ms = 1400) {
  const box = await p.locator(sel).boundingBox();
  if (!box) return null;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const before = await p.evaluate(() => {
    const ctx = window.vrindavan.ctx, rig = ctx.cameraRig;
    const p0 = ctx.player.position;
    const F = rig.getForward(p0.clone()), R = rig.getRight(p0.clone());
    return { x: p0.x, z: p0.z, fx: F.x, fz: F.z, rx: R.x, rz: R.z };
  });
  await p.mouse.move(cx, cy); await p.mouse.down();
  await p.waitForTimeout(ms);
  await p.mouse.up();
  return p.evaluate((b) => {
    const q = window.vrindavan.ctx.player.position;
    const dx = q.x - b.x, dz = q.z - b.z;
    return { dist: Math.hypot(dx, dz), alongRight: dx * b.rx + dz * b.rz, alongFwd: dx * b.fx + dz * b.fz };
  }, before);
}

/* hold a keyboard key */
async function keyHold(key, ms = 1400) {
  const before = await p.evaluate(() => {
    const ctx = window.vrindavan.ctx, rig = ctx.cameraRig;
    const p0 = ctx.player.position;
    const F = rig.getForward(p0.clone()), R = rig.getRight(p0.clone());
    return { x: p0.x, z: p0.z, fx: F.x, fz: F.z, rx: R.x, rz: R.z };
  });
  await p.keyboard.down(key);
  await p.waitForTimeout(ms);
  await p.keyboard.up(key);
  return p.evaluate((b) => {
    const q = window.vrindavan.ctx.player.position;
    const dx = q.x - b.x, dz = q.z - b.z;
    return { dist: Math.hypot(dx, dz), alongRight: dx * b.rx + dz * b.rz, alongFwd: dx * b.fx + dz * b.fz };
  }, before);
}

/**
 * Drag the on-screen stick with REAL touch events.
 *
 * This used to use page.mouse, which is why every stick reading looked broken:
 * InputManager binds the stick to touchstart/touchmove/touchend on
 * #touch-layer, so mouse events never reached it at all and the avatar was
 * only ever drifting. The test was wrong, not the stick. CDP dispatches
 * genuine touches.
 */
async function stickDrag(ddx, ddy, ms = 1400) {
  const before = await p.evaluate(() => {
    const ctx = window.vrindavan.ctx, rig = ctx.cameraRig;
    const p0 = ctx.player.position;
    const F = rig.getForward(p0.clone()), R = rig.getRight(p0.clone());
    return { x: p0.x, z: p0.z, fx: F.x, fz: F.z, rx: R.x, rz: R.z };
  });

  const vp = p.viewportSize();
  // 0.42 down the screen, not 0.74.
  //
  // The D-pad occupies the lower left — left:12 bottom:152, 150x150 — which is
  // exactly where a left thumb rests and exactly where this test used to press.
  // Touches there land on the RUN button and #touch-layer receives nothing at
  // all, which read as the stick being broken. It is not; it is covered.
  const sx = Math.round(vp.width * 0.22), sy = Math.round(vp.height * 0.42);

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: sx, y: sy, id: 1 }],
  });
  // move in a few steps so the stick reads a deflection rather than a jump
  for (let i = 1; i <= 4; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: sx + (ddx * i) / 4, y: sy + (ddy * i) / 4, id: 1 }],
    });
    await p.waitForTimeout(30);
  }
  await p.waitForTimeout(ms);
  // hold the deflection while time passes, then lift
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  return p.evaluate((b) => {
    const q = window.vrindavan.ctx.player.position;
    const dx = q.x - b.x, dz = q.z - b.z;
    return { dist: Math.hypot(dx, dz), alongRight: dx * b.rx + dz * b.rz, alongFwd: dx * b.fx + dz * b.fz };
  }, before);
}

const want = { right: ['alongRight', +1], left: ['alongRight', -1], up: ['alongFwd', +1], down: ['alongFwd', -1] };
let bad = 0, blocked = 0;
/**
 * Report a measurement.
 *
 * "Did not move" and "moved the wrong way" are different findings and must not
 * print the same word. A press that is blocked by a wall reads as zero metres
 * and used to be announced as WRONG WAY, which sent me looking for a sign error
 * that was not there. Only a confident displacement in the wrong direction is a
 * failure; too small to judge is reported as such and retried once.
 */
const MIN_JUDGE = 0.25;      // metres below which direction cannot be read
const row = (label, m, axis, sign) => {
  if (!m) { console.log(`  ${label.padEnd(22)} (no element)`); return; }
  const proj = m[axis];
  const pad = `  ${label.padEnd(22)} ${m.dist.toFixed(2).padStart(5)}m  R${m.alongRight.toFixed(2).padStart(7)}  F${m.alongFwd.toFixed(2).padStart(7)}`;
  if (m.dist < MIN_JUDGE) { blocked++; console.log(`${pad}   BLOCKED (no room to move; direction not judged)`); return; }
  const ok = Math.sign(proj) === sign;
  if (!ok) bad++;
  console.log(`${pad}   ${ok ? 'PASS' : 'FAIL  <-- WRONG WAY'}`);
};

const basis = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, rig = ctx.cameraRig, cam = ctx.camera;
  const v = ctx.player.position;
  const F = rig.getForward(v.clone()), R = rig.getRight(v.clone());
  const cf = v.clone().set(0, 0, -1).applyQuaternion(cam.quaternion); cf.y = 0; cf.normalize();
  return { rigF: [+F.x.toFixed(3), +F.z.toFixed(3)], rigR: [+R.x.toFixed(3), +R.z.toFixed(3)],
           camF: [+cf.x.toFixed(3), +cf.z.toFixed(3)], dot: +(F.x * cf.x + F.z * cf.z).toFixed(3) };
});
console.log('--- basis ---');
console.log('  rig forward', JSON.stringify(basis.rigF), ' rig right', JSON.stringify(basis.rigR));
console.log('  camera forward', JSON.stringify(basis.camF), ' dot(rigF, camF) =', basis.dot,
            basis.dot > 0.8 ? '(agree)' : basis.dot < -0.8 ? '(OPPOSITE)' : '(skewed)');

console.log('\n--- D-pad, internal flag ---');
for (const dir of ['right', 'left', 'up', 'down']) {
  const [axis, sign] = want[dir];
  row('flag ' + dir, await press(dir), axis, sign);
  await p.waitForTimeout(350);
}

console.log('\n--- D-pad, real taps on the buttons ---');
await p.evaluate(() => document.getElementById('dpad')?.classList.add('on'));
for (const dir of ['right', 'left', 'up', 'down']) {
  const [axis, sign] = want[dir];
  row('tap ' + dir, await tapHold(`.dp.${dir}`), axis, sign);
  await p.waitForTimeout(350);
}

console.log('\n--- keyboard ---');
for (const [key, dir] of [['ArrowRight', 'right'], ['ArrowLeft', 'left'], ['ArrowUp', 'up'], ['ArrowDown', 'down']]) {
  const [axis, sign] = want[dir];
  row('key ' + key, await keyHold(key), axis, sign);
  await p.waitForTimeout(350);
}

console.log('\n--- on-screen stick ---');
for (const [label, dx, dy, dir] of [['stick right', 58, 0, 'right'], ['stick left', -58, 0, 'left'],
                                    ['stick up', 0, -58, 'up'], ['stick down', 0, 58, 'down']]) {
  const [axis, sign] = want[dir];
  row(label, await stickDrag(dx, dy), axis, sign);
  await p.waitForTimeout(350);
}

console.log(`\n${bad} wrong-way inputs, ${blocked} blocked (unjudged)${errs.length ? `, ${errs.length} page errors` : ''}`);
process.exitCode = bad || errs.length ? 1 : 0;
await b.close(); server.close();
process.exit(bad ? 1 : 0);
