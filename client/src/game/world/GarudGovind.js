/**
 * SHRI GARUD GOVIND JI, CHHATIKARA — the temple and its kund on the road from
 * Chhatikara into Vrindavan, seven hundred metres from where you start.
 *
 * Where infant Krishna's chhati pujan was held (which is how Chhatikara has its
 * name); where the boy Krishna climbed a friend's shoulders playing that he was
 * Garuda; where He granted Kaliya that here snakes need not fear Garuda — so it
 * is a place for Kaal Sarp pujan. In the sanctum Govind, Krishna in his
 * Narayana form, is seated on Garuda: "a rare and exquisite idol of Krishna
 * seated on a Garud" (brajfoundation.org).
 *
 * The kund was silted up; the Braj Foundation de-silted it from October 2007,
 * dug its base deeper, spread the soil in the forest round it (the Shadang
 * van) and joined a larger water body to the Vrindavan Minor canal: "upto the
 * brim with clean water and remains so during most of the year".
 *
 * Built from:
 *   - ESRI z19 imagery, measured in this frame: the tank 50 m across its
 *     north-west side, its paved border 2.5 m wide on the north-west and
 *     south-west, the water running 85 m south-east under the trees to the
 *     temple's side (OSM way 671081002 has it so too); the temple compound
 *     between the tank's east side and the road, a white round top — the
 *     shikhara — over its north-west corner; the road on the south-east;
 *   - brajrasik.org's 24 photographs (March 2024): the kund's rubble-stone
 *     walls whitewashed along the top, red sandstone coping and hexagonal
 *     jali railing with ball finials, a railed platform out over the water,
 *     steps at the far end with small chhatris, a paved walk with sandstone
 *     benches and trees on round platforms, a Shiva lingam; the temple
 *     painted lime green with a small white shikhara, a white-flagged court
 *     with a pillared veranda and a small white shrine, a blue wall mural of
 *     Garuda seizing a snake, a white scalloped-arch gateway at the road;
 *     Govind on Garuda, in yellow and gold.
 *
 * THE FRAME: the tank's own — +lx along its north-west side toward the north
 * corner (bearing 40 degrees), +lz along its south-west side toward the road —
 * with its origin the tank's west corner. The location's pin is the court at
 * (70, 82) of it.
 *
 * INFERRED, and said so: the depth (about 2 m of wall over the water, as the
 * photographs have it); which side the ghat is on (the far, south-east end,
 * by the temple); the temple's plan inside its walls — the sanctum under the
 * shikhara with its door on the court, the veranda before it, the rooms round
 * the court, the gate's place on the road; the deity's size and dress past
 * what the photograph shows; the trees' species.
 */

const C = {
  LIME: 0xc4d168, LIME_DK: 0xa9b555, LIME_LT: 0xd3dd84, WHITE: 0xf1efe8, WHITE_SH: 0xd9d6cc,
  RUBBLE: 0xb4aa94, RUBBLE2: 0xa49a84, RUBBLE3: 0xc2b8a2, WASH: 0xe6e3da,
  RED: 0xb15f4a, RED_LT: 0xc4735d, RED_DK: 0x8f4a3a,
  WATER: 0x57703a, MUD: 0x2f3722, PAVE: 0xc9b9a0, PAVE2: 0xbdae96, FLAG: 0xeceae3, DOT: 0x2e2d2a,
  TRUNK: 0x5b4632, LEAF: 0x40652b, LEAF2: 0x557634, SCRUB: 0x6b7a3c,
  GOLD: 0xd6a632, GOLD_DK: 0xae8424, OCHRE: 0xc98a2a, BEAK: 0xe2862a,
  KRISHNA: 0x34508e, PITAMBAR: 0xf2c230, GARLAND: 0xf08a24, MURAL: 0x3e86b8, SNAKE: 0x2c3a2a,
  DOOR: 0x3a2a1e, DARK: 0x1f1712, SINDOOR: 0xc0391e, STONE: 0x5c5a58,
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** The location's pin, in the tank's frame. */
export const GARUD_ORIGIN = [70, 82];
/** The tank's pit (the water and its walls), in the LOCATION's frame: its basin. */
export const GARUD_BASIN = { lx0: 2.5 - 70, lx1: 47.5 - 70, lz0: 2.5 - 82, lz1: 82.5 - 82 };   // the water and the ghat down to it

/**
 * @param o.b, o.loc, o.terrain, o.colliders, o.h { cuspedArch, tint, dome, MeshBuilder }
 * @returns {{altar, darshan, floor, hall, YT, meshes}}
 */
export function buildGarudGovind(o) {
  const { b, loc, terrain, colliders } = o;
  const { cuspedArch, tint, dome, MeshBuilder } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const [OX, OZ] = GARUD_ORIGIN;
  // every coordinate below is in the tank's frame; p() carries it to the world
  const p = (lx, lz) => { const a = lx - OX, c = lz - OZ; return [x + a * cs - c * sn, z + a * sn + c * cs]; };
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}, ang = 0) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : 0; };
  const W = (lx, y, lz) => { const q = p(lx, lz); return [q[0], y, q[1]]; };
  const lq = (A, B, Cq, D, col) => b.quad(W(...A), W(...B), W(...Cq), W(...D), col);
  const lathe = (cx, cz, rings, segs, color, a0 = 0) => {
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0] = rings[i - 1], [y1, r1] = rings[i];
      for (let s = 0; s < segs; s++) {
        const t0 = a0 + s / segs * Math.PI * 2, t1 = a0 + (s + 1) / segs * Math.PI * 2;
        lq([cx + Math.cos(t0) * r0, y0, cz + Math.sin(t0) * r0], [cx + Math.cos(t0) * r1, y1, cz + Math.sin(t0) * r1],
          [cx + Math.cos(t1) * r1, y1, cz + Math.sin(t1) * r1], [cx + Math.cos(t1) * r0, y0, cz + Math.sin(t1) * r0],
          typeof color === 'function' ? color(i, s) : color);
      }
    }
  };
  /** A flat rectangle facing up, in the frame. */
  const flat = (lx0, lx1, lz0, lz1, y, col) => lq([lx0, y, lz0], [lx0, y, lz1], [lx1, y, lz1], [lx1, y, lz0], col);

  /* ================================================================
   * LEVELS
   * ================================================================ */
  let hi = -Infinity;
  for (let lx = -4; lx <= 100; lx += 8) for (let lz = -4; lz <= 114; lz += 8) hi = Math.max(hi, tH(lx, lz));
  const YT = hi + 0.05;                 // the walk, the court, the rim
  const YW = YT - 2.1;                  // the water
  const FLOOR = YW - 1.3;
  const WA = { lx0: 2.5, lx1: 47.5, lz0: 2.5, lz1: 75.0 };       // the water's edge
  const PZ1 = 82.5;                     // the pit's far end: the ghat rises from the water to here
  const GHAT = WA.lz1;                  // the ghat's foot

  /* ================================================================
   * THE KUND
   * ================================================================ */
  // the walls, rubble stone in courses, whitewashed along the top, down from
  // the rim to below the water on all four sides of the pit
  const wallRun = (lx0, lz0, lx1, lz1, toward) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
    const n = Math.max(1, Math.round(L / 1.6));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, tm = (t0 + t1) / 2;
      const mx = lx0 + (lx1 - lx0) * tm, mz = lz0 + (lz1 - lz0) * tm;
      for (let c = 0; c < 4; c++) {
        const y0 = FLOOR + c * ((YT - 0.55 - FLOOR) / 4);
        const col = [C.RUBBLE, C.RUBBLE2, C.RUBBLE3][Math.floor(hash(k * 7 + c * 13) * 3)];
        box(mx + toward[0] * 0.02 * (c % 2), y0, mz + toward[1] * 0.02 * (c % 2), L / n + 0.01, (YT - 0.55 - FLOOR) / 4 + 0.01, 0.5, col, ang);
      }
      box(mx, YT - 0.55, mz, L / n + 0.01, 0.45, 0.5, C.WASH, ang);
    }
  };
  wallRun(WA.lx0, WA.lz0 - 0.25, WA.lx1, WA.lz0 - 0.25, [0, 1]);            // north-west
  wallRun(WA.lx0 - 0.25, WA.lz0, WA.lx0 - 0.25, GHAT, [1, 0]);              // south-west
  wallRun(WA.lx1 + 0.25, WA.lz0, WA.lx1 + 0.25, GHAT, [-1, 0]);             // north-east
  // the coping, red sandstone, all the way round the rim
  const coping = (lx0, lz0, lx1, lz1) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
    box((lx0 + lx1) / 2, YT - 0.12, (lz0 + lz1) / 2, L, 0.24, 0.7, C.RED, ang);
  };
  coping(WA.lx0 - 0.6, WA.lz0 - 0.35, WA.lx1 + 0.6, WA.lz0 - 0.35);
  coping(WA.lx0 - 0.35, WA.lz0 - 0.6, WA.lx0 - 0.35, GHAT);
  coping(WA.lx1 + 0.35, WA.lz0 - 0.6, WA.lx1 + 0.35, GHAT);
  /*
   * The jali railing on the coping: square red posts with a ball on each,
   * panels of hexagonal lattice between — drawn as a frame with its bars,
   * which is what reads from the walk. Solid to a body, waist high; the
   * camera passes over. `gaps` are the openings, as ranges along the run.
   */
  const railing = (lx0, lz0, lx1, lz1, gaps = []) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
    const ux = (lx1 - lx0) / L, uz = (lz1 - lz0) / L;
    const n = Math.max(1, Math.round(L / 2.2)), seg = L / n;
    for (let k = 0; k < n; k++) {
      const t0 = k * seg, t1 = t0 + seg, tm = (t0 + t1) / 2;
      if (gaps.some(([g0, g1]) => tm > g0 && tm < g1)) continue;
      const mx = lx0 + ux * tm, mz = lz0 + uz * tm;
      box(mx, YT + 0.12, mz, seg, 0.08, 0.16, C.RED, ang);                 // bottom rail
      box(mx, YT + 0.86, mz, seg, 0.08, 0.18, C.RED_LT, ang);              // top rail
      for (let j = 1; j < 6; j++) {
        const t = t0 + (j / 6) * seg;
        box(lx0 + ux * t, YT + 0.2, lz0 + uz * t, 0.05, 0.66, 0.07, C.RED, ang);
      }
      for (let r = 0; r < 3; r++) box(mx, YT + 0.32 + r * 0.2, mz, seg - 0.1, 0.04, 0.06, C.RED_DK, ang);
      const q = p(mx, mz);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: 0.25, rot: rot + ang, top: YT + 0.95, tag: 'garud-railing' });
    }
    for (let k = 0; k <= n; k++) {
      const t = k * seg;
      if (gaps.some(([g0, g1]) => t > g0 + 0.01 && t < g1 - 0.01)) continue;
      const px = lx0 + ux * t, pz = lz0 + uz * t;
      box(px, YT + 0.12, pz, 0.24, 0.92, 0.24, C.RED_LT);
      lathe(px, pz, [[YT + 1.04, 0.0], [YT + 1.08, 0.1], [YT + 1.16, 0.12], [YT + 1.24, 0.08], [YT + 1.28, 0.0]], 6, C.RED_LT);
    }
  };
  // the platform out over the water on the south-west side, its gap in the railing
  const PLAT = { lz0: 30.0, lz1: 34.0, out: 4.0 };
  railing(WA.lx0 - 0.35, WA.lz0 - 0.35, WA.lx1 + 0.35, WA.lz0 - 0.35);
  railing(WA.lx0 - 0.35, WA.lz0 - 0.35, WA.lx0 - 0.35, GHAT, [[PLAT.lz0 - WA.lz0 + 0.35, PLAT.lz1 - WA.lz0 + 0.35]]);
  railing(WA.lx1 + 0.35, WA.lz0 - 0.35, WA.lx1 + 0.35, GHAT);
  /*
   * "a railed platform out over the water": down six steps from the walk to
   * a landing 1.2 m below it, carried on a pier, railed on its three sides.
   */
  {
    const n = 6, rise = 1.2 / n;
    for (let i = 1; i <= n; i++) {
      const lx = WA.lx0 - 0.3 + i * 0.32;
      box(lx, YW - 0.5, (PLAT.lz0 + PLAT.lz1) / 2, 0.32, YT - i * rise - (YW - 0.5), PLAT.lz1 - PLAT.lz0, C.RED_LT);
      solid(lx, (PLAT.lz0 + PLAT.lz1) / 2, 0.32, PLAT.lz1 - PLAT.lz0, { top: YT - i * rise, standOnly: true, tag: 'garud-steps' });
    }
    const L0 = WA.lx0 - 0.3 + n * 0.32 + 0.16, L1 = L0 + PLAT.out;
    box((L0 + L1) / 2, FLOOR, (PLAT.lz0 + PLAT.lz1) / 2, L1 - L0, YT - 1.2 - FLOOR, PLAT.lz1 - PLAT.lz0, C.RED);
    solid((L0 + L1) / 2, (PLAT.lz0 + PLAT.lz1) / 2, L1 - L0, PLAT.lz1 - PLAT.lz0, { top: YT - 1.2, standOnly: true, tag: 'garud-platform' });
    for (const [a0, b0, a1, b1] of [[L1, PLAT.lz0, L1, PLAT.lz1], [L0 - 0.3, PLAT.lz0, L1, PLAT.lz0], [L0 - 0.3, PLAT.lz1, L1, PLAT.lz1]]) {
      const LL = Math.hypot(a1 - a0, b1 - b0), ang = Math.atan2(b1 - b0, a1 - a0);
      box((a0 + a1) / 2, YT - 1.2, (b0 + b1) / 2, LL, 0.1, 0.16, C.RED, ang);
      box((a0 + a1) / 2, YT - 0.38, (b0 + b1) / 2, LL, 0.08, 0.18, C.RED_LT, ang);
      for (let j = 0; j <= Math.round(LL / 0.4); j++) {
        const f = j / Math.round(LL / 0.4);
        box(a0 + (a1 - a0) * f, YT - 1.1, b0 + (b1 - b0) * f, 0.05, 0.72, 0.07, C.RED, ang);
      }
      const q = p((a0 + a1) / 2, (b0 + b1) / 2);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: LL, d: 0.2, rot: rot + ang, top: YT - 0.3, tag: 'garud-railing' });
    }
  }
  /*
   * The ghat at the far end, by the temple: a broad flight down to the water
   * across the tank's width, a small chhatri at each end of its head.
   */
  {
    const n = 11, rise = (YT - (YW + 0.2)) / n, run = (PZ1 - GHAT) / n;
    for (let i = 1; i <= n; i++) {
      // tread i is i risers down from the head, counted from the pit's end
      const lz1 = PZ1 - (i - 1) * run, lz0 = lz1 - run, top = YT - i * rise;
      box((WA.lx0 + WA.lx1) / 2, FLOOR, (lz0 + lz1) / 2, WA.lx1 - WA.lx0, top - FLOOR, run, i % 2 ? C.RED_LT : C.RED);
      solid((WA.lx0 + WA.lx1) / 2, (lz0 + lz1) / 2, WA.lx1 - WA.lx0, run, { top, standOnly: true, tag: 'garud-ghat-steps' });
    }
    // the ghat's head, at the walk's level, closing the pit's end, and its cheek walls
    box((WA.lx0 + WA.lx1) / 2, FLOOR, PZ1 + 0.6, WA.lx1 - WA.lx0 + 1.4, YT - FLOOR, 1.2, C.RED);
    for (const lx of [WA.lx0 - 0.45, WA.lx1 + 0.45]) {
      box(lx, FLOOR, (GHAT + PZ1) / 2, 0.9, YT + 0.9 - FLOOR, PZ1 - GHAT + 0.5, C.RED_DK);
      solid(lx, (GHAT + PZ1) / 2, 0.9, PZ1 - GHAT + 0.5, { top: YT + 0.9, tag: 'garud-cheek' });
    }
    for (const lx of [WA.lx0 + 1.3, WA.lx1 - 1.3]) {
      const cz = PZ1 + 1.6;
      box(lx, YT, cz, 2.2, 0.3, 2.2, C.RED_DK);
      for (const [ox, oz] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]) {
        box(lx + ox, YT + 0.3, cz + oz, 0.18, 1.9, 0.18, C.RED_LT);
        post(lx + ox, cz + oz, 0.12);
      }
      box(lx, YT + 2.2, cz, 2.3, 0.18, 2.3, C.RED);
      const q = p(lx, cz);
      if (dome) dome(b, q[0], YT + 2.38, q[1], 0.95, 0.9, C.RED_LT);
      lathe(lx, cz, [[YT + 3.25, 0.12], [YT + 3.5, 0.06], [YT + 3.7, 0.0]], 6, C.GOLD);
    }
  }
  // the floor, seen through the water, and the water
  box((WA.lx0 + WA.lx1) / 2, FLOOR - 0.3, (WA.lz0 + WA.lz1) / 2, WA.lx1 - WA.lx0, 0.3, WA.lz1 - WA.lz0, C.MUD);
  const meshes = [];
  {
    const wb = MeshBuilder ? new MeshBuilder() : b;
    const c4 = [p(WA.lx0, WA.lz0), p(WA.lx0, WA.lz1), p(WA.lx1, WA.lz1), p(WA.lx1, WA.lz0)];
    let A = 0;
    for (let k = 0; k < 4; k++) { const u = c4[k], v = c4[(k + 1) % 4]; A += u[0] * v[1] - v[0] * u[1]; }
    const q = A < 0 ? c4 : c4.slice().reverse();
    const uv = (v) => [v[0] / 360, v[1] / 360];
    wb.tri(q[0][0], YW, q[0][1], q[1][0], YW, q[1][1], q[2][0], YW, q[2][1], C.WATER, [...uv(q[0]), ...uv(q[1]), ...uv(q[2])]);
    wb.tri(q[0][0], YW, q[0][1], q[2][0], YW, q[2][1], q[3][0], YW, q[3][1], C.WATER, [...uv(q[0]), ...uv(q[2]), ...uv(q[3])]);
    if (wb !== b) {
      const cq = p((WA.lx0 + WA.lx1) / 2, (WA.lz0 + WA.lz1) / 2);
      meshes.push({ name: 'GarudKundWater', builder: wb, x: cq[0], z: cq[1], r: 60, gloss: { opacity: 0.86, ripple: true } });
    }
    // knee-high over the water, so nobody walks into it from the ghat and the
    // unstick never finds it a place to stand; the camera passes over
    solid((WA.lx0 + WA.lx1) / 2, (WA.lz0 + WA.lz1) / 2, WA.lx1 - WA.lx0 - 0.2, WA.lz1 - WA.lz0 - 0.2,
      { top: YW + 0.88, tag: 'garud-water' });     // just under the platform out over it
  }
  /*
   * The walk round it: paved, at the rim's level, on the north-west and
   * south-west sides and up the north-east to the temple; red sandstone
   * benches along its outer edge; trees on round platforms; a Shiva lingam.
   */
  const walk = (lx0, lx1, lz0, lz1) => {
    box((lx0 + lx1) / 2, YT - 0.4, (lz0 + lz1) / 2, lx1 - lx0, 0.4, lz1 - lz0, C.PAVE);
    for (let t = 0; t < Math.max(lx1 - lx0, lz1 - lz0); t += 3.0) {
      const along = lx1 - lx0 > lz1 - lz0;
      if (along) box(lx0 + t, YT, (lz0 + lz1) / 2, 0.03, 0.004, lz1 - lz0, C.PAVE2);
      else box((lx0 + lx1) / 2, YT, lz0 + t, lx1 - lx0, 0.004, 0.03, C.PAVE2);
    }
    solid((lx0 + lx1) / 2, (lz0 + lz1) / 2, lx1 - lx0, lz1 - lz0, { top: YT, standOnly: true, tag: 'garud-walk' });
  };
  walk(-3.5, WA.lx1 + 0.9, -3.5, WA.lz0 - 0.7);                           // north-west
  walk(-3.5, WA.lx0 - 0.7, WA.lz0 - 0.7, PZ1 + 3.6);                       // south-west
  walk(WA.lx1 + 0.7, 50.5, WA.lz0 - 0.7, PZ1);                             // north-east, to the temple's wall
  walk(WA.lx0 - 0.7, 50.5, PZ1, PZ1 + 3.6);                                // across the ghat's head
  for (const [lx, lz, ang] of [[-3.0, 12, Math.PI / 2], [-3.0, 24, Math.PI / 2], [-3.0, 44, Math.PI / 2], [-3.0, 56, Math.PI / 2],
    [12, -3.0, 0], [26, -3.0, 0], [38, -3.0, 0]]) {
    box(lx, YT, lz, 1.8, 0.42, 0.45, C.RED, ang);
    box(lx, YT + 0.42, lz, 1.9, 0.08, 0.5, C.RED_LT, ang);
    solid(lx, lz, ang ? 0.45 : 1.8, ang ? 1.8 : 0.45, { top: YT + 0.5, tag: 'garud-bench' });
  }
  const tree = (lx, lz, s, seed) => {
    lathe(lx, lz, [[YT, 1.6 * s], [YT + 0.45, 1.6 * s], [YT + 0.45, 1.45 * s], [YT + 0.46, 0]], 12, C.RED_DK);
    box(lx, YT + 0.45, lz, 0.5 * s, 3.6 * s, 0.5 * s, C.TRUNK);
    lathe(lx, lz, [[YT + 3.2 * s, 0.4], [YT + 3.8 * s, 4.0 * s], [YT + 5.6 * s, 4.6 * s], [YT + 7.0 * s, 3.2 * s], [YT + 7.6 * s, 0.4]], 12,
      (i, sg) => tint(sg % 2 ? C.LEAF2 : C.LEAF, 0.88 + 0.2 * hash(seed * 7 + i * 3 + sg)));
    post(lx, lz, 1.5 * s, { top: YT + 0.45, tag: 'garud-tree-platform' });
    post(lx, lz, 0.3 * s, { tag: 'garud-tree' });
  };
  tree(-2.0, -1.5, 1.0, 1);
  tree(-1.8, 34.0, 0.9, 2);
  tree(49.2, -1.8, 1.05, 3);
  tree(-2.0, 68.0, 1.1, 4);
  // the Shiva lingam by the ghat's head, on its platform
  {
    const lx = 8.0, lz = PZ1 + 2.0;
    box(lx, YT, lz, 1.3, 0.35, 1.3, C.RED_DK);
    lathe(lx, lz, [[YT + 0.35, 0.42], [YT + 0.5, 0.42], [YT + 0.5, 0.14], [YT + 0.95, 0.14], [YT + 1.05, 0.0]], 10, C.STONE);
    box(lx + 0.5, YT + 0.35, lz, 0.5, 0.08, 0.14, C.STONE);
    post(lx, lz, 0.7, { top: YT + 0.35, tag: 'garud-lingam' });
  }

  /* ================================================================
   * THE TEMPLE
   * ================================================================ */
  /*
   * Its compound between the tank's east side and the road, its walls and
   * rooms lime green; the court paved in white flags dotted black; the
   * sanctum under the small white shikhara at the court's north-west corner,
   * its door on the court, a pillared veranda before it; a small white
   * shrine; the mural; the gate on the road.
   */
  const T = { lx0: 50.5, lx1: 98, lz0: 48, lz1: 110 };
  const CT = { lx0: 62, lx1: 92, lz0: 56, lz1: 104 };                    // the court
  const GATE = { lx0: 70, lx1: 76 };                                       // on the road side, lz = T.lz1
  const KUND_DOOR = { lz0: 82.9, lz1: 85.4 };                              // in the west wall, onto the ghat's head
  // the court's paving: white flags, black dots at their corners
  for (let lx = CT.lx0; lx < CT.lx1 - 0.01; lx += 2.0) {
    for (let lz = CT.lz0; lz < CT.lz1 - 0.01; lz += 2.0) {
      flat(lx + 0.02, lx + 1.98, lz + 0.02, lz + 1.98, YT + 0.02, tint(C.FLAG, 0.96 + 0.05 * hash(lx * 3 + lz)));
      box(lx, YT + 0.02, lz, 0.18, 0.006, 0.18, C.DOT, Math.PI / 4);
    }
  }
  box((CT.lx0 + CT.lx1) / 2, YT - 0.3, (CT.lz0 + CT.lz1) / 2, CT.lx1 - CT.lx0, 0.32, CT.lz1 - CT.lz0, C.FLAG);
  solid((CT.lx0 + CT.lx1) / 2, (CT.lz0 + CT.lz1) / 2, CT.lx1 - CT.lx0, CT.lz1 - CT.lz0, { top: YT + 0.02, standOnly: true, tag: 'garud-court' });
  // the ground inside the walls that is not the court, paved plainly
  for (const [a0, a1, b0, b1] of [[T.lx0, CT.lx0, T.lz0, T.lz1], [CT.lx1, T.lx1, T.lz0, T.lz1], [CT.lx0, CT.lx1, T.lz0, CT.lz0], [CT.lx0, CT.lx1, CT.lz1, T.lz1]]) {
    box((a0 + a1) / 2, YT - 0.3, (b0 + b1) / 2, a1 - a0, 0.31, b1 - b0, C.PAVE2);
    solid((a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0, { top: YT + 0.01, standOnly: true, tag: 'garud-yard' });
  }
  // the compound's walls, with the gate on the road and the door to the kund
  const wall = (lx0, lz0, lx1, lz1, h, gaps = []) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
    const ux = (lx1 - lx0) / L, uz = (lz1 - lz0) / L;
    let t = 0;
    const cuts = gaps.slice().sort((a2, b2) => a2[0] - b2[0]);
    const runs = [];
    for (const [g0, g1] of cuts) { if (g0 > t) runs.push([t, g0]); t = g1; }
    if (t < L) runs.push([t, L]);
    for (const [t0, t1] of runs) {
      const tm = (t0 + t1) / 2, mx = lx0 + ux * tm, mz = lz0 + uz * tm;
      box(mx, YT - 0.3, mz, t1 - t0, h + 0.3, 0.4, C.LIME, ang);
      box(mx, YT + h, mz, t1 - t0 + 0.02, 0.16, 0.55, C.WHITE, ang);
      solid(mx, mz, t1 - t0, 0.45, { top: YT + h + 0.2, tag: 'garud-wall' }, ang);
    }
  };
  wall(T.lx0, T.lz0, T.lx1, T.lz0, 3.4);                                  // north-west
  wall(T.lx1, T.lz0, T.lx1, T.lz1, 3.4);                                  // north-east
  wall(T.lx0, T.lz1, T.lx1, T.lz1, 3.4, [[GATE.lx0 - T.lx0, GATE.lx1 - T.lx0]]);       // the road side
  wall(T.lx0, T.lz0, T.lx0, T.lz1, 3.4, [[KUND_DOOR.lz0 - T.lz0, KUND_DOOR.lz1 - T.lz0]]);   // to the kund
  // rooms round the court, two storeys, lime green, windows dark in white frames
  const room = (lx0, lx1, lz0, lz1, h, faceLz) => {
    box((lx0 + lx1) / 2, YT - 0.2, (lz0 + lz1) / 2, lx1 - lx0, h + 0.2, lz1 - lz0, C.LIME);
    box((lx0 + lx1) / 2, YT + h, (lz0 + lz1) / 2, lx1 - lx0 + 0.3, 0.2, lz1 - lz0 + 0.3, C.WHITE);
    box((lx0 + lx1) / 2, YT + h + 0.2, (lz0 + lz1) / 2, lx1 - lx0, 0.5, lz1 - lz0, C.LIME_LT);
    solid((lx0 + lx1) / 2, (lz0 + lz1) / 2, lx1 - lx0, lz1 - lz0, { top: YT + h + 0.7, tag: 'garud-room' });
    if (faceLz !== undefined) {
      for (let lx = lx0 + 1.6; lx < lx1 - 1.0; lx += 2.6) {
        for (const yy of [YT + 1.0, YT + 1.0 + h / 2]) {
          box(lx, yy, faceLz, 1.0, 1.25, 0.12, C.WHITE);
          box(lx, yy + 0.08, faceLz + Math.sign(faceLz - (lz0 + lz1) / 2) * 0.03, 0.8, 1.05, 0.12, C.DARK);
        }
      }
    }
  };
  room(T.lx0 + 0.4, T.lx1 - 0.4, T.lz0 + 0.4, CT.lz0, 6.4, CT.lz0 + 0.02);         // the north-west range
  room(CT.lx1, T.lx1 - 0.4, CT.lz0, CT.lz1, 6.4);                                 // the north-east range
  room(GATE.lx1 + 0.6, CT.lx1, CT.lz1, T.lz1 - 0.4, 4.2, CT.lz1 - 0.02);          // by the gate, east
  room(CT.lx0, GATE.lx0 - 0.6, CT.lz1, T.lz1 - 0.4, 4.2, CT.lz1 - 0.02);          // by the gate, west
  // the pillared veranda on the north-east side of the court
  for (let lz = CT.lz0 + 4; lz <= CT.lz1 - 4; lz += 4) {
    box(CT.lx1 - 3.2, YT, lz, 0.4, 3.2, 0.4, C.WHITE);
    post(CT.lx1 - 3.2, lz, 0.25);
  }
  box(CT.lx1 - 1.6, YT + 3.2, (CT.lz0 + CT.lz1) / 2, 3.6, 0.3, CT.lz1 - CT.lz0 - 6, C.LIME_DK);
  // the small white shrine with its pyramid roof
  {
    const lx = 86.5, lz = 96.5;
    box(lx, YT, lz, 3.0, 2.6, 3.0, C.WHITE);
    for (let k = 0; k < 5; k++) box(lx, YT + 2.6 + k * 0.32, lz, 3.2 - k * 0.6, 0.32, 3.2 - k * 0.6, k % 2 ? C.WHITE_SH : C.WHITE);
    lathe(lx, lz, [[YT + 4.2, 0.18], [YT + 4.5, 0.1], [YT + 4.8, 0.0]], 6, C.GOLD);
    box(lx - 1.52, YT + 0.1, lz, 0.06, 1.9, 1.0, C.DARK);
    solid(lx, lz, 3.0, 3.0, { top: YT + 4.2, tag: 'garud-shrine' });
  }
  // the mural, on the court face of the gate range: Garuda seizing a snake
  {
    const lz = CT.lz1 - 0.06, cx = (CT.lx0 + GATE.lx0 - 0.6) / 2;
    box(cx, YT + 0.5, lz, 6.0, 3.0, 0.04, C.MURAL);
    box(cx - 0.4, YT + 2.2, lz - 0.03, 2.4, 0.7, 0.03, C.GOLD, 0.25);          // a wing
    box(cx + 0.9, YT + 2.0, lz - 0.03, 2.0, 0.6, 0.03, C.GOLD_DK, -0.35);       // the other
    box(cx + 0.2, YT + 1.5, lz - 0.03, 1.0, 0.9, 0.03, C.OCHRE);                // the body
    box(cx + 0.8, YT + 1.9, lz - 0.03, 0.45, 0.35, 0.03, C.BEAK);               // the head
    for (let k = 0; k < 6; k++) box(cx - 1.8 + k * 0.6, YT + 0.8 + Math.sin(k * 1.4) * 0.18, lz - 0.03, 0.62, 0.14, 0.03, C.SNAKE, 0.4 * Math.cos(k));
  }
  // the gate on the road: white, a scalloped arch between two tall piers, a crest
  {
    const lz = T.lz1, gw = GATE.lx1 - GATE.lx0;
    for (const lx of [GATE.lx0 - 0.7, GATE.lx1 + 0.7]) {
      box(lx, YT - 0.2, lz, 1.4, 6.0, 1.6, C.WHITE);
      box(lx, YT + 5.8, lz, 1.7, 0.3, 1.9, C.WHITE_SH);
      lathe(lx, lz, [[YT + 6.1, 0.6], [YT + 6.5, 0.62], [YT + 7.0, 0.35], [YT + 7.3, 0.0]], 8, C.WHITE);
      post(lx, lz, 0.85);
    }
    const q = p((GATE.lx0 + GATE.lx1) / 2, lz);
    if (cuspedArch) cuspedArch(b, q[0], YT, q[1], gw - 0.2, 5.0, 1.4, rot, C.WHITE, 9, null);
    box((GATE.lx0 + GATE.lx1) / 2, YT + 4.4, lz, gw + 0.2, 1.2, 1.5, C.WHITE);
    for (let k = 0; k < 5; k++) {
      const lx = GATE.lx0 + 0.6 + k * (gw - 1.2) / 4;
      lathe(lx, lz, [[YT + 5.6, 0.35], [YT + 5.9, 0.34], [YT + 6.25, 0.18], [YT + 6.45, 0.0]], 8, C.WHITE_SH);
    }
    box((GATE.lx0 + GATE.lx1) / 2, YT + 5.6, lz, gw + 0.4, 0.14, 1.6, C.WHITE_SH);
  }
  // the door from the court's side to the kund: a white arch in the west wall
  {
    const q = p(T.lx0, (KUND_DOOR.lz0 + KUND_DOOR.lz1) / 2);
    if (cuspedArch) cuspedArch(b, q[0], YT, q[1], KUND_DOOR.lz1 - KUND_DOOR.lz0 - 0.2, 2.8, 0.5, rot + Math.PI / 2, C.WHITE, 7, null);
    box(T.lx0, YT + 2.8, (KUND_DOOR.lz0 + KUND_DOOR.lz1) / 2, 0.6, 0.6, KUND_DOOR.lz1 - KUND_DOOR.lz0 + 0.6, C.WHITE);
  }
  /*
   * The sanctum, under the white shikhara the imagery shows over the court's
   * north-west corner, its door on the court; a plinth of three steps; the
   * pillared mandapa before it. Govind on Garuda inside, facing the door.
   */
  const SAN = { lx0: 51.5, lx1: 61.5, lz0: 63.0, lz1: 75.0 };
  const SZ = (SAN.lz0 + SAN.lz1) / 2;
  const PL = YT + 0.6;                                                     // the sanctum's floor
  const MAN = { lx0: SAN.lx1, lx1: 69.0 };                                 // the mandapa, before it
  {
    // the plinth under sanctum and mandapa, and its steps down to the court
    box((SAN.lx0 + MAN.lx1) / 2, YT - 0.2, SZ, MAN.lx1 - SAN.lx0, PL - YT + 0.2, SAN.lz1 - SAN.lz0, C.WHITE_SH);
    solid((SAN.lx0 + MAN.lx1) / 2, SZ, MAN.lx1 - SAN.lx0, SAN.lz1 - SAN.lz0, { top: PL, standOnly: true, floor: true, tag: 'temple-floor' });
    flat(SAN.lx1, MAN.lx1, SAN.lz0, SAN.lz1, PL + 0.005, C.FLAG);
    for (let i = 1; i <= 3; i++) {
      const lx = MAN.lx1 + (i - 0.5) * 0.35;
      box(lx, YT, SZ, 0.35, PL - i * 0.2 - YT + 0.02, 6.0, C.WHITE_SH);
      solid(lx, SZ, 0.35, 6.0, { top: PL - i * 0.2, standOnly: true, tag: 'temple-step' });
    }
    // the sanctum's walls, its door on the mandapa
    const SW = 0.45, H = 4.6, DOOR = 1.6;
    box(SAN.lx0 + SW / 2, PL, SZ, SW, H, SAN.lz1 - SAN.lz0, C.LIME);
    solid(SAN.lx0 + SW / 2, SZ, SW, SAN.lz1 - SAN.lz0, { tag: 'garud-sanctum' });
    for (const lz of [SAN.lz0 + SW / 2, SAN.lz1 - SW / 2]) {
      box((SAN.lx0 + SAN.lx1) / 2, PL, lz, SAN.lx1 - SAN.lx0, H, SW, C.LIME);
      solid((SAN.lx0 + SAN.lx1) / 2, lz, SAN.lx1 - SAN.lx0, SW, { tag: 'garud-sanctum' });
    }
    for (const [a0, a1] of [[SAN.lz0, SZ - DOOR / 2], [SZ + DOOR / 2, SAN.lz1]]) {
      box(SAN.lx1 - SW / 2, PL, (a0 + a1) / 2, SW, H, a1 - a0, C.LIME);
      solid(SAN.lx1 - SW / 2, (a0 + a1) / 2, SW, a1 - a0, { tag: 'garud-sanctum' });
    }
    box(SAN.lx1 - SW / 2, PL + 2.6, SZ, SW, H - 2.6, DOOR, C.LIME);
    { const q = p(SAN.lx1 + 0.02, SZ); if (cuspedArch) cuspedArch(b, q[0], PL, q[1], DOOR, 2.6, 0.3, rot + Math.PI / 2, C.WHITE, 5, null); }
    // the roof, and the shikhara on it: white, curvilinear, ribbed, an amalaka and a kalash
    box((SAN.lx0 + SAN.lx1) / 2, PL + H, SZ, SAN.lx1 - SAN.lx0 + 0.4, 0.35, SAN.lz1 - SAN.lz0 + 0.4, C.WHITE_SH);
    {
      const cx = (SAN.lx0 + SAN.lx1) / 2 - 0.5, base = PL + H + 0.35;
      const rings = [];
      // a nagara curve: near upright for most of its height, then drawn in hard to the neck
      for (let k = 0; k <= 12; k++) {
        const f = k / 12;
        rings.push([base + f * 7.0, 0.6 + 2.4 * Math.pow(1 - f * f * f, 0.5)]);
      }
      lathe(cx, SZ, rings, 8, (i, s) => (s % 2 ? C.WHITE : C.WHITE_SH), Math.PI / 8);
      const top = base + 7.0;
      lathe(cx, SZ, [[top, 0.9], [top + 0.25, 1.05], [top + 0.5, 0.9], [top + 0.55, 0.3]], 12, C.WHITE);
      lathe(cx, SZ, [[top + 0.55, 0.32], [top + 0.8, 0.4], [top + 1.05, 0.2], [top + 1.3, 0.0]], 8, C.GOLD);
      box(cx, top + 1.2, SZ, 0.05, 1.6, 0.05, C.DARK);
      box(cx + 0.35, top + 2.4, SZ, 0.7, 0.4, 0.02, C.SINDOOR);
    }
    // the mandapa: pillars and a flat roof over the plinth before the door
    for (const lz of [SAN.lz0 + 0.5, SAN.lz0 + 4.2, SAN.lz1 - 4.2, SAN.lz1 - 0.5]) {
      box(MAN.lx1 - 0.4, PL, lz, 0.4, 3.4, 0.4, C.WHITE);
      post(MAN.lx1 - 0.4, lz, 0.25);
    }
    box((MAN.lx0 + MAN.lx1) / 2, PL + 3.4, SZ, MAN.lx1 - MAN.lx0 + 0.6, 0.3, SAN.lz1 - SAN.lz0 + 0.6, C.LIME_DK);
    box((MAN.lx0 + MAN.lx1) / 2, PL + 3.7, SZ, MAN.lx1 - MAN.lx0 + 0.3, 0.4, SAN.lz1 - SAN.lz0 + 0.3, C.WHITE);
    // the bell over the door
    lathe(SAN.lx1 + 0.8, SZ, [[PL + 2.9, 0.0], [PL + 2.9, 0.16], [PL + 3.15, 0.1], [PL + 3.3, 0.04]], 8, C.GOLD_DK);
  }
  // Govind on Garuda, at the sanctum's back wall, facing the door (+lx)
  const AX = SAN.lx0 + 1.6;
  {
    // the backdrop: yellow and gold, mirror-worked, as the photograph has it
    box(SAN.lx0 + 0.5, PL, SZ, 0.12, 3.4, 3.6, C.PITAMBAR);
    box(SAN.lx0 + 0.56, PL + 0.6, SZ, 0.06, 2.4, 2.6, C.GOLD);
    for (let k = 0; k < 9; k++) {
      const a = (k / 8 - 0.5) * Math.PI;
      box(SAN.lx0 + 0.6, PL + 2.0 + Math.cos(a) * 1.0, SZ + Math.sin(a) * 1.2, 0.04, 0.16, 0.16, k % 2 ? C.GARLAND : 0xf6f0e0);
    }
    // the altar platform
    box(AX, PL, SZ, 1.6, 0.7, 2.4, C.WHITE);
    box(AX, PL + 0.7, SZ, 1.7, 0.08, 2.5, C.GOLD);
    const Y = PL + 0.78;
    /*
     * The figures at 1.4 times the first cut, which read as a doll from the
     * door: the photograph has them filling the shrine's opening.
     */
    const S = 1.4, _box = box;
    // eslint-disable-next-line no-shadow
    const box2 = (lx, y, lz, w, h, d, col, ang = 0) => _box(AX + (lx - AX) * S, Y + (y - Y) * S, SZ + (lz - SZ) * S, w * S, h * S, d * S, col, ang);
    // Garuda, kneeling, wings up and out, hands joined; his face to the door
    box2(AX, Y, SZ, 0.55, 0.32, 0.6, C.OCHRE);                               // the folded legs
    box2(AX + 0.02, Y + 0.32, SZ, 0.42, 0.62, 0.46, C.OCHRE);                // the body
    for (const e of [-1, 1]) {
      box2(AX - 0.05, Y + 0.6, SZ + e * 0.55, 0.12, 0.85, 0.7, e > 0 ? C.GOLD : C.GOLD_DK, 0);        // the wings
      box2(AX - 0.08, Y + 1.25, SZ + e * 0.8, 0.1, 0.5, 0.45, C.SINDOOR);
    }
    box2(AX + 0.28, Y + 0.6, SZ, 0.14, 0.24, 0.16, C.OCHRE);                 // the hands, joined
    box2(AX + 0.02, Y + 0.94, SZ, 0.26, 0.26, 0.26, C.OCHRE);                // the head
    box2(AX + 0.2, Y + 0.98, SZ, 0.16, 0.08, 0.08, C.BEAK);                  // the beak
    // Govind on his shoulders: four-armed, dark, in yellow, crowned
    const GY = Y + 1.2;
    box2(AX - 0.02, GY, SZ, 0.5, 0.22, 0.5, C.PITAMBAR);                     // seated, the dhoti
    for (const e of [-1, 1]) box2(AX + 0.16, GY - 0.32, SZ + e * 0.16, 0.12, 0.34, 0.12, C.KRISHNA);   // the legs down Garuda's chest
    box2(AX - 0.02, GY + 0.22, SZ, 0.36, 0.5, 0.34, C.KRISHNA);              // the body
    for (let k = 0; k < 9; k++) box2(AX + 0.16, GY + 0.62 - Math.sin(k / 8 * Math.PI) * 0.36, SZ + (k / 8 - 0.5) * 0.36, 0.06, 0.06, 0.06, C.GARLAND);
    for (const [e, up] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) {
      box2(AX + 0.04, GY + 0.5 + up * 0.22, SZ + e * (0.26 + up * 0.1), 0.1, 0.1, 0.32, C.KRISHNA, 0);
    }
    lathe(AX + 0.28 * S, SZ + 0.46 * S, [[Y + (GY + 0.68 - Y) * S, 0.06 * S], [Y + (GY + 0.8 - Y) * S, 0.1 * S], [Y + (GY + 0.92 - Y) * S, 0.0]], 6, 0xf4f0e6);      // the conch
    lathe(AX + 0.28 * S, SZ - 0.46 * S, [[Y + (GY + 0.7 - Y) * S, 0.1 * S], [Y + (GY + 0.74 - Y) * S, 0.12 * S], [Y + (GY + 0.78 - Y) * S, 0.0]], 8, C.GOLD);         // the discus
    box2(AX - 0.02, GY + 0.72, SZ, 0.16, 0.08, 0.16, C.KRISHNA);             // the neck
    box2(AX - 0.02, GY + 0.8, SZ, 0.24, 0.26, 0.24, C.KRISHNA);              // the head
    lathe(AX - 0.02 * S, SZ, [[Y + (GY + 1.04 - Y) * S, 0.15 * S], [Y + (GY + 1.2 - Y) * S, 0.17 * S], [Y + (GY + 1.38 - Y) * S, 0.1 * S], [Y + (GY + 1.5 - Y) * S, 0.0]], 8, C.GOLD);   // the crown
    post(AX, SZ, 0.95, { top: PL + 0.7 });
  }

  /* ================================================================
   * DARSHAN
   * ================================================================ */
  // in the LOCATION's frame, which is the tank's moved to the pin
  return {
    YT, PL,
    altar: { lx: AX - OX, lz: SZ - OZ, y: PL + 2.0 },
    darshan: { lx: MAN.lx0 + 3.6 - OX, lz: SZ - OZ },
    floor: PL,
    /*
     * The hall is the SANCTUM: the walled room with its one door. The mandapa
     * before it is pillars and a roof, open on three sides, and a wall line
     * drawn round both was a third open (temples.mjs). The door stays at the
     * foot of the mandapa's steps, on the court, where the corona can be seen.
     */
    hall: { lx0: SAN.lx0 - OX, lx1: SAN.lx1 - OX, lz0: SAN.lz0 - OZ, lz1: SAN.lz1 - OZ, door: [MAN.lx1 + 0.6 - OX, SZ - OZ] },
    meshes,
  };
}
