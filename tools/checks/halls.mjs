/**
 * Can you walk from the door to the Deities, in every temple?
 *
 * Krishna Balaram's altar hall was DRAWN and never made solid: you climbed all
 * five risers, stepped off the top tread and fell straight through the marble
 * to the terrain below, stranded with no way back up. Reported as "can't walk
 * down the stairs near deities", and it is the ISKCON compound-wall fault in
 * another place — geometry drawn without a collider.
 *
 * So this walks every temple's own darshan line, from where a pilgrim stands
 * to the altar, and watches the FEET. Three things fail it:
 *
 *   a FALL   — the floor drops away under you by more than a step, which means
 *              a surface that is drawn and not stood on;
 *   a WALL   — you never get near the altar at all;
 *   a CLIMB  — you are lifted more than a step in one go, which is a floor
 *              edge you should have walked round.
 *
 * It measures the walk, not the geometry, because that is the thing that broke.
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

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto(`http://localhost:${__PORT}/`,{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const STEP = 0.55;                 // what a person takes in their stride
  const out = [];

  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type !== 'temple') continue;
    const a = w.anchorFor(loc.id);
    if (!a || !a.altar || !a.darshan) continue;
    if (a.closed) continue;            // shut by its builder: nobody walks to or from its altar (kesi.mjs)

    const seats = (a.altars && a.altars.length) ? a.altars : [a.altar];
    const yaw = Math.atan2(a.darshan.x - a.altar.x, a.darshan.z - a.altar.z);
    for (let si = 0; si < seats.length; si++) {
      const seat = seats[si];
      // start where a pilgrim stands for THIS altar, and walk at it
      /*
       * Start at the DOOR, not at an offset darshan point.
       *
       * Offsetting the darshan point sideways for each altar puts the start
       * inside a wall, and starting out on the terrain means a temple raised on
       * a 2.4 m plinth reports unreachable — which it correctly is, except by
       * its steps. A pilgrim comes in at the door and walks to the altar, so
       * that is the walk.
       */
      const vol = (w.landmarks && w.landmarks.interiors && w.landmarks.interiors[loc.id]) || null;
      const door = vol && vol.door;
      const ox = seat.x - a.altar.x, oz = seat.z - a.altar.z;
      const sx = door ? door[0] : a.darshan.x + ox;
      const sz = door ? door[1] : a.darshan.z + oz;
      const pt = { x: sx, y: 0, z: sz };
      /*
       * The pilgrim at the door stands on whatever is there — a tread, a
       * plinth — not on the terrain under it. Asked from the terrain, Prem
       * Mandir's door (on the kursi's steps, 3 m up) put the start INSIDE the
       * jagati, and the old fill only ever got anywhere by walking through
       * the platform at ground level: the very fault platforms.mjs exists for.
       */
      let feet = w.standHeight(pt.x, pt.z, a.floor !== undefined ? a.floor : seat.y);
      let worstFall = 0, worstClimb = 0;
      const span = Math.hypot(sx - seat.x, sz - seat.z);
      /*
       * REACHABILITY, not a straight line — and WITH THE FEET.
       *
       * Walking door-to-altar in a straight line is too crude for a plan with
       * anything in it: Rangaji's altar is 75 m from its door through two
       * colonnades, and a pilgrim walks ROUND things.
       *
       * So search the floor from the door on a half-metre grid, carrying the
       * height of the feet from cell to cell exactly as the player does:
       * collide(p, 0.4, feet), then standHeight(p, feet). A cell is a place
       * AT A HEIGHT — under a floor and on it are different places — so the
       * visited set is keyed on the level too. The first version took every
       * cell's feet from the terrain, which cannot climb onto a raised floor
       * at all and only "reached" Prem Mandir's altar through the side of the
       * platform. Best-first toward the target, because the jagati alone is
       * 30,000 cells.
       */
      const CELL = 0.5, LIMIT = 40000;
      const lvl = (f) => Math.round(f * 4);
      const key = (i, j, f) => i + ',' + j + ',' + lvl(f);
      const i0 = Math.round(sx / CELL), j0 = Math.round(sz / CELL);
      /*
       * Target where a DEVOTEE STANDS, not the altar itself.
       *
       * The altar line is solid on purpose — you cannot walk into the Deities,
       * and `deities.mjs` asserts exactly that. So a fill that tries to reach
       * the altar is trying to reach somewhere it must not, and reported
       * ISKCON's three as unreachable when standing in front of them is the
       * whole point. Two metres out is darshan distance.
       */
      const tx = seat.x + Math.sin(yaw) * 2.2, tz = seat.z + Math.cos(yaw) * 2.2;
      // a binary heap on distance to the target
      const heap = [];
      const push = (n) => {
        heap.push(n); let c = heap.length - 1;
        while (c > 0) { const pa = (c - 1) >> 1; if (heap[pa].d <= heap[c].d) break; [heap[pa], heap[c]] = [heap[c], heap[pa]]; c = pa; }
      };
      const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) {
          heap[0] = last; let c = 0;
          for (;;) {
            const l = c * 2 + 1, r2 = l + 1; let m = c;
            if (l < heap.length && heap[l].d < heap[m].d) m = l;
            if (r2 < heap.length && heap[r2].d < heap[m].d) m = r2;
            if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m;
          }
        }
        return top;
      };
      const dist = (i, j) => Math.hypot(i * CELL - tx, j * CELL - tz);
      const seen = new Set([key(i0, j0, feet)]);
      push({ i: i0, j: j0, f: feet, d: dist(i0, j0) });
      let reached = false, visited = 0;
      let near = Infinity, nearAt = null;
      while (heap.length && visited < LIMIT) {
        const { i, j, f } = pop();
        visited++;
        const dd = dist(i, j);
        if (dd < near) { near = dd; nearAt = [+(i * CELL).toFixed(1), +(j * CELL).toFixed(1)]; }
        /*
         * Within 4 m of the Deities is darshan. The altar line stops you about
         * 1.7 m out and bay jambs take a little more, so demanding the exact
         * spot would be demanding to stand somewhere a pilgrim does not.
         */
        if (dd <= 4.0) { reached = true; break; }
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const ni = i + di, nj = j + dj;
          // stay in the temple's own neighbourhood
          if (Math.hypot(ni * CELL - tx, nj * CELL - tz) > span + 22) continue;
          const px = ni * CELL, pz = nj * CELL;
          const probe = { x: px, y: 0, z: pz };
          w.collide(probe, 0.4, f);
          if (Math.hypot(probe.x - px, probe.z - pz) > 0.05) continue;
          const nf = w.standHeight(px, pz, f);
          const k = key(ni, nj, nf);
          if (seen.has(k)) continue;
          seen.add(k); push({ i: ni, j: nj, f: nf, d: dist(ni, nj) });
        }
      }
      const closest = reached ? 0 : +near.toFixed(1);
      out.push({
        id: loc.id + (seats.length > 1 ? '#' + si : ''),
        span: +span.toFixed(1), closest, visited, nearAt,
        start: [+sx.toFixed(1), +sz.toFixed(1)], target: [+tx.toFixed(1), +tz.toFixed(1)],
        fall: +worstFall.toFixed(2), climb: +worstClimb.toFixed(2),
      });
    }
  }
  return out;
});

const falls = r.filter((x) => x.fall < -0.55);
const walls = r.filter((x) => x.closest > 0);
const climbs = r.filter((x) => x.climb > 0.55);

/* ================================================================
 * EVERY SQUARE METRE YOU CAN STAND ON, YOU CAN ALSO LEAVE
 *
 * The walk-out check below walks ONE LINE from each altar, and that is how the
 * courtyard obstacles survived it: they sat at local x 4 and 5.3 while the walk
 * ran down x = 0. Green check, and you still could not get out.
 *
 * "it blocks walking akthough its empty rea between pillars" — two colliders
 * with no `h`, which is what `WorldService` reads as INFINITELY TALL. The tamal
 * tree's marble kerb is 0.45 m high and was a cylinder 4.3 m across going up to
 * the sky; Prabhupada's vyasasana is a seat and was a full-height block. Both
 * invisible, because what is drawn there is knee-high.
 *
 * So this stops walking lines and floods the whole interior, using the PLAYER'S
 * OWN rules — `collide` with a real feet height and `standHeight` after it, at
 * 0.5 m, from the door inward. Anything you could stand on but could not walk
 * to is a pocket, and a pocket is the shape every one of tonight's faults took.
 * ================================================================ */
const pockets = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world, io = ctx.interior;
  const out = [];

  /*
   * WORLD SPACE, AND THE GAME'S OWN MEMBERSHIP TEST.
   *
   * Earlier versions of this walked a LOCAL grid, and got the local frame
   * wrong — `MeshBuilder.box` turns by +rot and `panel` by -rot, builders use
   * both, and `WorldService` builds its cos/sin from -rot again. Four separate
   * times tonight I read a temple's local coordinates and drew a confident
   * wrong conclusion from them, including telling you a set of altar rails
   * were misplaced when they measure correctly.
   *
   * So there is no local frame here at all. The grid is axis-aligned in WORLD
   * space over the temple's bounding circle, and whether a cell counts as
   * "inside this temple" is asked of `InteriorSystem._contains` — the same
   * function the game uses to decide you have walked in. If that test is
   * itself wrong for some temple, this check inherits the same wrongness
   * rather than inventing a second, different wrongness to compare against.
   */
  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type !== 'temple') continue;
    const vol = io.volumes.find((q) => q.loc && q.loc.id === loc.id);
    if (!vol) continue;
    const a = w.anchorFor(loc.id);
    if (!a || !a.altar) continue;

    const STEP = 0.5;
    const R = Math.hypot(vol.hw, vol.hd);
    const N = Math.ceil(R / STEP);
    if (N > 90) continue;                       // too large to flood at this step

    const inside = (x, z) => io._contains(vol, x, z, 1.0);
    const key = (ix, iz) => ix + ',' + iz;
    const at = (ix, iz) => [vol.x + ix * STEP, vol.z + iz * STEP];

    // every cell of this temple a body could stand in
    const floorY = a.floor !== undefined ? a.floor : a.altar.y;
    /*
     * The heights a body can STAND at in a cell, by the player's own rule:
     * the surface standHeight gives, asked from the altar floor and from the
     * ground, kept where collide does not push the body away at that height.
     * A cell can have two — Ashta Sakhi's shops and the darshan floor over
     * them — and a cell at the foot of a solid ledge has none at the ledge's
     * height. `isClear` alone counts every floor as ground from any height,
     * which read Krishna Balaram's hall-floor edge as twelve one-way doors.
     */
    const heightsAt = (x, z) => {
      const hs = [];
      for (const from of [floorY, w.groundHeight(x, z)]) {
        const f = w.standHeight(x, z, from);
        if (hs.some((g) => Math.abs(g - f) < 0.05)) continue;
        const q0 = { x, y: 0, z };
        w.collide(q0, 0.42, f);
        if (Math.hypot(q0.x - x, q0.z - z) <= 0.12) hs.push(f);
      }
      return hs;
    };
    const stand = new Map();
    for (let ix = -N; ix <= N; ix++) {
      for (let iz = -N; iz <= N; iz++) {
        const [x, z] = at(ix, iz);
        if (!inside(x, z)) continue;
        if (!w.isClear(x, z, 0.42)) continue;
        const hs = heightsAt(x, z);
        if (hs.length) stand.set(key(ix, iz), hs);
      }
    }
    if (stand.size < 12) continue;              // nothing to say about a solid block


    const canStep = (from, to, feet) => {
      const q = { x: to[0], y: 0, z: to[1] };
      w.collide(q, 0.42, feet);
      if (Math.hypot(q.x - to[0], q.z - to[1]) > 0.12) return null;
      const nf = w.standHeight(to[0], to[1], feet);
      return Math.abs(nf - feet) > 0.55 ? null : nf;
    };

    /*
     * A TRAP IS A ONE-WAY DOOR. That is the whole question, and it took me all
     * night to ask it.
     *
     * `collide` and `standHeight` are symmetric: if you cannot get INTO
     * somewhere you cannot get out of it either, so a region merely
     * disconnected from the rest is not a trap — it is somewhere nobody can
     * ever be. Govind Dev's Greek cross leaves 220 cells of enclosed lawn in
     * the corners of its platform; unreachable, and entirely fine.
     *
     * What you reported is not that. "cant come back from deties area" is
     * ASYMMETRY: you got somewhere, so the step in was possible, and then the
     * step back was not. That is what a step-up limit does — you walk down off
     * a ledge you cannot climb, or onto a floor whose edge you cannot recross.
     *
     * So: from every height a body can stand at in a cell, try the step to
     * each neighbour. If it goes, the step BACK is tried from where it landed.
     * If it does not go, it is one-way only if some body standing in the
     * neighbour can step the other way AND arrive at this same level — under
     * a floor and on it are different places.
     */
    const oneWay = [];
    for (const [k, hsHere] of stand) {
      const [ix, iz] = k.split(',').map(Number);
      const here = at(ix, iz);
      for (const [ox, oz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const hsThere = stand.get(key(ix + ox, iz + oz));
        if (!hsThere) continue;
        const there = at(ix + ox, iz + oz);
        for (const hf of hsHere) {
          const out1 = canStep(here, there, hf);
          let back = null;
          if (out1 !== null) {
            // the way back may land you on a kerb within a step of where you
            // began, which is still home: only an impossible step is a trap
            back = canStep(there, here, out1);
          } else {
            for (const tf of hsThere) {
              const r2 = canStep(there, here, tf);
              if (r2 !== null && Math.abs(r2 - hf) < 0.3) { back = r2; break; }
            }
          }
          if ((out1 === null) !== (back === null)) {
            oneWay.push({
              at: there.map((n) => +n.toFixed(0)),
              drop: +((out1 !== null ? out1 : hsThere[0]) - hf).toFixed(2),
              way: out1 === null ? 'in only' : 'out only',
            });
          }
        }
      }
    }

    out.push({ id: loc.id, standable: stand.size,
      oneWay: oneWay.length, worst: oneWay.length ? oneWay[0] : null });
  }
  return out;
});

/*
 * A handful of stranded cells is the honest tolerance: a corner behind a
 * pillar, the half-metre between a plinth and a wall. A POCKET is a region.
 */
const trapped = pockets.filter((q) => q.oneWay > 0);
const stuckStart = [];
check('nowhere you can stand is somewhere you cannot leave',
  trapped.length === 0 && stuckStart.length === 0,
  stuckStart.length
    ? `could not start the flood in ${stuckStart.map((q) => q.id).join(', ')}`
    : trapped.length
      ? trapped.map((q) => `${q.id}: ${q.oneWay} one-way step(s), e.g. at `
        + `${q.worst.at} a ${q.worst.drop} m ${q.worst.way}`).join('; ')
      : `${pockets.length} interiors, ${pockets.reduce((n, q) => n + q.standable, 0)} `
        + `standable cells, every step reversible`);

/* ================================================================
 * ...AND BACK OUT AGAIN.
 *
 * Every check in this suite walked IN — door to altar — and not one of them
 * ever walked out. A night spent fixing walls, and the wall that mattered was
 * behind you.
 *
 * Reported as "cant come back from deties area near stairs in iskcon ...
 * although its empty rea". At Krishna Balaram the staircase tapered to 5.7 m
 * at its top tread while the outer Deities stand at 7.2 m, so a pilgrim at
 * Gaura-Nitai or Radha-Shyamasundara was standing a metre and a half past the
 * end of the stairs with an invisible rail 0.3 m away — a body is 0.42 m
 * across, so they were already inside it. Measured: the CENTRE altar walked
 * out 37.8 m; both side altars stopped dead after 0.3 m.
 *
 * Which is exactly why it survived — every walk in this file aims at the
 * middle. So this one starts at EVERY altar a builder publishes, including the
 * ones off the axis, and walks the way a person leaves.
 * ================================================================ */
const back = await p.evaluate(() => {
  const ctx = window.vrindavan.ctx, w = ctx.world;
  const out = [];
  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type !== 'temple') continue;
    const a = w.anchorFor(loc.id);
    if (!a || !a.altar || !a.darshan) continue;
    if (a.closed) continue;            // shut by its builder: nobody walks to or from its altar (kesi.mjs)
    // the way out is altar -> darshan, taken from the anchors so no sign can
    // be got wrong
    const ux = a.darshan.x - a.altar.x, uz = a.darshan.z - a.altar.z;
    const m = Math.hypot(ux, uz);
    if (m < 0.5) continue;
    const dx = ux / m, dz = uz / m;
    const seats = (a.altars && a.altars.length) ? a.altars : [a.altar];
    /*
     * Start where a pilgrim can actually stand nearest the altar, 1.9 m out
     * unless that is not floor. At Radha Raman 1.9 m is on top of the
     * antechamber platform, 1.37 m up, whose stairs were removed under the
     * Temple Entry Act (Case p.82): nobody stands there to walk out from, and
     * starting there measured a temple you can walk out of as sealed. Where
     * 1.9 m is floor — every other temple — this changes nothing.
     */
    const fl = a.floor !== undefined ? a.floor : null;
    const startAt = (seat) => {
      for (let d = 1.9; d <= 5.0; d += 0.1) {
        const q = { x: seat.x + dx * d, z: seat.z + dz * d };
        const h = w.standHeight(q.x, q.z, fl !== null ? fl : seat.y);
        const c = w.collide({ x: q.x, z: q.z }, 0.42, h);
        if ((fl === null || Math.abs(h - fl) < 0.3) && Math.hypot(c.x - q.x, c.z - q.z) < 0.01) return d;
      }
      return 1.9;
    };
    seats.forEach((seat, si) => {
      const d0 = startAt(seat);
      const pt = { x: seat.x + dx * d0, y: 0, z: seat.z + dz * d0 };
      const s0 = { x: pt.x, z: pt.z };
      let feet = w.standHeight(pt.x, pt.z, a.floor !== undefined ? a.floor : seat.y);
      for (let k = 0; k < 220; k++) {
        pt.x += dx * 0.09; pt.z += dz * 0.09;
        w.collide(pt, 0.42, feet);
        feet = w.standHeight(pt.x, pt.z, feet);
      }
      out.push({
        id: loc.id + (seats.length > 1 ? '#' + si : ''),
        got: +Math.hypot(pt.x - s0.x, pt.z - s0.z).toFixed(1),
      });
    });
  }
  return out;
});

/*
 * Four metres. Not "reaches the door" — a real building has one door and
 * walking out of a side bay means crossing to it, which is what a person does
 * and not something to fail a temple for. What is being caught is being SEALED
 * where you stand, and 0.3 m is sealed by any reading.
 */
const sealed = back.filter((q) => q.got < 4);
check('and you can walk back OUT from every altar', sealed.length === 0,
  sealed.length
    ? sealed.map((q) => `${q.id} got ${q.got} m`).join(', ')
    : `${back.length} altars, worst ${Math.min(...back.map((q) => q.got)).toFixed(1)} m`);

check('there are darshan walks to test', r.length > 10, `${r.length} altars`);
check('no floor drops away under you', falls.length === 0,
  falls.length ? falls.map((x) => `${x.id} fell ${x.fall} m`).join('; ')
               : `${r.length} walks, worst drop ${Math.min(...r.map((x) => x.fall)).toFixed(2)} m`);
check('every altar is reachable on foot from its door', walls.length === 0,
  walls.length
    ? walls.map((x) => `${x.id}: got within ${x.closest} m of ${JSON.stringify(x.target)} `
        + `(nearest cell ${JSON.stringify(x.nearAt)}, from door ${JSON.stringify(x.start)}, `
        + `${x.visited} cells)`).join('; ')
    : `all ${r.length} reachable`);
check('nothing lifts you more than a stride', climbs.length === 0,
  climbs.length ? climbs.map((x) => `${x.id} lifted ${x.climb} m`).join('; ') : 'none');

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
