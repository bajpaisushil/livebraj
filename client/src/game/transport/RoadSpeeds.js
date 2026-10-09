/**
 * RoadSpeeds — how fast each kind of vehicle really goes, on each kind of road.
 *
 * "E-rickshaws doing 94 km/h." Seen in the vehicle-camera trace: 26 m/s on a
 * ride out of Chhatikara, because the ride sped the vehicle up until the
 * journey fitted a five-minute cap. A battery e-rickshaw is built, by law, not
 * to exceed 25 km/h, and in these lanes it does a good deal less than that.
 *
 * So the vehicle you hire and the vehicle you drive yourself take their speed
 * from this one table, and the table is the research, written up with its
 * sources in docs/research/vehicle-speeds.md. The traffic around you keeps the
 * town speeds CrowdSystem gives it (an e-rickshaw 15-18 km/h, an auto about
 * 19), which already sit under every ceiling here. What is SOURCED is the ceiling each vehicle
 * may not pass: the e-rickshaw's design limit in the Central Motor Vehicles
 * Rules, and the 2018 national limits for every other class. What is ESTIMATED
 * is where each kind of road sits under that ceiling, anchored on the measured
 * averages there are (an e-rickshaw driving cycle averaging 17.4 km/h, autos
 * spending most of a peak hour between 6 and 28 km/h, guide-book journey times
 * between Mathura and Vrindavan). Where an estimate had a choice it took the
 * slower answer: this is a town of pilgrims on foot.
 *
 * Two numbers per road: `cruise` is the driver's own unhurried pace with a
 * passenger aboard, and `max` is the same driver asked to hurry. Neither is ever
 * above `top`. A long journey is NOT made bearable by raising these — that was
 * the lie — but by showing it as a time-lapse (RickshawSystem), at a rate the
 * ride bar says out loud.
 */

const KMH = 1 / 3.6;

/**
 * Road kinds, from the OSM import (tools/osm-import/config.mjs):
 *   trunk     NH 44 and the primary roads        18-22 m
 *   highway   secondary — the Chhatikara road     14 m
 *   main      tertiary                            11 m
 *   street    residential, unclassified          6.5-8 m
 *   parikrama the Parikrama Marg, walked by pilgrims the whole way round
 *   gali      service lanes, living streets, pedestrian lanes   4-5 m
 *   path      footways, tracks, steps
 * `stitch` is junction glue in NavGraph rather than a road, and takes whatever
 * it joins; open ground with no road at all drives like a path.
 */

/**
 * [cruise, max] in km/h by road kind, plus the vehicle's `top` and how hard it
 * pulls away (`accel`, m/s²).
 *
 * The pull-away matters as much as the top speed for what you see. The ride
 * used to accelerate every vehicle at 5 m/s² — half a g, sports-car territory
 * — and an auto measured in Guwahati spends most of its time between -1 and
 * +1 m/s². These are a little generous on that, so pulling out of a junction
 * still reads as deliberate, never as a launch.
 */
const TABLE = {
  // Human-powered, two passengers. No Indian measurement was found; ITDP puts
  // a pedal rickshaw at "three times the walking speed", about 13-15 km/h, and
  // a puller with two people aboard holds a little under that on the flat.
  'cycle-rickshaw': {
    top: 16, accel: 0.7,
    trunk: [12, 16], highway: [12, 16], main: [11, 15], street: [11, 13],
    parikrama: [8, 11], gali: [7, 9], path: [5, 7],
  },
  // CMVR rule 2(cb): an e-rickshaw's maximum speed is not more than 25 km/h.
  // The driving-cycle study (100 GPS-logged trips) averaged 17.4 km/h.
  'e-rickshaw': {
    top: 25, accel: 1.2,
    trunk: [22, 25], highway: [20, 25], main: [18, 24], street: [16, 20],
    parikrama: [10, 14], gali: [8, 12], path: [6, 8],
  },
  // A CNG auto: three-wheelers are limited to 50 km/h on every road (S.O.
  // 1522(E), 2018), and a Bajaj RE tops out at 63. Guide books give Mathura to
  // Vrindavan, 12-13 km, as 25-30 minutes by auto.
  auto: {
    top: 50, accel: 1.5,
    trunk: [40, 50], highway: [32, 42], main: [25, 35], street: [19, 27],
    parikrama: [12, 16], gali: [10, 14], path: [6, 8],
  },
  // The shared tempo — a bigger three-wheeler with ten aboard: the same 50 km/h
  // limit, slower to get going, and it stops for everybody.
  tempo: {
    top: 50, accel: 1.0,
    trunk: [35, 45], highway: [28, 38], main: [22, 30], street: [15, 22],
    parikrama: [10, 14], gali: [8, 12], path: [5, 7],
  },
  // M1 — a car: 70 km/h within municipal limits, 100 on a divided national
  // highway. Guide books give the same 12-13 km as 20-30 minutes by taxi.
  taxi: {
    top: 70, accel: 2.0,
    trunk: [55, 70], highway: [40, 55], main: [30, 40], street: [22, 30],
    parikrama: [12, 18], gali: [10, 15], path: [6, 8],
  },
  car: {
    top: 70, accel: 2.0,
    trunk: [55, 70], highway: [40, 55], main: [30, 40], street: [22, 30],
    parikrama: [12, 18], gali: [10, 15], path: [6, 8],
  },
  // A motorcycle: 60 km/h within municipal limits, 80 on a national highway.
  bike: {
    top: 70, accel: 2.5,
    trunk: [55, 70], highway: [40, 55], main: [32, 42], street: [24, 32],
    parikrama: [14, 20], gali: [12, 18], path: [8, 10],
  },
};

/** What an unknown type drives like: the vehicle most of Vrindavan rides in. */
const FALLBACK = 'e-rickshaw';

const KINDS = ['trunk', 'highway', 'main', 'street', 'parikrama', 'gali', 'path'];

/**
 * Which road wins at a junction when a vehicle is not going anywhere: the
 * bigger one. A rickshaw parked where a gali meets the Chhatikara road is on
 * the Chhatikara road.
 */
const RANK = { trunk: 7, highway: 6, main: 5, street: 4, parikrama: 3, gali: 2, path: 1 };

/** The same table in m/s, built once — it is read every frame. */
const SPEEDS = {};
for (const id of Object.keys(TABLE)) {
  const t = TABLE[id];
  const top = t.top * KMH;
  const roads = {};
  for (const k of KINDS) {
    const [c, m] = t[k];
    roads[k] = Object.freeze({ cruise: Math.min(c, t.top) * KMH, max: Math.min(m, t.top) * KMH });
  }
  SPEEDS[id] = { top, accel: t.accel, roads };
}

/** `{ cruise, max }` in m/s for this vehicle on this kind of road. */
export function speedOn(typeId, kind) {
  const t = SPEEDS[typeId] || SPEEDS[FALLBACK];
  return t.roads[kind] || t.roads.street;
}

/** The fastest this vehicle may ever go, anywhere, in m/s. */
export function topSpeed(typeId) {
  return (SPEEDS[typeId] || SPEEDS[FALLBACK]).top;
}

/** How hard it pulls away, in m/s². */
export function pullAway(typeId) {
  return (SPEEDS[typeId] || SPEEDS[FALLBACK]).accel;
}

/**
 * What asking the driver for `mult` actually gets you, in m/s.
 *
 * `mult` is the compounding pace the ride bar and the typed words keep — 1 is
 * the driver's own pace, each "jaldi" multiplies it by 1.6 up to `full`. It used to
 * multiply the SPEED, which is how five presses on the Chhatikara road asked an
 * e-rickshaw for 130 m/s. Now it is how far the driver leans from the cruise toward
 * the road's `max`: the first press takes half of what there is, the second
 * most of the rest, and by the third there is nothing left — which the ride bar
 * then says. Below 1 the driver eases off, down to a third of the cruise.
 */
export function asked(sp, mult, full) {
  if (!(mult > 1)) return sp.cruise * Math.max(0.3, mult || 1);
  const x = Math.min(1, Math.log(mult) / Math.log(Math.max(1.01, full)));
  const u = 1 - (1 - x) * (1 - x);
  return sp.cruise + (sp.max - sp.cruise) * u;
}

/** How near a nav node has to be for a point to count as on its road, in metres. */
const ON_ROAD = 14;

/**
 * Which kind of road a vehicle at (x, z), heading (dx, dz), is on — or null
 * when there is no road under it.
 *
 * Read off the nav graph rather than `WorldService.nearestRoad`, which indexes
 * each OSM segment by its MIDPOINT: a long straight stretch is invisible from
 * most of its own length, and measured on the Chhatikara to ISKCON route 808 m
 * of 5.7 km had no road at all within 30 m by that query. NavGraph samples
 * every road each 8 m, so its nearest node is never far, and its edges carry
 * the kind. Of the edges at that node, the one running the way the vehicle is
 * going wins, so a junction with a gali does not slow the Chhatikara road.
 */
export function roadKindAt(nav, x, z, dx = 0, dz = 0) {
  if (!nav || !nav.nearest) return null;
  const n = nav.nearest(x, z);
  if (!n || (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z) > ON_ROAD * ON_ROAD) return null;
  const dl = Math.hypot(dx, dz);
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < n.edges.length; i++) {
    const e = n.edges[i];
    if (!RANK[e.kind]) continue;                   // stitch: glue, not a road
    let along = 1;
    if (dl > 1e-6 && nav.nodes) {
      const m = nav.nodes.get(e.to);
      if (!m) continue;
      const ex = m.x - n.x, ez = m.z - n.z;
      const el = Math.hypot(ex, ez);
      if (el < 1e-6) continue;
      along = Math.abs((ex * dx + ez * dz) / (el * dl));
    }
    // alignment first; the bigger road only breaks a tie
    const score = along * 10 + RANK[e.kind] * 0.01;
    if (score > bestScore) { bestScore = score; best = e.kind; }
  }
  return best;
}

/**
 * Runs of a different road this short, with the same road either side, are a
 * junction being crossed, not a road being driven — they take the road they
 * sit in. In route points, which are 4 m apart on a ride.
 */
const SHORT_RUN = 3;

/**
 * The road kind under every point of a route: entry `i` is the stretch from
 * point i to point i+1.
 *
 * Done once, when a route is laid — one nearest-node query a point, about
 * fourteen hundred for the longest ride in the world — and never per frame.
 * Points with no road under them take their neighbours' road; a route with no
 * road anywhere is a street.
 */
export function roadKindsAlong(nav, pts) {
  const n = pts.length;
  const out = new Array(n).fill(null);
  for (let i = 0; i < n - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    out[i] = roadKindAt(nav, (ax + bx) * 0.5, (az + bz) * 0.5, bx - ax, bz - az);
  }
  if (n > 1) out[n - 1] = out[n - 2];

  // fill the gaps from whichever side has a road
  let last = null;
  for (let i = 0; i < n; i++) { if (out[i]) last = out[i]; else if (last) out[i] = last; }
  last = null;
  for (let i = n - 1; i >= 0; i--) { if (out[i]) last = out[i]; else out[i] = last || 'street'; }

  // and a junction crossed is not a road driven
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && out[j + 1] === out[i]) j++;
    const len = j - i + 1;
    if (len < SHORT_RUN && i > 0 && j < n - 1 && out[i - 1] === out[j + 1]) {
      for (let k = i; k <= j; k++) out[k] = out[i - 1];
    }
    i = j + 1;
  }
  return out;
}
