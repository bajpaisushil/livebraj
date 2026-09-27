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
await new Promise(r=>server.listen(8809,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8809/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
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
   * Wait for the screen to clear, rather than for a number of milliseconds.
   *
   * A toast lives 3.4 s and fades over 0.5, and teleporting 260 m arrives in a
   * new place, which InteractionSystem quite correctly announces — so the wait
   * has to outlast a toast raised at the END of the simulated stretch. It used
   * to be a flat 6.2 s, which is enough on a quiet machine and not enough on a
   * busy one: this check read 6/6 run on its own and 5/6 run inside the suite,
   * from identical code. Exactly the fault `driving.mjs` had, in a different
   * disguise — a real-time wait measuring the machine instead of the game.
   *
   * Polling for the condition is no slower when things are quiet and does not
   * lie when they are not. The deadline is generous and, if it is ever hit, the
   * assertions below report what was still up rather than this silently
   * passing.
   */
  {
    const deadline = Date.now() + 20000;
    for (;;) {
      const up = document.querySelectorAll('#toasts .toast').length
        + [...document.querySelectorAll('.prompt')].filter((e) => e.offsetParent !== null).length;
      const bubble = document.querySelector('#say-bubble');
      if (!up && !(bubble && bubble.classList.contains('show'))) break;
      if (Date.now() > deadline) break;
      await new Promise((r2) => setTimeout(r2, 150));
    }
    // and a moment past clear, so a toast raised on the very last tick is caught
    await new Promise((r2) => setTimeout(r2, 400));
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
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
