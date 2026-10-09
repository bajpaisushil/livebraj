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
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
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
  // rooms you walk into, for InteriorSystem: the roof comes off, as in a shop
  const rooms = [];

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
      const emit = (ta, tb, railed) => {
        if (tb - ta < 0.3) return;
        const m = [A[0] + (B[0] - A[0]) * ((ta + tb) / 2 / L), A[1] + (B[1] - A[1]) * ((ta + tb) / 2 / L)];
        const base = Math.min(tH(A[0] + (B[0] - A[0]) * (ta / L), A[1] + (B[1] - A[1]) * (ta / L)),
          tH(A[0] + (B[0] - A[0]) * (tb / L), A[1] + (B[1] - A[1]) * (tb / L)), tH(m[0], m[1])) - 0.15;
        if (railed) {
          /*
           * The front, where the samadhi is: a low plinth wall carrying a black
           * iron railing with spear-headed bars, which the whole street sees the
           * marble through (the 2013 street photographs, 6732 and 6734).
           */
          const PL = 0.8, RH = 1.55;
          box(m[0], base, m[1], tb - ta, PL + 0.15, WALL_T, C.CREAM, ang);
          box(m[0], base + PL + 0.15, m[1], tb - ta + 0.04, 0.1, WALL_T + 0.12, C.CREAM_SH, ang);
          const y0 = base + PL + 0.25;
          const ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L;
          box(m[0], y0 + 0.1, m[1], tb - ta, 0.05, 0.05, C.IRON, ang);
          box(m[0], y0 + RH - 0.18, m[1], tb - ta, 0.05, 0.05, C.IRON, ang);
          for (let t = ta + 0.09; t < tb - 0.05; t += 0.17) {
            const bx = A[0] + ux * t, bz = A[1] + uz * t;
            box(bx, y0, bz, 0.03, RH, 0.03, C.IRON, ang);
          }
          for (let t = ta + 1.2; t < tb - 0.6; t += 2.4) {              // its posts
            box(A[0] + ux * t, y0, A[1] + uz * t, 0.09, RH + 0.08, 0.09, C.IRON, ang);
          }
          solid(m[0], m[1], tb - ta, WALL_T + 0.35, ang, { top: y0 + RH });
          return;
        }
        box(m[0], base, m[1], tb - ta, WALL_H + 0.15, WALL_T, C.CREAM, ang);
        box(m[0], base + WALL_H + 0.15, m[1], tb - ta + 0.04, 0.14, WALL_T + 0.16, C.SALMON, ang);
        solid(m[0], m[1], tb - ta, WALL_T + 0.35, ang);
      };
      // the stretch of the road front before the samadhi and the museum
      const railedAt = (lx, lz) => lz > 45 && lx < 27;
      let mode = null;
      for (let t = 0; t <= L + 1e-6; t += STEP) {
        const lx = A[0] + (B[0] - A[0]) * (t / L), lz = A[1] + (B[1] - A[1]) * (t / L);
        const gap = inGate(lx, lz);
        const rl = railedAt(lx, lz);
        if (!gap && t0 === null) { t0 = t; mode = rl; }
        else if (!gap && t0 !== null && rl !== mode) { emit(t0, t, mode); t0 = t; mode = rl; }
        if (gap && t0 !== null) { emit(t0, t, mode); t0 = null; }
      }
      if (t0 !== null) emit(t0, L, mode);
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

  /* ---- the main gate, on Bhaktivedanta Swami Marg ---- */
  /*
   * TWO PLAIN PIERS AND A PAIR OF IRON LEAVES — not a gatehouse. Commons
   * "Krishna Balaram Mandir - ISKCON - Bhaktivedanta Swami Marg - Vrindaban
   * 2013-02-24 6734.JPG", taken from the road: square stone piers about the
   * height of a man and a half, ornate black wrought-iron leaves standing open
   * between them, the chequer floor just inside, the peepal beside it, and
   * either side a black iron railing on a low plinth wall through which the
   * samadhi is seen. "Krishna Balaram Mandir (2010).jpg" shows the same piers
   * and leaves from inside the railing. The checker said so from the start:
   * "The road gate on Bhaktivedanta Swami Marg is black iron leaves between
   * masonry piers with a peepal tree beside it" — the cream gatehouse with
   * chhatris that stood here was the TEMPLE'S own portal, seen through the
   * great arch, moved onto the road by mistake. It is taken off.
   * Pier and leaf sizes are read off those two photographs against the people
   * in them, not measured.
   */
  {
    const g = GATES[0];
    const ang = Math.atan2(g.u[1], g.u[0]);
    const y = pave(g.at[0], g.at[1]);
    const at = (a, v) => [g.at[0] + g.u[0] * a + g.v[0] * v, g.at[1] + g.u[1] * a + g.v[1] * v];
    const PW = 0.8, PH = 2.9, STONE = 0xd9d0bd, STONE_SH = 0xbdb3a0;
    for (const sd of [-1, 1]) {
      const [lx, lz] = at(sd * (g.half + PW / 2), 0);
      box(lx, y - 0.2, lz, PW, PH + 0.2, PW, STONE, ang);
      box(lx, y + 0.35, lz, PW + 0.1, 0.12, PW + 0.1, STONE_SH, ang);
      box(lx, y + PH, lz, PW + 0.16, 0.14, PW + 0.16, STONE_SH, ang);       // the cap
      box(lx, y + PH + 0.14, lz, PW - 0.2, 0.1, PW - 0.2, STONE, ang);
      solid(lx, lz, PW, PW, ang, { top: y + PH + 0.3 });
    }
    /*
     * The leaves, swung in and left open: a frame of bars with a band of
     * scrollwork near the top, which at this size is a double rail and a row
     * of rings. Open by day, and swinging inward, is what the photographs show.
     */
    for (const sd of [-1, 1]) {
      const LW = g.half - 0.05, LH = 2.5;
      const hinge = at(sd * (g.half - 0.04), 0);
      const tip = at(sd * (g.half - 0.04), LW);           // swung in, square to the fence
      const cx = (hinge[0] + tip[0]) / 2, cz = (hinge[1] + tip[1]) / 2;
      const la = ang + Math.PI / 2;                        // the leaf runs along v
      box(cx, y + 0.12, cz, LW, 0.07, 0.06, C.IRON, la);
      box(cx, y + LH - 0.1, cz, LW, 0.07, 0.06, C.IRON, la);
      box(cx, y + LH - 0.55, cz, LW, 0.05, 0.05, C.IRON, la);
      const nb = Math.round(LW / 0.16);
      for (let k = 0; k <= nb; k++) {
        const [bx, bz] = at(sd * (g.half - 0.04), k * (LW / nb));
        box(bx, y + 0.12, bz, 0.035, LH - 0.12 + (k % 2 ? 0.14 : 0.24), 0.035, C.IRON, la);
      }
      for (let k = 0; k < nb; k += 2) {
        const [rx, rz] = at(sd * (g.half - 0.04), (k + 1) * (LW / nb));
        box(rx, y + LH - 0.47, rz, 0.24, 0.24, 0.03, C.IRON, la);          // the scroll band
      }
      // the guards, just inside, one each side of the way in, facing the road
      const [gx, gz] = at(sd * (g.half + 1.3), 1.9);
      guard(gx, gz, Math.atan2(-g.v[1], -g.v[0]));
    }
    // the temple's own name, a board on the plinth wall beside the gate
    {
      const face = Math.atan2(-g.v[1], -g.v[0]);
      const [sx, sz] = at(-(g.half + 3.2), -0.32);
      sign('mandir', sx, y + 1.55, sz, 2.8, 0.62, face);
    }
    const [bx, bz] = at(g.half + 3.6, 3.2);
    booth(bx, bz, ang);
  }

  /* ---- the west gate, GATE:2 ---- */
  /*
   * Commons "In and around of Sri Krishna-Balaram Mandir, Vrindavan 01" and
   * "02", from the lane and from inside: cream columns ringed in salmon, an
   * arched head with an iron grille in it, black wrought-iron leaves picked
   * out in gold, a red board lettered "GATE:2 ISKCON VRINDAVAN", and on the
   * wall beside it "Govinda's Pure Vegetarian Restaurant" with an arrow. The
   * survey's "green metal gate" is not what the photographs show. Where along
   * the west fence it stands is still INFERRED (queued).
   */
  {
    const g = GATES[1];
    const ang = Math.atan2(g.u[1], g.u[0]);
    const y = pave(g.at[0], g.at[1]);
    const at = (a, v) => [g.at[0] + g.u[0] * a + g.v[0] * v, g.at[1] + g.u[1] * a + g.v[1] * v];
    const CW = 0.72, CH = 3.6;
    for (const sd of [-1, 1]) {
      const [lx, lz] = at(sd * (g.half + CW / 2), 0);
      box(lx, y - 0.15, lz, CW + 0.12, 0.6, CW + 0.12, C.CREAM, ang);             // its base
      box(lx, y + 0.45, lz, CW, CH - 0.45, CW, C.CREAM, ang);
      for (const hy of [0.45, 1.5, 2.6]) box(lx, y + hy, lz, CW + 0.08, 0.12, CW + 0.08, C.SALMON, ang);
      box(lx, y + CH, lz, CW + 0.24, 0.24, CW + 0.24, C.SALMON, ang);            // the capital
      solid(lx, lz, CW, CW, ang, { top: y + CH + 0.3 });
    }
    // the arched head: a round archivolt spanning the columns, drawn from both
    // faces, and the iron grille that fills it
    {
      const SPR = y + CH + 0.24, R0 = g.half + 0.02, R1 = g.half + 0.34, SEG = 16;
      const P = (an, r, v) => { const [lx, lz] = at(-Math.cos(an) * r, v); const q = p(lx, lz); return [q[0], SPR + Math.sin(an) * r, q[1]]; };
      const quad2 = (A, B, Cq, D, col) => { b.quad(A, B, Cq, D, col); b.quad(D, Cq, B, A, col); };
      for (let k = 0; k < SEG; k++) {
        const a0 = Math.PI * (k / SEG), a1 = Math.PI * ((k + 1) / SEG);
        for (const v of [-0.36, 0.36]) quad2(P(a0, R0, v), P(a0, R1, v), P(a1, R1, v), P(a1, R0, v), C.CREAM);
        quad2(P(a0, R0, -0.36), P(a0, R0, 0.36), P(a1, R0, 0.36), P(a1, R0, -0.36), C.CREAM_SH);
        quad2(P(a0, R1, -0.36), P(a0, R1, 0.36), P(a1, R1, 0.36), P(a1, R1, -0.36), C.SALMON);
      }
      for (let uu = -g.half + 0.2; uu < g.half - 0.1; uu += 0.22) {
        const hh = Math.sqrt(Math.max(0, R0 * R0 - uu * uu));
        const [bx, bz] = at(uu, 0);
        box(bx, SPR - 0.1, bz, 0.03, hh + 0.08, 0.03, C.IRON, ang);
      }
      const [rx, rz] = at(0, 0);
      box(rx, SPR + 0.55, rz, 0.5, 0.5, 0.05, C.GILT, ang);                        // the gilt rosette
      box(rx, SPR - 0.12, rz, g.half * 2, 0.08, 0.06, C.IRON, ang);
    }
    // both leaves swung in and left open, black iron with gold in the scrolls
    for (const sd of [-1, 1]) {
      const [lx, lz] = at(sd * (g.half - 0.06), 1.15);
      for (let k = 0; k < 9; k++) {
        const [bx, bz] = at(sd * (g.half - 0.06), 0.12 + k * 0.26);
        box(bx, y, bz, 0.04, 2.5 + (k % 2) * 0.12, 0.04, C.IRON, ang);
      }
      box(lx, y + 0.15, lz, 0.06, 0.08, 2.2, C.IRON, ang);
      box(lx, y + 2.1, lz, 0.06, 0.08, 2.2, C.IRON, ang);
      box(lx, y + 2.45, lz, 0.06, 0.06, 2.2, C.IRON, ang);
      for (let k = 0; k < 4; k++) {
        const [sx, sz] = at(sd * (g.half - 0.06), 0.4 + k * 0.55);
        box(sx, y + 2.18, sz, 0.05, 0.22, 0.22, C.GILT, ang);                     // gold in the scrollwork
        box(sx, y + 1.0, sz, 0.05, 0.3, 0.3, k % 2 ? C.GILT : C.IRON, ang);
      }
      solid(lx, lz, 0.2, 2.2, ang);
    }
    // GATE:2, on the column's lane face and inside; Govinda's on the wall
    const toLane = Math.atan2(-g.v[1], -g.v[0]), inward = Math.atan2(g.v[1], g.v[0]);
    {
      const [ox, oz] = at(-(g.half + CW / 2), -(CW / 2 + 0.03));
      sign('gate2', ox, y + 1.75, oz, 0.62, 0.62, toLane);
      const [ix, iz] = at(g.half + CW / 2, CW / 2 + 0.03);
      sign('gate2', ix, y + 1.75, iz, 0.62, 0.62, inward);
      const [gx2, gz2] = at(-(g.half + 3.4), -0.26);
      sign('govindas', gx2, y + 2.05, gz2, 2.2, 0.55, toLane);
    }
    // the guard stands to one side of the way in, not in it
    const [gx, gz] = at(g.half - 0.7, 2.8);
    guard(gx, gz, toLane);
    const [bx, bz] = at(g.half + 2.4, 2.6);
    booth(bx, bz, ang);
  }

  /* ================================================================
   * THE FORECOURT, from the gate to the great arch and the temple's door
   * ================================================================ */
  /*
   * OPEN MARBLE, BLACK AND WHITE ON THE DIAGONAL, AND NOTHING STANDING IN IT.
   *
   * You said the corridor was "very narrow", and it was, for a reason that was
   * mine: a double arcade of cream piers with chalice planters ran from the
   * gate to the arch, 6 m between the planters, walling the samadhi off from
   * the way in. That arcade is not here. It is the WEST corridor's — the
   * "GATE:2" set on Commons ("In and around of Sri Krishna-Balaram Mandir,
   * Vrindavan 01-20") walks it: the goblet-planter columns, the murals, the
   * shops, the orthogonal green-and-white chequer — and it is built there now.
   * Inside the road gate is a forecourt: the same set, 35-42, shows it
   * black-and-white marble laid on the diagonal, the railing and hedge along
   * the road, the samadhi's swan staircase on one side, and people walking
   * straight across it; the 2013 street photograph shows the chequer through
   * the open gate. Its size is the space OSM leaves between the fence and the
   * two marble buildings. Square size (0.6 m) is read off the photographs
   * against feet, not measured.
   */
  {
    const S = 0.6, e = S * Math.SQRT1_2;
    const courtAt = (lx, lz) => lz > 16.8 && lz < 53.4 && lx > -19.3 && lx < 25.4
      && !(lx > 17.8 && lz < 18.4) && !(lx > 24.2 && lz < 25.4)
      && inPoly(CP, lx, lz) && !solidPolys.some((q) => inPoly(q, lx, lz));
    for (let clz = 16.8 + e; clz < 53.4; clz += 2 * e) {
      for (let clx = -19.3 + e; clx < 25.4; clx += 2 * e) {
        if (!courtAt(clx, clz) || !courtAt(clx - e, clz) || !courtAt(clx + e, clz)
          || !courtAt(clx, clz - e) || !courtAt(clx, clz + e)) continue;
        const y = pave(clx, clz) + 0.035;
        const A = p(clx - e, clz), E = p(clx, clz + e), Cc = p(clx + e, clz), D = p(clx, clz - e);
        b.quad([A[0], y, A[1]], [E[0], y, E[1]], [Cc[0], y, Cc[1]], [D[0], y, D[1]], C.CHQ_B);
      }
    }
    // (the big palm planters at the path's edges came off when the swan
    // staircases went where the photographs put them: a potted palm now
    // stands on each staircase's newel instead)
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
  /** The outward normal of a polygon's edge i, whichever way it winds. */
  const outward = (pts, i) => {
    const u = edgeDir(pts[i], pts[(i + 1) % pts.length]);
    return area2(pts) > 0 ? [u[1], -u[0]] : [-u[1], u[0]];
  };
  /**
   * THE SWAN STAIRCASE: one long straight flight up a marble building's face.
   *
   * Both buildings have one, and the photographs agree on how they run: the
   * foot at the path beside the building's tower, by the great arch, rising
   * AWAY from the path along the building's diagonal face to a first-floor
   * door at its far corner, with a balustrade of carved swans on its open
   * side — "Sri Krishna Balaram Temple, Vrindavan.JPG" and the view you sent,
   * looking north through the arch with a flight on each hand; the 2013
   * street photograph 6734 from the road; "ISKON TEMPLE 1.jpg". (The double
   * quarter turn on the samadhi's front that stood here was the survey's
   * words, "a DOUBLE CURVING STAIRCASE climbs the front", drawn without a
   * photograph.)
   *
   * `E` is the face's corner at the tower and `Fz` its far corner. The flight
   * starts 1.6 m along from the tower and is 1.5 m wide, and its three bottom
   * steps are open to the path, so the walk between the two feet stays about
   * 5 m — the arch's own width — rather than pinching the way in again.
   * Rise and going are what the storey height leaves (~0.19 / 0.26 m).
   */
  const swanFlight = (E, Fz, nrm, yFoot, yTop, tag) => {
    const Lf = Math.hypot(Fz[0] - E[0], Fz[1] - E[1]);
    const u = [(Fz[0] - E[0]) / Lf, (Fz[1] - E[1]) / Lf];
    const ang = Math.atan2(u[1], u[0]);
    const W = 1.5, T0 = 1.6, LAND = 1.0, T1 = Lf - LAND - 0.1;
    const N = Math.max(6, Math.round((yTop - yFoot) / 0.19));
    const rise = (yTop - yFoot) / N, run = (T1 - T0) / N;
    const at = (t, o) => [E[0] + u[0] * t + nrm[0] * o, E[1] + u[1] * t + nrm[1] * o];
    for (let i = 0; i < N; i++) {
      const tt = yFoot + (i + 1) * rise, tc = T0 + (i + 0.5) * run;
      const [cx, cz] = at(tc, W / 2);
      // the tread, and the masonry under it down to the paving
      box(cx, yFoot - 0.1, cz, run + 0.02, tt - yFoot + 0.1, W, i % 2 ? C.MARBLE : tint(C.MARBLE, 0.985), ang);
      solid(cx, cz, run + 0.02, W, ang, { top: tt, tag, standOnly: true });
      if (i < 3) continue;                       // the bottom steps open to the path
      // the balustrade of swans on the open side: a plinth course, a swan to
      // each step (breast, neck, head), and the rail over them
      const [bx, bz] = at(tc, W + 0.08);
      box(bx, tt, bz, run + 0.02, 0.22, 0.16, C.MARBLE, ang);
      box(bx, tt + 0.22, bz, 0.13, 0.3, 0.12, tint(C.MARBLE, 0.97), ang);
      box(bx + u[0] * 0.05, tt + 0.5, bz + u[1] * 0.05, 0.05, 0.2, 0.05, C.MARBLE, ang);
      box(bx + u[0] * 0.09, tt + 0.68, bz + u[1] * 0.09, 0.11, 0.06, 0.06, C.MARBLE, ang);
      box(bx, tt + 0.84, bz, run + 0.03, 0.08, 0.2, C.MARBLE_SH, ang);
      solid(bx, bz, run + 0.02, 0.3, ang, { top: tt + 1.0, tag: 'temple-rail' });
    }
    // the newel where the swans begin, with a potted palm on it
    {
      const tc = T0 + 3 * run, [nx, nz] = at(tc, W + 0.08), y = yFoot + 3 * rise;
      box(nx, yFoot - 0.1, nz, 0.42, y - yFoot + 1.1, 0.42, C.MARBLE, ang);
      box(nx, y + 1.0, nz, 0.52, 0.1, 0.52, C.MARBLE_SH, ang);
      const q = p(nx, nz);
      b.prism(q[0], y + 1.1, q[1], 0.26, 0.26, 0.4, 0.4, 0.3, C.MARBLE);
      b.bevelBox(q[0], y + 1.4, q[1], 0.5, 0.4, 0.5, 0x3f7a3a, 0, 0.2);
      post(nx, nz, 0.3, { top: y + 1.6 });
    }
    // the landing at the top, and the first-floor door it serves
    {
      const tc = T1 + LAND / 2, [lx, lz] = at(tc, W / 2);
      box(lx, yFoot - 0.1, lz, LAND + 0.02, yTop - yFoot + 0.1, W, C.MARBLE, ang);
      solid(lx, lz, LAND, W, ang, { top: yTop, tag: 'temple-floor', floor: true });
      // its rail on the open side and across the end
      const [rx, rz] = at(tc, W + 0.08);
      box(rx, yTop, rz, LAND + 0.1, 0.92, 0.16, C.MARBLE, ang);
      const [ex, ez] = at(T1 + LAND + 0.05, W / 2);
      box(ex, yTop, ez, 0.16, 0.92, W + 0.2, C.MARBLE, ang);
      // the door: dark wood in a marble frame, on the upper storey's face
      const [dx, dz] = at(tc, -0.1);
      box(dx, yTop, dz, 1.3, 2.55, 0.1, C.MARBLE_SH, ang);
      box(dx + nrm[0] * 0.03, yTop, dz + nrm[1] * 0.03, 1.05, 2.35, 0.1, 0x3b3226, ang);
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
  /*
   * WHERE SRILA PRABHUPADA'S DOOR IS: on the samadhi's NORTH-EAST face, the
   * one that looks onto the little court between the arch's staircases and
   * the temple's own door. "prabhupada deity are after the top stairs and
   * between the stairs and out of deity main temple room on left side of
   * enter and on right side is a shop" — past the stairs, on the left as you
   * walk up to the temple, a shop on the right. It was on the road face,
   * before the stairs, toward the gate, which you said is wrong; and the
   * photograph of this door ("In and around ... Vrindavan" 28 and 29: black
   * doors up broad steps where people sit, under a carved portico) has the
   * cream temple behind it, which the road face never could.
   * SA edge 4 -> 5 runs from the tower by the arch to the north-west corner.
   */
  const doorEdge = 4;
  const doorT = Math.hypot(SA[5][0] - SA[4][0], SA[5][1] - SA[4][1]) / 2;
  const DU = edgeDir(SA[4], SA[5]);
  const DN = area2(SA) > 0 ? [DU[1], -DU[0]] : [-DU[1], DU[0]];       // outward, onto the court
  const D0 = [SA[4][0] + DU[0] * doorT, SA[4][1] + DU[1] * doorT];
  const FA = Math.atan2(DU[1], DU[0]);                               // the room frame's X axis, local
  {
    // "Moulded marble plinth ~1.2–1.5 m, carrying a carved frieze of elephants
    // in file and a lotus-petal course"
    extrude(grow(SA, 0.35), yS - 0.25, ST1, C.MARBLE_SH);
    extrude(grow(SA, 0.42), yS + 0.5, yS + 0.9, tint(C.VEIN, 0.95));
    extrude(grow(SA, 0.48), ST1 - 0.12, ST1 + 0.03, C.MARBLE);
    extrude(SA, ST1, CO1, C.MARBLE, C.MARBLE, { at: D0, hw: 1.2, crown: ST1 + 3.4 });
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
    // the door is on the north-east face (see D0); the road face is jali
    bays(SA, ST1, CO1 - ST1 - 0.1, C.MARBLE, 0xb9b3a6, () => false, [{ edge: doorEdge, t: doorT }]);
    bays(grow(SA, -0.12), ST2 + 0.2, CO2 - ST2 - 0.5, C.MARBLE, 0x9b968c);
    cornice(SA, CO1 - 0.05, C.MARBLE);
    cornice(grow(SA, 0.3), CO2 + 0.1, C.MARBLE);
    parapet(grow(SA, 0.3), TER, C.MARBLE);
    // every face walled but the front, which is walled either side of its door
    edgeWalls(SA, TER + 1.0, (i) => i === doorEdge);
    {
      const A = SA[doorEdge], B = SA[doorEdge + 1];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const u = edgeDir(A, B), inw = area2(SA) > 0 ? [-u[1], u[0]] : [u[1], -u[0]];
      for (const [t0, t1] of [[0, doorT - 1.2], [doorT + 1.2, L]]) {
        const tm = (t0 + t1) / 2;
        solid(A[0] + u[0] * tm + inw[0] * 0.3, A[1] + u[1] * tm + inw[1] * 0.3, t1 - t0 + 0.15, 0.6,
          Math.atan2(u[1], u[0]), { top: TER + 1.0 });
      }
    }

    // steps up to the ground-floor door, and what is seen through it
    {
      /*
       * Written in the room's own frame: the door at (DOOR_X, FZ0) facing +lz,
       * which is what these figures were measured in, carried onto the
       * north-east face by M — X along the face, +Z out onto the court. The
       * frame is a rotation, so every length and every left and right is kept.
       */
      const DOOR_X = 0, FZ0 = 39.465;
      const M = (lx, lz) => { const X = lx - DOOR_X, Z = lz - FZ0; return [D0[0] + DU[0] * X + DN[0] * Z, D0[1] + DU[1] * X + DN[1] * Z]; };
      const box2 = (lx, y, lz, w, h, d, color, ang = 0) => { const q = M(lx, lz); box(q[0], y, q[1], w, h, d, color, ang + FA); };
      const solid2 = (lx, lz, w, d, ang = 0, extra = {}) => { const q = M(lx, lz); solid(q[0], q[1], w, d, ang + FA, extra); };
      const sign2 = (key, lx, y, lz, w, h, face) => { const q = M(lx, lz); sign(key, q[0], y, q[1], w, h, face + FA); };
      const place2 = (geo, lx, y, lz, face) => { const q = M(lx, lz); place(geo, q[0], y, q[1], face + FA); };
      const p2 = (lx, lz) => p(...M(lx, lz));
      const faceR2 = (a2) => faceR(a2 + FA);
      const RR = rot + FA;                       // this frame's world rotation
      // three steps and a deep top landing that runs right up to the door
      const N = 4, RISE = (ST1 - yS) / N, TR = 0.45, LAND = 1.4;
      const F = 39.46;
      box2(DOOR_X, yS - 0.05, F + LAND / 2, 3.4, ST1 - yS + 0.05, LAND, C.MARBLE);
      solid2(DOOR_X, F + LAND / 2, 3.4, LAND, 0, { top: ST1, tag: 'temple-step', standOnly: true });
      for (let i = 0; i < N - 1; i++) {
        const lz = F + LAND + (N - 1 - i) * TR - TR / 2;
        box2(DOOR_X, yS - 0.05 + i * RISE, lz, 3.4, RISE + 0.05, TR, C.MARBLE);
        solid2(DOOR_X, lz, 3.4, TR, 0, { top: yS + (i + 1) * RISE, tag: 'temple-step', standOnly: true });
      }
      /*
       * SRILA PRABHUPADA'S SAMADHI: THE ROOM, AND NOW YOU CAN WALK INTO IT.
       *
       * "the golden prabhupada deities room present just after the entry on
       * left side is not there". It was a painted chamber behind a sill you
       * could not cross, and the murti in it was a tan-skinned man. Behind this
       * door, the first door on your left inside the road gate, is the room,
       * and what is in it is read off one photograph, Commons "Samadhi Mandir,
       * Srila Prabhupad, ISKCON, Vrindavan.jpg": the GOLDEN murti of Srila
       * Prabhupada in saffron, garlanded with marigolds, seated on a gilded
       * two-tier seat carrying a white plaque, under a white marble arch on two
       * lotus-vase columns with a scrolled crest; all of it on a raised white
       * platform whose face is a frieze of elephants in file, a black stone
       * lettered "Samadhi Mandir" before him, dark stone behind, and either
       * side a carved lion on a pedestal under a tall marble vase column.
       * The room's size is published nowhere: 7.6 x 8.3 m is what the plan
       * leaves behind this door (INFERRED).
       */
      const my = ST1 + 0.03;                       // the marble slab's top, which the plinth band lays
      const CEIL = my + 4.6;
      const RX0 = DOOR_X - 3.82, RX1 = DOOR_X + 3.82, RZ0 = 31.2, RZ1 = 38.86, FZ = 39.465;
      const DHW = 1.2, SPRING = ST1 + 3.4 - DHW, CROWN = ST1 + 3.4;   // the extrusion's own door
      const DARK = 0x1c1a1b, DARK2 = 0x2c2826, CEILC = 0xe6dfd1;
      const lq = (A, B, Cq, D, col) => {
        const a2 = p2(A[0], A[2]), b2 = p2(B[0], B[2]), c2 = p2(Cq[0], Cq[2]), d2 = p2(D[0], D[2]);
        b.quad([a2[0], A[1], a2[1]], [b2[0], B[1], b2[1]], [c2[0], Cq[1], c2[1]], [d2[0], D[1], d2[1]], col);
      };
      // a wall facing -lz / +lz / +lx / -lx, in LOCAL coordinates
      const wallN = (x0, x1, z, y0, y1, col) => lq([x0, y0, z], [x0, y1, z], [x1, y1, z], [x1, y0, z], col);
      const wallS = (x0, x1, z, y0, y1, col) => lq([x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z], col);
      const wallE = (x, z0, z1, y0, y1, col) => lq([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1], col);
      const wallW = (x, z0, z1, y0, y1, col) => lq([x, y0, z1], [x, y1, z1], [x, y1, z0], [x, y0, z0], col);
      {
        // the floor, white, with a dark border
        const up = (x0, x1, z0, z1, y, col) => lq([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], col);
        up(RX0, RX1, RZ0, FZ, my + 0.004, C.MARBLE);
        for (const [x0, x1, z0, z1] of [[RX0, RX1, RZ0, RZ0 + 0.3], [RX0, RX0 + 0.3, RZ0, RZ1], [RX1 - 0.3, RX1, RZ0, RZ1], [RX0, DOOR_X - DHW, RZ1 - 0.3, RZ1], [DOOR_X + DHW, RX1, RZ1 - 0.3, RZ1]]) {
          up(x0, x1, z0, z1, my + 0.007, DARK2);
        }
        // the ceiling, carved white, with a gilt rosette
        lq([RX0, CEIL, RZ0], [RX1, CEIL, RZ0], [RX1, CEIL, RZ1], [RX0, CEIL, RZ1], CEILC);
        const cz = (RZ0 + RZ1) / 2;
        lq([DOOR_X - 0.9, CEIL - 0.01, cz - 0.9], [DOOR_X + 0.9, CEIL - 0.01, cz - 0.9], [DOOR_X + 0.9, CEIL - 0.01, cz + 0.9], [DOOR_X - 0.9, CEIL - 0.01, cz + 0.9], tint(C.GILT, 0.95));
        // the back: dark stone. The sides: marble over a dark dado, a dark
        // arched recess in each bay
        wallS(RX0, RX1, RZ0, my, CEIL, DARK);
        wallE(RX0, RZ0, RZ1, my, CEIL, C.MARBLE_SH);
        wallW(RX1, RZ0, RZ1, my, CEIL, C.MARBLE_SH);
        wallE(RX0 + 0.01, RZ0, RZ1, my, my + 0.9, DARK2);
        wallW(RX1 - 0.01, RZ0, RZ1, my, my + 0.9, DARK2);
        for (const zc of [33.0, 36.5]) {
          wallE(RX0 + 0.02, zc - 0.8, zc + 0.8, my + 1.2, my + 3.4, DARK);
          wallW(RX1 - 0.02, zc - 0.8, zc + 0.8, my + 1.2, my + 3.4, DARK);
          for (const [x, rr] of [[RX0 + 0.1, RR + Math.PI / 2], [RX1 - 0.1, RR + Math.PI / 2]]) {
            const q2 = p2(x, zc);
            cuspedArch(b, q2[0], my + 2.6, q2[1], 1.7, 1.0, 0.16, rr, C.MARBLE, 5, null);
          }
        }
        // the front wall's inner face, its arched door, and the depth of the door
        wallN(RX0, DOOR_X - DHW, RZ1, my, CEIL, C.MARBLE_SH);
        wallN(DOOR_X + DHW, RX1, RZ1, my, CEIL, C.MARBLE_SH);
        wallN(DOOR_X - DHW, DOOR_X + DHW, RZ1, CROWN, CEIL, C.MARBLE_SH);
        wallE(DOOR_X - DHW, RZ1, FZ, my, SPRING, C.MARBLE);
        wallW(DOOR_X + DHW, RZ1, FZ, my, SPRING, C.MARBLE);
        const SEG = 12;
        for (let k = 0; k < SEG; k++) {
          const a0 = Math.PI * (k / SEG), a1 = Math.PI * ((k + 1) / SEG);
          const x0 = DOOR_X - Math.cos(a0) * DHW, y0 = SPRING + Math.sin(a0) * DHW;
          const x1 = DOOR_X - Math.cos(a1) * DHW, y1 = SPRING + Math.sin(a1) * DHW;
          lq([x0, y0, RZ1], [x1, y1, RZ1], [x1, y1, FZ], [x0, y0, FZ], C.MARBLE);          // the soffit
          lq([x0, y0, RZ1], [x0, CROWN, RZ1], [x1, CROWN, RZ1], [x1, y1, RZ1], C.MARBLE_SH);  // spandrel
        }
        // what holds it up, and what keeps you in the room rather than in the
        // hollow of the building behind its walls
        solid2(DOOR_X, RZ0 - 0.2, RX1 - RX0 + 0.8, 0.4, 0, { top: CEIL });
        solid2(RX0 - 0.2, (RZ0 + RZ1) / 2, 0.4, RZ1 - RZ0 + 0.4, 0, { top: CEIL });
        solid2(RX1 + 0.2, (RZ0 + RZ1) / 2, 0.4, RZ1 - RZ0 + 0.4, 0, { top: CEIL });
        solid2(DOOR_X, (RZ0 + FZ) / 2, RX1 - RX0, FZ - RZ0, 0, { top: my, tag: 'temple-floor', floor: true });
      }
      {
        // the platform, with its elephants in file
        const PZ0 = 31.5, PZ1 = 33.9, PH = 0.95, PW = 4.2;
        box2(DOOR_X, my, (PZ0 + PZ1) / 2, PW + 0.1, 0.12, PZ1 - PZ0 + 0.1, C.MARBLE_SH);
        box2(DOOR_X, my, (PZ0 + PZ1) / 2, PW, PH, PZ1 - PZ0, C.MARBLE);
        box2(DOOR_X, my + PH - 0.08, (PZ0 + PZ1) / 2, PW + 0.16, 0.08, PZ1 - PZ0 + 0.16, C.MARBLE_SH);
        for (let t = -1.75; t <= 1.76; t += 0.7) {
          box2(DOOR_X + t, my + 0.3, PZ1 + 0.03, 0.44, 0.24, 0.06, tint(C.MARBLE, 0.96));
          box2(DOOR_X + t + 0.27, my + 0.4, PZ1 + 0.03, 0.12, 0.16, 0.06, tint(C.MARBLE, 0.96));
          box2(DOOR_X + t - 0.12, my + 0.18, PZ1 + 0.03, 0.07, 0.12, 0.05, C.MARBLE_SH);
          box2(DOOR_X + t + 0.12, my + 0.18, PZ1 + 0.03, 0.07, 0.12, 0.05, C.MARBLE_SH);
        }
        solid2(DOOR_X, (PZ0 + PZ1) / 2, PW, PZ1 - PZ0, 0, { top: my + PH });
        // the black stone before him
        const top = my + PH;
        // a low slab at the platform's front edge, so the plaque on his seat
        // still shows over it, as in the photograph
        box2(DOOR_X, top, PZ1 - 0.2, 1.7, 0.05, 0.36, 0x141313);
        box2(DOOR_X, top + 0.02, PZ1 - 0.2, 1.6, 0.32, 0.07, 0x161515);
        sign2('samadhi-stone', DOOR_X, top + 0.18, PZ1 - 0.155, 1.48, 0.28, FACE.S);
        // the gilded seat, two tiers, the white plaque on its face
        const SZ = 32.4;
        box2(DOOR_X, top, SZ, 1.85, 0.34, 1.35, C.GILT);
        box2(DOOR_X, top + 0.34, SZ, 1.95, 0.06, 1.45, tint(C.GILT, 1.12));
        box2(DOOR_X, top + 0.4, SZ - 0.04, 1.55, 0.24, 1.12, C.GILT);
        sign2('acbsp', DOOR_X, top + 0.52, SZ + 0.53, 1.3, 0.2, FACE.S);        // on the upper tier, over the stone
        const SEAT = top + 0.64;
        box2(DOOR_X, SEAT, SZ - 0.04, 1.3, 0.04, 0.95, 0xe8891f);
        // marigolds strewn along the front of the seat
        for (let k = 0; k < 11; k++) {
          const t = -0.8 + k * 0.16;
          box2(DOOR_X + t, top + 0.64, SZ + 0.52 + (k % 2) * 0.05, 0.1, 0.07, 0.1, k % 3 ? 0xf08a1c : 0xf5b72a);
        }
        if (buildSeated && place) {
          /*
           * GOLDEN, which is what everybody who has stood here remembers, and
           * what the photograph shows: face and hands gold, the cloth saffron.
           * Larger than life ("a larger-than-life-size murti", Back to Godhead,
           * January 1984).
           */
          const t = { id: 'prabhupada', cloth: 0xe8891f, skin: 0xd4a23a, scale: 1.3,
            dhoti: 0xe8891f, tilak: 1, beads: true, shaven: true, shawl: 0xe07a18 };
          place2(buildSeated(t, 'lap', null), DOOR_X, SEAT + 0.04, SZ - 0.05, FACE.S);
          // two garlands of marigold, the long one to the knees
          const g = new MeshBuilder();
          const s2 = t.scale;
          for (const [w, drop, y0, z0, n] of [[0.2, 0.46, 0.64, 0.13, 13], [0.27, 0.62, 0.5, 0.15, 17]]) {
            for (let k = 0; k < n; k++) {
              const u = -1 + (2 * k) / (n - 1);
              const col = k === (n - 1) / 2 ? 0xc8302a : (k % 2 ? 0xf08a1c : 0xf5b72a);
              g.box(w * s2 * u, (y0 + drop * u * u) * s2, (z0 + 0.1 * (1 - u * u)) * s2, 0.075, 0.075, 0.06, col);
            }
          }
          place2(g.build(), DOOR_X, SEAT + 0.04, SZ - 0.05, FACE.S);
        }
        // the canopy: two lotus-vase columns and a round arch with its crest
        const CZ = SZ - 0.1;
        for (const sd of [-1, 1]) {
          const cx = DOOR_X + sd * 1.15;
          const q2 = p2(cx, CZ);
          let y = top;
          const stack = [
            ['box', 0.42, 0.18], ['taper', 0.26, 0.4, 0.2], ['taper', 0.4, 0.24, 0.2], ['box', 0.2, 0.36],
            ['taper', 0.24, 0.44, 0.26], ['taper', 0.44, 0.22, 0.26], ['box', 0.17, 0.2], ['taper', 0.2, 0.46, 0.18], ['box', 0.5, 0.07],
          ];
          for (const st of stack) {
            if (st[0] === 'box') { b.box(q2[0], y, q2[1], st[1], st[2], st[1], C.MARBLE, RR); y += st[2]; }
            else { b.prism(q2[0], y, q2[1], st[1], st[1], st[2], st[2], st[3], C.MARBLE); y += st[3]; }
          }
          solid2(cx, CZ, 0.46, 0.46, 0, { top: y });
        }
        const SPR = top + 1.95, R0 = 1.01, R1 = 1.29, AD = 0.32;
        {
          const SEGA = 16;
          for (let k = 0; k < SEGA; k++) {
            const a0 = Math.PI * (k / SEGA), a1 = Math.PI * ((k + 1) / SEGA);
            const P = (a, r, z) => [DOOR_X - Math.cos(a) * r, SPR + Math.sin(a) * r, z];
            const zf = CZ + AD / 2, zb = CZ - AD / 2;
            lq(P(a0, R0, zf), P(a0, R1, zf), P(a1, R1, zf), P(a1, R0, zf), C.MARBLE);        // its face
            lq(P(a1, R0, zb), P(a1, R1, zb), P(a0, R1, zb), P(a0, R0, zb), C.MARBLE_SH);     // its back
            lq(P(a0, R0, zb), P(a0, R0, zf), P(a1, R0, zf), P(a1, R0, zb), C.MARBLE_SH);     // under it
            lq(P(a0, R1, zf), P(a0, R1, zb), P(a1, R1, zb), P(a1, R1, zf), C.MARBLE);        // over it
          }
          // the scrolled crest, and a knob on it
          box2(DOOR_X, SPR + R1 - 0.06, CZ, 0.56, 0.34, 0.2, C.MARBLE);
          for (const sd of [-1, 1]) box2(DOOR_X + sd * 0.42, SPR + R1 - 0.2, CZ, 0.3, 0.2, 0.18, C.MARBLE, sd * 0.5);
          box2(DOOR_X, SPR + R1 + 0.28, CZ, 0.16, 0.14, 0.16, C.MARBLE_SH);
        }
        // dark stone behind him, and the lamps' glow on it
        {
          const q2 = p2(DOOR_X, RZ0 + 0.02);
          b.panel(q2[0], my + 2.6, q2[1], 3.2, 3.4, 0x0f0e0f, faceR2(FACE.S), 0.01);
          b.panel(q2[0], my + 3.9, q2[1], 1.4, 0.5, 0xf6e2a8, faceR2(FACE.S), 0.02);
          for (const sd of [-1, 1]) b.panel(q2[0] + Math.cos(RR) * sd * 0.5, my + 4.3, q2[1] + Math.sin(RR) * sd * 0.5, 0.18, 0.18, 0xfff4d0, faceR2(FACE.S), 0.03);
        }
        // the lions on their pedestals, and the vase columns over them
        for (const sd of [-1, 1]) {
          const lx = DOOR_X + sd * 2.78, lz = 33.55;
          box2(lx, my, lz, 0.84, 1.0, 0.84, C.MARBLE);
          box2(lx, my + 0.92, lz, 0.94, 0.08, 0.94, C.MARBLE_SH);
          const y = my + 1.0;
          box2(lx, y, lz - 0.12, 0.56, 0.36, 0.6, C.MARBLE);                  // haunches
          box2(lx, y + 0.3, lz + 0.08, 0.46, 0.48, 0.36, C.MARBLE);           // chest
          box2(lx, y + 0.72, lz + 0.14, 0.48, 0.42, 0.38, tint(C.MARBLE, 0.97));   // the mane
          box2(lx, y + 0.78, lz + 0.34, 0.26, 0.24, 0.14, C.MARBLE);          // the face
          box2(lx, y + 0.8, lz + 0.42, 0.14, 0.08, 0.04, C.MARBLE_SH);        // the open jaw
          for (const k of [-1, 1]) box2(lx + k * 0.13, y, lz + 0.26, 0.12, 0.34, 0.14, C.MARBLE);
          solid2(lx, lz, 0.84, 0.84, 0, { top: my + 1.0 });
          // the column behind and over him, to the ceiling
          const q2 = p2(lx, lz - 0.34);
          let yy = y + 0.36;
          const stack = [['box', 0.46, 0.2], ['taper', 0.3, 0.52, 0.34], ['taper', 0.52, 0.3, 0.3], ['box', 0.26, 0.5],
            ['taper', 0.3, 0.56, 0.4], ['taper', 0.56, 0.28, 0.36], ['box', 0.24, 0.3], ['taper', 0.26, 0.6, 0.3]];
          for (const st of stack) {
            if (yy > CEIL - 0.1) break;
            if (st[0] === 'box') { b.box(q2[0], yy, q2[1], st[1], st[2], st[1], C.MARBLE, RR); yy += st[2]; }
            else { b.prism(q2[0], yy, q2[1], st[1], st[1], st[2], st[2], st[3], C.MARBLE); yy += st[3]; }
          }
          if (yy < CEIL) b.box(q2[0], yy, q2[1], 0.62, CEIL - yy, 0.62, C.MARBLE, RR);
        }
        // the bell on its bracket, on the left as you face him
        box2(DOOR_X - 2.3, my + 1.9, 33.7, 0.5, 0.05, 0.05, tint(C.GILT, 0.9));
        {
          const q2 = p2(DOOR_X - 2.06, 33.7);
          b.prism(q2[0], my + 1.55, q2[1], 0.2, 0.2, 0.09, 0.09, 0.3, tint(C.GILT, 0.85));
        }
      }
      rooms.push({
        id: 'iskcon-samadhi',
        name: "Srila Prabhupada's Samadhi",
        hindi: 'श्रील प्रभुपाद समाधि मंदिर',
        deity: 'Srila Prabhupada',
        ...(() => { const c2 = p2(DOOR_X, (RZ0 + FZ) / 2); return { x: c2[0], z: c2[1] }; })(),
        hw: (RX1 - RX0) / 2, hd: (FZ - RZ0) / 2, rot: RR,
        // the door's glow on the forecourt at the foot of the steps
        door: p2(DOOR_X, FZ + 1.4 + 3 * 0.45 + 0.6),
        ceil: CEIL - 0.05,
      });
      sign2('samadhi', DOOR_X, CO1 - 0.8, 39.46 + 0.62, 3.6, 0.75, FACE.S);
    }

    // the swan staircase up the samadhi's face to the path: see swanFlight
    {
      const i = 2;                                   // SA edge 2 -> 3, the diagonal to the arch
      swanFlight(SA[i + 1], SA[i], outward(SA, i), yS, ST2, 'samadhi-stair');
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
    // its swan staircase, the samadhi's mirror, up MU edge 1 -> 2
    swanFlight(MU[1], MU[2], outward(MU, 1), yM, yM + 6.35, 'museum-stair');
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

    /*
     * "on right side is a shop": across the little court from Srila
     * Prabhupada's door, against the museum's north-west face, which is the
     * face on your right as you walk up to the temple. Books and gifts, as the
     * campus's own shops are. That it stands against this face is your
     * account; its size and stock are INFERRED.
     */
    {
      const i = 9, A = MU[i], B = MU[(i + 1) % MU.length];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const u = edgeDir(A, B), nr = outward(MU, i), ang = Math.atan2(u[1], u[0]);
      const at = (t, o) => [A[0] + u[0] * t + nr[0] * o, A[1] + u[1] * t + nr[1] * o];
      const tm = L / 2, SW = 4.2, SD = 2.2, SH = 3.5, O0 = 0.35;
      const face = Math.atan2(nr[1], nr[0]);
      const [cx, cz] = at(tm, O0 + SD / 2);
      const y = pave(cx, cz);
      box(cx, y - 0.1, cz, SW, SH + 0.1, SD, C.CREAM, ang);
      box(cx, y + SH - 0.05, cz, SW + 0.3, 0.22, SD + 0.3, C.SALMON, ang);
      box(cx, y + SH + 0.17, cz, SW + 0.1, 0.4, SD + 0.05, C.CREAM, ang);
      // the open front: dark within, three shelves of books and brass
      const [fx, fz] = at(tm, O0 + SD + 0.02);
      box(fx, y + 0.9, fz, SW - 0.6, 1.9, 0.04, 0x2f2a26, ang);
      const GOODS = [0xb0283a, 0x2b5f8a, 0xe8c040, 0x2f6f4f, 0xf2ece0, 0x7a4a86, 0xc9a227, 0xc0562f];
      for (let r2 = 0; r2 < 3; r2++) {
        const [sx, sz] = at(tm, O0 + SD + 0.05);
        box(sx, y + 1.05 + r2 * 0.55, sz, SW - 0.7, 0.03, 0.06, 0x8a6a42, ang);
        for (let k = 0; k < 22; k++) {
          const [gx, gz] = at(tm - (SW - 0.8) / 2 + 0.08 + k * ((SW - 0.8) / 22), O0 + SD + 0.06);
          box(gx, y + 1.08 + r2 * 0.55, gz, 0.1, r2 === 1 && k % 4 === 0 ? 0.2 : 0.3, 0.05, GOODS[(k * 5 + r2 * 3) % GOODS.length], ang);
        }
      }
      // the counter across it, and the awning over
      const [kx, kz] = at(tm, O0 + SD + 0.3);
      box(kx, y, kz, SW - 0.4, 0.95, 0.5, 0x8a6a42, ang);
      box(kx, y + 0.95, kz, SW - 0.3, 0.05, 0.56, 0x6a4a2a, ang);
      const [ax, az] = at(tm, O0 + SD + 0.45);
      box(ax, y + 2.6, az, SW + 0.2, 0.08, 0.9, C.GREEN, ang);
      const [gx2, gz2] = at(tm, O0 + SD + 0.06);
      sign('gift', gx2, y + 2.95, gz2, 2.6, 0.6, face);
      solid(cx, cz, SW, SD, ang, { top: y + SH + 0.4 });
      solid(kx, kz, SW - 0.4, 0.5, ang, { top: y + 0.95 });
    }
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
    /*
     * ...and in each, at the foot, the tower's loggia. The photographs of the
     * walk under the arch (kbfollow c_arch_left, c_arch_right) show no blank
     * wall either side: each tower opens onto the path in a cusped arch
     * between carved pillars, a band of jali over it, dark behind — where
     * these blocks stood plain marble for seven metres.
     */
    for (const sd of [-1, 1]) {
      const fx = AXX + sd * (half - 0.42);                    // the face toward the path
      for (const lz of [Z0 + 0.32, Z1 - 0.32]) {
        box(fx - sd * 0.04, y0, lz, 0.12, 3.95, 0.46, C.MARBLE_SH);         // the pillar, proud
        box(fx - sd * 0.06, y0 + 0.9, lz, 0.16, 0.12, 0.56, C.MARBLE);       // its rings
        box(fx - sd * 0.06, y0 + 2.6, lz, 0.16, 0.12, 0.56, C.MARBLE);
        box(fx - sd * 0.08, y0 + 3.95, lz, 0.2, 0.3, 0.62, C.MARBLE);        // its capital
      }
      const q = p(fx, AZ);
      cuspedArch(b, q[0], y0 + 0.12, q[1], D - 1.1, 3.75, 0.3, rot + Math.PI / 2, C.MARBLE, 7, 0x2a241c);
      // the jali band over the opening, and its lintel
      box(fx - sd * 0.05, y0 + 4.25, AZ, 0.1, 0.08, D - 0.4, C.MARBLE);
      for (let k = 0; k <= 8; k++) box(fx - sd * 0.04, y0 + 4.33, Z0 + 0.45 + k * (D - 0.9) / 8, 0.08, 0.62, 0.1, C.MARBLE_SH);
      box(fx - sd * 0.05, y0 + 4.95, AZ, 0.12, 0.1, D - 0.4, C.MARBLE);
    }
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
   * THE WEST CORRIDOR: the kiosks, the goblet-planter columns, the murals
   * ================================================================ */
  /*
   * "make some more space in the corridor of it it's very narrow as of now".
   * It was 2.5 m, and less at the counters: OSM draws the six kiosks 5 m deep
   * against the fence and they were built that deep, so between them and the
   * temple's blank west wall was a slot two pilgrims could not pass in. The
   * photographs of this corridor — Commons "In and around of Sri
   * Krishna-Balaram Mandir, Vrindavan" 05-20, walked from GATE:2 toward the
   * samadhi's spire — show a lane of small shopfronts on one side and the
   * temple's mural wall on the other, a row of tall columns carrying GOBLET
   * planters down the middle, shade netting on a frame over it, benches, and
   * green-grey and white chequer laid square. So the kiosks are 2.5 m deep
   * here (OSM's outline takes in the walk in front of them, is my reading),
   * and the walk is 4.8 m. Figures are read off those photographs against
   * the people in them (INFERRED), not measured.
   */
  {
    const K = [
      ['bbt', -16.4, -11.7], ['vtv', -11.7, -6.9], ['bhisma', 2.6, 7.1],
      ['matchless', 7.1, 10.1], ['internet', 10.0, 12.7], ['welcome', 12.6, 15.4],
    ];
    const X0 = -19.5, X1 = -17.0, cx = (X0 + X1) / 2, w = X1 - X0, KH = 3.3;
    const BOOKS = [0xb0283a, 0x2b5f8a, 0xe8c040, 0x2f6f4f, 0xf2ece0, 0x7a4a86, 0xc0562f];
    for (const [key, z0, z1] of K) {
      const cz = (z0 + z1) / 2, d = z1 - z0 - 0.08;
      const y = pave(cx, cz);
      box(cx, y - 0.1, cz, w, KH + 0.1, d, C.CREAM);
      box(cx, y + KH - 0.05, cz, w + 0.3, 0.22, d + 0.2, C.SALMON);
      box(cx, y + KH + 0.17, cz, w + 0.1, 0.45, d + 0.05, C.CREAM);            // its parapet
      // the shopfront: a case of books, and a wooden door at one end
      const caseW = d - 1.9, caseZ = cz - 0.45;
      box(X1 + 0.02, y + 0.3, caseZ, 0.05, 2.0, caseW, 0x2f3b3a);
      const nb = Math.floor((caseW - 0.1) / 0.14);
      for (let r = 0; r < 4; r++) {
        box(X1 + 0.05, y + 0.4 + r * 0.46, caseZ, 0.05, 0.03, caseW - 0.06, 0x8a6a42);   // a shelf
        for (let k = 0; k < nb; k++) {
          const bz = caseZ - (nb * 0.14) / 2 + 0.07 + k * 0.14;
          box(X1 + 0.06, y + 0.43 + r * 0.46, bz, 0.04, 0.3, 0.1, BOOKS[(k * 3 + r) % BOOKS.length]);
        }
      }
      box(X1 + 0.03, y, cz + d / 2 - 0.75, 0.07, 2.3, 0.95, 0x6a4424);            // the door
      box(X1 + 0.05, y + 2.35, cz, 0.05, 0.12, d - 0.2, C.SALMON);
      box(X1 + 0.45, y + 2.62, cz, 0.9, 0.08, d + 0.1, C.GREEN);                   // the awning
      sign(key, X1 + 0.08, y + 2.95, cz, Math.min(d - 0.4, 2.4), 0.55, FACE.E);
      solid(cx, cz, w, d, 0, { top: y + KH + 0.6 });
    }

    // the green-grey and white chequer, laid square, with its dark grout lines
    {
      const XA = -17.0, XB = -12.3, ZA = -16.4, ZB = 16.8, T = 0.6;
      for (let lz = ZA; lz < ZB - 1e-6; lz += T) {
        for (let lx = XA; lx < XB - 1e-6; lx += T) {
          const i = Math.round((lx - XA) / T), j = Math.round((lz - ZA) / T);
          if ((i + j) % 2) continue;
          const x1 = Math.min(lx + T, XB), z1 = Math.min(lz + T, ZB);
          const y = pave((lx + x1) / 2, (lz + z1) / 2) + 0.035;
          const A = p(lx + 0.02, lz + 0.02), B = p(lx + 0.02, z1 - 0.02), Cc = p(x1 - 0.02, z1 - 0.02), D = p(x1 - 0.02, lz + 0.02);
          b.quad([A[0], y, A[1]], [B[0], y, B[1]], [Cc[0], y, Cc[1]], [D[0], y, D[1]], 0x8f9b8c);
        }
      }
      for (let lz = ZA; lz <= ZB + 1e-6; lz += T) {
        const y = pave((XA + XB) / 2, lz) + 0.037;
        const A = p(XA, lz - 0.015), B = p(XA, lz + 0.015), Cc = p(XB, lz + 0.015), D = p(XB, lz - 0.015);
        b.quad([A[0], y, A[1]], [B[0], y, B[1]], [Cc[0], y, Cc[1]], [D[0], y, D[1]], 0x2b2d2c);
      }
      for (let lx = XA; lx <= XB + 1e-6; lx += T) {
        for (let lz = ZA; lz < ZB - 1e-6; lz += 4.2) {
          const z1 = Math.min(lz + 4.2, ZB), y = pave(lx, (lz + z1) / 2) + 0.037;
          const A = p(lx - 0.015, lz), B = p(lx - 0.015, z1), Cc = p(lx + 0.015, z1), D = p(lx + 0.015, lz);
          b.quad([A[0], y, A[1]], [B[0], y, B[1]], [Cc[0], y, Cc[1]], [D[0], y, D[1]], 0x2b2d2c);
        }
      }
    }

    // the goblet-planter columns down the middle of the walk, and the frame
    // the shade netting hangs on (the net itself is left out: a dark sheet
    // over the lane would sit between the camera and you)
    const COLX = -15.2, COLS = [-14.2, -9.6, -5.0, 3.4, 8.0, 12.6];
    for (const lz of COLS) {
      const y = pave(COLX, lz);
      box(COLX, y, lz, 0.7, 0.55, 0.7, C.CREAM);
      box(COLX, y + 0.55, lz, 0.78, 0.1, 0.78, C.SALMON);
      box(COLX, y + 0.65, lz, 0.42, 2.2, 0.42, C.CREAM);
      for (const hy of [0.95, 1.9, 2.65]) box(COLX, y + hy, lz, 0.47, 0.07, 0.47, C.SALMON);
      const q = p(COLX, lz);
      b.prism(q[0], y + 2.85, q[1], 0.42, 0.42, 0.62, 0.62, 0.18, C.CREAM);          // capital
      b.prism(q[0], y + 3.03, q[1], 0.16, 0.16, 0.22, 0.22, 0.22, C.SALMON);          // the goblet's stem
      b.prism(q[0], y + 3.25, q[1], 0.32, 0.32, 1.0, 1.0, 0.62, 0xe0a07a);           // its cup
      b.box(q[0], y + 3.85, q[1], 1.04, 0.07, 1.04, C.SALMON, rot);
      b.bevelBox(q[0], y + 3.9, q[1], 0.9, 0.55, 0.9, 0x3f7a3a, 0, 0.25);             // the plant
      post(COLX, lz, 0.38, { top: y + 4.4 });
      // a cross member from the column to the temple wall, 4.6 m up
      box((COLX - 12.3) / 2, y + 4.6, lz, -12.3 - COLX, 0.06, 0.06, 0x3a3d3a);
    }
    {
      const y = pave(COLX, 0) + 4.6;
      box(COLX, y, 0, 0.06, 0.06, 33.0, 0x3a3d3a);
      box(-12.4, y, 0, 0.06, 0.06, 33.0, 0x3a3d3a);
    }

    // the temple's west wall seen from here: large framed paintings in pink
    // cusped frames, and benches under them
    const muralW = (lz, seed) => {
      const lx = -12.27, y = pave(-12.8, lz) + 2.35, face = faceR(FACE.W), q = p(lx, lz);
      const ux = -Math.sin(rot), uz = Math.cos(rot);                     // +lz, in world
      b.panel(q[0], y, q[1], 2.9, 3.2, C.PINK, face, 0.02);
      b.panel(q[0], y, q[1], 2.6, 2.9, 0x3d6b45, face, 0.04);
      b.panel(q[0], y - 1.05, q[1], 2.6, 0.7, 0x54803f, face, 0.05);
      b.panel(q[0], y + 1.12, q[1], 2.3, 0.5, tint(C.GILT, 0.88), face, 0.05);
      const sd = seed % 2 ? 1 : -1;
      b.panel(q[0] + ux * sd * 0.42, y - 0.12, q[1] + uz * sd * 0.42, 0.52, 1.3, 0xe8c04c, face, 0.07);
      b.panel(q[0] + ux * sd * 0.42, y + 0.68, q[1] + uz * sd * 0.42, 0.3, 0.32, 0x2f4f8a, face, 0.08);
      b.panel(q[0] - ux * sd * 0.46, y - 0.18, q[1] - uz * sd * 0.46, 0.5, 1.18, 0xc8452a, face, 0.07);
      b.panel(q[0] - ux * sd * 0.46, y + 0.55, q[1] - uz * sd * 0.46, 0.28, 0.3, 0xd8a878, face, 0.08);
      const a2 = p(lx - 0.03, lz);
      cuspedArch(b, a2[0], y + 0.9, a2[1], 2.9, 0.75, 0.08, rot + Math.PI / 2, C.PINK, 5, null);
    };
    [-12.6, -7.8, 3.8, 8.6, 13.4].forEach((lz, i) => muralW(lz, i));
    for (const lz of [-10.2, 6.2, 11.0]) {
      const y = pave(-12.8, lz);
      box(-12.78, y + 0.4, lz, 0.46, 0.07, 1.8, 0x7a5230);                        // the seat
      box(-12.97, y + 0.47, lz, 0.07, 0.45, 1.8, 0x7a5230);                       // its back
      for (const k of [-0.8, 0.8]) box(-12.78, y, lz + k, 0.4, 0.4, 0.07, 0x5a3a22);
      solid(-12.78, lz, 0.5, 1.8, 0, { top: y + 0.47 });
    }
    /*
     * The small door into the temple, on both sides, which LandmarkGenerator
     * cuts through the walls: "निकास EXIT" over it, outside and in.
     */
    for (const sd of [-1, 1]) {
      const y = pave(sd * 12.8, -1.1);
      sign('exit', sd * 12.29, y + 2.78, -1.1, 0.95, 0.34, sd < 0 ? FACE.W : FACE.E);
      sign('exit', sd * 11.52, y + 2.78, -1.1, 0.95, 0.34, sd < 0 ? FACE.E : FACE.W);
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
    // the peepal, just EAST of the gate — beside the right-hand pier as you
    // face the gate from the road, trunk banded red and white, sadhus at its
    // foot (the 2013 street photograph, 6734). It stood 10 m west.
    const PEEPAL_A = g.half + 2.4;
    {
      // as close to the gate as it stands in the photographs, and never in the
      // carriageway: step it in toward the railing until the road is 3.5 m
      // off, but never so far that its platform crosses the railing
      let [tx, tz] = out(PEEPAL_A, 3.0);
      for (let k = 0; k < 4 && o.roadDistance && o.roadDistance(...p(tx, tz)) < 3.5; k++) {
        [tx, tz] = out(PEEPAL_A, 3.0 - (k + 1) * 0.28);
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
        if (sd > 0 && i === 0) continue;                      // the peepal is there
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
    // rooms you walk into, which InteriorSystem opens the way it opens a shop
    rooms,
  };
}
