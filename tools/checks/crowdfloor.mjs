/**
 * Does the crowd stand ON a floor — and can it afford to?
 *
 * Every walker, cow, rickshaw and seated pilgrim took `groundHeight`, which is
 * the terrain and nothing built on it, so anyone crossing Prem Mandir's plaza
 * walked with their feet inside the paving. The player has stood on floors
 * for a long time through `standHeight`, but that walks every standable in the
 * world on every call — fine once a frame, milliseconds a frame for a crowd.
 * So the crowd asks `standHeightFast`, the same rules read through a grid of
 * cells, and this checks the three things that have to be true of it:
 *
 *   SAME   — exactly the full scan's answer, to the bit: at thousands of
 *            points round every landmark, from feet below, on and above what
 *            is there; on the edges of every surface and of every cell, which
 *            is where an index goes wrong if it is going to; and after
 *            colliders have been put into the world and taken out again.
 *   CHEAP  — per call, and per crowd frame against both the terrain lookup it
 *            replaced and the full scan it saves.
 *   SEEN   — a person, a cow, a rickshaw and a seated pilgrim put on Prem
 *            Mandir's paving stand on its top, and the matrix that is actually
 *            drawn puts the soles there too.
 *
 *   node tools/checks/crowdfloor.mjs
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

/*
 * The index's own numbers, read from the source rather than copied here, so
 * the edges this tests are the edges the code has and not the ones it had
 * when this was written.
 */
const SRC = fs.readFileSync(path.join(ROOT, 'src/game/world/WorldService.js'), 'utf8');
const CELL = Number((SRC.match(/const STAND_CELL = ([\d.]+);/) || [])[1]);
const PAD = Number((SRC.match(/const STAND_PAD = ([\d.]+);/) || [])[1]);

const results = [];
const errors = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
check('the index constants are where this expects them', CELL > 0 && PAD > 0,
  `STAND_CELL ${CELL} m, STAND_PAD ${PAD} m`);

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/navigator\.vibrate/.test(t)) errors.push(t); });
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.crowd && window.vrindavan?.ctx?.gatherings
  && window.vrindavan?.ctx?.ui && window.vrindavan?.ctx?.world?._ready, null, { timeout: 240000 });
await p.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(500);

/* ================================================================
 * SAME — the index against the full scan, everywhere it could differ
 * ================================================================ */
const same = await p.evaluate(({ CELL, PAD }) => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  // seeded, so a disagreement found once can be found again
  let seed = 20261008;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };

  let n = 0, lifted = 0, cut = 0, open = 0;
  const bad = [];
  const ask = (x, z, feet, why) => {
    const full = w.standHeight(x, z, feet);
    const fast = w.standHeightFast(x, z, feet);
    n++;
    if (full !== fast) {
      if (bad.length < 6) bad.push({ why, x, z, feet: +feet.toFixed(4), full, fast });
      return;
    }
    const g = w.groundHeight(x, z);
    if (full > g) lifted++; else if (full < g) cut++; else open++;
  };

  /*
   * Round every landmark, from four kinds of feet: somewhere random about the
   * terrain; on whatever the full scan says is there; a step above it, so the
   * next surface up comes into reach; and a step below it, so a cut tread does.
   */
  for (const loc of ctx.data.LOCATIONS) {
    const R = (loc.build ? Math.max(loc.build.w, loc.build.d) * 0.7 : 30) + 25;
    for (let k = 0; k < 50; k++) {
      const x = loc.pos[0] + (rnd() * 2 - 1) * R, z = loc.pos[1] + (rnd() * 2 - 1) * R;
      const g = w.groundHeight(x, z);
      const there = w.standHeight(x, z, g);
      ask(x, z, g + rnd() * 4 - 1.5, 'near ' + loc.id);
      ask(x, z, there, 'on what is there at ' + loc.id);
      ask(x, z, there + rnd() * 0.52, 'a step above at ' + loc.id);
      ask(x, z, there - rnd() * 0.52, 'a step below at ' + loc.id);
    }
  }
  const landmarkPoints = n;

  /*
   * The edges. A surface is filed by its cheap bound, `r + STAND_PAD` either
   * side of its centre, so the exact edge of that bound is the one place a
   * filing could be a hair short — and the corners and sides of the padded
   * shape are where the shaped test itself is decided. Asked from the
   * surface's own top, so it is in reach and the answer turns on the edge.
   */
  for (const c of w.standables) {
    const e = c.r + PAD;
    for (const [dx, dz] of [[e, 0], [-e, 0], [0, e], [0, -e]]) ask(c.x + dx, c.z + dz, c.top, 'cheap edge of ' + c.tag);
    if (c.type === 'circle') {
      for (const th of [0.3, 1.9, 3.5, 5.1]) {
        ask(c.x + Math.cos(th) * e, c.z + Math.sin(th) * e, c.top, 'rim of ' + c.tag);
      }
    } else {
      // local to world: the transpose of the rotation `_overlaps` applies
      const at = (lx, lz) => [c.x + lx * c.cos + lz * c.sin, c.z - lx * c.sin + lz * c.cos];
      const hx = c.hw + PAD, hz = c.hd + PAD;
      for (const [lx, lz] of [[hx, hz], [-hx, hz], [hx, -hz], [-hx, -hz], [hx, 0], [-hx, 0], [0, hz], [0, -hz]]) {
        const [x, z] = at(lx, lz);
        ask(x, z, c.top, 'padded side of ' + c.tag);
      }
    }
    /*
     * And the cell lines through it: a point exactly on a line belongs to the
     * cell above it, and a hair either side belongs to one cell or the other.
     */
    const bx = Math.round(c.x / CELL) * CELL, bz = Math.round(c.z / CELL) * CELL;
    for (const d of [0, 1e-7, -1e-7]) {
      ask(bx + d, c.z, c.top, 'cell line by ' + c.tag);
      ask(c.x, bz + d, c.top, 'cell line by ' + c.tag);
      ask(bx + d, bz + d, c.top, 'cell corner by ' + c.tag);
    }
  }
  return { n, landmarkPoints, edgePoints: n - landmarkPoints, lifted, cut, open, bad,
    standables: w.standables.length, locations: ctx.data.LOCATIONS.length };
}, { CELL, PAD });

check('the index answers exactly as the full scan does', same.bad.length === 0 && same.n > 20000,
  `${same.n} questions (${same.landmarkPoints} round ${same.locations} landmarks, `
  + `${same.edgePoints} on the edges of ${same.standables} surfaces and their cells), `
  + `${same.bad.length ? same.bad.length + '+ disagree: ' + JSON.stringify(same.bad.slice(0, 3)) : 'not one disagrees'}`);
/*
 * Agreement is only worth something if the questions had answers other than
 * "the terrain": a test asked only of open ground agrees about nothing.
 */
check('and the questions were about floors, not just open ground',
  same.lifted > 2000 && same.cut > 50,
  `${same.lifted} answered by a surface above the terrain, ${same.cut} by a tread cut below it, `
  + `${same.open} by the terrain itself`);

/* ---- SAME after colliders have come and gone ---- */
const churn = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const TAG = 'crowdfloor-probe';
  /*
   * Six patches of open ground, each a road node with nothing built on it,
   * and on each a box, a turned box, a circle and a backstop: the four kinds
   * of thing `_standOn` treats differently. GatheringSystem does this for
   * real every time the hour changes; this does it where the answer is known.
   */
  const nodes = [...ctx.nav.nodes.values()];
  const spots = [];
  for (let i = 0; i < nodes.length && spots.length < 6; i += 997) {
    const q = nodes[i];
    const g = w.groundHeight(q.x, q.z);
    let clear = true;
    for (let k = 0; k < 9 && clear; k++) {
      const x = q.x + ((k % 3) - 1) * 6, z = q.z + (Math.floor(k / 3) - 1) * 6;
      if (w.standHeight(x, z, w.groundHeight(x, z)) !== w.groundHeight(x, z)) clear = false;
    }
    if (clear) spots.push({ x: q.x, z: q.z, g });
  }
  const list = [];
  const probe = [];
  for (const s of spots) {
    list.push({ type: 'box', x: s.x - 3, z: s.z, w: 2.4, d: 1.6, top: s.g + 0.30, tag: TAG });
    list.push({ type: 'box', x: s.x + 3, z: s.z, w: 3.0, d: 1.0, rot: 0.7, top: s.g + 0.21, tag: TAG, standOnly: true });
    list.push({ type: 'circle', x: s.x, z: s.z + 3, r: 1.1, top: s.g + 0.44, tag: TAG, floor: true });
    list.push({ type: 'box', x: s.x, z: s.z - 3, w: 2.0, d: 2.0, top: s.g + 0.12, tag: TAG, soft: true, standOnly: true });
    for (const c of list.slice(-4)) {
      probe.push({ x: c.x, z: c.z, top: c.top, g: w.groundHeight(c.x, c.z) });
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, d = 0.6 + (k % 4) * 0.45;
        probe.push({ x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d, top: null, g: w.groundHeight(c.x, c.z) });
      }
    }
  }
  const disagree = () => {
    let bad = 0;
    for (const q of probe) {
      for (const f of [q.g, q.g + 0.25, q.g - 0.2]) {
        if (w.standHeight(q.x, q.z, f) !== w.standHeightFast(q.x, q.z, f)) bad++;
      }
    }
    return bad;
  };
  const centres = probe.filter((q) => q.top !== null);
  const before = centres.map((q) => w.standHeightFast(q.x, q.z, q.g));

  w.addColliders(list);
  const inBad = disagree();
  const onTop = centres.filter((q) => w.standHeightFast(q.x, q.z, q.g) === q.top).length;

  const gone = w.removeColliders(TAG);
  const outBad = disagree();
  const back = centres.filter((q, i) => w.standHeightFast(q.x, q.z, q.g) === before[i]).length;
  let left = 0;
  for (const [, cell] of w._standCells) for (const c of cell) if (c.tag === TAG) left++;
  return { spots: spots.length, added: list.length, gone, probes: probe.length * 3, inBad, outBad,
    onTop, back, centres: centres.length, left };
});
check('put in and taken out, the index keeps step with the list',
  churn.spots >= 3 && churn.inBad === 0 && churn.outBad === 0 && churn.left === 0
    && churn.gone === churn.added,
  `${churn.added} surfaces on ${churn.spots} patches of open ground: ${churn.probes} questions `
  + `with them in, ${churn.inBad} disagree; ${churn.gone} taken out, ${churn.outBad} disagree, `
  + `${churn.left} left behind in the index`);
check('...and they really were stood on, then really were gone',
  churn.onTop === churn.centres && churn.back === churn.centres,
  `${churn.onTop}/${churn.centres} centres on their surface's top while it was there, `
  + `${churn.back}/${churn.centres} back to what they were once it was not`);

/* ================================================================
 * CHEAP — per call, and per crowd frame
 * ================================================================ */
const cost = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world, crowd = ctx.crowd;
  const agents = [];
  for (const slot of crowd.peopleInst) for (const a of slot.agents) agents.push(a);
  for (const a of crowd.cows) agents.push(a);
  for (const a of crowd.dogs) agents.push(a);
  for (const slot of crowd.vehicleInst) for (const a of slot.agents) agents.push(a);
  /*
   * The batch is the crowd itself: every agent where it stands, from its own
   * feet — exactly the questions one crowd frame asks.
   */
  const batch = agents.map((a) => [a.x, a.z, a.y]);
  const per = (fn, reps) => {
    let acc = 0;
    const t0 = performance.now();
    for (let r = 0; r < reps; r++) for (let i = 0; i < batch.length; i++) acc += fn(batch[i][0], batch[i][1], batch[i][2]);
    return { us: (performance.now() - t0) * 1000 / (reps * batch.length), acc };
  };
  const full = (x, z, f) => w.standHeight(x, z, f);
  const fast = (x, z, f) => w.standHeightFast(x, z, f);
  const ground = (x, z) => w.groundHeight(x, z);
  per(full, 1); per(fast, 20); per(ground, 20);          // warm the JIT
  const t = { full: [], fast: [], ground: [] };
  // interleaved, so a machine that is busy for a moment is busy for all three
  for (let round = 0; round < 7; round++) {
    t.full.push(per(full, 4).us);
    t.fast.push(per(fast, 200).us);
    t.ground.push(per(ground, 1000).us);
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

  /*
   * The crowd frame, three ways, by swapping what the crowd calls: the
   * terrain alone (what it did before), the index (what it does now), and the
   * full scan (what it would cost to have done this without the index).
   */
  const ways = {
    ground: (x, z) => w.groundHeight(x, z),
    index: null,
    full: (x, z, f, m) => w.standHeight(x, z, f, m),
  };
  const frame = { ground: [], index: [], full: [] };
  const use = (k) => { if (ways[k]) w.standHeightFast = ways[k]; else delete w.standHeightFast; };
  for (const k of Object.keys(ways)) { use(k); for (let i = 0; i < 10; i++) crowd.update(1 / 30, ctx); }
  for (let round = 0; round < 6; round++) {
    for (const k of Object.keys(ways)) {
      use(k);
      const t0 = performance.now();
      for (let i = 0; i < 30; i++) crowd.update(1 / 30, ctx);
      frame[k].push((performance.now() - t0) / 30);
    }
  }
  delete w.standHeightFast;

  // GatheringSystem asks once per person, at build: what that costs either way
  const G = ctx.gatherings;
  const seats = [];
  for (const g of G.gatherings) { seats.push([g.x, g.z]); for (const m of g.members) seats.push([m.x, m.z]); }
  let t0 = performance.now();
  for (let r = 0; r < 20; r++) for (const [x, z] of seats) w.standHeight(x, z, w.groundHeight(x, z));
  const seatFull = (performance.now() - t0) / 20;
  t0 = performance.now();
  for (let r = 0; r < 20; r++) for (const [x, z] of seats) G._seatY(x, z);
  const seatFast = (performance.now() - t0) / 20;

  return {
    agents: batch.length, standables: w.standables.length,
    full: med(t.full), fast: med(t.fast), ground: med(t.ground),
    frame: { ground: med(frame.ground), index: med(frame.index), full: med(frame.full) },
    seats: seats.length, seatFull, seatFast,
  };
});
const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3);
check('a crowd can afford it: the index is at least ten times cheaper a call',
  cost.fast * 10 < cost.full,
  `full scan of ${cost.standables} surfaces ${f2(cost.full)} µs, index ${f3(cost.fast)} µs, `
  + `terrain alone ${f3(cost.ground)} µs — ${Math.round(cost.full / cost.fast)}x, `
  + `median of 7 over the ${cost.agents} agents' own positions`);
check('and a crowd frame with it costs less than one with the full scan',
  cost.frame.index < cost.frame.full,
  `crowd.update: terrain alone (before) ${f2(cost.frame.ground)} ms, index (now) `
  + `${f2(cost.frame.index)} ms, full scan ${f2(cost.frame.full)} ms`);
console.log(`        (gatherings, once at build: ${cost.seats} seats in ${f2(cost.seatFast)} ms with the index, `
  + `${f2(cost.seatFull)} ms by full scan)`);

/* ================================================================
 * SEEN — on Prem Mandir's paving, in the world and in the matrix drawn
 * ================================================================ */
const seen = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world, crowd = ctx.crowd, G = ctx.gatherings;

  /*
   * The plaza: Prem Mandir's red sandstone, laid at the highest ground under
   * it, so everywhere else on it the terrain is somewhere below the top.
   */
  let plaza = null;
  for (const c of w.standables) if (c.tag === 'prem-plaza' && (!plaza || c.r > plaza.r)) plaza = c;
  if (!plaza) return { ok: false, why: 'no prem-plaza surface' };
  const onPlaza = (x, z) => w._overlaps(plaza, x, z, -2) && w.standHeight(x, z, plaza.top) === plaza.top;

  /*
   * A walk the crowd really takes: two road nodes on the paving, far enough
   * apart for three seconds of walking, with nothing but the paving within a
   * step anywhere in a three-metre corridor between them — so the only right
   * answer, all the way, is the paving's top.
   */
  const nodes = [...ctx.nav.nodes.values()].filter((q) => onPlaza(q.x, q.z));
  nodes.sort((a, c) => (w.groundHeight(a.x, a.z) - w.groundHeight(c.x, c.z)));
  const clean = (a, c) => {
    const L = Math.hypot(c.x - a.x, c.z - a.z), ux = (c.x - a.x) / L, uz = (c.z - a.z) / L;
    for (let s = 0; s <= L; s += 0.25) {
      for (const off of [-1.5, 0, 1.5]) {
        if (!onPlaza(a.x + ux * s - uz * off, a.z + uz * s + ux * off)) return false;
      }
    }
    return true;
  };
  let from = null, to = null;
  for (let i = 0; i < nodes.length && !from; i++) {
    for (let j = 0; j < nodes.length; j++) {
      const d = Math.hypot(nodes[j].x - nodes[i].x, nodes[j].z - nodes[i].z);
      if (d >= 16 && d <= 40 && clean(nodes[i], nodes[j])) { from = nodes[i]; to = nodes[j]; break; }
    }
  }
  if (!from) return { ok: false, why: `no clean walk across the paving among ${nodes.length} nodes on it` };

  /*
   * Open paving to set the others down on, off the walker's line: on the
   * plaza, clear of anything solid a rickshaw would be pushed out of, and
   * clear of each other.
   */
  const taken = [[from.x, from.z], [to.x, to.z]];
  const spotNear = (x, z) => {
    for (let r = 5; r <= 30; r += 1.5) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
        if (!onPlaza(sx, sz) || !w.isClear(sx, sz, 1.4)) continue;
        if (taken.some(([tx, tz]) => Math.hypot(tx - sx, tz - sz) < 4)) continue;
        taken.push([sx, sz]);
        return { x: sx, z: sz };
      }
    }
    return null;
  };
  const pen = spotNear(from.x, from.z), rank = spotNear(from.x, from.z);
  const stand = spotNear(from.x, from.z), mat = spotNear(to.x, to.z);
  const ambient = [];
  for (const slot of crowd.vehicleInst) for (const a of slot.agents) if (!a.chartered) ambient.push(a);
  if (!pen || !rank || !stand || !mat) return { ok: false, why: 'no open paving to set the others down on' };
  if (ambient.length < 2) return { ok: false, why: `${ambient.length} unhired vehicles to borrow` };

  // nobody else's business while this runs: no gatherings to walk round, and
  // the player off to one side but near enough for everyone to be drawn
  const onNow = G.gatherings.map((g) => g.onNow);
  for (const g of G.gatherings) g.onNow = false;
  const P = ctx.player.root.position;
  const saveP = P.clone();
  P.set(from.x, plaza.top, from.z + 14);

  // the walker starts where the old code had them: on the terrain, in the stone
  const person = crowd.peopleInst[0].agents[0];
  Object.assign(person, { x: from.x, z: from.z, y: w.groundHeight(from.x, from.z), idle: 0, greeting: 0,
    target: to, node: to, edgeKind: 'path', side: 1 });
  const cow = crowd.cows[0];
  Object.assign(cow, { x: pen.x, z: pen.z, y: w.groundHeight(pen.x, pen.z), idle: 0, target: { x: to.x, z: to.z } });
  // a rickshaw waiting on the paving, and one somebody has hired
  const cab = ambient[0], booked = ambient[1];
  const wasChartered = booked.chartered;
  Object.assign(cab, { x: rank.x, z: rank.z, y: w.groundHeight(rank.x, rank.z), idle: 30, greeting: 0, vel: 0, throttle: 0, target: null });
  Object.assign(booked, { x: stand.x, z: stand.z, y: 0, chartered: true });

  let worstPerson = 0, worstCow = 0, deepest = 0, shallowest = Infinity, onFrames = 0, cowFrames = 0;
  for (let i = 0; i < 90; i++) {
    crowd.update(1 / 30, ctx);
    const g = w.groundHeight(person.x, person.z);
    if (onPlaza(person.x, person.z)) {
      onFrames++;
      worstPerson = Math.max(worstPerson, Math.abs(person.y - plaza.top));
      deepest = Math.max(deepest, plaza.top - g);
      shallowest = Math.min(shallowest, plaza.top - g);
    }
    if (onPlaza(cow.x, cow.z)) { cowFrames++; worstCow = Math.max(worstCow, Math.abs(cow.y - plaza.top)); }
  }
  const walked = Math.hypot(person.x - from.x, person.z - from.z);

  /*
   * What is DRAWN. Stand them still, so no walking bob rides on the height,
   * write one more frame, and read their instance matrix back out of the mesh:
   * its translation is where the model's origin goes, and the model's lowest
   * vertex is the soles.
   */
  person.idle = 10;
  crowd.update(1 / 30, ctx);
  const slot = crowd.peopleInst[0];
  const far2 = ctx.quality.drawDistance * ctx.quality.drawDistance;
  let idx = 0;
  for (const a of slot.agents) {
    if (a === person) break;
    const dx = a.x - P.x, dz = a.z - P.z;
    if (dx * dx + dz * dz <= far2) idx++;
  }
  const geo = slot.mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const m = slot.mesh.instanceMatrix.array;
  const drawnY = m[idx * 16 + 13];
  // ...and it is THEIR matrix: the instance's x and z are where they are
  const drawnTheirs = idx < slot.mesh.count
    && Math.abs(m[idx * 16 + 12] - person.x) < 0.01 && Math.abs(m[idx * 16 + 14] - person.z) < 0.01;
  const sole = drawnY + geo.boundingBox.min.y;
  const terrainHere = w.groundHeight(person.x, person.z);

  // somebody sitting down here, through GatheringSystem's own placement
  const sitter = G._member('kirtan', 'seated', () => 0.5, mat.x, mat.z, 0, 0, 0, 0);

  const out = {
    ok: true, plazaTop: plaza.top, from: [from.x, from.z], to: [to.x, to.z], walked, onFrames, cowFrames,
    worstPerson, worstCow, deepest, shallowest,
    drawnY, drawnTheirs, idx, sole, soleMinY: geo.boundingBox.min.y, terrainHere, personY: person.y,
    cabY: cab.y, cabTerrain: w.groundHeight(cab.x, cab.z), cabOn: onPlaza(cab.x, cab.z),
    bookedY: booked.y, bookedTerrain: w.groundHeight(booked.x, booked.z),
    sitterY: sitter.y, sitterTerrain: w.groundHeight(sitter.x, sitter.z),
  };

  // put back what was borrowed
  booked.chartered = wasChartered;
  G.gatherings.forEach((g, i) => { g.onNow = onNow[i]; });
  P.copy(saveP);
  person.idle = 0; person.target = null;
  return out;
});

if (!seen.ok) {
  check('a walk across Prem Mandir\'s paving to measure', false, seen.why);
} else {
  const cm = (v) => (v * 100).toFixed(1) + ' cm';
  check('a walk across Prem Mandir\'s paving to measure', seen.onFrames >= 60 && seen.walked > 2,
    `${seen.walked.toFixed(1)} m from [${seen.from.map(Math.round)}] toward [${seen.to.map(Math.round)}], `
    + `${seen.onFrames}/90 frames on the paving, whose top is ${seen.plazaTop.toFixed(3)} m`);
  check('a person walking it has their feet on the paving, not in it', seen.worstPerson < 1e-9,
    `furthest from the top: ${seen.worstPerson.toExponential(1)} m; the terrain under them ran `
    + `${cm(seen.shallowest)} to ${cm(seen.deepest)} below it, which is how deep the old code had them`);
  check('so does a cow', seen.cowFrames >= 60 && seen.worstCow < 1e-9,
    `${seen.cowFrames}/90 frames on the paving, furthest from the top: ${seen.worstCow.toExponential(1)} m`);
  check('the matrix that is drawn puts their soles on the paving',
    seen.drawnTheirs && Math.abs(seen.sole - seen.plazaTop) < 1e-4,
    `instance ${seen.idx}${seen.drawnTheirs ? '' : ' (NOT theirs: x/z do not match)'}: y ${seen.drawnY.toFixed(4)} `
    + `+ model foot ${seen.soleMinY.toFixed(4)} = soles at ${seen.sole.toFixed(4)} m, `
    + `paving ${seen.plazaTop.toFixed(4)}, terrain ${seen.terrainHere.toFixed(4)}`);
  check('a rickshaw waiting on it sits on it', seen.cabOn && Math.abs(seen.cabY - seen.plazaTop) < 1e-9,
    `${seen.cabY.toFixed(3)} m on paving at ${seen.plazaTop.toFixed(3)}, terrain ${seen.cabTerrain.toFixed(3)}`);
  /*
   * The one agent that stays on the terrain, deliberately: RickshawSystem
   * owns a hired vehicle's height and seats its passenger by `groundHeight`.
   * Pinned here so that changes together with the ride, never by accident.
   */
  check('a hired one stays on the terrain its passenger is seated by',
    seen.bookedY === seen.bookedTerrain,
    `${seen.bookedY.toFixed(3)} m, terrain ${seen.bookedTerrain.toFixed(3)}`);
  check('somebody sitting down on it sits on it', Math.abs(seen.sitterY - seen.plazaTop) < 1e-9,
    `GatheringSystem places them at ${seen.sitterY.toFixed(3)} m, terrain ${seen.sitterTerrain.toFixed(3)}`);
}

/* ---- and every gathering as it stands: on what is under them ---- */
const sat = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world, G = ctx.gatherings;
  let n = 0, off = 0, raised = 0;
  const bad = [];
  for (const g of G.gatherings) {
    const gy = w.standHeight(g.x, g.z, w.groundHeight(g.x, g.z));
    if (g.y !== gy) { off++; if (bad.length < 3) bad.push(g.kind + ' centre ' + (g.y - gy).toFixed(3)); }
    for (const m of g.members) {
      n++;
      // the katha's reader, its first member, is the one person who sits up on
      // the dais — 0.42 m over the ground everyone else is on
      const want = g.kind === 'katha' && m === g.members[0] ? 0.42 : 0;
      const under = w.standHeight(m.x, m.z, w.groundHeight(m.x, m.z));
      if (Math.abs(m.y - under - want) > 1e-9) {
        off++; if (bad.length < 3) bad.push(g.kind + ' ' + m.pose + ' ' + (m.y - under).toFixed(3));
      }
      if (under > w.groundHeight(m.x, m.z)) raised++;
    }
  }
  return { gatherings: G.gatherings.length, n, off, raised, bad };
});
check('everyone at a gathering sits on what is under them',
  sat.off === 0 && sat.n > 100,
  `${sat.n} people at ${sat.gatherings} gatherings, ${sat.off} off it`
  + (sat.bad.length ? ': ' + sat.bad.join(', ') : '')
  + ` (${sat.raised} of them on something built — today the sites keep clear of the landmarks)`);

/* ---- done ---- */
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} assertions passed`);
await b.close();
server.close();
process.exit(passed === results.length ? 0 : 1);
