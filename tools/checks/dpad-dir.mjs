/**
 * Does each D-pad arrow move the avatar the way it points — and is there only
 * ever one way to walk on the screen?
 *
 * Presses one arrow at a time and measures the displacement against the
 * camera's own right/forward vectors. "Right" must have a positive component
 * along camera-right; "left" negative. Magnitudes are ignored — only sign.
 *
 * ONE SCHEME AT A TIME. The D-pad used to sit on top of the floating stick —
 * left:12 bottom:152, 150x150, exactly where a left thumb rests — so a thumb
 * meant for the stick pressed RUN, and #touch-layer under it received
 * nothing. Settings now picks one (settings.moveControl, the D-pad unless you
 * choose otherwise) and the other is taken off the page. This holds that to
 * account three ways:
 *   (a) on a first launch, wherever a left thumb lands, the two controls are
 *       never drawn together and their bounding rects never overlap;
 *   (b) with the stick chosen, a touch where the D-pad used to be reaches the
 *       stick — and every stick reading below is taken from exactly there;
 *   (c) the choice, tapped in Settings like a person would, survives a reload.
 *
 * FIXED STEPS, NOT WALL CLOCK. Each press used to be held for 1400 ms of real
 * time with 350 ms naps between, and how much walking that bought depended on
 * how starved the machine was. Now the game's own loop is paused for every
 * reading and this steps input and player itself at 1/30 s, as platforms.mjs
 * and stairs.mjs do: a held press is 42 steps whatever the CPU is doing. The
 * presses are still real — taps, keys, touches through CDP. Only time is ours.
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

const HOLD = 42;    // steps of 1/30 s a press is held: the 1.4 s it always was
const COAST = 30;   // steps after letting go, so the next press starts from rest

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const cdp = await p.context().newCDPSession(p);
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));

/**
 * What the page needs for stepping and measuring. A reload takes it away, so
 * boot() puts it back every time.
 */
function installHelpers() {
  const app = window.vrindavan, ctx = app.ctx, DT = 1 / 30;
  const V = ctx.player.position.constructor;
  const f = new V(), r = new V(), c = new V();
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  /*
   * The simulation is ours. With `paused` set, the game's loop still renders
   * and still runs the camera rig, but input and player move only when this
   * steps them. ui.show() unpauses on the way back into the world, so every
   * helper below pauses again rather than trusting that it still is.
   */
  window.__step = (n) => {
    app.paused = true;
    for (let i = 0; i < n; i++) { ctx.input.update(DT); ctx.player.update(DT, ctx); }
  };

  /*
   * Step the camera rig until the camera is where the rig says it is.
   *
   * This is what the old "OPPOSITE" basis line was. 600 ms after entering the
   * world, the camera was still flying in from the intro shot from the far
   * side of the player, so it faced the player — against the rig. The D-pad
   * walks by the rig's basis and the stick and keys by the camera's, so no
   * press is measured until the two agree.
   */
  window.__settle = () => {
    app.paused = true;
    const rig = ctx.cameraRig, cam = ctx.camera, P = ctx.player.position;
    let n = 0, dot = -1;
    for (; n < 900; n++) {
      rig.update(DT, ctx);
      rig.getForward(f);
      c.set(0, 0, -1).applyQuaternion(cam.quaternion); c.y = 0; c.normalize();
      dot = f.x * c.x + f.z * c.z;
      const near = Math.hypot(cam.position.x - P.x, cam.position.z - P.z) < rig.dist + 1;
      if (dot > 0.995 && near && Math.abs(wrap(rig.yawTarget - rig.yaw)) < 0.005) break;
    }
    return { steps: n, dot: +dot.toFixed(3),
      rigF: [+f.x.toFixed(3), +f.z.toFixed(3)], camF: [+c.x.toFixed(3), +c.z.toFixed(3)] };
  };

  /* Hold whatever is pressed for n steps; the displacement in the rig's own basis. */
  window.__walk = (n) => {
    const P = ctx.player.position, rig = ctx.cameraRig;
    rig.getForward(f); rig.getRight(r);
    const x0 = P.x, z0 = P.z;
    window.__step(n);
    const dx = P.x - x0, dz = P.z - z0;
    return { dist: Math.hypot(dx, dz), alongRight: dx * r.x + dz * r.z, alongFwd: dx * f.x + dz * f.z };
  };

  /*
   * What each control has actually DRAWN, as a client rect, or null. The
   * stick's own word for drawn is its `.on` class: its opacity is part-way
   * through a 0.18 s fade for a moment after the thumb lands, and a stick
   * that is fading in is already on the screen.
   */
  window.__drawn = () => {
    const rect = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      const q = el.getBoundingClientRect();
      return q.width > 0 && q.height > 0 ? { l: q.left, t: q.top, r: q.right, b: q.bottom } : null;
    };
    const base = document.getElementById('stick-base'), knob = document.getElementById('stick-knob');
    const on = !!(base && base.classList.contains('on'));
    const sb = on ? rect(base) : null, sk = on ? rect(knob) : null;
    const stick = sb && sk
      ? { l: Math.min(sb.l, sk.l), t: Math.min(sb.t, sk.t), r: Math.max(sb.r, sk.r), b: Math.max(sb.b, sk.b) }
      : sb || sk;
    return { dpad: rect(document.getElementById('dpad')), stick, base: sb,
      stickActive: ctx.input._stick.active, roles: [...ctx.input._touches.values()].map((t) => t.role) };
  };
}

async function boot(reload) {
  if (reload) await p.reload({ waitUntil: 'networkidle' });
  else await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.cameraRig, null, { timeout: 60000 });
  await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
  await p.evaluate(installHelpers);
  return p.evaluate(() => window.__settle());
}

/** One real finger, through CDP: InputManager listens for touch events, not mouse. */
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y: Math.round(y), id: 1 }],
});

/**
 * Choose a scheme the way a person does: the menu button, Settings, "Walk
 * with", and back into the world. Reports what Settings showed as chosen
 * before the tap, which is how (c) reads a remembered choice.
 */
async function chooseScheme(val) {
  await p.locator('#btn-menu').tap();
  await p.locator('[data-go="settings"]').tap();
  const shown = await p.evaluate(() => document.querySelector('#set-moveControl .sel')?.dataset.val ?? null);
  await p.locator(`#set-moveControl button[data-val="${val}"]`).tap();
  const sel = await p.evaluate(() => document.querySelector('#set-moveControl .sel')?.dataset.val ?? null);
  await p.locator('#screen-settings [data-back]').tap();
  const st = await p.evaluate(() => ({ screen: window.vrindavan.ctx.ui.screen,
    setting: window.vrindavan.ctx.state.settings.moveControl, move: document.body.dataset.move }));
  return { shown, sel, ...st };
}

/* The debounced save has landed: a condition, not a nap. */
const savedAs = (val) => p.waitForFunction((v) => {
  try { return JSON.parse(localStorage.getItem('vrindavan-dham.v1')).settings.moveControl === v; }
  catch { return false; }
}, val, { timeout: 15000 }).then(() => true, () => false);

const overlap = (a, c) => !!(a && c && a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b);
const box = (q) => q ? `[${Math.round(q.l)}, ${Math.round(q.t)}, ${Math.round(q.r - q.l)}x${Math.round(q.b - q.t)}]` : 'not drawn';

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/* ---- the direction readings ---- */

/** Press, hold for HOLD steps, let go, coast to rest. `on` and `off` do the real pressing. */
async function held(on, off) {
  await p.evaluate(() => window.__settle());
  const landed = await on();
  const m = await p.evaluate((n) => window.__walk(n), HOLD);
  await off();
  await p.evaluate((n) => window.__step(n), COAST);
  return { ...m, landed };
}

const flagHold = (dir) => held(
  () => p.evaluate((d) => { window.vrindavan.ctx.input._dpad[d] = true; return true; }, dir),
  () => p.evaluate((d) => { window.vrindavan.ctx.input._dpad[d] = false; }, dir));

/* a real finger on the on-screen button, not the internal flag */
async function tapHold(sel) {
  const bb = await p.locator(sel).boundingBox();
  if (!bb) return null;
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  return held(async () => {
    await touch('touchStart', x, y);
    // the button lights while it is held: proof the finger reached it
    return p.evaluate((s) => document.querySelector(s).classList.contains('held'), sel);
  }, () => touch('touchEnd'));
}

const keyHold = (key) => held(async () => {
  await p.keyboard.down(key);
  return p.evaluate((k) => window.vrindavan.ctx.input._keys.has(k), key);
}, () => p.keyboard.up(key));

/**
 * Drag the on-screen stick with REAL touch events.
 *
 * This used to use page.mouse, which is why every stick reading looked broken:
 * InputManager binds the stick to touchstart/touchmove/touchend on
 * #touch-layer, so mouse events never reached it at all and the avatar was
 * only ever drifting. The test was wrong, not the stick. CDP dispatches
 * genuine touches.
 *
 * It then had to press at 0.42 of the screen height, because the lower left —
 * where a thumb rests — was under the D-pad and the stick never heard it.
 * With the stick chosen the D-pad is gone, so these readings are taken from
 * the old D-pad centre itself, which is (b) proved four more times over.
 */
async function stickDrag(sx, sy, ddx, ddy) {
  return held(async () => {
    await touch('touchStart', sx, sy);
    for (let i = 1; i <= 4; i++) await touch('touchMove', sx + (ddx * i) / 4, sy + (ddy * i) / 4);
    const d = await p.evaluate(() => window.__drawn());
    // landed: the stick took this thumb, and is drawn where the thumb came down
    return d.stickActive && !!d.base
      && Math.hypot((d.base.l + d.base.r) / 2 - sx, (d.base.t + d.base.b) / 2 - sy) < 2;
  }, () => touch('touchEnd'));
}

const want = { right: ['alongRight', +1], left: ['alongRight', -1], up: ['alongFwd', +1], down: ['alongFwd', -1] };
let good = 0, bad = 0, blocked = 0;
/**
 * Report a measurement.
 *
 * "Did not move" and "moved the wrong way" are different findings and must not
 * print the same word. A press that is blocked by a wall reads as zero metres
 * and used to be announced as WRONG WAY, which sent me looking for a sign error
 * that was not there. Only a confident displacement in the wrong direction is a
 * failure; too small to judge is reported as such.
 *
 * A press that never LANDED is a failure of its own, and is said so first: a
 * tap that missed its button would otherwise read as zero metres and slip
 * through as merely blocked.
 */
const MIN_JUDGE = 0.25;      // metres below which direction cannot be read
const row = (label, m, axis, sign) => {
  if (!m) { bad++; console.log(`  ${label.padEnd(22)} (no element)   FAIL`); return; }
  const proj = m[axis];
  const pad = `  ${label.padEnd(22)} ${m.dist.toFixed(2).padStart(5)}m  R${m.alongRight.toFixed(2).padStart(7)}  F${m.alongFwd.toFixed(2).padStart(7)}`;
  if (!m.landed) { bad++; console.log(`${pad}   FAIL  <-- the press never reached the control`); return; }
  if (m.dist < MIN_JUDGE) { blocked++; console.log(`${pad}   BLOCKED (no room to move; direction not judged)`); return; }
  const ok = Math.sign(proj) === sign;
  if (ok) good++; else bad++;
  console.log(`${pad}   ${ok ? 'PASS' : 'FAIL  <-- WRONG WAY'}`);
};

/* ================================================================== */

const basis = await boot(false);
console.log('--- basis ---');
console.log(`  camera settled in ${basis.steps} steps of 1/30 s`);
console.log('  rig forward', JSON.stringify(basis.rigF), ' camera forward', JSON.stringify(basis.camF),
            ' dot =', basis.dot, basis.dot > 0.8 ? '(agree)' : basis.dot < -0.8 ? '(OPPOSITE)' : '(skewed)');

/* ---- (a) a first launch: one control on screen, wherever the thumb lands ---- */
console.log('\n--- (a) the default scheme: one control on screen ---');
const vp = p.viewportSize();
const first = await p.evaluate(() => ({ setting: window.vrindavan.ctx.state.settings.moveControl,
  move: document.body.dataset.move, ...window.__drawn() }));
check('a first launch walks with the D-pad', first.setting === 'dpad' && first.move === 'dpad',
  `settings.moveControl "${first.setting}", body[data-move] "${first.move}"`);
const PAD = first.dpad;      // where the D-pad is drawn: "the old D-pad position" in (b)
check('the D-pad is drawn where it always was', !!PAD, box(PAD));

if (PAD) {
  const cx = (PAD.l + PAD.r) / 2, cy = (PAD.t + PAD.b) / 2;
  const spots = [
    ["in the D-pad's own corner, off its arrows", PAD.l + 10, PAD.t + 10],
    ['just right of the D-pad', PAD.r + 16, cy],
    ['just above it', cx, PAD.t - 16],
    ['below and right of it', PAD.r + 16, PAD.b + 16],
    ['where the stick test used to press', vp.width * 0.22, vp.height * 0.42],
    ['the middle of the left half', vp.width * 0.25, vp.height * 0.5],
  ];
  let sticks = 0, both = 0, overlaps = 0;
  for (const [label, x, y] of spots) {
    await touch('touchStart', x, y);
    for (let i = 1; i <= 4; i++) await touch('touchMove', x + 9 * i, y - 9 * i);   // a thumb that means to walk
    const d = await p.evaluate(() => window.__drawn());
    await touch('touchEnd');
    if (d.stick) sticks++;
    if (d.stick && d.dpad) both++;
    if (overlap(d.stick, d.dpad)) overlaps++;
    console.log(`    ${label.padEnd(42)} (${Math.round(x)}, ${Math.round(y)})  touch: ${d.roles.join('+') || 'none'}`
      + `  stick ${box(d.stick)}  D-pad ${box(d.dpad)}`);
  }
  check('no stick is born anywhere a left thumb lands while the D-pad is up', sticks === 0 && both === 0,
    `${spots.length} touches, ${sticks} sticks drawn`);
  check('the two controls never overlap', overlaps === 0, `${spots.length} touches measured, ${overlaps} overlaps`);
}

/* ---- the D-pad, chosen in Settings before a single arrow is pressed ---- */
console.log('\n--- choosing the D-pad in Settings ---');
const padPick = await chooseScheme('dpad');
check('Settings → Walk with → Arrows (the D-pad)', padPick.setting === 'dpad' && padPick.sel === 'dpad'
  && padPick.screen === 'world' && padPick.move === 'dpad',
  `setting "${padPick.setting}", Settings shows "${padPick.sel}", back on "${padPick.screen}"`);

console.log('\n--- D-pad, internal flag ---');
for (const dir of ['right', 'left', 'up', 'down']) {
  const [axis, sign] = want[dir];
  row('flag ' + dir, await flagHold(dir), axis, sign);
}

console.log('\n--- D-pad, real taps on the buttons ---');
for (const dir of ['right', 'left', 'up', 'down']) {
  const [axis, sign] = want[dir];
  row('tap ' + dir, await tapHold(`.dp.${dir}`), axis, sign);
}

console.log('\n--- keyboard ---');
await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
for (const [key, dir] of [['ArrowRight', 'right'], ['ArrowLeft', 'left'], ['ArrowUp', 'up'], ['ArrowDown', 'down']]) {
  const [axis, sign] = want[dir];
  row('key ' + key, await keyHold(key), axis, sign);
}

/* ---- (b) the stick, where the D-pad used to be ---- */
console.log('\n--- (b) the stick, where the D-pad used to be ---');
const stickPick = await chooseScheme('stick');
check('Settings → Walk with → Stick', stickPick.setting === 'stick' && stickPick.sel === 'stick'
  && stickPick.screen === 'world' && stickPick.move === 'stick',
  `setting "${stickPick.setting}", Settings shows "${stickPick.sel}", back on "${stickPick.screen}"`);
const gone = await p.evaluate(() => {
  const el = document.getElementById('dpad'), q = el.getBoundingClientRect();
  return { display: getComputedStyle(el).display, w: q.width, h: q.height, drawn: !!window.__drawn().dpad };
});
check('the D-pad is off the page: nothing drawn, nothing to take a touch', !gone.drawn && gone.display === 'none',
  `display ${gone.display}, ${gone.w}x${gone.h}`);

let OLD = null;
if (PAD) {
  OLD = { x: (PAD.l + PAD.r) / 2, y: (PAD.t + PAD.b) / 2 };
  // every part of the old box, not only its centre
  const under = await p.evaluate((q) => {
    const out = [];
    for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
      const e = document.elementFromPoint(q.l + (q.r - q.l) * fx, q.t + (q.b - q.t) * fy);
      out.push(e ? (e.id || e.className || e.tagName) : 'nothing');
    }
    return out;
  }, PAD);
  const layer = under.filter((u) => u === 'touch-layer').length;
  check('the touch layer is what lies under the whole of where the D-pad was', layer === under.length,
    `${layer}/${under.length} points${layer < under.length ? ': ' + [...new Set(under)].join(', ') : ''}`);

  // and real fingers there: the old centre, and where each old arrow sat
  const fingers = [['old centre (RUN)', OLD.x, OLD.y], ['old up arrow', OLD.x, PAD.t + 24],
    ['old down arrow', OLD.x, PAD.b - 24], ['old left arrow', PAD.l + 24, OLD.y], ['old right arrow', PAD.r - 24, OLD.y]];
  let took = 0, under2 = 0, together = 0;
  const off = [];
  for (const [, x, y] of fingers) {
    await touch('touchStart', x, y);
    const d = await p.evaluate(() => window.__drawn());
    await touch('touchEnd');
    const miss = d.base ? Math.hypot((d.base.l + d.base.r) / 2 - x, (d.base.t + d.base.b) / 2 - y) : Infinity;
    off.push(miss === Infinity ? 'none' : miss.toFixed(1));
    if (d.stickActive && d.roles.includes('move')) took++;
    if (miss < 2) under2++;
    if (d.stick && d.dpad) together++;
  }
  check('a touch anywhere the D-pad was starts the stick', took === fingers.length,
    `${took}/${fingers.length} touches walked`);
  check('... drawn under the thumb, and never alongside a D-pad', under2 === fingers.length && together === 0,
    `stick centre off the touch by ${off.join(', ')} px; drawn with the D-pad ${together} times`);
}

console.log('\n--- on-screen stick, from the old D-pad centre ---');
const S = OLD || { x: vp.width * 0.22, y: vp.height * 0.42 };
for (const [label, dx, dy, dir] of [['stick right', 58, 0, 'right'], ['stick left', -58, 0, 'left'],
                                    ['stick up', 0, -58, 'up'], ['stick down', 0, 58, 'down']]) {
  const [axis, sign] = want[dir];
  row(label, await stickDrag(S.x, S.y, dx, dy), axis, sign);
}

/* ---- (c) the choice outlives the page ---- */
console.log('\n--- (c) the choice survives a reload ---');
check('"Stick" is written to the save', await savedAs('stick'), 'localStorage settings.moveControl');
await boot(true);
const kept = await p.evaluate(() => ({ setting: window.vrindavan.ctx.state.settings.moveControl,
  move: document.body.dataset.move, ...window.__drawn() }));
let answers = false;
if (OLD) {
  await touch('touchStart', OLD.x, OLD.y);
  answers = (await p.evaluate(() => window.__drawn())).stickActive;
  await touch('touchEnd');
}
check('after a reload it is still the stick: no D-pad, and the stick answers where the D-pad was',
  kept.setting === 'stick' && kept.move === 'stick' && !kept.dpad && answers,
  `setting "${kept.setting}", D-pad ${box(kept.dpad)}, touch at the old centre ${answers ? 'walks' : 'does NOT walk'}`);
const back = await chooseScheme('dpad');
check('... and Settings shows "Stick" as the choice', back.shown === 'stick', `Settings showed "${back.shown}"`);
const padSaved = await savedAs('dpad');
await boot(true);
const again = await p.evaluate(() => ({ setting: window.vrindavan.ctx.state.settings.moveControl, ...window.__drawn() }));
check('choosing the D-pad again survives a reload too, and it is back where it was',
  padSaved && again.setting === 'dpad' && !!again.dpad && box(again.dpad) === box(PAD),
  `saved ${padSaved}, setting "${again.setting}", D-pad ${box(again.dpad)}`);

/* ================================================================== */
if (errs.length) { console.log('\nPAGE ERRORS:'); errs.slice(0, 4).forEach((e) => console.log('  ' + e)); }
// a run in which every press was walled in has proved nothing about direction
if (!good && !bad) { failed++; console.log('\n  FAIL  not one direction could be judged — every press was blocked'); }
console.log(`\n${passed + good}/${passed + failed + good + bad} passed`
  + ` — ${bad} wrong-way or unlanded inputs, ${blocked} blocked (unjudged)${errs.length ? `, ${errs.length} page errors` : ''}`);
await b.close(); server.close();
process.exit(failed || bad || errs.length ? 1 : 0);
