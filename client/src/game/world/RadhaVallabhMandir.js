/**
 * SHRI RADHA VALLABH MANDIR — the old temple (Hit Mandir, ASI N-UP-A198) and
 * the living temple beside it, in the walled Radhavallabh Ghera.
 *
 * Built from docs/research/radha-vallabh.md: the survey AND its independent
 * checker, where the checker overrules the survey. What stood here was a
 * 12 m-wide hall with Govind Dev's ten-foot walls, a square sanctum plinth and
 * a clerestory band for a top storey — three of the checker's corrections — at
 * a point 430 m from the temple.
 *
 * WHERE: OpenStreetMap node 7172103529 (name:ru "Храм Радхи-Валлабхи"),
 * 27.581074 / 77.69172, which agrees with Wikipedia's infobox to 17 m and
 * with Wikidata's high-precision point to 46 m. ESRI z19 imagery over it
 * (0.26 m/px, MEASUREMENT only) shows a long red-brown roof running due
 * east-west, 37.7 m by 11.9 m over its eaves, with a grey block at its west
 * end, and a white-roofed court immediately south; the lane runs hard along
 * its north wall. So the old temple's axis is due east-west, 3.3 m north of
 * the node and centred 3.2 m west of it, which is this builder's origin.
 *
 * THE FRAME: the box frame turned so +lz points EAST, to the old temple's
 * front ("The nave has an eastern facade", Growse p.255), and +lx NORTH, to
 * the lane. The living temple is on the SOUTH side, −lx ("A modern temple
 * has been erected on the south side").
 *
 * MEASURED off Growse's dimensioned plate (17.09 px/ft, both surveyors):
 * nave 62 x 32 ft outside (18.9 x 9.75 m), 54 x 18 ft inside; side walls
 * 7 ft (2.1 m); the jagmohan band 20 ft (6.1 m); the octagon 36 ft across
 * the flats outside, 23 ft inside, overlapping the jagmohan; 117 ft overall
 * (the checker's correction of 127). HEIGHTS are the checker's working
 * figures: a cornice about 9 m up, a 40-degree stone gable, ridge 13-14 m.
 * The living temple is sized off the satellite's white court roof (11.6 x
 * 15.4 m) and INFERRED beyond that — no measured source exists.
 */

import { TAU } from '../../engine/math/MathUtils.js';
import { campusSign } from './Signage.js';

/** Colours. MEASURED where the checker sampled a daylight photograph. */
const C = {
  STONE: 0xac866a,      // sunlit top-storey pier (checker, "... 2022 31")
  STONE_DK: 0x69270f,   // mid-storey spandrel
  FASCIA: 0x61230e,     // lower chhajja fascia
  PLINTH: 0xba8258,     // plinth steps
  WALL: 0x9a6a50,       // the weathered wall between them (INFERRED within the sampled range)
  ROOF: 0x86573f,       // the gable's slabs, darker with weather (INFERRED)
  SOOT: 0x291d0f,       // interior pier bases (the checker: plausible for the sooted inside)
  INSIDE: 0x4d4731,     // interior shade (survey)
  KITCHEN: 0xb8ab8e,    // the later room on the cella plinth: grey in the satellite
  TEAL: 0x1f6b63, GOLD: 0xc9a227,     // the door at the hall's west end and its surround (eyeballed, both surveys)
  GERU: 0x8e2f1c,       // the living temple's "deep red-oxide/geru painted" walls (hex INFERRED)
  SAND: 0xb8775a,       // its "carved red sandstone piers" (hex INFERRED)
  CREAM: 0xe8dcc0,
  VERM: 0xcc4c38, VERM_SH: 0x7f2211, LOTUS: 0xefbbac, OCHRE: 0xc9982f,   // the street gate, MEASURED
  FLAG: 0xc9bca0,       // the ghera's stone flags (INFERRED)
  CHQ_W: 0xe4e1d8, CHQ_B: 0x232426,
  SHUTTER: 0x7a7f7c, IRON: 0x2a2826, WOOD: 0x5e3c22,
  SHEET: 0xeef0ee,      // the white roof over the living temple's court (satellite)
  GOBAR: 0x5a4028,      // the cow-dung swastikas pressed on the lintel ("... 2022 36")
};

/**
 * @param o.b, o.signB, o.loc, o.ground, o.terrain, o.colliders, o.rng
 * @param o.h  helpers: cuspedArch, tint, buildStanding, buildSeated, PEOPLE, place, signUV, buildDeities, SIGN
 */
export function buildRadhaVallabhMandir(o) {
  const { b, signB, loc, ground, terrain, colliders, rng } = o;
  const { cuspedArch, tint, buildStanding, buildSeated, PEOPLE, place, buildDeities, SIGN } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, ang = 0, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  const faceR = (a) => { const wa = rot + a; return Math.atan2(Math.cos(wa), Math.sin(wa)); };
  // local facing angles: toward +lx (north) 0, +lz (east, the front) PI/2
  const F = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 };
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
  const ltri = (A, B, Cq, col) => {
    const a = p(A[0], A[2]), bb = p(B[0], B[2]), c = p(Cq[0], Cq[2]);
    b.tri(a[0], A[1], a[1], bb[0], B[1], bb[1], c[0], Cq[1], c[1], col);
  };
  const rooms = [];

  /* ================================================================
   * THE OLD TEMPLE — Hit Mandir
   * ================================================================ */
  const EZ = 17.8;                   // the east face: 117 ft overall, centred on the satellite's roof
  const NW = 4.875;                  // half of the nave's 32 ft
  const WALL = 2.1;                  // "Radha Vallabh's side walls measure 6.9 ft (2.10 m)"
  const IN_HW = 2.745;               // 18 ft inside, halved
  const NZ0 = EZ - 18.9;             // the nave's west end: 62 ft
  const IN_Z1 = EZ - 1.22, IN_Z0 = NZ0 + 1.22;   // 54 ft inside
  const JZ0 = NZ0 - 6.1;             // the jagmohan band, 20 ft
  const OCT_Z = -EZ + 5.485, OCT_A = 5.485;       // the octagon: 36 ft across the flats, its back flat the west end
  const yL = topOf(-NW - 1, NW + 1, JZ0, EZ + 1, 4);
  const FLN = yL + 0.9;              // "Plinth above lane: 0.9 m" (ESTIMATED)
  const H1 = 3.6, H2 = 2.8, H3 = 2.6;              // the three stages (ESTIMATED; see the header)
  const S1 = FLN + H1, S2 = S1 + H2, CORN = S2 + H3;
  const EAVE = NW + 0.45;
  const RIDGE = CORN + EAVE * Math.tan(40 * Math.PI / 180);

  // ---- the plinth, and three steps up to the three open doorways ----
  box(0, yL - 0.3, (JZ0 + EZ) / 2, NW * 2 + 0.5, FLN - yL + 0.3, EZ - JZ0 + 0.2, C.PLINTH);
  box(0, FLN - 0.08, (JZ0 + EZ) / 2, NW * 2 + 0.64, 0.1, EZ - JZ0 + 0.34, tint(C.PLINTH, 0.92));
  {
    const N = 3, RISE = (FLN - yL) / N, TR = 0.42;
    for (let i = 0; i < N; i++) {
      const lz = EZ + 0.12 + (N - i) * TR - TR / 2;
      box(0, yL - 0.1, lz, 6.4, (i + 1) * RISE + 0.1, TR, i % 2 ? C.PLINTH : tint(C.PLINTH, 0.95));
      solid(0, lz, 6.4, TR, 0, { top: yL + (i + 1) * RISE, tag: 'rv-steps', standOnly: true });
    }
  }
  // the hall's floor, stone, and something to stand on
  box(0, FLN - 0.2, (JZ0 + 0.4 + IN_Z1) / 2, IN_HW * 2, 0.2, IN_Z1 - JZ0 - 0.4, 0x8f7f68);
  solid(0, (JZ0 + 0.4 + EZ + 0.12) / 2, IN_HW * 2 + 0.4, EZ + 0.12 - JZ0 - 0.4, 0, { top: FLN, tag: 'temple-floor', floor: true });

  // ---- the long walls: 7 ft of red-brown sandstone, the lane's side and the court's ----
  /*
   * "a double tier of openings north and south; those in the lower story
   * having brackets and architraves and those above being Muhammadan arches
   * ... These latter open into a narrow gallery with small clerestory windows
   * looking on to the street." From the street the flank is solid stone in
   * pilastered bays — about seven a side, the survey's count — with a small
   * window to each bay at the gallery, a string course, and a deep chhajja on
   * brackets at the eaves under the gable.
   */
  const BAYS = 7, bay = (IN_Z1 - IN_Z0) / BAYS;
  for (const sd of [-1, 1]) {
    const cx = sd * (NW - WALL / 2);
    box(cx, FLN, (NZ0 + EZ) / 2, WALL, CORN - FLN, EZ - NZ0, C.WALL);
    solid(cx, (NZ0 + EZ) / 2, WALL, EZ - NZ0, 0, { top: CORN });
    const ox = sd * (NW + 0.02);
    for (let i = 0; i <= BAYS; i++) {
      const lz = IN_Z0 + i * bay;
      box(ox, FLN, lz, 0.18, CORN - FLN - 0.2, 0.55, C.STONE);                 // pilaster
    }
    box(ox, S1 - 0.12, (NZ0 + EZ) / 2, 0.24, 0.22, EZ - NZ0, C.FASCIA);        // string course
    box(ox, S2 - 0.1, (NZ0 + EZ) / 2, 0.2, 0.18, EZ - NZ0, C.STONE_DK);
    for (let i = 0; i < BAYS; i++) {
      const lz = IN_Z0 + (i + 0.5) * bay;
      // the gallery's small clerestory window, cusped, dark
      const q = p(ox + sd * 0.02, lz);
      cuspedArch(b, q[0], S1 + 0.8, q[1], 0.7, 1.15, 0.12, rot + Math.PI / 2, C.STONE, 3, 0x1a1410);
      // a blind trabeate panel below, lintel on two brackets
      box(ox, FLN + 0.5, lz, 0.1, 2.4, bay - 1.1, tint(C.WALL, 0.93));
      box(ox + sd * 0.05, FLN + 2.9, lz, 0.14, 0.18, bay - 0.9, C.FASCIA);
      for (const k of [-1, 1]) box(ox + sd * 0.07, FLN + 2.62, lz + k * (bay / 2 - 0.55), 0.16, 0.28, 0.22, C.STONE_DK);
    }
    // the chhajja at the eaves, on brackets
    const cq = sd * (NW + 0.35);
    box(cq, CORN - 0.12, (NZ0 + EZ) / 2, 0.9, 0.12, EZ - NZ0 + 0.6, C.FASCIA);
    for (let lz = NZ0 + 0.6; lz < EZ - 0.3; lz += 1.1) box(sd * (NW + 0.18), CORN - 0.55, lz, 0.36, 0.42, 0.18, C.STONE_DK);
  }

  // ---- the east facade: three stages, five bays ----
  /*
   * "The nave has an eastern facade ... in three stages, the upper and lower
   * Hindu, and the one between them purely Muhammadan in character ... Below,
   * the three centre bays of the colonnade are open doorways, and the two at
   * either end are occupied by the staircase that leads to the upper
   * gallery." The checker, off a daylight photograph: the middle stage's
   * windows are "simple two-centred pointed/ogee arches with a shallow
   * foliation near the springing and carved rosette medallions in the
   * spandrels — not dense multifoil"; and the top stage is "a tall open
   * loggia of square piers carrying bracketed architraves under a deep
   * chhajja ... overwhelmingly VOID", not a clerestory band.
   */
  {
    const FW = 1.22, fz = EZ - FW / 2, bw = (NW * 2) / 5;
    const colX = (i) => -NW + bw * (i + 0.5);            // bay centres, i = 0..4
    // stage 1: the end bays solid (the stairs are in them), square piers
    // between the three doorways, a lintel on brackets over each
    const DW = 1.45, DH = 2.9;
    for (const i of [0, 4]) {
      box(colX(i), FLN, fz, bw, H1, FW, C.WALL);
      solid(colX(i), fz, bw, FW, 0, { top: CORN });
    }
    for (let i = 1; i <= 4; i++) {
      const px = -NW + bw * i;                           // pier between bays i-1 and i
      const w = bw - DW;
      box(px, FLN, fz, w, H1, FW, C.STONE);
      solid(px, fz, w, FW, 0, { top: CORN });
    }
    for (let i = 1; i <= 3; i++) {
      const cx = colX(i);
      box(cx, FLN + DH, fz, DW + 0.1, H1 - DH, FW, C.WALL);                    // the lintel and wall over it
      box(cx, FLN + DH - 0.02, EZ + 0.04, DW + 0.5, 0.26, 0.12, C.FASCIA);      // architrave
      for (const k of [-1, 1]) box(cx + k * (DW / 2 + 0.05), FLN + DH - 0.34, EZ + 0.08, 0.26, 0.32, 0.2, C.STONE_DK); // brackets
      // gobar swastikas pressed on the lintel, drying ("... 2022 36")
      for (let g = -1; g <= 1; g++) {
        box(cx + g * 0.34, FLN + DH + 0.22, EZ + 0.02, 0.14, 0.14, 0.03, C.GOBAR);
      }
    }
    // the ASI's chain-link screens over the two outer doorways; the middle one open
    for (const i of [1, 3]) {
      box(colX(i), FLN, EZ - 0.3, DW, DH - 0.1, 0.04, 0x8d918c);
      solid(colX(i), EZ - 0.3, DW, 0.12, 0, { top: FLN + DH });
    }
    // chhajja between stages 1 and 2
    box(0, S1 - 0.08, EZ + 0.4, NW * 2 + 0.8, 0.12, 0.9, C.FASCIA);
    // stage 2: five pointed arches with a rosette in each spandrel
    box(0, S1, fz, NW * 2, H2, FW, C.STONE_DK);
    for (let i = 0; i < 5; i++) {
      const q = p(colX(i), EZ + 0.02);
      cuspedArch(b, q[0], S1 + 0.25, q[1], 1.25, 2.2, 0.2, rot, C.STONE, 3, 0x1a1410);
      if (i < 4) {
        const r2 = p(-NW + bw * (i + 1), EZ + 0.03);
        b.panel(r2[0], S1 + 2.25, r2[1], 0.36, 0.36, C.STONE, faceR(F.E), 0.02);
      }
    }
    box(0, S2 - 0.08, EZ + 0.35, NW * 2 + 0.7, 0.12, 0.8, C.FASCIA);
    // stage 3: the open loggia — six square piers, bracketed architraves, a
    // dark void behind, and the deep chhajja over it
    box(0, S2, EZ - 1.0, NW * 2 - 0.4, H3, 0.2, 0x2a1d14);                    // the void's back
    box(0, S2, EZ - 0.6, NW * 2, 0.12, 1.2, C.STONE);                        // its floor
    for (let i = 0; i <= 5; i++) {
      const px = -NW + 0.2 + i * ((NW * 2 - 0.4) / 5);
      box(px, S2, EZ - 0.2, 0.36, H3 - 0.35, 0.36, C.STONE);
      box(px, S2 + H3 - 0.62, EZ - 0.05, 0.3, 0.26, 0.5, C.STONE_DK);          // bracket
    }
    box(0, S2 + H3 - 0.35, EZ - 0.2, NW * 2, 0.35, 0.5, C.STONE);             // architrave
    box(0, CORN - 0.1, EZ + 0.4, NW * 2 + 1.0, 0.16, 1.2, C.FASCIA);          // the deep chhajja
  }

  // ---- the nave's west wall, open to the jagmohan through an arch ----
  {
    const wz = NZ0 + 0.61, AW = 1.8;
    for (const sd of [-1, 1]) {
      const w = NW - WALL - AW / 2;
      box(sd * (AW / 2 + w / 2), FLN, wz, w, CORN - FLN, 1.22, C.WALL);
      solid(sd * (AW / 2 + w / 2), wz, w, 1.22, 0, { top: CORN });
    }
    box(0, FLN + 3.3, wz, AW + 0.1, CORN - FLN - 3.3, 1.22, C.WALL);
    const q = p(0, wz);
    cuspedArch(b, q[0], FLN, q[1], AW, 3.3, 1.26, rot, C.INSIDE, 3, null);
  }

  // ---- the jagmohan: a lower block, flat-roofed now ----
  {
    const jz = (JZ0 + NZ0) / 2, JH = CORN - 1.4;
    for (const sd of [-1, 1]) {
      box(sd * (NW - WALL / 2), FLN, jz, WALL, JH - FLN, NZ0 - JZ0, C.WALL);
      solid(sd * (NW - WALL / 2), jz, WALL, NZ0 - JZ0, 0, { top: JH });
    }
    box(0, JH, jz, NW * 2 + 0.3, 0.3, NZ0 - JZ0 + 0.2, C.ROOF);               // its flat roof
    box(0, JH + 0.3, jz, NW * 2 + 0.3, 0.6, 0.25, C.STONE);                   // a low parapet
    box(0, JH + 0.3, JZ0 + 0.12, NW * 2 + 0.3, 0.6, 0.25, C.STONE);
    for (const sd of [-1, 1]) box(sd * (NW + 0.02), JH + 0.3, jz, 0.25, 0.6, NZ0 - JZ0, C.STONE);
    // the west wall, and in it the TEAL door in its gold-yellow surround,
    // which is the later room's ("2022 ... 01, 08, 09")
    box(0, FLN, JZ0 + 0.6, NW * 2 - WALL * 2, JH - FLN, 1.2, C.WALL);
    solid(0, JZ0 + 0.6, NW * 2 - WALL * 2, 1.2, 0, { top: JH });
    const dq = p(0, JZ0 + 1.22);
    b.panel(dq[0], FLN + 1.2, dq[1], 1.5, 2.5, C.GOLD, faceR(F.E), 0.02);
    b.panel(dq[0], FLN + 1.12, dq[1], 1.1, 2.2, C.TEAL, faceR(F.E), 0.04);
  }

  // ---- the ceiling, inside: flat-centred, deeply coved, ribbed ----
  /*
   * NOT a barrel vault: that is Govind Dev's. The checker, from Growse p.304
   * on Harideva, this building's plan-twin, and the interior photograph
   * "2022 ... 02": "transverse pointed rib-arches with FLAT, horizontally-
   * coursed, panelled bays between them" — a trabeate ceiling "so deeply
   * coved at the sides that ... it had all the effect of a vault".
   */
  const CV0 = S2 - 0.3, CV1 = CORN - 0.6;           // the cove springs, and the flat centre
  {
    const Z0 = NZ0 + 1.22, Z1 = IN_Z1;
    const prof = [[IN_HW, CV0], [IN_HW - 0.5, CV0 + 0.7], [IN_HW - 1.1, CV1 - 0.2], [IN_HW - 1.7, CV1]];
    for (const sd of [-1, 1]) {
      for (let k = 0; k < prof.length - 1; k++) {
        const [a0, y0] = prof[k], [a1, y1] = prof[k + 1];
        lq2([sd * a0, y0, Z0], [sd * a1, y1, Z0], [sd * a1, y1, Z1], [sd * a0, y0, Z1], tint(C.INSIDE, 1.1 - k * 0.06));
      }
    }
    const fx = IN_HW - 1.7;
    lq2([-fx, CV1, Z0], [fx, CV1, Z0], [fx, CV1, Z1], [-fx, CV1, Z1], tint(C.INSIDE, 0.92));
    // the transverse ribs, one to each bay, and the panels' coursing lines
    for (let i = 0; i <= BAYS; i++) {
      const lz = IN_Z0 + i * bay;
      for (const sd of [-1, 1]) {
        for (let k = 0; k < prof.length - 1; k++) {
          const [a0, y0] = prof[k], [a1, y1] = prof[k + 1];
          lq2([sd * a0, y0 - 0.12, lz - 0.14], [sd * a1, y1 - 0.12, lz - 0.14], [sd * a1, y1 - 0.12, lz + 0.14], [sd * a0, y0 - 0.12, lz + 0.14], C.WALL);
        }
      }
      lq2([-fx, CV1 - 0.12, lz - 0.14], [fx, CV1 - 0.12, lz - 0.14], [fx, CV1 - 0.12, lz + 0.14], [-fx, CV1 - 0.12, lz + 0.14], C.WALL);
    }
  }

  // ---- the hall's own walls, inside: the double tier of openings ----
  for (const sd of [-1, 1]) {
    const wx = sd * (IN_HW - 0.01), face = sd > 0 ? F.S : F.N;
    for (let i = 0; i < BAYS; i++) {
      const lz = IN_Z0 + (i + 0.5) * bay;
      const q = p(wx, lz);
      // lower: square-headed, a lintel on brackets, dark behind
      b.panel(q[0], FLN + 1.4, q[1], bay - 1.0, 2.6, 0x1c140d, faceR(face), 0.01);
      box(wx - sd * 0.08, FLN + 2.7, lz, 0.18, 0.22, bay - 0.7, C.WALL);
      for (const k of [-1, 1]) box(wx - sd * 0.1, FLN + 2.42, lz + k * (bay / 2 - 0.5), 0.2, 0.28, 0.2, C.STONE_DK);
      // upper: a pointed arch into the gallery
      cuspedArch(b, q[0], S1 + 0.25, q[1], bay - 1.0, 2.3, 0.16, rot + Math.PI / 2, C.WALL, 3, 0x1c140d);
    }
    // the paired piers between, sooted at the foot
    for (let i = 0; i <= BAYS; i++) {
      const lz = IN_Z0 + i * bay;
      box(wx - sd * 0.12, FLN, lz, 0.24, CV0 - FLN, 0.55, C.WALL);
      box(wx - sd * 0.13, FLN, lz, 0.27, 1.2, 0.6, C.SOOT);
    }
    // the stair doors at the east end, one each side, dark
    const sq = p(sd * (NW - 1.0), IN_Z1 - 0.02);
    b.panel(sq[0], FLN + 1.1, sq[1], 0.8, 2.1, 0x140e09, faceR(F.W), 0.02);
  }

  // a sadhu seated in the colonnade, which the 2022 photographs show — the
  // hall is not empty: "still occasionally used for gatherings in which lyrics
  // by poets of the Radhavallabh Sampraday are sung" (Entwistle)
  if (buildSeated && place) {
    const sadhu = PEOPLE.find((t) => t.id === 'sadhu') || PEOPLE[0];
    place(buildSeated(sadhu, 'lap', null), -IN_HW + 0.7, FLN, IN_Z1 - 1.6, F.E - 0.6);
    post(-IN_HW + 0.7, IN_Z1 - 1.6, 0.4, { top: FLN + 1.0 });
  }

  // ---- THE STEEP STONE GABLE ----
  /*
   * "the outer roof, a steep gable, also of stone, is as yet perfect. Some
   * trees however have taken root between the slabs" (Growse p.255). No dome,
   * no barrel, no tower: this is the building's outline.
   */
  {
    const Z0 = NZ0 - 0.25, Z1 = EZ + 0.3, COURSES = 7;
    for (let k = 0; k < COURSES; k++) {
      const t0 = k / COURSES, t1 = (k + 1) / COURSES;
      const a0 = EAVE * (1 - t0), a1 = EAVE * (1 - t1);
      const y0 = CORN + (RIDGE - CORN) * t0, y1 = CORN + (RIDGE - CORN) * t1;
      const col = k % 2 ? C.ROOF : tint(C.ROOF, 1.08);
      lq([a0, y0, Z0], [a1, y1, Z0], [a1, y1, Z1], [a0, y0, Z1], col);        // north slope
      lq([-a0, y0, Z1], [-a1, y1, Z1], [-a1, y1, Z0], [-a0, y0, Z0], col);    // south slope
    }
    // the gable ends, stone, over the facade and over the jagmohan
    ltri([-EAVE + 0.2, CORN, EZ + 0.02], [EAVE - 0.2, CORN, EZ + 0.02], [0, RIDGE - 0.25, EZ + 0.02], C.STONE);
    ltri([EAVE - 0.2, CORN, NZ0 - 0.02], [-EAVE + 0.2, CORN, NZ0 - 0.02], [0, RIDGE - 0.25, NZ0 - 0.02], C.STONE);
    // under it, seen from the loggia and the lane: its soffit
    lq([-EAVE, CORN - 0.01, Z0], [EAVE, CORN - 0.01, Z0], [EAVE, CORN - 0.01, Z1], [-EAVE, CORN - 0.01, Z1], C.STONE_DK);
    // the ridge
    box(0, RIDGE - 0.12, (Z0 + Z1) / 2, 0.4, 0.26, Z1 - Z0, C.STONE_DK);
    // trees rooted between the slabs
    for (const [tx, tz, s2] of [[1.4, 4.2, 1.0], [-2.2, -0.6, 0.8], [0.3, 12.5, 1.15]]) {
      const ty = CORN + (RIDGE - CORN) * (1 - Math.abs(tx) / EAVE) - 0.1;
      const q = p(tx, tz);
      b.box(q[0], ty, q[1], 0.14 * s2, 1.3 * s2, 0.14 * s2, 0x5c4630, rot);
      b.bevelBox(q[0], ty + 1.1 * s2, q[1], 1.5 * s2, 1.0 * s2, 1.5 * s2, 0x4a7a3a, rng() * TAU, 0.4);
      b.bevelBox(q[0], ty + 1.8 * s2, q[1], 0.9 * s2, 0.7 * s2, 0.9 * s2, 0x5c8a46, rng() * TAU, 0.4);
    }
  }

  // ---- the headless sanctum: the octagon's plinth, and the room on it ----
  /*
   * "The actual shrine, or cella ... was demolished by Aurangzeb and only the
   * plinth remains, upon which a room has been built, which is used as a
   * kitchen." An OCTAGON (Growse p.256), 36 ft across the flats outside; the
   * plate draws the outer ring as eight thin slabs with the corners open,
   * and what stands on it now is the low grey block the satellite shows.
   */
  {
    const yP = yL + 1.4;
    const ring = (a) => Array.from({ length: 8 }, (_, k) => {
      const ang = (k + 0.5) * (TAU / 8);
      const r = a / Math.cos(Math.PI / 8);
      return [Math.cos(ang) * r, OCT_Z + Math.sin(ang) * r];
    });
    const R = ring(OCT_A);
    // the plinth: its eight faces and its top
    for (let k = 0; k < 8; k++) {
      const A = R[k], B = R[(k + 1) % 8];
      lq([A[0], yL - 0.2, A[1]], [A[0], yP, A[1]], [B[0], yP, B[1]], [B[0], yL - 0.2, B[1]], k % 2 ? C.PLINTH : tint(C.PLINTH, 0.94));
      ltri([0, yP, OCT_Z], [B[0], yP, B[1]], [A[0], yP, A[1]], tint(C.STONE, 0.9));
      // the ring slab on each face, broken down to a stub, its corners open
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const inx = -mx * 0.08, inz = -(mz - OCT_Z) * 0.08;
      box(mx + inx, yP, mz + inz, len - 1.3, 0.35 + (k % 3) * 0.2, 0.45, C.WALL, ang);
    }
    // what makes it solid: the square the octagon is cut from
    solid(0, OCT_Z, OCT_A * 2, OCT_A * 2, 0, { top: yP });
    // the later room on it: rendered, flat-roofed, low
    const RW = 8.0, RD = 7.2, RH = 3.4;
    box(0, yP, OCT_Z, RW, RH, RD, C.KITCHEN);
    box(0, yP + RH, OCT_Z, RW + 0.3, 0.2, RD + 0.3, tint(C.KITCHEN, 0.9));
    box(0, yP + RH + 0.2, OCT_Z, RW + 0.3, 0.45, 0.2, C.KITCHEN);
    box(0, yP + RH + 0.2, OCT_Z - RD / 2, RW + 0.3, 0.45, 0.2, C.KITCHEN);
    for (const sd of [-1, 1]) {
      box(sd * (RW / 2), yP + RH + 0.2, OCT_Z, 0.2, 0.45, RD, C.KITCHEN);
      // a small barred window each side, and a sooty vent: it is a kitchen
      const wq = p(sd * (RW / 2 + 0.01), OCT_Z + 1.0);
      b.panel(wq[0], yP + 1.8, wq[1], 0.9, 0.8, 0x2a2622, faceR(sd > 0 ? F.N : F.S), 0.02);
    }
    box(RW / 2 - 1.2, yP + RH + 0.2, OCT_Z - 1.4, 0.5, 1.1, 0.5, 0x6a655a);
    solid(0, OCT_Z, RW, RD, 0, { top: yP + RH + 0.6 });
  }

  // the ASI's blue boards before the facade
  for (const sd of [-1, 1]) {
    const bx = sd * 4.6, bz = EZ + 3.2, y = tH(bx, bz);
    box(bx, y, bz, 0.08, 1.1, 0.08, C.IRON);
    sign('asi', bx, y + 1.45, bz, 1.4, 0.72, F.E);
    box(bx, y + 1.08, bz - 0.04, 1.46, 0.78, 0.04, 0x163a73);
    post(bx, bz, 0.12, { top: y + 1.9 });
  }

  // the old temple's hall is a room you walk into, through the middle door
  {
    const c = p(0, (JZ0 + 1.22 + IN_Z1) / 2);
    rooms.push({
      id: 'radha-vallabh-hit-mandir',
      name: 'Hit Mandir — the old temple',
      hindi: 'प्राचीन राधावल्लभ मन्दिर',
      deity: 'Monument of National Importance',
      x: c[0], z: c[1], hw: IN_HW, hd: (IN_Z1 - (JZ0 + 1.22)) / 2, rot,
      door: p(0, EZ + 2.2),
      // a tall hall: entered as a temple is, and no bell — there is no murti
      hall: true, quiet: true,
      ceil: CORN + 20,
    });
  }

  /* ================================================================
   * THE LIVING TEMPLE, on the south side
   * ================================================================ */
  /*
   * "installed in a new temple built alongside the original one by a merchant
   * from Gujarat named Seth Lallubhai Bhagwandas" (Entwistle; 1785). A
   * courtyard temple: "an open rectangular court with a cusped-arch arcade on
   * carved red sandstone piers, deep red-oxide/geru painted wall panels,
   * black-and-white chequer and chevron marble paving, festival red-and-gold
   * scalloped valances, marigold strings and paper lanterns, and flat
   * rooflines" (the checker, from the Goutam1962 sets only — the "Temple of
   * Radha Ballabh 01-53" set is Banke Bihari and nothing is taken from it).
   * Its court is the white roof the satellite shows south of the old temple;
   * everything else about it is INFERRED.
   */
  const TX0 = -28.1, TX1 = -9.6, TZ0 = -10.9, TZ1 = 14.2;      // the block, off the satellite
  const CX0 = -25.6, CX1 = -12.1, CZ0 = -4.6, CZ1 = 6.2;       // the court, under the white roof
  const TCX = (CX0 + CX1) / 2;                                  // the axis through the sanctum
  const yT = topOf(TX0, TX1, TZ0, TZ1, 4);
  const FLT = yT + 0.45;
  const G1 = FLT + 4.2, G2 = FLT + 7.6;                         // gallery floor, roof
  const WT = 0.5;
  const SZ1 = CZ0 - 2.2, SZ0 = TZ0 + WT;            // the sanctum range, behind the court's west arcade
  const SFL = FLT + 0.9;                            // the sanctum's platform
  {
    // the floor, and something to stand on
    box((TX0 + TX1) / 2, yT - 0.2, (TZ0 + TZ1) / 2, TX1 - TX0, FLT - yT + 0.2, TZ1 - TZ0, 0xd9d4c8);
    // to the wall's outer face and no further: past it, it lay over the top
    // two treads and you walked down the steps at floor height (steps.mjs)
    solid((TX0 + TX1) / 2, (TZ0 + TZ1) / 2, TX1 - TX0 - 0.2, TZ1 - TZ0, 0, { top: FLT, tag: 'temple-floor', floor: true });
    // the chequer in the court, on the diagonal
    const e = 0.42;
    for (let clz = CZ0 + e; clz < CZ1; clz += 2 * e) {
      for (let clx = CX0 + e; clx < CX1; clx += 2 * e) {
        const y = FLT + 0.012;
        lq([clx - e, y, clz], [clx, y, clz + e], [clx + e, y, clz], [clx, y, clz - e], C.CHQ_B);
      }
    }
    // chevrons down the arcades, black on white
    for (let lz = CZ0 - 1.6; lz < CZ1 + 1.6; lz += 0.9) {
      for (const cx of [CX0 - 1.1, CX1 + 1.1]) {
        const y = FLT + 0.012;
        lq2([cx - 0.5, y, lz], [cx, y, lz + 0.3], [cx, y, lz + 0.45], [cx - 0.5, y, lz + 0.15], C.CHQ_B);
        lq2([cx, y, lz + 0.3], [cx + 0.5, y, lz], [cx + 0.5, y, lz + 0.15], [cx, y, lz + 0.45], C.CHQ_B);
      }
    }
  }
  // ---- the outer walls: geru, two storeys, flat-roofed ----
  {
    const H = G2 + 0.9 - FLT;
    box(TX1 - WT / 2, FLT, (TZ0 + TZ1) / 2, WT, H, TZ1 - TZ0, C.GERU);          // north, to the passage
    box(TX0 + WT / 2, FLT, (TZ0 + TZ1) / 2, WT, H, TZ1 - TZ0, C.GERU);          // south
    box((TX0 + TX1) / 2, FLT, TZ0 + WT / 2, TX1 - TX0, H, WT, C.GERU);          // west, behind the sanctum
    solid(TX1 - WT / 2, (TZ0 + TZ1) / 2, WT, TZ1 - TZ0, 0, { top: G2 + 0.9 });
    solid(TX0 + WT / 2, (TZ0 + TZ1) / 2, WT, TZ1 - TZ0, 0, { top: G2 + 0.9 });
    solid((TX0 + TX1) / 2, TZ0 + WT / 2, TX1 - TX0, WT, 0, { top: G2 + 0.9 });
    // the east front, on the ghera's court, with its gateway on the axis
    const GW = 2.6;
    for (const [a, c2] of [[TX0, TCX - GW / 2], [TCX + GW / 2, TX1]]) {
      box((a + c2) / 2, FLT, TZ1 - WT / 2, c2 - a, H, WT, C.GERU);
      solid((a + c2) / 2, TZ1 - WT / 2, c2 - a, WT, 0, { top: G2 + 0.9 });
    }
    box(TCX, FLT + 3.6, TZ1 - WT / 2, GW + 0.1, H - 3.6, WT, C.GERU);
    const gq = p(TCX, TZ1 - WT / 2);
    cuspedArch(b, gq[0], FLT, gq[1], GW, 3.6, WT + 0.2, rot, C.SAND, 7, null);
    // a salmon-and-cream band and parapet along the top, all round
    for (const [cx, cz, w, d] of [[TX1, (TZ0 + TZ1) / 2, 0.3, TZ1 - TZ0], [TX0, (TZ0 + TZ1) / 2, 0.3, TZ1 - TZ0],
      [(TX0 + TX1) / 2, TZ1, TX1 - TX0, 0.3], [(TX0 + TX1) / 2, TZ0, TX1 - TX0, 0.3]]) {
      box(cx, G2 + 0.4, cz, w + 0.2, 0.2, d + 0.2, C.CREAM);
      box(cx, G2 + 0.9, cz, w, 0.35, d, C.SAND);
    }
    // the east front's face: shuttered windows either side of the gate
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const lx = TCX + sd * (3.4 + k * 3.2);
        const q = p(lx, TZ1 + 0.01);
        b.panel(q[0], FLT + 1.9, q[1], 1.3, 1.9, C.WOOD, faceR(F.E), 0.02);
        b.panel(q[0], G1 + 1.5, q[1], 1.1, 1.5, C.WOOD, faceR(F.E), 0.02);
      }
    }
    // three steps up from the ghera's court into the gateway
    // treads deeper than a body's radius (0.42 m), or standing on the bottom
    // one you are still over the one above it and never get down (steps.mjs)
    const N = 3, RISE = (FLT - yT) / N, TR = 0.45;
    for (let i = 0; i < N; i++) {
      const lz = TZ1 + (N - i) * TR - TR / 2;            // the top tread meets the threshold
      box(TCX, yT - 0.1, lz, GW + 0.8, (i + 1) * RISE + 0.1, TR, C.SAND);
      solid(TCX, lz, GW + 0.8, TR, 0, { top: yT + (i + 1) * RISE, tag: 'rv-temple-steps', standOnly: true });
    }
  }
  // ---- the arcade round the court: carved sandstone piers, cusped arches ----
  {
    const pier = (lx, lz) => {
      box(lx, FLT, lz, 0.62, 0.5, 0.62, C.SAND);
      box(lx, FLT + 0.5, lz, 0.46, 2.45, 0.46, tint(C.SAND, 1.04));
      box(lx, FLT + 2.95, lz, 0.64, 0.25, 0.64, C.SAND);
      post(lx, lz, 0.33, { top: G1 });
    };
    const along = (x0, z0, x1, z1, n, alongZ) => {
      for (let i = 0; i <= n; i++) pier(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n);
      for (let i = 0; i < n; i++) {
        const mx = x0 + (x1 - x0) * (i + 0.5) / n, mz = z0 + (z1 - z0) * (i + 0.5) / n;
        const span = Math.hypot(x1 - x0, z1 - z0) / n - 0.5;
        const q = p(mx, mz);
        cuspedArch(b, q[0], FLT + 2.2, q[1], span, 1.9, 0.46, alongZ ? rot + Math.PI / 2 : rot, C.SAND, 5, null);
      }
      // the band over the arcade, the gallery's jali balustrade, a valance
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0) + 0.6;
      box(cx, FLT + 4.1, cz, alongZ ? 0.6 : L, 0.3, alongZ ? L : 0.6, C.SAND);
      box(cx, G1 + 0.3, cz, alongZ ? 0.14 : L, 0.8, alongZ ? L : 0.14, 0xc9906e);
      box(cx, FLT + 3.75, cz, alongZ ? 0.06 : L, 0.3, alongZ ? L : 0.06, 0xb0283a);      // red valance
      const nS = Math.round(L / 0.45);
      for (let k = 0; k < nS; k++) {
        const t = -L / 2 + (k + 0.5) * (L / nS);
        const sx = alongZ ? cx : cx + t, sz = alongZ ? cz + t : cz;
        box(sx, FLT + 3.6, sz, alongZ ? 0.06 : 0.2, 0.16, alongZ ? 0.2 : 0.06, C.GOLD);   // its gold scallops
      }
    };
    along(CX1, CZ0, CX1, CZ1, 4, true);     // the north side of the court
    along(CX0, CZ0, CX0, CZ1, 4, true);     // the south
    along(CX0, CZ1, CX1, CZ1, 5, false);    // the east, the gateway's side
    // the arcade's back walls: geru panels in sandstone frames
    for (const [wx, face] of [[TX1 - WT - 0.01, F.S], [TX0 + WT + 0.01, F.N]]) {
      for (let k = 0; k < 4; k++) {
        const lz = CZ0 + (k + 0.5) * ((CZ1 - CZ0) / 4);
        const q = p(wx, lz);
        b.panel(q[0], FLT + 1.9, q[1], 2.0, 2.8, tint(C.GERU, 0.9), faceR(face), 0.02);
        b.panel(q[0], FLT + 1.9, q[1], 1.3, 2.1, C.WOOD, faceR(face), 0.04);        // a shuttered room
      }
    }
    // the gallery's floor over the arcades, and its roof: a ring round the
    // court at both levels, and the sanctum range roofed at the top
    const inner = [
      [(CX1 + TX1 - WT) / 2, (SZ1 + TZ1 - WT) / 2, (TX1 - WT) - CX1, (TZ1 - WT) - SZ1],   // north arcade
      [(TX0 + WT + CX0) / 2, (SZ1 + TZ1 - WT) / 2, CX0 - (TX0 + WT), (TZ1 - WT) - SZ1],   // south arcade
      [TCX, (CZ1 + TZ1 - WT) / 2, CX1 - CX0, (TZ1 - WT) - CZ1],                           // east, over the gateway hall
      [TCX, (SZ1 + CZ0) / 2, CX1 - CX0, CZ0 - SZ1],                                        // west, before the sanctum
    ];
    for (const [cx, cz, w, d] of inner) {
      box(cx, G1 - 0.1, cz, w, 0.3, d, 0xd8c7a6);
      box(cx, G2, cz, w, 0.25, d, 0xd8c7a6);
    }
    box(TCX, G2, (TZ0 + WT + SZ1) / 2, (TX1 - WT) - (TX0 + WT), 0.25, SZ1 - (TZ0 + WT), 0xd8c7a6);
    // the white roof over the court, on a light frame
    box(TCX, G2 + 0.55, (CZ0 + CZ1) / 2, CX1 - CX0 + 2.2, 0.06, CZ1 - CZ0 + 2.4, C.SHEET);
    for (const lz of [CZ0 - 0.8, (CZ0 + CZ1) / 2, CZ1 + 0.8]) box(TCX, G2 + 0.45, lz, CX1 - CX0 + 2.0, 0.1, 0.1, 0x6f716e);
    // marigold strings and paper lanterns across the court
    for (let k = 0; k < 4; k++) {
      const lz = CZ0 + (k + 0.5) * ((CZ1 - CZ0) / 4);
      for (let t = 0; t < 22; t++) {
        const lx = CX0 + (t + 0.5) * ((CX1 - CX0) / 22);
        const sag = Math.sin(Math.PI * (t + 0.5) / 22) * 0.6;
        box(lx, G1 - 0.1 - sag, lz, 0.1, 0.1, 0.1, t % 2 ? 0xf08a1c : 0xf5b72a);
      }
      const q = p(TCX + (k % 2 ? 2.2 : -2.2), lz);
      b.box(q[0], G1 - 1.1, q[1], 0.36, 0.45, 0.36, [0xc8302a, 0xe8c040, 0x2f6f4f, 0x7a4a86][k], rot);
    }
  }
  // ---- the sanctum, at the court's west end ----
  /*
   * Radhavallabh Lal alone, black, dressed; Radha is present as her golden
   * crown, chhatra and red velvet gaddi on his left (docs/research/deities/
   * single-deity.md: "Never add a Radha figure"). What the figures look like
   * is content/altars.js's; where the sanctum's opening is and how it is
   * framed is INFERRED — the photographs that show a silver-sheathed triple
   * arch are Banke Bihari's, and nothing is taken from them.
   */
  {
    const OPW = 4.2, SW2 = 6.6;
    // its front wall on the court, one wide opening with carved doors open
    for (const sd of [-1, 1]) {
      const w = (CX1 - CX0) / 2 + 2.0 - OPW / 2;
      const cx = TCX + sd * (OPW / 2 + w / 2);
      box(cx, FLT, SZ1, w, G2 + 0.9 - FLT, 0.5, C.GERU);
      solid(cx, SZ1, w, 0.5, 0, { top: G2 + 0.9 });
    }
    box(TCX, FLT + 4.0, SZ1, OPW + 0.1, G2 + 0.9 - FLT - 4.0, 0.5, C.GERU);
    const oq = p(TCX, SZ1 + 0.26);
    cuspedArch(b, oq[0], FLT + 0.2, oq[1], OPW, 3.8, 0.2, rot, C.GOLD, 7, null);
    for (const sd of [-1, 1]) box(TCX + sd * (OPW / 2 + 0.05), FLT, SZ1 + 0.55, 0.08, 3.5, 1.0, C.WOOD);    // the leaves, open
    // the platform he stands on, and three steps up to it from the arcade
    box(TCX, FLT, (SZ0 + SZ1) / 2, SW2, SFL - FLT, SZ1 - SZ0, 0xece6da);
    solid(TCX, (SZ0 + SZ1) / 2, SW2, SZ1 - SZ0, 0, { top: SFL + 0.9 });   // the altar is not walked on
    // its back: a gilt and red frame behind him, and lamps
    const bq = p(TCX, SZ0 + 0.02);
    b.panel(bq[0], SFL + 1.8, bq[1], 3.6, 3.2, C.GOLD, faceR(F.E), 0.01);
    b.panel(bq[0], SFL + 1.7, bq[1], 3.0, 2.7, 0x7a1a14, faceR(F.E), 0.02);
    // the silver-and-gold throne and its canopy
    box(TCX, SFL, SZ0 + 1.3, 2.4, 0.5, 1.4, 0xd8d4cc);
    box(TCX, SFL + 0.5, SZ0 + 1.0, 2.2, 0.1, 1.0, C.GOLD);
    for (const sd of [-1, 1]) box(TCX + sd * 1.05, SFL + 0.5, SZ0 + 1.6, 0.1, 2.4, 0.1, C.GOLD);
    box(TCX, SFL + 2.9, SZ0 + 1.3, 2.4, 0.16, 1.2, C.GOLD);
    // the chhatra over Radha's gaddi, on his left (+lx: he faces east)
    const q2 = p(TCX + 0.55, SZ0 + 1.1);
    b.box(q2[0], SFL + 1.9, q2[1], 0.04, 0.5, 0.04, C.GOLD, rot);
    b.prism(q2[0], SFL + 2.4, q2[1], 0.55, 0.55, 0.05, 0.05, 0.2, 0xc8302a);
    // lamps either side
    for (const sd of [-1, 1]) {
      box(TCX + sd * 1.8, SFL, SZ0 + 1.8, 0.22, 1.2, 0.22, C.GOLD);
      box(TCX + sd * 1.8, SFL + 1.2, SZ0 + 1.8, 0.3, 0.08, 0.3, 0xffd27a);
    }
  }
  // the deity, from the shared altar table. buildDeities spreads a group along
  // (cos rot, sin rot); facing east, his LEFT is +lx, and altars.js's
  // crownBeside is -0.5, so hand it the frame turned half round, which puts
  // Radha's crown on his left as the sources and the table both intend
  const ALT = p(TCX, SZ0 + 1.25);
  if (buildDeities) buildDeities(b, { ...loc, rot: rot + Math.PI }, SFL + 0.5 - 1.15, ALT);

  // pilgrims in the court, taking darshan; offerings go to the hundi
  if (buildStanding && place) {
    for (const [lx, lz, k] of [[TCX - 2.4, CZ0 + 1.6, 1], [TCX + 1.8, CZ0 + 2.4, 3], [TCX - 0.6, CZ0 + 3.4, 5]]) {
      const t = PEOPLE[(k + Math.floor(rng() * 3)) % PEOPLE.length];
      place(buildStanding(t, 'down'), lx, FLT, lz, F.W + (rng() - 0.5) * 0.4);
      post(lx, lz, 0.3, { top: FLT + 1.7 });
    }
    // the hundi before the sanctum
    box(TCX + 2.6, FLT, SZ1 + 1.2, 0.6, 0.9, 0.5, 0x4a4a46);
    solid(TCX + 2.6, SZ1 + 1.2, 0.6, 0.5, 0, { top: FLT + 0.9 });
  }

  /* ================================================================
   * THE GHERA: the court, the street gate, the other temples
   * ================================================================ */
  /*
   * "The two temples stand in a compound called Radhavallabh Ghera, which is
   * entered through a gateway in a street ... Also in the Ghera are the
   * Calcuttawala temple and the small but popular Anandi Bai ka Mandir"
   * (Entwistle). The street gate itself, off "2022 01": "a red/vermilion
   * painted arch set flush in a run of rolling shop shutters, a yellow-ground
   * Hindi signboard across the arch head reading 'विराजमान राधावल्लभ लाल जू
   * महाराज', white line-drawn motifs, gold-ochre jamb strips, coloured painted
   * flowers, and a corrugated/mesh canopy", and over it a floodlight. Which
   * street it is on is not settled; the lane along the old temple's north
   * wall, at the court's corner, is INFERRED. So are where the two other
   * temples stand and what they look like.
   */
  const GZ0 = 14.2, GZ1 = 31.0, GX0 = TX0, GX1 = 3.7;      // the court
  const LANE = NW + 1.35;                                    // the lane's near side
  {
    // stone flags, laid in runs at the ground under them, and walked on
    const T = 2.0;
    for (let lz = GZ0 + T / 2; lz < GZ1; lz += T) {
      let run = null;
      const flush = () => {
        if (!run) return;
        const cx = (run.x0 + run.x1) / 2;
        box(cx, run.top - 0.3, lz, run.x1 - run.x0, 0.3, T, C.FLAG);
        solid(cx, lz, run.x1 - run.x0, T, 0, { top: run.top, tag: 'rv-paving', standOnly: true });
        run = null;
      };
      for (let lx = GX0 + T / 2; lx < GX1; lx += T) {
        const inOld = lz < EZ + 1.6 && lx > -NW - 0.4;                       // the old temple and its steps
        const inNew = lz < TZ1 + 1.5 && lx < TX1 + 0.1;                      // the living temple and its steps
        if (inOld || inNew) { flush(); continue; }
        const top = topOf(lx - T / 2, lx + T / 2, lz - T / 2, lz + T / 2, 1) + 0.04;
        if (run && Math.abs(top - run.top) < 0.03) { run.x1 = lx + T / 2; run.top = Math.max(run.top, top); }
        else { flush(); run = { x0: lx - T / 2, x1: lx + T / 2, top }; }
      }
      flush();
    }
    // and the passage between the two temples, flagged too
    for (let lz = -9.0; lz < GZ0 + 3.6; lz += 2.0) {
      const lx = (TX1 + (-NW - 0.3)) / 2, w = (-NW - 0.3) - TX1;
      const top = topOf(TX1, -NW - 0.3, lz - 1, lz + 1, 1) + 0.04;
      box(lx, top - 0.3, lz, w, 0.3, 2.0, C.FLAG);
      solid(lx, lz, w, 2.0, 0, { top, tag: 'rv-paving', standOnly: true });
    }
  }
  // ---- the shops along the lane, and the gate among them ----
  const GATE_Z = 24.6, GATE_W = 2.2, GATE_H = 3.2;
  {
    const SH0 = GX1, SH1 = LANE;                   // shop depth, court to lane
    const shops = [[EZ + 0.4, GATE_Z - GATE_W / 2 - 0.35], [GATE_Z + GATE_W / 2 + 0.35, GZ1]];
    const cols = [0x7a7f7c, 0x5d6e7a, 0x8a6a4a, 0x6a7a5a];
    let k = 0;
    for (const [z0, z1] of shops) {
      const n = Math.max(1, Math.round((z1 - z0) / 2.8));
      const w = (z1 - z0) / n;
      for (let i = 0; i < n; i++) {
        const cz = z0 + (i + 0.5) * w, cx = (SH0 + SH1) / 2;
        const y = topOf(SH0, SH1, cz - w / 2, cz + w / 2, 2);
        box(cx, y - 0.1, cz, SH1 - SH0, 3.6, w - 0.06, 0xd9c9a4);
        box(cx, y + 3.5, cz, SH1 - SH0 + 0.2, 0.2, w + 0.1, 0xc28a5a);
        // its rolling shutter on the lane, some up, some down
        const up = (k + i) % 3 !== 0;
        box(SH1 + 0.02, y + (up ? 2.3 : 0.05), cz, 0.06, up ? 0.5 : 2.6, w - 0.5, cols[(k + i) % cols.length]);
        if (up) {
          const q = p(SH1 + 0.02, cz);
          b.panel(q[0], y + 1.15, q[1], w - 0.6, 2.2, 0x2f2a26, faceR(F.N), 0.02);
        }
        if (SIGN) sign([SIGN.PUJA, SIGN.PRASAD, SIGN.CLOTH, SIGN.PHOTO, SIGN.GARLANDS][(k + i) % 5], SH1 + 0.06, y + 3.05, cz, w - 0.5, 0.5, F.N);
        solid(cx, cz, SH1 - SH0, w - 0.06, 0, { top: y + 3.8 });
      }
      k += n;
    }
    // the gate: a vermilion arch, flush in the row
    const y = tH(SH1, GATE_Z);
    for (const sd of [-1, 1]) {
      const jz = GATE_Z + sd * (GATE_W / 2 + 0.18);
      box((SH0 + SH1) / 2, y - 0.1, jz, SH1 - SH0, GATE_H + 0.9, 0.36, C.VERM);
      box(SH1 + 0.03, y, jz, 0.05, GATE_H, 0.14, C.OCHRE);                         // the gold-ochre jamb strip
      solid((SH0 + SH1) / 2, jz, SH1 - SH0, 0.36, 0, { top: y + GATE_H + 0.8 });
      // painted flowers and white line-lotus on the jambs
      for (let f2 = 0; f2 < 3; f2++) {
        const q = p(SH1 + 0.04, jz);
        b.panel(q[0], y + 0.8 + f2 * 0.8, q[1], 0.26, 0.26, [C.LOTUS, 0xe8c040, 0x3f8a4a][f2], faceR(F.N), 0.02);
      }
    }
    // the round head, the wall over it, the yellow board across it
    {
      const R0 = GATE_W / 2, R1 = GATE_W / 2 + 0.34, SPR = y + GATE_H - R0, SEG = 12;
      const P = (a, r, lx) => [lx, SPR + Math.sin(a) * r, GATE_Z - Math.cos(a) * r];
      for (let s2 = 0; s2 < SEG; s2++) {
        const a0 = Math.PI * s2 / SEG, a1 = Math.PI * (s2 + 1) / SEG;
        for (const lx of [SH0, SH1 + 0.02]) lq2(P(a0, R0, lx), P(a0, R1, lx), P(a1, R1, lx), P(a1, R0, lx), C.VERM);
        lq2(P(a0, R0, SH0), P(a0, R0, SH1 + 0.02), P(a1, R0, SH1 + 0.02), P(a1, R0, SH0), C.VERM_SH);
      }
      // the wall between the curve and the head, both faces, so the arch is
      // an opening in a wall and not a hoop in the air
      const TOPY = y + GATE_H + 0.3;
      for (let s2 = 0; s2 < SEG; s2++) {
        const a0 = Math.PI * s2 / SEG, a1 = Math.PI * (s2 + 1) / SEG;
        for (const lx of [SH0, SH1 + 0.02]) {
          const A = P(a0, R1, lx), B = P(a1, R1, lx);
          lq2(A, [lx, TOPY, A[2]], [lx, TOPY, B[2]], B, C.VERM);
        }
      }
      box((SH0 + SH1) / 2, y + GATE_H + 0.3, GATE_Z, SH1 - SH0, 0.6, GATE_W + 0.7, C.VERM);
      sign('rv-gate', SH1 + 0.08, y + GATE_H + 0.52, GATE_Z, GATE_W + 0.6, 0.55, F.N);
      // the canopy out over the lane, and the floodlight
      box(SH1 + 0.6, y + GATE_H + 0.95, GATE_Z, 1.2, 0.06, GATE_W + 1.4, 0x8d918c);
      box(SH1 + 0.1, y + GATE_H + 1.2, GATE_Z, 0.2, 0.3, 0.4, 0x3a3d3a);
    }
  }
  // ---- the ghera's other walls: the backs of the houses round it ----
  {
    const walls = [
      [GX0 - 0.25, (GZ0 + GZ1) / 2, 0.5, GZ1 - GZ0 + 0.5],                // south
      [(GX0 + LANE) / 2, GZ1 + 0.25, LANE - GX0, 0.5],                     // east
    ];
    for (const [cx, cz, w, d] of walls) {
      const y = topOf(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 2) - 0.1;
      box(cx, y, cz, w, 4.2, d, 0xd6c29a);
      box(cx, y + 4.2, cz, w + 0.1, 0.2, d + 0.1, 0xb98f64);
      solid(cx, cz, w, d, 0, { top: y + 4.4 });
    }
  }
  // ---- the two other temples in the ghera, on its east side ----
  for (const [lx, key] of [[-4.0, 'anandi'], [-17.0, 'calcutta']]) {
    const lz = GZ1 - 2.4, W = 5.0, D = 4.2;
    const y = topOf(lx - W / 2, lx + W / 2, lz - D / 2, lz + D / 2, 2);
    box(lx, y - 0.1, lz, W + 0.6, 0.7, D + 0.6, 0xd8cfbb);                  // plinth
    box(lx, y + 0.6, lz, W, 3.8, D, 0xf0e6cf);
    box(lx, y + 4.4, lz, W + 0.3, 0.25, D + 0.3, 0xc28a5a);
    box(lx, y + 4.65, lz, W, 0.5, D, 0xf0e6cf);
    const q = p(lx, lz - D / 2 - 0.02);
    cuspedArch(b, q[0], y + 0.6, q[1], 1.6, 2.6, 0.2, rot, 0xc28a5a, 5, 0x2a1d14);
    sign(key, lx, y + 3.7, lz - D / 2 - 0.05, 3.0, 0.62, F.W);
    // a small kalash on the roof
    box(lx, y + 5.15, lz, 0.5, 0.3, 0.5, C.GOLD);
    box(lx, y + 5.45, lz, 0.2, 0.5, 0.2, C.GOLD);
    solid(lx, lz, W + 0.6, D + 0.6, 0, { top: y + 5.2 });
  }
  // ---- the range behind, west of the living temple and south of the stump ----
  {
    const X0 = TX0, X1 = -NW - 0.7, Z0 = -EZ - 1.6, Z1 = TZ0;
    const y = topOf(X0, X1, Z0, Z1, 3);
    box((X0 + X1) / 2, y - 0.1, (Z0 + Z1) / 2, X1 - X0, 7.4, Z1 - Z0, 0xcdb48e);
    box((X0 + X1) / 2, y + 7.3, (Z0 + Z1) / 2, X1 - X0 + 0.2, 0.2, Z1 - Z0 + 0.2, 0xb98f64);
    solid((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, 0, { top: y + 7.5 });
  }
  return {
    // the living temple's court is the place's interior; its altar and where
    // a pilgrim stands to take darshan
    altar: { lx: TCX, lz: SZ0 + 1.25, y: SFL + 1.35 },
    darshan: { lx: TCX, lz: CZ0 + 1.4 },
    hall: { lx0: TX0 + WT, lx1: TX1 - WT, lz0: SZ1 - 0.3, lz1: TZ1 - WT, door: [TCX, TZ1 + 1.6] },
    FL: FLT,
    rooms,
    // the keep-out: the ghera and both temples, to the lane's near side
    compound: { lx0: TX0 - 0.6, lx1: LANE - 0.05, lz0: -EZ - 1.8, lz1: GZ1 + 0.8 },
  };
}
