/**
 * BRAHMA KUND — the Brahma Sthan of Vrindavan, on the northern edge of
 * Rangaji's temple: where Vrinda Devi bathed Narada into a gopi so he could
 * see the rasa, and where Rupa Goswami found her deity.
 *
 * WHAT IS THERE TODAY. By the 2000s the kund had been a municipal rubbish
 * dump for decades, encroached on all four sides, one of its ghats turned
 * into a house (indiawaterportal.org, 2017). The Braj Foundation restored it
 * from July 2006, thirty months of work: earthmovers dug down to the water,
 * the natural aquifers opened and filled it, and the silt they took out was
 * landscaped round it as a garden. In the old walled pit they built
 * "octagonal ghats with steps", with fish and turtles carved on them; in the
 * middle "an 8 ft high Brahma sitting over the 13 ft wide lotus flower",
 * each petal a fountain; on the walls 39 stone plaques of 5 x 3 ft carrying
 * the Brahma Samhita; life-size statues of the saints; "one of the ancient
 * pillars ... left intact to tell people how old the kund is" (DTE, 2014).
 *
 * Built from:
 *   - ESRI z19 imagery, measured: the octagon 28.4 m across its flats,
 *     centred 11 m south of where OSM draws its water (OSM's circle sits on
 *     the north garden; its enclosure, way 671678180, fits the walls), the
 *     water 17.6 m, the lotus a pale disc at the exact centre, the statue
 *     bay a notch in the north wall, the entrance a strip running south to
 *     the lane, with a building on it;
 *   - the Braj Foundation's photographs (brajfoundation.org) from the dig
 *     to the opening: the old pit's walls 6 m high with houses on them, round
 *     bastions, the two-tier octagon of red sandstone with its zigzag
 *     flights going in, the round well at the centre that became the lotus's
 *     ring, the finished garden with hedges along the rim;
 *   - photographs of 2014 and 2017 (martinsatte.livejournal.com,
 *     brajrasik.org): the walls painted pink, the eight saints on a ledge
 *     between two pink bastions, plaques in rows, the entrance — a pink
 *     gatehouse with a flight down each side of it from a railed terrace on
 *     its roof, an old unpainted brick bastion either side of it — green
 *     water, Brahma white with gold crowns on a pink lotus, a swan by him.
 *
 * THE FRAME: origin the octagon's centre, +lx east, +lz south, turned to
 * OSM's enclosure (-0.7 degrees).
 *
 * INFERRED, and said so: the depths (the photographs give two tiers of ten
 * risers and walls about four times a tier above the octagon's rim; 6 m and
 * 3.2 m); the stepwell pattern on all eight sides (each tier's flights drawn
 * as the photographs show them on the sides they show); the entrance's
 * flight from the lane, which the imagery shows as broad steps without
 * saying how many; which saint stands where; the trees' species.
 * Brahma faces north, toward the saints, as in every photograph since 2014
 * (the first statue, in 2008, faced the entrance).
 */

const C = {
  PINK: 0xe996ae, PINK_LT: 0xf2adc2, PINK_DK: 0xc77a92, PINK_LINE: 0xd88aa1,  // the painted walls
  RED: 0xbd6158, RED_LT: 0xcf776b, RED_DK: 0x9a4b45, RED_TOP: 0xd2857a,       // the octagon: red sandstone
  BRICK: 0xa26a50, BRICK_DK: 0x8a5842, BRICK_LT: 0xb67c5e,                    // the old bastions, left as found
  WATER: 0x5f873c, MUD: 0x2c3520,   // olive, as bright as the river's teal under the same material                                             // green, as every photograph has it
  HEDGE: 0x3c6528, HEDGE2: 0x4a7a31, GRASS: 0x6d8a3c, GRASS2: 0x5f7d34,
  PAVE: 0xc98274, PAVE2: 0xbb7467,
  MARBLE: 0xf3efe6, MARBLE_SH: 0xd9d3c6, GOLD: 0xd6a632, GOLD_DK: 0xb08422,
  LOTUS: 0xe0609a, LOTUS_LT: 0xf4b8cf, POD: 0xf0c844, STEM: 0xb4486c,
  RAIL: 0xe08aa6, PLAQUE: 0x7e6e60, PLAQUE_TXT: 0xd6c9b0, LAMP: 0xfff0c8,
  TRUNK: 0x5b4632, LEAF: 0x3f6a2a, LEAF2: 0x4d7a31, PALM: 0x557f34,
  STATUE: 0xebe6da, STATUE_SH: 0xd2ccbe,
  TURTLE: 0x5d6b4c, FISH: 0xd9893a, DOOR: 0x5a382a, DARK: 0x23160f, BOOK: 0xb8282a, POT: 0xc89a3a,
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* The octagon, as apothems from its centre, in metres. */
const A0 = 14.2;      // the rim, at the garden
const AS = 13.0;      // the upper tier's flights run between this and the rim
const A1 = 11.6;      // the lower tier's wall; the mid landing between it and AS
const AL = 10.4;      // the lower tier's flights run between this and A1
const A3 = 8.8;       // the water's edge; the water landing between it and AL
const T8 = Math.tan(Math.PI / 8);
const RISE = 0.16, TREAD = 0.3, RISERS = 10;   // a tier: ten risers, as the photographs count them

/**
 * The location's `basin`: the walled pit to the outside of its walls, and the
 * flight cut down into it from the lane. The town's houses stand against it.
 */
export const BRAHMA_BASIN = [
  { lx0: -20.0, lx1: 18.5, lz0: -22.0, lz1: 15.5 },
  { lx0: -7.9, lx1: 7.6, lz0: 15.5, lz1: 34.0 },
];

/**
 * @param o.b, o.loc, o.terrain, o.colliders, o.h { cuspedArch, tint, dome }
 * @returns {{altar, darshan, floor, YT, YG}}
 */
export function buildBrahmaKund(o) {
  const { b, loc, terrain, colliders } = o;
  const { cuspedArch, tint, MeshBuilder } = o.h;
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
  /** A convex polygon facing up, its corners in the frame in any order. */
  const upPoly = (pts, y, col) => {
    const w = pts.map(([lx, lz]) => p(lx, lz));
    let A = 0;
    for (let i = 0; i < w.length; i++) { const a = w[i], c = w[(i + 1) % w.length]; A += a[0] * c[1] - c[0] * a[1]; }
    const q = A < 0 ? w : w.slice().reverse();      // up-facing is the negative winding in x/z
    for (let i = 1; i < q.length - 1; i++) b.tri(q[0][0], y, q[0][1], q[i][0], y, q[i][1], q[i + 1][0], y, q[i + 1][1], col);
  };
  /** An upright face from a to c, y0 to y1, its front toward the point `toward`. */
  const vface = (a, c, y0, y1, col, toward) => {
    const A = p(...a), Cc = p(...c), T = p(...toward);
    const nx = -(Cc[1] - A[1]), nz = Cc[0] - A[0];
    const front = nx * (T[0] - (A[0] + Cc[0]) / 2) + nz * (T[1] - (A[1] + Cc[1]) / 2) > 0;
    const [P0, P1] = front ? [A, Cc] : [Cc, A];
    b.quad([P0[0], y0, P0[1]], [P1[0], y0, P1[1]], [P1[0], y1, P1[1]], [P0[0], y1, P0[1]], col);
  };
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

  /* ================================================================
   * LEVELS
   * ================================================================ */
  let hi = -Infinity;
  for (const q of BRAHMA_BASIN) {
    for (let lx = q.lx0; lx <= q.lx1 + 0.01; lx += (q.lx1 - q.lx0) / 6) {
      for (let lz = q.lz0; lz <= q.lz1 + 0.01; lz += (q.lz1 - q.lz0) / 6) hi = Math.max(hi, tH(lx, lz));
    }
  }
  const YT = hi + 0.05;                    // the street, and the walls' tops
  const YG = YT - 6.0;                     // the garden: the old kund's bed
  const YM = YT - 3.0;                     // the terrace on the gatehouse
  const Y1 = YG - RISERS * RISE;           // the octagon's mid landing
  const Y2 = Y1 - RISERS * RISE;           // the water landing
  const YW = Y2 - 0.35;                    // the water
  const BASE = YG - 0.4;

  /*
   * Painted walls do not weather like bare stone, and nothing down here
   * stands on the street: the ramp runs from the garden up for the walls and
   * from the water up for the octagon, and only so far.
   */
  b.weather((y) => (y >= YG - 0.01
    ? 0.86 + 0.14 * clamp01((y - YG) / 2.2)
    : 0.86 + 0.14 * clamp01((y - YW) / 1.4)));

  /* ================================================================
   * THE OCTAGON
   * ================================================================ */
  /*
   * Eight sides, each in its own frame: s along the side, n out from the
   * centre, side k facing out at k x 45 degrees from east (k = 2 is the
   * south side, toward the entrance; 6 the north, toward the saints).
   *
   * Upper tier, rim to mid landing: from each corner a flight runs down
   * along the side's wall toward its middle, the two meeting in a bay at the
   * mid level. Lower tier, mid landing to the water landing: from the middle
   * a flight runs down each way to the corners. The landings go all the way
   * round. Nine treads and the landing a flight comes down onto: ten risers.
   */
  const sideP = (k, s, n) => {
    const th = k * Math.PI / 4;
    return [n * Math.cos(th) - s * Math.sin(th), n * Math.sin(th) + s * Math.cos(th)];
  };
  const SC = 4.63;                         // where the upper flights leave the corners, along the side
  const SB = SC - (RISERS - 1) * TREAD;    // ...and where they reach the bay
  const SH = 0.6;                          // the lower flights' head, either side of the middle
  const SL = SH + (RISERS - 1) * TREAD;    // ...and their feet
  for (let k = 0; k < 8; k++) {
    const r = rot + k * Math.PI / 4 + Math.PI / 2;    // box x along s, z along n
    const sbox = (s, n, y0, y1, L, D, col) => { const q = p(...sideP(k, s, n)); b.box(q[0], y0, q[1], L, y1 - y0, D, col, r); };
    const scol = (s, n, L, D, top, tag) => { const q = p(...sideP(k, s, n)); colliders.push({ type: 'box', x: q[0], z: q[1], w: L, d: D, rot: r, top, standOnly: true, tag }); };
    const sP = (s, n) => sideP(k, s, n);
    const centre = [0, 0];

    // the upper wall, under the rim
    vface(sP(-A0 * T8, A0), sP(A0 * T8, A0), Y1, YG, C.RED, centre);
    // the corners at the rim's level, from which both flights go down
    for (const e of [-1, 1]) {
      upPoly([sP(e * SC, AS), sP(e * AS * T8, AS), sP(e * A0 * T8, A0), sP(e * SC, A0)], YG, C.RED_TOP);
      vface(sP(e * SC, AS), sP(e * AS * T8, AS), Y1, YG, C.RED_DK, centre);
      vface(sP(e * SC, AS), sP(e * SC, A0), YG - RISE, YG, C.RED_DK, sP(0, (AS + A0) / 2));
      scol(e * (SC + A0 * T8) / 2, (AS + A0) / 2, A0 * T8 - SC, A0 - AS, YG, 'kund-corner');
    }
    // the upper flights
    for (let i = 1; i < RISERS; i++) {
      const top = YG - i * RISE;
      const sOut = SC - (i - 1) * TREAD, sIn = sOut - TREAD;
      for (const e of [-1, 1]) {
        sbox(e * (sOut + sIn) / 2, (AS + A0) / 2, Y1, top, TREAD, A0 - AS, tint(i % 2 ? C.RED_LT : C.RED, 0.97 + 0.05 * hash(k * 31 + i)));
        // a tag per flight: each is a straight stair, and steps.mjs walks it as one
        scol(e * (sOut + sIn) / 2, (AS + A0) / 2, TREAD, A0 - AS, top, `kund-step:${k}u${e > 0 ? '+' : '-'}`);
      }
    }
    // the bay the two flights come down to
    upPoly([sP(-SB, AS), sP(SB, AS), sP(SB, A0), sP(-SB, A0)], Y1, C.RED_TOP);
    scol(0, (AS + A0) / 2, SB * 2, A0 - AS, Y1, 'kund-landing');
    // the mid landing, all the way round
    upPoly([sP(-A1 * T8, A1), sP(A1 * T8, A1), sP(AS * T8, AS), sP(-AS * T8, AS)], Y1, tint(C.RED_TOP, 0.97));
    scol(0, (A1 + AS) / 2, AS * T8 * 2, AS - A1, Y1, 'kund-landing');
    // the lower wall
    vface(sP(-A1 * T8, A1), sP(A1 * T8, A1), Y2, Y1, C.RED, centre);
    // the lower flights' head, at the mid level
    sbox(0, (AL + A1) / 2, Y2, Y1, SH * 2, A1 - AL, C.RED);
    scol(0, (AL + A1) / 2, SH * 2, A1 - AL, Y1, 'kund-head');
    // the lower flights, out to the corners
    for (let i = 1; i < RISERS; i++) {
      const top = Y1 - i * RISE;
      const sIn = SH + (i - 1) * TREAD, sOut = sIn + TREAD;
      for (const e of [-1, 1]) {
        sbox(e * (sOut + sIn) / 2, (AL + A1) / 2, Y2, top, TREAD, A1 - AL, tint(i % 2 ? C.RED_LT : C.RED, 0.97 + 0.05 * hash(k * 17 + i)));
        scol(e * (sOut + sIn) / 2, (AL + A1) / 2, TREAD, A1 - AL, top, `kund-step:${k}l${e > 0 ? '+' : '-'}`);
      }
    }
    // the corners at the water landing's level, where the lower flights arrive
    for (const e of [-1, 1]) {
      upPoly([sP(e * SL, AL), sP(e * AL * T8, AL), sP(e * A1 * T8, A1), sP(e * SL, A1)], Y2, C.RED_TOP);
      scol(e * (SL + A1 * T8) / 2, (AL + A1) / 2, A1 * T8 - SL, A1 - AL, Y2, 'kund-landing');
    }
    // the water landing, all the way round, and its edge down into the water
    upPoly([sP(-A3 * T8, A3), sP(A3 * T8, A3), sP(AL * T8, AL), sP(-AL * T8, AL)], Y2, tint(C.RED_TOP, 0.95));
    scol(0, (A3 + AL) / 2, AL * T8 * 2, AL - A3, Y2, 'kund-landing');
    vface(sP(-A3 * T8, A3), sP(A3 * T8, A3), YW - 0.3, Y2, C.RED_DK, centre);
    /*
     * The water's edge: nobody walks into Brahma Kund — the lotus is in it —
     * and a step off the landing would put you on the pool's floor, 1.5 m
     * down. Knee-high and drawn by nobody, so the camera passes over it.
     */
    { const q = p(...sP(0, A3 - 0.18)); colliders.push({ type: 'box', x: q[0], z: q[1], w: A3 * T8 * 2 + 0.3, d: 0.25, rot: r, top: Y2 + 0.9, tag: 'kund-edge' }); }

    // the rim's coping, and the hedge along it, open at the corners
    upPoly([sP(-A0 * T8, A0), sP(A0 * T8, A0), sP((A0 + 0.4) * T8, A0 + 0.4), sP(-(A0 + 0.4) * T8, A0 + 0.4)], YG + 0.06, C.RED_LT);
    vface(sP(-A0 * T8, A0), sP(A0 * T8, A0), YG, YG + 0.06, C.RED_LT, centre);
    vface(sP(-(A0 + 0.4) * T8, A0 + 0.4), sP((A0 + 0.4) * T8, A0 + 0.4), YG, YG + 0.06, C.RED_LT, sP(0, A0 + 2));
    for (let j = 0; j < 4; j++) {
      const s0 = -4.4 + j * 2.2, hh = 0.75 + 0.12 * hash(k * 7 + j);
      sbox(s0 + 1.1, A0 + 0.95, YG, YG + hh, 2.2, 0.7, j % 2 ? C.HEDGE : C.HEDGE2);
    }
    { const q = p(...sP(0, A0 + 0.95)); colliders.push({ type: 'box', x: q[0], z: q[1], w: 8.8, d: 0.7, rot: r, top: YG + 0.8, tag: 'kund-hedge' }); }

    /*
     * The garden round the rim, out to the walls and under them: coping,
     * a paved walk behind the hedge, then grass — paved all the way on the
     * entrance side, which is the gatehouse's court.
     */
    const ring = (n0, n1, y, col) => upPoly([sP(-n0 * T8, n0), sP(n0 * T8, n0), sP(n1 * T8, n1), sP(-n1 * T8, n1)], y, col);
    ring(A0 + 0.4, A0 + 2.6, YG, k === 2 ? C.PAVE : C.PAVE2);
    ring(A0 + 2.6, A0 + 13, YG, k === 2 ? C.PAVE : (k % 2 ? C.GRASS2 : C.GRASS));

    // fish and turtles on the steps, as the restoration carved them
    if (k % 2 === 0) {
      const tq = sP(2.6 * (k % 4 ? 1 : -1), A3 + 0.6);
      lathe(tq[0], tq[1], [[Y2, 0.36], [Y2 + 0.1, 0.34], [Y2 + 0.18, 0.2], [Y2 + 0.2, 0.0]], 8, C.TURTLE);
      const hq = sP(2.6 * (k % 4 ? 1 : -1), A3 + 0.15);
      box(hq[0], Y2, hq[1], 0.14, 0.12, 0.14, C.TURTLE);
    } else {
      const fq = sP(-1.8, (A1 + AS) / 2);
      box(fq[0], Y1, fq[1], 0.55, 0.12, 0.2, C.FISH, k * Math.PI / 4);
      box(fq[0], Y1, fq[1], 0.18, 0.1, 0.3, C.FISH, k * Math.PI / 4 + 0.7);
    }
  }
  /*
   * The water: green, as every photograph has it. Drawn opaque in the
   * town's matt material it read as a lawn, so it is a mesh of its own,
   * glossy and not quite opaque, and the steps go on down under it, two
   * more, to a muddy floor — what makes water read as water is seeing into
   * it.
   */
  const meshes = [];
  const YF = YW - 1.25;
  for (let k = 0; k < 8; k++) {
    const r = rot + k * Math.PI / 4 + Math.PI / 2;
    for (const [n0, n1, top] of [[A3 - 0.45, A3, YW - 0.45], [A3 - 0.9, A3 - 0.45, YW - 0.9]]) {
      const q = p(...sideP(k, 0, (n0 + n1) / 2));
      b.box(q[0], YF, q[1], n1 * T8 * 2 + 0.05, top - YF, n1 - n0, C.RED_DK, r);
    }
  }
  {
    const R0 = (A3 - 0.9) / Math.cos(Math.PI / 8);
    const f8 = [];
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; f8.push([R0 * Math.cos(a), R0 * Math.sin(a)]); }
    upPoly(f8, YF, C.MUD);
  }
  {
    const wb = MeshBuilder ? new MeshBuilder() : b;
    const R3 = A3 / Math.cos(Math.PI / 8);
    const w8 = [];
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; w8.push(p(R3 * Math.cos(a), R3 * Math.sin(a))); }
    // UVs in world metres at the river plane's scale (its ripple texture repeats 90 times over 360 m tiles)
    const uv = (q) => [q[0] / 360, q[1] / 360];
    for (let k = 1; k < 7; k++) {
      wb.tri(w8[0][0], YW, w8[0][1], w8[k + 1][0], YW, w8[k + 1][1], w8[k][0], YW, w8[k][1], C.WATER, [...uv(w8[0]), ...uv(w8[k + 1]), ...uv(w8[k])]);
    }
    if (wb !== b) meshes.push({ name: 'BrahmaKundWater', builder: wb, x, z, r: 30, gloss: { shininess: 90, specular: 0x4a5640, opacity: 0.84, ripple: true } });
    /*
     * The pool is solid to a body, knee-high like its edge: a surface you
     * could stand on here was somewhere the unstick search could put you,
     * and pressing into the water's edge for a second and a half dropped
     * you onto the water. The camera keeps above it the same way.
     */
    post(0, 0, A3 - 0.25, { top: Y2 + 0.9, tag: 'kund-water' });
  }

  /* ================================================================
   * BRAHMA ON THE LOTUS
   * ================================================================ */
  /*
   * The old well ring at the centre, in red stone, and the lotus over it:
   * 13 ft across, two rings of petals, pink with pale hearts; Brahma on its
   * seed pod, 8 ft, white, four heads under gold crowns, four arms with the
   * Vedas, the water pot, the rosary and the ladle; his swan beside him.
   */
  lathe(0, 0, [[YW - 0.6, 2.3], [YW + 0.45, 2.3], [YW + 0.45, 1.92], [YW - 0.1, 1.92]], 24, C.RED_LT);
  lathe(0, 0, [[YW + 0.1, 0.35], [YW + 0.6, 0.45], [YW + 0.95, 0.95]], 12, C.STEM);
  const petal = (a, r0, r1, y0, y1, w, col, colIn) => {
    const ca = Math.cos(a), sa = Math.sin(a), tx = -sa, tz = ca;
    const rm = r0 + (r1 - r0) * 0.45, ym = y0 + (y1 - y0) * 0.35;
    const B0 = [ca * r0, y0, sa * r0], T = [ca * r1, y1, sa * r1];
    const L = [ca * rm + tx * w, ym, sa * rm + tz * w], R = [ca * rm - tx * w, ym, sa * rm - tz * w];
    const M = [ca * rm, ym + 0.08, sa * rm];
    for (const [P, Q] of [[L, M], [M, R]]) {
      lq(B0, P, Q, B0, colIn); lq(B0, Q, P, B0, colIn);
      lq(P, T, Q, P, col); lq(Q, T, P, Q, col);
    }
  };
  for (let i = 0; i < 12; i++) petal(i / 12 * Math.PI * 2, 0.85, 2.05, YW + 0.9, YW + 1.32, 0.44, C.LOTUS, C.LOTUS_LT);
  for (let i = 0; i < 10; i++) petal((i + 0.5) / 10 * Math.PI * 2, 0.6, 1.45, YW + 1.0, YW + 1.6, 0.32, C.LOTUS, C.LOTUS_LT);
  const YB = YW + 1.35;                                 // the seed pod's top, where he sits
  lathe(0, 0, [[YW + 0.95, 0.85], [YB - 0.05, 0.98], [YB, 0.9], [YB, 0.0]], 16, C.POD);
  post(0, 0, 2.3, { top: YB + 2.5, tag: 'kund-lotus' });
  {
    // his own frame: u to his right (east, as he faces north), v ahead (north)
    const U = (u, v) => [u, -v];
    const fig = (u, y, v, w, h, d, col, ang = 0) => { const q = U(u, v); box(q[0], y, q[1], w, h, d, col, ang); };
    const figL = (u, v, rings, segs, col, a0 = 0) => { const q = U(u, v); lathe(q[0], q[1], rings, segs, col, a0); };
    const L3 = (u, y, v) => [u, y, -v];
    /** A tapered limb between two points of the frame, six-sided. */
    const limb = (A, B, r0, r1, col) => {
      const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], dl = Math.hypot(...d);
      const n = d.map((c) => c / dl);
      let u = Math.abs(n[1]) < 0.9 ? [n[2], 0, -n[0]] : [1, 0, 0];
      const ul = Math.hypot(...u); u = u.map((c) => c / ul);
      const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const ring = (P, r, a) => [P[0] + r * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), P[1] + r * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), P[2] + r * (Math.cos(a) * u[2] + Math.sin(a) * v[2])];
      for (let s = 0; s < 6; s++) {
        const a0 = s / 6 * Math.PI * 2, a1 = (s + 1) / 6 * Math.PI * 2;
        const q0 = ring(A, r0, a0), q1 = ring(A, r0, a1), q2 = ring(B, r1, a1), q3 = ring(B, r1, a0);
        // outward: the face's normal against the way out from the axis
        const e1 = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]], e2 = [q2[0] - q0[0], q2[1] - q0[1], q2[2] - q0[2]];
        const nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const out = [q0[0] - A[0], q0[1] - A[1], q0[2] - A[2]];
        if (nn[0] * out[0] + nn[1] * out[1] + nn[2] * out[2] >= 0) lq(q0, q1, q2, q3, col);
        else lq(q3, q2, q1, q0, col);
      }
    };
    // the crossed legs, the dhoti's gold border, the knees
    fig(0, YB, 0.05, 1.5, 0.42, 0.95, C.MARBLE);
    fig(0, YB + 0.42, 0.42, 1.52, 0.05, 0.22, C.GOLD);
    for (const su of [-1, 1]) figL(su * 0.58, 0.32, [[YB, 0.26], [YB + 0.3, 0.27], [YB + 0.5, 0.18], [YB + 0.52, 0]], 8, C.MARBLE);
    // the body, the sacred thread, the necklaces
    figL(0, 0, [[YB + 0.4, 0.42], [YB + 0.8, 0.44], [YB + 1.2, 0.5], [YB + 1.3, 0.36], [YB + 1.32, 0.0]], 10, C.MARBLE);
    fig(0, YB + 1.02, 0.36, 0.5, 0.08, 0.1, C.GOLD);
    fig(0, YB + 0.86, 0.38, 0.36, 0.06, 0.1, C.GOLD);
    fig(0.12, YB + 0.55, 0.4, 0.05, 0.7, 0.05, C.GOLD_DK, 0.5);
    // a marigold garland, from the shoulders to the waist
    for (let i = 0; i <= 14; i++) {
      const f = i / 14, a = (f - 0.5) * Math.PI;
      fig(Math.sin(a) * 0.36, YB + 1.18 - Math.cos(a) * 0.62, 0.44 + 0.04 * Math.cos(a), 0.09, 0.09, 0.09, i % 2 ? 0xf08a24 : 0xf2b632);
    }
    // four arms: the front pair to the lap, the back pair raised
    const arm = (su, out, up, fwd, hold) => {
      const sx = su * 0.5, sy = YB + 1.2;
      const ex = su * (0.62 + out), ey = sy - 0.35 + up, ev = 0.1 + fwd * 0.4;
      const hx = su * (0.55 + out * 1.2), hy = ey + (up > 0 ? 0.42 : -0.12), hv = 0.2 + fwd;
      limb(L3(sx, sy, 0), L3(ex, ey, ev), 0.12, 0.095, C.MARBLE);
      limb(L3(ex, ey, ev), L3(hx, hy, hv), 0.095, 0.07, C.MARBLE);
      figL(ex, ev, [[ey - 0.1, 0.0], [ey - 0.06, 0.08], [ey + 0.04, 0.1], [ey + 0.1, 0.0]], 6, C.MARBLE);
      figL(hx, hv, [[hy - 0.07, 0.0], [hy - 0.04, 0.07], [hy + 0.05, 0.075], [hy + 0.09, 0.0]], 6, C.MARBLE);
      fig(hx, hy - 0.04, hv, 0.12, 0.05, 0.12, C.GOLD);                     // the bangle
      if (hold === 'book') fig(hx, hy, hv + 0.05, 0.3, 0.22, 0.06, C.BOOK);
      if (hold === 'pot') figL(hx, hv, [[hy - 0.1, 0.1], [hy + 0.02, 0.15], [hy + 0.12, 0.08], [hy + 0.2, 0.05]], 8, C.POT);
      if (hold === 'mala') for (let i = 0; i < 7; i++) fig(hx, hy - 0.05 - i * 0.05, hv + 0.06, 0.04, 0.04, 0.04, C.GOLD_DK);
      if (hold === 'ladle') { fig(hx, hy, hv, 0.04, 0.55, 0.04, C.GOLD_DK); fig(hx, hy + 0.55, hv, 0.12, 0.05, 0.12, C.GOLD_DK); }
    };
    arm(1, 0.0, -0.1, 0.55, 'pot');       // his right hand, forward on the knee: the water pot
    arm(-1, 0.0, -0.1, 0.55, 'book');     // his left: the Vedas, as the photographs have it, red
    arm(1, 0.28, 0.45, 0.1, 'mala');
    arm(-1, 0.28, 0.45, 0.1, 'ladle');
    // the neck, the four heads with their beards, the crowns
    figL(0, 0, [[YB + 1.28, 0.14], [YB + 1.42, 0.14]], 8, C.MARBLE);
    figL(0, 0, [[YB + 1.4, 0.3], [YB + 1.62, 0.31], [YB + 1.8, 0.27], [YB + 1.84, 0.0]], 8, C.MARBLE, Math.PI / 8);
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2, fu = Math.sin(a), fv = Math.cos(a);
      fig(fu * 0.27, YB + 1.3, fv * 0.27, 0.22, 0.24, 0.22, 0xf8f8f2, a);  // the beard
      for (const e of [-1, 1]) fig(fu * 0.3 + fv * e * 0.08, YB + 1.66, fv * 0.3 - fu * e * 0.08, 0.05, 0.03, 0.03, C.DARK, a);
      fig(fu * 0.32, YB + 1.55, fv * 0.32, 0.06, 0.1, 0.06, C.MARBLE_SH, a);       // the nose
    }
    figL(0, 0, [[YB + 1.82, 0.33], [YB + 2.0, 0.36], [YB + 2.06, 0.3], [YB + 2.22, 0.24], [YB + 2.3, 0.14], [YB + 2.42, 0.05], [YB + 2.46, 0.0]], 8,
      (i) => (i % 2 ? C.GOLD : C.GOLD_DK));
    // the swan, on the petals at his right
    {
      const su = 1.25, sv = -0.2, sy = YB - 0.12;
      fig(su, sy, sv, 0.32, 0.26, 0.56, 0xf6f4ee);
      fig(su, sy + 0.18, sv - 0.32, 0.12, 0.12, 0.2, 0xf6f4ee);
      fig(su, sy + 0.3, sv + 0.22, 0.1, 0.32, 0.1, 0xf6f4ee);
      fig(su, sy + 0.6, sv + 0.28, 0.12, 0.1, 0.16, 0xf6f4ee);
      fig(su, sy + 0.62, sv + 0.4, 0.05, 0.05, 0.12, 0xe8892a);
    }
  }

  /* ================================================================
   * THE WALLS OF THE OLD KUND
   * ================================================================ */
  /*
   * Brick, rendered and painted pink in the restoration, the town's houses
   * standing on top of them: north, west and east, the south either side of
   * the entrance. The north wall has its bay for the saints between two
   * round bastions; the entrance two old ones nobody painted.
   */
  const IN = { x0: -18.5, x1: 17.0, zN: -19.0, zSW: 14.0, zSE: 12.6 };   // the inner faces
  const BAY = { x0: -6.2, x1: 5.0, z: -20.6 };
  const wall = (lx0, lx1, lz0, lz1, tag = 'kund-wall') => {
    box((lx0 + lx1) / 2, BASE, (lz0 + lz1) / 2, lx1 - lx0, YT - BASE, lz1 - lz0, C.PINK);
    solid((lx0 + lx1) / 2, (lz0 + lz1) / 2, lx1 - lx0, lz1 - lz0, { top: YT, tag });
  };
  const N0 = BRAHMA_BASIN[0];
  wall(N0.lx0, BAY.x0, N0.lz0, IN.zN);                 // north, west of the bay
  wall(BAY.x0, BAY.x1, N0.lz0, BAY.z);                 // the bay's back
  wall(BAY.x1, N0.lx1, N0.lz0, IN.zN);                 // north, east of the bay
  wall(N0.lx0, IN.x0, IN.zN, N0.lz1);                  // west
  wall(IN.x1, N0.lx1, IN.zN, N0.lz1);                  // east
  wall(IN.x0, -7.9, IN.zSW, N0.lz1);                   // south, west of the entrance
  wall(7.6, IN.x1, IN.zSE, N0.lz1);                    // south, east of it
  const E0 = BRAHMA_BASIN[1];
  wall(E0.lx0, -6.4, IN.zSW, E0.lz1);                  // the entrance's walls
  wall(6.4, E0.lx1, IN.zSE, E0.lz1);
  // the render's courses, every 1.2 m, on the faces you see from the garden
  for (let y = YG + 1.2; y < YT - 0.3; y += 1.2) {
    box((IN.x0 + IN.x1) / 2, y, IN.zN + 0.01, IN.x1 - IN.x0, 0.035, 0.03, C.PINK_LINE);
    box(IN.x0 + 0.01, y, (IN.zN + IN.zSW) / 2, 0.03, 0.035, IN.zSW - IN.zN, C.PINK_LINE);
    box(IN.x1 - 0.01, y, (IN.zN + IN.zSE) / 2, 0.03, 0.035, IN.zSE - IN.zN, C.PINK_LINE);
  }
  // a skirting at the foot of the walls, darker where the garden is watered
  box((IN.x0 + IN.x1) / 2, YG, IN.zN + 0.05, IN.x1 - IN.x0, 0.35, 0.1, C.PINK_DK);
  box(IN.x0 + 0.05, YG, (IN.zN + IN.zSW) / 2, 0.1, 0.35, IN.zSW - IN.zN, C.PINK_DK);
  box(IN.x1 - 0.05, YG, (IN.zN + IN.zSE) / 2, 0.1, 0.35, IN.zSE - IN.zN, C.PINK_DK);

  /*
   * The parapet and railing along the top of every wall, where the houses'
   * yards meet the drop — and down the entrance flight's sides.
   */
  const rail = (lx0, lz0, lx1, lz1, y, h = 0.95) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
    const mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2;
    box(mx, y + h - 0.05, mz, L, 0.05, 0.06, C.RAIL, ang);
    box(mx, y + 0.12, mz, L, 0.04, 0.05, C.RAIL, ang);
    const n = Math.max(2, Math.round(L / 0.16));
    for (let i = 0; i <= n; i++) {
      const f = i / n, big = i % 8 === 0;
      box(lx0 + (lx1 - lx0) * f, y, lz0 + (lz1 - lz0) * f, big ? 0.07 : 0.022, h, big ? 0.07 : 0.022, C.RAIL);
    }
    const q = p(mx, mz);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: L, d: 0.12, rot: rot + ang, top: y + h, tag: 'kund-rail' });
  };
  const parapet = (lx0, lz0, lx1, lz1) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), ang = Math.atan2(lz1 - lz0, lx1 - lx0);
    box((lx0 + lx1) / 2, YT, (lz0 + lz1) / 2, L, 0.45, 0.3, C.PINK_LT, ang);
    box((lx0 + lx1) / 2, YT + 0.45, (lz0 + lz1) / 2, L + 0.05, 0.06, 0.38, C.PINK_DK, ang);
    rail(lx0, lz0, lx1, lz1, YT + 0.51, 0.6);
  };
  parapet(IN.x0 - 0.15, IN.zN - 0.15, BAY.x0, IN.zN - 0.15);
  parapet(BAY.x0, BAY.z - 0.15, BAY.x1, BAY.z - 0.15);
  parapet(BAY.x1, IN.zN - 0.15, IN.x1 + 0.15, IN.zN - 0.15);
  parapet(IN.x0 - 0.15, IN.zN - 0.15, IN.x0 - 0.15, IN.zSW + 0.15);
  parapet(IN.x1 + 0.15, IN.zN - 0.15, IN.x1 + 0.15, IN.zSE + 0.15);
  parapet(IN.x0 - 0.15, IN.zSW + 0.15, -6.4, IN.zSW + 0.15);
  parapet(6.4, IN.zSE + 0.15, IN.x1 + 0.15, IN.zSE + 0.15);
  parapet(-6.55, IN.zSW + 0.15, -6.55, E0.lz1 - 0.2);
  parapet(6.55, IN.zSE + 0.15, 6.55, E0.lz1 - 0.2);

  // the bastions: two pink ones flanking the saints, on stepped round feet
  for (const bxp of [BAY.x0 - 1.6, BAY.x1 + 1.6]) {
    for (let t = 0; t < 3; t++) lathe(bxp, IN.zN, [[YG, 2.3 - t * 0.25], [YG + 0.4 + t * 0.4, 2.3 - t * 0.25], [YG + 0.4 + t * 0.4, 0]], 18, tint(C.PINK, 0.95 + 0.03 * t));
    lathe(bxp, IN.zN, [[YG, 1.6], [YT + 0.6, 1.5], [YT + 0.6, 1.62], [YT + 0.75, 1.62], [YT + 0.75, 0]], 18, C.PINK);
    for (let y = YG + 2.4; y < YT; y += 1.6) lathe(bxp, IN.zN, [[y, 1.54], [y + 0.05, 1.54]], 18, C.PINK_LINE);
    post(bxp, IN.zN, 1.75, { top: YT + 0.75, tag: 'kund-bastion' });
    for (let t = 0; t < 3; t++) post(bxp, IN.zN, 2.3 - t * 0.25, { top: YG + 0.4 + t * 0.4, tag: 'kund-bastion-foot' });
  }
  /*
   * The two by the entrance, left as the dig found them — "one of the
   * ancient pillars of the Brahma Kund had been left intact during the
   * renovation to tell people how old the kund is" — brick, weathered,
   * broken off short of the street.
   */
  for (const [bxp, bzp, top] of [[-7.9, 15.4, YT - 0.9], [8.2, 14.6, YT - 0.4]]) {
    lathe(bxp, bzp, [[YG, 1.75], [YG + 1.2, 1.7], [top - 0.8, 1.55], [top - 0.4, 1.35], [top, 1.1], [top, 0]], 14,
      (i, s) => tint(i % 2 ? C.BRICK : C.BRICK_DK, 0.88 + 0.22 * hash(i * 13 + s)));
    for (let y = YG + 0.6; y < top - 0.6; y += 0.55) lathe(bxp, bzp, [[y, 1.72], [y + 0.07, 1.72]], 14, C.BRICK_LT);
    post(bxp, bzp, 1.75, { top, tag: 'kund-old-pillar' });
  }

  /* ================================================================
   * THE SAINTS, AND THE BRAHMA SAMHITA ON THE WALLS
   * ================================================================ */
  const LEDGE = YG + 2.4;
  box((BAY.x0 + BAY.x1) / 2, BASE, (BAY.z + IN.zN + 0.6) / 2, BAY.x1 - BAY.x0, LEDGE - BASE, IN.zN + 0.6 - BAY.z, C.PINK);
  box((BAY.x0 + BAY.x1) / 2, LEDGE, (BAY.z + IN.zN + 0.6) / 2, BAY.x1 - BAY.x0 + 0.1, 0.1, IN.zN + 0.75 - BAY.z, C.PINK_DK);
  solid((BAY.x0 + BAY.x1) / 2, (BAY.z + IN.zN + 0.6) / 2, BAY.x1 - BAY.x0, IN.zN + 0.6 - BAY.z, { top: LEDGE, tag: 'kund-ledge' });
  /*
   * Chaitanya Mahaprabhu, Rupa and Sanatana Goswami, Meera Bai, Karmaiti Bai
   * and the others — the Foundation names five and says "and others". Which
   * stands where is not recorded; Chaitanya has his arms raised, Meera her
   * ektara, the Goswamis their hands joined.
   */
  const POSES = ['joined', 'bless', 'joined', 'raised', 'ektara', 'joined', 'bless', 'joined'];
  for (let i = 0; i < 8; i++) {
    const lx = BAY.x0 + 0.75 + i * ((BAY.x1 - BAY.x0 - 1.5) / 7), lz = (BAY.z + IN.zN + 0.6) / 2;
    const y = LEDGE + 0.1, pose = POSES[i];
    box(lx, y, lz, 0.5, 0.18, 0.45, C.STATUE_SH);
    b.prism(...(() => { const q = p(lx, lz); return [q[0], y + 0.18, q[1]]; })(), 0.5, 0.34, 0.4, 0.26, 1.1, C.STATUE, rot);
    box(lx, y + 1.28, lz, 0.42, 0.36, 0.25, C.STATUE);
    box(lx, y + 1.64, lz, 0.13, 0.08, 0.13, C.STATUE_SH);
    box(lx, y + 1.72, lz, 0.22, 0.25, 0.22, C.STATUE);
    if (pose === 'raised') {
      for (const e of [-1, 1]) { box(lx + e * 0.3, y + 1.55, lz, 0.1, 0.5, 0.1, C.STATUE, e * 0.35); box(lx + e * 0.42, y + 1.98, lz, 0.09, 0.4, 0.09, C.STATUE, e * 0.2); }
    } else if (pose === 'joined') {
      for (const e of [-1, 1]) box(lx + e * 0.24, y + 1.15, lz + 0.05, 0.1, 0.4, 0.1, C.STATUE);
      box(lx, y + 1.3, lz + 0.2, 0.12, 0.22, 0.1, C.STATUE);
    } else if (pose === 'bless') {
      box(lx - 0.24, y + 1.0, lz, 0.1, 0.48, 0.1, C.STATUE);
      box(lx + 0.27, y + 1.25, lz + 0.12, 0.1, 0.36, 0.1, C.STATUE);
      box(lx + 0.27, y + 1.6, lz + 0.18, 0.12, 0.16, 0.05, C.STATUE);
    } else {
      box(lx - 0.24, y + 1.0, lz, 0.1, 0.48, 0.1, C.STATUE);
      box(lx + 0.12, y + 0.95, lz + 0.22, 0.08, 1.05, 0.05, C.STATUE_SH, 0.35);
      box(lx + 0.24, y + 0.95, lz + 0.22, 0.16, 0.16, 0.12, C.STATUE_SH);
    }
  }
  /*
   * The 39 plaques, 5 x 3 ft, framed, in rows: eight below the saints, the
   * rest along the north, west and east walls and either side of the way in,
   * each with a lamp over it — they are lit at night.
   */
  const plaque = (lx, lz, y, ang) => {
    box(lx, y, lz, 1.05, 1.66, 0.08, C.PINK_DK, ang);
    box(lx, y + 0.07, lz, 0.91, 1.52, 0.1, C.PLAQUE, ang);
    const fx = -Math.sin(ang) * 0.06, fz = Math.cos(ang) * 0.06;
    for (let l = 0; l < 7; l++) box(lx + fx, y + 1.35 - l * 0.17, lz + fz, 0.7 - (l === 0 ? 0.25 : 0), 0.035, 0.02, C.PLAQUE_TXT, ang);
    box(lx + fx * 4, y + 1.82, lz + fz * 4, 0.16, 0.12, 0.16, C.LAMP, ang);
  };
  let plaques = 0;
  for (let i = 0; i < 8; i++) { plaque(BAY.x0 + 0.75 + i * ((BAY.x1 - BAY.x0 - 1.5) / 7), IN.zN + 0.62, YG + 0.45, 0); plaques++; }
  for (const lx of [-17.0, -14.9, -12.8, -10.7, 8.6, 10.7, 12.8, 14.9]) { plaque(lx, IN.zN + 0.02, YG + 2.6, 0); plaques++; }
  for (let i = 0; i < 10; i++) { plaque(IN.x0 + 0.02, -16.4 + i * 2.75, YG + 2.6, -Math.PI / 2); plaques++; }
  for (let i = 0; i < 9; i++) { plaque(IN.x1 - 0.02, -16.4 + i * 2.75, YG + 2.6, Math.PI / 2); plaques++; }
  for (const lx of [-16.6, -13.6]) { plaque(lx, IN.zSW - 0.02, YG + 2.6, Math.PI); plaques++; }
  for (const lx of [11.6, 14.6]) { plaque(lx, IN.zSE - 0.02, YG + 2.6, Math.PI); plaques++; }

  /* ================================================================
   * THE GARDEN
   * ================================================================ */
  // what you walk on: the strips round the octagon and the corners between
  // them, out under the walls (which stop you long before the edge)
  const garden = (lx0, lx1, lz0, lz1) => solid((lx0 + lx1) / 2, (lz0 + lz1) / 2, lx1 - lx0, lz1 - lz0, { top: YG, standOnly: true, tag: 'kund-garden' });
  garden(IN.x0 - 0.5, IN.x1 + 0.5, IN.zN - 0.5, -A0);           // north
  garden(IN.x0 - 0.5, -A0, -A0, IN.zSW + 0.5);                  // west
  garden(A0, IN.x1 + 0.5, -A0, IN.zSE + 0.5);                   // east
  garden(-6.4, 6.4, A0, 18.6);                                  // the court before the gatehouse
  for (const k of [1, 3, 5, 7]) {
    const q = p(...sideP(k, 0, A0 + 3.1));
    colliders.push({ type: 'box', x: q[0], z: q[1], w: (A0 + 6.2) * T8 * 2, d: 6.2, rot: rot + k * Math.PI / 4 + Math.PI / 2, top: YG, standOnly: true, tag: 'kund-garden' });
  }
  // trees where the imagery has crowns: two over the east side, palms in the
  // north corners
  const tree = (lx, lz, s, seed) => {
    box(lx, YG, lz, 0.5 * s, 4.2 * s, 0.5 * s, C.TRUNK);
    lathe(lx, lz, [[YG + 3.4 * s, 0.4], [YG + 4.2 * s, 4.2 * s], [YG + 6.4 * s, 5.0 * s], [YG + 8.2 * s, 3.6 * s], [YG + 9.0 * s, 0.4]], 12,
      (i, sg) => tint(sg % 2 ? C.LEAF2 : C.LEAF, 0.88 + 0.2 * hash(seed * 7 + i * 3 + sg)));
    post(lx, lz, 0.32 * s, { tag: 'kund-tree' });
  };
  tree(15.9, -11.0, 1.05, 1);
  tree(15.7, 6.5, 0.95, 2);
  const palm = (lx, lz, h) => {
    for (let y = 0; y < h; y += 0.5) box(lx + 0.02 * y, YG + y, lz, 0.32, 0.5, 0.32, tint(C.TRUNK, 0.9 + 0.15 * (Math.round(y * 2) % 2)));
    for (let f = 0; f < 9; f++) {
      const a = f / 9 * Math.PI * 2;
      for (let t = 0; t < 4; t++) {
        box(lx + 0.02 * h + Math.cos(a) * (0.4 + t * 0.55), YG + h + 0.3 - t * t * 0.12, lz + Math.sin(a) * (0.4 + t * 0.55), 0.6, 0.06, 0.5 - t * 0.08, C.PALM, -a);
      }
    }
    post(lx, lz, 0.25, { tag: 'kund-tree' });
  };
  palm(-15.6, -16.6, 5.5);
  palm(13.4, -16.9, 4.8);

  /* ================================================================
   * THE WAY IN, FROM THE LANE
   * ================================================================ */
  /*
   * From the lane on the south a broad flight goes down between the walls
   * to a landing, the landing runs out over the gatehouse as a railed
   * terrace you look over the kund from, and a flight goes on down either
   * side of the gatehouse to the garden. The gatehouse is the Foundation's
   * camp office, its door on the garden.
   */
  const GH = { x0: -4.4, x1: 4.4, z0: 16.5, z1: 23.6 };
  const LAND1 = 25.5;
  // the forecourt between the lane and the flight, paved, at the street's level
  {
    let lo = Infinity;
    for (let lx = -8.5; lx <= 8.5; lx += 4.25) for (let lz = 34; lz <= 38.5; lz += 2.25) lo = Math.min(lo, tH(lx, lz));
    box(0, lo - 0.25, 36.25, 17.0, YT - 0.02 - (lo - 0.25), 4.5, C.PAVE2);
    for (let lx = -8.0; lx < 8.5; lx += 1.5) box(lx, YT - 0.02, 36.25, 0.03, 0.004, 4.5, C.PAVE);
    solid(0, 36.25, 17.0, 4.5, { top: YT - 0.02, standOnly: true, tag: 'kund-forecourt' });
  }
  // the broad flight, 18 risers over 8.5 m, 12.8 m wide
  {
    const n = 18, rise = (YT - YM) / n, run = (E0.lz1 - LAND1) / (n - 1);
    for (let i = 1; i < n; i++) {
      const top = YT - i * rise, lz1 = E0.lz1 - (i - 1) * run, lz0 = lz1 - run;
      box(0, YM - 0.2, (lz0 + lz1) / 2, 12.8, top - YM + 0.2, run, tint(i % 2 ? C.RED_LT : C.RED, 0.96 + 0.06 * hash(i * 5)));
      solid(0, (lz0 + lz1) / 2, 12.8, run, { top, standOnly: true, tag: 'kund-entry-steps' });
    }
  }
  // the landing and the terrace on the gatehouse's roof
  box(0, YM - 0.25, (GH.z1 + LAND1) / 2, 12.8, 0.25, LAND1 - GH.z1, C.PAVE);
  solid(0, (GH.z1 + LAND1) / 2, 12.8, LAND1 - GH.z1, { top: YM, standOnly: true, tag: 'kund-terrace' });
  box(0, YM - 0.2, (GH.z0 + GH.z1) / 2, GH.x1 - GH.x0 + 0.2, 0.2, GH.z1 - GH.z0 + 0.2, C.PAVE2);
  solid(0, (GH.z0 + GH.z1) / 2, GH.x1 - GH.x0, GH.z1 - GH.z0, { top: YM, standOnly: true, tag: 'kund-terrace' });
  for (let lx = GH.x0 + 0.6; lx < GH.x1; lx += 1.2) box(lx, YM, (GH.z0 + GH.z1) / 2, 0.02, 0.006, GH.z1 - GH.z0, C.PAVE);
  rail(GH.x0, GH.z0, GH.x1, GH.z0, YM);                // over the garden
  rail(GH.x0, GH.z0, GH.x0, GH.z1, YM);                // over the flights either side
  rail(GH.x1, GH.z0, GH.x1, GH.z1, YM);
  // the flights down beside the gatehouse
  {
    const n = 18, rise = (YM - YG) / n;
    for (let i = 1; i < n; i++) {
      const top = YM - i * rise, lz1 = GH.z1 - (i - 1) * TREAD, lz0 = lz1 - TREAD;
      for (const lx of [-5.4, 5.4]) {
        box(lx, YG, (lz0 + lz1) / 2, 2.0, top - YG, TREAD, tint(i % 2 ? C.RED_LT : C.RED, 0.96 + 0.06 * hash(i * 3 + lx)));
        solid(lx, (lz0 + lz1) / 2, 2.0, TREAD, { top, standOnly: true, tag: 'kund-entry-steps' });
      }
    }
  }
  // the gatehouse: pink, a door and two windows on the garden, an eave
  box(0, YG, (GH.z0 + GH.z1) / 2, GH.x1 - GH.x0, YM - 0.2 - YG, GH.z1 - GH.z0, C.PINK);
  solid(0, (GH.z0 + GH.z1) / 2, GH.x1 - GH.x0, GH.z1 - GH.z0, { top: YM, tag: 'kund-gatehouse' });
  {
    const dq = p(0, GH.z0 - 0.02);
    if (cuspedArch) cuspedArch(b, dq[0], YG, dq[1], 1.4, 2.4, 0.14, rot, C.PINK_DK, 5, C.DOOR);
    for (const e of [-1, 1]) {
      box(e * 2.6, YG + 1.1, GH.z0 - 0.04, 0.8, 1.0, 0.08, C.PINK_DK);
      box(e * 2.6, YG + 1.18, GH.z0 - 0.06, 0.62, 0.84, 0.06, C.DARK);
      for (let g = 0; g < 3; g++) box(e * 2.6 - 0.2 + g * 0.2, YG + 1.18, GH.z0 - 0.1, 0.03, 0.84, 0.03, C.RAIL);
    }
    box(0, YG + 2.75, GH.z0 - 0.35, GH.x1 - GH.x0 + 0.4, 0.12, 0.75, C.PINK_DK);
  }

  b.weather(null);

  /* ================================================================
   * DARSHAN
   * ================================================================ */
  // on the water landing to the north, before Brahma's face
  return {
    YT, YG,
    altar: { lx: 0, lz: 0, y: YB + 1.2 },
    darshan: { lx: 0, lz: -(A3 + AL) / 2 },
    floor: Y2,
    plaques,
    meshes,
  };
}
