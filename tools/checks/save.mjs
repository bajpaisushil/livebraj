/**
 * Does the world remember you?
 *
 * Boots, walks somewhere, reloads the page, and checks you woke up where you
 * left off with your progress intact. The whole point of this check is that it
 * reloads for real — the bug it was written for only appeared on the way back
 * in, never on the way out, so anything that only inspects the written document
 * would have passed while the game forgot everything.
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
await new Promise((r) => server.listen(8793, r));

const results = [];
const errors = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctxb = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctxb.newPage();
p.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !/navigator\.vibrate/.test(t)) errors.push(t);
  if (/corrupt document discarded|save\] write failed/.test(t)) errors.push('SAVE: ' + t);
});
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const boot = async () => {
  await p.goto('http://localhost:8793/', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui, null, { timeout: 60000 });
  await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
  await p.waitForTimeout(700);
};

/* ---- first visit ---- */
await boot();
const first = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  return { x: ctx.player.position.x, z: ctx.player.position.z, rupees: ctx.state.rupees };
});
check('first launch starts at Chhatikara', Math.hypot(first.x + 6492, first.z - 2115) < 200,
  `[${Math.round(first.x)}, ${Math.round(first.z)}]`);

/* ---- make some state worth keeping ---- */
const made = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  // walk somewhere distinctive
  const target = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  ctx.player.position.set(target.pos[0] + 12, ctx.player.position.y, target.pos[1] + 12);
  if (ctx.player.setYaw) ctx.player.setYaw(1.234);
  ctx.state.rupees = 321;
  // set AFTER the move: teleporting emits player:moved, which correctly adds
  // the distance covered, so setting this first would have it overwritten
  await new Promise((r) => setTimeout(r, 700));
  ctx.state.metresWalked = 4567;
  ctx.state.discovered.add('iskcon-krishna-balaram');
  ctx.state.destination = 'banke-bihari';      // a null-default field holding a string
  ctx.state.carrying = { kind: 'marigold' };   // a null-default field holding an object
  window.vrindavan._persistPosition();         // the same call the exit hooks make
  await new Promise((r) => setTimeout(r, 300));
  const raw = localStorage.getItem('vrindavan-dham.v1');
  const doc = raw ? JSON.parse(raw) : null;
  return {
    wrote: !!doc,
    hasPos: !!(doc && doc.lastPosition),
    at: { x: ctx.player.position.x, z: ctx.player.position.z },
    doc: doc ? { rupees: doc.rupees, destination: doc.destination, carrying: doc.carrying,
                 metresWalked: Math.round(doc.metresWalked) } : null,
  };
});
check('the document is written with a position', made.wrote && made.hasPos,
  made.doc ? `rupees ${made.doc.rupees}, destination ${made.doc.destination}, carrying ${JSON.stringify(made.doc.carrying)}` : 'nothing written');

/* ---- reload, for real ---- */
await boot();
const back = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  return {
    x: ctx.player.position.x, z: ctx.player.position.z,
    yaw: ctx.player.yaw,
    rupees: ctx.state.rupees,
    metres: Math.round(ctx.state.metresWalked),
    destination: ctx.state.destination,
    carrying: ctx.state.carrying,
    discovered: ctx.state.discovered.has ? ctx.state.discovered.has('iskcon-krishna-balaram')
      : !!ctx.state.discovered['iskcon-krishna-balaram'],
  };
});
// The curtain must actually come up on a RETURNING launch.
//
// GameApp only hid the loading screen when there was no UI at all, trusting the
// screen it handed to. Only the intro does that, so a first launch worked and
// every launch afterwards sat for ever on "Ready" with a finished world running
// behind it. It survived every check in this suite because a check boots fresh;
// it only appears to someone who has played before. This is the check that
// would have caught it.
const curtain = await p.evaluate(() => {
  const l = document.getElementById("loading");
  if (!l) return { gone: true, why: "no loading element" };
  const cs = getComputedStyle(l);
  return { gone: l.classList.contains("gone") || cs.display === "none" || Number(cs.opacity) === 0,
           display: cs.display, opacity: cs.opacity };
});
check("the loading screen goes away on a returning launch", curtain.gone,
  `display ${curtain.display}, opacity ${curtain.opacity}`);

const drift = Math.hypot(back.x - made.at.x, back.z - made.at.z);
check('you wake up where you left off', drift < 5,
  `${drift.toFixed(1)} m from where you stopped [${Math.round(back.x)}, ${Math.round(back.z)}]`);
check('you are NOT back at Chhatikara', Math.hypot(back.x + 6492, back.z - 2115) > 400,
  `[${Math.round(back.x)}, ${Math.round(back.z)}]`);
check('your purse survived', back.rupees === 321, `₹${back.rupees} (expected 321)`);
// compare against what was actually written, not what we set: the teleport
// emits player:moved and the walk counter correctly grows after we set it,
// so the document is the only honest reference for "did this persist"
check('your distance walked survived', back.metres === made.doc.metresWalked,
  `${back.metres} m (document held ${made.doc.metresWalked})`);
check('a null-default string field survived', back.destination === 'banke-bihari',
  String(back.destination));
check('a null-default object field survived', !!back.carrying && back.carrying.kind === 'marigold',
  JSON.stringify(back.carrying));
check('what you discovered survived', back.discovered === true, String(back.discovered));

/* ================================================================
 * The native mirror — what stops Android eating your pilgrimage
 *
 * On a phone this runs in a WebView, and Android may clear a WebView's
 * localStorage under storage pressure without warning or ceremony. So every
 * write is mirrored to Capacitor Preferences, which maps to SharedPreferences
 * on Android and UserDefaults on iOS, and neither of those gets evicted; and at
 * boot the native copy is pulled back if it is newer than what the WebView
 * has. That is the whole of the protection, and none of it was tested — the
 * code path does not run in a browser at all, because there is no Capacitor
 * there to find.
 *
 * So it is driven directly, with a stub plugin standing in for the real one.
 * ================================================================ */
const mirror = await p.evaluate(async () => {
  const mod = await import('/src/engine/save/SaveSystem.js');

  // a stand-in for Capacitor Preferences, which behaves the way the real one
  // does: async, string-valued, and outside localStorage entirely
  const store = new Map();
  window.Capacitor = { Plugins: { Preferences: {
    async get({ key }) { return { value: store.has(key) ? store.get(key) : null }; },
    async set({ key, value }) { store.set(key, value); },
    async remove({ key }) { store.delete(key); },
  } } };

  const KEY = 'vd-mirror-test';
  const sys = new mod.SaveSystem(KEY);
  const found = !!sys.native;

  // write something, and see whether it reached the native side
  const st = sys.bind(sys.load());
  st.metresWalked = 4242;
  st.destination = 'radha-raman';
  sys.flush(st);
  await new Promise((r) => setTimeout(r, 60));
  const mirrored = store.has(KEY) ? JSON.parse(store.get(KEY)) : null;

  /*
   * Now the part that matters: Android clears the WebView. localStorage is
   * empty, the native copy is not, and the journey has to come back.
   */
  window.localStorage.removeItem(KEY);
  const sys2 = new mod.SaveSystem(KEY);
  const wiped = sys2.load();
  const recovered = await sys2.restoreFromNative(wiped);

  // and the other way round: a WebView copy NEWER than the native one wins
  const sys3 = new mod.SaveSystem(KEY);
  const fresh = sys3.bind(sys3.load ? sys3.load() : null);
  const newer = { ...JSON.parse(store.get(KEY)), metresWalked: 9999,
    updatedAt: new Date(Date.now() + 60000).toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(newer));
  const kept = await sys3.restoreFromNative(sys3.load());

  window.localStorage.removeItem(KEY);
  delete window.Capacitor;
  return {
    found,
    mirroredMetres: mirrored ? mirrored.metresWalked : null,
    hasStamp: !!(mirrored && mirrored.updatedAt && mirrored.id),
    wipedMetres: wiped.metresWalked,
    recoveredMetres: recovered.metresWalked,
    recoveredDest: recovered.destination,
    keptMetres: kept.metresWalked,
    unused: fresh === null ? 0 : 0,
  };
});

check('the native store is found when the app provides one', mirror.found,
  mirror.found ? 'Capacitor Preferences picked up' : 'not detected');
check('every write is mirrored to it', mirror.mirroredMetres === 4242 && mirror.hasStamp,
  `${mirror.mirroredMetres} m mirrored, stamped ${mirror.hasStamp}`);
check('a cleared WebView really does lose the journey',
  mirror.wipedMetres === 0,
  `${mirror.wipedMetres} m left in localStorage after the wipe`);
check('and the native copy brings it back',
  mirror.recoveredMetres === 4242 && mirror.recoveredDest === 'radha-raman',
  `${mirror.recoveredMetres} m and ${mirror.recoveredDest} recovered`);
check('a newer WebView document is not overwritten by an older native one',
  mirror.keptMetres === 9999,
  `${mirror.keptMetres} m kept`);

console.log('');
if (errors.length) { console.log('ERRORS:'); errors.slice(0, 6).forEach((e) => console.log('  ' + e)); }
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed, ${errors.length} errors`);
await b.close(); server.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
