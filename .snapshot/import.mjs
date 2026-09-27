#!/usr/bin/env node
/**
 * OSM -> game content importer.
 *
 *   node tools/osm-import/import.mjs
 *
 * Reads the cached Overpass responses in ./raw, projects them onto a local
 * tangent plane centred on Shri Banke Bihari Mandir, cleans the geometry, and
 * emits the generated content modules under client/src/content/.
 *
 * The generated files are committed. The importer only needs to run again when
 * the source extract is refreshed or the world bounds change.
 *
 * Data © OpenStreetMap contributors, ODbL 1.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, WORLD_BOUNDS, ROAD_CLASSES, LANDMARKS, DISTRICTS } from './config.mjs';
import { buildGraph, closeRing } from './roadgraph.mjs';
import { WAY_NAMES, WAY_REFS, JUNCTIONS, nameIndex, unconfirmed } from './local-knowledge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, 'raw');
const OUT = path.resolve(HERE, '../../client/src/content');

/* ------------------------------------------------------------------ *
 * Projection: WGS84 -> local metres. +X east, +Z south.
 * ------------------------------------------------------------------ */
const R_EARTH = 6378137;
const M_PER_LAT = (Math.PI / 180) * R_EARTH;
const M_PER_LON = (Math.PI / 180) * R_EARTH * Math.cos((ORIGIN.lat * Math.PI) / 180);

const toWorld = (lat, lon) => [
  round2((lon - ORIGIN.lon) * M_PER_LON),
  round2(-(lat - ORIGIN.lat) * M_PER_LAT),
];

const round2 = (n) => Math.round(n * 100) / 100;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */

/** Ramer–Douglas–Peucker. OSM traces have far more vertices than we need. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxD = 0, idx = 0;
  const [a, b] = [points[0], points[points.length - 1]];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > tolerance) {
    const left = simplify(points.slice(0, idx + 1), tolerance);
    const right = simplify(points.slice(idx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

function perpendicular(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return dist(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + dx * t, a[1] + dz * t]);
}

/**
 * Grow or shrink a bounds rectangle by a uniform margin.
 * A margin is useful for features we want to run a little past the play area
 * so the world does not visibly stop at a hard line.
 */
function padBounds(b, pad) {
  return { minX: b.minX - pad, maxX: b.maxX + pad, minZ: b.minZ - pad, maxZ: b.maxZ + pad };
}

/**
 * Clip a polyline to the playable rectangle, returning 0..n sub-lines.
 *
 * The area used to be a square, so this took a single half-extent. It takes a
 * rectangle now: the world reaches much further west than east, to hold the
 * Chhatikara approach road.
 */
function clipToBounds(points, b) {
  const inside = (p) => p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minZ && p[1] <= b.maxZ;
  const runs = [];
  let cur = [];
  for (let i = 0; i < points.length; i++) {
    if (inside(points[i])) {
      cur.push(points[i]);
    } else {
      if (cur.length) {
        // extend one step toward the outside point so roads meet the edge
        cur.push(clampPoint(cur[cur.length - 1], points[i], b));
        runs.push(cur); cur = [];
      }
      const next = points[i + 1];
      if (next && inside(next)) cur.push(clampPoint(next, points[i], b));
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length >= 2);
}

/** Walk from an inside point toward an outside one, stopping at the boundary. */
function clampPoint(from, to, b) {
  let t = 1;
  const lim = [[b.minX, b.maxX], [b.minZ, b.maxZ]];
  for (const axis of [0, 1]) {
    const d = to[axis] - from[axis];
    if (Math.abs(d) < 1e-6) continue;
    const [lo, hi] = lim[axis];
    const limit = to[axis] > hi ? hi : to[axis] < lo ? lo : null;
    if (limit === null) continue;
    t = Math.min(t, (limit - from[axis]) / d);
  }
  t = Math.max(0, Math.min(1, t));
  return [round2(from[0] + (to[0] - from[0]) * t), round2(from[1] + (to[1] - from[1]) * t)];
}

function polylineLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

/* ------------------------------------------------------------------ *
 * Load
 * ------------------------------------------------------------------ */
function readRaw(name) {
  const p = path.join(RAW, `osm_${name}.json`);
  if (!fs.existsSync(p)) { console.warn(`  ! missing ${p}`); return { elements: [] }; }
  const txt = fs.readFileSync(p, 'utf8');
  if (!txt.trimStart().startsWith('{')) { console.warn(`  ! ${name} is not JSON`); return { elements: [] }; }
  return JSON.parse(txt);
}

console.log('Vrindavan world import');
console.log(`  origin ${ORIGIN.lat}, ${ORIGIN.lon} (${ORIGIN.label})`);
console.log(`  bounds x ${WORLD_BOUNDS.minX}..${WORLD_BOUNDS.maxX}  z ${WORLD_BOUNDS.minZ}..${WORLD_BOUNDS.maxZ} m\n`);

/** Landmarks that fell outside the playable rectangle; reported at the end. */
const outOfBounds = [];

const rawRoads = readRaw('roads').elements;
const rawWater = readRaw('water').elements;
const rawPlaces = readRaw('places').elements;
const rawPoi = readRaw('poi_all').elements;

/* ------------------------------------------------------------------ *
 * Roads
 * ------------------------------------------------------------------ */
const roads = [];
const seenRoadIds = new Set();
let droppedShort = 0, droppedClass = 0, droppedOut = 0;

// Names contributed by people who know the town, keyed by OSM way id. OSM has
// the geometry right and the labels almost entirely absent: 29 of 1840 ways
// carried a name, and not one carried a highway ref.
const localNames = nameIndex();
const localApplied = new Set();
const refApplied = new Set();

for (const way of rawRoads) {
  if (!way.geometry || way.geometry.length < 2) continue;
  const cls = ROAD_CLASSES[way.tags?.highway];
  if (!cls) { droppedClass++; continue; }

  const projected = way.geometry.map((g) => toWorld(g.lat, g.lon));
  const runs = clipToBounds(projected, WORLD_BOUNDS);
  if (!runs.length) { droppedOut++; continue; }

  const local = localNames.get(way.id);
  if (local) localApplied.add(local.name);

  // A route number is a name as far as anyone navigating is concerned. OSM
  // tags NH44 here and nothing else, so the Asian Highway number that people
  // actually say comes from local-knowledge.mjs.
  const wayRef = way.tags?.ref || way.tags?.int_ref || null;
  const refEntry = wayRef
    ? WAY_REFS.find((r) => r.confirmed && r.matchRef === wayRef)
    : null;
  if (refEntry) refApplied.add(refEntry.label);

  const name = way.tags?.name || local?.name || refEntry?.label || null;
  const isParikrama = !!name && /parikram/i.test(name);

  runs.forEach((run, ri) => {
    // tolerance scales with road class — keep highways crisp, relax the galis
    const tol = cls.prio >= 4 ? 1.1 : cls.prio >= 3 ? 1.6 : 2.2;
    const pts = simplify(run, tol);
    const len = polylineLength(pts);
    // drop stubs, but never drop a named road or the parikrama marg
    if (len < (name ? 8 : 22)) { droppedShort++; return; }

    const id = `r${way.id}${ri ? `-${ri}` : ''}`;
    if (seenRoadIds.has(id)) return;
    seenRoadIds.add(id);

    roads.push({
      id,
      name,
      kind: isParikrama ? 'parikrama' : cls.kind,
      width: isParikrama ? Math.max(cls.width, 9) : cls.width,
      prio: cls.prio,
      length: Math.round(len),
      points: pts,
    });
  });
}

roads.sort((a, b) => b.prio - a.prio || b.length - a.length);
console.log(`roads     ${roads.length} kept  (${droppedClass} unclassed, ${droppedOut} out of bounds, ${droppedShort} stubs)`);
const byKind = {};
roads.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
console.log(`          ${JSON.stringify(byKind)}`);
console.log(`          total network ${(roads.reduce((s, r) => s + r.length, 0) / 1000).toFixed(1)} km`);

/* ------------------------------------------------------------------ *
 * Parikrama loop — chain the Parikram Marg ways into one ordered ring
 * ------------------------------------------------------------------ */
const pariSegs = roads.filter((r) => r.kind === 'parikrama').map((r) => r.points.slice());

// The ring is closed by routing along real streets between the named segments.
const graph = buildGraph(roads);
const centroid = [0, 0];
const ring = closeRing(graph, pariSegs, centroid);
let parikramaPoints = ring.points.length ? simplify(ring.points, 2.5) : [];
console.log(`graph     ${graph.nodes.size} nodes, ${graph.stitched} near-miss joins stitched`);
console.log(`          ring closed with ${ring.joins} routed links, ${ring.failed} unroutable`);

const parikramaLen = polylineLength(parikramaPoints);
console.log(`parikrama ${parikramaPoints.length} points, ${(parikramaLen / 1000).toFixed(2)} km chained from ${pariSegs.length} OSM segments`);

/* ------------------------------------------------------------------ *
 * River — the Yamuna
 * ------------------------------------------------------------------ */
const riverWays = rawWater.filter((w) => w.geometry && w.geometry.length > 1 &&
  (w.tags?.waterway === 'river' || /yamuna/i.test(w.tags?.name || '')));

let riverPoints = [];
if (riverWays.length) {
  // take the longest continuous river trace inside bounds
  let best = [];
  for (const w of riverWays) {
    const projected = w.geometry.map((g) => toWorld(g.lat, g.lon));
    for (const run of clipToBounds(projected, padBounds(WORLD_BOUNDS, 500))) {
      if (polylineLength(run) > polylineLength(best)) best = run;
    }
  }
  riverPoints = simplify(best, 6);
}
console.log(`river     ${riverPoints.length} points, ${(polylineLength(riverPoints) / 1000).toFixed(2)} km of Yamuna`);

/* ------------------------------------------------------------------ *
 * Landmarks — match curated entries to real OSM positions
 * ------------------------------------------------------------------ */
const poiIndex = [];
for (const el of rawPlaces) {
  const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:hi'];
  if (!name) continue;
  let lat = el.lat, lon = el.lon;
  if (el.center) { lat = el.center.lat; lon = el.center.lon; }
  if (lat == null && el.geometry?.length) {
    lat = el.geometry.reduce((s, g) => s + g.lat, 0) / el.geometry.length;
    lon = el.geometry.reduce((s, g) => s + g.lon, 0) / el.geometry.length;
  }
  if (lat == null || lon == null) continue;
  poiIndex.push({ name, lat, lon, tags: el.tags });
}

const locations = [];
let matched = 0, fellBack = 0;

for (const lm of LANDMARKS) {
  let hit = null;
  for (const needle of lm.match) {
    const n = needle.toLowerCase();
    hit = poiIndex.find((p) => p.name.toLowerCase().includes(n));
    if (hit) break;
  }
  const [lat, lon] = hit ? [hit.lat, hit.lon] : lm.fallback;
  if (hit) matched++; else fellBack++;

  const pos = toWorld(lat, lon);
  const B = WORLD_BOUNDS;
  if (pos[0] < B.minX || pos[0] > B.maxX || pos[1] < B.minZ || pos[1] > B.maxZ) {
    // Clamping moves a landmark somewhere it is not. That silently invalidated
    // every route measured from Chhatikara once, so it is an error now, not a
    // log line: either widen WORLD_BOUNDS or drop the landmark deliberately.
    outOfBounds.push({ id: lm.id, pos: [...pos] });
    pos[0] = Math.max(B.minX + 60, Math.min(B.maxX - 60, pos[0]));
    pos[1] = Math.max(B.minZ + 60, Math.min(B.maxZ - 60, pos[1]));
  }

  locations.push({
    id: lm.id,
    name: lm.name,
    hindi: lm.hindi,
    type: lm.type,
    district: lm.district,
    pos,
    geo: [round6(lat), round6(lon)],
    rot: lm.rot,
    radius: lm.radius,
    icon: lm.icon,
    deity: lm.deity,
    interactions: lm.interactions,
    build: lm.build,
    osm: hit ? hit.name : null,
  });
}

function round6(n) { return Math.round(n * 1e6) / 1e6; }

locations.sort((a, b) => Math.hypot(a.pos[0], a.pos[1]) - Math.hypot(b.pos[0], b.pos[1]));
console.log(`locations ${locations.length} (${matched} matched to OSM nodes, ${fellBack} curated fallback)`);

/* ------------------------------------------------------------------ *
 * Parikrama stops — the landmarks the loop actually passes, in order
 * ------------------------------------------------------------------ */
const stops = [];
if (parikramaPoints.length) {
  for (const loc of locations) {
    let bestI = -1, bestD = Infinity;
    for (let i = 0; i < parikramaPoints.length; i++) {
      const d = dist(parikramaPoints[i], loc.pos);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestD < 230) stops.push({ id: loc.id, at: bestI, d: Math.round(bestD) });
  }
  stops.sort((a, b) => a.at - b.at);
}
console.log(`          ${stops.length} landmarks along the parikrama route`);

/* ------------------------------------------------------------------ *
 * Points of interest
 *
 * The 26 curated landmarks are the ones with architecture, a deity and a
 * story. They are not the only things with a name. OSM carries 205 named
 * features here — sixty more temples, the dharamshalas, the sweet shops on
 * Loi Bazar, the banks people ask directions to — and a map that knows only
 * the famous temples cannot answer "where am I" between them.
 *
 * These get no model and no interior. They are places the map can name, the
 * search can find, and the readout can orient you by.
 * ------------------------------------------------------------------ */
const POI_KIND = {
  place_of_worship: 'temple', restaurant: 'food', cafe: 'food', fast_food: 'food',
  hotel: 'stay', guest_house: 'stay', hostel: 'stay', bank: 'service', atm: 'service',
  hospital: 'health', clinic: 'health', doctors: 'health', pharmacy: 'health',
  police: 'service', school: 'service', college: 'service', university: 'service',
  park: 'green', garden: 'green', marketplace: 'bazaar', fuel: 'service',
  attraction: 'sight', monument: 'sight', memorial: 'sight', viewpoint: 'sight',
  water: 'water', spring: 'water', tree: 'green',
};

const curatedAt = locations.map((l) => l.pos);
const pois = [];
const seenPoi = new Set();
for (const el of rawPoi) {
  const t = el.tags || {};
  const name = t.name || t['name:en'];
  if (!name) continue;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat === undefined || lon === undefined) continue;

  const pos = toWorld(lat, lon);
  const B = WORLD_BOUNDS;
  if (pos[0] < B.minX || pos[0] > B.maxX || pos[1] < B.minZ || pos[1] > B.maxZ) continue;

  // a curated landmark already covers this ground; two names on one building
  // is worse than one
  let clash = false;
  for (const c of curatedAt) {
    if (Math.hypot(c[0] - pos[0], c[1] - pos[1]) < 55) { clash = true; break; }
  }
  if (clash) continue;

  const key = name.toLowerCase() + '@' + Math.round(pos[0] / 30) + ',' + Math.round(pos[1] / 30);
  if (seenPoi.has(key)) continue;
  seenPoi.add(key);

  const raw = t.amenity || t.tourism || t.historic || t.leisure || t.shop
    || t.natural || t.man_made || t.place || 'other';
  pois.push({
    id: 'p' + (el.id ?? pois.length),
    name,
    hindi: t['name:hi'] || null,
    kind: POI_KIND[raw] || (t.shop ? 'shop' : 'other'),
    tag: raw,
    pos,
  });
}
pois.sort((a, b) => a.name.localeCompare(b.name));
const poiKinds = {};
for (const p of pois) poiKinds[p.kind] = (poiKinds[p.kind] || 0) + 1;
console.log(`pois      ${pois.length} named places the map can label`);
console.log('          ' + JSON.stringify(poiKinds));

/* ------------------------------------------------------------------ *
 * Districts -> metres
 * ------------------------------------------------------------------ */
const districts = DISTRICTS.map((d) => ({
  ...d,
  poly: d.poly.map(([lat, lon]) => toWorld(lat, lon)),
}));

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */
fs.mkdirSync(OUT, { recursive: true });

const banner = `/**
 * GENERATED FILE — do not edit by hand.
 * Produced by tools/osm-import/import.mjs from an OpenStreetMap extract.
 * Map data (c) OpenStreetMap contributors, licensed under ODbL 1.0.
 * World origin: ${ORIGIN.lat}, ${ORIGIN.lon} (${ORIGIN.label}).
 * Units: metres. +X east, +Z south.
 */
`;

function writeModule(file, body) {
  const p = path.join(OUT, file);
  fs.writeFileSync(p, banner + body);
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log(`  -> ${file}  ${kb} KB`);
}

console.log('\nwriting content modules');

writeModule('world.generated.js',
  `/**
 * The playable rectangle, in game metres relative to the world origin.
 * +X east, +Z south. Everything that clamps, culls, scatters or draws to the
 * edge of the world reads these, so there is one definition rather than a
 * copy of the number in each module.
 */
export const WORLD = ${compactJson({
    origin: { lat: ORIGIN.lat, lon: ORIGIN.lon, label: ORIGIN.label },
    bounds: WORLD_BOUNDS,
    width: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX,
    depth: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ,
    centre: [
      (WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2,
      (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2,
    ],
  })};

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
`);

writeModule('roads.generated.js',
  `export const ROADS = ${compactJson(roads.map(({ prio, length, ...r }) => r))};\n`);

writeModule('river.generated.js',
  `export const RIVER = ${compactJson({ points: riverPoints, width: 130, bank: 14 })};\n`);

writeModule('parikrama.generated.js',
  `export const PARIKRAMA = ${compactJson({
    id: 'vrindavan-parikrama',
    name: 'Vrindavan Parikrama',
    hindi: 'वृन्दावन परिक्रमा',
    km: Math.round((parikramaLen / 1000) * 100) / 100,
    points: parikramaPoints,
    stops: stops.map((s) => s.id),
  })};\n`);

writeModule('pois.generated.js',
  `/**
 * Named places from OpenStreetMap that are not curated landmarks: no model,
 * no interior, no story. The map labels them, the search finds them, and the
 * readout uses them to say where you are between the temples.
 */
export const POIS = ${compactJson(pois)};
`);

writeModule('locations.generated.js',
  `export const LOCATIONS = ${compactJson(locations)};\n`);

writeModule('districts.generated.js',
  `export const DISTRICTS = ${compactJson(districts)};\n`);

/** JSON with coordinate pairs kept on one line — readable diffs, small files. */
function compactJson(value) {
  const json = JSON.stringify(value, null, 2);
  return json.replace(/\[\s*\n\s*(-?[\d.]+),\s*\n\s*(-?[\d.]+)\s*\n\s*\]/g, '[$1, $2]');
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
const namedWays = roads.filter((r) => r.name).length;
console.log(`\nnaming   ${namedWays} of ${roads.length} ways carry a name`);
for (const e of WAY_REFS.filter((x) => x.confirmed)) {
  const ok = refApplied.has(e.label);
  console.log(`         ${ok ? '+' : '!'} ${e.label} (route number)${ok ? '' : '  NO WAY CARRIED ' + e.matchRef}`);
}
for (const e of WAY_NAMES.filter((x) => x.confirmed)) {
  const ok = localApplied.has(e.name);
  console.log(`         ${ok ? '+' : '!'} ${e.name}${ok ? ' (local)' : '  NO WAY MATCHED - check ids'}`);
}

const pending = unconfirmed();
if (pending.length) {
  console.log(`\npending  ${pending.length} name(s) known but not yet placed:`);
  for (const e of pending) console.log(`         ? ${e.name}`);
  console.log('         These stay off the map until someone confirms which way');
  console.log('         they belong to. See tools/osm-import/local-knowledge.mjs.');
}

if (outOfBounds.length) {
  console.log('\nOUT OF BOUNDS - these landmarks were moved to the world edge:');
  for (const o of outOfBounds) {
    console.log(`         ${o.id} at ${o.pos[0]}, ${o.pos[1]}`);
  }
  console.log('         Widen WORLD_BOUNDS in config.mjs, or remove them.');
  console.log('         A clamped landmark is a landmark in the wrong place, and');
  console.log('         every distance measured from it is wrong too.');
}

console.log('\ndone.');
