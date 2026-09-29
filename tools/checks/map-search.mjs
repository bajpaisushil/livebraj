/**
 * Behavioural test for map search and select-to-navigate.
 * Boots the real client, types into the real input, clicks real rows.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.cwd(), 'client');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(8789, r));


const PORT = 8789;
const URL = `http://localhost:${PORT}/`;
const errors = [];
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/navigator.vibrate/.test(t)) errors.push(t); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.vrindavan?.ctx?.map && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.player, null, { timeout: 60000 });

// skip the intro and reveal everything so search has a full corpus
await page.evaluate(() => {
  const g = window.vrindavan.ctx;
  for (const l of g.data.LOCATIONS) {
    if (g.state.discovered instanceof Set) g.state.discovered.add(l.id);
    else g.state.discovered[l.id] = true;
  }
  g.ui.show('map');
});
await page.waitForTimeout(700);

/* ---- 1. index built ---- */
const idx = await page.evaluate(() => {
  const s = window.vrindavan.ctx.map._search || [];
  const by = {};
  for (const e of s) by[e.kind] = (by[e.kind] || 0) + 1;
  return { total: s.length, by };
});
check('search index built', idx.total > 25, `${idx.total} entries ${JSON.stringify(idx.by)}`);
check('roads deduped by name', (idx.by.road || 0) > 0 && (idx.by.road || 0) < 15,
  `${idx.by.road} road entries from 2146 ways`);

/* ---- 2. fuzzy matching ---- */
const q = await page.evaluate(() => {
  const m = window.vrindavan.ctx.map;
  const t = (s) => m._searchFor(s).map((h) => h.e.name);
  return {
    iskon: t('iskon'), bhakti: t('bhakti'), radha: t('radha'),
    noShri: t('radha raman'), chhat: t('chhatikara'), junk: t('zzqq'),
  };
});
check('finds ISKCON from "iskon"', q.iskon.some((n) => /Krishna Balaram/i.test(n)), q.iskon[0] || 'none');
check('finds road from "bhakti"', q.bhakti.some((n) => /Bhaktivedanta/i.test(n)), q.bhakti[0] || 'none');
check('"radha" lists the Radha temples', q.radha.length >= 3, q.radha.slice(0, 3).join(', '));
check('ignores a leading Shri', q.noShri.some((n) => /Radha Raman/i.test(n)), q.noShri[0] || 'none');
check('finds Chhatikara', q.chhat.length > 0, q.chhat[0] || 'none');
check('no match for nonsense', q.junk.length === 0, `${q.junk.length} hits`);

/* ---- 3. the real input renders real rows ---- */
await page.fill('#map-q', 'keshi');
await page.waitForTimeout(260);
const rows = await page.$$eval('#map-hits li', (ls) =>
  ls.map((l) => ({ id: l.dataset.id, name: l.querySelector('.n')?.textContent, d: l.querySelector('.d')?.textContent })));
check('typing renders result rows', rows.length > 0 && !!rows[0].name,
  rows.map((r) => `${r.name} (${r.d})`).join(', ') || 'none');
check('rows carry a distance', rows.every((r) => r.d && /\d/.test(r.d)), rows[0]?.d || '');

/* ---- 4. clicking a row flies there and rings it ---- */
const before = await page.evaluate(() => ({ ...window.vrindavan.ctx.map._pan, zoom: window.vrindavan.ctx.map._zoom }));
await page.click('#map-hits li:first-child');
await page.waitForTimeout(1600);
const after = await page.evaluate(() => {
  const m = window.vrindavan.ctx.map;
  return { pan: { ...m._pan }, zoom: m._zoom, hl: m._highlight ? m._highlight.name : null,
           selShown: document.getElementById('map-sel')?.classList.contains('show') };
});
const moved = Math.hypot(after.pan.x - before.x, after.pan.z - before.z);
check('map flew to the hit', moved > 50, `moved ${Math.round(moved)} m, zoom ${before.zoom.toFixed(2)} -> ${after.zoom.toFixed(2)}`);
check('hit is highlighted', !!after.hl, after.hl || 'none');
check('landmark opens its panel', after.selShown === true, String(after.selShown));

/* ---- 5. the panel answers "how far" ---- */
const panel = await page.evaluate(() => {
  const s = document.getElementById('map-sel');
  return { nm: s?.querySelector('.nm')?.textContent, via: s?.querySelector('.via')?.textContent?.trim().replace(/\s+/g, ' '),
           dist: s?.querySelector('.dist')?.textContent, walk: !!s?.querySelector('[data-walk]') };
});
check('panel names the place', !!panel.nm, panel.nm || '');
check('panel shows straight-line distance', /\d/.test(panel.dist || ''), panel.dist || 'none');
check('panel shows walking distance + road', /on foot/.test(panel.via || ''), panel.via || 'NONE');

/* ---- 6. Walk here sets a route ---- */
await page.evaluate(() => window.vrindavan.ctx.ui.show('map'));
await page.waitForTimeout(300);
const nav = await page.evaluate(() => {
  const m = window.vrindavan.ctx.map;
  const loc = m._selected;
  if (!loc) return { ok: false };
  m.setDestination(loc.id);
  return { ok: true, dest: m.destination?.name, route: m.route ? m.route.length : 0 };
});
check('Walk here builds a route', nav.ok && nav.route > 1, `${nav.dest}: ${nav.route} nodes`);

/* ---- 6b. typing a name with an 'm' in it must not close the map ---- */
/*
 * `m` toggles the map, and the map has a search box. Every second place in
 * Vrindavan has an m in it — Madan Mohan, Prem Mandir, Imli Tala, and the
 * word "mandir" itself — so this threw you out of the map on the first
 * keystroke. Two window keydown listeners existed; InputManager guarded
 * against typing and the UI's own one did not.
 */
await page.evaluate(() => window.vrindavan.ctx.ui.show('map'));
await page.waitForFunction(() => window.vrindavan.ctx.ui.screen === 'map', null, { timeout: 8000 });
await page.focus('#map-q');
// clear what earlier steps left in the field, or this asserts on their text
await page.fill('#map-q', '');
await page.type('#map-q', 'madan mohan', { delay: 12 });
const typed = await page.evaluate(() => ({
  screen: window.vrindavan.ctx.ui.screen,
  value: document.getElementById('map-q').value,
  focused: document.activeElement && document.activeElement.id,
}));
check('typing a name with an m in it stays on the map',
  typed.screen === 'map', `screen is "${typed.screen}"`);
check('and every letter reaches the field',
  typed.value === 'madan mohan', `field holds "${typed.value}"`);
check('and the field keeps focus while typing',
  typed.focused === 'map-q', `focus on "${typed.focused}"`);

// Escape should get you out of the field without closing the whole screen
await page.keyboard.press('Escape');
const esc = await page.evaluate(() => ({
  screen: window.vrindavan.ctx.ui.screen,
  focused: document.activeElement && document.activeElement.id,
}));
check('Escape leaves the field, not the map',
  esc.screen === 'map' && esc.focused !== 'map-q',
  `screen "${esc.screen}", focus "${esc.focused}"`);

// and with nothing focused, m still toggles
await page.keyboard.press('m');
const toggled = await page.evaluate(() => window.vrindavan.ctx.ui.screen);
check('m still toggles the map when not typing', toggled === 'world', `screen "${toggled}"`);
await page.evaluate(() => window.vrindavan.ctx.ui.show('map'));
await page.evaluate(() => { document.getElementById('map-q').value = ''; });

/* ---- 6c. "Start from here" actually moves you, and to standable ground ---- */
/*
 * The point of this button is recovery, so the test has to be a recovery:
 * bury the player inside a temple's masonry first, then use it, then check
 * they can WALK afterwards. A teleport that lands you somewhere you cannot
 * move from would pass a "did the position change" test and fail the player.
 */
const rescue = await page.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const target = ctx.data.LOCATIONS.find((l) => l.id === 'radha-raman')
    || ctx.data.LOCATIONS[0];
  // wedge the player inside the middle of a building
  const wall = ctx.data.LOCATIONS.find((l) => l.id === 'banke-bihari') || target;
  ctx.player.root.position.set(wall.pos[0], ctx.world.groundHeight(wall.pos[0], wall.pos[1]), wall.pos[1]);
  const before = { x: ctx.player.root.position.x, z: ctx.player.root.position.z };

  const ok = ctx.player.placeAt(ctx, target.pos[0], target.pos[1]);
  const after = { x: ctx.player.root.position.x, z: ctx.player.root.position.z };

  // can a body actually walk away from where it was put?
  const R = 0.42, STEP_UP = 0.52;
  const feet = ctx.world.standHeight(after.x, after.z, ctx.world.groundHeight(after.x, after.z));
  let freeDirs = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    let x = after.x, z = after.z, f = feet, got = 0;
    for (let i = 0; i < 25; i++) {
      const nx = x + Math.cos(a) * 0.12, nz = z + Math.sin(a) * 0.12;
      const q = { x: nx, y: 0, z: nz };
      ctx.world.collide(q, R, f);
      if (Math.hypot(q.x - nx, q.z - nz) > 0.02) break;
      const h = ctx.world.standHeight(nx, nz, f);
      if (h === null || h === undefined || h - f > STEP_UP) break;
      x = nx; z = nz; f = h; got += 0.12;
    }
    if (got > 1.5) freeDirs++;
  }
  return {
    ok, movedBy: Math.hypot(after.x - before.x, after.z - before.z),
    nearTarget: Math.hypot(after.x - target.pos[0], after.z - target.pos[1]),
    freeDirs, name: target.name,
  };
});
check('Start from here reports success', rescue.ok, rescue.ok ? 'placed' : 'found no standable ground');
check('and actually moves the player', rescue.movedBy > 50, `moved ${rescue.movedBy.toFixed(0)} m`);
check('landing near the place asked for', rescue.nearTarget < 40,
  `${rescue.nearTarget.toFixed(0)} m from ${rescue.name}`);
check('and you can walk away from where it put you',
  rescue.freeDirs >= 5, `${rescue.freeDirs}/8 directions open`);

/* ---- 7. shots across zoom ---- */
await page.evaluate(() => { const m = window.vrindavan.ctx.map; m.fitWorld(); m._mapDirty = true; m._drawFull(true); });
await page.waitForTimeout(500);
await page.screenshot({ path: 'docs/shots/map-search-world.png' });
await page.fill('#map-q', 'prem');
await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/shots/map-search-open.png' });

console.log('');
const bad = results.filter((r) => !r.pass);
if (errors.length) { console.log('CONSOLE ERRORS:'); for (const e of errors.slice(0, 8)) console.log('  ' + e); }
console.log(`${results.length - bad.length}/${results.length} passed, ${errors.length} console errors`);
await browser.close(); server.close();
process.exit(bad.length || errors.length ? 1 : 0);
