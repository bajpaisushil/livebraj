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
import { ORIGIN, WORLD_BOUNDS, ROAD_CLASSES, LANDMARKS, DISTRICTS, RAIL_CLOSED, UNBUILT_CROSSINGS, RIVER_WIDTH } from './config.mjs';
import { buildGraph, closeRing } from './roadgraph.mjs';
import { WAY_NAMES, WAY_REFS, JUNCTIONS, nameIndex, unconfirmed } from './local-knowledge.mjs';
import { confirmedRoads, confirmedPlaces, pending as surveyPending } from './surveyed.mjs';
import { RUSSIAN_NAMES } from './local-knowledge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, 'raw');
const OUT = path.resolve(HERE, '../../client/src/content');

/* ------------------------------------------------------------------ *
 * Projection: WGS84 -> local metres. +X east, +Z south.
 * ------------------------------------------------------------------ */
/**
 * WGS84, properly — not a sphere.
 *
 * This used the equatorial radius for BOTH axes, which treats the earth as a
 * ball. It is not: it is flattened, so a degree of latitude at Vrindavan's
 * 27.58 N is 110,812.7 m and not the 111,319.5 m a sphere gives. That is 0.46%,
 * and over the world's 4.8 km north-south extent it is 22 metres of drift —
 * enough to put a temple on the wrong side of its own lane, in a world whose
 * entire claim is that it is the real place. Longitude was out by a smaller
 * 0.07%.
 *
 * The two radii below are the standard ones: M is the meridional radius of
 * curvature, which governs north-south, and N the normal radius, which with
 * cos(lat) governs east-west.
 */
const R_EARTH = 6378137;                       // WGS84 semi-major axis
const FLATTENING = 1 / 298.257223563;
const E2 = FLATTENING * (2 - FLATTENING);      // first eccentricity squared

const _lat0 = (ORIGIN.lat * Math.PI) / 180;
const _w = 1 - E2 * Math.sin(_lat0) ** 2;
const M_RADIUS = (R_EARTH * (1 - E2)) / Math.pow(_w, 1.5);
const N_RADIUS = R_EARTH / Math.sqrt(_w);

const M_PER_LAT = (Math.PI / 180) * M_RADIUS;
const M_PER_LON = (Math.PI / 180) * N_RADIUS * Math.cos(_lat0);

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
// relation(9075838); relation(1423292); out geom; — the Yamuna's water as
// mapped, the Vrindavan stretch and the next one down toward Mathura
const rawRiverbank = readRaw('riverbank').elements;
// way["railway"](bbox); node["railway"~"station|halt"](bbox); out geom; — the
// New Delhi-Mathura main line through Chhatikara (Vrindaban Road station),
// and the metre-gauge line from Mathura into Vrindavan
const rawRail = readRaw('rail').elements;

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

/*
 * Ways filed as roads that are, on the ground, the promenade of a ghat.
 *   1537934884  highway=tertiary with no access tags, but it is the same walk
 *               as 673572958 (motor_vehicle=no) carried on along the front of
 *               Badan Singh Kunj to the Keshi landing: the plan in Sinha &
 *               Dhariwal (ISVS 2024, Fig. 7) and every photograph have a
 *               paved ghat there, steps on one side and the palaces on the
 *               other, and no carriageway.
 */
const FOOT_ONLY = new Set([1537934884]);

for (const way of rawRoads) {
  if (!way.geometry || way.geometry.length < 2) continue;
  let cls = ROAD_CLASSES[way.tags?.highway];
  if (!cls) { droppedClass++; continue; }
  /*
   * A way nothing with an engine may use is a footway, whatever class it was
   * filed under. The promenade along the front of Keshi Ghat is mapped as
   * highway=tertiary with motor_vehicle=no and bicycle=no — which made it an
   * 11 m `main` road down the top of the ghat steps, and a route the traffic
   * could take along them.
   */
  const t = way.tags || {};
  if ((t.motor_vehicle === 'no' || t.vehicle === 'no' || t.access === 'no') && cls.prio >= 3) {
    cls = ROAD_CLASSES.pedestrian;
  }
  if (FOOT_ONLY.has(way.id)) cls = ROAD_CLASSES.pedestrian;

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

    /*
     * One carriageway of a divided road. OSM maps NH 44, its service roads
     * and the Vrindavan road each as a pair of one-way ways, and the class
     * width is the whole road's: drawn twice, NH 44 was 22 m a side, its
     * flyover's deck swallowed the service roads under its edge, and the
     * ramp walls stood in them (traffic, Chhatikara). A one-way trunk or
     * secondary way is half its class: 11 m, three lanes; 7 m, two. ESRI z19
     * puts the flyover's whole deck at about 29 m. One-way streets in town
     * are whole streets and keep their width.
     */
    const oneway = ['yes', '1', 'true'].includes(way.tags?.oneway);
    const divided = oneway && (cls.kind === 'trunk' || cls.kind === 'highway');
    const bridge = !!way.tags?.bridge && way.tags.bridge !== 'no';
    /*
     * A bridge open only some months is a pontoon, taken up before the
     * monsoon: the one off Keshi Ghat is tagged "Dec - Jun", and nothing
     * else about it says it floats. Every other span over the water stands
     * on piers (Bridges.js) — the road bridge east of the town is concrete.
     */
    const seasonal = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(way.tags?.opening_hours || '');
    roads.push({
      id,
      name,
      kind: isParikrama ? 'parikrama' : cls.kind,
      width: isParikrama ? Math.max(cls.width, 9) : divided ? cls.width / 2 : cls.width,
      // one way, in the way's own order: NH 44's two carriageways, and most
      // of the secondary roads, are mapped as a pair of these
      ...(['yes', '1', 'true'].includes(way.tags?.oneway) ? { oneway: true } : {}),
      /*
       * Carried on a bridge: NH 44's flyover at Chhatikara, the rail
       * over-bridges, the pontoon over the Yamuna. A short one over a drain
       * is a culvert, laid on the ground like any road (TerrainBuilder's
       * BRIDGE_MIN), so only the span's own way is marked and the road
       * either side of it stays the road it was.
       */
      ...(bridge ? { bridge: true } : {}),
      ...(bridge && seasonal ? { pontoon: true } : {}),
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

/*
 * Every stretch of it inside the world. The river leaves by the east edge
 * north of Keshi Ghat and comes back in round its south-eastern loop, out
 * by the south edge; only the longest stretch was kept, and the terrain
 * draws water only near a centreline (TerrainBuilder._riverSigned), so the
 * loop — 2.3 km of the Yamuna inside its own riverbank polygons, open water
 * 112-286 m wide on ESRI — was dry ground. The longest is `points`, as
 * before; the rest are `more`, each with its width (config.mjs RIVER_WIDTH).
 */
let riverPoints = [];
let riverMore = [];
if (riverWays.length) {
  const runs = [];
  for (const w of riverWays) {
    const projected = w.geometry.map((g) => toWorld(g.lat, g.lon));
    for (const run of clipToBounds(projected, padBounds(WORLD_BOUNDS, 500))) {
      if (polylineLength(run) >= 200) runs.push(run);
    }
  }
  runs.sort((a, b) => polylineLength(b) - polylineLength(a));
  if (runs.length) riverPoints = simplify(runs[0], 6);
  riverMore = runs.slice(1).map((r) => simplify(r, 6));
}
console.log(`river     ${riverPoints.length} points, ${((polylineLength(riverPoints) + riverMore.reduce((n, r) => n + polylineLength(r), 0)) / 1000).toFixed(2)} km of Yamuna in ${1 + riverMore.length} stretch(es)`);

/*
 * A road drawn across the river where no bridge carries it yet
 * (config.mjs UNBUILT_CROSSINGS) stops short of the water on each side:
 * cut wherever it comes within RIVER_CUT of the water's edge — half the
 * stretch's width from its line — the approaches kept as roads of their own.
 */
const RIVER_CUT = 25;
const stretches = [[riverPoints, RIVER_WIDTH.main], ...riverMore.map((run) => [run, RIVER_WIDTH.more])];
const nearRiver = (p) => stretches.some(([run, width]) =>
  run.some((q, i) => i > 0 && perpendicular(p, run[i - 1], q) < width / 2 + RIVER_CUT));
for (const wayId of UNBUILT_CROSSINGS) {
  const at = roads.findIndex((r) => r.id === `r${wayId}`);
  if (at < 0) continue;
  const r = roads[at];
  const dense = [];
  for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1], b = r.points[i], n = Math.max(1, Math.ceil(dist(a, b) / 4));
    for (let k = 0; k < n; k++) dense.push([round2(a[0] + (b[0] - a[0]) * k / n), round2(a[1] + (b[1] - a[1]) * k / n)]);
  }
  dense.push(r.points[r.points.length - 1]);
  const pieces = [];
  let cur = [];
  for (const p of dense) {
    if (nearRiver(p)) { if (cur.length > 1) pieces.push(cur); cur = []; } else cur.push(p);
  }
  if (cur.length > 1) pieces.push(cur);
  const kept = pieces.map((pts) => simplify(pts, 1.1)).filter((pts) => polylineLength(pts) >= 22);
  roads.splice(at, 1, ...kept.map((pts, k) => ({ ...r, id: `r${wayId}${k ? `-bank${k}` : ''}`, length: Math.round(polylineLength(pts)), points: pts })));
  console.log(`          r${wayId} stops at the river: ${kept.length} approach(es) kept`);
}

/*
 * The water itself, as OSM maps it: the riverbank multipolygons, outer ring
 * and islands.
 *
 * The centreline above is 30 points with a constant 130 m width hung on it,
 * and that is where the game drew the Yamuna. Measured against the riverbank
 * polygon and the February 2024 imagery, the town-side edge was out by 23 m
 * at Keshi Ghat (the water stopped 30 m short of steps that stand in it) and
 * by 18-30 m at Chir and Imli Tala, while the far side covered land the river
 * has not run over in years. OSM's town-side bank agrees with the imagery to
 * within 10 m at all five ghats measured; the far side includes the sand
 * flats the monsoon covers, which is what a riverbank polygon is.
 *
 * Rings are clipped well OUTSIDE the world (400 m), so the cut line can never
 * read as a bank inside the terrain, and simplified to a metre.
 */
function closedRings(ways) {
  const segs = ways.map((g) => g.map((q) => toWorld(q.lat, q.lon))).filter((g) => g.length > 1);
  const rings = [];
  const same = (a, b) => Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02;
  while (segs.length) {
    let cur = segs.shift();
    for (let joined = true; joined && !same(cur[0], cur[cur.length - 1]);) {
      joined = false;
      for (let i = 0; i < segs.length; i++) {
        const sg = segs[i];
        if (same(cur[cur.length - 1], sg[0])) cur = cur.concat(sg.slice(1));
        else if (same(cur[cur.length - 1], sg[sg.length - 1])) cur = cur.concat(sg.slice(0, -1).reverse());
        else if (same(cur[0], sg[sg.length - 1])) cur = sg.slice(0, -1).concat(cur);
        else if (same(cur[0], sg[0])) cur = sg.slice(1).reverse().concat(cur);
        else continue;
        segs.splice(i, 1); joined = true; break;
      }
    }
    if (same(cur[0], cur[cur.length - 1])) cur = cur.slice(0, -1);
    if (cur.length >= 3) rings.push(cur);
  }
  return rings;
}

/** Sutherland-Hodgman against an axis-aligned rectangle. */
function clipRing(ring, b) {
  const edges = [
    [(p) => p[0] >= b.minX, (p, q) => [b.minX, p[1] + (q[1] - p[1]) * (b.minX - p[0]) / (q[0] - p[0])]],
    [(p) => p[0] <= b.maxX, (p, q) => [b.maxX, p[1] + (q[1] - p[1]) * (b.maxX - p[0]) / (q[0] - p[0])]],
    [(p) => p[1] >= b.minZ, (p, q) => [p[0] + (q[0] - p[0]) * (b.minZ - p[1]) / (q[1] - p[1]), b.minZ]],
    [(p) => p[1] <= b.maxZ, (p, q) => [p[0] + (q[0] - p[0]) * (b.maxZ - p[1]) / (q[1] - p[1]), b.maxZ]],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const p = src[i], q = src[(i + 1) % src.length];
      if (inside(p)) {
        out.push(p);
        if (!inside(q)) out.push(cut(p, q));
      } else if (inside(q)) out.push(cut(p, q));
    }
    if (!out.length) return [];
  }
  return out.map(([x, z]) => [round2(x), round2(z)]);
}

/** Douglas-Peucker on a closed ring: split at its two furthest-apart points. */
function simplifyRing(ring, tol) {
  if (ring.length < 8) return ring;
  let far = 0, fd = 0;
  for (let i = 1; i < ring.length; i++) {
    const d = dist(ring[0], ring[i]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = simplify(ring.slice(0, far + 1), tol);
  const b = simplify(ring.slice(far).concat([ring[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

const ringArea = (r) => {
  let A = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length];
    A += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(A) / 2;
};

const riverWater = [];
const WATER_CLIP = padBounds(WORLD_BOUNDS, 400);
for (const rel of rawRiverbank) {
  if (rel.type !== 'relation' || !rel.members) continue;
  const role = (r) => rel.members.filter((m) => m.type === 'way' && m.role === r && m.geometry).map((m) => m.geometry);
  const prep = (rings) => rings.map((r) => simplifyRing(clipRing(r, WATER_CLIP), 1))
    .filter((r) => r.length >= 3 && ringArea(r) > 40);
  for (const outer of prep(closedRings(role('outer')))) {
    const inner = prep(closedRings(role('inner')))
      .filter((r) => r.some((p) => pointInRing(p, outer)));
    riverWater.push({ osm: rel.id, outer, inner });
  }
}
function pointInRing(p, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
{
  const pts = riverWater.reduce((n, w) => n + w.outer.length + w.inner.reduce((m, r) => m + r.length, 0), 0);
  const area = riverWater.reduce((n, w) => n + ringArea(w.outer) - w.inner.reduce((m, r) => m + ringArea(r), 0), 0);
  console.log(`water     ${riverWater.length} polygon(s), ${riverWater.reduce((n, w) => n + w.inner.length, 0)} island(s), ${pts} points, ${(area / 1e6).toFixed(2)} km2 of Yamuna`);
}

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
  /*
   * `at` is a SURVEYED position and wins over the name match. A name match
   * finds whatever OSM object carries the name — for Krishna Balaram that is
   * the whole fenced compound's pin, 29 m from the temple, and every building
   * the builder lays out around its origin landed 29 m off with it.
   */
  const [lat, lon] = lm.at ? lm.at : hit ? [hit.lat, hit.lon] : lm.fallback;
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
    grounds: lm.grounds || null,
    // a walled campus's keep-out, in the builder's own frame (`also` for
    // parts that stand apart) — read by BuildingGenerator and PropScatter
    ...(lm.compound ? { compound: lm.compound } : {}),
    // a sunken court the ground mesh opens for (TerrainBuilder's basins)
    ...(lm.basin ? { basin: lm.basin } : {}),
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
 * Roads traced from satellite imagery
 *
 * These go through the same projection, clipping and simplification as the OSM
 * ways, and end up in the same list, so the navigation graph stitches them to
 * the real network without knowing the difference. Only the ones the surveyor
 * stood behind are here; the rest are held in surveyed.mjs as questions.
 * ------------------------------------------------------------------ */
let surveyedKept = 0, surveyedDropped = 0;
for (const r of confirmedRoads()) {
  const cls = ROAD_CLASSES[
    r.kind === 'path' ? 'path' : r.kind === 'gali' ? 'service'
      : r.kind === 'main' ? 'tertiary' : r.kind === 'highway' ? 'secondary'
        : r.kind === 'trunk' ? 'trunk' : 'residential'
  ];
  if (!cls) { surveyedDropped++; continue; }

  const projected = r.points.map(([lat, lon]) => toWorld(lat, lon));
  const runs = clipToBounds(projected, WORLD_BOUNDS);
  if (!runs.length) { surveyedDropped++; continue; }

  runs.forEach((run, ri) => {
    const pts = simplify(run, cls.prio >= 4 ? 1.1 : cls.prio >= 3 ? 1.6 : 2.2);
    const len = polylineLength(pts);
    if (len < 18) { surveyedDropped++; return; }
    roads.push({
      id: `s${surveyedKept}${ri ? `-${ri}` : ''}`,
      // the surveyor's description IS the name — "lane behind ISKCON to the
      // Parikrama Marg" tells you more than a guessed Hindi word would
      name: null,
      note: r.name,
      kind: cls.kind,
      width: cls.width,
      prio: cls.prio,
      length: len,
      points: pts,
      source: 'surveyed',
    });
    surveyedKept++;
  });
}
console.log(`surveyed  ${surveyedKept} traced roads merged, ${surveyedDropped} dropped (out of bounds or too short)`);

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
// places traced from imagery, alongside the OSM ones
for (const q of confirmedPlaces()) {
  const pos = toWorld(q.at[0], q.at[1]);
  const B = WORLD_BOUNDS;
  if (pos[0] < B.minX || pos[0] > B.maxX || pos[1] < B.minZ || pos[1] > B.maxZ) continue;
  let clash = false;
  for (const c of curatedAt) {
    if (Math.hypot(c[0] - pos[0], c[1] - pos[1]) < 55) { clash = true; break; }
  }
  if (clash) continue;
  pois.push({
    id: 'sv' + pois.length,
    name: q.name,
    hindi: null,
    kind: /kund|pond|tank|ghat|landing|water/i.test(q.kind) ? 'water'
      : /temple|mandir|ashram/i.test(q.kind) ? 'temple'
        : /park|grove|garden/i.test(q.kind) ? 'green' : 'other',
    tag: q.kind,
    pos,
    source: 'surveyed',
  });
}

for (const el of rawPoi) {
  const t = el.tags || {};
  // a Cyrillic-only name is unreadable to most people who will open this
  const name = t['name:en'] || RUSSIAN_NAMES[t.name] || t.name;
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
 * The railways
 * ------------------------------------------------------------------ */
/*
 * Tracks, by what OSM says they are: the main line (usage=main), its loops
 * and crossovers at the station, and the metre gauge. Each keeps its gauge
 * and whether it is wired, which is what the builder needs to draw it; run
 * 60 m past the edge, as the river is, so the world does not stop at a line.
 */
/*
 * A point where the line turns back on itself is a mapping slip, not a track:
 * the metre gauge's way doubles back 18 m at the Chandrodaya over-bridge
 * (nodes 10 and 11 of 671814558). Dropped, over and over until none is left.
 */
function despike(pts) {
  let out = pts.slice(), again = true;
  while (again && out.length > 2) {
    again = false;
    for (let i = 1; i < out.length - 1; i++) {
      const ax = out[i][0] - out[i - 1][0], az = out[i][1] - out[i - 1][1];
      const bx = out[i + 1][0] - out[i][0], bz = out[i + 1][1] - out[i][1];
      const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      if (la < 1e-6 || lb < 1e-6 || (ax * bx + az * bz) / (la * lb) < -0.85) { out.splice(i, 1); again = true; break; }
    }
  }
  return out;
}
const rail = [];
for (const way of rawRail) {
  if (way.type !== 'way' || !way.geometry) continue;
  const kind = way.tags?.railway;
  if (kind !== 'rail' && kind !== 'narrow_gauge') continue;
  const projected = despike(way.geometry.map((g) => toWorld(g.lat, g.lon)));
  clipToBounds(projected, padBounds(WORLD_BOUNDS, 60)).forEach((run, ri) => {
    const pts = simplify(run, 0.6);
    if (polylineLength(pts) < 20) return;
    rail.push({
      id: `t${way.id}${ri ? `-${ri}` : ''}`,
      kind: way.tags.usage === 'main' ? 'main' : kind === 'narrow_gauge' ? 'metre' : 'loop',
      gauge: Number(way.tags.gauge || (kind === 'narrow_gauge' ? 1000 : 1676)) / 1000,
      ...(way.tags.electrified === 'contact_line' ? { electrified: true } : {}),
      ...(way.tags.name ? { name: way.tags.name } : {}),
      // taken up, though OSM still draws it (config.mjs)
      ...(RAIL_CLOSED.ways.includes(way.id) ? { dismantled: true } : {}),
      points: pts,
    });
  });
}
const stations = rawRail
  .filter((e) => e.type === 'node' && /^(station|halt)$/.test(e.tags?.railway || ''))
  .map((e) => ({
    id: `s${e.id}`, name: e.tags['name:en'] || e.tags.name || 'Station', pos: toWorld(e.lat, e.lon),
    ...(RAIL_CLOSED.stations.includes(e.id) ? { closed: true } : {}),
  }));
console.log(`rail      ${rail.length} tracks, ${(rail.reduce((n, r) => n + polylineLength(r.points), 0) / 1000).toFixed(2)} km, ${stations.length} stations`);

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
  `export const RIVER = ${compactJson({
    points: riverPoints, more: riverMore.map((points) => ({ width: RIVER_WIDTH.more, points })),
    width: RIVER_WIDTH.main, bank: 14, water: riverWater,
  })};\n`);

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

writeModule('rail.generated.js',
  `export const RAIL = ${compactJson({ tracks: rail, stations })};\n`);
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

const held = surveyPending();
if (held.length) {
  console.log(`\nsurveyed  ${held.length} traced features held back as unconfirmed:`);
  for (const e of held.slice(0, 8)) console.log(`         ? ${String(e.name).slice(0, 78)}`);
  if (held.length > 8) console.log(`         ... and ${held.length - 8} more`);
  console.log('         A pale line in a photograph may be a lane, a drain or a wall.');
  console.log('         These wait for somebody who has walked there.');
}

console.log('\ndone.');
