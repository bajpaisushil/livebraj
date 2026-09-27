/** Scalar and angular maths shared across every system. */

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v, a1, b1, a2, b2) => lerp(a2, b2, clamp01(invLerp(a1, b1, v)));
export const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smootherstep = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Frame-rate independent damping. `k` is roughly "snappiness", 1..20. */
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

export function angleDelta(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export const dampAngle = (a, b, k, dt) => a + angleDelta(a, b) * (1 - Math.exp(-k * dt));

export const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

export function formatDistance(m) {
  if (!isFinite(m)) return '—';
  if (m < 950) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 9500 ? 1 : 0)} km`;
}
