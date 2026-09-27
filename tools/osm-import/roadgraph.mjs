/**
 * Road graph + A*.
 *
 * OSM only names about 2 km of Vrindavan's Parikrama Marg, but the full ring
 * exists in the network as unnamed residential and service ways. We therefore
 * treat the named segments as must-pass anchors and route between them along
 * real streets, which yields a closed loop the player can actually walk.
 *
 * The same graph shape is rebuilt at runtime by game/navigation/NavGraph.js —
 * keep the two in step.
 */

const SNAP = 3; // metres; endpoints within this distance are the same node

const key = (x, z) => `${Math.round(x / SNAP)},${Math.round(z / SNAP)}`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Cost multiplier per road kind — the parikrama prefers open, walkable roads. */
const KIND_COST = {
  parikrama: 0.55,
  highway: 0.85,
  main: 0.9,
  street: 1.0,
  gali: 1.45,
  path: 1.2,
};

export function buildGraph(roads) {
  /** @type {Map<string, {x:number,z:number,edges:Array<{to:string,w:number,kind:string}>}>} */
  const nodes = new Map();

  const node = (p) => {
    const k = key(p[0], p[1]);
    let n = nodes.get(k);
    if (!n) { n = { k, x: p[0], z: p[1], edges: [] }; nodes.set(k, n); }
    return n;
  };

  for (const road of roads) {
    const mult = KIND_COST[road.kind] ?? 1;
    for (let i = 1; i < road.points.length; i++) {
      const a = node(road.points[i - 1]);
      const b = node(road.points[i]);
      if (a === b) continue;
      const w = dist([a.x, a.z], [b.x, b.z]) * mult;
      a.edges.push({ to: b.k, w, kind: road.kind });
      b.edges.push({ to: a.k, w, kind: road.kind });
    }
  }

  // Stitch near-miss endpoints: OSM ways that visually meet but share no node.
  const cell = 12;
  const buckets = new Map();
  for (const n of nodes.values()) {
    const bk = `${Math.floor(n.x / cell)},${Math.floor(n.z / cell)}`;
    let arr = buckets.get(bk);
    if (!arr) { arr = []; buckets.set(bk, arr); }
    arr.push(n);
  }
  let stitched = 0;
  for (const n of nodes.values()) {
    const bx = Math.floor(n.x / cell), bz = Math.floor(n.z / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const arr = buckets.get(`${bx + dx},${bz + dz}`);
        if (!arr) continue;
        for (const m of arr) {
          if (m === n) continue;
          const d = dist([n.x, n.z], [m.x, m.z]);
          if (d > 0.1 && d < 9 && !n.edges.some((e) => e.to === m.k)) {
            n.edges.push({ to: m.k, w: d * 1.6, kind: 'stitch' });
            m.edges.push({ to: n.k, w: d * 1.6, kind: 'stitch' });
            stitched++;
          }
        }
      }
    }
  }

  return { nodes, stitched, nearest: (x, z) => nearestNode(nodes, x, z) };
}

function nearestNode(nodes, x, z) {
  let best = null, bestD = Infinity;
  for (const n of nodes.values()) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

/** A* over the graph. Returns world-space points, or null. */
export function findPath(graph, startKey, goalKey) {
  const { nodes } = graph;
  const goal = nodes.get(goalKey);
  if (!nodes.has(startKey) || !goal) return null;

  const open = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const g = new Map([[startKey, 0]]);
  const h = (n) => Math.hypot(n.x - goal.x, n.z - goal.z);

  let guard = 0;
  while (open.size && guard++ < 400000) {
    // smallest f — linear scan is fine for graphs of this size at build time
    let curKey = null, curF = Infinity;
    for (const [k, f] of open) if (f < curF) { curF = f; curKey = k; }
    if (curKey === goalKey) break;
    open.delete(curKey);

    const cur = nodes.get(curKey);
    const curG = g.get(curKey);
    for (const e of cur.edges) {
      const tentative = curG + e.w;
      if (tentative < (g.get(e.to) ?? Infinity)) {
        cameFrom.set(e.to, curKey);
        g.set(e.to, tentative);
        open.set(e.to, tentative + h(nodes.get(e.to)));
      }
    }
  }

  if (!g.has(goalKey)) return null;
  const out = [];
  let k = goalKey;
  while (k) { const n = nodes.get(k); out.push([n.x, n.z]); k = cameFrom.get(k); }
  return out.reverse();
}

/**
 * Build a closed parikrama ring.
 * `anchors` are the named Parikram Marg polylines. They are ordered by their
 * angle around the town centroid, then joined end-to-end by A*.
 */
export function closeRing(graph, anchors, centroid) {
  if (!anchors.length) return { points: [], joins: 0, failed: 0 };

  const ordered = anchors
    .map((pts) => {
      const mid = pts[Math.floor(pts.length / 2)];
      return { pts, ang: Math.atan2(mid[1] - centroid[1], mid[0] - centroid[0]) };
    })
    .sort((a, b) => a.ang - b.ang)
    .map((a) => a.pts);

  // orient each anchor so it continues the walk direction
  const oriented = [ordered[0]];
  for (let i = 1; i < ordered.length; i++) {
    const prevEnd = oriented[i - 1][oriented[i - 1].length - 1];
    const cand = ordered[i];
    oriented.push(dist(prevEnd, cand[0]) <= dist(prevEnd, cand[cand.length - 1]) ? cand : cand.slice().reverse());
  }

  const points = [];
  let joins = 0, failed = 0;

  for (let i = 0; i < oriented.length; i++) {
    const seg = oriented[i];
    if (points.length && dist(points[points.length - 1], seg[0]) > 1) {
      const a = graph.nearest(points[points.length - 1][0], points[points.length - 1][1]);
      const b = graph.nearest(seg[0][0], seg[0][1]);
      const link = a && b ? findPath(graph, a.k, b.k) : null;
      if (link && link.length > 1) { points.push(...link.slice(1)); joins++; }
      else failed++;
    }
    points.push(...(points.length ? seg.slice(1) : seg));
  }

  // close back to the start
  if (points.length > 2) {
    const a = graph.nearest(points[points.length - 1][0], points[points.length - 1][1]);
    const b = graph.nearest(points[0][0], points[0][1]);
    const link = a && b ? findPath(graph, a.k, b.k) : null;
    if (link && link.length > 1) { points.push(...link.slice(1)); joins++; }
    else failed++;
  }

  return { points, joins, failed };
}
