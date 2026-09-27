/**
 * WHERE DOES THE CAGE END?
 *
 * Four times now the answer to "why am I stuck at the Deities" has been
 * found by looking at what is NEAR the player, and four times that produced
 * a plausible wrong answer. The project's own note on this: "Probes that list
 * what is NEAR a failure will always hand you a plausible wrong answer."
 *
 * So this asks the only question that matters — CAN YOU GET OUT — by
 * replicating the engine's own movement exactly:
 *
 *   p.x/p.z advance, then world.collide(p, 0.42, feet), then
 *   world.standHeight(p.x, p.z, feet)
 *
 * It floods outward from the darshan spot and reports the boundary of what
 * is reachable, plus which colliders sit on that boundary. A cage shows up
 * as a reachable set that does not touch the outside world.
 */
import { chromium } from 'playwright';

const ID = process.argv[2] || 'iskcon-krishna-balaram';
const STEP = 0.30;          // finer than the body radius, so no gap is missed
const SPAN = 46;            // metres each way from the temple centre

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world, null, { timeout: 220000 });

const out = await p.evaluate(({ id, STEP, SPAN }) => {
  const ctx = window.vrindavan.ctx;
  const W = ctx.world;
  const loc = ctx.data.LOCATION_BY_ID.get(id);
  const [cx, cz] = loc.pos;
  const R = 0.42, STEP_UP = 0.52;

  const N = Math.round((SPAN * 2) / STEP);
  const at = (i, j) => [cx - SPAN + i * STEP, cz - SPAN + j * STEP];
  const idx = (i, j) => j * (N + 1) + i;

  /** Can a body at `feet` height walk from cell a to cell b? */
  const canStep = (ax, az, afeet, bx, bz) => {
    const q = { x: bx, y: 0, z: bz };
    W.collide(q, R, afeet);
    // collide pushed us back out of something solid
    if (Math.hypot(q.x - bx, q.z - bz) > 0.02) return null;
    const h = W.standHeight ? W.standHeight(bx, bz, afeet) : W.groundHeight(bx, bz);
    if (h === null || h === undefined) return null;
    if (h - afeet > STEP_UP) return null;          // too tall a riser
    if (afeet - h > 3.0) return null;              // a drop you would not take
    return h;
  };

  // the darshan spot is where the game itself walks you to
  const a = W.anchors && W.anchors[id];
  const sx = a ? a.darshan.x : cx;
  const sz = a ? a.darshan.z : cz;
  const sFeet = W.standHeight ? W.standHeight(sx, sz, 0) : W.groundHeight(sx, sz);

  /*
   * Flood from OUTSIDE, not from a guess at where the player is standing.
   *
   * Starting at the altars and asking "can I escape" only tests the one spot
   * I picked, and I have picked the wrong spot four times. Starting at the
   * edge of the world and asking "what can I NOT reach" tests every spot at
   * once, and every pocket it finds is a place a player can be trapped.
   */
  const px = cx - SPAN + STEP, pz = cz - SPAN + STEP;
  const pFeet = W.standHeight ? W.standHeight(px, pz, 0) : W.groundHeight(px, pz);
  const si = 1, sj = 1;

  const feet = new Float32Array((N + 1) * (N + 1)).fill(NaN);
  const seen = new Uint8Array((N + 1) * (N + 1));
  const queue = [[si, sj, pFeet]];
  seen[idx(si, sj)] = 1;
  feet[idx(si, sj)] = pFeet;

  let reached = 0, minI = si, maxI = si, minJ = sj, maxJ = sj;
  while (queue.length) {
    const [i, j, f] = queue.pop();
    reached++;
    if (i < minI) minI = i; if (i > maxI) maxI = i;
    if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
    const [ax, az] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
      const k = idx(ni, nj);
      if (seen[k]) continue;
      const [bx, bz] = at(ni, nj);
      const h = canStep(ax, az, f, bx, bz);
      if (h === null) continue;
      seen[k] = 1; feet[k] = h;
      queue.push([ni, nj, h]);
    }
  }

  /*
   * Now: which cells can you STAND on that the flood never reached?
   * Each connected group of those is a cage.
   */
  const standable = new Uint8Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const [ax, az] = at(i, j);
      const g = W.groundHeight(ax, az);
      const h = W.standHeight ? W.standHeight(ax, az, g) : g;
      if (h === null || h === undefined) continue;
      const q = { x: ax, y: 0, z: az };
      W.collide(q, R, h);
      if (Math.hypot(q.x - ax, q.z - az) > 0.02) continue;   // inside masonry
      standable[idx(i, j)] = 1;
    }
  }

  const pockets = [];
  const claimed = new Uint8Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const k0 = idx(i, j);
      if (!standable[k0] || seen[k0] || claimed[k0]) continue;
      // a connected island of standable-but-unreachable ground
      const st = [[i, j]]; claimed[k0] = 1;
      let n = 0, sxs = 0, szs = 0, lo = 1e9, hi = -1e9;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      while (st.length) {
        const [ci, cj] = st.pop(); n++;
        const [ax, az] = at(ci, cj);
        sxs += ax; szs += az;
        if (ax < a0) a0 = ax; if (ax > a1) a1 = ax;
        if (az < b0) b0 = az; if (az > b1) b1 = az;
        const hh = W.standHeight ? W.standHeight(ax, az, W.groundHeight(ax, az)) : 0;
        if (hh < lo) lo = hh; if (hh > hi) hi = hh;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = ci + di, nj = cj + dj;
          if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
          const k = idx(ni, nj);
          if (standable[k] && !seen[k] && !claimed[k]) { claimed[k] = 1; st.push([ni, nj]); }
        }
      }
      if (n >= 4) {
        pockets.push({
          cells: n,
          area_m2: +(n * STEP * STEP).toFixed(1),
          centre_rel: [+(sxs / n - cx).toFixed(1), +(szs / n - cz).toFixed(1)],
          size_m: [+(a1 - a0).toFixed(1), +(b1 - b0).toFixed(1)],
          standY: [+lo.toFixed(2), +hi.toFixed(2)],
          world: [+(sxs / n).toFixed(1), +(szs / n).toFixed(1)],
        });
      }
    }
  }
  pockets.sort((u, v) => v.cells - u.cells);
  const escaped = true;

  /*
   * ONE-WAY EDGES — the trap that a pocket search cannot see.
   *
   * The flood lets a body drop up to 3 m but climb only STEP_UP (0.52). So a
   * ledge you can walk off and not climb back onto is REACHED by the flood
   * and still traps the player. It is not an enclosed pocket; it is a place
   * with an entrance and no exit, which is exactly what "I can't get back"
   * describes.
   */
  const oneWay = [];
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      if (!seen[idx(i, j)]) continue;
      const [ax, az] = at(i, j);
      const f = feet[idx(i, j)];
      for (const [di, dj] of [[1, 0], [0, 1]]) {     // each pair once
        const ni = i + di, nj = j + dj;
        if (ni > N || nj > N) continue;
        if (!seen[idx(ni, nj)]) continue;
        const [bx, bz] = at(ni, nj);
        const g = feet[idx(ni, nj)];
        const there = canStep(ax, az, f, bx, bz);
        const back = canStep(bx, bz, g, ax, az);
        if ((there === null) !== (back === null)) {
          oneWay.push({
            rel: [+(ax - cx).toFixed(1), +(az - cz).toFixed(1)],
            world: [+ax.toFixed(1), +az.toFixed(1)],
            fromY: +f.toFixed(2), toY: +g.toFixed(2),
            rise: +(g - f).toFixed(2),
            way: there === null ? 'can come back but cannot go' : 'CAN GO BUT CANNOT RETURN',
          });
        }
      }
    }
  }
  // cluster them so the report is readable
  const byRise = {};
  for (const o of oneWay) {
    const k = `${o.way} rise ${o.rise > 0 ? '+' : ''}${o.rise}`;
    (byRise[k] = byRise[k] || []).push(o);
  }
  const oneWaySummary = Object.entries(byRise)
    .sort((a, bb) => bb[1].length - a[1].length)
    .slice(0, 8)
    .map(([k, v]) => ({ kind: k, count: v.length, example: v[0].rel, world: v[0].world }));

  // walk the boundary of the reachable set and ask WHAT stopped us
  const blockers = {};
  let samples = 0;
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      if (!seen[idx(i, j)]) continue;
      const [ax, az] = at(i, j);
      const f = feet[idx(i, j)];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
        if (seen[idx(ni, nj)]) continue;
        const [bx, bz] = at(ni, nj);
        samples++;
        // what is actually sitting at the cell we could not enter?
        // WorldService has no collidersAt(); query the grid it indexes into,
        // then use its own _overlaps() so the hit test matches collide()'s.
        let hits = null;
        try {
          const near = W.grid ? W.grid.query(bx, bz, R + 0.6) : null;
          if (near) hits = near.filter((c) => W._overlaps(c, bx, bz, R));
        } catch (e) { hits = null; }
        if (hits && hits.length) {
          for (const c of hits) {
            const tag = c.tag || (c.type + '(untagged)');
            blockers[tag] = (blockers[tag] || 0) + 1;
          }
        } else {
          // not a collider — so it is a STEP the body would not take
          const h = W.standHeight ? W.standHeight(bx, bz, f) : W.groundHeight(bx, bz);
          const d = h === null ? null : +(h - f).toFixed(2);
          const key = d === null ? 'no-standheight' : (d > 0 ? `riser +${d}` : `drop ${d}`);
          blockers[key] = (blockers[key] || 0) + 1;
        }
      }
    }
  }

  return {
    id,
    startedAt: { x: +px.toFixed(1), z: +pz.toFixed(1), feet: +pFeet.toFixed(2) },
    darshanAnchor: { x: +sx.toFixed(1), z: +sz.toFixed(1), feet: +sFeet.toFixed(2) },
    reachedCells: reached,
    reachedArea_m2: +(reached * STEP * STEP).toFixed(0),
    extent_m: {
      x: [+(at(minI, 0)[0] - cx).toFixed(1), +(at(maxI, 0)[0] - cx).toFixed(1)],
      z: [+(at(0, minJ)[1] - cz).toFixed(1), +(at(0, maxJ)[1] - cz).toFixed(1)],
    },
    TRAPS: pockets.length,
    ONE_WAY_EDGES: oneWay.length,
    oneWayKinds: oneWaySummary,
    biggestTraps: pockets.slice(0, 8),
    boundarySamples: samples,
    blockers: Object.fromEntries(Object.entries(blockers).sort((x, y) => y[1] - x[1]).slice(0, 14)),
  };
}, { id: ID, STEP, SPAN });

console.log('CAGE ' + JSON.stringify(out, null, 1));
await b.close();
process.exit(0);
