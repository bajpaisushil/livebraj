/**
 * Does the game open with the network off after one visit online — and does a
 * deploy still reach someone who has been here before?
 *
 * Those two pull against each other, and the second is the one that bites. A
 * worker that kept things too eagerly would keep serving last week's game after
 * a push; this site deploys on every push, and somebody has already once
 * decided a push had not landed because the browser was showing an old build.
 * So this check is as much about the deploy as about offline.
 *
 *   1. Under automation, without ?sw, nothing is registered — so no other check
 *      ever has a worker in it.
 *   2. One visit online keeps every file that visit loaded, the manifest and
 *      its icons, and every declared font face. Chrome itself is asked whether
 *      the site is installable.
 *   3. Network off: the game boots to the world, with no failed system, no page
 *      error, no console error, and the player walks.
 *   4. A deploy — index.html, the entry module and a module loaded by computed
 *      path all change on the server — is what the next load shows, and the
 *      kept copy follows it.
 *   5. Network off again: the NEW build opens, not the one kept before.
 *   6. A new sw.js takes over on the next load with nobody closing a tab, and
 *      carries the offline copy into its new cache before dropping the old one.
 *   7. Network off once more, under the new worker.
 *
 * TWO DETAILS THAT MAKE IT HONEST
 *
 * "Offline" here is the browser context set offline AND the server taken down.
 * Playwright's setOffline does not reach a service worker's own fetches — with
 * the server left up, 93 requests arrived at it from an "offline" browser while
 * this was being written — so a check that only set the context offline would
 * pass by quietly fetching everything.
 *
 * The server sends every file with a day's max-age and an ETag. That is worse
 * than vercel.json, deliberately: a worker that leaned on the HTTP cache for
 * freshness would hand back the old module after a deploy, and step 4 would
 * catch it. Revalidation answers 304, as Vercel does.
 *
 *   node tools/checks/offline.mjs
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { chromium } from 'playwright';

const ROOT = path.resolve(process.cwd(), 'client');
const T = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};

const results = [];
const check = (name, pass, detail) => {
  results.push(!!pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';

/* ---------------------------------------------------------------- *
 * The server: the client as it is on disk, plus whatever a simulated
 * deploy has put over it, and a switch that takes it off the network.
 * ---------------------------------------------------------------- */
const overrides = new Map();   // '/src/main.js' -> Buffer
const sockets = new Set();
let served = 0;
const server = http.createServer((q, r) => {
  served++;
  const u = decodeURIComponent(q.url.split('?')[0]);
  const rel = u === '/' ? '/index.html' : u;
  let body = overrides.get(rel);
  if (!body) {
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    body = fs.readFileSync(f);
  }
  const etag = '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"';
  const head = { 'cache-control': 'public, max-age=86400', etag };
  if (q.headers['if-none-match'] === etag) { r.writeHead(304, head); r.end(); return; }
  r.writeHead(200, { ...head, 'content-type': T[path.extname(rel)] || 'application/octet-stream' });
  r.end(body);
});
server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;   // the OS's choice: fixed ports collided under all.mjs -j
const ORIGIN = `http://localhost:${PORT}`;

/** Take the server off the network: refuse new connections, cut the live ones. */
const goDown = () => new Promise((done) => {
  server.close(() => done());
  for (const s of sockets) s.destroy();
});
const comeUp = () => new Promise((done, fail) => {
  server.once('error', fail);
  server.listen(PORT, () => { server.off('error', fail); done(); });
});

/* ---------------------------------------------------------------- *
 * 0. The files themselves.
 * ---------------------------------------------------------------- */
console.log('\nThe manifest, the icons and the headers');

const pngSize = (file) => {
  const b = fs.readFileSync(file);
  const sig = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return sig ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
};

let manifest = null;
try { manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8')); } catch (e) {
  check('manifest.webmanifest is valid JSON', false, e.message);
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const iconFiles = [];
if (manifest) {
  check('manifest has a name and a home-screen short_name',
    !!manifest.name && !!manifest.short_name && manifest.short_name.length <= 12,
    `"${manifest.name}" / "${manifest.short_name}"`);
  const start = new URL(manifest.start_url || '', `${ORIGIN}/manifest.webmanifest`);
  const scope = new URL(manifest.scope || './', `${ORIGIN}/manifest.webmanifest`);
  check('start_url is set and inside the scope', !!manifest.start_url && start.href.startsWith(scope.href),
    `${manifest.start_url} in ${manifest.scope}`);
  check('display is an installable mode', ['fullscreen', 'standalone', 'minimal-ui'].includes(manifest.display),
    manifest.display);
  const hex = /^#[0-9a-f]{6}$/i;
  const meta = (html.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
  check('colours are set, and theme_color matches the page', hex.test(manifest.theme_color || '')
    && hex.test(manifest.background_color || '') && manifest.theme_color === meta,
    `theme ${manifest.theme_color}, background ${manifest.background_color}, page ${meta}`);

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const bad = [];
  for (const ic of icons) {
    const file = path.join(ROOT, new URL(ic.src, `${ORIGIN}/`).pathname);
    const dims = fs.existsSync(file) ? pngSize(file) : null;
    if (!dims) { bad.push(`${ic.src}: missing or not a PNG`); continue; }
    if (`${dims[0]}x${dims[1]}` !== ic.sizes) bad.push(`${ic.src}: is ${dims.join('x')}, says ${ic.sizes}`);
    if (ic.type !== 'image/png') bad.push(`${ic.src}: type ${ic.type}`);
    iconFiles.push(new URL(ic.src, `${ORIGIN}/`).pathname);
  }
  const has = (size, purpose) => icons.some((ic) => ic.sizes === size
    && (ic.purpose || 'any').split(/\s+/).includes(purpose));
  check('icons exist, are PNGs, and are the size they say', icons.length && !bad.length,
    bad.length ? bad.join('; ') : `${icons.length} icons`);
  check('192 and 512 for "any", and a maskable one for Android', has('192x192', 'any') && has('512x512', 'any')
    && icons.some((ic) => (ic.purpose || '').includes('maskable')));
}
const linkHref = (rel) => (html.match(new RegExp(`<link rel="${rel}"[^>]*href="([^"]+)"`)) || [])[1];
const touch = linkHref('apple-touch-icon');
const touchDims = touch && fs.existsSync(path.join(ROOT, touch)) ? pngSize(path.join(ROOT, touch)) : null;
check('index.html links the manifest', linkHref('manifest')
  && fs.existsSync(path.join(ROOT, linkHref('manifest'))), linkHref('manifest'));
check('an apple-touch-icon for iOS, 180 square', touchDims && touchDims[0] === 180 && touchDims[1] === 180,
  touch);
if (touch) iconFiles.push(new URL(touch, `${ORIGIN}/`).pathname);

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const headerFor = (source, key) => {
  const rule = (vercel.headers || []).find((h) => h.source === source);
  const h = rule && rule.headers.find((x) => x.key.toLowerCase() === key.toLowerCase());
  return h ? h.value : null;
};
const swCache = headerFor('/sw.js', 'Cache-Control') || '';
check('vercel.json: sw.js is never cached', /no-store/.test(swCache), swCache || 'no rule');
check('vercel.json: the manifest is served as a manifest',
  headerFor('/manifest.webmanifest', 'Content-Type') === 'application/manifest+json');

const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
try { new vm.Script(swSrc, { filename: 'sw.js' }); check('sw.js parses', true); }
catch (e) { check('sw.js parses', false, e.message); }
const VERSION = (swSrc.match(/const VERSION = '([^']+)'/) || [])[1];
const PREFIX = (swSrc.match(/const PREFIX = '([^']+)'/) || [])[1];
check('sw.js names a versioned cache', VERSION && PREFIX, `${PREFIX}${VERSION}`);

/* ---------------------------------------------------------------- *
 * The browser. A persistent profile in a fresh temporary directory:
 * an ordinary context is incognito to Chrome, and Chrome declines to
 * call anything installable there.
 * ---------------------------------------------------------------- */
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-offline-'));
const ctx = await chromium.launchPersistentContext(profile, {
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true,
});
const page = ctx.pages()[0] || await ctx.newPage();

let pageErrors = [];
let consoleErrors = [];
let failed = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
page.on('requestfailed', (r) => {
  if (r.url().startsWith(ORIGIN)) failed.push(r.url().slice(ORIGIN.length) + ' ' + (r.failure() || {}).errorText);
});
const clean = () => { pageErrors = []; consoleErrors = []; failed = []; };

const booted = () => page.waitForFunction(() => {
  const c = window.vrindavan && window.vrindavan.ctx;
  return !!(c && c.world && c.world._ready && c.ui && c.player);
}, null, { timeout: 180000, polling: 250 }).then(() => true, () => false);

const bootState = () => page.evaluate(() => {
  const a = window.vrindavan;
  return {
    failed: a.failedSystems || [],
    online: navigator.onLine,
    controlled: !!navigator.serviceWorker.controller,
    deploy: window.__vdDeploy || null,
    deployUI: globalThis.__vdDeployUI || null,
    deployMeta: !!document.querySelector('meta[name="vd-deploy"]'),
  };
});

/** Every same-origin URL this page loaded, the shell, and every declared face — kept? */
const missingFromCache = (extra) => page.evaluate(async (extra) => {
  const want = new Set([location.origin + '/', ...extra.map((p) => location.origin + p)]);
  const add = (href, base) => {
    const u = new URL(href, base || location.href);
    if (u.origin !== location.origin) return;
    u.search = ''; u.hash = '';
    want.add(u.href);
  };
  for (const e of performance.getEntriesByType('resource')) add(e.name);
  for (const s of document.styleSheets) {
    let rules; try { rules = s.cssRules; } catch { continue; }
    for (const r of rules) {
      if (r.type !== CSSRule.FONT_FACE_RULE) continue;
      for (const m of r.style.getPropertyValue('src').matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) add(m[2], s.href);
    }
  }
  const missing = [];
  for (const u of want) if (!(await caches.match(u))) missing.push(new URL(u).pathname);
  return { wanted: want.size, missing };
}, extra);

const waitKept = async (extra, ms = 90000) => {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < ms) {
    last = await missingFromCache(extra).catch(() => null);
    const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false);
    if (last && !last.missing.length && ctl) return { ok: true, secs: (Date.now() - t0) / 1000, ...last };
    await page.waitForTimeout(500);
  }
  return { ok: false, secs: (Date.now() - t0) / 1000, ...(last || { wanted: 0, missing: ['(no answer)'] }) };
};

const cacheReport = () => page.evaluate(async () => {
  const names = await caches.keys();
  let files = 0, bytes = 0;
  const by = {}, keys = [];
  for (const n of names) {
    const c = await caches.open(n);
    for (const req of await c.keys()) {
      const size = (await (await c.match(req)).blob()).size;
      const u = new URL(req.url);
      keys.push(req.url);
      files++; bytes += size;
      const p = u.pathname;
      const group = p === '/' || !p.slice(1).includes('/') ? 'shell'
        : p.startsWith('/vendor/three/') ? 'vendor/three'
          : p.startsWith('/vendor/fonts/') ? 'fonts'
            : p.startsWith('/assets/icons/') ? 'shell'
              : p.split('/')[1];
      by[group] = (by[group] || 0) + size;
    }
  }
  return { names, files, bytes, by, keys };
});

/** Hold the D-pad forward and see the player actually go somewhere. */
const walk = () => page.evaluate(async () => {
  const c = window.vrindavan.ctx;
  c.ui.show('world');
  await new Promise((r) => setTimeout(r, 600));
  const up = document.querySelector('#dpad .dp.up');
  if (!up) return -1;
  const p0 = c.player.position.clone();
  const moved = () => Math.hypot(c.player.position.x - p0.x, c.player.position.z - p0.z);
  up.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
  /*
   * Until the player has gone somewhere, not for 2.5 s of wall clock: in a
   * parallel suite the game loop got so few frames in that time that a
   * working build walked 0.23 m of the 0.25 asked for. A broken one still
   * walks nowhere in twenty seconds.
   */
  const t0 = Date.now();
  while (moved() < 0.6 && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 100));
  up.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }));
  return moved();
});

/** Network off: the context offline, and the server gone, because setOffline does not reach the worker. */
const offline = async () => { await ctx.setOffline(true); await goDown(); };
const online = async () => { await comeUp(); await ctx.setOffline(false); };

const clientBytes = (() => {
  let n = 0;
  (function walkDir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkDir(p); else n += fs.statSync(p).size;
    }
  })(ROOT);
  return n;
})();

try {
  /* -------------------------------------------------------------- *
   * 1. No ?sw: the worker stays out of every other check.
   * -------------------------------------------------------------- */
  console.log('\nUnder automation, without ?sw');
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  const plainBoot = await booted();
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  const keys0 = await page.evaluate(() => caches.keys());
  check('nothing is registered and nothing is kept', plainBoot && regs === 0 && !keys0.length,
    `${regs} registrations, ${keys0.length} caches, booted=${plainBoot}`);

  /* -------------------------------------------------------------- *
   * 2. One visit online.
   * -------------------------------------------------------------- */
  console.log('\nOne visit online');
  clean();
  await page.goto(`${ORIGIN}/?sw`, { waitUntil: 'load' });
  const t0 = Date.now();
  const firstBoot = await booted();
  const bootSecs = (Date.now() - t0) / 1000;
  check('boots online with the worker registered', firstBoot && !pageErrors.length,
    `${bootSecs.toFixed(1)} s, ${pageErrors.length} page errors`);
  const kept = await waitKept(iconFiles.concat('/manifest.webmanifest'));
  check('every file the visit loaded is kept, with the shell and every declared face', kept.ok,
    kept.ok ? `${kept.wanted} files, complete ${kept.secs.toFixed(1)} s after the world was up`
      : `${kept.missing.length} of ${kept.wanted} missing: ${kept.missing.slice(0, 5).join(', ')}`);
  const first = await bootState();
  check('the first visit is already under the worker (clients.claim)', first.controlled);

  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors').catch((e) => ({ err: e.message }));
  const appManifest = await cdp.send('Page.getAppManifest').catch((e) => ({ err: e.message }));
  check("Chrome's own parser finds nothing wrong with the manifest",
    appManifest.errors && !appManifest.errors.length, appManifest.err
      || (appManifest.errors || []).map((e) => e.message).join('; ') || appManifest.url);
  check('Chrome calls the site installable', inst.installabilityErrors && !inst.installabilityErrors.length,
    inst.err || (inst.installabilityErrors || []).map((e) => e.errorId).join(', ') || 'no installability errors');

  const rep = await cacheReport();
  const strays = rep.keys.filter((k) => !k.startsWith(ORIGIN + '/') || k.includes('?') || k.includes('#'));
  check('one cache, holding only this site, one copy per path',
    rep.names.length === 1 && rep.names[0] === PREFIX + VERSION && !strays.length,
    `${rep.names.join(', ')}${strays.length ? '; strays: ' + strays.slice(0, 3).join(', ') : ''}`);
  check('bounded: never more than the site itself, and not what it never loads',
    rep.bytes <= clientBytes && !rep.keys.some((k) => k.endsWith('/vendor/three/index.mjs')),
    `${rep.files} files, ${mb(rep.bytes)} of a ${mb(clientBytes)} client`);
  console.log('        kept: ' + Object.entries(rep.by).sort((a, b) => b[1] - a[1])
    .map(([g, n]) => `${g} ${mb(n)}`).join(', '));
  const firstKeys = rep.keys.length;

  /* -------------------------------------------------------------- *
   * 3. Network off.
   * -------------------------------------------------------------- */
  console.log('\nNetwork off');
  await offline();
  clean();
  const t1 = Date.now();
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  const offBoot = await booted();
  const off = offBoot ? await bootState() : null;
  check('boots to the world with the network off', offBoot && off && !off.failed.length,
    offBoot ? `${((Date.now() - t1) / 1000).toFixed(1)} s, failed systems: ${off.failed.join(', ') || 'none'}`
      : 'did not boot');
  check('the page really was offline', off && off.online === false, off ? `navigator.onLine=${off.online}` : '');
  check('no page errors, no console errors, no file missing', !pageErrors.length && !consoleErrors.length
    && !failed.length, [...pageErrors, ...consoleErrors, ...failed].slice(0, 3).join(' | ') || 'clean');
  const metres = offBoot ? await walk() : -1;
  check('and plays: the player walks', metres > 0.25, `${metres.toFixed(2)} m on the arrow`);

  /* -------------------------------------------------------------- *
   * 4. A deploy.
   * -------------------------------------------------------------- */
  console.log('\nA deploy lands');
  await online();
  overrides.set('/index.html', Buffer.from(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace('<head>', '<head>\n<meta name="vd-deploy" content="2">')));
  overrides.set('/src/main.js', Buffer.concat([fs.readFileSync(path.join(ROOT, 'src/main.js')),
    Buffer.from('\nwindow.__vdDeploy = 2;\n')]));
  // loaded by computed path from GameApp._load, deep in the boot
  overrides.set('/src/game/ui/UISystem.js', Buffer.concat([fs.readFileSync(path.join(ROOT, 'src/game/ui/UISystem.js')),
    Buffer.from('\nglobalThis.__vdDeployUI = 2;\n')]));
  clean();
  const before = served;
  // goto, not reload: a reload revalidates the document by itself, and the
  // worker's own upgrade of a 'default' navigation is what is under test
  await page.goto(`${ORIGIN}/?sw`, { waitUntil: 'load' });
  const deployBoot = await booted();
  const dep = deployBoot ? await bootState() : null;
  check('the next load shows the deploy, not the kept copy',
    dep && dep.deployMeta && dep.deploy === 2 && dep.deployUI === 2,
    dep ? `index.html ${dep.deployMeta ? 'new' : 'OLD'}, main.js ${dep.deploy ? 'new' : 'OLD'}, `
      + `UISystem.js ${dep.deployUI ? 'new' : 'OLD'}; ${served - before} requests reached the server` : 'did not boot');
  const follow = await page.waitForFunction(async () => {
    const text = async (p) => { const r = await caches.match(location.origin + p); return r ? r.text() : ''; };
    return (await text('/src/main.js')).includes('__vdDeploy')
      && (await text('/src/game/ui/UISystem.js')).includes('__vdDeployUI')
      && (await text('/')).includes('vd-deploy');
  }, null, { timeout: 30000, polling: 500 }).then(() => true, () => false);
  check('the kept copy follows the deploy', follow);

  /* -------------------------------------------------------------- *
   * 5. Offline after the deploy: the NEW build.
   * -------------------------------------------------------------- */
  console.log('\nNetwork off, after the deploy');
  await offline();
  clean();
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  const offBoot2 = await booted();
  const off2 = offBoot2 ? await bootState() : null;
  check('opens the new build offline, not the one kept before it',
    off2 && off2.deployMeta && off2.deploy === 2 && off2.deployUI === 2 && !off2.failed.length,
    off2 ? `deploy markers ${off2.deployMeta}/${off2.deploy}/${off2.deployUI}, failed: ${off2.failed.join(', ') || 'none'}`
      : 'did not boot');
  check('still clean', !pageErrors.length && !consoleErrors.length && !failed.length,
    [...pageErrors, ...consoleErrors, ...failed].slice(0, 3).join(' | ') || 'clean');

  /* -------------------------------------------------------------- *
   * 6. A new worker.
   * -------------------------------------------------------------- */
  console.log('\nA new sw.js');
  await online();
  const NEXT = VERSION + '-next';
  overrides.set('/sw.js', Buffer.from(swSrc.replace(`const VERSION = '${VERSION}'`, `const VERSION = '${NEXT}'`)));
  clean();
  await page.goto(`${ORIGIN}/?sw`, { waitUntil: 'load' });
  const swapped = await page.waitForFunction(async (want) => {
    const names = await caches.keys();
    const reg = await navigator.serviceWorker.getRegistration();
    return names.length === 1 && names[0] === want && !!navigator.serviceWorker.controller
      && reg && !reg.waiting && !reg.installing;
  }, PREFIX + NEXT, { timeout: 90000, polling: 500 }).then(() => true, () => false);
  const kept2 = swapped ? await waitKept(iconFiles.concat('/manifest.webmanifest')) : { ok: false, missing: [] };
  const rep2 = await cacheReport();
  check('takes over on the next load, with nobody closing a tab', swapped,
    `caches now: ${rep2.names.join(', ') || 'none'}`);
  // nothing was deleted from the site, so nothing may be lost in the move
  check('carries the offline copy across, and drops the old cache', swapped && kept2.ok
    && rep2.files >= firstKeys,
    `${rep2.files} files in the new cache (${firstKeys} in the old)`
    + (kept2.missing && kept2.missing.length ? `; missing ${kept2.missing.slice(0, 3).join(', ')}` : ''));

  /* -------------------------------------------------------------- *
   * 7. Offline, under the new worker.
   * -------------------------------------------------------------- */
  console.log('\nNetwork off, under the new worker');
  await booted();   // let this load finish before pulling the plug
  await offline();
  clean();
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  const offBoot3 = await booted();
  const off3 = offBoot3 ? await bootState() : null;
  check('boots offline from the new cache', off3 && !off3.failed.length && off3.deploy === 2
    && !pageErrors.length && !consoleErrors.length && !failed.length,
    off3 ? `failed: ${off3.failed.join(', ') || 'none'}; `
      + ([...pageErrors, ...consoleErrors, ...failed].slice(0, 2).join(' | ') || 'clean') : 'did not boot');

  console.log(`\noffline copy: ${rep.files} files, ${mb(rep.bytes)} (whole client ${mb(clientBytes)})`);
} catch (e) {
  check('ran to the end', false, e.stack || e.message);
} finally {
  await ctx.close().catch(() => {});
  if (server.listening) await goDown();
  fs.rmSync(profile, { recursive: true, force: true });
}

const bad = results.filter((x) => !x).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
