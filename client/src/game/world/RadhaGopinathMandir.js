/**
 * SHRI RADHA GOPINATH MANDIR, Gopinath Ghera — the ruin of c.1589 (U.P.
 * state monument S-UP-88) and the working temple of c.1821 that blocks its
 * north side, where the deities are worshipped.
 *
 * Built from docs/research/radha-gopinath.md, the survey and its checker,
 * where the checker overrules the survey. What stood here was a truncated
 * mass with an arcade at the OSM node, 40 m from the ruin.
 *
 * WHERE: the OSM node (27.58605 / 77.69962, the survey: +-30 m) sits at the
 * north edge of the haveli temple. ESRI z19 imagery (MEASUREMENT only) puts
 * the red ruin ~40 m south-south-west of it, x -25..-8, z 31..46 in this
 * frame, with a grassed court on its east and the haveli — "the north side is
 * blocked by the modern temple" (Growse) — between it and the node. A court
 * of ~13 x 14 m inside the haveli is the survey's measured one.
 *
 * THE FRAME: rot 0, +lx EAST, +lz SOUTH, origin the node.
 *
 * THE RUIN, as Growse has it and the photographs: "the nave has entirely
 * disappeared; the three towers have been levelled with the roof" (1883) —
 * the choir and sanctum in a row, east-facing, a chapel off the sanctum's
 * south, the "curious arcade of three bracket arches" screening the south
 * wall on its carved terrace, "a fine boldly moulded plinth", the
 * bracket-and-rosette cornice. Its plan takes Madan Mohan's dimensions on
 * Growse's word that it "corresponds very closely both in style and
 * dimensions". OVER THE SANCTUM a complete curvilinear spire stands today
 * (the checker: two photographs, one before the court was paved), with corner
 * shringas to ~60 per cent of its height and a tall spiky finial; beside it,
 * over the choir, a broken grass-grown mass. Its height is ESTIMATED.
 *
 * INFERRED, said so: the haveli's plan and its darshan arch on the court's
 * west side; the door from its court into the ruin's; the lane to the street.
 * Unresolved (the checker): whether the arch on the lane is the choir's front
 * or the court's gateway. It is built as the choir's front.
 */

const C = {
  STONE: 0x8f6861,      // 16th-c sandstone, east front, sun (MEASURED, 2021)
  ARCHV: 0x8f6256,      // its archivolt
  LOWER: 0xa0897d,      // the sunlit lower wall
  RUBBLE: 0x797269,     // the broken core: a warm grey
  SPIRE: 0xc27d79, SPIRE_LT: 0xca938b,   // the standing spire (2023)
  BRACKET: 0x71362b,    // the cornice band in shade
  GRASS: 0x6b7c3b, LAWN: 0x748a40,
  SALMON: 0xdba175, WHITE: 0xe8e6db, EAVE: 0x88522a, OXIDE: 0xab5957,
  MARBLE: 0xe6e0d0, BLACK: 0x2e2c2b, DARK: 0x1d1510, IRON: 0x2a2826, WOOD: 0x4a3020,
  BLUE: 0x2a5aa8, NET: 0x55595c, BRICK: 0x9a5a48, GOLD: 0xc9a227,
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function buildRadhaGopinathMandir(o) {
  const { b, loc, ground, terrain, colliders } = o;
  const { cuspedArch, tint, buildDeities } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : ground; };
  const topOf = (lx0, lx1, lz0, lz1, n = 3) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) hi = Math.max(hi, tH(lx0 + (lx1 - lx0) * i / n, lz0 + (lz1 - lz0) * j / n));
    return hi;
  };
  const lq = (A, B, Cq, D, col) => {
    const a = p(A[0], A[2]), bb = p(B[0], B[2]), c = p(Cq[0], Cq[2]), d = p(D[0], D[2]);
    b.quad([a[0], A[1], a[1]], [bb[0], B[1], bb[1]], [c[0], Cq[1], c[1]], [d[0], D[1], d[1]], col);
  };
  const lq2 = (A, B, Cq, D, col) => { lq(A, B, Cq, D, col); lq(D, Cq, B, A, col); };
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
  const course = (base, k) => (hash(k) < 0.2 ? tint(base, 1.08) : hash(k) > 0.85 ? tint(base, 0.86) : tint(base, 0.95 + 0.08 * hash(k + 3)));
  const coursed = (lx, lz, w, d, y0, y1, base, k0, H = 0.55) => { let i = 0; for (let y = y0; y < y1 - 1e-3; y += H, i++) box(lx, y, lz, w, Math.min(H, y1 - y), d, course(base, k0 + i)); };

  /* ================================================================
   * THE RUIN
   * ================================================================ */
  const yR = topOf(-27, 12, 30, 48, 4);
  const FLR = yR + 1.5;                 // "a fine boldly moulded plinth": five members
  const CORN = FLR + 6.6;               // the wall head
  const S = { lx: -20.6, lz: 38.2 }, K = { lx: -12.9, lz: 38.2 }, HW = 3.8;   // sanctum, choir: 7.6 m outside
  const EF = K.lx + HW;                 // the choir's east front, lx -9.1
  {
    // the plinth's five members: base course, torus, fillet, lotus-bud dentils, top fillet
    const X0 = S.lx - HW - 0.5, X1 = EF + 0.5, Z0 = S.lz - HW - 0.5, Z1 = S.lz + HW + 0.5;
    const M = [[0.55, 0.5, C.LOWER], [0.4, 0.62, tint(C.LOWER, 1.06)], [0.12, 0.42, C.STONE], [0.25, 0.47, tint(C.STONE, 0.9)], [0.18, 0.4, tint(C.STONE, 1.05)]];
    let y = yR - 0.1;
    for (const [h, out, col] of M) {
      box((X0 + X1) / 2, y, (Z0 + Z1) / 2, X1 - X0 + out * 0.5, h, Z1 - Z0 + out * 0.5, col);
      y += h;
    }
    for (let i = 0; i < 40; i++) {
      const lx = X0 + 0.2 + i * (X1 - X0 - 0.4) / 39;
      panel(lx, yR + 1.18, Z1 + 0.12, 0.12, 0.16, 'S', tint(C.STONE, 1.2));
    }
    // solid to the wall faces; on the east only to the front, so the flight
    // lands on a threshold before the gate
    solid((X0 + EF) / 2, (Z0 + Z1) / 2, EF - X0, Z1 - Z0 + 0.3, { top: CORN + 1.0 });
    box(EF + 0.25, FLR - 0.2, S.lz, 0.5, 0.2, 2.6, tint(C.LOWER, 1.02));
    solid(EF + 0.25, S.lz, 0.5, 2.6, { top: FLR, tag: 'rg-threshold', floor: true });
    // the sanctum and the choir: plain ashlar fields, a projecting bhadra in the
    // middle of each face, clustered colonnettes at the angles
    for (const [cx, k] of [[S.lx, 0], [K.lx, 1]]) {
      coursed(cx, S.lz, HW * 2, HW * 2, FLR, CORN, C.STONE, 100 * (k + 1));
      for (const [dx, dz, w, d] of [[0, -HW - 0.18, 2.6, 0.36], [0, HW + 0.18, 2.6, 0.36], [-HW - 0.18, 0, 0.36, 2.6]]) {
        if (k === 1 && dx < 0) continue;
        coursed(cx + dx, S.lz + dz, w, d, FLR, CORN - 0.2, C.STONE, 200 * (k + 1) + dx * 3 + dz);
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        for (const off of [0, 0.22]) lathe(cx + sx * (HW - off), S.lz + sz * (HW - (0.22 - off)), [[FLR, 0.1], [CORN - 0.3, 0.1]], 8, tint(C.STONE, 1.08));
      }
      // the mid band: a string course, a recessed panel band, a dentil course
      box(cx, FLR + 3.4, S.lz, HW * 2 + 0.2, 0.18, HW * 2 + 0.2, tint(C.STONE, 1.06));
      box(cx, FLR + 3.75, S.lz, HW * 2 + 0.12, 0.12, HW * 2 + 0.12, tint(C.STONE, 0.84));
      // the crowning cornice: the eave on a dense row of flat rosettes and short
      // spacers, small pointed merlons along its edge (the checker, 2023)
      box(cx, CORN, S.lz, HW * 2 + 0.6, 0.65, HW * 2 + 0.6, C.BRACKET);
      for (let i = 0; i < 12; i++) {
        const u = -HW + 0.3 + i * (2 * HW - 0.6) / 11;
        panel(cx + u, CORN + 0.33, S.lz + HW + 0.31, 0.38, 0.38, 'S', tint(C.STONE, 1.2));
        panel(cx + u, CORN + 0.33, S.lz - HW - 0.31, 0.38, 0.38, 'N', tint(C.STONE, 1.2));
      }
      box(cx, CORN + 0.65, S.lz, HW * 2 + 0.9, 0.18, HW * 2 + 0.9, tint(C.STONE, 1.02));
      for (let i = 0; i < 14; i++) for (const sz of [-1, 1]) {
        const q = p(cx - HW - 0.3 + i * (2 * HW + 0.6) / 13, S.lz + sz * (HW + 0.4));
        b.prism(q[0], CORN + 0.83, q[1], 0.2, 0.2, 0.02, 0.02, 0.28, tint(C.STONE, 1.05), rot);
      }
    }
    // a doorway breached in the sanctum's west face, bricked (1883: dark openings)
    panel(S.lx - HW - 0.37, FLR + 1.3, S.lz, 1.2, 2.2, 'W', C.BRICK);
  }
  // the choir's east front: the great lancet arch over a square-headed door
  {
    const SPR = FLR + 3.1, AH = 6.0, AW = 4.2;     // the arch: straight-sided to a sharp point
    // the outer archivolt, a broad plain band, in straight segments
    const pts = [];
    const N = 10;
    for (let i = 0; i <= N; i++) {
      const t = i / N, side = t < 0.5 ? -1 : 1, u = t < 0.5 ? t * 2 : (1 - t) * 2;   // u: 0 at the springing, 1 at the point
      pts.push([side * (AW / 2) * (1 - u * 0.999), SPR + (AH - 3.1) * Math.pow(u, 0.9)]);
    }
    for (let i = 0; i < N; i++) {
      const [z0, y0] = pts[i], [z1, y1] = pts[i + 1];
      const o0 = [z0 * 1.18, y0 + 0.35], o1 = [z1 * 1.18, y1 + 0.35];
      lq2([EF + 0.08, y0, K.lz + z0], [EF + 0.08, o0[1], K.lz + o0[0]], [EF + 0.08, o1[1], K.lz + o1[0]], [EF + 0.08, y1, K.lz + z1], tint(C.ARCHV, i % 2 ? 1.05 : 0.95));
      // the saw-tooth fringe of small daggers along the intrados
      for (let k = 0; k < 2; k++) {
        const t = (k + 0.5) / 2, zm = z0 + (z1 - z0) * t, ym = y0 + (y1 - y0) * t;
        lq2([EF + 0.07, ym - 0.1, K.lz + zm * 0.97], [EF + 0.07, ym + 0.1, K.lz + zm * 0.97], [EF + 0.07, ym, K.lz + zm * 0.86], [EF + 0.07, ym, K.lz + zm * 0.86], tint(C.ARCHV, 1.12));
      }
    }
    // the tympanum, recessed, with a lotus boss at the apex and arabesque bands
    lq2([EF + 0.04, SPR, K.lz - AW / 2], [EF + 0.04, FLR + AH - 0.1, K.lz], [EF + 0.04, FLR + AH - 0.1, K.lz], [EF + 0.04, SPR, K.lz + AW / 2], tint(C.STONE, 0.78));
    panel(EF + 0.06, FLR + AH - 0.9, K.lz, 0.5, 0.5, 'E', tint(C.STONE, 1.22));
    for (let k = 0; k < 3; k++) panel(EF + 0.06, SPR + 0.6 + k * 0.5, K.lz, AW * (0.8 - k * 0.2), 0.14, 'E', tint(C.STONE, 1.1));
    // the square-headed doorway inside it, moulded jambs, a carved lintel, an iron gate
    panel(EF + 0.07, FLR + 1.2, K.lz, 1.5, 2.4, 'E', C.DARK);
    for (let i = 0; i <= 7; i++) box(EF + 0.14, FLR, K.lz - 0.7 + i * 0.2, 0.04, 2.4, 0.04, C.IRON);
    box(EF + 0.1, FLR + 2.4, K.lz, 0.16, 0.3, 2.1, tint(C.STONE, 1.1));
    for (const s of [-1, 1]) box(EF + 0.1, FLR, K.lz + s * 0.9, 0.16, 2.4, 0.22, tint(C.STONE, 1.08));
    // flanking pilaster strips; a small cusped niche to the right
    for (const s of [-1, 1]) box(EF + 0.1, FLR, K.lz + s * (AW / 2 + 0.6), 0.16, CORN - FLR, 0.4, tint(C.STONE, 1.05));
    arch(EF + 0.06, FLR + 0.9, K.lz + AW / 2 + 1.25, 0.6, 1.1, 'z', tint(C.STONE, 1.08), 5, tint(C.STONE, 0.55), 0.06);
    // the rough steps up from the court (four or five, the checker), here six
    // risers so none is more than a step, to the threshold at the gate
    for (let st = 0; st < 5; st++) {
      const lx = EF + 0.5 + 0.225 + (4 - st) * 0.45, top = yR + (FLR - yR) * (st + 1) / 6;
      box(lx, yR - 0.1, K.lz, 0.45, top - yR + 0.1, 2.6, tint(C.LOWER, 0.9 + 0.08 * hash(st)));
      solid(lx, K.lz, 0.45, 2.6, { top, tag: 'rg-steps', standOnly: true });
    }
    // the U.P. Tourism plaque on a carved balustrade with lotus-bud posts; the
    // blue Directorate of Archaeology board; a leaning pole and its cables
    const BX = EF + 4.2;
    box(BX, yR, K.lz - 2.6, 0.3, 0.8, 1.8, tint(C.LOWER, 1.05));
    for (const s of [-1, 1]) { box(BX, yR + 0.8, K.lz - 2.6 + s * 0.85, 0.16, 0.25, 0.16, tint(C.LOWER, 1.1)); }
    panel(BX + 0.16, yR + 0.55, K.lz - 2.6, 1.2, 0.5, 'E', 0xe9e2cf);
    box(BX - 0.4, yR, K.lz + 2.9, 0.08, 1.6, 0.08, C.IRON);
    panel(BX - 0.35, yR + 1.75, K.lz + 2.9, 1.3, 0.8, 'E', C.BLUE);
    box(BX + 1.3, yR, K.lz + 3.6, 0.22, 7.0, 0.22, 0x7a7a74, 0.12);
    post(BX + 1.3, K.lz + 3.6, 0.2);
    for (const dz of [-0.5, 0.2]) {
      box((BX + 1.3 + EF) / 2, FLR + 3.0 + dz, K.lz + 1.4, BX + 1.3 - EF, 0.02, 0.02, 0x1a1a1a, Math.atan2(-2.2, BX + 1.3 - EF));
    }
  }
  // over the choir: the broken mass, its facing gone, grass in its core
  {
    const y = CORN + 0.83;
    for (const [w, h, dx] of [[7.2, 0.7, 0], [5.8, 0.55, -0.3], [4.1, 0.5, 0.4], [2.2, 0.35, -0.2]]) {
      const yy = y + [0, 0.7, 1.25, 1.75][[7.2, 5.8, 4.1, 2.2].indexOf(w)];
      box(K.lx + dx, yy, S.lz + dx * 0.5, w, h, w * 0.92, tint(C.RUBBLE, 0.92 + 0.12 * hash(w)));
    }
    for (let i = 0; i < 12; i++) {
      const a = hash(i * 3.3) * Math.PI * 2, r = 0.6 + 2.6 * hash(i * 5.1);
      const q = p(K.lx + Math.cos(a) * r, S.lz + Math.sin(a) * r);
      b.prism(q[0], y + 0.6 + 1.2 * hash(i), q[1], 0.6, 0.6, 0.15, 0.15, 0.5 + 0.4 * hash(i * 2), i % 2 ? C.GRASS : 0x5d6e30, rot + i);
    }
  }
  /*
   * OVER THE SANCTUM, the spire that stands today: a broad curvilinear latina
   * on the square plan, its central lata band projecting, a spine of bosses up
   * it, corner shringas to ~60 per cent of its height, and a tall multi-tiered
   * spiky finial clear of its neck (the checker, against the survey's "small
   * spirelets" and "modest kalash").
   */
  {
    const y0 = CORN + 0.83, H = 6.6;
    const half = (t) => (HW - 0.3) * (1 - 0.62 * Math.pow(t, 1.35));   // a parabolic profile
    const STEPS = 14;
    // the outline at height t: a square with a projecting middle third on each face
    const outline = (t) => {
      const h = half(t), b2 = h * 0.33, pr = 0.32 * (1 - t * 0.6);
      return [[-h, -h], [-b2, -h], [-b2, -h - pr], [b2, -h - pr], [b2, -h], [h, -h], [h, -b2], [h + pr, -b2], [h + pr, b2], [h, b2],
        [h, h], [b2, h], [b2, h + pr], [-b2, h + pr], [-b2, h], [-h, h], [-h, b2], [-h - pr, b2], [-h - pr, -b2], [-h, -b2]];
    };
    let lo = outline(0);
    for (let i = 1; i <= STEPS; i++) {
      const t = i / STEPS, hi = outline(t), ya = y0 + H * (i - 1) / STEPS, yb = y0 + H * t;
      for (let s = 0; s < 20; s++) {
        const n = (s + 1) % 20;
        // these points run counter-clockwise in (lx, lz), so lo-hi-hi-lo faces out
        lq([S.lx + lo[s][0], ya, S.lz + lo[s][1]], [S.lx + hi[s][0], yb, S.lz + hi[s][1]], [S.lx + hi[n][0], yb, S.lz + hi[n][1]], [S.lx + lo[n][0], ya, S.lz + lo[n][1]],
          i % 3 === 0 ? C.SPIRE_LT : tint(C.SPIRE, 0.94 + 0.08 * hash(i * 7 + s)));
      }
      lo = hi;
    }
    // the cap of the shaft, and the spine of small bosses up each lata
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 10, h = half(t) + 0.32 * (1 - t * 0.6) + 0.05, a = k * Math.PI / 2;
        box(S.lx + Math.cos(a) * h, y0 + H * t, S.lz + Math.sin(a) * h, 0.26, 0.24, 0.26, C.SPIRE_LT);
      }
    }
    const yN = y0 + H;
    lathe(S.lx, S.lz, [[yN, half(1) * 1.1], [yN + 0.12, half(1) * 1.15], [yN + 0.25, 1.0], [yN + 0.45, 0.85]], 16, tint(C.SPIRE, 1.04));
    // the finial: tiers of rings and spikes, tall and conspicuous
    lathe(S.lx, S.lz, [[yN + 0.45, 0.8], [yN + 0.65, 1.05], [yN + 0.85, 1.05], [yN + 1.0, 0.6], [yN + 1.25, 0.6], [yN + 1.4, 0.75], [yN + 1.55, 0.4], [yN + 1.9, 0.28], [yN + 2.1, 0.12], [yN + 2.45, 0]], 16, C.SPIRE_LT);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, q = p(S.lx + Math.cos(a) * 0.95, S.lz + Math.sin(a) * 0.95);
      b.prism(q[0], yN + 0.85, q[1], 0.12, 0.12, 0.02, 0.02, 0.45, C.SPIRE_LT, rot);
    }
    // the four corner shringas, karna-shringas to ~60 per cent of the spire
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = S.lx + sx * (HW - 0.85), cz = S.lz + sz * (HW - 0.85), Hs = H * 0.6;
      for (let i = 1; i <= 8; i++) {
        const t0 = (i - 1) / 8, t1 = i / 8, h0 = 0.8 * (1 - 0.65 * Math.pow(t0, 1.3)), h1 = 0.8 * (1 - 0.65 * Math.pow(t1, 1.3));
        const sq = (h) => [[-h, -h], [h, -h], [h, h], [-h, h]];
        const A = sq(h0), B = sq(h1);
        for (let s = 0; s < 4; s++) {
          const n = (s + 1) % 4;
          lq([cx + A[s][0], y0 + Hs * t0, cz + A[s][1]], [cx + B[s][0], y0 + Hs * t1, cz + B[s][1]], [cx + B[n][0], y0 + Hs * t1, cz + B[n][1]], [cx + A[n][0], y0 + Hs * t0, cz + A[n][1]], tint(C.SPIRE, i % 2 ? 1.0 : 0.92));
        }
      }
      lathe(cx, cz, [[y0 + Hs, 0.32], [y0 + Hs + 0.15, 0.4], [y0 + Hs + 0.3, 0.2], [y0 + Hs + 0.6, 0]], 10, C.SPIRE_LT);
    }
  }
  // the chapel off the sanctum's south side, its single door on the east
  {
    const X0 = S.lx - 3.0, X1 = S.lx + 3.0, Z0 = S.lz + HW, Z1 = S.lz + HW + 4.0;
    coursed((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, yR - 0.1, CORN - 0.6, C.STONE, 500);
    box((X0 + X1) / 2, CORN - 0.6, (Z0 + Z1) / 2, X1 - X0 + 0.5, 0.5, Z1 - Z0 + 0.5, C.BRACKET);
    box((X0 + X1) / 2, CORN - 0.1, (Z0 + Z1) / 2, X1 - X0 - 0.6, 0.9, Z1 - Z0 - 0.6, tint(C.RUBBLE, 0.95));
    panel(X1 + 0.01, FLR + 0.8, (Z0 + Z1) / 2, 1.0, 2.0, 'E', C.DARK);
    box(X1 + 0.2, FLR + 1.85, (Z0 + Z1) / 2, 0.4, 0.14, 1.5, tint(C.STONE, 1.08));
    solid((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, { top: CORN + 0.3 });
  }
  /*
   * THE ARCADE. "A curious arcade of three bracket arches, serving apparently
   * no constructural purpose, but merely added as an ornamental screen to the
   * south wall ... The terrace on which this arcade stands has a carved stone
   * front, which had been buried for years, till I uncovered it" (Growse
   * p.253). Paired corbel brackets meeting in a lobed outline, on slender shafts
   * under a heavy flat lintel; the bays behind infilled with brick (1883).
   */
  {
    const X0 = K.lx - HW + 0.2, X1 = EF - 0.2, TZ = S.lz + HW + 2.4, TH = 0.75;
    box((X0 + X1) / 2, yR - 0.1, S.lz + HW + 1.2, X1 - X0 + 0.4, TH + 0.1, 2.4, tint(C.LOWER, 0.96));
    solid((X0 + X1) / 2, S.lz + HW + 1.2, X1 - X0 + 0.4, 2.4, { top: yR + TH + 0.6 });
    for (let i = 0; i < 9; i++) {
      const lx = X0 + 0.4 + i * (X1 - X0 - 0.8) / 8;
      panel(lx, yR + TH * 0.55, TZ + 0.01, 0.6, 0.45, 'S', tint(C.LOWER, 0.85));
      for (const dx of [-0.13, 0.13]) panel(lx + dx, yR + TH * 0.55, TZ + 0.02, 0.18, 0.18, 'S', tint(C.LOWER, 1.15));
    }
    const yT = yR + TH, bay = (X1 - X0) / 3;
    for (let k = 0; k <= 3; k++) {
      const lx = X0 + k * bay;
      lathe(lx, S.lz + HW + 1.0, [[yT, 0.22], [yT + 0.3, 0.2], [yT + 0.35, 0.14], [yT + 3.3, 0.13], [yT + 3.45, 0.22]], 10, tint(C.STONE, 1.06));
      post(lx, S.lz + HW + 1.0, 0.2, { top: yT + 3.6 });
    }
    for (let k = 0; k < 3; k++) {
      const cx = X0 + (k + 0.5) * bay;
      // the brick infill behind, then the paired brackets meeting in a lobed head
      box(cx, yT, S.lz + HW + 0.35, bay - 0.4, 3.6, 0.3, C.BRICK);
      arch(cx, yT + 0.6, S.lz + HW + 1.0, bay - 0.4, 3.0, 'x', tint(C.STONE, 1.1), 3, null, 0.25);
      for (const s of [-1, 1]) {
        const q = p(cx + s * (bay / 2 - 0.55), S.lz + HW + 1.0);
        b.prism(q[0], yT + 2.4, q[1], 0.18, 0.22, 0.7, 0.26, 0.6, tint(C.STONE, 1.05), rot);
      }
    }
    box((X0 + X1) / 2, yT + 3.45, S.lz + HW + 1.0, X1 - X0 + 0.5, 0.55, 0.65, C.BRACKET);
  }
  // the court of the ruin: grassed, walled; and the wall round the whole
  {
    const y = yR - 0.05;
    box(1.5, y, 38.7, 21.0, 0.06, 17.4, C.LAWN);
    for (let i = 0; i < 30; i++) {
      const q = p(-8 + 20 * hash(i * 1.3), 30.5 + 16.5 * hash(i * 2.9));
      b.prism(q[0], y + 0.06, q[1], 0.5, 0.5, 0.1, 0.1, 0.18, tint(C.GRASS, 0.9 + 0.2 * hash(i)), rot);
    }
    // a tree in it (imagery: one small tree)
    box(5.5, y, 39.0, 0.35, 2.4, 0.35, 0x5a4632);
    const q = p(5.5, 39.0);
    b.prism(q[0], y + 2.2, q[1], 2.6, 2.6, 1.2, 1.2, 1.8, 0x4d6b2e, rot);
    post(5.5, 39.0, 0.3);
    const H = 3.4;
    for (const [ax, az, bx, bz] of [[-27.6, 47.8, 12.6, 47.8], [12.6, 30.0, 12.6, 47.8], [-27.6, 30.0, -27.6, 47.8]]) {
      const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
      if (az === 47.8) {
        // the south wall, a gate in it from the lane (imagery)
        for (const [a, c] of [[ax, -9.6], [-6.4, bx]]) {
          box((a + c) / 2, y, az, c - a, H, 0.4, 0xd8c8aa);
          solid((a + c) / 2, az, c - a, 0.4, { top: y + H });
        }
        box(-8.0, y + 2.6, az, 3.2, H - 2.6, 0.4, 0xd8c8aa);
        continue;
      }
      box((ax + bx) / 2, y, (az + bz) / 2, 0.4, H, L, 0xd8c8aa, 0);
      solid((ax + bx) / 2, (az + bz) / 2, 0.4, L, { top: y + H });
      void ang;
    }
    // the wire-mesh storage cages against the north flank (2023)
    for (let i = 0; i < 2; i++) box(-24 + i * 2.2, FLR, S.lz - HW - 1.1, 2.0, 1.8, 1.4, 0x7a8288);
  }

  /* ================================================================
   * THE WORKING TEMPLE, c.1821 — north of the ruin, where worship is
   * ================================================================ */
  /*
   * "Built about the year 1821 by a Bengali Kayath, Nand Kumar Ghos, who also
   * built the new temple of Madan Mohan" (Growse p.254): a haveli-type
   * courtyard temple, two storeys, cream and salmon, a deep carved bracket
   * cornice, an arcaded upper storey with jali-filled cusped arches, a central
   * ornate darshan arch, the court floored in cream marble with black diamond
   * inserts, bird netting overhead; a street front with a deep chhajja on
   * carved brackets and painted panels, and a red-painted arched entrance.
   * Its plan is INFERRED; the court is the imagery's.
   */
  const HX0 = -26, HX1 = 7, HZ0 = 4.0, HZ1 = 30.0;
  const CT = { lx0: -8, lx1: 4, lz0: 9, lz1: 23 };
  const yH = topOf(HX0, HX1, HZ0, HZ1, 3);
  const HFL = yH + 0.3;
  const ALT = { lx: -10.6, lz: 16 };
  {
    const HT = 8.2;
    // the ranges round the court: solid masses, the walls you see. The north
    // and south ranges stand either side of their passages (the street door at
    // lx -1.0; the INFERRED door to the ruin's court at lx 1.0), with a
    // storey over each passage
    const range = (X0, X1, Z0, Z1, y0 = yH - 0.1) => {
      box((X0 + X1) / 2, y0, (Z0 + Z1) / 2, X1 - X0, yH + HT - y0, Z1 - Z0, C.SALMON);
      if (y0 < yH) box((X0 + X1) / 2, y0, (Z0 + Z1) / 2, X1 - X0 + 0.02, 3.5, Z1 - Z0 + 0.02, C.WHITE);
      solid((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, { top: yH + HT });
    };
    for (const [Z0, Z1, px, pw] of [[HZ0, CT.lz0, -1.0, 2.4], [CT.lz1, HZ1, 1.0, 2.2]]) {
      range(HX0, px - pw / 2, Z0, Z1);
      range(px + pw / 2, HX1, Z0, Z1);
      box(px, yH + 3.3, (Z0 + Z1) / 2, pw, HT - 3.4, Z1 - Z0, C.SALMON);
      box(px, yH + 3.15, (Z0 + Z1) / 2, pw, 0.15, Z1 - Z0, tint(C.SALMON, 0.7));   // the passage's ceiling
    }
    range(HX0, CT.lx0 - 3.6, CT.lz0, CT.lz1);
    range(CT.lx1, HX1, CT.lz0, CT.lz1);
    // the sanctum range on the court's west, the darshan arch in it
    const SX0 = CT.lx0 - 3.6, SX1 = CT.lx0;
    for (const [za, zb] of [[CT.lz0, ALT.lz - 1.6], [ALT.lz + 1.6, CT.lz1]]) {
      box((SX0 + SX1) / 2, yH - 0.1, (za + zb) / 2, SX1 - SX0, HT, zb - za, C.SALMON);
      solid((SX0 + SX1) / 2, (za + zb) / 2, SX1 - SX0, zb - za, { top: yH + HT });
    }
    box((SX0 + SX1) / 2, HFL + 3.8, ALT.lz, SX1 - SX0, HT - 4.1, 3.2, C.SALMON);
    box(SX0 + 0.3, yH - 0.1, ALT.lz, 0.6, HT, 3.2, C.SALMON);
    arch(SX1 + 0.03, HFL, ALT.lz, 3.0, 3.8, 'z', C.GOLD, 9, null, 0.25);
    for (const s of [-1, 1]) box(SX1 + 0.12, HFL, ALT.lz + s * 1.65, 0.25, 3.8, 0.3, 0xf2ead8);
    // the altar and the deities, facing east onto the court
    box(ALT.lx, HFL, ALT.lz, 1.6, 0.9, 3.0, C.MARBLE);
    solid(ALT.lx, ALT.lz, 1.8, 3.0, { top: HFL + 0.9 });
    box(SX0 + 0.62, HFL + 0.9, ALT.lz, 0.06, 2.6, 3.0, 0x8a1f1a);
    buildDeities(b, { ...loc, rot: rot + Math.PI / 2 }, HFL + 0.9 - 1.15, p(ALT.lx, ALT.lz));
    // the court's floor: cream marble with black diamond inserts
    box((CT.lx0 + CT.lx1) / 2, yH - 0.1, (CT.lz0 + CT.lz1) / 2, CT.lx1 - CT.lx0 + 3.6, HFL - yH + 0.08, CT.lz1 - CT.lz0, tint(C.MARBLE, 0.9));
    solid((CT.lx0 - 3.6 + CT.lx1) / 2 + 1.8, (CT.lz0 + CT.lz1) / 2, CT.lx1 - CT.lx0, CT.lz1 - CT.lz0, { top: HFL, tag: 'temple-floor', floor: true });
    for (let i = 0; i < 10; i++) for (let j = 0; j < 12; j++) {
      const cx = CT.lx0 + 0.6 + i * 1.2, cz = CT.lz0 + 0.6 + j * 1.2, d = 0.22;
      lq([cx, HFL + 0.003, cz - d], [cx - d, HFL + 0.003, cz], [cx, HFL + 0.003, cz + d], [cx + d, HFL + 0.003, cz], C.BLACK);
    }
    // the upper storey over the court: jali-filled cusped arches on three sides
    for (let k = 0; k < 5; k++) {
      arch(CT.lx0 + 1.2 + k * 2.4, yH + 4.4, CT.lz0 + 0.03, 1.6, 2.4, 'x', 0xf2ead8, 7, tint(C.SALMON, 0.6), 0.08);
      arch(CT.lx0 + 1.2 + k * 2.4, yH + 4.4, CT.lz1 - 0.03, 1.6, 2.4, 'x', 0xf2ead8, 7, tint(C.SALMON, 0.6), 0.08);
    }
    for (let k = 0; k < 5; k++) arch(CT.lx1 + 0.03, yH + 4.4, CT.lz0 + 1.4 + k * 2.8, 1.6, 2.4, 'z', 0xf2ead8, 7, tint(C.SALMON, 0.6), 0.08);
    // the deep carved bracket cornice round the court, and the bird netting over it
    for (const [lx, lz, w, d] of [[(CT.lx0 + CT.lx1) / 2, CT.lz0 + 0.4, CT.lx1 - CT.lx0, 0.8], [(CT.lx0 + CT.lx1) / 2, CT.lz1 - 0.4, CT.lx1 - CT.lx0, 0.8],
      [CT.lx1 - 0.4, (CT.lz0 + CT.lz1) / 2, 0.8, CT.lz1 - CT.lz0]]) box(lx, yH + 3.5, lz, w, 0.25, d, C.EAVE);
    for (let i = 0; i <= 12; i++) box(CT.lx0 + i * (CT.lx1 - CT.lx0) / 12, yH + HT - 0.2, (CT.lz0 + CT.lz1) / 2, 0.02, 0.02, CT.lz1 - CT.lz0, C.NET);
    for (let j = 0; j <= 14; j++) box((CT.lx0 + CT.lx1) / 2, yH + HT - 0.2, CT.lz0 + j * (CT.lz1 - CT.lz0) / 14, CT.lx1 - CT.lx0, 0.02, 0.02, C.NET);
    // the street front on the north: the deep chhajja on carved brackets,
    // painted panels, the red-painted arched entrance and its passage
    const DX = -1.0;
    box((HX0 + HX1) / 2, yH + 3.6, HZ0 - 0.5, HX1 - HX0, 0.2, 1.0, C.EAVE);
    for (let i = 0; i < 20; i++) {
      const q = p(HX0 + 0.8 + i * (HX1 - HX0 - 1.6) / 19, HZ0 - 0.2);
      b.prism(q[0], yH + 3.0, q[1], 0.16, 0.14, 0.2, 0.55, 0.6, C.EAVE, rot);
    }
    for (let k = 0; k < 8; k++) panel(HX0 + 2 + k * 4.1, yH + 5.8, HZ0 - 0.01, 2.2, 1.4, 'N', [0x3f7a55, 0xb3221c, 0x2a5aa8, 0xe8c22a][k % 4]);
    // the passage through the north range, into the court
    box(DX, HFL - 0.08, (HZ0 + CT.lz0) / 2, 2.4, 0.08, CT.lz0 - HZ0, tint(C.MARBLE, 0.9));
    arch(DX, yH, HZ0 - 0.04, 2.2, 3.4, 'x', C.OXIDE, 5, null, 0.2);
    panel(DX, yH + 3.65, HZ0 - 0.05, 2.6, 0.5, 'N', 0xf4efe0);
    solid(DX, (HZ0 + CT.lz0) / 2, 2.2, CT.lz0 - HZ0, { top: HFL, tag: 'temple-floor', floor: true });
    // (the door into the ruin's court, through the south range — INFERRED)
    box(1.0, HFL - 0.08, (CT.lz1 + HZ1) / 2, 2.2, 0.08, HZ1 - CT.lz1, tint(C.MARBLE, 0.9));
    solid(1.0, (CT.lz1 + HZ1) / 2, 2.0, HZ1 - CT.lz1, { top: HFL, tag: 'temple-floor', floor: true });
  }
  return {
    altar: { lx: ALT.lx, lz: ALT.lz, y: HFL + 1.9 },
    darshan: { lx: -4.5, lz: ALT.lz },
    hall: { lx0: CT.lx0 - 1.2, lx1: CT.lx1, lz0: CT.lz0, lz1: CT.lz1, door: [-1.0, HZ0 - 1.4] },
    FL: HFL,
  };
}
