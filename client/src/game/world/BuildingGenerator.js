/**
 * BuildingGenerator — the town fabric.
 *
 * What turns 2,165 OSM centrelines into a place you can walk: buildings are
 * not sprinkled along a road, they are built in TERRACES. A stretch of road
 * straight enough to share one frontage line gets one line, one rotation and
 * one setback, and everything on it stands shoulder to shoulder on that line,
 * the way a bazaar street is actually built. Where a row should break it
 * breaks into a gali wide enough to walk down — never into a slot.
 *
 * Three rules hold it up, and each is here because the version without it was
 * wrong in a way you could see from the street:
 *
 *   ROWS   one frontage line per terrace; fronts sit ON the line and depth
 *          grows backwards from it. Vary depth about the centre instead —
 *          which is what this did — and the facades go ragged while the backs
 *          stay tidy, which is exactly backwards.
 *   LANES  every gap between two buildings is either a shared wall or at
 *          least TOWN.laneMin of clear ground, and never anything between.
 *          Anything between is a pocket you can step into and not out of.
 *   FEWER  a whole row is built or it is not. Rolling per building gives a
 *          dotted line, which reads as a place falling down; rolling per row
 *          gives built streets with open ground between them, which reads as
 *          a village. The eye should land on the temples, not on frontage.
 *
 * Kits are registered per district kind, so extending to Mathura or Barsana is
 * adding an entry to KITS plus a district polygon — not editing this algorithm.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { SpatialGrid } from '../../engine/math/SpatialGrid.js';
import { pointInPolygon, resample } from '../../engine/math/Curves.js';
import { vMul } from './BrajPalette.js';
import { rngAt, pick, range, chance } from '../../engine/math/Random.js';
import { dist } from '../../engine/math/MathUtils.js';
import { WORLD } from '../../content/world.generated.js';
import { signAtlas, signUV, SIGN_COUNT, setRealSigns, realSignSlot } from './Signage.js';
import { lilaAtlas, lilaUV } from './LilaArt.js';
import { LILA_COUNT } from '../../content/lilas.js';

const _rm = new THREE.Matrix4();
const _rp = new THREE.Vector3();
const _rq = new THREE.Quaternion();
const _rs = new THREE.Vector3();
const _ry = new THREE.Vector3(0, 1, 0);

/**
 * The numbers worth arguing about.
 *
 * These belong in content/tuning.js with the rest of them. They are here
 * because that file was being edited elsewhere at the time and moving them
 * would have taken someone else's work out with them; move them when it is
 * quiet.
 */
const TOWN = {
  /**
   * Clear ground in any gap between two buildings, in metres.
   *
   * A walker is 0.84 m across and the resolver pushes out of one box at a
   * time, so a gap has to hold a person and room to turn round in or it is a
   * trap. Narrower than this is not built as a gap at all — the two buildings
   * share a wall instead, and there is nothing there to walk into.
   */
  laneMin: 2.4,
  /** Up to this, two buildings are one terrace and the gap is a party wall. */
  partyMax: 0.4,
  /** Further into each other than this is an overlap, not a party wall. */
  partyOverlap: 0.25,

  /** Metres of unbroken terrace before a gali must be cut through it. */
  terraceRun: [16, 38],
  /** How much wider than the minimum a gali may open out. */
  galiExtra: [0.3, 3.2],

  /** How far a road may turn and still share one frontage line, in radians. */
  terraceBend: 0.22,
  /** A terrace is cut at this length, so a long straight still reads as blocks. */
  terraceMax: 86,
  /** Shorter than this is not a row. */
  terraceMin: 15,

  /** Clear ground kept between a lot and the edge of any carriageway. */
  kerbClear: 0.7,
  /** A footprint spanning more fall than this is on a bank, not on ground. */
  bankFall: 1.6,

  /** A famous place draws a street to it: how hard, and over what distance. */
  landmarkPull: 1.35,
  landmarkReach: 130,
  /** OSM bothered to name it, so it is a street people actually walk. */
  namedRoad: 1.3,

  /** Ceiling on lots, scaled by the quality setting. */
  budget: 6000,
  /** Odds that a lot big enough to hold a room is one you can walk into. */
  /*
   * How many doors work.
   *
   * 0.12 was argued from "a town where every door works is a town where no
   * door means anything", which is true of a city and wrong for this. Braj is
   * a town of small houses whose doors stand open, and you asked for it to
   * work the way an RPG does: you see a door, you walk in, the view is the
   * inside. At one in eight you could walk a whole lane and find nothing.
   *
   * A third, and the ones that open are MARKED — a lit doorway with a step and
   * a frame — so a door that does nothing never looks like one that does.
   */
  enterable: 0.34,
};

/**
 * How much of a district is built, and how.
 *
 * `frontage` is the chance that a straight stretch of road there carries a row
 * at all. `terrace` says the rows are party-walled: a bazaar street is a
 * continuous wall of shopfronts with galis cut through it, while a colony of
 * plots is detached houses with ground between them.
 */
const DISTRICT_BUILD = {
  'old-town':       { frontage: 0.92, terrace: true },
  bazaar:           { frontage: 0.95, terrace: true },
  'temple-quarter': { frontage: 0.55, terrace: true },
  'ghat-front':     { frontage: 0.50, terrace: true },
  residential:      { frontage: 0.40, terrace: false },
  'raman-reti':     { frontage: 0.14, terrace: false },
  outskirts:        { frontage: 0.09, terrace: false },
  /**
   * Outside every district — the Chhatikara corridor, which is farmland.
   *
   * Low enough that six kilometres of approach road carries the odd farmstead
   * and nothing else. The road out to the highway is how the place is first
   * seen, and it should be fields.
   */
  country:          { frontage: 0.010, terrace: false },
};

/**
 * Lot sizing and setback per road kind.
 *
 * `share` is how much of its frontage that kind of road earns before the
 * district has its say; `gap` is the ground left between detached houses.
 * A trunk road carries none: the national highway through the fields is not
 * a street, and lining it was half of what made the corridor look like town.
 */
const ROAD_LOT = {
  highway:   { front: [11, 18],  depth: [11, 16], setback: 5.5, share: 0.30, gap: [6, 16] },
  main:      { front: [8, 14],   depth: [10, 15], setback: 3.6, share: 0.85, gap: [4, 11] },
  street:    { front: [6, 11],   depth: [9, 14],  setback: 2.2, share: 1.00, gap: [3, 9] },
  gali:      { front: [4.5, 8],  depth: [7, 12],  setback: 1.3, share: 1.00, gap: [2.6, 6] },
  path:      { front: [5, 9],    depth: [7, 11],  setback: 2.4, share: 0.22, gap: [4, 12] },
  parikrama: { front: [7, 13],   depth: [9, 14],  setback: 4.5, share: 0.45, gap: [5, 14] },
  trunk:     null,
};

export function buildBuildings(ctx, terrain) {
  const gen = new CityFabric(ctx, terrain);
  return gen.build();
}

class CityFabric {
  constructor(ctx, terrain) {
    this.ctx = ctx;
    this.terrain = terrain;
    this.data = ctx.data;
    this.occupancy = new SpatialGrid(16);
    this.roadGrid = new SpatialGrid(40);
    this.colliders = [];
    this.lots = [];
    this.interiors = [];
    /** Largest circumradius placed so far, so the lane query can be tight. */
    this.maxLotR = 0;

    // Landmarks and the river are hard keep-outs.
    /**
     * Ground a landmark owns, which nothing else may build on.
     *
     * The default is the building's own footprint and a little air. Some
     * landmarks stand in a walled compound far larger than themselves —
     * Krishna Balaram's campus is 123 x 132 m around a 54 x 66 m temple — and
     * filling that with generated shophouses put a bazaar where the samadhi
     * and the goshala are, and left you wedged between buildings that are not
     * there in life. `grounds` in config.mjs overrides it, in metres.
     */
    /*
     * A CIRCLE CANNOT SAY WHAT THIS NEEDS TO SAY.
     *
     * Satellite imagery at 0.265 m/px shows no open ground of ANY kind within
     * 100 m of Banke Bihari: a continuous unbroken carpet of flat roofs, with
     * the lanes appearing only as thin dark cracks, many of them bridged by
     * awnings and upper floors. "You cannot see the temple from any distance.
     * Zero." Ours stood in a field, and so did every other lane temple.
     *
     * The fix is not a smaller circle. A circle either leaves a moat all the
     * way round or lets a generated house land on the spot where the player
     * stands for darshan. What the town actually does is build hard against
     * the sides and the back and leave only the approach — so the keep-out is
     * an ORIENTED RECTANGLE with a deep pad on the front and almost none on
     * the other three sides.
     *
     * Landmarks with an explicit `grounds` keep the circle: Krishna Balaram's
     * campus and Prem Mandir's park are real open ground, and crowding those
     * would be the same mistake in the other direction.
     */
    const anchors = (ctx.world && ctx.world.anchors) || {};
    this.keepOut = ctx.data.LOCATIONS.map((l) => {
      const half = Math.max(l.build.w, l.build.d) * 0.5;
      if (l.grounds) return { x: l.pos[0], z: l.pos[1], r: l.grounds };
      /*
       * WHICH WAY IS THE FRONT? Ask the building.
       *
       * This took the front as (sin rot, cos rot) — the yaw convention the
       * generic darshan anchor uses. But the landmark builders that lay
       * themselves out in the BOX frame put their front along (-sin rot,
       * cos rot): the same at rot 0 or 180, mirror images otherwise. So at
       * Madan Mohan's 45 degrees, Chaar Dham's -97.5 and Rangaji's 90 the deep
       * front pad — the one that keeps the town off the approach — sat on the
       * wrong side of the building. Landmarks are built before the town
       * (WorldService), and every builder publishes where its Deity is and
       * where a pilgrim stands to see it; the line from one to the other IS
       * the front, whatever frame the builder was written in.
       */
      let fx = Math.sin(l.rot), fz = Math.cos(l.rot);
      const a = anchors[l.id];
      if (a && a.altar && a.darshan) {
        const dx = a.darshan.x - a.altar.x, dz = a.darshan.z - a.altar.z;
        const L = Math.hypot(dx, dz);
        if (L > 0.5) { fx = dx / L; fz = dz / L; }
      }
      return {
        x: l.pos[0], z: l.pos[1],
        /*
         * The front pad has to clear the darshan anchor, which the landmark
         * generator puts at half the footprint plus 5.5 m. Anything less and
         * the town builds a house on the place the game walks you to.
         */
        front: half + 7.0,
        /*
         * 3 m, not the 0.8 m that "party-walled" suggests, because `w` and
         * `d` are the WALLS and the builders draw past them: Banke Bihari's
         * plinth is `w + 5`, i.e. 2.5 m proud on each side, and a chhajja
         * reaches 1.55 m. At 0.8 m the town would have built houses standing
         * on the temple's own plinth — which no check in the suite can see,
         * because every one of them asks whether you can walk somewhere, not
         * whether two things are inside each other.
         */
        across: l.build.w * 0.5 + 3.0,
        back: l.build.d * 0.5 + 3.0,
        /* The facing the game itself uses: LandmarkGenerator places the
         * darshan anchor along (sin rot, cos rot), so that is the front. */
        sn: fx, cs: fz,
        // kept for the audit in tools/checks: how far this moved the front
        yawFront: Math.atan2(Math.sin(l.rot), Math.cos(l.rot)),
      };
    });
    /** The same places, as the thing a street wants to lead to. */
    this.marks = ctx.data.LOCATIONS.map((l) => ({ x: l.pos[0], z: l.pos[1] }));

    /**
     * Every carriageway, in short pieces.
     *
     * The grid buckets a segment by its midpoint, and raw OSM traces the
     * highway in 300 m strides — a segment like that is invisible to any
     * query that is not standing on its middle. Resampling first is what makes
     * the lookup honest.
     */
    for (const road of this.data.ROADS) {
      const half = road.width * 0.5;
      const pts = resample(road.points, 8);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        this.roadGrid.insert((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, {
          ax: a[0], az: a[1], bx: b[0], bz: b[1], half,
        });
      }
    }

    /**
     * Districts, smallest first.
     *
     * They nest: Loi Bazar's polygon lies wholly inside the old town's, and
     * first-match order meant the bazaar was never once selected — the whole
     * market got the old-town kit and none of the shopfronts, awnings or
     * painted signboards that are the reason the bazaar kit exists. Smallest
     * containing polygon wins, which is what nesting has always meant.
     */
    this.byArea = this.data.DISTRICTS.slice()
      .sort((a, b) => polyArea(a.poly) - polyArea(b.poly));

    /** What a place outside every district polygon is built like. */
    this.country = this.data.DISTRICTS.find((d) => d.kind === 'outskirts') || this.data.DISTRICTS[0];
  }

  build() {
    this._layout();
    return this._mesh();
  }

  /* ================================================================
   * Layout — cut the roads into terraces, build the rows
   * ================================================================ */
  _layout() {
    const budget = Math.round(TOWN.budget * this.ctx.quality.props);
    // Widest roads first. The lane rule refuses anything that would leave a
    // slot, so whoever asks first wins the ground — and it should be the main
    // street rather than the gali running behind it.
    const roads = this.data.ROADS.slice().sort((a, b) => b.width - a.width);
    let rows = 0;

    for (const road of roads) {
      if (this.lots.length >= budget) break;
      const cfg = ROAD_LOT[road.kind] === undefined ? ROAD_LOT.street : ROAD_LOT[road.kind];
      if (!cfg) continue;
      const rng = rngAt(road.id);

      for (const run of this._terraces(road)) {
        for (const side of [1, -1]) {
          if (this.lots.length >= budget) break;
          const mid = run[Math.floor(run.length / 2)];
          if (!chance(rng, cfg.share * this._worth(mid[0], mid[1], road))) continue;
          if (this._row(road, cfg, run, side, rng)) rows++;
        }
      }
    }
    console.info('[buildings] ' + this.lots.length + ' in ' + rows + ' rows along '
      + roads.length + ' roads');
  }

  /**
   * Cut a road into stretches straight enough to share one frontage line.
   *
   * A row reads as a row because its fronts lie on a line. OSM centrelines
   * wander, so a stretch ends as soon as the road has turned further than
   * TOWN.terraceBend from the heading it set out on — and again every
   * terraceMax metres, so that even a dead straight road breaks into blocks
   * instead of running one unbroken wall for half a kilometre.
   */
  _terraces(road) {
    const pts = resample(road.points, 5);
    const runs = [];
    if (pts.length < 2) return runs;
    let start = 0, h0 = null, len = 0;

    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dz = pts[i][1] - pts[i - 1][1];
      const seg = Math.hypot(dx, dz);
      if (seg < 1e-3) continue;
      const h = Math.atan2(dz, dx);
      if (h0 === null) h0 = h;
      const turn = (h - h0 + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      if (Math.abs(turn) > TOWN.terraceBend || len + seg > TOWN.terraceMax) {
        if (len >= TOWN.terraceMin) runs.push(pts.slice(start, i));
        start = i - 1; h0 = h; len = seg;
      } else len += seg;
    }
    if (len >= TOWN.terraceMin) runs.push(pts.slice(start));
    return runs;
  }

  /**
   * One terrace: one frontage line, one rotation, shoulder to shoulder.
   *
   * The front face of every building lands ON the line and the depth grows
   * away from the road, so a row of buildings of different depths still
   * presents one flush street wall. Breaks in the row are galis of at least
   * TOWN.laneMin, and a lot refused by `_fits` simply leaves its own frontage
   * as a wider gap — and that is a lane, because the narrowest frontage a lot
   * can have is already wider than the narrowest legal lane.
   */
  _row(road, cfg, run, side, rng) {
    const a = run[0], b = run[run.length - 1];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const L = Math.hypot(dx, dz);
    if (L < TOWN.terraceMin) return false;
    dx /= L; dz /= L;
    const nx = -dz * side, nz = dx * side;

    // The chord cuts the corners of a bend, so the real centreline can stray
    // out past it on this side. Push the frontage line beyond the furthest it
    // strays, or the row stands in the road on the outside of the curve.
    let bulge = 0;
    for (const p of run) {
      const o = (p[0] - a[0]) * nx + (p[1] - a[1]) * nz;
      if (o > bulge) bulge = o;
    }
    const line = road.width * 0.5 + cfg.setback + bulge;
    // The facade frame, whose normal points back at the road.
    const rot = Math.atan2(nx, nz) + Math.PI;

    const mx = (a[0] + b[0]) * 0.5 + nx * line, mz = (a[1] + b[1]) * 0.5 + nz * line;
    const inside = this._districtAt(mx, mz);
    const district = inside || this.country;
    const build = DISTRICT_BUILD[inside ? inside.kind : 'country'] || DISTRICT_BUILD.country;

    /**
     * What the row holds in common.
     *
     * One depth, one storey height and two neighbouring colours for the whole
     * terrace. This is most of the difference between a street somebody built
     * and a street that accumulated: real rows share a builder, a year and a
     * lime pit, and the eye reads that long before it reads the detail.
     */
    const row = {
      depth: range(rng, cfg.depth[0], cfg.depth[1]),
      storeys: Math.max(1, Math.round(range(rng, district.minH, district.maxH) / STOREY)),
      palette: [pick(rng, district.palette), pick(rng, district.palette)],
    };

    let t = range(rng, 0.5, 4);
    let held = 0;
    let target = range(rng, TOWN.terraceRun[0], TOWN.terraceRun[1]);
    let placed = 0;

    while (t < L - 1) {
      const frontage = range(rng, cfg.front[0], cfg.front[1]);
      if (t + frontage > L - 0.5) break;
      const depth = row.depth * range(rng, 0.9, 1.12);
      const off = line + depth * 0.5;
      const cx = a[0] + dx * (t + frontage * 0.5) + nx * off;
      const cz = a[1] + dz * (t + frontage * 0.5) + nz * off;

      if (this._fits(cx, cz, frontage, depth, rot)) {
        this._addLot(cx, cz, frontage, depth, rot, district, rng, road, row);
        placed++;
      }

      t += frontage;
      held += frontage;
      if (build.terrace) {
        // a party wall until the block has run long enough, then a gali
        if (held >= target) {
          t += TOWN.laneMin + range(rng, TOWN.galiExtra[0], TOWN.galiExtra[1]);
          held = 0;
          target = range(rng, TOWN.terraceRun[0], TOWN.terraceRun[1]);
        }
      } else {
        t += Math.max(TOWN.laneMin, range(rng, cfg.gap[0], cfg.gap[1]));
        held = 0;
      }
    }
    return placed > 0;
  }

  /**
   * How much built frontage a spot deserves, as the odds for one row.
   *
   * Density by district, then a pull toward whatever famous place is nearest,
   * then a bonus for a road OSM bothered to name. What it buys: the old town
   * and Loi Bazar are solid, the approaches to the temples are built up, and
   * the fields stay fields.
   */
  _worth(x, z, road) {
    const d = this._districtAt(x, z);
    const build = DISTRICT_BUILD[d ? d.kind : 'country'] || DISTRICT_BUILD.country;
    let near = Infinity;
    for (const m of this.marks) {
      const dd = dist(x, z, m.x, m.z);
      if (dd < near) near = dd;
    }
    let w = build.frontage * (1 + TOWN.landmarkPull * Math.exp(-near / TOWN.landmarkReach));
    if (road.name) w *= TOWN.namedRoad;
    return w;
  }

  /** The smallest district a point is in, or null for open country. */
  _districtAt(x, z) {
    for (const d of this.byArea) if (pointInPolygon(x, z, d.poly)) return d;
    return null;
  }

  _fits(x, z, w, d, rot) {
    // The world is a RECTANGLE, 9.2 x 4.8 km. This test used to be
    // `Math.abs(x) > 2080`, which is a square, and a square centred on Banke
    // Bihari is not this world — it refused four fifths of the map, the whole
    // Chhatikara corridor included, while looking like a map-edge guard.
    const B = WORLD.bounds;
    if (x < B.minX + 10 || x > B.maxX - 10 || z < B.minZ + 10 || z > B.maxZ - 10) return false;

    const r = Math.hypot(w, d) * 0.5;
    for (const k of this.keepOut) {
      if (k.r !== undefined) {                  // a real walled compound
        if (dist(x, z, k.x, k.z) < k.r + r * 0.5) return false;
        continue;
      }
      const dx = x - k.x, dz = z - k.z;
      const along = dx * k.sn + dz * k.cs;      // toward the front, in metres
      const across = dx * k.cs - dz * k.sn;
      const pad = r * 0.5;
      if (Math.abs(across) < k.across + pad
        && along < k.front + pad && along > -(k.back + pad)) return false;
    }
    if (!this._dry(x, z, w, d, rot)) return false;
    if (!this._offRoad(x, z, w, d, rot)) return false;

    /**
     * The lane rule.
     *
     * Two buildings either share a wall or leave ground a person can walk
     * down and turn round in. A gap between those two is a pocket: wide
     * enough that the resolver lets you in, narrow enough that it will not
     * let you out, and there is no number of them that is acceptable.
     */
    const cand = obb(x, z, w, d, rot, _obbA);
    const near = this.occupancy.query(x, z, r + this.maxLotR + TOWN.laneMin + 0.5,
      this._scratch || (this._scratch = []));
    for (let i = 0; i < near.length; i++) {
      const o = near[i];
      if (dist(x, z, o.x, o.z) > r + o.r + TOWN.laneMin) continue;
      const gap = obbGap(cand, obb(o.x, o.z, o.w, o.d, o.rot, _obbB));
      if (gap < -TOWN.partyOverlap) return false;
      if (gap > TOWN.partyMax && gap < TOWN.laneMin) return false;
    }
    return true;
  }

  /**
   * Dry ground, level enough to build on.
   *
   * This used to be `sampleHeight < 0.2`, which sounds like "not in the river"
   * and is not. The terrain datum puts the old town, Loi Bazar and the temple
   * quarter between 0.0 and 0.3 m, so the rule was refusing 71% of the old
   * town, 80% of the temple quarter and 99% of the ghats, and pushing the
   * whole town out to the southern fringe where the ground happens to sit
   * higher. The river knows where it is — ask it — and refuse a bank too
   * steep separately, which is what the old comment claimed to be doing.
   */
  _dry(x, z, w, d, rot) {
    if (this.terrain.isWater(x, z)) return false;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const hw = w * 0.5, hd = d * 0.5;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 4; i++) {
      const lx = (i & 1) ? hw : -hw, lz = (i & 2) ? hd : -hd;
      const px = x + lx * cs + lz * sn, pz = z - lx * sn + lz * cs;
      if (this.terrain.isWater(px, pz)) return false;
      const h = this.terrain.sampleHeight(px, pz);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    return hi - lo < TOWN.bankFall;
  }

  /**
   * Nothing may stand on a carriageway.
   *
   * A terrace clears its own road by construction; this is about every other
   * road that crosses it. A building in a gali is the one obstruction a walker
   * cannot route around, because the gali was the route.
   */
  _offRoad(x, z, w, d, rot) {
    const r = Math.hypot(w, d) * 0.5;
    const near = this.roadGrid.query(x, z, r + 20,
      this._roadScratch || (this._roadScratch = []));
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (let i = 0; i < near.length; i++) {
      const s = near[i];
      const pad = s.half + TOWN.kerbClear;
      const adx = s.ax - x, adz = s.az - z;
      const bdx = s.bx - x, bdz = s.bz - z;
      if (segHitsBox(adx * cs - adz * sn, adx * sn + adz * cs,
        bdx * cs - bdz * sn, bdx * sn + bdz * cs,
        w * 0.5 + pad, d * 0.5 + pad)) return false;
    }
    return true;
  }

  _addLot(x, z, w, d, rot, district, rng, road, row) {
    const storeys = Math.max(1, row.storeys + (chance(rng, 0.28) ? 1 : 0) - (chance(rng, 0.18) ? 1 : 0));
    const lot = {
      x, z, w, d, rot,
      /**
       * The angle solids are drawn at, and it is not `rot`.
       *
       * MeshBuilder.box turns by +rot and MeshBuilder.panel turns by -rot:
       * they are mirror frames. Every facade, awning, signboard, doorway and
       * instanced interior in this file is authored in the panel frame, and so
       * is InteriorSystem, so the panel frame is what "which way is this
       * building facing" means here. Handing `rot` to box() therefore drew the
       * mass reflected — measured over the whole town the footprints sat a
       * mean 44 degrees off their own street while their windows faced it
       * squarely, which is most of why the place looked scattered and why the
       * gaps between neighbours came out at every width but the right one.
       * Solids and colliders take `solid`; panels take `rot`.
       */
      solid: -rot,
      district, storeys,
      color: chance(rng, 0.5) ? row.palette[0] : row.palette[1],
      seed: rng() * 1000,
      onBazaar: district.kind === 'bazaar' || road.kind === 'gali' || /bazar/i.test(road.name || ''),
      r: Math.hypot(w, d) * 0.5,
      y: this.terrain.sampleHeight(x, z),
    };
    // A handful of buildings open. Not all of them — the same choice GTA and
    // Pokemon both make, because a town where every door works is a town where
    // no door means anything. Only lots with enough floor to hold a room.
    const kind = lot.district.kind;
    const wants = (kind === 'bazaar' || kind === 'old-town' || kind === 'residential');
    const tpl = templateFor(w, d);
    lot.enterable = wants && !!tpl && chance(rng, TOWN.enterable);
    lot.roomKind = lot.enterable ? (kind === 'bazaar' && tpl !== 'hut' ? 'shop' : tpl) : null;
    if (lot.enterable) {
      lot.interiorName = pick(rng, kind === 'bazaar'
        ? ['Cloth shop', 'Sweet shop', 'Brass and bell metal', 'Garland seller', 'Chai stall', 'Bookseller']
        : ['A home', 'A home', 'Dharamshala', 'A courtyard house']);
      // how high the room's ceiling sits in world space. InteriorSystem clips
      // the world at this height so you can see down into the room.
      lot.ceil = lot.y + (ROOM_TEMPLATES[lot.roomKind] || ROOM_TEMPLATES.hut).h + 0.34;
      this.interiors.push(lot);
    }

    this.lots.push(lot);
    this.occupancy.insert(x, z, lot);
    if (lot.r > this.maxLotR) this.maxLotR = lot.r;

    if (lot.enterable) {
      // Walls with a doorway gap, so you can actually walk in. The gap belongs
      // on the same side as the drawn door, which means the lot's own frame —
      // laid out the other way round, the visible door was solid and the back
      // wall was the way in.
      const hw = w * 0.5, hd = d * 0.5, t = 0.45, door = 2.1;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const at = (lx, lz, bw, bd) => this.colliders.push({
        type: 'box', x: x + lx * cs + lz * sn, z: z - lx * sn + lz * cs,
        w: bw, d: bd, rot: lot.solid,
      });
      at(0, -hd, w, t);
      at(-hw, 0, t, d);
      at(hw, 0, t, d);
      const seg = (w - door) / 2;
      at(-(door / 2 + seg / 2), hd, seg, t);
      at(door / 2 + seg / 2, hd, seg, t);
      // remember where the way in is, so the facade can mark it and the
      // interior system can aim you at it
      lot.doorAt = [x + hd * sn, z + hd * cs];
      lot.doorW = door;
    } else {
      this.colliders.push({ type: 'box', x, z, w: w - 0.3, d: d - 0.3, rot: lot.solid });
    }
    return lot;
  }

  /**
   * One lila on one wall.
   *
   * Every building gets a DIFFERENT pastime, and the same building gets the
   * same one every time the world is built — the lila is chosen from the lot's
   * own seed, so a house you recognise by its mural stays that house.
   *
   * It goes on the street face, above head height so the crowd does not stand
   * in front of it, and below the first-floor band so it does not fight the
   * windows. Lots too narrow to carry one legibly do not get one: a mural
   * squeezed to a metre is a smudge, and a blank wall is better than a smudge.
   */
  _mural(lot, murals) {
    if (!murals || lot.w < 3.4) return;
    /*
     * THE MURAL WAS PAINTED OVER THE DOOR.
     *
     * "am unable to enter any house like pokemon rpg." Walking a test player
     * from the street through the door gets into 150 houses of 150 — the
     * collision was always fine. Photographing a door from where a person
     * stands showed why nobody tried: the doorway was filled edge to edge by
     * a lila panel. Putana Uddhar on one, Vastra Haran over a tea stall,
     * Jhulan on a third. You do not walk into a painting.
     *
     * The comment here always said "above head height". It was centred at
     * 2.05 m and up to 2.9 m square, so it spanned about 0.6-3.5 m — the door
     * opening is 0.7-3.2 m on the facade's own numbers. The words were right
     * and the arithmetic never was.
     *
     * Every other spot on a street face is a door or a window (facade() gives
     * each column one or the other on every storey), so the only clear wall
     * is the band between the ground-floor lintel (top at +2.95 over the
     * floor line) and the first-floor window sills (+3.1 + 1.5 - 0.575). About
     * a metre. That is where a painted panel goes, and it is where a deity
     * tile commonly sits over an Indian doorway anyway. A building too low to
     * HAVE that band — measured from what its kit actually drew — gets none.
     */
    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    const f = lot.d * 0.5 + 0.1;
    const floor = (lot.y || 0) + 0.7;               // the facade's ground-floor line
    const lintelTop = floor + 2.95;
    const nextSill = floor + STOREY + 1.5 - 0.575;
    const size = Math.min(nextSill - lintelTop - 0.12, 1.05, lot.w * 0.4);
    if (size < 0.6) return;
    const cy = (lintelTop + nextSill) / 2;
    if (!lot.drawnH || (lot.y || 0) + lot.drawnH < cy + size / 2 + 0.1) return;
    // deterministic per lot, and spread across the whole set
    const idx = Math.abs(Math.floor(lot.seed * 7919)) % LILA_COUNT;
    murals.panelUV(lot.x + f * sn, cy, lot.z + f * cs, size, size, lilaUV(idx), lot.rot, 0.05);
  }

  /* ================================================================
   * Geometry
   * ================================================================ */
  /**
   * One merged mesh for the whole city would be a single draw call that can
   * never be culled — and at 4.2 km across, that means drawing Raman Reti while
   * you stand in Nidhivan. So the fabric is merged per spatial chunk instead:
   * still only a couple of draw calls per chunk, but the frustum can now throw
   * away everything you are not looking at.
   */
  _mesh() {
    const group = new THREE.Group();
    group.name = 'Buildings';
    const CHUNK = 220;

    // Give the real shops their addresses.
    //
    // OSM names 133 places here, most of them ordinary businesses on ordinary
    // streets. Each one is matched to the nearest generated shop lot, which is
    // then painted with that name instead of a generic trade board. It does
    // not move any building - it names the one that already stands closest to
    // where the shop really is. Walking Loi Bazar should read as Loi Bazar,
    // not as a street of anonymous shutters.
    for (const lot of this.lots) lot.signSlot = -1;
    // the roads decide WHICH names get a slot — a dhaba on Bhaktivedanta Swami
    // Marg is a name you will read, a utility yard inside a campus is not — and
    // the landmarks decide which temples already have a building and do not
    // need a board
    const real = setRealSigns(
      this.ctx.data.POIS || [], this.ctx.data.ROADS || [], this.ctx.data.LOCATIONS || [],
    );
    let addressed = 0;
    real.forEach((board, n) => {
      const slot = realSignSlot(n);
      if (slot < 0) return;
      let best = null, bestD = 90 * 90;
      for (const lot of this.lots) {
        if (lot.signSlot >= 0) continue;
        const dx = lot.x - board.poi.pos[0], dz = lot.z - board.poi.pos[1];
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD) { bestD = d2; best = lot; }
      }
      if (best) { best.signSlot = slot; best.realName = board.poi.name; addressed++; }
    });
    /*
     * The names that found nothing — build them a frontage of their own.
     *
     * Forty-seven of the OSM names had no generated lot within ninety metres,
     * which means walking to a place the map labels and the search finds and
     * standing in an empty field. They are out where the terraces stop: along
     * the Chhatikara road, off the parikrama, on the far bank. The terraces
     * only form where a road is long enough to run one, so these were never
     * going to be picked up by widening the search — there is nothing there to
     * find.
     *
     * So each one gets a single building on the road it actually sits beside,
     * set back from the kerb and facing it. It is placed by the SAME rules as
     * every other lot — off the carriageway, clear of water, out of the keep-
     * out zones, not overlapping a neighbour — so a name that genuinely has
     * nowhere to stand still gets nothing rather than a shop in the Yamuna.
     */
    let planted = 0;
    const orphans = [];
    real.forEach((board, n) => {
      const slot = realSignSlot(n);
      if (slot < 0) return;
      if (this.lots.some((l) => l.realName === board.poi.name)) return;
      orphans.push({ board, slot });
    });

    for (const { board, slot } of orphans) {
      const [px, pz] = board.poi.pos;
      const segs = this.roadGrid.query(px, pz, 120, []);
      if (!segs.length) continue;

      // the nearest point on the nearest road, and which side of it we are on
      let best = null;
      for (const sg of segs) {
        const ex = sg.bx - sg.ax, ez = sg.bz - sg.az;
        const L2 = ex * ex + ez * ez;
        const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - sg.ax) * ex + (pz - sg.az) * ez) / L2)) : 0;
        const qx = sg.ax + ex * t, qz = sg.az + ez * t;
        const dd = Math.hypot(px - qx, pz - qz);
        if (!best || dd < best.d) best = { sg, qx, qz, d: dd, ex, ez, L2 };
      }
      if (!best) continue;

      const L = Math.sqrt(best.L2) || 1;
      const ux = best.ex / L, uz = best.ez / L;         // along the road
      let nx = -uz, nz = ux;                            // across it
      // point the normal at the POI, so the shop lands on the side it is on
      if ((px - best.qx) * nx + (pz - best.qz) * nz < 0) { nx = -nx; nz = -nz; }

      const rng = rngAt(Math.floor(Math.abs(px * 31 + pz * 17)) + 1);
      const district = this._districtAt(px, pz) || this.country;
      const w = range(rng, 6.5, 9.5), d = range(rng, 6.0, 8.5);
      const rot = Math.atan2(nx, nz) + Math.PI;
      const row = {
        depth: d,
        storeys: Math.max(1, Math.round(range(rng, district.minH, district.maxH) / STOREY)),
        palette: [pick(rng, district.palette), pick(rng, district.palette)],
      };
      const line = best.sg.half + 2.2 + d * 0.5;

      /*
       * Try the kerb first, then slide along the road either way. A named
       * place is a real address: it belongs on its own street, so nudging it
       * twenty metres up the same road is honest in a way that dropping it in
       * the nearest gap is not.
       */
      let put = null;
      for (const along of [0, 8, -8, 16, -16, 24, -24, 32, -32]) {
        const cx = best.qx + ux * along + nx * line;
        const cz = best.qz + uz * along + nz * line;
        if (this._fits(cx, cz, w, d, rot)) { put = [cx, cz]; break; }
      }
      if (!put) continue;

      this._addLot(put[0], put[1], w, d, rot, district, rng, best.sg.road || { kind: 'street', width: best.sg.half * 2 }, row);
      const lot = this.lots[this.lots.length - 1];
      lot.signSlot = slot;
      lot.realName = board.poi.name;
      planted++;
    }

    console.info(`[signs] ${addressed + planted} of ${real.length} real names have a shopfront`
      + ` (${addressed} on an existing lot, ${planted} given one of their own,`
      + ` ${real.length - addressed - planted} still with nowhere to stand)`);

    const chunks = new Map();
    for (const lot of this.lots) {
      const key = `${Math.floor(lot.x / CHUNK)},${Math.floor(lot.z / CHUNK)}`;
      let c = chunks.get(key);
      if (!c) { c = { walls: new MeshBuilder(), trim: new MeshBuilder(), signs: new MeshBuilder(), murals: new MeshBuilder(), lots: [] }; chunks.set(key, c); }
      c.lots.push(lot);
    }

    let tris = 0;
    const shadows = !!this.ctx.quality.shadows;

    for (const [key, c] of chunks) {
      for (const lot of c.lots) {
        const rng = rngAt(Math.floor(lot.seed * 7919));
        const dw = dwellingFor(lot, rng);
        /*
         * HOW TALL DID THIS BUILDING COME OUT?
         *
         * `lot.h` was read in two places and set in none, so both fell back to
         * a guess: the vertical weathering ramp used a flat 8 m for every
         * building in the town, and the mural had no way to know whether the
         * wall it was painted on even reached the height it was painted at.
         * Rather than make every kit report its height, measure it — the kit's
         * own vertices, from the moment it starts drawing to the moment it
         * stops, are the truth about what it drew.
         */
        const drawn = (mb, from) => {
          let top = lot.y;
          for (let i = from + 1; i < mb.pos.length; i += 3) if (mb.pos[i] > top) top = mb.pos[i];
          return top - lot.y;
        };
        if (dw) {
          const m0 = c.walls.pos.length;
          DWELLINGS[dw](lot, c.walls, c.trim, rng);
          lot.drawnH = drawn(c.walls, m0);
          this._mural(lot, c.murals);
          continue;
        }
        /*
         * The town gets the same vertical ramp the temples do.
         *
         * "Within one building the value spans roughly 3:1 top to bottom."
         * Every lot was one flat hex on all four faces and at every height,
         * which is the single reason a street of them reads as cardboard.
         * Set per lot, from that lot's own ground, and cleared afterwards so
         * roads and props are untouched.
         */
        // Most kits draw exactly storeys x STOREY, so that is the ramp's height
        // going in; the true height is measured on the way out.
        const lh = Math.max(3, (lot.storeys || 1) * STOREY);
        c.walls.weather((y) => vMul(y - lot.y, lh));
        c.trim.weather((y) => vMul(y - lot.y, lh));

        const kit = KITS[lot.district.kind] || KITS.residential;
        const m0 = c.walls.pos.length;
        kit({ lot, walls: c.walls, trim: c.trim, signs: c.signs, rng });
        lot.drawnH = drawn(c.walls, m0);

        c.walls.weather(null);
        c.trim.weather(null);
        streetLayer(lot, c.trim, rng);
        this._mural(lot, c.murals);
      }
      tris += c.walls.triangleCount + c.trim.triangleCount;

      if (!c.walls.isEmpty) {
        const m = c.walls.toMesh(`Walls_${key}`, { castShadow: shadows, receiveShadow: true });
        m.frustumCulled = true;
        group.add(m);
      }
      if (!c.trim.isEmpty) {
        const m = c.trim.toMesh(`Trim_${key}`, { castShadow: shadows, receiveShadow: true });
        m.frustumCulled = true;
        group.add(m);
      }
      if (!c.murals.isEmpty) {
        const m = c.murals.toMesh(`Murals_${key}`, {
          map: lilaAtlas(this.ctx), receiveShadow: true, doubleSided: false,
        });
        m.frustumCulled = true;
        group.add(m);
      }
      if (!c.signs.isEmpty) {
        const m = c.signs.toMesh(`Signs_${key}`, {
          map: signAtlas(this.ctx), receiveShadow: false, doubleSided: false,
        });
        m.frustumCulled = true;
        group.add(m);
      }
      c.walls.clear(); c.trim.clear(); c.signs.clear(); c.murals.clear();
    }

    console.info(`[buildings] ${Math.round(tris / 1000)}k triangles in ${chunks.size} chunks, ${group.children.length} meshes`);
    // three rooms, instanced into every building that opens
    const ROOM_CHUNK = 260;
    const byKind = new Map();
    for (const lot of this.interiors) {
      const k = (lot.roomKind || 'hut') + '|'
        + Math.floor(lot.x / ROOM_CHUNK) + ',' + Math.floor(lot.z / ROOM_CHUNK);
      if (!byKind.has(k)) byKind.set(k, []);
      byKind.get(k).push(lot);
    }
    const roomMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const roomGeoCache = new Map();
    for (const [key, lots] of byKind) {
      const kind = key.split('|')[0];
      if (!roomGeoCache.has(kind)) roomGeoCache.set(kind, roomGeometry(kind));
      const geo = roomGeoCache.get(kind);
      const inst = new THREE.InstancedMesh(geo, roomMat, lots.length);
      inst.name = 'Room_' + key;
      inst.castShadow = false;
      inst.receiveShadow = true;
      inst.frustumCulled = true;
      lots.forEach((lot, i) => {
        _rp.set(lot.x, lot.y, lot.z);
        _rq.setFromAxisAngle(_ry, lot.rot);
        _rs.set(1, 1, 1);
        _rm.compose(_rp, _rq, _rs);
        inst.setMatrixAt(i, _rm);
      });
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
    }

    const tally = {};
    for (const lot of this.interiors) {
      const k = lot.roomKind || 'hut';
      tally[k] = (tally[k] || 0) + 1;
    }
    console.info('[buildings] ' + this.interiors.length + ' you can walk into ('
      + Object.entries(tally).map(([k, v]) => v + ' ' + k).join(', ') + ') in '
      + byKind.size + ' cullable groups');
    return { group, colliders: this.colliders, interiors: this.interiors };
  }
}

/* ================================================================
 * Footprints
 *
 * A lot's frame: `u` runs along its frontage, `v` points at its street. This
 * is the panel frame — see `lot.solid` — and every question about where a
 * building is, rather than what it looks like, is asked in it.
 * ================================================================ */

const _obbA = { x: 0, z: 0, ux: 1, uz: 0, vx: 0, vz: 1, hw: 0, hd: 0 };
const _obbB = { x: 0, z: 0, ux: 1, uz: 0, vx: 0, vz: 1, hw: 0, hd: 0 };
const _cornA = new Float64Array(8);
const _cornB = new Float64Array(8);

/** Shoelace area of a district polygon, for deciding which one is inside which. */
function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) * 0.5;
}

function obb(x, z, w, d, rot, out) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  out.x = x; out.z = z;
  out.ux = cs; out.uz = -sn;
  out.vx = sn; out.vz = cs;
  out.hw = w * 0.5; out.hd = d * 0.5;
  return out;
}

function corners(r, out) {
  for (let i = 0; i < 4; i++) {
    const su = (i === 1 || i === 2) ? r.hw : -r.hw;
    const sv = (i >= 2) ? r.hd : -r.hd;
    out[i * 2] = r.x + r.ux * su + r.vx * sv;
    out[i * 2 + 1] = r.z + r.uz * su + r.vz * sv;
  }
}

function segPointDist(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const l2 = abx * abx + abz * abz;
  let t = l2 > 1e-9 ? ((px - ax) * abx + (pz - az) * abz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

/**
 * Metres of clear ground between two footprints; negative when they overlap.
 *
 * Separating axes answer whether they are apart at all, and cheaply. Once they
 * are known apart, the closest pair of features on two rectangles is always a
 * corner against an edge, so the exact distance is the smallest of those.
 */
function obbGap(a, b) {
  let sep = -Infinity;
  for (let k = 0; k < 4; k++) {
    const r = k < 2 ? a : b;
    const even = (k & 1) === 0;
    const nx = even ? r.ux : r.vx, nz = even ? r.uz : r.vz;
    const c = (b.x - a.x) * nx + (b.z - a.z) * nz;
    const ea = Math.abs(a.ux * nx + a.uz * nz) * a.hw + Math.abs(a.vx * nx + a.vz * nz) * a.hd;
    const eb = Math.abs(b.ux * nx + b.uz * nz) * b.hw + Math.abs(b.vx * nx + b.vz * nz) * b.hd;
    const s = Math.abs(c) - (ea + eb);
    if (s > sep) sep = s;
  }
  if (sep <= 0) return sep;

  corners(a, _cornA);
  corners(b, _cornB);
  let m = Infinity;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const j2 = (j + 1) & 3;
      const d1 = segPointDist(_cornA[i * 2], _cornA[i * 2 + 1],
        _cornB[j * 2], _cornB[j * 2 + 1], _cornB[j2 * 2], _cornB[j2 * 2 + 1]);
      if (d1 < m) m = d1;
      const d2 = segPointDist(_cornB[i * 2], _cornB[i * 2 + 1],
        _cornA[j * 2], _cornA[j * 2 + 1], _cornA[j2 * 2], _cornA[j2 * 2 + 1]);
      if (d2 < m) m = d2;
    }
  }
  return m;
}

/** Does a segment, given in a box's own frame, touch that box? */
function segHitsBox(ax, az, bx, bz, ex, ez) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  if (Math.abs(dx) < 1e-9) {
    if (ax < -ex || ax > ex) return false;
  } else {
    let p = (-ex - ax) / dx, q = (ex - ax) / dx;
    if (p > q) { const s = p; p = q; q = s; }
    if (p > t0) t0 = p;
    if (q < t1) t1 = q;
    if (t0 > t1) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < -ez || az > ez) return false;
  } else {
    let p = (-ez - az) / dz, q = (ez - az) / dz;
    if (p > q) { const s = p; p = q; q = s; }
    if (p > t0) t0 = p;
    if (q < t1) t1 = q;
    if (t0 > t1) return false;
  }
  return true;
}

/* ================================================================
 * Interior templates
 *
 * Three rooms — a hut, a house and a shop — built once and instanced into
 * every building that opens. Each template is authored at a fixed size, and
 * only buildings big enough to contain one are made enterable.
 * ================================================================ */

const ROOM_TEMPLATES = {
  hut:   { w: 5.0, d: 5.5, h: 2.6 },
  house: { w: 7.5, d: 9.0, h: 3.0 },
  shop:  { w: 8.5, d: 7.0, h: 3.2 },
};

function roomGeometry(kind) {
  const t = ROOM_TEMPLATES[kind];
  const b = new MeshBuilder();
  const W = t.w * 0.5, D = t.d * 0.5, H = t.h;

  const floorC = kind === "shop" ? 0xb8a684 : kind === "hut" ? 0xa89070 : 0xc4ae8a;
  const wallC  = kind === "shop" ? 0xe0d2b4 : kind === "hut" ? 0xcdbb9c : 0xdcd0bc;

  b.box(0, 0.02, 0, t.w, 0.1, t.d, floorC);
  b.box(0, 0.1, -D, t.w, H, 0.3, wallC);
  b.box(-W, 0.1, 0, 0.3, H, t.d, wallC);
  b.box(W, 0.1, 0, 0.3, H, t.d, wallC);
  const door = 1.9, seg = (t.w - door) / 2;
  b.box(-(door / 2 + seg / 2), 0.1, D, seg, H, 0.3, wallC);
  b.box(door / 2 + seg / 2, 0.1, D, seg, H, 0.3, wallC);
  b.box(0, H, 0, t.w, 0.3, t.d, kind === "hut" ? 0x8a6a42 : 0x6a5540);

  if (kind === "shop") {
    b.box(0, 0.14, -D * 0.35, t.w * 0.72, 0.95, 0.7, 0x8a6a42);
    for (let sh = 0; sh < 3; sh++) {
      b.box(0, 0.8 + sh * 0.68, -D + 0.45, t.w * 0.8, 0.08, 0.5, 0x7a5a38);
      for (let k = -3; k <= 3; k++) {
        b.box(k * t.w * 0.11, 0.88 + sh * 0.68, -D + 0.45, 0.26, 0.42, 0.26,
          [0xc8452a, 0xe8891f, 0x2f5d5a, 0xc9a03c, 0xf2ece0][(k + sh + 5) % 5]);
      }
    }
    b.box(-W + 0.5, 0.14, D * 0.3, 0.5, 0.7, 0.5, 0xb0603a);
  } else {
    // charpai, trunk, water pot, a shelf and a tulsi by the door
    b.box(-W * 0.45, 0.14, -D * 0.25, 1.0, 0.42, 1.9, 0x8a6a42);
    b.box(-W * 0.45, 0.56, -D * 0.25, 1.05, 0.12, 1.95, 0xd8ccb4);
    b.box(W * 0.5, 0.14, -D * 0.45, 0.8, 0.6, 1.1, 0x5a4230);
    b.box(W * 0.45, 0.14, D * 0.25, 0.44, 0.5, 0.44, 0xb0603a);
    b.box(-W * 0.6, 1.2, D * 0.4, 0.9, 0.08, 0.34, 0x7a5a38);
    if (kind === "house") {
      b.box(W * 0.2, 0.14, D * 0.35, 0.7, 0.5, 0.7, 0x4f7a3a);   // tulsi pot
      b.box(0, 1.9, 0, 0.3, 0.16, 0.3, 0xc9a03c);                 // hanging lamp
    }
  }
  return b.build();
}

/** Which template fits this lot, if any. */
function templateFor(w, d) {
  if (w >= 9.0 && d >= 7.6) return "shop";
  if (w >= 8.0 && d >= 9.6) return "house";
  if (w >= 5.6 && d >= 6.1) return "hut";
  return null;
}
/* ================================================================
 * Shared facade pieces
 * ================================================================ */

const STOREY = 3.1;

/** Which lots should be a modest dwelling rather than a full district building. */
function dwellingFor(lot, rng) {
  const k = lot.district.kind;
  const small = lot.w < 6.4 || lot.d < 9;

  if (k === 'outskirts') return rng() < 0.55 ? 'hut' : rng() < 0.7 ? 'shed' : null;
  if (k === 'residential' && small) return rng() < 0.42 ? 'room' : rng() < 0.6 ? 'hut' : null;
  if (k === 'raman-reti' && small && rng() < 0.3) return 'room';
  if (small && rng() < 0.3) return 'hut';
  return null;
}

/*
 * RED OXIDE, and the damp it is there to hide.
 *
 * "Almost every painted building carries a band of red/maroon oxide paint at
 * the base, 0.30-0.60 m tall, over the plinth and lowest wall. It is the
 * cheap way to hide the damp band. This is one of the most reliable small
 * features in the whole town and it costs one box."
 *
 * And underneath it, the reason it exists: "a damp/algae band at the bottom
 * 0.6-1.2 m, dark green-black, HARD-EDGED at the top" from splash-back and
 * rising damp. Hard-edged matters — a soft gradient reads as bad lighting,
 * a hard line reads as water.
 *
 * Algae measured at #20261f, which is far darker than instinct: it is not a
 * bright green, it is nearly black with a green cast.
 */
const OXIDE = [0x7d4038, 0x8c4a3a, 0x6e3630, 0x86423a];
const DAMP = [0x20261f, 0x2c3327, 0x39432f];

function streetLayer(lot, trim, rng) {
  const { x, y, z, w, d } = lot;
  if (w < 1.5 || d < 1.5) return;
  /*
   * TWO FAULTS HERE, BOTH MINE, BOTH FOUND BY PHOTOGRAPHING A DOOR.
   *
   * 1. The frame. This file's own note at `solid` says it plainly: "Solids and
   *    colliders take `solid`; panels take `rot`" — box() and panel() are
   *    mirror frames. These bands were drawn with box() and `rot`, so on every
   *    building not square to the axes they came out REFLECTED: a knee-high
   *    dark slab and a red one jutting diagonally out of the wall into the
   *    street, which is exactly what a camera standing at a door saw.
   *
   * 2. The door. They were one solid box round the whole base, so the damp
   *    band ran straight across every doorway. Nobody paints oxide across an
   *    open door and rain does not splash through one. Four runs now, the
   *    front split either side of the door.
   *
   * Positions use the same lot-frame mapping _addLot uses for its colliders,
   * so the bands sit exactly on the walls the player collides with.
   */
  const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
  const at = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  const door = Math.max(lot.doorW || 0, 1.9);
  const band = (hh, col, grow) => {
    const hw = w * 0.5 + grow, hd = d * 0.5 + grow, t = 0.05;
    let q = at(0, -hd);
    trim.box(q[0], y + 0.01, q[1], w + grow * 2, hh, t, col, lot.solid);
    q = at(-hw, 0);
    trim.box(q[0], y + 0.01, q[1], t, hh, d + grow * 2, col, lot.solid);
    q = at(hw, 0);
    trim.box(q[0], y + 0.01, q[1], t, hh, d + grow * 2, col, lot.solid);
    const seg = (w + grow * 2 - door) / 2;
    if (seg > 0.15) {
      for (const sgn of [-1, 1]) {
        q = at(sgn * (door / 2 + seg / 2), hd);
        trim.box(q[0], y + 0.01, q[1], seg, hh, t, col, lot.solid);
      }
    }
  };
  // the damp first, so the oxide sits proud of its lower half
  if (chance(rng, 0.78)) band(range(rng, 0.6, 1.2), DAMP[Math.floor(rng() * DAMP.length) % DAMP.length], 0.02);
  if (chance(rng, 0.70)) band(range(rng, 0.30, 0.60), OXIDE[Math.floor(rng() * OXIDE.length) % OXIDE.length], 0.04);
}

/** Roofs carry most of a town's colour from above. */
const ROOF_COLOURS = [
  0xa84636, 0xb85a42, 0x8f4a58, 0x5a6e8a,
  0x7a8a5a, 0xa87a48, 0x9c5040, 0x6a7a8c,
];

/** Windows and doors punched as shallow recessed panels on the street face. */
function facade(trim, lot, storeys, opts = {}) {
  const { x, z, w, d, rot, y } = lot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const front = d * 0.5;

  const cols = Math.max(1, Math.round(w / 2.8));
  for (let s = 0; s < storeys; s++) {
    for (let c = 0; c < cols; c++) {
      const lx = (c / cols - 0.5 + 0.5 / cols) * w * 0.86;
      const ly = y + 0.7 + s * STOREY;
      const door = s === 0 && c === Math.floor(cols / 2) && !opts.noDoor;
      /**
       * On a building you can walk into, the door has to be ON the hole.
       *
       * `_addLot` leaves the gap in the wall colliders centred on the
       * frontage, but the middle BAY is only centred when there is an odd
       * number of them: with an even number the chosen column sits half a bay
       * off, which painted up to 0.85 m of the 1.15 m door across solid wall
       * and left the actual opening beside it. Measured over the town, 88 of
       * the 205 enterable buildings that draw a facade were like this.
       */
      const ox = (door && lot.enterable) ? 0 : lx;
      const px = x + ox * cs + front * sn;
      const pz = z - ox * sn + front * cs;

      if (door) {
        trim.panel(px, ly + 1.15, pz, 1.15, 2.3, 0x3f2a1e, rot, 0.05);
        trim.panel(px, ly + 2.42, pz, 1.65, 0.28, opts.accent || 0xc8452a, rot, 0.07);
        /*
         * A door that WORKS looks different from one that does not.
         *
         * Otherwise every house is a maybe, and you learn to stop trying —
         * which is the opposite of what an RPG town is for. An open doorway is
         * wider and darker, it has a stone step you can see from down the lane,
         * a painted frame around it, and a strung toran over it the way a house
         * in Braj marks its own entrance.
         */
        if (lot.enterable) {
          trim.panel(px, ly + 1.25, pz, 1.65, 2.5, 0x140d08, rot, 0.09);        // the opening
          trim.panel(px, ly + 1.25, pz, 2.05, 2.9, 0xe8dcc0, rot, 0.045);       // its frame
          trim.panel(px, ly + 2.78, pz, 2.2, 0.34, 0xc9a03c, rot, 0.11);        // lintel
          // the toran: a strung line of leaves and marigolds across the head
          for (let k = -2; k <= 2; k++) {
            trim.panel(px + k * 0.38 * cs, ly + 2.5, pz - k * 0.38 * sn,
              0.24, 0.3, k % 2 ? 0xe8891f : 0x2f6f4f, rot, 0.13);
          }
          // the step, which is the part you see from down the lane
          trim.panel(px, ly + 0.11, pz, 2.1, 0.22, 0xd8cfb8, rot, 0.28);
        }
      } else {
        trim.panel(px, ly + 1.5, pz, 0.85, 1.15, 0x2f3b3a, rot, 0.05);
        if (opts.shutters) {
          trim.panel(px - 0.58, ly + 1.5, pz, 0.28, 1.3, opts.shutterColor || 0x2f5d5a, rot, 0.06);
          trim.panel(px + 0.58, ly + 1.5, pz, 0.28, 1.3, opts.shutterColor || 0x2f5d5a, rot, 0.06);
        }
      }
    }
    if (s > 0) {
      trim.panel(x + front * sn, y + 0.7 + s * STOREY - 0.15, z + front * cs,
        w * 0.98, 0.2, opts.accent || 0x9c7a52, rot, 0.04);
    }
  }
}

/** Openings on every elevation, not just the one facing the road. */
function facadeAllSides(trim, lot, storeys, opts = {}) {
  facade(trim, lot, storeys, opts);

  const { x, z, w, d, rot, y } = lot;
  const sides = [
    { off: d * 0.5, ang: rot + Math.PI, span: w },
    { off: w * 0.5, ang: rot + Math.PI / 2, span: d },
    { off: w * 0.5, ang: rot - Math.PI / 2, span: d },
  ];

  for (const sd of sides) {
    const cs = Math.cos(sd.ang), sn = Math.sin(sd.ang);
    const cols = Math.max(1, Math.round(sd.span / 4.2));
    for (let st = 0; st < storeys; st++) {
      for (let c = 0; c < cols; c++) {
        const lx = (c / cols - 0.5 + 0.5 / cols) * sd.span * 0.8;
        const ly = y + 2.2 + st * STOREY;
        trim.panel(x + lx * cs + sd.off * sn, ly, z - lx * sn + sd.off * cs,
          0.8, 1.05, 0x2f3b3a, sd.ang, 0.05);
      }
    }
  }
}

/**
 * Flat roof with a parapet, plus a water tank and the odd pot.
 *
 * Every offset here is in the lot's own frame. It used to mix the two frames
 * in one function — parapets placed one way, the panel that drew them turned
 * the other — which put a vertical quad the size of the roof through the
 * middle of every building.
 */
function roofDeck(trim, lot, topY, rng, color) {
  const roof = ROOF_COLOURS[Math.floor(rng() * ROOF_COLOURS.length) % ROOF_COLOURS.length];
  const { x, z, w, d, rot } = lot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  trim.box(x, topY + 0.02, z, w * 0.99, 0.06, d * 0.99, roof, lot.solid);

  // the parapet, four thin panels rather than four boxes
  for (const [lu, lv, span, ang] of [
    [0, d * 0.5, w + 0.3, rot], [0, -d * 0.5, w + 0.3, rot + Math.PI],
    [w * 0.5, 0, d + 0.3, rot + Math.PI / 2], [-w * 0.5, 0, d + 0.3, rot - Math.PI / 2],
  ]) {
    trim.panel(x + lu * cs + lv * sn, topY + 0.36, z - lu * sn + lv * cs,
      span, 0.72, color, ang, 0.03);
  }
  /*
   * THE ROOF KIT.
   *
   * "The water tank is on essentially every roof and it is the most
   * recognisable item in an Indian skyline" — 500-2000 L, stainless or
   * black/white plastic, ON A MILD-STEEL STAND 0.6-1.2 m, with a vertical
   * inlet pipe. It was a 1 m cube sitting flat on the slab at 55%, which is
   * the right idea drawn wrong: the stand is most of what you actually see.
   */
  if (chance(rng, 0.84)) {
    const lu = range(rng, -w * 0.3, w * 0.3), lv = range(rng, -d * 0.3, d * 0.3);
    const px = x + lu * cs + lv * sn, pz = z - lu * sn + lv * cs;
    const stand = range(rng, 0.6, 1.2);
    const r = range(rng, 0.42, 0.62);
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      trim.box(px + ox * r * 0.7, topY, pz + oz * r * 0.7, 0.07, stand, 0.07, 0x6b6257, lot.solid);
    }
    const TANK = [0x2b2b2e, 0xd8d8d2, 0x9aa4a8, 0x1f2a33];   // black, white, steel, blue
    trim.box(px, topY + stand, pz, r * 2, range(rng, 0.7, 1.15), r * 2,
      TANK[Math.floor(rng() * TANK.length) % TANK.length], lot.solid);
    trim.box(px + r * 0.9, topY, pz, 0.06, stand + 1.2, 0.06, 0x8a8278, lot.solid);  // inlet
  }

  /*
   * THE MONKEY CAGE — specific to this town, and worth more for
   * recognisability than a shikhara.
   *
   * Vrindavan Today, on the monkey problem: "Houses are grilled with metal so
   * that monkeys can't enter." A weldmesh screen on light angle-iron, 1.8-2.5
   * m tall, over part or all of the terrace. Drawn as posts and a top rail
   * rather than a mesh surface: at any distance the mesh itself is invisible
   * and the frame is the whole silhouette.
   */
  if (chance(rng, 0.42)) {
    const hh = range(rng, 1.8, 2.5);
    const n = Math.max(2, Math.round(w / 1.9));
    for (let i = 0; i <= n; i++) {
      const lu = (i / n - 0.5) * w * 0.9;
      for (const lv of [d * 0.45, -d * 0.45]) {
        trim.box(x + lu * cs + lv * sn, topY + 0.4, z - lu * sn + lv * cs,
          0.06, hh, 0.06, 0x54524c, lot.solid);
      }
    }
    for (const lv of [d * 0.45, -d * 0.45]) {
      trim.box(x + lv * sn, topY + 0.4 + hh, z + lv * cs, w * 0.9, 0.06, 0.06,
        0x54524c, lot.solid);
    }
  }

  /* The mumty: the stair head, "usually the ugliest thing on the roof,
   * unrendered brick with a single door". */
  if (chance(rng, 0.5) && w > 5 && d > 5) {
    const lu = range(rng, -w * 0.25, w * 0.25), lv = range(rng, -d * 0.25, d * 0.25);
    trim.box(x + lu * cs + lv * sn, topY, z - lu * sn + lv * cs,
      2.0, range(rng, 2.1, 2.6), 2.5, 0x8a6a52, lot.solid);
  }

  if (chance(rng, 0.4)) {
    const lu = range(rng, -w * 0.35, w * 0.35);
    trim.box(x + lu * cs, topY + 0.7, z - lu * sn, 0.34, 0.4, 0.34, 0xb0603a, lot.solid);
  }
}


/**
 * Ordinary dwellings. A district kit gives a street its character; these give
 * it its truth — the single room, the tin shed, the half-built brick house
 * with rebar still showing. Chosen by lot size, so small plots get small homes.
 */
const DWELLINGS = {
  hut: (lot, walls, trim, rng) => {
    const h = 2.4 + rng() * 0.5;
    // mud or lime-washed brick, one door, one small window
    walls.box(lot.x, lot.y, lot.z, lot.w * 0.82, h, lot.d * 0.78, lot.color, lot.solid, 0b111101);
    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    const front = lot.d * 0.39;
    trim.panel(lot.x + front * sn, lot.y + 1.0, lot.z + front * cs, 0.9, 1.95, 0x3f2a1e, lot.rot, 0.05);
    trim.panel(lot.x + (front) * sn + 1.1 * cs, lot.y + 1.5, lot.z + front * cs - 1.1 * sn,
      0.55, 0.6, 0x2f3b3a, lot.rot, 0.05);
    // a thatched or tin roof, pitched
    const tin = rng() < 0.45;
    const rc = tin ? 0x8c8a80 : 0x9a7a44;
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      trim.box(lot.x, lot.y + h + i * 0.12, lot.z,
        lot.w * (0.9 - t * 0.5), 0.12, lot.d * (0.86 - t * 0.5), rc, lot.solid);
    }
    // the things that are always outside a door here
    if (chance(rng, 0.5)) trim.box(lot.x + (front + 1.1) * sn, lot.y, lot.z + (front + 1.1) * cs, 0.5, 0.55, 0.5, 0xb0603a, lot.solid);
    if (chance(rng, 0.35)) trim.box(lot.x + (front + 0.9) * sn - 1.4 * cs, lot.y, lot.z + (front + 0.9) * cs + 1.4 * sn, 1.6, 0.42, 0.7, 0x8a6a42, lot.solid);
  },

  room: (lot, walls, trim, rng) => {
    // a single brick room with a flat slab roof, often part of a row
    const h = 2.9;
    walls.box(lot.x, lot.y, lot.z, lot.w * 0.92, h, lot.d * 0.85, lot.color, lot.solid, 0b111101);
    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    const front = lot.d * 0.425;
    trim.panel(lot.x + front * sn, lot.y + 1.05, lot.z + front * cs, 1.0, 2.1, 0x3f2a1e, lot.rot, 0.05);
    trim.panel(lot.x + front * sn + 1.3 * cs, lot.y + 1.6, lot.z + front * cs - 1.3 * sn,
      0.7, 0.8, 0x2f3b3a, lot.rot, 0.05);
    trim.box(lot.x, lot.y + h, lot.z, lot.w * 0.98, 0.18, lot.d * 0.92, 0xbfb49c, lot.solid);
    // rebar left standing, because the next storey is always coming
    if (chance(rng, 0.4)) {
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const lu = su * lot.w * 0.38, lv = sv * lot.d * 0.34;
        trim.box(lot.x + lu * cs + lv * sn, lot.y + h + 0.18, lot.z - lu * sn + lv * cs,
          0.07, 0.8, 0.07, 0x6a5a48, lot.solid);
      }
    }
  },

  shed: (lot, walls, trim, rng) => {
    // a corrugated shed: a workshop, a cow byre, a store
    const h = 2.3;
    walls.box(lot.x, lot.y, lot.z, lot.w * 0.9, h, lot.d * 0.8, 0xc4b191, lot.solid, 0b111101);
    trim.box(lot.x, lot.y + h, lot.z, lot.w * 0.98, 0.14, lot.d * 0.9, 0x8c8a80, lot.solid);
    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    const front = lot.d * 0.4;
    trim.panel(lot.x + front * sn, lot.y + 1.05, lot.z + front * cs, lot.w * 0.55, 2.0, 0x5a5248, lot.rot, 0.05);
  },
};
/* ================================================================
 * District kits — registry, keyed by district kind
 * ================================================================ */

const KITS = {
  /** Dense lime-washed galis with jharokha balconies. */
  'old-town': ({ lot, walls, trim, signs, rng }) => {
    const storeys = Math.min(4, Math.max(2, lot.storeys));
    const h = storeys * STOREY;
    walls.box(lot.x, lot.y, lot.z, lot.w, h, lot.d, lot.color, lot.solid, 0b111101);

    const accent = pick(rng, [0xc8452a, 0xe8891f, 0x2f5d5a, 0x7a4a86]);
    facadeAllSides(trim, lot, storeys, { shutters: true, accent, shutterColor: accent });

    // projecting jharokha on an upper floor
    if (storeys >= 2 && chance(rng, 0.62)) {
      const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
      const s = 1 + Math.floor(rng() * (storeys - 1));
      const by = lot.y + 0.9 + s * STOREY;
      const off = lot.d * 0.5 + 0.55;
      const bx = lot.x + off * sn, bz = lot.z + off * cs;
      trim.box(bx, by, bz, lot.w * 0.42, 1.5, 1.1, lot.color, lot.solid);
      trim.box(bx, by + 1.5, bz, lot.w * 0.48, 0.24, 1.3, accent, lot.solid);
      // carved brackets
      for (const side of [-1, 1]) {
        trim.box(bx + side * lot.w * 0.17 * cs, by - 0.5, bz - side * lot.w * 0.17 * sn,
          0.22, 0.6, 0.8, 0x8a6a42, lot.solid);
      }
    }
    if (signs && chance(rng, 0.3)) {
      const cs2 = Math.cos(lot.rot), sn2 = Math.sin(lot.rot);
      const f2 = lot.d * 0.5 + 0.12;
      const slot1 = lot.signSlot >= 0 ? lot.signSlot : Math.floor(rng() * SIGN_COUNT);
      signs.panelUV(lot.x + f2 * sn2, lot.y + 2.9, lot.z + f2 * cs2,
        Math.min(lot.w * 0.72, 3.4), 0.66, signUV(slot1), lot.rot, 0.06);
    }
    roofDeck(trim, lot, lot.y + h, rng, lot.color);
  },

  /** Shopfront below, homes above. */
  bazaar: ({ lot, walls, trim, signs, rng }) => {
    const storeys = Math.min(3, Math.max(2, lot.storeys));
    const h = storeys * STOREY;
    walls.box(lot.x, lot.y, lot.z, lot.w, h, lot.d, lot.color, lot.solid, 0b111101);

    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    const front = lot.d * 0.5;
    const awn = pick(rng, [0xc8452a, 0xe8891f, 0xc9a03c, 0x2f5d5a]);

    // open shutter + counter slab
    trim.box(lot.x + (front + 0.05) * sn, lot.y + 0.2, lot.z + (front + 0.05) * cs,
      lot.w * 0.78, 2.5, 0.12, 0x24201a, lot.solid);
    trim.box(lot.x + (front + 0.45) * sn, lot.y + 0.85, lot.z + (front + 0.45) * cs,
      lot.w * 0.8, 0.16, 0.9, 0xa89878, lot.solid);
    // awning
    trim.box(lot.x + (front + 0.9) * sn, lot.y + 2.75, lot.z + (front + 0.9) * cs,
      lot.w * 0.92, 0.12, 1.9, awn, lot.solid);
    // the painted signboard, from the shared atlas
    if (signs) {
      // If OSM names a shop on this spot, that name goes over the door.
      // Otherwise the lot picks a generic trade board.
      const slot = lot.signSlot >= 0 ? lot.signSlot : Math.floor(rng() * SIGN_COUNT);
      signs.panelUV(lot.x + (front + 0.12) * sn, lot.y + 2.98, lot.z + (front + 0.12) * cs,
        Math.min(lot.w * 0.8, 4.2), 0.78, signUV(slot), lot.rot, 0.06);
    }

    // upper storeys get balconies
    for (let s = 1; s < storeys; s++) {
      const by = lot.y + 0.3 + s * STOREY;
      trim.box(lot.x + (front + 0.4) * sn, by, lot.z + (front + 0.4) * cs,
        lot.w * 0.86, 0.14, 0.9, lot.color, lot.solid);
      trim.box(lot.x + (front + 0.82) * sn, by + 0.14, lot.z + (front + 0.82) * cs,
        lot.w * 0.86, 0.75, 0.08, 0x5a4a38, lot.solid);
    }
    roofDeck(trim, lot, lot.y + h, rng, lot.color);
  },

  /** Tall sandstone havelis with verandahs toward the water. */
  'ghat-front': ({ lot, walls, trim, rng }) => {
    const storeys = Math.min(4, Math.max(2, lot.storeys + 1));
    const h = storeys * STOREY;
    walls.box(lot.x, lot.y, lot.z, lot.w, h, lot.d, lot.color, lot.solid, 0b111101);
    facadeAllSides(trim, lot, storeys, { shutters: true, accent: 0xa8563c, shutterColor: 0x6a4a2c });

    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    // deep verandah columns on the front
    const n = Math.max(2, Math.round(lot.w / 3));
    for (let i = 0; i < n; i++) {
      const lx = (i / (n - 1) - 0.5) * lot.w * 0.86;
      const off = lot.d * 0.5 + 1.1;
      trim.box(lot.x + lx * cs + off * sn, lot.y, lot.z - lx * sn + off * cs,
        0.3, h * 0.62, 0.3, 0xcbb289, lot.solid);
    }
    roofDeck(trim, lot, lot.y + h, rng, lot.color);
    // rooftop chhatri
    if (chance(rng, 0.45)) {
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2 + Math.PI / 4;
        trim.box(lot.x + Math.cos(a) * 1.0, lot.y + h + 0.7, lot.z + Math.sin(a) * 1.0,
          0.2, 1.8, 0.2, 0xd8c8a4);
      }
      trim.box(lot.x, lot.y + h + 2.5, lot.z, 2.8, 0.2, 2.8, 0xd8c8a4);
    }
  },

  /** Ashram walls and dharamshalas. */
  'temple-quarter': ({ lot, walls, trim, rng }) => {
    const storeys = Math.min(3, Math.max(1, lot.storeys));
    const h = storeys * STOREY;
    walls.box(lot.x, lot.y, lot.z, lot.w, h, lot.d, lot.color, lot.solid, 0b111101);
    facadeAllSides(trim, lot, storeys, { accent: 0xa8563c });
    roofDeck(trim, lot, lot.y + h, rng, lot.color);
    // small corner turrets
    if (chance(rng, 0.4)) {
      const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
      for (const su of [-1, 1]) {
        const lu = su * lot.w * 0.42, lv = lot.d * 0.42;
        trim.box(lot.x + lu * cs + lv * sn, lot.y + h, lot.z - lu * sn + lv * cs,
          1.0, 1.6, 1.0, 0xcbb289, lot.solid);
      }
    }
  },

  /** Modern plastered blocks with boundary walls. */
  'raman-reti': ({ lot, walls, trim, rng }) => {
    const storeys = Math.min(3, Math.max(1, lot.storeys));
    const h = storeys * STOREY;
    walls.box(lot.x, lot.y, lot.z, lot.w, h, lot.d, lot.color, lot.solid, 0b111101);
    facadeAllSides(trim, lot, storeys, { accent: 0xc8452a });
    // painted band between storeys
    for (let s = 1; s < storeys; s++) {
      trim.box(lot.x, lot.y + s * STOREY - 0.2, lot.z, lot.w + 0.2, 0.28, lot.d + 0.2,
        pick(rng, [0xc8452a, 0x2f5d5a, 0xc9a03c]), lot.solid);
    }
    roofDeck(trim, lot, lot.y + h, rng, lot.color);
    // boundary wall with a gate
    const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
    const off = lot.d * 0.5 + 3.2;
    trim.box(lot.x + off * sn, lot.y, lot.z + off * cs, lot.w, 1.5, 0.25, 0xd8cdb4, lot.solid);
  },

  residential: ({ lot, walls, trim, rng }) => {
    const storeys = Math.min(3, Math.max(1, lot.storeys));
    const h = storeys * STOREY;
    walls.box(lot.x, lot.y, lot.z, lot.w, h, lot.d, lot.color, lot.solid, 0b111101);
    facadeAllSides(trim, lot, storeys, { shutters: chance(rng, 0.5), accent: 0x9c5a3c });
    roofDeck(trim, lot, lot.y + h, rng, lot.color);
    // external staircase
    if (storeys > 1 && chance(rng, 0.45)) {
      const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
      const lu = lot.w * 0.5 + 0.7;
      for (let s = 0; s < 8; s++) {
        trim.box(lot.x + lu * cs, lot.y + s * 0.38, lot.z - lu * sn,
          1.1, 0.38, 0.9, 0xc0b092, lot.solid);
      }
    }
  },

  outskirts: ({ lot, walls, trim, rng }) => {
    const h = STOREY * (chance(rng, 0.25) ? 2 : 1);
    walls.box(lot.x, lot.y, lot.z, lot.w * 0.8, h, lot.d * 0.8, lot.color, lot.solid, 0b111101);
    // corrugated shed roof
    trim.box(lot.x, lot.y + h, lot.z, lot.w * 0.9, 0.16, lot.d * 0.9, 0x8a7a62, lot.solid);
    if (chance(rng, 0.5)) {
      const cs = Math.cos(lot.rot), sn = Math.sin(lot.rot);
      const off = lot.d * 0.5 + 2.4;
      trim.box(lot.x + off * sn, lot.y, lot.z + off * cs, lot.w, 1.2, 0.22, 0xb8a888, lot.solid);
    }
  },
};
