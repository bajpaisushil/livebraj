/**
 * PropScatter — vegetation, street furniture and the pickable flowers.
 *
 * 5,138 trees would be 5,138 draw calls if built naively. Each species is built
 * once as a merged template and drawn as a single InstancedMesh, so the whole
 * canopy of Vrindavan costs seven draw calls.
 *
 * Flowers are the exception: they are individually interactive, so they get real
 * meshes — but only 354 of them, and they are placed by intent (temple
 * courtyards, groves, the riverbank) rather than scattered by noise.
 */

import * as THREE from 'three';
import { WORLD_DETAIL, PLANTING } from '../../content/tuning.js';
import { WORLD } from '../../content/world.generated.js';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { rngAt, pick, range, rangeInt, chance } from '../../engine/math/Random.js';
import { resample } from '../../engine/math/Curves.js';
import { TAU } from '../../engine/math/MathUtils.js';

/** How far a tree must stand off the nearest road centreline, in metres. */
const TREE_CLEAR = 7.5;

/** The same for a bush, which is smaller and may come a little closer. */
const BUSH_CLEAR = 6.5;

/**
 * How wide a bush stands on the ground at scale 1, in metres.
 *
 * Not a tuning knob: it is read off the geometry. bushGeometry builds its main
 * dome at a radius of 0.48–0.56 and the per-side wobble carries the widest
 * vertex out to about 0.6, which is what the built bounding boxes measure. It
 * is here so the planting can ask whether a bush fits somewhere.
 */
const BUSH_FOOT = 0.6;

/** The town centre, in world metres — greenery thins away from it. */
const TOWN = { x: 0, z: 0 };

/**
 * Road kinds that get a planted verge.
 *
 * Not a street and not a gali. BuildingGenerator's ROAD_LOT stands a street's
 * frontage 2.2 m back from the kerb and a gali's 1.3 m, and this pass plants
 * at 1.6–3.0 m — so a hedge on either would be growing out of shopfronts.
 * The four below stand theirs back 3.6 m (main), 4.5 m (parikrama) and 5.5 m
 * (highway), and trunk carries no frontage at all, so there is room between
 * kerb and wall for something to grow in.
 *
 * Main is the tight one: 3.0 m of offset plus a bush's own 0.6 m reaches
 * 3.6 m exactly. That is why `plant` asks the world whether the spot is clear
 * rather than trusting this list — but keep the list as it is anyway, because
 * a clear-spot test only drops the bush, it does not make a street verge look
 * like anything but gaps.
 */
const VERGE_ROADS = new Set(['trunk', 'highway', 'main', 'parikrama']);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Hand the browser a frame, so a long build does not read as a hung tab. */
const breathe = () => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * Scatter everything that grows or stands beside the road.
 *
 * Async, and it yields between passes. It used to do the lot in one
 * synchronous block, which was fine at 4.2 km square and is not at 9.2 x 4.8:
 * on a mid-range phone that block ran for fourteen seconds with the browser
 * unable to paint or accept a touch. A tab that unresponsive is one a mobile
 * browser may simply kill, which is what "it works on the laptop but not on
 * the phone" turned out to mean. The work is the same; it is now interruptible.
 */
export async function buildProps(ctx, terrain) {
  const group = new THREE.Group();
  group.name = 'Props';
  const colliders = [];

  const trees = buildTrees(ctx, terrain, group);
  await breathe();
  buildGroundCover(ctx, terrain, group);
  await breathe();
  buildStreetFurniture(ctx, terrain, group, colliders);
  await breathe();
  const flowers = buildFlowers(ctx, terrain, group);

  let t = 0;
  return {
    group,
    colliders,
    flowers,
    update(dt, c) {
      // the lamps come up as the light goes, whatever the quality tier
      if (lampBulbs) {
        const phase = c.time ? c.time.phase : 'day';
        const want = phase === 'night' ? 1.6 : phase === 'evening' ? 1.1 : 0;
        const cur = lampBulbs.material.emissiveIntensity;
        lampBulbs.material.emissiveIntensity = cur + (want - cur) * Math.min(1, dt * 1.5);
      }
      if (c.quality.tier === 'low') return;
      t += dt;
      // a slow shared sway; per-flower phase comes from its index
      for (let i = 0; i < flowers.length; i++) {
        const f = flowers[i];
        if (f.picked || !f.mesh.visible) continue;
        f.mesh.rotation.z = Math.sin(t * 1.1 + i * 0.7) * 0.055;
      }
      for (const fl of trees.flags) {
        fl.rotation.y = fl.userData.base + Math.sin(t * 1.6 + fl.userData.phase) * 0.22;
      }
    },
  };
}

/* ================================================================
 * Trees
 * ================================================================ */

/** Species templates. Each returns a merged geometry built around the origin. */
const SPECIES = {
  peepal: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 7, 11);
    trunk(b, h * 0.52, 0.34, 0xa89878, rng);
    // layered heart-leaf puffs
    for (let i = 0; i < 5; i++) {
      const y = h * 0.52 + i * h * 0.1;
      const r = (1 - Math.abs(i - 1.6) / 3.4) * h * 0.46;
      blob(b, 0, y, 0, Math.max(1.4, r * 1.15), h * 0.2, 0x3f8f2e, rng, 0.14);
    }
    return b;
  },
  banyan: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 6, 9);
    trunk(b, h * 0.45, 0.58, 0x8d7a5e, rng);
    for (let i = 0; i < 4; i++) {
      const y = h * 0.45 + i * h * 0.11;
      blob(b, 0, y, 0, h * 0.7 * (1 - i * 0.12), h * 0.24, 0x2f7a26, rng, 0.2);
    }
    // aerial prop roots — the detail that makes a banyan a banyan
    for (let i = 0; i < 7; i++) {
      const a = rng() * TAU, r = range(rng, h * 0.22, h * 0.5);
      b.box(Math.cos(a) * r, 0, Math.sin(a) * r, 0.13, h * 0.45, 0.13, 0x7a6a50);
    }
    return b;
  },
  neem: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 6, 9);
    trunk(b, h * 0.55, 0.26, 0x9a8a6a, rng);
    for (let i = 0; i < 3; i++) {
      blob(b, 0, h * 0.58 + i * h * 0.13, 0, h * 0.36 * (1 - i * 0.18), h * 0.23, 0x57a336, rng, 0.1);
    }
    return b;
  },
  mango: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 6, 9);
    trunk(b, h * 0.48, 0.32, 0x8a6a48, rng);
    blob(b, 0, h * 0.5, 0, h * 0.52, h * 0.44, 0x2f7a2a, rng, 0.12);
    blob(b, 0, h * 0.74, 0, h * 0.34, h * 0.26, 0x46963a, rng, 0.12);
    return b;
  },
  amla: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 5, 7.5);
    trunk(b, h * 0.5, 0.26, 0x9a7a52, rng);
    blob(b, 0, h * 0.54, 0, h * 0.42, h * 0.38, 0xb8873b, rng, 0.16);
    blob(b, 0, h * 0.74, 0, h * 0.26, h * 0.22, 0xc99a44, rng, 0.16);
    return b;
  },
  kadamb: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 6, 9.5);
    trunk(b, h * 0.5, 0.3, 0x9c8a68, rng);
    blob(b, 0, h * 0.52, 0, h * 0.5, h * 0.42, 0x3f9430, rng, 0.08);
    // orange ball flowers
    for (let i = 0; i < 9; i++) {
      const a = rng() * TAU, r = h * range(rng, 0.2, 0.4);
      const y = h * range(rng, 0.55, 0.85);
      blob(b, Math.cos(a) * r, y, Math.sin(a) * r, 0.26, 0.26, 0xe8a02c, rng, 0);
    }
    return b;
  },
  tamal: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 4.5, 7);
    // deliberately crooked: two leaning segments
    const lean = range(rng, 0.2, 0.55), a = rng() * TAU;
    b.box(0, 0, 0, 0.3, h * 0.3, 0.3, 0x5a4634);
    b.box(Math.cos(a) * lean, h * 0.3, Math.sin(a) * lean, 0.26, h * 0.3, 0.26, 0x5a4634);
    blob(b, Math.cos(a) * lean * 1.6, h * 0.6, Math.sin(a) * lean * 1.6,
      h * 0.44, h * 0.34, 0x2a6b22, rng, 0.18);
    return b;
  },
  palm: (rng) => {
    const b = new MeshBuilder();
    const h = range(rng, 8, 13);
    for (let i = 0; i < 6; i++) {
      b.box(0, (h * 0.85 * i) / 6, 0, 0.3 - i * 0.02, h * 0.15, 0.3 - i * 0.02, 0x8a7a5e);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const r = range(rng, 1.6, 2.4);
      b.box(Math.cos(a) * r * 0.5, h * 0.86, Math.sin(a) * r * 0.5,
        r, 0.1, 0.5, 0x5d7a38, a);
    }
    return b;
  },
  tulsi: (rng) => {
    const b = new MeshBuilder();
    // grown in a raised pot, as at every temple door
    b.box(0, 0, 0, 0.9, 0.7, 0.9, 0xb0603a);
    b.box(0, 0.7, 0, 1.05, 0.14, 1.05, 0xc07a4a);
    for (let i = 0; i < 6; i++) {
      const a = rng() * TAU, r = range(rng, 0.1, 0.32);
      blob(b, Math.cos(a) * r, 0.84 + rng() * 0.3, Math.sin(a) * r, 0.34, 0.3, 0x4f7a3a, rng, 0.1);
    }
    return b;
  },
};

function trunk(b, h, r, color, rng) {
  const SEG = 3;
  let px = 0, pz = 0;
  for (let i = 0; i < SEG; i++) {
    const y = (h * i) / SEG;
    const lean = range(rng, -0.12, 0.12);
    b.box(px, y, pz, r * (1 - i * 0.14), h / SEG, r * (1 - i * 0.14), color);
    px += lean; pz += range(rng, -0.12, 0.12);
  }
}

/** A faceted mass that reads as foliage without alpha-tested cards. */
function blob(b, cx, cy, cz, r, h, color, rng, jitter) {
  const SIDES = 6, RINGS = 3;
  const c = new THREE.Color(color);
  let prev = null, first = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const rr = Math.sin(t * Math.PI) * r + r * 0.18;
    const y = cy + (t - 0.5) * h * 2;
    const ring = [];
    for (let s = 0; s < SIDES; s++) {
      const a = (s / SIDES) * TAU;
      const j = 1 + (jitter ? (rng() - 0.5) * jitter * 2 : 0);
      ring.push([cx + Math.cos(a) * rr * j, y, cz + Math.sin(a) * rr * j]);
    }
    if (prev) {
      for (let s = 0; s < SIDES; s++) {
        const n = (s + 1) % SIDES;
        // darker underside, lighter crown: cheap fake ambient occlusion
        const shade = c.clone().multiplyScalar(0.72 + t * 0.5).getHex();
        /*
         * OUTWARD. Trees are drawn single-sided and these were wound to face
         * the inside of the ring, so every canopy in town showed the inner
         * wall of its far side, lit backwards — the flat, dark look.
         */
        b.quad(prev[s], ring[s], ring[n], prev[n], shade);
      }
    }
    if (i === 0) first = ring;
    prev = ring;
  }
  // and closed at both ends, which it never needed while it was inside out:
  // from under a tree you would now look straight up through the hole
  const lo = c.clone().multiplyScalar(0.72).getHex(), hi = c.clone().multiplyScalar(1.22).getHex();
  const yb = first[0][1] - h * 0.12, yt = prev[0][1] + h * 0.12;
  for (let s = 0; s < SIDES; s++) {
    const n = (s + 1) % SIDES;
    b.tri(first[s][0], first[s][1], first[s][2], first[n][0], first[n][1], first[n][2], cx, yb, cz, lo);
    b.tri(prev[n][0], prev[n][1], prev[n][2], prev[s][0], prev[s][1], prev[s][2], cx, yt, cz, hi);
  }
}

/**
 * A closed dome — the unit a bush is built from.
 *
 * blob() is right for a canopy ten metres up: it is open at the crown and open
 * at the base, and nobody ever sees either. A bush is waist high and you look
 * down on it, so blob's crown was a visible hole, and its per-vertex jitter
 * gave a ragged outline. Two small jittered blobs, which is what a bush was,
 * read as a lump of moss lying on the grass.
 *
 * This caps the crown, keeps the outline clean, and ramps the colour up the
 * height — yellow-green where the light lands, deep blue-green underneath.
 * That ramp is most of what makes RPG foliage read as foliage at a glance.
 *
 * `h` is the FULL height above the base ring, where blob's is the half-height.
 */
function dome(b, cx, cy, cz, r, h, under, crown, sides, rings, rng, wobble) {
  const lo = new THREE.Color(under), hi = new THREE.Color(crown);
  const mix = new THREE.Color();

  // One radius multiplier per side, shared by every ring up the dome. Jittering
  // each vertex on its own is what makes blob() ragged; varying the side and
  // not the ring keeps a clean round silhouette and still stops a hedge being
  // a row of identical circles.
  const wob = [];
  for (let s = 0; s < sides; s++) wob.push(1 + (rng() - 0.5) * wobble * 2);

  // Widest a third of the way up, not at the middle: a mass that bulges low
  // sits on the ground, and one that bulges at the middle floats above it.
  // The 0.8 sets how fast it closes — 0.72 left the top ring so narrow that
  // the crown fan came to a visible point and the bush looked like a tent.
  const radiusAt = (t) => {
    const k = (t - 0.3) / 0.8;
    return r * Math.sqrt(Math.max(0.04, 1 - k * k));
  };

  let prev = null;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const rr = radiusAt(t);
    const y = cy + t * h * 0.82;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * TAU;
      ring.push([cx + Math.cos(a) * rr * wob[s], y, cz + Math.sin(a) * rr * wob[s]]);
    }
    if (prev) {
      // The ramp starts a fifth of the way along rather than at the bottom.
      // Running it from nothing put a near-black collar round the foot of
      // every bush, because the lowest band is the one that faces you.
      const shade = mix.copy(lo).lerp(hi, 0.2 + 0.8 * (t - 0.5 / rings)).getHex();
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prev[s], prev[n], ring[n], ring[s], shade);
      }
    }
    prev = ring;
  }

  // The crown, as a fan to a single apex. It costs one triangle per side and it
  // is the difference between a mass and a shell you can see the inside of.
  const ax = cx, ay = cy + h, az = cz;
  const top = hi.getHex();
  for (let s = 0; s < sides; s++) {
    const n = (s + 1) % sides;
    b.tri(prev[s][0], prev[s][1], prev[s][2], prev[n][0], prev[n][1], prev[n][2], ax, ay, az, top);
  }
}

/**
 * Inside a landmark's walled compound? Such a campus is paved and planted by
 * its own builder — Krishna Balaram's is marble from fence to fence — so the
 * scatter's grass, bushes and imported trees stay out of it. The compound is
 * a rectangle in the landmark's box frame (see LandmarkGenerator).
 */
function compoundTest(ctx) {
  const list = ctx.data.LOCATIONS.filter((l) => l.compound).map((l) => ({
    x: l.pos[0], z: l.pos[1], cs: Math.cos(l.rot), sn: Math.sin(l.rot), c: l.compound }));
  return (x, z) => list.some((k) => {
    const dx = x - k.x, dz = z - k.z;
    const lx = dx * k.cs + dz * k.sn, lz = -dx * k.sn + dz * k.cs;
    return [k.c, ...(k.c.also || [])].some((q) => lx > q.lx0 && lx < q.lx1 && lz > q.lz0 && lz < q.lz1);
  });
}

function buildTrees(ctx, terrain, group) {
  const inCompound = compoundTest(ctx);
  const detail = ctx.quality.treeDetail;
  const keep = detail >= 2 ? 1.0 : detail === 1 ? 0.75 : 0.45;
  // An InstancedMesh culls as one object, so a single mesh holding every peepal
  // in Vrindavan is never culled at all. Bucketing by chunk as well as species
  // keeps the draw calls low and lets the frustum do its job.
  const CHUNK = 420;

  const byKind = new Map();

  /**
   * A temple you can walk into is a room, and a tree standing in one is a tree
   * growing through the floor.
   *
   * This only started to matter when the first courtyard interior went in:
   * before that the temples were solid masses and anything inside them was
   * simply never seen. OSM does have a node for the tamal in Krishna Balaram's
   * courtyard — correctly, and the courtyard now models that tree itself, so
   * the imported one would be the same tree drawn twice and floating above its
   * own verandah roof. Only builders that publish an interior volume are
   * covered, which today is exactly one building.
   */
  const rooms = (ctx.world && ctx.world.landmarks && ctx.world.landmarks.interiors) || {};
  const indoors = (x, z) => {
    for (const k in rooms) {
      const v = rooms[k];
      const dx = x - v.x, dz = z - v.z;
      const c = Math.cos(-v.rot), sn = Math.sin(-v.rot);
      if (Math.abs(dx * c - dz * sn) < v.hw && Math.abs(dx * sn + dz * c) < v.hd) return true;
    }
    return false;
  };

  /**
   * Trees are authored blind and filtered here.
   *
   * content/flora.js scatters them from a seed with no idea where the roads
   * are — it cannot know, it is static content and the network comes from the
   * OSM import. So trees stood in the middle of Bhaktivedanta Swami Marg. The
   * road is only knowable at build time, which is here, so this is where a
   * tree in the carriageway gets dropped. A verge tree is wanted; a tree you
   * drive through is not.
   */
  let onRoad = 0;
  const inTheWay = (x, z) => {
    const surf = terrain.surfaceAt(x, z);
    if (surf === 'road' || surf === 'stone' || surf === 'gali') return true;
    // and a trunk's worth of clearance beyond the kerb
    return terrain.roadDistance(x, z) < TREE_CLEAR;
  };

  for (let i = 0; i < ctx.data.TREES.length; i++) {
    const t = ctx.data.TREES[i];
    if (inCompound(t.pos[0], t.pos[1])) continue;
    if ((i % 100) / 100 >= keep) continue;
    if (indoors(t.pos[0], t.pos[1])) continue;
    if (inTheWay(t.pos[0], t.pos[1])) { onRoad++; continue; }
    const key = t.kind + '|' + Math.floor(t.pos[0] / CHUNK) + ',' + Math.floor(t.pos[1] / CHUNK);
    let arr = byKind.get(key);
    if (!arr) { arr = []; byKind.set(key, arr); }
    arr.push(t);
  }

  if (onRoad) console.info(`[props] ${onRoad} trees dropped from the carriageway`);

  let total = 0;
  for (const [key, list] of byKind) {
    const kind = key.split('|')[0];
    const maker = SPECIES[kind] || SPECIES.neem;
    // three variants per species so a row of trees is not a row of clones
    const nVar = list.length > 24 ? 3 : 1;
    const variants = Array.from({ length: nVar }, (_, v) => maker(rngAt(`${kind}-${v}`)).build());
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });

    const perVariant = Array.from({ length: nVar }, () => []);
    for (let i = 0; i < list.length; i++) perVariant[i % nVar].push(list[i]);

    variants.forEach((geo, v) => {
      const items = perVariant[v];
      if (!items.length) { geo.dispose(); return; }
      const inst = new THREE.InstancedMesh(geo, mat, items.length);
      inst.name = `Trees_${key}_${v}`;
      inst.castShadow = !!ctx.quality.shadows && kind !== 'tulsi';
      inst.receiveShadow = true;
      inst.frustumCulled = true;

      for (let i = 0; i < items.length; i++) {
        const t = items[i];
        const y = terrain.sampleHeight(t.pos[0], t.pos[1]);
        _p.set(t.pos[0], y - 0.15, t.pos[1]);
        _q.setFromAxisAngle(_up, (i * 2.399) % TAU);
        const sc = t.scale * (t.grove ? 0.8 : 1);
        _s.set(sc, sc * range(rngAt(i + v * 7919), 0.9, 1.15), sc);
        _m.compose(_p, _q, _s);
        inst.setMatrixAt(i, _m);
      }
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
      total += items.length;
    });
  }

  console.info(`[props] ${total} trees in ${byKind.size} buckets`);
  return { flags: [] };
}


/* ================================================================
 * Ground cover — grass tufts and bushes
 *
 * Nothing lifts a landscape as cheaply as grass. These are tiny crossed blades
 * and low shrubs, instanced per 120 m chunk so the frustum throws away all but
 * what is in front of you. They only grow where grass would actually grow: off
 * the carriageway, above the waterline, and away from building footprints.
 * ================================================================ */

function grassTuftGeometry(rng, blades) {
  const b = new MeshBuilder();
  for (let i = 0; i < blades; i++) {
    const a = rng() * TAU;
    const r = rng() * 0.16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 0.20 + rng() * 0.34;
    const lean = (rng() - 0.5) * 0.14;
    const w = 0.035 + rng() * 0.03;
    // a blade is a narrow tapered quad, dark at the root and bright at the tip
    const root = 0x3c5f24, tip = 0x79a83e;
    b.tri(x - w, 0, z, x + w, 0, z, x + lean, h, z + lean * 0.5, root);
    b.tri(x + w, 0, z, x + lean, h, z + lean * 0.5, x - w, 0, z, tip);
    b.tri(x, 0, z - w, x, 0, z + w, x + lean * 0.5, h * 0.86, z + lean, root);
  }
  return b.build();
}

/**
 * Foliage colour. Saturated, a little yellow at the crown where the sun lands,
 * falling to a deep blue-green underneath — the two ends of the ramp dome()
 * interpolates. Flat mid-green is what makes low-poly greenery look like felt.
 */
const LEAF_UNDER = 0x1d5c48, LEAF_CROWN = 0x8ac94c;
const BLOOM_UNDER = 0x1e553e, BLOOM_CROWN = 0x7cbe46;

/**
 * The bush kinds, and how many variants of each to build.
 *
 * Variants are the cheap half of not looking repetitive: the geometry is built
 * once per variant and instanced, so six of them cost six templates and no
 * extra draw calls beyond what a bucket already needs. The other half is done
 * per instance, in the scatter below.
 */
const BUSH_KINDS = [
  { kind: 'leafy', variants: 3 },
  { kind: 'flowering', variants: 2 },
  { kind: 'reed', variants: 1 },
];

/** What may stand anywhere, and what is fit for a planted verge. */
const WILD_KINDS = ['leafy', 'flowering', 'reed'];
const PLANTED_KINDS = ['leafy', 'flowering'];

function bushGeometry(rng, kind) {
  const b = new MeshBuilder();
  if (kind === 'reed') {
    // riverbank reeds — tall, thin, pale. Left alone: they were already right.
    for (let i = 0; i < 14; i++) {
      const a = rng() * TAU, r = rng() * 0.26;
      const h = 0.7 + rng() * 0.8;
      b.prism(Math.cos(a) * r, 0, Math.sin(a) * r, 0.045, 0.045, 0.012, 0.012, h, 0x9aa86a);
    }
    return b.build();
  }

  // One rounded mass with lobes pushed into its side. The lobes sit low and
  // half inside the main dome on purpose: a bush is one thing with bumps, not
  // a handful of balls stuck together. Roughly a metre at the crown once the
  // per-instance scale is on, which is waist height on a 1.7 m pilgrim — high
  // enough to walk behind, low enough to look like something you push through.
  const flowering = kind === 'flowering';
  const under = flowering ? BLOOM_UNDER : LEAF_UNDER;
  const crown = flowering ? BLOOM_CROWN : LEAF_CROWN;
  // Taller than it is wide per dome, and the lobes tucked in close. The first
  // cut had a wide mass with lobes pushed out to 1.2 of its radius, which from
  // a walking camera was a pancake: a bush wants to be about as tall as it is
  // across, or it reads as something spilt rather than something growing.
  const r = range(rng, 0.48, 0.56);
  const h = range(rng, 0.92, 1.06);
  dome(b, 0, 0, 0, r, h, under, crown, 8, 3, rng, 0.10);

  const lobes = flowering ? 2 : 3;
  const a0 = rng() * TAU;
  for (let i = 0; i < lobes; i++) {
    const a = a0 + (i / lobes) * TAU + range(rng, -0.35, 0.35);
    const d = r * range(rng, 0.46, 0.64);
    dome(b, Math.cos(a) * d, 0, Math.sin(a) * d,
      r * range(rng, 0.62, 0.78), h * range(rng, 0.70, 0.88), under, crown, 6, 2, rng, 0.12);
  }

  if (flowering) {
    for (let i = 0; i < 5; i++) {
      const a = rng() * TAU, d = r * range(rng, 0.15, 0.62);
      // ride the dome's own profile down as the blossom moves out from the
      // centre, so the blooms lie on the foliage instead of hovering over it
      const u = d / r;
      const t = Math.min(1, 0.3 + 0.8 * Math.sqrt(Math.max(0, 1 - u * u)));
      const c = rng() < 0.5 ? 0xe8bc42 : 0xd8627a;
      dome(b, Math.cos(a) * d, t * h * 0.78, Math.sin(a) * d, 0.13, 0.17, c, c, 4, 1, rng, 0.2);
    }
  }
  return b.build();
}

function buildGroundCover(ctx, terrain, group) {
  const q = ctx.quality;
  // by now the world holds the ghat treads, the landmarks and the buildings;
  // the props' own colliders go in after this returns, so nothing here sees itself
  const world = ctx.world;
  const density = q.tier === 'low' ? 0.35 : q.tier === 'mid' ? 0.7 : 1.0;
  const CHUNK = 120;
  /**
   * Bushes bucket on a coarser grid than grass, and not the same one.
   *
   * 120 m is right for 16,000 tufts: it is what lets the frustum throw away
   * everything behind you. It is wrong for 2,400 bushes — at that spacing a
   * bucket holds one or two of them, so every variant in it becomes an
   * InstancedMesh drawing a single bush and the scene fills up with objects
   * that cost more to cull than to draw. Three times the side is nine times
   * the bushes per bucket, and 2,400 bushes is so few triangles that the
   * coarser culling costs nothing to make up for it.
   */
  const BUSH_CHUNK = 360;

  // Trees and grass follow the playable rectangle. A square left the whole
  // Chhatikara corridor bare while the town had 6,000 trees.
  const B = WORLD.bounds;

  const rng = rngAt('ground-cover');
  const tuftGeos = [0, 1, 2].map((v) => grassTuftGeometry(rngAt('tuft' + v), 7));

  // Every variant of every kind in one flat list, with an index of which
  // entries belong to which kind. A bush picks its variant when it is placed
  // and the instancing loop buckets by that, rather than the index trick that
  // was here — which only worked while there were exactly three geometries.
  const bushGeos = [];
  const ofKind = new Map();
  for (const spec of BUSH_KINDS) {
    if (!ofKind.has(spec.kind)) ofKind.set(spec.kind, []);
    for (let v = 0; v < spec.variants; v++) {
      ofKind.get(spec.kind).push(bushGeos.length);
      bushGeos.push(bushGeometry(rngAt('bush-' + spec.kind + '-' + v), spec.kind));
    }
  }
  // kind first, then a variant within it, so adding variants changes how
  // repetitive a hedge looks and never how much of the world is reeds
  const pickBush = (r, kinds) => pick(r, ofKind.get(pick(r, kinds)));

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });

  // keep-out: landmark footprints
  const keepOut = ctx.data.LOCATIONS.map((l) => ({
    x: l.pos[0], z: l.pos[1], r: Math.max(l.build.w, l.build.d) * 0.55,
  }));
  const inCompound = compoundTest(ctx);
  const blocked = (x, z) => {
    for (const k of keepOut) {
      const dx = x - k.x, dz = z - k.z;
      if (dx * dx + dz * dz < k.r * k.r) return true;
    }
    return inCompound(x, z);
  };

  const tuftChunks = new Map();
  const bushChunks = new Map();

  /**
   * The bucket a bush at (x, z) belongs to.
   *
   * The lattice starts at the rectangle's corner, not at the origin: the world
   * runs x -7100..2100, so Math.floor(x / BUSH_CHUNK) * BUSH_CHUNK lands on a
   * different grid and the scattered bushes and the planted ones would end up
   * in separate buckets covering the same ground — twice the draw calls for
   * the same bushes. This is the square-world assumption that has bitten the
   * project twice, in its quietest form.
   */
  const bushKey = (x, z) => (
    (B.minX + Math.floor((x - B.minX) / BUSH_CHUNK) * BUSH_CHUNK) + ','
    + (B.minZ + Math.floor((z - B.minZ) / BUSH_CHUNK) * BUSH_CHUNK)
  );
  const intoBucket = (x, y, z, scale, variant) => {
    const key = bushKey(x, z);
    let arr = bushChunks.get(key);
    if (!arr) { arr = []; bushChunks.set(key, arr); }
    arr.push([x, y, z, scale, variant]);
  };
  // Grass thins with distance from the town.
  //
  // Extending the scatter to the new rectangle took grass from 13,695 tufts to
  // 35,819, and almost all of the new ones are in the Chhatikara corridor,
  // which is farmland you drive through. Full town density out there cost
  // fourteen seconds of frozen boot to decorate ground nobody inspects.
  const PER_CHUNK = Math.round(150 * density);

  for (let cz = B.minZ; cz < B.maxZ; cz += CHUNK) {
    for (let cx = B.minX; cx < B.maxX; cx += CHUNK) {
      // the groves are Vrindavan's; the corridor out to Chhatikara is fields
      const away = Math.hypot(cx, cz);
      if (away > WORLD_DETAIL.treeThinRadius && ((cx * 73856093) ^ (cz * 19349663)) % 3 !== 0) continue;
      const tufts = [];
      const bushes = [];
      // how built-up is this chunk? the town keeps its grass, the fields thin out
      const far = Math.hypot(cx - TOWN.x, cz - TOWN.z);
      const F = WORLD_DETAIL.greeneryFullRadius, T = WORLD_DETAIL.greeneryThinRadius;
      const thin = far < F ? 1 : far > T ? WORLD_DETAIL.greeneryThinnest
        : 1 - (1 - WORLD_DETAIL.greeneryThinnest) * ((far - F) / (T - F));
      const here = Math.max(8, Math.round(PER_CHUNK * thin));
      for (let n = 0; n < here; n++) {
        const x = cx + rng() * CHUNK;
        const z = cz + rng() * CHUNK;
        const y = terrain.sampleHeight(x, z);
        if (y < 0.25) continue;                       // not in the river
        if (blocked(x, z)) continue;
        const rd = terrain.roadDistance(x, z);
        // 4.5 m was inside the kerb of anything bigger than a lane: NH 44 is
        // 22 m wide, so its half-width alone is 11
        if (rd < BUSH_CLEAR) continue;
        const surf = terrain.surfaceAt(x, z);
        if (surf === 'water' || surf === 'stone' || surf === 'road' || surf === 'gali') continue;

        if (rng() < 0.9) tufts.push([x, y, z, 0.7 + rng() * 0.8]);
        else {
          /*
           * A bush IS tested against what is already standing here; grass is
           * not. The old argument — "a tuft lost to a wall is one of sixteen
           * thousand" — holds for grass and does not hold for a bush: a bush is
           * waist high and reads as an object, so one standing in a wall is
           * seen. Measured before this test: 58 of 4,006 bushes were inside a
           * solid, up to 2 m in. Sixteen thousand `isClear` calls for the grass
           * would cost something; sixteen hundred for the bushes does not.
           */
          const scale = 0.8 + rng() * 0.6;
          if (world && world.isClear && !world.isClear(x, z, BUSH_FOOT * scale)) continue;
          intoBucket(x, y, z, scale,
            pickBush(rng, rd < 30 ? PLANTED_KINDS : WILD_KINDS));
        }
      }
      if (tufts.length) tuftChunks.set(cx + ',' + cz, tufts);
    }
  }

  /** Put one bush where it was asked for, or refuse the spot. */
  const plant = (x, z, scale, kinds) => {
    const y = terrain.sampleHeight(x, z);
    if (blocked(x, z)) return false;
    /*
     * No `y < 0.25` test here, unlike the scatter above.
     *
     * That number reads as "not in the river" and is a poor proxy for it. The
     * ground is fbm noise about zero, so it dips under 0.25 across a good
     * third of Braj on land that is perfectly dry, and the first cut of this
     * pass lost four verge bushes in five to it. Asking for 'sand' instead is
     * the same mistake wearing a hat: the waterline is at -0.55 and sand runs
     * to 1.6 above it, which is most of the map again. The river is what
     * surfaceAt calls water — that is the one test that means what it says.
     */
    const surf = terrain.surfaceAt(x, z);
    if (surf === 'water' || surf === 'stone' || surf === 'road' || surf === 'gali') return false;
    /*
     * And nothing already standing here.
     *
     * The scatter can afford to skip this: it is 6.5 m off every centreline
     * and a tuft lost to a wall is one of sixteen thousand. The planting
     * cannot — the ring is aimed at a temple and the verge at a kerb, which is
     * exactly where the huts and shops are, and BuildingGenerator places them
     * from the road network without knowing this pass exists. Measured: of 375
     * planted bushes four stood inside a building solid, up to 0.76 m through
     * the wall, every one of them around a temple and not one on a verge —
     * which is the VERGE_ROADS argument above holding, though nothing was
     * checking it. With this test: two.
     *
     * Two and not none, and it is worth knowing why. isClear looks colliders
     * up in a grid keyed on their CENTRE and queries it at r + 6 m, so it sees
     * a hut and misses a fifty-metre compound wall whose centre is twenty-odd
     * metres up the road. Both survivors are that case — one against Banke
     * Bihari's wall, one against a ghat platform. Catching them wants an
     * extent-aware query, which belongs beside isClear in WorldService and not
     * in a copy of it here.
     *
     * By now the world holds the ghat treads, the landmarks and the buildings;
     * the props' own colliders are added after this pass returns, so nothing
     * here can see itself.
     */
    const w = ctx.world;
    if (w && w.isClear && !w.isClear(x, z, BUSH_FOOT * scale)) return false;
    intoBucket(x, y, z, scale, pickBush(rng, kinds));
    return true;
  };

  const planted = plantVerges(ctx, terrain, rng, plant, density);

  let nTuft = 0, nBush = 0;
  for (const [key, list] of tuftChunks) {
    const per = Math.ceil(list.length / tuftGeos.length);
    tuftGeos.forEach((geo, v) => {
      const items = list.filter((_, i) => i % tuftGeos.length === v);
      if (!items.length) return;
      const inst = new THREE.InstancedMesh(geo, mat, items.length);
      inst.name = 'Grass_' + key + '_' + v;
      inst.castShadow = false;
      inst.receiveShadow = true;
      items.forEach((it, i) => {
        _p.set(it[0], it[1], it[2]);
        _q.setFromAxisAngle(_up, (i * 2.399) % TAU);
        _s.set(it[3], it[3] * (0.8 + (i % 5) * 0.1), it[3]);
        _m.compose(_p, _q, _s);
        inst.setMatrixAt(i, _m);
      });
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
      nTuft += items.length;
    });
  }

  for (const [key, list] of bushChunks) {
    const buckets = new Map();
    for (const it of list) {
      let arr = buckets.get(it[4]);
      if (!arr) { arr = []; buckets.set(it[4], arr); }
      arr.push(it);
    }
    for (const [v, items] of buckets) {
      const inst = new THREE.InstancedMesh(bushGeos[v], mat, items.length);
      inst.name = 'Bush_' + key + '_' + v;
      inst.castShadow = !!ctx.quality.shadows;
      inst.receiveShadow = true;
      items.forEach((it, i) => {
        _p.set(it[0], it[1], it[2]);
        _q.setFromAxisAngle(_up, (i * 1.77) % TAU);
        // squash and stretch as well as turn. Two neighbours sharing a variant
        // and a heading is what a hedge of clones looks like; a few per cent
        // on each axis is enough to break it, and it is free.
        const sc = it[3];
        _s.set(sc * (0.94 + (i % 4) * 0.045), sc * (0.90 + (i % 3) * 0.085),
          sc * (0.94 + ((i + 2) % 4) * 0.045));
        _m.compose(_p, _q, _s);
        inst.setMatrixAt(i, _m);
      });
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
      nBush += items.length;
    }
  }

  console.info('[props] ' + nTuft + ' grass tufts, ' + nBush + ' bushes ('
    + planted.verge + ' on verges, ' + planted.ring + ' around landmark grounds)');
}

/**
 * The deliberate planting: road verges, and the ground around a landmark.
 *
 * Everything above is noise. It drops a bush wherever grass would grow and
 * BUSH_CLEAR then shoves it 6.5 m off the centreline, which on NH 44 — 22 m
 * wide, so 11 m of half-width — means the kerb is bare by construction and the
 * walk up to a temple is bare with it. A verge is not something noise produces;
 * somebody plants it. So this plants it.
 *
 * Everything lands in the same bush buckets the scatter uses, so a planted
 * verge adds instances to meshes that were being drawn anyway rather than
 * adding meshes of its own.
 */
function plantVerges(ctx, terrain, rng, plant, density) {
  let verge = 0, ring = 0;
  /*
   * A cheap phone gets less of this, but not proportionally less.
   *
   * Grass scales straight off the tier because there are sixteen thousand
   * tufts of it and nobody counts them. The verge and the temple ring are a
   * few hundred bushes in total and they are the whole point of this pass, so
   * scaling them the same way took them off the device the game is actually
   * built for. Thin them; do not take them away.
   */
  const thin = 0.45 + density * 0.55;

  for (const road of ctx.data.ROADS) {
    if (!VERGE_ROADS.has(road.kind)) continue;
    const pts = resample(road.points, PLANTING.vergeSpacing);

    for (let i = 1; i < pts.length; i++) {
      const [x, z] = pts[i];
      // Thin with distance from the town, the same way the grass does. The
      // Chhatikara corridor is farmland you drive past at sixty; a manicured
      // verge out there would be both wrong and thousands of bushes.
      const far = Math.hypot(x - TOWN.x, z - TOWN.z);
      const F = WORLD_DETAIL.greeneryFullRadius, T = WORLD_DETAIL.greeneryThinRadius;
      const town = PLANTING.vergeChanceTown, field = PLANTING.vergeChanceField;
      const p = far < F ? town : far > T ? field : town - (town - field) * ((far - F) / (T - F));
      if (!chance(rng, p * thin)) continue;

      const prev = pts[i - 1];
      let dx = x - prev[0], dz = z - prev[1];
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const side = rng() < 0.5 ? 1 : -1;
      const off = road.width * 0.5 + PLANTING.vergeOffset;
      const n = rangeInt(rng, PLANTING.vergeClump[0], PLANTING.vergeClump[1]);

      for (let k = 0; k < n; k++) {
        // a run along the kerb rather than one bush on its own: a verge is
        // something the eye follows, and a single shrub is litter
        const along = (k - (n - 1) * 0.5) * range(rng, PLANTING.vergeStep[0], PLANTING.vergeStep[1]);
        const o = off + range(rng, 0, 1.4);
        const px = x + dx * along - dz * o * side;
        const pz = z + dz * along + dx * o * side;
        if (plant(px, pz, range(rng, 0.85, 1.25), PLANTED_KINDS)) verge++;
      }
    }
  }

  for (const l of ctx.data.LOCATIONS) {
    // A walled compound gets its planting along the outside of its fence: a
    // ring round the pin would run straight through the campus.
    if (l.compound) {
      const c = l.compound, cs = Math.cos(l.rot), sn = Math.sin(l.rot);
      // a compound wedged into the bazaar has no ground round it to plant:
      // Radha Vallabh's ghera is "wall-to-wall town fabric", and a ring of
      // trees stood in the lane in front of its gate
      if (c.ring === false) continue;
      const P2 = (lx, lz) => [l.pos[0] + lx * cs - lz * sn, l.pos[1] + lx * sn + lz * cs];
      const per = 2 * ((c.lx1 - c.lx0) + (c.lz1 - c.lz0));
      const n = Math.max(6, Math.round(PLANTING.templeRing * thin * per / 120));
      for (let i = 0; i < n; i++) {
        if (chance(rng, PLANTING.templeRingGaps)) continue;
        let t = ((i + range(rng, -0.2, 0.2)) / n) * per;
        const off = range(rng, PLANTING.templeRingMargin[0], PLANTING.templeRingMargin[1]) * 0.5;
        let lx, lz;
        const W2 = c.lx1 - c.lx0, D2 = c.lz1 - c.lz0;
        if (t < W2) { lx = c.lx0 + t; lz = c.lz0 - off; }
        else if ((t -= W2) < D2) { lx = c.lx1 + off; lz = c.lz0 + t; }
        else if ((t -= D2) < W2) { lx = c.lx1 - t; lz = c.lz1 + off; }
        else { t -= W2; lx = c.lx0 - off; lz = c.lz1 - t; }
        const [px, pz] = P2(lx, lz);
        if (terrain.roadDistance(px, pz) < 5) continue;
        if (plant(px, pz, range(rng, 0.9, 1.3), PLANTED_KINDS)) ring++;
      }
      continue;
    }
    // Outside the compound wall where there is one, outside the footprint
    // otherwise — this is the same radius the scatter treats as keep-out, so
    // the ring sits just beyond it and never inside the courtyard.
    const r0 = Math.max(l.grounds || 0, Math.max(l.build.w, l.build.d) * 0.55);
    // never below six: a bare temple approach is what this pass exists to fix
    const n = Math.max(6, Math.round(PLANTING.templeRing * thin));
    const a0 = rng() * TAU;
    for (let i = 0; i < n; i++) {
      if (chance(rng, PLANTING.templeRingGaps)) continue;
      const a = a0 + (i / n) * TAU + range(rng, -0.08, 0.08);
      const rr = r0 + range(rng, PLANTING.templeRingMargin[0], PLANTING.templeRingMargin[1]);
      const px = l.pos[0] + Math.cos(a) * rr, pz = l.pos[1] + Math.sin(a) * rr;
      // where the ring crosses a road, that is the way in — leave it open
      if (terrain.roadDistance(px, pz) < 5) continue;
      if (plant(px, pz, range(rng, 0.9, 1.3), PLANTED_KINDS)) ring++;
    }
  }

  return { verge, ring };
}

/* ================================================================
 * Street furniture
 * ================================================================ */

function buildStreetFurniture(ctx, terrain, group, colliders) {
  const b = new MeshBuilder();
  const bulbs = new MeshBuilder();
  const rng = rngAt('street-furniture');
  const density = ctx.quality.props;
  const poles = [];
  /** [from, to] pairs for the thin wires that peel off to each building. */
  const drop = [];

  /*
   * NOT INSIDE A WALLED COMPOUND. A campus lights itself, and the town's
   * lamp posts and electric poles followed OSM's footpaths into Prem Mandir's
   * and put a pole with its wires on the Prem Bhavan's plaza. A post inside a
   * compound is still MADE — into a sink nobody draws, with colliders and
   * poles nobody keeps — so the random sequence every other post in the town
   * is drawn from comes out exactly as it did.
   */
  const inCompound = compoundTest(ctx);
  const sink = new MeshBuilder(), sinkC = [], sinkP = [], sinkD = [];
  for (const road of ctx.data.ROADS) {
    if (road.kind === 'path') continue;
    const spacing = road.kind === 'gali' ? 46 : road.kind === 'street' ? 40 : 30;
    const pts = resample(road.points, spacing);

    for (let i = 1; i < pts.length - 1; i++) {
      if (rng() > density * 0.55) continue;
      const [x, z] = pts[i];
      if (Math.abs(x) > 2050 || Math.abs(z) > 2050) continue;

      const prev = pts[i - 1];
      let dx = x - prev[0], dz = z - prev[1];
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const side = rng() < 0.5 ? 1 : -1;
      const off = road.width * 0.5 + 0.9;
      const px = x - dz * off * side, pz = z + dx * off * side;
      const y = terrain.sampleHeight(px, pz);
      if (y < 0.3) continue;
      const inside = inCompound(px, pz);
      const bb = inside ? sink : b, bl = inside ? sink : bulbs;
      const cc = inside ? sinkC : colliders, pp = inside ? sinkP : poles, dd = inside ? sinkD : drop;

      if (chance(rng, 0.55)) {
        // lamp post
        bb.box(px, y, pz, 0.16, 4.2, 0.16, 0x4a4238);
        bb.box(px, y + 4.2, pz, 0.55, 0.16, 0.55, 0x4a4238);
        bl.box(px, y + 3.95, pz, 0.36, 0.30, 0.36, 0xffd9a0);
        cc.push({ type: 'circle', x: px, z: pz, r: 0.35 });
        pp.push([px, y, pz]);
      } else if (chance(rng, 0.78)) {
        /*
         * The electric pole, and it should be COMMON.
         *
         * "In the photographs the wires are genuinely the most visually
         * prominent object in the frame. If your lanes have no overhead wires
         * they will look wrong no matter what the buildings do." At a 0.4
         * chance behind a 0.55 lamp-post branch these were turning up on
         * about one site in six, which is a lane with the occasional wire
         * rather than a lane under a net.
         */
        bb.box(px, y, pz, 0.22, 7.5, 0.22, 0x6a5a48);
        bb.box(px, y + 7.0, pz, 1.6, 0.14, 0.14, 0x5a4a38);
        bb.box(px, y + 6.4, pz, 1.2, 0.12, 0.12, 0x5a4a38);
        // the tangle: a junction box and a coil of slack, on about half
        if (chance(rng, 0.5)) {
          bb.box(px + 0.2, y + 5.1, pz, 0.34, 0.5, 0.26, 0x33302a);
          bb.box(px - 0.18, y + 5.8, pz, 0.30, 0.34, 0.30, 0x24221d);
        }
        cc.push({ type: 'circle', x: px, z: pz, r: 0.35 });
        pp.push([px, y + 7.0, pz]);
        /*
         * SERVICE DROPS. The bundle crossing the lane is only half of it —
         * what makes an Indian street read is the thinner wires peeling off
         * and sagging to every building. Aimed across the lane and slightly
         * down, which is where the facades are.
         */
        const drops = 1 + Math.floor(rng() * 3);
        for (let k = 0; k < drops; k++) {
          const outw = off + range(rng, 2.2, 5.0);
          const along = range(rng, -3.5, 3.5);
          dd.push([
            [px, y + 6.4 + rng() * 0.5, pz],
            [x - dz * outw * side + dx * along, y + range(rng, 3.4, 4.8),
              z + dx * outw * side + dz * along],
          ]);
        }
      } else if (chance(rng, 0.5)) {
        // low stone bench
        bb.box(px, y, pz, 1.8, 0.45, 0.6, 0xbfae8b, Math.atan2(dx, dz));
        cc.push({ type: 'circle', x: px, z: pz, r: 0.8 });
      } else {
        // hand pump
        bb.box(px, y, pz, 0.5, 0.5, 0.5, 0x9a9a92);
        bb.box(px, y + 0.5, pz, 0.16, 1.0, 0.16, 0x3f4a4a);
        bb.box(px + 0.3, y + 1.4, pz, 0.7, 0.12, 0.12, 0x3f4a4a);
      }
    }
  }

  /** One sagging catenary. `thick` is the drawn diameter in metres. */
  const catenary = (a, c, sag, thick, segs, colour) => {
    let prevPt = null;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const u = (t - 0.5) * 2;
      const pt = [
        a[0] + (c[0] - a[0]) * t,
        a[1] + (c[1] - a[1]) * t - sag * (1 - u * u),
        a[2] + (c[2] - a[2]) * t,
      ];
      if (prevPt) {
        b.quad(
          [prevPt[0], prevPt[1], prevPt[2]], [pt[0], pt[1], pt[2]],
          [pt[0], pt[1] + thick, pt[2]], [prevPt[0], prevPt[1] + thick, prevPt[2]],
          colour,
        );
      }
      prevPt = pt;
    }
  };

  /*
   * The bundle between poles. THREE wires, not one: what crosses the lane is
   * described as "a thick black bundle", and three at slightly different
   * heights and sags reads as a bundle where one reads as a washing line.
   */
  for (let i = 0; i < poles.length; i++) {
    for (let j = i + 1; j < Math.min(i + 4, poles.length); j++) {
      const a = poles[i], c = poles[j];
      if (a[1] < 4 || c[1] < 4) continue;
      const d = Math.hypot(a[0] - c[0], a[2] - c[2]);
      if (d < 8 || d > 42) continue;
      for (const [dy, k, th] of [[0, 0.055, 0.06], [-0.55, 0.062, 0.05], [-0.95, 0.05, 0.04]]) {
        catenary([a[0], a[1] + dy, a[2]], [c[0], c[1] + dy, c[2]], d * k, th, 6, 0x2a2620);
      }
    }
  }

  // And the thin service drops to each building, which sag harder than the
  // bundle does because nobody ever tensioned them.
  for (const [a, c] of drop) {
    catenary(a, c, Math.hypot(a[0] - c[0], a[2] - c[2]) * 0.12, 0.035, 4, 0x221f1a);
  }

  if (!b.isEmpty) {
    group.add(b.toMesh('StreetFurniture', {
      castShadow: !!ctx.quality.shadows, receiveShadow: true, doubleSided: true,
    }));
  }

  // The bulbs are their own mesh so their glow can be turned up at dusk. Nothing
  // says evening in an Indian town like the lamps coming on one road at a time.
  if (!bulbs.isEmpty) {
    const m = bulbs.toMesh('LampBulbs', { receiveShadow: false });
    m.material.emissive = new THREE.Color(0xffb44c);
    m.material.emissiveIntensity = 0;
    m.material.toneMapped = false;
    group.add(m);
    lampBulbs = m;
  }
}

/** The lamp mesh, so the time of day can bring it up. */
let lampBulbs = null;
export function streetLamps() { return lampBulbs; }

/* ================================================================
 * Flowers
 * ================================================================ */

const FLOWER_BUILDERS = {
  marigold: (b, c) => {
    b.box(0, 0, 0, 0.05, 0.26, 0.05, 0x4f7a3a);
    blob(b, 0, 0.32, 0, 0.13, 0.11, c.color, rngAt('mg'), 0.2);
    blob(b, 0, 0.36, 0, 0.09, 0.08, c.accent, rngAt('mg2'), 0.2);
  },
  lotus: (b, c) => {
    b.box(0, 0, 0, 0.5, 0.03, 0.5, 0x3d6230);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      b.box(Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12, 0.1, 0.22, 0.22, c.color, a);
    }
    blob(b, 0, 0.18, 0, 0.07, 0.06, c.accent, rngAt('lt'), 0);
  },
  tulsi: (b, c) => {
    b.box(0, 0, 0, 0.05, 0.3, 0.05, 0x3d6230);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      blob(b, Math.cos(a) * 0.08, 0.22 + i * 0.04, Math.sin(a) * 0.08, 0.09, 0.06, c.color, rngAt('ts'), 0.2);
    }
  },
  jasmine: (b, c) => {
    b.box(0, 0, 0, 0.05, 0.22, 0.05, 0x4f7a3a);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      blob(b, Math.cos(a) * 0.09, 0.26 + (i % 2) * 0.05, Math.sin(a) * 0.09, 0.055, 0.05, c.color, rngAt('js'), 0);
    }
  },
};

function buildFlowers(ctx, terrain, group) {
  const container = new THREE.Group();
  container.name = 'Flowers';
  group.add(container);

  // one shared geometry + material per kind; each flower gets its own Mesh so it
  // can be plucked, but they all share buffers
  const geoms = {};
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const kind of Object.keys(FLOWER_BUILDERS)) {
    const b = new MeshBuilder();
    FLOWER_BUILDERS[kind](b, ctx.data.FLOWER_KINDS[kind]);
    geoms[kind] = b.build();
  }

  const flowers = [];
  for (const spot of ctx.data.FLOWER_SPOTS) {
    const geo = geoms[spot.kind];
    if (!geo) continue;
    const y = terrain.sampleHeight(spot.pos[0], spot.pos[1]);
    if (y < 0.1) continue;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(spot.pos[0], y, spot.pos[1]);
    mesh.rotation.y = (flowers.length * 2.399) % TAU;
    mesh.scale.setScalar(1.35);            // readable from a few metres
    mesh.castShadow = false;
    mesh.name = `flower-${spot.id}`;
    container.add(mesh);

    flowers.push({
      id: spot.id, kind: spot.kind, mesh, picked: false,
      pos: mesh.position.clone(),
    });
  }

  console.info(`[props] ${flowers.length} flowers`);
  return flowers;
}
