import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
try {
  await p.waitForFunction(()=>window.vrindavan?.ctx?.world?.buildings?.interiors?.length,null,{timeout:200000});
  const k = await p.evaluate(() => Object.keys(window.vrindavan.ctx.world.buildings));
  console.log('BOOTED, buildings keys:', JSON.stringify(k));
} catch (e) { console.log('DID NOT BOOT'); }
console.log('errors:', JSON.stringify(errs.slice(0, 4)));
await b.close(); process.exit(0);
