/**
 * Vrindaban Road station (VRBD): its platforms and its foot over-bridge
 * (rail.generated.js, from OSM).
 *
 * The station that serves Vrindavan on the New Delhi-Mathura main line
 * stands in Chhatikara, its southern half past the world's edge. OSM maps
 * its three platforms as areas — the west one 615 m long and 13 m wide
 * beside the outer loop, an island 10 m wide between the loops, and the
 * east one by the booking office's side — and ESRI z19 puts each within a
 * metre of where OSM has it. They are high-level platforms: the top
 * PLATFORM_H over the rail (Indian Railways' 760-840 mm), a coping along the
 * edge, a ramp down at each end. A shelter stands on the west one where
 * ESRI shows its roof.
 *
 * Over them, the foot over-bridge, as OSM's footways draw it (`road.fob`,
 * import.mjs): a covered deck across all eight tracks, FOB_CLEAR over the
 * contact wire, and its stair down the west platform where OSM has it.
 * OSM has no stair onto the island or the east platform, nor any down from
 * the deck's east end; a footbridge comes down to every platform it serves,
 * so those are built — at the slope of a stair, where one must be — and
 * this says so.
 */
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { RAIL_TOP, WIRE_OVER_RAIL } from './RailBuilder.js';

/** A high-level platform's top over the rail. */
export const PLATFORM_H = 0.84;
const PIECE = 6;                 // a platform laid, and stood on, in pieces this long
const RAMP = 10;                 // the slope off a platform's end
const RAMP_PIECE = 1;
const COPING = 0.55;
/** A platform's edge from the centre of the track beside it (Indian Railways: 1680 mm). */
const EDGE = 1.68;
/** Under the over-bridge's deck, over the contact wire. */
const FOB_CLEAR = 1.4;
const FOB_SLAB = 0.35;
const FOB_W = 3.0;
const FOB_ROOF = 2.7;            // its roof over the deck
const RAILING = 1.15;
const STAIR_SLOPE = 0.62;        // rise over going: 32 degrees, as a stair is
const TREAD = 0.3;
const STAIR_PIECE = 0.75;        // stood on in pieces rising 0.47 m, inside a step up

const SURFACE = 0x9e9a90;
const COPING_C = 0xd2cdc0;
const EDGE_LINE = 0xd8b23a;      // the yellow line along the coping
const WALL = 0x8a857b;
const STEEL = 0x5b6066;
const ROOF = 0x4b5258;
const SHELTER_ROOF = 0x5d84b4;
const STAIR_C = 0xaaa59a;

/** A platform polygon as a strip: its axis, and its extent along and across it. */
export function strip(points) {
  let best = 0, ux = 1, uz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > best) { best = L; ux = (b[0] - a[0]) / L; uz = (b[1] - a[1]) / L; }
  }
  const o = points[0];
  let a0 = Infinity, a1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const [x, z] of points) {
    const along = (x - o[0]) * ux + (z - o[1]) * uz, across = -(x - o[0]) * uz + (z - o[1]) * ux;
    a0 = Math.min(a0, along); a1 = Math.max(a1, along); c0 = Math.min(c0, across); c1 = Math.max(c1, across);
  }
  // a point given along and across (across is to the left of the axis)
  const at = (along, across) => [o[0] + ux * along - uz * across, o[1] + uz * along + ux * across];
  return { ux, uz, a0, a1, c0, c1, at, w: c1 - c0, rot: Math.atan2(uz, ux) };
}

/**
 * Lay the platforms and the over-bridge. `ground(x, z)` is the terrain;
 * `trackDistance(x, z)` how far a point is from the nearest track's centre
 * line; `inWorld(x, z)` whether it is inside the world. Pushes colliders;
 * returns the mesh, and the platforms as strips (for what must keep off them).
 */
export function buildStation(platforms, fobRoads, ground, trackDistance, inWorld, colliders) {
  const b = new MeshBuilder();
  const strips = [];
  const onTrack = (x, z, r) => trackDistance(x, z) < r;
  for (const p of platforms || []) {
    const s = strip(p.points);
    s.id = p.id;
    strips.push(s);
    layPlatform(b, s, ground, trackDistance, inWorld, colliders);
  }
  const west = strips.reduce((m, s) => (!m || s.w > m.w ? s : m), null);
  if (west) shelter(b, west, ground, colliders);
  if (fobRoads && fobRoads.length) overBridge(b, fobRoads, strips, ground, onTrack, colliders);
  return { mesh: b.isEmpty ? null : b.toMesh('Station', { receiveShadow: true, castShadow: true, doubleSided: true }), strips };
}

/** Is a point on one of these platforms (within `pad` of one)? */
export function onPlatform(strips, x, z, pad = 0) {
  for (const s of strips) {
    const o = s.at(0, 0);
    const along = (x - o[0]) * s.ux + (z - o[1]) * s.uz, across = -(x - o[0]) * s.uz + (z - o[1]) * s.ux;
    if (along > s.a0 - pad && along < s.a1 + pad && across > s.c0 - pad && across < s.c1 + pad) return true;
  }
  return false;
}

function layPlatform(b, s, ground, trackDistance, inWorld, colliders) {
  const { a0, a1, at, rot } = s;
  const n = Math.max(1, Math.ceil((a1 - a0) / PIECE));
  const len = (a1 - a0) / n;
  const top = [], edges = [];
  for (let k = 0; k < n; k++) {
    const am = a0 + (k + 0.5) * len;
    const [x, z] = at(am, (s.c0 + s.c1) / 2);
    top.push(inWorld(x, z) ? ground(x, z) + RAIL_TOP + PLATFORM_H : null);
    /*
     * Each edge EDGE from the track beside it, and no nearer. OSM's island
     * platform reaches 1.34 m from its loop where the loop bends in at the
     * station's throat — a coach would strike it — so a piece's edge is drawn
     * back there, as the coping is laid.
     */
    let c0 = s.c0, c1 = s.c1;
    for (let pass = 0; pass < 3; pass++) {
      const near = (c) => Math.min(...[k * len, (k + 0.5) * len, (k + 1) * len].map((d) => trackDistance(...at(a0 + d, c))));
      const d0 = near(c0), d1 = near(c1);
      if (d0 < EDGE) c0 += EDGE - d0;
      if (d1 < EDGE) c1 -= EDGE - d1;
    }
    edges.push([c0, Math.max(c0 + 1, c1)]);
  }
  for (let k = 0; k < n; k++) {
    if (top[k] === null) continue;
    const s0 = a0 + k * len, s1 = s0 + len, y = top[k];
    const [c0, c1] = edges[k];
    const g = y - RAIL_TOP - PLATFORM_H;
    const P = (along, across, yy) => { const [x, z] = at(along, across); return [x, yy, z]; };
    // the surface, and its coping and yellow line along both edges
    b.quad(P(s0, c0 + COPING, y), P(s1, c0 + COPING, y), P(s1, c1 - COPING, y), P(s0, c1 - COPING, y), SURFACE);
    for (const [e0, e1] of [[c0, c0 + COPING], [c1 - COPING, c1]]) {
      b.quad(P(s0, e0, y + 0.005), P(s1, e0, y + 0.005), P(s1, e1, y + 0.005), P(s0, e1, y + 0.005), COPING_C);
    }
    for (const c of [c0 + COPING + 0.05, c1 - COPING - 0.15]) {
      b.quad(P(s0, c, y + 0.01), P(s1, c, y + 0.01), P(s1, c + 0.1, y + 0.01), P(s0, c + 0.1, y + 0.01), EDGE_LINE);
    }
    // the walls, down to the ballast and the ground
    for (const c of [c0, c1]) b.quad(P(s0, c, g - 0.1), P(s1, c, g - 0.1), P(s1, c, y), P(s0, c, y), WALL);
    // the ends, where a neighbour is not laid (past the edge of the world)
    if (k === 0 || top[k - 1] === null) b.quad(P(s0, c0, g - 0.1), P(s0, c1, g - 0.1), P(s0, c1, y), P(s0, c0, y), WALL);
    if (k === n - 1 || top[k + 1] === null) b.quad(P(s1, c0, g - 0.1), P(s1, c1, g - 0.1), P(s1, c1, y), P(s1, c0, y), WALL);
    const [cx, cz] = at((s0 + s1) / 2, (c0 + c1) / 2);
    colliders.push({ type: 'box', x: cx, z: cz, w: len + 0.05, d: c1 - c0, rot, top: y, tag: 'platform' });
  }
  // a ramp down off each end that is in the world
  for (const [end, dir] of [[a0, -1], [a1, 1]]) {
    const k = dir < 0 ? 0 : n - 1;
    if (top[k] === null) continue;
    const y = top[k];
    const [c0, c1] = edges[k];
    const steps = Math.round(RAMP / RAMP_PIECE);
    for (let i = 0; i < steps; i++) {
      const sa = end + dir * i * RAMP_PIECE, sb = sa + dir * RAMP_PIECE;
      const [mx, mz] = at((sa + sb) / 2, (c0 + c1) / 2);
      const g = ground(mx, mz);
      const ya = g + (y - g) * (1 - i / steps), yb = g + (y - g) * (1 - (i + 1) / steps);
      const P = (along, across, yy) => { const [x, z] = at(along, across); return [x, yy, z]; };
      b.quad(P(sa, c0, ya), P(sb, c0, yb), P(sb, c1, yb), P(sa, c1, ya), SURFACE);
      for (const c of [c0, c1]) b.quad(P(sa, c, g - 0.1), P(sb, c, g - 0.1), P(sb, c, yb), P(sa, c, ya), WALL);
      colliders.push({ type: 'box', x: mx, z: mz, w: RAMP_PIECE + 0.05, d: c1 - c0, rot, top: (ya + yb) / 2, tag: 'platform-ramp' });
    }
  }
}

/** The shelter on the west platform, where ESRI z19 shows its roof (20 m, at its 490-510 m). */
function shelter(b, s, ground, colliders) {
  const { at, c0, c1, rot } = s;
  // OSM's west platform runs from 338 m to 953 m along the line; ESRI's roof
  // is 150-170 m into it from its north end
  const mid = s.a0 + 160, half = 10;
  const [mx, mz] = at(mid, (c0 + c1) / 2);
  const y = ground(mx, mz) + RAIL_TOP + PLATFORM_H;
  const wc = (c1 - c0) * 0.6;
  const cm = (c0 + c1) / 2;
  for (const da of [-half + 1, 0, half - 1]) {
    for (const dc of [-wc / 2 + 0.6, wc / 2 - 0.6]) {
      const [px, pz] = at(mid + da, cm + dc);
      b.box(px, y, pz, 0.18, 3.4, 0.18, STEEL, rot);
      colliders.push({ type: 'circle', x: px, z: pz, r: 0.15, tag: 'shelter-post' });
    }
  }
  b.box(mx, y + 3.4, mz, half * 2, 0.12, wc, SHELTER_ROOF, rot);
  for (const da of [-half / 2, half / 2]) {
    const [bx, bz] = at(mid + da, cm);
    b.box(bx, y, bz, 3.0, 0.45, 0.5, 0x6b5a48, rot);   // benches
  }
}

/**
 * The foot over-bridge. A footway OSM carries over the tracks is the deck;
 * one that does not, ending loose, is a stair, its foot at the loose end.
 */
function overBridge(b, roads, strips, ground, onTrack, colliders) {
  const segs = [];
  for (const r of roads) for (let i = 1; i < r.points.length; i++) segs.push({ a: r.points[i - 1], c: r.points[i] });
  const key = (p) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
  const degree = new Map();
  for (const sg of segs) for (const p of [sg.a, sg.c]) degree.set(key(p), (degree.get(key(p)) || 0) + 1);
  const crosses = (sg) => {
    const L = Math.hypot(sg.c[0] - sg.a[0], sg.c[1] - sg.a[1]);
    for (let t = 0; t <= L; t += 0.5) {
      const x = sg.a[0] + (sg.c[0] - sg.a[0]) * t / L, z = sg.a[1] + (sg.c[1] - sg.a[1]) * t / L;
      if (onTrack(x, z, 1.2)) return true;
    }
    return false;
  };
  // the deck, level across: clear of the contact wire over the highest rail it crosses
  let deckY = -Infinity;
  for (const sg of segs) for (const p of [sg.a, sg.c]) deckY = Math.max(deckY, ground(p[0], p[1]) + RAIL_TOP + WIRE_OVER_RAIL + FOB_CLEAR + FOB_SLAB);
  const platformTop = (x, z) => {
    const on = strips.find((s) => onPlatform([s], x, z));
    return on ? ground(x, z) + RAIL_TOP + PLATFORM_H : ground(x, z);
  };

  const stairs = [];
  const decks = [];
  for (const sg of segs) {
    const la = degree.get(key(sg.a)) === 1, lc = degree.get(key(sg.c)) === 1;
    if (!crosses(sg) && (la || lc)) stairs.push(la ? { foot: sg.a, head: sg.c } : { foot: sg.c, head: sg.a });
    else decks.push(sg);
  }
  /*
   * Inferred, and said so in the header: a stair onto each platform the deck
   * passes over with no stair of its own, down its middle toward the longer
   * part of it; and down from each loose end of the deck, straight on.
   */
  const going = (top) => (deckY - top) / STAIR_SLOPE;
  for (const s of strips) {
    if (stairs.some((st) => onPlatform([s], ...st.foot, 1))) continue;
    // where the deck passes over the platform's middle line
    const o = s.at(0, 0);
    const hits = [];
    for (const sg of decks) {
      const L = Math.hypot(sg.c[0] - sg.a[0], sg.c[1] - sg.a[1]);
      for (let t = 0; t <= L; t += 0.5) {
        const x = sg.a[0] + (sg.c[0] - sg.a[0]) * t / L, z = sg.a[1] + (sg.c[1] - sg.a[1]) * t / L;
        const across = -(x - o[0]) * s.uz + (z - o[1]) * s.ux;
        if (onPlatform([s], x, z) && Math.abs(across - (s.c0 + s.c1) / 2) < 0.6) hits.push((x - o[0]) * s.ux + (z - o[1]) * s.uz);
      }
    }
    if (!hits.length) continue;
    // down toward the longer part of the platform, from the deck's last point
    // over it that way: a deck running along the platform (the island's) is
    // not stood in by its own stair
    const dir = s.a1 - hits[0] > hits[0] - s.a0 ? 1 : -1;
    const along = dir > 0 ? Math.max(...hits) : Math.min(...hits);
    const [hx, hz] = s.at(along + dir * FOB_W / 2, (s.c0 + s.c1) / 2);
    const g = going(ground(hx, hz) + RAIL_TOP + PLATFORM_H);
    stairs.push({ head: [hx, hz], foot: [hx + s.ux * dir * g, hz + s.uz * dir * g], inferred: true });
  }
  for (const sg of decks) {
    for (const [end, other] of [[sg.a, sg.c], [sg.c, sg.a]]) {
      if (degree.get(key(end)) !== 1) continue;
      const L = Math.hypot(end[0] - other[0], end[1] - other[1]);
      const ux = (end[0] - other[0]) / L, uz = (end[1] - other[1]) / L;
      const g = going(ground(...end));
      stairs.push({ head: end, foot: [end[0] + ux * g, end[1] + uz * g], inferred: true });
    }
  }

  // ---- the deck: slab, railings with a gap where a stair comes up or
  // another piece of deck goes on, roof on posts ----
  const nearSeg = (x, z, sg) => {
    const dx = sg.c[0] - sg.a[0], dz = sg.c[1] - sg.a[1], L2 = dx * dx + dz * dz || 1;
    const k = Math.max(0, Math.min(1, ((x - sg.a[0]) * dx + (z - sg.a[1]) * dz) / L2));
    return Math.hypot(x - sg.a[0] - dx * k, z - sg.a[1] - dz * k);
  };
  for (const sg of decks) {
    const L = Math.hypot(sg.c[0] - sg.a[0], sg.c[1] - sg.a[1]);
    if (L < 0.5) continue;
    const ux = (sg.c[0] - sg.a[0]) / L, uz = (sg.c[1] - sg.a[1]) / L, nx = -uz, nz = ux;
    const rot = Math.atan2(uz, ux);
    // run each end on under the next piece, so a corner is closed
    const a = [sg.a[0] - ux * FOB_W / 2, sg.a[1] - uz * FOB_W / 2], c = [sg.c[0] + ux * FOB_W / 2, sg.c[1] + uz * FOB_W / 2];
    const LL = L + FOB_W;
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(mx, deckY - FOB_SLAB, mz, LL, FOB_SLAB, FOB_W, STAIR_C, rot);
    for (let t = 0; t < LL; t += 3) {
      const t1 = Math.min(LL, t + 3);
      const px = a[0] + ux * (t + t1) / 2, pz = a[1] + uz * (t + t1) / 2;
      colliders.push({ type: 'box', x: px, z: pz, w: t1 - t + 0.1, d: FOB_W, rot, top: deckY, base: deckY - FOB_SLAB, standOnly: true, tag: 'fob-deck' });
      for (const side of [-1, 1]) {
        const rx = px + nx * side * (FOB_W / 2 - 0.05), rz = pz + nz * side * (FOB_W / 2 - 0.05);
        // a stair comes up through this side here, or the deck goes on across
        // it — anywhere along the piece, not only at its middle: at the
        // island's corner a piece's end stood 0.85 m into the next deck's way
        const along = [-(t1 - t) / 2, 0, (t1 - t) / 2].map((d) => [rx + ux * d, rz + uz * d]);
        if (along.some(([qx, qz]) => stairs.some((st) => Math.hypot(st.head[0] - qx, st.head[1] - qz) < FOB_W * 0.75))) continue;
        if (along.some(([qx, qz]) => decks.some((o) => o !== sg && nearSeg(qx, qz, o) < FOB_W / 2 + 0.3))) continue;
        b.box(rx, deckY, rz, t1 - t, RAILING, 0.06, STEEL, rot);
        colliders.push({ type: 'box', x: rx, z: rz, w: t1 - t + 0.1, d: 0.3, rot, top: deckY + RAILING, base: deckY - 0.4, tag: 'fob-rail' });
      }
    }
    // the roof, on posts every 4 m
    b.box(mx, deckY + FOB_ROOF, mz, LL, 0.1, FOB_W + 0.6, ROOF, rot);
    for (let t = 0; t <= LL + 0.01; t += 4) {
      for (const side of [-1, 1]) {
        const px = a[0] + ux * Math.min(t, LL) + nx * side * (FOB_W / 2), pz = a[1] + uz * Math.min(t, LL) + nz * side * (FOB_W / 2);
        b.box(px, deckY, pz, 0.12, FOB_ROOF, 0.12, STEEL, rot);
      }
    }
    // columns down to the ground or the platform, wherever they are off the tracks
    for (let t = 0; t <= LL + 0.01; t += 8) {
      const px = a[0] + ux * Math.min(t, LL), pz = a[1] + uz * Math.min(t, LL);
      if (onTrack(px, pz, 2.4)) continue;
      const y0 = platformTop(px, pz);
      b.box(px, y0, pz, 0.6, deckY - FOB_SLAB - y0, 0.6, STEEL, rot);
      colliders.push({ type: 'box', x: px, z: pz, w: 0.7, d: 0.7, rot, top: deckY - FOB_SLAB, tag: 'fob-column' });
    }
  }

  // ---- the stairs, from the platform or the ground up to the deck ----
  for (const st of stairs) {
    const L0 = Math.hypot(st.head[0] - st.foot[0], st.head[1] - st.foot[1]);
    if (L0 < 0.5) continue;
    const ux = (st.head[0] - st.foot[0]) / L0, uz = (st.head[1] - st.foot[1]) / L0;
    const rot = Math.atan2(uz, ux);
    const y0 = platformTop(...st.foot);
    // a stair climbs at its slope from the deck back toward its foot; the rest of a
    // longer way is the platform it starts on
    const L = Math.min(L0, (deckY - y0) / STAIR_SLOPE);
    const start = [st.head[0] - ux * L, st.head[1] - uz * L];
    const nTreads = Math.max(1, Math.round(L / TREAD));
    const rise = (deckY - y0) / nTreads, run = L / nTreads;
    for (let i = 0; i < nTreads; i++) {
      const cx = start[0] + ux * run * (i + 0.5), cz = start[1] + uz * run * (i + 0.5);
      b.box(cx, y0, cz, run + 0.01, rise * (i + 1), FOB_W - 0.4, STAIR_C, rot);
    }
    const nPieces = Math.max(1, Math.ceil(L / STAIR_PIECE));
    for (let i = 0; i < nPieces; i++) {
      const t0 = i * L / nPieces, t1 = (i + 1) * L / nPieces;
      const cx = start[0] + ux * (t0 + t1) / 2, cz = start[1] + uz * (t0 + t1) / 2;
      colliders.push({ type: 'box', x: cx, z: cz, w: t1 - t0 + 0.02, d: FOB_W - 0.4, rot, top: y0 + (deckY - y0) * (t1 / L), tag: 'fob-stair' });
    }
    // handrails, both sides
    for (const side of [-1, 1]) {
      const nx = -uz * side * (FOB_W / 2 - 0.2), nz = ux * side * (FOB_W / 2 - 0.2);
      b.quad([start[0] + nx, y0 + RAILING, start[1] + nz], [st.head[0] + nx, deckY + RAILING, st.head[1] + nz],
        [st.head[0] + nx, deckY + RAILING - 0.06, st.head[1] + nz], [start[0] + nx, y0 + RAILING - 0.06, start[1] + nz], STEEL);
    }
  }
  return stairs;
}

