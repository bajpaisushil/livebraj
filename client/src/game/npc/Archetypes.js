/**
 * Archetypes — who is in the street, and how each of them is dressed.
 *
 * This table used to live inside CrowdSystem, which was fine while the crowd
 * was the only thing made of people. It is not any more: a yajna ring and a
 * kirtan party are the same twelve Vrindavan archetypes sitting down, and if
 * the seated figures were authored separately they would drift — a gathering
 * of undressed grey people beside a street full of dhotis and saris is worse
 * than no gathering at all. So the palette, the tilak rules and everything
 * above the waist live here once, and each system asks for the pose it needs.
 *
 * Everything is authored feet-at-origin, Y-up, with every dimension multiplied
 * by `t.scale`, and returned as a raw BufferGeometry for an InstancedMesh —
 * one shared vertex-coloured Lambert material covers the lot.
 */

import { MeshBuilder } from '../../engine/render/MeshBuilder.js';

/** Pedestrian archetypes — silhouette and palette carry the variety. */
export const PEOPLE = [
  // Everyone here is dressed for Vrindavan, because in Vrindavan everyone is.
  // `dhoti` is the wrapped lower cloth the men wear; `sari` the draped one with
  // a pallu over the left shoulder; `tilak` the Vaishnava urdhva-pundra, two
  // pale clay lines up the forehead meeting at the bridge of the nose. Almost
  // nobody in this town is without one, which is most of why a street here does
  // not look like a street anywhere else.
  { id: 'pilgrim', cloth: 0xf2ece0, skin: 0xc99464, speed: 1.25, scale: 1.0,
    dhoti: 0xf6f2e8, tilak: 1, shawl: 0xe8d9b4 },
  { id: 'sadhu', cloth: 0xe8891f, skin: 0xa9743f, speed: 1.0, scale: 1.02, staff: true,
    dhoti: 0xe07a18, tilak: 1, beads: true, shaven: true },
  { id: 'sari', cloth: 0xc8452a, skin: 0xd8a878, speed: 1.15, scale: 0.94, sari: true,
    border: 0xc9a03c, tilak: 2, braid: true },
  { id: 'sari2', cloth: 0x2f5d5a, skin: 0xc99464, speed: 1.1, scale: 0.95, sari: true,
    border: 0xe8891f, tilak: 2, braid: true },
  { id: 'sari3', cloth: 0x7a4a86, skin: 0xd8a878, speed: 1.12, scale: 0.93, sari: true,
    border: 0xf5e8c8, tilak: 2, braid: true },
  { id: 'gopi', cloth: 0xe8891f, skin: 0xd8a878, speed: 1.2, scale: 0.92, sari: true,
    border: 0xc8452a, tilak: 2, braid: true },
  { id: 'widow', cloth: 0xf6f2e8, skin: 0xbf8f5f, speed: 0.92, scale: 0.9, sari: true,
    border: 0xe6dcc6, tilak: 2, beads: true },
  { id: 'shopkeeper', cloth: 0xe6dcc6, skin: 0xa9743f, speed: 1.05, scale: 1.0,
    dhoti: 0xf2ece0, tilak: 1 },
  { id: 'brahmachari', cloth: 0xf5a623, skin: 0xc99464, speed: 1.15, scale: 0.98,
    dhoti: 0xf5a623, tilak: 1, beads: true, shaven: true },
  { id: 'child', cloth: 0xc9a03c, skin: 0xd8a878, speed: 1.4, scale: 0.66, tilak: 1 },
  { id: 'priest', cloth: 0xf5a623, skin: 0xc99464, speed: 1.0, scale: 1.0,
    dhoti: 0xf6f2e8, tilak: 1, beads: true, thread: true },
  { id: 'porter', cloth: 0x8a7458, skin: 0x8a5a2f, speed: 1.0, scale: 1.02, load: true,
    dhoti: 0xd8cfbc, tilak: 1 },
];

/**
 * Where the waist sits, in metres before scaling.
 *
 * Every figure in this file is built around this one line: the standing body
 * puts it at 0.86 and the seated body at 0.34, and `upperBody` shifts by the
 * difference. Get it wrong and the head floats — so it is a constant, not a
 * number retyped in four places.
 */
const HIP_STAND = 0.86;
const HIP_SEAT = 0.38;

/**
 * Everything from the waist up — torso, drape, ornament, head, tilak.
 *
 * A person is recognisable as a Vrindavan person from the chest up and from
 * nothing else: the pallu, the tulsi beads, the sacred thread, the two clay
 * lines on the forehead. Standing or cross-legged, that half is identical, so
 * it is written once and moved to wherever the waist happens to be.
 */
function upperBody(b, t, s, hip) {
  const y = hip - HIP_STAND * s;

  // torso
  b.prism(0, 0.86 * s + y, 0, 0.27 * s, 0.17 * s, 0.37 * s, 0.21 * s, 0.5 * s, t.cloth);
  // the pallu over the left shoulder, with its border
  if (t.sari) {
    b.box(0.1 * s, 0.9 * s + y, 0.02 * s, 0.12 * s, 0.46 * s, 0.23 * s, t.cloth);
    if (t.border) b.box(0.1 * s, 0.70 * s + y, 0.02 * s, 0.13 * s, 0.06 * s, 0.24 * s, t.border);
  }
  // a shawl thrown over the shoulders against the morning
  if (t.shawl) b.box(0, 1.16 * s + y, 0, 0.30 * s, 0.10 * s, 0.24 * s, t.shawl);
  // tulsi beads, and the brahmin's sacred thread across the chest
  if (t.beads) b.box(0, 1.20 * s + y, 0.10 * s, 0.17 * s, 0.05 * s, 0.05 * s, 0xb9945e);
  if (t.thread) b.box(0.02 * s, 1.05 * s + y, 0.11 * s, 0.03 * s, 0.34 * s, 0.03 * s, 0xf6f2e8);
  // head
  b.bevelBox(0, 1.36 * s + y, 0, 0.19 * s, 0.24 * s, 0.2 * s, t.skin, 0, 0.3);
  // hair: a shaven head keeps only the sikha, women wear a braid down the back
  if (!t.shaven) b.box(0, 1.5 * s + y, -0.01 * s, 0.22 * s, 0.07 * s, 0.22 * s, 0x2b1d14);
  else b.box(0, 1.50 * s + y, -0.06 * s, 0.05 * s, 0.05 * s, 0.07 * s, 0x2b1d14);
  if (t.braid) b.prism(0, 1.05 * s + y, -0.11 * s, 0.07 * s, 0.04 * s, 0.05 * s, 0.03 * s, 0.42 * s, 0x2b1d14);

  // Tilak. Two pale clay lines rising up the forehead and meeting low at
  // the bridge of the nose — the urdhva-pundra. Style 2 adds the red bindu
  // between the brows. Three quads a head, and it is the single detail that
  // makes a crowd read as Vrindavan rather than as any town anywhere.
  if (t.tilak) {
    const fy = 1.40 * s + y, fz = 0.101 * s;
    b.box(-0.035 * s, fy, fz, 0.022 * s, 0.105 * s, 0.004 * s, 0xf3ece0);
    b.box(0.035 * s, fy, fz, 0.022 * s, 0.105 * s, 0.004 * s, 0xf3ece0);
    b.box(0, fy - 0.058 * s, fz, 0.088 * s, 0.020 * s, 0.004 * s, 0xf3ece0);
    if (t.tilak === 2) b.box(0, fy + 0.012 * s, fz, 0.024 * s, 0.024 * s, 0.004 * s, 0xc8452a);
  }
}

/**
 * Hands up in front of the chest — clapping, or holding kartals.
 *
 * The arm in this stylisation hangs from the waist line rather than from a
 * shoulder, which is why every number here is measured off `hip` and not off
 * the head. It looks wrong written down and right on screen.
 */
function armsRaised(b, t, s, hip) {
  for (const sx of [-1, 1]) {
    b.prism(sx * 0.21 * s, hip - 0.10 * s, 0, 0.085 * s, 0.085 * s, 0.115 * s, 0.115 * s, 0.10 * s, t.skin);
    b.box(sx * 0.16 * s, hip - 0.06 * s, 0.15 * s, 0.10 * s, 0.30 * s, 0.11 * s, t.skin);
    b.box(sx * 0.12 * s, hip + 0.22 * s, 0.17 * s, 0.12 * s, 0.10 * s, 0.12 * s, t.skin);
  }
}

/**
 * A pedestrian on their feet. `arms` is 'down' for walking — the crowd — or
 * 'raised' for someone singing along at the back of a kirtan.
 */
export function buildStanding(t, arms = 'down') {
  const b = new MeshBuilder();
  const s = t.scale;
  const hip = HIP_STAND * s;
  const lower = t.sari ? t.cloth : (t.dhoti || 0xefe8d8);
  // legs — bare below the knee for a dhoti, covered to the ankle for a sari
  b.prism(-0.09 * s, 0, 0, 0.10 * s, 0.11 * s, 0.14 * s, 0.14 * s, 0.86 * s,
    t.sari ? lower : t.skin);
  b.prism(0.09 * s, 0, 0, 0.10 * s, 0.11 * s, 0.14 * s, 0.14 * s, 0.86 * s,
    t.sari ? lower : t.skin);
  // the dhoti itself: wrapped at the waist, falling to mid-calf
  if (!t.sari) {
    b.prism(0, 0.30 * s, 0, 0.20 * s, 0.17 * s, 0.26 * s, 0.22 * s, 0.60 * s, lower);
  }
  // the sari's lower border, the line of colour at the hem
  if (t.sari && t.border) {
    b.box(-0.09 * s, 0.04 * s, 0, 0.15 * s, 0.07 * s, 0.16 * s, t.border);
    b.box(0.09 * s, 0.04 * s, 0, 0.15 * s, 0.07 * s, 0.16 * s, t.border);
  }

  upperBody(b, t, s, hip);

  if (arms === 'raised') {
    armsRaised(b, t, s, hip);
  } else {
    // arms seated against the torso, tapering to the wrist
    b.prism(-0.20 * s, 0.40 * s, 0, 0.075 * s, 0.075 * s, 0.115 * s, 0.115 * s, 0.46 * s, t.skin);
    b.prism(0.20 * s, 0.40 * s, 0, 0.075 * s, 0.075 * s, 0.115 * s, 0.115 * s, 0.46 * s, t.skin);
  }

  if (t.staff) b.box(0.3 * s, 0.4 * s, 0, 0.05 * s, 1.9 * s, 0.05 * s, 0x8a6a42);
  if (t.load) b.box(0, 1.62 * s, 0, 0.5 * s, 0.3 * s, 0.4 * s, 0xa88a5c);
  return b.build();
}

/**
 * The same person cross-legged on the ground — sukhasana, which is how anyone
 * sits at a havan, a kirtan or a katha and is the only way most of these
 * figures will ever be seen.
 *
 * `hands` is 'lap' (resting on the knees), 'raised' (clapping or kartals),
 * 'offer' (right arm out, feeding the fire) or 'drum' (both hands on a
 * mridanga). `prop` adds the instrument itself. The staff and the head-load
 * are dropped: nobody sits down with a sack on their head.
 */
export function buildSeated(t, hands = 'lap', prop = null) {
  const b = new MeshBuilder();
  const s = t.scale;
  const hip = HIP_SEAT * s;
  const lower = t.sari ? t.cloth : (t.dhoti || 0xefe8d8);
  const shin = t.sari ? lower : t.skin;

  // The seat: hips and the cloth pooled under them, rising exactly to the waist
  // line so the torso has something to sit on and never floats. It tapers
  // inward going up — a straight column of the same width reads as a plinth
  // with a person standing on it, which is what the first pass looked like.
  b.prism(0, 0, 0, 0.30 * s, 0.28 * s, 0.28 * s, 0.20 * s, hip, lower);
  // Thighs splayed forward and out to a knee, shins crossed in front of them.
  // The knees are what make it read: sukhasana is a triangle seen from any
  // side, and without them the silhouette is a box.
  b.box(-0.19 * s, 0.03 * s, 0.16 * s, 0.21 * s, 0.18 * s, 0.46 * s, lower, 0.62);
  b.box(0.19 * s, 0.03 * s, 0.16 * s, 0.21 * s, 0.18 * s, 0.46 * s, lower, -0.62);
  b.box(-0.30 * s, 0.02 * s, 0.29 * s, 0.20 * s, 0.19 * s, 0.20 * s, lower);
  b.box(0.30 * s, 0.02 * s, 0.29 * s, 0.20 * s, 0.19 * s, 0.20 * s, lower);
  b.box(0, 0.02 * s, 0.33 * s, 0.56 * s, 0.15 * s, 0.18 * s, shin);
  // the sari's border again, where the hem gathers over the crossed feet
  if (t.sari && t.border) b.box(0, 0, 0.33 * s, 0.58 * s, 0.055 * s, 0.195 * s, t.border);

  upperBody(b, t, s, hip);

  if (hands === 'raised') {
    armsRaised(b, t, s, hip);
  } else if (hands === 'offer') {
    // left hand on the knee, right arm out over the kund with a fistful of
    // samagri — the one posture that says this fire is being fed, not lit
    b.prism(-0.20 * s, hip - 0.17 * s, 0, 0.085 * s, 0.085 * s, 0.115 * s, 0.115 * s, 0.17 * s, t.skin);
    b.box(-0.20 * s, hip - 0.21 * s, 0.14 * s, 0.105 * s, 0.105 * s, 0.30 * s, t.skin);
    b.prism(0.20 * s, hip - 0.12 * s, 0, 0.085 * s, 0.085 * s, 0.115 * s, 0.115 * s, 0.12 * s, t.skin);
    b.box(0.14 * s, hip - 0.04 * s, 0.28 * s, 0.10 * s, 0.10 * s, 0.42 * s, t.skin);
    b.box(0.14 * s, hip - 0.02 * s, 0.50 * s, 0.10 * s, 0.08 * s, 0.10 * s, 0xd8c48a);
  } else if (hands === 'drum') {
    b.box(-0.26 * s, hip - 0.22 * s, 0.16 * s, 0.10 * s, 0.10 * s, 0.28 * s, t.skin);
    b.box(0.26 * s, hip - 0.22 * s, 0.16 * s, 0.10 * s, 0.10 * s, 0.28 * s, t.skin);
  } else {
    // hands on the knees
    b.prism(-0.20 * s, hip - 0.17 * s, 0, 0.085 * s, 0.085 * s, 0.115 * s, 0.115 * s, 0.17 * s, t.skin);
    b.prism(0.20 * s, hip - 0.17 * s, 0, 0.085 * s, 0.085 * s, 0.115 * s, 0.115 * s, 0.17 * s, t.skin);
    b.box(-0.20 * s, hip - 0.21 * s, 0.14 * s, 0.105 * s, 0.105 * s, 0.30 * s, t.skin);
    b.box(0.20 * s, hip - 0.21 * s, 0.14 * s, 0.105 * s, 0.105 * s, 0.30 * s, t.skin);
  }

  if (prop === 'mridanga') {
    // the barrel lies across the lap, pale head at each end, strap over the
    // shoulder — the drum that carries every kirtan in this town
    b.box(0, hip - 0.20 * s, 0.26 * s, 0.62 * s, 0.22 * s, 0.22 * s, 0x7a4a26);
    b.box(-0.31 * s, hip - 0.21 * s, 0.26 * s, 0.05 * s, 0.24 * s, 0.24 * s, 0xe6dcc6);
    b.box(0.31 * s, hip - 0.21 * s, 0.26 * s, 0.05 * s, 0.24 * s, 0.24 * s, 0xe6dcc6);
    b.box(0, hip - 0.02 * s, 0.10 * s, 0.06 * s, 0.26 * s, 0.06 * s, 0xc8452a);
  } else if (prop === 'kartal') {
    b.box(-0.12 * s, hip + 0.28 * s, 0.22 * s, 0.11 * s, 0.11 * s, 0.022 * s, 0xc9a03c);
    b.box(0.12 * s, hip + 0.28 * s, 0.22 * s, 0.11 * s, 0.11 * s, 0.022 * s, 0xc9a03c);
  }

  return b.build();
}
