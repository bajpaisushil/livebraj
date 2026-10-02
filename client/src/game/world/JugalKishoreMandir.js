/**
 * SHRI JUGAL KISHOR MANDIR, Kesi Ghat (ASI N-UP-A196, 1627): a two-cell
 * red-sandstone ruin — a flat-roofed ardha-mandap, and behind it an
 * octagonal shrine whose angles are broken until it reads round, under a
 * steep near-conical sikhara crowned by an amalaka. The nave is gone; the
 * building is empty and locked; its tower is the Kesi Ghat skyline.
 *
 * Built from docs/research/jugal-kishore.md, the survey and its checker, where
 * the checker overrules the survey. What stood here was a 25 ft cube with a
 * tower on a guessed profile.
 *
 * WHERE: ESRI z19 imagery (MEASUREMENT only), whose edge scan finds the
 * building's south and north faces at world z -765.4 and -775.9 — 10.5 m,
 * the plan's 9.5 m octagon on its plinth — on an east-west axis, its
 * masonry running to x ~819 and its steps to ~823. That puts the building
 * 6 m south-east of OSM node 7288063975 (good to +-20-30 m by the survey's
 * own reckoning), and this builder's origin at the centre of the masonry.
 *
 * THE FRAME: rot -PI/2, so +lx is NORTH and +lz is EAST, the front.
 *
 * DIMENSIONS are the 1910 ASI plan's (Fergusson & Burgess p.158): the
 * ardha-mandap 17 ft 6 in square inside with 5 ft 9 in walls, the shrine
 * octagon ~9.5 m across the flats, 18.1 m of masonry east to west, a 2.6 m
 * platform stub where the porch was. The sikhara is the survey's profile off
 * the 2015 river photograph, corrected by the checker: a straight drum with
 * projecting rings to 4 m above the mandap roof, three string courses, a fast
 * shoulder to the neck, roll mouldings BETWEEN neck and amalaka, the amalaka
 * flat (3.7 m across, 0.8 m deep, 26 ribs) under a low cap. Nothing above it.
 */

/** Colours: the checker's samples of this tower (H 0-5, S ~40, V ~40). */
const C = {
  STONE: 0x6e4140, STONE_LT: 0x7d4a44, STONE_DK: 0x553436,
  RUBBLE: 0x797269,     // the exposed core, a warm grey, not red
  DARK: 0x1c1412, WOOD: 0x3e2a1c, IRON: 0x2a2826,
  PLINTH: 0x7a4c45,
};
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function buildJugalKishoreMandir(o) {
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
  /*
   * A panel on a face, `face` its outward side, in this frame (+lx north, +lz
   * east). A quad run lo-hi-hi-lo from A to B faces up x (B - A), and here
   * up x (+lx) is -lz: an east face runs toward -lx, west toward +lx, north
   * toward +lz, south toward -lz.
   */
  const panel = (lx, y, lz, w, h, face, col) => {
    const y0 = y - h / 2, y1 = y + h / 2, hw = w / 2;
    const [A, B] = face === 'E' ? [[lx + hw, lz], [lx - hw, lz]] : face === 'W' ? [[lx - hw, lz], [lx + hw, lz]]
      : face === 'N' ? [[lx, lz - hw], [lx, lz + hw]] : [[lx, lz + hw], [lx, lz - hw]];
    lq([A[0], y0, A[1]], [A[0], y1, A[1]], [B[0], y1, B[1]], [B[0], y0, B[1]], col);
  };
  const arch = (lx, y0, lz, w, h, along, color, lobes, shade, depth = 0.1) => {
    const q = p(lx, lz);
    cuspedArch(b, q[0], y0, q[1], w, h, depth, along === 'x' ? rot : rot + Math.PI / 2, color, lobes, shade);
  };
  const lathe = (cx, cz, rings, segs, color, rf = () => 1) => {
    for (let i = 1; i < rings.length; i++) {
      const [y0, r0] = rings[i - 1], [y1, r1] = rings[i];
      for (let s = 0; s < segs; s++) {
        const a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2, f0 = rf(a0), f1 = rf(a1);
        lq([cx + Math.cos(a0) * r0 * f0, y0, cz + Math.sin(a0) * r0 * f0], [cx + Math.cos(a0) * r1 * f0, y1, cz + Math.sin(a0) * r1 * f0],
          [cx + Math.cos(a1) * r1 * f1, y1, cz + Math.sin(a1) * r1 * f1], [cx + Math.cos(a1) * r0 * f1, y0, cz + Math.sin(a1) * r0 * f1],
          typeof color === 'function' ? color(i, s) : color);
      }
    }
  };

  /* ---- levels ---- */
  const yG = topOf(-5.4, 5.4, -9.6, 14.5, 4);
  const FL = yG + 1.1;                   // the plinth top (UNKNOWN in any source; four to six courses)
  const RING = FL + 8.4;                 // the mandap roof: h = 0 of the sikhara profile
  const SC = { lx: 0, lz: -4.25 };       // the shrine's centre
  const RF = 4.75;                       // its apothem: 9.5 m across the flats
  const MZ0 = 0.3, MZ1 = 9.1, MHW = 4.42, MT = 1.75;   // the mandap: 8.84 m outside, 1.75 m walls
  const PZ1 = MZ1 + 2.6;                 // the platform stub of the lost porch

  /* ---- the plinth: stepped mouldings round the whole building ---- */
  {
    const courses = 5, ch = (FL - yG + 0.25) / courses;
    for (let k = 0; k < courses; k++) {
      const inset = 0.5 - k * 0.1, y = yG - 0.25 + k * ch;
      box(0, y, (-4.25 - RF - 0.6 + PZ1) / 2, MHW * 2 + 1.0 + inset, ch, PZ1 - (-4.25 - RF - 0.6) + inset, k % 2 ? C.PLINTH : tint(C.PLINTH, 0.9));
    }
    // the plinth is not walked into from the lane; the platform and the steps are its way up
    solid(0, (-4.25 - RF - 0.6 + MZ1) / 2, MHW * 2 + 1.5, MZ1 - (-4.25 - RF - 0.6), { top: FL });
    solid(0, (MZ1 + PZ1) / 2, MHW * 2 + 1.5, PZ1 - MZ1, { top: FL, tag: 'jk-platform', floor: true });
  }
  // the axial flight east from the platform, five risers (the checker, from the 1910 plan)
  {
    const N = 6, RISE = (FL - yG) / N;
    for (let st = 0; st < N - 1; st++) {
      const lz = PZ1 + (N - 2 - st) * 0.45 + 0.225, top = yG + RISE * (st + 1);
      box(0, yG - 0.1, lz, 3.2, top - yG + 0.1, 0.45, st % 2 ? C.PLINTH : tint(C.PLINTH, 0.92));
      solid(0, lz, 3.2, 0.45, { top, tag: 'jk-steps', standOnly: true });
    }
    // and the smaller flight on the north flank, seen in the autotype
    for (let st = 0; st < N - 1; st++) {
      const lx = MHW + 0.75 + (N - 2 - st) * 0.45 + 0.225, top = yG + RISE * (st + 1);
      box(lx, yG - 0.1, 5.0, 0.45, top - yG + 0.1, 1.6, tint(C.PLINTH, st % 2 ? 1 : 0.92));
    }
  }

  /* ---- the ardha-mandap ---- */
  const MTOP = FL + 7.6;
  {
    // four walls of ashlar in courses, the doorways cut through
    const course = (k) => (hash(k) < 0.2 ? C.STONE_LT : hash(k) > 0.85 ? C.STONE_DK : tint(C.STONE, 0.95 + 0.1 * hash(k + 3)));
    const coursed = (lx, lz, w, d, y0, y1, k0) => { let i = 0; for (let y = y0; y < y1 - 1e-3; y += 0.6, i++) box(lx, y, lz, w, Math.min(0.6, y1 - y), d, course(k0 + i)); };
    const DW = 1.45, DH = 3.0;                       // the east door
    // east wall
    for (const s of [-1, 1]) coursed(s * (DW / 2 + (MHW - DW / 2) / 2), MZ1 - MT / 2, MHW - DW / 2, MT, FL - 0.1, MTOP, 10 + s);
    coursed(0, MZ1 - MT / 2, DW, MT, FL + DH, MTOP, 30);
    // west wall (the junction with the shrine), north and south walls with their small doors
    coursed(0, MZ0 + MT / 2, MHW * 2, MT, FL - 0.1, MTOP, 40);
    const SDW = 1.05, SDZ = (MZ0 + MZ1) / 2;
    for (const s of [-1, 1]) {
      const lx = s * (MHW - MT / 2);
      for (const [a, c] of [[MZ0 + MT, SDZ - SDW / 2], [SDZ + SDW / 2, MZ1 - MT]]) coursed(lx, (a + c) / 2, MT, c - a, FL - 0.1, MTOP, 50 + s * 7 + a);
      coursed(lx, SDZ, MT, SDW, FL + 2.4, MTOP, 70 + s);
      // the door shut; the hood over it on eight closely set brackets carved as elephants
      const fx = s * MHW, face = s > 0 ? 'N' : 'S';
      panel(fx + s * 0.02, FL + 1.2, SDZ, SDW, 2.4, face, C.WOOD);
      box(fx + s * 0.24, FL + 2.75, SDZ, 0.5, 0.16, 2.38, tint(C.STONE, 1.08));
      for (let i = 0; i < 8; i++) {
        const q = p(fx + s * 0.18, SDZ - 1.0 + i * 0.285);
        b.prism(q[0], FL + 2.4, q[1], 0.12, 0.1, 0.36, 0.14, 0.35, tint(C.STONE, 1.05), rot);
      }
      // two small framed panels on each flank
      for (const lz of [MZ0 + MT + 0.6, MZ1 - MT - 0.6]) panel(fx + s * 0.02, FL + 2.2, lz, 0.55, 0.75, face, tint(C.STONE, 0.7));
    }
    solid(0, (MZ0 + MZ1) / 2, MHW * 2, MZ1 - MZ0, { top: MTOP + 1.4 });
    // the roof: a low slab, slightly ridged, behind a plain parapet
    box(0, MTOP + 0.8, (MZ0 + MZ1) / 2, MHW * 2 - 0.6, 0.3, MZ1 - MZ0 - 0.6, tint(C.STONE, 0.9));
    box(0, MTOP + 1.1, (MZ0 + MZ1) / 2 - 0.6, MHW * 2 - 1.6, 0.15, MZ1 - MZ0 - 2.0, tint(C.STONE, 0.86));
    // the cornice zone: a bold moulded cornice on a bead-and-dentil course, a
    // frieze of pendant leaf drops, a band of small arched niches with figures
    box(0, MTOP, (MZ0 + MZ1) / 2, MHW * 2 + 0.7, 0.32, MZ1 - MZ0 + 0.7, tint(C.STONE, 1.05));
    box(0, MTOP - 0.12, (MZ0 + MZ1) / 2, MHW * 2 + 0.3, 0.12, MZ1 - MZ0 + 0.3, tint(C.STONE, 0.8));
    for (let i = 0; i < 16; i++) {
      for (const [lx, lz, face] of [[MHW + 0.36, MZ0 + 0.3 + i * 0.53, 'N'], [-MHW - 0.36, MZ0 + 0.3 + i * 0.53, 'S'], [-MHW + 0.3 + i * 0.53, MZ1 + 0.36, 'E']]) {
        const q = p(lx, lz);
        b.prism(q[0], MTOP - 0.36, q[1], 0.06, 0.06, 0.18, 0.18, 0.24, tint(C.STONE, 1.0), rot);
        if (i < 15) panel(lx - (face === 'N' ? 0.34 : face === 'S' ? -0.34 : 0), MTOP + 0.55, lz - (face === 'E' ? 0.34 : 0), 0.3, 0.36, face, tint(C.STONE, 0.62));
      }
    }
    box(0, MTOP + 0.32, (MZ0 + MZ1) / 2, MHW * 2 + 0.1, 0.5, MZ1 - MZ0 + 0.1, tint(C.STONE, 0.94));
    box(0, MTOP + 0.82, MZ1 - 0.15, MHW * 2, 0.55, 0.3, tint(C.STONE, 0.9));                 // the parapet
    for (const s of [-1, 1]) box(s * (MHW - 0.15), MTOP + 0.82, (MZ0 + MZ1) / 2, 0.3, 0.55, MZ1 - MZ0, tint(C.STONE, 0.9));

    /*
     * THE EAST FRONT. "The choir arch is an interesting composition with a
     * fan-light, so to speak, of pierced tracery in the head of the arch, and a
     * group above representing Krishna supporting the Gobardhan hill" (Growse
     * p.254). Under it, the doorway in its rosette-studded architrave with a
     * projecting hood and saw-tooth fringe (the checker), a little blind
     * arcade over the lintel, and two deep blind niches each side.
     */
    const EZ = MZ1 + 0.02;
    panel(0, FL + DH / 2, EZ, DW, DH, 'E', C.WOOD);                  // the sliding doors, shut and locked
    box(0.45, FL + 1.4, EZ + 0.05, 0.12, 0.2, 0.08, C.IRON);
    for (const s of [-1, 1]) {
      box(s * (DW / 2 + 0.15), FL, EZ + 0.06, 0.3, DH + 0.3, 0.12, tint(C.STONE, 1.08));
      for (let k = 0; k < 6; k++) {
        panel(s * (DW / 2 + 0.15), FL + 0.35 + k * 0.5, EZ + 0.13, 0.2, 0.2, 'E', tint(C.STONE, 1.25));
      }
      // two blind niches each side, ~0.75 x 1.75 m (the checker)
      for (const nx of [1.55, 2.75]) {
        arch(s * nx, FL + 0.6, EZ + 0.04, 0.75, 1.75, 'x', tint(C.STONE, 1.06), 3, tint(C.STONE, 0.55), 0.12);
      }
    }
    box(0, FL + DH, EZ + 0.06, DW + 0.6, 0.3, 0.12, tint(C.STONE, 1.08));
    for (let k = 0; k < 5; k++) panel(-0.7 + k * 0.35, FL + DH + 0.15, EZ + 0.13, 0.2, 0.2, 'E', tint(C.STONE, 1.25));
    // the hood over the door, its saw-tooth fringe
    box(0, FL + DH + 0.3, EZ + 0.25, DW + 1.1, 0.16, 0.5, tint(C.STONE, 1.04));
    for (let i = 0; i < 9; i++) {
      const q = p(-DW / 2 - 0.45 + i * (DW + 0.9) / 8, EZ + 0.48);
      b.prism(q[0], FL + DH + 0.08, q[1], 0.04, 0.04, 0.18, 0.08, 0.22, tint(C.STONE, 0.95), rot);
    }
    // the little blind arcade over it, seven units
    for (let k = 0; k < 7; k++) arch(-1.2 + k * 0.4, FL + DH + 0.5, EZ + 0.04, 0.32, 0.55, 'x', tint(C.STONE, 1.08), 3, tint(C.STONE, 0.6), 0.05);
    // THE GREAT ARCH: near-semicircular with a faint point, of voussoir blocks
    const SPR = FL + 4.6, AR = 2.5;
    const NV = 15;
    for (let i = 0; i < NV; i++) {
      const a0 = Math.PI * i / NV, a1 = Math.PI * (i + 1) / NV;
      const pnt = (a) => 1 + 0.06 * Math.sin(a);   // the faint point at the crown
      const P = (a, r) => [-Math.cos(a) * r, SPR + Math.sin(a) * r * pnt(a)];
      const [x0, y0] = P(a0, AR), [x1, y1] = P(a1, AR), [x2, y2] = P(a1, AR + 0.55), [x3, y3] = P(a0, AR + 0.55);
      const col = i % 2 ? tint(C.STONE, 1.1) : tint(C.STONE, 0.98);
      lq2([x0, y0, EZ + 0.1], [x1, y1, EZ + 0.1], [x2, y2, EZ + 0.1], [x3, y3, EZ + 0.1], col);
      // the fan of pierced tracery in its head: radiating ribs, dark between
      const [r0x, r0y] = P((a0 + a1) / 2, 0.45), [r1x, r1y] = P((a0 + a1) / 2, AR - 0.05);
      lq2([0, SPR, EZ + 0.06], [0, SPR, EZ + 0.06], [x1 * 0.98, y1, EZ + 0.06], [x0 * 0.98, y0, EZ + 0.06], C.DARK);
      lq2([r0x - 0.04, r0y, EZ + 0.08], [r1x - 0.05, r1y, EZ + 0.08], [r1x + 0.05, r1y, EZ + 0.08], [r0x + 0.04, r0y, EZ + 0.08], tint(C.STONE, 1.2));
    }
    // the group of Krishna lifting the hill, above the fan within the arch
    panel(0, SPR + 1.65, EZ + 0.12, 1.3, 0.75, 'E', tint(C.STONE, 1.15));
    panel(0, SPR + 1.25, EZ + 0.14, 0.18, 0.55, 'E', tint(C.STONE, 1.3));
    // four disc rosettes in the corners, a small stupa-like finial at the apex
    for (const [rx, ry] of [[-2.9, SPR + 2.2], [2.9, SPR + 2.2], [-2.9, SPR + 0.4], [2.9, SPR + 0.4]]) {
      panel(rx, ry, EZ + 0.05, 0.5, 0.5, 'E', tint(C.STONE, 1.22));
      panel(rx, ry, EZ + 0.06, 0.26, 0.26, 'E', tint(C.STONE, 0.85));
    }
    box(0, SPR + AR + 0.6, EZ + 0.08, 0.3, 0.4, 0.12, tint(C.STONE, 1.15));
    // the facing lost round the head of the arch: the rubble core, as both
    // nineteenth-century photographs show it (whether ASI has refaced it is
    // unknown; nothing says it has)
    for (const [rx, ry, rw, rh] of [[-1.6, SPR + 2.95, 1.4, 0.9], [0.4, SPR + 3.05, 1.8, 0.7], [2.2, SPR + 2.7, 0.9, 1.1]]) {
      panel(rx, ry, EZ + 0.04, rw, rh, 'E', C.RUBBLE);
    }
  }

  /* ---- the shrine and its sikhara ---- */
  /*
   * "Outside it is octagonal in plan with the angles broken up so as to make it
   * almost circular" (Burgess): eight broad faces, and at each angle a cluster
   * of narrow roll mouldings — drawn as a 24-sided ring with the angles cut back
   * and rolled, which reads round, as the photographs do.
   */
  {
    // the profile, radius against height over the mandap roof (h = 0 at RING)
    const PROF = [[-8.4, 4.8], [4.0, 4.8], [4.0, 4.5], [7.2, 3.55], [9.9, 2.5], [11.6, 1.45], [11.8, 1.2]];
    const rAt = (h) => {
      for (let i = 1; i < PROF.length; i++) {
        if (h <= PROF[i][0] + 1e-6) {
          const [h0, r0] = PROF[i - 1], [h1, r1] = PROF[i];
          if (h1 === h0) return r1;
          return r0 + (r1 - r0) * (h - h0) / (h1 - h0);
        }
      }
      return PROF[PROF.length - 1][1];
    };
    // a ring of 8 faces, each corner cut back into a roll: 24 points
    const ringPts = (r) => {
      const pts = [];
      for (let k = 0; k < 8; k++) {
        const ac = Math.PI / 8 + k * Math.PI / 4;               // a corner's angle
        const Rc = r / Math.cos(Math.PI / 8);                     // where the corner would be
        for (const [da, f] of [[-0.11, 0.985], [0, 0.985], [0.11, 0.985]]) {
          // the three rolls, on a circle just inside the sharp corner
          pts.push([Math.cos(ac + da) * Rc * f * (da === 0 ? 1.0 : 0.975), Math.sin(ac + da) * Rc * f * (da === 0 ? 1.0 : 0.975)]);
        }
      }
      return pts;
    };
    const ys = [];
    for (let h = -8.4; h < 11.8 - 1e-6; h += 0.4) ys.push(h);
    ys.push(11.8);
    let lo = ringPts(rAt(ys[0]));
    for (let i = 1; i < ys.length; i++) {
      const hi = ringPts(rAt(ys[i]));
      const col = (i % 3 === 0) ? C.STONE_DK : (hash(i) < 0.3 ? C.STONE_LT : C.STONE);
      for (let s = 0; s < 24; s++) {
        const n = (s + 1) % 24;
        lq([SC.lx + lo[s][0], RING + ys[i - 1], SC.lz + lo[s][1]], [SC.lx + hi[s][0], RING + ys[i], SC.lz + hi[s][1]],
          [SC.lx + hi[n][0], RING + ys[i], SC.lz + hi[n][1]], [SC.lx + lo[n][0], RING + ys[i - 1], SC.lz + lo[n][1]],
          s % 3 === 1 ? tint(col, 1.08) : col);
      }
      lo = hi;
    }
    // the projecting rings: two on the drum, and the three string courses
    // each band follows the tower's own section, pushed out by `dr`: a true
    // circle at the corners' radius stood 0.6 m off the flat faces, a hoop
    // floating round the tower
    for (const [h, dr, th] of [[-4.6, 0.22, 0.35], [-0.2, 0.22, 0.4], [4.0, 0.16, 0.25], [7.2, 0.14, 0.22], [9.9, 0.12, 0.2]]) {
      const inner = ringPts(rAt(h));
      const outer = inner.map(([a, c]) => { const L = Math.hypot(a, c); return [a * (L + dr) / L, c * (L + dr) / L]; });
      const y0 = RING + h - th / 2, y1 = RING + h + th / 2, col = tint(C.STONE, 1.04);
      const P = (q, y) => [SC.lx + q[0], y, SC.lz + q[1]];
      for (let k = 0; k < 24; k++) {
        const n = (k + 1) % 24;
        lq(P(outer[k], y0), P(outer[k], y1), P(outer[n], y1), P(outer[n], y0), col);
        lq(P(outer[k], y1), P(inner[k], y1), P(inner[n], y1), P(outer[n], y1), tint(col, 1.08));
        lq(P(outer[n], y0), P(inner[n], y0), P(inner[k], y0), P(outer[k], y0), tint(col, 0.7));
      }
    }
    // the putlog holes over the faces, which read at distance
    for (let i = 0; i < 60; i++) {
      const h = -2 + 13 * hash(i * 1.3), a = hash(i * 2.9) * Math.PI * 2, r = rAt(h) + 0.04;
      const cx = SC.lx + Math.cos(a) * r, cz = SC.lz + Math.sin(a) * r;
      const tx = -Math.sin(a) * 0.09, tz = Math.cos(a) * 0.09;
      lq([cx - tx, RING + h - 0.09, cz - tz], [cx - tx, RING + h + 0.09, cz - tz], [cx + tx, RING + h + 0.09, cz + tz], [cx + tx, RING + h - 0.09, cz + tz], C.DARK);
    }
    // the crown, top down: a low smooth cap, a small ribbed ring, the flat
    // gadrooned amalaka, three thin roll mouldings, a short plain neck, a bold ring
    const H0 = RING + 11.8;
    lathe(SC.lx, SC.lz, [[H0 - 0.2, 1.45], [H0, 1.55], [H0 + 0.05, 1.3]], 24, tint(C.STONE, 1.05));    // the bold ring
    lathe(SC.lx, SC.lz, [[H0 + 0.05, 1.2], [H0 + 0.4, 1.2]], 24, C.STONE);                              // the neck
    lathe(SC.lx, SC.lz, [[H0 + 0.4, 1.32], [H0 + 0.48, 1.32], [H0 + 0.5, 1.22], [H0 + 0.58, 1.3], [H0 + 0.6, 1.2], [H0 + 0.68, 1.28], [H0 + 0.72, 1.2]], 24, tint(C.STONE, 1.1));
    const rib = (a) => 0.92 + 0.08 * Math.abs(Math.cos(a * 13));
    lathe(SC.lx, SC.lz, [[H0 + 0.72, 1.3], [H0 + 0.82, 1.7], [H0 + 1.02, 1.86], [H0 + 1.3, 1.85], [H0 + 1.46, 1.6], [H0 + 1.52, 1.1]], 104,
      (i, s) => tint(C.STONE, s % 4 < 2 ? 1.08 : 0.86), rib);
    lathe(SC.lx, SC.lz, [[H0 + 1.52, 1.0], [H0 + 1.62, 1.0], [H0 + 1.66, 0.85]], 26, tint(C.STONE, 1.06), (a) => 0.95 + 0.05 * Math.abs(Math.cos(a * 13)));
    lathe(SC.lx, SC.lz, [[H0 + 1.66, 0.85], [H0 + 1.85, 0.75], [H0 + 2.05, 0.45], [H0 + 2.15, 0.15], [H0 + 2.18, 0]], 20, tint(C.STONE, 1.0));
    post(SC.lx, SC.lz, RF + 0.2, { top: RING + 14.0 });
    // the empty altar inside, tended: the lamps and nothing else (altars.js)
    buildDeities(b, { ...loc, rot: rot + Math.PI }, FL, p(SC.lx, SC.lz));
  }

  return {
    // the shrine is sealed and the doors are locked: one keeps darshan at
    // the door, on the platform where the porch was
    altar: { lx: SC.lx, lz: SC.lz, y: FL + 1.6 },
    darshan: { lx: 0, lz: MZ1 + 1.4 },
    FL,
  };
}
