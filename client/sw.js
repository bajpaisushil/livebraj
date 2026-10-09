/**
 * The service worker: the Dham, kept for when there is no network.
 *
 * The APK opens in a field with no signal because its files are on the phone.
 * The browser build had nothing of the kind, so it died the moment the network
 * did. This keeps a copy of what the game loads and serves that copy ONLY when
 * the network cannot answer. index.html holds the page's half (registration,
 * and reporting what the page loaded); this is the worker's half.
 *
 * NETWORK FIRST, ALWAYS
 *
 * This site deploys on every push and nothing in it is content-hashed. A
 * cache-first worker would go on serving last week's game after a push — and
 * someone has already once decided a push had not landed because the browser
 * was showing an old build. So every same-origin request goes to the server
 * first, and a request in the browser's 'default' cache mode is upgraded to
 * 'no-cache': revalidate with the server rather than trust the HTTP cache. That
 * matters more than it looks. vercel.json lets src/ sit in the HTTP cache for
 * five minutes and then serve the stale copy once more while it revalidates, so
 * a plain fetch() would hand back the old module on the first reload after a
 * push. A revalidation that finds nothing changed is a 304 with no body: this
 * costs a round trip per file, not a download — about seven sequential round
 * trips for the whole boot, because the import graph is six modules deep below
 * main.js.
 *
 * The kept copy is used only when fetch() itself fails, which is to say when
 * there is no network. A slow network is still the network: there is no timeout
 * that falls back to the cache, because half a boot from the server and half
 * from last week is two builds glued together, and that breaks in ways nobody
 * would ever reproduce.
 *
 * Every good response is written back, so the kept copy follows the deploys: on
 * the next online load each file the game asks for is replaced by the one the
 * server has now. Unchanged files are not rewritten — the server's validators
 * (ETag, else Last-Modified) say so, and a phone is spared five megabytes of
 * writes on every boot.
 *
 * WHAT GETS KEPT — AND WHY THERE IS NO LIST
 *
 * There is no list of the game's files here, on purpose. Nine modules were
 * added to client/src in the week this was written; a list would have been
 * wrong nine times, and each time the offline boot would have died on the one
 * module nobody remembered to add, with nothing to say so until someone was
 * actually offline. Modules are also loaded by computed path (GameApp._load), so
 * not even a crawler of the import statements would find them all.
 *
 * Instead the page reports what it actually loaded. index.html watches its own
 * Resource Timing entries and posts every same-origin URL that did NOT come
 * through this worker — on a first visit, all of them — and this keeps those,
 * from the HTTP cache the page has just filled. Once the worker is in control,
 * everything else is kept as it passes through. The page also posts every face
 * its stylesheets declare, so a panel opened for the first time offline is not
 * drawn in a fallback serif.
 *
 * The one list is SHELL below: the things the BROWSER fetches by itself, out of
 * the page's sight — the document and the install manifest with its icons.
 *
 * BOUNDED
 *
 * Only same-origin GETs are kept, keyed by path with the query string dropped,
 * so the cache holds at most one copy of each file the site serves. The whole
 * client is 6.5 MB, of which a boot loads about 5; vendor/three/index.mjs (a
 * 1.3 MB duplicate of three.module.js that only package.json names) is never
 * loaded and so never kept. tools/checks/offline.mjs measures the real figure.
 * Weather and air quality are other origins: they pass straight through,
 * untouched and unkept, so offline they fail exactly as they always have —
 * silently.
 *
 * VERSION
 *
 * VERSION names the cache. It is NOT bumped per deploy: a deploy changes files,
 * and network-first replaces each one as it is next loaded. Bump it when the way
 * things are kept changes. A new version installs, carries every file the old
 * cache held into its own — fresh from the server where it can, the old copy
 * where it cannot, dropped if the server says it is gone — and only then takes
 * over (skipWaiting, clients.claim) and deletes the old cache. An update never
 * leaves a phone without its offline copy, and nobody has to close a tab for it
 * to take effect.
 *
 * vercel.json serves this file with no-store, so neither the CDN nor the browser
 * holds an old copy of it; the browser re-checks it on every navigation.
 *
 * RETIRING IT
 *
 * Deleting this file does NOT remove the worker: a browser whose update check
 * gets a 404 keeps running the copy it has. To take it off every device,
 * replace this file with one whose install calls skipWaiting(), whose activate
 * deletes every cache starting with PREFIX, calls self.registration.unregister()
 * and navigates its clients, and whose fetch handler does nothing.
 */

const VERSION = 'v1';
const PREFIX = 'vrindavan-dham-offline-';
const CACHE = PREFIX + VERSION;

/**
 * What the browser fetches by itself. The page can see neither: the document is
 * a navigation, not a resource, and the manifest and its icons are fetched for
 * the install prompt and the home-screen tile by the browser, not by the page.
 */
const SHELL = [
  './',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
];

/** Absolute URL of a path relative to where this worker lives. */
const abs = (u) => new URL(u, self.registration.scope).href;

/**
 * The cache key: the path, without query or hash. `/?reset` and `/` are the same
 * document, and a cache-busting `?d=` on a same-origin image would otherwise
 * grow a new entry every day.
 */
function keyOf(u) {
  const url = new URL(u, self.registration.scope);
  url.search = '';
  url.hash = '';
  return url.href;
}

const ours = (url) => url.origin === self.location.origin;

/**
 * Worth keeping: a whole, same-origin, unredirected success. A 206 is a slice of
 * a file; a redirect is how a captive portal answers, and keeping a Wi-Fi login
 * page under the name of a module would poison the offline boot.
 */
const keepable = (res) => !!res && res.status === 200 && res.type === 'basic' && !res.redirected;

/** The same file by the server's own validators, so there is nothing to write. */
function unchanged(kept, res) {
  const tag = res.headers.get('etag');
  if (tag) return tag === kept.headers.get('etag');
  const mod = res.headers.get('last-modified');
  return !!mod && mod === kept.headers.get('last-modified')
    && res.headers.get('content-length') === kept.headers.get('content-length');
}

/* ------------------------------------------------------------------
 * Install: the shell, plus everything an older version kept.
 * ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // which older cache holds each URL, so it can be carried across
    const carried = new Map();
    for (const name of await caches.keys()) {
      if (!name.startsWith(PREFIX) || name === CACHE) continue;
      for (const req of await (await caches.open(name)).keys()) {
        if (!carried.has(req.url)) carried.set(req.url, name);
      }
    }

    const urls = new Set([...SHELL.map(abs), ...carried.keys()]);
    await Promise.all([...urls].map(async (u) => {
      try {
        const res = await fetch(u, { cache: 'no-cache' });
        if (keepable(res)) { await cache.put(u, res); return; }
        if (res.status === 404 || res.status === 410) return;   // gone from the site: let it go
      } catch { /* no network, or the server is having a moment */ }
      const from = carried.get(u);
      const old = from && await (await caches.open(from)).match(u, { ignoreVary: true });
      if (old) await cache.put(u, old);
    }));

    // Without the document there is nothing to open offline. Fail the install;
    // the page registers again on its next load and this is retried.
    if (!(await cache.match(abs('./'), { ignoreVary: true }))) throw new Error('offline shell not kept');
    await self.skipWaiting();
  })());
});

/* ------------------------------------------------------------------
 * Activate: drop the older caches, and take over the open pages now.
 * ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

/* ------------------------------------------------------------------
 * Fetch: the network first; the kept copy only when there is none.
 * ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  // Another origin is the browser's own business. Not calling respondWith hands
  // the request back exactly as if there were no worker at all.
  if (!ours(new URL(req.url))) return;
  event.respondWith(networkFirst(event, req));
});

async function networkFirst(event, req) {
  const key = keyOf(req.url);

  // 'default' would let the HTTP cache answer for the server; ask the server.
  // A request that chose its own mode (a reload's no-cache, a back button's
  // force-cache) keeps it.
  let ask = req;
  if (req.cache === 'default') {
    try { ask = new Request(req, { cache: 'no-cache' }); } catch { /* keep req as it came */ }
  }

  let res;
  try {
    res = await fetch(ask);
  } catch {
    const kept = await fromKept(key, req);
    return kept ? forPage(kept) : Response.error();
  }

  if (keepable(res)) {
    try {
      const cache = await caches.open(CACHE);
      const kept = await cache.match(key, { ignoreVary: true });
      if (!kept || !unchanged(kept, res)) {
        event.waitUntil(cache.put(key, res.clone()).catch(() => { /* quota: online still works */ }));
      }
    } catch { /* storage unavailable: online still works */ }
  }
  return forPage(res);
}

/**
 * What the page is handed: the same bytes, marked to be asked for again.
 *
 * Network-first is only as good as the requests that reach it, and not all of
 * them do. Chrome keeps the files a page has loaded in a memory cache of its
 * own, inside the tab, and the next page in that tab is handed any of them
 * still fresh by their Cache-Control WITHOUT the request coming here at all.
 * Measured: after a deploy, the next load came through this worker for the
 * document and then took main.js, GameApp.js and UISystem.js straight from
 * that memory, the copies an offline load had been given — workerStart 0,
 * deliveryType "cache", nothing sent to the server. The new index.html ran the
 * old game, which is two builds glued together.
 *
 * So whatever goes to the page says no-cache. Chrome may still keep it, but
 * must ask before using it again, and asking comes here, where the server is
 * asked in turn. The copy kept for offline is untouched — its validators are
 * what `unchanged` compares — and so is the HTTP cache below this worker,
 * which revalidates for a 304 rather than downloading the file again.
 *
 * Only a whole, same-origin success is rewritten. A redirect has to reach the
 * page as a redirect, or a navigation forgets where it ended up; anything else
 * is passed on exactly as it came.
 */
function forPage(res) {
  if (!keepable(res)) return res;
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'no-cache');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function fromKept(key, req) {
  try {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key, { ignoreVary: true });
    if (hit) return hit;
    // any page of the game, asked for offline, is the game
    if (req.mode === 'navigate') return await cache.match(abs('./'), { ignoreVary: true });
  } catch { /* storage unavailable */ }
  return undefined;
}

/* ------------------------------------------------------------------
 * Keep: what the page loaded before this worker could see it.
 * ------------------------------------------------------------------ */
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.type !== 'keep' || !Array.isArray(msg.urls)) return;
  event.waitUntil(keep(msg.urls).then((done) => {
    if (event.source) event.source.postMessage({ type: 'kept', ...done });
  }));
});

/**
 * Keep each URL, from the HTTP cache where the page has just put it.
 *
 * 'force-cache' is deliberate, and the opposite of the fetch handler: the page
 * has just RUN these bytes, and the copy worth keeping is the one that ran. A
 * revalidation here could fetch a newer file from a deploy that landed a minute
 * ago and keep it beside older ones the page loaded before it — two builds in
 * one offline copy. If the HTTP cache has lost a file, this simply fetches it.
 */
async function keep(urls) {
  const cache = await caches.open(CACHE);
  let wrote = 0;
  await Promise.all(urls.map(async (u) => {
    let url;
    try { url = new URL(u); } catch { return; }
    if (!ours(url)) return;
    const key = keyOf(url.href);
    try {
      const res = await fetch(key, { cache: 'force-cache' });
      if (!keepable(res)) return;
      const kept = await cache.match(key, { ignoreVary: true });
      if (kept && unchanged(kept, res)) return;
      await cache.put(key, res);
      wrote++;
    } catch { /* offline, or storage full: it stays as it was */ }
  }));
  return { wrote, files: (await cache.keys()).length };
}
