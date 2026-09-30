/**
 * "Start from here", the way a person uses it: on a phone, open the map, type
 * in the search box, tap the result, tap the button — on foot AND mid-ride.
 *
 * "start from here not working in map", then "still 'start from here' does not
 * work?". map-search.mjs had passed its rescue test every run, because it
 * called player.placeAt() directly and never touched the button. Done the
 * person's way, in a rickshaw, it failed three ways at once:
 *
 *   1. the ride's window key listener ate the search: the d in "Radha Raman"
 *      took the wheel, any s stopped the ride, and the box read "Raha Raman";
 *   2. the ride bar stayed up over the map and sat on the button;
 *   3. the ride held the player to its seat every frame, undoing the move.
 */
import { chromium, devices } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('../../client/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let pth = decodeURIComponent(req.url.split('?')[0]);
    if (pth.endsWith('/')) pth += 'index.html';
    const body = await readFile(join(ROOT, pth));
    res.writeHead(200, { 'content-type': TYPES[extname(pth)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const res = [];
const check = (name, ok, detail = '') => {
  res.push(!!ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const phone = await b.newContext({ ...devices['Pixel 5'] });
const p = await phone.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui
  && window.vrindavan?.ctx?.map && window.vrindavan?.ctx?.world?.anchors
  && window.vrindavan?.ctx?.rickshaw && window.vrindavan?.ctx?.crowd?.vehicleInst, null, { timeout: 220000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));

const TARGET = 'radha-raman';
const frames = (n) => p.evaluate(async (k) => { for (let i = 0; i < k; i++) await new Promise((r) => requestAnimationFrame(r)); }, n);
const rideState = () => p.evaluate(() => window.vrindavan.ctx.rickshaw.state);
const fromTarget = () => p.evaluate((id) => {
  const c = window.vrindavan.ctx, a = c.world.anchors[id], q = c.player.position;
  return Math.hypot(q.x - a.darshan.x, q.z - a.darshan.z);
}, TARGET);

/** Search, tap the result, report the card and whether its button is really on top. */
const findAndOpen = async (words) => {
  await p.evaluate(() => window.vrindavan.ctx.ui.show('map'));
  await frames(20);
  const q = p.locator('#map-q');
  await q.tap({ timeout: 20000 });
  for (const w of words) {                       // each word typed, then cleared
    await q.fill('');
    await q.type(w, { delay: 25 });
  }
  const typed = await q.inputValue();
  await frames(20);
  const hit = p.locator(`#map-hits li[data-id="${TARGET}"]`);
  const found = await hit.count();
  if (found) await hit.first().tap({ timeout: 20000 });
  await frames(30);
  const card = await p.evaluate(() => {
    const s = document.getElementById('map-sel');
    const btn = s && s.querySelector('[data-here]');
    if (!btn || !s.classList.contains('show')) return { shown: false };
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { shown: true, onTop: top === btn || btn.contains(top),
      covered: top && top !== btn ? (top.id || top.className || top.tagName) : null };
  });
  return { typed, found: !!found, card };
};
const pressButton = async () => {
  await p.locator('#map-sel [data-here]').tap({ timeout: 30000 });
  await frames(30);
  const at = await fromTarget();
  await frames(150);                              // time for anything to snap you back
  return { at, later: await fromTarget(), screen: await p.evaluate(() => window.vrindavan.ctx.ui.screen) };
};

/* ---- 1. on foot ---- */
{
  const o = await findAndOpen(['Radha Raman']);
  check('on foot: the search finds the place', o.found, `typed "${o.typed}"`);
  check('on foot: tapping the result opens its card, with the button on top',
    o.card.shown && o.card.onTop, JSON.stringify(o.card));
  const m = await pressButton();
  check('on foot: the button puts you there, and you stay there',
    m.at < 3 && m.later < 3 && m.screen === 'world', `${m.at.toFixed(1)} m, then ${m.later.toFixed(1)} m, on "${m.screen}"`);
}

/* ---- 2. mid-ride ---- */
const boarded = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, r = ctx.rickshaw;
  const chhat = ctx.data.LOCATIONS.find((l) => l.id === 'chhatikara-crossing');
  ctx.player.placeAt(ctx, chhat.pos[0], chhat.pos[1]);
  r.state = 'idle'; r.ride = null; r._boarding = null; r.pending = null;
  let v = null;
  for (const slot of ctx.crowd.vehicleInst) if (slot.agents.length) { v = slot.agents[0]; break; }
  if (!v) return 'no vehicle';
  v.x = ctx.player.position.x + 4; v.z = ctx.player.position.z; v.chartered = false;
  r._acc = 99; r.update(0.5, ctx);
  if (!r.target) return 'no hail target';
  r.board();
  const frame = () => new Promise((res) => requestAnimationFrame(res));
  for (let i = 0; i < 600 && r.state === 'boarding'; i++) await frame();
  const el = document.querySelector('[data-go="iskcon-krishna-balaram"]');
  if (!el) return 'ISKCON not offered';
  el.click();
  for (let i = 0; i < 90 && r.state !== 'waiting'; i++) await frame();
  if (!r.startRide()) return 'start refused';
  for (let i = 0; i < 60; i++) await frame();
  return r.state;
});
check('a rickshaw ride is under way', boarded === 'riding', String(boarded));
if (boarded === 'riding') {
  // "Seva Kunj" has the s that used to stop the ride; "Radha Raman" the d that took the wheel
  const o = await findAndOpen(['Seva Kunj', 'Radha Raman']);
  const still = await rideState();
  check('mid-ride: typing in the search box does not drive, stop or steal letters',
    o.typed === 'Radha Raman' && still === 'riding', `box read "${o.typed}", ride "${still}"`);
  check('mid-ride: the card opens and nothing covers its button', o.card.shown && o.card.onTop,
    JSON.stringify(o.card));
  const m = await pressButton();
  const after = await rideState();
  check('mid-ride: the button gets you out and puts you there, and you stay there',
    after === 'idle' && m.at < 3 && m.later < 3 && m.screen === 'world',
    `ride "${after}", ${m.at.toFixed(1)} m, then ${m.later.toFixed(1)} m, on "${m.screen}"`);
}
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log('');
const passed = res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed === res.length ? 0 : 1);
