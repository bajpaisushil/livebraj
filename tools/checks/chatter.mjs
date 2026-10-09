/**
 * Does the text go away when you do?
 *
 * You reported chatter that stays up after you have walked off. Rather than
 * guess which of the several things that put text on screen is the culprit —
 * the bump toast, the Talk prompt, the dialogue box — this walks into somebody,
 * walks a long way away, waits, and then counts what is still showing.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide

/** One seed, so one run is the same as the next. `--seed=N` for another. */
const SEED = Number((process.argv.find((a) => a.startsWith('--seed=')) || '').slice(7)) || 1;

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
/*
 * THE CHECK OWNS THE CLOCK — the same arrangement as traffic.mjs, which says
 * why at length. The game's loop is never started: `start()` is caught as
 * main.js hands the app over, and the check calls the game's own `_frame()`
 * at a fixed 1/30 s, with Math.random on the game's own seeded generator. The
 * renderer is cut down to the matrix update the simulation can see, which
 * here is the camera that the speech bubble is projected through.
 */
await p.addInitScript(() => {
  let app = null;
  Object.defineProperty(window, 'vrindavan', {
    configurable: true,
    get: () => app,
    set: (v) => { app = v; if (v) v.start = function held() { this.running = true; }; },
  });
});
await p.goto(`http://localhost:${__PORT}/`,{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
const held = await p.evaluate((seed) => {
  const app = window.vrindavan, ctx = app.ctx;
  // not one step may have run on the wall clock, or none of what follows holds
  if (app._raf || ctx.__simAccum !== undefined) return false;
  Math.random = ctx.rngAt(seed);
  ctx.clock.getDelta = () => 1 / 30;
  ctx.renderer.render = (scene, camera) => {
    if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
  };
  // the intro ends on a timer of its own; end it here, so every boot arrives alike
  ctx.ui._endIntro();
  ctx.ui.show('world');
  // the second this used to wait, as 30 frames of the game's own loop
  for (let i = 0; i < 30; i++) app._frame();
  return true;
}, SEED);
if (!held) {
  console.log('  FAIL  the game loop ran on the wall clock before the check took it over');
  await b.close(); server.close();
  process.exit(1);
}

const r = await p.evaluate(async () => {
  const app = window.vrindavan, ctx = app.ctx;
  const out = {};
  const seen = [];
  ctx.bus.on('ui:toast', (t) => seen.push(t.title));
  // a spoken line goes to the bubble now, not the toast rail, so listen there
  if (ctx.ui && ctx.ui.say) {
    const orig = ctx.ui.say.bind(ctx.ui);
    ctx.ui.say = (text, agent) => { seen.push(text); return orig(text, agent); };
  }

  // stand in the crowd and walk into somebody
  const people = [];
  for (const slot of ctx.crowd.peopleInst) for (const a of slot.agents) people.push(a);
  out.people = people.length;
  const victim = people[0];
  if (!victim) return { error: 'no crowd' };

  ctx.player.position.set(victim.x, ctx.world.groundHeight(victim.x, victim.z), victim.z);
  // fake the contact the crowd would have produced, and fake motion
  victim.bumped = 1; victim.bumpSpoken = false;
  ctx.player._speed = 2.0;
  for (let i = 0; i < 30; i++) ctx.dialogue.update(1 / 30, ctx);
  out.spokeOnBump = seen.length;
  out.promptAfterBump = !!document.querySelector('#prompts .prompt, .prompt');

  // now walk a long way off and stand still
  ctx.player.position.set(victim.x + 260, ctx.world.groundHeight(victim.x + 260, victim.z), victim.z);
  ctx.player._speed = 0;
  const before = seen.length;
  for (let i = 0; i < 30 * 9; i++) {
    ctx.dialogue.update(1 / 30, ctx);
    if (ctx.interaction) ctx.interaction.update(1 / 30, ctx);
  }
  /*
   * Wait for the screen to clear, each thing on the clock that takes it down.
   *
   * A toast lives 3.4 s and fades over 0.5, and there is always one up by
   * now: arriving at Chhatikara Crossing is announced in the first second,
   * before anybody is walked into. Any toast raised AFTER the walk is already
   * counted above as somebody speaking. So the wait has to outlast the one
   * that is up. It was a flat 6.2 s, which read 6/6 run on its own and 5/6
   * inside the suite, from identical code. Then it became a poll for the
   * screen to clear, which was better and still not right. Both waited on the
   * wall clock with the game's loop running behind them. Everything that loop
   * drives — the bubble coming down, somebody wandering up to you — got
   * however many frames the machine could spare. Under SwiftShader that was
   * four frames in one second and none in the next, measured. It was a
   * real-time wait measuring the machine instead of the game, the fault
   * `driving.mjs` had.
   *
   * So the two clocks are kept apart. Prompts and the bubble are taken down by
   * the game loop, so they get the game loop: run here at a fixed step until
   * they are down, for at most the 20 s this always allowed, then 0.4 s more
   * so that anything raised on the very last tick is caught. A toast is taken
   * down by UISystem's own setTimeout, so toasts alone are waited for in real
   * time, with the world held so that the wait can only end one way. If either
   * deadline is ever hit, the assertions below report what was still up rather
   * than this silently passing.
   */
  const promptsUp = () => [...document.querySelectorAll('.prompt')].filter((e) => e.offsetParent !== null).length;
  const bubbleUp = () => !!document.querySelector('#say-bubble.show');
  for (let i = 0; i < 30 * 20 && (promptsUp() || bubbleUp()); i++) app._frame();
  for (let i = 0; i < 12; i++) app._frame();
  {
    const deadline = Date.now() + 20000;
    while (document.querySelectorAll('#toasts .toast').length && Date.now() < deadline) {
      await new Promise((r2) => setTimeout(r2, 100));
    }
  }

  out.spokeAfterLeaving = seen.length - before;
  out.dialogueOpen = !!(ctx.dialogue && ctx.dialogue.active);
  out.toastsOnScreen = document.querySelectorAll('#toasts .toast').length;
  // and the bubble itself must be down
  const bub = document.querySelector('#say-bubble');
  out.bubbleShowing = !!(bub && bub.classList.contains('show'));
  const prompts = [...document.querySelectorAll('.prompt')]
    .filter((e) => e.offsetParent !== null).map((e) => e.textContent.trim().slice(0, 24));
  out.promptsOnScreen = prompts.length;
  out.prompts = prompts;
  out.lastLines = seen.slice(-4);
  return out;
});

check('somebody you walk into says something', r.spokeOnBump > 0, `${r.spokeOnBump} line(s)`);
check('nobody speaks once you have gone', r.spokeAfterLeaving === 0,
  `${r.spokeAfterLeaving} more line(s) after walking 260 m away — ${JSON.stringify(r.lastLines)}`);
check('no toast is still on screen', r.toastsOnScreen === 0, `${r.toastsOnScreen} showing`);
check('no speech bubble is still on screen', !r.bubbleShowing, String(r.bubbleShowing));
check('no prompt is still on screen', r.promptsOnScreen === 0,
  `${r.promptsOnScreen} showing — ${JSON.stringify(r.prompts)}`);
check('the dialogue box is closed', !r.dialogueOpen, String(r.dialogueOpen));

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed (seed ${SEED})`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
