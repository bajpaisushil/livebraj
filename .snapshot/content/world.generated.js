/**
 * GENERATED FILE — do not edit by hand.
 * Produced by tools/osm-import/import.mjs from an OpenStreetMap extract.
 * Map data (c) OpenStreetMap contributors, licensed under ODbL 1.0.
 * World origin: 27.57998, 77.6905 (Shri Banke Bihari Mandir).
 * Units: metres. +X east, +Z south.
 */
/**
 * The playable rectangle, in game metres relative to the world origin.
 * +X east, +Z south. Everything that clamps, culls, scatters or draws to the
 * edge of the world reads these, so there is one definition rather than a
 * copy of the number in each module.
 */
export const WORLD = {
  "origin": {
    "lat": 27.57998,
    "lon": 77.6905,
    "label": "Shri Banke Bihari Mandir"
  },
  "bounds": {
    "minX": -7100,
    "maxX": 2100,
    "minZ": -2100,
    "maxZ": 2700
  },
  "width": 9200,
  "depth": 4800,
  "centre": [-2500, 300]
};

/** Largest half-extent, for code that still wants a single radius. */
export const WORLD_HALF = Math.max(
  -WORLD.bounds.minX, WORLD.bounds.maxX, -WORLD.bounds.minZ, WORLD.bounds.maxZ,
);

/** Clamp a point into the playable rectangle, in place. */
export function clampToWorld(p, pad = 0) {
  const b = WORLD.bounds;
  p.x = Math.max(b.minX + pad, Math.min(b.maxX - pad, p.x));
  p.z = Math.max(b.minZ + pad, Math.min(b.maxZ - pad, p.z));
  return p;
}

/** True when a world-space point lies inside the playable rectangle. */
export function inWorld(x, z, pad = 0) {
  const b = WORLD.bounds;
  return x >= b.minX - pad && x <= b.maxX + pad && z >= b.minZ - pad && z <= b.maxZ + pad;
}
