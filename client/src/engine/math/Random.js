/**
 * Deterministic randomness. The town must rebuild identically on every launch,
 * so nothing in the world pipeline may call Math.random().
 */

/** mulberry32 */
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — stable string to 32-bit seed, so rngAt('keshi-ghat') is repeatable. */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const rngAt = (seed) => makeRng(typeof seed === 'number' ? seed : hashSeed(seed));

/** Helpers that read well at call sites. */
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
export function range(rng, a, b) { return a + rng() * (b - a); }
export function rangeInt(rng, a, b) { return Math.floor(a + rng() * (b - a + 1)); }
export function chance(rng, p) { return rng() < p; }
