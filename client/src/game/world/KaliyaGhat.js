/**
 * SHRI KALIYA GHAT — where Krishna climbed the kadamba and leapt into the
 * Yamuna to subdue the serpent Kaliya, and danced on his hoods.
 *
 * WHAT IS THERE TODAY, and it is not a river. Growse (1883) has it as the
 * highest ghat upstream, "the Kali-mardan Ghat with the kadamb tree from
 * which Krishna plunged into the water", below Madan Mohan's cliff. The river
 * has since moved 540 m north (the OSM riverbank and the February 2024
 * imagery agree to 6 m), and the ghat's steps go down to a dry court. Every
 * present-day account says the same three things: the kadamba still stands,
 * hollow and still growing; it is on the Parikrama Marg a few minutes from
 * Madan Mohan; and the river has gone.
 *
 * Built from:
 *   - OSM way 334669919 "Kaliya Ghata" (amenity=place_of_worship,
 *     barrier=fence) — the enclosure, a strip 48 x 13 m along the Parikrama
 *     Marg with a bulge at its south-west end; node 3417299004 "Kadamba tree"
 *     in that bulge; way 334669313 "Old Kaliya Temple", a ROUND building
 *     6.6 m across at the north-east end;
 *   - a photograph of the site (faujitoursandtravels.com): a dry sunken court
 *     in red sandstone, steps down one side, a domed chhatri on four pillars,
 *     a tall carved pillar, a tiered stone lamp tower, the hooded serpent
 *     with Krishna on it, and above the court on its platform the temple —
 *     pink domes, a painted frieze round the drum, a railing, three arched
 *     niches in the platform's face toward the court;
 *   - ESRI z19 imagery, measurement only: the strip, the trees over it, the
 *     pink domes at OSM's round building;
 *   - tirthayatra.org, radhanathswamiyatras.com, ausram.blogspot.com: the
 *     kadamba, hollow and growing; pots and threads tied in it.
 *
 * THE FRAME: origin the game's pin, +lx north-east along the strip (bearing
 * 57), +lz south-east, away from the Parikrama Marg along its north-west side.
 *
 * INFERRED, and said so: the court's size and depth (the photograph shows
 * eight or so steps — 2.2 m — and room for the chhatri, the lamp tower and
 * the serpent); which way the temple's door faces; the second dome's place;
 * the pots' number. NOT BUILT: the Kaliya Mardan temple a hundred metres off,
 * which no source places precisely.
 */

const C = {
  RED: 0xa8604a, RED_LT: 0xbd7a62, RED_DK: 0x8c4c3a,        // the court, its walls, the chhatri: red sandstone
  FLAG: 0xb88a72, FLAG2: 0xa77a63,
  PINK: 0xd99a86, PINK_DK: 0xc07f6b,                          // the temple's domes
  CREAM: 0xf0e6d2, FRIEZE: [0xd94f3a, 0x2f7fc0, 0xe8b23a, 0x3e9a5a, 0xf2efe6],
  RAIL: 0xe8eef2, IRON: 0x2b2a28, DARK: 0x22150f,
  TRUNK: 0x5b4632, TRUNK_DK: 0x3d2f22, LEAF: 0x3f6a2a, LEAF2: 0x4d7a31,
  POT: 0xa0522d, THREAD: 0xc4281c, SAFFRON: 0xf08a24,
  NAGA: 0x3a4a3c, NAGA_LT: 0x56695a, KRISHNA: 0x3a64b8, PITAMBAR: 0xf2c230, SKIN_DK: 0x2c2a4a,
  BOARD: 0x8a2a1c, BOARD_TXT: 0xf2e2b8,
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** The enclosure, OSM way 334669919, in the frame. */
const FENCE = [[-25.7, -9.9], [21.7, -9.9], [30.2, 3.0], [-8.9, 4.5], [-10.3, 11.1], [-19.3, 11.4], [-20.0, 8.4], [-24.9, 7.1]];
/** The court, to the outside of its retaining walls — the location's `basin`. */
export const KALIYA_BASIN = { lx0: -9.5, lx1: 3.4, lz0: -9.0, lz1: 2.0 };

/**
 * @param o.b, o.loc, o.terrain, o.colliders, o.h { cuspedArch, tint, dome }
 * @returns {{altar, darshan, floor, YT, YC}}
 */
export function buildKaliyaGhat(o) {
  const { b, loc, terrain, colliders } = o;
  const { cuspedArch, tint, dome } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : 0; };
  const W = (lx, y, lz) => { const q = p(lx, lz); return [q[0], y, q[1]]; };
  const lq = (A, B, Cq, D, col) => b.quad(W(...A), W(...B), W(...Cq), W(...D), col);
  // seen from above (the winding JaipurMandir measured)
  const flat = (lx0, lx1, lz0, lz1, y, col) => lq([lx0, y, lz0], [lx0, y, lz1], [lx1, y, lz1], [lx1, y, lz0], col);
  const lathe = (cx, cz, rings, segs, color) => {
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0] = rings[i - 1], [y1, r1] = rings[i];
      for (let s = 0; s < segs; s++) {
        const a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2;
        lq([cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1],
          [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0],
          typeof color === 'function' ? color(i, s) : color);
      }
    }
  };
  const inPoly = (lx, lz, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], bb = poly[j];
      if ((a[1] > lz) !== (bb[1] > lz) && lx < (bb[0] - a[0]) * (lz - a[1]) / (bb[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  const inBasin = (lx, lz) => lx > KALIYA_BASIN.lx0 && lx < KALIYA_BASIN.lx1 && lz > KALIYA_BASIN.lz0 && lz < KALIYA_BASIN.lz1;

  /* ================================================================
   * LEVELS
   * ================================================================ */
  let hi = -Infinity;
  for (const [lx, lz] of FENCE) hi = Math.max(hi, tH(lx, lz));
  for (let lx = -24; lx <= 28; lx += 4) for (let lz = -9; lz <= 4; lz += 3) hi = Math.max(hi, tH(lx, lz));
  const YT = hi + 0.1;                    // the enclosure's paving: the street's level
  const YC = YT - 2.2;                    // the court: the old ghat's floor, dry
  const BASE = YC - 0.6;

  /*
   * The ground round the court is the terrain's own: it opened its mesh for
   * the court (the location's `basin`) and laid the rest back exactly.
   */

  // the paving inside the fence, in flags, round the court and the tree's platform
  for (let lx = -26; lx < 31; lx += 1.5) {
    for (let lz = -10.5; lz < 12; lz += 1.5) {
      const mx = lx + 0.75, mz = lz + 0.75;
      if (!inPoly(mx, mz, FENCE) || inBasin(mx, mz)) continue;
      flat(lx + 0.03, lx + 1.47, lz + 0.03, lz + 1.47, YT, tint(hash(lx * 7 + lz) > 0.5 ? C.FLAG : C.FLAG2, 0.92 + 0.12 * hash(lx * 3.1 + lz * 1.7)));
    }
  }

  /* ================================================================
   * THE FENCE
   * ================================================================ */
  /*
   * A low red sandstone wall with an iron railing on it, round the whole
   * strip, as barrier=fence says; the gate from the Parikrama Marg on the
   * north-west side, between the court and the tree, and a second way in at
   * the north-east end.
   */
  const GATES = [[-15.4, -10.8], [26.0, 27.6]];      // lx ranges on the north-west side, and the slanted NE end
  for (let i = 0; i < FENCE.length; i++) {
    const a = FENCE[i], c = FENCE[(i + 1) % FENCE.length];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
    const n = Math.max(1, Math.round(L / 2.0));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const mx = a[0] + (c[0] - a[0]) * (t0 + t1) / 2, mz = a[1] + (c[1] - a[1]) * (t0 + t1) / 2;
      // the gates
      if (i === 0 && mx > GATES[0][0] && mx < GATES[0][1]) continue;
      if (i === 1 && mx > GATES[1][0] && mx < GATES[1][1]) continue;
      const seg = L / n;
      box(mx, YT - 0.3, mz, seg + 0.02, 1.05, 0.45, tint(C.RED, 0.96 + 0.06 * hash(i * 13 + k)), ang);
      box(mx, YT + 0.75, mz, seg + 0.02, 0.06, 0.5, tint(C.RED_LT, 1.0), ang);
      // the railing: a top rail and bars
      box(mx, YT + 1.45, mz, seg, 0.05, 0.05, C.IRON, ang);
      for (let s = 0; s < 4; s++) {
        const t = t0 + (t1 - t0) * (s + 0.5) / 4;
        box(a[0] + (c[0] - a[0]) * t, YT + 0.8, a[1] + (c[1] - a[1]) * t, 0.04, 0.65, 0.04, C.IRON, ang);
      }
      const q = p(mx, mz);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: 0.45, rot: rot + ang });
    }
  }
  // gateposts with a small arch at the marg gate
  for (const lx of GATES[0]) { box(lx, YT - 0.3, -9.9, 0.7, 3.0, 0.7, C.RED_DK); post(lx, -9.9, 0.4); }
  box((GATES[0][0] + GATES[0][1]) / 2, YT + 2.7, -9.9, GATES[0][1] - GATES[0][0] + 0.7, 0.45, 0.8, C.RED_DK);
  cuspedArch(b, ...(() => { const q = p((GATES[0][0] + GATES[0][1]) / 2, -9.9); return [q[0], YT, q[1]]; })(),
    GATES[0][1] - GATES[0][0] - 0.1, 2.7, 0.75, rot, C.RED_LT, 7, null);

  /* ================================================================
   * THE COURT
   * ================================================================ */
  const K = KALIYA_BASIN;
  const WT = 0.6;                                      // the retaining walls
  const fx0 = K.lx0 + WT, fx1 = K.lx1, fz0 = K.lz0 + WT;
  const STEP_N = 8, STEP_D = 0.6;
  const stepTopZ = K.lz1, stepFootZ = K.lz1 - STEP_N * STEP_D;     // the flight down from the south-east
  // the floor, in big red flags
  for (let lx = fx0; lx < fx1 - 0.01; lx += 1.8) {
    for (let lz = fz0; lz < stepFootZ - 0.01; lz += 1.8) {
      flat(lx + 0.03, Math.min(fx1, lx + 1.8) - 0.03, lz + 0.03, Math.min(stepFootZ, lz + 1.8) - 0.03, YC, tint(C.RED, 0.9 + 0.14 * hash(lx * 5 + lz * 3)));
    }
  }
  box((fx0 + fx1) / 2, BASE, (fz0 + stepFootZ) / 2, fx1 - fx0, YC - BASE, stepFootZ - fz0, tint(C.RED_DK, 0.9));
  solid((fx0 + fx1) / 2, (fz0 + stepFootZ) / 2, fx1 - fx0, stepFootZ - fz0, { top: YC, floor: true, standOnly: true, tag: 'kaliya-court' });
  // the walls: the marg side and the south-west end, a parapet above the paving
  box((K.lx0 + K.lx1) / 2, BASE, K.lz0 + WT / 2, K.lx1 - K.lx0, YT + 0.8 - BASE, WT, tint(C.RED, 0.95));
  solid((K.lx0 + K.lx1) / 2, K.lz0 + WT / 2, K.lx1 - K.lx0, WT);
  box(K.lx0 + WT / 2, BASE, (K.lz0 + K.lz1) / 2, WT, YT + 0.8 - BASE, K.lz1 - K.lz0, tint(C.RED, 0.97));
  solid(K.lx0 + WT / 2, (K.lz0 + K.lz1) / 2, WT, K.lz1 - K.lz0);
  // the planters on the marg-side wall, as the photograph has them
  for (let lx = K.lx0 + 1.2; lx < K.lx1 - 1; lx += 2.4) {
    box(lx, YT + 0.8, K.lz0 + WT / 2, 2.0, 0.35, 0.5, C.RED_DK);
    box(lx, YT + 1.15, K.lz0 + WT / 2, 1.8, 0.35, 0.45, tint(C.LEAF2, 0.95 + 0.1 * hash(lx)));
  }
  // the steps down into the court from the south-east, the ghat's own flight
  const stepRise = (YT - YC) / STEP_N;
  for (let k = 0; k < STEP_N; k++) {
    const top = YT - stepRise * (k + 1);
    const lz1 = stepTopZ - STEP_D * k, lz0 = lz1 - STEP_D;
    box((fx0 + fx1) / 2, BASE, (lz0 + lz1) / 2, fx1 - fx0, top - BASE, STEP_D, tint(C.RED_LT, 0.92 + 0.06 * (k % 2)));
    solid((fx0 + fx1) / 2, (lz0 + lz1) / 2, fx1 - fx0, STEP_D, { top, tag: 'ghat-step', standOnly: true });
  }

  // the chhatri: four pillars on a plinth, a dome
  {
    const cx = -6.2, cz = -6.4, YP = YC + 0.45;
    box(cx, YC, cz, 3.4, 0.45, 3.4, C.RED_DK);
    solid(cx, cz, 3.4, 3.4, { top: YP });
    for (const [ox, oz] of [[-1.25, -1.25], [1.25, -1.25], [1.25, 1.25], [-1.25, 1.25]]) {
      box(cx + ox, YP, cz + oz, 0.32, 2.5, 0.32, C.RED_LT);
      box(cx + ox, YP + 2.3, cz + oz, 0.5, 0.2, 0.5, C.RED);
      post(cx + ox, cz + oz, 0.2);
    }
    for (const [ox, oz, w, d] of [[0, -1.25, 2.5, 0.3], [0, 1.25, 2.5, 0.3], [-1.25, 0, 0.3, 2.5], [1.25, 0, 0.3, 2.5]]) {
      const q = p(cx + ox, cz + oz);
      cuspedArch(b, q[0], YP, q[1], (w > d ? w : d) - 0.35, 2.1, 0.12, rot + (w > d ? 0 : Math.PI / 2), C.RED_LT, 5, null);
    }
    box(cx, YP + 2.5, cz, 3.4, 0.28, 3.4, C.RED);
    box(cx, YP + 2.78, cz, 3.0, 0.22, 3.0, C.RED_DK);
    const q = p(cx, cz);
    if (dome) dome(b, q[0], YP + 3.0, q[1], 1.45, 1.35, C.PINK_DK);
    box(cx, YP + 4.35, cz, 0.12, 0.55, 0.12, C.SAFFRON);
  }
  // the tall carved pillar by the wall
  box(-8.0, YC, -2.6, 0.55, 6.4, 0.55, tint(C.RED_LT, 0.95));
  for (let y = YC + 0.9; y < YC + 6.2; y += 1.3) box(-8.0, y, -2.6, 0.7, 0.12, 0.7, C.RED);
  box(-8.0, YC + 6.4, -2.6, 0.8, 0.3, 0.8, C.RED_DK);
  post(-8.0, -2.6, 0.4);
  // the lamp tower: a stone deepstambh, tier on tier
  {
    const lx = -1.6, lz = -5.0;
    lathe(lx, lz, [[YC, 0.55], [YC + 0.5, 0.45], [YC + 0.5, 0.18]], 8, C.RED_DK);
    let y = YC + 0.5;
    for (let t = 0; t < 5; t++) {
      const r = 0.62 - t * 0.09;
      lathe(lx, lz, [[y, 0.16], [y + 0.32, 0.16], [y + 0.32, r], [y + 0.42, r], [y + 0.42, 0.14]], 8, tint(C.RED_LT, 0.95 + 0.05 * (t % 2)));
      y += 0.62;
    }
    lathe(lx, lz, [[y, 0.14], [y + 0.35, 0.2], [y + 0.55, 0.0]], 8, C.RED);
    post(lx, lz, 0.6);
  }
  // the serpent, coiled, five hoods raised, and Krishna dancing on the middle one
  {
    const lx = -3.9, lz = -7.1, Y = YC + 0.3;
    box(lx, YC, lz, 2.4, 0.3, 2.0, C.RED_DK);
    lathe(lx, lz, [[Y, 0.95], [Y + 0.25, 1.0], [Y + 0.42, 0.85], [Y + 0.5, 0.55], [Y + 0.62, 0.0]], 10, C.NAGA);
    for (let h = -2; h <= 2; h++) {
      const hx = lx + h * 0.36, hz = lz + 0.2 - Math.abs(h) * 0.12, hy = Y + 0.9 + (2 - Math.abs(h)) * 0.18;
      box(hx, Y + 0.4, hz, 0.16, hy - Y - 0.4, 0.16, C.NAGA);
      box(hx, hy, hz, 0.42, 0.55, 0.12, h % 2 ? C.NAGA_LT : C.NAGA, -h * 0.15);
    }
    // Krishna: blue, in yellow, one foot down on the hood, arms out
    const ky = Y + 1.45;
    box(lx, ky, lz + 0.2, 0.1, 0.42, 0.1, C.KRISHNA);
    box(lx + 0.14, ky + 0.15, lz + 0.2, 0.1, 0.3, 0.1, C.KRISHNA, 0.6);
    box(lx + 0.05, ky + 0.4, lz + 0.2, 0.32, 0.3, 0.2, C.PITAMBAR);
    box(lx + 0.05, ky + 0.7, lz + 0.2, 0.3, 0.42, 0.18, C.KRISHNA);
    box(lx + 0.05, ky + 0.98, lz + 0.2, 0.62, 0.08, 0.08, C.KRISHNA);
    box(lx + 0.05, ky + 1.12, lz + 0.2, 0.2, 0.22, 0.2, C.SKIN_DK);
    box(lx + 0.05, ky + 1.34, lz + 0.2, 0.14, 0.1, 0.14, C.PITAMBAR);
    post(lx, lz, 1.05);
  }

  /* ================================================================
   * THE OLD KALIYA TEMPLE
   * ================================================================ */
  /*
   * OSM's round building, 6.6 m across, on a platform that rises out of the
   * court: the platform's face toward the court has its three arched niches,
   * the drum a painted frieze, the dome pink; a railing round the top, a
   * flight up to it from the paving, and a second, smaller dome behind.
   */
  const TX = 7.73, TZ = -5.64, TR = 3.3;
  const P0 = 3.2, P1 = 12.4, PZ0 = -9.6, PZ1 = -1.0, PT = YT + 1.2;
  box((P0 + P1) / 2, BASE, (PZ0 + PZ1) / 2, P1 - P0, PT - BASE, PZ1 - PZ0, tint(C.RED, 0.96));
  solid((P0 + P1) / 2, (PZ0 + PZ1) / 2, P1 - P0, PZ1 - PZ0, { top: PT });
  // the three niches, in the face toward the court
  for (const nz of [-7.8, -5.3, -2.8]) {
    const q = p(P0 - 0.02, nz);
    cuspedArch(b, q[0], YC + 0.1, q[1], 1.5, 2.2, 0.14, rot + Math.PI / 2, C.RED_LT, 7);
  }
  box(P0 - 0.12, YC + 2.55, (PZ0 + PZ1) / 2, 0.3, 0.25, PZ1 - PZ0, C.RED_DK);
  // the railing round the top, open where the flight comes up
  const railRun = (a0, a1, lzA, lzB, along) => {
    const L = along === 'x' ? a1 - a0 : lzB - lzA;
    const mx = along === 'x' ? (a0 + a1) / 2 : a0, mz = along === 'x' ? lzA : (lzA + lzB) / 2;
    box(mx, PT + 0.95, mz, along === 'x' ? L : 0.06, 0.06, along === 'x' ? 0.06 : L, C.RAIL);
    for (let t = 0.3; t < L; t += 0.6) {
      box(along === 'x' ? a0 + t : a0, PT, along === 'x' ? lzA : lzA + t, 0.05, 0.95, 0.05, C.RAIL);
    }
  };
  railRun(P0, P1, PZ0, PZ0, 'x');
  railRun(P0, 9.0, PZ1, PZ1, 'x');
  railRun(11.4, P1, PZ1, PZ1, 'x');
  railRun(P0, P0, PZ0, PZ1, 'z');
  railRun(P1, P1, PZ0, PZ1, 'z');
  // the flight up from the paving on the south-east side
  for (let k = 0; k < 5; k++) {
    const top = YT + (PT - YT) * (k + 1) / 5;
    const lz = PZ1 + 1.2 - k * 0.3;
    box(10.2, YT - 0.3, lz, 2.4, top - YT + 0.3, 0.3, tint(C.RED_LT, 0.95 + 0.05 * (k % 2)));
    solid(10.2, lz, 2.4, 0.3, { top, standOnly: true, tag: 'kaliya-temple-steps' });
  }
  // the drum, its frieze, the dome
  const q = p(TX, TZ);
  lathe(TX, TZ, [[PT, TR], [PT + 1.4, TR]], 16, C.CREAM);
  lathe(TX, TZ, [[PT + 1.4, TR + 0.02], [PT + 2.4, TR + 0.02]], 16, (i, s) => C.FRIEZE[s % C.FRIEZE.length]);
  lathe(TX, TZ, [[PT + 2.4, TR], [PT + 3.2, TR], [PT + 3.2, TR + 0.45], [PT + 3.45, TR + 0.45], [PT + 3.45, TR - 0.1]], 16, C.PINK_DK);
  if (dome) dome(b, q[0], PT + 3.45, q[1], TR - 0.15, 2.9, C.PINK);
  lathe(TX, TZ, [[PT + 6.3, 0.35], [PT + 6.6, 0.42], [PT + 6.9, 0.2], [PT + 7.3, 0.0]], 8, C.PINK_DK);
  box(TX, PT + 6.4, TZ, 0.05, 2.6, 0.05, C.IRON);
  box(TX + 0.4, PT + 8.6, TZ, 0.8, 0.5, 0.03, C.SAFFRON);
  post(TX, TZ, TR + 0.05, { top: PT + 3.4 });
  // the door, toward the flight; the Deity inside it
  const dq = p(TX + 0.0, TZ + TR - 0.02);
  cuspedArch(b, dq[0], PT, dq[1], 1.3, 2.2, 0.16, rot, C.PINK_DK, 5);
  // the second, smaller dome on its kiosk behind
  box(11.1, PT, -8.3, 2.2, 2.2, 2.2, C.CREAM);
  { const k2 = p(11.1, -8.3); if (dome) dome(b, k2[0], PT + 2.2, k2[1], 1.15, 1.2, C.PINK); }
  solid(11.1, -8.3, 2.2, 2.2);

  /* ================================================================
   * THE KADAMBA
   * ================================================================ */
  /*
   * At OSM's node, on a round platform with a railing. The trunk is old and
   * hollow and still growing; red thread is wound round it and clay pots
   * hang from its branches — the offerings every account mentions.
   */
  const KX = -18.75, KZ = 2.81;
  lathe(KX, KZ, [[YT - 0.3, 3.1], [YT + 0.45, 3.1], [YT + 0.45, 2.9]], 16, C.RED);
  flat(KX - 2.0, KX + 2.0, KZ - 2.0, KZ + 2.0, YT + 0.455, tint(C.FLAG, 1.0));
  solid(KX, KZ, 4.4, 4.4, { top: YT + 0.45, standOnly: true, tag: 'kaliya-kadamba-platform' });
  for (let s = 0; s < 18; s++) {
    if (s === 13 || s === 14) continue;                 // the opening, toward the gate
    const a = s / 18 * Math.PI * 2;
    box(KX + Math.cos(a) * 3.0, YT + 0.45, KZ + Math.sin(a) * 3.0, 0.05, 0.75, 0.05, C.IRON);
  }
  lathe(KX, KZ, [[YT + 1.2, 3.0], [YT + 1.25, 3.0]], 18, C.IRON);
  // the trunk: thick, fluted, a dark hollow at its foot
  lathe(KX, KZ, [[YT + 0.45, 1.25], [YT + 1.2, 1.0], [YT + 3.0, 0.85], [YT + 4.6, 0.7]], 9,
    (i, s) => tint(s % 2 ? C.TRUNK : C.TRUNK_DK, 0.9 + 0.15 * hash(i * 9 + s)));
  { const hq = p(KX + 1.02, KZ - 0.35); cuspedArch(b, hq[0], YT + 0.5, hq[1], 0.8, 1.4, 0.1, rot + 1.9, C.TRUNK_DK, 3, C.DARK); }
  lathe(KX, KZ, [[YT + 1.5, 1.0], [YT + 1.75, 0.98]], 9, C.THREAD);
  post(KX, KZ, 1.15);
  // the limbs, and a broad round crown over the whole platform
  for (const [ax, az, len] of [[1, 0.2, 3.4], [-0.6, 1, 3.0], [-0.5, -1, 3.2], [0.4, -0.9, 2.6]]) {
    const L = Math.hypot(ax, az), ux = ax / L, uz = az / L;
    for (let t = 0; t < 4; t++) {
      box(KX + ux * (0.6 + t * len / 4), YT + 4.2 + t * 0.55, KZ + uz * (0.6 + t * len / 4), 0.42 - t * 0.06, 0.6, 0.42 - t * 0.06, C.TRUNK);
    }
  }
  lathe(KX, KZ, [[YT + 5.0, 1.0], [YT + 5.6, 6.2], [YT + 7.4, 7.2], [YT + 9.4, 6.0], [YT + 10.6, 3.2], [YT + 11.0, 0.3]], 14,
    (i, s) => tint(s % 3 ? C.LEAF : C.LEAF2, 0.88 + 0.2 * hash(i * 11 + s)));
  // the pots, on strings under the crown
  for (let k = 0; k < 11; k++) {
    const a = k / 11 * Math.PI * 2 + 0.3, r = 2.4 + 2.0 * hash(k + 4);
    const px = KX + Math.cos(a) * r, pz = KZ + Math.sin(a) * r, py = YT + 3.3 + 0.9 * hash(k + 8);
    box(px, py + 0.45, pz, 0.02, YT + 5.6 - py - 0.45, 0.02, C.IRON);
    lathe(px, pz, [[py, 0.05], [py + 0.14, 0.2], [py + 0.32, 0.17], [py + 0.42, 0.08], [py + 0.47, 0.1]], 8, tint(C.POT, 0.9 + 0.2 * hash(k)));
  }
  // the board by the tree, facing the gate
  box(-13.8, YT, 5.6, 0.1, 1.2, 0.1, C.IRON);
  box(-15.2, YT, 5.6, 0.1, 1.2, 0.1, C.IRON);
  box(-14.5, YT + 1.2, 5.6, 1.7, 1.0, 0.08, C.BOARD);
  box(-14.5, YT + 1.55, 5.55, 1.3, 0.06, 0.02, C.BOARD_TXT);
  box(-14.5, YT + 1.35, 5.55, 1.1, 0.05, 0.02, C.BOARD_TXT);

  // other trees in the enclosure, where the imagery has crowns over it
  for (const [lx, lz, s] of [[16.5, -3.8, 1.0], [22.5, -1.0, 0.9], [-23.0, -3.5, 0.85], [-12.5, 9.2, 0.8]]) {
    box(lx, YT, lz, 0.35 * s, 3.0 * s, 0.35 * s, C.TRUNK);
    lathe(lx, lz, [[YT + 2.6 * s, 0.4], [YT + 3.2 * s, 3.0 * s], [YT + 4.8 * s, 3.3 * s], [YT + 6.2 * s, 1.8 * s], [YT + 6.8 * s, 0.2]], 10,
      (i, sg) => tint(sg % 2 ? C.LEAF2 : C.LEAF, 0.9 + 0.15 * hash(lx * 3 + sg)));
    post(lx, lz, 0.3 * s);
  }

  /* ================================================================
   * DARSHAN
   * ================================================================ */
  // at the temple's door on its platform, looking in at the Deity
  return {
    YT, YC,
    altar: { lx: TX, lz: TZ, y: PT + 1.0 },
    darshan: { lx: TX, lz: TZ + TR + 1.0 },
    floor: PT,
  };
}
