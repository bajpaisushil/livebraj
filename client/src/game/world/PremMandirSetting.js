/**
 * PREM MANDIR'S SETTING — the 22 ha campus round the temple: the Prem Bhavan
 * (the Satsang Bhavan), the hall north of the fountain, the musical fountain
 * and its evening show, the processional garden to the south gate, the gate
 * itself, the Kaliya Naag pool, the guest blocks, the parterres, the walls.
 *
 * From docs/research/prem-mandir.md (the survey and its checker) and ESRI z19
 * imagery, used for measurement only. The imagery sits about 3 m west of OSM
 * here, measured on the temple's own platform; positions below are taken
 * relative to the platform and the building in it, then squared with OSM.
 *
 * THE FRAME is the temple's: origin the centre of the building's OSM outline
 * (way 673573044), +lx EAST, +lz SOUTH. The platform's centre is 11.05 m
 * east and 1.0 m north of it.
 *
 * MEASURED (z19, +-1.5 m):
 *   the Prem Bhavan    a ribbed dome 85 m across centred at (-164.6, -88.5),
 *                      on a 94 m square base with chamfered corners, porticos
 *                      on all four sides (two curved red ones on the west), a
 *                      paved plaza 131 x 125 m round it
 *   the north hall     86 x 34.4 m, lx -44.9..41.1, lz -156.7..-122.3, a white
 *                      vaulted roof
 *   the fountain       a red-paved vesica, its points at lx -43.9 and 40.1,
 *                      18 m half-width, round a white elliptical basin 41 x
 *                      22.5 m centred at (-1.9, -87.3) with an inner pool 30 x
 *                      17; a green ornamental ground round it to lz -118..-49
 *   the south garden   three long beds between two red avenues (12 m and
 *                      9.6 m wide) from the plaza to the gate, 52 m
 *   the gate           its arch at lx -18.9..8.5, lz 108..118, on the road
 *   the Kaliya pool    peanut-shaped, 44 x 23 m, centred (-109.9, 99.5), a
 *                      red-orange figure at its middle
 *   the guest blocks   three white blocks south-west, lz 25..84
 *
 * INFERRED, and said so: every HEIGHT in this file but the temple's — none is
 * published; the Prem Bhavan's dome is shallow (no shadow of it reaches past
 * its own base with the sun at 39 degrees, measured off the temple spire's
 * shadow) and is built 22 m above a 9 m base, its finial at 35 m, just under
 * the temple's 38. One source's "270 feet high" is its DIAMETER mislabelled
 * (270 ft = 82 m; the dome measures 85). The north hall's use; the tableau
 * north of the fountain read as the Govardhan leela by its form alone; the
 * summer/winter boundary of the show's hours.
 *
 * THE SHOW (SOURCED): 19:00-19:30 in winter, 19:30-20:00 in summer, free,
 * jets choreographed to bhajans. Its jets are meshes of their own,
 * `Show:prem:<k>`, which FountainShow animates and colours in those hours.
 */

const C = {
  MARBLE: 0xe8e6df, MARBLE_SH: 0xcfcbc0, PAVE: 0xab8a82, PAVE_LT: 0xd9cfbf, INLAY: 0xe8e4da,
  DOME: 0xd9b89c, DOME_SH: 0xc4a185, GOLD: 0xc9a03c, ROOF_RED: 0xa8442a, ROOF_LT: 0xd8d4cc,
  HALL_ROOF: 0xf2f2ee, CREAM: 0xe9e2cf, GUEST: 0xeceae2, GLASS: 0x4a5a66,
  LAWN: 0x5f8a3a, LAWN2: 0x6a9440, HEDGE: 0x2f5a24, FLOWER_R: 0xc8452a, FLOWER_Y: 0xe8b42a,
  WATER: 0x2f6a6a, WATER_DEEP: 0x24504f, POOL_GREEN: 0x3f6a3a, ROCK: 0x8f8170, ROCK2: 0x7a6e60,
  SERPENT: 0xc8582a, KRISHNA: 0x2a3f8a, BLUE_GRILLE: 0x2f5aa8, PEACOCK: 0x1f7a7a, IRON: 0x2a2826,
  JET: 0xe8f4ff, WALL: 0xe2dccb,
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * @param o.b the temple's builder; o.loc; o.terrain; o.colliders
 * @param o.h helpers: { cuspedArch, tint, ribbedDome, MeshBuilder }
 * @returns {{ meshes: Array }} the show's jets, as extra meshes
 */
export function buildPremMandirSetting(o) {
  const { b, loc, terrain, colliders } = o;
  const { cuspedArch, tint, MeshBuilder } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0, bb = b) => { const q = p(lx, lz); bb.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : 0; };
  const topOf = (lx0, lx1, lz0, lz1, n = 6) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) hi = Math.max(hi, tH(lx0 + (lx1 - lx0) * i / n, lz0 + (lz1 - lz0) * j / n));
    return hi;
  };
  const lq = (A, B, Cq, D, col, bb = b) => {
    const a = p(A[0], A[2]), q = p(B[0], B[2]), c = p(Cq[0], Cq[2]), d = p(D[0], D[2]);
    bb.quad([a[0], A[1], a[1]], [q[0], B[1], q[1]], [c[0], Cq[1], c[1]], [d[0], D[1], d[1]], col);
  };
  const lq2 = (A, B, Cq, D, col, bb = b) => { lq(A, B, Cq, D, col, bb); lq(D, Cq, B, A, col, bb); };
  // horizontal quads by which way they face (measured on Jaipur Mandir's hall floor)
  const flat = (lx0, lx1, lz0, lz1, y, col, bb = b) => lq([lx0, y, lz0], [lx0, y, lz1], [lx1, y, lz1], [lx1, y, lz0], col, bb);
  // rot 0: a lo-hi-hi-lo run faces up x (B - A): south runs -lx, north +lx, east +lz, west -lz
  const panel = (lx, y, lz, w, h, face, col) => {
    const y0 = y - h / 2, y1 = y + h / 2, hw = w / 2;
    const [A, B] = face === 'S' ? [[lx + hw, lz], [lx - hw, lz]] : face === 'N' ? [[lx - hw, lz], [lx + hw, lz]]
      : face === 'E' ? [[lx, lz - hw], [lx, lz + hw]] : [[lx, lz + hw], [lx, lz - hw]];
    lq([A[0], y0, A[1]], [A[0], y1, A[1]], [B[0], y1, B[1]], [B[0], y0, B[1]], col);
  };
  const arch = (lx, y0, lz, w, h, along, color, lobes, shade, depth = 0.1) => {
    const q = p(lx, lz);
    cuspedArch(b, q[0], y0, q[1], w, h, depth, along === 'x' ? rot : rot + Math.PI / 2, color, lobes, shade);
  };
  /**
   * The masonry round an arch, its spandrels and soffit through a wall, to
   * the line above it — cuspedArch's own curve (see JaipurMandir.js).
   */
  const archFill = (lx, lz, w, y0, h, yTop, along, t0, t1, color, lobes = 9) => {
    const half = w / 2, yS = y0 + h * 0.52, N = lobes * 4;
    const pt = (u, v, t) => (along === 'z' ? [lx + t, v, lz + u] : [lx + u, v, lz + t]);
    let pu = null, pv = null;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI * i / N;
      const ripple = 1 - 0.085 * (1 - Math.cos(a * lobes * 2)) * 0.5;
      const u = -Math.cos(a) * half * ripple, v = yS + Math.sin(a) * (h - h * 0.52) * ripple;
      if (pu !== null) {
        for (const t of [t0, t1]) lq2(pt(pu, pv, t), pt(pu, yTop, t), pt(u, yTop, t), pt(u, v, t), color);
        lq2(pt(pu, pv, t0), pt(u, v, t0), pt(u, v, t1), pt(pu, pv, t1), tint(color, 0.8));
      }
      pu = u; pv = v;
    }
  };
  const lathe = (cx, cz, rings, segs, color, bb = b) => {
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0] = rings[i - 1], [y1, r1] = rings[i];
      for (let s = 0; s < segs; s++) {
        const a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2;
        lq([cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1],
          [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0],
          typeof color === 'function' ? color(i, s) : color, bb);
      }
    }
  };
  /** A paved or planted rectangle at grade that is stood on, not sunk into. */
  const ground = (lx0, lx1, lz0, lz1, col, tag, lift = 0.06) => {
    const g = topOf(lx0, lx1, lz0, lz1, 4) + lift;
    box((lx0 + lx1) / 2, g - 0.5, (lz0 + lz1) / 2, lx1 - lx0, 0.5, lz1 - lz0, col);
    solid((lx0 + lx1) / 2, (lz0 + lz1) / 2, lx1 - lx0, lz1 - lz0, { top: g, tag, standOnly: true });
    return g;
  };
  /** A closed outline's rim, solid in chords along its centre line. */
  const rimSolid = (pts, top, tag, w = 0.8) => {
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], c = pts[(k + 1) % pts.length];
      const q = p((a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: Math.hypot(c[0] - a[0], c[1] - a[1]) + 0.1, d: w,
        rot: rot + Math.atan2(c[1] - a[1], c[0] - a[0]), top, tag });
    }
  };
  /** A basin: a white rim along `pts` (a closed outline), water inside at `wy`. */
  const basin = (pts, cx, cz, gy, wy, ry, waterCol, tag) => {
    const ctr = p(cx, cz);
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], c = pts[(k + 1) % pts.length];
      // the water, a fan from the centre, facing up (the order measured on Jaipur's floor)
      const pa = p(a[0], a[1]), pc = p(c[0], c[1]);
      b.tri(ctr[0], wy, ctr[1], pc[0], wy, pc[1], pa[0], wy, pa[1], waterCol);
      // the rim: its top and both faces, double-sided — a curve has no one front
      const ia = [cx + (a[0] - cx) * 0.95, cz + (a[1] - cz) * 0.95], ic = [cx + (c[0] - cx) * 0.95, cz + (c[1] - cz) * 0.95];
      lq2([a[0], ry, a[1]], [c[0], ry, c[1]], [ic[0], ry, ic[1]], [ia[0], ry, ia[1]], C.MARBLE);
      lq2([a[0], gy - 0.05, a[1]], [a[0], ry, a[1]], [c[0], ry, c[1]], [c[0], gy - 0.05, c[1]], C.MARBLE_SH);
      lq2([ia[0], wy, ia[1]], [ia[0], ry, ia[1]], [ic[0], ry, ic[1]], [ic[0], wy, ic[1]], C.MARBLE_SH);
    }
    rimSolid(pts.map((q) => [cx + (q[0] - cx) * 0.975, cz + (q[1] - cz) * 0.975]), ry, tag);
  };
  const tree = (lx, lz, y, s, k) => {
    const g = 0.85 + 0.3 * hash(k);
    box(lx, y, lz, 0.3 * s, 2.2 * s, 0.3 * s, 0x5a4632);
    lathe(lx, lz, [[y + 1.9 * s, 0.4], [y + 2.5 * s, 2.3 * s * g], [y + 3.6 * s, 2.6 * s * g], [y + 4.8 * s, 1.5 * s * g], [y + 5.3 * s, 0.2]], 9,
      (i, sg) => tint(0x46632a, 0.9 + 0.2 * hash(k * 7 + sg)));
    post(lx, lz, 0.28 * s);
  };

  /* ================================================================
   * THE PREM BHAVAN — the Satsang Bhavan, west
   * ================================================================ */
  // "73,000 sq ft, pillar-less, dome-shaped satsang hall ... for 25,000",
  // inaugurated 14 January 2018. The imagery: a shallow dome of about 24 ribs
  // rising to a stepped crown and a gold finial, on a square base with its
  // corners cut, porticos on every side — two curved, red-roofed ones on the
  // west — in a paved plaza with parterres to the east.
  {
    const CX = -164.6, CZ = -88.5, R = 42.5, BH = 9.0, RISE = 22.0;
    const G = ground(-233.9, -102.9, -157.0, -32.0, C.PAVE_LT, 'prem-bhavan-plaza');
    // the base: a 94 m square with 14 m cut off each corner
    const HB = 47, CUT = 14;
    box(CX, G, CZ, HB * 2, BH, (HB - CUT) * 2, C.MARBLE);
    box(CX, G, CZ, (HB - CUT) * 2, BH, HB * 2, C.MARBLE);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const A = [CX + sx * HB, CZ + sz * (HB - CUT)], Bp = [CX + sx * (HB - CUT), CZ + sz * HB];
      const inner = [CX + sx * (HB - CUT), CZ + sz * (HB - CUT)];
      lq2([A[0], G, A[1]], [A[0], G + BH, A[1]], [Bp[0], G + BH, Bp[1]], [Bp[0], G, Bp[1]], C.MARBLE);
      const qa = p(A[0], A[1]), qb = p(Bp[0], Bp[1]), qi = p(inner[0], inner[1]);
      b.tri(qa[0], G + BH, qa[1], qb[0], G + BH, qb[1], qi[0], G + BH, qi[1], tint(0xb8b4ac, 1.0));
      b.tri(qa[0], G + BH, qa[1], qi[0], G + BH, qi[1], qb[0], G + BH, qb[1], tint(0xb8b4ac, 1.0));
    }
    // its roof round the dome, its cornice band, a plinth band, tall windows
    flat(CX - HB, CX + HB, CZ - HB + CUT, CZ + HB - CUT, G + BH + 0.01, 0xb8b4ac);
    flat(CX - HB + CUT, CX + HB - CUT, CZ - HB, CZ + HB, G + BH + 0.012, 0xb8b4ac);
    box(CX, G + BH - 0.9, CZ, HB * 2 + 0.4, 0.5, (HB - CUT) * 2 + 0.4, C.MARBLE_SH);
    box(CX, G + BH - 0.9, CZ, (HB - CUT) * 2 + 0.4, 0.5, HB * 2 + 0.4, C.MARBLE_SH);
    for (const [face, fx, fz, along] of [['N', 0, -HB, 'x'], ['S', 0, HB, 'x'], ['W', -HB, 0, 'z'], ['E', HB, 0, 'z']]) {
      for (let i = 0; i < 9; i++) {
        const u = -(HB - CUT - 3) + i * (2 * (HB - CUT - 3)) / 8;
        const lx = CX + (along === 'x' ? u : fx), lz = CZ + (along === 'x' ? fz : u);
        arch(lx, G + 1.0, lz, 2.4, 6.0, along, tint(C.MARBLE, 1.04), 9, C.GLASS, 0.14);
      }
    }
    solid(CX, CZ, HB * 2, HB * 2);
    // the porticos: two curved red-roofed on the west, two light on the east,
    // red on the north, light on the south
    const portico = (lx, lz, w, d, col) => {
      const PH = 5.0;
      box(lx, G + PH, lz, w, 0.5, d, col);
      box(lx, G + PH - 0.25, lz, w + 0.3, 0.25, d + 0.3, tint(C.MARBLE, 0.9));
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const cx = lx + sx * (w / 2 - 0.5), cz = lz + sz * (d / 2 - 0.5);
        lathe(cx, cz, [[G, 0.32], [G + PH - 0.25, 0.26]], 8, C.MARBLE);
        post(cx, cz, 0.35);
      }
    };
    for (const lz of [-108.5, -70.5]) portico(-225.4, lz, 9, 15, C.ROOF_RED);
    for (const lz of [-108.5, -70.5]) portico(-112.3, lz, 9, 15, C.ROOF_LT);
    portico(-149.0, -144.0, 12, 8, C.ROOF_RED);
    portico(-164.0, -37.0, 24, 9, C.ROOF_LT);
    // the dome: a spherical cap 85 m across, 22 m high, its ribs and panels
    {
      const rho = (R * R + RISE * RISE) / (2 * RISE);
      const phi0 = Math.asin(R / rho);
      const apex = G + BH + RISE;
      const rings = [];
      const NR = 10;
      for (let k = NR; k >= 0; k--) {
        const th = phi0 * k / NR;
        rings.push([apex - rho * (1 - Math.cos(th)), Math.max(0.05, rho * Math.sin(th))]);
      }
      // the panels between the ribs, alternate tints, and a rib at every other seam
      lathe(CX, CZ, rings, 48, (i, s) => (s % 2 === 0 ? C.DOME_SH : tint(C.DOME, 1.0 + 0.04 * Math.cos(s * 0.26))));
      // the crown: a stepped ring of six tiers, and the gold finial
      let y = apex - 0.6;
      for (let t = 0; t < 6; t++) {
        const r0 = 7.2 - t * 1.0;
        lathe(CX, CZ, [[y, r0], [y + 0.45, r0], [y + 0.45, r0 - 0.5]], 24, tint(C.DOME, 1.06 - 0.03 * t));
        y += 0.45;
      }
      lathe(CX, CZ, [[y, 1.2], [y + 0.8, 0.9], [y + 1.6, 0.5], [y + 2.6, 0.25], [y + 3.4, 0.02]], 12, C.GOLD);
    }
  }
  // the parterres east of it: clipped-hedge borders and cross-walks, lawn
  for (const [lz0, lz1] of [[-144.0, -96.0], [-88.0, -33.0]]) {
    const lx0 = -101.9, lx1 = -71.9;
    const g = ground(lx0, lx1, lz0, lz1, C.LAWN, 'prem-parterre');
    for (const [a, c, d, e] of [[lx0, lx1, lz0, lz0 + 0.6], [lx0, lx1, lz1 - 0.6, lz1], [lx0, lx0 + 0.6, lz0, lz1], [lx1 - 0.6, lx1, lz0, lz1]]) {
      box((a + c) / 2, g, (d + e) / 2, c - a, 0.55, e - d, C.HEDGE);
      solid((a + c) / 2, (d + e) / 2, c - a, e - d, { top: g + 0.55 });
    }
    // the scrollwork, in low hedge ribbons
    for (let i = 1; i < 4; i++) {
      const lz = lz0 + i * (lz1 - lz0) / 4;
      box((lx0 + lx1) / 2, g, lz, lx1 - lx0 - 3, 0.35, 0.4, tint(C.HEDGE, 1.1));
    }
    box((lx0 + lx1) / 2, g, (lz0 + lz1) / 2, 0.4, 0.35, lz1 - lz0 - 3, tint(C.HEDGE, 1.1));
  }

  /* ================================================================
   * THE HALL NORTH OF THE FOUNTAIN
   * ================================================================ */
  // "a white roofed hall roughly 87 x 34 m immediately north of the musical
  // fountain" (the checker). Its use is not recorded; its height is inferred.
  {
    const lx0 = -44.9, lx1 = 41.1, lz0 = -156.7, lz1 = -122.3, H = 8.5, RISE = 3.2;
    const g = topOf(lx0, lx1, lz0, lz1, 4) + 0.3;
    const mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2, W = lx1 - lx0, D = lz1 - lz0;
    box(mx, g - 0.4, mz, W, H + 0.4, D, C.CREAM);
    solid(mx, mz, W, D);
    // the vaulted white roof, its ridge along the hall
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
      const z0 = mz - Math.cos(a0) * D / 2, z1 = mz - Math.cos(a1) * D / 2;
      const y0 = g + H + Math.sin(a0) * RISE, y1 = g + H + Math.sin(a1) * RISE;
      lq2([lx0, y0, z0], [lx1, y0, z0], [lx1, y1, z1], [lx0, y1, z1], tint(C.HALL_ROOF, 0.94 + 0.06 * Math.sin(a0)));
    }
    for (const lx of [lx0, lx1]) for (let i = 0; i < N; i++) {
      const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
      lq2([lx, g + H, mz], [lx, g + H + Math.sin(a0) * RISE, mz - Math.cos(a0) * D / 2], [lx, g + H + Math.sin(a1) * RISE, mz - Math.cos(a1) * D / 2], [lx, g + H, mz], C.HALL_ROOF);
    }
    // doors and a colonnade on the south face, onto the fountain
    for (let i = 0; i < 14; i++) {
      const lx = lx0 + 3 + i * (W - 6) / 13;
      lathe(lx, lz1 + 1.6, [[g, 0.3], [g + 6.2, 0.26]], 8, C.MARBLE);
      post(lx, lz1 + 1.6, 0.32);
      if (i % 3 === 1) panel(lx + 3.1, g + 1.6, lz1 + 0.02, 2.4, 3.2, 'S', 0x5a4030);
    }
    box(mx, g + 6.2, lz1 + 1.6, W - 4, 0.5, 3.6, C.MARBLE);
    flat(lx0, lx1, lz1, lz1 + 3.4, g + 0.01, C.PAVE_LT);
    solid(mx, lz1 + 1.7, W, 3.4, { top: g, tag: 'prem-hall-porch', standOnly: true });
  }

  /* ================================================================
   * THE MUSICAL FOUNTAIN, and its show
   * ================================================================ */
  const FX = -1.9, FZ = -87.3;
  const meshes = [];
  {
    // the ornamental ground round it, green, and the red-paved vesica
    const FG = ground(-49.9, 45.1, -118.0, -49.0, C.LAWN, 'prem-fountain-garden');
    const VL = 42.0, VW = 18.0, BAND = 5.0;
    const ev = (VL * VL - VW * VW) / (2 * VW), Rv = ev + VW;
    const halfW = (u, s = 1) => Math.max(0, Math.sqrt(Math.max(0, (Rv * s) ** 2 - u * u)) - ev * s);
    const VX = (-43.9 + 40.1) / 2;
    const NV = 56;
    for (let i = 0; i < NV; i++) {
      const u0 = (i / NV) * 2 * VL - VL, u1 = ((i + 1) / NV) * 2 * VL - VL, um = (u0 + u1) / 2;
      const hw = halfW(um);
      if (hw < 0.3) continue;
      // the red band: the outer vesica less an inner one BAND narrower
      const hi = Math.max(0, hw - BAND);
      for (const s of [-1, 1]) {
        const a = FZ + s * hi, c = FZ + s * hw;
        flat(VX + u0, VX + u1, Math.min(a, c), Math.max(a, c), FG + 0.03, tint(C.PAVE, 0.96 + 0.06 * hash(i + s)));
      }
    }
    // the white elliptical basin and its inner pool
    const BA = 20.5, BB = 11.25, NE = 48;
    const ell = [];
    for (let k = 0; k < NE; k++) { const t = (k / NE) * Math.PI * 2; ell.push([FX + BA * Math.cos(t), FZ + BB * Math.sin(t)]); }
    basin(ell, FX, FZ, FG, FG + 0.42, FG + 0.62, C.WATER, 'prem-fountain');
    box(FX, FG + 0.4, FZ, 30.8, 0.06, 17.8, C.MARBLE);
    box(FX, FG + 0.41, FZ, 30.0, 0.06, 17.0, C.WATER_DEEP);
    // the tableau on the garden's north side, read as the Govardhan leela by
    // its form: a rocky hill held up, cows and herders round it (inferred)
    {
      const GX = 3.1, GZ = -111.5;
      lathe(GX, GZ, [[FG, 6.5], [FG + 2.5, 5.5], [FG + 4.5, 3.8], [FG + 6.0, 1.6], [FG + 6.6, 0.2]], 11, (i, s) => tint(i % 2 ? C.ROCK : C.ROCK2, 0.92 + 0.12 * hash(s)));
      solid(GX, GZ, 11.0, 9.0);
      box(GX + 4.5, FG, GZ + 3.5, 0.5, 1.7, 0.4, C.KRISHNA);
      box(GX + 4.5, FG + 1.7, GZ + 3.5, 0.08, 1.6, 0.08, C.KRISHNA);
      for (let i = 0; i < 4; i++) box(GX - 4 + i * 2.6, FG, GZ + 5.4, 0.55, 0.65, 1.3, 0xe4dccc, hash(i) * 0.6);
    }
    // THE SHOW: four sets of jets in the inner pool and round the basin, each
    // its own mesh so FountainShow can raise and colour them in its hours
    const WY = FG + 0.42;
    for (let k = 0; k < 4; k++) {
      const jb = new MeshBuilder();
      const jet = (lx, lz, h, r) => {
        const q = p(lx, lz);
        // a plume of spray, drawn from the water's surface: a narrow throat
        // that opens as it climbs and falls back round its own crown
        const prof = [[0, r], [0.35, r * 1.3], [0.7, r * 2.6], [0.9, r * 3.2], [1.0, r * 1.2]];
        for (let i = 1; i < prof.length; i++) {
          const [f0, r0] = prof[i - 1], [f1, r1] = prof[i];
          for (let s = 0; s < 8; s++) {
            const a0 = s / 8 * Math.PI * 2, a1 = (s + 1) / 8 * Math.PI * 2;
            const P = (a, rr, f) => [q[0] + Math.cos(a) * rr, WY + f * h, q[1] + Math.sin(a) * rr];
            jb.quad(P(a0, r0, f0), P(a0, r1, f1), P(a1, r1, f1), P(a1, r0, f0), C.JET);
            jb.quad(P(a1, r0, f0), P(a1, r1, f1), P(a0, r1, f1), P(a0, r0, f0), C.JET);
          }
        }
      };
      if (k === 0) for (let i = 0; i < 9; i++) jet(FX - 12 + i * 3, FZ, 7.5, 0.22);                  // the centre line, tallest
      if (k === 1) for (let i = 0; i < 8; i++) for (const s of [-1, 1]) jet(FX - 10.5 + i * 3, FZ + s * 4.5, 4.5, 0.16);
      if (k === 2) for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; jet(FX + 18.6 * Math.cos(t), FZ + 9.9 * Math.sin(t), 3.0, 0.14); }
      if (k === 3) for (const s of [-1, 1]) jet(FX + s * 14.5, FZ, 10.0, 0.3);                       // the two tall ones at the ends
      const c = p(FX, FZ);
      meshes.push({ name: 'Show:prem:' + k, builder: jb, x: c[0], z: c[1], r: 30, show: { base: WY, group: k, x: c[0], z: c[1] } });
    }
  }
  // the red avenue east of the fountain, from the hall to the plaza
  {
    const g = ground(43.7, 54.2, -122.3, -48.2, C.PAVE, 'prem-north-avenue', 0.08);
    for (let i = 0; i < 12; i++) {
      const lz = -119 + i * 6;
      const q = p(48.95, lz);
      b.box(q[0], g + 0.005, q[1], 2.4, 0.02, 0.4, C.INLAY, rot + Math.PI / 4);
      b.box(q[0], g + 0.005, q[1], 2.4, 0.02, 0.4, C.INLAY, rot - Math.PI / 4);
    }
  }

  /* ================================================================
   * THE SOUTH GARDEN, THE GATE, THE ROAD
   * ================================================================ */
  // "South of the platform, three long garden beds and ... red-paved
  // processional" avenues "run ~70 m from the platform to the main gate on
  // the road": measured, two avenues 12 and 9.6 m wide between three beds.
  {
    const Z0 = 46.2, Z1 = 98.0;
    for (const [lx0, lx1] of [[-21.9, -9.9], [4.5, 14.1]]) {
      const g = ground(lx0, lx1, Z0, Z1 + 12.0, C.PAVE, 'prem-south-avenue', 0.08);
      // white marble cross-bands in a diamond lattice
      for (let lz = Z0 + 3; lz < Z1 + 10; lz += 5) {
        const q = p((lx0 + lx1) / 2, lz);
        b.box(q[0], g + 0.005, q[1], (lx1 - lx0) * 0.9, 0.02, 0.35, C.INLAY, rot + 0.7);
        b.box(q[0], g + 0.005, q[1], (lx1 - lx0) * 0.9, 0.02, 0.35, C.INLAY, rot - 0.7);
      }
    }
    for (const [lx0, lx1, k] of [[-47.9, -21.9, 0], [-9.9, 4.5, 1], [14.1, 36.1, 2]]) {
      const g = ground(lx0, lx1, Z0, Z1, C.LAWN2, 'prem-south-bed');
      // a low clipped hedge round each bed, and round floral motifs in it
      for (const [a, c, d, e] of [[lx0, lx1, Z0, Z0 + 0.5], [lx0, lx1, Z1 - 0.5, Z1], [lx0, lx0 + 0.5, Z0, Z1], [lx1 - 0.5, lx1, Z0, Z1]]) {
        box((a + c) / 2, g, (d + e) / 2, c - a, 0.45, e - d, C.HEDGE);
      }
      solid((lx0 + lx1) / 2, (Z0 + Z1) / 2, lx1 - lx0, Z1 - Z0, { top: g + 0.45 });   // the bed is looked at, not walked in
      const n = Math.max(3, Math.round((lx1 - lx0) / 8));
      for (let i = 0; i < n; i++) for (let j = 0; j < 5; j++) {
        const lx = lx0 + (i + 0.5) * (lx1 - lx0) / n, lz = Z0 + 5 + j * 10;
        if (k === 0 && lx < -36 && lz > 58 && lz < 76) continue;     // the pool
        lathe(lx, lz, [[g + 0.02, 1.6], [g + 0.18, 1.4], [g + 0.2, 0.2]], 10, (i2, s) => (s % 2 ? C.FLOWER_R : C.FLOWER_Y));
      }
    }
    // the small oval pool in the west bed, a dark red figure at its middle
    // (unidentified)
    {
      const PX = -40.9, PZ = 66.5, gy = topOf(-44, -38, 61, 72, 2) + 0.06;
      const ov = [];
      for (let k = 0; k < 28; k++) { const t = k / 28 * Math.PI * 2; ov.push([PX + 3.2 * Math.cos(t), PZ + 5.4 * Math.sin(t)]); }
      basin(ov, PX, PZ, gy, gy + 0.3, gy + 0.5, C.WATER, 'prem-pool-small');
      lathe(PX, PZ, [[gy + 0.3, 1.2], [gy + 0.9, 0.9], [gy + 1.5, 0.3]], 8, 0x6a1a1e);
    }
    // the gate: an ornate white marble gateway on the road. A great cusped
    // arch, a red band in its soffit, side bays with blue-painted grilles,
    // peacocks on its shoulders, gold gates; at night its arch is outlined
    // in red neon and its side bays in blue (the survey), drawn here as the
    // painted bands the daylight photograph shows (the checker).
    {
      const GX = -5.2, GZ = 113.0, gy = topOf(-25, 19, 104, 122, 4) + 0.08;
      ground(-24.9, 19.1, 98.0, 124.0, C.PAVE, 'prem-gate-floor', 0.08);
      const W = 27.4, D = 5.0, H = 11.0;
      // the piers either side of the central arch, and the side bays' walls
      for (const s of [-1, 1]) {
        box(GX + s * 5.2, gy, GZ, 3.4, H, D, C.MARBLE);
        solid(GX + s * 5.2, GZ, 3.4, D);
        box(GX + s * 11.2, gy, GZ, 5.0, H - 2.0, D, tint(C.MARBLE, 0.97));
        solid(GX + s * 11.2, GZ, 5.0, D);
        arch(GX + s * 11.2, gy + 0.4, GZ + D / 2 + 0.02, 3.6, 5.8, 'x', tint(C.MARBLE, 1.06), 9, null, 0.2);
        for (let i = 0; i < 9; i++) box(GX + s * 11.2 - 1.6 + i * 0.4, gy + 0.4, GZ + D / 2 + 0.06, 0.06, 3.0, 0.06, C.BLUE_GRILLE);
        // a peacock on each shoulder
        box(GX + s * 5.2, gy + H, GZ, 0.7, 0.9, 1.4, C.PEACOCK);
        box(GX + s * 5.2, gy + H + 0.9, GZ - 0.4, 0.3, 0.7, 0.3, C.PEACOCK);
        lathe(GX + s * 5.2, GZ + 1.0, [[gy + H + 0.2, 0.3], [gy + H + 1.2, 1.1], [gy + H + 1.7, 0.1]], 10, (i2, sg) => (sg % 2 ? 0x1f8a5a : 0x2a5ab0));
        // the gold gates, swung open
        box(GX + s * 3.0, gy, GZ + 1.8, 1.4, 4.2, 0.12, C.GOLD, s * 1.1);
      }
      // the central arch: open, its cusped head, the red band in its soffit
      box(GX, gy + 8.0, GZ, 7.0, H - 8.0, D, C.MARBLE);
      arch(GX, gy, GZ + D / 2 + 0.02, 7.0, 8.0, 'x', tint(C.MARBLE, 1.08), 11, null, 0.3);
      arch(GX, gy, GZ - D / 2 - 0.02, 7.0, 8.0, 'x', tint(C.MARBLE, 1.08), 11, null, 0.3);
      // the masonry round its head, and the red band painted along the soffit
      archFill(GX, GZ, 7.0, gy, 8.0, gy + 8.0, 'x', -D / 2, D / 2, C.MARBLE, 11);
      archFill(GX, GZ, 6.7, gy, 7.8, gy + 7.8, 'x', -D / 2 + 0.1, D / 2 - 0.1, 0xc8302a, 11);
      // the cornice and the crown of little domes
      box(GX, gy + H, GZ, W + 0.6, 0.4, D + 0.6, tint(C.MARBLE, 0.92));
      for (const s of [-1, 0, 1]) {
        lathe(GX + s * 9.0, GZ, [[gy + H + 0.4, 1.3], [gy + H + 1.2, 1.25], [gy + H + 2.2, 0.8], [gy + H + 2.8, 0.1]], 12, C.MARBLE);
        lathe(GX + s * 9.0, GZ, [[gy + H + 2.8, 0.12], [gy + H + 3.6, 0.03]], 6, C.GOLD);
      }
    }
  }

  /* ================================================================
   * THE KALIYA NAAG POOL, south-west
   * ================================================================ */
  // "the peanut-shaped pool with a red-orange object in the south-west —
  // consistent with the Kaliya Naag sthali" (the checker); at z19 the object
  // is a red-orange figure at the pool's waist. Krishna dances on the
  // serpent's hoods.
  {
    const KX = -109.9, KZ = 99.5, A = 22.0, B = 11.5;
    const gy = ground(-136, -84, 84, 116, C.PAVE_LT, 'prem-kaliya-paving');
    const pts = [];
    for (let k = 0; k < 56; k++) {
      const t = k / 56 * Math.PI * 2;
      pts.push([KX + A * Math.cos(t), KZ + B * Math.sin(t) * (0.62 + 0.38 * Math.cos(t) ** 2)]);
    }
    basin(pts, KX, KZ, gy, gy + 0.35, gy + 0.65, C.POOL_GREEN, 'prem-kaliya');
    // the serpent: coils above the water, five hoods raised, Krishna on them
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      box(KX + Math.cos(a) * 2.4, gy + 0.35, KZ + Math.sin(a) * 1.5, 1.4, 0.55, 0.7, C.SERPENT, a);
    }
    lathe(KX, KZ, [[gy + 0.35, 0.8], [gy + 2.4, 0.55], [gy + 3.0, 0.4]], 8, C.SERPENT);
    for (let i = 0; i < 5; i++) box(KX - 0.9 + i * 0.45, gy + 3.0, KZ - 0.2, 0.42, 0.7, 0.3, tint(C.SERPENT, 1.05), (i - 2) * 0.15);
    box(KX, gy + 3.7, KZ, 0.45, 1.2, 0.3, C.KRISHNA);
    box(KX, gy + 4.9, KZ, 0.26, 0.3, 0.26, C.KRISHNA);
    box(KX + 0.2, gy + 4.5, KZ, 0.5, 0.06, 0.06, 0x8a6a3a, 0.3);
  }

  /* ================================================================
   * THE REST OF THE CAMPUS, plainly
   * ================================================================ */
  // the three white guest blocks to the south-west, and the low building and
  // lawn south of the Prem Bhavan (none described: their heights inferred)
  const block = (lx0, lx1, lz0, lz1, H, floors) => {
    const g = topOf(lx0, lx1, lz0, lz1, 3);
    const mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2;
    box(mx, g - 0.3, mz, lx1 - lx0, H + 0.3, lz1 - lz0, C.GUEST);
    box(mx, g + H, mz, lx1 - lx0 + 0.4, 0.8, lz1 - lz0 + 0.4, tint(C.GUEST, 0.92));
    solid(mx, mz, lx1 - lx0, lz1 - lz0);
    for (let f = 0; f < floors; f++) {
      const y = g + 1.6 + f * (H - 1.2) / floors;
      for (const [face, lz, along] of [['N', lz0 - 0.02, 'x'], ['S', lz1 + 0.02, 'x']]) {
        for (let i = 0; i < Math.floor((lx1 - lx0) / 3.2); i++) panel(lx0 + 1.6 + i * 3.2, y + 0.8, lz, 1.2, 1.4, face, C.GLASS);
      }
    }
  };
  block(-231.9, -200.0, 25.0, 84.0, 15.0, 5);
  block(-195.0, -153.0, 25.0, 84.0, 15.0, 5);
  block(-145.0, -79.0, 25.0, 80.0, 15.0, 5);
  block(-137.0, -79.0, -24.0, 19.0, 9.0, 2);
  ground(-233.9, -144.9, -27.0, 20.0, C.LAWN, 'prem-west-lawn');

  // the campus walls on the west and north, and the north half of the east,
  // where the town presses against it
  {
    const wall = (lx0, lz0, lx1, lz1) => {
      const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
      const mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2;
      const g = Math.max(tH(lx0, lz0), tH(lx1, lz1), tH(mx, mz));
      box(mx, g - 0.3, mz, L, 2.7, 0.45, C.WALL, ang);
      box(mx, g + 2.4, mz, L + 0.2, 0.15, 0.6, tint(C.WALL, 0.9), ang);
      const q = p(mx, mz);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: L, d: 0.45, rot: rot + ang });
    };
    wall(-237.0, -163.0, -237.0, 120.0);
    wall(-237.0, -163.0, 57.0, -163.0);
    wall(57.0, -163.0, 57.0, -49.0);
  }

  return { meshes };
}
