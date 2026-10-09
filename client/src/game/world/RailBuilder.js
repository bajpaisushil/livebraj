/**
 * The railways (rail.generated.js, from OSM).
 *
 * Two lines cross the world and the game had neither, so its two rail
 * over-bridges — the Govardhan road's at Chhatikara and the pair south of
 * town by Chandrodaya — were bridges over nothing:
 *
 *   The New Delhi-Mathura main line through Chhatikara: four broad-gauge
 *   tracks (1676 mm), wired for electric traction, with the loops and
 *   crossovers of Vrindaban Road station at the south edge of the world.
 *
 *   The metre gauge (1000 mm) from Mathura into Vrindavan station, the
 *   railbus line, unwired, through the town's south.
 *
 * Laid on the ground as track is: a ballast bed with its shoulders, concrete
 * sleepers, two rails; and on the wired tracks, a mast every MAST_EVERY with
 * its cantilever and the contact wire over the track. Buildings and trees are
 * kept off (`railDistance`, BuildingGenerator's road grid), and a bridge over
 * a track is lifted to clear the wire (Bridges.js).
 */
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { resample } from '../../engine/math/Curves.js';

const BALLAST = 0x7b7368;
const SHOULDER = 0x8c8377;
const SLEEPER = 0xa29e95;        // pre-stressed concrete
const SLEEPER_METRE = 0x6b5a48;  // the old line's
const RAIL_TOP = 0xc4c6c8;
const RAIL_SIDE = 0x6e5546;      // rust
const MAST = 0x8e9399;           // galvanised steel
const WIRE = 0x2c2c2c;

const SEG = 4;                   // the track laid in pieces this long
const SLEEPER_EVERY = 0.75;
const BED = 0.24;                // ballast top over the ground
const MAST_EVERY = 58;
const MAST_OUT = 2.8;            // from the track's centre
const WIRE_Y = 5.6;              // contact wire over the rail
const MAST_H = 8.2;

/** The metres of clearance a track keeps from everything else, centre to edge. */
export const railHalf = (t) => t.gauge * 0.5 + 2.4;

/**
 * Lay every track. `ground(x, z)` is the terrain; `otherTrack(x, z, self)`
 * says whether a point is on another track (a mast never stands on one).
 * Returns the mesh (or null) and pushes colliders for the masts.
 */
export function buildRail(tracks, ground, otherTrack, colliders) {
  const b = new MeshBuilder();
  for (const t of tracks) {
    const dense = resample(t.points, SEG);
    if (dense.length < 2) continue;
    const half = t.gauge * 0.5;
    const bed = t.gauge + 1.7;                 // the ballast's top
    const toe = bed * 0.5 + 0.8;               // where its shoulder meets the ground
    const metre = t.kind === 'metre';
    let next = MAST_EVERY * 0.5, run = 0;

    for (let i = 1; i < dense.length; i++) {
      const a = dense[i - 1], c = dense[i];
      const dx = c[0] - a[0], dz = c[1] - a[1];
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
      const ga = ground(a[0], a[1]), gc = ground(c[0], c[1]);
      const P = (q, off, y) => [q[0] + nx * off, y, q[1] + nz * off];

      // the bed and its shoulders
      b.quad(P(a, -bed / 2, ga + BED), P(c, -bed / 2, gc + BED), P(c, bed / 2, gc + BED), P(a, bed / 2, ga + BED), BALLAST);
      b.quad(P(a, bed / 2, ga + BED), P(c, bed / 2, gc + BED), P(c, toe, gc - 0.05), P(a, toe, ga - 0.05), SHOULDER);
      b.quad(P(a, -toe, ga - 0.05), P(c, -toe, gc - 0.05), P(c, -bed / 2, gc + BED), P(a, -bed / 2, ga + BED), SHOULDER);

      // sleepers, laid across
      const sl = t.gauge + 0.95;
      for (let s = (run % SLEEPER_EVERY); s < len; s += SLEEPER_EVERY) {
        const q = [a[0] + ux * s, a[1] + uz * s];
        const y = ga + (gc - ga) * (s / len) + BED + 0.05;
        const ex = ux * 0.13, ez = uz * 0.13;
        b.quad(
          [q[0] - nx * sl / 2 - ex, y, q[1] - nz * sl / 2 - ez], [q[0] - nx * sl / 2 + ex, y, q[1] - nz * sl / 2 + ez],
          [q[0] + nx * sl / 2 + ex, y, q[1] + nz * sl / 2 + ez], [q[0] + nx * sl / 2 - ex, y, q[1] + nz * sl / 2 - ez],
          metre ? SLEEPER_METRE : SLEEPER,
        );
      }
      run += len;

      // the rails: a running face and the web inside it
      for (const side of [-1, 1]) {
        const o = side * half;
        const y0a = ga + BED + 0.06, y0c = gc + BED + 0.06, y1a = y0a + 0.16, y1c = y0c + 0.16;
        b.quad(P(a, o - 0.04, y1a), P(c, o - 0.04, y1c), P(c, o + 0.04, y1c), P(a, o + 0.04, y1a), RAIL_TOP);
        b.quad(P(a, o - side * 0.04, y0a), P(c, o - side * 0.04, y0c), P(c, o - side * 0.04, y1c), P(a, o - side * 0.04, y1a), RAIL_SIDE);
      }

      if (!t.electrified) continue;
      // the contact wire over the middle of the track
      b.quad(P(a, -0.03, ga + BED + WIRE_Y), P(c, -0.03, gc + BED + WIRE_Y), P(c, 0.03, gc + BED + WIRE_Y), P(a, 0.03, ga + BED + WIRE_Y), WIRE);

      // a mast and its cantilever, on whichever side is not another track
      const s0 = run - len;
      while (next <= run) {
        const k = (next - s0) / len;
        const q = [a[0] + dx * k, a[1] + dz * k];
        const g = ga + (gc - ga) * k;
        for (const side of [1, -1]) {
          const mx = q[0] + nx * side * MAST_OUT, mz = q[1] + nz * side * MAST_OUT;
          if (otherTrack(mx, mz, t)) continue;
          const rot = Math.atan2(nz * side, nx * side);
          b.box(mx, g, mz, 0.32, MAST_H, 0.32, MAST, rot);
          // the arm out over the track, and the dropper to the wire
          b.box(mx - nx * side * MAST_OUT * 0.5, g + BED + WIRE_Y + 1.1, mz - nz * side * MAST_OUT * 0.5, MAST_OUT + 0.4, 0.12, 0.12, MAST, rot);
          b.box(q[0], g + BED + WIRE_Y, q[1], 0.06, 1.1, 0.06, MAST, rot);
          colliders.push({ type: 'circle', x: mx, z: mz, r: 0.3, tag: 'rail-mast' });
          break;
        }
        next += MAST_EVERY;
      }
    }
  }
  return b.isEmpty ? null : b.toMesh('Rail', { receiveShadow: true, castShadow: false, doubleSided: true });
}
