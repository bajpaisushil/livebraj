/**
 * Bridges: the roads OSM carries over something, lifted off the ground.
 *
 * Every road was a ribbon laid on the terrain, and a bridge was too. NH 44's
 * flyover at Chhatikara — where everybody starts — crossed the junction at
 * grade, its traffic driving through the Vrindavan road's; and the road over
 * the Yamuna went down the riverbed under the water ("drowned", queue item
 * 12). OSM marks a span's own way bridge=yes (`road.bridge`, from import.mjs),
 * and here it becomes a deck. A short one is a culvert over a drain and stays
 * on the ground (BRIDGE_MIN).
 *
 * Two kinds, told apart by what is under them:
 *
 *   FLYOVER, over land. Up from grade at each end on a ramp walled in
 *   reinforced earth, then a deck on piers DECK_H over the ground, a parapet
 *   along each side. ESRI z19 at Chhatikara: the central carriageways on a
 *   deck about 29 m wide, a parapet line along it and the deck's shadow on
 *   the service road, the service roads at grade either side and the
 *   Vrindavan road's traffic passing under (queue item 24). The two
 *   carriageways are two ways in OSM, laid side by side, so where one
 *   deck's edge lies inside the other there is neither parapet nor fascia.
 *
 *   RIVER, over the Yamuna. Laid on the ground down the bank and over the
 *   sand, and floating FLOAT over the water on pontoons where the ground
 *   falls below it: the pontoon bridge off Keshi Ghat ("KesiGhat River.JPG",
 *   2007: the burj on the steps, the pontoons beyond).
 *
 * The deck is stood on, and driven on, in STEP pieces whose tops climb the
 * ramp a few centimetres at a time; the parapets and the deck itself carry a
 * `base`, so they stop what is ON the bridge and nothing under it
 * (WorldService). NavGraph keeps a span's own nodes off the ground's, so the
 * flyover never joins the road it crosses (`isSpan`).
 */
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { resample } from '../../engine/math/Curves.js';

/** Shorter than this, a bridge is a culvert and is laid on the ground. */
export const BRIDGE_MIN = 60;
/** A flyover's road surface over the ground mid-span: 5.6 m clear under the girders. */
export const DECK_H = 7.0;
/** And over a railway, clear of the contact wire: 7.2 m under the girders. */
export const DECK_H_RAIL = 8.6;
/** A pontoon deck's road surface over the water. */
export const FLOAT = 0.9;
/** The deck pieces, laid and stood on. */
export const STEP = 3;

const GIRDER = 1.4;            // slab and girders under a flyover's road surface
const GRADE = 0.04;            // a ramp's grade: 4 %, 175 m to the deck
const ROUND = 7;               // samples either side the grade's corners are rounded over (21 m)
const MAX_GRADE = 0.07;        // the steepest a rail over-bridge's ramp is let be
const PIER_EVERY = 30;
const OPEN_FROM = 4.5;         // deck height over the ground from which it stands on piers, open under
const PARAPET = 1.0;
const RAIL = 1.05;             // a pontoon's railing

const CONCRETE = 0xa29d91;
const FASCIA = 0xb3aea2;
const SOFFIT = 0x6e6a62;
const RE_WALL = 0xaaa497;
const PARAPET_C = 0xc2bdb0;
const STEEL = 0x3e4043;
const RAIL_C = 0x8c9196;

const length = (pts) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};

/** Is this road a span, carried clear of the ground? NavGraph and TerrainBuilder both ask. */
export function isSpan(road) {
  return !!road.bridge && length(road.points) >= BRIDGE_MIN;
}

/**
 * A span laid out: its centre line every STEP metres, the ground and the
 * road surface at each, and which kind it is.
 *
 * A flyover's deck is taken over the straight line between its two ends'
 * ground — Braj is flat alluvium, a metre or two in a kilometre — raised by
 * DECK_H up a straight GRADE from each end, the corners rounded, and never
 * below the ground it crosses. (It was eased in by a smoothstep, which climbs
 * half as steeply again as its average in the middle of a ramp and holds the
 * deck high almost to its foot: no ramp is built like that.) A span too short
 * for two whole ramps peaks lower, as a short over-bridge does.
 */
export function layoutSpan(pts, ground, isWater, lift, waterY, overRail = () => false) {
  const dense = resample(pts, STEP);
  const n = dense.length;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = cum[n - 1] || 1;
  const g = dense.map(([x, z]) => ground(x, z));
  const river = dense.some(([x, z]) => isWater(x, z));
  let y;
  if (river) {
    y = g.map((h) => Math.max(h + lift, waterY + FLOAT));
  } else {
    const g0 = g[0] + lift, g1 = g[n - 1] + lift;
    /*
     * A rail over-bridge has its crest over the tracks, clear of the wire
     * (RailBuilder.js), and a ramp up to it from each end at whatever grade
     * that takes — where it crosses is rarely the middle of what OSM marks:
     * the Chandrodaya pair crosses the metre gauge 188 m along a 457 m span,
     * and laid symmetrically the deck there was 7.9 m. Anything else rises
     * up the same grade from both ends to DECK_H.
     */
    const rails = [];
    dense.forEach(([x, z], i) => { if (overRail(x, z)) rails.push(cum[i]); });
    let rise = null;
    if (rails.length) {
      const cLo = Math.max(0, rails[0] - 12), cHi = Math.min(L, rails[rails.length - 1] + 12);
      const crest = Math.min(DECK_H_RAIL, MAX_GRADE * cLo, MAX_GRADE * (L - cHi));
      if (crest > 4) rise = cum.map((s) => (s < cLo ? crest * (s / cLo) : s > cHi ? crest * ((L - s) / (L - cHi)) : crest));
    }
    if (!rise) rise = cum.map((s) => Math.min(rails.length ? DECK_H_RAIL : DECK_H, GRADE * Math.min(s, L - s)));
    // round the grade's corners: a moving average, ROUND samples each way,
    // narrowing to nothing at the ends (a window cut off on one side there
    // lifted the first tread half a metre, more than a step up from the road)
    const round = rise.map((_, i) => {
      const k = Math.min(ROUND, i, n - 1 - i);
      let sum = 0;
      for (let j = i - k; j <= i + k; j++) sum += rise[j];
      return sum / (2 * k + 1);
    });
    y = cum.map((s, i) => Math.max(g[i] + lift, g0 + (g1 - g0) * (s / L) + round[i]));
  }
  return { dense, cum, L, g, y, river };
}

/**
 * The structure under and beside a span's road surface, and what to stand on
 * and bump into. The road surface itself is TerrainBuilder's ribbon, laid at
 * `span.y` (so a bridge is the same road, in the same colours and markings).
 *
 * `left` / `right` are the ribbon's edges at each of `span.dense`;
 * `inOther(x, z)` says whether a point lies on another span's deck (the
 * other carriageway); `colliders` is pushed to; `keepClear(x, z)` is where
 * no pier may stand (the railway's tracks).
 */
export function buildSpan(b, span, left, right, half, inOther, colliders, keepClear = () => false) {
  const { dense, g, y, river } = span;
  const n = dense.length;
  if (n < 2) return;
  const lift = 0.02;

  // what the edge of the deck stands on, and whether it is the other carriageway's
  const edges = [left, right].map((side) => side.map(([x, z]) => ({ x, z, inner: inOther(x, z) })));

  for (let i = 1; i < n; i++) {
    const a = dense[i - 1], c = dense[i];
    const ux0 = c[0] - a[0], uz0 = c[1] - a[1];
    const seg = Math.hypot(ux0, uz0) || 1;
    const ux = ux0 / seg, uz = uz0 / seg;
    const rot = Math.atan2(uz, ux);
    const yTop = Math.max(y[i - 1], y[i]);
    const h0 = y[i - 1] - g[i - 1], h1 = y[i] - g[i];
    const h = Math.max(h0, h1);
    if (h < 0.3) continue;                       // at grade: the terrain is the floor
    const mx = (a[0] + c[0]) * 0.5, mz = (a[1] + c[1]) * 0.5;

    // ---- what to stand on: the deck, a piece at a time ----
    colliders.push({
      type: 'box', x: mx, z: mz, w: seg + 0.3, d: half * 2, rot,
      top: yTop, base: yTop - (river ? 1.0 : GIRDER),
      standOnly: true, tag: 'bridge-deck',
    });

    for (const E of edges) {
      const p0 = E[i - 1], p1 = E[i];
      if (p0.inner && p1.inner) continue;        // the other carriageway's deck goes on
      const ya = y[i - 1], yb = y[i];
      const ga = g[i - 1], gb = g[i];
      if (river) {
        // a pontoon deck's edge and its railing
        b.quad([p0.x, ya - 0.25, p0.z], [p1.x, yb - 0.25, p1.z], [p1.x, yb + lift, p1.z], [p0.x, ya + lift, p0.z], STEEL);
        b.quad([p0.x, ya + RAIL - 0.06, p0.z], [p1.x, yb + RAIL - 0.06, p1.z], [p1.x, yb + RAIL, p1.z], [p0.x, ya + RAIL, p0.z], RAIL_C);
        b.quad([p0.x, ya + 0.5, p0.z], [p1.x, yb + 0.5, p1.z], [p1.x, yb + 0.55, p1.z], [p0.x, ya + 0.55, p0.z], RAIL_C);
        b.box(p0.x, ya, p0.z, 0.07, RAIL, 0.07, RAIL_C, rot);          // a post every piece
      } else {
        // the fascia down to the girders where it is open under, and the
        // reinforced-earth wall to the ground where it is not
        const open = Math.min(h0, h1) >= OPEN_FROM;
        const da = open ? ya - GIRDER : ga - 0.3, db = open ? yb - GIRDER : gb - 0.3;
        b.quad([p0.x, da, p0.z], [p1.x, db, p1.z], [p1.x, yb + lift, p1.z], [p0.x, ya + lift, p0.z], open ? FASCIA : RE_WALL);
        // the parapet
        b.quad([p0.x, ya, p0.z], [p1.x, yb, p1.z], [p1.x, yb + PARAPET, p1.z], [p0.x, ya + PARAPET, p0.z], PARAPET_C);
        b.quad([p0.x, ya + PARAPET, p0.z], [p1.x, yb + PARAPET, p1.z], [p1.x, yb + PARAPET + 0.02, p1.z], [p0.x, ya + PARAPET + 0.02, p0.z], 0xd6d1c4);
        // a walled ramp is solid to the ground beside it
        if (!open) {
          colliders.push({
            type: 'box', x: (p0.x + p1.x) * 0.5, z: (p0.z + p1.z) * 0.5,
            w: seg + 0.2, d: 0.5, rot, top: Math.max(ya, yb) - 0.05, tag: 'bridge-ramp',
          });
        }
      }
      // what keeps you on it: stops what is on the deck, nothing under it
      colliders.push({
        type: 'box', x: (p0.x + p1.x) * 0.5, z: (p0.z + p1.z) * 0.5,
        w: seg + 0.2, d: 0.35, rot,
        top: Math.max(ya, yb) + (river ? RAIL : PARAPET), base: Math.min(ya, yb) - 0.4,
        tag: river ? 'bridge-rail' : 'bridge-parapet',
      });
    }

    if (river) {
      // pontoons under the deck wherever it is off the ground
      if (h > 0.6 && i % 2 === 0) {
        b.box(mx, y[i] - 1.35, mz, 2.6, 1.1, half * 2 + 0.5, STEEL, rot);
      }
      continue;
    }

    // the soffit where it is open under
    if (Math.min(h0, h1) >= OPEN_FROM) {
      const l0 = left[i - 1], l1 = left[i], r0 = right[i - 1], r1 = right[i];
      b.quad([l0[0], y[i - 1] - GIRDER, l0[1]], [r0[0], y[i - 1] - GIRDER, r0[1]],
        [r1[0], y[i] - GIRDER, r1[1]], [l1[0], y[i] - GIRDER, l1[1]], SOFFIT);
    }
  }

  // piers, under the middle of the deck, where it is open under
  if (river) return;
  let next = PIER_EVERY * 0.5;
  for (let i = 0; i < n; i++) {
    if (span.cum[i] < next) continue;
    next = span.cum[i] + PIER_EVERY;
    const h = y[i] - g[i];
    if (h < OPEN_FROM + 0.4) continue;
    // a rail over-bridge spans its tracks: no pier stands on one
    if (keepClear(dense[i][0], dense[i][1])) continue;
    const a = dense[Math.max(0, i - 1)], c = dense[Math.min(n - 1, i + 1)];
    const rot = Math.atan2(c[1] - a[1], c[0] - a[0]);
    const [x, z] = dense[i];
    const top = y[i] - GIRDER;
    // the column, and the crosshead the girders sit on
    b.box(x, g[i] - 0.3, z, 1.8, top - 0.9 - (g[i] - 0.3), 2.4, CONCRETE, rot);
    b.box(x, top - 0.9, z, 1.6, 0.9, half * 2 * 0.86, CONCRETE, rot);
    colliders.push({ type: 'box', x, z, w: 2.0, d: 2.6, rot, top: top - 0.9, tag: 'bridge-pier' });
  }
}

/** The structure's mesh, in the terrain group. */
export function spanMesh(b) {
  return b.isEmpty ? null : b.toMesh('Bridges', { receiveShadow: true, castShadow: true, doubleSided: true });
}

export { MeshBuilder };
