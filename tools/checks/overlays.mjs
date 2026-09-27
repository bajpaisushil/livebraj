/**
 * Can you actually press the buttons?
 *
 * Every panel that floats over the world competes with #touch-layer, which is
 * full-screen, sits late in the document and carries z-index:1. Anything with
 * no z-index of its own paints underneath it and becomes unclickable while
 * looking perfectly fine. That has now happened three times — the HUD buttons,
 * the map controls, and the story card, which opened and could not be closed.
 *
 * So this does not read CSS. It opens each panel for real and asks the browser
 * what element is actually on top at the centre of each button.
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
await new Promise((r) => server.listen(8795, r));

const results = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:8795/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.player, null, { timeout: 60000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(700);

/** Is every button in this panel the topmost thing at its own centre? */
const reachable = (sel) => p.evaluate((s) => {
  const panel = document.querySelector(s);
  if (!panel) return { ok: false, why: 'panel missing' };
  const cs = getComputedStyle(panel);
  if (cs.display === 'none' || cs.visibility === 'hidden') return { ok: false, why: 'panel not shown' };
  const btns = [...panel.querySelectorAll('button')];
  if (!btns.length) return { ok: false, why: 'no buttons' };
  const blocked = [];
  for (const btn of btns) {
    const r = btn.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top !== btn && !btn.contains(top)) {
      blocked.push((btn.textContent || btn.ariaLabel || '?').trim().slice(0, 18)
        + ' <- ' + (top ? (top.id || top.className || top.tagName) : 'nothing'));
    }
  }
  return { ok: blocked.length === 0, n: btns.length, blocked };
}, sel);

/* ---- the story card: the one that could not be closed ---- */
await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.card(ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram'));
});
// the card slides up over 0.5 s; measuring mid-animation puts its buttons
// below the fold and elementFromPoint returns null
await p.waitForTimeout(900);
let r = await reachable('#card');
check('story card buttons are clickable', r.ok,
  r.ok ? `${r.n} buttons on top` : (r.blocked ? r.blocked.join('; ') : r.why));

// and Close actually closes it
const closed = await p.evaluate(async () => {
  const c = document.getElementById('card');
  const btn = c.querySelector('[data-card="close"]');
  btn.click();
  await new Promise((r) => setTimeout(r, 200));
  return !c.classList.contains('show');
});
check('Close actually dismisses the card', closed, String(closed));

/* ---- the HUD ---- */
r = await reachable('#hud');
check('HUD buttons are clickable', r.ok, r.ok ? `${r.n} buttons on top` : (r.blocked ? r.blocked.join('; ') : r.why));

/* ---- the D-pad ---- */
r = await reachable('#dpad');
check('D-pad buttons are clickable', r.ok, r.ok ? `${r.n} buttons on top` : (r.blocked ? r.blocked.join('; ') : r.why));

/* ---- the map, with search and a selection open ---- */
await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  for (const l of ctx.data.LOCATIONS) {
    if (ctx.state.discovered.add) ctx.state.discovered.add(l.id); else ctx.state.discovered[l.id] = true;
  }
  ctx.ui.show('map');
});
await p.waitForTimeout(700);
r = await reachable('#map-search');
check('map search is clickable', r.ok, r.ok ? `${r.n} buttons on top` : (r.blocked ? r.blocked.join('; ') : r.why));
r = await reachable('#map-zoom');
check('map zoom buttons are clickable', r.ok, r.ok ? `${r.n} buttons on top` : (r.blocked ? r.blocked.join('; ') : r.why));

await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  ctx.map._showSel(ctx.data.LOCATION_BY_ID.get('banke-bihari'));
});
await p.waitForTimeout(300);
r = await reachable('#map-sel');
check('map selection panel is clickable', r.ok, r.ok ? `${r.n} buttons on top` : (r.blocked ? r.blocked.join('; ') : r.why));

console.log('');
if (errors.length) { console.log('PAGE ERRORS:'); errors.slice(0, 4).forEach((e) => console.log('  ' + e)); }
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} panels reachable, ${errors.length} page errors`);
await b.close(); server.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
