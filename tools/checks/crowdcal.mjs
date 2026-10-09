/**
 * The crowd follows the calendar (queue item 7).
 *
 * "can we have live data like crowd show here from iskcon vrindavan youtube
 * channel or somewhat?" — the town full at darshan and on a Sunday evening,
 * thin in the small hours, at its fullest on a festival, from Banke Bihari's
 * timings, published footfall and the 2026-27 festival dates
 * (CrowdCalendar.js). This checks the rule at fixed moments, that the crowd
 * follows a clock set on it, that nobody comes or goes within sight of you,
 * and that switching it off brings everyone back out.
 *
 * The game turns the calendar off under automation, so no other check reads
 * differently by the hour it runs at; this one turns it on with its own clock.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise((r)=>server.listen(0,r));
const __PORT = server.address().port;

const res = []; const check = (n, pass, d) => { res.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
// the check owns the clock, as verges does
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true, get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.crowd && window.vrindavan?.ctx?.ui, null, { timeout: 240000 });

const out = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, crowd = ctx.crowd;
  Math.random = ctx.rngAt(1);
  ctx.ui._endIntro();
  ctx.ui.show('world');
  const { busyness } = await import('/src/game/npc/CrowdCalendar.js');
  // a Date whose local fields are the Braj time given
  const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi);
  const rule = {
    tueSmallHours: busyness(at(2026, 10, 13, 3, 0)),
    tueMorning: busyness(at(2026, 10, 13, 10, 30)),
    tueAfternoon: busyness(at(2026, 10, 13, 14, 0)),
    sunEvening: busyness(at(2026, 10, 11, 19, 30)),
    diwali: busyness(at(2026, 11, 8, 12, 0)),
    kartik: busyness(at(2026, 11, 3, 11, 0)),
    janmashtami: busyness(at(2027, 8, 24, 13, 0)),
  };
  const auto = crowd.calendar.on;
  const toasts = [];
  if (ctx.bus) ctx.bus.on('ui:toast', (t) => toasts.push(t && t.title));
  const outNow = () => crowd.people.filter((a) => !a.away).length;
  const total = crowd.people.length;
  const run = (s) => { for (let i = 0; i < Math.round(s * 30); i++) crowd.update(1 / 30, ctx); };
  const pos = ctx.player.position;
  // who is parked, and who is out within sight, by index
  const state = () => crowd.people.map((a) => (a.away ? 'away' : Math.hypot(a.x - pos.x, a.z - pos.z) < 60 ? 'near' : 'out'));
  // and the traffic, the same way
  const traffic = () => { const o = []; for (const s of crowd.vehicleInst) for (const a of s.agents) o.push(a); return o; };
  const totalV = traffic().length;
  const outV = () => traffic().filter((a) => !a.away).length;
  const vstate = () => traffic().map((a) => (a.away ? 'away' : Math.hypot(a.x - pos.x, a.z - pos.z) < 60 ? 'near' : 'out'));
  const drawnV = () => crowd.vehicleInst.reduce((n, s) => n + s.mesh.count, 0);

  // 3 a.m. on a Tuesday: the town settles to its floor, at once, as at boot
  crowd.setCalendar(true, at(2026, 10, 13, 3, 0), true);
  run(1.2);
  const night = outNow();
  const nightV = outV();
  // a ride you are on is never taken off the road, small hours or not
  const mine = traffic()[traffic().length - 1];
  if (mine) {
    crowd.setCalendar(true, at(2026, 10, 11, 19, 30), true);
    run(1.2);
    mine.chartered = true; mine.x = pos.x + 200; mine.z = pos.z;
    crowd.setCalendar(true, at(2026, 10, 13, 3, 0), true);
    run(1.2);
  }
  const charteredKept = !!mine && !mine.away;
  if (mine) mine.chartered = false;
  crowd.setCalendar(true, at(2026, 10, 13, 3, 0), true);
  run(1.2);
  // Sunday evening: people come out, a few a second, and none in sight —
  // nobody parked turns up within sight, nobody in sight is parked
  crowd.setCalendar(true, at(2026, 10, 11, 19, 30));
  let vanished = 0, appeared = 0, vanishedV = 0, appearedV = 0, drawnOver = 0, evening5V = 0;
  for (let k = 0; k < 40; k++) {
    const before = state(), beforeV = vstate();
    run(1);
    const after = state(), afterV = vstate();
    for (let i = 0; i < before.length; i++) {
      if (before[i] === 'near' && after[i] === 'away') vanished++;
      if (before[i] === 'away' && after[i] === 'near') appeared++;
    }
    for (let i = 0; i < beforeV.length; i++) {
      if (beforeV[i] === 'near' && afterV[i] === 'away') vanishedV++;
      if (beforeV[i] === 'away' && afterV[i] === 'near') appearedV++;
    }
    if (drawnV() > outV()) drawnOver++;
    if (k === 4) evening5V = outV();
  }
  const evening40 = outNow();
  const evening40V = outV();
  run(160);
  const evening = outNow();
  const eveningV = outV();
  // nobody parked is anywhere a proximity query could find them
  const parkedFar = crowd.people.filter((a) => a.away).every((a) => Math.abs(a.x) > 1e6 && Math.abs(a.z) > 1e6);
  // the traffic parked at night stays parked: nothing recycles it back beside you
  crowd.setCalendar(true, at(2026, 10, 13, 3, 0), true);
  run(1.2);
  const nightV2 = outV();
  run(20);
  const nightV3 = outV();
  const parkedFarV = traffic().filter((a) => a.away).every((a) => Math.abs(a.x) > 1e6 && Math.abs(a.z) > 1e6);
  // off: everyone out, at once
  crowd.setCalendar(true, at(2026, 10, 13, 3, 0), true);
  run(1.2);
  const nightAgain = outNow();
  crowd.setCalendar(false);
  const off = outNow();
  const offV = outV();
  return { rule, auto, total, night, evening40, evening, vanished, appeared, parkedFar, nightAgain, off, toasts,
    totalV, nightV, nightV2, nightV3, evening5V, evening40V, eveningV, vanishedV, appearedV, drawnOver, parkedFarV, offV, charteredKept };
});

const R = out.rule;
const f2 = (v) => v.toFixed(2);
check('the small hours are quiet, a Tuesday morning busy, a Sunday evening full',
  R.tueSmallHours.level < 0.15 && R.tueMorning.level > 0.55 && R.tueMorning.level < 0.85 && R.sunEvening.level >= 0.99,
  `Tue 03:00 ${f2(R.tueSmallHours.level)}, Tue 10:30 ${f2(R.tueMorning.level)}, Sun 19:30 ${f2(R.sunEvening.level)}`);
check('the temples shut after noon, and the town thins with them',
  R.tueAfternoon.level < R.tueMorning.level * 0.6, `Tue 14:00 ${f2(R.tueAfternoon.level)} against ${f2(R.tueMorning.level)} at 10:30`);
check('festivals are named, the strongest of the day wins',
  R.diwali.festival?.name === 'Diwali' && R.kartik.festival?.name.startsWith('Kartik') && R.janmashtami.festival?.name === 'Janmashtami' && R.janmashtami.level >= 0.99,
  `${R.diwali.festival?.name} (inside Kartik), ${R.kartik.festival?.name}, ${R.janmashtami.festival?.name} ${f2(R.janmashtami.level)}`);
check('under automation the calendar starts off, so no other check reads by the hour', out.auto === false, `on: ${out.auto}`);
check('at 3 a.m. the town settles to its floor, not to nothing',
  out.night >= Math.round(out.total * 0.3) - 1 && out.night <= Math.round(out.total * 0.3) + 1, `${out.night} of ${out.total} out`);
check('a Sunday evening brings them out, a few at a time',
  out.evening40 > out.night && out.evening40 < out.total && out.evening > out.total * 0.95,
  `${out.night} → ${out.evening40} after 40 s → ${out.evening} after 200 s`);
check('nobody vanishes or appears within sight of you', out.vanished === 0 && out.appeared === 0,
  `${out.vanished} vanished, ${out.appeared} appeared inside 55 m`);
check('those not out are nowhere anything could find them', out.parkedFar, '');
check('it says why, once: "Sunday"', out.toasts.filter((t) => t === 'Sunday').length === 1, JSON.stringify(out.toasts));
check('switched off, everyone is out at once', out.nightAgain < out.total && out.off === out.total, `${out.nightAgain} → ${out.off} of ${out.total}`);
/* ---- the traffic keeps the same day ---- */
check('at 3 a.m. the traffic thins to a quarter, not to nothing',
  Math.abs(out.nightV - Math.round(out.totalV * 0.25)) <= 1, `${out.nightV} of ${out.totalV} vehicles on the road`);
check('a Sunday evening brings it back a couple a second, all of it',
  out.evening5V > out.nightV && out.evening5V < out.totalV && out.eveningV === out.totalV,
  `${out.nightV} → ${out.evening5V} after 5 s → ${out.evening40V} after 40 s → ${out.eveningV} after 200 s`);
check('no vehicle vanishes or appears within sight, and none parked is drawn',
  out.vanishedV === 0 && out.appearedV === 0 && out.drawnOver === 0,
  `${out.vanishedV} vanished, ${out.appearedV} appeared, ${out.drawnOver} seconds with more drawn than out`);
check('parked traffic stays parked, far off: nothing recycles it beside you',
  out.parkedFarV && out.nightV3 === out.nightV2, `${out.nightV2} out, ${out.nightV3} twenty seconds later`);
check('a ride you are on is never taken off the road', out.charteredKept, '');
check('switched off, all the traffic is back', out.offV === out.totalV, `${out.offV} of ${out.totalV}`);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close(); server.close();
const passed = res.filter(Boolean).length;
console.log(`\n${passed}/${res.length} passed`);
process.exit(passed === res.length ? 0 : 1);
