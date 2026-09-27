/**
 * NavGraph — the walkable network, built from the real OSM road geometry.
 *
 * One graph serves everything that needs to know how to get somewhere: the
 * map's "Walk here" routing, the crowd's wandering, the parikrama's snapping,
 * and tap-to-move. Building it once and sharing it is the difference between a
 * town that feels connected and three systems that disagree about where the
 * streets are.
 *
 * It mirrors tools/osm-import/roadgraph.mjs, which builds the same structure at
 * import time to close the parikrama ring — keep the two in step.
 */

import { SpatialGrid } from '../../engine/math/SpatialGrid.js';
import { resample } from '../../engine/math/Curves.js';
import { dist2 } from '../../engine/math/MathUtils.js';
import { BinaryHeap } from '../../engine/math/BinaryHeap.js';
import { VEHICLE_R as DRIVE_R } from '../transport/VehicleDrive.js';

/** Sampling interval along each road, in metres. */
const SAMPLE = 8;
/** Endpoints closer than this become the same node. */
const SNAP = 3;
/** Separate ways whose nodes come this close get stitched together. */
const STITCH = 9;

/**
 * Cost multipliers, in the spirit of how somebody actually chooses a way through
 * a town: take the big road that goes there, drop to a street when you must, and
 * only thread a gali at the very end.
 *
 * The Parikrama Marg gets NO discount. It is a devotional circuit that loops the
 * whole town, not a through-road — and giving it 0.8 (cheaper than a highway)
 * was dragging every route onto it.
 *
 * The spread is deliberately narrow. A wide spread makes A* detour a long way to
 * reach a cheap road, which is technically optimal and obviously wrong to anyone
 * looking at the line on the map: people judge a route by its length, not by its
 * cost. These values prefer an arterial where one is genuinely on the way, and
 * never at the price of a real detour.
 */
const KIND_COST = {
  // The trunk road is genuinely the quickest way to cover ground, but it runs
  // outside town and joins it at exactly one point. Pricing it much below the
  // town roads only tempts A* into long detours to reach it.
  trunk: 0.84,
  highway: 0.86,
  main: 0.90,
  street: 1.00,
  parikrama: 1.00,
  path: 1.12,
  gali: 1.22,
  stitch: 1.35,
};

/**
 * A named road is a road people know and use. In Vrindavan only eight carry a
 * name in the data, and they are precisely the arterials — Bhaktivedanta Swami
 * Marg, Mathura Road, the bazaars — so preferring them is both cheap and right.
 */
const NAMED_BONUS = 0.93;

/**
 * What a road costs when the thing routing down it has four wheels and a roof.
 *
 * The graph has no width, no lane and no vehicle/pedestrian distinction — only
 * `kind` — so a rickshaw was being routed down footpaths and galis exactly as
 * readily as a pilgrim. That is how the ISKCON route came to thread a 2 m gap
 * between three buildings, where a rickshaw driving it got properly wedged and
 * could not get out. These are multipliers, not bans: the last hundred metres
 * into Banke Bihari is a gali and always will be, and a driver will take it
 * when it is the only way in. He just will not take it for four kilometres to
 * save two hundred metres.
 */
const DRIVE_COST = { gali: 4.0, path: 3.5, stitch: 1.4 };

/**
 * Half-width a vehicle needs to pass, in metres.
 *
 * Taken from VehicleDrive rather than written out again. This used to be 0.8
 * while the ride drove at 1.1, so the graph cleared a route at one width and
 * then something wider was driven down it — every route the graph called clean
 * still produced push-outs. The road that gets cleared is now the road that
 * gets driven.
 */
const VEHICLE_R = DRIVE_R;

/**
 * How far a blocked waypoint may be moved to find clear ground, and how many
 * bearings are tried at each radius. Only ever runs on waypoints that are
 * already inside something, and only when a route is laid — never per frame.
 */
const NUDGE_R = 8.4;
const NUDGE_RAYS = 16;

/** How much staying on the road counts for, against staying on the line. */
const ROAD_PULL = 2.5;

const round2 = (v) => Math.round(v * 100) / 100;

/**
 * The cheapest possible cost per metre, which the A* heuristic must not exceed.
 *
 * Derived from the table rather than written out, because it was written out
 * once and then a cheaper kind was added above it. An A* heuristic that
 * overestimates stops being admissible and quietly returns paths that are not
 * the shortest - which looks like a routing bug and is impossible to spot by
 * reading the route.
 */
const MIN_COST = Math.min(...Object.values(KIND_COST)) * NAMED_BONUS;

export class NavGraph {
  constructor(ctx) {
    this.ctx = ctx;
    /** @type {Map<string, {k:string,x:number,z:number,edges:Array<{to:string,w:number,kind:string}>}>} */
    this.nodes = new Map();
    this.grid = new SpatialGrid(24);
    this._list = [];

    this._build(ctx.data.ROADS);

    // A* scratch, reused across queries so pathfinding allocates nothing.
    this._g = new Map();
    this._from = new Map();
    this._open = new BinaryHeap();
    this._closed = new Set();

    console.info(`[nav] ${this.nodes.size} nodes, ${this._edgeCount} edges, ${this._stitched} stitched`);
  }

  /* ---------------- construction ---------------- */

  _key(x, z) { return `${Math.round(x / SNAP)},${Math.round(z / SNAP)}`; }

  _node(x, z) {
    const k = this._key(x, z);
    let n = this.nodes.get(k);
    if (!n) {
      n = { k, x, z, edges: [] };
      this.nodes.set(k, n);
      this.grid.insert(x, z, n);
      this._list.push(n);
    }
    return n;
  }

  _link(a, b, kind, named) {
    if (a === b) return;
    if (a.edges.some((e) => e.to === b.k)) return;
    const mult = (KIND_COST[kind] ?? 1) * (named ? NAMED_BONUS : 1);
    const w = Math.sqrt(dist2(a.x, a.z, b.x, b.z)) * mult;
    a.edges.push({ to: b.k, w, kind, named: !!named });
    b.edges.push({ to: a.k, w, kind, named: !!named });
    this._edgeCount++;
  }

  _build(roads) {
    this._edgeCount = 0;
    this._stitched = 0;

    for (const road of roads) {
      const pts = resample(road.points, SAMPLE);
      let prev = null;
      for (let i = 0; i < pts.length; i++) {
        const n = this._node(pts[i][0], pts[i][1]);
        if (prev) this._link(prev, n, road.kind, !!road.name);
        prev = n;
      }
    }

    // Stitch ways that visually meet but share no node. OSM is full of these,
    // and without the stitch a route will happily refuse to cross a junction.
    const near = [];
    for (const n of this._list) {
      this.grid.query(n.x, n.z, STITCH, near);
      for (let i = 0; i < near.length; i++) {
        const m = near[i];
        if (m === n) continue;
        const d2 = dist2(n.x, n.z, m.x, m.z);
        if (d2 > 0.01 && d2 < STITCH * STITCH && !n.edges.some((e) => e.to === m.k)) {
          this._link(n, m, 'stitch');
          this._stitched++;
        }
      }
    }
  }

  /* ---------------- queries ---------------- */

  /** Nearest graph node to a world point. */
  nearest(x, z) {
    const out = [];
    for (let r = 24; r <= 400; r *= 2) {
      this.grid.query(x, z, r, out);
      if (out.length) {
        let best = null, bestD = Infinity;
        for (let i = 0; i < out.length; i++) {
          const d = dist2(x, z, out[i].x, out[i].z);
          if (d < bestD) { bestD = d; best = out[i]; }
        }
        if (best) return best;
      }
    }
    return this._list[0] || null;
  }

  neighbours(node) { return node ? node.edges : []; }

  randomNode(rng) {
    if (!this._list.length) return null;
    return this._list[Math.floor((rng ? rng() : Math.random()) * this._list.length) % this._list.length];
  }

  /** A node within `radius` of a point, chosen at random. Used for crowd spawning. */
  randomNodeNear(x, z, radius, rng) {
    const out = [];
    this.grid.query(x, z, radius, out);
    if (!out.length) return this.nearest(x, z);
    return out[Math.floor((rng ? rng() : Math.random()) * out.length) % out.length];
  }

  /**
   * A* between two world points. Returns an array of [x, z] or null.
   * The heuristic is straight-line distance scaled by the cheapest possible cost
   * per metre, which keeps it admissible however the multipliers are tuned —
   * and `drivable` only ever makes edges dearer, so it stays admissible too.
   */
  path(fromX, fromZ, toX, toZ, drivable = false) {
    const start = this.nearest(fromX, fromZ);
    const goal = this.nearest(toX, toZ);
    if (!start || !goal) return null;
    if (start === goal) return [[start.x, start.z], [toX, toZ]];

    const { _g: g, _from: from, _open: open, _closed: closed } = this;
    g.clear(); from.clear(); open.clear(); closed.clear();

    // The heuristic is scaled by the cheapest cost multiplier so it stays
    // admissible: no edge can ever be cheaper per metre than 0.8.
    const h = (n) => Math.sqrt(dist2(n.x, n.z, goal.x, goal.z)) * MIN_COST;

    g.set(start.k, 0);
    open.push(start.k, h(start));

    let guard = 0;
    const MAX = 120000;

    while (open.size && guard++ < MAX) {
      const curKey = open.pop();
      if (curKey === goal.k) break;
      if (closed.has(curKey)) continue;
      closed.add(curKey);

      const cur = this.nodes.get(curKey);
      const curG = g.get(curKey);
      for (let i = 0; i < cur.edges.length; i++) {
        const e = cur.edges[i];
        if (closed.has(e.to)) continue;
        const tentative = curG + (drivable ? e.w * (DRIVE_COST[e.kind] || 1) : e.w);
        if (tentative < (g.get(e.to) ?? Infinity)) {
          from.set(e.to, curKey);
          g.set(e.to, tentative);
          open.push(e.to, tentative + h(this.nodes.get(e.to)));
        }
      }
    }

    if (!g.has(goal.k)) return null;

    const out = [];
    let k = goal.k;
    while (k !== undefined) { const n = this.nodes.get(k); out.push([n.x, n.z]); k = from.get(k); }
    out.reverse();

    // Start and end where asked, but only if you can actually get there.
    //
    // These two lines used to be unconditional, which drew a straight line from
    // wherever you stood to the first road node — and a landmark's position is
    // the middle of the building, so the "route" began by going through the
    // temple. Measured on ISKCON to Prem Mandir, a quarter of the driven path
    // was inside something solid. If the hop is not clear the route simply
    // begins at the road, which is where a vehicle waits for you anyway.
    if (this._hopClear(fromX, fromZ, out[0])) out[0] = [fromX, fromZ];
    const last = out.length - 1;
    if (this._hopClear(toX, toZ, out[last])) out[last] = [toX, toZ];

    return this._nudgeClear(out);
  }

  /** Can a vehicle get between a raw endpoint and the road node beside it? */
  _hopClear(x, z, node) {
    const w = this.ctx && this.ctx.world;
    if (!w || !w.isClear) return true;
    const d = Math.hypot(node[0] - x, node[1] - z);
    const steps = Math.max(1, Math.ceil(d / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!w.isClear(x + (node[0] - x) * t, z + (node[1] - z) * t, VEHICLE_R)) return false;
    }
    return true;
  }

  /**
   * Push any point of a route that sits inside something solid out to clear
   * ground, searching outward in a ring.
   *
   * Roads are centrelines and the world is scattered with trees, lamps and
   * stalls that sit close to them, so even a correctly routed path clips things
   * here and there. A vehicle that drives through a lamp post is exactly as
   * wrong as one that drives through a wall.
   */
  _nudgeClear(pts) {
    const w = this.ctx && this.ctx.world;
    if (!w || !w.isClear) return pts;
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0], z = pts[i][1];
      if (w.isClear(x, z, VEHICLE_R)) continue;

      // Where the route was trying to go, so the point that replaces this one
      // is chosen for being ON THE WAY rather than merely for being empty. The
      // first clear point on a ring used to win, which could be the one in the
      // opposite direction to travel, and a route that zigzags is a route a
      // vehicle spends its time turning round on.
      const p = pts[i - 1] || pts[i], n = pts[i + 1] || pts[i];
      const lx = n[0] - p[0], lz = n[1] - p[1];
      const len = Math.hypot(lx, lz);

      // Out to NUDGE_R, not 5 m. Measured on the ISKCON route: a building sits
      // across the road for twelve metres, nothing within five metres of the
      // centreline is clear, so three waypoints stayed inside it and the
      // rickshaw drove into the wall and stopped there. There was open ground
      // eight metres to the side the whole time.
      let best = null, bestScore = Infinity;
      for (let r = 1.2; r <= NUDGE_R && !best; r += 1.2) {
        for (let a = 0; a < NUDGE_RAYS; a++) {
          const th = (a / NUDGE_RAYS) * Math.PI * 2;
          const nx = x + Math.cos(th) * r, nz = z + Math.sin(th) * r;
          if (!w.isClear(nx, nz, VEHICLE_R)) continue;
          // How far off the line through this stretch of route it sits, plus
          // how far off the road. The road term is the one that matters: the
          // buildings here are generated right up to the kerb, so the clear
          // ground beside a blocked waypoint is as often INSIDE the block as it
          // is on the tarmac, and a route nudged off the road strands a vehicle
          // in somebody's courtyard.
          const off = len > 1e-3
            ? Math.abs((nx - p[0]) * lz - (nz - p[1]) * lx) / len
            : 0;
          const road = w.nearestRoad ? w.nearestRoad(nx, nz, 40) : null;
          const score = off + (road ? road.d * ROAD_PULL : 0);
          if (score < bestScore) { bestScore = score; best = [round2(nx), round2(nz)]; }
        }
        // take the nearest ring that offers anything at all
        if (best) break;
      }
      if (best) pts[i] = best;
    }
    return pts;
  }

  /** Total length of a path in metres. */
  static length(points) {
    let L = 0;
    for (let i = 1; i < points.length; i++) L += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    return L;
  }

  dispose() {
    this.nodes.clear();
    this.grid.clear();
    this._list.length = 0;
  }
}
