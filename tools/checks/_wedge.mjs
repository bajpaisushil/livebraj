/**
 * IS IT THE PEOPLE?
 *
 * Every probe so far tested world.collide() alone and said the Deities are
 * escapable. The player says otherwise, four times. The difference is that
 * the real movement does TWO things per frame:
 *
 *   world.collide(p, 0.42, feet)        <- geometry, tested and clean
 *   crowd.collideAgents(p, 0.42)        <- people, never tested
 *
 * and collideAgents only ever PUSHES. It has no notion of blocking and no
 * notion of being wedged: each person within 0.76 m shoves the player 55% of
 * the overlap directly away. Stand in a gap narrower than two body widths
 * with devotees either side and the shoves fight each other, so the player
 * is moved back as fast as they walk forward.
 *
 * This simulates the player's own loop — velocity, collide, collideAgents —
 * and measures NET progress, which is the only thing the player experiences.
 */
import { chromium } from 'playwright';

const ID = process.argv[2] || 'iskcon-krishna-balaram';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.crowd,
  null, { timeout: 220000 });

const out = await p.evaluate((id) => {
  const ctx = window.vrindavan.ctx, W = ctx.world, C = ctx.crowd;
  const loc = ctx.data.LOCATION_BY_ID.get(id);
  const [cx, cz] = loc.pos;
  const R = 0.42, STEP_UP = 0.52;
  /*
   * OUTWARD IS ALTAR -> DARSHAN ANCHOR. Not sin/cos of loc.rot.
   *
   * Every earlier run took outward as (sin rot, cos rot) because that is how
   * LandmarkGenerator's generic anchor is placed. But a builder may return
   * its OWN anchors, and Krishna Balaram does — its local frame runs opposite
   * to loc.rot, so "outward" was pointing at the back of the building. Probed
   * directly: the side I was walking toward has 0 open samples in 49 across
   * its whole width, and the other side has 9. I was walking into the back
   * wall and calling it a cage.
   *
   * The two anchors the builder publishes are the ground truth: the altar is
   * where the Deities are, the darshan spot is where a pilgrim stands. The
   * way out is that vector, continued.
   */
  const A = W.anchors[id];
  let ox, oz;
  if (A && A.altar && A.darshan) {
    const vx = A.darshan.x - A.altar.x, vz = A.darshan.z - A.altar.z;
    const L = Math.hypot(vx, vz) || 1;
    ox = vx / L; oz = vz / L;
  } else { ox = Math.sin(loc.rot); oz = Math.cos(loc.rot); }
  const axv = oz, azv = -ox;                                // across the front

  // how many people are standing in the darshan area at all?
  let people = 0;
  const near = [];
  for (const slot of C.peopleInst || []) {
    for (const a of slot.agents || []) {
      const dx = a.x - cx, dz = a.z - cz;
      const along = dx * ox + dz * oz, across = dx * axv + dz * azv;
      if (along > -14 && along < 10 && Math.abs(across) < 16) {
        people++;
        if (near.length < 12) near.push({ along: +along.toFixed(1), across: +across.toFixed(1) });
      }
    }
  }

  /** Walk outward from `startAlong`, with and without the crowd. */
  const walkFrom = (depth0, across0, withCrowd) => {
    let x = cx + ox * depth0 + axv * across0;
    let z = cz + oz * depth0 + azv * across0;
    let feet = W.standHeight(x, z, W.groundHeight(x, z) + 1.2);
    if (feet === null || feet === undefined) return { start: 'no floor' };
    const along = () => (x - cx) * ox + (z - cz) * oz;
    const start = along();
    let stalls = 0, lastAlong = start, shoved = 0, why = null, lastWant = null;
    // 0.08 m per tick is one frame of walking at ~2.4 m/s
    for (let k = 0; k < 600; k++) {
      const q = { x: x + ox * 0.08, y: 0, z: z + oz * 0.08 };
      const wantX = q.x, wantZ = q.z;
      W.collide(q, R, feet);
      if (withCrowd && C.collideAgents) C.collideAgents(q, R);
      const moved = Math.hypot(q.x - wantX, q.z - wantZ);
      if (moved > 0.02) { shoved++; lastWant = { x: wantX, z: wantZ, feet }; }
      const h = W.standHeight(q.x, q.z, feet);
      if (h === null || h === undefined) { why = { r: 'no floor' }; break; }
      if (h - feet > STEP_UP) {
        const nb = (W.grid.query(q.x, q.z, 1.0) || []).filter((c) => W._overlaps(c, q.x, q.z, R));
        why = { r: 'riser too tall', rise: +(h - feet).toFixed(2), feet: +feet.toFixed(2),
          floorAt: +h.toFixed(2), at: +along().toFixed(2),
          tags: [...new Set(nb.map((c) => (c.tag || '(untagged)') + (c.standOnly ? '/stand' : '') + (c.soft ? '/soft' : '')))].slice(0, 5) };
        break;
      }
      x = q.x; z = q.z; feet = h;
      const a = along();
      if (a - lastAlong < 0.01) stalls++; else stalls = 0;
      lastAlong = a;
      if (stalls > 40) {
        /*
         * REPLICATE COLLIDE'S OWN FILTER, INCLUDING ITS QUERY RADIUS.
         *
         * collide() queries `radius + 6` — 6.42 m — because a big box can
         * have its centre far away and still reach you. Querying 1.0 m here
         * reported the innocent standOnly temple-floor and hid whatever is
         * actually doing the shoving, which is the same mistake as every
         * earlier probe: listing what is NEAR instead of what collide SEES.
         */
        /*
         * Sample at the point the body TRIED to reach, not where it ended up.
         * Where it ended up, collide has by definition already pushed it
         * clear, so nothing overlaps and the list comes back empty — which
         * is what the previous version of this reported.
         */
        const probeAt = lastWant || { x, z, feet };
        const step = probeAt.feet + STEP_UP;
        const nb = (W.grid.query(probeAt.x, probeAt.z, R + 6) || []).filter((c) => {
          if (c.standOnly) return false;
          if (c.top !== undefined && c.top <= step) return false;
          return W._overlaps(c, probeAt.x, probeAt.z, R);
        });
        why = { r: 'shoved back / no progress', at: +along().toFixed(2), feet: +feet.toFixed(2),
          pushers: nb.map((c) => ({
            tag: c.tag || '(untagged)', type: c.type,
            top: c.top === undefined ? 'infinite' : +c.top.toFixed(2),
            size: c.type === 'box' ? [+(c.hw * 2).toFixed(1), +(c.hd * 2).toFixed(1)] : +c.r.toFixed(1),
            relToTemple: [
              +(((c.x - cx) * ox + (c.z - cz) * oz)).toFixed(1),   // along, +out
              +(((c.x - cx) * axv + (c.z - cz) * azv)).toFixed(1), // across
            ],
          })).slice(0, 6) };
        break;
      }
      if (a > 18) break;                 // out
    }
    return {
      out_m: +(along() - start).toFixed(2),
      escaped: along() > 16,
      shovedFrames: shoved,
      stalled: stalls > 40,
      why,
    };
  };

  /*
   * Start where a PILGRIM stands, not at an arbitrary depth.
   *
   * Every run so far began 6 m inward along the facing, which I picked and
   * never checked. Sweep the depth as well as the width, so the answer does
   * not depend on my guess about where the player is standing.
   */
  const lanes = [];
  for (let depth = -9; depth <= -1; depth += 2) {
    for (let a = -12; a <= 12; a += 2.0) {
      const r = walkFrom(depth, a);
      lanes.push({ depth, across: +a.toFixed(1), geometryOnly: r, withPeople: r });
    }
  }
  return { peopleInDarshanArea: people, sample: near, lanes };
}, ID);

const geoOk = out.lanes.filter((l) => l.geometryOnly.escaped).length;
const crowdOk = out.lanes.filter((l) => l.withPeople.escaped).length;
console.log('WEDGE ' + JSON.stringify({
  peopleInDarshanArea: out.peopleInDarshanArea,
  escapedGeometryOnly: `${geoOk}/${out.lanes.length}`,
  escapedWithPeople: `${crowdOk}/${out.lanes.length}`,
  stuckLanes: out.lanes.filter((l) => !l.geometryOnly.escaped)
    .map((l) => ({ across: l.across, gotOut: l.geometryOnly.out_m, why: l.geometryOnly.why })),
}, null, 1));
await b.close();
process.exit(0);
