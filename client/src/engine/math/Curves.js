/** Polyline geometry: the roads, the river and the parikrama ring all use it. */

import { clamp01, dist } from './MathUtils.js';

/** Distance from a point to a segment, in the XZ plane. */
export function pointSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz;
  let t = len2 > 1e-8 ? ((px - ax) * abx + (pz - az) * abz) / len2 : 0;
  t = clamp01(t);
  const x = ax + abx * t, z = az + abz * t;
  return { d: dist(px, pz, x, z), t, x, z };
}

export function pointInPolygon(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function polylineLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += dist(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  return L;
}

/** Evenly spaced points `step` metres apart along a polyline. */
export function resample(points, step) {
  if (points.length < 2) return points.map((p) => p.slice());
  const out = [points[0].slice()];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    const seg = dist(ax, az, bx, bz);
    if (seg < 1e-6) continue;
    let travelled = step - carry;
    while (travelled <= seg) {
      const t = travelled / seg;
      out.push([ax + (bx - ax) * t, az + (bz - az) * t]);
      travelled += step;
    }
    carry = seg - (travelled - step);
  }
  const last = points[points.length - 1];
  if (dist(out[out.length - 1][0], out[out.length - 1][1], last[0], last[1]) > step * 0.35) out.push(last.slice());
  return out;
}

/** Chaikin corner cutting — turns OSM's angular traces into believable curves. */
export function smoothPolyline(points, iterations = 2, closed = false) {
  let pts = points.map((p) => p.slice());
  for (let it = 0; it < iterations; it++) {
    const next = [];
    const n = pts.length;
    if (n < 3) break;
    if (!closed) next.push(pts[0].slice());
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) next.push(pts[n - 1].slice());
    pts = next;
  }
  return pts;
}

/** Cumulative arc length, for progress along the parikrama. */
export function arcLengths(points) {
  const out = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    out[i] = out[i - 1] + dist(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return out;
}
