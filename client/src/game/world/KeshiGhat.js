/**
 * SHRI KESHI GHAT — the riverfront of palaces where Krishna killed the horse-
 * demon Keshi and bathed, and where the Yamuna aarti is offered every evening.
 *
 * Built from:
 *   - A. Sinha & S. Dhariwal, "Myth and Placemaking in Vernacular Settlements:
 *     Insights from Vrindavan", ISVS e-journal 11.10 (2024), Fig. 7 — a
 *     surveyed plan of the whole stretch with its legend, and the text: "The
 *     ghats consist of stairs between pairs of burjes (octagonal piers),
 *     extending into the river with tibaris (triple arched pavilion) below …
 *     Keshi Ghat stretch has the most spectacular kunjs and ghats built as a
 *     unified composition by Jat rulers";
 *   - ESRI z19 imagery (Feb 2024), MEASUREMENT ONLY, never traced: the
 *     palace front, its bend, the courtyards, the water at the steps;
 *   - Wikimedia Commons photographs: "Kesi Ghat - panoramio" (the whole front
 *     from the river), "KesiGhat River.JPG" (2007, a burj on the steps),
 *     "Keshighat Vrindavan.JPG" (looking down a row of burjes, boats tied up),
 *     "Ghat at Yamuna river, Vrindavan" (the aarti platform), "Yamuna Aarti";
 *   - OSM node 6313899527 "Keshi Ghat", way 673572958 (the promenade along the
 *     front, motor_vehicle=no) and the riverbank relation 9075838.
 *
 * THE FRONT, measured on the imagery and squared with the plan's proportions:
 * 103 m of palace from Pandawala Kunj to the Yamunaji shrine, in two straight
 * runs — the south-west one 68.7 m at bearing 124, the north-east one 34.6 m
 * turned 11.5 degrees landward — with Kishori Rani Kunj carrying the line on
 * 25 m further south-west. The plan, from the north-east end:
 *
 *     Yamunaji Temple           5.5 m
 *     Badan Singh Kunj         32   m   the courtyard green in the imagery
 *     Rani Laxmibai Kunj       23.5 m   the big dark courtyard, 13 m square
 *     the pink block            9   m   the way down from the town
 *     Pandawala Kunj           27   m   + a 6 m end piece; its small court
 *     Kishori Rani Kunj        25   m   (beyond the plan's edge: imagery)
 *
 * Both courtyards the imagery shows land inside the right kunj when the plan
 * is laid on the measured front, which is the check that the two agree.
 *
 * Along the water, eight burjes on the steps at the plan's spacing, in pairs
 * with a flight between each pair; the Old Hanumanji shrine and a second
 * small shrine stand out on the promenade. "Keshi Ghat" in the plan's legend
 * is the flight in front of the Hanuman shrine — 25 m from the north-east end
 * — and "Pandawala Ghat" the one in front of Pandawala Kunj, which is where
 * OSM's "Keshi Ghat" node sits. The map pin stays on OSM; the aarti is held
 * where the plan puts Keshi Ghat.
 *
 * HEIGHTS, off the photograph from the river against the steps' drop: Badan
 * Singh Kunj three storeys of arcaded galleries, 16 m over the promenade;
 * Rani Laxmibai 15, its top storey plain dark brick; the pink block 17;
 * Pandawala 9.5, an arcade and one storey over it. Jugal Kishore's sikhara
 * stands behind the south-west end; it is its own builder.
 *
 * THE RIVER: the steps go down 4.6 m into the water, the last three under it.
 * The terrain carves the channel to their foot along this stretch
 * (content/riverbanks.js) because the imagery has the water there, on the
 * outside of the bend.
 *
 * INFERRED, and said so: storey heights other than the totals; arch counts
 * where the photograph is too small to count; the second shrine's dedication;
 * the boats' number and colours (the photographs show blue, green, red and
 * plain wood); the lamp posts at the burj necks (the plan marks a square
 * there). NOT BUILT: the pontoon lying in the river off the south-west end.
 */

const C = {
  BADAN: 0xb39a76, BADAN_DK: 0x8f7a5c,           // golden-buff sandstone, three storeys of galleries
  LAXMI: 0xa48a6a, BRICK: 0x6e5646,               // the arcade and gallery, and the plain dark top storey
  PINK: 0xc08b76, PINK_LO: 0xc9c2b4,              // the pink plastered block, its pale ground floor
  PANDA: 0x9c8e78, PANDA_DK: 0x7d705e,            // weathered grey-buff
  KISHORI: 0xa87566,                              // the red-pink kunj beyond
  BURJ: 0xc9b089, BURJ_DK: 0xb39a74,              // the burjes: pale buff, as in every close photograph
  STEP: 0xc2ae8c, STEP_WET: 0x8f8068, FLAG: 0xc8b592,
  SINDOOR: 0xc4501f, OCHRE: 0xd08a2c, WHITE: 0xe9e2d2, SAFFRON: 0xf08a24,
  DARK: 0x1e1610, GLASS: 0x2a2622, IRON: 0x2b2a28, LAMP: 0xffe2a8,
  GREEN: 0x5f8a3a, EARTH: 0x8f7556,
  BOAT: [0x4f8fd0, 0x3ea05a, 0xc8402e, 0xe0b030, 0x8a6a48, 0x3e7fb0],
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/*
 * The front, in WORLD metres, measured on the imagery. A0 is where Kishori
 * Rani Kunj begins; A, B, C the south-west end, the bend and the north-east
 * end of the palace front proper.
 */
const FRONT = { A0: [781.25, -778.55], A: [802, -792.5], B: [859, -830.8], C: [891, -844] };
// along the front from the north-east end C: the burjes, from the plan
const BURJ_FROM_C = [7.5, 14.4, 34.0, 41.0, 60.6, 67.6, 77.0, 90.5];

/**
 * @param o.b, o.loc, o.terrain, o.colliders, o.h { cuspedArch, tint, chhatri, dome }
 * @returns {{altar, darshan, floor, Y0, waterY}} — the aarti spot and where to stand for it
 */
export function buildKeshiGhat(o) {
  const { b, loc, terrain, colliders } = o;
  const { cuspedArch, tint, chhatri, dome } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const local = (wx, wz) => { const dx = wx - x, dz = wz - z; return [dx * cs + dz * sn, -dx * sn + dz * cs]; };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : 0; };
  const WATER = terrain && terrain.waterY !== undefined ? terrain.waterY : -0.55;

  /*
   * RUNS. The front is two straight stretches with a bend between them, and
   * everything on it is laid out along one or the other: `s` along the run,
   * `m` back from its face — positive into the town, negative toward the
   * river. A run is a frame inside the landmark's own.
   */
  const run = (o0, o1) => {
    const a = local(...o0), c = local(...o1);
    const ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    return { ang, len: Math.hypot(c[0] - a[0], c[1] - a[1]),
      L: (s, m) => [a[0] + s * ca - m * sa, a[1] + s * sa + m * ca] };
  };
  const SW = run(FRONT.A, FRONT.B);       // s 0 at A: Pandawala, the pink block, Rani Laxmibai
  const NE = run(FRONT.B, FRONT.C);       // s 0 at B: Badan Singh, the Yamunaji shrine

  const bx = (R, s, y, m, w, h, d, color) => {
    const l = R.L(s, m), q = p(l[0], l[1]);
    b.box(q[0], y, q[1], w, h, d, color, rot + R.ang);
  };
  const sol = (R, s, m, w, d, extra = {}) => {
    const l = R.L(s, m), q = p(l[0], l[1]);
    colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + R.ang, ...extra });
  };
  const post = (R, s, m, r, extra = {}) => {
    const l = R.L(s, m), q = p(l[0], l[1]);
    colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra });
  };
  const W = (R, s, y, m) => { const l = R.L(s, m), q = p(l[0], l[1]); return [q[0], y, q[1]]; };
  const quad = (R, A, B, Cq, D, col) => b.quad(W(R, ...A), W(R, ...B), W(R, ...Cq), W(R, ...D), col);
  const quad2 = (R, A, B, Cq, D, col) => { quad(R, A, B, Cq, D, col); quad(R, D, Cq, B, A, col); };
  // a cusped arch in the plane of the run's face, at `m`
  const arch = (R, s, y0, m, w, h, color, lobes = 7, shade, depth = 0.12) => {
    const l = R.L(s, m), q = p(l[0], l[1]);
    cuspedArch(b, q[0], y0, q[1], w, h, depth, rot + R.ang, color, lobes, shade);
  };
  /**
   * The masonry round an open arch, through a wall from `m0` to `m1`: the
   * spandrels up to `yTop` on both faces and the soffit under the curve, on
   * cuspedArch's own curve so the fill meets the drawn rim. (JaipurMandir
   * has the same, in one frame; this is it along a run.)
   */
  const archFill = (R, s, w, y0, h, yTop, m0, m1, color, lobes = 7) => {
    const half = w / 2, yS = y0 + h * 0.52, N = lobes * 4;
    let pu = null, pv = null;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI * i / N;
      const ripple = 1 - 0.085 * (1 - Math.cos(a * lobes * 2)) * 0.5;
      const u = -Math.cos(a) * half * ripple, v = yS + Math.sin(a) * (h - h * 0.52) * ripple;
      if (pu !== null) {
        for (const m of [m0, m1]) quad2(R, [s + pu, pv, m], [s + pu, yTop, m], [s + u, yTop, m], [s + u, v, m], color);
        quad2(R, [s + pu, pv, m0], [s + u, v, m0], [s + u, v, m1], [s + pu, pv, m1], tint(color, 0.8));
      }
      pu = u; pv = v;
    }
    for (const sg of [-1, 1]) quad2(R, [s + sg * half, y0, m0], [s + sg * half, yS, m0], [s + sg * half, yS, m1], [s + sg * half, y0, m1], tint(color, 0.85));
  };
  // flat quads, seen from above, in a run (the up-facing winding, measured in JaipurMandir)
  const flat = (R, s0, s1, m0, m1, y, col) => quad(R, [s0, y, m0], [s0, y, m1], [s1, y, m1], [s1, y, m0], col);

  /** an octagon prism ring by ring, a flat face to the river; [y, r] pairs */
  const octLathe = (R, s, m, rings, color) => {
    const l = R.L(s, m);
    const off = Math.PI / 8 + R.ang;
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0] = rings[i - 1], [y1, r1] = rings[i];
      for (let k = 0; k < 8; k++) {
        const a0 = off + k / 8 * Math.PI * 2, a1 = off + (k + 1) / 8 * Math.PI * 2;
        const P = (a, r, y) => { const q = p(l[0] + Math.cos(a) * r, l[1] + Math.sin(a) * r); return [q[0], y, q[1]]; };
        b.quad(P(a0, r0, y0), P(a0, r1, y1), P(a1, r1, y1), P(a1, r0, y0), typeof color === 'function' ? color(i, k) : color);
      }
    }
  };
  /** the flat top of an octagon, seen from above */
  const octCap = (R, s, m, r, y, color) => {
    const l = R.L(s, m);
    const off = Math.PI / 8 + R.ang;
    const c = p(l[0], l[1]);
    for (let k = 0; k < 8; k++) {
      const a0 = off + k / 8 * Math.PI * 2, a1 = off + (k + 1) / 8 * Math.PI * 2;
      const P = (a) => { const q = p(l[0] + Math.cos(a) * r, l[1] + Math.sin(a) * r); return [q[0], y, q[1]]; };
      const A = P(a1), B2 = P(a0);
      b.quad([c[0], y, c[1]], A, B2, B2, color);
    }
  };

  /* ================================================================
   * LEVELS
   * ================================================================ */
  /*
   * The promenade is at the town's level — the ground forty metres in,
   * behind the palaces, which the river has not touched. The steps go down
   * from it to three treads under the water.
   */
  let town = -Infinity;
  for (const R of [SW, NE]) {
    for (let s = 0; s <= R.len; s += 8) town = Math.max(town, tH(...R.L(s, 40)));
  }
  const Y0 = town + 0.12;
  const STEPS = 15;
  const FOOT = WATER - 1.0;                       // the lowest tread, a metre under
  const RISE = (Y0 - FOOT) / STEPS;
  const TREAD = 0.55;
  const PROM = 5.0;                               // the promenade's depth in front of the palaces
  const BASE = WATER - 3.0;                       // where masonry starts, under the river bed
  const stepY = (k) => Y0 - RISE * (k + 1);
  const stepM = (k) => -PROM - TREAD * (k + 1);   // the river edge of tread k

  /* ================================================================
   * THE PROMENADE AND THE STEPS
   * ================================================================ */
  /*
   * One continuous flight along the whole front, in two runs that overlap at
   * the bend so its outside corner is not a notch. Each tread is one long
   * box from under the river bed to its own top, so the risers are real
   * faces, and each carries a stand-only collider tagged as a ghat step —
   * the stairs check walks a body down and back up these.
   */
  const spans = [[SW, -25.5, SW.len + 1.6], [NE, -1.6, NE.len + 1.4]];
  for (const [R, s0, s1] of spans) {
    const w = s1 - s0, sc = (s0 + s1) / 2;
    // the promenade
    bx(R, sc, BASE, -PROM / 2, w, Y0 - BASE, PROM, tint(C.FLAG, 0.97));
    sol(R, sc, -PROM / 2, w, PROM, { top: Y0, tag: 'keshi-promenade', standOnly: true, floor: true });
    /*
     * The open ends. A wall closes the end of the flight, as the photographs
     * have it; the promenade itself carries on down a flight of its own to
     * whatever ground is beyond — the beach of the boat landing at the
     * north-east end, the bank at the south-west. Without that the promenade
     * was a shelf two and a half metres above the beach, reached only from
     * the town.
     */
    for (const [se, dir] of (R === SW ? [[s0, -1]] : [[s1, 1]])) {
      const run = TREAD * STEPS;
      bx(R, se, BASE, -PROM - run / 2, 0.8, Y0 + 0.45 - BASE, run, tint(C.BURJ_DK, 0.95));
      sol(R, se, -PROM - run / 2, 0.8, run, { top: Y0 + 0.45 });
      // the ground beyond, and the flight down to it across the promenade's width
      const yTo = Math.max(WATER + 0.3, tH(...R.L(se + dir * 9, -PROM / 2)));
      if (Y0 - yTo > 0.3) {
        const n = Math.ceil((Y0 - yTo) / 0.24), rise = (Y0 - yTo) / n;
        for (let k2 = 1; k2 <= n; k2++) {
          const top = Y0 - rise * k2, sm = se + dir * (0.45 * (k2 - 0.5));
          bx(R, sm, BASE, -PROM / 2, 0.45, top - BASE, PROM, tint(C.STEP, 0.93 + 0.07 * (k2 % 2)));
          sol(R, sm, -PROM / 2, 0.45, PROM, { top, tag: 'keshi-end-steps', standOnly: true });
        }
      }
    }
    for (let k = 0; k < STEPS; k++) {
      const top = stepY(k), mc = -PROM - TREAD * (k + 0.5);
      // wet below the waterline, and darker for it
      const col = top < WATER + 0.05 ? tint(C.STEP_WET, 0.95 + 0.05 * (k % 2)) : tint(C.STEP, 0.93 + 0.07 * (k % 2));
      bx(R, sc, BASE, mc, w, top - BASE, TREAD, col);
      sol(R, sc, mc, w, TREAD, { top, tag: 'ghat-step', standOnly: true });
    }
  }
  // the promenade's flags, so the long top reads as paving and not as one slab
  for (const [R, s0, s1] of spans) {
    for (let s = s0; s < s1 - 0.1; s += 2.4) {
      flat(R, s + 0.04, Math.min(s1, s + 2.4) - 0.04, -PROM + 0.05, -0.05, Y0 + 0.012, tint(C.FLAG, 0.92 + 0.12 * hash(s * 3.1)));
    }
  }

  /* ================================================================
   * THE BURJES
   * ================================================================ */
  /*
   * Octagonal piers standing on the steps, "extending into the river": a
   * plain shaft with two small arched niches at the water, a moulded band,
   * the upper shaft panelled in cusped outlines, a deep bracketed chhajja,
   * and a flat top with a carved parapet — every close photograph shows them
   * flat-topped, with people standing on them. Each is reached from the
   * promenade by a short neck with a lamp at its root (the plan's square).
   */
  const BR = 2.5;                                 // circumradius: 4.6 m across the flats
  const BM = -PROM - 3.9;                         // centre, out on the steps
  const burjAt = BURJ_FROM_C.map((d) => (d <= NE.len ? [NE, NE.len - d] : [SW, SW.len - (d - NE.len)]));
  burjAt.forEach(([R, s], i) => {
    const yTop = Y0 - 0.05;
    const yBand = (BASE + yTop) / 2 + 0.6;
    octLathe(R, s, BM, [[BASE, BR], [yBand - 0.25, BR]], tint(C.BURJ_DK, 0.96 + 0.06 * hash(i)));
    octLathe(R, s, BM, [[yBand - 0.25, BR], [yBand - 0.25, BR + 0.14], [yBand + 0.1, BR + 0.14], [yBand + 0.1, BR]], tint(C.BURJ, 0.9));
    octLathe(R, s, BM, [[yBand + 0.1, BR], [yTop - 0.75, BR]], tint(C.BURJ, 0.98 + 0.04 * hash(i + 5)));
    // the chhajja: a flared eave on brackets, then the top slab
    octLathe(R, s, BM, [[yTop - 0.75, BR], [yTop - 0.3, BR + 0.55], [yTop - 0.18, BR + 0.6], [yTop, BR + 0.6]], tint(C.BURJ, 0.9));
    octCap(R, s, BM, BR + 0.6, yTop, tint(C.FLAG, 1.0));
    // the parapet ring, set back from the eave
    octLathe(R, s, BM, [[yTop, BR - 0.05], [yTop + 0.55, BR - 0.05]], tint(C.BURJ, 1.02));
    octLathe(R, s, BM, [[yTop + 0.55, BR - 0.05], [yTop + 0.55, BR - 0.3], [yTop, BR - 0.3]], tint(C.BURJ, 0.95));
    // panels on the upper shaft and niches at the foot, on the four faces toward the river
    const face = (k) => Math.PI / 8 + R.ang + (k + 0.5) / 8 * Math.PI * 2;
    for (let k = 0; k < 8; k++) {
      const a = face(k);
      const fx = Math.cos(a), fz = Math.sin(a);
      const rr = BR * Math.cos(Math.PI / 8) + 0.02;
      // only the faces you can see from the river or the steps
      const l = R.L(s, BM);
      const toRiver = (fx * Math.cos(R.ang - Math.PI / 2) + fz * Math.sin(R.ang - Math.PI / 2));
      if (toRiver < -0.2) continue;
      const q = p(l[0] + fx * rr, l[1] + fz * rr);
      const faceRot = rot + a + Math.PI / 2;
      cuspedArch(b, q[0], yBand + 0.45, q[1], 1.05, Math.max(1.2, yTop - yBand - 1.5), 0.06, faceRot, tint(C.BURJ_DK, 0.9), 5, tint(C.BURJ_DK, 0.82));
      if (k % 2 === 0) cuspedArch(b, q[0], WATER + 0.25, q[1], 0.55, 0.8, 0.08, faceRot, tint(C.BURJ_DK, 0.85), 5);
    }
    // standing on it: the top, flush with the promenade; the shaft stops you on the steps
    post(R, s, BM, BR * 0.97, { top: yTop, tag: 'keshi-burj' });
    sol(R, s, BM, (BR + 0.5) * 1.6, (BR + 0.5) * 1.6, { top: yTop, tag: 'keshi-burj-top', standOnly: true, floor: true });
    // the neck to the promenade, and its lamp
    const neck0 = -PROM + 0.05, neck1 = BM + BR * 0.85;
    bx(R, s, yTop - 0.45, (neck0 + neck1) / 2, 1.7, 0.45, neck0 - neck1, tint(C.FLAG, 0.95));
    sol(R, s, (neck0 + neck1) / 2, 1.7, neck0 - neck1, { top: yTop, tag: 'keshi-burj-neck', standOnly: true });
    bx(R, s + 1.3, Y0, -PROM + 0.35, 0.16, 3.1, 0.16, C.IRON);
    bx(R, s + 1.3, Y0 + 3.1, -PROM + 0.35, 0.36, 0.42, 0.36, C.LAMP);
    post(R, s + 1.3, -PROM + 0.35, 0.12);
  });

  /* ================================================================
   * THE PALACES
   * ================================================================ */
  /*
   * A kunj on the front: a solid range from the promenade back to `depth`,
   * round an open courtyard if it has one, with its river face worked in
   * storeys. The ground storey is an arcade of tibaris you can walk into —
   * real openings two metres deep, where the flower sellers sit — and the
   * storeys over it galleries of small cusped arches between pilasters,
   * dark behind, with a chhajja over each and a parapet at the top.
   */
  const kunj = (R, s0, s1, depth, spec) => {
    const { H, color, top = color, court, storeys, bays } = spec;
    const w = s1 - s0, sc = (s0 + s1) / 2;
    const ARC = spec.arcadeH || 4.6, GAL = 2.2;      // the ground arcade's height and depth
    // the body: everything behind the arcade, round the court if there is one
    const body = (ms0, ms1, ss0, ss1, h = H) => {
      bx(R, (ss0 + ss1) / 2, BASE, (ms0 + ms1) / 2, ss1 - ss0, h + Y0 - BASE, ms1 - ms0, tint(color, 0.97));
      sol(R, (ss0 + ss1) / 2, (ms0 + ms1) / 2, ss1 - ss0, ms1 - ms0);
    };
    if (court) {
      const [cs0, cs1, cm0, cm1] = court;
      body(GAL, cm0, s0, s1);
      body(cm1, depth, s0, s1);
      body(cm0, cm1, s0, cs0);
      body(cm0, cm1, cs1, s1);
      // the court's floor, and its four inner faces darker
      flat(R, cs0, cs1, cm0, cm1, Y0 + 0.02, court[4] || tint(C.FLAG, 0.9));
    } else body(GAL, depth, s0, s1);
    // the storeys above the arcade, carried forward over it — drawn, not
    // solid: a collider has no underside, and one here would wall off the
    // tibaris below it
    bx(R, sc, Y0 + ARC, GAL / 2, w, H - ARC, GAL, tint(color, 0.99));

    // the ground arcade: piers, the masonry round each arch, a dark back wall
    const pitch = w / bays, pierW = Math.min(1.0, pitch * 0.3), aw = pitch - pierW;
    const ah = ARC - 0.75;
    for (let i = 0; i <= bays; i++) {
      const sp = s0 + i * pitch;
      // half a pier at each end, so two kunjs side by side make one whole one
      const pw = (i === 0 || i === bays) ? pierW / 2 : pierW;
      const spc = i === 0 ? sp + pw / 2 : i === bays ? sp - pw / 2 : sp;
      bx(R, spc, Y0, GAL / 2, pw, ARC, GAL, tint(color, 0.95));
      sol(R, spc, GAL / 2, pw, GAL);
    }
    for (let i = 0; i < bays; i++) {
      const sa = s0 + (i + 0.5) * pitch;
      archFill(R, sa, aw, Y0, ah, Y0 + ARC, 0, GAL, tint(color, 0.97), 7);
      arch(R, sa, Y0, -0.04, aw, ah, tint(color, 1.08), 7, null, 0.14);
      // the tibari behind: its floor and its dark back
      flat(R, sa - aw / 2, sa + aw / 2, 0, GAL, Y0 + 0.01, tint(C.FLAG, 0.86));
      bx(R, sa, Y0, GAL - 0.05, aw, ARC, 0.1, C.DARK);
    }
    sol(R, sc, GAL / 2, w, GAL, { top: Y0 + 0.02, standOnly: true, floor: true, tag: 'keshi-tibari' });
    // a chhajja over the arcade
    bx(R, sc, Y0 + ARC, -0.45, w + 0.3, 0.18, 0.9, tint(color, 0.88));

    // the galleries: small arches between pilasters, a chhajja over each storey
    let y = Y0 + ARC;
    for (const st of storeys) {
      const n = st.n, pitchG = w / n, gw = Math.min(st.win || 1.0, pitchG * 0.62), gh = st.h - 1.2;
      const col = st.color || color;
      // the storey's own face, a hair proud of the body
      bx(R, sc, y, -0.06, w, st.h, 0.14, tint(col, 0.98));
      for (let i = 0; i < n; i++) {
        const sg = s0 + (i + 0.5) * pitchG;
        if (st.plain) {
          // a plain storey: small square windows, shuttered dark
          bx(R, sg, y + st.h * 0.35, -0.16, 0.8, 1.1, 0.06, C.GLASS);
        } else {
          arch(R, sg, y + 0.45, -0.18, gw, gh, tint(col, 1.1), 5, C.DARK, 0.1);
          // the pilaster between, and the balcony ledge under each window
          bx(R, s0 + i * pitchG, y + 0.3, -0.2, 0.22, st.h - 0.6, 0.18, tint(col, 1.04));
          bx(R, sg, y + 0.35, -0.38, gw + 0.3, 0.1, 0.5, tint(col, 0.9));
        }
      }
      y += st.h;
      bx(R, sc, y - 0.12, -0.4, w + 0.25, 0.16, 0.85, tint(col, 0.86));
    }
    // the parapet, with a little crenellation at the skyline
    bx(R, sc, Y0 + H, -0.1, w, 0.9, 0.3, tint(top, 1.0));
    for (let s = s0 + 0.6; s < s1 - 0.4; s += 1.2) bx(R, s, Y0 + H + 0.9, -0.1, 0.5, 0.35, 0.3, tint(top, 1.03));
  };

  // Kishori Rani Kunj, beyond the plan, carrying the line south-west
  kunj(SW, -25.0, -0.2, 9.0, {
    H: 11, color: C.KISHORI, bays: 6, arcadeH: 4.4,
    storeys: [{ h: 4.6, n: 9, win: 1.2 }, { h: 1.8, n: 1, plain: true }],
  });
  // Pandawala Kunj: the end piece, then the kunj round its small court
  kunj(SW, 0.0, 6.3, 9.5, {
    H: 11, color: C.PANDA_DK, bays: 1, arcadeH: 4.6,
    storeys: [{ h: 4.6, n: 2, win: 1.1 }, { h: 1.6, n: 1, plain: true }],
  });
  kunj(SW, 6.3, 33.1, 18, {
    H: 9.5, color: C.PANDA, bays: 8, arcadeH: 4.8,
    court: [10.4, 20.6, 4.2, 14.0, tint(C.EARTH, 0.95)],
    storeys: [{ h: 3.9, n: 12, win: 1.25 }],
  });
  // the pink block, and the way down through it from the town
  {
    const s0 = 33.1, s1 = 42.3, P0 = 36.2, P1 = 39.2, D = 16;
    const H = 17;
    for (const [a, c] of [[s0, P0], [P1, s1]]) {
      bx(SW, (a + c) / 2, BASE, D / 2, c - a, H + Y0 - BASE, D, tint(C.PINK, 0.98));
      sol(SW, (a + c) / 2, D / 2, c - a, D);
      bx(SW, (a + c) / 2, Y0, -0.05, c - a, 4.2, 0.12, C.PINK_LO);
    }
    // over the passage, the upper floors bridge it
    bx(SW, (P0 + P1) / 2, Y0 + 4.6, D / 2, P1 - P0, H - 4.6, D, tint(C.PINK, 0.98));
    archFill(SW, (P0 + P1) / 2, P1 - P0, Y0, 4.4, Y0 + 4.6, -0.05, 0.6, tint(C.PINK_LO, 0.95), 5);
    arch(SW, (P0 + P1) / 2, Y0, -0.08, P1 - P0, 4.4, tint(C.PINK_LO, 1.1), 5, null, 0.14);
    // the passage floor, the town to the promenade, at the promenade's level
    flat(SW, P0, P1, -0.1, D + 0.1, Y0 + 0.015, tint(C.FLAG, 0.9));
    sol(SW, (P0 + P1) / 2, D / 2, P1 - P0, D + 0.2, { top: Y0, standOnly: true, floor: true, tag: 'keshi-passage' });
    // small windows up the pink face, a parapet
    for (let fl = 0; fl < 3; fl++) {
      for (const sw of [34.6, 40.9]) bx(SW, sw, Y0 + 6.0 + fl * 3.6, -0.08, 0.9, 1.3, 0.06, C.GLASS);
    }
    bx(SW, (s0 + s1) / 2, Y0 + H, -0.1, s1 - s0, 0.8, 0.3, tint(C.PINK, 1.04));
  }
  // Rani Laxmibai Kunj, round its great court
  kunj(SW, 42.3, SW.len, 28, {
    H: 15, color: C.LAXMI, top: C.BRICK, bays: 7, arcadeH: 4.5,
    court: [31.1, 44.1, 9.7, 22.7, tint(C.FLAG, 0.85)],
    storeys: [{ h: 4.5, n: 16, win: 0.95 }, { h: 4.5, n: 9, plain: true, color: C.BRICK }, { h: 1.5, n: 1, plain: true, color: C.BRICK }],
  });
  // Badan Singh Kunj, the grandest: three storeys of galleries round a garden
  kunj(NE, 0, 29.1, 24, {
    H: 16, color: C.BADAN, bays: 9, arcadeH: 4.6,
    court: [14.1, 28.1, 6.9, 18.9, C.GREEN],
    storeys: [{ h: 4.6, n: 18, win: 0.95 }, { h: 4.4, n: 18, win: 0.95 }, { h: 2.4, n: 1, plain: true }],
  });
  // the garden in its court: a few trees
  for (const [s, m] of [[17.5, 10.5], [24.5, 15.5], [20.5, 16.5]]) {
    bx(NE, s, Y0, m, 0.35, 2.6, 0.35, 0x5a4632);
    bx(NE, s, Y0 + 2.4, m, 3.2, 2.2, 3.2, tint(0x4f6d2c, 0.95 + 0.1 * hash(s)));
  }
  // rooftop rooms and a kiosk, as the photograph from the river has them
  bx(NE, 6.0, Y0 + 16, 8, 7.5, 3.0, 6, tint(C.BADAN, 0.95));
  bx(NE, 6.0, Y0 + 19, 8, 7.9, 0.3, 6.4, tint(C.BADAN, 0.85));
  if (chhatri) for (const s of [1.5, 26.5]) { const q = W(NE, s, 0, 1.0); chhatri(b, q[0], Y0 + 16.9, q[2], 1.1, 2.2, tint(C.BADAN, 1.05)); }

  /* ================================================================
   * THE SHRINES ON THE PROMENADE
   * ================================================================ */
  // the Yamunaji temple at the north-east end, whitewashed, a small dome
  {
    const s0 = 29.1, s1 = NE.len + 0.4, D = 6;
    bx(NE, (s0 + s1) / 2, BASE, D / 2, s1 - s0, 5.2 + Y0 - BASE, D, C.WHITE);
    sol(NE, (s0 + s1) / 2, D / 2, s1 - s0, D);
    arch(NE, (s0 + s1) / 2, Y0, -0.05, 1.8, 2.8, tint(C.SAFFRON, 0.95), 5);
    if (dome) { const q = W(NE, (s0 + s1) / 2, 0, D / 2); dome(b, q[0], Y0 + 5.2, q[2], 2.0, 2.2, C.WHITE); }
    bx(NE, (s0 + s1) / 2 + 1.4, Y0 + 5.2, D / 2 - 1.2, 0.06, 4.6, 0.06, C.IRON);
    bx(NE, (s0 + s1) / 2 + 1.75, Y0 + 9.0, D / 2 - 1.2, 0.7, 0.45, 0.03, C.SAFFRON);
  }
  // the Old Hanumanji temple, out on the promenade before Badan Singh Kunj,
  // and the second shrine before Rani Laxmibai
  const shrine = (R, sc, color, h) => {
    bx(R, sc, Y0, -1.25, 4.0, h, 2.5, color);
    sol(R, sc, -1.25, 4.0, 2.5);
    arch(R, sc, Y0, -2.55, 1.5, 2.3, tint(color, 1.15), 5);
    bx(R, sc, Y0 + h, -1.25, 4.3, 0.25, 2.8, tint(color, 0.85));
    const q = W(R, sc, 0, -1.25);
    if (dome) dome(b, q[0], Y0 + h + 0.25, q[2], 1.25, 1.6, tint(color, 1.05));
  };
  shrine(NE, 10.6, C.SINDOOR, 3.9);
  shrine(SW, 52.8, C.OCHRE, 3.6);

  /* ================================================================
   * BOATS AT THE FOOT OF THE STEPS
   * ================================================================ */
  /*
   * The wooden boats that take pilgrims out to the middle of the river, tied
   * up all along the front in every photograph — flat decks, a low rail on
   * posts, painted blue, green, red and yellow or left as wood. They float:
   * nothing here is solid, so a body that wades out simply goes past them.
   */
  const boatAt = [[SW, 3.5], [SW, 20.5], [SW, 30.0], [SW, 47.5], [SW, 58.0], [NE, 5.0], [NE, 14.0], [NE, 24.0]];
  boatAt.forEach(([R, s], i) => {
    const m = stepM(STEPS - 1) - 1.8 - 2.2 * hash(i + 3);
    const L = 6.5 + 2.0 * hash(i), Bw = 1.9 + 0.3 * hash(i + 1);
    const col = C.BOAT[i % C.BOAT.length];
    const yawOff = (hash(i + 7) - 0.5) * 0.5;
    const l = R.L(s, m), q = p(l[0], l[1]);
    const a = rot + R.ang + Math.PI / 2 + yawOff;      // bows toward the river
    // the hull, painted, half a metre of it out of the water; the deck boards
    // inside it, and a gunwale in the hull's colour round them
    b.box(q[0], WATER - 0.4, q[1], Bw, 0.95, L, col, a);
    b.box(q[0], WATER + 0.5, q[1], Bw - 0.3, 0.04, L - 0.6, tint(0x9a7a50, 0.95), a);
    b.box(q[0], WATER + 0.55, q[1], Bw + 0.06, 0.08, L + 0.06, tint(col, 1.15), a);
    // the rail posts, the length of each side
    for (let k = 0; k < 5; k++) {
      for (const sg of [-1, 1]) {
        const t = (k / 4 - 0.5) * (L - 1.2);
        const ox = Math.cos(a) * sg * (Bw / 2 - 0.12) - Math.sin(a) * t;
        const oz = Math.sin(a) * sg * (Bw / 2 - 0.12) + Math.cos(a) * t;
        b.box(q[0] + ox, WATER + 0.55, q[1] + oz, 0.06, 0.5, 0.06, tint(col, 1.1), a);
      }
    }
  });

  /* ================================================================
   * THE AARTI
   * ================================================================ */
  /*
   * Keshi Ghat proper, by the plan: the flight in front of the Hanuman
   * shrine. You stand on the last dry tread; the lamp is waved out over the
   * water.
   */
  const KG = 10.6;
  let k = 0;
  while (k < STEPS - 1 && stepY(k + 1) > WATER + 0.12) k++;
  const dl = NE.L(KG, -PROM - TREAD * (k + 0.5)), al = NE.L(KG, stepM(STEPS - 1) - 1.5);
  return {
    Y0, waterY: WATER,
    darshan: { lx: dl[0], lz: dl[1] },
    altar: { lx: al[0], lz: al[1], y: WATER + 1.1 },
    floor: stepY(k),
  };
}
