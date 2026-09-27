import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:900,height:560} });
const errors = [];
p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0,160)); });
const failed = [];
p.on('requestfailed', r => failed.push(r.url().split('/').slice(-2).join('/') + ' :: ' + (r.failure()?.errorText || '?')));
// A plain python http.server — no project tooling, no custom headers.
await p.goto('https://livebraj-sushil2003s-projects.vercel.app/', { waitUntil:'domcontentloaded' });
let booted = false;
try {
  await p.waitForFunction(() => window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui, null, { timeout: 240000 });
  booted = true;
} catch (e) { errors.push('BOOT TIMEOUT'); }
const info = booted ? await p.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  return {
    landmarks: ctx.data.LOCATIONS.length,
    roads: ctx.data.ROADS.length,
    capacitor: !!window.Capacitor,
    saveAvailable: !!ctx.save?.available,
    saveNative: !!ctx.save?.native,
    tris: ctx.renderer?.info?.render?.triangles ?? null,
  };
}) : {};
await p.screenshot({ path: 'docs/shots/web-deploy.png' });
console.log('WEBDEPLOY ' + JSON.stringify({ booted, info, failed: failed.slice(0,6), errors: errors.slice(0,6) }, null, 1));
await b.close(); process.exit(0);
