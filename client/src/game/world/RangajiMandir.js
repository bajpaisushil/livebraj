/**
 * SRI RANGJI MANDIR (Sri Goda-Rangamannar), 1845-51.
 *
 * From docs/research/rangaji.md, survey and checker, the checker winning where
 * they disagree. "A walled Sri Vaishnava temple-city 236 m long by 135 m wide
 * ... five concentric rectangular prakaras of buff sandstone with white stucco
 * Dravidian gopurams rising out of them, entered from the town through a 28 m
 * North Indian gatehouse, with a stepped tank and a four-square garden filling
 * its entire eastern third."
 *
 * THE FRAME: the box frame turned so +lz points WEST — the principal entrance
 * and the town — along the long axis, which OSM bears at 89.3; +lx points
 * south. Origin: the OSM enclosure's centroid as the checker re-derived it.
 * The survey's plan grid (x east and y south from the NW corner, the compound
 * centre at x 123, y 82) maps as lz = 123 - x, lx = y - 82.
 *
 * WHAT IS MEASURED AND WHAT IS NOT: the outer wall, 236 x 135, is Growse's
 * and good. The four inner rings are read off satellite to ±3 m through roofs
 * (the checker: treat as uncertain). No source gives any gopuram's height —
 * 35 m west and 26 m east are the survey's tala arithmetic, and they are NOT
 * the 38.1 m of the Rangji at Pushkar, which the checker warns will leak in.
 * The tank's quadrant and the garden's geometry are satellite readings the
 * checker would not endorse. All of this is built, and all of it says so.
 */

import { TAU } from '../../engine/math/MathUtils.js';

/** Colours: the survey's MEASURED hexes, moderated toward the checker's re-samples. */
const C = {
  STUCCO: 0xddd3be,      // gopuram stucco in sun: survey #E8E0D1, checker #CFC2A7
  STUCCO_SH: 0xab9d7d,   // "Shaded recesses"
  MOULD: 0xa4a6a5,       // "de-saturates to neutral grey, with near-black streaks below every projecting cornice"
  STREAK: 0x3a3c3b,
  STONE: 0xae8a54,       // gopuram base / prakara wall: survey #B69358, checker #A57F4C
  STONE_SH: 0x7a6040,
  GATE: 0xc4a274,        // the west gatehouse: survey #BD9A6C, checker #CBAA7D
  GATE_SH: 0x6d5031,     // "bracket/chhajja soffits in shade"
  PIER: 0xb69378,        // cloister piers
  ASHLAR: 0x82664c,      // "ashlar wall behind"
  FLAG: 0xd3c5b4,        // court paving, "a warm pink-buff flag, not grey"
  RED: 0xb8332b,         // polychrome, INFERRED (backlit samples)
  BLUE: 0x2b3e9b, GREEN: 0x1f7a4c, YELLOW: 0xe0a81e,
  GOLD: 0xc9a03c,
  SAFFRON: 0xe8891f,
  TANK_PLASTER: 0xb79a88, TANK_PINK: 0xb4a28c, TANK_MAROON: 0x775443,
  WATER: 0x8c9982,       // "opaque green ... algal, not blue"
  TURQUOISE: 0x3aa6a0,   // the axis pool, "turquoise-tiled" (hex INFERRED)
  INSCRIPTION: 0xa8281e, // "long painted Devanagari inscription bands in RED"
  LAWN: 0x5f8a3e,
  EARTH: 0xb49a78,
};

export function buildRangaji(o) {
  const { b, loc, ground, terrain, colliders, rng } = o;
  const { cuspedArch, ribbedDome, tint } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, ang = 0, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : ground; };
  const topOf = (lx0, lx1, lz0, lz1, n = 3) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const h = tH(lx0 + (lx1 - lx0) * i / n, lz0 + (lz1 - lz0) * j / n);
      if (h > hi) hi = h;
    }
    return hi;
  };
  const faceR = (localAng) => { const wa = rot + localAng; return Math.atan2(Math.cos(wa), Math.sin(wa)); };
  const W = Math.PI / 2;                   // local angle of +lz: west, the front

  /* ---------------------------------------------------------------
   * THE PLAN, in the builder's frame
   * --------------------------------------------------------------- */
  // the outer wall, Growse's 773 x 440 ft
  const P1 = { lz0: -118, lz1: 118, lx0: -67.5, lx1: 67.5 };
  // the rings, off satellite (±3 m): the nest pushed 31 m west of centre
  const P2 = { lz0: -37, lz1: 99, lx0: -52, lx1: 52 };
  const P3 = { lz0: -23, lz1: 77, lx0: -36, lx1: 36 };
  const P4 = { lz0: -5, lz1: 63, lx0: -22, lx1: 22 };
  const CORE = { lz0: -1, lz1: 51, lx0: -12, lx1: 14 };
  const G = ground;
  const COURT = topOf(P1.lx0, P1.lx1, P1.lz0, P1.lz1, 10) + 0.04;   // the courts' flags

  /* ---------------------------------------------------------------
   * THE COURTS: paved in pink-buff flags, 3 m tiles at the ground's own height
   * --------------------------------------------------------------- */
  /** Pave a rectangle in rows of tiles merged into runs of one height. */
  const pave = (lx0, lx1, lz0, lz1, T, color, tag, skip = () => false) => {
    for (let lz = lz0 + T / 2; lz < lz1; lz += T) {
      let run = null;
      const flush = () => {
        if (!run) return;
        const cx = (run.a + run.c) / 2, w = run.c - run.a;
        box(cx, run.top - 0.35, lz, w, 0.35, T + 0.01, tint(color, 0.97 + 0.03 * ((Math.round(lz / T)) % 2)));
        solid(cx, lz, w, T, 0, { top: run.top, tag, standOnly: true });
        run = null;
      };
      for (let lx = lx0 + T / 2; lx < lx1; lx += T) {
        if (skip(lx, lz)) { flush(); continue; }
        const top = Math.max(topOf(lx - T / 2, lx + T / 2, lz - T / 2, lz + T / 2, 1) + 0.04, G + 0.04);
        if (run && Math.abs(top - run.top) < 0.03) { run.c = lx + T / 2; run.top = Math.max(run.top, top); }
        else { flush(); run = { a: lx - T / 2, c: lx + T / 2, top }; }
      }
      flush();
    }
  };
  // the courts, all but the tank's terrace and the garden, which have their own ground
  pave(P1.lx0, P1.lx1, P1.lz0, P1.lz1, 4.0, C.FLAG, 'rangaji-flags',
    (lx, lz) => (lz < P2.lz0 - 12 && lz > P2.lz0 - 66 && Math.abs(lx) > 15));

  /* ---------------------------------------------------------------
   * THE PRAKARA WALLS, with gates on the axis
   * --------------------------------------------------------------- */
  /** A wall run from (ax, az) to (bx, bz) along one side, `h` tall. */
  const wallRun = (ax, az, bx, bz, h, t, color, cap) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.3) return;
    const ang = Math.atan2(bz - az, bx - ax);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const y = Math.min(tH(ax, az), tH(bx, bz), tH(mx, mz)) - 0.2;
    box(mx, y, mz, L, h + 0.2, t, color, ang);
    if (cap) box(mx, y + h + 0.2, mz, L + 0.05, 0.3, t + 0.25, cap, ang);
    solid(mx, mz, L, t + 0.3, ang, { top: y + h + 0.5 });
  };
  /** A rectangular ring of wall with gaps on the axis at the west and east. */
  const ring = (R, h, t, color, cap, gapW, gapE) => {
    wallRun(R.lx0, R.lz0, R.lx0, R.lz1, h, t, color, cap);        // north
    wallRun(R.lx1, R.lz0, R.lx1, R.lz1, h, t, color, cap);        // south
    for (const [lz, gap] of [[R.lz1, gapW], [R.lz0, gapE]]) {
      wallRun(R.lx0, lz, -gap / 2, lz, h, t, color, cap);
      wallRun(gap / 2, lz, R.lx1, lz, h, t, color, cap);
    }
  };
  // the outer wall: "a long, low, blank sandstone wall" — its height is not
  // given; 7 m reads as a wall that hides everything but the towers
  ring(P1, 7.0, 1.2, C.STONE, C.STONE_SH, 12.3, 8.0);
  ring(P2, 5.2, 0.9, C.STONE, C.STONE_SH, 19.0, 15.0);
  ring(P3, 4.8, 0.8, C.STONE, C.STONE_SH, 7.0, 7.0);
  ring(P4, 4.6, 0.8, C.STONE, C.STONE_SH, 7.0, 7.0);

  /* ---------------------------------------------------------------
   * THE CLOISTERS round the inner courts
   * --------------------------------------------------------------- */
  /*
   * "Continuous single-storey colonnade, flat roofed. Square sandstone piers
   * with a moulded capital, figural relief panels on the lower shaft ... and
   * rearing yali/vyala brackets at the head. Roughly 3.5-4 m tall at ~3 m
   * centres, standing on a plinth ~0.9 m above the court." Behind, "a plain
   * ashlar wall ... long painted Devanagari inscription bands in red". And
   * the checker: some courts' shafts are "painted in the standard South
   * Indian red-and-white vertical banding" — which courts is not known; the
   * inner one is given it here (INFERRED).
   */
  const cloister = (R, depth, striped, gateHalfW = 0, gateHalfE = 0) => {
    const PL = 0.9, PH = 3.7, SP = 3.0;
    // [start, end, fixed coordinate, along lz?, inward sign]; the west and
    // east runs stop either side of the gopuram standing in their gap
    const runs = [
      [R.lz0 + depth, R.lz1 - depth, R.lx0, true, 1],
      [R.lz0 + depth, R.lz1 - depth, R.lx1, true, -1],
      [R.lx0 + depth, -gateHalfE, R.lz0, false, 1],
      [gateHalfE, R.lx1 - depth, R.lz0, false, 1],
      [R.lx0 + depth, -gateHalfW, R.lz1, false, -1],
      [gateHalfW, R.lx1 - depth, R.lz1, false, -1],
    ];
    for (const [a, c, fixed, alongZ, inw] of runs) {
      const L = c - a;
      if (L < 2) continue;
      const n = Math.max(2, Math.round(L / SP));
      // the plinth and the roof slab over the walk
      const mid = (a + c) / 2, off = fixed + inw * depth / 2;
      const [plx, plz] = alongZ ? [off, mid] : [mid, off];
      const [pw, pd] = alongZ ? [depth, L] : [L, depth];
      const y0 = COURT;
      box(plx, y0 - 0.2, plz, pw, PL + 0.2, pd, C.STONE_SH);
      solid(plx, plz, pw, pd, 0, { top: y0 + PL, tag: 'rangaji-cloister', floor: true });
      box(plx, y0 + PL + PH, plz, pw + 0.3, 0.45, pd + 0.3, C.STONE);
      box(plx, y0 + PL + PH + 0.45, plz, pw + 0.4, 0.35, pd + 0.4, C.STONE_SH);
      // the red inscription band on the wall behind
      const [ilx, ilz] = alongZ ? [fixed + inw * 0.62, mid] : [mid, fixed + inw * 0.62];
      box(ilx, y0 + PL + 2.6, ilz, alongZ ? 0.04 : L - 1, 0.32, alongZ ? L - 1 : 0.04, C.INSCRIPTION);
      for (let k = 0; k <= n; k++) {
        const t = a + (k / n) * L, edge = fixed + inw * depth;
        const [lx, lz] = alongZ ? [edge, t] : [t, edge];
        const y = y0 + PL;
        box(lx, y, lz, 0.55, 0.35, 0.55, C.STONE_SH);                              // base
        if (striped) {
          for (let s2 = 0; s2 < 6; s2++) box(lx, y + 0.35 + s2 * 0.3, lz, 0.46, 0.3, 0.46, s2 % 2 ? 0xf2ece0 : C.RED);
          box(lx, y + 2.15, lz, 0.46, PH - 2.55, 0.46, C.PIER);
        } else {
          box(lx, y + 0.35, lz, 0.46, PH - 0.75, 0.46, C.PIER);
          box(lx, y + 0.7, lz, 0.5, 0.9, 0.5, tint(C.PIER, 0.92));                // the relief panel
        }
        box(lx, y + PH - 0.4, lz, 0.62, 0.4, 0.62, C.STONE);                        // capital
        // the rearing yali bracket, reaching into the walk
        const [bx, bz] = alongZ ? [lx - inw * 0.45, lz] : [lx, lz - inw * 0.45];
        box(bx, y + PH - 0.9, bz, alongZ ? 0.6 : 0.3, 0.55, alongZ ? 0.3 : 0.6, tint(C.STONE, 0.9));
        post(lx, lz, 0.3, { h: PL + PH });
      }
    }
  };
  cloister(P2, 5.0, false, 10.5, 8.5);
  cloister(P3, 4.5, false, 5.3, 5.3);
  cloister(P4, 4.0, true, 5.3, 5.3);

  /* ---------------------------------------------------------------
   * GOPURAMS
   * --------------------------------------------------------------- */
  /*
   * "Base (lower ~30-33% of the height): plain, sharply battered ashlar
   * sandstone ... a heavy moulded cornice with small lion/yali corbels at the
   * top. One rectangular gateway, roughly 3.5-4 m wide and 5-6 m high ...
   * Superstructure: 7 receding talas ... Each tala has, on the axis, ONE small
   * rectangular window with a timber grille ... paired large standing figures;
   * either side, a continuous frieze of miniature shrines — alternating square
   * kutas and oblong salas ... at the tala corners, large projecting figures
   * that lean outward ... Crown: an oblong barrel-vaulted sala with a ribbed
   * roof and flared, horn-like end scrolls, carrying SEVEN gold pot-kalashas".
   * One small painted Vaishnava emblem over the third tala; ivory limewash
   * with black mould under every cornice.
   */
  const gopuram = (lzC, talas, H, baseW, baseD, kalashas, faceSign) => {
    const y0 = COURT;
    const baseH = H * 0.31;
    const DOOR = 3.8, DOOR_H = 5.6;
    // the battered stone base, in two halves either side of the passage
    for (const sd of [-1, 1]) {
      const w = (baseW - DOOR) / 2, lx = sd * (DOOR / 2 + w / 2);
      const q = p(lx, lzC);
      b.prism(q[0], y0, q[1], w, baseD, w - 0.7, baseD - 1.1, baseH, C.STONE, rot);
      solid(lx, lzC, w, baseD);
      // the large flush panels
      for (let k = 0; k < 2; k++) {
        const t = (k - 0.5) * (w - 1.4) / 2 + lx;
        for (const fz of [lzC + baseD / 2 - 0.3, lzC - baseD / 2 + 0.3]) box(t, y0 + 1.2, fz, (w - 2.0) / 2, baseH - 2.6, 0.1, tint(C.STONE, 1.06));
      }
    }
    // the lintel mass over the passage, and the passage's timber doors, open
    box(0, y0 + DOOR_H, lzC, DOOR + 0.2, baseH - DOOR_H, baseD - 0.9, C.STONE);
    for (const sd of [-1, 1]) box(sd * (DOOR / 2 - 0.12), y0, lzC + faceSign * (baseD / 2 - 1.3), 0.14, DOOR_H - 0.2, 1.8, 0x4a3220);
    // the heavy cornice with its yali corbels
    const cY = y0 + baseH;
    box(0, cY - 0.2, lzC, baseW - 0.3, 0.7, baseD - 0.8, C.STONE_SH);
    for (let k = 0; k < 9; k++) {
      const lx = -baseW / 2 + 0.8 + k * (baseW - 1.6) / 8;
      for (const fz of [lzC + baseD / 2 - 0.35, lzC - baseD / 2 + 0.35]) box(lx, cY - 0.55, fz, 0.35, 0.4, 0.3, tint(C.STONE, 0.88));
    }
    // the talas, receding to a crest about a third of the base's width
    const talaH = (H - baseH - 3.2) / talas;
    let y = cY + 0.5, w0 = baseW - 1.2, d0 = baseD - 1.4;
    const shrink = Math.pow(0.36, 1 / talas), dShrink = Math.pow(0.45, 1 / talas);
    for (let t = 0; t < talas; t++) {
      const w = w0 * Math.pow(shrink, t), d = d0 * Math.pow(dShrink, t);
      const w1 = w * shrink, d1 = d * dShrink;
      const q = p(0, lzC);
      b.prism(q[0], y, q[1], w, d, w1 + 0.3, d1 + 0.3, talaH, t % 2 ? C.STUCCO : tint(C.STUCCO, 0.97), rot);
      // the cornice lip, and the frieze of kutas and salas along it
      box(0, y + talaH - 0.25, lzC, w1 + 0.9, 0.25, d1 + 0.9, C.STUCCO);
      const n = Math.max(3, Math.round(w1 / 1.2));
      for (let k = 0; k < n; k++) {
        const lx = -w1 / 2 + (k + 0.5) * w1 / n;
        for (const fz of [lzC + d1 / 2 + 0.3, lzC - d1 / 2 - 0.3]) {
          const sala = k % 2 === 1;
          box(lx, y + talaH, fz, sala ? 0.9 : 0.5, sala ? 0.45 : 0.6, 0.5, C.STUCCO);
          if (sala) box(lx, y + talaH + 0.45, fz, 0.8, 0.15, 0.4, C.STUCCO_SH);
        }
      }
      // the one centre-line window with its grille, front and back
      for (const sgn of [1, -1]) {
        const fz = lzC + sgn * (d + d1) / 4 + sgn * 0.12;
        box(0, y + talaH * 0.3, fz, 0.8, talaH * 0.45, 0.1, 0x2a2016);
        for (let g = -1; g <= 1; g++) box(g * 0.24, y + talaH * 0.3, fz + sgn * 0.06, 0.05, talaH * 0.45, 0.04, 0x6a4a2a);
        // the paired standing figures either side of it
        for (const sd of [-1, 1]) box(sd * 1.0, y + talaH * 0.15, fz + sgn * 0.1, 0.42, talaH * 0.7, 0.3, C.STUCCO);
        // mould streaks under the cornice
        for (let k = 0; k < 5; k++) box(-w / 2 + 0.6 + k * (w - 1.2) / 4 + 0.3, y + talaH * 0.45, fz + sgn * 0.05, 0.12, talaH * 0.5, 0.02, k % 2 ? C.STREAK : C.MOULD);
      }
      // the corner figures, leaning out
      for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        box(ox * (w1 / 2 + 0.1), y + talaH * 0.2, lzC + oz * (d1 / 2 + 0.1), 0.4, talaH * 0.7, 0.4, tint(C.STUCCO, 1.03), ox * oz * 0.3);
      }
      // "one small painted Vaishnava emblem (chakra / urdhva-pundra / shankha) over a mid tala"
      if (t === 2) {
        const fz = lzC + faceSign * ((d + d1) / 4 + 0.2);
        box(0, y + talaH * 0.82, fz, 0.9, 0.12, 0.04, 0xf4f0e6);
        for (const sd of [-1, 1]) box(sd * 0.4, y + talaH * 0.82, fz, 0.12, 0.9, 0.04, 0xf4f0e6);
        box(0, y + talaH * 0.9, fz, 0.1, 0.7, 0.05, C.RED);
      }
      y += talaH;
    }
    // the crest: the oblong barrel-vaulted sala, ribbed, horn-ended, and its kalashas
    const wc = w0 * Math.pow(shrink, talas) + 0.6, dc = Math.max(2.4, d0 * Math.pow(dShrink, talas));
    box(0, y, lzC, wc, 0.6, dc, C.STUCCO_SH);
    const R = dc / 2;
    for (let k = 0; k < 7; k++) {
      const a0 = Math.PI * k / 7, a1 = Math.PI * (k + 1) / 7;
      const za = Math.cos(a0) * R, ya = Math.sin(a0) * R * 0.9, zb = Math.cos(a1) * R, yb = Math.sin(a1) * R * 0.9;
      const A = p(-wc / 2, lzC + za), B = p(wc / 2, lzC + za), Cc = p(wc / 2, lzC + zb), D = p(-wc / 2, lzC + zb);
      const yy = y + 0.6;
      const col = k % 2 ? C.STUCCO : tint(C.STUCCO, 0.9);                         // ribbed
      b.quad([A[0], yy + ya, A[1]], [D[0], yy + yb, D[1]], [Cc[0], yy + yb, Cc[1]], [B[0], yy + ya, B[1]], col);
    }
    // the vault's end faces, and the flared horn-like scrolls
    for (const sd of [-1, 1]) {
      box(sd * (wc / 2 - 0.1), y + 0.6, lzC, 0.2, R * 0.9, dc, C.STUCCO);
      box(sd * (wc / 2 + 0.35), y + 0.6 + R * 0.7, lzC, 0.9, 0.5, 0.7, C.STUCCO, sd * 0.4);
      box(sd * (wc / 2 + 0.7), y + 0.6 + R * 0.95, lzC, 0.5, 0.6, 0.5, C.STUCCO, sd * 0.7);
    }
    // the gold pot-kalashas in a row along the ridge
    const ky = y + 0.6 + R * 0.9;
    for (let k = 0; k < kalashas; k++) {
      const lx = -wc / 2 + 0.5 + k * (wc - 1.0) / Math.max(1, kalashas - 1);
      const q = p(lx, lzC);
      b.bevelBox(q[0], ky, q[1], 0.42, 0.5, 0.42, C.GOLD, rot, 0.14);
      b.box(q[0], ky + 0.5, q[1], 0.12, 0.35, 0.12, C.GOLD, rot);
    }
    // the flagpole with its saffron flag, and a lightning conductor
    const fq = p(wc / 2 - 0.4, lzC);
    b.box(fq[0], ky, fq[1], 0.08, 3.4, 0.08, 0x8a8a86, rot);
    b.panel(fq[0] + 0.5 * Math.cos(rot), ky + 2.9, fq[1] + 0.5 * Math.sin(rot), 0.9, 0.55, C.SAFFRON, faceR(W), 0);
    const lq = p(-wc / 2 + 0.4, lzC);
    b.box(lq[0], ky, lq[1], 0.04, 2.2, 0.04, 0x5a5a58, rot);
    return { top: ky + 0.85 };
  };

  // "the WESTERN RAJAGOPURAM, seven talas" — ~35 m, ESTIMATED (range 30-40 m)
  const WEST_G = 92;
  gopuram(WEST_G, 7, 35, 19, 13, 7, 1);
  // "The eastern gopuram is the same grammar at five talas" — ~26 m, ESTIMATED
  gopuram(P2.lz0, 5, 26, 15, 11, 7, -1);
  /*
   * "Small inner gates (e.g. the Vaikunth Dwar): the same grammar at 3 talas
   * with FIVE gold kalashas, over a doorway whose surround is brilliantly
   * painted rather than plain." Two on the axis, on the third and fourth
   * rings; the survey's "pairs symmetrically north and south" are, per the
   * checker, not to be built.
   */
  for (const lzG of [P3.lz1, P4.lz1]) {
    gopuram(lzG, 3, 13, 8.5, 6.5, 5, 1);
    // the painted surround on its west face: gold scrollwork jambs on maroon
    const fz = lzG + 3.3;
    box(0, COURT, fz, 4.6, 5.8, 0.1, 0x5a1a22);
    for (const sd of [-1, 1]) box(sd * 2.05, COURT, fz + 0.05, 0.35, 5.6, 0.04, C.GOLD);
    box(0, COURT + 5.5, fz + 0.05, 4.4, 0.3, 0.04, C.GOLD);
    box(0, COURT + 4.4, fz + 0.06, 1.2, 0.9, 0.04, C.BLUE);                        // a framed deity panel
  }
  // the painted stone elephants flanking the west gopuram's steps
  for (const sd of [-1, 1]) {
    const lx = sd * 3.4, lz = WEST_G + 8.5, y = COURT;
    box(lx, y, lz, 1.0, 0.5, 2.0, 0xb8a888);                                       // plinth
    box(lx, y + 0.5, lz, 1.0, 1.1, 1.9, 0x1e1e20);                                 // body
    box(lx, y + 0.9, lz, 1.06, 0.5, 1.2, C.YELLOW);                                // caparison
    box(lx, y + 1.4, lz + 1.0, 0.8, 0.8, 0.7, 0x1e1e20);                           // head
    box(lx, y + 0.7, lz + 1.4, 0.22, 0.9, 0.22, 0x1e1e20);                         // trunk
    for (const tx of [-0.2, 0.2]) box(lx + tx, y + 1.1, lz + 1.45, 0.08, 0.08, 0.5, 0xf4f0e6);   // tusks
    solid(lx, lz, 1.0, 2.0);
  }

  /* ---------------------------------------------------------------
   * THE WEST GATEHOUSE — the town's face of the temple
   * --------------------------------------------------------------- */
  /*
   * Growse: "The principal or western entrance of the outer court is
   * surmounted by a pavilion, ninety-three feet high, constructed in the
   * Mathura style after the design of a native artist." 28.35 m; footprint
   * 12.3 (E-W) x 17.9 (N-S) astride the outer wall. Storey 1: "one huge cusped
   * (multifoil, ~11-13 foils) arch on the axis, ~5.5 m wide, filled with a
   * studded two-leaf timber door"; chhajja on "roughly 40-45" serpentine
   * brackets with a jali balustrade; storey 2 "11 arched openings across the
   * front" (3 + 5 + 3, confirmed by the checker); storey 3 "a recessed
   * pavilion of 5 arched openings"; and the crown — the checker's correction
   * — ONE curved bangaldar roof mass "with upturned scrolled ends, four corner
   * finials and a taller central finial with a lightning rod". No ribbed dome.
   */
  {
    const lzC = P1.lz1, WG = 17.9, DG = 12.3, y0 = COURT;
    const S1 = 9.0, S2 = 7.0, S3 = 6.0;
    // storey 1: the two masses either side of the great arch
    const ARCH = 5.5;
    for (const sd of [-1, 1]) {
      const w = (WG - ARCH) / 2, lx = sd * (ARCH / 2 + w / 2);
      box(lx, y0 - 0.2, lzC, w, S1 + 0.2, DG, C.GATE);
      solid(lx, lzC, w, DG);
      // the blind cusped niches and the small doorway, both faces
      for (const fz of [lzC + DG / 2 + 0.02, lzC - DG / 2 - 0.02]) {
        const q = p(lx - sd * 1.3, fz), q2 = p(lx + sd * 1.6, fz);
        cuspedArch(b, q[0], y0 + 1.6, q[1], 2.0, 4.6, 0.12, rot, C.GATE_SH, 7, tint(C.GATE, 0.86));
        cuspedArch(b, q2[0], y0, q2[1], 1.4, 3.0, 0.12, rot, C.GATE_SH, 5, 0x2a2016);
      }
    }
    box(0, y0 + 7.0, lzC, ARCH + 0.2, S1 - 7.0, DG, C.GATE);
    const aq = p(0, lzC);
    cuspedArch(b, aq[0], y0, aq[1], ARCH, 7.0, DG, rot, C.GATE_SH, 12, null);
    // the studded two-leaf door, standing open against the passage walls
    for (const sd of [-1, 1]) {
      box(sd * (ARCH / 2 - 0.1), y0, lzC + DG / 2 - 1.6, 0.16, 5.4, 2.6, 0x4a3220);
      for (let r2 = 0; r2 < 6; r2++) for (let c2 = 0; c2 < 3; c2++) box(sd * (ARCH / 2 - 0.2), y0 + 0.6 + r2 * 0.8, lzC + DG / 2 - 2.5 + c2 * 0.9, 0.05, 0.1, 0.1, 0x9a8a60);
    }
    // the first chhajja on its serpentine brackets, and the jali balustrade
    const chhajja = (y, w, d) => {
      box(0, y, lzC, w + 2.6, 0.22, d + 2.6, C.GATE);
      for (const fz of [lzC + d / 2 + 0.55, lzC - d / 2 - 0.55]) {
        for (let k = 0; k < 42; k++) {
          const lx = -w / 2 + (k + 0.5) * w / 42;
          box(lx, y - 0.75, fz, 0.14, 0.75, 1.0, C.GATE_SH);
        }
      }
      box(0, y + 0.22, lzC + d / 2 + 1.1, w + 2.4, 0.9, 0.12, tint(C.GATE, 0.9));
      box(0, y + 0.22, lzC - d / 2 - 1.1, w + 2.4, 0.9, 0.12, tint(C.GATE, 0.9));
    };
    chhajja(y0 + S1, WG, DG);
    // storey 2: the open gallery of 3 + 5 + 3 arches
    const y2 = y0 + S1 + 0.22;
    box(0, y2, lzC, WG - 1.0, 0.3, DG - 1.0, C.GATE);
    const groups = [[-6.6, 3], [0, 5], [6.6, 3]];
    for (const fz of [lzC + (DG - 1.0) / 2, lzC - (DG - 1.0) / 2]) {
      for (const [gc, n] of groups) {
        const bw = n === 5 ? 1.35 : 1.2;
        for (let k = 0; k < n; k++) {
          const lx = gc + (k - (n - 1) / 2) * bw;
          const q = p(lx, fz);
          cuspedArch(b, q[0], y2 + 0.3, q[1], bw - 0.3, S2 - 1.0, 0.4, rot, C.GATE, 7, null);
          box(lx - bw / 2, y2 + 0.3, fz, 0.28, S2 - 0.6, 0.45, C.GATE);
        }
        box(gc + (n * bw) / 2, y2 + 0.3, fz, 0.7, S2 - 0.6, 0.6, C.GATE_SH);       // the carved pier between groups
      }
    }
    // the gallery's back wall, set in, and the roof over it
    box(0, y2 + 0.3, lzC, WG - 3.0, S2 - 0.6, DG - 3.4, tint(C.GATE, 0.8));
    chhajja(y2 + S2 - 0.2, WG - 1.4, DG - 1.4);
    // storey 3: the recessed pavilion of five arches, with jali
    const y3 = y2 + S2 + 0.02;
    box(0, y3, lzC, WG - 5.0, 0.3, DG - 4.6, C.GATE);
    for (const fz of [lzC + (DG - 5.0) / 2, lzC - (DG - 5.0) / 2]) {
      for (let k = 0; k < 5; k++) {
        const lx = (k - 2) * 2.2;
        const q = p(lx, fz);
        cuspedArch(b, q[0], y3 + 0.3, q[1], 1.6, S3 - 1.4, 0.35, rot, C.GATE, 7, 0x8a7458);
        box(lx - 1.1, y3 + 0.3, fz, 0.3, S3 - 1.0, 0.4, C.GATE);
      }
    }
    box(0, y3 + 0.3, lzC, WG - 6.4, S3 - 1.0, DG - 6.0, tint(C.GATE, 0.82));
    // the crown: ONE bangaldar roof — a curved vault with an outward-sweeping
    // eave with upturned scrolled ends, blind-arcaded tympana, finials
    const y4 = y3 + S3 - 0.7;
    const RW = WG - 5.4, RD = DG - 5.0;
    for (let k = 0; k < 12; k++) {
      const t0 = k / 12, t1 = (k + 1) / 12;
      const za = (t0 - 0.5) * RD, zb = (t1 - 0.5) * RD;
      const ya = Math.sin(t0 * Math.PI) * 2.3, yb = Math.sin(t1 * Math.PI) * 2.3;
      const A = p(-RW / 2, lzC + za), B = p(RW / 2, lzC + za), Cc = p(RW / 2, lzC + zb), D = p(-RW / 2, lzC + zb);
      b.quad([A[0], y4 + 0.4 + ya, A[1]], [D[0], y4 + 0.4 + yb, D[1]], [Cc[0], y4 + 0.4 + yb, Cc[1]], [B[0], y4 + 0.4 + ya, B[1]], k % 3 ? C.GATE : tint(C.GATE, 0.92));
    }
    box(0, y4, lzC, RW + 0.4, 0.4, RD + 0.4, C.GATE_SH);
    for (const sd of [-1, 1]) {
      box(sd * (RW / 2), y4 + 0.4, lzC, 0.3, 2.0, RD * 0.9, C.GATE);                     // the tympana
      for (let k = -1; k <= 1; k++) {
        const q = p(sd * (RW / 2 + 0.16), lzC + k * RD * 0.28);
        cuspedArch(b, q[0], y4 + 0.5, q[1], RD * 0.24, 1.3, 0.06, rot + Math.PI / 2, C.GATE_SH, 5, tint(C.GATE, 0.85));
      }
    }
    // the eave, sweeping out and turning up at its ends
    for (const fz of [-1, 1]) {
      for (let k = 0; k < 16; k++) {
        const t = (k + 0.5) / 16, lx = (t - 0.5) * (RW + 1.6);
        const lift = Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.9;
        box(lx, y4 - 0.1 + lift, lzC + fz * (RD / 2 + 0.6), (RW + 1.6) / 16 + 0.04, 0.2, 1.2, C.GATE_SH);
      }
    }
    for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const q = p(ox * RW / 2, lzC + oz * RD / 2);
      b.box(q[0], y4 + 0.4, q[1], 0.26, 1.7, 0.26, C.GATE, rot);
      b.bevelBox(q[0], y4 + 2.1, q[1], 0.36, 0.4, 0.36, C.GOLD, rot, 0.1);
    }
    const tq = p(0, lzC);
    b.box(tq[0], y4 + 2.7, tq[1], 0.35, 1.4, 0.35, C.GATE, rot);
    b.bevelBox(tq[0], y4 + 4.1, tq[1], 0.45, 0.5, 0.45, C.GOLD, rot, 0.12);
    b.box(tq[0], y4 + 4.6, tq[1], 0.05, 1.0, 0.05, 0x5a5a58, rot);                   // the lightning rod
  }

  /* ---------------------------------------------------------------
   * THE SANCTUM, THE MANDAPA AND THE FLAGSTAFF
   * --------------------------------------------------------------- */
  /*
   * The vimana: "a small two-to-three tala white stucco shrine crowned by a
   * horseshoe-arched apsidal gable (a nasika/sukanasa form) with a kirtimukha
   * crest, which only just clears the plain red-brown parapet in front of it.
   * It is emphatically NOT a tall tower." And on the mandapa roofs, the
   * polychrome: "saturated ultramarine/cobalt blue, vermilion red, emerald
   * green, chrome yellow and white on the miniature shrines and figures".
   */
  let altarAt = null, darshanAt = null, hall = null;
  {
    const y0 = COURT, FL = y0 + 0.9;
    const cx = (CORE.lx0 + CORE.lx1) / 2;
    // the mandapa: a long flat-roofed pillared hall, the sanctum at its east end
    box(cx, y0 - 0.2, (CORE.lz0 + CORE.lz1) / 2, CORE.lx1 - CORE.lx0, 1.1, CORE.lz1 - CORE.lz0, C.STONE_SH);
    solid(cx, (CORE.lz0 + CORE.lz1) / 2, CORE.lx1 - CORE.lx0, CORE.lz1 - CORE.lz0, 0, { top: FL, tag: 'temple-floor', floor: true });
    // front steps up to it, on the axis
    for (let i = 0; i < 3; i++) {
      const lz = CORE.lz1 + 0.35 + (2 - i) * 0.45 + 0.225;
      box(cx, y0 - 0.05 + i * 0.3, lz, 6.0, 0.35, 0.45, C.STONE);
      solid(cx, lz, 6.0, 0.45, 0, { top: y0 + (i + 1) * 0.3, tag: 'temple-step', standOnly: true });
    }
    const H = 5.2;
    // its outer walls, with the doorway on the west
    const SX0 = CORE.lx0, SX1 = CORE.lx1, SZ0 = CORE.lz0, SZ1 = CORE.lz1;
    for (const [lx, w] of [[SX0 + 0.35, 0.7], [SX1 - 0.35, 0.7]]) {
      box(lx, FL, (SZ0 + SZ1) / 2, w, H, SZ1 - SZ0, C.STONE);
      solid(lx, (SZ0 + SZ1) / 2, w, SZ1 - SZ0, 0, { top: FL + H });
    }
    box(cx, FL, SZ0 + 0.35, SX1 - SX0, H, 0.7, C.STONE);
    solid(cx, SZ0 + 0.35, SX1 - SX0, 0.7, 0, { top: FL + H });
    for (const sd of [-1, 1]) {
      const a2 = sd < 0 ? SX0 : cx + 2.0, c2 = sd < 0 ? cx - 2.0 : SX1;
      box((a2 + c2) / 2, FL, SZ1 - 0.35, c2 - a2, H, 0.7, C.STONE);
      solid((a2 + c2) / 2, SZ1 - 0.35, c2 - a2, 0.7, 0, { top: FL + H });
    }
    box(cx, FL + 4.2, SZ1 - 0.35, 4.2, H - 4.2, 0.7, C.STONE);
    // inside, a pillared hall under a flat roof, lined so it reads from the door
    box(cx, FL + H, (SZ0 + SZ1) / 2, SX1 - SX0 + 0.4, 0.45, SZ1 - SZ0 + 0.4, C.STONE_SH);
    const inner = p(cx, SZ0 + 0.72);
    b.panel(inner[0], FL + H / 2, inner[1], SX1 - SX0 - 1.5, H, 0xc8b08a, faceR(W), 0.01);
    for (const sd of [-1, 1]) {
      const sq = p(sd < 0 ? SX0 + 0.72 : SX1 - 0.72, (SZ0 + SZ1) / 2);
      b.panel(sq[0], FL + H / 2, sq[1], SZ1 - SZ0 - 1.5, H, 0xbfa884, faceR(sd < 0 ? 0 : Math.PI), 0.01);
    }
    for (let k = 0; k < 6; k++) {
      const lz = SZ1 - 6 - k * 6.5;
      for (const lx of [cx - 5.0, cx + 5.0]) { box(lx, FL, lz, 0.6, H, 0.6, C.PIER); post(lx, lz, 0.4); }
    }
    // the sanctum at the east end: its shrine, the altar, the Deity's place
    box(cx, FL, SZ0 + 4.5, 7.0, 0.9, 5.0, C.STONE_SH);
    box(cx, FL + 0.9, SZ0 + 4.5, 7.2, 0.12, 5.2, C.GOLD);
    box(cx, FL + 1.02, SZ0 + 2.3, 6.0, 3.4, 0.2, 0x5a1a22);
    solid(cx, SZ0 + 4.5, 7.0, 5.0, 0, { top: FL + 0.9, tag: 'rangaji-altar' });
    altarAt = { lx: cx, lz: SZ0 + 4.6, y: FL + 1.5 };
    darshanAt = { lx: cx, lz: SZ0 + 11.5 };
    hall = { lx: cx, lz: (SZ0 + SZ1) / 2, hw: (SX1 - SX0) / 2, hd: (SZ1 - SZ0) / 2, floor: FL, door: [cx, SZ1 + 1.5] };
    // the vimana over it: small, two talas, and its apsidal gable
    const vz = SZ0 + 4.5, vy = FL + H + 0.45;
    const vq = p(cx, vz);
    b.prism(vq[0], vy, vq[1], 7.0, 6.0, 5.4, 4.6, 2.6, C.STUCCO, rot);
    b.prism(vq[0], vy + 2.6, vq[1], 5.2, 4.4, 4.0, 3.4, 2.2, tint(C.STUCCO, 0.97), rot);
    // the horseshoe-arched gable, facing west, with its kirtimukha crest
    {
      const gy = vy + 4.8, gz = vz + 1.9;
      for (let k = 0; k < 14; k++) {
        const a0 = Math.PI * 1.15 * (k / 14) - 0.075 * Math.PI, a1 = Math.PI * 1.15 * ((k + 1) / 14) - 0.075 * Math.PI;
        const A = p(cx - Math.cos(a0) * 1.9, gz), B = p(cx - Math.cos(a1) * 1.9, gz);
        const Bk = p(cx - Math.cos(a1) * 1.9, gz - 3.2), Ak = p(cx - Math.cos(a0) * 1.9, gz - 3.2);
        b.quad([A[0], gy + Math.sin(a0) * 1.9, A[1]], [Ak[0], gy + Math.sin(a0) * 1.9, Ak[1]], [Bk[0], gy + Math.sin(a1) * 1.9, Bk[1]], [B[0], gy + Math.sin(a1) * 1.9, B[1]], C.STUCCO);
      }
      box(cx, gy - 0.1, gz - 1.6, 3.8, 0.4, 3.4, C.STUCCO_SH);
      const face = p(cx, gz + 0.05);
      b.panel(face[0], gy + 0.9, face[1], 2.8, 1.9, tint(C.STUCCO, 0.94), faceR(W), 0.02);
      box(cx, gy + 1.85, gz, 0.9, 0.7, 0.5, tint(C.STUCCO, 1.03));                   // the kirtimukha crest
    }
    // "the plain red-brown parapet in front of it"
    box(cx, FL + H + 0.45, SZ0 + 9.0, SX1 - SX0 - 1.0, 1.4, 0.5, 0x7a4a36);
    // the polychrome parapet of miniature shrines along the mandapa's roof
    const pal = [C.BLUE, C.RED, C.GREEN, C.YELLOW, 0xf4f0e6];
    for (const sd of [-1, 1]) {
      const lx = sd < 0 ? SX0 + 0.4 : SX1 - 0.4;
      for (let k = 0; k < 16; k++) {
        const lz = SZ0 + 11 + k * ((SZ1 - SZ0 - 12) / 15);
        box(lx, FL + H + 0.45, lz, 0.7, k % 2 ? 0.9 : 0.6, 1.3, pal[(k + (sd > 0 ? 2 : 0)) % pal.length]);
        if (k % 2) box(lx, FL + H + 1.35, lz, 0.5, 0.25, 0.9, pal[(k + 1) % pal.length]);
      }
    }
    for (let k = 0; k < 8; k++) {
      const lx = SX0 + 1.5 + k * ((SX1 - SX0 - 3) / 7);
      box(lx, FL + H + 0.45, SZ1 - 0.4, 1.2, k % 2 ? 0.9 : 0.6, 0.7, pal[k % pal.length]);
    }
  }
  /*
   * The dhvaja stambha: Growse — "of copper gilt, sixty feet in height" — and
   * the checker: gilded plates over a core the 1949 caption calls sandalwood,
   * "Build a gilded jointed mast; leave the core material open". In the
   * inner court in front of the sanctum mandapa, "a slender jointed metal-clad
   * mast with visible ring collars and guy wires, on a carved lotus plinth
   * inside a railing"; the checker counts two guy wires, not three or four.
   */
  {
    const lz = 56, lx = 1, y = COURT;
    const q = p(lx, lz);
    b.prism(q[0], y, q[1], 2.5, 2.5, 1.6, 1.6, 0.9, C.STONE, rot);                     // the lotus plinth
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      b.box(q[0] + Math.cos(a) * 1.05, y + 0.7, q[1] + Math.sin(a) * 1.05, 0.5, 0.35, 0.3, tint(C.STONE, 1.08), a);
    }
    const MH = 18.3, N = 12;
    for (let k = 0; k < N; k++) {
      const t = k / N, r = 0.27 - 0.12 * t;
      b.box(q[0], y + 0.9 + t * MH, q[1], r * 2, MH / N, r * 2, C.GOLD, rot);
      b.box(q[0], y + 0.9 + (t + 1 / N) * MH - 0.12, q[1], r * 2 + 0.12, 0.12, r * 2 + 0.12, tint(C.GOLD, 1.1), rot);   // the ring collars
    }
    b.bevelBox(q[0], y + 0.9 + MH, q[1], 0.5, 0.6, 0.5, C.GOLD, rot, 0.15);
    // the railing round it, and its two guy wires
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      b.box(q[0] + Math.cos(a) * 1.9, y, q[1] + Math.sin(a) * 1.9, 0.06, 1.2, 0.06, 0x3a3a3a);
    }
    post(lx, lz, 2.0, { h: 1.2 + (y - ground) });
    for (const sd of [-1, 1]) {
      const gx = lx + sd * 9, gz = lz;
      const top = [q[0], y + 0.9 + MH * 0.8, q[1]], g2 = p(gx, gz);
      const N2 = 10;
      for (let k = 0; k < N2; k++) {
        const t0 = k / N2, t1 = (k + 1) / N2;
        const ax = top[0] + (g2[0] - top[0]) * t0, ay = top[1] + (y - top[1]) * t0, az = top[2] + (g2[1] - top[2]) * t0;
        const bx = top[0] + (g2[0] - top[0]) * t1, by = top[1] + (y - top[1]) * t1, bz = top[2] + (g2[1] - top[2]) * t1;
        b.box((ax + bx) / 2, (ay + by) / 2 - 0.02, (az + bz) / 2, 0.03, Math.abs(ay - by) + 0.04, 0.03, 0x2a2a2a);
      }
    }
  }
  // the square shrine with a white ribbed dome and a big Hanuman at its foot,
  // "a north-Indian dome sitting inside a Dravidian compound" — its place in
  // the courts is not surveyed (INFERRED: the second court, north side)
  {
    const lx = -42, lz = 60, y = COURT;
    box(lx, y - 0.1, lz, 8.0, 1.0, 8.0, C.STONE_SH);
    box(lx, y + 0.9, lz, 6.4, 4.6, 6.4, C.STONE);
    solid(lx, lz, 8.0, 8.0);
    const q = p(lx, lz);
    ribbedDome(b, q[0], y + 5.5, q[1], 3.0, 3.4, 0xf4f0e8, 0xe2dccf, 20);
    b.bevelBox(q[0], y + 8.9, q[1], 0.9, 1.2, 0.9, C.GOLD, rot, 0.3);
    // Hanuman, big, at its west foot: saffron-vermilion, mace on his shoulder
    const hz = lz + 5.0;
    box(lx, y + 0.9, hz, 1.4, 1.7, 1.0, 0xd2491f);
    box(lx, y + 2.6, hz, 1.0, 0.9, 0.8, 0xd2491f);
    box(lx + 0.8, y + 2.2, hz, 0.35, 1.8, 0.35, C.GOLD);
    for (const sd of [-1, 1]) box(lx + sd * 2.2, y + 0.9, hz - 0.8, 0.8, 1.4, 0.6, 0xf4f0e8);   // white figures beside
  }

  /* ---------------------------------------------------------------
   * THE EAST THIRD: THE TANK, THE GARDEN, AND THE AVENUE BETWEEN
   * --------------------------------------------------------------- */
  /*
   * Growse: the walls "enclose a fine tank and garden in addition to the
   * actual temple-court". The survey measures the tank in the NE quadrant and
   * the garden in the SE, "separated by a ~20 m processional avenue on the
   * axis" with a turquoise-tiled pool; the checker will not endorse the split
   * (two texts put the pushkarni "between the two gopurams") nor the garden's
   * four-square geometry. Built as measured, and flagged.
   */
  {
    const TZ = -77, TX = -40, y = COURT;
    /*
     * ON A TERRACE, which the real one is not. The ground here is a height
     * field 12 m to a cell and its mesh 22 m to a quad, so a pit 2.8 m deep
     * cannot be cut into it — the terrain would draw straight over the steps
     * and the water. So the tank court is raised 2.5 m and the ghats go down
     * inside it to water that sits above the terrain: from within the court it
     * reads as the sunken tank; from outside it shows a plinth. Holes in the
     * terrain for basins like this are queued.
     */
    const TW = 45, TD = 48, TOP = y + 2.5, STEPS = 6, DROP = (TOP - (y + 0.08)) / STEPS, RUN = 1.0;
    const WATER_W = 30, WATER_D = 32, PW = WATER_W + STEPS * RUN * 2, PD = WATER_D + STEPS * RUN * 2;
    // the terrace round the pit, as four strips, solid from the courts
    for (const [lx, lz, w, d] of [[TX - (TW + PW) / 4, TZ, (TW - PW) / 2, TD], [TX + (TW + PW) / 4, TZ, (TW - PW) / 2, TD],
      [TX, TZ - (TD + PD) / 4, PW, (TD - PD) / 2], [TX, TZ + (TD + PD) / 4, PW, (TD - PD) / 2]]) {
      box(lx, y - 0.3, lz, w, TOP - y + 0.3, d, C.TANK_PLASTER);
      solid(lx, lz, w, d, 0, { top: TOP, tag: 'rangaji-tank-court', floor: true });
    }
    // the ghats, down all four sides to the water
    for (let s2 = 0; s2 < STEPS; s2++) {
      const w = WATER_W + (STEPS - s2) * RUN * 2, d = WATER_D + (STEPS - s2) * RUN * 2, top = TOP - (s2 + 1) * DROP;
      const col = s2 === STEPS - 1 ? C.TANK_MAROON : s2 % 2 ? C.TANK_PLASTER : tint(C.TANK_PLASTER, 0.94);
      // each course a ring: four strips, one run wide
      for (const [lx, lz, ww, dd] of [[TX - w / 2 + RUN / 2, TZ, RUN, d], [TX + w / 2 - RUN / 2, TZ, RUN, d],
        [TX, TZ - d / 2 + RUN / 2, w - RUN * 2, RUN], [TX, TZ + d / 2 - RUN / 2, w - RUN * 2, RUN]]) {
        box(lx, y - 0.3, lz, ww, top - y + 0.3, dd, col);
        solid(lx, lz, ww, dd, 0, { top, tag: 'temple-step', standOnly: true });
      }
    }
    // the pink string course round the pit's edge — a band, not a lid
    for (const [lx, lz, w, d] of [[TX - PW / 2, TZ, 0.14, PD + 0.2], [TX + PW / 2, TZ, 0.14, PD + 0.2],
      [TX, TZ - PD / 2, PW + 0.2, 0.14], [TX, TZ + PD / 2, PW + 0.2, 0.14]]) box(lx, TOP - 0.3, lz, w, 0.16, d, C.TANK_PINK);
    box(TX, y + 0.02, TZ, WATER_W + 0.1, 0.06, WATER_D + 0.1, C.WATER);
    // you may walk down the ghats, but not into the water
    solid(TX, TZ, WATER_W, WATER_D, 0, { top: y + 1.2, tag: 'rangaji-tank' });
    // "a long NORTH INDIAN arcade of cusped multifoil arches" round the court
    // (the checker, from the Gajraj Kund photograph), standing on the terrace
    for (const [a2, c2, fixed, alongZ] of [[TZ - TD / 2, TZ + TD / 2, TX - TW / 2 + 0.4, true], [TZ - TD / 2, TZ + TD / 2, TX + TW / 2 - 0.4, true],
      [TX - TW / 2, TX + TW / 2, TZ - TD / 2 + 0.4, false], [TX - TW / 2, TX + TW / 2, TZ + TD / 2 - 0.4, false]]) {
      const n = Math.round((c2 - a2) / 3.2);
      for (let k = 0; k <= n; k++) {
        const t = a2 + k * (c2 - a2) / n;
        const [lx, lz] = alongZ ? [fixed, t] : [t, fixed];
        box(lx, TOP, lz, 0.6, 3.4, 0.6, C.TANK_PLASTER);
        post(lx, lz, 0.35, { top: TOP + 3.4 });
        if (k < n) {
          const tm = a2 + (k + 0.5) * (c2 - a2) / n;
          const [mx, mz] = alongZ ? [fixed, tm] : [tm, fixed];
          const q = p(mx, mz);
          cuspedArch(b, q[0], TOP, q[1], (c2 - a2) / n - 0.6, 3.4, 0.6, alongZ ? rot + Math.PI / 2 : rot, C.TANK_PLASTER, 9, null);
        }
      }
      const L = c2 - a2, mid = (a2 + c2) / 2;
      const [mx, mz] = alongZ ? [fixed, mid] : [mid, fixed];
      box(mx, TOP + 3.4, mz, alongZ ? 0.8 : L, 0.5, alongZ ? L : 0.8, C.TANK_PLASTER);
      box(mx, TOP + 3.9, mz, alongZ ? 0.9 : L, 0.18, alongZ ? L : 0.9, C.TANK_PINK);
    }
    // and a flight up to the terrace from the avenue
    {
      const N = 6, R2 = (TOP - y) / N, TR = 0.5, lzF = TZ;
      for (let i = 0; i < N; i++) {
        const lx = TX + TW / 2 + (N - i) * TR - TR / 2;
        box(lx, y - 0.05 + i * R2, lzF, TR, R2 + 0.05, 5.0, C.TANK_PLASTER);
        solid(lx, lzF, TR, 5.0, 0, { top: y + (i + 1) * R2, tag: 'temple-step-tank', standOnly: true });
      }
      for (const sd of [-1, 1]) {
        box(TX + TW / 2 + N * TR / 2, y - 0.05, lzF + sd * 2.8, N * TR, TOP - y + 0.9, 0.5, C.TANK_PLASTER);
        solid(TX + TW / 2 + N * TR / 2, lzF + sd * 2.8, N * TR, 0.5, 0, { top: TOP + 0.9, tag: 'temple-rail' });
      }
    }
    // "two projecting chhatri kiosks on gabled pedestals over the water"
    for (const sd of [-1, 1]) {
      const kx = TX, kz = TZ + sd * 9;
      box(kx, y + 0.08, kz, 2.4, TOP - y - 0.3, 2.4, C.TANK_PLASTER);
      const q = p(kx, kz), ky = TOP - 0.2;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4;
        b.box(q[0] + Math.cos(a) * 0.95, ky, q[1] + Math.sin(a) * 0.95, 0.2, 2.2, 0.2, C.TANK_PLASTER);
      }
      b.box(q[0], ky + 2.2, q[1], 2.8, 0.2, 2.8, C.TANK_PINK, rot);
      ribbedDome(b, q[0], ky + 2.4, q[1], 1.2, 1.3, C.TANK_PLASTER, tint(C.TANK_PLASTER, 0.9), 12);
    }
    // the garden: green, with trees, the only greenery inside the walls
    const GX = 40, GZ = -77, GW = 45, GD = 48;
    const gy = topOf(GX - GW / 2, GX + GW / 2, GZ - GD / 2, GZ + GD / 2, 4) + 0.04;
    box(GX, gy - 0.3, GZ, GW, 0.3, GD, C.LAWN);
    solid(GX, GZ, GW, GD, 0, { top: gy, tag: 'rangaji-garden', standOnly: true });
    box(GX, gy + 0.005, GZ, 3.0, 0.02, GD, C.EARTH);                                   // the cross paths
    box(GX, gy + 0.005, GZ, GW, 0.02, 3.0, C.EARTH);
    for (let k = 0; k < 16; k++) {
      const tx = GX + (rng() - 0.5) * (GW - 8), tz = GZ + (rng() - 0.5) * (GD - 8);
      if (Math.abs(tx - GX) < 3 || Math.abs(tz - GZ) < 3) continue;
      const q = p(tx, tz);
      b.prism(q[0], gy, q[1], 0.5, 0.5, 0.35, 0.35, 2.4, 0x6a5138, rot);
      b.bevelBox(q[0], gy + 2.2, q[1], 3.2, 2.4, 3.2, k % 2 ? 0x3d6a33 : 0x4a7a3a, rng() * 3, 0.5);
      post(tx, tz, 0.4);
    }
    // the garden's wall
    for (const [ax, az, bx, bz] of [[GX - GW / 2, GZ - GD / 2, GX - GW / 2, GZ + GD / 2], [GX + GW / 2, GZ - GD / 2, GX + GW / 2, GZ + GD / 2],
      [GX - GW / 2, GZ - GD / 2, GX + GW / 2, GZ - GD / 2]]) wallRun(ax, az, bx, bz, 2.4, 0.5, C.STONE, C.STONE_SH);
    wallRun(GX - GW / 2, GZ + GD / 2, GX - 2.5, GZ + GD / 2, 2.4, 0.5, C.STONE, C.STONE_SH);
    wallRun(GX + 2.5, GZ + GD / 2, GX + GW / 2, GZ + GD / 2, 2.4, 0.5, C.STONE, C.STONE_SH);
    // the turquoise-tiled pool on the axis avenue, "function UNKNOWN"
    const PZ = -63;
    box(0, y - 0.1, PZ, 10.4, 0.5, 20.4, 0xe6dccc);
    box(0, y + 0.02, PZ, 9.6, 0.4, 19.6, C.TURQUOISE);
    solid(0, PZ, 10.4, 20.4, 0, { top: y + 0.9, tag: 'rangaji-pool' });
  }
  // the east gate in the outer wall: "two stone gates carved in Jaipur style
  // on the eastern and the western side" (the trust) — a plain arched gate
  {
    const lzC = P1.lz0, y = COURT;
    for (const sd of [-1, 1]) { box(sd * 5.2, y - 0.2, lzC, 2.4, 8.4, 3.0, C.GATE); solid(sd * 5.2, lzC, 2.4, 3.0); }
    box(0, y + 6.2, lzC, 8.0, 2.0, 3.0, C.GATE);
    const q = p(0, lzC);
    cuspedArch(b, q[0], y, q[1], 7.6, 6.2, 3.0, rot, C.GATE_SH, 9, null);
    const kq = p(0, lzC);
    b.box(kq[0], y + 8.2, kq[1], 5.0, 0.3, 3.4, C.GATE_SH, rot);
    ribbedDome(b, kq[0], y + 8.5, kq[1], 1.3, 1.4, C.GATE, C.GATE_SH, 12);
  }

  /* ---------------------------------------------------------------
   * THE WEST FORECOURT
   * --------------------------------------------------------------- */
  /*
   * "ONLY the WEST has open space: a broad irregular forecourt between the
   * gatehouse and the street, with trees, parked cars and buses, stalls, and a
   * curving access road that sweeps around the north-west corner." And
   * Growse: "A little to one side of the entrance is a detached shed, in which
   * the god's rath, or carriage, is kept" — the 50 ft rath, out once a year.
   */
  {
    const lz0 = P1.lz1 + 1, lz1 = P1.lz1 + 50;
    const T = 5;
    for (let lz = lz0 + T / 2; lz < lz1; lz += T) {
      for (let lx = -45; lx < 45; lx += T) {
        const top = topOf(lx - T / 2, lx + T / 2, lz - T / 2, lz + T / 2, 1) + 0.03;
        box(lx, top - 0.3, lz, T + 0.01, 0.3, T + 0.01, (Math.round(lx / T) + Math.round(lz / T)) % 2 ? 0xc8b08a : 0xbfa67e);
        solid(lx, lz, T, T, 0, { top, tag: 'rangaji-forecourt', standOnly: true });
      }
    }
    // the rath shed, north of the gate: tall enough for a 15 m chariot
    {
      const lx = -30, lz = lz0 + 10, y = topOf(lx - 6, lx + 6, lz - 5, lz + 5, 2);
      box(lx, y, lz, 12, 17, 10, 0xb89a70);
      box(lx, y + 17, lz, 12.8, 0.5, 10.8, C.STONE_SH);
      box(lx + 0.02, y, lz - 5.02, 7.0, 15.5, 0.1, 0x4a3a2a);                          // its tall doors, shut
      solid(lx, lz, 12, 10);
    }
    // trees, stalls and parked vehicles in the open ground
    for (const [tx, tz] of [[-12, lz0 + 30], [18, lz0 + 22], [30, lz0 + 38], [-38, lz0 + 36]]) {
      const y = tH(tx, tz), q = p(tx, tz);
      b.prism(q[0], y, q[1], 0.9, 0.9, 0.6, 0.6, 4.5, 0x6a5138, rot);
      b.bevelBox(q[0], y + 4.2, q[1], 6, 3.6, 6, 0x3f6d35, 0.4, 0.8);
      post(tx, tz, 0.6);
    }
    for (let k = 0; k < 5; k++) {
      const lx = 14 + k * 4.4, lz = lz0 + 4, y = tH(lx, lz);
      box(lx, y, lz, 3.6, 2.4, 2.6, 0xd8cbb0);
      box(lx, y + 2.4, lz + 1.4, 4.0, 0.08, 1.6, [0xc0562f, 0x2f6f4f, 0xb0882e, 0x7a4a86, 0x2b5f8a][k]);
      solid(lx, lz, 3.6, 2.6);
    }
    // a bus and two cars
    {
      const y = tH(-4, lz0 + 40);
      box(-4, y + 0.4, lz0 + 40, 2.5, 2.7, 11, 0xd8d0b8, 0.2);
      box(-4, y + 1.5, lz0 + 40, 2.55, 0.9, 10.4, 0x2b3a4a, 0.2);
      solid(-4, lz0 + 40, 2.5, 11, 0.2);
      for (const [cx2, cz2, col] of [[9, lz0 + 44, 0xb8b8b4], [13, lz0 + 43, 0x8a2f24]]) {
        const yy = tH(cx2, cz2);
        box(cx2, yy + 0.3, cz2, 1.7, 1.0, 4.0, col, 0.1);
        box(cx2, yy + 1.3, cz2, 1.5, 0.55, 2.2, 0x2b3a4a, 0.1);
        solid(cx2, cz2, 1.7, 4.0, 0.1);
      }
    }
  }

  return {
    altar: altarAt, darshan: darshanAt, hall,
    compound: { lx0: P1.lx0 - 1, lx1: P1.lx1 + 1, lz0: P1.lz0 - 2, lz1: P1.lz1 + 52 },
  };
}
