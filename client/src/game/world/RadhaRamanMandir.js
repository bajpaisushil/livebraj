/**
 * SHRI RADHA RAMAN MANDIR, at the back of Radharaman Ghera.
 *
 * Built from docs/research/radha-raman.md: the survey and its independent
 * checker, where the checker overrules the survey. What stood here was the
 * shared haveli with a ghera drawn round it on a guess.
 *
 * WHERE: OpenStreetMap way 335527344 (ODbL), "Sri Radha Raman Mandir",
 * placed on the checker's true area centroid, 27.585379 / 77.698725 — the
 * survey's point was the middle of the west wall, 7.4 m off. Every outline
 * here is that way's: 14.7 x 15.3 m, cardinal to 0.2 degrees, its south edge
 * split by a node into 5.71 m (west, BLANK) and 8.93 m (east, the carved
 * frontispiece). The spur lane OSM maps off the Parikrama Marg (way
 * 335527349) dead-ends 5 m short of the south-west corner: the way in.
 *
 * THE FRAME: rot 0, so +lx is EAST and +lz is SOUTH. The door is on the
 * south ("the simple doorway on the south side of the temple", Case p.81);
 * the deity faces EAST from a platform on the west of the inner court.
 *
 * THE GHERA is the sources' sequence — "a massive doorway with heavy wooden
 * doors", a courtyard lined with Goswami houses, a second massive gateway, a
 * second courtyard, and only then the temple (Case pp.78-81) — laid on the
 * OSM spur: the outer gate on the Parikrama Marg's kerb, a narrow first court
 * between houses, the second gate at the temple's south-west corner, and the
 * second court before the whole south wall, which is where every photograph
 * of the facade is taken from. Its plan is INFERRED; no source gives one.
 *
 * HEIGHTS are the survey's photogrammetry (+-10-15 per cent, worse above the
 * chhajja; the checker would write them as ranges): door 2.0 m, the great
 * arch 4.1 m, chhajja 5.8-6.0 m, gallery arches 8.0 m, cornice 8.4 m, the
 * gable 9.3 m, finials 10.0-10.5 m, all over the plinth. Nothing taller.
 */

import { campusSign } from './Signage.js';

/** Colours. MEASURED where the survey sampled a photograph (its midpoints). */
const C = {
  STONE: 0xa98a6b,      // carved sandstone, sunlit
  SHADE: 0x7e6350,      // the same under the chhajja
  GALLERY: 0xb8a794,    // the upper gallery, washed cleaner and greyer
  GRIME: 0x6c4230,      // grime pooled in the carving
  SOOT: 0x6e6a67,       // the streaks down the blank west wall
  WEST: 0xc9b392,       // the blank wall where it is clean
  NEIGH: 0xc3b4a2,      // the modern Goswami house to the east: paler, greyer, cleaner
  MW: 0xd8d6d2, MB: 0x3a3836,         // the marble chequer
  DOME: 0xe8dec9,       // the saucer domes (INFERRED: every sample clipped)
  GILT: 0xc9a227,       // the finials (a conventional brass, not a measurement)
  PINK: 0xe08aa6, GREEN: 0x5c9e6a,    // the inner porticos, "bright pink and green" (Case; hexes INFERRED)
  SILVER: 0xd8dade, WOOD: 0x4a3020, IRON: 0x2a2826, DARK: 0x1f1712,
  HOUSE: 0xd9cbb2, HOUSE2: 0xcdbf9f, HOUSE3: 0xe0d5c0, FLAG: 0xb59c80,
  TIN: 0x9aa0a2, TIN_DK: 0x7c8284,
  BANNER: 0xb3221c, NOTICE: 0xe8c22a,
};

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * @param o.b, o.signB, o.loc, o.ground, o.terrain, o.colliders
 * @param o.h  helpers: cuspedArch, tint, buildDeities, signUV
 */
export function buildRadhaRamanMandir(o) {
  const { b, signB, loc, ground, terrain, colliders } = o;
  const { cuspedArch, tint, buildDeities } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  // local facing angles: toward +lx (east) 0, +lz (south) PI/2
  const F = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
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
  const lq2 = (A, B, Cq, D, col) => { lq(A, B, Cq, D, col); lq(D, Cq, B, A, col); };
  /** An arch drawn on the face of a wall: `along` 'x' for a wall running east-west. */
  const arch = (lx, y0, lz, w, h, along, color, lobes, shade, depth = 0.12) => {
    const q = p(lx, lz);
    cuspedArch(b, q[0], y0, q[1], w, h, depth, along === 'x' ? rot : rot + Math.PI / 2, color, lobes, shade);
  };
  /*
   * Winding: a quad run lo-hi-hi-lo from A to B faces up x (B - A). So a
   * south face (+lz) runs toward -lx, a west face (-lx) toward -lz.
   */
  /** A panel lying on a south face (+lz), centred at lx, y. */
  const southPanel = (lx, y, lz, w, h, color) => lq([lx + w / 2, y - h / 2, lz], [lx + w / 2, y + h / 2, lz], [lx - w / 2, y + h / 2, lz], [lx - w / 2, y - h / 2, lz], color);
  /** The same on a west face (-lx). */
  const westPanel = (lx, y, lz, w, h, color) => lq([lx, y - h / 2, lz + w / 2], [lx, y + h / 2, lz + w / 2], [lx, y + h / 2, lz - w / 2], [lx, y - h / 2, lz - w / 2], color);
  /** An iron rail from A to B, h high on y. */
  const rail = (ax, az, bx, bz, y, h) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.2)), ang = Math.atan2(bz - az, bx - ax);
    for (let i = 0; i <= n; i++) box(ax + (bx - ax) * i / n, y, az + (bz - az) * i / n, 0.05, h, 0.05, 0x8a8f92);
    box((ax + bx) / 2, y + h, (az + bz) / 2, L, 0.05, 0.05, 0x8a8f92, ang);
  };

  /* ================================================================
   * LEVELS AND THE BLOCK
   * ================================================================ */
  const X0 = -7.4, X1 = 7.3, Z0 = -7.7, Z1 = 7.6;      // OSM way 335527344
  const SPLIT = -1.6;                                   // the node on the south edge
  const yC = topOf(-7.5, 10.4, 7.6, 16.4, 3);           // the second court
  const PLN = yC + 0.6;                                 // the plinth, four steps up
  const ICF = PLN + 0.6;                                // the inner court: "a small flight of four steps"
  const T = 0.8;                                        // outer walls
  const TOPW = PLN + 8.3, TOPF = PLN + 8.4;             // west wall cornice; gallery cornice
  const DOOR = { lx0: 2.3, lx1: 3.4, h: 2.0 };          // ~1.1 x 1.9-2.0 m
  const FC = (SPLIT + X1) / 2;                          // the frontispiece's centre line, 2.85

  // the plinth under the whole block
  box((X0 + X1) / 2, yC - 0.2, (Z0 + Z1) / 2, X1 - X0 + 0.3, PLN - yC + 0.2, Z1 - Z0 + 0.3, tint(C.STONE, 0.86));
  box((X0 + X1) / 2, PLN - 0.04, Z1 + 0.08, X1 - X0 + 0.4, 0.12, 0.25, tint(C.STONE, 1.05));

  /* ---- the outer walls: west, north, east; the south is the facade ---- */
  const wallUp = (lx, lz, w, d, y0, y1, col) => {
    box(lx, y0, lz, w, y1 - y0, d, col);
    solid(lx, lz, w, d, { top: y1 });
  };
  wallUp(X0 + T / 2, (Z0 + Z1) / 2, T, Z1 - Z0, yC - 0.2, TOPW, C.WEST);
  wallUp((X0 + X1) / 2, Z0 + T / 2, X1 - X0, T, yC - 0.2, TOPF, tint(C.WEST, 0.9));
  wallUp(X1 - T / 2, (Z0 + Z1) / 2, T, Z1 - Z0, yC - 0.2, TOPF, tint(C.WEST, 0.94));
  // the west wall's soot: streaks from the parapet down, the dominant signal
  for (let i = 0; i < 26; i++) {
    const lz = Z0 + 0.4 + (Z1 - Z0 - 0.8) * hash(i * 1.7), len = 1.5 + 5.5 * hash(i * 3.1), w = 0.25 + 0.7 * hash(i * 5.3);
    westPanel(X0 - 0.01, TOPW - 0.4 - len / 2, lz, w, len, tint(C.SOOT, 0.9 + 0.2 * hash(i)));
  }

  /* ---- the south wall: the blank west part ---- */
  {
    const cx = (X0 + SPLIT) / 2, w = SPLIT - X0;
    wallUp(cx, Z1 - T / 2, w, T, yC - 0.2, TOPW, C.WEST);
    // the carved two-band cornice the checker found: a string course, a frieze
    // of blind cusped arcading, a row of small pointed dentils, merlons
    box(cx, PLN + 7.2, Z1 + 0.06, w, 0.16, 0.14, tint(C.STONE, 1.05));
    for (let i = 0; i < 9; i++) {
      const lx = X0 + 0.35 + i * (w - 0.7) / 8;
      arch(lx, PLN + 7.38, Z1 + 0.03, 0.5, 0.6, 'x', tint(C.STONE, 1.08), 3, tint(C.GRIME, 1.15), 0.05);
    }
    for (let i = 0; i < 18; i++) southPanel(X0 + 0.2 + i * (w - 0.4) / 17, PLN + 8.12, Z1 + 0.02, 0.12, 0.22, tint(C.GRIME, 1.2));
    for (let i = 0; i < 9; i++) box(X0 + 0.32 + i * (w - 0.64) / 8, TOPW, Z1 - 0.2, 0.26, 0.42, 0.26, tint(C.WEST, 0.95));
    // soot down it, from the cornice
    for (let i = 0; i < 16; i++) {
      const lx = X0 + 0.3 + (w - 0.6) * hash(i * 2.3 + 9), len = 1.2 + 5.0 * hash(i * 4.7 + 1);
      southPanel(lx, PLN + 7.1 - len / 2, Z1 + 0.012, 0.2 + 0.5 * hash(i * 6.1), len, tint(C.SOOT, 0.88 + 0.2 * hash(i + 3)));
    }
    // what hangs on it in 2023: the red vinyl banner, and a yellow notice
    southPanel(-4.6, PLN + 2.6, Z1 + 0.04, 3.2, 2.4, C.BANNER);
    southPanel(-4.6, PLN + 2.1, Z1 + 0.05, 2.4, 0.5, 0xf2e6d2);
    southPanel(-2.3, PLN + 2.0, Z1 + 0.04, 0.8, 0.55, C.NOTICE);
  }

  /* ---- the frontispiece: the east 8.93 m ---- */
  /*
   * "A SOLID, almost fortified base with one small door, carrying a LIGHT,
   * PIERCED, OPEN gallery, capped by a curved gable." The ground storey is
   * ~4 per cent open: the door, and two blind niches that are alcoves.
   */
  const ZF = Z1;                                   // the face
  {
    // the ground storey's wall, the door cut through it
    for (const [a, c] of [[SPLIT, DOOR.lx0], [DOOR.lx1, X1]]) wallUp((a + c) / 2, ZF - T / 2, c - a, T, yC - 0.2, PLN + 5.8, C.STONE);
    box(FC, PLN + DOOR.h, ZF - T / 2, DOOR.lx1 - DOOR.lx0, 5.8 - DOOR.h, T, C.STONE);
    // the centre bay: one great multi-cusped arch, its tympanum the painted board
    arch(FC, PLN, ZF + 0.05, 3.3, 4.1, 'x', tint(C.STONE, 1.1), 9, tint(C.SHADE, 0.92), 0.2);
    sign('rr-board', FC, PLN + 3.25, ZF + 0.16, 2.3, 0.7, F.S);
    // the doorway: carved jambs, a niche over the lintel, the studded door open
    southPanel(FC, PLN + DOOR.h / 2, ZF + 0.18, DOOR.lx1 - DOOR.lx0, DOOR.h, C.DARK);
    for (const s of [-1, 1]) {
      box(FC + s * 0.68, PLN, ZF + 0.12, 0.22, DOOR.h + 0.15, 0.14, tint(C.STONE, 1.12));
      // the two small standing figures holding lotus buds, either side (Case p.81)
      box(FC + s * 1.05, PLN + 1.15, ZF + 0.16, 0.18, 0.5, 0.12, tint(C.STONE, 1.15));
      box(FC + s * 1.05, PLN + 1.65, ZF + 0.16, 0.12, 0.14, 0.12, tint(C.STONE, 1.15));
      // the leaves, swung in against the reveal
      box(FC + s * 0.5, PLN, ZF - T + 0.15, 0.1, DOOR.h - 0.05, 0.55, C.WOOD);
    }
    box(FC, PLN + DOOR.h, ZF + 0.12, 1.6, 0.16, 0.14, tint(C.STONE, 1.12));
    box(FC, PLN + DOOR.h + 0.2, ZF + 0.08, 0.4, 0.5, 0.1, tint(C.GRIME, 1.1));      // the niche over the lintel
    box(FC, PLN + DOOR.h + 0.28, ZF + 0.12, 0.16, 0.3, 0.06, C.GILT);
    // the two outer bays: a tall blind niche on a carved dado, a small panel over it
    for (const bx of [-0.275, 5.975]) {
      box(bx, PLN, ZF + 0.08, 1.7, 0.7, 0.16, tint(C.STONE, 1.06));
      for (const k of [-0.45, 0.45]) southPanel(bx + k, PLN + 0.35, ZF + 0.17, 0.36, 0.36, tint(C.GRIME, 1.2));
      arch(bx, PLN + 0.7, ZF + 0.05, 1.3, 2.6, 'x', tint(C.STONE, 1.08), 7, tint(C.SHADE, 0.85), 0.16);
      arch(bx, PLN + 3.65, ZF + 0.04, 0.9, 1.2, 'x', tint(C.STONE, 1.06), 5, tint(C.SHADE, 0.95), 0.1);
    }
    // the CCTV camera and the horn on brackets bolted to the carving (2023)
    box(4.75, PLN + 4.75, ZF + 0.25, 0.16, 0.12, 0.3, 0xe8e8e4);
    box(1.0, PLN + 4.9, ZF + 0.2, 0.22, 0.22, 0.36, 0x9a9e9a);
    // the chhajja: a deep eave on nine S-scrolled consoles
    box(FC, PLN + 5.8, ZF + 0.42, X1 - SPLIT + 0.2, 0.2, 0.95, tint(C.STONE, 1.02));
    box(FC, PLN + 5.74, ZF + 0.88, X1 - SPLIT + 0.2, 0.08, 0.08, tint(C.SHADE, 0.9));
    for (let i = 0; i < 9; i++) {
      const q = p(SPLIT + 0.4 + i * (X1 - SPLIT - 0.8) / 8, ZF + 0.25);
      b.prism(q[0], PLN + 5.05, q[1], 0.22, 0.14, 0.24, 0.5, 0.75, tint(C.STONE, 0.95), rot);
    }
  }

  /* ---- the gallery: five cusped arches, 1 + 3 + 1, the middle three under the gable ---- */
  const GF = PLN + 6.0;                            // the gallery floor
  const BAY0 = 0.35, BAY1 = 5.35;                  // the projecting centre bay, ~5.0 m
  {
    // the gallery's back wall, seen dark through the arches
    box(FC, GF, ZF - 1.6, X1 - SPLIT, TOPF - GF, 0.4, tint(C.SHADE, 0.7));
    // the screen of the outer bays, set back on the wall's line
    for (const [a, c] of [[SPLIT, BAY0], [BAY1, X1]]) {
      box((a + c) / 2, GF, ZF - 0.12, c - a, TOPF - GF, 0.24, C.GALLERY);
    }
    // the centre bay stands forward 0.5 m on the chhajja
    box((BAY0 + BAY1) / 2, GF, ZF + 0.38, BAY1 - BAY0, TOPF - GF, 0.24, C.GALLERY);
    for (const s of [BAY0, BAY1]) box(s, GF, ZF + 0.13, 0.24, TOPF - GF, 0.74, C.GALLERY);
    const ARCHES = [[-0.675, ZF + 0.01], [1.25, ZF + 0.51], [2.85, ZF + 0.51], [4.45, ZF + 0.51], [6.325, ZF + 0.01]];
    for (const [ax, az] of ARCHES) {
      // the arch: some nine lobes with pendant cusps; the gallery behind it dark
      arch(ax, GF, az, 1.15, 2.0, 'x', tint(C.GALLERY, 1.08), 9, tint(C.SHADE, 0.45), 0.1);
      // the jali in its lower 0.87 m, a pierced lattice
      southPanel(ax, GF + 0.44, az + 0.07, 1.1, 0.86, tint(C.GALLERY, 1.02));
      for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 6; c2++) {
        southPanel(ax - 0.44 + c2 * 0.176, GF + 0.14 + r * 0.2, az + 0.08, 0.09, 0.1, tint(C.SHADE, 0.55));
      }
    }
    // slender turned colonnettes between the centre three
    for (const cx of [2.05, 3.65]) box(cx, GF, ZF + 0.56, 0.15, 2.0, 0.15, tint(C.GALLERY, 1.12));
    // the flat cornice over the two outer bays
    for (const [a, c] of [[SPLIT - 0.1, BAY0], [BAY1, X1 + 0.1]]) {
      box((a + c) / 2, TOPF - 0.1, ZF + 0.12, c - a, 0.22, 0.5, tint(C.GALLERY, 0.94));
      box((a + c) / 2, TOPF + 0.12, ZF - 0.05, c - a, 0.35, 0.3, C.GALLERY);
    }
  }

  /* ---- the curved gable: the ONE non-cusped curve on the building ---- */
  /*
   * "A large, flattened, CURVED SANDSTONE GABLE (a bangaldar / chala-derived
   * arched hood) over the central bay ... Its apex sits ~9.3 m above the
   * temple plinth ... The curve spans ~5.0 m, rises ~1.3 m ... and its ends
   * turn DOWN past the springing." A moulded bead-and-dentil archivolt; a
   * tympanum of about twelve small blind cusped niches following the curve.
   */
  {
    const SPAN = BAY1 - BAY0 + 0.4, MID = (BAY0 + BAY1) / 2, ZFR = ZF + 0.62, ZBK = ZF - 1.9;
    const N = 18;
    const top = (u) => PLN + 7.85 + 1.45 * Math.pow(Math.max(0, Math.cos(u * Math.PI / 2)), 0.75);
    const xs = (i) => MID - SPAN / 2 + SPAN * i / N, us = (i) => -1 + 2 * i / N;
    for (let i = 0; i < N; i++) {
      const xa = xs(i), xb = xs(i + 1), ya = top(us(i)), yb = top(us(i + 1));
      // the roof of it, front to back
      lq([xa, ya, ZBK], [xa, ya, ZFR], [xb, yb, ZFR], [xb, yb, ZBK], tint(C.GALLERY, 0.96));
      // the archivolt: a deep moulded edge on the front, in two bands
      lq([xb, yb - 0.42, ZFR], [xb, yb - 0.18, ZFR], [xa, ya - 0.18, ZFR], [xa, ya - 0.42, ZFR], tint(C.GALLERY, 0.86));
      lq([xb, yb - 0.18, ZFR + 0.05], [xb, yb, ZFR + 0.05], [xa, ya, ZFR + 0.05], [xa, ya - 0.18, ZFR + 0.05], tint(C.GALLERY, 1.1));
      // its underside over the drooping ends
      lq([xa, ya - 0.42, ZFR], [xa, ya - 0.42, ZBK], [xb, yb - 0.42, ZBK], [xb, yb - 0.42, ZFR], tint(C.SHADE, 0.8));
      // the tympanum under the curve, down to the cornice of the arcade
      const yl = TOPF - 0.05;
      if (ya - 0.42 > yl && yb - 0.42 > yl) {
        lq([xb, yl, ZF + 0.5], [xb, yb - 0.42, ZF + 0.5], [xa, ya - 0.42, ZF + 0.5], [xa, yl, ZF + 0.5], C.GALLERY);
      }
    }
    // its two ends
    for (const i of [0, N]) {
      const xe = xs(i), ye = top(us(i));
      if (i === N) lq([xe, ye - 0.42, ZBK], [xe, ye, ZBK], [xe, ye, ZFR], [xe, ye - 0.42, ZFR], tint(C.GALLERY, 0.9));
      else lq([xe, ye - 0.42, ZFR], [xe, ye, ZFR], [xe, ye, ZBK], [xe, ye - 0.42, ZBK], tint(C.GALLERY, 0.9));
    }
    // the small blind niches following the curve
    for (let i = 0; i < 12; i++) {
      const u = -0.62 + 1.24 * i / 11, lx = MID + u * SPAN / 2;
      const yb = Math.max(TOPF + 0.08, top(u) - 0.85);
      arch(lx, yb, ZF + 0.53, 0.26, 0.36, 'x', tint(C.GALLERY, 1.05), 3, tint(C.SHADE, 0.62), 0.04);
    }
    // the block behind it, as tall as the gable, to the court
    box(MID, TOPF, (ZBK + ZF - 1.6) / 2, SPAN - 0.4, 0.9, ZF - 1.6 - ZBK + 0.1, tint(C.GALLERY, 0.9));
  }

  /* ---- the roof: low saucer domes, gilt finials, the flagstaff ---- */
  /*
   * "LOW, WIDE, PALE-CREAM SAUCER DOMES with a scalloped / lotus-petal
   * (gadrooned) skirt" behind the gable — and the checker: one reads level
   * with the gable's apex, and the four finials stand above it.
   */
  const lathe = (cx, cz, rings, segs, color) => {
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0, f0 = 0] = rings[i - 1], [y1, r1, f1 = 0] = rings[i];
      for (let s = 0; s < segs; s++) {
        const a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2;
        const g = (a, r, f) => r * (1 - f * (0.5 - 0.5 * Math.cos(a * 16)));
        lq([cx + Math.cos(a0) * g(a0, r0, f0), y0, cz + Math.sin(a0) * g(a0, r0, f0)],
          [cx + Math.cos(a0) * g(a0, r1, f1), y1, cz + Math.sin(a0) * g(a0, r1, f1)],
          [cx + Math.cos(a1) * g(a1, r1, f1), y1, cz + Math.sin(a1) * g(a1, r1, f1)],
          [cx + Math.cos(a1) * g(a1, r0, f0), y0, cz + Math.sin(a1) * g(a1, r0, f0)],
          typeof color === 'function' ? color(i, s) : color);
      }
    }
  };
  const kalash = (lx, lz, y0, tip) => {
    box(lx, y0, lz, 0.06, tip - y0 - 0.55, 0.06, C.GILT);
    const yk = tip - 0.55;
    lathe(lx, lz, [[yk, 0.06], [yk + 0.12, 0.17], [yk + 0.26, 0.2], [yk + 0.36, 0.12], [yk + 0.42, 0.07], [yk + 0.5, 0.05], [tip, 0]], 10, C.GILT);
  };
  // wider than tall, the crown level with the gable's apex (9.3 m), not above it
  const ROOF = TOPF + 0.1;
  for (const [dx, dz] of [[-0.9, 4.9], [6.3, 4.9]]) {
    box(dx, TOPF, dz, 2.6, ROOF - TOPF + 0.12, 2.6, tint(C.DOME, 0.92));
    lathe(dx, dz, [[ROOF + 0.12, 1.45, 0.16], [ROOF + 0.26, 1.42, 0.16], [ROOF + 0.44, 1.28, 0.1], [ROOF + 0.62, 1.0, 0.05], [ROOF + 0.76, 0.6], [ROOF + 0.84, 0.25], [ROOF + 0.86, 0]], 32,
      (i, s) => tint(C.DOME, s % 2 ? 0.95 : 1.02));
    kalash(dx, dz, ROOF + 0.84, PLN + 10.2);
  }
  kalash(1.6, 4.6, TOPF, PLN + 10.0);
  kalash(4.1, 4.6, TOPF, PLN + 10.0);
  // the flagstaff at the west end, a dark pennant
  box(X0 + 0.6, TOPW, Z1 - 0.8, 0.07, PLN + 10.5 - TOPW, 0.07, 0x5a4a3a);
  lq([X0 + 0.64, PLN + 10.45, Z1 - 0.8], [X0 + 0.64, PLN + 10.45, Z1 - 0.8], [X0 + 1.5, PLN + 10.2, Z1 - 0.8], [X0 + 0.64, PLN + 9.9, Z1 - 0.8], 0x4a5a4c);
  lq([X0 + 0.64, PLN + 9.9, Z1 - 0.8], [X0 + 1.5, PLN + 10.2, Z1 - 0.8], [X0 + 0.64, PLN + 10.45, Z1 - 0.8], [X0 + 0.64, PLN + 10.45, Z1 - 0.8], 0x4a5a4c);

  /* ================================================================
   * INSIDE — the vestibule, the court, the porticos, the antechamber
   * ================================================================ */
  /*
   * "Just inside is a small vestibule ... and to the right a small flight of
   * four steps leads to the interior of the temple." The court, "approximately
   * 35 ft square", under "a sliding tin roof"; "three porticos, one on each of
   * the other three sides, three arches each"; on the west, the antechamber
   * platform "about 4.5 ft high", three cusped arches of unpainted sandstone
   * and the embossed silver double door, and the sanctum behind (Case pp.81-82).
   * Case's 35 ft does not fit the OSM envelope with porticos round it; the
   * survey says trust the envelope, so the open court is 6.3 x 9.1 m and the
   * paved floor with its porticos 9.5 x 12.35 m.
   */
  const CX0 = -1.4, CX1 = 4.9, CZ0 = -5.3, CZ1 = 3.8;      // the open court
  const PX0 = -3.0, PX1 = X1 - T, PZ0 = Z0 + T, PZ1 = 4.95; // the paved floor and its porticos, to the top step
  const PLAT = ICF + 1.37;                                   // the antechamber platform
  const SAN = { lx0: X0 + T, lx1: -4.8, lz0: -1.6, lz1: 1.6 };
  const ALT = { lx: -5.9, lz: 0 };
  {
    // the vestibule and the four steps up into the court
    box(FC, PLN - 0.05, 6.4, 1.6, 0.05, 2.4, tint(C.MW, 0.92));
    solid(FC, ZF - T / 2, DOOR.lx1 - DOOR.lx0, T, { top: PLN, tag: 'temple-floor', floor: true });
    solid(FC, 6.55, 1.6, 0.5, { top: PLN, tag: 'temple-floor', floor: true });
    for (let st = 0; st < 3; st++) {
      const z1 = 6.3 - st * 0.45, top = PLN + 0.15 * (st + 1);
      box(FC, PLN - 0.05, z1 - 0.225, 1.6, top - PLN + 0.05, 0.45, st % 2 ? C.MW : tint(C.MW, 0.9));
      solid(FC, z1 - 0.225, 1.6, 0.45, { top, tag: 'rr-inner-steps', standOnly: true });
    }
    // the vestibule's side walls, inside the south range
    for (const s of [-1, 1]) {
      box(FC + s * 0.95, PLN, (PZ1 + ZF - T) / 2, 0.3, 5.8, ZF - T - PZ1, tint(C.WEST, 0.85));
      solid(FC + s * 0.95, (PZ1 + ZF - T) / 2, 0.3, ZF - T - PZ1, { top: PLN + 5.8 });
    }
    // the rest of the south range is solid: rooms nobody is shown
    for (const [a, c] of [[X0 + T, FC - 1.1], [FC + 1.1, X1 - T]]) {
      box((a + c) / 2, yC - 0.2, (PZ1 + ZF - T) / 2, c - a, PLN + 5.8 - yC + 0.2, ZF - T - PZ1, tint(C.WEST, 0.82));
      solid((a + c) / 2, (PZ1 + ZF - T) / 2, c - a, ZF - T - PZ1, { top: PLN + 5.8 });
    }
    // the court floor: black and white marble, a chequer with a zigzag border
    box((PX0 + PX1) / 2, PLN - 0.05, (PZ0 + PZ1) / 2, PX1 - PX0, ICF - PLN + 0.03, PZ1 - PZ0, tint(C.MW, 0.85));
    solid((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, PX1 - PX0, PZ1 - PZ0, { top: ICF, tag: 'temple-floor', floor: true });
    const S = 0.6;
    for (let i = 0; PX0 + i * S < PX1 - 1e-3; i++) {
      for (let j = 0; PZ0 + j * S < PZ1 - 1e-3; j++) {
        const a = PX0 + i * S, c = Math.min(PX1, a + S), d0 = PZ0 + j * S, d1 = Math.min(PZ1, d0 + S);
        const edge = a < CX0 - 0.01 || c > CX1 + 0.01 || d0 < CZ0 - 0.01 || d1 > CZ1 + 0.01;
        const col = edge ? (((i + j) % 4 < 2) ? C.MB : C.MW) : (((i + j) & 1) ? C.MB : C.MW);
        lq([a, ICF + 0.002, d0], [a, ICF + 0.002, d1], [c, ICF + 0.002, d1], [c, ICF + 0.002, d0], col);
      }
    }
    // three porticos, three arches each, painted pink and green
    const portico = (horiz, fixed, from, to, outward) => {
      const n = 3, span = (to - from) / n;
      for (let k = 0; k <= n; k++) {
        const u = from + k * span;
        const [lx, lz] = horiz ? [u, fixed] : [fixed, u];
        box(lx, ICF, lz, 0.42, 3.3, 0.42, C.PINK);
        post(lx, lz, 0.26, { top: ICF + 3.3 });
      }
      for (let k = 0; k < n; k++) {
        const u = from + (k + 0.5) * span;
        const [lx, lz] = horiz ? [u, fixed] : [fixed, u];
        arch(lx, ICF + 0.6, lz, span - 0.42, 2.7, horiz ? 'x' : 'z', C.GREEN, 7, null, 0.14);
      }
      // the beam and the wall of the upper storey over it
      const [cx, cz] = horiz ? [(from + to) / 2, fixed] : [fixed, (from + to) / 2];
      const [w, d] = horiz ? [to - from + 0.42, 0.42] : [0.42, to - from + 0.42];
      box(cx, ICF + 3.3, cz, w, 0.45, d, C.PINK);
    };
    portico(true, CZ0, CX0, CX1, -1);             // north
    portico(false, CX1, CZ0, CZ1, 1);             // east
    portico(true, CZ1, CX0, CX1, 1);              // south
    for (const [cx, cz, w, d] of [[(CX0 + PX1) / 2, (PZ0 + CZ0) / 2, PX1 - CX0, CZ0 - PZ0], [(CX1 + PX1) / 2, (CZ0 + CZ1) / 2, PX1 - CX1, CZ1 - CZ0],
      [(CX0 + PX1) / 2, (CZ1 + PZ1) / 2, PX1 - CX0, PZ1 - CZ1]]) {
      box(cx, ICF + 3.72, cz, w, 0.05, d, tint(C.PINK, 0.8));
    }
    // and the upper storey all round the court, solid to the roof; on the
    // south it stops at the gallery's back wall, and the gallery has a floor
    const UP = ICF + 3.75;
    box((X0 + X1) / 2, UP, (PZ0 + CZ0) / 2, X1 - X0 - 2 * T, TOPF - UP, CZ0 - PZ0, tint(C.WEST, 0.9));
    box((CX1 + PX1) / 2, UP, (CZ0 + CZ1) / 2, PX1 - CX1, TOPF - UP, CZ1 - CZ0, tint(C.WEST, 0.92));
    box((X0 + X1) / 2, UP, (CZ1 + ZF - 1.8) / 2, X1 - X0 - 2 * T, TOPF - UP, ZF - 1.8 - CZ1, tint(C.WEST, 0.9));
    box(FC, PLN + 5.8, (ZF - 1.8 + ZF - T) / 2, X1 - SPLIT - 0.4, 0.2, T + 1.0, tint(C.SHADE, 0.8));
    // behind the blank wall, the range is solid to its cornice
    box((X0 + T + SPLIT) / 2, PLN + 5.8, (ZF - 1.8 + ZF - T) / 2, SPLIT - X0 - T, TOPW - PLN - 5.8, T + 1.0, tint(C.WEST, 0.88));
    // the antechamber: the platform, its three sandstone arches, the silver door
    box(-3.9, ICF - 0.05, 0, 1.8, PLAT - ICF + 0.05, 5.8, tint(C.STONE, 0.9));
    box(-3.9, PLAT - 0.04, 0, 1.8, 0.04, 5.8, C.MW);
    solid(-3.9, 0, 1.8, 5.8, { top: PLAT });
    for (const k of [-1, 0, 1]) arch(-3.02, PLAT, k * 1.9, 1.7, 2.9, 'z', tint(C.STONE, 1.1), 9, null, 0.3);
    for (const k of [-1.5, -0.5, 0.5, 1.5]) box(-3.05, PLAT, k * 1.9, 0.34, 2.9, 0.34, tint(C.STONE, 1.04));
    box(-3.05, PLAT + 2.9, 0, 0.4, 0.5, 6.0, tint(C.STONE, 1.02));
    // the sanctum wall with the silver double door, open; the sanctum dark and small
    for (const [za, zb] of [[-2.9, -0.6], [0.6, 2.9]]) {
      box(SAN.lx1, PLAT, (za + zb) / 2, 0.3, 3.4, zb - za, tint(C.STONE, 0.85));
    }
    box(SAN.lx1, PLAT + 2.1, 0, 0.3, 1.3, 1.2, tint(C.STONE, 0.85));
    for (const s of [-1, 1]) box(SAN.lx1 + 0.35, PLAT, s * 0.85, 0.06, 2.05, 0.55, C.SILVER);
    box((SAN.lx0 + SAN.lx1) / 2, PLAT, 0, SAN.lx1 - SAN.lx0, 0.02, SAN.lz1 - SAN.lz0, tint(C.MB, 1.2));
    box(SAN.lx0 + 0.04, PLAT, 0, 0.06, 2.6, 3.0, 0x8a1f1a);                  // the cloth behind Him
    box(ALT.lx, PLAT, ALT.lz, 0.8, 0.3, 1.4, C.SILVER);                       // the silver throne
    // the rest of the west range, solid either side of the antechamber and the
    // sanctum, and the storey over both
    for (const [za, zb, xa] of [[PZ0, -2.9, PX0], [2.9, PZ1, PX0], [-2.9, -1.6, SAN.lx1], [1.6, 2.9, SAN.lx1]]) {
      box((X0 + T + xa) / 2, ICF - 0.05, (za + zb) / 2, xa - X0 - T, TOPF - ICF + 0.05, zb - za, tint(C.WEST, 0.88));
      solid((X0 + T + xa) / 2, (za + zb) / 2, xa - X0 - T, zb - za, { top: TOPF });
    }
    box((X0 + T + PX0) / 2, PLAT + 3.4, 0, PX0 - X0 - T, TOPF - PLAT - 3.4, 5.8, tint(C.WEST, 0.9));
    // the deity: "not more than twelve inches", self-manifested, facing east;
    // Radha present as a crown on His left
    buildDeities(b, { ...loc, rot: rot + Math.PI / 2 }, PLAT + 0.3 - 1.15, p(ALT.lx, ALT.lz));
    // the sliding tin roof, half drawn over the court, on its rails
    const TR = PLN + 7.9;
    for (const lx of [CX0 - 0.2, CX1 + 0.2]) box(lx, TR - 0.12, (CZ0 + CZ1) / 2, 0.12, 0.12, CZ1 - CZ0 + 0.4, C.IRON);
    for (let i = 0; CZ0 + i * 0.35 < -0.6; i++) {
      const lz = CZ0 + i * 0.35;
      lq([CX0 - 0.3, TR, lz], [CX0 - 0.3, TR, lz + 0.35], [CX1 + 0.3, TR, lz + 0.35], [CX1 + 0.3, TR, lz], i % 2 ? C.TIN : C.TIN_DK);
      lq([CX1 + 0.3, TR - 0.01, lz], [CX1 + 0.3, TR - 0.01, lz + 0.35], [CX0 - 0.3, TR - 0.01, lz + 0.35], [CX0 - 0.3, TR - 0.01, lz], C.TIN_DK);
    }
    // cables slung across the court
    for (const [a, c] of [[[CX0, CZ0 + 1], [CX1, CZ1 - 2]], [[CX0, CZ1 - 0.5], [CX1, CZ0 + 3]]]) {
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      box((a[0] + c[0]) / 2, ICF + 4.4, (a[1] + c[1]) / 2, L, 0.02, 0.02, 0x1a1a1a, Math.atan2(c[1] - a[1], c[0] - a[0]));
    }
  }

  /* ================================================================
   * THE GHERA — two gates, two courts, the houses round them
   * ================================================================ */
  const ROAD_X = -12.1;                            // the Parikrama Marg's kerb
  const K1 = { lx0: ROAD_X + 0.3, lx1: -7.9, lz0: 8.4, lz1: 16.4 };
  const K2 = { lx0: -7.5, lx1: 10.4, lz0: Z1, lz1: 16.4 };
  {
    // the second court: marble in a chequer, as the facade photographs show it
    const S = 0.6;
    for (let i = 0; K2.lx0 + i * S < K2.lx1 - 1e-3; i++) {
      for (let j = 0; Z1 + 0.3 + j * S < K2.lz1 - 1e-3; j++) {
        const a = K2.lx0 + i * S, c = Math.min(K2.lx1, a + S), d0 = Z1 + 0.3 + j * S, d1 = Math.min(K2.lz1, d0 + S);
        lq([a, yC + 0.03, d0], [a, yC + 0.03, d1], [c, yC + 0.03, d1], [c, yC + 0.03, d0], ((i + j) & 1) ? C.MB : C.MW);
      }
    }
    box((K2.lx0 + K2.lx1) / 2, yC - 0.2, (K2.lz0 + K2.lz1) / 2, K2.lx1 - K2.lx0, 0.22, K2.lz1 - K2.lz0, 0xb9b2a6);
    // the first court: plain flags
    box((K1.lx0 + K1.lx1) / 2, yC - 0.2, (K1.lz0 + K1.lz1) / 2, K1.lx1 - K1.lx0, 0.23, K1.lz1 - K1.lz0, C.FLAG);
    // four marble steps up to the door, with steel pipe handrails
    for (let st = 0; st < 4; st++) {
      if (st === 3) continue;                      // the fourth riser is the landing at the door
      const z0 = Z1 + 0.3 + (2 - st) * 0.45, top = yC + 0.15 * (st + 1);
      box(FC, yC - 0.05, z0 + 0.225, 2.6, top - yC + 0.05, 0.45, st % 2 ? C.MW : tint(C.MW, 0.93));
      solid(FC, z0 + 0.225, 2.6, 0.45, { top, tag: 'rr-steps', standOnly: true });
    }
    box(FC, yC - 0.05, Z1 + 0.15, 2.6, PLN - yC + 0.05, 0.3, tint(C.MW, 0.96));
    solid(FC, Z1 + 0.15, 2.6, 0.3, { top: PLN, tag: 'rr-steps', standOnly: true });
    for (const s of [-1, 1]) rail(FC + s * 1.25, Z1 + 1.9, FC + s * 1.25, Z1 + 0.3, yC + 0.15, 0.9);
    // the communal hand-pump in the second court
    box(8.6, yC, 14.6, 0.14, 1.0, 0.14, 0x3c5a3a);
    box(8.6, yC + 0.85, 14.45, 0.08, 0.08, 0.6, 0x3c5a3a);
    box(8.6, yC, 14.6, 0.9, 0.08, 0.9, 0xa49a8a);
    post(8.6, 14.6, 0.25, { top: yC + 1.0 });
  }
  /** A Goswami house: plastered, two to four storeys, a door and windows on its court face. */
  const house = (lx0, lx1, lz0, lz1, H, col, face, k) => {
    const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2;
    const y = topOf(lx0, lx1, lz0, lz1, 2) - 0.1;
    box(cx, y, cz, lx1 - lx0, H, lz1 - lz0, col);
    box(cx, y + H, cz, lx1 - lx0 + 0.15, 0.2, lz1 - lz0 + 0.15, tint(col, 0.86));
    box(cx, y + H + 0.2, cz, lx1 - lx0, 0.7, lz1 - lz0, tint(col, 1.03));
    solid(cx, cz, lx1 - lx0, lz1 - lz0, { top: y + H + 0.9 });
    // the court face: a door below, windows and a chhajja each floor
    const along = face === 'N' || face === 'S';
    const L = along ? lx1 - lx0 : lz1 - lz0;
    const n = Math.max(1, Math.floor(L / 2.4));
    const fz = face === 'N' ? lz0 - 0.03 : face === 'S' ? lz1 + 0.03 : 0, fx = face === 'W' ? lx0 - 0.03 : face === 'E' ? lx1 + 0.03 : 0;
    for (let f = 0; f < Math.floor(H / 3.1); f++) {
      for (let i = 0; i < n; i++) {
        const u = (along ? lx0 : lz0) + (i + 0.5) * L / n;
        const yy = y + 0.2 + f * 3.1;
        const dark = f === 0 && i === Math.floor(n / 2) ? C.WOOD : 0x3a3430;
        const hgt = f === 0 && i === Math.floor(n / 2) ? 2.2 : 1.3;
        const yc = f === 0 && i === Math.floor(n / 2) ? yy + 1.1 : yy + 1.6;
        if (along) {
          if (face === 'N') lq([u - 0.45, yc - hgt / 2, fz], [u - 0.45, yc + hgt / 2, fz], [u + 0.45, yc + hgt / 2, fz], [u + 0.45, yc - hgt / 2, fz], dark);
          else southPanel(u, yc, fz, 0.9, hgt, dark);
        } else if (face === 'W') westPanel(fx, yc, u, 0.9, hgt, dark);
        else lq([fx, yc - hgt / 2, u - 0.45], [fx, yc + hgt / 2, u - 0.45], [fx, yc + hgt / 2, u + 0.45], [fx, yc - hgt / 2, u + 0.45], dark);
      }
      if (f > 0) {
        const yy = y + f * 3.1;
        if (along) box(cx, yy, face === 'N' ? lz0 - 0.3 : lz1 + 0.3, lx1 - lx0, 0.12, 0.6, tint(col, 0.88));
        else box(face === 'W' ? lx0 - 0.3 : lx1 + 0.3, yy, cz, 0.6, 0.12, lz1 - lz0, tint(col, 0.88));
      }
    }
    return y;
  };
  // round the second court: the modern house to the east of the temple,
  // paler and cleaner and taller; houses east and south
  house(X1, 14.5, Z0, Z1, 11.0, C.NEIGH, 'S', 1);
  house(K2.lx1, 14.5, K2.lz0, K2.lz1, 9.4, C.HOUSE, 'W', 2);
  house(-7.9, 14.5, K2.lz1, K2.lz1 + 2.4, 9.4, C.HOUSE2, 'N', 3);
  // round the first court
  house(ROAD_X, -7.9, 1.6, K1.lz0, 9.4, C.HOUSE3, 'S', 4);
  house(ROAD_X, -7.9, K1.lz1, K1.lz1 + 2.4, 9.4, C.HOUSE, 'N', 5);
  // behind the temple: the two small late-16th-century buildings, "very plain",
  // the deity's kitchen, dining room and bedroom, reached by a narrow passage
  house(X0 + 0.4, 0.4, -13.6, Z0 - 0.4, 5.6, 0xd2c3a4, 'S', 6);
  house(1.4, X1 - 0.2, -13.6, Z0 - 0.4, 6.2, 0xcdbd9c, 'S', 7);

  /** A massive gateway with heavy wooden doors, swung open by day, in a wall along lz at lx. */
  const gateway = (lx, lz0, lz1, gz, gw, gh, H, t) => {
    const y = topOf(lx - t, lx + t, lz0, lz1, 2) - 0.1;
    for (const [a, c] of [[lz0, gz - gw / 2], [gz + gw / 2, lz1]]) {
      box(lx, y, (a + c) / 2, t, H, c - a, tint(C.STONE, 0.96));
      solid(lx, (a + c) / 2, t, c - a, { top: y + H });
    }
    box(lx, y + gh, gz, t, H - gh, gw, tint(C.STONE, 0.96));
    box(lx, y + H, (lz0 + lz1) / 2, t + 0.3, 0.25, lz1 - lz0 + 0.3, tint(C.STONE, 0.84));
    for (const s of [-1, 1]) {
      arch(lx + s * (t / 2 + 0.02), y, gz, gw, gh, 'z', tint(C.STONE, 1.1), 7, null, 0.14);
      // the leaves, open against the inner reveal
      box(lx + 0.15 + t / 2 + 0.35, y, gz + s * (gw / 2 - 0.08), 0.7, gh * 0.78, 0.12, C.WOOD);
    }
    return y;
  };
  gateway(ROAD_X, 8.4, K1.lz1, 12.4, 2.3, 4.0, 6.4, 0.7);         // the outer gate, on the Parikrama Marg
  gateway(-7.7, Z1, K1.lz1, 12.4, 2.4, 3.6, 5.2, 0.6);             // the second, into the temple's court

  return {
    altar: { lx: ALT.lx, lz: ALT.lz, y: PLAT + 1.2 },
    darshan: { lx: 0.4, lz: 0 },
    // the court and its porticos, to the vestibule's middle: its edge crosses
    // the 1.6 m vestibule and not the 1.1 m door, which a body barely fills
    hall: { lx0: PX0, lx1: PX1, lz0: PZ0, lz1: 6.0, door: [FC, ZF + 2.4] },
    FL: ICF,
    compound: { lx0: ROAD_X - 0.3, lx1: 14.8, lz0: -14.0, lz1: K2.lz1 + 2.6 },
  };
}
