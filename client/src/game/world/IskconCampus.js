/**
 * SRI SRI KRISHNA-BALARAM MANDIR — THE CAMPUS.
 *
 * "still iskcon does not look at all how it actually is? there are lot of
 * shops there with back and front gates with guards in real with outer
 * corridors having srila prabhupada deity on some place and museum as well?"
 *
 * Everything inside the fence and along the road, apart from the temple block
 * itself, which LandmarkGenerator's buildKrishnaBalaram still draws.
 *
 * Every outline here is OpenStreetMap (ODbL), fetched through Overpass on
 * 2026-09-30 and turned into the builder's frame: the origin on the temple
 * block's centre (way 334202009), +lz toward Bhaktivedanta Swami Marg, +lx
 * along the site grid's cross axis (bearing 77.7). The survey and its checker
 * are docs/research/iskcon-krishna-balaram.md; what is taken from them is
 * quoted where it is used, and what is not measured says INFERRED.
 */

import { TAU } from '../../engine/math/MathUtils.js';
import { campusSign } from './Signage.js';

/** OSM outlines, in the builder's frame. */
export const KB_OSM = {
  // way 334202001, "Sri Sri Krishna-Balaram Mandir", barrier=fence
  compound: [
    [-19.49, -76.29], [-19.63, -30.75], [-19.70, -16.41], [-19.65, -11.67], [-19.60, -6.89],
    [-19.65, 2.63], [-19.73, 7.05], [-19.77, 10.00], [-19.80, 12.59], [-19.85, 15.34],
    [-19.90, 55.26], [2.86, 53.86], [54.77, 50.05], [80.91, 48.13], [95.21, 47.07],
    [103.57, -68.47], [54.78, -71.56],
  ],
  // way 334202000, "Shrila Prabhupada's samadhi"
  samadhi: [[-18.18, 18.21], [-17.52, 39.46], [-7.44, 39.47], [-1.82, 29.87], [-1.81, 25.66], [-10.65, 18.23]],
  // way 334201999, "Shrila Prabhupada's museum"
  museum: [[3.74, 25.04], [3.63, 29.32], [9.87, 38.97], [16.10, 38.51], [17.69, 35.40], [26.15, 34.93],
    [25.55, 25.01], [25.46, 17.98], [18.23, 18.15], [10.50, 18.68]],
};

/** The survey's colours, DERIVED from photographs (±5 V, ±8° H). */
const C = {
  MARBLE: 0xf2ede1,     // "White marble, full sun"
  MARBLE_SH: 0xd6cfc1,  // "White marble, shade"
  VEIN: 0xbdb7ac,       // "Marble grey veining"
  GILT: 0xc9a227,       // "Gilded kalash"
  SAFFRON: 0xee7b14,    // "Saffron flag"
  CREAM: 0xeadcb4,      // "Cream/buff plaster, sun"
  CREAM_SH: 0xc6b38c,
  SALMON: 0xe3a783,     // "Salmon-pink mouldings and ornament"
  GREEN: 0x9da693,      // the checker's grey yellow-green, not the survey's celadon
  PINK: 0xc97b5c,       // "Deeper pink outline on the gate and boundary murals"
  CHQ_W: 0xe3e1da,      // "Chequerboard, white square"
  CHQ_B: 0x26282a,      // "Chequerboard, black square"
  IRON: 0x1c1c1c,       // "Wrought iron"
  WOOD: 0x5a3a22,       // "heavy brown studded wooden doors"
  EARTH: 0xb0703a,      // "bare orange earth" of the construction site
};

const inPoly = (pts, x, z) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
const area2 = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    a += x0 * z1 - x1 * z0;
  }
  return a;
};
const centroid = (pts) => {
  let x = 0, z = 0;
  for (const q of pts) { x += q[0]; z += q[1]; }
  return [x / pts.length, z / pts.length];
};

/**
 * @param o.b         the landmark MeshBuilder
 * @param o.signB     a MeshBuilder textured with the sign atlas
 * @param o.p         (lx, lz) -> world [x, z], the builder's box frame
 * @param o.rot       the builder's rotation
 * @param o.ground    the builder's ground (terrain at the temple's centre)
 * @param o.terrain   for sampling ground under things
 * @param o.colliders pushed to
 * @param o.helpers   { cuspedArch, shikhara, ribbedDome, tint, buildSeated, buildStanding, PEOPLE, place }
 */
export function buildIskconCampus(o) {
  const { b, signB, p, rot, ground, terrain, colliders, rng } = o;
  const { cuspedArch, shikhara, ribbedDome, tint, buildSeated, buildStanding, PEOPLE, place } = o.helpers;
  const cs = Math.cos(rot), sn = Math.sin(rot);

  const tH = (lx, lz) => {
    const q = p(lx, lz);
    return terrain && terrain.sampleHeight ? terrain.sampleHeight(q[0], q[1]) : ground;
  };
  /** The highest ground under a local rectangle: what a floor is laid at. */
  const topOf = (lx0, lx1, lz0, lz1, n = 3) => {
    let hi = -Infinity;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const h = tH(lx0 + (lx1 - lx0) * (i / n), lz0 + (lz1 - lz0) * (j / n));
        if (h > hi) hi = h;
      }
    }
    return hi;
  };
  /** A box in LOCAL coordinates, turned with the site (plus a local angle). */
  const box = (lx, y, lz, w, h, d, color, ang = 0) => {
    const q = p(lx, lz);
    b.box(q[0], y, q[1], w, h, d, color, rot + ang);
  };
  const solid = (lx, lz, w, d, ang = 0, extra = {}) => {
    const q = p(lx, lz);
    colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot: rot + ang, ...extra });
  };
  const post = (lx, lz, r, extra = {}) => {
    const q = p(lx, lz);
    colliders.push({ type: 'circle', x: q[0], z: q[1], r, ...extra });
  };
  /** A sign: a board from the atlas facing local direction `face` (radians in the local frame). */
  const sign = (key, lx, y, lz, w, h, faceAngLocal) => {
    const slot = typeof key === 'number' ? key : campusSign(key);
    if (slot < 0 || !signB) return;
    const q = p(lx, lz);
    // panelUV faces (sin r, cos r); a local facing angle a (from +lx) is world
    // direction (cos(rot+a), sin(rot+a)), so r = atan2(cos(rot+a), sin(rot+a))
    const wa = rot + faceAngLocal;
    signB.panelUV(q[0], y, q[1], w, h, o.signUV(slot), Math.atan2(Math.cos(wa), Math.sin(wa)), 0.05);
  };
  // local facing angles: +lx is 0, +lz is PI/2, -lz is -PI/2, -lx is PI
  const FACE = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
  /** panel()/panelUV() face (sin r, cos r): the r that faces a LOCAL angle. */
  const faceR = (localAng) => { const wa = rot + localAng; return Math.atan2(Math.cos(wa), Math.sin(wa)); };

  /* ================================================================
   * THE GATES — two of them, each with its guards
   * ================================================================ */
  const edgeDir = (a, c) => { const L = Math.hypot(c[0] - a[0], c[1] - a[1]); return [(c[0] - a[0]) / L, (c[1] - a[1]) / L]; };
  const CP = KB_OSM.compound;
  const mu = edgeDir(CP[10], CP[11]);
  const wu = edgeDir(CP[1], CP[2]);
  const GATES = [
    // the main gate: on Bhaktivedanta Swami Marg, on the axis through the
    // great arch — "Enter through the cream gatehouse ... walk north ... pass
    // UNDER the great marble arch"; OSM's fence turns at lx 2.9 just beside it
    { id: 'main', at: [0.9, 55.26 + (0.9 + 19.9) / 22.76 * (53.86 - 55.26)], u: mu, v: [mu[1], -mu[0]], half: 3.0 },
    // "A secondary lane runs along the WEST side with a green metal gate" —
    // where on the west fence is not surveyed: between the guesthouse and the
    // first kiosk is the one stretch with nothing built against it (INFERRED)
    { id: 'west', at: [-19.665, -23.5], u: wu, v: [wu[1], -wu[0]], half: 2.2 },
  ];
  for (const g of GATES) {
    // v must point INTO the compound
    const probe = [g.at[0] + g.v[0] * 3, g.at[1] + g.v[1] * 3];
    if (!inPoly(CP, probe[0], probe[1])) g.v = [-g.v[0], -g.v[1]];
  }
  const inGate = (lx, lz, pad = 0) => GATES.some((g) => {
    const dx = lx - g.at[0], dz = lz - g.at[1];
    return Math.abs(dx * g.u[0] + dz * g.u[1]) < g.half + pad && Math.abs(dx * g.v[0] + dz * g.v[1]) < 1.2;
  });

  /* ================================================================
   * THE GROUND: paved, as all of it is
   * ================================================================ */
  /*
   * "Marble is confined to ... (iv) all the paving." Laid in 2 m tiles, each at
   * the highest ground under it, and merged into runs, so no blade of terrain
   * comes through and the feet stand on what is drawn. The temple block has
   * floors of its own and is left out.
   */
  const inTemple = (lx, lz) => (Math.abs(lx) < 12.4 && Math.abs(lz) < 16.2)
    || (lx > 26.2 && lx < 93.0 && lz > -12.5 && lz < 20.8);      // and the building site
  const solidPolys = [KB_OSM.samadhi, KB_OSM.museum];
  {
    const T = 2.0;
    const xs = CP.map((q) => q[0]), zs = CP.map((q) => q[1]);
    const X0 = Math.min(...xs), X1 = Math.max(...xs), Z0 = Math.min(...zs), Z1 = Math.max(...zs);
    for (let lz = Z0 + T / 2; lz < Z1; lz += T) {
      let run = null;
      const flush = () => {
        if (!run) return;
        const cx = (run.x0 + run.x1) / 2, w = run.x1 - run.x0;
        box(cx, run.top - 0.35, lz, w, 0.35, T, C.CHQ_W);
        solid(cx, lz, w, T, 0, { top: run.top, tag: 'kb-paving', standOnly: true });
        run = null;
      };
      for (let lx = X0 + T / 2; lx < X1; lx += T) {
        const ok = inPoly(CP, lx, lz) && !inTemple(lx, lz) && !solidPolys.some((q) => inPoly(q, lx, lz));
        if (!ok) { flush(); continue; }
        const top = topOf(lx - T / 2, lx + T / 2, lz - T / 2, lz + T / 2, 1) + 0.04;
        if (run && Math.abs(top - run.top) < 0.03 && run.x1 > lx - T * 0.51) {
          run.x1 = lx + T / 2; run.top = Math.max(run.top, top);
        } else { flush(); run = { x0: lx - T / 2, x1: lx + T / 2, top }; }
      }
      flush();
    }
  }
  const pave = (lx, lz) => topOf(lx - 1, lx + 1, lz - 1, lz + 1, 1) + 0.04;

  /* ================================================================
   * THE COMPOUND WALL, along the fence OSM has traced
   * ================================================================ */
  {
    const WALL_H = 2.6, WALL_T = 0.45;
    const n = CP.length;
    for (let i = 0; i < n; i++) {
      const A = CP[i], B = CP[(i + 1) % n];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const STEP = 0.25;
      let t0 = null;
      const emit = (ta, tb) => {
        if (tb - ta < 0.3) return;
        const m = [A[0] + (B[0] - A[0]) * ((ta + tb) / 2 / L), A[1] + (B[1] - A[1]) * ((ta + tb) / 2 / L)];
        const base = Math.min(tH(A[0] + (B[0] - A[0]) * (ta / L), A[1] + (B[1] - A[1]) * (ta / L)),
          tH(A[0] + (B[0] - A[0]) * (tb / L), A[1] + (B[1] - A[1]) * (tb / L)), tH(m[0], m[1])) - 0.15;
        box(m[0], base, m[1], tb - ta, WALL_H + 0.15, WALL_T, C.CREAM, ang);
        box(m[0], base + WALL_H + 0.15, m[1], tb - ta + 0.04, 0.14, WALL_T + 0.16, C.SALMON, ang);
        solid(m[0], m[1], tb - ta, WALL_T + 0.35, ang);
      };
      for (let t = 0; t <= L + 1e-6; t += STEP) {
        const lx = A[0] + (B[0] - A[0]) * (t / L), lz = A[1] + (B[1] - A[1]) * (t / L);
        const gap = inGate(lx, lz);
        if (!gap && t0 === null) t0 = t;
        if (gap && t0 !== null) { emit(t0, t); t0 = null; }
      }
      if (t0 !== null) emit(t0, L);
    }
  }

  /* ---- figures, which the gates need ---- */
  /*
   * GUARDS. The research does not mention them; you did: "back and front gates
   * with guards in real". The uniform is INFERRED — navy trousers and a pale
   * blue shirt with a peaked cap and a lathi is what private security wears
   * at temple gates across north India — and nothing here claims more.
   */
  const guard = (lx, lz, faceLocal) => {
    const y = pave(lx, lz);
    const wa = rot + faceLocal;
    const fx = Math.cos(wa), fz = Math.sin(wa);     // facing, world
    const rx = -fz, rz = fx;                        // his right, world
    const q = p(lx, lz);
    // box w runs along its rotation, so turn a quarter to put w ACROSS the body
    const at = (r, f, yy, w, h, d, col) => b.box(q[0] + rx * r + fx * f, y + yy, q[1] + rz * r + fz * f, w, h, d, col, wa + Math.PI / 2);
    const NAVY = 0x27324a, SHIRT = 0x9fb7d6, SKIN = 0xa9743f;
    at(-0.1, 0, 0, 0.14, 0.84, 0.16, NAVY);           // legs
    at(0.1, 0, 0, 0.14, 0.84, 0.16, NAVY);
    at(0, 0, 0.84, 0.42, 0.12, 0.24, 0x1b1b1f);       // belt
    at(0, 0, 0.96, 0.44, 0.52, 0.25, SHIRT);          // shirt
    at(0, 0, 1.48, 0.13, 0.08, 0.13, SKIN);           // neck
    at(0, 0, 1.56, 0.2, 0.22, 0.21, SKIN);            // head
    at(0, 0.02, 1.76, 0.24, 0.07, 0.26, NAVY);        // cap
    at(0, 0.12, 1.76, 0.2, 0.03, 0.1, 0x151a28);      // its peak
    at(-0.28, 0, 0.86, 0.1, 0.62, 0.11, SHIRT);       // arms
    at(0.28, 0, 0.86, 0.1, 0.62, 0.11, SHIRT);
    at(0.36, 0.06, 0.1, 0.04, 1.3, 0.04, 0xc8a86a);   // the lathi
    post(lx, lz, 0.32, { h: 1.8, tag: 'kb-guard' });
  };
  const booth = (lx, lz, ang) => {
    const y = pave(lx, lz);
    box(lx, y, lz, 1.6, 2.4, 1.6, C.CREAM, ang);
    box(lx, y + 2.4, lz, 1.9, 0.18, 1.9, C.SALMON, ang);
    box(lx, y + 1.1, lz, 1.62, 0.7, 1.0, 0x3a4a52, ang);   // its window band
    solid(lx, lz, 1.6, 1.6, ang);
  };

  /* ---- the main gatehouse ---- */
  /*
   * "A cream/buff painted gatehouse with pink-outlined arches, two cream domed
   * chhatris with pink-tipped finials, a tall cusped-arch portal with heavy
   * brown studded wooden doors, a framed deity painting on each side, and
   * black wrought-iron double gates with ornamental scrollwork. NOT marble."
   * Its dimensions are not surveyed; these are sized to the 6 m opening.
   */
  {
    const g = GATES[0];
    const ang = Math.atan2(g.u[1], g.u[0]);
    const y = pave(g.at[0], g.at[1]);
    const at = (a, v) => [g.at[0] + g.u[0] * a + g.v[0] * v, g.at[1] + g.u[1] * a + g.v[1] * v];
    const PW = 2.4, PD = 3.2, PH = 6.2;
    for (const sd of [-1, 1]) {
      const [lx, lz] = at(sd * (g.half + PW / 2), 0);
      box(lx, y - 0.2, lz, PW, PH + 0.2, PD, C.CREAM, ang);
      for (const hy of [0.9, 4.4]) box(lx, y + hy, lz, PW + 0.12, 0.22, PD + 0.12, C.SALMON, ang);
      box(lx, y + PH, lz, PW + 0.3, 0.3, PD + 0.3, C.SALMON, ang);
      solid(lx, lz, PW, PD, ang);
      // a pink-outlined arch on the road face of each pier, framing its painting
      const [fx, fz] = at(sd * (g.half + PW / 2), PD / 2 + 0.02);
      const [ox, oz] = at(sd * (g.half + PW / 2), -(PD / 2 + 0.02));
      for (const [ax, az] of [[fx, fz], [ox, oz]]) {
        const q = p(ax, az);
        cuspedArch(b, q[0], y + 1.3, q[1], 1.6, 2.8, 0.1, rot + ang, C.PINK, 5, 0x3d6b45);
      }
      // the framed deity painting, road side: gold frame, and the two
      // brothers — dark blue Krishna, white Balaram — which is who this is
      {
        const face = faceR(Math.atan2(-g.v[1], -g.v[0]));        // toward the road
        const q = p(...at(sd * (g.half + PW / 2), -(PD / 2 + 0.06)));
        const ux = Math.cos(rot + ang), uz = Math.sin(rot + ang);
        b.panel(q[0], y + 2.5, q[1], 1.2, 1.5, C.GILT, face, 0.02);
        b.panel(q[0], y + 2.5, q[1], 1.02, 1.32, 0x2f5a3a, face, 0.04);
        b.panel(q[0] - ux * 0.22, y + 2.42, q[1] - uz * 0.22, 0.26, 0.86, 0x2b3f7a, face, 0.06);
        b.panel(q[0] + ux * 0.22, y + 2.42, q[1] + uz * 0.22, 0.26, 0.86, 0xf2ece0, face, 0.06);
      }
      // a cream domed chhatri on each pier, pink-tipped
      const [cx, cz] = at(sd * (g.half + PW / 2), 0);
      const cq = p(cx, cz);
      for (let k = 0; k < 4; k++) {
        const a2 = (k / 4) * TAU + Math.PI / 4;
        b.box(cq[0] + Math.cos(a2) * 0.75, y + PH + 0.3, cq[1] + Math.sin(a2) * 0.75, 0.2, 1.4, 0.2, C.CREAM);
      }
      b.box(cq[0], y + PH + 1.7, cq[1], 2.0, 0.18, 2.0, C.SALMON, rot + ang);
      ribbedDome(b, cq[0], y + PH + 1.88, cq[1], 0.95, 1.1, C.CREAM, C.CREAM_SH, 16);
      b.box(cq[0], y + PH + 3.0, cq[1], 0.12, 0.45, 0.12, C.PINK);
    }
    // the portal between the piers, and the attic over it
    {
      const q = p(g.at[0], g.at[1]);
      cuspedArch(b, q[0], y, q[1], g.half * 2, 5.4, PD, rot + ang, C.CREAM, 7, null);
      const [ax, az] = at(0, 0);
      box(ax, y + 5.4, az, g.half * 2 + 0.2, PH - 5.4, PD, C.CREAM, ang);
      box(ax, y + PH, az, g.half * 2 + 0.3, 0.3, PD + 0.3, C.SALMON, ang);
      // the name over the gate, on both faces
      const [ix, iz] = at(0, PD / 2 + 0.05), [ox, oz] = at(0, -(PD / 2 + 0.05));
      sign('mandir', ix, y + 5.8, iz, 4.6, 0.95, Math.atan2(g.v[1], g.v[0]));
      sign('mandir', ox, y + 5.8, oz, 4.6, 0.95, Math.atan2(-g.v[1], -g.v[0]));
    }
    // the doors stand open against the jambs: studded wood inside, iron outside
    for (const sd of [-1, 1]) {
      const [dx, dz] = at(sd * (g.half - 0.1), -0.9);
      box(dx, y, dz, 0.14, 4.4, 2.6, C.WOOD, ang);
      for (let r2 = 0; r2 < 5; r2++) {
        for (let c2 = 0; c2 < 3; c2++) {
          const [sx, sz] = at(sd * (g.half - 0.18), -0.9 - 0.9 + c2 * 0.9);
          box(sx, y + 0.5 + r2 * 0.85, sz, 0.06, 0.1, 0.1, 0x2a2018, ang);
        }
      }
      const [ix, iz] = at(sd * (g.half - 0.1), 1.2);
      for (let k = 0; k < 9; k++) {
        const [bx, bz] = at(sd * (g.half - 0.1), 1.2 - 1.0 + k * 0.25);
        box(bx, y, bz, 0.05, 2.6, 0.05, C.IRON, ang);
      }
      box(ix, y + 0.2, iz, 0.06, 0.08, 2.2, C.IRON, ang);
      box(ix, y + 2.5, iz, 0.06, 0.08, 2.2, C.IRON, ang);
      // the guards, just inside, facing the road
      const [gx, gz] = at(sd * (g.half - 0.9), -2.6);
      guard(gx, gz, Math.atan2(-g.v[1], -g.v[0]));
    }
    const [bx, bz] = at(g.half + 3.6, -3.2);
    booth(bx, bz, ang);
  }

  /* ---- the west gate: "a green metal gate" ---- */
  {
    const g = GATES[1];
    const ang = Math.atan2(g.u[1], g.u[0]);
    const y = pave(g.at[0], g.at[1]);
    const at = (a, v) => [g.at[0] + g.u[0] * a + g.v[0] * v, g.at[1] + g.u[1] * a + g.v[1] * v];
    for (const sd of [-1, 1]) {
      const [lx, lz] = at(sd * (g.half + 0.45), 0);
      box(lx, y - 0.15, lz, 0.9, 3.2, 0.9, C.CREAM, ang);
      box(lx, y + 3.05, lz, 1.1, 0.25, 1.1, C.SALMON, ang);
      solid(lx, lz, 0.9, 0.9, ang);
    }
    // both leaves swung in against the wall and left open, green-painted iron
    // (open by day is INFERRED; so is which way they swing)
    for (const sd of [-1, 1]) {
      const [lx, lz] = at(sd * (g.half - 0.06), 1.15);
      for (let k = 0; k < 8; k++) {
        const [bx, bz] = at(sd * (g.half - 0.06), 0.15 + k * 0.28);
        box(bx, y, bz, 0.05, 2.2, 0.05, 0x2f5a3a, ang);
      }
      box(lx, y + 0.15, lz, 0.06, 0.08, 2.1, 0x2f5a3a, ang);
      box(lx, y + 2.1, lz, 0.06, 0.08, 2.1, 0x2f5a3a, ang);
      solid(lx, lz, 0.2, 2.1, ang);
    }
    // the guard stands to one side of the way in, not in it
    const [gx, gz] = at(g.half - 0.7, 2.8);
    guard(gx, gz, Math.atan2(-g.v[1], -g.v[0]));
    const [bx, bz] = at(g.half + 2.4, 2.6);
    booth(bx, bz, ang);
  }

  /* ================================================================
   * THE OUTER ARCADED APPROACH, from the gate to the great arch
   * ================================================================ */
  /*
   * "Same cream piers and cusped arches, but freestanding and lined with large
   * mural paintings in pink-outlined cusped frames set into the boundary wall.
   * Distinctive detail: large CHALICE/GOBLET-SHAPED PLANTERS sit on top of
   * short piers along the walk. Paving here is chequerboard laid orthogonally,
   * not diagonally."
   */
  {
    const AX = 0.9, Z0 = 40.6, Z1 = 52.4, OFF = 4.6, BAYS = 4;
    const bay = (Z1 - Z0) / BAYS;
    for (const sd of [-1, 1]) {
      for (let i = 0; i <= BAYS; i++) {
        const lz = Z0 + i * bay, lx = AX + sd * OFF;
        const y = pave(lx, lz);
        box(lx, y, lz, 0.6, 3.3, 0.6, C.CREAM);
        box(lx, y, lz, 0.72, 0.5, 0.72, C.SALMON);
        box(lx, y + 3.3, lz, 0.8, 0.22, 0.8, C.SALMON);
        post(lx, lz, 0.38);
        if (i < BAYS) {
          const mz = lz + bay / 2;
          const q = p(lx, mz);
          // a run along lz: the arch spans along lz, so rot + PI/2
          cuspedArch(b, q[0], y, q[1], bay - 0.6, 4.7, 0.5, rot + Math.PI / 2, C.CREAM, 7, null);
          box(lx, y + 3.52, mz, 0.5, 1.2, bay - 0.6, C.GREEN);
          box(lx, y + 4.72, mz, 0.62, 0.3, bay + 0.2, C.SALMON);
          box(lx, y + 5.02, mz, 0.36, 0.7, bay, C.CREAM);
        }
      }
      // the chalice planters on their short piers, between arcade and path
      for (let i = 0; i < BAYS; i++) {
        const lz = Z0 + (i + 0.5) * bay, lx = AX + sd * (OFF - 1.4);
        const y = pave(lx, lz);
        box(lx, y, lz, 0.55, 0.9, 0.55, C.CREAM);
        const q = p(lx, lz);
        b.prism(q[0], y + 0.9, q[1], 0.18, 0.18, 0.18, 0.18, 0.35, C.CREAM);          // stem
        b.prism(q[0], y + 1.25, q[1], 0.2, 0.2, 0.95, 0.95, 0.55, C.CREAM);           // the cup
        b.box(q[0], y + 1.78, q[1], 0.86, 0.1, 0.86, 0x5a3a24);                       // earth
        b.bevelBox(q[0], y + 1.85, q[1], 0.8, 0.55, 0.8, 0x3f7a3a, 0, 0.2);           // the plant
        post(lx, lz, 0.4);
      }
    }
    // the orthogonal chequer down the walk, from the gate to the arch
    for (let lz = 30.0; lz < 53.2; lz += 0.6) {
      for (let lx = AX - 2.4; lx < AX + 2.4; lx += 0.6) {
        const k = Math.round((lx - AX) / 0.6 + 100) + Math.round(lz / 0.6);
        if (k % 2) continue;
        if (solidPolys.some((q) => inPoly(q, lx, lz))) continue;
        box(lx + 0.3, pave(lx, lz) - 0.005, lz + 0.3, 0.6, 0.02, 0.6, C.CHQ_B);
      }
    }
    // the murals set into the boundary wall either side of the gate, facing in
    const g = GATES[0];
    const wallFace = Math.atan2(g.v[1], g.v[0]);            // local angle of "inward"
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const a = sd * (g.half + 4.2 + i * 3.6);
        const lx = g.at[0] + g.u[0] * a + g.v[0] * 0.26, lz = g.at[1] + g.u[1] * a + g.v[1] * 0.26;
        const y = pave(lx, lz);
        const face = faceR(wallFace);
        const q = p(lx, lz);
        b.panel(q[0], y + 1.55, q[1], 3.0, 2.3, C.PINK, face, 0.02);
        b.panel(q[0], y + 1.55, q[1], 2.7, 2.05, 0x3d6b45, face, 0.04);
        b.panel(q[0], y + 0.8, q[1], 2.7, 0.55, 0x54803f, face, 0.05);
        b.panel(q[0], y + 2.35, q[1], 2.4, 0.4, tint(C.GILT, 0.9), face, 0.05);
        const tx = Math.cos(rot + Math.atan2(g.u[1], g.u[0])), tz = Math.sin(rot + Math.atan2(g.u[1], g.u[0]));
        const s = (i + (sd > 0 ? 1 : 0)) % 2 ? 1 : -1;
        b.panel(q[0] + tx * s * 0.4, y + 1.45, q[1] + tz * s * 0.4, 0.42, 1.05, 0xe8c04c, face, 0.07);
        b.panel(q[0] + tx * s * 0.4, y + 2.1, q[1] + tz * s * 0.4, 0.24, 0.26, 0x2f4f8a, face, 0.08);
        b.panel(q[0] - tx * s * 0.45, y + 1.4, q[1] - tz * s * 0.45, 0.4, 0.95, 0xc8452a, face, 0.07);
        b.panel(q[0] - tx * s * 0.45, y + 2.0, q[1] - tz * s * 0.45, 0.22, 0.24, 0xd8a878, face, 0.08);
      }
    }
  }

  /* ================================================================
   * THE SAMADHI AND THE MUSEUM, on their OSM outlines, and the arch between
   * ================================================================ */
  /**
   * Extrude a local polygon: outward walls and a top, no bottom. `hole` cuts
   * an ARCHED opening through one edge, given by a point on it: {at, hw,
   * crown}, where the arch is a semicircle of half-width hw springing at
   * crown - hw. Without it a door drawn on the wall was a door painted on it.
   */
  const extrude = (pts0, y0, y1, color, topColor = color, hole = null) => {
    const pts = area2(pts0) > 0 ? pts0 : [...pts0].reverse();
    const n = pts.length;
    const W = pts.map((q) => p(q[0], q[1]));
    const wg = b._wg;
    const sh = (ya, yb) => (wg ? [wg(ya), wg(yb), wg(yb), wg(ya)] : undefined);
    const wall = (A, B, ya, yb) => b.quad([A[0], ya, A[1]], [A[0], yb, A[1]], [B[0], yb, B[1]], [B[0], ya, B[1]], color, null, sh(ya, yb));
    for (let i = 0; i < n; i++) {
      const A = W[i], B = W[(i + 1) % n];
      if (hole) {
        const a = pts[i], c = pts[(i + 1) % n];
        const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const u = [(c[0] - a[0]) / L, (c[1] - a[1]) / L];
        const t = (hole.at[0] - a[0]) * u[0] + (hole.at[1] - a[1]) * u[1];
        const off = Math.abs((hole.at[0] - a[0]) * u[1] - (hole.at[1] - a[1]) * u[0]);
        if (off < 0.6 && t - hole.hw > 0.1 && t + hole.hw < L - 0.1) {
          const at2 = (tt) => p(a[0] + u[0] * tt, a[1] + u[1] * tt);
          const t0 = t - hole.hw, t1 = t + hole.hw;
          const crown = Math.min(hole.crown, y1), spring = crown - hole.hw;
          wall(A, at2(t0), y0, y1);
          wall(at2(t1), B, y0, y1);
          if (crown < y1) wall(at2(t0), at2(t1), crown, y1);
          // the spandrels, between the curve and the crown line
          const SEG = 12;
          let last = null;
          for (let k = 0; k <= SEG; k++) {
            const ang = Math.PI * (k / SEG);
            const tt = t - Math.cos(ang) * hole.hw, yy = spring + Math.sin(ang) * hole.hw;
            const Q = at2(tt);
            const cur = { bot: [Q[0], yy, Q[1]], top: [Q[0], crown, Q[1]] };
            if (last) b.quad(last.bot, last.top, cur.top, cur.bot, color);
            last = cur;
          }
          continue;
        }
      }
      wall(A, B, y0, y1);
    }
    const c0 = centroid(pts), cw = p(c0[0], c0[1]);
    for (let i = 0; i < n; i++) {
      const A = W[i], B = W[(i + 1) % n];
      b.tri(cw[0], y1, cw[1], B[0], y1, B[1], A[0], y1, A[1], topColor);
    }
  };
  /** A polygon pushed out (or in) by `d`, near enough for mouldings. */
  const grow = (pts, d) => {
    const n = pts.length, pos = area2(pts) > 0;
    return pts.map((q, i) => {
      const a = pts[(i + n - 1) % n], c = pts[(i + 1) % n];
      const e1 = edgeDir(a, q), e2 = edgeDir(q, c);
      // outward normals of the two edges either side
      const n1 = pos ? [e1[1], -e1[0]] : [-e1[1], e1[0]];
      const n2 = pos ? [e2[1], -e2[0]] : [-e2[1], e2[0]];
      let mx = n1[0] + n2[0], mz = n1[1] + n2[1];
      const L = Math.hypot(mx, mz) || 1; mx /= L; mz /= L;
      const k = d / Math.max(0.35, mx * n1[0] + mz * n1[1]);
      return [q[0] + mx * k, q[1] + mz * k];
    });
  };
  /**
   * Walls along every edge of a polygon, as colliders — laid INSIDE the wall
   * line. Centred on it they stood 0.4 m proud of the face, and a door's top
   * step, which meets the face, was inside the collider: platforms.mjs found
   * both door flights stopping one step short of their doors.
   */
  const edgeWalls = (pts, top, skip = () => false) => {
    const n = pts.length, pos = area2(pts) > 0;
    for (let i = 0; i < n; i++) {
      const A = pts[i], B = pts[(i + 1) % n];
      if (skip(i)) continue;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const u = edgeDir(A, B), inw = pos ? [-u[1], u[0]] : [u[1], -u[0]];
      // as tall as the building and no taller: a chhatri on the roof is not in
      // this wall, and the camera may look over it
      solid((A[0] + B[0]) / 2 + inw[0] * 0.3, (A[1] + B[1]) / 2 + inw[1] * 0.3, L + 0.3, 0.6, Math.atan2(u[1], u[0]), { top });
    }
  };
  /** Bays along each edge: pilasters and cusped recesses with fish-scale jali. */
  const bays = (pts, y0, h, color, jali, skipEdge = () => false, doors = []) => {
    const n = pts.length, pos = area2(pts) > 0;
    for (let i = 0; i < n; i++) {
      if (skipEdge(i)) continue;
      const A = pts[i], B = pts[(i + 1) % n];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 2.6) continue;
      const u = edgeDir(A, B), nrm = pos ? [u[1], -u[0]] : [-u[1], u[0]];
      const ang = Math.atan2(u[1], u[0]);
      const nb = Math.max(1, Math.round(L / 3.7)), bw = L / nb;
      for (let k = 0; k <= nb; k++) {
        const t = k * bw;
        const lx = A[0] + u[0] * t + nrm[0] * 0.08, lz = A[1] + u[1] * t + nrm[1] * 0.08;
        box(lx, y0, lz, 0.42, h, 0.2, tint(color, 1.03), ang);
      }
      for (let k = 0; k < nb; k++) {
        const t = (k + 0.5) * bw;
        const lx = A[0] + u[0] * t + nrm[0] * 0.1, lz = A[1] + u[1] * t + nrm[1] * 0.1;
        const isDoor = doors.some((d2) => d2.edge === i && Math.abs(d2.t - t) < bw / 2);
        const q = p(lx, lz);
        cuspedArch(b, q[0], y0 + (isDoor ? 0 : 0.35), q[1], Math.min(2.4, bw - 0.9), h * 0.82, 0.24,
          rot + ang, color, 7, isDoor ? null : jali);
      }
    }
  };
  /** The undulating bangaldar cornice along every edge, with lotus-bud drops. */
  const cornice = (pts, y, color) => {
    const n = pts.length, pos = area2(pts) > 0;
    for (let i = 0; i < n; i++) {
      const A = pts[i], B = pts[(i + 1) % n];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 0.8) continue;
      const u = edgeDir(A, B), nrm = pos ? [u[1], -u[0]] : [-u[1], u[0]];
      const ang = Math.atan2(u[1], u[0]);
      const nb = Math.max(1, Math.round(L / 3.7)), bw = L / nb;
      // "a chain of shallow downward-curving ogee/cyma sweeps, one per bay"
      const SEG = 6;
      for (let k = 0; k < nb; k++) {
        for (let s2 = 0; s2 < SEG; s2++) {
          const t = (k + (s2 + 0.5) / SEG) * bw;
          // deepest at the middle of each bay, as bangaldarEave draws it, and
          // run back INTO the wall so no daylight shows under the lift
          const sweep = -0.3 * Math.sin(((s2 + 0.5) / SEG) * Math.PI);
          const lx = A[0] + u[0] * t + nrm[0] * 0.3, lz = A[1] + u[1] * t + nrm[1] * 0.3;
          box(lx, y + sweep, lz, bw / SEG + 0.03, 0.26, 1.0, color, ang);
        }
        // "a row of PENDANT LOTUS-BUD DROPS hanging beneath it"
        for (let s2 = 1; s2 < 4; s2++) {
          const t = (k + s2 / 4) * bw;
          const lx = A[0] + u[0] * t + nrm[0] * 0.72, lz = A[1] + u[1] * t + nrm[1] * 0.72;
          box(lx, y - 0.3 * Math.sin((s2 / 4) * Math.PI) - 0.3, lz, 0.14, 0.3, 0.14, tint(color, 0.95), ang);
        }
      }
    }
  };
  /** "a parapet alternating pierced jali panels of small cusped arches with solid vase-shaped balusters" */
  const parapet = (pts, y, color) => {
    const n = pts.length, pos = area2(pts) > 0;
    for (let i = 0; i < n; i++) {
      const A = pts[i], B = pts[(i + 1) % n];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 0.5) continue;
      const u = edgeDir(A, B), nrm = pos ? [u[1], -u[0]] : [-u[1], u[0]];
      const ang = Math.atan2(u[1], u[0]);
      const m = [(A[0] + B[0]) / 2 - nrm[0] * 0.12, (A[1] + B[1]) / 2 - nrm[1] * 0.12];
      box(m[0], y, m[1], L, 0.22, 0.34, color, ang);
      box(m[0], y + 0.22, m[1], L, 0.62, 0.16, tint(color, 0.9), ang);
      box(m[0], y + 0.84, m[1], L + 0.1, 0.12, 0.36, color, ang);
      const nv = Math.max(1, Math.round(L / 1.2));
      for (let k = 0; k <= nv; k++) {
        const t = (k / nv) * L;
        const lx = A[0] + u[0] * t - nrm[0] * 0.12, lz = A[1] + u[1] * t - nrm[1] * 0.12;
        const q = p(lx, lz);
        b.prism(q[0], y + 0.96, q[1], 0.16, 0.16, 0.1, 0.1, 0.3, color);
        b.box(q[0], y + 1.26, q[1], 0.08, 0.12, 0.08, C.GILT);
      }
    }
  };
  /** "an octagonal ring of ~8 clustered piers ... a broad, low, deeply GADROONED dome" */
  const octChhatri = (lx, lz, y, r, h, color) => {
    const q = p(lx, lz);
    b.box(q[0], y, q[1], r * 2.2, 0.3, r * 2.2, color, rot);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      for (const dd of [-0.09, 0.09]) {
        b.box(q[0] + Math.cos(a + dd / r) * r, y + 0.3, q[1] + Math.sin(a + dd / r) * r, 0.13, h, 0.13, color);
      }
      const a1 = ((k + 1) / 8) * TAU;
      const mx = (Math.cos(a) + Math.cos(a1)) / 2 * r, mz = (Math.sin(a) + Math.sin(a1)) / 2 * r;
      cuspedArch(b, q[0] + mx, y + 0.3, q[1] + mz, r * 0.66, h * 0.92, 0.12,
        Math.atan2(Math.sin(a1) - Math.sin(a), Math.cos(a1) - Math.cos(a)), color, 5, null);
    }
    // "a DOWNTURNED WAVY CANOPY EAVE"
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      b.box(q[0] + Math.cos(a) * r * 1.1, y + 0.3 + h - (k % 2 ? 0.1 : 0), q[1] + Math.sin(a) * r * 1.1,
        r * 0.45, 0.16, 0.5, color, a + Math.PI / 2);
    }
    b.box(q[0], y + 0.3 + h, q[1], r * 2.1, 0.24, r * 2.1, color, rot);
    ribbedDome(b, q[0], y + 0.54 + h, q[1], r * 1.02, r * 0.8, color, tint(color, 0.9), 24);
    b.box(q[0], y + 0.54 + h + r * 0.8, q[1], r * 0.34, 0.2, r * 0.34, color);
    b.bevelBox(q[0], y + 0.74 + h + r * 0.8, q[1], r * 0.2, r * 0.3, r * 0.2, C.GILT, 0, 0.08);
  };

  // --- the samadhi ---
  const SA = KB_OSM.samadhi;
  const yS = topOf(-18.2, -1.8, 18.2, 39.5) + 0.04;
  const ST1 = yS + 1.3, CO1 = yS + 6.0, ST2 = yS + 6.35, CO2 = yS + 10.4, TER = yS + 10.8;
  {
    // "Moulded marble plinth ~1.2–1.5 m, carrying a carved frieze of elephants
    // in file and a lotus-petal course"
    extrude(grow(SA, 0.35), yS - 0.25, ST1, C.MARBLE_SH);
    extrude(grow(SA, 0.42), yS + 0.5, yS + 0.9, tint(C.VEIN, 0.95));
    extrude(grow(SA, 0.48), ST1 - 0.12, ST1 + 0.03, C.MARBLE);
    extrude(SA, ST1, CO1, C.MARBLE, C.MARBLE, { at: [-12.48, 39.465], hw: 1.2, crown: ST1 + 3.4 });
    extrude(grow(SA, 0.2), CO1, CO1 + 0.18, C.MARBLE_SH);
    extrude(grow(SA, -0.12), ST2, CO2, C.MARBLE, C.MARBLE_SH);
    extrude(grow(SA, 0.3), CO2, TER, C.MARBLE);
    // the elephants in file along the frieze
    {
      const n = SA.length, pos = area2(SA) > 0;
      for (let i = 0; i < n; i++) {
        const A = SA[i], B = SA[(i + 1) % n];
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const u = edgeDir(A, B), nrm = pos ? [u[1], -u[0]] : [-u[1], u[0]];
        const ang = Math.atan2(u[1], u[0]);
        for (let t = 0.8; t < L - 0.5; t += 1.1) {
          const lx = A[0] + u[0] * t + nrm[0] * 0.47, lz = A[1] + u[1] * t + nrm[1] * 0.47;
          box(lx, yS + 0.56, lz, 0.62, 0.3, 0.1, C.MARBLE, ang);           // body
          box(lx + u[0] * 0.33, yS + 0.68, lz + u[1] * 0.33, 0.16, 0.18, 0.1, C.MARBLE, ang);  // head
        }
      }
    }
    // the south face is the front: its door, and the double staircase
    // (SA edge 1 -> 2 runs along the south face, lz 39.46)
    const DOOR_X = -12.48;
    const doorEdge = 1, doorT = Math.hypot(DOOR_X - SA[1][0], 39.46 - SA[1][1]);
    bays(SA, ST1, CO1 - ST1 - 0.1, C.MARBLE, 0xb9b3a6, () => false, [{ edge: doorEdge, t: doorT }]);
    bays(grow(SA, -0.12), ST2 + 0.2, CO2 - ST2 - 0.5, C.MARBLE, 0x9b968c);
    cornice(SA, CO1 - 0.05, C.MARBLE);
    cornice(grow(SA, 0.3), CO2 + 0.1, C.MARBLE);
    parapet(grow(SA, 0.3), TER, C.MARBLE);
    edgeWalls(SA, TER + 1.0);

    // steps up to the ground-floor door, and what is seen through it
    {
      // three steps and a deep top landing that runs right up to the door
      const N = 4, RISE = (ST1 - yS) / N, TR = 0.45, LAND = 1.4;
      const F = 39.46;
      box(DOOR_X, yS - 0.05, F + LAND / 2, 3.4, ST1 - yS + 0.05, LAND, C.MARBLE);
      solid(DOOR_X, F + LAND / 2, 3.4, LAND, 0, { top: ST1, tag: 'temple-step', standOnly: true });
      for (let i = 0; i < N - 1; i++) {
        const lz = F + LAND + (N - 1 - i) * TR - TR / 2;
        box(DOOR_X, yS - 0.05 + i * RISE, lz, 3.4, RISE + 0.05, TR, C.MARBLE);
        solid(DOOR_X, lz, 3.4, TR, 0, { top: yS + (i + 1) * RISE, tag: 'temple-step', standOnly: true });
      }
      // a sill across the doorway: this is where visitors stand and look in.
      // The chamber itself is not built yet — queued, not pretended.
      solid(DOOR_X, 39.3, 2.4, 0.3, 0, { top: ST1 + 1.0, tag: 'kb-sill' });
      /*
       * SRILA PRABHUPADA, in his samadhi mandir. The interior photograph
       * "Samadhi Mandir, Srila Prabhupad, ISKCON, Vrindavan.jpg" (per the
       * checker) "shows the Prabhupada murti with flanking carved lions under
       * it", and Back to Godhead (Sept 1980): "Carved lions flank the inner
       * shrine". Seated, in saffron, on his vyasasana; the lions in marble.
       */
      // the shrine, a chamber lined on the inside so it reads through the door:
      // from inside, the building's own walls face away and would show you
      // the courtyard behind. Back, sides, ceiling, floor.
      const my = ST1, FRONT = 39.46 - 0.05, BACK = 34.1, aw = 4.4, ah = 4.4;
      {
        const bq = p(DOOR_X, BACK);
        b.panel(bq[0], my + ah / 2, bq[1], aw, ah, 0xe8d9b8, faceR(FACE.S), 0.01);
        for (const sd of [-1, 1]) {
          const sq = p(DOOR_X + sd * aw / 2, (FRONT + BACK) / 2);
          b.panel(sq[0], my + ah / 2, sq[1], FRONT - BACK, ah, 0xdcc9a4, faceR(sd > 0 ? FACE.W : FACE.E), 0.01);
        }
        box(DOOR_X, my + ah, (FRONT + BACK) / 2, aw, 0.2, FRONT - BACK, 0xd8ccb2);  // the ceiling
        box(DOOR_X, my - 0.1, (FRONT + BACK) / 2, aw, 0.14, FRONT - BACK, 0xe3dccb); // the floor
        // a lamp's warmth on the back wall behind him
        b.panel(bq[0], my + 2.6, bq[1], 2.6, 2.2, 0xf4e2b0, faceR(FACE.S), 0.02);
      }
      const MZ = 35.4;
      box(DOOR_X, my, MZ, 1.9, 0.9, 1.3, 0x7a2a22);                              // the vyasasana
      box(DOOR_X, my + 0.9, MZ, 2.0, 0.1, 1.4, C.GILT);
      box(DOOR_X, my + 1.0, MZ - 0.55, 1.9, 1.7, 0.25, 0x8a2f24);                // its back
      box(DOOR_X, my + 2.7, MZ - 0.55, 2.1, 0.22, 0.4, C.GILT);
      if (buildSeated && place) {
        // a sannyasi in saffron, shaven-headed, with tilak and beads
        const t = { id: 'prabhupada', cloth: 0xe8891f, skin: 0xc99464, scale: 1.12,
          dhoti: 0xe8891f, tilak: 1, beads: true, shaven: true, shawl: 0xe07a18 };
        place(buildSeated(t, 'lap', null), DOOR_X, my + 1.0, MZ + 0.05, FACE.S);
      }
      for (const sd of [-1, 1]) {                                               // the lions
        const lx = DOOR_X + sd * 1.45, lz = MZ + 1.4;
        box(lx, my + 0.12, lz, 0.5, 0.35, 0.9, C.MARBLE);
        box(lx, my + 0.47, lz + 0.1, 0.44, 0.5, 0.5, C.MARBLE);
        box(lx, my + 0.97, lz + 0.25, 0.4, 0.36, 0.34, tint(C.MARBLE, 0.97));
        box(lx, my + 1.0, lz + 0.46, 0.22, 0.18, 0.1, C.MARBLE_SH);
      }
      sign('samadhi', DOOR_X, CO1 - 0.8, 39.46 + 0.62, 3.6, 0.75, FACE.S);
    }

    // "Approach: a DOUBLE CURVING STAIRCASE climbs the front, its balustrade
    // formed of carved SWAN/GOOSE figures". Two quarter-turn flights, solid
    // masonry with smooth curved sides, each rising from the forecourt to a
    // landing beside the ground-floor door, and a balcony across between them
    // at the first floor — so the door itself stays clear to walk up to.
    // Where they start and the curve they take are INFERRED; the samadhi
    // stands 1.7 m off the west fence, which is what bounds them.
    {
      const N = 19, R = 3.55, W2 = 1.25, GAP = 2.45;
      const top = ST2, LZ = 39.46 + 0.62;
      const rise = (top - yS) / N;
      for (const sd of [-1, 1]) {
        // the centre of this flight's quarter circle
        const cx = DOOR_X + sd * (GAP + R), cz = LZ;
        const P2 = (am, rr) => [cx - sd * Math.cos(am) * rr, cz + Math.sin(am) * rr];
        const treadAt = (i) => Math.PI / 2 * (1 - (i + 0.5) / N);    // i = 0 is the bottom, out front
        const rIn = R - W2 / 2, rOut = R + W2 / 2;
        // the flight's two curved faces, from the paving up to each tread
        const SEGS = 38;
        for (const rr of [rIn, rOut]) {
          let last = null;
          for (let k = 0; k <= SEGS; k++) {
            const am = Math.PI / 2 * (1 - k / SEGS);
            const tt = yS + Math.min(N, Math.ceil((k / SEGS) * N + 1e-6)) * rise;
            const q2 = p(...P2(am, rr));
            const cur = { lo: [q2[0], yS - 0.1, q2[1]], hi: [q2[0], tt, q2[1]] };
            if (last) {
              // outer face outward, inner face inward (toward this flight's centre)
              const outward = (rr === rOut) === (sd > 0);
              if (outward) b.quad(last.lo, last.hi, cur.hi, cur.lo, C.MARBLE_SH);
              else b.quad(cur.lo, cur.hi, last.hi, last.lo, C.MARBLE_SH);
            }
            last = cur;
          }
        }
        for (let i = 0; i < N; i++) {
          const am = treadAt(i);
          const [lx, lz] = P2(am, R);
          const tt = yS + (i + 1) * rise;
          const run = R * (Math.PI / 2) / N + 0.06;
          const tang = Math.atan2(Math.cos(am), sd * Math.sin(am));
          // each tread a slab on the solid flight; its riser is its front face
          box(lx, tt - rise - 0.02, lz, run, rise + 0.02, W2, C.MARBLE, tang);
          /*
           * STAND-ONLY. A tread here is 0.35 m deep and a body is 0.42 m in
           * radius, so standing on one you already touch the tread after next,
           * 0.67 m up — solid, that was a wall four steps from the bottom.
           * The flight's sides are walled by its balustrade colliders instead.
           */
          // each flight its own tag: two flights and the door steps all within
          // 3.6 m of one another read as ONE flight to anything grouping treads
          solid(lx, lz, run, W2 + 0.1, tang, { top: tt, tag: sd > 0 ? 'temple-step-e' : 'temple-step-w', standOnly: true });
          // the swan balustrade, both edges: a row of birds, not turned balusters
          for (const rr of [rIn - 0.07, rOut + 0.07]) {
            const [ox, oz] = P2(am, rr);
            box(ox, tt, oz, run, 0.55, 0.14, C.MARBLE, tang);
            if (i % 2 === 0) box(ox, tt + 0.55, oz, 0.3, 0.26, 0.16, tint(C.MARBLE, 0.98), tang);
            solid(ox, oz, run, 0.3, tang, { top: tt + 1.0, tag: 'temple-rail' });
          }
        }
        // the landing this flight arrives on, beside the door
        // it stops where the top tread begins: any further and its edge stands
        // across the last two treads as a wall
        const [lx, lz] = [DOOR_X + sd * (GAP - 0.2 + W2 / 2), LZ - 0.525];
        box(lx, yS - 0.1, lz, W2 + 0.4, top - yS + 0.1, 0.85, C.MARBLE_SH);
        solid(lx, lz, W2 + 0.4, 0.85, 0, { top, tag: 'temple-floor', floor: true });
      }
      // the balcony across, over the door, which is the first floor's front
      box(DOOR_X, top - 0.4, LZ - 0.25, GAP * 2 - 0.6, 0.4, 1.4, C.MARBLE);
      // `over`: a floor with open space under it, which you walk beneath
      solid(DOOR_X, LZ - 0.25, GAP * 2 - 0.6, 1.4, 0, { top, tag: 'temple-floor', standOnly: true, over: true });
      // its railing is drawn and NOT collided: collide() treats a collider as
      // solid from the ground to its top, so a rail 7 m up would have walled
      // off the ground-floor door underneath it
      box(DOOR_X, top, LZ + 0.4, GAP * 2 + W2, 1.0, 0.14, C.MARBLE);
      for (let k = 0; k < 7; k++) {
        const bx = DOOR_X - (GAP - 0.2) + k * ((GAP - 0.2) * 2 / 6);
        box(bx, top + 1.0, LZ + 0.4, 0.3, 0.26, 0.16, tint(C.MARBLE, 0.98));
      }
    }

    // the terrace: two open chhatris flanking the shikhara
    const SH = [-9.8, 28.85];
    for (const sd of [-1, 1]) octChhatri(SH[0] + sd * 5.35, SH[1], TER, 1.55, 2.6, C.MARBLE);
    {
      // "A fat, bulbous, curvilinear rekha-type spire — roughly as tall as it
      // is wide at the base ... Four small urushringa spirelets cluster at the
      // shoulders ... reaching ~55–60 % of the spire's height." 70 ft to the
      // kalash is the one height sourced on the whole site.
      const q = p(SH[0], SH[1]);
      // shikhara() crowns itself with an amalaka and kalash 0.69 R0 tall; the
      // kalash's top is the sourced 70 ft
      const R0 = 3.5, H0 = 21.3 - (TER + 0.5 - ground) - R0 * 0.68;
      box(SH[0], TER, SH[1], R0 * 2.1, 0.5, R0 * 2.1, C.MARBLE);
      for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const u2 = p(SH[0] + ox * R0 * 0.72, SH[1] + oz * R0 * 0.72);
        shikhara(b, u2[0], TER + 0.5, u2[1], R0 * 0.34, H0 * 0.57, C.MARBLE, 12);
      }
      shikhara(b, q[0], TER + 0.5, q[1], R0, H0, C.MARBLE, 16);
      // "→ short metal mast carrying a gilt ball and a SAFFRON FLAG", to
      // "Flag-mast tip: 22.5–23 m"
      const ky = ground + 21.3;
      b.box(q[0], ky, q[1], 0.06, 1.25, 0.06, 0x8a8a86);
      b.bevelBox(q[0], ky + 1.25, q[1], 0.16, 0.16, 0.16, C.GILT, 0, 0.06);
      b.panel(q[0] + 0.45 * Math.cos(rot), ky + 0.9, q[1] + 0.45 * Math.sin(rot), 0.8, 0.5, C.SAFFRON, faceR(FACE.S), 0);
    }
  }

  // --- the museum ---
  const MU = KB_OSM.museum;
  const yM = topOf(3.6, 26.2, 18.0, 39.0) + 0.04;
  {
    const M1 = yM + 1.3;
    extrude(grow(MU, 0.35), yM - 0.25, M1, C.MARBLE_SH);
    extrude(grow(MU, 0.42), yM + 0.5, yM + 0.9, tint(C.VEIN, 0.95));
    extrude(grow(MU, 0.48), M1 - 0.12, M1 + 0.03, C.MARBLE);
    extrude(MU, M1, yM + 6.0, C.MARBLE);
    extrude(grow(MU, 0.2), yM + 6.0, yM + 6.18, C.MARBLE_SH);
    extrude(grow(MU, -0.12), yM + 6.35, yM + 10.4, C.MARBLE, C.MARBLE_SH);
    extrude(grow(MU, 0.3), yM + 10.4, yM + 10.8, C.MARBLE);
    // the door on its south face (MU edge 2 -> 3), up four steps
    const DX = 13.0, DZ = 38.74;
    bays(MU, M1, 4.6, C.MARBLE, 0xb9b3a6, () => false, [{ edge: 2, t: Math.hypot(DX - MU[2][0], DZ - MU[2][1]) }]);
    bays(grow(MU, -0.12), yM + 6.55, 3.55, C.MARBLE, 0x9b968c);
    cornice(MU, yM + 5.95, C.MARBLE);
    cornice(grow(MU, 0.3), yM + 10.5, C.MARBLE);
    parapet(grow(MU, 0.3), yM + 10.8, C.MARBLE);
    edgeWalls(MU, yM + 11.8);
    const N = 4, RISE = 1.3 / N, TR = 0.45, LAND = 1.2;
    box(DX, yM - 0.05, DZ + LAND / 2, 3.0, 1.35, LAND, C.MARBLE);
    solid(DX, DZ + LAND / 2, 3.0, LAND, 0, { top: yM + 1.3, tag: 'temple-step', standOnly: true });
    for (let i = 0; i < N - 1; i++) {
      const lz = DZ + LAND + (N - 1 - i) * TR - TR / 2;
      box(DX, yM - 0.05 + i * RISE, lz, 3.0, RISE + 0.05, TR, C.MARBLE);
      solid(DX, lz, 3.0, TR, 0, { top: yM + (i + 1) * RISE, tag: 'temple-step', standOnly: true });
    }
    solid(DX, DZ - 0.1, 2.2, 0.3, 0, { top: M1 + 1.0, tag: 'kb-sill' });
    // its doors stand shut for now: the galleries are queued
    box(DX, M1, DZ + 0.12, 2.0, 3.2, 0.1, C.WOOD);
    sign('museum', DX, yM + 5.2, DZ + 0.55, 3.8, 0.75, FACE.S);
  }

  // --- the great arch, which is a bridge ---
  /*
   * "Between the Samadhi (west) and Prabhupada's Museum (east) springs a
   * monumental cusped marble arch that is in fact a BRIDGE linking the two
   * buildings' upper galleries; the processional path from the gate to the
   * temple passes underneath it." The checker: "a smooth semicircular/
   * segmental curve carrying an APPLIED fringe of pendant cusps and a carved
   * floral archivolt — it is not a cusped multifoil." Intrados crown "~9–10 m
   * above paving; bridge deck and parapet above that, ~12–13 m". The span is
   * the gap between the two OSM outlines' facing edges: 5.5 m.
   */
  {
    const X0 = -1.82, X1 = 3.66, Z0 = 25.66, Z1 = 29.32;
    const half = (X1 - X0) / 2, AXX = (X0 + X1) / 2, AZ = (Z0 + Z1) / 2, D = Z1 - Z0;
    const y0 = Math.max(yS, yM);
    const CROWN = y0 + 9.6, SPRING = CROWN - half, DECK = y0 + 12.2;
    // the soffit: a strip round the semicircle, the full depth of the bridge
    {
      const SEG = 16;
      let lastIn = null, lastOut = null;
      for (let i = 0; i <= SEG; i++) {
        const a = Math.PI * (i / SEG);
        const lx = AXX - Math.cos(a) * half, yy = SPRING + Math.sin(a) * half;
        const I = p(lx, Z0), O = p(lx, Z1);
        const inn = [I[0], yy, I[1]], out = [O[0], yy, O[1]];
        if (lastIn) b.quad(lastIn, inn, out, lastOut, C.MARBLE_SH);
        lastIn = inn; lastOut = out;
      }
    }
    // the spandrels, exact: between the arc and the deck, on both faces
    const SEG = 16;
    const face = (lz, flip) => {
      let last = null;
      for (let i = 0; i <= SEG; i++) {
        const a = Math.PI * (i / SEG);
        const lx = AXX - Math.cos(a) * half;
        const yy = SPRING + Math.sin(a) * half;
        const A = p(lx, lz);
        const cur = { bot: [A[0], yy, A[1]], top: [A[0], DECK, A[1]] };
        if (last) {
          if (flip) b.quad(last.bot, cur.bot, cur.top, last.top, C.MARBLE);
          else b.quad(last.bot, last.top, cur.top, cur.bot, C.MARBLE);
        }
        last = cur;
      }
    };
    face(Z1, false);
    face(Z0, true);
    // the springing blocks, from the paving to the curve, against each pier
    for (const sd of [-1, 1]) box(AXX + sd * (half - 0.2), y0, AZ, 0.4, SPRING - y0, D, C.MARBLE);
    // the applied fringe of pendant cusps, on both faces, and the archivolt
    for (let i = 1; i < 12; i++) {
      const a = Math.PI * (i / 12);
      const lx = AXX - Math.cos(a) * (half - 0.12), yy = SPRING + Math.sin(a) * (half - 0.12);
      for (const lz of [Z0 + 0.12, Z1 - 0.12]) {
        const w = p(lx, lz);
        b.prism(w[0], yy - 0.34, w[1], 0.04, 0.04, 0.22, 0.14, 0.34, C.MARBLE, rot);
      }
      for (const lz of [Z0 - 0.05, Z1 + 0.05]) {
        const lx2 = AXX - Math.cos(a) * (half + 0.3), yy2 = SPRING + Math.sin(a) * (half + 0.3);
        box(lx2, yy2 - 0.14, lz, 0.5, 0.28, 0.12, i % 2 ? C.MARBLE_SH : C.MARBLE, a - Math.PI / 2);
      }
    }
    // the deck, its balustrade, and "a small domed chhatri riding the crown"
    box(AXX, DECK, AZ, half * 2 + 0.6, 0.45, D + 0.4, C.MARBLE);
    for (const lz of [Z0 - 0.1, Z1 + 0.1]) {
      box(AXX, DECK + 0.45, lz, half * 2 + 0.6, 0.18, 0.2, C.MARBLE);
      for (let k = 0; k <= 8; k++) {
        box(AXX - half + k * (half * 2 / 8), DECK + 0.63, lz, 0.14, 0.62, 0.14, C.MARBLE);
      }
      box(AXX, DECK + 1.25, lz, half * 2 + 0.6, 0.12, 0.24, C.MARBLE);
    }
    octChhatri(AXX, AZ, DECK + 0.45, 0.95, 1.7, C.MARBLE);
  }

  /* ================================================================
   * THE KIOSKS ALONG THE WEST FENCE, and the corridor they make
   * ================================================================ */
  /*
   * "Welcome Centre, Internet Access, Matchless Gifts, Bhisma Office,
   * Vrindavan.tv, BBT Book Display (a strip of small kiosks along the west
   * side)". OSM draws them as a neat row against the fence, 2.7 m from the
   * temple's west wall — so the walk between them and the temple is a lane of
   * shopfronts, which is the outer corridor you walk along.
   */
  {
    const K = [
      ['bbt', -16.4, -11.7], ['vtv', -11.7, -6.9], ['bhisma', 2.6, 7.1],
      ['matchless', 7.1, 10.1], ['internet', 10.0, 12.7], ['welcome', 12.6, 15.4],
    ];
    const X0 = -19.8, X1 = -14.75, cx = (X0 + X1) / 2, w = X1 - X0;
    for (const [key, z0, z1] of K) {
      const cz = (z0 + z1) / 2, d = z1 - z0 - 0.08;
      const y = pave(cx, cz);
      box(cx, y - 0.1, cz, w, 3.1, d, C.CREAM);
      box(cx, y + 3.0, cz, w + 0.3, 0.22, d + 0.2, C.SALMON);
      box(X1 + 0.02, y + 0.95, cz, 0.06, 1.5, d - 0.7, 0x2f3b3a);            // the window
      box(X1 + 0.35, y + 0.85, cz, 0.6, 0.1, d - 0.5, 0x8a6a42);              // its counter
      box(X1 + 0.5, y + 2.55, cz, 1.0, 0.1, d + 0.1, C.GREEN);                // the awning
      sign(key, X1 + 0.1, y + 2.1, cz, Math.min(d - 0.4, 2.2), 0.6, FACE.E);
      solid(cx, cz, w, d);
    }
  }

  /* ================================================================
   * THE MARKET, the offices and the halls
   * ================================================================ */
  /** A plain painted range: cream, salmon bands, cusped windows. */
  const range = (lx, lz, w, d, storeys, opts = {}) => {
    const y = topOf(lx - w / 2, lx + w / 2, lz - d / 2, lz + d / 2, 2) + 0.04;
    const hh = storeys * 3.4 + (opts.tall || 0);
    box(lx, y - 0.3, lz, w, hh + 0.3, d, opts.color || C.CREAM);
    for (let s2 = 1; s2 < storeys; s2++) box(lx, y + s2 * 3.4 - 0.2, lz, w + 0.14, 0.2, d + 0.14, C.SALMON);
    box(lx, y + hh - 0.25, lz, w + 0.16, 0.25, d + 0.16, C.SALMON);
    box(lx, y + hh, lz, w + 0.2, 0.5, d + 0.2, C.CREAM_SH);
    // windows on the long faces, a cusped head over each (not over a shopfront)
    const longX = w >= d;
    const L = longX ? w : d, nW = Math.max(1, Math.round(L / 3.2));
    for (let s2 = 0; s2 < storeys; s2++) {
      for (let k = 0; k < nW; k++) {
        const t = (k + 0.5) / nW * L - L / 2;
        for (const sd of [-1, 1]) {
          if (opts.shopFace && longX && sd > 0) continue;
          const wx = longX ? lx + t : lx + sd * (w / 2 + 0.03);
          const wz = longX ? lz + sd * (d / 2 + 0.03) : lz + t;
          const q = p(wx, wz);
          cuspedArch(b, q[0], y + 0.9 + s2 * 3.4, q[1], 1.3, 2.0, 0.1, longX ? rot : rot + Math.PI / 2, C.SALMON, 5, 0x39443f);
        }
      }
    }
    solid(lx, lz, w, d);
    return y;
  };
  // "Market Place, ATM, Post Office (a strip along the southern edge running
  // east)" — OSM's three blocks. They are drawn opening SOUTH onto the
  // forecourt that joins the gate; which way they really open is INFERRED.
  {
    const blocks = [[38.7, 29.25, 26.2, 11.3, ['market', 1, 'gift', 'books', 3, 'mahaprasad']],
      [56.55, 28.25, 10.7, 10.5, ['atm', 6]], [67.3, 27.6, 12.0, 10.6, ['post', 0]]];
    for (const [lx, lz, w, d, shops] of blocks) {
      const y = range(lx, lz, w, d, 1, { tall: 0.4, shopFace: true });
      const n = shops.length, bw = w / n;
      for (let k = 0; k < n; k++) {
        const sx = lx - w / 2 + bw * (k + 0.5), fz = lz + d / 2;
        box(sx, y + 0.02, fz + 0.03, bw - 0.6, 2.7, 0.08, k % 2 ? 0x4a5a58 : 0x6a6250);   // shutters up, the shop dark inside
        box(sx, y + 2.9, fz + 0.9, bw - 0.2, 0.1, 1.8, [0xc0562f, 0x2f6f4f, 0xb0882e, 0x7a4a86, 0x2b5f8a][k % 5]);
        sign(shops[k], sx, y + 3.3, fz + 0.08, Math.min(bw - 0.5, 3.4), 0.72, FACE.S);
      }
    }
  }
  // Prabhupada's house, "north of the courtyard" and in OSM hard against the
  // back of the temple; the Deity kitchen and the security office beside it
  {
    const y = range(0.25, -21.1, 24.5, 7.8, 2);
    sign('house', 0.25, y + 5.2, -25.05, 3.8, 0.75, FACE.N);
    range(17.25, -25.8, 6.8, 7.8, 1);
    const ys = range(24.7, -36.55, 10.6, 12.1, 2);
    sign('security', 24.7, ys + 2.7, -30.45, 2.6, 0.6, FACE.S);
  }
  // the guesthouse, "INSIDE the compound to the north ... with Govinda's
  // Restaurant next to it": a courtyard block on OSM's outline (a deeply
  // articulated 32-sided plan, drawn here as its four wings)
  {
    const X0 = -19.4, X1 = 17.6, Z0 = -68.0, Z1 = -30.0, WING = 10.0;
    const y = topOf(X0, X1, Z0, Z1, 3) + 0.04;
    const wings = [[(X0 + X1) / 2, Z1 - WING / 2, X1 - X0, WING], [(X0 + X1) / 2, Z0 + WING / 2, X1 - X0, WING],
      [X0 + WING / 2, (Z0 + Z1) / 2, WING, Z1 - Z0 - WING * 2], [X1 - WING / 2, (Z0 + Z1) / 2, WING, Z1 - Z0 - WING * 2]];
    for (const [lx, lz, w, d] of wings) range(lx, lz, w, d, 3);
    sign('guest', -6.0, y + 3.7, Z1 + 0.1, 4.2, 0.85, FACE.S);
    // Govinda's, at the corner nearest the temple (INFERRED: "next to it")
    box(10.0, y + 2.85, Z1 + 1.0, 7.0, 0.12, 2.0, 0x2f6f4f);
    sign('govindas', 10.0, y + 3.35, Z1 + 0.1, 3.6, 0.8, FACE.S);
  }
  // the row east of the temple: bakery kitchen, brahmacari ashram, the
  // namahatta preaching office (OSM's names)
  range(21.15, -6.85, 7.5, 10.5, 1);
  range(21.5, 5.1, 7.6, 13.8, 2);
  range(21.8, 15.0, 7.4, 6.4, 1);
  // offices and halls to the north-east
  range(45.55, -21.75, 21.5, 10.9, 2);
  range(45.55, -32.65, 21.5, 11.1, 1, { tall: 1.8 });
  range(73.4, -25.05, 31.2, 7.1, 1);
  {
    const y = range(73.9, -39.0, 31.8, 23.2, 1, { tall: 1.8 });
    sign('prasadam', 73.9, y + 3.9, -27.35, 4.0, 0.8, FACE.S);
  }
  range(92.55, -55.05, 14.5, 13.7, 2);
  // the Tulasi House: OSM's 16-node near-circle, an open octagonal pavilion
  {
    const y = pave(30.7, -22.05);
    box(30.7, y - 0.1, -22.05, 5.6, 0.55, 5.6, C.CREAM_SH);
    octChhatri(30.7, -22.05, y + 0.45, 2.3, 2.9, C.CREAM);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      const q = p(30.7 + Math.cos(a) * 1.1, -22.05 + Math.sin(a) * 1.1);
      b.box(q[0], y + 0.75, q[1], 0.5, 0.5, 0.5, 0xc0562f);
      b.bevelBox(q[0], y + 1.25, q[1], 0.42, 0.6, 0.42, 0x3f7a42, 0, 0.14);
    }
    post(30.7, -22.05, 2.4);
  }

  /* ---- the Gurukula block: a building site ---- */
  /*
   * "In the ESRI imagery of 23 Feb 2024 [MEASURED], the eastern third of the
   * compound — the Gurukula block and the ground east of it — is a large
   * excavated construction/demolition site with cranes and spoil heaps ...
   * If you model a finished building you are inventing it." So it is a site:
   * hoarding, bare orange earth, spoil, one tower crane and a frame going up.
   * The frame's layout is INFERRED.
   */
  {
    const X0 = 26.2, X1 = 93.0, Z0 = -12.5, Z1 = 20.8;
    const y = topOf(X0, X1, Z0, Z1, 3);
    box((X0 + X1) / 2, y - 0.3, (Z0 + Z1) / 2, X1 - X0, 0.36, Z1 - Z0, C.EARTH);
    const hoard = (ax, az, bx2, bz) => {
      const L = Math.hypot(bx2 - ax, bz - az), ang = Math.atan2(bz - az, bx2 - ax);
      const mx = (ax + bx2) / 2, mz = (az + bz) / 2;
      box(mx, y, mz, L, 2.4, 0.08, 0x2f6aa0, ang);
      box(mx, y + 0.9, mz, L, 0.35, 0.1, 0xf2f2ee, ang);
      solid(mx, mz, L, 0.4, ang);
    };
    hoard(X0, Z0, X1, Z0); hoard(X0, Z1, X1, Z1); hoard(X0, Z0, X0, Z1); hoard(X1, Z0, X1, Z1);
    for (const [hx, hz, hr] of [[40, 8, 4.2], [80, -4, 5.0], [58, 14, 3.4]]) {
      const q = p(hx, hz);
      b.prism(q[0], y, q[1], hr * 2, hr * 2, hr * 0.5, hr * 0.5, hr * 0.55, tint(C.EARTH, 0.92), rot);
    }
    // an RCC frame, two floors up, columns on a 6 m grid
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const lx = 50 + i * 6, lz = -6 + j * 6;
        box(lx, y, lz, 0.45, 7.2, 0.45, 0x9a9a94);
        box(lx, y + 7.2, lz, 0.05, 0.9, 0.05, 0x5a4a3a);                   // starter bars
        post(lx, lz, 0.35);
      }
    }
    box(62, y + 3.3, 0, 24.6, 0.25, 12.6, 0xa4a49e);
    box(62, y + 6.9, 0, 24.6, 0.25, 12.6, 0xa4a49e);
    // the tower crane
    {
      const MX = 44, MZ = -2, Hc = 30;
      box(MX, y, MZ, 4.5, 1.2, 4.5, 0x8a8a84);
      box(MX, y + 1.2, MZ, 1.6, Hc, 1.6, 0xe0b030);
      box(MX, y + 1.2 + Hc, MZ, 2.0, 2.0, 2.0, 0xe0b030);
      box(MX + 14, y + 2.4 + Hc, MZ, 30, 1.0, 1.0, 0xe0b030);
      box(MX - 7, y + 2.4 + Hc, MZ, 10, 1.1, 1.3, 0xe0b030);
      box(MX - 10, y + 1.2 + Hc, MZ, 3, 2.2, 2.0, 0x8a8a84);                // counterweight
      box(MX, y + 3.4 + Hc, MZ, 0.6, 4.0, 0.6, 0xe0b030);
      box(MX + 18, y + 2.4 + Hc - 12, MZ, 0.05, 12, 0.05, 0x333333);        // the hook's cable
      post(MX, MZ, 1.2);
    }
  }

  /* ================================================================
   * THE ROAD SIDE: the peepal, the sadhus, the garland sellers
   * ================================================================ */
  /*
   * "flower-garland sellers on low tables against the compound wall ... and a
   * big old peepal tree with a red-and-white banded trunk standing right
   * beside the gate with sadhus sitting at its foot."
   */
  {
    const g = GATES[0];
    const out = (a, v) => [g.at[0] + g.u[0] * a - g.v[0] * v, g.at[1] + g.u[1] * a - g.v[1] * v];
    // the peepal, just west of the gate
    {
      // as close to the gate as it stands in the photographs, and never in the
      // carriageway: step it in toward the wall until the road is 3.5 m off
      let [tx, tz] = out(-(g.half + 7.0), 3.0);
      for (let k = 0; k < 8 && o.roadDistance && o.roadDistance(...p(tx, tz)) < 3.5; k++) {
        [tx, tz] = out(-(g.half + 7.0), 3.0 - (k + 1) * 0.3);
      }
      const y = tH(tx, tz);
      const q = p(tx, tz);
      b.prism(q[0], y - 0.2, q[1], 1.5, 1.5, 0.95, 0.95, 5.2, 0x6f5a44, rot);
      // the sacred threads round it, red and white
      for (let k = 0; k < 6; k++) b.box(q[0], y + 0.9 + k * 0.12, q[1], 1.34 - k * 0.02, 0.07, 1.34 - k * 0.02, k % 2 ? 0xf2ece0 : 0xc0282a, rot);
      // a platform round its foot, which is what the sadhus sit on
      b.box(q[0], y - 0.1, q[1], 3.4, 0.45, 3.4, 0xc9bda2, rot);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const rr = 2.2 + rng() * 1.4;
        b.bevelBox(q[0] + Math.cos(a) * rr, y + 5.6 + rng() * 1.6, q[1] + Math.sin(a) * rr,
          3.6, 2.3, 3.6, i % 2 ? 0x3d6a33 : 0x4a7a3a, a, 0.5);
      }
      b.bevelBox(q[0], y + 7.4, q[1], 5.2, 2.6, 5.2, 0x3a6330, 0.3, 0.6);
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.85 });
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 3.4, d: 3.4, rot, h: 0.35 + (y - ground), tag: 'kb-peepal' });
      if (buildSeated && place) {
        const sadhu = PEOPLE.find((t) => t.id === 'sadhu') || PEOPLE[0];
        for (const [ox, oz, face] of [[1.2, 0.6, 0.4], [-1.0, 1.1, -0.3]]) {
          place(buildSeated(sadhu, 'lap', null), tx + ox, y + 0.35, tz + oz, Math.atan2(-g.v[1], -g.v[0]) + face);
        }
      }
    }
    // the garland sellers, three either side of the gate against the wall
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const a = sd * (g.half + 4.8 + i * 3.4);
        if (sd < 0 && i === 2) continue;                      // the peepal is there
        const [lx, lz] = out(a, 1.55);
        const y = tH(lx, lz);
        const ang = Math.atan2(g.u[1], g.u[0]);
        box(lx, y, lz, 1.4, 0.72, 0.8, 0x8a6a42, ang);
        for (let k = 0; k < 4; k++) {
          const [hx, hz] = out(a - 0.5 + k * 0.33, 1.55);
          const q = p(hx, hz);
          b.bevelBox(q[0], y + 0.72, q[1], 0.3, 0.16, 0.6, [0xe8891f, 0xe8c040, 0xb0283a, 0xf2ece0][(k + i) % 4], rot + ang, 0.06);
        }
        const q = p(lx, lz);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: 1.4, d: 0.8, rot: rot + ang, h: 0.8 + (y - ground) });
        if (buildStanding && place) {
          const seller = PEOPLE[(i + (sd > 0 ? 3 : 0)) % PEOPLE.length];
          const [sx, sz] = out(a, 0.72);
          place(buildStanding(seller, 'down'), sx, tH(sx, sz), sz, Math.atan2(-g.v[1], -g.v[0]));
          post(sx, sz, 0.3, { h: 1.7 });
        }
      }
    }
  }

  return {
    // what `gates.mjs` and anyone else asks of the wall: its line, and its gates
    outline: CP,
    gates: GATES.map((g) => ({ id: g.id, at: g.at, u: g.u, v: g.v, half: g.half })),
  };
}
