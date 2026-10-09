/**
 * Everything the map shows, you can walk to — on a fresh save, the way a new
 * player meets it.
 *
 * "it shows no option to walk to yamuna ghat that shows in map fix it". The
 * map drew every landmark's icon (faint until visited) and named Keshi Ghat
 * and Kaliya Ghat across the whole-town view, but a tap only answered for
 * places already visited: tapping Keshi Ghat gave a road name and nothing
 * else. Search opened "Walk here" for the 28 landmarks only — OSM's other
 * ghats, the roads, the localities closed the panel — and the Yamuna could
 * be neither tapped nor searched.
 *
 * map-search.mjs never saw it: it marks every place discovered first.
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
// the check owns the clock, as starthere.mjs does: taps are real, frames are stepped
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true,
    get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui
  && window.vrindavan?.ctx?.map && window.vrindavan?.ctx?.nav && window.vrindavan?.ctx?.world?.anchors,
  null, { timeout: 220000 });
await p.evaluate(() => {
  const app = window.vrindavan, ctx = app.ctx;
  ctx.clock.getDelta = () => 1 / 30;
  ctx.renderer.render = (scene, camera) => {
    if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
  };
  ctx.ui._endIntro();
  ctx.ui.show('map');
  for (let i = 0; i < 10; i++) app._frame();
});
const frames = (n) => p.evaluate((k) => { for (let i = 0; i < k; i++) window.vrindavan._frame(); }, n);

/** Centre the map on a point at a zoom, draw it, and return a location's screen point. */
const view = (x, z, zoom, id) => p.evaluate(([x, z, zoom, id]) => {
  const m = window.vrindavan.ctx.map;
  if (!m.open) window.vrindavan.ctx.ui.show('map');
  m._focusTo = null; m._mode = 'focus';
  m._pan.x = x; m._pan.z = z; m._zoom = zoom;
  m._drawFull(true);
  if (!id) return null;
  const k = window.vrindavan.ctx.data.LOCATION_BY_ID.get(id);
  const [sx, sy] = m._toScreen(k.pos[0], k.pos[1]);
  return [sx / m.fullDpr, sy / m.fullDpr];
}, [x, z, zoom, id]);
const panel = () => p.evaluate(() => {
  const el = document.getElementById('map-sel');
  if (!el.classList.contains('show')) return null;
  return { name: el.querySelector('.nm').textContent, walk: !!el.querySelector('[data-walk]') };
});
const dismiss = () => p.evaluate(() => {
  const m = window.vrindavan.ctx.map;
  m.sel.classList.remove('show'); m._selected = null; m._highlight = null;
  m.setDestination(null);
});

/* ---- 0. the save is fresh: the ghats have not been found ---- */
const fresh = await p.evaluate(() => {
  const g = window.vrindavan.ctx;
  return { found: [...g.state.discovered], places: g.data.LOCATIONS.map((l) => [l.id, l.name, l.pos]) };
});
const GHATS = ['keshi-ghat', 'kaliya-ghat', 'chir-ghat', 'yugal-ghat'];
check('a fresh save has found none of the ghats', GHATS.every((id) => !fresh.found.includes(id)),
  `discovered: ${fresh.found.join(', ') || 'nothing'}`);

/* ---- 1. every landmark's icon answers a tap, visited or not ---- */
const missed = [];
for (const [id, name, pos] of fresh.places) {
  const xy = await view(pos[0], pos[1], 0.3, id);
  await p.mouse.click(xy[0], xy[1]);
  const s = await panel();
  if (!s || s.name !== name || !s.walk) missed.push(`${id} → ${s ? s.name : 'no panel'}`);
  await dismiss();
}
check('tapping any landmark opens it with "Walk here", unvisited included',
  missed.length === 0, `${fresh.places.length - missed.length}/${fresh.places.length}${missed.length ? ' — ' + missed.slice(0, 4).join('; ') : ''}`);

/* ---- 2. the whole-town view: tap the words KESHI GHAT ---- */
const kpos = fresh.places.find((q) => q[0] === 'keshi-ghat')[2];
await view(kpos[0], kpos[1], 0.12);
const lab = await p.evaluate(() => {
  const m = window.vrindavan.ctx.map;
  const h = (m._labelHits || []).find((q) => q.loc.id === 'keshi-ghat');
  return h ? h.box.map((v) => v / m.fullDpr) : null;
});
if (lab) {
  // the right-hand end of the word, well clear of the place's own point
  await p.mouse.click(lab[0] + (lab[2] - lab[0]) * 0.85, (lab[1] + lab[3]) / 2);
}
const far = await panel();
check('the whole-town label KESHI GHAT is itself a button', far && far.name === 'Shri Keshi Ghat' && far.walk,
  lab ? (far ? far.name : 'no panel') : 'label not drawn');

/* ---- 3. walking to an unvisited ghat lays a route ---- */
await p.evaluate(() => document.querySelector('#map-sel.show [data-walk]')?.click());
await frames(2);
const walk1 = await p.evaluate(() => {
  const m = window.vrindavan.ctx.map;
  return { id: m.destination && m.destination.id, route: m.route ? m.route.length : 0 };
});
check('"Walk here" on unvisited Keshi Ghat routes you there', walk1.id === 'keshi-ghat' && walk1.route > 1,
  `${walk1.id}, ${walk1.route} route points`);
await dismiss();

/* ---- 4. every kind of search hit opens "Walk here", and walking works ---- */
const search = async (q, id) => {
  await p.evaluate(() => window.vrindavan.ctx.ui.show('map'));
  await p.fill('#map-q', '');
  await p.fill('#map-q', q);
  await p.waitForFunction((id) => !!document.querySelector(`#map-hits li[data-id="${id}"]`), id, { timeout: 5000 }).catch(() => {});
  const rows = await p.$$eval('#map-hits li[data-id]', (ls) => ls.map((l) => l.dataset.id));
  const hit = p.locator(`#map-hits li[data-id="${id}"]`);
  if (!(await hit.count())) return { rows, shown: null };
  await hit.first().tap({ timeout: 20000 });
  await frames(4);
  const shown = await panel();
  if (shown && shown.walk) await p.locator('#map-sel [data-walk]').tap({ timeout: 20000 });
  await frames(2);
  const dest = await p.evaluate(() => {
    const g = window.vrindavan.ctx, m = g.map, d = m.destination;
    return d ? { id: d.id, pos: d.pos, route: m.route ? m.route.length : 0, saved: g.state.destination } : null;
  });
  return { rows, shown, dest };
};
const KINDS = [
  ['an OSM ghat', 'surya ghat', null],
  ['a road', 'parikram marg', 'road:'],
  ['a locality', 'yamuna ghats', 'area:'],
  ['the river', 'yamuna', 'river:yamuna'],
];
const ids = await p.evaluate(() => {
  const s = window.vrindavan.ctx.map._search;
  const by = (f) => (s.find(f) || {}).id;
  return {
    poi: by((e) => e.kind === 'poi' && /surya ghat/i.test(e.name)),
    road: by((e) => e.kind === 'road' && /^parikram marg$/i.test(e.name)),
    area: by((e) => e.kind === 'area' && /yamuna ghats/i.test(e.name)),
  };
});
const want = [ids.poi, ids.road, ids.area, 'river:yamuna'];
for (let i = 0; i < KINDS.length; i++) {
  const [label, q] = KINDS[i];
  const id = want[i];
  const r = id ? await search(q, id) : { shown: null };
  const ok = r.shown && r.shown.walk && r.dest && r.dest.id === id && r.dest.saved === id
    && Number.isFinite(r.dest.pos[0]) && r.dest.route > 1;
  check(`searching ${label} ("${q}") opens "Walk here" and routes you`, ok,
    r.shown ? `${r.shown.name}, ${r.dest ? r.dest.route + ' route points' : 'no destination'}`
      : r.rows && r.rows.includes(id) ? 'the row opened no panel' : `no row for ${id}`);
  if (label === 'a road' && r.dest) {
    const off = await p.evaluate(([name, pos]) => {
      let best = Infinity;
      for (const road of window.vrindavan.ctx.data.ROADS) {
        if (road.name !== name) continue;
        const q = road.points;
        for (let k = 1; k < q.length; k++) {
          const ax = q[k - 1][0], az = q[k - 1][1], sx = q[k][0] - ax, sz = q[k][1] - az;
          const t = Math.max(0, Math.min(1, ((pos[0] - ax) * sx + (pos[1] - az) * sz) / (sx * sx + sz * sz || 1)));
          best = Math.min(best, Math.hypot(pos[0] - ax - sx * t, pos[1] - az - sz * t));
        }
      }
      return best;
    }, [r.shown.name, r.dest.pos]);
    check('a road destination is a point ON the road', off < 0.5, `${off.toFixed(2)} m off it`);
  }
  await dismiss();
}

const yg = await search('yamuna ghat', 'river:yamuna');
const listed = ['river:yamuna', ...GHATS].filter((id) => yg.rows.includes(id));
check('"yamuna ghat" lists the river and all four ghats', listed.length === 5, listed.join(', '));
await dismiss();

/* ---- 5. the river from three starting points: your bank, dry, reachable ---- */
const STARTS = [['Chhatikara', null], ['Banke Bihari', [0, 30]], ['Prem Mandir', [-1834, 875]]];
const rivers = await p.evaluate((starts) => {
  const g = window.vrindavan.ctx, m = g.map, w = g.world;
  const home = { x: g.player.position.x, z: g.player.position.z };
  const out = [];
  for (const [name, at] of starts) {
    const x = at ? at[0] : home.x, z = at ? at[1] : home.z;
    g.player.position.x = x; g.player.position.z = z;
    const t = m._riverTarget();
    const [tx, tz] = t.pos;
    let near = Infinity;
    for (let r = 2; r <= 20 && near === Infinity; r += 2) {
      for (let a = 0; a < 32; a++) {
        if (w.isWater(tx + Math.cos(a / 32 * 6.2832) * r, tz + Math.sin(a / 32 * 6.2832) * r)) { near = r; break; }
      }
    }
    const path = g.nav.path(x, z, tx, tz);
    const end = path ? path[path.length - 1] : null;
    out.push({ name, dry: !w.isWater(tx, tz), near, sameSide: w._acrossRiver(tx, tz) === w._acrossRiver(x, z),
      path: path ? path.length : 0, crow: Math.round(Math.hypot(tx - x, tz - z)),
      endGap: end ? Math.round(Math.hypot(end[0] - tx, end[1] - tz)) : Infinity });
  }
  g.player.position.x = home.x; g.player.position.z = home.z;
  return out;
}, STARTS);
for (const r of rivers) {
  check(`from ${r.name}, "the Yamuna" is the water's edge on your bank, with a way there`,
    r.dry && r.near <= 14 && r.sameSide && r.path > 1 && r.endGap <= 40,
    `${r.crow} m off, water ${r.near} m from it, ${r.sameSide ? 'your bank' : 'THE FAR BANK'}, `
    + `${r.path ? r.path + ' route points ending ' + r.endGap + ' m short' : 'NO ROUTE'}`);
}

/* ---- 6. a tap on the water is the Yamuna, and the bank across from the tap ---- */
const wet = await p.evaluate(() => {
  const g = window.vrindavan.ctx, r = g.data.RIVER;
  // midstream, roughly north of the old town
  let best = null;
  for (const q of r.points) if (g.world.isWater(q[0], q[1]) && (!best || Math.hypot(q[0], q[1] + 600) < Math.hypot(best[0], best[1] + 600))) best = q;
  return best;
});
await view(wet[0], wet[1], 0.3);
const tapAt = await p.evaluate(([x, z]) => {
  const m = window.vrindavan.ctx.map;
  const [sx, sy] = m._toScreen(x, z);
  return [sx / m.fullDpr, sy / m.fullDpr];
}, wet);
await p.mouse.click(tapAt[0], tapAt[1]);
const wp = await panel();
await p.evaluate(() => document.querySelector('#map-sel.show [data-walk]')?.click());
await frames(2);
const wd = await p.evaluate((wet) => {
  const d = window.vrindavan.ctx.map.destination;
  return d ? { id: d.id, off: Math.round(Math.hypot(d.pos[0] - wet[0], d.pos[1] - wet[1])) } : null;
}, wet);
check('a tap on the water opens the Yamuna, and walks you to the bank across from it',
  wp && wp.name === 'Yamuna' && wp.walk && wd && wd.id === 'river:yamuna' && wd.off < 400,
  `${wp ? wp.name : 'no panel'}${wd ? `, bank ${wd.off} m from the tap` : ''}`);
await dismiss();

/* ---- 7. a saved destination of any kind comes back ---- */
const back = await p.evaluate((idsIn) => {
  const m = window.vrindavan.ctx.map;
  return idsIn.map((id) => { m.setDestination(null); m.setDestination(id); return !!(m.destination && m.destination.id === id); });
}, [ids.poi, ids.road, ids.area, 'river:yamuna', 'kaliya-ghat']);
check('a saved destination of every kind resolves again', back.every(Boolean), back.map((v) => (v ? 'ok' : 'LOST')).join(' '));

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await b.close();
server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
