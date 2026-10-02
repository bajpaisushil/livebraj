/**
 * SHRI RADHA MADAN MOHAN MANDIR — the old temple on Dwadashaditya Tila (ASI
 * N-UP-A197), the mound it stands on, and the new temple across the street
 * where the deities are worshipped.
 *
 * Built from docs/research/madan-mohan.md: the survey and its independent
 * checker. What stood here was a 29.5 m spine of nave, choir and sanctum on
 * flat ground at 45 degrees, with no mound, no gateway and no second temple.
 *
 * WHERE: OpenStreetMap (ODbL). Way 334671983 is the precinct, and its
 * centroid, 27.580253 / 77.687610, is this builder's origin. Every outline
 * here is OSM's, turned into the box frame: the temple (way 334671987, 88
 * nodes), the gateway tower (671678177), Sanatana Goswami's bhajan kutir
 * (334671984), his samadhi (334671985) and the second kutir (768143156).
 * ESRI z19 imagery (MEASUREMENT only) puts the approach stair on the west
 * face, south of the bastion block, its foot 46 m west of the court.
 *
 * THE FRAME: rot -PI/2, so +lx is NORTH and +lz is EAST. The temple's axis
 * runs due east-west at lx 5.85: the east door at lz 25.66 opens onto the
 * drop, the sanctum is centred at lz -2.1 and the chapel 9.4 m south of it.
 *
 * HEIGHTS: nothing published is a survey. The chapel tower is 22 m to its
 * crown and the sanctum tower 14.5 m (the survey's photogrammetry, +-20 per
 * cent); the gateway 12.5 m. The court is MEASURED against those towers in
 * two approach photographs (2006 and 2023): with the towers fitted, the
 * court's west wall and the bastion block both came out 2-3 m too high at
 * 11.5 m, so the court stands 9.5 m over the lane and the block's terrace
 * 2.3 m over the court. Fifty risers of 0.19 m, on treads deep enough to
 * walk, put the stair's foot where the imagery has it.
 *
 * THE EPOCH is 2024-25: the court paved in red sandstone by the ASI (c. 2024),
 * the towers before the 2025-26 chemical cleaning and without the 2026
 * scaffold — the survey's 2006-23 colours.
 */

import { campusSign } from './Signage.js';

/** Colours. MEASURED where the survey sampled a daylight photograph. */
const C = {
  REV: 0x7e5345,        // the retaining wall, hazy daylight 2006
  COPE: 0xb9987a, VENT: 0x22180f,
  PLASTER: 0xd3b99a,    // the stair's coped parapets (eyeballed, 2023)
  CURB: 0xc89a84,       // the salmon curbs across the grass
  STONE: 0x8a4a34,      // base sandstone albedo, neutral daylight (survey, INFERRED)
  STONE_LT: 0xa9764b,   // the sun-bleached, iron-leached courses
  SOOT: 0x5e3a33,       // soot and biofilm
  EGG: 0x92635f,        // sanctum tower, plain ashlar, lit (2006)
  PANEL: 0x75413b,      // chapel tower, panelled face, lit (2006)
  BRICK: 0x9a5a48,      // the nave's patching (Growse p.252)
  PAVE: 0x9b5a45,       // the 2024 red sandstone slabs (INFERRED)
  GRASS: 0x6b7c3b, IRON: 0x2a2826, DARK: 0x1d1510,
  REDPAINT: 0x9b3a2e,   // the red-painted building beside the stair (2023, 2026)
  CREAM: 0xe2d2b0, TRIM: 0xa8563c, WHITE: 0xece6d8, GOLD: 0xc9a227, MARBLE: 0xe6e0d2,
};

/** The precinct, OSM way 334671983, in the box frame; counter-clockwise. */
const PRECINCT = [
  [5.19, -18.99], [3.85, -28.21], [16.95, -28.68], [17.89, -18.6], [18.73, -9.51],
  [22.15, -2.66], [24.64, 2.25], [26.48, 6.68], [30.23, 6.74], [30.86, 23.23],
  [15.5, 22.84], [15.02, 25.7], [14.7, 27.61], [-5.13, 28.69], [-5.13, 25.87],
  [-18.49, 26.67], [-18.71, 20.7], [-30.42, 19.11], [-30.86, -15.69], [-3.74, -18.45],
];
/** The bastion block at the NW angle: its terrace stands above the court. */
const BLOCK_POLY = [[5.19, -18.99], [3.85, -28.21], [16.95, -28.68], [17.89, -18.6]];
/** The ledge outside the nave's east door, Growse's "drop of some 9 or 10 feet". */
const LEDGE_POLY = [[15.02, 25.7], [14.7, 27.61], [-5.13, 28.69], [-5.13, 25.7]];
/** The court: the precinct less the block and the ledge. */
const COURT_POLY = [
  [5.19, -18.99], [17.89, -18.6], [18.73, -9.51], [22.15, -2.66], [24.64, 2.25],
  [26.48, 6.68], [30.23, 6.74], [30.86, 23.23], [15.5, 22.84], [15.02, 25.7],
  [-5.13, 25.7], [-5.13, 25.87], [-18.49, 26.67], [-18.71, 20.7], [-30.42, 19.11],
  [-30.86, -15.69], [-3.74, -18.45],
];
// which level each precinct edge carries: the block's three faces, the ledge's three
const EDGE_LEVEL = PRECINCT.map((_, i) => (i <= 2 ? 'block' : i >= 11 && i <= 13 ? 'ledge' : 'court'));

/** Where the line lx = c crosses a polygon: the lz spans inside it, in order. */
function spansAt(poly, c) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
    if ((ax <= c) !== (bx <= c)) xs.push(az + (c - ax) / (bx - ax) * (bz - az));
  }
  xs.sort((m, n) => m - n);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

/**
 * A strip's spans, as the union of the spans at its two edges and its middle:
 * the floor must reach the parapet everywhere along an oblique wall, or you
 * fall through the gap at its foot.
 */
function stripSpans(poly, lx0, lx1) {
  const all = [...spansAt(poly, lx0 + 0.01), ...spansAt(poly, (lx0 + lx1) / 2), ...spansAt(poly, lx1 - 0.01)]
    .sort((m, n) => m[0] - n[0]);
  const out = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1] + 0.05) last[1] = Math.max(last[1], s[1]);
    else out.push([s[0], s[1]]);
  }
  return out;
}

/** The unit-offset miter at vertex i of a counter-clockwise polygon. */
function miter(P, i) {
  const n = P.length, a = P[(i + n - 1) % n], q = P[i], c = P[(i + 1) % n];
  const u = (dx, dz) => { const L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; };
  const e1 = u(q[0] - a[0], q[1] - a[1]), e2 = u(c[0] - q[0], c[1] - q[1]);
  const n1 = [e1[1], -e1[0]], n2 = [e2[1], -e2[0]];          // outward
  const m = u(n1[0] + n2[0], n1[1] + n2[1]);
  const k = 1 / Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]);
  return [m[0] * k, m[1] * k];
}

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const mix = (a, c, t) => {
  const ch = (v, s) => (v >> s) & 255;
  const m = (s) => Math.round(ch(a, s) * (1 - t) + ch(c, s) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};
/**
 * One course of the stone. "The ashlar is strongly BANDED course by course
 * from deep red-brown to buff ochre ... a single flat red albedo reads as
 * plastic."
 */
const course = (base, i) => {
  const h = hash(i);
  if (h < 0.22) return mix(base, C.STONE_LT, 0.42);
  if (h > 0.82) return mix(base, C.SOOT, 0.32);
  return mix(base, h > 0.5 ? 0xffffff : 0x000000, 0.04 + 0.05 * hash(i + 7));
};

/**
 * @param o.b, o.signB, o.loc, o.ground, o.terrain, o.colliders
 * @param o.h  helpers: cuspedArch, tint, buildDeities, signUV
 */
export function buildMadanMohanMandir(o) {
  const { b, signB, loc, ground, terrain, colliders } = o;
  const { cuspedArch, tint, buildDeities } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, ang = 0, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  // local facing angles: toward +lx (north) 0, +lz (east) PI/2
  const F = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : ground; };
  const topOf = (lx0, lx1, lz0, lz1, n = 3) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const h = tH(lx0 + (lx1 - lx0) * i / n, lz0 + (lz1 - lz0) * j / n);
      if (h > hi) hi = h;
    }
    return hi;
  };
  const sign = (key, lx, y, lz, w, h, faceAng) => {
    const slot = typeof key === 'number' ? key : campusSign(key);
    if (slot < 0 || !signB) return;
    const q = p(lx, lz), wa = rot + faceAng;
    signB.panelUV(q[0], y, q[1], w, h, o.h.signUV(slot), Math.atan2(Math.cos(wa), Math.sin(wa)), 0.05);
  };
  /** A quad in LOCAL coordinates, [lx, y, lz] each. */
  const lq = (A, B, Cq, D, col) => {
    const a = p(A[0], A[2]), bb = p(B[0], B[2]), c = p(Cq[0], Cq[2]), d = p(D[0], D[2]);
    b.quad([a[0], A[1], a[1]], [bb[0], B[1], bb[1]], [c[0], Cq[1], c[1]], [d[0], D[1], d[1]], col);
  };
  const ltri = (A, B, Cq, col) => {
    const a = p(A[0], A[2]), bb = p(B[0], B[2]), c = p(Cq[0], Cq[2]);
    b.tri(a[0], A[1], a[1], bb[0], B[1], bb[1], c[0], Cq[1], c[1], col);
  };
  /** A wall from A to B in the plan, `t` thick. */
  const seg = (ax, az, bx, bz, y, h, t, color, ext = 0) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-3) return;
    box((ax + bx) / 2, y, (az + bz) / 2, L + ext, h, t, color, Math.atan2(bz - az, bx - ax));
  };
  const solidSeg = (ax, az, bx, bz, t, extra, ext = 0) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-3) return;
    solid((ax + bx) / 2, (az + bz) / 2, L + ext, t, Math.atan2(bz - az, bx - ax), extra);
  };
  /** Courses of stone from y0 to y1, each its own shade. */
  const coursed = (lx, lz, w, d, y0, y1, ang, base = C.STONE, k0 = 0, H = 0.46) => {
    let i = 0;
    for (let y = y0; y < y1 - 1e-3; y += H, i++) box(lx, y, lz, w, Math.min(H, y1 - y), d, course(base, k0 + i), ang);
  };
  /** An iron railing from A to B, `h` high, stood on y. */
  const railing = (ax, az, bx, bz, y, h = 1.15) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 0.16));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      box(ax + (bx - ax) * t, y, az + (bz - az) * t, i % 8 ? 0.03 : 0.07, h, i % 8 ? 0.03 : 0.07, C.IRON);
    }
    seg(ax, az, bx, bz, y + h - 0.05, 0.06, 0.06, C.IRON);
    seg(ax, az, bx, bz, y + 0.12, 0.05, 0.05, C.IRON);
    solidSeg(ax, az, bx, bz, 0.2, { top: y + h });
  };
  const rooms = [];

  /* ================================================================
   * THE MOUND — Dwadashaditya Tila behind its battered revetment
   * ================================================================ */
  /*
   * "From the Parikrama Marg approach what you actually see is a colossal
   * battered revetment ... with a straight parapet pierced by small square
   * vents and with two engaged ROUNDED bastions at its angles. The temple
   * towers only appear above and behind it." The terrain here is flat
   * alluvium, so the tila is built: the precinct's own outline, walled.
   */
  const yG = topOf(-31, 31, -29, 29, 6);
  const COURT = yG + 9.5;
  const BLOCK = COURT + 2.3;       // the bastion block's terrace stands over the court (2006, 2023)
  const LEDGE = COURT - 2.9;       // 9-10 ft: Growse p.251
  const TT = COURT - 2.4;          // where the grass slope meets the court's west wall
  const Y0 = yG - 0.3;
  const BAT = 0.9;                 // the batter at the foot
  const LEVEL = { court: COURT, block: BLOCK, ledge: LEDGE };
  const NP = PRECINCT.length;
  const M = PRECINCT.map((_, i) => miter(PRECINCT, i));
  // the face leans back to the court's height and stands upright above it
  const off = (y) => (y >= COURT ? 0 : BAT * (COURT - y) / (COURT - Y0));
  const V = (i, y, extra = 0) => [PRECINCT[i][0] + M[i][0] * (off(y) + extra), y, PRECINCT[i][1] + M[i][1] * (off(y) + extra)];
  const nOut = (i) => {
    const a = PRECINCT[i], c = PRECINCT[(i + 1) % NP], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    return [(c[1] - a[1]) / L, -(c[0] - a[0]) / L];
  };
  const SX = -6.5, SWID = 1.7;     // the approach stair's centre line and clear width

  for (let i = 0; i < NP; i++) {
    const j = (i + 1) % NP, T = LEVEL[EDGE_LEVEL[i]];
    // the face, in lifts of about 1.4 m, each a shade of its own
    const lifts = Math.max(2, Math.round((T - Y0) / 1.4));
    for (let k = 0; k < lifts; k++) {
      const ya = Y0 + (T - Y0) * k / lifts, yb = Y0 + (T - Y0) * (k + 1) / lifts;
      lq(V(i, ya), V(i, yb), V(j, yb), V(j, ya), course(C.REV, i * 13 + k));
    }
    // three string courses, as on the bastions (2023)
    for (const h of [2.8, 5.9, 8.9]) {
      const ya = yG + h;
      if (ya > T - 1) continue;
      lq(V(i, ya, 0.07), V(i, ya + 0.18, 0.07), V(j, ya + 0.18, 0.07), V(j, ya, 0.07), tint(C.REV, 0.82));
      lq(V(i, ya + 0.18, 0.07), V(i, ya + 0.18), V(j, ya + 0.18), V(j, ya + 0.18, 0.07), tint(C.REV, 1.05));
    }
    // the small square holes in rows that pepper every face
    if (EDGE_LEVEL[i] !== 'ledge') {
      const A = PRECINCT[i], B = PRECINCT[j], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const cols = Math.floor((L - 1.2) / 2.4);
      for (let r = 0; ; r++) {
        const ya = yG + 1.6 + r * 2.1;
        if (ya > T - 1.4) break;
        for (let c = 0; c <= cols; c++) {
          const t0 = (0.6 + c * 2.4 + (r % 2) * 1.2) / L, t1 = t0 + 0.16 / L;
          if (t1 > 0.97) continue;
          const P0 = V(i, ya, 0.02), P1 = V(j, ya, 0.02), Q0 = V(i, ya + 0.16, 0.02), Q1 = V(j, ya + 0.16, 0.02);
          const at = (S, E, t) => [S[0] + (E[0] - S[0]) * t, S[1], S[2] + (E[2] - S[2]) * t];
          lq(at(P0, P1, t0), at(Q0, Q1, t0), at(Q0, Q1, t1), at(P0, P1, t1), C.VENT);
        }
      }
    }
    // the parapet with its vents, on the line of the edge
    const pieces = [];
    {
      const A = PRECINCT[i], B = PRECINCT[j];
      if (i === 18) {
        // the stair comes up through it
        const atLx = (lx) => { const t = (lx - A[0]) / (B[0] - A[0]); return [lx, A[1] + (B[1] - A[1]) * t]; };
        pieces.push([A, atLx(SX - SWID / 2 - 0.05)], [atLx(SX + SWID / 2 + 0.05), B]);
      } else pieces.push([A, B]);
    }
    const PH = EDGE_LEVEL[i] === 'block' ? 1.35 : EDGE_LEVEL[i] === 'ledge' ? 1.0 : 1.1;
    const n = nOut(i), VS = EDGE_LEVEL[i] === 'block' ? 2.2 : 3.2;
    for (const [A, B] of pieces) {
      const a = [A[0] - n[0] * 0.22, A[1] - n[1] * 0.22], c = [B[0] - n[0] * 0.22, B[1] - n[1] * 0.22];
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      seg(a[0], a[1], c[0], c[1], T - 0.05, PH + 0.05, 0.45, tint(C.REV, 0.96), 0.44);
      seg(a[0], a[1], c[0], c[1], T + PH, 0.12, 0.56, C.COPE, 0.5);
      solidSeg(a[0], a[1], c[0], c[1], 0.45, { top: T + PH }, 0.44);
      for (let s = 1.1; s < L - 0.6; s += VS) {
        const t = s / L;
        box(a[0] + (c[0] - a[0]) * t, T + 0.38, a[1] + (c[1] - a[1]) * t, 0.42, 0.42, 0.5, C.VENT,
          Math.atan2(c[1] - a[1], c[0] - a[0]));
      }
    }
    // the battered foot, so nobody stands inside it: not where the grass and
    // the stair cover the face
    if (i !== 0 && i !== 19) {
      let A = PRECINCT[i], B = PRECINCT[j];
      if (i === 18) { const t = (SX - SWID / 2 - 0.4 - A[0]) / (B[0] - A[0]); B = [SX - SWID / 2 - 0.4, A[1] + (B[1] - A[1]) * t]; }
      solidSeg(A[0] + n[0] * BAT / 2, A[1] + n[1] * BAT / 2, B[0] + n[0] * BAT / 2, B[1] + n[1] * BAT / 2, BAT, { top: yG + 2.4 });
    }
  }

  // the two engaged bastions of the block, at its west angles (2006, 2023):
  // polygonal, battered, banded, as tall as the parapet
  for (const v of [1, 2]) {
    const [cx, cz] = PRECINCT[v];
    const top = BLOCK + 1.35, SIDES = 10;
    const rAt = (y) => 1.85 + 0.55 * Math.max(0, (COURT - y) / (COURT - Y0));
    const ys = [Y0, yG + 2.8, yG + 2.98, yG + 5.9, yG + 6.08, yG + 8.9, yG + 9.08, COURT, BLOCK, BLOCK + 0.2, top];
    for (let k = 1; k < ys.length; k++) {
      const y0 = ys[k - 1], y1 = ys[k], band = (k % 2 === 0);
      for (let s = 0; s < SIDES; s++) {
        const a0 = s / SIDES * Math.PI * 2, a1 = (s + 1) / SIDES * Math.PI * 2;
        const r0 = rAt(y0) + (band ? 0.08 : 0), r1 = rAt(y1) + (band ? 0.08 : 0);
        lq([cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1],
          [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0],
          band ? tint(C.REV, 0.84) : course(C.REV, v * 31 + k));
      }
    }
    for (let s = 0; s < SIDES; s++) {
      const a0 = s / SIDES * Math.PI * 2, a1 = (s + 1) / SIDES * Math.PI * 2, r = rAt(top);
      ltri([cx, top, cz], [cx + Math.cos(a1) * r, top, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, top, cz + Math.sin(a0) * r], C.COPE);
    }
    // vents round the bastion's head
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2, r = rAt(BLOCK + 0.6) + 0.01;
      box(cx + Math.cos(a) * r, BLOCK + 0.55, cz + Math.sin(a) * r, 0.3, 0.3, 0.3, C.VENT, a);
    }
    post(cx, cz, 2.45, { top });
  }

  // the block's inner face, over the court
  seg(PRECINCT[3][0], PRECINCT[3][1] - 0.3, PRECINCT[0][0], PRECINCT[0][1] - 0.3, COURT - 0.3, BLOCK - COURT + 1.3, 0.6, C.REV, 0.3);
  seg(PRECINCT[3][0], PRECINCT[3][1] - 0.3, PRECINCT[0][0], PRECINCT[0][1] - 0.3, BLOCK + 1.0, 0.12, 0.7, C.COPE, 0.3);

  // the drop: the court's edge over the ledge, either side of the nave
  for (const [a, c] of [[-5.13, 1.75], [9.95, 15.02]]) {
    seg(a, 25.45, c, 25.45, LEDGE - 0.2, COURT - LEDGE + 0.2, 0.5, course(C.REV, a * 7), 0.4);
    seg(a, 25.45, c, 25.45, COURT, 0.95, 0.4, tint(C.REV, 0.96));
    seg(a, 25.45, c, 25.45, COURT + 0.95, 0.1, 0.5, C.COPE);
    solidSeg(a, 25.45, c, 25.45, 0.4, { top: COURT + 0.95 });
  }

  // the floors: the court, the block's terrace, the ledge — strips you stand on
  const strips = (poly, top, tag, draw) => {
    let lo = Infinity, hi = -Infinity;
    for (const q of poly) { lo = Math.min(lo, q[0]); hi = Math.max(hi, q[0]); }
    for (let a = lo; a < hi - 1e-3; a += 1.0) {
      const a1 = Math.min(hi, a + 1.0);
      for (const [z0, z1] of stripSpans(poly, a, a1)) {
        if (z1 - z0 < 0.05) continue;
        solid((a + a1) / 2, (z0 + z1) / 2, a1 - a, z1 - z0, 0, { top, tag, floor: true });
        if (draw) draw(a, a1, z0, z1);
      }
    }
  };
  // the south strip is a garden of planted beds (imagery); the rest is the
  // ASI's red sandstone, laid c. 2024 where grass had been
  const GARDEN_X = -22.0, GARDEN_Z = 7.8;
  strips(COURT_POLY, COURT, 'mm-court', (a, a1, z0, z1) => {
    box((a + a1) / 2, COURT - 0.32, (z0 + z1) / 2, a1 - a, 0.31, z1 - z0, tint(C.PAVE, 0.62));
    const off2 = (Math.round(a) & 1) ? 0.75 : 0;
    for (let s = z0 - off2; s < z1; s += 1.5) {
      const s0 = Math.max(z0, s + 0.02), s1 = Math.min(z1, s + 1.48);
      if (s1 - s0 < 0.1) continue;
      const garden = a1 <= GARDEN_X + 0.01 && s1 <= GARDEN_Z + 0.75;
      const col = garden ? tint(C.GRASS, 0.9 + 0.15 * hash(a * 3 + s)) : tint(C.PAVE, 0.88 + 0.2 * hash(a * 7.3 + s * 1.7));
      lq([a + 0.02, COURT, s0], [a + 0.02, COURT, s1], [a1 - 0.02, COURT, s1], [a1 - 0.02, COURT, s0], col);
    }
  });
  strips(BLOCK_POLY, BLOCK, 'mm-block', (a, a1, z0, z1) => {
    box((a + a1) / 2, BLOCK - 0.3, (z0 + z1) / 2, a1 - a, 0.3, z1 - z0, tint(C.STONE_LT, 0.9 + 0.1 * hash(a)));
  });
  strips(LEDGE_POLY, LEDGE, 'mm-ledge', (a, a1, z0, z1) => {
    box((a + a1) / 2, LEDGE - 0.3, (z0 + z1) / 2, a1 - a, 0.3, z1 - z0, tint(C.STONE, 0.8 + 0.1 * hash(a)));
  });
  // the garden's beds and its curb
  seg(GARDEN_X, -15.4, GARDEN_X, GARDEN_Z, COURT, 0.32, 0.25, C.CURB);
  for (let gx = -29.2; gx < GARDEN_X - 0.8; gx += 2.4) {
    for (let gz = -14.2; gz < GARDEN_Z - 0.5; gz += 2.5) {
      const q = p(gx, gz), s = 0.7 + 0.3 * hash(gx * 3.1 + gz);
      b.prism(q[0], COURT, q[1], 0.5 * s, 0.5 * s, 1.0 * s, 1.0 * s, 0.55 * s, 0x4f6a2e, rot);
      b.prism(q[0], COURT + 0.55 * s, q[1], 1.0 * s, 1.0 * s, 0.4 * s, 0.4 * s, 0.45 * s, 0x5d7a35, rot);
    }
  }

  /* ---- the grass slope west of the court, and the stair beside it ---- */
  /*
   * "A single long straight masonry stair with a plain parapet climbs the
   * grassed slope ... in two flights with a landing." Every approach
   * photograph has the grass on its left with two salmon curbs across it,
   * the bastion block beyond, and on its right a high wall; the imagery has
   * its shadow running due east to the court's west face at lx -6.5.
   */
  const edgeZ = (lx) => spansAt(PRECINCT, lx)[0][0];
  const TX0 = SX + SWID / 2 + 0.3, FOOT = -44.0;
  const txN = (lz) => (lz < -28.21 ? 3.85 : 3.85 + (lz + 28.21) / 9.22 * 1.15);
  const slope = (lz) => yG + (TT - yG) * Math.max(0, Math.min(1, (lz - FOOT) / (edgeZ(TX0) - FOOT)));
  {
    const NS = 10, zTop = edgeZ(TX0);
    for (let k = 0; k < NS; k++) {
      const za = FOOT + (zTop - FOOT) * k / NS, zb = FOOT + (zTop - FOOT) * (k + 1) / NS;
      const g = tint(C.GRASS, 0.9 + 0.14 * hash(k));
      lq([TX0, slope(za), za], [TX0, slope(zb), zb], [txN(zb), slope(zb), zb], [txN(za), slope(za), za], g);
      // the north side, open to the lawn beyond the block
      if (za < -28.21) {
        lq([3.85, Y0, za], [3.85, slope(za), za], [3.85, slope(zb), zb], [3.85, Y0, zb], course(C.REV, 400 + k));
      }
    }
    // two curbs across it
    for (const cz of [-36.0, -27.4]) {
      seg(TX0, cz, txN(cz), cz, slope(cz) - 0.3, 0.75, 0.3, C.CURB);
      seg(TX0, cz, txN(cz), cz, slope(cz) + 0.45, 0.06, 0.36, tint(C.CURB, 1.08));
    }
    // it is fenced at its foot; solid, in three lifts, behind the fence
    for (const [za, zb] of [[FOOT, -35.5], [-35.5, -27.0], [-27.0, zTop]]) {
      solid((TX0 + 4.4) / 2, (za + zb) / 2, 4.4 - TX0, zb - za, 0, { top: slope(zb) });
    }
    railing(TX0 + 0.05, FOOT - 0.5, 4.3, FOOT - 0.5, yG);
    // the wall over the grass, with its little door (2026)
    const dz = edgeZ(-0.6);
    box(-0.6, TT + 0.25, dz - 0.19, 0.9, 1.9, 0.06, C.DARK);
  }

  // the stair: fifty risers of 0.19 m, a landing two-fifths of the way up
  const NR = 50, RISE = (COURT - yG) / NR, TR = 0.5, LAND = 3.0, LAND_I = 19;
  /*
   * The top tread ends where the court's floor strips begin, which on this
   * oblique wall is up to 0.2 m short of the wall line in places: the head
   * of the flight gets a landing of its own, so there is no sliver between
   * tread and court to drop through.
   */
  const courtLo = Math.min(...COURT_POLY.map((q) => q[0]));
  const courtStart = (lx) => {
    const a = courtLo + Math.floor(lx - courtLo);
    const s = stripSpans(COURT_POLY, a, a + 1.0);
    return s.length ? s[0][0] : edgeZ(lx);
  };
  const S_TOP = Math.min(courtStart(SX - SWID / 2 + 0.01), courtStart(SX), courtStart(SX + SWID / 2 - 0.01)) - 0.005;
  box(SX, COURT - 0.3, S_TOP + 0.35, SWID + 0.5, 0.3, 0.7, 0x8e5a48);
  solid(SX, S_TOP + 0.35, SWID, 0.7, 0, { top: COURT, tag: 'mm-stair-head', floor: true });
  const depths = [];
  for (let i = 0; i < NR - 1; i++) depths.push(i === LAND_I ? LAND : TR);
  const S_FOOT = S_TOP - depths.reduce((s, d2) => s + d2, 0);
  {
    let zc = S_FOOT;
    for (let i = 0; i < NR - 1; i++) {
      const d2 = depths[i], top = yG + (i + 1) * RISE;
      box(SX, top - RISE - 0.08, zc + d2 / 2, SWID + 0.06, RISE + 0.08, d2, i % 2 ? 0x8e5a48 : 0x86533f);
      solid(SX, zc + d2 / 2, SWID, d2, 0, { top, tag: i < LAND_I ? 'mm-stair-lo' : 'mm-stair-hi', standOnly: true });
      zc += d2;
    }
  }
  // the pitch of the parapets: through the nosings, flat over the landing
  const LZ0 = S_FOOT + LAND_I * TR, LZ1 = LZ0 + LAND;
  const pitch = (lz) => {
    if (lz <= LZ0) return yG + RISE + (lz - S_FOOT) / TR * RISE;
    if (lz <= LZ1) return yG + (LAND_I + 1) * RISE;
    return yG + (LAND_I + 2) * RISE + (lz - LZ1) / TR * RISE;
  };
  {
    const knots = [S_FOOT - 0.2, LZ0, LZ1, S_TOP + 0.3];
    for (const [lx, h, col] of [[SX + SWID / 2 + 0.15, 1.0, C.PLASTER], [SX - SWID / 2 - 0.15, 1.1, C.PLASTER]]) {
      for (let k = 1; k < knots.length; k++) {
        const za = knots[k - 1], zb = knots[k], ya = pitch(Math.max(S_FOOT, za)) + h, yb = pitch(Math.min(S_TOP - 0.01, zb)) + h;
        const xo = lx + 0.15, xi = lx - 0.15;
        // both faces, and the coping along the top
        lq([xo, Y0, za], [xo, ya, za], [xo, yb, zb], [xo, Y0, zb], tint(col, 0.92));
        lq([xi, Y0, zb], [xi, yb, zb], [xi, ya, za], [xi, Y0, za], tint(col, 0.86));
        lq([xi, ya, za], [xi, yb, zb], [xo, yb, zb], [xo, ya, za], tint(col, 1.06));
        // and solid, a few treads at a time
        for (let s = za; s < zb - 1e-3; s += 1.8) {
          const s1 = Math.min(zb, s + 1.8);
          solid(lx, (s + s1) / 2, 0.3, s1 - s, 0, { top: pitch(Math.min(S_TOP - 0.01, s1)) + h });
        }
      }
      // the blunt ends at the foot
      box(lx, Y0, S_FOOT - 0.35, 0.34, pitch(S_FOOT) + h - Y0 + 0.05, 0.3, tint(col, 0.9));
    }
    // a paved apron at the foot and the path out to the Parikrama Marg
    box(SX, yG - 0.25, S_FOOT - 1.4, 4.2, 0.27, 2.8, 0xb79c86);
    box(SX + 1.0, yG - 0.25, S_FOOT - 10.2, 3.0, 0.26, 14.8, 0xc4a690);
    // the ASI's two boards at the foot (2023: the maroon one with the tower on it)
    for (const [lx, key, w] of [[SX - 2.6, 'mm-asi', 1.9], [SX + 2.9, 'asi', 1.5]]) {
      box(lx - 0.75, yG, S_FOOT - 2.2, 0.08, 1.2, 0.08, C.IRON);
      box(lx + 0.75, yG, S_FOOT - 2.2, 0.08, 1.2, 0.08, C.IRON);
      box(lx, yG + 1.15, S_FOOT - 2.18, w + 0.1, w * 0.62 + 0.1, 0.05, 0x3a2a22);
      sign(key, lx, yG + 1.2 + w * 0.31, S_FOOT - 2.22, w, w * 0.62, F.W);
    }
  }

  /*
   * The red-painted building at the stair's head, on its right: two photographs
   * (2023, 2026) and absent from the 2006 one. Its window and its roof railing
   * are as they show it; its plan is the imagery's flat roof south of the stair.
   */
  {
    const X0 = -16.5, X1 = SX - SWID / 2 - 0.32, Z0 = -31.0, Z1 = -18.7;
    const yTop = COURT + 3.4;
    coursed((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, Y0, COURT - 1.0, 0, C.REV, 700, 1.4);
    box((X0 + X1) / 2, COURT - 1.0, (Z0 + Z1) / 2, X1 - X0, yTop - COURT + 1.0, Z1 - Z0, C.REDPAINT);
    box((X0 + X1) / 2, yTop, (Z0 + Z1) / 2, X1 - X0 + 0.2, 0.15, Z1 - Z0 + 0.2, tint(C.REDPAINT, 0.8));
    box(X1 + 0.02, COURT + 1.0, -21.5, 0.06, 1.1, 1.4, 0xd8d4c8);       // the window, white-framed
    box(X1 + 0.05, COURT + 1.08, -21.5, 0.04, 0.94, 1.24, 0x28303a);
    railing(X1 - 0.1, Z0 + 0.1, X1 - 0.1, Z1 - 0.1, yTop + 0.15, 1.0);
    railing(X0 + 0.1, Z1 - 0.1, X1 - 0.1, Z1 - 0.1, yTop + 0.15, 1.0);
    solid((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, 0, { top: yTop + 1.15 });
  }

  /* ================================================================
   * THE TEMPLE — nave, choir, sanctum and the chapel off its south side
   * ================================================================ */
  const AX = 5.85;                                  // the axis (OSM)
  const NX0 = 1.75, NX1 = 9.95, NZ0 = 8.3, NZ1 = 25.66, WT = 1.7;
  const NFL = COURT + 0.45;
  const OH = 2.9;                                   // the openings: square-headed
  const NSTONE = NFL + 4.2;                         // salvaged ashlar to here, then brick
  // "three openings on either side": from the east, stub 3.6, open 1.2, pier
  // 1.7, open 1.8, pier 1.9, open 1.4, solid 5.7 (Growse's plate, both surveys)
  const OPEN = [[20.86, 22.06], [17.36, 19.16], [14.06, 15.46]];
  const RUNS = [[NZ0, 14.06], [15.46, 17.36], [19.16, 20.86], [22.06, NZ1 - WT]];
  const brickTop = (k) => NSTONE + 0.5 + 0.85 * hash(k * 3.17 + 1);
  {
    // the plinth and the floor, which is all that is left to roof it
    box(AX, COURT - 0.3, (NZ0 + NZ1 - WT) / 2, NX1 - NX0, NFL - COURT + 0.3, NZ1 - WT - NZ0, 0x8b7765);
    solid(AX, (NZ0 + NZ1 - WT) / 2, NX1 - NX0 - 2 * WT, NZ1 - WT - NZ0, 0, { top: NFL, tag: 'mm-nave-floor', floor: true });
    let k = 0;
    for (const [side, lxs] of [['s', NX0 + WT / 2], ['n', NX1 - WT / 2]]) {
      for (const [za, zb] of RUNS) {
        const mid = (za + zb) / 2, top = brickTop(k++);
        coursed(lxs, mid, WT, zb - za, COURT - 0.2, NSTONE, 0, C.STONE, k * 17);
        box(lxs, NSTONE, mid, WT, top - NSTONE, zb - za, tint(C.BRICK, 0.92 + 0.1 * hash(k)));
        solid(lxs, mid, WT, zb - za, 0, { top });
      }
      OPEN.forEach(([za, zb], oi) => {
        const mid = (za + zb) / 2, w = zb - za, top = brickTop(k++);
        coursed(lxs, mid, WT, w, NFL + OH, NSTONE, 0, C.STONE, k * 17);
        box(lxs, NSTONE, mid, WT, top - NSTONE, w, tint(C.BRICK, 0.92 + 0.1 * hash(k)));
        box(lxs, NFL + OH - 0.06, mid, WT + 0.08, 0.14, w + 0.3, tint(C.STONE, 0.78));   // the lintel's edge
        // the passage through 1.7 m of wall
        box(lxs, COURT - 0.2, mid, WT, NFL - COURT + 0.2, w, 0x8b7765);
        solid(lxs, mid, WT, w, 0, { top: NFL, tag: 'mm-nave-floor', floor: true });
        // "the arches are decorative only": a cusped niche over each lintel, both faces
        for (const face of [-1, 1]) {
          const fx = lxs + face * (WT / 2 + 0.03);
          const q = p(fx, mid);
          cuspedArch(b, q[0], NFL + OH + 0.12, q[1], w + 0.2, 1.05, 0.08, rot + Math.PI / 2, tint(C.STONE, 0.86), 3, tint(C.STONE, 0.62));
        }
        // two steps up from the court to the floor, outside
        const out = side === 's' ? -1 : 1, face0 = side === 's' ? NX0 : NX1;
        for (let st = 0; st < 2; st++) {
          const lx = face0 + out * (0.45 * (1 - st) + 0.225);
          const top2 = COURT + 0.225 * (st + 1);
          box(lx, COURT - 0.1, mid, 0.45, top2 - COURT + 0.1, w + 0.4, tint(0x8b7765, st ? 1 : 0.94));
          solid(lx, mid, 0.45, w + 0.4, 0, { top: top2, tag: `mm-nave-steps-${side}${oi}`, standOnly: true });
        }
      });
    }
    // the east end: a square door straight onto the drop, railed
    const EZ = NZ1 - WT / 2;
    for (const [a, c] of [[NX0, AX - 0.75], [AX + 0.75, NX1]]) {
      const top = brickTop(k++);
      coursed((a + c) / 2, EZ, c - a, WT, LEDGE - 0.2, NSTONE, 0, C.STONE, k * 17);
      box((a + c) / 2, NSTONE, EZ, c - a, top - NSTONE, WT, tint(C.BRICK, 0.95));
      solid((a + c) / 2, EZ, c - a, WT, 0, { top });
    }
    coursed(AX, EZ, 1.5, WT, NFL + 2.6, NSTONE, 0, C.STONE, 991);
    box(AX, NSTONE, EZ, 1.5, brickTop(k++) - NSTONE, WT, tint(C.BRICK, 0.9));
    box(AX, LEDGE - 0.2, EZ, 1.5, NFL - LEDGE + 0.2, WT, 0x8b7765);
    solid(AX, EZ, 1.5, WT, 0, { top: NFL, tag: 'mm-nave-floor', floor: true });
    railing(AX - 0.75, NZ1 - 0.12, AX + 0.75, NZ1 - 0.12, NFL, 1.1);
    rooms.push({
      id: 'madan-mohan-old',
      name: 'Madan Mohan — the old temple',
      hindi: 'प्राचीन मदन मोहन मन्दिर',
      deity: 'Monument of National Importance',
      ...(() => { const c = p(AX, (NZ0 + NZ1 - WT) / 2); return { x: c[0], z: c[1] }; })(),
      hw: (NX1 - NX0) / 2 - WT, hd: (NZ1 - WT - NZ0) / 2, rot,
      door: p(NX0 - 1.6, (OPEN[1][0] + OPEN[1][1]) / 2),
      // roofless: entered as a temple is, and no bell — the deity is at Karauli
      hall: true, quiet: true,
      ceil: COURT + 30,
    });
  }

  // the choir: its tower "destroyed", a stump; the arch into it is barred
  const CZ0 = 1.6, CZ1 = NZ0, CX0 = 1.65, CX1 = 10.05, CTOP = NFL + 6.8;
  coursed(AX, (CZ0 + CZ1) / 2, CX1 - CX0, CZ1 - CZ0, COURT - 0.2, CTOP, 0, C.STONE, 300);
  box(AX, CTOP, (CZ0 + CZ1) / 2, CX1 - CX0 - 1.0, 1.0, CZ1 - CZ0 - 0.8, tint(C.BRICK, 0.9));
  box(AX + 0.3, CTOP + 1.0, (CZ0 + CZ1) / 2 + 0.2, CX1 - CX0 - 2.8, 0.75, CZ1 - CZ0 - 2.4, tint(C.STONE, 0.86));
  solid(AX, (CZ0 + CZ1) / 2, CX1 - CX0, CZ1 - CZ0, 0, { top: CTOP + 1.75 });
  {
    const q = p(AX, CZ1 + 0.03);
    cuspedArch(b, q[0], NFL, q[1], 1.9, 3.6, 0.2, rot, tint(C.STONE, 0.84), 5, C.DARK);
    for (let i = 0; i <= 8; i++) box(AX - 0.85 + i * 0.2125, NFL, CZ1 + 0.12, 0.035, 2.4, 0.035, C.IRON);
    box(AX, NFL + 2.35, CZ1 + 0.12, 1.8, 0.05, 0.05, C.IRON);
  }

  /**
   * An octagonal tower whose radius to the corners follows `prof(y)`, with a
   * raised strip on every angle. `col(y, rib, i)` shades a course.
   */
  const octTower = (cx, cz, y0, y1, step, prof, col, rib = 0.14) => {
    const ring = (y) => {
      const R = prof(y), pts = [];
      for (let k = 0; k < 8; k++) {
        const a0 = Math.PI / 8 + k * Math.PI / 4, a1 = a0 + Math.PI / 4;
        const c0 = [Math.cos(a0) * R, Math.sin(a0) * R], c1 = [Math.cos(a1) * R, Math.sin(a1) * R];
        const at = (t) => [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t];
        pts.push([Math.cos(a0) * (R + rib), Math.sin(a0) * (R + rib), 1], [...at(0.07), 0], [...at(0.93), 1]);
      }
      return pts;
    };
    const ys = [];
    for (let y = y0; y < y1 - 1e-4; y += step) ys.push(y);
    ys.push(y1);
    let lo = ring(ys[0]);
    for (let i = 1; i < ys.length; i++) {
      const hi = ring(ys[i]);
      for (let s = 0; s < 24; s++) {
        const n = (s + 1) % 24;
        lq([cx + lo[s][0], ys[i - 1], cz + lo[s][1]], [cx + hi[s][0], ys[i], cz + hi[s][1]],
          [cx + hi[n][0], ys[i], cz + hi[n][1]], [cx + lo[n][0], ys[i - 1], cz + lo[n][1]],
          col((ys[i - 1] + ys[i]) / 2, lo[s][2], i));
      }
      lo = hi;
    }
    return lo;
  };
  /** A point on face k (0-7) of an octagon of corner radius R, t along it. */
  const facePt = (cx, cz, R, k, t, y, out = 0) => {
    const a0 = Math.PI / 8 + k * Math.PI / 4, a1 = a0 + Math.PI / 4, am = a0 + Math.PI / 8;
    const px = Math.cos(a0) * R + (Math.cos(a1) - Math.cos(a0)) * R * t + Math.cos(am) * out;
    const pz = Math.sin(a0) * R + (Math.sin(a1) - Math.sin(a0)) * R * t + Math.sin(am) * out;
    return [cx + px, y, cz + pz];
  };
  /** A flat octagonal band: outer faces, the top and the underside. */
  const octBand = (cx, cz, y, h, Rin, Rout, color) => {
    for (let k = 0; k < 8; k++) {
      const a0 = Math.PI / 8 + k * Math.PI / 4, a1 = a0 + Math.PI / 4;
      const O = (a, yy) => [cx + Math.cos(a) * Rout, yy, cz + Math.sin(a) * Rout];
      const I = (a, yy) => [cx + Math.cos(a) * Rin, yy, cz + Math.sin(a) * Rin];
      lq(O(a0, y), O(a0, y + h), O(a1, y + h), O(a1, y), color);
      lq(O(a0, y + h), I(a0, y + h), I(a1, y + h), O(a1, y + h), tint(color, 1.08));
      lq(O(a1, y), I(a1, y), I(a0, y), O(a0, y), tint(color, 0.7));
    }
  };
  /** A round lathe: rings [[y, r]], radius modulated by `rf(angle)`. */
  const lathe = (cx, cz, rings, segs, color, rf = () => 1) => {
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0] = rings[i - 1], [y1, r1] = rings[i];
      for (let s = 0; s < segs; s++) {
        const a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2;
        const f0 = rf(a0), f1 = rf(a1);
        lq([cx + Math.cos(a0) * r0 * f0, y0, cz + Math.sin(a0) * r0 * f0], [cx + Math.cos(a0) * r1 * f0, y1, cz + Math.sin(a0) * r1 * f0],
          [cx + Math.cos(a1) * r1 * f1, y1, cz + Math.sin(a1) * r1 * f1], [cx + Math.cos(a1) * r0 * f1, y0, cz + Math.sin(a1) * r0 * f1],
          typeof color === 'function' ? color(i, s) : color);
      }
    }
  };
  const table = (T2, R, y0, H) => (y) => {
    const t = (y - y0) / H;
    if (t <= T2[0][0]) return R * T2[0][1];
    for (let i = 1; i < T2.length; i++) {
      if (t <= T2[i][0]) {
        const u = (t - T2[i - 1][0]) / (T2[i][0] - T2[i - 1][0]);
        return R * (T2[i - 1][1] + (T2[i][1] - T2[i - 1][1]) * u);
      }
    }
    return R * T2[T2.length - 1][1];
  };

  /*
   * THE SANCTUM TOWER — "a plain octagon of curvilinear outline tapering
   * towards the summit" (Growse p.251). Plain coursed ashlar, a flat rib on
   * each angle, one small high opening, and NOTHING on top: it ends blunt.
   */
  const SCX = AX, SCZ = -2.1, SR = 4.35;
  {
    const y0 = COURT + 0.6, H = 14.0;
    octTower(SCX, SCZ, COURT - 0.25, y0, 0.85, () => SR + 0.45, (y, rib, i) => course(C.STONE, 500 + i), 0);
    octBand(SCX, SCZ, y0 - 0.06, 0.06, SR, SR + 0.45, tint(C.STONE, 0.95));
    const prof = table([[0, 1.0], [0.14, 1.025], [0.32, 1.035], [0.5, 0.985], [0.64, 0.89], [0.77, 0.75],
      [0.87, 0.57], [0.94, 0.38], [0.98, 0.2], [1.0, 0.07]], SR, y0, H);
    const top = octTower(SCX, SCZ, y0, y0 + H, 0.5, prof,
      (y, rib, i) => (rib ? tint(course(C.EGG, 600 + i), 1.07) : course(C.EGG, 600 + i)), 0.13);
    for (let s = 0; s < 24; s++) {
      const n = (s + 1) % 24;
      ltri([SCX, y0 + H + 0.05, SCZ], [SCX + top[n][0], y0 + H, SCZ + top[n][1]], [SCX + top[s][0], y0 + H, SCZ + top[s][1]], course(C.EGG, 640));
    }
    // the one small high opening, south-west
    const yy = y0 + H * 0.6, R6 = prof(yy);
    lq(facePt(SCX, SCZ, R6, 4, 0.42, yy, 0.04), facePt(SCX, SCZ, R6, 4, 0.42, yy + 0.75, 0.04),
      facePt(SCX, SCZ, R6, 4, 0.58, yy + 0.75, 0.04), facePt(SCX, SCZ, R6, 4, 0.58, yy, 0.04), C.DARK);
    post(SCX, SCZ, SR + 0.3, { top: y0 + H });
  }

  /*
   * THE CHAPEL TOWER — "much more highly enriched, the whole of its exterior
   * surface being covered with sculptured panels; its proportions are also
   * much more elegant", and the tallest thing on the hill. Four panelled
   * registers over a coarser base storey; in each face three columns of sunk
   * squares, a rosette down the middle and lozenges either side; a bead-string
   * colonnette on every angle; bands of pendant buds; a neck; the great fluted
   * crown overhanging it; a small cap.
   */
  const KCX = -3.55, KCZ = -2.15, KR = 4.3;
  {
    const y0 = COURT + 0.8;
    octTower(KCX, KCZ, COURT - 0.25, y0, 1.05, () => KR + 0.35, (y, rib, i) => course(C.STONE, 520 + i), 0);
    octBand(KCX, KCZ, y0 - 0.06, 0.06, KR, KR + 0.35, tint(C.STONE, 0.95));
    // register heights above the plinth, and the radius at each
    const REG = [0, 3.6, 6.9, 10.0, 12.9, 15.4];
    const prof = table([[0, 1.0], [3.6 / 16, 0.975], [6.9 / 16, 0.9], [10 / 16, 0.8], [12.9 / 16, 0.67], [15.4 / 16, 0.52], [1, 0.47]], KR, y0, 16.0);
    octTower(KCX, KCZ, y0, y0 + 16.0, 0.4, prof,
      (y, rib, i) => (rib ? tint(C.PANEL, i % 2 ? 1.12 : 0.96) : course(C.PANEL, 700 + i)), 0.16);
    // the panels
    const ROWS = [2, 4, 4, 3, 3];
    for (let r = 0; r < ROWS.length; r++) {
      const ya = y0 + REG[r] + 0.25, yb = y0 + REG[r + 1] - 0.15, rows = ROWS[r];
      for (let k = 0; k < 8; k++) {
        for (let row = 0; row < rows; row++) {
          // the east door and its niche take the bottom of the east face
          if (r === 0 && k === 1) continue;
          const y1 = ya + (yb - ya) * row / rows, y2 = ya + (yb - ya) * (row + 1) / rows;
          const ins = (y2 - y1) * 0.12;
          for (let c = 0; c < 3; c++) {
            const t0 = 0.1 + c * 0.8 / 3, t1 = t0 + 0.8 / 3, ti = (t1 - t0) * 0.12;
            const P = (t, yy, out) => facePt(KCX, KCZ, prof(yy), k, t, yy, out);
            lq(P(t0 + ti, y1 + ins, 0.025), P(t0 + ti, y2 - ins, 0.025), P(t1 - ti, y2 - ins, 0.025), P(t1 - ti, y1 + ins, 0.025),
              tint(C.PANEL, 0.74));
            const tm = (t0 + t1) / 2, ym = (y1 + y2) / 2, dt = (t1 - t0) * 0.27, dy = (y2 - y1) * 0.27;
            if (c === 1) {
              // the rosette: a lighter boss, eight-sided at this size
              lq(P(tm - dt, ym - dy, 0.04), P(tm - dt, ym + dy, 0.04), P(tm + dt, ym + dy, 0.04), P(tm + dt, ym - dy, 0.04), tint(C.PANEL, 1.18));
            } else {
              lq(P(tm, ym - dy * 1.25, 0.04), P(tm - dt, ym, 0.04), P(tm, ym + dy * 1.25, 0.04), P(tm + dt, ym, 0.04), tint(C.PANEL, 1.12));
            }
          }
        }
      }
    }
    // the mouldings between the registers: a bead course over a row of buds
    for (let r = 1; r < REG.length; r++) {
      const ym = y0 + REG[r], R = prof(ym);
      octBand(KCX, KCZ, ym - 0.1, 0.32, R - 0.05, R + 0.3, tint(C.PANEL, 0.92));
      octBand(KCX, KCZ, ym + 0.22, 0.1, R - 0.05, R + 0.2, tint(C.PANEL, 1.1));
      for (let k = 0; k < 8; k++) {
        for (const t of [0.2, 0.5, 0.8]) {
          const q = facePt(KCX, KCZ, R, k, t, ym, 0.16), w = p(q[0], q[2]);
          b.prism(w[0], ym - 0.42, w[1], 0.07, 0.07, 0.2, 0.2, 0.34, tint(C.PANEL, 1.02), rot);
        }
      }
    }
    // the neck, with one row of small panels
    const yN0 = y0 + 16.0, yN1 = yN0 + 1.5, RN = 1.78;
    octTower(KCX, KCZ, yN0, yN1, 0.5, () => RN, (y, rib, i) => (rib ? tint(C.PANEL, 1.06) : course(C.PANEL, 760 + i)), 0.08);
    octBand(KCX, KCZ, yN0 - 0.05, 0.12, RN, prof(yN0) + 0.05, tint(C.PANEL, 0.9));
    for (let k = 0; k < 8; k++) {
      const P = (t, yy) => facePt(KCX, KCZ, RN, k, t, yy, 0.03);
      lq(P(0.25, yN0 + 0.35), P(0.25, yN1 - 0.35), P(0.75, yN1 - 0.35), P(0.75, yN0 + 0.35), tint(C.PANEL, 0.72));
    }
    // the crown: some two dozen fat lobes, a mushroom over the neck, not a ball
    const LOBES = 24;
    const lobe = (a) => 0.9 + 0.1 * Math.abs(Math.cos(a * LOBES / 2));
    lathe(KCX, KCZ, [[yN1 - 0.05, 1.7], [yN1 + 0.25, 2.3], [yN1 + 0.7, 2.62], [yN1 + 1.25, 2.66], [yN1 + 1.7, 2.38], [yN1 + 2.05, 1.8], [yN1 + 2.15, 1.3]],
      LOBES * 4, (i, s) => tint(C.PANEL, (s % 4 === 0 || s % 4 === 3) ? 0.86 : 1.06), lobe);
    // the small squat cap, and the stub on it
    const yC = yN1 + 2.15;
    lathe(KCX, KCZ, [[yC, 1.3], [yC + 0.55, 1.15], [yC + 0.7, 1.05], [yC + 1.2, 0.62], [yC + 1.38, 0.22], [yC + 1.6, 0.18], [yC + 1.85, 0.0]], 24, tint(C.PANEL, 0.98));
    // the east door: "its single door, which is at the east end", a raised
    // inscription in the arched niche over it (Growse; 2004, 2006)
    const R0 = prof(y0);
    const D = (t, yy, out = 0.04) => facePt(KCX, KCZ, prof(yy), 1, t, yy, out);
    lq(D(0.36, y0), D(0.36, y0 + 2.35), D(0.64, y0 + 2.35), D(0.64, y0), C.DARK);
    lq(D(0.33, y0 + 2.35), D(0.33, y0 + 2.5), D(0.67, y0 + 2.5), D(0.67, y0 + 2.35, 0.04), tint(C.STONE, 0.7));
    {
      const q = D(0.5, y0 + 2.55, 0.06), w = p(q[0], q[2]);
      cuspedArch(b, w[0], y0 + 2.55, w[1], 0.95, 0.95, 0.06, rot + Math.PI / 2, tint(C.PANEL, 1.05), 1, tint(C.PANEL, 0.66));
      lq(D(0.43, y0 + 2.7, 0.08), D(0.43, y0 + 3.0, 0.08), D(0.57, y0 + 3.0, 0.08), D(0.57, y0 + 2.7, 0.08), tint(C.STONE_LT, 0.9));
    }
    for (let i = 0; i <= 6; i++) {
      const q = D(0.36 + i * 0.28 / 6, y0, 0.12), w = p(q[0], q[2]);
      b.box(w[0], y0, w[1], 0.035, 2.3, 0.035, C.IRON, rot);
    }
    // three steps up to it from the court
    const ap = R0 * Math.cos(Math.PI / 8);
    for (let st = 0; st < 3; st++) {
      const z0 = KCZ + ap + 0.35 + (2 - st) * 0.45, top = COURT + 0.2 * (st + 1);
      box(KCX, COURT - 0.1, z0 + 0.225, 1.8, top - COURT + 0.1, 0.45, tint(C.STONE, st % 2 ? 0.92 : 0.86));
      solid(KCX, z0 + 0.225, 1.8, 0.45, 0, { top, tag: 'mm-chapel-steps', standOnly: true });
    }
    post(KCX, KCZ, KR + 0.05, { top: y0 + 16.0 });
  }
  // the short corridor joining sanctum and chapel
  coursed(1.1, -2.15, 1.9, 3.4, COURT - 0.2, COURT + 6.2, 0, C.STONE, 880);
  box(1.1, COURT + 6.2, -2.15, 2.1, 0.3, 3.6, tint(C.STONE, 0.8));
  solid(1.1, -2.15, 1.9, 3.4, 0, { top: COURT + 6.5 });

  /*
   * THE GATEWAY — "a massive square gateway with a pyramidal tower, which
   * groups very effectively with the two towers of the temple" (p.251): a
   * plain ashlar block, a cornice of carved pendant brackets, seven or eight
   * receding courses to a short ridge (2026). OSM's outline: 11.8 x 12.2 m, a
   * porch on the street side, a recess on the court's.
   */
  {
    const X0 = -22.1, X1 = -10.3, Z0 = 8.1, Z1 = 20.3, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    const GH = COURT + 6.4;
    coursed(cx, cz, X1 - X0, Z1 - Z0, COURT - 0.2, GH, 0, C.STONE, 1200, 0.5);
    // the cornice and its brackets
    box(cx, GH, cz, X1 - X0 + 1.0, 0.32, Z1 - Z0 + 1.0, tint(C.STONE, 0.82));
    for (const [ax, az, bx, bz] of [[X0, Z0, X1, Z0], [X1, Z0, X1, Z1], [X1, Z1, X0, Z1], [X0, Z1, X0, Z0]]) {
      const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 0.75);
      const nx = (bz - az) / L, nz = -(bx - ax) / L;     // outward, counter-clockwise
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, q = p(ax + (bx - ax) * t + nx * 0.28, az + (bz - az) * t + nz * 0.28);
        b.prism(q[0], GH - 0.5, q[1], 0.1, 0.1, 0.26, 0.4, 0.5, tint(C.STONE, 0.9), rot);
      }
    }
    // seven receding courses of the pyramid, each a slab over a deep reveal
    let y = GH + 0.32, w = X1 - X0 - 0.6, d = Z1 - Z0 - 0.6;
    for (let i = 0; i < 7; i++) {
      const h = 0.62 - i * 0.03;
      box(cx, y, cz, w, h, d, course(0x763924, 1300 + i));
      box(cx, y + h, cz, w + 0.4, 0.14, d + 0.4, tint(0x763924, 0.82));
      // small kuta blocks on the corners of each course
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        box(cx + sx * (w / 2 - 0.3), y + h + 0.14, cz + sz * (d / 2 - 0.3), 0.5, 0.32, 0.5, tint(0x763924, 0.95));
      }
      y += h + 0.14;
      w -= 1.25; d -= 1.25;
    }
    box(cx, y, cz, Math.max(1.2, w), 0.5, Math.max(1.9, d + 0.8), tint(0x763924, 1.0));   // the short ridge
    /*
     * The street face, as the 1860s photograph has it from across the street:
     * a great cusped arch in a rectangular frame, its tympanum carved, over a
     * plain doorway (DPLA "Radha Madan Mohan Temple, Vrindavan").
     */
    box(X0 - 0.06, COURT + 0.6, 14.83, 0.12, 5.6, 6.2, tint(C.STONE, 1.06));
    box(X0 - 0.1, COURT + 0.75, 14.83, 0.1, 5.3, 5.8, tint(C.STONE, 0.9));
    {
      const q = p(X0 - 0.16, 14.83);
      cuspedArch(b, q[0], COURT + 0.75, q[1], 4.6, 5.2, 0.1, rot + Math.PI / 2, tint(C.STONE, 1.12), 5, tint(C.STONE, 0.66));
    }
    // the porch on the street side, its door shut (2026: a barred window, no way in)
    coursed(-22.98, 14.83, 1.77, 2.53, COURT - 0.2, COURT + 4.6, 0, C.STONE, 1400, 0.5);
    box(-22.98, COURT + 4.6, 14.83, 2.1, 0.25, 2.9, tint(C.STONE, 0.8));
    box(-23.9, COURT, 14.83, 0.06, 2.6, 1.3, 0x3d2a1c);
    // the court side: a deep arched recess, barred
    {
      const q = p(X1 + 0.03, 14.0);
      cuspedArch(b, q[0], COURT, q[1], 2.3, 4.6, 0.25, rot + Math.PI / 2, tint(C.STONE, 1.08), 3, 0x2e2119);
      for (let i = 0; i <= 9; i++) box(X1 + 0.12, COURT, 12.95 + i * 0.23, 0.035, 2.6, 0.035, C.IRON);
    }
    // the small barred window on its east face (2026)
    box(cx, COURT + 3.6, Z1 + 0.03, 0.8, 0.9, 0.06, C.DARK);
    for (let i = 0; i < 4; i++) box(cx - 0.3 + i * 0.2, COURT + 3.6, Z1 + 0.07, 0.03, 0.9, 0.03, C.IRON);
    solid(cx, cz, X1 - X0, Z1 - Z0, 0, { top: y + 0.5 });
    solid(-22.98, 14.83, 1.77, 2.53, 0, { top: COURT + 4.85 });
  }

  /* ---- Sanatana Goswami's bhajan kutir, on the court's north side ---- */
  {
    const X0 = 19.6, X1 = 23.8, Z0 = 13.9, Z1 = 17.2, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    box(cx, COURT - 0.1, cz, X1 - X0 + 0.4, 0.45, Z1 - Z0 + 0.4, 0xc9b79a);
    box(cx, COURT + 0.35, cz, X1 - X0, 2.9, Z1 - Z0, C.CREAM);
    box(cx, COURT + 3.25, cz, X1 - X0 + 0.3, 0.2, Z1 - Z0 + 0.3, C.TRIM);
    box(cx, COURT + 3.45, cz, X1 - X0, 0.4, Z1 - Z0, C.CREAM);
    box(X0 - 0.02, COURT + 0.35, cz, 0.06, 2.0, 0.9, 0x3d2a1c);
    solid(cx, cz, X1 - X0 + 0.4, Z1 - Z0 + 0.4, 0, { top: COURT + 3.85 });
  }

  /* ---- his samadhi, and the second kutir, at the foot of the mound ---- */
  for (const [X0, X1, Z0, Z1, dome, doorX] of [[-29.9, -21.9, -49.4, -41.2, true, -29.93], [-43.0, -36.6, -35.0, -28.3, false, -36.57]]) {
    const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, y = topOf(X0, X1, Z0, Z1, 2);
    box(cx, y - 0.2, cz, X1 - X0 + 0.6, 0.8, Z1 - Z0 + 0.6, 0xcfc3ad);
    box(cx, y + 0.6, cz, X1 - X0, 3.2, Z1 - Z0, C.WHITE);
    box(cx, y + 3.8, cz, X1 - X0 + 0.3, 0.22, Z1 - Z0 + 0.3, C.TRIM);
    if (dome) {
      const r = Math.min(X1 - X0, Z1 - Z0) * 0.3;
      lathe(cx, cz, [[y + 4.0, r * 1.05], [y + 4.6, r * 1.05], [y + 5.4, r * 0.92], [y + 6.0, r * 0.6], [y + 6.35, r * 0.18], [y + 6.4, 0]], 16, C.WHITE);
      box(cx, y + 6.35, cz, 0.22, 0.6, 0.22, C.GOLD);
    }
    // the door, toward the lane
    const q = p(doorX, cz);
    cuspedArch(b, q[0], y + 0.6, q[1], 1.3, 2.4, 0.12, rot + Math.PI / 2, C.TRIM, 3, C.DARK);
    solid(cx, cz, X1 - X0 + 0.6, Z1 - Z0 + 0.6, 0, { top: y + (dome ? 6.4 : 4.0) });
  }

  /* ================================================================
   * THE NEW TEMPLE — where the deities are worshipped
   * ================================================================ */
  /*
   * "Worship is ordinarily performed in an elegant and substantial edifice
   * erected on the other side of the street under the shadow of the older
   * fane" (Growse p.251), c. 1821; his plate draws it as a small rectangle
   * across the street, south-east of the gateway. "A plain 19th-century
   * Bengali-patron building ... NOT a tower-temple." Its POSITION follows the
   * plate onto the imagery's lane-side range and is INFERRED; its FORM is
   * INFERRED. The altar group is three: Madan Mohan, Radha, Lalita.
   */
  const NX = { X0: -45.0, X1: -35.4, Z0: 9.0, Z1: 21.0 };
  const yN = topOf(NX.X0, NX.X1, NX.Z0, NX.Z1, 3);
  const NF = yN + 0.45;
  const HALL = { lx0: -44.4, lx1: -36.0, lz0: 9.6, lz1: 20.4 };
  const SCR = -42.6;                     // the screen wall before the sanctum
  const ALT = { lx: -43.75, lz: 15.0 };
  {
    const cz = (NX.Z0 + NX.Z1) / 2, H1 = 4.4, H = 8.4;
    // plinth and floor
    box((NX.X0 + NX.X1) / 2, yN - 0.2, cz, NX.X1 - NX.X0, NF - yN + 0.2, NX.Z1 - NX.Z0, 0xcbbfa8);
    box((HALL.lx0 + HALL.lx1) / 2, NF - 0.02, cz, HALL.lx1 - HALL.lx0, 0.04, HALL.lz1 - HALL.lz0, 0xddd4c2);
    solid((HALL.lx0 + HALL.lx1) / 2, cz, HALL.lx1 - HALL.lx0, HALL.lz1 - HALL.lz0, 0, { top: NF, tag: 'temple-floor', floor: true });
    solid(-35.7, 15.0, 0.6, 2.0, 0, { top: NF, tag: 'temple-floor', floor: true });
    // the side and back walls, two storeys
    for (const [lx, lz, w, d] of [
      [(NX.X0 + NX.X1) / 2, NX.Z0 + 0.3, NX.X1 - NX.X0, 0.6], [(NX.X0 + NX.X1) / 2, NX.Z1 - 0.3, NX.X1 - NX.X0, 0.6],
      [NX.X0 + 0.3, cz, 0.6, NX.Z1 - NX.Z0 - 1.2],
    ]) {
      box(lx, NF, lz, w, H - 0.45, d, C.CREAM);
      solid(lx, lz, w, d, 0, { top: yN + H });
    }
    // the front, on the lane: an arched doorway, a chhajja, three jharokhas above
    const FX = NX.X1 - 0.3;
    for (const [za, zb] of [[NX.Z0 + 0.6, 14.0], [16.0, NX.Z1 - 0.6]]) {
      box(FX, NF, (za + zb) / 2, 0.6, H - 0.45, zb - za, C.CREAM);
      solid(FX, (za + zb) / 2, 0.6, zb - za, 0, { top: yN + H });
    }
    box(FX, NF + 3.1, 15.0, 0.6, H - 0.45 - 3.1, 2.0, C.CREAM);
    {
      const q = p(NX.X1 + 0.03, 15.0);
      cuspedArch(b, q[0], NF, q[1], 2.0, 3.1, 0.2, rot + Math.PI / 2, C.TRIM, 5, null);
    }
    box(NX.X1 + 0.45, NF + H1 - 0.1, cz, 0.9, 0.14, NX.Z1 - NX.Z0, C.TRIM);
    for (const jz of [11.6, 15.0, 18.4]) {
      box(NX.X1 + 0.35, NF + H1 + 0.6, jz, 0.7, 0.25, 1.6, C.TRIM);
      box(NX.X1 + 0.35, NF + H1 + 0.85, jz, 0.6, 1.5, 1.4, C.CREAM);
      box(NX.X1 + 0.67, NF + H1 + 1.0, jz, 0.04, 1.1, 0.9, 0x5a3a26);
      box(NX.X1 + 0.35, NF + H1 + 2.35, jz, 0.8, 0.18, 1.7, C.TRIM);
    }
    // the roof, its parapet, and the hall's ceiling under the upper floor
    box((NX.X0 + NX.X1) / 2, yN + H, cz, NX.X1 - NX.X0 + 0.3, 0.25, NX.Z1 - NX.Z0 + 0.3, C.TRIM);
    for (const [lx, lz, w, d] of [[NX.X1 - 0.12, cz, 0.25, NX.Z1 - NX.Z0], [NX.X0 + 0.12, cz, 0.25, NX.Z1 - NX.Z0],
      [(NX.X0 + NX.X1) / 2, NX.Z0 + 0.12, NX.X1 - NX.X0, 0.25], [(NX.X0 + NX.X1) / 2, NX.Z1 - 0.12, NX.X1 - NX.X0, 0.25]]) {
      box(lx, yN + H + 0.25, lz, w, 0.8, d, C.CREAM);
    }
    box((HALL.lx0 + HALL.lx1) / 2, NF + H1, cz, HALL.lx1 - HALL.lx0 + 0.1, H - 0.45 - H1, HALL.lz1 - HALL.lz0 + 0.1, C.CREAM);
    box((HALL.lx0 + HALL.lx1) / 2, NF + H1 - 0.04, cz, HALL.lx1 - HALL.lx0, 0.04, HALL.lz1 - HALL.lz0, 0xc8b48a);
    // two steps up from the lane
    for (let st = 0; st < 2; st++) {
      const lx = NX.X1 + 0.225 + (1 - st) * 0.45, top = yN + 0.225 * (st + 1);
      box(lx, yN - 0.1, 15.0, 0.45, top - yN + 0.1, 3.0, st ? 0xcbbfa8 : 0xc2b59c);
      solid(lx, 15.0, 0.45, 3.0, 0, { top, tag: 'mm-new-steps', standOnly: true });
    }
    // the sanctum behind its arched screen, gilt; the altar in it
    for (const [za, zb] of [[HALL.lz0, 12.2], [17.8, HALL.lz1]]) {
      box(SCR, NF, (za + zb) / 2, 0.4, H1, zb - za, C.CREAM);
      solid(SCR, (za + zb) / 2, 0.4, zb - za, 0, { top: NF + H1 });
    }
    box(SCR, NF + 3.7, 15.0, 0.4, H1 - 3.7, 5.6, C.CREAM);
    {
      const q = p(SCR + 0.22, 15.0);
      cuspedArch(b, q[0], NF, q[1], 5.4, 3.7, 0.18, rot + Math.PI / 2, C.GOLD, 7, null);
    }
    box(HALL.lx0 + 0.05, NF + 0.9, 15.0, 0.06, 2.9, 5.2, 0x8a1f1a);              // the cloth behind Them
    box(ALT.lx, NF, ALT.lz, 1.3, 0.9, 4.4, C.MARBLE);
    box(ALT.lx + 0.75, NF, ALT.lz, 0.4, 0.45, 4.4, tint(C.MARBLE, 0.92));
    solid(ALT.lx, ALT.lz, 1.6, 4.4, 0, { top: NF + 0.9 });
    const A = p(ALT.lx, ALT.lz);
    // facing +lx, north, onto the hall: Radha on His left
    buildDeities(b, { ...loc, rot: rot + Math.PI / 2 }, NF + 0.9 - 1.15, A);
  }

  return {
    altar: { lx: ALT.lx, lz: ALT.lz, y: NF + 1.9 },
    darshan: { lx: -38.6, lz: 15.0 },
    hall: { ...HALL, door: [NX.X1 + 1.4, 15.0] },
    FL: NF,
    rooms,
    yG, COURT,
  };
}
