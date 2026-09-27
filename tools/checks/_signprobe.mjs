import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui, null, { timeout: 240000 });

const info = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) { ctx.time.setPhase('day', true); ctx.time._apply(ctx.data.TIME_OF_DAY.day, true); ctx.time.update = () => {}; }
  await new Promise((r) => setTimeout(r, 800));
  const S = await import('/src/game/world/Signage.js');
  const boards = S.setRealSigns(ctx.data.POIS, ctx.data.ROADS, ctx.data.LOCATIONS);
  const bg = ctx.world.buildings;
  const lots = (bg && bg.lots) || [];
  const un = [];
  for (const brd of boards) {
    let best = 1e9;
    for (const l of lots) best = Math.min(best, Math.hypot(l.x - brd.poi.pos[0], l.z - brd.poi.pos[1]));
    if (best > 90) un.push({ name: brd.poi.name.slice(0, 36), kind: brd.poi.kind, nearestLot: Math.round(best) });
  }
  return { boards: boards.length, lots: lots.length, unmatched: un.length, sample: un.slice(0, 16) };
});
console.log(JSON.stringify(info, null, 1));

// blow up part of the atlas so the 171px cells can actually be read
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const S = await import('/src/game/world/Signage.js');
  const img = S.signAtlas(ctx).image;
  const c = document.createElement('canvas');
  c.width = 900; c.height = 450;
  const g = c.getContext('2d');
  const cell = img.width / 12;
  g.drawImage(img, 0, cell * 2, cell * 6, cell * 3, 0, 0, 900, 450);
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
  document.body.appendChild(c);
});
await p.waitForTimeout(600);
await p.screenshot({ path: 'docs/shots/sign-atlas.png', timeout: 90000 });
await b.close();
process.exit(0);
