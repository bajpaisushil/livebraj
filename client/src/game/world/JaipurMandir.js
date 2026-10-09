/**
 * SHRI RADHA MADHAV MANDIR — the "Jaipur Mandir". Begun in 1881 by Maharaja
 * Sawai Madho Singh II of Jaipur at the inspiration of the Nimbarka saint
 * Giridhari Sharan; a Rajput palace laid out as a temple, and today partly the
 * office of the Rajasthan government's Devasthan Vibhag.
 *
 * Built from docs/research/jaipur-mandir.md (the survey and its checker), OSM
 * ways 679447890 (the shrine block), 679447888 and 679447897 (the walled core
 * and its courts), and ESRI z19 imagery, used for measurement only.
 *
 * WHERE: the centre of OSM way 679447890, 27.57222 / 77.69036. What stood for
 * this temple until now was a curated pin 1 km south-west of it.
 *
 * THE FRAME: +lx EAST along the block's long axis (bearing 92.2), +lz SOUTH,
 * origin the way's centre — the middle of the shrine block and its terrace.
 *
 * THE PLAN, measured off the imagery against the block and squared with OSM:
 *   the shrine block      lx -24.9..19.6, lz -17.6..17.6; its terrace on the
 *                         east to lx 24.9, five risers down to the court
 *   the walled core       lx -44.7..77.0, lz -39.3..36.0 (OSM: 124 x 74 m)
 *   the ranges round it   north 12.7 m deep, south 13.1, west 8.7 — single-
 *                         storey cloisters — and the two-storey street range
 *                         on the east, 13.7, with the gateway in its middle
 *   the east court        the gate to the shrine's steps: an axial flagstone
 *                         path, clipped beds, lamp standards, the flag, trees
 *   narrow courts         north 9 m with one tree in a raised bed, south 5 m,
 *                         west 11 m — the one left ragged
 *   outside, east         the raised forecourt and its broad steps, the drive
 *                         to Mathura Road, coaches parked, the office block
 *   outside, south        the goshala's two blue-roofed sheds, and its cattle
 *
 * THE GATE FACES EAST. The survey took it as a working assumption and flagged
 * it unresolved; the imagery settles it: the drive from Mathura Road meets the
 * middle of the east range, coaches and cars stand on the forecourt in front
 * of it, and a pale axial path runs across the east court from it to the
 * shrine's east face.
 *
 * HEIGHTS are the survey's photogrammetry (+-20%; the ratios are firmer): the
 * shrine's roof terrace 16 m above the court, the kiosk's finials about 25;
 * the great arch 5.0 m to its apex and 3.0 m wide; its plinth 1.0-1.3 m, five
 * or six steps; the street range 11-13 m over two storeys; the cloisters 4-5.
 *
 * TWO FAMILIES OF MASONRY, measured within one frame: the outward ranges and
 * gateways warm salmon-tan sandstone, the shrine block, its kiosk and the inner
 * court arcades pale cream. "That shift as you pass through the gate is as
 * recognisable as the kiosk."
 *
 * INSIDE, the survey's "best catch": a large, dark, ROOFED hypostyle hall, not
 * a courtyard — fluted monolithic columns on lotus bases, one pier a pair of
 * shafts, plain semicircular arches (no cusping on anything structural), the
 * central bay vaulted markedly higher (11-12 m, the sides 9), a black-and-
 * white chequer floor with plain borders, pale grey-white plaster, electric
 * lamps round the walls, a railed gallery over the central bay at one end.
 * Three sanctums in a row behind it, north to south: Anand Bihari, Radha
 * Madhav, Hans Gopal with Giridhari, the four Kumaras and Narada.
 *
 * INFERRED, and said so where it is built: the hall's size and the sanctums'
 * depth (the block is measured, its inside is not); which sanctum the green-
 * silk group belongs to; the forecourt's height; where the flag stands; the
 * number of trees; the board's colours. NOT BUILT: the railway, closed in 2023
 * and its tracks dismantled, and the Braj Akademi's rooms, which nothing
 * describes.
 */

const C = {
  SALMON: 0xc2967d, SALMON2: 0xb5937d, SALMON_SH: 0xa89892,     // the outward ranges, lit and in shade
  CREAM: 0xefebd1, CREAM2: 0xf3e1b7, CREAM_SH: 0xa8a5a4,        // the shrine, the kiosk, the inner arcades
  PLASTER: 0xdbd3be, SHUTTER: 0x3f6a4a,                        // the street range's plain upper storey
  HALL: 0xdcd9d1, CHEQ_D: 0x1e1d1f, CHEQ_L: 0xe9e6dd, BORDER: 0xcfc9bb,
  DARK: 0x1d1510, IRON: 0x262625, WOOD: 0x4a3020, BOSS: 0x9a8a5a, BRASS: 0xc9a03c,
  GOLDSILK: 0xd9a520, GREENSILK: 0x2f6b3a, REDSILK: 0x8a2a24, SILVER: 0xbfc0c4, BLACK: 0x18181b,
  GRASS: 0x6b7c3b, LAWN: 0x748a40, HEDGE: 0x3d5a28, SHRUB: 0x55692f, EARTH: 0x9a7a58, DUST: 0xb59a76,
  FLAG_S: 0xff9933, FLAG_W: 0xf7f7f2, FLAG_G: 0x138808, NAVY: 0x1a2a80,
  BLUE: 0x2f6fc0, BLUE2: 0x2a62ad, POST: 0x6a6a66, COW: 0xe4dccc, LOG: 0x6b4a2a,
  BUS: 0xe8e4da, BUS2: 0xb03a2e, GLASS: 0x2b3036, TYRE: 0x222222,
  FLAG_POLE: 0xd8d8d2, LAMP: 0xffe2a8,
  ROOF: 0x7f7b72, ROOF_SHRINE: 0x8c877c,                       // weathered concrete and lime, dark in the imagery
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * @param o.b, o.signB, o.loc, o.terrain, o.colliders, o.h { cuspedArch, tint, signUV, campusSign }
 * @returns {{altar, darshan, hall, FL}} in the frame, for the wrapper
 */
export function buildJaipurMandir(o) {
  const { b, signB, loc, terrain, colliders } = o;
  const { cuspedArch, tint, signUV, campusSign } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : 0; };
  const topOf = (lx0, lx1, lz0, lz1, n = 4) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) hi = Math.max(hi, tH(lx0 + (lx1 - lx0) * i / n, lz0 + (lz1 - lz0) * j / n));
    return hi;
  };
  const lq = (A, B, Cq, D, col) => {
    const a = p(A[0], A[2]), bb = p(B[0], B[2]), c = p(Cq[0], Cq[2]), d = p(D[0], D[2]);
    b.quad([a[0], A[1], a[1]], [bb[0], B[1], bb[1]], [c[0], Cq[1], c[1]], [d[0], D[1], d[1]], col);
  };
  const lq2 = (A, B, Cq, D, col) => { lq(A, B, Cq, D, col); lq(D, Cq, B, A, col); };
  // rot ~0: a lo-hi-hi-lo run faces up x (B - A): south runs -lx, north +lx, east +lz, west -lz
  const panel = (lx, y, lz, w, h, face, col) => {
    const y0 = y - h / 2, y1 = y + h / 2, hw = w / 2;
    const [A, B] = face === 'S' ? [[lx + hw, lz], [lx - hw, lz]] : face === 'N' ? [[lx - hw, lz], [lx + hw, lz]]
      : face === 'E' ? [[lx, lz - hw], [lx, lz + hw]] : [[lx, lz + hw], [lx, lz - hw]];
    lq([A[0], y0, A[1]], [A[0], y1, A[1]], [B[0], y1, B[1]], [B[0], y0, B[1]], col);
  };
  // horizontal quads, by which way they face. Measured, not reasoned: the
  // first draft had these the wrong way round, and the hall's chequer floor and
  // the goshala's roofs were invisible from above while their undersides
  // showed through.
  const flat = (lx0, lx1, lz0, lz1, y, col) => lq([lx0, y, lz0], [lx0, y, lz1], [lx1, y, lz1], [lx1, y, lz0], col);     // seen from above
  const under = (lx0, lx1, lz0, lz1, y, col) => lq([lx0, y, lz0], [lx1, y, lz0], [lx1, y, lz1], [lx0, y, lz1], col);    // seen from below
  const arch = (lx, y0, lz, w, h, along, color, lobes, shade, depth = 0.1) => {
    const q = p(lx, lz);
    cuspedArch(b, q[0], y0, q[1], w, h, depth, along === 'x' ? rot : rot + Math.PI / 2, color, lobes, shade);
  };
  /**
   * The masonry round an arch: the spandrels between its curve and the line
   * `yTop` above it, on both faces of a wall from `t0` to `t1` across it, and
   * the soffit under the curve through that thickness. The curve is
   * cuspedArch's own — a semicircle swept up from 52 per cent of the height,
   * rippled by its lobes — so the fill meets the drawn rim. Without it an
   * open arch is a cusped ribbon against the sky, or a hole cut square
   * through a wall with the arch painted on its face.
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
    // the jambs, up to the springing, through the thickness
    for (const sgn of [-1, 1]) lq2(pt(sgn * half, y0, t0), pt(sgn * half, yS, t0), pt(sgn * half, yS, t1), pt(sgn * half, y0, t1), tint(color, 0.85));
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
  const sign = (key, lx, y, lz, w, h, faceAng) => {
    const slot = typeof key === 'number' ? key : campusSign(key);
    if (slot < 0 || !signB) return;
    const q = p(lx, lz), wa = rot + faceAng;
    signB.panelUV(q[0], y, q[1], w, h, signUV(slot), Math.atan2(Math.cos(wa), Math.sin(wa)), 0.05);
  };
  const F = { E: Math.PI / 2, W: -Math.PI / 2, N: Math.PI, S: 0 };
  /** a tree: trunk and a two-tier canopy; its trunk is solid */
  const tree = (lx, lz, y, s, k) => {
    const g = 0.85 + 0.3 * hash(k);
    box(lx, y, lz, 0.32 * s, 2.4 * s, 0.32 * s, 0x5a4632);
    const col = (i, sg) => tint(i === 2 ? 0x4f6d2c : 0x46632a, 0.9 + 0.2 * hash(k * 7 + sg));
    lathe(lx, lz, [[y + 2.0 * s, 0.4], [y + 2.6 * s, 2.6 * s * g], [y + 3.9 * s, 2.9 * s * g], [y + 5.2 * s, 1.7 * s * g], [y + 5.8 * s, 0.2]], 9, col);
    post(lx, lz, 0.3 * s);
  };
  /** a steppable flight from `lxA` (top) running toward +lx or -lx */
  const flight = (lxA, dir, lz, width, yTop, yFoot, tag, color) => {
    const n = Math.max(1, Math.ceil((yTop - yFoot) / 0.24 - 1e-6));
    const rise = (yTop - yFoot) / n;
    for (let k = 0; k < n - 1; k++) {
      const top = yTop - rise * (k + 1);
      const lx = lxA + dir * (0.45 * k + 0.225);
      box(lx, yFoot - 0.1, lz, 0.45, top - yFoot + 0.1, width, tint(color, 0.92 + 0.06 * hash(k + 31)));
      solid(lx, lz, 0.45, width, { top, tag, standOnly: true });
    }
    return lxA + dir * 0.45 * (n - 1);      // where the foot of the flight is
  };

  /* ================================================================
   * LEVELS
   * ================================================================ */
  // The ground falls no more than 16 cm across the whole site. The walled
  // core and its forecourt stand on one platform two risers above it ("a
  // raised paved forecourt reached by a broad flight of steps"). Kept under
  // half a metre on purpose: anyone who stepped off something tall inside
  // would land on the terrain under the court, and from there a court any
  // higher could not be stepped back onto.
  const yG = topOf(-46, 92, -41, 38, 8);
  const Y = yG + 0.45;                    // the courts, the forecourt, the gate
  const FL = Y + 1.15;                    // the shrine's terrace and hall: five risers of 0.23
  const T = Y + 16.0;                     // the shrine's roof terrace (survey: ~16 m)

  // the platform: one slab under the core and the forecourt, its face a plinth
  box(16.0, yG - 0.6, -1.65, 137.4, Y - yG + 0.6, 76.3, tint(C.SALMON2, 0.9));       // lx -52.7..84.7 (west wall to forecourt)
  box(84.6, yG - 0.6, 0, 11.4, Y - yG + 0.6, 44, tint(C.SALMON2, 0.9));              // the forecourt's east half, to lx 90.3

  /* ================================================================
   * THE COURTS — floors, and what is in them
   * ================================================================ */
  // The core's open ground at Y. Each court is its own floor, so none of
  // them overlaps the shrine's steps.
  const court = (lx0, lx1, lz0, lz1, col, tag) => {
    box((lx0 + lx1) / 2, Y - 0.12, (lz0 + lz1) / 2, lx1 - lx0, 0.12, lz1 - lz0, col);
    solid((lx0 + lx1) / 2, (lz0 + lz1) / 2, lx1 - lx0, lz1 - lz0, { top: Y, tag, floor: true });
  };
  court(-36.0, 63.3, -26.6, -17.6, tint(C.DUST, 0.95), 'jm-court-n');        // north, the long narrow court
  court(-36.0, 63.3, 17.6, 22.9, tint(C.DUST, 1.0), 'jm-court-s');           // south
  court(-36.0, -24.9, -17.6, 17.6, tint(C.EARTH, 1.0), 'jm-court-w');        // west, the ragged one
  // the east court in three, round the shrine's flight (lz -3.0..3.0, lx 24.9..26.7)
  court(26.7, 63.3, -17.6, 17.6, C.GRASS, 'jm-court-e');
  court(24.9, 26.7, -17.6, -3.0, C.GRASS, 'jm-court-e1');
  court(24.9, 26.7, 3.0, 17.6, C.GRASS, 'jm-court-e2');

  // The east court: an axial flagstone path from the gate to the shrine's
  // steps, clipped hedge beds either side, lamp standards along the path, the
  // national flag, trees in the beds (six in the imagery).
  {
    const PZ = 1.8;
    for (let i = 0; i < 24; i++) {
      const lx0 = 26.7 + i * (63.3 - 26.7) / 24, lx1 = 26.7 + (i + 1) * (63.3 - 26.7) / 24;
      flat(lx0 + 0.04, lx1 - 0.04, -PZ, PZ, Y + 0.012, tint(0xd8cdb6, 0.92 + 0.1 * hash(i)));
    }
    // a cross-walk at the middle, and the beds in its four quarters
    flat(44.0, 47.0, -17.6, 17.6, Y + 0.01, tint(0xd2c6ae, 0.97));
    for (const [lx0, lx1] of [[28.5, 43.0], [48.0, 61.5]]) {
      for (const sz of [-1, 1]) {
        const lz0 = sz < 0 ? -15.8 : 3.4, lz1 = sz < 0 ? -3.4 : 15.8;
        // the hedge round the bed: four runs, clipped, 0.6 m, solid
        const HH = 0.6, HT = 0.5;
        const runs = [[lx0, lx1, lz0, lz0 + HT], [lx0, lx1, lz1 - HT, lz1], [lx0, lx0 + HT, lz0, lz1], [lx1 - HT, lx1, lz0, lz1]];
        for (const [a, c, d, e] of runs) {
          // a gap on the path side for the gardener
          if (Math.abs((d + e) / 2) < 4.2 && c - a > 4) {
            const mid = (a + c) / 2;
            for (const [u, v] of [[a, mid - 0.7], [mid + 0.7, c]]) {
              box((u + v) / 2, Y, (d + e) / 2, v - u, HH, e - d, tint(C.HEDGE, 0.95 + 0.08 * hash(u + d)));
              solid((u + v) / 2, (d + e) / 2, v - u, e - d, { top: Y + HH });
            }
            continue;
          }
          box((a + c) / 2, Y, (d + e) / 2, c - a, HH, e - d, tint(C.HEDGE, 0.95 + 0.08 * hash(a + d)));
          solid((a + c) / 2, (d + e) / 2, c - a, e - d, { top: Y + HH });
        }
        flat(lx0 + HT, lx1 - HT, lz0 + HT, lz1 - HT, Y + 0.02, C.LAWN);
      }
    }
    // trees in the beds, where the imagery has its crowns
    const TREES = [[33, -10], [39, 11], [52, -12], [57, 8], [55, -6], [35, 6]];
    TREES.forEach(([lx, lz], k) => tree(lx, lz, Y, 1.05 + 0.25 * hash(k + 9), k + 40));
    // lamp standards along the path, cast iron, lantern heads
    for (let lx = 30; lx <= 61; lx += 7.5) {
      for (const sz of [-1, 1]) {
        const lz = sz * 2.6;
        box(lx, Y, lz, 0.32, 0.4, 0.32, C.IRON);
        box(lx, Y + 0.4, lz, 0.12, 2.8, 0.12, C.IRON);
        box(lx, Y + 3.2, lz, 0.34, 0.42, 0.34, C.LAMP);
        box(lx, Y + 3.62, lz, 0.44, 0.1, 0.44, C.IRON);
        post(lx, lz, 0.18);
      }
    }
    // the flag: the national flag, on a white pole beside the path (where it
    // stands is inferred; that it stands in this court is the survey's)
    {
      const FX = 46.5, FZ = -7.0;
      box(FX, Y, FZ, 1.6, 0.5, 1.6, tint(C.CREAM, 0.94));
      box(FX, Y + 0.5, FZ, 0.14, 10.5, 0.14, C.FLAG_POLE);
      post(FX, FZ, 0.85);
      const fy = Y + 9.2, fl = 2.4, fh = 1.6;
      for (const [k, col] of [[0, C.FLAG_S], [1, C.FLAG_W], [2, C.FLAG_G]]) {
        lq2([FX, fy + fh - fh / 3 * k, FZ + 0.08], [FX, fy + fh - fh / 3 * (k + 1), FZ + 0.08],
          [FX, fy + fh - fh / 3 * (k + 1), FZ + 0.08 + fl], [FX, fy + fh - fh / 3 * k, FZ + 0.08 + fl], col);
      }
      lathe(FX + 0.01, FZ + 0.08 + fl / 2, [[fy + fh / 2 - 0.22, 0.0001], [fy + fh / 2, 0.0001]], 3, C.NAVY);
      panel(FX + 0.02, fy + fh / 2, FZ + 0.08 + fl / 2, 0.42, 0.42, 'E', C.NAVY);
      panel(FX - 0.02, fy + fh / 2, FZ + 0.08 + fl / 2, 0.42, 0.42, 'W', C.NAVY);
    }
  }

  // The north court: "a long narrow court with a single tree in a raised bed
  // between two arcaded ranges".
  {
    const BX = -2.0, BZ = -22.1;
    box(BX, Y, BZ, 3.2, 0.5, 3.2, tint(C.CREAM, 0.9));
    flat(BX - 1.45, BX + 1.45, BZ - 1.45, BZ + 1.45, Y + 0.5, C.EARTH);
    solid(BX, BZ, 3.2, 3.2, { top: Y + 0.5 });
    tree(BX, BZ, Y + 0.5, 1.25, 77);
  }
  // The west court, the ragged one: "straggly unclipped shrubs, bare earth,
  // litter". Do not build three tidy parterres.
  for (let i = 0; i < 14; i++) {
    const lx = -35.2 + hash(i + 3) * 9.6, lz = -16.5 + hash(i + 91) * 33.0;
    const r = 0.5 + hash(i + 7) * 0.9;
    // a straggly mound sitting on the earth, not a top balanced on its point
    lathe(lx, lz, [[Y, r * 0.8], [Y + r * 0.45, r * (1.0 + 0.2 * hash(i + 30))], [Y + r * 0.95, r * 0.75], [Y + r * 1.25, r * 0.3], [Y + r * 1.35, 0.05]], 7,
      (k, s) => tint(C.SHRUB, 0.85 + 0.25 * hash(i * 11 + s)));
    if (hash(i + 70) > 0.5) {
      const ox = lx + (hash(i + 71) - 0.5) * r * 1.4, oz = lz + (hash(i + 72) - 0.5) * r * 1.4;
      lathe(ox, oz, [[Y, r * 0.5], [Y + r * 0.35, r * 0.7], [Y + r * 0.75, r * 0.4], [Y + r * 0.9, 0.05]], 6,
        (k, s) => tint(C.SHRUB, 0.8 + 0.25 * hash(i * 13 + s)));
    }
    if (r > 0.9) post(lx, lz, r * 0.6);
  }
  for (let i = 0; i < 8; i++) {
    const lx = -35 + hash(i + 50) * 9, lz = -15 + hash(i + 60) * 30;
    box(lx, Y, lz, 0.25 + hash(i) * 0.3, 0.02, 0.18 + hash(i + 1) * 0.25, hash(i + 2) > 0.5 ? 0xe8e4dc : 0x6a8ab0, hash(i + 5));
  }

  /* ================================================================
   * THE RANGES — single-storey cloisters on north, south and west
   * ================================================================ */
  // Rooms behind a cloister of cusped arches on slender columns, on a raised
  // plinth, facing the courts; the outward walls salmon-tan, the inner court
  // arcades cream (the survey's "two families"). 4-5 m, flat-roofed, a
  // parapet. AC units and wall fans on the cloister walls, as photographed.
  const RH = 5.0;                       // the cloister ranges' height
  const CD = 3.0;                       // the cloister's depth
  const CLF = Y + 0.22;                 // its floor: one step up from the court
  /**
   * One range. Its rooms run from `out` (the outer face) to `inn` (the court
   * face) across the axis that is not `along`; `along` is 'x' or 'z'.
   */
  const range = (key, along, a0, a1, out, inn, opts = {}) => {
    const dir = Math.sign(inn - out);                  // from the outer face toward the court
    const cl = inn - dir * CD;                         // the cloister's back wall line
    const L = a1 - a0, mid = (a0 + a1) / 2;
    const at = (u, v) => (along === 'x' ? [u, v] : [v, u]);
    const B = (u0, u1, v0, v1, y, h, col) => {
      const [lx, lz] = at((u0 + u1) / 2, (v0 + v1) / 2);
      const [w, d] = along === 'x' ? [u1 - u0, Math.abs(v1 - v0)] : [Math.abs(v1 - v0), u1 - u0];
      box(lx, y, lz, w, h, d, col);
    };
    const S = (u0, u1, v0, v1, extra) => {
      const [lx, lz] = at((u0 + u1) / 2, (v0 + v1) / 2);
      const [w, d] = along === 'x' ? [u1 - u0, Math.abs(v1 - v0)] : [Math.abs(v1 - v0), u1 - u0];
      solid(lx, lz, w, d, extra);
    };
    const faceOut = along === 'x' ? (dir > 0 ? 'N' : 'S') : (dir > 0 ? 'W' : 'E');
    const faceIn = along === 'x' ? (dir > 0 ? 'S' : 'N') : (dir > 0 ? 'E' : 'W');
    const H = opts.h || RH;
    // the rooms: solid, salmon outside
    B(a0, a1, out, cl, Y, H, C.SALMON);
    S(a0, a1, out, cl);
    // a plinth course along the outer face, and the cornice and parapet
    B(a0, a1, out - dir * 0.15, out + dir * 0.05, Y - 0.6, 1.0, tint(C.SALMON2, 0.85));
    // the roof — weathered concrete, dark in the imagery — and the cornice
    // bands round its edges, then the parapets
    B(a0, a1, out, inn, Y + H, 0.06, tint(C.ROOF, 0.96 + 0.08 * hash(a0)));
    B(a0 - 0.3, a1 + 0.3, out - dir * 0.6, out + dir * 0.3, Y + H, 0.22, tint(C.SALMON, 0.92));
    B(a0 - 0.3, a1 + 0.3, inn - dir * 0.3, inn + dir * 0.4, Y + H, 0.22, tint(C.CREAM, 0.9));
    B(a0, a1, out - dir * 0.05, out + dir * 0.35, Y + H + 0.22, 0.8, tint(C.SALMON, 0.97));
    B(a0, a1, inn - dir * 0.35, inn + dir * 0.05, Y + H + 0.22, 0.65, tint(C.CREAM, 0.95));
    // the outer face: a blind arcade of cusped niches, and the chhajja over it
    const n = Math.max(3, Math.round(L / 4.4));
    for (let i = 0; i < n; i++) {
      const u = a0 + (i + 0.5) * L / n;
      const [lx, lz] = at(u, out - dir * 0.06);
      arch(lx, Y + 0.6, lz, Math.min(2.2, L / n * 0.55), 2.8, along, tint(C.SALMON, 1.06), 7, tint(C.SALMON_SH, 0.6), 0.12);
    }
    B(a0 - 0.2, a1 + 0.2, out - dir * 0.75, out + dir * 0.02, Y + 3.7, 0.16, tint(C.SALMON, 0.88));
    // the cloister: its floor, its back wall's doors, its arcade of cusped
    // arches on slender columns, cream
    B(a0, a1, cl, inn, Y - 0.1, CLF - Y + 0.1, tint(C.CREAM, 0.9));
    S(a0, a1, cl, inn, { top: CLF, tag: key + '-cloister', floor: true });
    B(a0, a1, cl - dir * 0.02, cl + dir * 0.12, CLF, H - 0.25, tint(C.CREAM, 0.94));
    const bays = Math.max(3, Math.round(L / 3.2));
    for (let i = 0; i <= bays; i++) {
      const u = a0 + i * L / bays;
      const [lx, lz] = at(u, inn - dir * 0.25);
      lathe(lx, lz, [[CLF, 0.2], [CLF + 0.25, 0.16], [CLF + 3.0, 0.12], [CLF + 3.25, 0.2]], 8, tint(C.CREAM, 1.02));
      post(lx, lz, 0.18);
      if (i < bays) {
        const um = u + L / bays / 2;
        const [ax, az] = at(um, inn - dir * 0.25);
        arch(ax, CLF + 0.3, az, L / bays - 0.4, 3.6, along, tint(C.CREAM, 1.0), 9, null, 0.3);
        archFill(ax, az, L / bays - 0.4, CLF + 0.3, 3.6, CLF + 3.6, along, -0.15, 0.15, tint(C.CREAM, 0.97));
        // a door in the back wall, every other bay; an AC box or a fan now and then
        if (i % 2 === 0) {
          const [dx, dz] = at(um, cl + dir * 0.14);
          panel(dx, CLF + 1.1, dz, 1.0, 2.2, faceIn, C.WOOD);
        } else if (hash(i + L) > 0.6) {
          const [dx, dz] = at(um, cl + dir * 0.3);
          box(dx, CLF + 2.3, dz, along === 'x' ? 0.8 : 0.45, 0.5, along === 'x' ? 0.45 : 0.8, 0xdedad0);
        }
      }
    }
    // the arcade's lintel and its little chhajja onto the court
    B(a0, a1, inn - dir * 0.45, inn + dir * 0.05, CLF + 3.6, Y + H - (CLF + 3.6), tint(C.CREAM, 0.97));
    B(a0 - 0.2, a1 + 0.2, inn - dir * 0.3, inn + dir * 0.6, CLF + 3.55, 0.14, tint(C.CREAM, 0.86));
    // the step up from the court, its full length
    {
      const [lx, lz] = at(mid, inn + dir * 0.225);
      box(lx, Y - 0.05, lz, along === 'x' ? L : 0.45, CLF - Y - 0.11 + 0.05, along === 'x' ? 0.45 : L, tint(C.CREAM, 0.88));
    }
    return { faceOut, faceIn };
  };
  range('jm-n', 'x', -44.7, 63.3, -39.3, -26.6);
  range('jm-s', 'x', -44.7, 63.3, 36.0, 22.9);
  range('jm-w', 'z', -26.6, 22.9, -44.7, -36.0);

  /* ================================================================
   * THE STREET RANGE — two storeys on the east, and the gateway
   * ================================================================ */
  // "A two-storey fortress-like street range": the ground storey salmon-tan
  // with a blind arcade of cusped niches, a deep chhajja on dense brackets,
  // the upper storey plain cream lime plaster with green-shuttered windows,
  // the eave and the parapet, three flat-roofed roof rooms. The gateway breaks
  // forward from its middle, on the shrine's axis.
  const E0 = 63.3, E1 = 77.0;          // the range's court face and its street face
  const SH = 11.5;                     // two storeys (survey: 11-13 m to the parapet)
  const G = 2.2;                       // half the passage's width
  {
    for (const [z0, z1] of [[-39.3, -G], [G, 36.0]]) {
      const zm = (z0 + z1) / 2, L = z1 - z0;
      // the rooms (the court cloister comes after)
      box((E0 + CD + E1) / 2, Y, zm, E1 - E0 - CD, 6.2, L, C.SALMON);
      box((E0 + CD + E1) / 2, Y + 6.2, zm, E1 - E0 - CD, SH - 6.2, L, C.PLASTER);
      solid((E0 + CD + E1) / 2, zm, E1 - E0 - CD, L);
      // the street face's plinth course
      box(E1 + 0.05, Y - 0.6, zm, 0.3, 1.0, L, tint(C.SALMON2, 0.85));
      // the ground storey's blind arcade on the street, pointed-cusped niches
      const n = Math.max(2, Math.round(L / 4.2));
      for (let i = 0; i < n; i++) {
        const lz = z0 + (i + 0.5) * L / n;
        if (Math.abs(lz) < 9) continue;            // the gateway stands here
        arch(E1 + 0.06, Y + 0.7, lz, 2.1, 3.6, 'z', tint(C.SALMON, 1.08), 9, tint(C.SALMON_SH, 0.55), 0.14);
      }
      // the storey line: a deep chhajja on a dense bracket course
      box(E1 + 0.5, Y + 6.0, zm, 1.2, 0.2, L + 0.2, tint(C.SALMON, 0.9));
      for (let i = 0; i < Math.round(L / 0.9); i++) {
        const lz = z0 + 0.45 + i * 0.9;
        if (Math.abs(lz) < 7.6) continue;
        box(E1 + 0.3, Y + 5.55, lz, 0.6, 0.45, 0.16, tint(C.SALMON, 0.84));
      }
      // the upper storey: plain cream plaster, green-shuttered windows
      const m = Math.max(2, Math.round(L / 3.6));
      for (let i = 0; i < m; i++) {
        const lz = z0 + (i + 0.5) * L / m;
        if (Math.abs(lz) < 8.4) continue;
        panel(E1 + 0.02, Y + 8.4, lz, 1.0, 1.5, 'E', C.SHUTTER);
        panel(E1 + 0.03, Y + 8.4, lz, 0.06, 1.5, 'E', tint(C.SHUTTER, 0.7));
        box(E1, Y + 7.6, lz, 0.25, 0.08, 1.3, tint(C.PLASTER, 0.92));
        // and the court side the same
        panel(E0 + CD - 0.02, Y + 8.4, lz, 1.0, 1.5, 'W', C.SHUTTER);
      }
      // the eave and the parapet
      box(E1 + 0.35, Y + SH, zm, 0.9, 0.2, L + 0.3, tint(C.SALMON, 0.9));
      box(E1 - 0.2, Y + SH + 0.2, zm, 0.35, 0.9, L, tint(C.PLASTER, 0.95));
      box(E0 + CD + 0.2, Y + SH + 0.2, zm, 0.35, 0.75, L, tint(C.PLASTER, 0.95));
      box((E0 + CD + E1) / 2, Y + SH, zm, E1 - E0 - CD, 0.06, L, tint(C.ROOF, 1.0));
      // the court-side cloister of this range, cream
      box(E0 + CD / 2, Y - 0.1, zm, CD, CLF - Y + 0.1, L, tint(C.CREAM, 0.9));
      solid(E0 + CD / 2, zm, CD, L, { top: CLF, tag: 'jm-e-cloister', floor: true });
      const bays = Math.max(3, Math.round(L / 3.2));
      for (let i = 0; i <= bays; i++) {
        const lz = z0 + i * L / bays;
        if (Math.abs(lz) < G + 0.3) continue;
        lathe(E0 + 0.25, lz, [[CLF, 0.2], [CLF + 0.25, 0.16], [CLF + 3.0, 0.12], [CLF + 3.25, 0.2]], 8, tint(C.CREAM, 1.02));
        post(E0 + 0.25, lz, 0.18);
        if (i < bays) {
          arch(E0 + 0.25, CLF + 0.3, lz + L / bays / 2, L / bays - 0.4, 3.6, 'z', C.CREAM, 9, null, 0.3);
          archFill(E0 + 0.25, lz + L / bays / 2, L / bays - 0.4, CLF + 0.3, 3.6, CLF + 3.6, 'z', -0.15, 0.15, tint(C.CREAM, 0.97));
        }
      }
      box(E0 + 0.2, CLF + 3.6, zm, 0.5, 6.2 - (CLF - Y) - 3.6, L, tint(C.CREAM, 0.97));
      box(E0 + 0.0, CLF + 3.55, zm, 0.9, 0.14, L + 0.2, tint(C.CREAM, 0.86));
      box(E0 - 0.2, Y - 0.05, zm, 0.45, CLF - Y - 0.06, L, tint(C.CREAM, 0.88));
    }
    // the passage through the range, over the gate: its vault and its walls
    box((E0 + E1) / 2, Y + 6.6, 0, E1 - E0, SH - 6.6, 2 * G + 0.1, C.PLASTER);
    for (const s of [-1, 1]) box((E0 + E1) / 2, Y, s * (G + 0.08), E1 - E0, 6.6, 0.16, tint(C.SALMON, 0.95));
    flat(E0, E1 + 1.6, -G, G, Y + 0.01, tint(0xcfc2a8, 0.9));
    // its floor, at the court's level: without it a body in the passage stood
    // on the terrain under the platform, and the court's edge was a wall
    solid((E0 + E1) / 2, 0, E1 - E0, 2 * G, { top: Y, tag: 'jm-passage', floor: true });
    // the inner arch on the court face: "a second arched gate on axis"
    arch(E0 + 0.05, Y, 0, 2 * G - 0.2, 5.8, 'z', tint(C.CREAM, 1.0), 9, null, 0.5);
    archFill(E0 + 0.05, 0, 2 * G - 0.2, Y, 5.8, Y + 6.6, 'z', -0.25, 0.25, tint(C.CREAM, 0.97));
    // the roof rooms: "at least three flat-roofed rectangular roof rooms with
    // cornices", plainly visible on the street range
    for (const [lz, w] of [[-29, 6.0], [-15, 5.0], [17, 6.5]]) {
      box(70.0, Y + SH, lz, 5.0, 3.0, w, tint(C.PLASTER, 0.96));
      box(70.0, Y + SH + 3.0, lz, 5.6, 0.25, w + 0.6, tint(C.SALMON, 0.9));
      panel(72.52, Y + SH + 1.3, lz, 0.9, 1.6, 'E', C.SHUTTER);
    }
  }

  /* ================================================================
   * THE GATEWAY FRONTISPIECE
   * ================================================================ */
  // "One grand carved gateway frontispiece breaking forward and rising above
  // the parapet: three cusped arches at ground level, a three-arched cusped
  // loggia above behind a stone balustrade, richly carved spandrels and panel
  // bands, a jharokha to one side, a deep bracketed cornice, a small pavilion
  // above. Massive timber door leaves studded with round metal bosses." And the
  // Government of Rajasthan's Devasthan Vibhag signboard bolted across it.
  {
    const FX = E1 + 1.4, FW = 15.0, FH = 13.0;      // breaks 1.4 m forward
    // the frontispiece's mass, cut through for the passage: its two piers,
    // and over the arch's apex; the spandrels round the arch filled
    for (const s of [-1, 1]) box(E1 + 0.7, Y, s * (2.0 + (FW / 2 - 2.0) / 2), 1.4, FH, FW / 2 - 2.0, C.SALMON);
    box(E1 + 0.7, Y + 6.6, 0, 1.4, FH - 6.6, 4.0, C.SALMON);
    archFill(E1 + 0.7, 0, 4.0, Y, 6.6, Y + 6.6, 'z', -0.7, 0.7, tint(C.SALMON, 1.0), 11);
    // the passage: the solid blocks either side of the central arch
    for (const s of [-1, 1]) solid(E1 + 0.7, s * (G + (FW / 2 - G) / 2), 1.4, FW / 2 - G);
    for (const s of [-1, 1]) solid((E0 + E1) / 2, s * (G + 0.08), E1 - E0, 0.16);
    // the three arches at ground level: the passage, and a smaller each side
    arch(FX + 0.02, Y, 0, 4.0, 6.6, 'z', tint(C.SALMON, 1.1), 11, null, 0.3);
    for (const s of [-1, 1]) arch(FX + 0.02, Y + 0.6, s * 4.9, 2.4, 4.6, 'z', tint(C.SALMON, 1.08), 9, tint(C.SALMON_SH, 0.5), 0.2);
    // carved spandrels and panel bands over them
    for (const s of [-1, 0, 1]) panel(FX + 0.03, Y + 7.1, s * 4.9, s === 0 ? 4.6 : 2.8, 0.7, 'E', tint(C.SALMON, 1.14));
    panel(FX + 0.03, Y + 7.7, 0, FW - 0.6, 0.22, 'E', tint(C.SALMON, 0.88));
    for (let i = 0; i < 18; i++) panel(FX + 0.04, Y + 6.2, -FW / 2 + 0.6 + i * (FW - 1.2) / 17, 0.3, 0.3, 'E', tint(C.SALMON, 1.2));
    // carving in relief: recessed panels in the piers, dark reveals, a band
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        panel(FX + 0.03, Y + 1.4 + k * 1.6, s * 6.75, 0.9, 1.2, 'E', tint(C.SALMON_SH, 0.8));
        panel(FX + 0.04, Y + 1.4 + k * 1.6, s * 6.75, 0.6, 0.9, 'E', tint(C.SALMON, 1.16));
      }
      panel(FX + 0.03, Y + 9.6, s * 6.4, 1.6, 2.6, 'E', tint(C.SALMON_SH, 0.78));
      panel(FX + 0.04, Y + 9.6, s * 6.4, 1.1, 2.0, 'E', tint(C.SALMON, 1.12));
    }
    panel(FX + 0.03, Y + FH - 2.35, 0, FW - 0.8, 0.5, 'E', tint(C.SALMON_SH, 0.75));
    for (let i = 0; i < 26; i++) panel(FX + 0.04, Y + FH - 2.35, -FW / 2 + 0.7 + i * (FW - 1.4) / 25, 0.28, 0.32, 'E', tint(C.SALMON, 1.18));
    // the loggia: three cusped arches behind a stone balustrade
    box(E1 + 0.4, Y + 7.9, 0, 0.8, 0.2, 9.6, tint(C.SALMON, 0.92));
    for (const lz of [-3.0, 0, 3.0]) arch(FX - 0.6, Y + 8.1, lz, 2.5, 3.3, 'z', tint(C.SALMON, 1.1), 9, C.DARK, 0.3);
    box(FX - 0.25, Y + 8.1, 0, 0.18, 0.9, 9.2, tint(C.SALMON, 1.0));
    for (let i = 0; i < 24; i++) box(FX - 0.25, Y + 8.15, -4.5 + i * 9 / 23, 0.12, 0.8, 0.12, tint(C.SALMON, 1.12));
    // a jharokha to one side: an oriel on brackets under a little curved hood
    {
      const jz = 6.0, jy = Y + 8.4;
      box(FX + 0.45, jy - 0.5, jz, 0.9, 0.5, 1.6, tint(C.SALMON, 0.86));
      for (const s of [-1, 1]) box(FX + 0.4, jy - 1.1, jz + s * 0.55, 0.6, 0.6, 0.16, tint(C.SALMON, 0.82));
      box(FX + 0.45, jy, jz, 0.9, 1.5, 1.6, tint(C.SALMON, 1.02));
      panel(FX + 0.91, jy + 0.75, jz, 1.1, 1.0, 'E', tint(C.SALMON_SH, 0.6));
      box(FX + 0.45, jy + 1.5, jz, 1.2, 0.18, 1.9, tint(C.SALMON, 0.9));
    }
    // the deep bracketed cornice, and the parapet over the frontispiece
    box(FX - 0.05, Y + FH - 1.4, 0, 2.6, 0.22, FW + 0.6, tint(C.SALMON, 0.9));
    for (let i = 0; i < 30; i++) box(FX + 0.3, Y + FH - 1.95, -FW / 2 + 0.3 + i * (FW - 0.6) / 29, 0.8, 0.55, 0.16, tint(C.SALMON, 0.82));
    box(E1 + 0.7, Y + FH - 1.18, 0, 1.4, 1.18, FW, tint(C.SALMON, 1.0));
    // the small pavilion above: four columns, a flat cornice, a low dome
    {
      const PY = Y + FH, PX = E1 + 0.2;
      box(PX, PY, 0, 3.4, 0.4, 3.8, tint(C.SALMON, 0.92));
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        lathe(PX + sx * 1.35, sz * 1.55, [[PY + 0.4, 0.14], [PY + 2.5, 0.12]], 8, tint(C.SALMON, 1.05));
      }
      for (const lz of [-1.03, 0, 1.03]) arch(PX + 1.35, PY + 0.4, lz, 1.0, 1.9, 'z', tint(C.SALMON, 1.08), 7, null, 0.12);
      box(PX, PY + 2.5, 0, 3.9, 0.22, 4.3, tint(C.SALMON, 0.9));
      lathe(PX, 0, [[PY + 2.72, 1.5], [PY + 3.1, 1.45], [PY + 3.6, 1.1], [PY + 3.95, 0.4], [PY + 4.15, 0.08]], 12, tint(C.SALMON, 1.0));
      box(PX, PY + 4.15, 0, 0.08, 0.6, 0.08, C.BRASS);
    }
    // the door leaves, massive timber studded with round bosses, open back
    // against the passage walls
    for (const s of [-1, 1]) {
      box(E1 - 1.1, Y, s * (G - 0.2), 2.0, 5.4, 0.18, C.WOOD);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) {
        box(E1 - 1.9 + i * 0.4, Y + 0.4 + j * 0.58, s * (G - 0.31), 0.08, 0.08, 0.05, C.BOSS);
      }
    }
    // "राजस्थान सरकार / कार्यालय सहायक आयुक्त / देवस्थान विभाग राजस्थान / वृन्दावन",
    // across the frontispiece over the north arch (its colours are inferred)
    sign('jm-devasthan', FX + 0.08, Y + 6.15, -4.9, 3.4, 0.9, F.E);
  }

  /* ================================================================
   * OUTSIDE, EAST — the forecourt, its steps, the drive, the office
   * ================================================================ */
  {
    // the forecourt, paved, raised with the core
    const FZ0 = -22, FZ1 = 22, FXE = 90.3;
    for (let i = 0; i < 8; i++) {
      const lx0 = E1 + i * (FXE - E1) / 8, lx1 = E1 + (i + 1) * (FXE - E1) / 8;
      flat(lx0 + 0.03, lx1 - 0.03, FZ0, FZ1, Y + 0.012, tint(0xcbbd9f, 0.93 + 0.08 * hash(i + 300)));
    }
    solid((E1 + FXE) / 2 + 0.7, 0, FXE - E1 - 1.4, FZ1 - FZ0, { top: Y, tag: 'jm-forecourt', floor: true });
    solid(E1 + 0.7, 0, 1.4, 2 * G, { top: Y, tag: 'jm-gate-floor', floor: true });
    // "reached by a broad flight of steps": down to the drive, the width of
    // the drive's mouth
    const foot = tH(FXE + 0.9, 8);
    flight(FXE, 1, 8, 9.0, Y, foot, 'jm-forecourt-steps', C.SALMON2);
    // the low walls round its north and south edges, which also keep a body
    // from stepping off a half-metre drop where the steps are not
    for (const s of [-1, 1]) {
      box((E1 + FXE) / 2 + 0.7, Y, s * (FZ1 + 0.15), FXE - E1 - 1.4, 0.6, 0.3, tint(C.SALMON, 0.95));
      solid((E1 + FXE) / 2 + 0.7, s * (FZ1 + 0.15), FXE - E1 - 1.4, 0.3);
    }
    for (const [lz0, lz1] of [[FZ0, 3.5], [12.5, FZ1]]) {
      box(FXE + 0.15, Y, (lz0 + lz1) / 2, 0.3, 0.6, lz1 - lz0, tint(C.SALMON, 0.95));
      solid(FXE + 0.15, (lz0 + lz1) / 2, 0.3, lz1 - lz0);
    }
    // motorcycles on the forecourt, as photographed
    for (let i = 0; i < 6; i++) {
      const lx = 80.5 + i * 1.1, lz = -14 + hash(i) * 0.6;
      box(lx, Y + 0.3, lz, 0.32, 0.55, 1.8, i % 2 ? 0x2a2a32 : 0x8a1c1c);
      box(lx, Y, lz - 0.6, 0.12, 0.55, 0.5, C.TYRE);
      box(lx, Y, lz + 0.6, 0.12, 0.55, 0.5, C.TYRE);
      post(lx, lz, 0.45);
    }
    // the small red Devasthan sign at the forecourt's edge
    box(88.6, Y, 15.5, 0.1, 1.9, 0.1, C.IRON);
    box(88.6, Y, 16.9, 0.1, 1.9, 0.1, C.IRON);
    sign('jm-devasthan-small', 88.68, Y + 2.15, 16.2, 1.7, 0.6, F.E);
    // coaches and a car, parked off the drive where the imagery has them
    const coach = (lx, lz, col) => {
      const g = tH(lx, lz);
      box(lx, g + 0.4, lz, 11.2, 2.9, 2.5, C.BUS);
      box(lx, g + 0.4, lz, 11.21, 0.6, 2.51, col);
      for (const s of [-1, 1]) panel(lx, g + 2.25, lz + s * 1.26, 10.4, 0.85, s > 0 ? 'S' : 'N', C.GLASS);
      panel(lx + 5.61, g + 2.0, lz, 2.3, 1.2, 'E', C.GLASS);
      for (const wx of [-3.6, 3.4]) for (const s of [-1, 1]) box(lx + wx, g, lz + s * 1.05, 1.0, 0.95, 0.35, C.TYRE);
      solid(lx, lz, 11.2, 2.5);
    };
    coach(103.5, -12.5, C.BUS2);
    coach(103.8, -6.4, 0x2a5aa8);
    {
      const g = tH(96, 1.5);
      box(96, g + 0.3, 1.5, 4.0, 0.75, 1.7, 0xeeeeea);
      box(95.8, g + 1.05, 1.5, 2.2, 0.55, 1.6, C.GLASS);
      solid(96, 1.5, 4.0, 1.7);
    }
    // the office building north of the forecourt: two storeys, cream plaster,
    // green shutters, a flat roof — the Devasthan Vibhag's office, or the
    // Braj Akademi's (which is which is not recorded)
    {
      const g = topOf(92, 113, -30, -11, 3);
      box(102.5, g - 0.3, -20.5, 21, 7.8, 19, C.PLASTER);
      box(102.5, g + 7.5, -20.5, 21.4, 0.22, 19.4, tint(C.SALMON, 0.9));
      box(102.5, g + 7.72, -20.5, 21, 0.7, 19, tint(C.PLASTER, 0.94));
      solid(102.5, -20.5, 21, 19);
      for (let i = 0; i < 6; i++) for (const yy of [1.6, 5.0]) {
        panel(102.5 - 9 + i * 3.6, g + yy, -10.99, 1.0, 1.4, 'S', C.SHUTTER);
        panel(92.0 - 0.01, g + yy, -28 + i * 3.4, 1.0, 1.4, 'W', C.SHUTTER);
      }
      panel(98.0, g + 1.2, -10.99, 1.4, 2.4, 'S', C.WOOD);
      box(102.5, g + 3.6, -10.6, 21.2, 0.16, 0.9, tint(C.SALMON, 0.88));
    }
  }

  /* ================================================================
   * OUTSIDE, SOUTH — the goshala
   * ================================================================ */
  // "A goshala yard with loose cattle drinking from hollowed-log troughs,
  // enclosed by a pillared veranda where people sit" — the Shripad Baba
  // Goshala. Its two big sheds south of the core have blue metal roofs in
  // the imagery (OSM ways 679447878 and 679447895).
  {
    const shed = (lx0, lx1, lz0, lz1, k) => {
      const g = topOf(lx0, lx1, lz0, lz1, 3);
      const H = 4.6, mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2;
      // a low pitched blue roof on steel posts, open sides
      const W = lx1 - lx0, D = lz1 - lz0;
      lq([lx0 - 0.3, g + H, lz0 - 0.3], [lx0 - 0.3, g + H + 1.1, mz], [lx1 + 0.3, g + H + 1.1, mz], [lx1 + 0.3, g + H, lz0 - 0.3], tint(C.BLUE, 1.02));
      lq([lx0 - 0.3, g + H + 1.1, mz], [lx0 - 0.3, g + H, lz1 + 0.3], [lx1 + 0.3, g + H, lz1 + 0.3], [lx1 + 0.3, g + H + 1.1, mz], tint(C.BLUE2, 0.98));
      lq([lx0 - 0.3, g + H - 0.08, lz0 - 0.3], [lx1 + 0.3, g + H - 0.08, lz0 - 0.3], [lx1 + 0.3, g + H + 1.02, mz], [lx0 - 0.3, g + H + 1.02, mz], 0x8a8f96);
      lq([lx0 - 0.3, g + H + 1.02, mz], [lx1 + 0.3, g + H + 1.02, mz], [lx1 + 0.3, g + H - 0.08, lz1 + 0.3], [lx0 - 0.3, g + H - 0.08, lz1 + 0.3], 0x8a8f96);
      for (let i = 0; i <= Math.round(W / 6); i++) for (const lz of [lz0, mz, lz1]) {
        const lx = lx0 + i * W / Math.round(W / 6);
        box(lx, g, lz, 0.2, H + (lz === mz ? 1.1 : 0), 0.2, C.POST);
        post(lx, lz, 0.16);
      }
      flat(lx0, lx1, lz0, lz1, g + 0.02, tint(C.EARTH, 0.85));
      // the veranda where people sit: a raised strip along the north side
      box(mx, g, lz0 + 1.1, W, 0.45, 2.2, tint(C.CREAM, 0.85));
      solid(mx, lz0 + 1.1, W, 2.2, { top: g + 0.45 });
      // hollowed-log troughs, and the cattle at them
      for (let i = 0; i < 4; i++) {
        const lx = lx0 + 4 + i * (W - 8) / 3, lz = mz + 2;
        box(lx, g, lz, 3.4, 0.55, 0.7, C.LOG);
        box(lx, g + 0.4, lz, 3.0, 0.16, 0.42, 0x3a5a6a);
        solid(lx, lz, 3.4, 0.7);
        for (let c = 0; c < 2; c++) {
          const cx = lx - 0.9 + c * 1.8, cz = lz + 1.4 + hash(k * 13 + i * 3 + c) * 0.8;
          const yaw = Math.PI + (hash(i * 7 + c + k) - 0.5) * 0.5;
          box(cx, g + 0.62, cz, 0.58, 0.66, 1.5, C.COW, yaw);
          box(cx + Math.sin(yaw) * 0.05, g + 0.75, cz - 0.85, 0.32, 0.36, 0.5, C.COW, yaw);
          for (const sx of [-0.2, 0.2]) for (const sz of [-0.5, 0.5]) box(cx + sx, g, cz + sz, 0.13, 0.64, 0.13, 0xd0c6b2, yaw);
          post(cx, cz, 0.55);
        }
      }
    };
    shed(-62.0, -10.0, 46.0, 72.0, 1);
    shed(17.0, 58.0, 46.0, 72.0, 2);
  }

  /* ================================================================
   * THE SHRINE BLOCK — massing, walls and colliders
   * ================================================================ */
  const X0 = -24.9, X1 = 19.6, Z0 = -17.6, Z1 = 17.6;       // its walls' outer faces
  const WT = 1.2;                                           // walls 1.2 m: coursed ashlar
  const HX0 = -8.4;                                         // the hall's west wall: the sanctums behind it
  const HX1 = X1 - WT, HZ = Z1 - WT;                        // its east wall's inner face, its side walls'
  {
    // the block's base course, on the court
    box((X0 + X1) / 2, Y - 0.1, 0, X1 - X0 + 0.5, FL - Y + 0.1, Z1 - Z0 + 0.5, tint(C.CREAM, 0.86));
    // the four walls, solid, the east one parted for the great arch
    const W1 = 1.5;                                         // half the great arch's opening
    box((X0 + X1) / 2, FL, Z0 + WT / 2, X1 - X0, T - FL, WT, C.CREAM);
    box((X0 + X1) / 2, FL, Z1 - WT / 2, X1 - X0, T - FL, WT, C.CREAM);
    box(X0 + WT / 2, FL, 0, WT, T - FL, Z1 - Z0 - 2 * WT, C.CREAM);
    solid((X0 + X1) / 2, Z0 + WT / 2, X1 - X0, WT);
    solid((X0 + X1) / 2, Z1 - WT / 2, X1 - X0, WT);
    // the rooms behind the sanctums are solid; the sanctums themselves are
    // laid out with them below, a doorway's depth of floor before each altar
    // the east wall in three: either side of the great arch, and over its apex
    for (const s of [-1, 1]) box(X1 - WT / 2, FL, s * (W1 + (HZ - W1) / 2), WT, T - FL, HZ - W1, C.CREAM);
    box(X1 - WT / 2, FL + 5.0, 0, WT, T - FL - 5.0, 2 * W1, C.CREAM);
    for (const s of [-1, 1]) solid(X1 - WT / 2, s * (W1 + (HZ - W1) / 2), WT, HZ - W1);
    // the roof terrace and its parapet
    box((X0 + X1) / 2, T - 0.3, 0, X1 - X0, 0.3, Z1 - Z0, C.ROOF_SHRINE);
    // patches of fresher lime on the weathered roof, as the imagery has
    for (let i = 0; i < 9; i++) {
      const lx = X0 + 4 + hash(i + 200) * (X1 - X0 - 8), lz = Z0 + 4 + hash(i + 220) * (Z1 - Z0 - 8);
      flat(lx - 1.5 - hash(i) * 2, lx + 1.5 + hash(i + 1) * 2, lz - 1 - hash(i + 2), lz + 1 + hash(i + 3), T + 0.01, tint(0xb3ab9a, 0.95 + 0.1 * hash(i + 4)));
    }
    for (const [lx, lz, w, d] of [[(X0 + X1) / 2, Z0 + 0.2, X1 - X0, 0.4], [(X0 + X1) / 2, Z1 - 0.2, X1 - X0, 0.4], [X0 + 0.2, 0, 0.4, Z1 - Z0], [X1 - 0.2, 0, 0.4, Z1 - Z0]]) {
      box(lx, T, lz, w, 1.0, d, tint(C.CREAM, 0.96));
      box(lx, T + 1.0, lz, w + 0.25, 0.12, d + 0.25, tint(C.CREAM, 0.88));
    }
    // the hall's floor and the terrace's, one each, and the threshold
    solid((HX0 + HX1) / 2, 0, HX1 - HX0, 2 * HZ, { top: FL, tag: 'jm-hall-floor', floor: true });
    solid(X1 - WT / 2, 0, WT, 2 * W1, { top: FL, tag: 'jm-threshold', floor: true });
  }

  /* ---------------- the terrace, its balustrade, its flight ---------------- */
  {
    const TX1 = 24.9, TZ = 15.5;
    box((X1 + TX1) / 2, Y - 0.1, 0, TX1 - X1, FL - Y + 0.1, 2 * TZ, tint(C.CREAM, 0.92));
    flat(X1, TX1, -TZ, TZ, FL + 0.005, tint(0xe2dccb, 0.96));
    solid((X1 + TX1) / 2, 0, TX1 - X1, 2 * TZ, { top: FL, tag: 'jm-terrace', floor: true });
    // a moulded plinth face on the court
    panel(TX1 + 0.01, (Y + FL) / 2, -9.25, 12.5, FL - Y - 0.1, 'E', tint(C.CREAM, 0.88));
    panel(TX1 + 0.01, (Y + FL) / 2, 9.25, 12.5, FL - Y - 0.1, 'E', tint(C.CREAM, 0.88));
    // the balustrade round its edge, but for the flight on the axis: solid,
    // because a 1.15 m drop off it would land a body under the court's paving
    const rail = (lx0, lx1, lz0, lz1) => {
      const mx = (lx0 + lx1) / 2, mz = (lz0 + lz1) / 2, w = Math.max(0.25, lx1 - lx0), d = Math.max(0.25, lz1 - lz0);
      box(mx, FL, mz, w, 0.12, d, tint(C.CREAM, 0.9));
      box(mx, FL + 0.82, mz, w + 0.08, 0.1, d + 0.08, tint(C.CREAM, 0.96));
      const n = Math.round(Math.max(w, d) / 0.32);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        lathe(lx0 + (lx1 - lx0) * t + (w === 0.25 ? 0 : 0), lz0 + (lz1 - lz0) * t, [[FL + 0.12, 0.06], [FL + 0.4, 0.1], [FL + 0.62, 0.05], [FL + 0.82, 0.07]], 6, tint(C.CREAM, 1.02));
      }
      solid(mx, mz, w, d, { top: FL + 0.92 });
    };
    rail(TX1 - 0.12, TX1 - 0.12, -TZ, -3.2);
    rail(TX1 - 0.12, TX1 - 0.12, 3.2, TZ);
    rail(X1 + 0.2, TX1, -TZ + 0.12, -TZ + 0.12);
    rail(X1 + 0.2, TX1, TZ - 0.12, TZ - 0.12);
    // "a plinth of 5-6 steps": five risers of 0.23 to the court, 6 m broad
    flight(TX1, 1, 0, 6.0, FL, Y, 'jm-shrine-steps', C.CREAM);
    // a lamp-post either side of the flight's foot
    for (const s of [-1, 1]) {
      box(27.2, Y, s * 3.4, 0.4, 0.5, 0.4, C.IRON);
      box(27.2, Y + 0.5, s * 3.4, 0.14, 3.0, 0.14, C.IRON);
      box(27.2, Y + 3.5, s * 3.4, 0.38, 0.46, 0.38, C.LAMP);
      post(27.2, s * 3.4, 0.22);
    }
  }

  /* ---------------- the east facade ---------------- */
  // Ground storey ~10.5 m: the central porch frame with ONE great multi-
  // cusped arch, 5.0 m to its apex, 3.0 m wide, closed by a black steel
  // grille (open now, its leaves folded back) with the altar glowing through;
  // a smaller cusped doorway each side, 3.4 x 1.5 m, with a carved jali panel
  // in a cusped surround above; recessed cusped bays with jali beyond. Then the
  // first floor's continuous open gallery of cusped arches on colonnettes
  // behind a balustrade, taller over the porch; a deep chhajja on brackets; a
  // plain attic; the parapet at the terrace, 16 m up.
  {
    const FX = X1 + 0.02;
    const G1 = FL + 10.5;                       // the first-floor gallery's floor
    // the porch frame, projecting, carved spandrels, the deep band above
    for (const s of [-1, 1]) box(X1 + 0.3, FL, s * 2.45, 0.6, 7.4, 1.9, tint(C.CREAM, 1.0));
    box(X1 + 0.3, FL + 5.0, 0, 0.6, 2.4, 3.0, tint(C.CREAM, 1.0));
    for (const s of [-1, 1]) solid(X1 + 0.3, s * 2.4, 0.6, 1.8);
    arch(X1 + 0.62, FL, 0, 3.0, 5.0, 'z', tint(C.CREAM2, 1.0), 11, null, 0.7);
    // the spandrels and the soffit, through the porch frame and the wall
    archFill(X1, 0, 3.0, FL, 5.0, FL + 5.0, 'z', -WT, 0.6, tint(C.CREAM, 0.98), 11);
    for (const s of [-1, 1]) panel(X1 + 0.62, FL + 4.4, s * 2.35, 1.4, 1.6, 'E', tint(C.CREAM2, 0.92));
    panel(X1 + 0.62, FL + 6.2, 0, 6.6, 1.6, 'E', tint(C.CREAM2, 0.95));
    for (let i = 0; i < 14; i++) panel(X1 + 0.63, FL + 6.2, -3.0 + i * 6 / 13, 0.22, 1.2, 'E', tint(C.CREAM2, 1.1));
    box(X1 + 0.35, FL + 7.4, 0, 0.9, 0.2, 7.2, tint(C.CREAM, 0.9));
    // the grille, open: two folded leaves of black bars against the reveals
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) box(X1 - 0.1 - i * 0.12, FL, s * (1.42 - i * 0.004), 0.03, 4.0, 0.03, C.IRON);
      box(X1 - 0.4, FL + 2.0, s * 1.42, 0.7, 0.05, 0.05, C.IRON);
    }
    // the flanking doorways and their jali panels
    for (const s of [-1, 1]) {
      const lz = s * 5.0;
      box(FX, FL, lz, 0.18, 3.6, 2.0, tint(C.CREAM, 0.94));
      panel(FX + 0.1, FL + 1.7, lz, 1.5, 3.4, 'E', C.WOOD);
      arch(FX + 0.12, FL + 3.8, lz, 1.5, 1.9, 'z', tint(C.CREAM2, 1.04), 9, tint(C.CREAM_SH, 0.75), 0.12);
    }
    // recessed cusped bays with jali, beyond
    for (const s of [-1, 1]) for (const lz of [8.6, 12.0, 15.2]) {
      arch(FX, FL + 0.6, s * lz, 1.9, 4.4, 'z', tint(C.CREAM, 1.04), 9, tint(C.CREAM_SH, 0.7), 0.16);
    }
    // the string course, and the plain field up to the gallery
    box(X1 + 0.12, FL + 8.6, 0, 0.3, 0.2, Z1 - Z0 + 0.3, tint(C.CREAM, 0.88));
    // the first floor's open gallery: cusped arches on colonnettes behind a
    // balustrade, the three central bays taller
    box(X1 + 0.5, G1 - 0.2, 0, 1.0, 0.2, Z1 - Z0, tint(C.CREAM, 0.9));
    {
      const bays = [];
      for (let lz = -16.0; lz < -3.4; lz += 2.53) bays.push([lz + 1.27, 2.3, 3.0]);
      for (const lz of [-2.33, 0, 2.33]) bays.push([lz, 2.2, 3.5]);
      for (let lz = 3.5; lz < 16.0; lz += 2.53) bays.push([lz + 1.27, 2.3, 3.0]);
      for (const [lz, w, h] of bays) {
        arch(FX, G1, lz, w, h, 'z', tint(C.CREAM2, 1.02), 9, tint(C.CREAM_SH, 0.62), 0.2);
        lathe(FX + 0.15, lz - w / 2 - 0.06, [[G1, 0.09], [G1 + h * 0.55, 0.07], [G1 + h * 0.6, 0.1]], 6, tint(C.CREAM, 1.05));
      }
      box(FX + 0.25, G1, 0, 0.14, 0.85, Z1 - Z0 - 0.6, tint(C.CREAM, 0.95));
      // bracketed balconies at intervals
      for (const s of [-1, 1]) {
        box(X1 + 0.55, G1 - 0.2, s * 9.5, 1.1, 0.95, 2.6, tint(C.CREAM, 0.98));
        for (const k of [-1, 1]) box(X1 + 0.35, G1 - 0.9, s * 9.5 + k * 1.0, 0.7, 0.7, 0.18, tint(C.CREAM, 0.86));
      }
    }
    // the deep chhajja on brackets, the attic, the parapet at the terrace
    box(X1 + 0.6, FL + 14.3, 0, 1.6, 0.18, Z1 - Z0 + 1.2, tint(C.CREAM, 0.88));
    for (let i = 0; i < 40; i++) box(X1 + 0.35, FL + 13.75, Z0 + 0.4 + i * (Z1 - Z0 - 0.8) / 39, 0.7, 0.55, 0.15, tint(C.CREAM, 0.82));
    panel(FX + 0.01, FL + 14.6, 0, Z1 - Z0, 0.5, 'E', tint(C.CREAM, 0.93));
    // the same grammar, plainer, on the north and south faces over the narrow
    // courts: a blind arcade, the gallery's arches, the chhajja
    for (const s of [-1, 1]) {
      const zf = s * (Z1 + 0.02), face = s > 0 ? 'S' : 'N';
      for (let i = 0; i < 9; i++) {
        const lx = X0 + 2.2 + i * (X1 - X0 - 4.4) / 8;
        arch(lx, FL + 0.6, zf, 2.0, 4.6, 'x', tint(C.CREAM, 1.04), 9, tint(C.CREAM_SH, 0.7), 0.16);
        arch(lx, G1, zf, 2.1, 3.0, 'x', tint(C.CREAM2, 1.02), 9, tint(C.CREAM_SH, 0.62), 0.18);
      }
      box((X0 + X1) / 2, FL + 14.3, s * (Z1 + 0.6), X1 - X0 + 1.2, 0.18, 1.4, tint(C.CREAM, 0.88));
      box((X0 + X1) / 2, FL + 8.6, s * (Z1 + 0.12), X1 - X0 + 0.3, 0.2, 0.3, tint(C.CREAM, 0.88));
      panel((X0 + X1) / 2, FL - 0.5, zf, X1 - X0, 1.0, face, tint(C.CREAM, 0.85));
    }
    // and the west face, over the ragged court: plainest of all
    for (let i = 0; i < 7; i++) arch(X0 - 0.02, FL + 0.8, -15 + i * 5, 1.8, 4.0, 'z', tint(C.CREAM, 1.03), 9, tint(C.CREAM_SH, 0.7), 0.14);
    box(X0 - 0.5, FL + 14.3, 0, 1.2, 0.18, Z1 - Z0 + 1.2, tint(C.CREAM, 0.88));
  }

  /* ================================================================
   * THE KIOSK — the shrine roof's one vertical event
   * ================================================================ */
  // "An open pavilion on a solid moulded podium in the centre of the shrine
  // roof. FIVE multi-cusped arches across the front on slender colonnettes,
  // open on the sides, a projecting flat cornice slab with turned-down
  // corners, then the roof": a broad SEMICIRCULAR BARREL roof with a moulded
  // rim and a STRAIGHT horizontal eave — the Rajasthani mehrabi chhatri, not a
  // Bengal-hut roof — flanked by two ribbed melon domes on lotus-petal drums,
  // about seven slender spike finials. 11-12 m wide; 8-11 m from the terrace
  // to the finials; from the road it barely clears the street range.
  {
    const KX = (X0 + X1) / 2, KD = 5.6, KW = 12.0;      // centred on the roof; facing east
    const P0 = T, P1 = T + 1.4, C0 = P1 + 3.4, E = C0 + 0.36;
    // the podium, moulded
    box(KX, P0, 0, KD + 1.6, P1 - P0, KW + 1.6, tint(C.CREAM, 0.92));
    box(KX, P0 + 0.2, 0, KD + 1.9, 0.18, KW + 1.9, tint(C.CREAM, 0.86));
    box(KX, P1 - 0.2, 0, KD + 1.8, 0.2, KW + 1.8, tint(C.CREAM, 0.98));
    // colonnettes: six across the front and the back, the ends open
    const fx = KX + KD / 2, bx = KX - KD / 2;
    for (let i = 0; i <= 5; i++) {
      const lz = -KW / 2 + i * KW / 5;
      for (const cx of [fx, bx]) lathe(cx, lz, [[P1, 0.2], [P1 + 0.2, 0.15], [C0 - 0.4, 0.12], [C0 - 0.2, 0.2], [C0, 0.22]], 8, tint(C.CREAM, 1.03));
      if (i < 5) {
        for (const cx of [fx, bx]) {
          arch(cx, P1, lz + KW / 10, KW / 5 - 0.3, C0 - P1, 'z', tint(C.CREAM2, 1.02), 9, null, 0.25);
          archFill(cx, lz + KW / 10, KW / 5 - 0.3, P1, C0 - P1, C0, 'z', -0.12, 0.12, tint(C.CREAM, 0.98));
        }
      }
    }
    // the side arches, open
    for (const s of [-1, 1]) {
      arch(KX, P1, s * KW / 2, KD - 0.3, C0 - P1, 'x', tint(C.CREAM2, 1.0), 9, null, 0.25);
      archFill(KX, s * KW / 2, KD - 0.3, P1, C0 - P1, C0, 'x', -0.12, 0.12, tint(C.CREAM, 0.98));
    }
    // the ceiling
    under(bx, fx, -KW / 2, KW / 2, C0 - 0.01, tint(C.CREAM, 0.76));
    // the projecting flat cornice slab, its corners turned down
    box(KX, C0, 0, KD + 1.5, E - C0, KW + 1.5, tint(C.CREAM, 0.95));
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(KX + sx * (KD / 2 + 0.6), C0 - 0.35, sz * (KW / 2 + 0.6), 0.32, 0.35, 0.32, tint(C.CREAM, 0.9));
    // the barrel roof over the three middle bays: semicircular in section, its
    // axis along the front, so from the court its eave reads dead straight
    const BZ = KW / 2 - KW / 5, R = KD / 2 + 0.25, N = 12;
    for (let i = 0; i < N; i++) {
      const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
      const x0 = KX + Math.cos(a0) * R, y0 = E + Math.sin(a0) * R * 0.85;
      const x1 = KX + Math.cos(a1) * R, y1 = E + Math.sin(a1) * R * 0.85;
      lq2([x0, y0, -BZ], [x1, y1, -BZ], [x1, y1, BZ], [x0, y0, BZ], tint(C.CREAM, 0.94 + 0.06 * Math.sin(a0 + 0.3)));
      // the gable ends, closing the barrel
      for (const s of [-1, 1]) lq2([KX, E, s * BZ], [x0, y0, s * BZ], [x1, y1, s * BZ], [KX, E, s * BZ], tint(C.CREAM, 0.9));
    }
    // its moulded rim, along both eaves
    for (const s of [-1, 1]) box(KX + s * R, E, 0, 0.25, 0.22, 2 * BZ + 0.2, tint(C.CREAM, 0.85));
    // five spike finials along the ridge
    for (let i = 0; i < 5; i++) {
      const lz = -BZ + 0.6 + i * (2 * BZ - 1.2) / 4;
      lathe(KX, lz, [[E + R * 0.85, 0.16], [E + R * 0.85 + 0.25, 0.12], [E + R * 0.85 + 0.6, 0.05], [E + R * 0.85 + 1.25, 0.012]], 6, C.BRASS);
    }
    // the two ribbed melon domes, on lotus-petal drums, over the end bays
    for (const s of [-1, 1]) {
      const dz = s * (KW / 2 - KW / 10);
      lathe(KX, dz, [[E, 1.45], [E + 0.35, 1.5], [E + 0.55, 1.3]], 16, (i, sg) => tint(C.CREAM, sg % 2 ? 0.92 : 1.02));
      const rings = [];
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI / 2 * k / 8;
        rings.push([E + 0.55 + Math.sin(a) * 1.35, Math.max(0.03, Math.cos(a) * 1.3)]);
      }
      lathe(KX, dz, rings, 16, (i, sg) => tint(C.CREAM, sg % 2 ? 0.88 : 1.0));
      lathe(KX, dz, [[E + 1.9, 0.18], [E + 2.15, 0.1], [E + 2.6, 0.05], [E + 3.3, 0.012]], 6, C.BRASS);
    }
  }

  /* ================================================================
   * THE HALL — dark, roofed, hypostyle
   * ================================================================ */
  // Sixteen columns, as the sources count them, but at least one pier is a
  // PAIR of shafts side by side — here the two nearest the sanctums on the
  // axis. Round, closely fluted monolithic shafts on carved lotus bases on
  // square plinths; heavy moulded capitals with pendant leaves and broad
  // brackets. They carry BROAD, PLAIN, SEMICIRCULAR arches. The side bays are
  // ceiled at 9 m, the central bay vaulted to 11.5.
  const CX = [-2.6, 3.4, 9.4, 15.4], CZ = [-10.8, -3.6, 3.6, 10.8];
  const CH = 7.2;                                // the capital's top, 7.2 m up
  {
    // the floor: a black-and-white chequer inside a plain border
    const BW = 0.9, TS = 1.2;
    flat(HX0, HX1, -HZ, HZ, FL + 0.012, C.BORDER);
    for (let lx = HX0 + BW; lx < HX1 - BW - 1e-6; lx += TS) {
      for (let lz = -HZ + BW; lz < HZ - BW - 1e-6; lz += TS) {
        const i = Math.round((lx - HX0) / TS), j = Math.round((lz + HZ) / TS);
        flat(lx, Math.min(lx + TS, HX1 - BW), lz, Math.min(lz + TS, HZ - BW), FL + 0.024, (i + j) % 2 ? C.CHEQ_D : C.CHEQ_L);
      }
    }
    // the walls inside: pale grey-white plaster
    panel(HX1 - 0.01, FL + 4.5, -(HZ + 1.5) / 2 - 0.75, HZ - 1.5, 9.0, 'W', C.HALL);
    panel(HX1 - 0.01, FL + 4.5, (HZ + 1.5) / 2 + 0.75, HZ - 1.5, 9.0, 'W', C.HALL);
    panel(HX1 - 0.01, FL + 7.25, 0, 3.0, 3.5, 'W', C.HALL);
    panel((HX0 + HX1) / 2, FL + 4.5, -HZ + 0.01, HX1 - HX0, 9.0, 'S', C.HALL);
    panel((HX0 + HX1) / 2, FL + 4.5, HZ - 0.01, HX1 - HX0, 9.0, 'N', C.HALL);
    // cusped niches and doorways along the side walls
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
      const lx = HX0 + 3.4 + i * 5.6;
      arch(lx, FL + 0.4, s * (HZ - 0.06), 1.6, 3.6, 'x', tint(C.HALL, 1.03), 9, tint(C.HALL, 0.55), 0.1);
    }
    // the ceiling over the side bays, the vault over the central one
    for (const s of [-1, 1]) {
      const lz0 = s > 0 ? 3.6 : -HZ, lz1 = s > 0 ? HZ : -3.6;
      under(HX0, HX1, lz0, lz1, FL + 9.0, tint(C.HALL, 0.84));
    }
    {
      const VS = FL + 7.9, R = 3.6, N = 14;
      for (let i = 0; i < N; i++) {
        const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
        lq2([HX0, VS + Math.sin(a0) * R, Math.cos(a0) * R], [HX1, VS + Math.sin(a0) * R, Math.cos(a0) * R],
          [HX1, VS + Math.sin(a1) * R, Math.cos(a1) * R], [HX0, VS + Math.sin(a1) * R, Math.cos(a1) * R], tint(C.HALL, 0.8 + 0.1 * Math.sin(a0)));
      }
      // the vault's ends, closing it against the east and west walls
      for (const lx of [HX0 + 0.01, HX1 - 0.01]) {
        for (let i = 0; i < N; i++) {
          const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
          lq2([lx, VS, 0], [lx, VS + Math.sin(a0) * R, Math.cos(a0) * R], [lx, VS + Math.sin(a1) * R, Math.cos(a1) * R], [lx, VS, 0], C.HALL);
        }
        lq2([lx, FL + 9.0, -R], [lx, VS, -R], [lx, VS, R], [lx, FL + 9.0, R], C.HALL);
      }
    }
    // the columns, and the arches they carry
    const shaft = (lx, lz, r) => {
      box(lx, FL, lz, 1.15, 0.45, 1.15, tint(C.HALL, 0.94));                 // square plinth
      lathe(lx, lz, [[FL + 0.45, r * 1.55], [FL + 0.7, r * 1.35], [FL + 0.95, r * 1.05]], 12, tint(C.HALL, 1.0));  // lotus base
      lathe(lx, lz, [[FL + 0.95, r], [CH - 0.9, r * 0.94]], 16, (i, sg) => tint(C.HALL, sg % 2 ? 0.9 : 1.04));     // fluted
      lathe(lx, lz, [[CH - 0.9, r * 0.94], [CH - 0.55, r * 1.25], [CH - 0.3, r * 1.1]], 12, tint(C.HALL, 0.96)); // capital
      box(lx, CH - 0.3, lz, r * 3.4, 0.3, r * 3.4, tint(C.HALL, 0.92));
      post(lx, lz, r + 0.05);
    };
    for (const lx of CX) for (const lz of CZ) {
      if (lx === CX[0] && Math.abs(lz) === 3.6) {
        for (const d of [-0.42, 0.42]) shaft(lx, lz + d, 0.3);           // the paired pier
      } else shaft(lx, lz, 0.42);
    }
    // the plain semicircular arches: along the hall between the rows, and
    // across it between the columns of each row
    const semi = (ax, az, bx, bz, yS, col) => {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az), r = L / 2;
      const ux = (bx - ax) / L, uz = (bz - az) / L, N = 10, t = 0.5;
      const nx = -uz * t / 2, nz = ux * t / 2;
      for (let i = 0; i < N; i++) {
        const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
        const p0 = [mx - ux * Math.cos(a0) * r, yS + Math.sin(a0) * r, mz - uz * Math.cos(a0) * r];
        const p1 = [mx - ux * Math.cos(a1) * r, yS + Math.sin(a1) * r, mz - uz * Math.cos(a1) * r];
        // the soffit, and both faces of the arch ring up to a level head
        lq2([p0[0] + nx, p0[1], p0[2] + nz], [p1[0] + nx, p1[1], p1[2] + nz], [p1[0] - nx, p1[1], p1[2] - nz], [p0[0] - nx, p0[1], p0[2] - nz], tint(col, 0.86));
        for (const k of [1, -1]) lq2([p0[0] + nx * k, p0[1], p0[2] + nz * k], [p0[0] + nx * k, yS + r + 0.5, p0[2] + nz * k], [p1[0] + nx * k, yS + r + 0.5, p1[2] + nz * k], [p1[0] + nx * k, p1[1], p1[2] + nz * k], col);
      }
    };
    for (const lz of CZ) for (let i = 0; i < CX.length - 1; i++) semi(CX[i], lz, CX[i + 1], lz, CH, C.HALL);
    for (const lx of CX) {
      semi(lx, CZ[0], lx, CZ[1], CH - 1.0, C.HALL);
      semi(lx, CZ[2], lx, CZ[3], CH - 1.0, C.HALL);
    }
    // the electric lamps round the walls
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      const lx = HX0 + 2.2 + i * 4.6;
      box(lx, FL + 4.0, s * (HZ - 0.15), 0.3, 0.32, 0.22, C.LAMP);
      box(lx, FL + 4.32, s * (HZ - 0.15), 0.08, 0.3, 0.08, C.IRON);
    }
    // the railed gallery over the central bay at the east end
    {
      const GY = FL + 5.2, GX0 = HX1 - 2.6;
      box((GX0 + HX1) / 2, GY - 0.3, 0, HX1 - GX0, 0.3, 2 * HZ, tint(C.HALL, 0.9));
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) box(GX0 + 0.4, GY - 1.0, s * (2 + i * 1.9), 0.5, 0.7, 0.16, tint(C.HALL, 0.86));
      box(GX0 + 0.06, GY, 0, 0.1, 0.95, 2 * HZ, tint(C.HALL, 0.95));
      for (let i = 0; i < 60; i++) box(GX0 + 0.06, GY, -HZ + 0.3 + i * (2 * HZ - 0.6) / 59, 0.05, 0.95, 0.05, C.IRON);
      box(GX0 + 0.06, GY + 0.95, 0, 0.16, 0.08, 2 * HZ, C.WOOD);
    }
  }

  /* ================================================================
   * THE SANCTUMS — three in a row behind the hall's west wall
   * ================================================================ */
  // North to south: Shri Anand Bihari, Shri Radha Madhav (the title Deities),
  // Shri Hans Gopal with Giridhari, the four Kumaras and Narada — the first
  // links of the Nimbarka guru-parampara, as Growse records it in 1883.
  const SAN = [
    { lz: -10.8, w: 3.0, silk: C.GREENSILK },      // which sanctum the green silk is in is NOT stated: inferred
    { lz: 0, w: 3.6, silk: C.GOLDSILK },
    { lz: 10.8, w: 3.0, silk: C.REDSILK },
  ];
  const SX0 = -16.0;                                  // the sanctums' back wall
  const ALT = { lx: -12.6, y: FL + 1.0 };
  {
    // the hall's west wall, with the three openings
    let lz = -HZ;
    const cuts = SAN.map((s) => [s.lz - s.w / 2, s.lz + s.w / 2]);
    for (const [a, c] of [...cuts, [HZ, HZ]]) {
      if (a - lz > 0.05) {
        box(HX0 + 0.4, FL, (lz + a) / 2, 0.8, 9.0, a - lz, C.HALL);
        panel(HX0 + 0.81, FL + 4.5, (lz + a) / 2, a - lz, 9.0, 'E', C.HALL);
      }
      lz = c;
    }
    box(HX0 + 0.4, FL + 4.6, 0, 0.8, 4.4, 2 * HZ, C.HALL);
    panel(HX0 + 0.81, FL + 6.8, 0, 2 * HZ, 4.4, 'E', tint(C.HALL, 0.96));
    for (const s of SAN) {
      // each opening framed, cusped (decorative, not structural), a lamp over it
      arch(HX0 + 0.82, FL, s.lz, s.w, 4.4, 'z', tint(C.HALL, 1.06), 9, null, 0.2);
      box(HX0 + 0.9, FL + 4.4, s.lz, 0.2, 0.3, s.w + 0.6, C.BRASS);
      // the sanctum: its floor, its side walls, the silk behind the altar
      const z0 = s.lz - 4.6, z1 = s.lz + 4.6;
      flat(SX0, HX0, z0, z1, FL + 0.01, tint(0xe6e0d0, 0.95));
      for (const zz of [z0, z1]) panel((SX0 + HX0) / 2, FL + 3.0, zz + (zz < s.lz ? 0.01 : -0.01), HX0 - SX0, 6.0, zz < s.lz ? 'S' : 'N', tint(C.HALL, 0.85));
      under(SX0, HX0, z0, z1, FL + 6.0, tint(C.HALL, 0.7));
      panel(SX0 + 0.02, FL + 3.0, s.lz, 7.0, 4.6, 'E', s.silk);
      // the altar platform, gilded edge
      box(ALT.lx, FL, s.lz, 5.6, 1.0, 7.6, tint(0xe8e2d2, 0.95));
      box(ALT.lx + 2.8, FL + 0.9, s.lz, 0.08, 0.1, 7.6, C.BRASS);
      // the scalloped black-and-silver valance across the opening
      for (let i = 0; i < 8; i++) {
        const zz = s.lz - s.w / 2 + (i + 0.5) * s.w / 8;
        lq2([HX0 + 1.0, FL + 4.2, zz - s.w / 16], [HX0 + 1.0, FL + 3.8, zz], [HX0 + 1.0, FL + 3.8, zz], [HX0 + 1.0, FL + 4.2, zz + s.w / 16], i % 2 ? C.SILVER : C.BLACK);
      }
      box(HX0 + 1.0, FL + 4.2, s.lz, 0.04, 0.22, s.w, C.BLACK);
    }
    /*
     * WHERE A BODY CAN BE. Behind the sanctums, solid. Each sanctum's floor
     * runs from the hall through its doorway to the altar platform's front —
     * a pilgrim may stand at the threshold, as at every other temple here
     * (halls.mjs walks out from there), and no further: the platform is solid,
     * and the gaps either side of it, 0.8 m, are narrower than a body. The
     * walls between the sanctums, and the hall's west wall either side of
     * each doorway, are solid to their faces.
     */
    solid((X0 + WT + SX0) / 2, 0, SX0 - X0 - WT, 2 * HZ);
    for (const s of SAN) {
      solid(ALT.lx, s.lz, 5.6, 7.6);
      solid((SX0 + HX0 + 0.8) / 2, s.lz, HX0 + 0.8 - SX0, 9.2, { top: FL, tag: 'jm-sanctum-' + Math.round(s.lz), floor: true });
    }
    {
      const spans = [[-HZ, SAN[0].lz - 4.6], [SAN[0].lz + 4.6, SAN[1].lz - 4.6], [SAN[1].lz + 4.6, SAN[2].lz - 4.6], [SAN[2].lz + 4.6, HZ]];
      for (const [a, c] of spans) solid((SX0 + HX0) / 2, (a + c) / 2, HX0 - SX0, c - a);
      let lz = -HZ;
      for (const [a, c] of [...SAN.map((s) => [s.lz - s.w / 2, s.lz + s.w / 2]), [HZ, HZ]]) {
        if (a - lz > 0.05) solid(HX0 + 0.4, (lz + a) / 2, 0.8, a - lz);
        lz = c;
      }
    }
  }

  /* ---------------- the Deities ---------------- */
  // Stylised, as everywhere in this world, and only what the survey saw or
  // the sources name. The CENTRAL pair are images: Krishna BLACK and highly
  // polished, standing in tribhanga with a flute and a silver crown; Radha
  // beside him with a gold/brass face; both in heavy gold brocade. Around and
  // behind them, roughly ten to twelve PAINTED PLASTER figures — gopis with
  // pots and baskets, a woman with a churning staff, cowherds, a child, a calf.
  {
    const fig = (lx, lz, h, body, face, crown, lean = 0) => {
      const y = ALT.y;
      box(lx, y, lz, 0.5 * h / 1.4, h * 0.6, 0.36 * h / 1.4, body, lean);
      box(lx, y + h * 0.6, lz, 0.26 * h / 1.4, h * 0.2, 0.24 * h / 1.4, face, lean);
      if (crown) box(lx, y + h * 0.8, lz, 0.3 * h / 1.4, h * 0.2, 0.28 * h / 1.4, crown, lean);
      box(lx, y - 0.05, lz, 0.62 * h / 1.4, 0.1, 0.5 * h / 1.4, C.BRASS);
    };
    // Radha Madhav
    {
      const lz = 0;
      fig(ALT.lx - 0.6, lz - 0.45, 1.5, C.BRASS, C.BLACK, C.SILVER, 0.12);       // Krishna, tribhanga
      box(ALT.lx - 0.35, ALT.y + 1.0, lz - 0.55, 0.06, 0.06, 0.55, 0x8a6a3a, 0.4);  // the flute
      fig(ALT.lx - 0.6, lz + 0.45, 1.4, C.BRASS, C.BRASS, C.BRASS);              // Radha, the gold face
      const PAINT = [0xc8452a, 0x2f6b9a, 0xe8a83a, 0x7a3a86, 0x3f8f6a, 0xd86a8a];
      for (let i = 0; i < 11; i++) {
        const t = i / 10, lzz = -2.9 + t * 5.8;
        if (Math.abs(lzz) < 1.1) continue;
        const back = 0.9 + (i % 2) * 0.6;
        fig(ALT.lx - 0.6 - back, lzz, 0.95 + 0.25 * hash(i + 5), PAINT[i % PAINT.length], 0xd9a07a, null);
        if (i % 3 === 0) box(ALT.lx - 0.6 - back + 0.1, ALT.y + 1.05, lzz, 0.22, 0.2, 0.22, 0xa0603a);    // a pot carried
      }
      box(ALT.lx - 1.1, ALT.y, 2.2, 0.35, 0.4, 0.75, 0xe4dccc);                  // the calf
    }
    // the green-silk group: a black Krishna with a peacock-feather crown, a
    // silver-faced consort, two further standing female images
    {
      const lz = SAN[0].lz;
      fig(ALT.lx - 0.6, lz - 0.4, 1.3, 0xc9a03c, C.BLACK, 0x1f6a6a, 0.1);
      box(ALT.lx - 0.6, ALT.y + 1.3, lz - 0.4, 0.06, 0.4, 0.2, 0x1f7a8a);         // the peacock feather
      fig(ALT.lx - 0.6, lz + 0.4, 1.25, 0xc9a03c, C.SILVER, C.BRASS);
      for (const s of [-1, 1]) fig(ALT.lx - 0.6, lz + s * 1.5, 1.0, 0xd86a8a, C.SILVER, null);
    }
    // Hans Gopal, Giridhari, the four Kumaras, Narada
    {
      const lz = SAN[2].lz;
      fig(ALT.lx - 0.6, lz, 1.35, 0xc9a03c, C.BLACK, C.BRASS);
      box(ALT.lx - 0.2, ALT.y, lz + 0.55, 0.3, 0.35, 0.5, 0xf2f0ea);              // the hamsa, the swan
      fig(ALT.lx - 1.2, lz - 1.1, 1.2, 0xc9a03c, C.BLACK, C.BRASS);              // Giridhari
      box(ALT.lx - 1.2, ALT.y + 1.25, lz - 1.1, 0.5, 0.25, 0.45, 0x8a8478);       // the hill, held up
      for (let k = 0; k < 4; k++) fig(ALT.lx - 1.6, lz - 1.6 + k * 1.05, 0.8, 0xe08a2a, 0xe8c8a0, null);   // the Kumaras
      fig(ALT.lx - 1.0, lz + 1.4, 1.1, 0xf2ede0, 0xe8c8a0, null);                // Narada
      box(ALT.lx - 0.85, ALT.y + 0.5, lz + 1.4, 0.12, 0.9, 0.12, 0x6a4a2a);       // his vina
    }
  }

  return {
    altar: { lx: ALT.lx - 0.6, lz: 0, y: ALT.y + 0.9 },
    darshan: { lx: -3.6, lz: 0 },
    hall: { lx0: HX0, lx1: HX1, lz0: -HZ, lz1: HZ, door: [X1 + 1.6, 0] },
    FL,
  };
}
