/**
 * LandmarkGenerator — the 23 named temples, ghats, groves and gates.
 *
 * These are the navigation anchors. Each architectural kind gets a distinct
 * silhouette you can read from across town: Rangaji's gopuram on the eastern
 * skyline, Govind Dev's red sandstone mass, the Chandrodaya tower, the white
 * cluster of Prem Mandir. Positions are the real OSM coordinates.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { rngAt } from '../../engine/math/Random.js';
import { TAU } from '../../engine/math/MathUtils.js';
import { PEOPLE, buildSeated, buildStanding } from '../npc/Archetypes.js';

export function buildLandmarks(ctx, terrain) {
  const group = new THREE.Group();
  group.name = 'Landmarks';
  const colliders = [];
  const anchors = {};
  const b = new MeshBuilder();
  const lights = [];
  const templeLights = [];
  // where the threshold into each walk-in interior really is, and any geometry
  // a builder asked to keep out of the shared mesh
  const interiors = {};
  const extra = [];

  for (const loc of ctx.data.LOCATIONS) {
    const kind = loc.build.kind;
    const fn = BUILDERS[kind] || BUILDERS['temple-small'];
    const ground = terrain.sampleHeight(loc.pos[0], loc.pos[1]);
    const rng = rngAt(loc.id);

    const out = fn({ loc, b, ground, rng, ctx, terrain });

    // where the player stands for darshan, and what the offering aims at
    const r = Math.max(loc.build.w, loc.build.d) * 0.5;
    const fx = loc.pos[0] + Math.sin(loc.rot) * (r + 5.5);
    const fz = loc.pos[1] + Math.cos(loc.rot) * (r + 5.5);
    anchors[loc.id] = {
      darshan: new THREE.Vector3(fx, terrain.sampleHeight(fx, fz), fz),
      facing: loc.rot + Math.PI,
      altar: new THREE.Vector3(
        loc.pos[0] + Math.sin(loc.rot) * (r * 0.3),
        ground + (out && out.altarY !== undefined ? out.altarY : 2.0),
        loc.pos[1] + Math.cos(loc.rot) * (r * 0.3),
      ),
      bell: new THREE.Vector3(
        loc.pos[0] + Math.sin(loc.rot) * (r + 1.5),
        ground + 3.4,
        loc.pos[1] + Math.cos(loc.rot) * (r + 1.5),
      ),
      // The floor a pujari at this altar is standing on, which is not the
      // terrain the moment a hall is raised over it: Krishna Balaram's altars
      // are five risers up from a sunken court, and RitualSystem placing its
      // arti at ground height would bury him to the knee in his own hall.
      floor: ground,
    };

    // A temple you can walk into gets wall colliders with a doorway gap, plus a
    // hall and an altar inside. Everything else stays a solid mass.
    //
    // A builder may instead author the whole interior itself and say so, which
    // is the only way to give one temple a plan of its own: `buildInterior` is
    // shared by eight locations and rewriting it for Krishna Balaram's
    // courtyard would have rebuilt Prem Mandir and Katyayani as courtyards too.
    if (out && out.interior) {
      const inner = out.interior;
      anchors[loc.id].altar.set(inner.altar[0], inner.altar[1], inner.altar[2]);
      anchors[loc.id].darshan.set(
        inner.darshan[0], terrain.sampleHeight(inner.darshan[0], inner.darshan[1]), inner.darshan[1],
      );
      anchors[loc.id].facing = inner.facing;
      anchors[loc.id].floor = inner.floor;
      if (inner.volume) interiors[loc.id] = inner.volume;
    } else if (ENTERABLE.has(kind)) {
      colliders.push(...hollowColliders(loc));
      const inner = buildInterior(b, loc, ground);
      buildDeities(b, loc, ground, inner.altar);
      anchors[loc.id].altar.set(inner.altar[0], ground + inner.altarY, inner.altar[1]);
      anchors[loc.id].darshan.set(
        inner.altar[0] + Math.sin(loc.rot) * 3.4,
        ground,
        inner.altar[1] + Math.cos(loc.rot) * 3.4,
      );
    } else if (!(out && out.noCollider)) {
      colliders.push({
        type: 'box', x: loc.pos[0], z: loc.pos[1],
        w: loc.build.w * 0.9, d: loc.build.d * 0.9, rot: loc.rot,
      });
    }
    if (out && out.colliders) colliders.push(...out.colliders);
    if (out && out.mesh && !out.mesh.builder.isEmpty) extra.push(out.mesh);

    if (ctx.quality.templeLights && loc.type === 'temple') {
      // kept so the evening can brighten them
      const l = new THREE.PointLight(0xffb45c, 2.4, 26, 2);
      l.position.set(
        loc.pos[0] + Math.sin(loc.rot) * (r * 0.35),
        ground + 3.2,
        loc.pos[1] + Math.cos(loc.rot) * (r * 0.35),
      );
      lights.push(l);
      templeLights.push(l);
    }
  }

  const mesh = b.toMesh('LandmarkGeometry', {
    castShadow: !!ctx.quality.shadows,
    receiveShadow: true,
  });
  group.add(mesh);
  for (const l of lights) group.add(l);

  /**
   * Geometry that is only ever seen from one room gets its own mesh.
   *
   * Everything else in this file lands in one LandmarkGeometry whose single
   * bounding sphere spans the whole 9.2 x 4.8 km world, so THREE's frustum cull
   * can never reject any of it — the town is cheap enough for that to be the
   * right trade. An interior is not: it is thousands of triangles nobody can
   * see from outside, and submitting them from the far side of Vrindavan is
   * pure waste. Its own mesh has its own tight bounds, so the frustum rejects
   * it, and InteriorSystem drops it entirely once you are well away.
   */
  const interiorMeshes = [];
  let extraTris = 0;
  for (const e of extra) {
    const m = e.builder.toMesh(e.name, {
      castShadow: !!ctx.quality.shadows,
      receiveShadow: true,
    });
    extraTris += e.builder.triangleCount;
    group.add(m);
    interiorMeshes.push({ mesh: m, x: e.x, z: e.z, r: e.r });
  }

  console.info(`[landmarks] ${ctx.data.LOCATIONS.length} built, `
    + `${Math.round((b.triangleCount + extraTris) / 1000)}k triangles`
    + (interiorMeshes.length ? ` (${Math.round(extraTris / 1000)}k in ${interiorMeshes.length} culled interior)` : ''));
  // hand the lamps back so TimeOfDay can raise them as the sun goes
  return { group, colliders, anchors, templeLights, interiors, interiorMeshes };
}

/* ================================================================
 * Shared architectural helpers
 * ================================================================ */

/** A cusped (multifoil) arch outline — the defining Braj temple motif. */
function cuspedArch(b, cx, y0, cz, w, h, depth, rot, color, lobes = 5, shade = 0x241a12) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, ly) => [cx + lx * cs, ly, cz + lx * sn];
  const pd = (lx, ly, off) => [cx + lx * cs - off * sn, ly, cz + lx * sn + off * cs];

  const half = w * 0.5;
  const springY = y0 + h * 0.52;
  const SEG = lobes * 4;
  const prev = { in: null, out: null };

  // --- arch infill: the dark aperture, which is what actually reads as an arch.
  //
  // `shade = null` leaves it out. A colonnade bay between a courtyard and its
  // verandah is an opening you walk through, not an aperture, and filling it in
  // turns an arcade into a row of blind panels with a wall behind them.
  if (shade !== null) {
    const inset = depth * 0.45;
    let last = null;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const a = Math.PI * t;
      const ripple = 1 - 0.085 * (1 - Math.cos(a * lobes * 2)) * 0.5;
      const x = -Math.cos(a) * half * ripple;
      const yy = springY + Math.sin(a) * (h - h * 0.52) * ripple;
      const top = pd(x, yy, -inset);
      const foot = pd(x, y0, -inset);
      if (last) b.quad(last.foot, last.top, top, foot, shade);
      last = { top, foot };
    }
  }

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const a = Math.PI * t;
    // a semicircle modulated by a cosine ripple gives the cusped profile
    const ripple = 1 - 0.085 * (1 - Math.cos(a * lobes * 2)) * 0.5;
    const x = -Math.cos(a) * half * ripple;
    const yy = springY + Math.sin(a) * (h - h * 0.52) * ripple;

    const inner = pd(x, yy, -depth * 0.5);
    const outer = pd(x, yy, depth * 0.5);
    if (prev.in) {
      b.quad(prev.in, inner, outer, prev.out, color);
    }
    prev.in = inner; prev.out = outer;
  }

  // jambs down to the ground
  for (const side of [-1, 1]) {
    const x = side * half;
    b.quad(
      pd(x, y0, -depth * 0.5), pd(x, springY, -depth * 0.5),
      pd(x, springY, depth * 0.5), pd(x, y0, depth * 0.5),
      color,
    );
  }
}

/** Lathe profile for a curvilinear (nagara) shikhara. */
function shikhara(b, cx, y0, cz, r, h, color, sides = 12) {
  const RINGS = 12;
  let prevRing = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    // the classic parabolic taper with a slight inward curve near the top
    const rr = r * Math.pow(1 - t, 0.62) * (1 - t * 0.12);
    const y = y0 + h * t;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * TAU;
      // gentle fluting so it is not a smooth cone
      const flute = 1 + Math.sin(a * sides * 0.5) * 0.035;
      ring.push([cx + Math.cos(a) * rr * flute, y, cz + Math.sin(a) * rr * flute]);
    }
    if (prevRing) {
      const shade = new THREE.Color(color).multiplyScalar(0.92 + t * 0.14).getHex();
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prevRing[s], prevRing[n], ring[n], ring[s], shade);
      }
    }
    prevRing = ring;
  }
  // amalaka and kalasha finial
  const topY = y0 + h;
  b.box(cx, topY, cz, r * 0.5, r * 0.18, r * 0.5, 0xd8c9a0);
  b.box(cx, topY + r * 0.18, cz, r * 0.16, r * 0.5, r * 0.16, 0xc9a03c);
}

/** A chhatri: four columns, a slab, a small dome. */
function chhatri(b, cx, y, cz, r, h, color) {
  for (let s = 0; s < 4; s++) {
    const a = (s / 4) * TAU + Math.PI / 4;
    b.box(cx + Math.cos(a) * r * 0.7, y, cz + Math.sin(a) * r * 0.7, 0.26, h, 0.26, color);
  }
  b.box(cx, y + h, cz, r * 2.1, 0.22, r * 2.1, color);
  dome(b, cx, y + h + 0.22, cz, r * 0.95, r * 0.8, color);
}

function dome(b, cx, y, cz, r, h, color, sides = 12) {
  const RINGS = 6;
  let prev = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const a = t * Math.PI * 0.5;
    const rr = Math.cos(a) * r;
    const yy = y + Math.sin(a) * h;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * TAU;
      ring.push([cx + Math.cos(ang) * rr, yy, cz + Math.sin(ang) * rr]);
    }
    if (prev) {
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prev[s], prev[n], ring[n], ring[s], color);
      }
    }
    prev = ring;
  }
  b.box(cx, y + h, cz, 0.16, r * 0.45, 0.16, 0xc9a03c);
}

/** Compound wall with an arched gate on the entrance side. */
function compound(b, loc, ground, color, h = 2.6) {
  const { w, d } = loc.build;
  const W = w * 0.5 + 6, D = d * 0.5 + 6;
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const sides = [
    [[-W, -D], [W, -D]], [[W, -D], [W, D]],
    [[W, D], [-W, D]], [[-W, D], [-W, -D]],
  ];
  sides.forEach((s, i) => {
    const [a0, a1] = s;
    const A = p(a0[0], a0[1]), B = p(a1[0], a1[1]);
    const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    // leave the entrance side open in the middle
    if (i === 2) {
      const gap = 7;
      for (const side of [-1, 1]) {
        const seg = (len - gap) / 2;
        const ox = Math.cos(ang) * side * (gap / 2 + seg / 2);
        const oz = Math.sin(ang) * side * (gap / 2 + seg / 2);
        b.box(mx + ox, ground, mz + oz, seg, h, 0.5, color, ang);
      }
    } else {
      b.box(mx, ground, mz, len, h, 0.5, color, ang);
    }
  });
  return { W, D };
}

/* ================================================================
 * Per-kind builders
 * ================================================================ */

/**
 * Archetypes that open into a real interior you can walk through.
 *
 * Exported because InteriorSystem used to keep an identical literal copy, and
 * two copies of this set means either a temple with an interior you cannot
 * enter or a threshold into a solid block, depending which one you edited.
 */
export const ENTERABLE = new Set([
  'temple-rajasthani', 'temple-redstone', 'temple-marble',
  'temple-modern', 'temple-small', 'temple-gopuram',
]);

/**
 * Wall colliders with a gap where the door is, so a temple is a building you
 * enter rather than a solid block you walk around. The gap sits on the
 * entrance side, which loc.rot already defines.
 */
function hollowColliders(loc) {
  const { w, d } = loc.build;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const W = w * 0.5, D = d * 0.5;
  const t = 0.9;
  const door = Math.min(w * 0.3, 6);
  const out = [];
  const at = (lx, lz, bw, bd) => {
    out.push({
      type: 'box',
      x: loc.pos[0] + lx * cs - lz * sn,
      z: loc.pos[1] + lx * sn + lz * cs,
      w: bw, d: bd, rot,
    });
  };
  at(0, -D, w, t);                 // back
  at(-W, 0, t, d);                 // left
  at(W, 0, t, d);                  // right
  const side = (w - door) / 2;     // front, split around the doorway
  at(-(door / 2 + side / 2), D, side, t);
  at(door / 2 + side / 2, D, side, t);
  return out;
}

/**
 * The inside: a floor, a pillared mandapa, and the garbhagriha at the back with
 * the deities on their altar. Kept deliberately simple in geometry and rich in
 * light, because what carries a sanctum is the darkness and the lamps.
 */
function buildInterior(b, loc, ground) {
  const { w, d, color, accent } = loc.build;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const W = w * 0.5 - 1.2, D = d * 0.5 - 1.2;

  // polished floor
  const f = p(0, 0);
  b.box(f[0], ground + 0.02, f[1], W * 2, 0.08, D * 2, 0xd8cbb0, rot);

  // a chequer of inlay so the floor is not a flat slab
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if ((i + j) % 2) continue;
      const q = p(i * W * 0.36, j * D * 0.36);
      b.box(q[0], ground + 0.1, q[1], W * 0.3, 0.02, D * 0.3, 0xc4b189, rot);
    }
  }

  // mandapa pillars
  const rows = 2, cols = 3;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lx = (i / (cols - 1) - 0.5) * W * 1.3;
      const lz = (j / Math.max(1, rows - 1) - 0.1) * D * 0.9;
      const q = p(lx, lz);
      b.box(q[0], ground + 0.1, q[1], 0.44, 3.4, 0.44, accent, rot);
      b.box(q[0], ground + 3.5, q[1], 0.66, 0.35, 0.66, color, rot);   // capital
      b.box(q[0], ground + 0.1, q[1], 0.6, 0.3, 0.6, color, rot);       // base
    }
  }

  // inner wall faces and a ceiling, so from inside it is a room and not a box
  // seen from behind its own backfaces
  const t = 0.35;
  const back = p(0, -D);
  b.box(back[0], ground + 0.1, back[1], W * 2, 5.2, t, 0xbfae8b, rot);
  const left = p(-W, 0), right = p(W, 0);
  b.box(left[0], ground + 0.1, left[1], t, 5.2, D * 2, 0xc4b191, rot);
  b.box(right[0], ground + 0.1, right[1], t, 5.2, D * 2, 0xc4b191, rot);
  const doorW = Math.min(W * 0.6, 3);
  const frontSeg = (W * 2 - doorW * 2) / 2;
  for (const sgn of [-1, 1]) {
    const q = p(sgn * (doorW + frontSeg / 2), D);
    b.box(q[0], ground + 0.1, q[1], frontSeg, 5.2, t, 0xc4b191, rot);
  }
  const ceil = p(0, 0);
  b.box(ceil[0], ground + 5.0, ceil[1], W * 2, 0.3, D * 2, 0x6a5540, rot);

  // garbhagriha at the back, raised and framed
  const gz = -D * 0.68;
  const g0 = p(0, gz);
  b.box(g0[0], ground + 0.1, g0[1], W * 0.95, 0.55, D * 0.5, 0xc8b38c, rot);
  b.box(g0[0], ground + 0.65, g0[1], W * 0.8, 3.6, D * 0.42, 0x3a2a1e, rot);
  cuspedArch(b, g0[0], ground + 0.65, g0[1] + 0.1, W * 0.62, 3.2, 0.6, rot + Math.PI / 2, 0xc9a03c, 5);

  return { altar: p(0, gz + 0.4), altarY: 1.6 };
}

/**
 * The deities. Rendered as dressed standing figures rather than faces: at this
 * scale a suggested form under cloth and a crown reads as murti, where an
 * attempt at features would only read as a doll.
 */
function buildDeities(b, loc, ground, altar) {
  const rot = loc.rot;
  const [ax, az] = altar;
  const id = loc.id;
  const pair = /radha|banke|govind|gopinath|damodar|madan|jugal|shyam|krishna|bihari|raman|vallabh/i.test(id + ' ' + (loc.deity || ''));
  const shiva = /mahadev|gopishwar|shiv/i.test(id + ' ' + (loc.deity || ''));
  const devi = /katyayani|devi/i.test(id + ' ' + (loc.deity || ''));

  const figure = (ox, cloth, skin, h, crown) => {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const x = ax + ox * cs, z = az + ox * sn;
    b.box(x, ground + 1.2, z, 0.42, h * 0.62, 0.3, cloth);            // robed body
    b.box(x, ground + 1.2 + h * 0.62, z, 0.22, h * 0.2, 0.22, skin);  // head
    b.box(x, ground + 1.2 + h * 0.82, z, 0.3, h * 0.26, 0.3, 0xc9a03c); // crown
    b.box(x, ground + 1.2 + h * 0.5, z + 0.16, 0.34, 0.12, 0.12, 0xe8891f); // garland
    b.box(x, ground + 1.15, z, 0.56, 0.12, 0.42, 0xc9a03c);           // pedestal
  };

  if (shiva) {
    // a lingam on its yoni base, which is what is actually there
    b.box(ax, ground + 1.15, az, 0.8, 0.18, 0.62, 0x6a6a62);
    b.box(ax, ground + 1.33, az, 0.34, 0.62, 0.34, 0x4a4a46);
    b.box(ax, ground + 1.95, az, 0.3, 0.1, 0.3, 0xc9a03c);
  } else if (devi) {
    figure(0, 0xc8452a, 0xd8a878, 1.5, true);
  } else if (pair) {
    figure(-0.42, 0xe8c04c, 0xd8a878, 1.42, true);   // Radha, in gold
    figure(0.42, 0x2f4f8a, 0x4a6a9a, 1.5, true);     // Krishna, dark, with a flute
    const cs = Math.cos(rot), sn = Math.sin(rot);
    b.box(ax + 0.42 * cs, ground + 2.05, az + 0.42 * sn, 0.5, 0.05, 0.05, 0xc9a03c, rot + 0.4);
  } else {
    figure(0, 0xe8891f, 0xd8a878, 1.5, true);
  }

  // lamps either side of the altar
  for (const s of [-1, 1]) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const lx = ax + s * 1.5 * cs, lz = az + s * 1.5 * sn;
    b.box(lx, ground + 1.15, lz, 0.16, 0.5, 0.16, 0xb8873b);
    b.box(lx, ground + 1.65, lz, 0.26, 0.1, 0.26, 0xb8873b);
  }
}

/* ================================================================
 * Sri Sri Krishna Balaram Mandir, Raman Reti
 * ================================================================ */

/**
 * The palette, corrected against the photographs.
 *
 * Travel writing calls this a white marble temple. It is not — that is Srila
 * Prabhupada's samadhi, standing in front of it, which genuinely is carved
 * white Rajasthani marble. The mandir itself is cream and ivory painted
 * plaster picked out in salmon and terracotta, with pale blue-green in the
 * recess of every arch and a pale green jali gallery over the cornice. The only
 * marble in it is underfoot: black and white, and the step treads.
 */
const KB_CREAM = 0xefe2c2;          // the plaster everything is painted
const KB_IVORY = 0xf7efdc;          // the same plaster in sun
const KB_SALMON = 0xdd9b78;         // picked-out mouldings, spandrel scrollwork
const KB_TEAL = 0x6f9b9a;           // the recess behind every cusped arch
const KB_JALI = 0xc3d8a8;           // the first-floor pierced balustrade
const KB_MARBLE_W = 0xe9e5db;       // white marble tread
const KB_MARBLE_B = 0x24232c;       // black marble riser and chequer
const KB_DOME = 0xf2e4bc;           // cream to pale gold
const KB_RIB = 0xe0a882;            // the pink-peach ribbing on the domes
const KB_GOLD = 0xc9a03c;
const KB_SAFFRON = 0xe8891f;
const KB_WHITE_MARBLE = 0xf2efe6;   // the samadhi, which really is marble
const KB_DARKWOOD = 0x4a3220;

/**
 * Krishna Balaram, measured rather than composed.
 *
 * `loc.build.w/d` describe the walled plot; they are not the building. The OSM
 * building outline (way 334202009) gives a block about 32 m long by 24.5 m
 * wide, and the green shade net stretched over the open court reads about 15 m
 * square off ESRI imagery at 0.066 m/px. The two measurements close on each
 * other — 15 m of court plus about 4 m of verandah each side is the 24.5 m
 * width, and 15 + 4 + the altar hall is the 32 m length — which is the only
 * reason to trust either of them.
 */
const KB_LEN = 32;          // entrance face to the back of the altar hall
const KB_WID = 24.5;        // across
const KB_COURT = 7.5;       // half the open court
const KB_CZ = 4.5;          // the court's centre, measured from the block's
const KB_BAY = 3.0;         // pillar centre to pillar centre
const KB_HALL_Y = 0.78;     // the altar hall floor, five shallow risers up
const KB_TILE = 0.55;       // one chequer square

// scratch for placing an archetype's geometry into the merged interior
const _kbM = new THREE.Matrix4();
const _kbV = new THREE.Vector3();
const _kbQ = new THREE.Quaternion();
const _kbE = new THREE.Euler();
const _kbS = new THREE.Vector3(1, 1, 1);

/** A shade of a colour, for baking light in where no lamp is going to reach. */
function tint(color, k) {
  return new THREE.Color(color).multiplyScalar(k).getHex();
}

/**
 * A bulbous ribbed dome on a square base. Not `shikhara`, and the difference
 * matters.
 *
 * Krishna Balaram's three towers get written up as shikharas, which suggests
 * the tall curvilinear nagara spire `shikhara` draws. The photographs say
 * otherwise: they are onion domes with vertical ribs, a fluted amalaka and a
 * kalash, on square drums, the centre one carried on an open pillared chhatri.
 * The ribbing is the alternating quad colour rather than a radius wobble,
 * because at sixteen sides a wobble is invisible and a colour change reads from
 * the far side of the courtyard, which is where you see these from.
 */
function ribbedDome(b, cx, y0, cz, r, h, color, rib, sides = 16) {
  const RINGS = 8;
  let prev = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const a = t * Math.PI * 0.5;
    // the onion profile: the radius swells past r above the springing, then closes
    const rr = r * Math.pow(Math.cos(a), 0.58) * (1 + 0.18 * Math.sin(a * 2));
    const yy = y0 + Math.sin(a) * h;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * TAU;
      ring.push([cx + Math.cos(ang) * rr, yy, cz + Math.sin(ang) * rr]);
    }
    if (prev) {
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prev[s], prev[n], ring[n], ring[s], s % 2 ? rib : color);
      }
    }
    prev = ring;
  }
  // fluted amalaka, then the stacked kalash and its flag
  const top = y0 + h;
  b.box(cx, top - 0.06, cz, r * 0.66, r * 0.17, r * 0.66, tint(color, 0.95));
  b.box(cx, top + r * 0.11, cz, r * 0.30, r * 0.34, r * 0.30, KB_DOME);
  b.bevelBox(cx, top + r * 0.45, cz, r * 0.26, r * 0.30, r * 0.26, KB_GOLD);
  b.box(cx, top + r * 0.75, cz, r * 0.07, r * 0.46, r * 0.07, KB_GOLD);
  b.panel(cx + r * 0.24, top + r * 1.02, cz, r * 0.44, r * 0.26, KB_SAFFRON, 0, 0);
}

/**
 * The whole of Krishna Balaram: the courtyard you walk into, the hall and the
 * three altars at the end of it, the domes over them, and the samadhi standing
 * in front on the road side.
 *
 * What was here before was a solid 54 x 66 x 9.5 m block with the generic
 * `buildInterior` hall inside it — a 51.6 x 63.6 m room, six pillars, a 5 m
 * ceiling — which is an aircraft hangar with a shrine at one end. The actual
 * building is a chatuhshala: four ranges round an open court. You come in off
 * Bhaktivedanta Swami Marg past the samadhi, under the cusped doorway, and you
 * are standing on black and white marble laid on the diagonal with a covered
 * verandah on all four sides, murals on the walls behind the arcade, the tamal
 * tree to one side, and three altars up a broad flight of shallow steps.
 *
 * The interior goes into its own MeshBuilder so it can be culled; everything
 * else in this file shares one mesh whose bounding sphere spans the world.
 */
function buildKrishnaBalaram({ loc, b, ground, rng }) {
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);

  /**
   * Local frame: +lx across the front, +lz INTO the temple from the entrance.
   *
   * This is `compound`/`hollowColliders`/`buildInterior`'s convention rather
   * than the per-kind builders' — the two point opposite ways and this file has
   * been carrying both. This one wins here for a reason that is not taste: the
   * nearest road to Krishna Balaram is 48 m off its -X face, so the entrance
   * has to be on the -X face, which is local +Z. `b.box(..., rot)` is aligned to
   * this frame, which is what keeps the trim honest.
   */
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

  /**
   * panel() and box() use transposed rotation matrices — panel(rot) lies on
   * box(rot)'s -Z face — so the wall bearings are named once, here, rather than
   * rediscovered every time a mural goes up.
   */
  const PN_X = Math.PI / 2 - rot;             // a panel whose face looks toward +lx
  const PN_NX = Math.PI * 1.5 - rot;          // ... toward -lx
  const PN_NZ = Math.PI - rot;                // ... back toward the entrance

  // which way somebody in the court is looking when they look at the altars
  const faceAltar = Math.atan2(sn, -cs);

  const ib = new MeshBuilder();               // the interior, kept out of the shared mesh
  const colliders = [];
  const HW = KB_WID * 0.5, HL = KB_LEN * 0.5;
  const g0 = ground;

  /**
   * The marble sits 60 mm proud of `ground`, and that number is measured.
   *
   * `ground` is one sample, at the centre; the real terrain under this block
   * runs from -23 mm to +58 mm of it across the court and to +76 mm at the
   * outer corners of the verandah. A slab laid exactly at `ground` therefore
   * has grass growing through the middle of the courtyard, which is what the
   * first pass looked like. 60 mm clears every blade inside the court while
   * putting the player's feet at most 80 mm under the floor in its lowest
   * corner — WorldService pins them to the terrain and nothing here can change
   * that, so the choice is a few centimetres of shoe or a lawn in the mandir.
   */
  const FL = g0 + 0.06;
  const WT = 0.7;                             // wall thickness
  const DOOR = 5.0;                           // the studded doorway
  const WALL_H = 8.8;
  const SOFFIT = g0 + 5.80, TERRACE = g0 + 6.35;
  const HALL_Z = KB_CZ - KB_COURT;            // the altar hall's front line
  const HALL_FLOOR = FL + KB_HALL_Y;
  const HALL_TOP = g0 + 8.2;

  /**
   * Wall colliders are authored in short segments on purpose. WorldService
   * indexes every collider at its CENTRE POINT ONLY and SpatialGrid's cell is
   * 24 m, so a 54 m wall registered at one point is not found from more than a
   * cell away along its own length — measured, the old ISKCON walls went
   * unsolid 16.5 m out from their middles, which is how anyone was getting in
   * at all. Nothing below is longer than 16 m.
   */
  const wall = (lx, lz, w, d) => {
    const q = p(lx, lz);
    colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot });
  };

  /* ---------------- the block: outer walls and the doorway ---------------- */

  for (const sx of [-1, 1]) {
    const q = p(sx * (HW - WT * 0.5), 0);
    b.box(q[0], g0, q[1], WT, WALL_H, KB_LEN, KB_CREAM, rot);
    wall(sx * (HW - WT * 0.5), -HL * 0.5, WT, HL);
    wall(sx * (HW - WT * 0.5), HL * 0.5, WT, HL);
  }
  {
    const q = p(0, -(HL - WT * 0.5));
    b.box(q[0], g0, q[1], KB_WID, WALL_H, WT, KB_CREAM, rot);
    wall(-KB_WID * 0.25, -(HL - WT * 0.5), KB_WID * 0.5, WT);
    wall(KB_WID * 0.25, -(HL - WT * 0.5), KB_WID * 0.5, WT);
  }
  {
    const seg = (KB_WID - DOOR) * 0.5;
    for (const sx of [-1, 1]) {
      const lx = sx * (DOOR * 0.5 + seg * 0.5);
      const q = p(lx, HL - WT * 0.5);
      b.box(q[0], g0, q[1], seg, WALL_H, WT, KB_CREAM, rot);
      wall(lx, HL - WT * 0.5, seg, WT);
    }
    // the doorway: very large studded wooden leaves, standing open, under a
    // cusped surround. The header above it is what keeps the opening an opening
    // rather than a 5 x 9.8 m hole in the front of the building.
    const d0 = p(0, HL - WT * 0.5);
    b.box(d0[0], g0 + 5.55, d0[1], DOOR, WALL_H - 5.55, WT, KB_CREAM, rot);
    b.box(d0[0], g0 + WALL_H, d0[1], KB_WID + 0.4, 0.45, WT + 0.4, KB_SALMON, rot);
    cuspedArch(b, d0[0], g0 + 2.6, d0[1], DOOR + 0.9, 3.0, WT + 0.3, rot, KB_SALMON, 5, null);
    for (const sx of [-1, 1]) {
      const l = p(sx * (DOOR * 0.5 - 0.35), HL - WT - 0.2);
      b.box(l[0], g0, l[1], 0.7, 3.9, 0.16, KB_DARKWOOD, rot);
    }
    // the porch: a small domed pavilion over the doors, as the campus map draws it
    const c0 = p(0, HL + 0.1);
    b.box(c0[0], g0 + 6.6, c0[1], DOOR + 3.2, 0.55, 1.2, KB_SALMON, rot);
    chhatri(b, c0[0], g0 + 7.15, c0[1], 1.6, 1.9, KB_DOME);
  }

  /* ---------------- roofs, and the roofline ---------------- */

  /**
   * The verandah roof is a ring of slabs so the court itself stays open sky —
   * which is the whole point of a courtyard temple, and the reason you can see
   * the domes from inside it. `topColor` keeps the terrace bright while the
   * soffit under it stays the deep shade the arcade actually sits in; a light
   * ceiling here reads as a lit room, and on the `low` tier there is no lamp in
   * this building at all, so shade has to be painted in rather than lit in.
   */
  const SOFF = tint(KB_CREAM, 0.68);
  for (const sx of [-1, 1]) {
    const q = p(sx * (KB_COURT + (HW - KB_COURT) * 0.5), 0);
    b.box(q[0], SOFFIT, q[1], HW - KB_COURT, TERRACE - SOFFIT, KB_LEN, SOFF, rot,
      0b111111, KB_IVORY);
  }
  {
    const d = HL - KB_COURT - KB_CZ;
    const q = p(0, KB_COURT + KB_CZ + d * 0.5);
    b.box(q[0], SOFFIT, q[1], KB_COURT * 2, TERRACE - SOFFIT, d, SOFF, rot, 0b111111, KB_IVORY);
  }
  {
    // the altar hall stands taller than the rest and carries the domes
    const q = p(0, (HALL_Z - HL) * 0.5);
    b.box(q[0], g0 + 6.55, q[1], KB_WID, 2.05, HL + HALL_Z, KB_CREAM, rot);
    b.box(q[0], HALL_TOP, q[1], KB_WID + 0.5, 0.7, HL + HALL_Z + 0.5, KB_SALMON, rot);
    // the first floor over the hall front, with its own small arched openings —
    // without them the wall between the cornice and the domes is four blank
    // metres of cream and the whole side of the court dies
    for (let i = -3; i <= 3; i++) {
      const o = p(i * 3.1, HALL_Z + 0.05);
      b.box(o[0], g0 + 6.9, o[1], 1.5, 1.4, 0.16, KB_TEAL, rot);
      cuspedArch(b, o[0], g0 + 6.7, o[1], 1.9, 1.9, 0.3, rot, KB_SALMON, 5, null);
    }
  }

  /**
   * Three domes, the centre one tallest, standing OVER the altars rather than
   * back over the hall. Where they sit is not decoration: the hall's parapet is
   * 8.9 m and 7.5 m from the middle of the court, which subtends 50 degrees, so
   * a dome set six metres further back disappears behind it and you are left
   * with a courtyard temple whose towers you cannot see from the courtyard.
   * Over the sanctums they clear it, which is also where they belong.
   *
   * The rest: Verified off two independent Commons
   * photographs taken through the samadhi's arch: the centre is an open chhatri
   * on short dark columns under a large ribbed dome with a stacked finial, the
   * flanking two are lower solid domes on square drums with ochre devotional
   * markings painted down them. No published height exists for any of them, so
   * what follows is proportion read off photographs, not figures.
   */
  const DOME_Y = HALL_TOP + 0.7;
  const DOME_Z = HALL_Z - 4.2;
  for (const sx of [-1, 1]) {
    const q = p(sx * 7.2, DOME_Z);
    b.box(q[0], DOME_Y, q[1], 4.8, 2.9, 4.8, KB_IVORY, rot);
    ribbedDome(b, q[0], DOME_Y + 2.9, q[1], 2.5, 3.5, KB_DOME, KB_RIB, 14);
    for (const a of [0.42, -0.42]) {
      b.panel(q[0] + Math.sin(rot + a) * 2.45, DOME_Y + 4.2, q[1] + Math.cos(rot + a) * 2.45,
        0.5, 1.5, KB_SAFFRON, rot + a, 0.22);
    }
  }
  {
    const q = p(0, DOME_Z);
    b.box(q[0], DOME_Y, q[1], 6.8, 2.0, 6.8, KB_IVORY, rot);
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * TAU + Math.PI / 8;
      b.box(q[0] + Math.cos(a) * 2.7, DOME_Y + 2.0, q[1] + Math.sin(a) * 2.7,
        0.36, 2.8, 0.36, KB_DARKWOOD);
    }
    b.box(q[0], DOME_Y + 4.8, q[1], 7.0, 0.55, 7.0, KB_IVORY, rot);
    ribbedDome(b, q[0], DOME_Y + 5.35, q[1], 3.4, 5.1, KB_DOME, KB_RIB, 16);
  }

  /* ---------------- the courtyard floor ---------------- */

  /**
   * Black and white marble on the diagonal, which is the first thing anybody
   * describes about this place, resolving into concentric bands at the centre.
   * It is drawn as one white slab with the black diamonds laid over it, because
   * a diamond is two triangles where a tile would be twelve, and the black half
   * of a 15 m court at a 0.55 m module is about 370 of them.
   *
   * The court is really SUNKEN below the verandah — ISKCON's own writing calls
   * it "a sunken black and white checkered marble courtyard" and you ascend
   * steps to the deities. It is flush here, deliberately: WorldService puts the
   * player's feet at terrain height and nothing in this engine climbs, so every
   * centimetre of level change indoors is a centimetre the player stands buried
   * in. The one place that earns it is the altar flight, which is railed off.
   */
  {
    const f = p(0, 0);
    b.box(f[0], FL - 0.5, f[1], KB_WID - WT * 1.4, 0.5, KB_LEN - WT * 1.4,
      KB_MARBLE_W, rot, 0b111111, KB_MARBLE_W);

    const e = Math.SQRT1_2 * KB_TILE;
    const N = Math.ceil(KB_COURT * 2 / KB_TILE) + 2;
    const y = FL + 0.012;
    for (let i = -N; i <= N; i++) {
      for (let j = -N; j <= N; j++) {
        if ((i + j) & 1) continue;
        // the tile lattice is i*E1 + j*E2 with E1 = (e, e) and E2 = (-e, e),
        // so a black tile (i + j even) lands every 2e in both axes and the
        // white ones fall into the gaps between their corners
        const clx = (i - j) * e;
        const clz = (i + j) * e;
        if (Math.abs(clx) > KB_COURT - 0.4 || Math.abs(clz) > KB_COURT - 0.4) continue;
        if (Math.hypot(clx, clz) < 3.05) continue;     // the bands take over here
        const A = p(clx - e, KB_CZ + clz);
        const C = p(clx + e, KB_CZ + clz);
        const D = p(clx, KB_CZ + clz - e);
        const E = p(clx, KB_CZ + clz + e);
        ib.quad([A[0], y, A[1]], [E[0], y, E[1]], [C[0], y, C[1]], [D[0], y, D[1]], KB_MARBLE_B);
      }
    }

    const ctr = p(0, KB_CZ);
    const SEG = 28;
    const bands = [0.55, 1.15, 1.70, 2.20, 2.65, 3.05];
    for (let k = 0; k < bands.length - 1; k++) {
      const r0 = bands[k], r1 = bands[k + 1];
      const col = k % 2 ? KB_MARBLE_W : KB_MARBLE_B;
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * TAU, a1 = ((s + 1) / SEG) * TAU;
        ib.quad(
          [ctr[0] + Math.cos(a0) * r0, y, ctr[1] + Math.sin(a0) * r0],
          [ctr[0] + Math.cos(a1) * r0, y, ctr[1] + Math.sin(a1) * r0],
          [ctr[0] + Math.cos(a1) * r1, y, ctr[1] + Math.sin(a1) * r1],
          [ctr[0] + Math.cos(a0) * r1, y, ctr[1] + Math.sin(a0) * r1],
          col,
        );
      }
    }
    for (let s = 0; s < SEG; s++) {
      const a0 = (s / SEG) * TAU, a1 = ((s + 1) / SEG) * TAU;
      ib.tri(ctr[0], y, ctr[1],
        ctr[0] + Math.cos(a1) * 0.55, y, ctr[1] + Math.sin(a1) * 0.55,
        ctr[0] + Math.cos(a0) * 0.55, y, ctr[1] + Math.sin(a0) * 0.55,
        KB_MARBLE_B);
    }
  }

  /* ---------------- the colonnade ---------------- */

  /**
   * Cream pillars on square plinths carrying serpentine cusped arches, five
   * bays a side at about 3 m centres — photo-scaled off a standing adult, which
   * is the only measure anyone has. Each bay is drawn twice: the cream band in
   * front and, set back behind it, a slightly smaller arch in the pale
   * blue-green the recesses are painted. That second arch is what makes the
   * arcade read as dark blue-green in shade, which is how it looks in every
   * photograph of the place.
   *
   * Neither carries an infill. A colonnade bay is an opening you walk through,
   * and `cuspedArch`'s dark aperture would turn the verandah into a painted
   * wall with nothing behind it.
   */
  const pillar = (lx, lz) => {
    const q = p(lx, lz);
    ib.box(q[0], FL - 0.04, q[1], 0.86, 0.26, 0.86, KB_IVORY, rot);
    ib.box(q[0], g0 + 0.22, q[1], 0.68, 0.95, 0.68, KB_CREAM, rot);       // square plinth
    ib.box(q[0], g0 + 1.17, q[1], 0.52, 0.20, 0.52, KB_IVORY, rot);
    ib.box(q[0], g0 + 1.37, q[1], 0.40, 1.92, 0.40, KB_IVORY, rot);       // shaft
    ib.bevelBox(q[0], g0 + 3.29, q[1], 0.62, 0.42, 0.62, KB_CREAM, rot, 0.34);   // capital
    ib.box(q[0], g0 + 3.71, q[1], 0.78, 0.22, 0.78, KB_IVORY, rot);       // abacus
  };

  /** One bay: the recess set back by (bx, bz) in the local frame, band in front. */
  const arch = (clx, clz, bx, bz, width, ar) => {
    const back = p(clx + bx, clz + bz);
    cuspedArch(ib, back[0], g0 + 3.28, back[1], width * 0.88, 2.00, 0.28, ar, KB_TEAL, 5, null);
    const q = p(clx, clz);
    cuspedArch(ib, q[0], g0 + 3.35, q[1], width, 2.15, 0.52, ar, KB_CREAM, 5, null);
  };

  const BAYS = Math.round(KB_COURT * 2 / KB_BAY);
  const AW = KB_BAY - 0.1;
  for (let i = 0; i <= BAYS; i++) {
    const t = -KB_COURT + (i / BAYS) * KB_COURT * 2;
    pillar(t, KB_CZ - KB_COURT);
    pillar(t, KB_CZ + KB_COURT);
    if (i > 0 && i < BAYS) {
      pillar(-KB_COURT, KB_CZ + t);
      pillar(KB_COURT, KB_CZ + t);
    }
    if (i < BAYS) {
      const m = t + KB_BAY * 0.5;
      arch(m, KB_CZ - KB_COURT, 0, -0.55, AW, rot);
      arch(m, KB_CZ + KB_COURT, 0, 0.55, AW, rot);
      arch(-KB_COURT, KB_CZ + m, -0.55, 0, AW, rot + Math.PI / 2);
      arch(KB_COURT, KB_CZ + m, 0.55, 0, AW, rot + Math.PI / 2);
    }
  }

  /**
   * Entablature: the spandrel band with its salmon scrollwork, the cornice, and
   * above it the pale green pierced jali balustrade of the first-floor gallery.
   * The jali is drawn as posts rather than pierced trefoils — at 6.6 m over a
   * 15 m court the openings are two pixels and the rhythm is all you see.
   */
  const entab = (clx, clz, len, alongZ) => {
    const q = p(clx, clz);
    const w = alongZ ? 0.60 : len, d = alongZ ? len : 0.60;
    ib.box(q[0], g0 + 5.50, q[1], w, 0.62, d, KB_CREAM, rot);
    ib.box(q[0], g0 + 6.12, q[1], w + 0.34, 0.30, d + 0.34, KB_SALMON, rot);
    ib.box(q[0], g0 + 6.42, q[1], w + 0.12, 0.16, d + 0.12, KB_IVORY, rot);
    const n = Math.round(len / 0.62);
    for (let i = 0; i < n; i++) {
      const o = -len * 0.5 + (i + 0.5) * (len / n);
      const r = alongZ ? p(clx, clz + o) : p(clx + o, clz);
      ib.box(r[0], g0 + 6.58, r[1], alongZ ? 0.30 : 0.26, 0.62, alongZ ? 0.26 : 0.30,
        KB_JALI, rot);
    }
    ib.box(q[0], g0 + 7.20, q[1], w + 0.18, 0.16, d + 0.18, KB_JALI, rot);
  };
  entab(0, KB_CZ + KB_COURT, KB_COURT * 2 + 0.6, false);
  entab(0, KB_CZ - KB_COURT, KB_COURT * 2 + 0.6, false);
  entab(-KB_COURT, KB_CZ, KB_COURT * 2, true);
  entab(KB_COURT, KB_CZ, KB_COURT * 2, true);

  /* ---------------- the verandah walls and their murals ---------------- */

  /**
   * "The temple courtyard is surrounded by verandahs which have beautiful wall
   * paintings depicting the life of Sri Radha-Krishna and Sri Gaur-Nitai" —
   * mostly framed canvases set into cusped-head recesses, with some painted
   * plaster relief. Nobody has published who painted them, when, or which
   * pastime is in which bay, so these are arched panels with a blue-skinned
   * figure against green and gold and nothing that claims to be a named scene.
   *
   * They are panels, not boxes: two triangles each, flat on the wall, which is
   * also the only way to stop a painting standing proud of its own wall.
   */
  const mural = (clx, clz, face, w, seed) => {
    const q = p(clx, clz);
    const y = g0 + 2.55;
    ib.panel(q[0], y, q[1], w + 0.34, 3.5, KB_SALMON, face, 0.02);
    cuspedArch(ib, q[0] + Math.sin(face) * 0.04, y + 1.2, q[1] + Math.cos(face) * 0.04,
      w + 0.5, 1.5, 0.08, Math.PI / 2 - face, KB_SALMON, 5, null);
    ib.panel(q[0], y, q[1], w, 3.2, 0x2c4a30, face, 0.05);
    ib.panel(q[0], y + 1.34, q[1], w * 0.9, 0.62, tint(KB_GOLD, 0.85), face, 0.07);
    const fx = (seed % 2 ? -1 : 1) * w * 0.17;
    const ox = Math.cos(face) * fx, oz = -Math.sin(face) * fx;
    ib.panel(q[0] + ox, y - 0.42, q[1] + oz, w * 0.27, 1.5, 0x2f4f8a, face, 0.09);
    ib.panel(q[0] + ox, y + 0.50, q[1] + oz, w * 0.17, 0.34, 0x4a6a9a, face, 0.11);
    ib.panel(q[0] + ox, y + 0.74, q[1] + oz, w * 0.21, 0.26, KB_GOLD, face, 0.11);
  };

  const WALL_X = HW - WT - 0.05;
  for (let i = 0; i < 4; i++) {
    const lz = KB_CZ - KB_COURT + 1.9 + i * 3.7;
    mural(-WALL_X, lz, PN_X, 2.6, i);
    mural(WALL_X, lz, PN_NX, 2.6, i + 1);
  }
  for (const sx of [-1, 1]) mural(sx * 4.6, HL - WT - 0.05, PN_NZ, 2.6, sx > 0 ? 2 : 3);

  /* ---------------- the altar-side steps ---------------- */

  /**
   * A broad flight of shallow marble steps across the whole altar side: white
   * treads, black risers and nosings, so the flight reads as strong horizontal
   * stripes, with the ends stepping back. Photographs suggest four or five
   * risers of about 150 mm; five is the reading taken here and nothing
   * documents it either way.
   *
   * The hall at the top is walled off at the foot of the flight, because
   * nothing in this engine climbs and a hall 0.78 m up is a hall you wade
   * through. Standing in the court to take darshan is what everybody in the
   * photographs is doing in any case.
   */
  const RISERS = 5, RISE = KB_HALL_Y / RISERS, TREAD = 0.64;
  for (let i = 0; i < RISERS; i++) {
    const front = HALL_Z + (RISERS - i) * TREAD;
    const hw = KB_COURT - i * 0.45;
    const q = p(0, front - TREAD * 0.5);
    ib.box(q[0], FL + i * RISE, q[1], hw * 2, RISE, TREAD, KB_MARBLE_B, rot,
      0b111111, KB_MARBLE_W);
    const n = p(0, front - 0.04);
    ib.box(n[0], FL + i * RISE, n[1], hw * 2, RISE + 0.02, 0.10, KB_MARBLE_B, rot);
  }

  /* ---------------- the altar hall ---------------- */

  {
    const q = p(0, (HALL_Z - HL) * 0.5);
    ib.box(q[0], HALL_FLOOR - 0.12, q[1], KB_WID - WT * 2, 0.12, HL + HALL_Z,
      KB_MARBLE_W, rot, 0b111111, KB_MARBLE_W);
    ib.box(q[0], g0 + 6.40, q[1], KB_WID - WT * 2, 0.16, HL + HALL_Z,
      tint(KB_CREAM, 0.84), rot);
    // the hall's own side and back walls, pale, because a Lambert surface under
    // a ceiling gets hemisphere light and nothing else, and 0x2a1f18 under a
    // ceiling is simply black
    const bk = p(0, -(HL - WT - 0.3));
    ib.box(bk[0], HALL_FLOOR, bk[1], KB_WID - WT * 2, 6.3, 0.3, tint(KB_CREAM, 0.9), rot);
    for (const sx of [-1, 1]) {
      const sw = p(sx * (HW - WT - 0.15), (HALL_Z - HL) * 0.5);
      ib.box(sw[0], HALL_FLOOR, sw[1], 0.3, 6.3, HL + HALL_Z, tint(KB_CREAM, 0.88), rot);
    }
  }

  /**
   * The three altars, side by side, each its own chamber behind its own arched
   * opening. Facing them, left to right:
   *
   *   LEFT    Sri Sri Gaura-Nitai — Chaitanya Mahaprabhu and Nityananda, with
   *           murtis of Srila Prabhupada and Srila Bhaktisiddhanta Sarasvati.
   *   CENTRE  Sri Sri Krishna-Balaram, the presiding deities.
   *   RIGHT   Sri Sri Radha-Shyamasundara with Lalita and Vishakha, standing in
   *           the order Lalita, Krishna, Radharani, Vishakha.
   *
   * Four independent sources give exactly this arrangement and this order:
   * Wikipedia (citing radha.name), vrajvrindavan.com, ISKCON Vrindavan's own
   * darshan listing, and theharekrishnamovement.org. Every one of them writes
   * "left altar" and "right altar" without saying from where; this reads it as
   * the devotee's left and right facing the deities, which is standard usage
   * and is the order ISKCON itself lists them in. All three sets were installed
   * together by Srila Prabhupada on Rama Navami, 20 April 1975.
   *
   * What is NOT in any source is which brother stands on which side of the
   * centre altar, so nothing here should be read as saying. The murtis are
   * dressed forms under cloth and a crown rather than attempts at faces, for
   * the same reason `buildDeities` gives: at this scale a suggested figure
   * reads as a murti and a modelled one reads as a doll.
   */
  const ALTAR_Z = HALL_Z - 3.2;

  const murti = (lx, lz, cloth, skin, h) => {
    const q = p(lx, lz);
    const base = HALL_FLOOR + 0.92;
    ib.box(q[0], base, q[1], 0.58, 0.14, 0.46, KB_GOLD, rot);
    ib.prism(q[0], base + 0.14, q[1], 0.40, 0.30, 0.34, 0.26, h * 0.60, cloth, rot);
    ib.box(q[0], base + 0.14 + h * 0.60, q[1], 0.24, h * 0.20, 0.24, skin, rot);
    ib.bevelBox(q[0], base + 0.14 + h * 0.80, q[1], 0.32, h * 0.28, 0.32, KB_GOLD, rot, 0.3);
    const g = p(lx, lz + 0.20);
    ib.box(g[0], base + 0.14 + h * 0.46, g[1], 0.40, 0.12, 0.10, KB_SAFFRON, rot);
    return q;
  };

  const seatedMurti = (lx, lz, cloth, skin) => {
    const q = p(lx, lz);
    const base = HALL_FLOOR + 0.92;
    ib.box(q[0], base, q[1], 0.50, 0.12, 0.44, KB_GOLD, rot);
    ib.prism(q[0], base + 0.12, q[1], 0.52, 0.42, 0.32, 0.26, 0.52, cloth, rot);
    ib.box(q[0], base + 0.64, q[1], 0.20, 0.22, 0.20, skin, rot);
  };

  /**
   * One altar: a marble plinth, a painted backdrop, and the arched opening it
   * is seen through.
   *
   * The arch needs a wall round it. On its own, `cuspedArch` with no infill is
   * a thin band in mid-air, and in a hall with no lamp on it that reads as a
   * pale wisp rather than as a doorway — which is exactly what the first pass
   * looked like. The tympanum over it and a jamb each side turn it back into an
   * opening with a lit chamber behind.
   */
  const altarBay = (lx) => {
    const plinth = p(lx, ALTAR_Z);
    ib.box(plinth[0], HALL_FLOOR, plinth[1], 6.4, 0.92, 2.0, KB_MARBLE_W, rot,
      0b111111, KB_MARBLE_W);
    const back = p(lx, ALTAR_Z - 1.5);
    ib.box(back[0], HALL_FLOOR, back[1], 6.4, 4.8, 0.5, 0x7a5a30, rot);
    ib.panel(back[0], HALL_FLOOR + 2.3, back[1], 5.0, 3.0, 0xb08c44, PN_NZ, 0.28);
    const screen = p(lx, ALTAR_Z + 1.5);
    cuspedArch(ib, screen[0], HALL_FLOOR + 0.6, screen[1], 5.2, 3.9, 0.7, rot, KB_GOLD, 7, null);
    ib.box(screen[0], HALL_FLOOR + 4.5, screen[1], 7.4, 1.8, 0.5, KB_CREAM, rot);
    for (const sx of [-1, 1]) {
      const j = p(lx + sx * 3.2, ALTAR_Z + 1.5);
      ib.box(j[0], HALL_FLOOR, j[1], 1.0, 4.5, 0.5, KB_CREAM, rot);
      const l = p(lx + sx * 2.35, ALTAR_Z + 1.2);
      ib.box(l[0], HALL_FLOOR, l[1], 0.20, 0.78, 0.20, 0xb8873b, rot);
      ib.box(l[0], HALL_FLOOR + 0.78, l[1], 0.30, 0.12, 0.30, 0xb8873b, rot);
    }
  };

  // LEFT — Gaura-Nitai, with Srila Prabhupada and Srila Bhaktisiddhanta
  altarBay(-7.2);
  murti(-7.8, ALTAR_Z, KB_SAFFRON, 0xe6c68a, 1.62);
  murti(-6.6, ALTAR_Z, 0xf2ece0, 0xe6c68a, 1.62);
  seatedMurti(-9.2, ALTAR_Z + 0.1, KB_SAFFRON, 0xd8a878);
  seatedMurti(-5.2, ALTAR_Z + 0.1, KB_SAFFRON, 0xd8a878);

  // CENTRE — Krishna and Balaram, the divine brothers the temple is named for
  altarBay(0);
  const kb = murti(0.62, ALTAR_Z, KB_SAFFRON, 0x2f4f8a, 1.58);
  murti(-0.62, ALTAR_Z, 0x2f5d5a, 0xf0e4c6, 1.62);
  ib.box(kb[0], HALL_FLOOR + 2.02, kb[1], 0.50, 0.05, 0.05, KB_GOLD, rot + 0.4);

  // RIGHT — Radha-Shyamasundara, with Lalita and Vishakha
  altarBay(7.2);
  murti(5.7, ALTAR_Z, 0xc8452a, 0xd8a878, 1.42);        // Lalita
  murti(6.75, ALTAR_Z, KB_SAFFRON, 0x2f4f8a, 1.56);     // Shyamasundara
  murti(7.75, ALTAR_Z, 0xe8c04c, 0xd8a878, 1.48);       // Radharani
  murti(8.8, ALTAR_Z, 0x7a4a86, 0xd8a878, 1.42);        // Vishakha

  /* ---------------- the tamal tree ---------------- */

  /**
   * The tamal was here before the temple was, and is most of why this land was
   * taken: tamals were nearly absent from Vrindavan in the early seventies and
   * Srila Prabhupada was very pleased to find one, said kirtan would be held
   * under it, and instructed that it be worshipped. He sat under it, especially
   * in 1977.
   *
   * The photographs show a low circular marble kerb about seat height with bare
   * earth inside, and a separate small square plaque block beside it — not the
   * single square platform a first description suggested. The circular kerb is
   * what is built, because that is what two photographs show.
   */
  {
    const TX = -5.3, TZ = KB_CZ - 3.0;
    const t0 = p(TX, TZ);
    const R = 1.85;
    for (let s = 0; s < 18; s++) {
      const a0 = (s / 18) * TAU, a1 = ((s + 1) / 18) * TAU;
      const ox = t0[0] + Math.cos(a0) * R, oz = t0[1] + Math.sin(a0) * R;
      const qx = t0[0] + Math.cos(a1) * R, qz = t0[1] + Math.sin(a1) * R;
      ib.quad([ox, FL, oz], [ox, FL + 0.45, oz], [qx, FL + 0.45, qz], [qx, FL, qz], KB_MARBLE_W);
      ib.tri(t0[0], FL + 0.45, t0[1], qx, FL + 0.45, qz, ox, FL + 0.45, oz, KB_MARBLE_W);
    }
    ib.box(t0[0], FL + 0.44, t0[1], R * 1.2, 0.05, R * 1.2, 0x6a5138, rot);   // bare earth
    ib.prism(t0[0], FL + 0.45, t0[1], 0.62, 0.62, 0.30, 0.30, 6.4, 0x6a5138);
    // the canopy rides clear of the verandah roof, so it reads as a tree in a
    // courtyard rather than an awning over it
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.6;
      const rr = 0.8 + rng() * 0.7;
      ib.bevelBox(t0[0] + Math.cos(a) * rr, FL + 6.3 + rng() * 0.8, t0[1] + Math.sin(a) * rr,
        2.6, 1.7, 2.6, i % 2 ? 0x3a6330 : 0x437239, a, 0.42);
    }
    ib.bevelBox(t0[0], FL + 7.5, t0[1], 3.2, 1.8, 3.2, 0x3d6a33, 0.3, 0.42);
    const pl = p(TX + 2.5, TZ - 0.5);
    ib.box(pl[0], FL, pl[1], 1.0, 1.15, 0.8, KB_MARBLE_W, rot);
    ib.panel(pl[0], FL + 0.74, pl[1], 0.8, 0.5, 0x2f5d5a, PN_NZ, 0.42);
    colliders.push({ type: 'circle', x: t0[0], z: t0[1], r: R + 0.3 });
  }

  /* ---------------- the people who are in it ---------------- */

  /**
   * A handful of devotees, sitting. Not a crowd: the photographs show six or
   * seven on the steps and one or two standing in the shade, and that is what
   * the place is like outside arti.
   *
   * They are the crowd's own archetypes from npc/Archetypes.js, which is the
   * point — authoring figures here would put a row of undressed grey people in
   * a temple whose street outside is full of dhotis, saris and tilak. They are
   * baked into the interior mesh rather than instanced because they never move
   * and there are eight of them; RitualSystem's per-figure Groups are the one
   * unmerged thing in the world pipeline and not a pattern to copy.
   */
  {
    const spots = [[-5.4, 2], [-3.6, 1], [1.2, 0], [2.7, 2], [5.2, 1], [-1.5, 3]];
    for (const [lx, step] of spots) {
      const t = PEOPLE[Math.floor(rng() * PEOPLE.length) % PEOPLE.length];
      const lz = HALL_Z + (RISERS - step) * TREAD + TREAD * 0.5;
      const q = p(lx, lz);
      const geo = buildSeated(t, 'lap', null);
      _kbM.compose(
        _kbV.set(q[0], FL + step * RISE, q[1]),
        _kbQ.setFromEuler(_kbE.set(0, faceAltar + Math.PI + (rng() - 0.5) * 0.5, 0)),
        _kbS,
      );
      ib.addGeometry(geo, _kbM);
      geo.dispose();
    }
    for (const sx of [-1, 1]) {
      const q = p(sx * (KB_COURT + 2.0), KB_CZ + (rng() - 0.5) * 7);
      const t = PEOPLE[Math.floor(rng() * PEOPLE.length) % PEOPLE.length];
      const geo = buildStanding(t, 'down');
      _kbM.compose(
        _kbV.set(q[0], FL, q[1]),
        _kbQ.setFromEuler(_kbE.set(0, faceAltar + (rng() - 0.5) * 1.2, 0)),
        _kbS,
      );
      ib.addGeometry(geo, _kbM);
      geo.dispose();
    }
  }

  /* ---------------- the forecourt: the samadhi and the museum ---------------- */

  /**
   * The samadhi is a SEPARATE BUILDING and it is not in the courtyard. It
   * stands in the entrance forecourt on the road side, with the museum beside
   * it; OSM puts its centroid about 20 m from the temple's and its footprint at
   * about 16 x 21 m. Back to Godhead reported the design in September 1980 —
   * "the central spire will reach seventy feet into the sky" — and the
   * dedication in November 1983. It is carved white Rajasthani marble with a
   * tall curvilinear spire quite unlike the temple's bulbous domes, flanked by
   * chhatris, approached under a monumental arch, and the forecourt in front of
   * it is the same black and white diagonal chequer.
   *
   * It is modelled because it is the first thing you see arriving, and because
   * every "white marble temple" description of this place is describing it and
   * not the mandir.
   */
  {
    const SZ = 27;
    const s0 = p(0, SZ);
    b.box(s0[0], g0 - 0.3, s0[1], 18, 0.9, 22, KB_WHITE_MARBLE, rot);
    b.box(s0[0], g0 + 0.6, s0[1], 13, 7.2, 15, KB_WHITE_MARBLE, rot);
    for (const sx of [-1, 1]) {
      const a0 = p(sx * 4.2, SZ - 7.6);
      cuspedArch(b, a0[0], g0 + 0.6, a0[1], 3.2, 4.2, 0.7, rot, KB_WHITE_MARBLE, 7, null);
    }
    const d0 = p(0, SZ - 7.6);
    cuspedArch(b, d0[0], g0 + 0.6, d0[1], 4.0, 5.0, 0.8, rot, KB_WHITE_MARBLE, 7);
    b.box(s0[0], g0 + 7.8, s0[1], 14, 0.7, 16, KB_WHITE_MARBLE, rot);
    // seventy feet, which is the one published height on the whole site
    shikhara(b, s0[0], g0 + 8.5, s0[1], 3.1, 12.8, KB_WHITE_MARBLE, 12);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const c = p(sx * 5.2, SZ + sz * 6.2);
        chhatri(b, c[0], g0 + 8.5, c[1], 1.7, 2.4, KB_WHITE_MARBLE);
      }
    }
    const g1 = p(0, SZ + 12.5);
    for (const sx of [-1, 1]) {
      const c = p(sx * 5.4, SZ + 12.5);
      b.box(c[0], g0, c[1], 3.0, 7.6, 3.0, KB_WHITE_MARBLE, rot);
      chhatri(b, c[0], g0 + 7.6, c[1], 1.5, 2.0, KB_WHITE_MARBLE);
    }
    cuspedArch(b, g1[0], g0 + 3.6, g1[1], 8.2, 5.4, 1.4, rot, KB_WHITE_MARBLE, 5, null);
    b.box(g1[0], g0 + 8.2, g1[1], 12.8, 1.1, 1.5, KB_WHITE_MARBLE, rot);
    chhatri(b, g1[0], g0 + 9.3, g1[1], 1.3, 1.6, KB_WHITE_MARBLE);

    const m0 = p(13.5, SZ - 3);
    b.box(m0[0], g0 - 0.2, m0[1], 20, 0.7, 22, 0xe4dcc8, rot);
    b.box(m0[0], g0 + 0.5, m0[1], 17, 6.4, 19, KB_IVORY, rot);
    b.box(m0[0], g0 + 6.9, m0[1], 18, 0.6, 20, KB_SALMON, rot);
  }

  // the walled plot, gated on the road side where the entrance is
  {
    const W = loc.build.w * 0.5 + 6, D = loc.build.d * 0.5 + 6;
    const seg = (lx0, lz0, lx1, lz1) => {
      const A = p(lx0, lz0), B = p(lx1, lz1);
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      b.box((A[0] + B[0]) * 0.5, g0, (A[1] + B[1]) * 0.5, len, 2.8, 0.5, 0xe4dcc8, ang);
    };
    seg(-W, -D, W, -D);
    seg(-W, -D, -W, D);
    seg(W, -D, W, D);
    seg(-W, D, -4.5, D);
    seg(4.5, D, W, D);
    for (const sx of [-1, 1]) {
      const g2 = p(sx * 4.5, D);
      b.box(g2[0], g0, g2[1], 1.3, 5.2, 1.3, KB_IVORY, rot);
      b.box(g2[0], g0 + 5.2, g2[1], 1.7, 0.5, 1.7, KB_SALMON, rot);
    }
  }

  /* ---------------- what the rest of the game needs back ---------------- */

  // the rail at the foot of the flight, and across the side verandahs level
  // with the hall front, so nobody wades into a hall that is 0.78 m up
  {
    const q = p(0, HALL_Z + RISERS * TREAD + 0.3);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: KB_COURT * 2 + 0.8, d: 0.5, rot });
    for (const sx of [-1, 1]) {
      const r = p(sx * (KB_COURT + (HW - KB_COURT) * 0.5), HALL_Z - 0.3);
      colliders.push({ type: 'box', x: r[0], z: r[1], w: HW - KB_COURT, d: 0.5, rot });
    }
  }

  /**
   * The altar anchor sits at the FRONT of the plinth rather than on the murtis.
   * Three things aim at it: the camera's focus during darshan, where an
   * offering settles, and — 1.5 m to one side of it — where RitualSystem stands
   * its pujari. On the murtis it would have put him on top of the plinth and
   * buried him to the waist in it.
   */
  const altarW = p(0, HALL_Z - 0.9);
  const darshanW = p(0, HALL_Z + (RISERS + 1) * TREAD + 0.35);
  return {
    colliders,
    mesh: { name: 'IskconInterior', builder: ib, x, z, r: KB_LEN },
    interior: {
      altar: [altarW[0], HALL_FLOOR + 1.35, altarW[1]],
      darshan: [darshanW[0], darshanW[1]],
      facing: faceAltar,
      floor: HALL_FLOOR,
      // The threshold is the BUILDING and not the plot. loc.build is 54 x 66 m,
      // so the footprint test used to declare you inside anywhere within
      // 44 x 54 m of the centre — out in the forecourt, past the samadhi,
      // nowhere near a door, with the vignette and the name card already up.
      // `open` says this interior is a courtyard: it is still under the sky and
      // must not be graded down like a sanctum.
      volume: { x, z, hw: HW, hd: HL, rot, open: true, door: p(0, HL + 0.9) },
    },
  };
}

const BUILDERS = {
  /**
   * Radha Raman, Radha Damodar, Radha Shyamsundar.
   * Research corrected a real error here: these are NOT shikhara temples. They
   * are low, flat-roofed courtyard havelis that you cannot see coming — a
   * gateway in a street wall, a house-lined court, then a plain stone front of
   * cusped arches. The whole effect is concealment, not height.
   */
  'temple-haveli': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const arches = loc.build.arches || 3;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p2 = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    // the shrine block: low, flat-roofed, unremarkable from outside
    b.box(x, ground - 0.25, z, w + 2, 0.6, d + 2, 0xc2ad8c, rot);
    b.box(x, ground + 0.35, z, w * 0.82, h * 0.72, d * 0.66, color, rot);
    b.box(x, ground + 0.35 + h * 0.72, z, w * 0.88, 0.55, d * 0.72, accent, rot);

    // the antechamber front: the cusped arcade that is the whole facade
    const front = d * 0.33 + 0.2;
    for (let i = 0; i < arches; i++) {
      const lx = (i / (arches - 1) - 0.5) * w * 0.62;
      const q = p2(lx, front);
      cuspedArch(b, q[0], ground + 0.35, q[1],
        w / (arches * 1.9), h * 0.5, 0.55, rot + Math.PI / 2,
        i === Math.floor(arches / 2) ? 0x8a7355 : accent, 5);
    }

    // the two-storey Goswami houses that shut out the light
    const W = w * 0.5 + 7, D = d * 0.5 + 7;
    const sides = [[-W, -D, W, -D], [W, -D, W, D], [W, D, -W, D], [-W, D, -W, -D]];
    sides.forEach((sd, i) => {
      const A = p2(sd[0], sd[1]), B = p2(sd[2], sd[3]);
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      if (i === 2) {
        // the street gateway, with its heavy wooden doors
        const gap = 4.5;
        const seg = (len - gap) / 2;
        for (const side of [-1, 1]) {
          b.box(mx + Math.cos(ang) * side * (gap / 2 + seg / 2), ground,
                mz + Math.sin(ang) * side * (gap / 2 + seg / 2), seg, 6.4, 1.0, 0xd6c8ab, ang);
        }
        cuspedArch(b, mx, ground, mz, gap, 4.4, 1.1, ang, 0x6b4a32, 5);
      } else {
        b.box(mx, ground, mz, len, 6.4, 1.0, 0xd6c8ab, ang);
        // shuttered windows on the upper floor
        const n2 = Math.max(2, Math.round(len / 4));
        for (let k = 0; k < n2; k++) {
          const t = (k / (n2 - 1) - 0.5) * len * 0.8;
          b.box(mx + Math.cos(ang) * t, ground + 3.6, mz + Math.sin(ang) * t,
            0.85, 1.2, 1.15, 0x4a3a2a, ang);
        }
      }
    });
    return { altarY: 1.7 };
  },

  /**
   * Govind Dev and Radha Gopinath: both truncated.
   * Govind Dev's five towers were never finished and what survives reads, in
   * Growse's words, more like a cathedral than a temple. So: a great vaulted
   * mass, heavy walls, and a flat stub where the tower should rise.
   */
  'temple-truncated': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const cathedral = !!loc.build.cathedral;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    b.box(x, ground - 0.6, z, w + 8, 1.5, d + 8, 0x9c8e6e, rot);
    // battered walls, stepping slightly inward
    let cy = ground + 0.9;
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      b.box(x, cy, z, w * (1 - t * 0.14), (h * 0.74) / 3, d * (1 - t * 0.14), i % 2 ? accent : color, rot);
      b.box(x, cy + (h * 0.74) / 3 - 0.4, z, w * (1 - t * 0.14) + 0.8, 0.5, d * (1 - t * 0.14) + 0.8, accent, rot);
      cy += (h * 0.74) / 3;
    }
    // the vaulted crossing — and then nothing above it
    b.box(x, cy, z, w * 0.42, h * 0.16, d * 0.42, color, rot);
    b.box(x, cy + h * 0.16, z, w * 0.46, 0.7, d * 0.46, accent, rot);   // the flat stub

    if (cathedral) {
      // a tall clerestory nave, which is what makes it read as a cathedral
      b.box(x, ground + 0.9, z, w * 0.3, h * 0.92, d * 0.86, color, rot);
      for (const side of [-1, 1]) {
        for (let k = -2; k <= 2; k++) {
          const lx = side * w * 0.16, lz = k * d * 0.16;
          cuspedArch(b, x + lx * cs - lz * sn, ground + h * 0.55,
            z + lx * sn + lz * cs, 2.2, 3.0, 0.5, rot, 0x6b3325, 3);
        }
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = sx * w * 0.38, lz = sz * d * 0.38;
      chhatri(b, x + lx * cs - lz * sn, cy, z + lx * sn + lz * cs, 1.4, 2.4, 0xc4a884);
    }
    const front = d * 0.5 + 0.3;
    cuspedArch(b, x + front * sn, ground + 0.9, z + front * cs,
      w * 0.24, h * 0.4, 0.9, rot + Math.PI / 2, 0x6b3325, 3);
    return { altarY: 2.4 };
  },

  /**
   * Shahji: white marble, flat and terraced, a classical pediment over a
   * colonnade, and the twelve spiral columns the town names it for —
   * Tedhe Khambe Wala Mandir, the temple of the crooked pillars.
   */
  'temple-colonnade': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p2 = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    b.box(x, ground - 0.5, z, w + 6, 1.2, d + 6, 0xece7db, rot);
    b.box(x, ground + 0.7, z, w * 0.84, h * 0.62, d * 0.7, color, rot);

    // the twelve twisted columns, in two rows of six across the front
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 6; i++) {
        const lx = (i / 5 - 0.5) * w * 0.78;
        const lz = d * 0.33 + row * 2.6;
        const q = p2(lx, lz);
        // the twist: stacked, progressively rotated segments
        const SEG = 9, ch = h * 0.55 / SEG;
        for (let k = 0; k < SEG; k++) {
          b.box(q[0], ground + 0.7 + k * ch, q[1], 0.42, ch, 0.42,
            color, rot + k * 0.26);
        }
        b.box(q[0], ground + 0.7 + h * 0.55, q[1], 0.6, 0.28, 0.6, accent, rot);
      }
    }

    // entablature and the classical pediment, which is the nawabi-palace note
    const ent = p2(0, d * 0.36);
    b.box(ent[0], ground + 0.7 + h * 0.57, ent[1], w * 0.9, 0.7, 6.0, color, rot);
    for (let k = 0; k < 5; k++) {
      const t = k / 5;
      b.box(ent[0], ground + 0.7 + h * 0.64 + k * 0.32, ent[1],
        w * 0.9 * (1 - t * 0.85), 0.32, 5.4 * (1 - t * 0.2), color, rot);
    }
    // flat terraced roof, no tower at all
    b.box(x, ground + 0.7 + h * 0.62, z, w * 0.7, 0.5, d * 0.6, accent, rot);
    return { altarY: 1.9 };
  },

  /**
   * Radha Vallabh: no tower on the hall. A steep stone gable, and a two-tier
   * arcaded flank with clerestory windows looking over the street.
   */
  'temple-gable': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p2 = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    b.box(x, ground - 0.4, z, w + 4, 1.0, d + 4, 0x9c8e6e, rot);
    b.box(x, ground + 0.6, z, w * 0.8, h * 0.58, d * 0.84, color, rot);

    // the steep gable: stepped courses rising to a ridge
    const STEPS = 10;
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS;
      b.box(x, ground + 0.6 + h * 0.58 + i * (h * 0.34 / STEPS), z,
        w * 0.8 * (1 - t * 0.92), h * 0.34 / STEPS, d * 0.86, i % 2 ? accent : color, rot);
    }

    // two-tier arcaded flank with clerestory windows over the street
    for (const side of [-1, 1]) {
      for (let k = -2; k <= 2; k++) {
        const q = p2(side * w * 0.41, k * d * 0.17);
        cuspedArch(b, q[0], ground + 0.6, q[1], 2.0, h * 0.28, 0.45, rot, accent, 5);
        b.box(q[0], ground + 0.6 + h * 0.36, q[1], 0.5, 1.0, 1.0, 0x5a3a28, rot);
      }
    }
    const front = d * 0.44;
    cuspedArch(b, x + front * sn, ground + 0.6, z + front * cs,
      w * 0.3, h * 0.38, 0.7, rot + Math.PI / 2, 0x6b3325, 5);
    return { altarY: 2.0 };
  },

  /** Banke Bihari: a broad ornate arched facade under three domes. */
  'temple-rajasthani': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;

    b.box(x, ground - 0.4, z, w + 6, 1.1, d + 6, 0xc4b08a, rot);          // plinth
    b.box(x, ground + 0.7, z, w, h * 0.62, d, color, rot);                 // main mass

    // banded string courses
    for (let i = 1; i <= 3; i++) {
      b.box(x, ground + 0.7 + (h * 0.62 * i) / 4, z, w + 0.5, 0.42, d + 0.5, accent, rot);
    }

    // facade arcade — the thing that makes it Banke Bihari
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const front = d * 0.5 + 0.35;
    for (let i = -2; i <= 2; i++) {
      const lx = i * (w / 5.6);
      const ax = x + lx * cs + front * sn;
      const az = z - lx * sn + front * cs;
      const aw = i === 0 ? w / 4.2 : w / 6.4;
      const ah = i === 0 ? h * 0.5 : h * 0.34;
      cuspedArch(b, ax, ground + 0.7, az, aw, ah, 0.7, rot + Math.PI / 2, i === 0 ? accent : 0x8f7a58, 5);
    }

    // torana over the central entrance
    b.box(x + front * sn * 1.02, ground + 0.7 + h * 0.52, z + front * cs * 1.02,
      w / 3.4, 0.9, 1.2, accent, rot);

    // three domes
    dome(b, x, ground + 0.7 + h * 0.62, z, w * 0.22, h * 0.3, color);
    for (const side of [-1, 1]) {
      const ox = side * w * 0.31;
      dome(b, x + ox * cs, ground + 0.7 + h * 0.62, z - ox * sn, w * 0.12, h * 0.16, color);
    }
    compound(b, loc, ground, 0xcfbb95, 2.4);
    return { altarY: 2.4 };
  },

  /** Govind Dev / Madan Mohan: monumental red sandstone, tiered and battered. */
  'temple-redstone': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;

    b.box(x, ground - 0.5, z, w + 7, 1.4, d + 7, 0x9c8e6e, rot);           // plinth
    // receding stages
    const STAGES = 4;
    let cy = ground + 0.9;
    for (let i = 0; i < STAGES; i++) {
      const t = i / STAGES;
      const sw = w * (1 - t * 0.3), sd = d * (1 - t * 0.3);
      const sh = (h * 0.72) / STAGES;
      const shade = i % 2 ? accent : color;
      b.box(x, cy, z, sw, sh, sd, shade, rot);
      // deep string course
      b.box(x, cy + sh - 0.35, z, sw + 0.7, 0.45, sd + 0.7, accent, rot);
      cy += sh;
    }
    // heavy vaulted hall roof
    dome(b, x, cy, z, w * 0.3, h * 0.24, color, 10);

    // corner chhatris
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * w * 0.38, lz = sz * d * 0.38;
        chhatri(b, x + lx * cs - lz * sn, cy, z + lx * sn + lz * cs, 1.3, 2.3, 0xc4a884);
      }
    }

    // entrance recess
    const front = d * 0.5 + 0.3;
    cuspedArch(b, x + front * sn, ground + 0.9, z + front * cs, w * 0.26, h * 0.4, 0.9, rot + Math.PI / 2, 0x6b3325, 3);
    return { altarY: 2.6 };
  },

  /** Rangaji: a tall South Indian gopuram, the eastern skyline marker. */
  'temple-gopuram': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    // long compound
    const { D } = compound(b, loc, ground, 0xd2c4a4, 3.2);

    // the gopuram itself sits on the entrance side
    const gx = x + Math.sin(rot) * (D - 2);
    const gz = z + Math.cos(rot) * (D - 2);

    b.box(gx, ground, gz, w * 0.5, 4.2, 12, color, rot);                    // base block
    const TIERS = 8;
    let cy = ground + 4.2;
    let tw = w * 0.46, td = 11;
    for (let i = 0; i < TIERS; i++) {
      const th = (h - 6) / TIERS;
      const band = i % 2 ? accent : color;
      b.box(gx, cy, gz, tw, th * 0.82, td, band, rot);
      // cornice
      b.box(gx, cy + th * 0.82, gz, tw + 0.9, th * 0.18, td + 0.9, 0xe8dcc0, rot);
      // suggestion of niche figures: a row of small blocks
      const n = Math.max(3, Math.round(tw / 1.6));
      for (let k = 0; k < n; k++) {
        const lx = (k / (n - 1) - 0.5) * tw * 0.86;
        for (const face of [-1, 1]) {
          const lz = face * td * 0.5;
          b.box(gx + lx * cs - lz * sn, cy + th * 0.2, gz + lx * sn + lz * cs,
            0.5, th * 0.5, 0.35, i % 3 === 0 ? 0xc05a33 : 0xdcc9a0, rot);
        }
      }
      cy += th;
      tw *= 0.9; td *= 0.93;
    }
    // barrel-vaulted crown
    b.box(gx, cy, gz, tw, 1.6, td, 0xe4d8c0, rot);
    dome(b, gx, cy + 1.6, gz, td * 0.42, 1.8, 0xe4d8c0, 8);
    for (let k = -1; k <= 1; k++) {
      b.box(gx + k * tw * 0.3 * cs, cy + 3.4, gz + k * tw * 0.3 * sn, 0.24, 1.3, 0.24, 0xc9a03c);
    }

    // the sanctum inside the compound
    b.box(x, ground, z, w * 0.5, 7, d * 0.3, color, rot);
    shikhara(b, x, ground + 7, z, w * 0.2, 9, color);
    return { altarY: 2.4, colliders: [{ type: 'box', x: gx, z: gz, w: w * 0.5, d: 12, rot }] };
  },

  /** Prem Mandir: white marble, a cluster of shikharas, arcaded ground storey. */
  'temple-marble': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    b.box(x, ground - 0.6, z, w + 12, 1.6, d + 12, 0xe8e2d4, rot);          // broad plinth
    b.box(x, ground + 1.0, z, w, h * 0.4, d, color, rot);                    // arcaded storey

    // arcade on all four sides
    for (const [nx, nz, len, ang] of [
      [0, 1, w, rot], [0, -1, w, rot],
      [1, 0, d, rot + Math.PI / 2], [-1, 0, d, rot + Math.PI / 2],
    ]) {
      const off = (nz ? d : w) * 0.5 + 0.3;
      const n = Math.max(4, Math.round(len / 4.2));
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * len * 0.88;
        const lx = nz ? t : nx * off;
        const lz = nz ? nz * off : t;
        cuspedArch(b, x + lx * cs - lz * sn, ground + 1.0,
          z + lx * sn + lz * cs, 2.6, h * 0.3, 0.6, ang, accent, 7);
      }
    }

    b.box(x, ground + 1.0 + h * 0.4, z, w * 0.72, h * 0.16, d * 0.72, color, rot);

    // shikhara cluster
    const baseY = ground + 1.0 + h * 0.56;
    shikhara(b, x, baseY, z, w * 0.17, h * 0.44, color, 14);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.5], [0, 1.5]]) {
      const lx = ox * w * 0.26, lz = oz * d * 0.2;
      shikhara(b, x + lx * cs - lz * sn, baseY, z + lx * sn + lz * cs,
        w * 0.085, h * 0.24, color, 10);
    }
    return { altarY: 3.0 };
  },

  /**
   * ISKCON Sri Sri Krishna Balaram Mandir — the courtyard temple, which is the
   * only one in the file that authors its own interior rather than taking
   * `buildInterior`'s hall. Exclusive to this location, so it is safe to be as
   * particular as it is. See buildKrishnaBalaram above.
   */
  'temple-modern': (args) => buildKrishnaBalaram(args),

  /** The many small mandirs: a single shikhara over a square sanctum. */
  'temple-small': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    b.box(x, ground - 0.35, z, w + 3, 0.9, d + 3, 0xc2ad86, rot);
    b.box(x, ground + 0.55, z, w * 0.72, h * 0.46, d * 0.72, color, rot);
    b.box(x, ground + 0.55 + h * 0.46, z, w * 0.78, 0.4, d * 0.78, accent, rot);
    shikhara(b, x, ground + 0.95 + h * 0.46, z, w * 0.24, h * 0.5, color);

    // mandapa porch on four columns
    const front = d * 0.42;
    for (const sx of [-1, 1]) {
      for (const sz of [0.55, 1.05]) {
        const lx = sx * w * 0.26, lz = front * sz;
        b.box(x + lx * cs + lz * sn, ground + 0.55, z - lx * sn + lz * cs, 0.32, h * 0.32, 0.32, accent, rot);
      }
    }
    b.box(x + front * 0.8 * sn, ground + 0.55 + h * 0.32, z + front * 0.8 * cs,
      w * 0.6, 0.3, front * 0.7, accent, rot);
    cuspedArch(b, x + (d * 0.36) * sn, ground + 0.55, z + (d * 0.36) * cs,
      w * 0.28, h * 0.3, 0.5, rot + Math.PI / 2, 0x6b4a32, 5);

    // flag
    b.box(x, ground + 0.95 + h * 0.96, z, 0.1, 2.2, 0.1, 0x8a7a5a);
    b.box(x + 0.5, ground + 0.95 + h * 0.96 + 1.5, z, 1.0, 0.6, 0.05, 0xe8891f);
    return { altarY: 1.9 };
  },

  /** A riverfront facade above the stepped terrace the terrain already cut. */
  ghat: ({ loc, b, ground, terrain }) => {
    const { w, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    // the arcade wall set back from the steps
    const back = -8;
    const bx = x + back * sn, bz = z + back * cs;
    b.box(bx, ground, bz, w, h * 0.55, 6, color, rot);

    const n = Math.max(5, Math.round(w / 7));
    for (let i = 0; i < n; i++) {
      const lx = (i / (n - 1) - 0.5) * w * 0.9;
      cuspedArch(b, bx + lx * cs + 3.1 * sn, ground, bz - lx * sn + 3.1 * cs,
        w / (n * 1.5), h * 0.44, 0.7, rot + Math.PI / 2, accent, 7);
    }

    b.box(bx, ground + h * 0.55, bz, w + 1.2, 0.5, 7, accent, rot);

    // chhatris along the parapet and flanking towers
    for (let i = 0; i < 4; i++) {
      const lx = (i / 3 - 0.5) * w * 0.74;
      chhatri(b, bx + lx * cs, ground + h * 0.6, bz - lx * sn, 1.5, 2.6, 0xd8c8a4);
    }
    for (const side of [-1, 1]) {
      const lx = side * w * 0.52;
      b.box(bx + lx * cs, ground, bz - lx * sn, 5, h * 0.82, 6, color, rot);
      dome(b, bx + lx * cs, ground + h * 0.82, bz - lx * sn, 2.4, 2.2, accent);
    }
    return { altarY: 1.6, noCollider: true, colliders: [
      { type: 'box', x: bx, z: bz, w, d: 6, rot },
    ] };
  },

  /** Nidhivan / Seva Kunj: the enclosure. The grove itself is planted by PropScatter. */
  grove: ({ loc, b, ground }) => {
    const { w, d, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    const W = w * 0.5, D = d * 0.5;
    const sides = [
      [[-W, -D], [W, -D]], [[W, -D], [W, D]], [[W, D], [-W, D]], [[-W, D], [-W, -D]],
    ];
    sides.forEach((s, i) => {
      const [a0, a1] = s;
      const A = [x + a0[0] * cs - a0[1] * sn, z + a0[0] * sn + a0[1] * cs];
      const B = [x + a1[0] * cs - a1[1] * sn, z + a1[0] * sn + a1[1] * cs];
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      if (i === 2) {
        const gap = 6;
        for (const side of [-1, 1]) {
          const seg = (len - gap) / 2;
          b.box(mx + Math.cos(ang) * side * (gap / 2 + seg / 2), ground,
                mz + Math.sin(ang) * side * (gap / 2 + seg / 2), seg, 3.2, 0.6, accent, ang);
        }
        // arched gateway
        cuspedArch(b, mx, ground, mz, gap, 4.6, 0.8, ang, 0xb08a5c, 5);
        b.box(mx, ground + 4.6, mz, gap + 2, 1.0, 1.2, accent, ang);
      } else {
        b.box(mx, ground, mz, len, 3.2, 0.6, accent, ang);
      }
    });

    // a raised stone platform at the centre
    b.box(x, ground, z, 7, 0.5, 7, 0xc8b894, rot);
    return { altarY: 1.0, noCollider: true };
  },

  /** A stepped tank. */
  kund: ({ loc, b, ground }) => {
    const { w, d, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const STEPS = 7, RISE = 0.5, TREAD = 1.1;
    for (let s = 0; s < STEPS; s++) {
      const inset = s * TREAD;
      const y = ground - s * RISE;
      const sw = w - inset * 2, sd = d - inset * 2;
      if (sw < 3 || sd < 3) break;
      b.box(x, y - RISE, z, sw, RISE, sd, s % 2 ? color : 0xc4b088, 0,
        0b111111, s === STEPS - 1 ? 0x3f6d74 : null);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      chhatri(b, x + sx * w * 0.5, ground, z + sz * d * 0.5, 1.2, 2.2, accent);
    }
    return { altarY: 0.8, noCollider: true };
  },

  /** A ceremonial gateway spanning the road. */
  gate: ({ loc, b, ground }) => {
    const { w, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (const side of [-1, 1]) {
      const lx = side * w * 0.45;
      b.box(x + lx * cs, ground, z - lx * sn, 4, h * 0.82, 4.5, color, rot);
      dome(b, x + lx * cs, ground + h * 0.82, z - lx * sn, 2.1, 2.0, accent);
    }
    cuspedArch(b, x, ground, z, w * 0.62, h * 0.72, 4.2, rot, accent, 7);
    b.box(x, ground + h * 0.74, z, w * 0.72, 1.8, 3.2, color, rot);
    b.box(x, ground + h * 0.78, z, w * 0.5, 1.0, 3.5, accent, rot);
    return { altarY: 1.5, noCollider: true, colliders: [
      { type: 'circle', x: x + Math.cos(rot) * w * 0.45, z: z - Math.sin(rot) * w * 0.45, r: 2.6 },
      { type: 'circle', x: x - Math.cos(rot) * w * 0.45, z: z + Math.sin(rot) * w * 0.45, r: 2.6 },
    ] };
  },

  /** Chandrodaya: the unfinished tower, visible from everywhere. */
  tower: ({ loc, b, ground }) => {
    const { w, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    b.box(x, ground - 0.8, z, w + 14, 1.6, w + 14, 0xd0c8b4);
    const STAGES = 7;
    let cy = ground + 0.8, cw = w;
    for (let i = 0; i < STAGES; i++) {
      const sh = h / STAGES;
      b.box(x, cy, z, cw, sh * 0.9, cw, i % 2 ? accent : color);
      b.box(x, cy + sh * 0.9, z, cw + 1.4, sh * 0.1, cw + 1.4, 0xbfb49c);
      cy += sh; cw *= 0.87;
    }
    // scaffolding and a crane — it is still being built, and that is the point
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box(x + sx * (w * 0.5 + 2), ground, z + sz * (w * 0.5 + 2), 0.35, h * 0.72, 0.35, 0xa8703c);
    }
    b.box(x + w * 0.5 + 6, ground, z, 1.0, h * 1.05, 1.0, 0xd8a03c);
    b.box(x + w * 0.5 + 6 + 11, ground + h * 1.02, z, 24, 0.7, 0.7, 0xd8a03c);
    return { altarY: 2.0 };
  },

  /**
   * Chhatikara: the crossing you arrive through. A divided highway, an overhead
   * sign gantry, the bus stand with its shelter, and the welcome arch that tells
   * you Braj has begun.
   */
  crossing: ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    // central median of the divided highway
    for (let i = -4; i <= 4; i++) {
      const q = p(i * 7, 0);
      b.box(q[0], ground, q[1], 5.2, 0.35, 1.6, 0xbfb49c, rot);
      if (i % 2 === 0) b.box(q[0], ground + 0.35, q[1], 0.7, 0.9, 0.7, 0x4f7a3a, rot);
    }

    // sign gantry over the road
    for (const side of [-1, 1]) {
      const q = p(0, side * 11);
      b.box(q[0], ground, q[1], 0.6, 7.2, 0.6, 0x6a6a62, rot);
    }
    const g0 = p(0, 0);
    b.box(g0[0], ground + 7.0, g0[1], 0.8, 0.5, 23, 0x6a6a62, rot);
    b.box(g0[0], ground + 5.4, g0[1], 0.35, 1.7, 7.5, 0x1d6a3f, rot);

    // the welcome arch
    const a0 = p(-w * 0.34, 0);
    for (const side of [-1, 1]) {
      const q = p(-w * 0.34, side * 10);
      b.box(q[0], ground, q[1], 3.2, h * 0.8, 3.2, color, rot);
      dome(b, q[0], ground + h * 0.8, q[1], 1.7, 1.6, accent);
    }
    cuspedArch(b, a0[0], ground, a0[1], 19, h * 0.72, 3.0, rot + Math.PI / 2, accent, 7);
    b.box(a0[0], ground + h * 0.74, a0[1], 21, 1.7, 2.6, color, rot);
    b.box(a0[0], ground + h * 0.8, a0[1], 15, 0.9, 2.9, accent, rot);

    // bus stand: a long shelter, a platform, and waiting benches
    const s0 = p(w * 0.3, 15);
    b.box(s0[0], ground, s0[1], 26, 0.4, 7, 0xc4b79f, rot);
    for (let i = -3; i <= 3; i++) {
      const q = p(w * 0.3 + i * 4, 17.4);
      b.box(q[0], ground + 0.4, q[1], 0.28, 3.2, 0.28, 0x6a6a62, rot);
    }
    b.box(s0[0], ground + 3.6, s0[1], 27, 0.3, 8, 0x2f5d5a, rot);
    for (let i = -2; i <= 2; i++) {
      const q = p(w * 0.3 + i * 5, 13.6);
      b.box(q[0], ground + 0.4, q[1], 3.4, 0.45, 0.8, 0x8a7458, rot);
    }
    // a parked bus, because the stand should never be empty
    const bus = p(w * 0.3 - 4, 23);
    b.box(bus[0], ground, bus[1], 10.5, 3.1, 2.7, 0xd8c04c, rot);
    b.box(bus[0], ground + 3.1, bus[1], 10.0, 0.3, 2.6, 0xc8452a, rot);
    for (let i = 0; i < 6; i++) {
      const q = p(w * 0.3 - 9 + i * 1.9, 22.6);
      b.panel(q[0], ground + 1.6, q[1], 1.5, 1.0, 0x2f3b3a, rot, 0.02);   // windows
    }

    // parked rickshaws waiting for a fare
    for (let i = 0; i < 5; i++) {
      const q = p(w * 0.3 - 13 + i * 3.4, 29 + (i % 2) * 1.2);
      const ang = rot + (rng() - 0.5) * 0.5;
      b.box(q[0], ground, q[1], 1.4, 1.1, 2.8, i % 2 ? 0x3f8f6a : 0x2f5d5a, ang);
      b.box(q[0], ground + 1.35, q[1], 1.5, 0.12, 1.8, i % 2 ? 0xf2ece0 : 0xc8452a, ang);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.box(q[0] + sx * 0.6, ground + 0.72, q[1] + sz * 0.7, 0.06, 0.5, 0.06, 0x5a5a52, ang);
      }
    }

    // waiting passengers: luggage, a tea bench, a stack of crates
    for (let i = 0; i < 7; i++) {
      const q = p(w * 0.3 - 11 + i * 3.2, 13.2);
      b.box(q[0], ground + 0.4, q[1], 0.6, 0.5, 0.45, [0xc8452a, 0x2f5d5a, 0x8a6a42, 0xc9a03c][i % 4], rot);
    }
    const chai = p(w * 0.3 + 14, 16);
    b.box(chai[0], ground, chai[1], 2.4, 2.0, 1.8, 0x8a7458, rot);
    b.box(chai[0], ground + 2.0, chai[1], 3.2, 0.14, 2.6, 0xc8452a, rot);
    b.box(chai[0], ground + 0.95, chai[1] + 1.2, 2.0, 0.12, 0.7, 0xa89878, rot);

    return { altarY: 1.5, noCollider: true, colliders: [
      { type: 'box', x: s0[0], z: s0[1], w: 26, d: 7, rot },
    ] };
  },

  /** Loi Bazar: an open square of stalls. */
  market: ({ loc, b, ground, rng }) => {
    const { w, d } = loc.build;
    const [x, z] = loc.pos;
    const COLORS = [0xc8452a, 0xe8891f, 0x2f5d5a, 0xf6f2e8, 0xc9a03c];
    for (let i = 0; i < 16; i++) {
      const lx = (rng() - 0.5) * w, lz = (rng() - 0.5) * d;
      const ang = rng() * 0.6 - 0.3;
      b.box(x + lx, ground, z + lz, 2.6, 2.1, 2.0, 0x8a7458, ang);           // stall body
      b.box(x + lx, ground + 2.1, z + lz, 3.4, 0.18, 3.0,
        COLORS[Math.floor(rng() * COLORS.length)], ang);                      // awning
      for (const sx of [-1, 1]) {
        b.box(x + lx + sx * 1.5, ground, z + lz + 1.4, 0.1, 2.1, 0.1, 0x6a5a42);
      }
    }
    b.box(x, ground, z, 5, 0.45, 5, 0xc4b08a);
    return { altarY: 1.0, noCollider: true };
  },
};
