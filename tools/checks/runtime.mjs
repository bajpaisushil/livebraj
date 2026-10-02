/**
 * Runtime smoke test.
 *
 * Boots the actual client in headless Chromium with software WebGL, captures
 * every console message and page error, waits for the world to finish building,
 * then reports what was constructed and saves a screenshot.
 *
 *   node tools/checks/runtime.mjs [--shots]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client');
/* port: see __PORT */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide
console.log(`serving ${ROOT} on :${__PORT}\n`);

const browser = await chromium.launch({
  args: [
    '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-gpu-sandbox',
    '--ignore-gpu-blocklist', '--enable-webgl',
  ],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },      // iPhone-class portrait
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

const errors = [];
const warnings = [];
const info = [];

page.on('console', (m) => {
  const t = m.type();
  const text = m.text();
  if (t === 'error') errors.push(text);
  else if (t === 'warning') warnings.push(text);
  else if (/^\[/.test(text)) info.push(text);
});
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
});
page.on('requestfailed', (r) => {
  const f = r.failure();
  if (f && !/net::ERR_ABORTED/.test(f.errorText)) errors.push(`REQUEST FAILED ${r.url()} — ${f.errorText}`);
});

console.log('booting…');
const t0 = Date.now();
await page.goto(`http://localhost:${__PORT}/`, { waitUntil: 'load', timeout: 60000 });

// wait for the world to finish building
let state = null;
try {
  state = await page.waitForFunction(() => {
    const a = window.vrindavan;
    return a && a.ctx && a.ctx.world && a.ctx.world._ready ? {
      built: true,
      failed: a.failedSystems || [],
      systems: Object.keys(a.ctx).filter((k) => a.ctx[k] && typeof a.ctx[k] === 'object'),
    } : null;
  }, null, { timeout: 120000 }).then((h) => h.jsonValue());
} catch {
  console.log('world did not finish building within 120s');
}
const bootMs = Date.now() - t0;

// let a few frames run so update() paths execute
await page.waitForTimeout(4000);

const report = await page.evaluate(() => {
  const a = window.vrindavan;
  if (!a || !a.ctx) return { ok: false };
  const c = a.ctx;
  let tris = 0, draws = 0;
  c.scene.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    draws += o.isInstancedMesh ? 1 : 1;
    const g = o.geometry;
    if (!g) return;
    const n = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
    tris += n * (o.isInstancedMesh ? (o.count || 0) : 1);
  });
  return {
    ok: true,
    fps: Math.round(a.fps),
    failed: a.failedSystems || [],
    tris: Math.round(tris),
    draws,
    renderCalls: c.renderer.info.render.calls,
    renderTris: c.renderer.info.render.triangles,
    programs: c.renderer.info.programs ? c.renderer.info.programs.length : 0,
    player: c.player ? [Math.round(c.player.position.x), Math.round(c.player.position.y * 10) / 10, Math.round(c.player.position.z)] : null,
    nav: c.nav ? c.nav.nodes.size : 0,
    flowers: c.world && c.world.flowers ? c.world.flowers.length : 0,
    colliders: c.world ? c.world.colliders.length : 0,
    interiors: c.interior ? c.interior.volumes.length : 0,
    phase: c.time ? c.time.phase : null,
    localTime: c.live ? c.live.summary : null,
    screen: c.ui ? c.ui.screen : null,
  };
});

console.log(`\nboot: ${(bootMs / 1000).toFixed(1)}s`);
if (info.length) { console.log('\n--- init log ---'); info.forEach((l) => console.log('  ' + l)); }

console.log('\n--- world ---');
if (report.ok) {
  for (const [k, v] of Object.entries(report)) {
    if (k === 'ok') continue;
    console.log(`  ${k.padEnd(12)} ${Array.isArray(v) ? JSON.stringify(v) : v}`);
  }
} else console.log('  app did not expose state');

if (errors.length) {
  console.log(`\n--- ERRORS (${errors.length}) ---`);
  [...new Set(errors)].slice(0, 25).forEach((e) => console.log('  ' + e.split('\n')[0]));
}
if (warnings.length) {
  console.log(`\n--- warnings (${warnings.length}) ---`);
  [...new Set(warnings)].slice(0, 8).forEach((w) => console.log('  ' + w.slice(0, 160)));
}

// ---- controls: does the D-pad exist, show on a phone, and actually work? ----
const controls = await page.evaluate(async () => {
  const a = window.vrindavan;
  if (a.ctx.ui) a.ctx.ui.show('world');
  if (a.ctx.cameraRig) a.ctx.cameraRig.setMode('follow');
  await new Promise((r) => setTimeout(r, 700));

  const pad = document.getElementById('dpad');
  const rect = pad ? pad.getBoundingClientRect() : null;
  const press = async (sel, id, ms) => {
    const b = pad ? pad.querySelector(sel) : null;
    if (!b) return;
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id }));
    await new Promise((r) => setTimeout(r, ms));
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: id }));
  };

  const p0 = a.ctx.player ? a.ctx.player.position.clone() : null;
  await press('.dp.up', 1, 1800);
  const p1 = a.ctx.player ? a.ctx.player.position.clone() : null;

  const s0 = a.ctx.player ? a.ctx.player.position.clone() : null;
  await press('.dp.left', 2, 1400);
  const s1 = a.ctx.player ? a.ctx.player.position.clone() : null;

  const readout = document.getElementById('place-readout');
  return {
    padExists: !!pad,
    padVisible: pad ? pad.classList.contains('on') : false,
    padDisplay: pad ? getComputedStyle(pad).display : null,
    padRect: rect ? [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width)] : null,
    onScreen: rect ? (rect.width > 0 && rect.left >= 0 && rect.bottom <= window.innerHeight + 2) : false,
    viewport: [window.innerWidth, window.innerHeight],
    walkedMetres: p0 && p1 ? Math.round(p0.distanceTo(p1) * 10) / 10 : null,
    strafedMetres: s0 && s1 ? Math.round(s0.distanceTo(s1) * 10) / 10 : null,
    readoutShown: readout ? readout.classList.contains('show') : false,
    road: (document.getElementById('place-road') || {}).textContent,
    area: (document.getElementById('place-area') || {}).textContent,
  };
});
const hitTest = await page.evaluate(() => {
  const check = (id) => {
    const el = document.getElementById(id);
    if (!el) return id + ': missing';
    const r = el.getBoundingClientRect();
    if (!r.width) return id + ': zero size';
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const reachable = el === top || el.contains(top) || (top && top.contains(el));
    return id + ': ' + (reachable ? 'clickable' : 'BLOCKED by ' +
      (top ? (top.id || top.className || top.tagName) : 'nothing'));
  };
  return ['btn-menu', 'btn-map', 'place-readout', 'minimap-wrap'].map(check);
});
console.log('\n--- hit test ---');
hitTest.forEach((l) => console.log('  ' + l));

console.log('\n--- controls ---');
for (const [k, v] of Object.entries(controls)) console.log('  ' + k.padEnd(15) + ' ' + v);

// ---- do the screens the player actually navigates through work? ----
const screens = await page.evaluate(async () => {
  const c = window.vrindavan.ctx;
  const ui = c.ui;
  if (!ui) return { ok: false };
  const out = {};

  const visit = async (name) => {
    ui.show(name);
    await new Promise((r) => setTimeout(r, 450));
    const el = document.getElementById('screen-' + name);
    const shown = el ? el.classList.contains('show') : false;
    const body = el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    return { shown, chars: body.length, sample: body.slice(0, 64) };
  };

  // make sure there is something to list
  c.state.discovered.add('banke-bihari');
  c.state.discovered.add('keshi-ghat');
  c.state.metresWalked = 1840;
  c.state.offered.push({ locId: 'banke-bihari', kind: 'marigold' });

  out.places = await visit('places');
  out.journey = await visit('journey');
  out.settings = await visit('settings');
  out.avatar = await visit('avatar');
  out.menu = await visit('menu');
  ui.show('world');

  // and the story card, with its Listen button
  const loc = c.data.LOCATION_BY_ID.get('banke-bihari');
  ui.card(loc);
  await new Promise((r) => setTimeout(r, 300));
  const card = document.getElementById('card');
  out.card = {
    shown: card ? card.classList.contains('show') : false,
    hasListen: !!(card && card.querySelector('[data-card="listen"]')),
    chars: card ? card.innerText.replace(/\s+/g, ' ').trim().length : 0,
  };
  ui.closeCard();
  return out;
});
console.log('\n--- screens ---');
for (const [k, v] of Object.entries(screens)) {
  if (typeof v !== 'object') { console.log('  ' + k.padEnd(10) + ' ' + v); continue; }
  console.log('  ' + k.padEnd(10) + ' shown=' + v.shown + '  content=' + (v.chars || 0) + ' chars'
    + (v.hasListen !== undefined ? '  listen=' + v.hasListen : '')
    + (v.sample ? '  "' + v.sample + '"' : ''));
}

// ---- is the soundscape actually built, and is narration available? ----
const audio = await page.evaluate(() => {
  const c = window.vrindavan.ctx;
  const a = c.audio;
  return {
    engineBuilt: !!a,
    contextOk: !!(a && a.ok),
    contextState: a && a.ac ? a.ac.state : null,
    ambientBeds: a && a.beds ? Object.keys(a.beds).length : 0,
    bedNames: a && a.beds ? Object.keys(a.beds).join(' ') : '',
    sfxDefined: a ? Object.getOwnPropertyNames(Object.getPrototypeOf(a))
      .filter((k) => k.startsWith('_sfx_')).length : 0,
    narrationAvailable: !!(c.narration && c.narration.available),
  };
});
console.log('\n--- audio ---');
for (const [k, v] of Object.entries(audio)) console.log('  ' + k.padEnd(20) + ' ' + v);

// ---- is the player actually able to walk at the speed it claims? ----
const loco = await page.evaluate(async () => {
  const a = window.vrindavan;
  const c = a.ctx;
  // drop into open ground on the parikrama marg, clear of buildings and traffic
  const pari = c.data.PARIKRAMA.points;
  const q = pari[Math.floor(pari.length * 0.3)];
  c.player.position.set(q[0], c.world.groundHeight(q[0], q[1]), q[1]);
  c.player.setYaw(0);
  if (c.cameraRig) { c.cameraRig.yaw = c.cameraRig.yawTarget = 0; c.cameraRig.setMode('follow'); }
  await new Promise((r) => setTimeout(r, 500));

  const pad = document.getElementById('dpad');
  const up = pad && pad.querySelector('.dp.up');
  if (!up) return { ok: false };

  const t0 = performance.now();
  const sim0 = c.__simAccum || 0;
  const p0 = c.player.position.clone();
  up.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 21 }));
  await new Promise((r) => setTimeout(r, 3000));
  const p1 = c.player.position.clone();
  up.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 21 }));
  const secs = (performance.now() - t0) / 1000;

  const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  // how much SIMULATED time actually elapsed? dt is clamped at 50 ms, so a slow
  // renderer silently runs the world in slow motion.
  const simSecs = (c.__simAccum || 0) - sim0;
  return {
    ok: true,
    seconds: Math.round(secs * 10) / 10,
    metres: Math.round(dist * 100) / 100,
    metresPerSec: Math.round((dist / secs) * 100) / 100,
    expectedWalk: 1.5,
    peakSpeedReported: Math.round((c.player.speed || 0) * 100) / 100,
    simulatedSeconds: simSecs ? Math.round(simSecs * 100) / 100 : null,
    realFps: Math.round(a.fps),
  };
});
console.log('\n--- locomotion ---');
for (const [k, v] of Object.entries(loco)) console.log('  ' + k.padEnd(20) + ' ' + v);
  console.log('  metresPerSimSec      ' + (loco.simulatedSeconds ? Math.round(loco.metres / loco.simulatedSeconds * 100) / 100 : 'n/a'));
// judge against SIMULATED time: the headless renderer is far slower than any
// real phone, so wall-clock pace understates it. What matters is that a second
// of simulated time carries a second of walking.
const simPace = loco.simulatedSeconds ? loco.metres / loco.simulatedSeconds : 0;
console.log('  verdict              ' + (simPace > 1.25 && simPace < 1.75
  ? 'PASS - walks at 1.5 m/s of simulated time'
  : 'FAIL - pace is wrong (' + Math.round(simPace * 100) / 100 + ' m/s)'));

// ---- does moving the camera change where "forward" goes? It must not. ----
const indep = await page.evaluate(async () => {
  const a = window.vrindavan;
  const pad = document.getElementById('dpad');
  const press = async (sel, id, ms) => {
    const b = pad && pad.querySelector(sel);
    if (!b) return;
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id }));
    await new Promise((r) => setTimeout(r, ms));
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: id }));
  };
  const deg = (r) => Math.round(((r * 180 / Math.PI) % 360 + 360) % 360);

  // press forward, then swing the camera hard mid-walk. The path must not bend.
  const up2 = pad && pad.querySelector('.dp.up');
  if (!up2) return { metres: 0 };

  up2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 11 }));
  await new Promise((r) => setTimeout(r, 500));

  const mid1 = a.ctx.player.position.clone();
  const camYaw = a.ctx.cameraRig ? a.ctx.cameraRig.yaw : 0;
  const bodyYaw = a.ctx.player.yaw;

  // now wrench the camera 90 degrees while still holding forward
  if (a.ctx.cameraRig) {
    a.ctx.cameraRig.yaw = a.ctx.cameraRig.yawTarget = camYaw + Math.PI / 2;
  }
  await new Promise((r) => setTimeout(r, 1200));
  const mid2 = a.ctx.player.position.clone();
  up2.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 11 }));

  const before = mid1;
  const after = mid2;

  const moved = after.clone().sub(before);
  const travelled = Math.hypot(moved.x, moved.z);
  const movedYaw = Math.atan2(moved.x, moved.z);

  const diff = (x) => { let d = Math.abs(((x * 180 / Math.PI) % 360 + 540) % 360 - 180); return Math.round(d); };
  const legYaw = Math.atan2(mid2.x - mid1.x, mid2.z - mid1.z);
  return {
    headingHeldAfterCameraSwing: Math.round(Math.abs(((legYaw - bodyYaw) * 180 / Math.PI % 360 + 540) % 360 - 180)),
    bodyFacing: deg(bodyYaw),
    cameraFacing: deg(camYaw),
    walkedDirection: travelled > 0.15 ? deg(movedYaw) : null,
    metres: Math.round(travelled * 100) / 100,
    offFromBody: travelled > 0.15 ? diff(movedYaw - bodyYaw) : null,
    offFromCamera: travelled > 0.15 ? diff(movedYaw - camYaw) : null,
  };
});
console.log('\n--- camera independence ---');
for (const [k, v] of Object.entries(indep)) console.log('  ' + k.padEnd(16) + ' ' + v);
console.log('  verdict          ' + (indep.metres > 0.1 && indep.headingHeldAfterCameraSwing < 25
  ? 'PASS - the walk held its line while the camera swung 90 degrees'
  : 'FAIL - swinging the camera bent the path'));

// ---- can you walk through people? you should not be able to ----
const people = await page.evaluate(async () => {
  const a = window.vrindavan;
  const c = a.ctx;
  if (!c.crowd || !c.crowd.collideAgents) return { ok: false };

  // find a person, stand on top of them, and see if we get pushed out
  let victim = null;
  for (const slot of c.crowd.peopleInst) { if (slot.agents.length) { victim = slot.agents[0]; break; } }
  if (!victim) return { ok: false, why: 'no people' };

  const before = { x: victim.x + 0.02, z: victim.z + 0.02 };
  const pos = new (c.player.position.constructor)(before.x, 0, before.z);
  c.crowd.collideAgents(pos, 0.42);
  const pushed = Math.hypot(pos.x - before.x, pos.z - before.z);

  // and a vehicle
  let veh = null;
  for (const slot of c.crowd.vehicleInst) { if (slot.agents.length) { veh = slot.agents[0]; break; } }
  let vehPush = null;
  if (veh) {
    const vp = new (c.player.position.constructor)(veh.x + 0.05, 0, veh.z + 0.05);
    c.crowd.collideAgents(vp, 0.42);
    vehPush = Math.round(Math.hypot(vp.x - veh.x - 0.05, vp.z - veh.z - 0.05) * 100) / 100;
  }

  // and can we find someone to talk to?
  const speak = c.crowd.nearestSpeakable ? c.crowd.nearestSpeakable(victim.x, victim.z, 4) : null;

  return {
    ok: true,
    pushedOutOfPerson: Math.round(pushed * 100) / 100,
    pushedOutOfVehicle: vehPush,
    speakableFound: speak ? speak.kind : null,
    dialogueReady: !!c.dialogue,
    rickshawReady: !!c.rickshaw,
  };
});
console.log('\n--- people ---');
for (const [k, v] of Object.entries(people)) console.log('  ' + k.padEnd(20) + ' ' + v);
console.log('  verdict              ' + (people.pushedOutOfPerson > 0.1
  ? 'PASS - people are solid' : 'FAIL - you still walk through them'));

if (process.argv.includes('--shots')) {
  const dir = path.resolve(ROOT, '../docs/shots');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, 'boot.png') });
  // into the world, intro skipped, then let the follow camera settle
  await page.evaluate(() => {
    const a = window.vrindavan;
    if (a.ctx.ui) a.ctx.ui.show('world');
    if (a.ctx.cameraRig) a.ctx.cameraRig.setMode('follow');
  });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(dir, 'world.png') });

  // walk forward a little so the street is seen from eye level
  await page.evaluate(() => {
    const a = window.vrindavan;
    if (a.ctx.input) { a.ctx.input.move.x = 0; a.ctx.input.move.y = 1; }
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { const a = window.vrindavan; if (a.ctx.input) a.ctx.input.move.y = 0; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(dir, 'street.png') });

  // overhead diagnostic: does the real road network actually render?
  await page.evaluate(() => {
    const a = window.vrindavan;
    const c = a.ctx;
    a.paused = true;
    c.cameraRig = null;          // the rig would fight us for the camera
    if (c.scene.fog) c.scene.fog.density = 0.00012;
    c.camera.fov = 70;
    c.camera.updateProjectionMatrix();
    c.camera.position.set(120, 330, 420);
    c.camera.lookAt(120, 0, -60);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(dir, 'overhead.png') });

  // riverside: the Yamuna, the ghat and the planting along the bank
  await page.evaluate(() => {
    const a = window.vrindavan;
    const c = a.ctx;
    const k = c.data.LOCATION_BY_ID.get('keshi-ghat');
    const gx = k ? k.pos[0] : 800, gz = k ? k.pos[1] : -800;
    c.camera.position.set(gx - 70, c.world.groundHeight(gx - 70, gz + 80) + 26, gz + 90);
    c.camera.lookAt(gx, 2, gz - 20);
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(dir, 'riverside.png') });

  // Banke Bihari, from the lane in front of it
  await page.evaluate(() => {
    const a = window.vrindavan;
    const c = a.ctx;
    const bb = c.data.LOCATION_BY_ID.get('banke-bihari');
    if (!bb) return;
    const [bx, bz] = bb.pos;
    const back = 62;
    const cx = bx + Math.sin(bb.rot) * back;
    const cz = bz + Math.cos(bb.rot) * back;
    c.camera.position.set(cx, c.world.groundHeight(cx, cz) + 11, cz);
    c.camera.lookAt(bx, 11, bz);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(dir, 'temple.png') });

  // dusk: the lamps should come on
  await page.evaluate(() => {
    const a = window.vrindavan;
    const c = a.ctx;
    if (c.time) c.time.setPhase('evening', true);
    if (c.ui) c.ui.show('world');
    if (c.cameraRig) c.cameraRig.setMode('follow');
    const bb = c.data.LOCATION_BY_ID.get('banke-bihari');
    if (bb) {
      const back = 30;
      const px = bb.pos[0] + Math.sin(bb.rot) * back;
      const pz = bb.pos[1] + Math.cos(bb.rot) * back;
      c.player.position.set(px, c.world.groundHeight(px, pz), pz);
      c.player.setYaw(bb.rot + Math.PI);
    }
  });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(dir, 'evening.png') });

  // does the full map actually open and draw?
  await page.evaluate(() => { const a = window.vrindavan; a.paused = false; if (a.ctx.ui) a.ctx.ui.show('map'); });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(dir, 'map.png') });
  const mapState = await page.evaluate(() => {
    const m = window.vrindavan.ctx.map;
    const c = document.getElementById('worldmap');
    const scr = document.getElementById('screen-map');
    return {
      open: m ? m.open : null,
      canvas: c ? [c.width, c.height] : null,
      screenShown: scr ? scr.classList.contains('show') : null,
      zoom: m ? m._zoom : null,
      aerialTried: m ? !!m._aerialTried : null,
      aerialBuilt: m ? !!m.aerial : null,
      aerialSize: m && m.aerial ? [m.aerial.width, m.aerial.height] : null,
      aerialNotBlank: m && m.aerial ? (() => {
        const gg = m.aerial.getContext('2d');
        const d = gg.getImageData(1024, 1024, 8, 8).data;
        let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i+1] + d[i+2];
        return sum;
      })() : null,
    };
  });
  console.log('\n--- map ---');
  console.log(' ', JSON.stringify(mapState));
  console.log(`\nscreenshots -> docs/shots/`);
}

await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
