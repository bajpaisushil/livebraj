/**
 * SHAHJI MANDIR (Lalit Nikunj; the Deity is Chhote Radha Raman), 1860-68.
 *
 * Built from docs/research/shahji.md: the survey AND its independent checker,
 * where the checker overrules the survey. The survey's one-line verdict: "Not
 * a temple in any Indian temple sense at all: it is a single-storey Lucknow/
 * Awadhi palace pavilion — a 45 m wide, flat-roofed white-and-honey marble
 * garden-front with a colonnaded verandah, a broken Baroque pediment, and a
 * parapet lined with life-size human statues."
 *
 * THE FRAME: the box frame, turned so +lz is the facade's front — "The front
 * faces SE (bearing ~144°, MEASURED from ESRI imagery)" — and +lx runs along
 * it toward the NE (the long axis, 054°). Origin: the stored position, which
 * the survey puts "within 6 m of the white-marble mass's centroid".
 *
 * HEIGHTS: every vertical figure here is the survey's, scaled from Growse's
 * "life-size female figures" taken as 1.6 m, and the checker's word on them
 * is "Do not carry any metre figure into the model as fact". They are used
 * because a building needs some height; they are working numbers, not
 * measurements.
 */

import { TAU } from '../../engine/math/MathUtils.js';

/** Colours. MEASURED unless marked; see the survey's "Material and colour". */
const C = {
  HONEY: 0xd8c6a2,        // the warm veined marble, between the measured #AFA289 (skylight) and the derived sun #E6D6B4
  HONEY_SH: 0xafa289,     // MEASURED, skylight
  WHITE: 0xf0ede6,        // near-white marble, sun (DERIVED): the twisted shafts, the paving, the oval infills
  LIME: 0xf4f2ec,         // the parapets' and statues' white — "PROBABLY LIMEWASH" over the honey stone (the checker)
  BLUE: 0xb0b2b5,         // the pavilion roofs' grey-blue veined marble, the checker's re-measure
  BLACK: 0x161717,        // the inlay, as LINES
  DOOR: 0x615a4a,         // "timber louvred doors #615A4A"
  GREEN_DOOR: 0x3f5f45,   // "one green-painted door" (hex INFERRED)
  SAND: 0xc9a58e,         // the gateway's pink/buff sandstone, "H 20–28°, S 20–35%" (hex INFERRED within that)
  SAND_SH: 0x715a4a,      // "shaded spandrel #715A4A"
  BRICK: 0xb08a6e,        // the forecourt, "reddish brick-paved #B08A6E-ish (ESTIMATED)"
  IRON: 0x2a2826,
  GILT: 0xc9a03c,
};

/**
 * @param o.b, o.signB, o.loc, o.ground, o.terrain, o.colliders, o.rng
 * @param o.h  helpers: cuspedArch, ribbedDome, tint, buildStanding, PEOPLE, signUV, SIGN
 */
export function buildShahji(o) {
  const { b, signB, loc, ground, terrain, colliders, rng } = o;
  const { cuspedArch, ribbedDome, tint, buildStanding, PEOPLE, signUV, SIGN } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, ang = 0, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const faceR = (localAng) => { const wa = rot + localAng; return Math.atan2(Math.cos(wa), Math.sin(wa)); };
  const S_FRONT = Math.PI / 2;                         // local angle of +lz
  const tH = (lx, lz) => { const q = p(lx, lz); return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : ground; };
  const topOf = (lx0, lx1, lz0, lz1, n = 3) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const h = tH(lx0 + (lx1 - lx0) * i / n, lz0 + (lz1 - lz0) * j / n);
      if (h > hi) hi = h;
    }
    return hi;
  };
  /** An upright cylinder segment, outward-facing, `sides` round. */
  const cyl = (cx, y0, cz, r0, r1, h, color, sides = 8) => {
    const ring = (r, y) => Array.from({ length: sides }, (_, s) => {
      const a = (s / sides) * TAU;
      return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    });
    const lo = ring(r0, y0), hi = ring(r1, y0 + h);
    for (let s = 0; s < sides; s++) {
      const n = (s + 1) % sides;
      b.quad(lo[s], hi[s], hi[n], lo[n], color);
    }
  };
  /** A flat oval on a wall, facing local angle `face`, as a fan. */
  const oval = (lx, y, lz, w, h, color, face, lift = 0.03, seg = 20) => {
    const q = p(lx, lz);
    const wa = rot + face;
    const fx = Math.cos(wa), fz = Math.sin(wa);          // outward
    const ux = -fz, uz = fx;                              // across the face
    const cx = q[0] + fx * lift, cz = q[1] + fz * lift;
    let last = null;
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * TAU;
      const pt = [cx + ux * Math.cos(a) * w / 2, y + Math.sin(a) * h / 2, cz + uz * Math.cos(a) * w / 2];
      if (last) b.tri(cx, y, cz, pt[0], pt[1], pt[2], last[0], last[1], last[2], color);
      last = pt;
    }
  };
  /**
   * A radiating half-disc in a wall, facing local angle `face`: a fanlight's
   * rays or a shell niche's flutes, as alternating wedges.
   */
  const fan = (lx, y, lz, r, colA, colB, face, lift = 0.04, seg = 14) => {
    const q = p(lx, lz);
    const wa = rot + face;
    const fx = Math.cos(wa), fz = Math.sin(wa), ux = -fz, uz = fx;
    const cx = q[0] + fx * lift, cz = q[1] + fz * lift;
    for (let k = 0; k < seg; k++) {
      const a0 = Math.PI * k / seg, a1 = Math.PI * (k + 1) / seg;
      const P0 = [cx + ux * Math.cos(a0) * r, y + Math.sin(a0) * r, cz + uz * Math.cos(a0) * r];
      const P1 = [cx + ux * Math.cos(a1) * r, y + Math.sin(a1) * r, cz + uz * Math.cos(a1) * r];
      b.tri(cx, y, cz, P1[0], P1[1], P1[2], P0[0], P0[1], P0[2], k % 2 ? colA : colB);
    }
  };
  /**
   * A ROUND arch in a wall running along lx: jambs and a semicircular soffit,
   * `depth` through, and (unless `shade` is null) its opening filled on both
   * faces. "ARCH AND OPENING GRAMMAR — all ROUND-HEADED, never cusped": the
   * cusped helper has no round arch in it.
   */
  const roundArch = (lx, lz, y0, w, h, depth, color, shade) => {
    const half = w / 2, spring = y0 + h - half, SEG = 18;
    const at = (ox, yy, oz) => { const q = p(lx + ox, lz + oz); return [q[0], yy, q[1]]; };
    let li = null, lo = null;
    for (let i = 0; i <= SEG; i++) {
      const a = Math.PI * i / SEG;
      const ox = -Math.cos(a) * half, yy = spring + Math.sin(a) * half;
      const I = at(ox, yy, -depth / 2), O = at(ox, yy, depth / 2);
      if (li) b.quad(li, I, O, lo, color);
      li = I; lo = O;
    }
    for (const sd of [-1, 1]) b.quad(at(sd * half, y0, -depth / 2), at(sd * half, spring, -depth / 2), at(sd * half, spring, depth / 2), at(sd * half, y0, depth / 2), color);
    if (shade !== null && shade !== undefined) {
      for (const [oz, flip] of [[depth / 2 + 0.01, false], [-depth / 2 - 0.01, true]]) {
        let last = null;
        for (let i = 0; i <= SEG; i++) {
          const a = Math.PI * i / SEG;
          const ox = -Math.cos(a) * half, yy = spring + Math.sin(a) * half;
          const top = at(ox, yy, oz), foot = at(ox, y0, oz);
          if (last) { if (flip) b.quad(foot, top, last.top, last.foot, shade); else b.quad(last.foot, last.top, top, foot, shade); }
          last = { top, foot };
        }
      }
    }
  };

  /* ---------------------------------------------------------------
   * THE NUMBERS
   * --------------------------------------------------------------- */
  // plan, MEASURED (±1.5 m): the white mass 49.4 x 30.5; the frontage 6 | 10.2 | 12.9 | 10.2 | 6
  const HALF = 22.65;                    // half the 45.3 m frontage
  const END0 = 16.65;                    // where the solid end bays begin
  const CEN = 6.45;                      // half the centre pavilion
  const MASS = 24.7;                     // half the white mass's width
  const BACK = -15.25, STEP_FOOT = 15.25;
  const COL_W = 9.2, COL_C = 10.6;       // the wings' column line, and the centre's, 1.4 m proud
  const WALL = 4.3;                      // the verandah's back wall
  const HALL_FRONT = 3.0, HALL_BACK = -7.5;
  // heights above the court (the survey's, ±15% or worse — see the header)
  const G = ground;
  const FL = G + 3.2;                    // "Verandah floor / top of the entrance steps: +3.0 to +3.5 m"
  const COL = 5.5;                       // "shaft 4.6 m ... total with base and capital ~5.5 m"
  const CORNICE = G + 9.5;               // "Top of the verandah entablature/cornice: ~+9.5 m"
  const LOWER = G + 11.5;                // "Lower parapet ... top ~+11.5 m"
  const UPPER = G + 14.5;                // "Upper parapet top / feet of the rooftop statues: ~+14.5 m"
  const APEX = G + 20;                   // "Pediment apex: ~+20 m"

  /* ---------------------------------------------------------------
   * THE PLINTH AND THE FULL-WIDTH FLIGHT
   * --------------------------------------------------------------- */
  // "a broad flight of steps running essentially the full width of the
  // facade, rising ~3–3.5 m from the courtyard to the verandah floor
  // (ESTIMATED ... roughly 12–18 risers)"
  const TOP_STEP = 10.95, N_STEP = 14, RISE = (FL - G) / N_STEP, TREAD = (STEP_FOOT - TOP_STEP) / N_STEP;
  {
    // the raised mass everything stands on: solid from the court, a floor on top
    box(0, G - 0.4, (BACK + TOP_STEP) / 2, MASS * 2, FL - G + 0.4, TOP_STEP - BACK, C.HONEY_SH);
    box(0, FL - 0.18, (BACK + TOP_STEP) / 2, MASS * 2 + 0.3, 0.18, TOP_STEP - BACK + 0.3, C.HONEY);   // its edge moulding
    box(0, G + 0.35, (BACK + TOP_STEP) / 2, MASS * 2 + 0.2, 0.3, TOP_STEP - BACK + 0.2, tint(C.HONEY_SH, 0.92));
    solid(0, (BACK + TOP_STEP) / 2, MASS * 2 + 0.3, TOP_STEP - BACK + 0.3, 0, { top: FL, tag: 'temple-floor', floor: true });
    for (let i = 0; i < N_STEP; i++) {
      const lz = TOP_STEP + (N_STEP - i) * TREAD - TREAD / 2;
      box(0, G - 0.05 + i * RISE, lz, HALF * 2, RISE + 0.05, TREAD, i % 2 ? C.WHITE : tint(C.WHITE, 0.97));
      solid(0, lz, HALF * 2, TREAD, 0, { top: G + (i + 1) * RISE, tag: 'temple-step', standOnly: true });
    }
    // the flight's two ends, which rise with it
    for (const sd of [-1, 1]) {
      box(sd * (HALF + 0.35), G - 0.05, (TOP_STEP + STEP_FOOT) / 2, 0.7, FL - G + 0.9, STEP_FOOT - TOP_STEP, C.HONEY_SH);
      solid(sd * (HALF + 0.35), (TOP_STEP + STEP_FOOT) / 2, 0.7, STEP_FOOT - TOP_STEP, 0, { top: FL + 0.9, tag: 'temple-rail' });
    }
  }

  /* ---------------------------------------------------------------
   * THE VERANDAH FLOOR
   * --------------------------------------------------------------- */
  // "white marble slabs framed by DOUBLE BLACK-MARBLE INLAY BANDS, a diagonal
  // BLACK-AND-WHITE CHEQUERBOARD border, and — set flush into the pavement —
  // LIFE-SIZE PIETRA DURA PORTRAIT PANELS"
  {
    const z0 = WALL, z1 = TOP_STEP;
    box(0, FL - 0.06, (z0 + z1) / 2, HALF * 2 - 0.4, 0.07, z1 - z0, C.WHITE);
    for (const lz of [z0 + 0.5, z0 + 0.62, z1 - 0.8, z1 - 0.92]) box(0, FL + 0.005, lz, HALF * 2 - 1.2, 0.012, 0.05, C.BLACK);
    // the chequer border, set on the diagonal, along the front
    for (let lx = -HALF + 1.0; lx < HALF - 1.0; lx += 0.5) {
      box(lx, FL + 0.006, z1 - 0.45, 0.24, 0.012, 0.24, C.BLACK, Math.PI / 4);
    }
    // two of the portrait panels, flush, one either side of the centre (their
    // subjects are not described; a courtly figure in white, grey, black, pink)
    for (const sd of [-1, 1]) {
      const lx = sd * 3.8, lz = (z0 + z1) / 2 + 0.6;
      box(lx, FL + 0.004, lz, 0.9, 0.012, 2.0, 0xdcd8d0);
      box(lx, FL + 0.008, lz + 0.25, 0.4, 0.012, 1.1, [0xc8a0a0, 0x8a8a8e][sd > 0 ? 0 : 1]);
      box(lx, FL + 0.008, lz - 0.55, 0.26, 0.012, 0.3, 0xd8b8a0);
      box(lx, FL + 0.01, lz, 0.95, 0.012, 0.04, C.BLACK);
    }
  }

  /* ---------------------------------------------------------------
   * THE COLUMNS: twelve serpentine on the wings, eight plain in the centre
   * --------------------------------------------------------------- */
  /*
   * The checker overrules the survey here. Not a two-strand rope: "a MONOLITHIC
   * shaft of constant circular section swept along a HELICAL AXIS — a
   * serpentine/Solomonic column — several of which also carry a shallow
   * single-start spiral groove". The survey's centreline swing (0.32–0.43 of
   * the shaft's width) and ~5–7 waves per shaft stand. Near-white marble,
   * Corinthian caps, big scrolled-acanthus bases on square plinths.
   */
  const serpentine = (lx, lz) => {
    const q = p(lx, lz);
    const R = 0.21, SWING = 0.085, WAVES = 6, SEG = 46, SH = 4.6;
    // square plinth block and the scrolled acanthus base
    b.box(q[0], FL, q[1], 0.78, 0.26, 0.78, C.HONEY, rot);
    b.prism(q[0], FL + 0.26, q[1], 0.7, 0.7, 0.5, 0.5, 0.3, C.WHITE, rot);
    const y0 = FL + 0.56;
    // ONE tube swept along the helix: rings at each height joined straight to
    // the next, so the shaft is continuous rather than a stack of offset discs
    const SIDES = 10;
    const ringAt = (k) => {
      const t = k / SEG, a = t * WAVES * TAU;
      const cx = q[0] + Math.cos(a) * SWING, cz = q[1] + Math.sin(a) * SWING, yy = y0 + t * SH;
      return { a, cx, cz, yy, pts: Array.from({ length: SIDES }, (_, s2) => {
        const ang = (s2 / SIDES) * TAU;
        return [cx + Math.cos(ang) * R, yy, cz + Math.sin(ang) * R];
      }) };
    };
    let prev = ringAt(0);
    for (let k = 1; k <= SEG; k++) {
      const cur = ringAt(k);
      const col = k % 2 ? C.WHITE : tint(C.WHITE, 0.985);
      for (let s2 = 0; s2 < SIDES; s2++) {
        const n = (s2 + 1) % SIDES;
        b.quad(prev.pts[s2], cur.pts[s2], cur.pts[n], prev.pts[n], col);
      }
      // the shallow spiral seam, a darker line wound round it
      const ga = prev.a + Math.PI;
      b.box(prev.cx + Math.cos(ga) * (R - 0.01), prev.yy, prev.cz + Math.sin(ga) * (R - 0.01), 0.035, SH / SEG + 0.01, 0.035, tint(C.WHITE, 0.88));
      prev = cur;
    }
    // "full Corinthian/Composite, acanthus and volutes, ~1.5 × shaft dia wide"
    const yc = y0 + SH;
    b.prism(q[0], yc, q[1], 0.44, 0.44, 0.66, 0.66, 0.34, C.WHITE, rot);
    for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      b.box(q[0] + (ox * cs - oz * sn) * 0.3, yc + 0.2, q[1] + (ox * sn + oz * cs) * 0.3, 0.13, 0.14, 0.13, tint(C.WHITE, 0.95), rot);
    }
    b.box(q[0], yc + 0.34, q[1], 0.74, 0.1, 0.74, C.WHITE, rot);
    post(lx, lz, 0.34);
  };
  const plainColumn = (lx, lz) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], 0.8, 0.28, 0.8, C.HONEY_SH, rot);
    b.prism(q[0], FL + 0.28, q[1], 0.62, 0.62, 0.5, 0.5, 0.22, C.HONEY, rot);
    // "Smooth round shafts with slight entasis ... strong vertical veining in a
    // honey/gold marble"
    const y0 = FL + 0.5, SH = 4.7, N = 5;
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N;
      const r = (t) => 0.235 - 0.03 * t + 0.012 * Math.sin(t * Math.PI);
      cyl(q[0], y0 + SH * t0, q[1], r(t0), r(t1), SH / N + 0.004, k % 2 ? C.HONEY : tint(C.HONEY, 0.97), 10);
    }
    b.prism(q[0], y0 + SH, q[1], 0.46, 0.46, 0.62, 0.62, 0.22, C.HONEY, rot);
    b.box(q[0], y0 + SH + 0.22, q[1], 0.7, 0.1, 0.7, C.HONEY_SH, rot);
    post(lx, lz, 0.34);
  };
  // each wing: "coupled pair at ~1.05 m centres — bay ~2.75 m — bay — bay —
  // coupled pair". Fitted inside its 10.2 m, the wide bays come to 2.6 m.
  const WING = [0, 1.05, 3.65, 6.25, 8.85, 9.9];
  const wingCols = [];
  for (const sd of [-1, 1]) for (const t of WING) wingCols.push(sd * (CEN + 0.15 + t));
  for (const lx of wingCols) serpentine(lx, COL_W);
  // the centre: "EIGHT PLAIN CYLINDRICAL COLUMNS in FOUR COUPLED PAIRS making THREE BAYS"
  const cenCols = [];
  for (const pc of [-5.7, -1.9, 1.9, 5.7]) for (const d2 of [-0.5, 0.5]) cenCols.push(pc + d2);
  for (const lx of cenCols) plainColumn(lx, COL_C);

  /* ---------------------------------------------------------------
   * THE BACK WALL: doors, niches, dados, the hall behind
   * --------------------------------------------------------------- */
  const ROOF_Y = CORNICE - 0.45;         // underside of the verandah roof slab
  // the solid END BAYS: "Blank honey-marble ashlar ... TWO LARGE OVAL
  // MEDALLIONS (~2.0 m tall) outlined in a BLACK MARBLE RING, one filled plain
  // white, one filled honey"
  for (const sd of [-1, 1]) {
    const cx = sd * (END0 + HALF) / 2, w = HALF - END0;
    box(cx, FL, (HALL_BACK + COL_W + 0.6) / 2, w, LOWER - FL - 0.4, COL_W + 0.6 - HALL_BACK, C.HONEY);
    solid(cx, (HALL_BACK + COL_W + 0.6) / 2, w, COL_W + 0.6 - HALL_BACK, 0, { top: LOWER - 0.4 });
    for (const [k, fill] of [[-1, C.WHITE], [1, C.HONEY_SH]]) {
      const lx = cx + k * 1.35, lz = COL_W + 0.6;
      oval(lx, FL + 2.9, lz, 1.55, 2.15, C.BLACK, S_FRONT, 0.02);
      oval(lx, FL + 2.9, lz, 1.4, 2.0, fill, S_FRONT, 0.04);
    }
    // a plinth band and a cornice, which is all the ornament the bay has
    box(cx, FL, COL_W + 0.65, w + 0.1, 0.5, 0.12, C.HONEY_SH);
    box(cx, CORNICE - 0.5, COL_W + 0.7, w + 0.2, 0.5, 0.25, C.HONEY_SH);
  }
  // the verandah's back wall, with its rhythm of openings
  {
    const H = ROOF_Y - FL;
    // "Behind the centre pavilion: three tall ROUND-ARCHED doorways with
    // semicircular RADIATING FANLIGHTS over timber doors." The middle one open.
    const DOORS = [-3.8, 0, 3.8];
    // along the wings, alternating pedimented louvred doors and shell niches (the
    // order of the alternation is INFERRED), "roughly 1 opening per 2.75 m bay"
    const WING_OPEN = [];
    for (const sd of [-1, 1]) {
      const bays = [8.95, 11.55, 14.15];                         // the wide bays' centres
      bays.forEach((t, k) => WING_OPEN.push({ lx: sd * t, kind: k === 1 ? 'niche' : 'door' }));
    }
    // the wall itself, in runs between the openings; only the middle door is a gap
    const cuts = [[-1.15, 1.15]];
    let from = -END0;
    for (const [a, c] of cuts) {
      box((from + a) / 2, FL, WALL - 0.3, a - from, H + 0.02, 0.6, C.HONEY);
      // as tall as the wall is: the kiosks on the roofline above are not in it
      solid((from + a) / 2, WALL - 0.3, a - from, 0.6, 0, { top: ROOF_Y });
      from = c;
    }
    box((from + END0) / 2, FL, WALL - 0.3, END0 - from, H + 0.02, 0.6, C.HONEY);
    solid((from + END0) / 2, WALL - 0.3, END0 - from, 0.6, 0, { top: ROOF_Y });
    box(0, FL + 4.3, WALL - 0.3, 2.3, H - 4.3 + 0.02, 0.6, C.HONEY);          // over the open door
    // the dado, panelled and outlined in black
    for (let lx = -END0 + 0.8; lx < END0 - 0.8; lx += 1.6) {
      if (DOORS.some((d2) => Math.abs(lx - d2) < 1.4)) continue;
      box(lx, FL + 0.15, WALL + 0.015, 1.3, 0.04, 0.02, C.BLACK);
      box(lx, FL + 0.95, WALL + 0.015, 1.3, 0.04, 0.02, C.BLACK);
    }
    const wf = WALL + 0.02;
    for (const lx of DOORS) {
      // the round head, and its "semicircular RADIATING FANLIGHT" over the door
      roundArch(lx, wf, FL, 2.2, 4.3, 0.14, C.HONEY_SH, lx === 0 ? null : 0x2a2420);
      fan(lx, FL + 3.2, wf + 0.05, 1.0, 0xf2eee4, 0x3a342a, S_FRONT, 0.04);
      box(lx, FL + 3.18, wf + 0.05, 2.2, 0.08, 0.06, C.HONEY_SH);                 // the transom
      if (lx !== 0) box(lx, FL, wf + 0.02, 2.0, 3.18, 0.06, C.DOOR);
    }
    for (const o2 of WING_OPEN) {
      const q = p(o2.lx, wf);
      if (o2.kind === 'door') {
        void q;
        // "tall openings under small TRIANGULAR PEDIMENTS whose tympana carry
        // black-inlaid scrollwork around a central oval, closed with dark timber
        // LOUVRED/slatted double doors"
        box(o2.lx, FL, wf + 0.02, 1.6, 3.4, 0.06, o2.lx > 12 ? C.GREEN_DOOR : C.DOOR);
        for (let k = 0; k < 10; k++) box(o2.lx, FL + 0.3 + k * 0.3, wf + 0.06, 1.5, 0.03, 0.03, 0x4a4436);
        const pq = p(o2.lx, wf + 0.05);
        for (const sd of [-1, 1]) {
          b.box(pq[0] + cs * sd * 0.48, FL + 3.75, pq[1] + sn * sd * 0.48, 1.05, 0.12, 0.1, C.HONEY_SH, rot - sd * 0.42);
        }
        oval(o2.lx, FL + 3.7, wf + 0.04, 0.34, 0.22, C.BLACK, S_FRONT, 0.02);
      } else {
        // "round-arched niches with carved fan/shell heads"
        roundArch(o2.lx, wf, FL + 0.5, 1.3, 3.2, 0.2, C.HONEY_SH, 0xcbb892);
        fan(o2.lx, FL + 3.05, wf + 0.12, 0.62, tint(C.WHITE, 0.95), C.HONEY, S_FRONT, 0.02, 11);
        void q;
      }
    }
  }
  // the verandah's roof, its soffit flat with iron chandelier rings
  {
    const zB = HALL_FRONT, zW = COL_W + 0.45, zC = COL_C + 0.45;
    box(-(END0 + CEN) / 2, ROOF_Y, (zB + zW) / 2, END0 - CEN, 0.45, zW - zB, C.HONEY_SH);
    box((END0 + CEN) / 2, ROOF_Y, (zB + zW) / 2, END0 - CEN, 0.45, zW - zB, C.HONEY_SH);
    box(0, ROOF_Y - 0.25, (zB + zC) / 2, CEN * 2, 0.7, zC - zB, C.HONEY_SH);
    for (const lx of [-11.5, -3.8, 3.8, 11.5]) {
      const q = p(lx, (WALL + COL_W) / 2);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        b.box(q[0] + Math.cos(a) * 0.35, ROOF_Y - 1.2, q[1] + Math.sin(a) * 0.35, 0.12, 0.05, 0.05, C.IRON, a);
      }
      b.box(q[0], ROOF_Y - 1.2, q[1], 0.03, 1.2, 0.03, C.IRON);
    }
  }
  // the entablature: over the wings, and "a deeper plain architrave and a
  // projecting flat cornice" on the centre, with the big consoles at its ends
  {
    for (const sd of [-1, 1]) {
      const cx = sd * (END0 + CEN) / 2, w = END0 - CEN;
      box(cx, FL + COL, COL_W, w + 0.6, 0.45, 0.9, C.HONEY);                   // architrave
      box(cx, FL + COL + 0.45, COL_W + 0.05, w + 0.6, 0.35, 0.95, C.HONEY_SH);  // frieze
      box(cx, FL + COL + 0.8, COL_W + 0.15, w + 0.9, 0.2, 1.25, C.HONEY);      // cornice
    }
    box(0, FL + COL, COL_C, CEN * 2 + 0.6, 0.7, 0.95, C.HONEY);
    box(0, FL + COL + 0.7, COL_C + 0.1, CEN * 2 + 0.9, 0.3, 1.3, C.HONEY);
    for (const sd of [-1, 1]) {
      // "a large carved CONSOLE bracket with an acanthus scroll and a grotesque head"
      const lx = sd * (CEN + 0.1);
      box(lx, FL + COL - 1.4, COL_C + 0.3, 0.5, 1.4, 0.7, C.HONEY);
      box(lx, FL + COL - 1.75, COL_C + 0.55, 0.42, 0.42, 0.42, C.HONEY_SH);
      box(lx, FL + COL - 1.2, COL_C + 0.72, 0.3, 0.3, 0.12, 0x8a7a60);
    }
    // the jali balustrade along the wings' front, at floor level
    for (let i = 0; i < wingCols.length - 1; i++) {
      const a2 = wingCols[i], c2 = wingCols[i + 1];
      if (Math.sign(a2) !== Math.sign(c2)) continue;
      const m = (a2 + c2) / 2, L = Math.abs(c2 - a2) - 0.5;
      if (L < 0.3) continue;
      box(m, FL, COL_W + 0.1, L, 0.12, 0.26, C.WHITE);
      box(m, FL + 0.12, COL_W + 0.1, L, 0.66, 0.1, tint(C.WHITE, 0.93));
      for (let k = 0; k < Math.round(L / 0.3); k++) box(m - L / 2 + 0.15 + k * 0.3, FL + 0.3, COL_W + 0.16, 0.12, 0.3, 0.02, 0x5a5650);
      box(m, FL + 0.78, COL_W + 0.1, L + 0.1, 0.12, 0.3, C.WHITE);
      solid(m, COL_W + 0.1, L, 0.3, 0, { top: FL + 0.9, tag: 'temple-rail' });
    }
    // the tall wrought-iron screens at each end of the verandah
    for (const sd of [-1, 1]) {
      const lx = sd * (CEN + 0.15 + (WING[4] + WING[5]) / 2);
      for (let k = 0; k < 6; k++) box(lx - 0.4 + k * 0.16, FL, COL_W, 0.04, 4.3, 0.04, C.IRON);
      box(lx, FL + 4.1, COL_W, 0.95, 0.08, 0.06, C.IRON);
      box(lx, FL + 0.2, COL_W, 0.95, 0.08, 0.06, C.IRON);
      solid(lx, COL_W, 0.9, 0.3);
    }
  }

  /* ---------------------------------------------------------------
   * THE HALL, where the Deity is
   * --------------------------------------------------------------- */
  {
    const H = UPPER - 2.0 - FL;            // its walls rise to the foot of the upper parapet
    // outer walls: the back, the two ends (inside the end bays' line)
    box(0, FL, HALL_BACK + 0.35, END0 * 2, H, 0.7, C.HONEY);
    solid(0, HALL_BACK + 0.35, END0 * 2, 0.7, 0, { top: FL + H });
    // the hall's front, above the verandah roof, set back to the upper parapet line
    box(0, CORNICE, HALL_FRONT + 0.3, END0 * 2, UPPER - 2.0 - CORNICE, 0.6, C.HONEY);
    box(0, FL + H, (HALL_BACK + HALL_FRONT) / 2, END0 * 2 + 0.4, 0.5, HALL_FRONT - HALL_BACK + 0.4, C.HONEY_SH);   // its flat roof
    // its end walls, which show above the end bays
    for (const sd of [-1, 1]) {
      box(sd * (END0 + 0.3), FL, (HALL_BACK + WALL) / 2, 0.6, H, WALL - HALL_BACK, C.HONEY);
      solid(sd * (END0 + 0.3), (HALL_BACK + WALL) / 2, 0.6, WALL - HALL_BACK, 0, { top: FL + H });
    }
    // inside: lined so it reads from the door, and a floor to stand on
    const zin0 = HALL_BACK + 0.72, zin1 = WALL - 0.62;
    const wq = p(0, zin0);
    b.panel(wq[0], FL + 2.8, wq[1], END0 * 2 - 1.5, 5.6, 0xe6dcc4, faceR(S_FRONT), 0.01);
    for (const sd of [-1, 1]) {
      const sq = p(sd * (END0 - 0.05), (zin0 + zin1) / 2);
      b.panel(sq[0], FL + 2.8, sq[1], zin1 - zin0, 5.6, 0xdfd3b8, faceR(sd > 0 ? Math.PI : 0), 0.01);
    }
    // (its front wall is the verandah's back wall, whose own inner face shows;
    // a lining panel there would have covered the open door)
    box(0, FL + 5.6, (zin0 + zin1) / 2, END0 * 2 - 1.4, 0.15, zin1 - zin0, 0xd8cdb0);   // the ceiling
    box(0, FL - 0.05, (zin0 + zin1) / 2, END0 * 2 - 1.4, 0.06, zin1 - zin0, C.WHITE);
    // the altar at the back, on its platform, under a gilt canopy
    box(0, FL, zin0 + 1.2, 5.2, 1.1, 2.2, C.WHITE);
    box(0, FL + 1.1, zin0 + 1.2, 5.4, 0.1, 2.4, C.GILT);
    for (const sd of [-1, 1]) box(sd * 2.4, FL + 1.2, zin0 + 0.4, 0.2, 2.8, 0.2, C.GILT);
    box(0, FL + 4.0, zin0 + 0.9, 5.2, 0.35, 1.4, C.GILT);
    box(0, FL + 1.2, zin0 + 0.2, 4.6, 2.8, 0.1, 0x7a2a22);
    solid(0, zin0 + 1.2, 5.4, 2.4, 0, { h: FL + 1.2 - ground, tag: 'shahji-altar' });
    o.altar = { lx: 0, lz: zin0 + 1.35, y: FL + 1.6 };
    o.darshan = { lx: 0, lz: zin0 + 6.5 };
    // the room, measured to its walls' centre lines, which is what anything
    // walking its wall line samples
    o.hall = { lz0: HALL_BACK + 0.35, lz1: WALL - 0.3, hw: END0 + 0.3, floor: FL };
  }

  /* ---------------------------------------------------------------
   * THE ROOFLINE: two parapets, the statues, the pediment, the lions
   * --------------------------------------------------------------- */
  /** A pierced-oval parapet: a band with a row of dark ovals, facing +lz. */
  const parapet = (lx0, lx1, lz, y0, h, ovalH) => {
    box((lx0 + lx1) / 2, y0, lz, lx1 - lx0, h, 0.35, C.LIME);
    box((lx0 + lx1) / 2, y0 + h, lz, lx1 - lx0 + 0.1, 0.14, 0.45, C.LIME);
    const n = Math.max(1, Math.round((lx1 - lx0) / 1.0));
    for (let k = 0; k < n; k++) {
      const lx = lx0 + (k + 0.5) * (lx1 - lx0) / n;
      oval(lx, y0 + h / 2, lz + 0.18, 0.42, ovalH, 0x6a5e4a, S_FRONT, 0.005, 12);   // the honey reveal behind the white
      oval(lx, y0 + h / 2, lz + 0.18, 0.3, ovalH - 0.14, 0x1e1a14, S_FRONT, 0.01, 12);
    }
  };
  // "The verandah range in front carries a LOWER parapet ... with small
  // urn/baluster finials standing on it at ~2 m intervals"
  {
    parapet(-END0, -CEN, COL_W + 0.15, CORNICE, LOWER - CORNICE - 0.14, 0.8);
    parapet(CEN, END0, COL_W + 0.15, CORNICE, LOWER - CORNICE - 0.14, 0.8);
    parapet(-CEN, CEN, COL_C + 0.2, CORNICE + 0.2, LOWER - CORNICE - 0.1, 0.8);
    for (let lx = -END0 + 1; lx <= END0 - 1; lx += 2.0) {
      const lz = Math.abs(lx) < CEN ? COL_C + 0.2 : COL_W + 0.15;
      const q = p(lx, lz);
      b.prism(q[0], LOWER + 0.1, q[1], 0.3, 0.3, 0.18, 0.18, 0.28, C.LIME, rot);
      b.bevelBox(q[0], LOWER + 0.38, q[1], 0.34, 0.4, 0.34, C.LIME, rot, 0.1);
      b.box(q[0], LOWER + 0.78, q[1], 0.1, 0.2, 0.1, C.LIME, rot);
    }
  }
  // "Set back roughly 6–8 m and ~2.5 m higher, the main hall block carries an
  // UPPER parapet, same pierced-oval grammar but taller openings"
  const PED = 6.0;                        // half the pediment's 12 m
  parapet(-END0, -PED, HALL_FRONT + 0.3, UPPER - 2.0, 1.86, 1.2);
  parapet(PED, END0, HALL_FRONT + 0.3, UPPER - 2.0, 1.86, 1.2);
  /*
   * THE STATUES: "~14 LIFE-SIZE HUMAN STATUES standing free on the UPPER
   * parapet, ~7 per side of the pediment, some singly, some in close pairs",
   * Growse's "life-size female figures in meretricious, but at the same time
   * most ungraceful, attitudes", "a colder, chalkier white than the parapet
   * they stand on". Their subjects and poses are not described one by one;
   * these are draped standing women, some with arms raised.
   */
  if (buildStanding && o.h.place) {
    const statue = { id: 'statue', cloth: 0xf6f5f1, skin: 0xf6f5f1, scale: 1.0, sari: true, border: 0xecebe6, tilak: 0 };
    const xs = [8.6, 9.3, 10.9, 12.4, 13.1, 14.6, 15.9];
    for (const sd of [-1, 1]) {
      xs.forEach((t, k) => {
        const g = buildStanding(statue, k % 3 === 1 ? 'raised' : 'down');
        o.h.place(g, sd * t, UPPER, HALL_FRONT + 0.3, S_FRONT + (rng() - 0.5) * 0.6);
      });
    }
  }
  /*
   * THE BROKEN BAROQUE PEDIMENT: "~12 m wide and ~5.5 m tall, in the warm
   * honey stone. It is NOT triangular. Its outline is a double S-curve with
   * scrolled acanthus edges, broken at the apex. In the tympanum is a large
   * OVAL OCULUS (~2.6 m tall) ringed with a moulding, holding a standing
   * figure; two smaller oval openings flank it, each also with a small figure."
   */
  {
    const lz = HALL_FRONT + 0.3, y0 = UPPER - 2.0, top = APEX - 0.8;
    // the tympanum
    const SLICES = 24;
    for (let k = 0; k < SLICES; k++) {
      const t = (k + 0.5) / SLICES, lx = -PED + t * PED * 2;
      const u = Math.abs(lx) / PED;                         // 0 at the centre, 1 at the edge
      // an S: shoulders at the edge, a swell, a waist, rising to the break
      // "broken at the apex": a notch at the top where the kiosk stands
      const hgt = (top - y0) * (u < 0.17 ? 0.74 : 1 - 0.55 * u - 0.12 * Math.sin(u * Math.PI * 2));
      box(lx, y0, lz, PED * 2 / SLICES + 0.02, hgt, 0.7, C.HONEY);
      // the scrolled edge along the top of it
      box(lx, y0 + hgt, lz + 0.1, PED * 2 / SLICES + 0.05, 0.28, 0.95, C.HONEY_SH);
    }
    // broken at the apex: the two halves' scrolls turned in, and a gap between
    for (const sd of [-1, 1]) {
      const q = p(sd * 1.25, lz + 0.2);
      cyl(q[0], top - 0.35, q[1], 0.38, 0.38, 0.5, C.HONEY_SH, 10);
    }
    // the oval oculus with its moulding and its standing figure, and the two small ones
    oval(0, y0 + 2.4, lz + 0.36, 2.2, 2.9, C.HONEY_SH, S_FRONT, 0.01);
    oval(0, y0 + 2.4, lz + 0.36, 1.9, 2.6, 0x2a2218, S_FRONT, 0.03);
    for (const sd of [-1, 1]) {
      oval(sd * 3.3, y0 + 1.7, lz + 0.36, 1.05, 1.45, C.HONEY_SH, S_FRONT, 0.01);
      oval(sd * 3.3, y0 + 1.7, lz + 0.36, 0.85, 1.25, 0x2a2218, S_FRONT, 0.03);
    }
    if (buildStanding && o.h.place) {
      const statue = { id: 'statue', cloth: 0xf6f5f1, skin: 0xf6f5f1, scale: 1.05, sari: true, border: 0xecebe6, tilak: 0 };
      o.h.place(buildStanding(statue, 'down'), 0, y0 + 1.15, lz + 0.2, S_FRONT);
      for (const sd of [-1, 1]) {
        const small = { ...statue, scale: 0.55 };
        o.h.place(buildStanding(small, 'down'), sd * 3.3, y0 + 1.05, lz + 0.2, S_FRONT);
      }
    }
    /*
     * "THREE SMALL DOMED KIOSKS: one on the apex, ~2.8 m tall to the finial
     * tip, with an ogee-arched square kiosk and a small ribbed bell dome; two
     * lower ones" — which sit "on the stepped attic block OUTBOARD of the
     * pediment's scrolled shoulders, not on the pediment itself" (the checker).
     */
    const kiosk = (lx, y, s) => {
      const q = p(lx, lz);
      for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        b.box(q[0] + (ox * cs - oz * sn) * 0.5 * s, y, q[1] + (ox * sn + oz * cs) * 0.5 * s, 0.14 * s, 1.1 * s, 0.14 * s, C.HONEY);
      }
      for (let k = 0; k < 4; k++) {
        const a = rot + k * Math.PI / 2;
        cuspedArch(b, q[0] + Math.sin(a) * 0.5 * s, y, q[1] - Math.cos(a) * 0.5 * s, 0.86 * s, 1.1 * s, 0.08, a, C.HONEY, 3, null);
      }
      b.box(q[0], y + 1.1 * s, q[1], 1.3 * s, 0.14 * s, 1.3 * s, C.HONEY_SH, rot);
      ribbedDome(b, q[0], y + 1.24 * s, q[1], 0.56 * s, 0.7 * s, C.HONEY, C.HONEY_SH, 12);
    };
    kiosk(0, y0 + (top - y0) * 0.74, 1.3);
    for (const sd of [-1, 1]) kiosk(sd * 7.35, UPPER - 0.1, 0.8);
  }
  /*
   * THE SWEEPS AND THE LIONS: "At EACH END the parapet SWEEPS DOWN in a big
   * concave-convex S-curve volute, terminating over a blank ashlar end bay.
   * On the scrolled console at the head of each sweep sits a large RECUMBENT
   * LION in honey stone (~2.5–3 m long) with a small standing female figure on
   * a lotus pedestal beside it." Growse's "sprawling monsters".
   */
  for (const sd of [-1, 1]) {
    const x0 = END0, x1 = END0 + 4.0, yTop = UPPER - 0.2, yBot = LOWER + 0.5;
    const N = 14;
    for (let k = 0; k < N; k++) {
      const t = (k + 0.5) / N;
      const yy = yTop - (yTop - yBot) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      const lx = sd * (x0 + (x1 - x0) * t);
      box(lx, LOWER - 0.4, HALL_FRONT + 0.3, (x1 - x0) / N + 0.03, yy - (LOWER - 0.4), 0.5, C.LIME);
      box(lx, yy, HALL_FRONT + 0.4, (x1 - x0) / N + 0.05, 0.22, 0.7, C.HONEY_SH);
    }
    // the scrolled console, and the lion on it facing out over the court
    const cq = p(sd * (x1 + 0.6), HALL_FRONT + 0.4);
    cyl(cq[0], yBot - 0.6, cq[1], 0.55, 0.55, 0.9, C.HONEY_SH, 12);
    box(sd * (x1 + 0.9), yBot + 0.25, HALL_FRONT + 0.8, 1.6, 0.45, 3.0, C.HONEY);
    {
      const ly = yBot + 0.7, lx = sd * (x1 + 0.9), lz = HALL_FRONT + 0.9;
      box(lx, ly, lz, 1.0, 0.55, 2.6, C.HONEY_SH);                                  // the body, lying toward the court
      box(lx, ly + 0.2, lz + 1.2, 0.8, 0.85, 0.7, C.HONEY);                        // the maned head, raised
      box(lx, ly + 0.3, lz + 1.6, 0.46, 0.4, 0.2, tint(C.HONEY, 0.9));             // the muzzle
      for (const pz of [0.9, -0.6]) box(lx + sd * 0.4, ly, lz + pz, 0.25, 0.2, 0.55, C.HONEY_SH);   // the paws
      box(lx, ly + 0.1, lz - 1.35, 0.14, 0.14, 0.6, C.HONEY_SH);                   // the tail
    }
    if (buildStanding && o.h.place) {
      const fig = { id: 'statue', cloth: 0xf6f5f1, skin: 0xf6f5f1, scale: 0.6, sari: true, border: 0xecebe6, tilak: 0 };
      const fx = sd * (x1 - 0.4), fz = HALL_FRONT + 0.9;
      const fq = p(fx, fz);
      b.prism(fq[0], yBot + 0.25, fq[1], 0.55, 0.55, 0.4, 0.4, 0.3, C.HONEY, rot);   // the lotus pedestal
      o.h.place(buildStanding(fig, 'down'), fx, yBot + 0.55, fz, S_FRONT);
    }
  }

  /* ---------------------------------------------------------------
   * THE TERRACE AND ITS TWO PAVILIONS, behind
   * --------------------------------------------------------------- */
  /*
   * "TWO ... OPEN PAVILIONS ... ~6.4 m across the roof, ~8.5 m across the
   * plinth, centres ~39 m apart", which the checker corrects: SQUARE, not
   * octagonal — "a 3×3-bay square pavilion under a four-sided pyramidal roof"
   * with square corner piers faced in grey-blue marble, arches "slightly
   * pointed/trefoil", a lotus-bud finial — and on the roof "an unmistakable
   * honey-marble FISH inlaid on the grey-blue pyramidal roof — the Awadh
   * mahi-maratib", with a rampant lion on another face.
   */
  box(0, FL - 0.06, (BACK + HALL_BACK) / 2, MASS * 2 - 0.6, 0.07, HALL_BACK - BACK - 0.4, C.WHITE);
  for (const sd of [-1, 1]) {
    const cx = sd * 19.5, cz = (BACK + HALL_BACK) / 2 - 0.2, P2 = 7.4 / 2, R2 = 6.4 / 2;
    box(cx, FL, cz, P2 * 2, 0.5, P2 * 2, C.BLUE);
    const y0 = FL + 0.5, ph = 3.4;
    for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      box(cx + ox * (R2 - 0.35), y0, cz + oz * (R2 - 0.35), 0.7, ph, 0.7, C.BLUE);
      post(cx + ox * (R2 - 0.35), cz + oz * (R2 - 0.35), 0.5);
    }
    for (let side = 0; side < 4; side++) {
      const ang = side * Math.PI / 2;
      const nx = Math.cos(ang), nz = Math.sin(ang);            // this face's outward normal, local
      for (let k = -1; k <= 1; k++) {
        const t = k * (R2 * 2 - 0.7) / 3;
        const lx = cx + nx * (R2 - 0.2) - nz * t, lz = cz + nz * (R2 - 0.2) + nx * t;
        const q = p(lx, lz);
        cuspedArch(b, q[0], y0, q[1], 1.55, ph * 0.96, 0.2, rot + ang + Math.PI / 2, C.HONEY, 3, null);
        if (k < 1) {
          const t2 = t + (R2 * 2 - 0.7) / 6;
          for (const dd of [-0.08, 0.08]) {
            const cq = p(cx + nx * (R2 - 0.2) - nz * (t2 + dd), cz + nz * (R2 - 0.2) + nx * (t2 + dd));
            b.box(cq[0], y0, cq[1], 0.1, ph, 0.1, C.WHITE, rot);
          }
        }
      }
    }
    box(cx, y0 + ph, cz, R2 * 2 + 0.3, 0.45, R2 * 2 + 0.3, C.HONEY_SH);
    // the four-sided pyramidal roof, in the grey-blue marble
    const yr = y0 + ph + 0.45, apex = yr + 2.6;
    const cn = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ox, oz]) => p(cx + ox * (R2 + 0.2), cz + oz * (R2 + 0.2)));
    const ap = p(cx, cz);
    const pos = ((cn[1][0] - cn[0][0]) * (cn[2][1] - cn[0][1]) - (cn[2][0] - cn[0][0]) * (cn[1][1] - cn[0][1])) > 0;
    for (let k = 0; k < 4; k++) {
      const A = cn[k], B = cn[(k + 1) % 4];
      if (pos) b.tri(A[0], yr, A[1], ap[0], apex, ap[1], B[0], yr, B[1], k % 2 ? C.BLUE : tint(C.BLUE, 0.95));
      else b.tri(B[0], yr, B[1], ap[0], apex, ap[1], A[0], yr, A[1], k % 2 ? C.BLUE : tint(C.BLUE, 0.95));
    }
    // the lotus-bud finial
    b.bevelBox(ap[0], apex - 0.1, ap[1], 0.5, 0.7, 0.5, C.HONEY, rot, 0.2);
    b.box(ap[0], apex + 0.6, ap[1], 0.12, 0.4, 0.12, C.HONEY, rot);
    // the FISH on the face toward the front, and a rampant lion on the one beside
    {
      const fz = cz + R2 * 0.55;
      const q = p(cx, fz);
      const wa = rot + S_FRONT;
      const face = Math.atan2(Math.cos(wa), Math.sin(wa));
      const yy = yr + 1.0;
      b.panel(q[0], yy, q[1], 1.3, 0.45, C.HONEY, face, 0.08);                       // its body
      const tq = p(cx + 0.78, fz);
      b.panel(tq[0], yy, tq[1], 0.35, 0.55, C.HONEY, face, 0.08);                     // its tail
      const lq = p(cx + sd * R2 * 0.55, cz);
      const wl = rot + (sd > 0 ? 0 : Math.PI);
      b.panel(lq[0], yy, lq[1], 0.5, 0.9, C.HONEY, Math.atan2(Math.cos(wl), Math.sin(wl)), 0.08);
    }
  }

  /* ---------------------------------------------------------------
   * THE FORECOURT, THE BAZAAR AND THE GATEWAY
   * --------------------------------------------------------------- */
  /*
   * "FORECOURT: ~38 × 38 m of open ground SE of the temple (MEASURED from ESRI
   * World Imagery) ... reddish brick/stone paving by 2022. About 25 m out from
   * the foot of the steps sits an OVAL GARDEN BED / FOUNTAIN BASIN, ~9 × 5 m,
   * with a small pillar fountain beside it ... LINED WITH BAZAAR STALLS on both
   * sides". OSM's lane enters it from the SE and crosses it to the temple's
   * east corner, so the court is left open there.
   */
  const CZ0 = STEP_FOOT, CZ1 = STEP_FOOT + 38, CX = 19;
  {
    const T = 3.0;
    for (let lz = CZ0 + T / 2; lz < CZ1; lz += T) {
      for (let lx = -CX + T / 2; lx < CX; lx += T) {
        const top = topOf(lx - T / 2, lx + T / 2, lz - T / 2, lz + T / 2, 1) + 0.03;
        box(lx, top - 0.3, lz, T + 0.01, 0.3, T + 0.01, (Math.floor(lx / T) + Math.floor(lz / T)) % 2 ? C.BRICK : tint(C.BRICK, 0.96));
        solid(lx, lz, T, T, 0, { top, tag: 'shahji-court', standOnly: true });
      }
    }
    // the oval bed, with its kerb, and the little pillar fountain beside it
    const BX = 0, BZ = STEP_FOOT + 25, by = topOf(-5, 5, BZ - 3, BZ + 3, 2) + 0.03;
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * TAU;
      const q = p(BX + Math.cos(a) * 4.5, BZ + Math.sin(a) * 2.5);
      b.box(q[0], by, q[1], 1.05, 0.45, 0.3, C.WHITE, rot + a + Math.PI / 2);
    }
    for (let k = 0; k < 14; k++) {
      const t = (k + 0.5) / 14, lx = -4.2 + t * 8.4;
      const hw = 2.25 * Math.sqrt(Math.max(0, 1 - (lx / 4.3) ** 2));
      if (hw < 0.2) continue;
      box(lx, by, BZ, 8.4 / 14 + 0.02, 0.3, hw * 2, 0x5f7a3a);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const q = p(BX + Math.cos(a) * 3.0, BZ + Math.sin(a) * 1.4);
      b.bevelBox(q[0], by + 0.3, q[1], 0.6, 0.55, 0.6, 0x4f7a3a, a, 0.16);
    }
    const fq = p(BX + 6.2, BZ);
    b.box(fq[0], by, fq[1], 0.7, 1.0, 0.7, C.WHITE, rot);
    b.box(fq[0], by + 1.0, fq[1], 1.3, 0.2, 1.3, C.WHITE, rot);
    colliders.push({ type: 'circle', x: p(BX, BZ)[0], z: p(BX, BZ)[1], r: 2.6, h: by + 0.45 - ground + 0.3 });
    post(BX + 6.2, BZ, 0.5);
    // the UP Tourism plaque on its low wall, at the left of the court
    box(-CX + 3, topOf(-CX + 2, -CX + 4, CZ0 + 3, CZ0 + 5, 1), CZ0 + 4, 2.4, 0.9, 0.5, C.SAND);
    box(-CX + 3, topOf(-CX + 2, -CX + 4, CZ0 + 3, CZ0 + 5, 1) + 0.9, CZ0 + 4, 1.1, 0.8, 0.14, tint(C.SAND, 0.92));
    solid(-CX + 3, CZ0 + 4, 2.4, 0.5);
  }
  // the stalls, both sides: "cloth and souvenir stalls under awnings on one side,
  // low shops and a masonry wall on the other" (which side is which: INFERRED)
  {
    const shops = SIGN ? [SIGN.CLOTH, SIGN.PUJA, SIGN.GARLANDS, SIGN.PHOTO, SIGN.BANGLES, SIGN.PRASAD] : [];
    let k = 0;
    for (const sd of [-1, 1]) {
      for (let lz = CZ0 + 7; lz < CZ1 - 3; lz += 4.2) {
        const lx = sd * (CX + 2.2);
        const y = topOf(lx - 2, lx + 2, lz - 2, lz + 2, 1);
        box(lx, y - 0.1, lz, 4.0, sd < 0 ? 2.8 : 3.3, 4.0, sd < 0 ? 0xd8cbb0 : 0xcdbf9f);
        solid(lx, lz, 4.0, 4.0);
        const fx = lx - sd * 2.02;
        box(fx, y, lz, 0.06, 2.2, 3.4, 0x3a3630);
        if (sd < 0) box(fx - sd * 0.9, y + 2.45, lz, 1.9, 0.08, 3.9, [0xc0562f, 0x2f6f4f, 0xb0882e, 0x7a4a86][k % 4]);
        const slot = shops[k % Math.max(1, shops.length)];
        if (signB && slot !== undefined) {
          const q = p(fx - sd * 0.04, lz);
          const wa = rot + (sd < 0 ? 0 : Math.PI);
          signB.panelUV(q[0], y + 2.65, q[1], 2.6, 0.6, signUV(slot), Math.atan2(Math.cos(wa), Math.sin(wa)), 0.05);
        }
        k++;
      }
    }
  }
  /*
   * THE GATEWAY: "a tall Mughal-idiom PISHTAQ in PINK/BUFF SANDSTONE — a
   * multi-cusped ogee arch recessed within a rectangular frame, a band of
   * pendant cusps, engaged fluted pilasters, and a crown of large carved LOTUS
   * PETALS radiating around the arch head, with a square ogee-arched domed
   * kiosk above and smaller domed kiosks flanking". Growse: "in a grandiose
   * way, decidedly effective". It stands where OSM's lane meets the court;
   * its size is not measured.
   */
  {
    const GX = 2.6, GZ = CZ1 + 1.2, W2 = 9.0, H2 = 10.5, D2 = 3.0, OPEN = 4.4;
    const y = topOf(GX - 5, GX + 5, GZ - 2, GZ + 2, 2);
    for (const sd of [-1, 1]) {
      const lx = GX + sd * (OPEN / 2 + (W2 - OPEN) / 4);
      box(lx, y - 0.2, GZ, (W2 - OPEN) / 2, H2 + 0.2, D2, C.SAND);
      solid(lx, GZ, (W2 - OPEN) / 2, D2);
      // the engaged fluted pilasters
      for (const pz of [GZ + D2 / 2 + 0.05, GZ - D2 / 2 - 0.05]) {
        const px = GX + sd * (W2 / 2 - 0.35);
        box(px, y, pz, 0.55, H2 - 0.6, 0.12, tint(C.SAND, 1.04));
        for (let f = -1; f <= 1; f++) box(px + f * 0.14, y + 0.4, pz + Math.sign(pz - GZ) * 0.07, 0.04, H2 - 1.4, 0.03, C.SAND_SH);
      }
    }
    box(GX, y + 7.2, GZ, OPEN + 0.1, H2 - 7.2, D2, C.SAND);
    const q = p(GX, GZ);
    cuspedArch(b, q[0], y, q[1], OPEN, 7.2, D2, rot, C.SAND, 9, null);
    // the band of pendant cusps, and the lotus petals radiating round the arch head
    for (const pz of [GZ + D2 / 2 + 0.05, GZ - D2 / 2 - 0.05]) {
      for (let k = 1; k < 12; k++) {
        const a = Math.PI * k / 12;
        box(GX - Math.cos(a) * (OPEN / 2 - 0.2), y + 3.74 + Math.sin(a) * 3.2, pz, 0.14, 0.3, 0.1, C.SAND_SH);
        box(GX - Math.cos(a) * (OPEN / 2 + 0.6), y + 3.74 + Math.sin(a) * 4.0, pz + Math.sign(pz - GZ) * 0.06, 0.34, 0.9, 0.12, tint(C.SAND, 0.94));
      }
      box(GX, y + H2 - 0.5, pz, W2 + 0.2, 0.5, 0.25, C.SAND_SH);
    }
    // the square ogee-arched domed kiosk above, and the smaller ones flanking
    const kq = (lx, s) => {
      const w = p(lx, GZ);
      for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        b.box(w[0] + (ox * cs - oz * sn) * 0.8 * s, y + H2, w[1] + (ox * sn + oz * cs) * 0.8 * s, 0.22 * s, 1.6 * s, 0.22 * s, C.SAND);
      }
      b.box(w[0], y + H2 + 1.6 * s, w[1], 2.0 * s, 0.2 * s, 2.0 * s, C.SAND_SH, rot);
      ribbedDome(b, w[0], y + H2 + 1.8 * s, w[1], 0.9 * s, 1.1 * s, C.SAND, C.SAND_SH, 12);
    };
    kq(GX, 1.0);
    for (const sd of [-1, 1]) kq(GX + sd * (W2 / 2 - 0.5), 0.6);
    // the wall along the court's front either side of it, on the lane
    for (const [a2, c2] of [[-CX - 4.2, GX - W2 / 2], [GX + W2 / 2, CX + 4.2]]) {
      const lz = CZ1 + 1.2, yy = topOf(a2, c2, lz - 0.5, lz + 0.5, 3) - 0.1;
      box((a2 + c2) / 2, yy, lz, c2 - a2, 3.0, 0.5, 0xcdbf9f);
      solid((a2 + c2) / 2, lz, c2 - a2, 0.8);
    }
  }

  /* ---- the lower white range to one side ---- */
  // "a LOWER, plainer white range with plain round columns and a pierced
  // parapet — an ancillary wing at a lower level". Its side is the photo's
  // left; its size and whether it is original are unknown (INFERRED).
  {
    const X0 = -MASS - 4.2, X1 = -MASS - 0.4, Z0 = -8, Z1 = 9;
    const y = topOf(X0, X1, Z0, Z1, 2);
    box((X0 + X1) / 2, y - 0.2, (Z0 + Z1) / 2, X1 - X0, 1.2, Z1 - Z0, C.WHITE);
    box((X0 + X1) / 2, y + 1.0, (Z0 + Z1) / 2 - 1.5, X1 - X0 - 1.0, 4.2, Z1 - Z0 - 3.0, tint(C.WHITE, 0.97));
    for (let k = 0; k < 5; k++) {
      const lz = Z0 + 1 + k * ((Z1 - Z0 - 2) / 4);
      const qq = p(X0 + 0.5, lz);
      cyl(qq[0], y + 1.0, qq[1], 0.2, 0.18, 3.6, C.WHITE, 8);
    }
    box((X0 + X1) / 2, y + 4.6, (Z0 + Z1) / 2, X1 - X0 + 0.3, 0.35, Z1 - Z0 + 0.3, C.WHITE);
    box(X0 + 0.2, y + 4.95, (Z0 + Z1) / 2, 0.3, 0.8, Z1 - Z0, C.LIME);
    solid((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0);
  }

  return {
    altar: o.altar, darshan: o.darshan, hall: o.hall, FL,
    // for the keep-out and anything else that asks where the compound is
    compound: { lx0: -MASS - 4.5, lx1: MASS + 1, lz0: BACK - 1, lz1: CZ1 + 3 },
  };
}
