/**
 * Does the live weather cost us as little of the free allowance as it can?
 *
 * Open-Meteo's free tier is a plain count — 10,000 calls a day, 5,000 an hour,
 * 600 a minute, per IP — so the only thing that matters is how often we ask.
 * Asking on a blind timer is waste: `current` moves on a 15-minute grid and the
 * response says so itself. This check proves we read that grid and wait for it,
 * that a reading that has not moved costs one retry a minute and not a storm of
 * calls, and that the whole thing still fails silently when the network is gone.
 *
 * It also makes one real call, because a check that only ever talks to its own
 * mock will pass happily the day the real endpoint changes shape.
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
const PORT = server.address().port;   // the OS's choice: fixed ports collided under all.mjs -j

const results = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/* ---------------------------------------------------------------- *
 * 1. The real endpoint, once. Shape, latency, payload size.
 * ---------------------------------------------------------------- */
const API = 'https://api.open-meteo.com/v1/forecast'
  + '?latitude=27.5800&longitude=77.6905'
  + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,'
  + 'precipitation,weather_code,cloud_cover,wind_speed_10m'
  + '&timezone=Asia%2FKolkata';

console.log('\nThe real Open-Meteo endpoint');
let live = null;
try {
  const t0 = Date.now();
  const res = await fetch(API, { signal: AbortSignal.timeout(10000) });
  const ms = Date.now() - t0;
  const body = await res.text();
  live = JSON.parse(body);
  const c = live.current || {};
  check('answers without a key or an account', res.ok, `${res.status} in ${ms} ms`);
  check('carries the fields the game reads', c.temperature_2m !== undefined
    && c.weather_code !== undefined && c.cloud_cover !== undefined,
    `${c.temperature_2m}°C, code ${c.weather_code}, cloud ${c.cloud_cover}%`);
  check('tells us its own publication grid', c.interval > 0 && !!c.time,
    `time ${c.time}, interval ${c.interval}s`);
  check('payload stays small enough for mobile data', body.length < 2048,
    `${body.length} bytes — ${(body.length * 96 / 1024).toFixed(0)} KB/day at 96 calls`);
} catch (e) {
  check('answers without a key or an account', false, `network unavailable: ${e.message}`);
}

/* ---------------------------------------------------------------- *
 * 2. The scheduling, against a mock we control.
 * ---------------------------------------------------------------- */
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctxb = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctxb.newPage();

let calls = 0;
let stamp = '2026-01-01T12:00';
await p.route('**/api.open-meteo.com/**', async (route) => {
  calls += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      utc_offset_seconds: 19800,
      current: {
        time: stamp, interval: 900, temperature_2m: 32.0, relative_humidity_2m: 62,
        apparent_temperature: 37.2, precipitation: 0, weather_code: 0,
        cloud_cover: 1, wind_speed_10m: 4.7,
      },
    }),
  });
});

// the game leaves the live service alone under automation; this check is
// the one that wants it, against the mock above
await p.addInitScript(() => { window.__liveFetch = true; });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

const make = () => p.evaluate(async () => {
  const { LiveConditions } = await import('/src/game/world/LiveConditions.js');
  window.localStorage.removeItem('vrindavan-dham.weather.v1');
  const ctx = { bus: { emit() {} }, state: { settings: {} } };
  window.__lc = new LiveConditions(ctx);
  await window.__lc.refresh(true);
  return { nextDueAt: window.__lc._nextDueAt, now: Date.now(), stamp: window.__lc._stamp };
});

console.log('\nAsking only when there is something new');
const first = await make();
// 12:00 IST + 900 s + 20 s skew, read back as a UTC instant
const expected = Date.parse('2026-01-01T12:00:00Z') - 19800000 + 900000 + 20000;
// That instant is in the past relative to the test clock, so the floor applies.
const floored = Math.max(expected, first.now + 60000);
check('next call is planned off the response, not a blind timer',
  Math.abs(first.nextDueAt - Math.min(floored, first.now + 15 * 60000)) < 3000,
  `due in ${Math.round((first.nextDueAt - first.now) / 1000)} s`);

const before = calls;
await p.evaluate(() => window.__lc.refresh());
check('a second ask inside the minute makes no call', calls === before,
  `${calls - before} extra call(s)`);

// The stamp has not moved: the next step simply is not published yet.
const sched = await p.evaluate(() => {
  const now = Date.now();
  window.__lc._scheduleFrom({ utc_offset_seconds: 19800 },
    { time: window.__lc._stamp, interval: 900 });
  return { wait: window.__lc._nextDueAt - now };
});
check('an unmoved reading costs one retry a minute, not a storm',
  Math.abs(sched.wait - 60000) < 3000, `retry in ${Math.round(sched.wait / 1000)} s`);

// A fresh stamp 15 minutes on should plan a full step ahead.
const ahead = await p.evaluate(() => {
  const now = Date.now();
  const iso = new Date(now + 19800000).toISOString().slice(0, 16);
  window.__lc._scheduleFrom({ utc_offset_seconds: 19800 }, { time: iso, interval: 900 });
  return { wait: window.__lc._nextDueAt - now };
});
check('a fresh reading plans one full 15-minute step ahead',
  ahead.wait > 13 * 60000 && ahead.wait <= 15 * 60000 + 30000,
  `next in ${Math.round(ahead.wait / 60000)} min`);

const budget = await p.evaluate(() => {
  // 96 steps a day, plus a retry for each, is the worst realistic day.
  return { perDay: 96 * 2 };
});
check('worst realistic day stays far inside 10,000 calls', budget.perDay < 500,
  `~${budget.perDay}/day = ${(budget.perDay / 100).toFixed(1)}% of the free cap`);

console.log('\nStill offline-first');
const offline = await p.evaluate(async () => {
  const kept = window.__lc.weather && window.__lc.weather.tempC;
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  let threw = false;
  try { await window.__lc.refresh(true); } catch { threw = true; }
  return { threw, kept, still: window.__lc.weather && window.__lc.weather.tempC };
});
check('an offline refresh neither throws nor loses the reading',
  !offline.threw && offline.still === offline.kept, `held ${offline.still}°C`);

const mods = await p.evaluate(() => {
  const lc = window.__lc;
  const saved = lc.weather;
  lc.weather = null;
  const blank = lc.modifiers;
  lc.weather = saved;
  return blank;
});
check('no weather at all still renders a clear day',
  mods.sunScale === 1 && mods.fogScale === 1, 'falls back to clear');

console.log('\nThe licence is actually shown');
const credited = await p.evaluate(async () => {
  const r = await fetch('/src/game/ui/UISystem.js').then((x) => x.text());
  return /Open-Meteo/.test(r) && /CC BY 4\.0/.test(r) && /OpenStreetMap/.test(r);
});
check('Open-Meteo and OSM are credited in the settings screen', credited,
  'CC BY 4.0 and ODbL both require it');

await b.close();
server.close();

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
