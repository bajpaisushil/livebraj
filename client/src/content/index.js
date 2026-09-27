/**
 * The content barrel — everything static about the world, in one namespace.
 *
 * `ctx.data` is this module. Systems read it; nothing writes to it. The
 * generated files come from the OSM import pipeline; the authored files beside
 * them carry the things a map cannot know — architecture, deity, story, colour.
 *
 * In the Unity port each of these becomes a ScriptableObject asset, and the
 * shapes below are the serialised fields.
 */

import { ROADS } from './roads.generated.js';
import { RIVER } from './river.generated.js';
import { PARIKRAMA } from './parikrama.generated.js';
import { LOCATIONS as RAW_LOCATIONS } from './locations.generated.js';
import { CURATED_PLACES } from './places.curated.js';
import { DISTRICTS } from './districts.generated.js';
import { POIS } from './pois.generated.js';
import { WORLD as WORLD_BOUNDS } from './world.generated.js';
import { TREES, FLOWER_SPOTS, FLOWER_KINDS } from './flora.js';
import { STORIES, AMBIENT_NOTES } from './stories.js';
import { PALETTE, TIME_OF_DAY, AVATAR_OPTIONS } from './palette.js';

/** World origin — Shri Banke Bihari Mandir. Real coordinates, real metres. */
export const WORLD = {
  name: 'Vrindavan',
  hindi: 'वृन्दावन',
  origin: { lat: 27.57998, lon: 77.69050, label: 'Shri Banke Bihari Mandir' },
  bounds: WORLD_BOUNDS.bounds,
  width: WORLD_BOUNDS.width,
  depth: WORLD_BOUNDS.depth,
  centre: WORLD_BOUNDS.centre,
  attribution: 'Map data © OpenStreetMap contributors (ODbL 1.0)',
};

/**
 * The imported places and the curated ones, as one list.
 *
 * OpenStreetMap is thin on exactly the places a pilgrim comes for — no
 * footprint at all for Ashta Sakhi, a single node for Imli Tala, an unnamed
 * green polygon for Seva Kunj — and `locations.generated.js` must not be
 * hand-edited, because the next import would throw the edits away. So the
 * curated ones live in their own file and join here. A curated id that
 * collides with an imported one loses, deliberately: the importer is the
 * source of truth for anything OSM actually knows.
 */
const IMPORTED_IDS = new Set(RAW_LOCATIONS.map((l) => l.id));
const ALL_LOCATIONS = RAW_LOCATIONS.concat(
  CURATED_PLACES.filter((p) => !IMPORTED_IDS.has(p.id)),
);

/** Stories are merged onto their locations so a system only ever holds one object. */
export const LOCATIONS = ALL_LOCATIONS.map((loc) => ({
  ...loc,
  story: STORIES[loc.id] || {
    short: loc.name,
    long: `${loc.name} stands in ${districtName(loc.district)}.`,
    source: 'OpenStreetMap',
  },
}));

function districtName(id) {
  const d = DISTRICTS.find((x) => x.id === id);
  return d ? d.name : 'Vrindavan';
}

/** Fast lookup, built once. */
export const LOCATION_BY_ID = new Map(LOCATIONS.map((l) => [l.id, l]));

/** Icon glyphs for the map and the places list. Drawn, not fonts — see MapIcons. */
export const ICONS = ['temple', 'ghat', 'grove', 'kund', 'landmark', 'gate', 'market'];

export {
  ROADS, RIVER, PARIKRAMA, DISTRICTS,
  TREES, FLOWER_SPOTS, FLOWER_KINDS,
  STORIES, AMBIENT_NOTES,
  PALETTE, TIME_OF_DAY, AVATAR_OPTIONS,
};

/** A single import for systems that just want everything. */
export default {
  WORLD, LOCATIONS, LOCATION_BY_ID, ROADS, RIVER, PARIKRAMA, DISTRICTS, POIS,
  TREES, FLOWER_SPOTS, FLOWER_KINDS, STORIES, AMBIENT_NOTES,
  PALETTE, TIME_OF_DAY, AVATAR_OPTIONS, ICONS,
};
