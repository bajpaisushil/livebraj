/** Layered value noise — terrain relief, weathering, colour variation. */
import { makeRng } from './Random.js';
import { lerp, smootherstep } from './MathUtils.js';

export function makeNoise2D(seed = 1337) {
  const rng = makeRng(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad = (h, x, z) => {
    switch (h & 3) {
      case 0: return x + z;
      case 1: return -x + z;
      case 2: return x - z;
      default: return -x - z;
    }
  };

  const noise = (x, z) => {
    const X = Math.floor(x) & 255, Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x), zf = z - Math.floor(z);
    const u = smootherstep(xf), v = smootherstep(zf);
    const aa = perm[perm[X] + Z], ab = perm[perm[X] + Z + 1];
    const ba = perm[perm[X + 1] + Z], bb = perm[perm[X + 1] + Z + 1];
    const x1 = lerp(grad(aa, xf, zf), grad(ba, xf - 1, zf), u);
    const x2 = lerp(grad(ab, xf, zf - 1), grad(bb, xf - 1, zf - 1), u);
    return lerp(x1, x2, v) * 0.5;
  };

  noise.fbm = (x, z, octaves = 4, lacunarity = 2.0, gain = 0.5) => {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, z * freq) * amp;
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  };

  return noise;
}
