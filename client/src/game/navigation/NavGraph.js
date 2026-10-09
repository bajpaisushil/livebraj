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
 * What an edge costs a vehicle when the road it names is not actually open.
 *
 * The graph is built from the OSM centrelines and the buildings are generated
 * afterwards, so nothing ever checked whether the two agree — and in the old
 * town they frequently do not: a courtyard wall sits across a street, and the
 * route runs straight through it. That is how a rickshaw ended up three hundred
 * metres from ISKCON in the middle of a block, reversing and trying again for
 * ten minutes. Each edge is now walked once and asked whether a vehicle would
 * fit down it, and one that would not is priced accordingly.
 *
 * Dear, not forbidden: if every way in is closed the route still exists, and
 * the driver takes the least bad one and gets as far as he can — which is what
 * a driver does.
 */
const BLOCKED_COST = 30;

/** How often the clearance walk samples an edge, in metres. */
const BLOCK_STEP = 2.5;

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

/** The most detour points one route may gain, so a bad route cannot explode. */
const OPEN_MAX = 60;

/** How many times the route is asked to get round what it is still crossing. */
const OPEN_PASSES = 3;

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

  /**
   * Which connected piece of the network a node belongs to. The import leaves
   * a few dozen islands — a riverside path that never meets a street, a
   * courtyard's own lanes — and a destination on one of them can never be
   * walked to from the town, however close it looks. Labelled once, on the
   * first question, by a flood fill over all the nodes.
   */
  componentOf(node) {
    if (!node) return -1;
    if (!this._comp) {
      const comp = this._comp = new Map();
      let id = 0;
      for (const k of this.nodes.keys()) {
        if (comp.has(k)) continue;
        const stack = [k];
        comp.set(k, id);
        while (stack.length) {
          const n = this.nodes.get(stack.pop());
          for (let i = 0; i < n.edges.length; i++) {
            const to = n.edges[i].to;
            if (!comp.has(to)) { comp.set(to, id); stack.push(to); }
          }
        }
        id++;
      }
    }
    return this._comp.has(node.k) ? this._comp.get(node.k) : -1;
  }

  /**
   * The nearest node a vehicle could actually get to and away from.
   *
   * `nearest` answers with the closest node full stop, which in the old town is
   * regularly one inside a courtyard whose every way out has a wall across it —
   * so a driver was being asked to set you down somewhere no driver has ever
   * been. Falls back to the plain nearest, because a set-down somewhere is
   * better than no set-down at all.
   */
  nearestDrivable(x, z, maxRadius = 220) {
    const out = [];
    for (let r = 30; r <= maxRadius; r *= 2) {
      this.grid.query(x, z, r, out);
      let best = null, bestD = Infinity;
      for (let i = 0; i < out.length; i++) {
        const n = out[i];
        let open = false;
        for (let j = 0; j < n.edges.length && !open; j++) {
          const e = n.edges[j];
          if (e.open !== false && (DRIVE_COST[e.kind] || 1) < 2) open = true;
        }
        if (!open) continue;
        const d = dist2(x, z, n.x, n.z);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best) return best;
    }
    return this.nearest(x, z);
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
        const tentative = curG + (drivable
          ? e.w * (DRIVE_COST[e.kind] || 1) * (this._edgeOpen(cur, e) === false ? BLOCKED_COST : 1)
          : e.w);
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

    // Getting the LINES between the waypoints open is a vehicle's problem and
    // costs real time, so only a vehicle pays for it. A pilgrim on foot fits
    // through anything a rickshaw does not.
    // `route`, not `open` — the A* scratch above already destructures _open
    // under that name in this same scope, and shadowing it here is a syntax
    // error the file-level check does not catch.
    let route = this._nudgeClear(out);
    if (drivable) for (let i = 0; i < OPEN_PASSES; i++) route = this._openSegments(route);
    return route;
  }

  /**
   * Walk every edge once and record whether a vehicle would fit down it.
   *
   * Done lazily, on the first route that asks to be drivable — which is the
   * moment a driver is asked where he can take you, and is already the frame
   * that lays eight routes. About three samples per edge, kept on the edge
   * itself and on its twin, so the whole graph is answered once for the session.
   */
  /**
   * Is this one edge wide enough for a vehicle? Answered on first use.
   *
   * This used to be a single sweep over the whole graph before any drivable
   * route could be laid: 54,782 nodes, about 2.3 edges each, three samples an
   * edge, and every sample a spatial query against 21,833 colliders. It ran
   * once, which sounds thrifty until you measure it — it took 115 seconds, and
   * it ran during boot, which is precisely the failure that made the game
   * unopenable on a phone earlier today. A* only ever looks at a small part of
   * the graph, so the answer is computed for the edges actually considered and
   * kept on both halves of the pair. The cost lands in the route that needs it,
   * a fraction of a millisecond at a time, and edges nobody drives down are
   * never measured at all.
   */
  _edgeOpen(node, e) {
    if (e.open !== undefined) return e.open;
    const w = this.ctx && this.ctx.world;
    if (!w || !w.isClear) { e.open = true; return true; }
    const m = this.nodes.get(e.to);
    const open = m ? this._segClear(w, node.x, node.z, m.x, m.z) : false;
    e.open = open;
    // the twin edge is the same stretch of road walked the other way
    if (m) {
      for (let k = 0; k < m.edges.length; k++) {
        if (m.edges[k].to === node.k) { m.edges[k].open = open; break; }
      }
    }
    return open;
  }

  _markDrivable() {
    // kept as a no-op: the sweep it used to do is now done edge by edge in
    // _edgeOpen, and callers should not have to know that changed
    if (this._openKnown) return;
    this._openKnown = true;
    return;
    const w = this.ctx && this.ctx.world;
    if (!w || !w.isClear) return;

    let shut = 0, seen = 0;
    for (let i = 0; i < this._list.length; i++) {
      const n = this._list[i];
      for (let j = 0; j < n.edges.length; j++) {
        const e = n.edges[j];
        if (e.open !== undefined) continue;
        const m = this.nodes.get(e.to);
        const open = m ? this._segClear(w, n.x, n.z, m.x, m.z) : false;
        e.open = open;
        seen++;
        if (!open) shut++;
        // the way back is the same piece of road
        if (m) {
          for (let k = 0; k < m.edges.length; k++) {
            if (m.edges[k].to === n.k) { m.edges[k].open = open; break; }
          }
        }
      }
    }
    console.info(`[nav] ${shut} of ${seen} edges are closed to a vehicle`);
  }

  /** Could a vehicle drive the straight line between these two points? */
  _segClear(w, ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(d / BLOCK_STEP));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!w.isClear(ax + (bx - ax) * t, az + (bz - az) * t, VEHICLE_R)) return false;
    }
    return true;
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
      const best = this._clearNear(w, x, z, pts[i - 1] || pts[i], pts[i + 1] || pts[i]);
      if (best) pts[i] = best;
    }
    return pts;
  }

  /**
   * The nearest clear spot to a point, preferring one on the way and on a road.
   *
   * Searches out to NUDGE_R, not the five metres it used to: measured on the
   * ISKCON route, a building sits across the road for twelve metres and nothing
   * within five metres of the centreline is clear, so the waypoints stayed
   * inside it and the rickshaw drove into the wall and stopped there. There was
   * open ground eight metres to the side the whole time.
   *
   * The road term in the score is the one that matters. These buildings are
   * generated right up to the kerb, so the clear ground beside a blocked point
   * is as often INSIDE the block as it is on the tarmac, and a route nudged off
   * the road strands a vehicle in somebody's courtyard.
   */
  _clearNear(w, x, z, p, n) {
    const lx = n[0] - p[0], lz = n[1] - p[1];
    const len = Math.hypot(lx, lz);
    let best = null, bestScore = Infinity;
    for (let r = 1.2; r <= NUDGE_R; r += 1.2) {
      for (let a = 0; a < NUDGE_RAYS; a++) {
        const th = (a / NUDGE_RAYS) * Math.PI * 2;
        const nx = x + Math.cos(th) * r, nz = z + Math.sin(th) * r;
        if (!w.isClear(nx, nz, VEHICLE_R)) continue;
        const off = len > 1e-3
          ? Math.abs((nx - p[0]) * lz - (nz - p[1]) * lx) / len
          : 0;
        const road = w.nearestRoad ? w.nearestRoad(nx, nz, 40) : null;
        const score = off + (road ? road.d * ROAD_PULL : 0);
        if (score < bestScore) { bestScore = score; best = [round2(nx), round2(nz)]; }
      }
      // take the nearest ring that offers anything at all
      if (best) return best;
    }
    return null;
  }

  /**
   * Make the LINES between the waypoints drivable, not just the waypoints.
   *
   * The nudge above puts every waypoint on clear ground and stops there, which
   * is only half the question: measured on the approach to ISKCON, every
   * waypoint was clear and six separate stretches of the line BETWEEN them ran
   * through eight to fourteen metres of wall. A rickshaw does not drive the
   * waypoints, it drives the line. Where a stretch is blocked this puts a point
   * beside it and drives round, and two passes will take a route round the
   * corner of a building rather than through it.
   */
  _openSegments(pts) {
    const w = this.ctx && this.ctx.world;
    if (!w || !w.isClear || pts.length < 2) return pts;
    const out = [pts[0]];
    let added = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = out[out.length - 1], b = pts[i];
      if (added < OPEN_MAX && !this._segClear(w, a[0], a[1], b[0], b[1])) {
        const via = this._clearNear(w, (a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, a, b);
        // Insert it whether or not both halves came out clear. Insisting on
        // both is what made this do nothing at all: a wall twelve metres long
        // cannot be rounded in one step, and each pass shortens what is left
        // and pulls it onto clear ground, so the third one gets round the
        // corner the first could not.
        if (via && Math.hypot(via[0] - a[0], via[1] - a[1]) > 0.5
          && Math.hypot(via[0] - b[0], via[1] - b[1]) > 0.5) {
          out.push(via);
          added++;
        }
      }
      out.push(b);
    }
    return out;
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
