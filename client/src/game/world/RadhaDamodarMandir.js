/**
 * SHRI RADHA DAMODAR MANDIR — a walled Braj haveli-compound, 1,493 m², with
 * a carved portal on its lane, an arcaded darshan hall, Srila Prabhupada's
 * rooms, and two samadhi yards: Jiva and Krishnadas Kaviraja at the south end,
 * Rupa Goswami and Bhugarbha at the north.
 *
 * Built from docs/research/radha-damodar.md, the survey and its checker,
 * where the checker overrules the survey. What stood here was the shared
 * haveli, 20 x 24 m.
 *
 * WHERE: OpenStreetMap (ODbL). Way 334674939 is the compound; its true area
 * centroid (the checker: 27.583746 / 77.695577, the survey's was 7.7 m off)
 * is the origin. The outline is the way's nine vertices; the entrance is node
 * 3417359583, shared with the lane (way 334674940, a game street ending at
 * it); and OSM maps five buildings INSIDE, which place the samadhis of Jiva
 * and Krishnadas (334983476/8) at the south end, Prabhupada's room
 * (334983477) mid-way, and Rupa (334983479) and Bhugarbha (334983480) north.
 *
 * THE FRAME: rot 0, so +lx is EAST and +lz is SOUTH.
 *
 * WHAT IS INFERRED: the plan inside, beyond those five buildings. Nothing
 * published draws it. The darshan hall is put where the sources and the
 * entrance agree — "you look straight through the open doorway into a sunlit
 * courtyard of white columns", the main temple south of the samadhi garden —
 * on the court's west side, its sanctum at the west end, so the deities face
 * east down the axis from the gate. Its heights are the survey's (+-15-20 per
 * cent): a 4.0-4.5 m ground storey, 8-9 m to the parapet. Nothing rises above
 * the neighbours; there is no tower and never was.
 *
 * THE EPOCH is 2019: the hall in its dusty terracotta-pink, Rupa's samadhi
 * re-plastered white, a second chala shrine beside it salmon (the checker: two
 * shrines, two colours, one moment), the yard under a modern slab on blue
 * columns, the monkey mesh blue.
 */

import { campusSign } from './Signage.js';

/** Colours. MEASURED where the survey's 2019 samples are trusted. */
const C = {
  RENDER: 0xf2e3cf,     // cream render, pier panel (2019)
  FRESH: 0xfbe8d5,      // fresh lime render, Rupa's roof shell (2019)
  OCHRE: 0xd2bc84,      // old ochre limewash
  ROPE: 0xe0d5c2, JALI: 0xd1c4af,
  HALL: 0xaf7f66,       // the darshan hall's upper wall, dusty terracotta-pink (2019)
  ROOM: 0xbea37a,       // Prabhupada's room above the dado
  FLAG: 0xb99b6d,       // its stone floor flags
  PORTAL: 0xb49568,     // the portal's buff sandstone (the warm photograph desaturated)
  PORTAL_DK: 0x7a5530,  // its chhajja and brackets, the redder stone
  LANE: 0xc7b28a,
  BRICK: 0x6f6257,      // a neighbour's exposed lakhori brick, in shade
  GRILLE: 0x303f41,     // the dark teal-slate grille doors
  TEAL: 0x3fa3a6,       // the turquoise diamond-mesh doors of Krishnadas's samadhi
  TILE: 0x48a6b4, TILE_W: 0xe9eef0,  // the glazed dado
  MESH: 0x2f6f9a,       // the monkey mesh: blue (the checker, Braj Ras 19)
  SALMON: 0xd98a6a,     // the second chala shrine
  ACCENT: 0x9a3a2a,     // the one saturated accent of a repaint, on arch outlines (INFERRED)
  MW: 0xe8e6e1, MB: 0x2e2c2b, SLAB: 0xc9c6bf, RED: 0x9e5a44,
  WOOD: 0x4a3020, IRON: 0x262422, DARK: 0x1f1712, GOLD: 0xc9a227, SAFFRON: 0xd9822b,
  CONCRETE: 0xb9b5ac, BLUE: 0x3d7fa8, LEAF: 0x4d6b2e, LEAF2: 0x5d7d36, BARK: 0x5a4632,
};

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** The compound, OSM way 334674939, in the box frame (lx east, lz south). */
const POLY = [
  [-16.63, -26.14], [-9.93, 31.06], [10.97, 26.16], [9.47, 14.06], [22.37, 11.56],
  [21.37, 1.76], [20.67, -6.04], [6.57, -5.44], [3.27, -34.44],
];

export function buildRadhaDamodarMandir(o) {
  const { b, signB, loc, ground, terrain, colliders } = o;
  const { cuspedArch, tint, buildDeities } = o.h;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const box = (lx, y, lz, w, h, d, color, ang = 0) => { const q = p(lx, lz); b.box(q[0], y, q[1], w, h, d, color, rot + ang); };
  const solid = (lx, lz, w, d, extra = {}, ang = 0) => { const q = p(lx, lz); colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra }); };
  const post = (lx, lz, r, extra = {}) => { const q = p(lx, lz); colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra }); };
  // local facing angles: toward +lx (east) 0, +lz (south) PI/2
  const F = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
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
  const lq = (A, B, Cq, D, col) => {
    const a = p(A[0], A[2]), bb = p(B[0], B[2]), c = p(Cq[0], Cq[2]), d = p(D[0], D[2]);
    b.quad([a[0], A[1], a[1]], [bb[0], B[1], bb[1]], [c[0], Cq[1], c[1]], [d[0], D[1], d[1]], col);
  };
  const lq2 = (A, B, Cq, D, col) => { lq(A, B, Cq, D, col); lq(D, Cq, B, A, col); };
  /*
   * A panel on a face, `face` its outward side. A quad run lo-hi-hi-lo from A
   * to B faces up x (B - A): a south face runs toward -lx, north toward +lx,
   * east toward +lz, west toward -lz.
   */
  const panel = (lx, y, lz, w, h, face, col) => {
    const y0 = y - h / 2, y1 = y + h / 2, hw = w / 2;
    const [A, B] = face === 'S' ? [[lx + hw, lz], [lx - hw, lz]] : face === 'N' ? [[lx - hw, lz], [lx + hw, lz]]
      : face === 'E' ? [[lx, lz - hw], [lx, lz + hw]] : [[lx, lz + hw], [lx, lz - hw]];
    lq([A[0], y0, A[1]], [A[0], y1, A[1]], [B[0], y1, B[1]], [B[0], y0, B[1]], col);
  };
  const arch = (lx, y0, lz, w, h, along, color, lobes, shade, depth = 0.12) => {
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
  /** A wall from A to B in the plan. */
  const wall = (ax, az, bx, bz, y, h, t, color, collide = true) => {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-3) return;
    const ang = Math.atan2(bz - az, bx - ax);
    box((ax + bx) / 2, y, (az + bz) / 2, L + t * 0.5, h, t, color, ang);
    if (collide) solid((ax + bx) / 2, (az + bz) / 2, L, t, { top: y + h }, ang);
  };
  const rooms = [];

  const yC = topOf(9.5, 21, -5.3, 11.8, 3);       // the court

  /* ================================================================
   * THE COMPOUND WALL — the backs of the houses pressing on it
   * ================================================================ */
  {
    const H = 4.0;
    for (let i = 0; i < POLY.length; i++) {
      const [ax, az] = POLY[i], [bx, bz] = POLY[(i + 1) % POLY.length];
      // the portal stands in edges 4 and 5, either side of the entrance node
      if (i === 4 || i === 5) continue;
      const y = Math.min(tH(ax, az), tH(bx, bz)) - 0.15;
      wall(ax, az, bx, bz, y, H, 0.45, tint(C.OCHRE, 0.95 + 0.06 * hash(i)));
      wall(ax, az, bx, bz, y + H, 0.14, 0.6, tint(C.RENDER, 0.92), false);
    }
  }

  /* ================================================================
   * THE PORTAL — the only public face, flush in the lane's wall
   * ================================================================ */
  /*
   * "A carved pale buff-sandstone frontispiece, flat against the lane ...
   * applied to a plain plastered building — above the chhajja the cream
   * render simply carries on." The checker sizes it 4.4-5.1 m wide and 3.9-4.3
   * m to its chhajja; the door is kept open, and you look straight through it
   * into the court. It is laid along the boundary's own line through the
   * entrance node, 6 degrees off the frame.
   */
  const [V4, V5, V6] = [POLY[4], POLY[5], POLY[6]];
  const Ux = V6[0] - V4[0], Uz = V6[1] - V4[1], UL = Math.hypot(Ux, Uz);
  const U = [Ux / UL, Uz / UL];                       // along the wall, northward
  const N = [-U[1], U[0]];                            // out of the compound, east
  const pt = (u, n) => [V5[0] + U[0] * u + N[0] * n, V5[1] + U[1] * u + N[1] * n];
  const WA = Math.atan2(U[1], U[0]);                  // a box's w along the wall
  const FACE = Math.atan2(N[1], N[0]);                // facing out, in the F convention
  const gbox = (u, n, y, w, h, d, col) => { const q = pt(u, n); box(q[0], y, q[1], w, h, d, col, WA); };
  const gsolid = (u, n, w, d, top) => { const q = pt(u, n); solid(q[0], q[1], w, d, { top }, WA); };
  const yL = Math.min(tH(...pt(0, 1)), tH(...pt(0, -1))) - 0.1;
  const PW = 4.8, PH = 4.2, DW = 1.7, DH = 2.15, GD = 2.8;  // portal, door, the gatehouse's depth
  {
    // the gatehouse behind the portal: a plain plastered building, two storeys
    const GW = 6.4;
    for (const s of [-1, 1]) {
      const w = (GW - DW) / 2, u = s * (DW / 2 + w / 2);
      gbox(u, -GD / 2, yL, w, 7.2, GD, C.RENDER);
      gsolid(u, -GD / 2, w, GD, yL + 7.2);
    }
    gbox(0, -GD / 2, yL + DH, DW, 7.2 - DH, GD, C.RENDER);
    gbox(0, -GD / 2, yL + 7.2, GW + 0.2, 0.18, GD + 0.2, tint(C.RENDER, 0.86));
    // the boundary either side of the gatehouse, on the true edges
    const yW = yL - 0.05;
    const q0 = pt(-GW / 2, 0), q1 = pt(GW / 2, 0);
    wall(V4[0], V4[1], q0[0], q0[1], yW, 4.0, 0.45, tint(C.OCHRE, 0.97));
    wall(q1[0], q1[1], V6[0], V6[1], yW, 4.0, 0.45, tint(C.OCHRE, 0.97));
    // the passage through it, flagged, the floor you walk on
    gbox(0, -GD / 2, yL - 0.1, DW, 0.12, GD, C.SLAB);
    // the frontispiece, a skin of carved stone on the lane face
    const n0 = 0.02;
    for (const s of [-1, 1]) gbox(s * (PW + DW) / 4, n0 + 0.06, yL, (PW - DW) / 2, PH, 0.14, C.PORTAL);
    gbox(0, n0 + 0.06, yL + DH, DW, PH - DH, 0.14, C.PORTAL);
    // the plinth and the benches either side, where people sit
    for (const s of [-1, 1]) {
      gbox(s * (DW / 2 + 0.9), 0.45, yL, 1.2, 0.45, 0.6, tint(C.PORTAL, 0.86));
      const q = pt(s * (DW / 2 + 0.9), 0.45); solid(q[0], q[1], 1.2, 0.6, { top: yL + 0.45 }, WA);
    }
    // the central arch: a scalloped archivolt of ~23 small cusps over a broad
    // ~5-foil inner arch; the rectangular door open within it
    const qa = pt(0, 0.16);
    cuspedArch(b, ...[p(qa[0], qa[1])[0], yL + 0.2, p(qa[0], qa[1])[1]], 2.15, 2.95, 0.12, rot + WA, tint(C.PORTAL, 1.1), 23, null);
    cuspedArch(b, ...[p(...pt(0, 0.19))[0], yL + 0.4, p(...pt(0, 0.19))[1]], 1.9, 2.6, 0.08, rot + WA, tint(C.PORTAL, 0.96), 5, null);
    // the small square niche over the door, a deity in orange cloth
    gbox(0, 0.18, yL + DH + 0.12, 0.42, 0.42, 0.06, C.DARK);
    gbox(0, 0.2, yL + DH + 0.16, 0.16, 0.3, 0.06, C.SAFFRON);
    // the two flanking niches, 9-foil heads over sunk panels
    for (const s of [-1, 1]) {
      const q = pt(s * 1.62, 0.15), w = p(q[0], q[1]);
      cuspedArch(b, w[0], yL + 0.8, w[1], 0.55, 1.3, 0.08, rot + WA, tint(C.PORTAL, 1.08), 9, tint(C.PORTAL, 0.7));
      // a lozenge on each pilaster face, the three ornament bands of the jambs
      const qj = pt(s * 1.08, 0.16), wj = p(qj[0], qj[1]);
      b.box(wj[0], yL + 0.5, wj[1], 0.22, 2.4, 0.06, tint(C.PORTAL, 1.15), rot + WA);
    }
    // the cow in relief on the right-hand plinth block
    gbox(1.95, 0.76, yL + 0.12, 0.5, 0.26, 0.04, tint(C.PORTAL, 1.18));
    // the foliate frieze across the width, oval medallions either side
    gbox(0, 0.17, yL + 3.25, PW - 0.3, 0.42, 0.06, tint(C.PORTAL, 1.12));
    for (const s of [-1, 1]) gbox(s * 1.75, 0.18, yL + 3.3, 0.42, 0.32, 0.05, tint(C.PORTAL, 0.8));
    // the chhajja on ten double-volute brackets, in the redder stone
    gbox(0, 0.45, yL + PH - 0.3, PW + 0.3, 0.22, 0.85, C.PORTAL_DK);
    for (let i = 0; i < 10; i++) {
      const q = pt(-PW / 2 + 0.25 + i * (PW - 0.5) / 9, 0.22), w = p(q[0], q[1]);
      b.prism(w[0], yL + PH - 0.95, w[1], 0.14, 0.16, 0.16, 0.42, 0.65, C.PORTAL_DK, rot + WA);
    }
    // the parapet band of small square panels, then the cream render carries on
    gbox(0, 0.1, yL + PH - 0.08, PW, 0.3, 0.1, tint(C.PORTAL, 0.95));
    for (let i = 0; i < 9; i++) {
      const q = pt(-PW / 2 + 0.35 + i * (PW - 0.7) / 8, 0.16), w = p(q[0], q[1]);
      b.box(w[0], yL + PH - 0.02, w[1], 0.26, 0.18, 0.04, tint(C.PORTAL, 0.78), rot + WA);
    }
    // and the painted notice boards on the plaster beside it
    for (const s of [-1, 1]) {
      const q = pt(s * 2.95, 0.05), w = p(q[0], q[1]);
      b.box(w[0], yL + 1.6, w[1], 1.0, 1.1, 0.04, 0xf2efe6, rot + WA);
    }
  }

  /* ---- the lane up to it: narrow, caged in mesh on one side, partly built over ---- */
  {
    // the cage on the lane's south side, ~3 m, blue (the checker)
    const L0 = pt(0.0, 1.4), L1 = [V5[0] + 7.0, V5[1] - 6.4];
    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, lx = L0[0] + (L1[0] - L0[0]) * t, lz = L0[1] + (L1[1] - L0[1]) * t + 1.8;
      box(lx, yL, lz, 0.06, 3.0, 0.06, C.MESH);
    }
    const ang = Math.atan2(L1[1] - L0[1], L1[0] - L0[0]), L = Math.hypot(L1[0] - L0[0], L1[1] - L0[1]);
    for (let k = 0; k < 7; k++) box((L0[0] + L1[0]) / 2, yL + 0.3 + k * 0.42, (L0[1] + L1[1]) / 2 + 1.8, L, 0.025, 0.025, C.MESH, ang);
    // the slab you pass under, just outside the gate
    const qs = pt(0, 2.2);
    box(qs[0], yL + 3.0, qs[1], 3.0, 0.22, 3.4, C.CONCRETE, WA);
    for (const s of [-1, 1]) { const q = pt(s * 1.9, 3.6); box(q[0], yL, q[1], 0.25, 3.0, 0.25, C.CONCRETE, WA); post(q[0], q[1], 0.2, { top: yL + 3.0 }); }
  }

  /* ================================================================
   * THE COURT, and the darshan hall on its west side
   * ================================================================ */
  const CT = { lx0: 9.5, lx1: 20.9, lz0: -5.3, lz1: 11.7 };
  // the inner faces of the court's oblique north and south walls (edges 6-7 and 3-4)
  const northFace = (lx) => POLY[7][1] + (lx - POLY[7][0]) / (POLY[6][0] - POLY[7][0]) * (POLY[6][1] - POLY[7][1]) + 0.24;
  const southFace = (lx) => POLY[3][1] + (lx - POLY[3][0]) / (POLY[4][0] - POLY[3][0]) * (POLY[4][1] - POLY[3][1]) - 0.24;
  const HFL = yC + 1.0;                               // the hall's floor: five steps
  const HL = { lx0: 1.6, lx1: 9.5, lz0: 0.4, lz1: 9.4 };    // the hall inside
  const AXZ = (HL.lz0 + HL.lz1) / 2;                  // its axis, 4.9
  const ALT = { lx: 2.55, lz: AXZ };
  {
    // the court floor: grey-white slabs in a mosaic border
    box((CT.lx0 + CT.lx1) / 2, yC - 0.2, (CT.lz0 - 0.6 + 14.2) / 2, CT.lx1 - CT.lx0 + 1.2, 0.22, 14.2 - CT.lz0 + 0.6, tint(C.SLAB, 0.94));
    for (let i = 0; CT.lx0 + 0.6 + i * 1.2 < CT.lx1 - 0.6; i++) {
      for (let j = 0; CT.lz0 + 0.6 + j * 1.2 < CT.lz1 - 0.6; j++) {
        const a = CT.lx0 + 0.6 + i * 1.2, d0 = CT.lz0 + 0.6 + j * 1.2;
        lq([a + 0.03, yC + 0.03, d0 + 0.03], [a + 0.03, yC + 0.03, d0 + 1.17], [a + 1.17, yC + 0.03, d0 + 1.17], [a + 1.17, yC + 0.03, d0 + 0.03],
          tint(C.SLAB, 0.95 + 0.1 * hash(i * 7 + j)));
      }
    }
    for (const [lx, lz, w, d] of [[(CT.lx0 + CT.lx1) / 2, CT.lz0 + 0.3, CT.lx1 - CT.lx0, 0.3], [(CT.lx0 + CT.lx1) / 2, CT.lz1 - 0.3, CT.lx1 - CT.lx0, 0.3]]) {
      box(lx, yC + 0.005, lz, w, 0.03, d, C.RED);
    }
    // the glazed turquoise-and-white tile dado along the court's walls
    for (let i = 0; i < 18; i++) {
      const lx = CT.lx0 + 1.6 + i * 0.6;
      panel(lx, yC + 0.55, northFace(lx) + 0.01, 0.58, 1.1, 'S', i % 2 ? C.TILE : C.TILE_W);
      if (lx > 11.0) panel(lx, yC + 0.55, southFace(lx) - 0.01, 0.58, 1.1, 'N', i % 2 ? C.TILE : C.TILE_W);
    }
    // painted Hindi notice boards straight on the render, one forbidding photographs
    panel(15.0, yC + 2.4, northFace(15.0) + 0.02, 2.2, 1.1, 'S', 0xf4f0e2);
    panel(15.0, yC + 2.4, northFace(15.0) + 0.03, 2.0, 0.12, 'S', 0xb3221c);
    panel(16.5, yC + 2.4, southFace(16.5) - 0.02, 1.8, 0.9, 'N', 0xf4f0e2);
    // festoon lights strung across
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      box(CT.lx0 + 0.5 + (CT.lx1 - CT.lx0 - 1) * t, yC + 4.2 - 0.35 * Math.sin(Math.PI * t), 1.0 + 6.0 * t, 0.07, 0.07, 0.07, [0xf2c94c, 0xe2574c, 0x6fbf73, 0x5aa9e6][i % 4]);
    }
    // the venerated tree in its square raised kerb: red thread, cloth, garlands
    const [tx, tz] = [16.4, 6.9];
    box(tx, yC, tz, 2.4, 0.5, 2.4, tint(C.SLAB, 0.86));
    box(tx, yC + 0.5, tz, 2.5, 0.06, 2.5, C.MW);
    panel(tx, yC + 0.28, tz + 1.21, 0.5, 0.26, 'S', C.MW);
    solid(tx, tz, 2.4, 2.4, { top: yC + 0.5 });
    b.prism(...[p(tx, tz)[0], yC + 0.5, p(tx, tz)[1]], 0.75, 0.75, 0.45, 0.45, 2.6, C.BARK, rot + 0.4);
    for (const [h, col] of [[0.9, 0xb3221c], [1.05, 0xe8c22a], [1.2, 0xb3221c]]) box(tx, yC + 0.5 + h, tz, 0.62, 0.06, 0.62, col, 0.4);
    for (const [bx2, bz2, by, s] of [[0, 0, 3.1, 1.0], [-0.9, 0.5, 3.4, 0.8], [0.8, -0.6, 3.6, 0.85], [0.2, 0.9, 4.2, 0.7], [-0.4, -0.7, 4.4, 0.75]]) {
      const q = p(tx + bx2, tz + bz2);
      b.prism(q[0], yC + by, q[1], 2.4 * s, 2.4 * s, 1.4 * s, 1.4 * s, 1.5 * s, hash(by) > 0.5 ? C.LEAF : C.LEAF2, rot + by);
    }
    post(tx, tz, 0.5);
  }
  /*
   * THE HALL'S FACADE. "A three-bay arcade of ogee-headed cusped arches of
   * ~9-11 foils, on slender round columns with ring mouldings and bracket
   * capitals, raised on 5-6 stone steps ... Bay clear width ~2.6 m, height
   * ~3.2 m." A frieze of painted rosettes; a deep chhajja on 20+ small
   * brackets; a first floor mostly solid, with a green grille window and a
   * gallery behind a turned-baluster railing.
   */
  const FX = HL.lx1;                                   // the facade's line
  {
    const TOP = yC + 8.6;
    // the hall's walls: north, south, west (the west carries the sanctum)
    for (const [lx, lz, w, d] of [[(HL.lx0 + FX) / 2, HL.lz0 - 0.3, FX - HL.lx0 + 1.2, 0.6], [(HL.lx0 + FX) / 2, HL.lz1 + 0.3, FX - HL.lx0 + 1.2, 0.6],
      [HL.lx0 - 0.3, AXZ, 0.6, HL.lz1 - HL.lz0 + 1.2]]) {
      box(lx, yC - 0.2, lz, w, TOP - yC + 0.2, d, C.HALL);
      solid(lx, lz, w, d, { top: TOP });
    }
    box((HL.lx0 + FX) / 2, TOP, AXZ, FX - HL.lx0 + 1.4, 0.15, HL.lz1 - HL.lz0 + 1.4, tint(C.RENDER, 0.85));
    box((HL.lx0 + FX) / 2, TOP + 0.15, AXZ, FX - HL.lx0 + 1.2, 0.7, HL.lz1 - HL.lz0 + 1.2, tint(C.HALL, 1.04));
    // the hall's floor: diagonal black and white chequer
    box((HL.lx0 + FX + 0.45) / 2, yC - 0.2, AXZ, FX + 0.45 - HL.lx0, HFL - yC + 0.17, HL.lz1 - HL.lz0, tint(C.MW, 0.85));
    solid((HL.lx0 + FX + 0.45) / 2, AXZ, FX + 0.45 - HL.lx0, HL.lz1 - HL.lz0, { top: HFL, tag: 'temple-floor', floor: true });
    const S = 0.6;
    for (let i = 0; HL.lx0 + i * S < FX + 0.45 - 1e-3; i++) {
      for (let j = 0; HL.lz0 + j * S < HL.lz1 - 1e-3; j++) {
        const a = HL.lx0 + i * S, c = Math.min(FX + 0.45, a + S), d0 = HL.lz0 + j * S, d1 = Math.min(HL.lz1, d0 + S);
        // diagonal: each square split corner to corner
        const k = (i + j) & 1;
        lq([a, HFL, d0], [a, HFL, d1], [c, HFL, d1], [c, HFL, d0], k ? C.MB : C.MW);
        lq([a + 0.15, HFL + 0.003, d0 + 0.3], [a + 0.3, HFL + 0.003, d1 - 0.15], [c - 0.15, HFL + 0.003, d0 + 0.3], [a + 0.3, HFL + 0.003, d0 + 0.15], k ? C.MW : C.MB);
      }
    }
    // the steps up from the court, across all three bays
    for (let st = 0; st < 4; st++) {
      const lx = FX + 0.45 + (3 - st) * 0.45 + 0.225, top = yC + 0.2 * (st + 1);
      box(lx, yC - 0.1, AXZ, 0.45, top - yC + 0.1, HL.lz1 - HL.lz0, st % 2 ? tint(C.SLAB, 0.92) : C.SLAB);
      solid(lx, AXZ, 0.45, HL.lz1 - HL.lz0, { top, tag: 'rd-hall-steps', standOnly: true });
    }
    // the three bays: slender round columns, ring mouldings, bracket capitals
    const BAY = (HL.lz1 - HL.lz0) / 3;
    for (let k = 0; k <= 3; k++) {
      const lz = HL.lz0 + k * BAY;
      if (k === 0 || k === 3) continue;              // the end bays spring from the walls
      lathe(FX + 0.2, lz, [[HFL, 0.2], [HFL + 0.25, 0.2], [HFL + 0.3, 0.15], [HFL + 2.8, 0.13], [HFL + 2.9, 0.17], [HFL + 3.0, 0.13], [HFL + 3.3, 0.14]], 10, 0xf6f2ea);
      box(FX + 0.2, HFL + 3.3, lz, 0.5, 0.25, 0.7, 0xf6f2ea);
      post(FX + 0.2, lz, 0.2, { top: HFL + 3.6 });
    }
    for (let k = 0; k < 3; k++) {
      const lz = HL.lz0 + (k + 0.5) * BAY;
      arch(FX + 0.25, HFL, lz, BAY - 0.4, 3.45, 'z', 0xf6f2ea, 10, null, 0.2);
    }
    // a turned-baluster railing across the centre bay, at the head of the steps
    for (let i = 0; i <= 10; i++) box(FX + 0.42, HFL, HL.lz0 + BAY + 0.25 + i * (BAY - 0.5) / 10, 0.07, 0.75, 0.07, 0xf6f2ea);
    box(FX + 0.42, HFL + 0.75, AXZ, 0.12, 0.08, BAY - 0.4, 0xf6f2ea);
    // the frieze over the arcade, its spandrel rosettes, the deep chhajja on small brackets
    box(FX + 0.15, HFL + 3.55, AXZ, 0.3, 0.75, HL.lz1 - HL.lz0 + 1.2, C.HALL);
    for (let k = 0; k < 6; k++) panel(FX + 0.32, HFL + 3.9, HL.lz0 + 0.8 + k * (HL.lz1 - HL.lz0 - 1.6) / 5, 0.4, 0.4, 'E', k % 2 ? 0xb3221c : 0x4f8a3a);
    box(FX + 0.6, HFL + 4.3, AXZ, 1.2, 0.16, HL.lz1 - HL.lz0 + 1.6, tint(C.RENDER, 0.94));
    for (let i = 0; i < 22; i++) {
      const q = p(FX + 0.32, HL.lz0 - 0.5 + i * (HL.lz1 - HL.lz0 + 1.0) / 21);
      b.prism(q[0], HFL + 3.95, q[1], 0.1, 0.1, 0.4, 0.12, 0.35, tint(C.RENDER, 0.9), rot);
    }
    // the first floor: a plastered wall, a gallery behind a baluster rail, a green grille
    box(FX + 0.15, HFL + 4.46, AXZ, 0.3, TOP - HFL - 4.46, HL.lz1 - HL.lz0 + 1.2, C.HALL);
    panel(FX + 0.31, HFL + 5.6, AXZ, 2.6, 1.6, 'E', 0x3a3430);
    for (let i = 0; i <= 12; i++) box(FX + 0.5, HFL + 4.46, AXZ - 1.3 + i * 0.217, 0.06, 0.7, 0.06, 0xf6f2ea);
    box(FX + 0.5, HFL + 5.16, AXZ, 0.1, 0.07, 2.7, 0xf6f2ea);
    panel(FX + 0.31, HFL + 5.6, HL.lz0 + 1.2, 1.0, 1.1, 'E', 0x2f6b3a);
    panel(FX + 0.31, HFL + 5.6, HL.lz1 - 1.2, 1.0, 1.1, 'E', 0x2f6b3a);
  }
  /*
   * INSIDE. "A long wall of deeply sunk rectangular panels, each with a raised
   * relief composition under a cusped-arch canopy ... A moulded string course
   * and projecting ledge form a first-floor gallery, above which runs a row of
   * 7-9 cusped blind niches in relief. The sanctum is at one end: a deep arched
   * recess framed by carved cream stone with clustered colonnettes and a
   * cusped arch, over a stepped white marble altar." The altar is wide and
   * shallow, ~4-5 m across, for several deity groups; altars.js gives the
   * principal one, Radha-Damodar with Lalita.
   */
  {
    const IN = 0.31;
    for (const [lz, face] of [[HL.lz0 + 0.01, 'S'], [HL.lz1 - 0.01, 'N']]) {
      for (let k = 0; k < 5; k++) {
        const lx = 4.25 + k * 1.15;
        panel(lx, HFL + 1.7, lz, 0.9, 2.0, face, tint(C.HALL, 0.78));
        arch(lx, HFL + 2.4, lz + (face === 'S' ? 0.03 : -0.03), 0.9, 0.9, 'x', tint(C.RENDER, 0.96), 5, tint(C.HALL, 0.7), 0.04);
        arch(lx, HFL + 4.7, lz + (face === 'S' ? 0.03 : -0.03), 0.6, 1.1, 'x', tint(C.HALL, 1.1), 7, tint(C.HALL, 0.75), 0.04);
      }
      box((HL.lx0 + FX) / 2, HFL + 4.1, lz + (face === 'S' ? 0.18 : -0.18), FX - HL.lx0, 0.2, 0.36, tint(C.RENDER, 0.92));
    }
    // the ceiling, two storeys up, and a fan
    box((HL.lx0 + FX) / 2, yC + 8.2, AXZ, FX - HL.lx0, 0.1, HL.lz1 - HL.lz0, tint(C.RENDER, 0.9));
    box(6.0, yC + 7.4, AXZ, 0.05, 0.8, 0.05, 0x333333);
    box(6.0, yC + 7.35, AXZ, 1.2, 0.03, 0.12, 0x5a5048);
    box(6.0, yC + 7.35, AXZ, 0.12, 0.03, 1.2, 0x5a5048);
    // the sanctum: a deep arched recess at the west end
    const SR = { lx0: HL.lx0, lx1: 3.6, lz0: AXZ - 2.6, lz1: AXZ + 2.6 };
    for (const [za, zb] of [[HL.lz0, SR.lz0], [SR.lz1, HL.lz1]]) {
      box(SR.lx1 - 0.25, HFL, (za + zb) / 2, 0.5, 6.0, zb - za, tint(C.RENDER, 0.95));
      solid(SR.lx1 - 0.25, (za + zb) / 2, 0.5, zb - za, { top: HFL + 6.0 });
    }
    box(SR.lx1 - 0.25, HFL + 4.6, AXZ, 0.5, 1.4, SR.lz1 - SR.lz0, tint(C.RENDER, 0.95));
    arch(SR.lx1 + 0.02, HFL, AXZ, 5.0, 4.6, 'z', tint(C.RENDER, 1.04), 9, null, 0.3);
    for (const s of [-1, 1]) for (const k of [0, 0.22]) {
      lathe(SR.lx1 + 0.12, AXZ + s * (2.45 - k), [[HFL, 0.09], [HFL + 3.2, 0.08], [HFL + 3.35, 0.12], [HFL + 3.5, 0.08]], 8, tint(C.RENDER, 1.05));
    }
    // the stepped white marble altar, wide and shallow
    for (let st = 0; st < 3; st++) {
      box(SR.lx0 + 0.6 + st * 0.0, HFL + st * 0.4, AXZ, 1.6 - st * 0.35, 0.4, 4.6 - st * 0.4, tint(C.MW, 1 - st * 0.03));
    }
    solid((SR.lx0 + SR.lx1) / 2 - 0.2, AXZ, SR.lx1 - SR.lx0 - 0.4, 4.6, { top: HFL + 1.2 });
    box(SR.lx0 + 0.04, HFL + 1.2, AXZ, 0.06, 3.0, 4.6, 0x8a1f1a);
    // a canopy over the altar
    box(SR.lx0 + 0.9, HFL + 3.4, AXZ, 1.5, 0.12, 4.4, C.GOLD);
    buildDeities(b, { ...loc, rot: rot + Math.PI / 2 }, HFL + 1.2 - 1.15, p(ALT.lx, ALT.lz));
    // the Govardhan shila: on its own low yellow-draped table in FRONT of the
    // altar, not on it (the checker, 2023) — black, oval, its marks in yellow
    box(4.4, HFL, AXZ, 0.7, 0.5, 0.7, 0xe3b825);
    lathe(4.4, AXZ, [[HFL + 0.5, 0.2], [HFL + 0.58, 0.22], [HFL + 0.66, 0.16], [HFL + 0.7, 0.0]], 10, 0x1d1b1a);
    for (let i = 0; i < 8; i++) box(4.4 + 0.24 * Math.cos(i * 0.8), HFL + 0.52, AXZ + 0.24 * Math.sin(i * 0.8), 0.06, 0.06, 0.06, 0xf08c1a);
    solid(4.4, AXZ, 0.7, 0.7, { top: HFL + 0.95 });           // not a step: nobody stands on it
  }

  /* ================================================================
   * SRILA PRABHUPADA'S ROOM — OSM way 334983477
   * ================================================================ */
  /*
   * "A plastered ROOM inside the courtyard block: thick masonry walls, cream/buff
   * render ... a deep arched wall niche, a roshandan ventilator grille set high
   * above door height, a six-panel timber double door ... and a floor of large
   * irregular rough-dressed stone flags", a seated murti of Prabhupada, brass
   * stanchions with red rope, and the plaque "The Radha Damodar Temple, founded
   * by Srila Jiva Goswami in 1542". No dado here (the checker's photograph).
   * Its door is on the passage along the hall's north side.
   */
  const PR = { lx0: 1.27, lx1: 5.87, lz0: -5.14, lz1: -1.94 };
  const PASS = { lz0: PR.lz1, lz1: HL.lz0 - 0.6 };            // the passage north of the hall
  {
    const yR = topOf(PR.lx0, PR.lx1, PR.lz0, PR.lz1, 2), FR = yR + 0.15, T = 0.45, H = 4.6;
    const IX0 = PR.lx0 + T, IX1 = PR.lx1 - T, IZ0 = PR.lz0 + T, IZ1 = PR.lz1 - T;
    for (const [lx, lz, w, d] of [[(PR.lx0 + PR.lx1) / 2, PR.lz0 + T / 2, PR.lx1 - PR.lx0, T], [PR.lx0 + T / 2, (PR.lz0 + PR.lz1) / 2, T, PR.lz1 - PR.lz0],
      [PR.lx1 - T / 2, (PR.lz0 + PR.lz1) / 2, T, PR.lz1 - PR.lz0]]) {
      box(lx, yR - 0.1, lz, w, H, d, C.ROOM);
      solid(lx, lz, w, d, { top: yR + H });
    }
    // the south wall, its door onto the passage
    const DX = 3.6, DW2 = 1.1;
    for (const [a, c] of [[PR.lx0, DX - DW2 / 2], [DX + DW2 / 2, PR.lx1]]) {
      box((a + c) / 2, yR - 0.1, PR.lz1 - T / 2, c - a, H, T, C.ROOM);
      solid((a + c) / 2, PR.lz1 - T / 2, c - a, T, { top: yR + H });
    }
    box(DX, FR + 2.2, PR.lz1 - T / 2, DW2, H - 2.3, T, C.ROOM);
    for (const s of [-1, 1]) box(DX + s * 0.5, FR, PR.lz1 - T - 0.25, 0.08, 2.15, 0.5, C.WOOD);   // the leaves, open
    // the roshandan high above the door
    panel(DX, FR + 3.2, PR.lz1 + 0.01, 0.8, 0.45, 'S', 0x3a3430);
    box((PR.lx0 + PR.lx1) / 2, yR + H, (PR.lz0 + PR.lz1) / 2, PR.lx1 - PR.lx0 + 0.2, 0.25, PR.lz1 - PR.lz0 + 0.2, tint(C.ROOM, 0.85));
    // the floor of large rough flags
    box((IX0 + IX1) / 2, yR - 0.1, (IZ0 + IZ1) / 2, IX1 - IX0, FR - yR + 0.1, IZ1 - IZ0, tint(C.FLAG, 0.9));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const a = IX0 + i * (IX1 - IX0) / 4, c = a + (IX1 - IX0) / 4, d0 = IZ0 + j * (IZ1 - IZ0) / 2, d1 = d0 + (IZ1 - IZ0) / 2;
      lq([a + 0.02, FR + 0.002, d0 + 0.02], [a + 0.02, FR + 0.002, d1 - 0.02], [c - 0.02, FR + 0.002, d1 - 0.02], [c - 0.02, FR + 0.002, d0 + 0.02], tint(C.FLAG, 0.92 + 0.14 * hash(i * 3 + j)));
    }
    solid((IX0 + IX1) / 2, (IZ0 + IZ1 + 0.45) / 2, IX1 - IX0, IZ1 - IZ0 + 0.45, { top: FR, tag: 'rd-room-floor', floor: true });
    // the reddish-brown pilaster strip, the arched niche, the plaque
    panel(IX0 + 0.01, FR + 1.5, (IZ0 + IZ1) / 2 - 0.9, 0.2, 3.0, 'E', 0x8a4a34);
    arch(IX1 - 0.02, FR + 1.0, (IZ0 + IZ1) / 2, 0.8, 1.3, 'z', tint(C.ROOM, 1.08), 5, tint(C.ROOM, 0.6), 0.06);
    panel((IX0 + IX1) / 2 + 0.8, FR + 1.7, IZ0 + 0.01, 0.6, 0.4, 'S', 0xe8e4d8);
    // the murti, seated, on a low dais against the north wall, behind a red rope
    const MX = (IX0 + IX1) / 2 - 0.4, MZ = IZ0 + 0.55;
    box(MX, FR, MZ, 1.1, 0.45, 0.8, 0xe8e2d4);
    box(MX, FR + 0.45, MZ, 0.8, 0.3, 0.6, C.SAFFRON);                // seated, crossed legs, saffron
    box(MX, FR + 0.75, MZ + 0.02, 0.48, 0.55, 0.34, C.SAFFRON);
    box(MX, FR + 1.3, MZ + 0.02, 0.22, 0.26, 0.22, 0xc9935f);
    box(MX, FR + 1.12, MZ + 0.2, 0.32, 0.12, 0.06, 0xe8891f);         // a garland
    for (const s of [-1, 1]) box(MX + s * 0.75, FR, MZ + 0.75, 0.06, 0.9, 0.06, C.GOLD);
    box(MX, FR + 0.82, MZ + 0.75, 1.5, 0.04, 0.04, 0xb3221c);
    solid(MX, MZ + 0.1, 1.6, 1.0, { top: FR + 0.9 });
    const c = p((IX0 + IX1) / 2, (IZ0 + IZ1) / 2);
    rooms.push({
      id: 'radha-damodar-prabhupada',
      name: "Srila Prabhupada's rooms",
      hindi: 'श्रील प्रभुपाद का भजन कक्ष',
      deity: 'Srila Prabhupada',
      x: c[0], z: c[1], hw: (IX1 - IX0) / 2, hd: (IZ1 - IZ0) / 2, rot,
      door: p(DX, PR.lz1 + 0.9),
      ceil: yR + H - 0.05,
    });
  }
  // the passage north of the hall, from the court to the room and the north yard
  {
    const y = topOf(-1.5, CT.lx0, PASS.lz0, PASS.lz1, 2);
    box((-1.5 + CT.lx0) / 2, y - 0.2, (PASS.lz0 + PASS.lz1) / 2, CT.lx0 + 1.5, 0.22, PASS.lz1 - PASS.lz0, C.SLAB);
    // its north side east of the room, against the court's corner
    wall(PR.lx1, PR.lz1, CT.lx0 - 0.2, PR.lz1, y - 0.15, 4.0, 0.3, C.RENDER);
    wall(PR.lx1, PR.lz0, PR.lx1, PR.lz1, y - 0.15, 4.0, 0.3, C.RENDER);
    wall(PR.lx1, PR.lz0, POLY[7][0], POLY[7][1], y - 0.15, 4.0, 0.3, C.RENDER);
    // a modern sheet over it, on angle-iron
    box((-1.5 + CT.lx0) / 2, y + 3.2, (PASS.lz0 + PASS.lz1) / 2, CT.lx0 + 1.5, 0.05, PASS.lz1 - PASS.lz0 + 0.3, 0x9aa0a2);
  }

  /*
   * The parts of the compound no source describes — the Goswamis' quarters,
   * the kitchen — as plain rendered two-storey blocks, so the compound is a
   * block of building with courts in it and not open ground. INFERRED.
   */
  for (const [X0, X1, Z0, Z1, col] of [[-10.6, HL.lx0 - 0.6, PASS.lz1, HL.lz1 + 0.6, C.RENDER], [-13.6, -1.5, -5.6, PASS.lz0, tint(C.RENDER, 0.95)]]) {
    const y = topOf(X0, X1, Z0, Z1, 2) - 0.1;
    box((X0 + X1) / 2, y, (Z0 + Z1) / 2, X1 - X0, 7.0, Z1 - Z0, col);
    box((X0 + X1) / 2, y + 7.0, (Z0 + Z1) / 2, X1 - X0 + 0.15, 0.2, Z1 - Z0 + 0.15, tint(col, 0.86));
    solid((X0 + X1) / 2, (Z0 + Z1) / 2, X1 - X0, Z1 - Z0, { top: y + 7.2 });
    for (let i = 0; i < 3; i++) panel(X0 + (i + 0.5) * (X1 - X0) / 3, y + (i === 1 ? 1.1 : 1.7), Z1 + 0.01, 0.9, i === 1 ? 2.2 : 1.1, 'S', i === 1 ? C.WOOD : 0x3a3430);
  }

  /* ================================================================
   * THE SAMADHI YARDS
   * ================================================================ */
  /** A Bengali chau-chala roof over a cell: eaves sagging mid-side, swept up at the corners. */
  const chala = (cx, cz, W, D, yE, yR, col) => {
    const o2 = 0.32, hw = W / 2 + o2, hd = D / 2 + o2;
    const ridge = Math.max(0, (W - D) / 2) * 0.6;     // a short ridge along the long axis (lx)
    const curve = (s) => 0.24 * Math.pow(2 * s - 1, 4) - 0.12 * (1 - Math.pow(2 * s - 1, 2));
    const NS = 8, NT = 4;
    const side = (E, R) => {
      for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
        const P = (s, t) => {
          const e = E(s), r = R(s), k = 1 - Math.pow(1 - t, 1.6);
          const ye = yE + curve(s);
          return [e[0] + (r[0] - e[0]) * t, ye + (yR - ye) * k, e[1] + (r[1] - e[1]) * t];
        };
        lq2(P(i / NS, j / NT), P(i / NS, (j + 1) / NT), P((i + 1) / NS, (j + 1) / NT), P((i + 1) / NS, j / NT), tint(col, 0.95 + 0.06 * ((i + j) & 1)));
      }
    };
    const R0 = [cx - ridge, cz], R1 = [cx + ridge, cz];
    side((s) => [cx - hw + 2 * hw * s, cz - hd], (s) => [R0[0] + (R1[0] - R0[0]) * s, cz]);
    side((s) => [cx - hw + 2 * hw * s, cz + hd], (s) => [R0[0] + (R1[0] - R0[0]) * s, cz]);
    side((s) => [cx - hw, cz - hd + 2 * hd * s], () => R0);
    side((s) => [cx + hw, cz - hd + 2 * hd * s], () => R1);
    // the fluted collar on the crest and three squat finials in a row
    lathe(cx, cz, [[yR - 0.05, 0.42], [yR + 0.08, 0.38], [yR + 0.16, 0.2]], 16, (i, s) => tint(col, s % 2 ? 0.9 : 1.05));
    for (const dx of [-0.42, 0, 0.42]) {
      const fx = cx + dx;
      lathe(fx, cz, [[yR + 0.1, 0.09], [yR + 0.2, 0.14], [yR + 0.32, 0.1], [yR + 0.4, 0.05], [yR + 0.52, 0.0]], 8, dx === 0 ? C.GOLD : tint(col, 0.95));
    }
  };
  /** A small free-standing samadhi shrine: cell, relief arches, jali, door, chala roof. */
  const shrine = (cx, cz, W, D, wallCol, roofCol, faceS) => {
    const y = topOf(cx - W / 2, cx + W / 2, cz - D / 2, cz + D / 2, 2);
    const yE = y + 2.05;
    box(cx, y - 0.1, cz, W + 0.3, 0.35, D + 0.3, C.ROPE);                   // the plinth and its rope torus
    box(cx, y + 0.25, cz, W, yE - y - 0.25, D, wallCol);
    solid(cx, cz, W + 0.3, D + 0.3, { top: y + 3.6 });
    // the front: three blind ogee arches of ~7 foils in relief, a door between two jalis
    const fz = faceS ? cz + D / 2 + 0.02 : cz - D / 2 - 0.02, f = faceS ? 'S' : 'N';
    for (let k = -1; k <= 1; k++) arch(cx + k * W / 3, y + 0.35, fz, W / 3 - 0.18, 1.6, 'x', C.ACCENT, 7, null, 0.04);
    panel(cx, y + 1.25, fz + (faceS ? 0.01 : -0.01), 0.6, 1.4, f, C.DARK);
    for (const s of [-1, 1]) {
      panel(cx + s * W / 3, y + 1.05, fz + (faceS ? 0.01 : -0.01), Math.min(0.85, W / 3 - 0.3), 1.0, f, C.JALI);
      panel(cx + s * W / 3, y + 1.05, fz + (faceS ? 0.015 : -0.015), Math.min(0.6, W / 3 - 0.5), 0.75, f, tint(C.JALI, 0.7));
    }
    chala(cx, cz, W, D, yE, y + 3.05, roofCol);
    return y;
  };
  // ---- the south yard: Jiva and Krishnadas Kaviraja, sharing an edge (OSM) ----
  {
    const YZ0 = HL.lz1 + 0.6, YZ1 = 25.5;
    const y = topOf(-9, 9.5, YZ0, YZ1, 3);
    // its floor: terracotta-red flags banded with white marble
    for (let i = 0; i < 9; i++) {
      for (let j = 0; YZ0 + j * 1.4 < YZ1; j++) {
        const a = -8.5 + i * 2.0, d0 = YZ0 + j * 1.4;
        lq([a, y + 0.02, d0], [a, y + 0.02, d0 + 1.3], [a + 1.9, y + 0.02, d0 + 1.3], [a + 1.9, y + 0.02, d0], tint(C.RED, 0.92 + 0.12 * hash(i * 5 + j)));
      }
    }
    // the paired samadhi block: Jiva's a cusped shrine, Krishnadas's a doorway
    // with a round arch, gilded consoles, a bilingual plaque and turquoise doors
    const JX = -0.9, KX = 0.87, SZ = 18.45;
    const yS = shrine(JX, SZ, 2.1, 2.2, C.RENDER, C.FRESH, false);
    box(KX, yS - 0.1, SZ, 1.8, 3.0, 2.2, tint(C.RENDER, 0.95));
    solid(KX, SZ, 1.8, 2.2, { top: yS + 3.0 });
    arch(KX, yS + 1.2, SZ - 1.12, 1.4, 1.6, 'x', tint(C.RENDER, 1.05), 1, null, 0.08);
    panel(KX, yS + 1.85, SZ - 1.13, 0.8, 0.4, 'N', C.MW);
    panel(KX, yS + 0.95, SZ - 1.13, 0.9, 1.9, 'N', C.TEAL);
    for (const s of [-1, 1]) box(KX + s * 0.62, yS + 1.75, SZ - 1.2, 0.14, 0.4, 0.18, C.GOLD);
    // rows of small markers round them: white marble aedicules, chest-cenotaphs,
    // conical-capped markers, one red sandstone aedicule
    const marker = (mx, mz, kind, k) => {
      const ym = tH(mx, mz);
      if (kind === 0) {                                // an aedicule on turned colonnettes, a black grille gate
        const col = k % 5 === 0 ? 0xa45a40 : C.MW;
        box(mx, ym, mz, 1.0, 0.25, 1.0, col);
        for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(mx + sx * 0.4, ym + 0.25, mz + sz * 0.4, 0.09, 1.15, 0.09, col);
        box(mx, ym + 1.4, mz, 1.1, 0.12, 1.1, col);
        lathe(mx, mz, [[ym + 1.52, 0.42], [ym + 1.7, 0.3], [ym + 1.82, 0.08], [ym + 1.95, 0]], 8, col);
        panel(mx, ym + 0.8, mz - 0.46, 0.7, 1.0, 'N', C.IRON);
        solid(mx, mz, 1.0, 1.0, { top: ym + 1.9 });
      } else if (kind === 1) {                         // a low chest-cenotaph
        box(mx, ym, mz, 0.9, 0.45, 0.5, C.MW);
        box(mx, ym + 0.45, mz, 1.0, 0.08, 0.6, tint(C.MW, 0.94));
        solid(mx, mz, 0.9, 0.5, { top: ym + 0.53 });
      } else {                                         // a small conical-capped marker
        box(mx, ym, mz, 0.5, 0.7, 0.5, C.MW);
        lathe(mx, mz, [[ym + 0.7, 0.3], [ym + 0.8, 0.28], [ym + 1.4, 0.04], [ym + 1.5, 0]], 10, (i, s) => (s % 2 ? C.MW : tint(C.MW, 0.9)));
        post(mx, mz, 0.3, { top: ym + 1.4 });
      }
    };
    let k = 0;
    for (const [mx, mz] of [[-6.5, 14.5], [-4.6, 14.5], [-2.7, 14.5], [3.2, 14.5], [5.1, 14.5], [-6.5, 21.8], [-4.6, 21.8], [-2.7, 21.8], [3.2, 21.8], [5.1, 21.8], [-5.6, 24.2], [4.2, 24.2]]) {
      marker(mx, mz, k % 3, k); k++;
    }
  }
  // ---- the north yard: Rupa Goswami, Bhugarbha, rows of shrines, under a slab ----
  {
    const y = topOf(-12, 3, -30, -6, 3);
    // the north wall (edge 8-0), whose line the paving must stop short of
    const northWall = (lx) => POLY[8][1] + (lx - POLY[8][0]) / (POLY[0][0] - POLY[8][0]) * (POLY[0][1] - POLY[8][1]);
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 17; j++) {
        const a = -12.5 + i * 1.75, d0 = -30.5 + j * 1.5;
        if (d0 < Math.max(northWall(a), northWall(a + 1.65)) + 0.3) continue;
        lq([a, y + 0.02, d0], [a, y + 0.02, d0 + 1.4], [a + 1.65, y + 0.02, d0 + 1.4], [a + 1.65, y + 0.02, d0], j % 4 === 0 ? C.MW : tint(C.RED, 0.92 + 0.12 * hash(i * 3 + j)));
      }
    }
    /*
     * Rupa Goswami's samadhi (OSM way 334983479, 3.4 x 2.7 m — the roof's
     * outline): the checker's size, about half the survey's — a ~3.5 m shrine,
     * not 5-6 m. Re-plastered white (2019). A second shrine of the same type
     * beside it, salmon, as one photograph shows the two together.
     */
    shrine(-2.73, -17.09, 2.75, 2.1, C.FRESH, C.FRESH, true);
    shrine(-7.2, -17.0, 2.5, 2.0, tint(C.SALMON, 1.05), C.SALMON, true);
    // Bhugarbha Goswami's (334983480, 1.5 m²): a small marker shrine
    {
      const mx = 0.57, mz = -25.04, ym = tH(mx, mz);
      box(mx, ym, mz, 1.2, 0.3, 1.2, C.MW);
      box(mx, ym + 0.3, mz, 0.95, 1.1, 0.95, C.MW);
      lathe(mx, mz, [[ym + 1.4, 0.62], [ym + 1.55, 0.55], [ym + 2.2, 0.08], [ym + 2.35, 0]], 12, tint(C.MW, 0.95));
      panel(mx, ym + 0.8, mz + 0.48, 0.5, 0.7, 'S', C.IRON);
      solid(mx, mz, 1.2, 1.2, { top: ym + 2.2 });
    }
    // the rows of smaller shrines and markers between them
    for (const [mx, mz, kind] of [[-10.5, -12.5, 0], [-8.6, -12.5, 2], [-6.7, -12.5, 0], [-4.8, -12.5, 1], [-0.6, -12.5, 0], [1.3, -12.5, 2],
      [-10.5, -21.5, 2], [-8.6, -21.5, 0], [-6.7, -21.5, 1], [-4.8, -21.5, 0], [-2.9, -21.5, 2], [-10.5, -26.5, 0], [-8.0, -26.5, 1], [-5.6, -26.5, 0]]) {
      const ym = tH(mx, mz);
      if (kind === 0) {
        box(mx, ym, mz, 1.0, 0.25, 1.0, C.MW);
        for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(mx + sx * 0.4, ym + 0.25, mz + sz * 0.4, 0.09, 1.15, 0.09, C.MW);
        box(mx, ym + 1.4, mz, 1.1, 0.12, 1.1, C.MW);
        lathe(mx, mz, [[ym + 1.52, 0.42], [ym + 1.7, 0.3], [ym + 1.82, 0.08], [ym + 1.95, 0]], 8, C.MW);
        panel(mx, ym + 0.8, mz + 0.46, 0.7, 1.0, 'S', C.IRON);
        solid(mx, mz, 1.0, 1.0, { top: ym + 1.9 });
      } else if (kind === 1) {
        box(mx, ym, mz, 0.9, 0.45, 0.5, C.MW);
        box(mx, ym + 0.45, mz, 1.0, 0.08, 0.6, tint(C.MW, 0.94));
        solid(mx, mz, 0.9, 0.5, { top: ym + 0.53 });
      } else {
        box(mx, ym, mz, 0.5, 0.7, 0.5, C.MW);
        lathe(mx, mz, [[ym + 0.7, 0.3], [ym + 0.8, 0.28], [ym + 1.4, 0.04], [ym + 1.5, 0]], 10, (i, s) => (s % 2 ? C.MW : tint(C.MW, 0.9)));
        post(mx, mz, 0.3, { top: ym + 1.4 });
      }
    }
    // the modern slab over the shrines, on tall blue square columns (the
    // checker, Braj Ras 03): here the tallest thing is the canopy
    const SY = y + 4.4;
    box(-5.0, SY, -17.0, 13.0, 0.25, 9.0, C.CONCRETE);
    for (const cx of [-11.0, -5.0, 1.0]) for (const cz of [-21.0, -13.0]) {
      box(cx, y, cz, 0.35, SY - y, 0.35, C.BLUE);
      post(cx, cz, 0.25, { top: SY });
    }
    for (const cx of [-8, -2]) box(cx, SY - 0.6, -17.0, 0.04, 0.6, 0.04, 0x222222);
    for (const cx of [-8, -2]) box(cx, SY - 0.62, -17.0, 1.2, 0.05, 0.08, 0xf4f4f0);
    // the tall bare lakhori-brick mass behind (whose, nobody can say)
    box(-6.0, y - 0.1, -31.5, 9.0, 10.5, 2.0, C.BRICK);
    for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 4; c2++) panel(-9.3 + c2 * 2.2, y + 3.0 + r * 3.0, -30.48, 0.35, 0.35, 'S', 0x241e1a);
    solid(-6.0, -31.5, 9.0, 2.0, { top: y + 10.4 });
  }

  return {
    altar: { lx: ALT.lx, lz: ALT.lz, y: HFL + 2.0 },
    darshan: { lx: 6.6, lz: AXZ },
    hall: { lx0: HL.lx0, lx1: FX + 0.4, lz0: HL.lz0, lz1: HL.lz1, door: [FX + 3.0, AXZ] },
    FL: HFL,
    rooms,
  };
}
