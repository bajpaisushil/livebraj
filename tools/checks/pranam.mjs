/**
 * Dandvat pranam — the full prostration.
 *
 * Asked for directly: "add dandvat pranam option also to do". `danda` is a
 * stick, and that is the whole instruction — you go down flat and straight,
 * face to the ground, arms stretched past the head toward the Deity. It is a
 * different act from the standing pranam that was already here, not a deeper
 * version of it.
 *
 * What this checks is the two ways it could be wrong, and they pull in
 * opposite directions:
 *
 *   IT MUST ACTUALLY HAPPEN. Every other pose in `Player.js` is bone rotations
 *   only, because every other pose happens standing up. Rotate the hips ninety
 *   degrees without LOWERING them and the avatar folds in the air with its feet
 *   still on the floor, which is not a prostration, it is a bow with a bug. So
 *   the hips have to measurably reach the ground and the torso has to
 *   measurably go horizontal.
 *
 *   IT MUST NOT BE SCORED. "Don't gamify devotion" is a hard rule in the brief.
 *   A prostration with a tally against it is the exact thing that rules out,
 *   and a list of temples you have prostrated at is a checklist whether or not
 *   anyone calls it one. So nothing in the save document may move.
 *
 *   node tools/checks/pranam.mjs
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

const results = [];
const check = (n, pass, d) => { results.push(pass); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const errors = [];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
await p.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui, null, { timeout: 200000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(900);

const r = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, pl = ctx.player;

  const save = JSON.stringify({
    pranams: (ctx.state.pranams || []).slice(),
    greetings: ctx.state.greetings || 0,
    offered: (ctx.state.offered || []).length,
  });

  /*
   * Driven at a FIXED step rather than in wall-clock. A headless page presents
   * almost no frames, so waiting out a seven-second action in real time
   * measures the harness — the same fault that made `driving` and `chatter`
   * read differently under load.
   */
  const run = (name) => {
    pl.playAction(name);
    const a = pl._action;
    if (!a) return null;
    const out = { name, frames: 0, minHip: Infinity, maxPitch: 0, samples: [] };
    for (let i = 0; i < 60 * 20 && pl._action; i++) {
      pl._updateAction(1 / 60);
      out.frames++;
      const drop = pl._hipDrop || 0;
      if (0.92 - drop < out.minHip) out.minHip = 0.92 - drop;
      const hips = pl._blend && pl._blend.hips ? pl._blend.hips[0] : 0;
      if (hips > out.maxPitch) out.maxPitch = hips;
      if (i % 60 === 0) out.samples.push({ s: +(i / 60).toFixed(0), hipY: +(0.92 - drop).toFixed(2), pitch: +hips.toFixed(2) });
    }
    return out;
  };

  const stand = run('pranam');
  const down = run('dandvat');

  // interrupt one halfway: you must stand back up, not walk off folded in half
  pl.playAction('dandvat');
  for (let i = 0; i < 60 * 3; i++) pl._updateAction(1 / 60);
  const midDrop = pl._hipDrop || 0;
  pl.cancelAction();
  const afterCancel = pl._hipDrop || 0;

  const after = JSON.stringify({
    pranams: (ctx.state.pranams || []).slice(),
    greetings: ctx.state.greetings || 0,
    offered: (ctx.state.offered || []).length,
  });

  // is it actually offered anywhere a person would look for it?
  const acts = ctx.data.LOCATIONS.filter((l) => l.interactions && l.interactions.includes('pranam')).length;
  const srcOffered = typeof ctx.interaction._doPranam === 'function';

  return {
    stand, down, midDrop: +midDrop.toFixed(2), afterCancel: +afterCancel.toFixed(2),
    saveUnchanged: save === after, acts, srcOffered,
    duration: down ? +(down.frames / 60).toFixed(1) : 0,
  };
});

check('there is a dandvat action at all', !!r.down && r.down.frames > 60,
  r.down ? `${r.duration} s long` : 'playAction("dandvat") did nothing');

if (r.down) {
  /*
   * The hips start at 0.92 m. A standing bow barely moves them; a prostration
   * has to put them on the floor. If this number does not change, the avatar
   * is folding in the air with its feet planted.
   */
  check('the body actually reaches the ground',
    r.down.minHip < 0.20,
    `hips go from 0.92 m down to ${r.down.minHip.toFixed(2)} m`
    + (r.stand ? ` (a standing pranam only reaches ${r.stand.minHip.toFixed(2)} m)` : ''));

  check('and it goes flat, not just low',
    r.down.maxPitch > 1.2,
    `torso pitches to ${(r.down.maxPitch * 180 / Math.PI).toFixed(0)}° from upright`);

  check('it is held long enough to be an act, not an emote',
    r.duration >= 5,
    `${r.duration} s, against ${r.stand ? (r.stand.frames / 60).toFixed(1) : '?'} s for a standing pranam`);

  check('interrupting it stands you back up',
    r.midDrop > 0.1 && r.afterCancel === 0,
    `${r.midDrop.toFixed(2)} m down mid-action, ${r.afterCancel.toFixed(2)} after cancelling`);
}

/*
 * The rule that matters more than any of the above.
 */
check('NOTHING is counted for it', r.saveUnchanged,
  r.saveUnchanged ? 'the save document is byte-identical after a dandvat'
    : 'something in the save moved — see "don\'t gamify devotion"');

check('it is offered where a pranam is', r.srcOffered && r.acts > 0,
  `${r.acts} places take a pranam`);

console.log('');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed, ${errors.length} console errors`);
if (errors.length) for (const e of errors.slice(0, 5)) console.log('  ! ' + e);
const good = passed === results.length && !errors.length;
/*
 * Close the browser BEFORE deciding, and never let the teardown decide for us.
 *
 * This printed "7/7 passed, 0 console errors" and then exited 1, which made
 * the suite red for a check that had passed — a lie of exactly the kind the
 * runner exists to prevent, since the runner trusts the exit code over the
 * words. Playwright's close can reject after the page has gone, and an
 * unhandled rejection sets the code itself.
 */
try { await b.close(); } catch { /* it is already going away */ }
try { server.close(); } catch { /* ditto */ }
process.exit(good ? 0 : 1);
