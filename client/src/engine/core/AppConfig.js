/**
 * Quality tiers and device detection.
 *
 * One place decides how heavy the world is allowed to be, so every generator
 * asks the same question rather than guessing.
 */

export const QUALITY_TIERS = {
  low: {
    tier: 'low',
    shadows: false, shadowMapSize: 1024,
    pixelRatioCap: 1.0,
    drawDistance: 420,
    fogDensity: 0.00085,
    crowd: 0.7,
    props: 0.62,
    treeDetail: 0,
    waterDetail: 0,
    templeLights: false,
    antialias: false,
  },
  mid: {
    tier: 'mid',
    shadows: true, shadowMapSize: 2048,
    pixelRatioCap: 1.5,
    drawDistance: 620,
    fogDensity: 0.00060,
    crowd: 1.0,
    props: 0.85,
    treeDetail: 1,
    waterDetail: 1,
    templeLights: true,
    antialias: false,
  },
  high: {
    tier: 'high',
    shadows: true, shadowMapSize: 2048,
    pixelRatioCap: 2.0,
    drawDistance: 820,
    fogDensity: 0.00042,
    crowd: 1.4,
    props: 1.0,
    treeDetail: 2,
    waterDetail: 2,
    templeLights: true,
    antialias: true,
  },
};

/** Pick a tier from what the device actually reports. */
export function detectTier() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 420;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  // Phones lose the WebGL context when memory runs short, and the world is the
  // largest allocation in the app. Touch devices therefore start conservative
  // and can be raised by hand in Settings.
  if (coarse) return (mem >= 6 && cores >= 6 && !small) ? 'mid' : 'low';

  if (mem <= 3 || cores <= 4) return 'low';
  if (mem >= 8 && cores >= 8 && !small) return 'high';
  return 'mid';
}

export function makeQuality(tierName) {
  const name = tierName === 'auto' || !QUALITY_TIERS[tierName] ? detectTier() : tierName;
  const t = QUALITY_TIERS[name];
  return {
    ...t,
    pixelRatio: Math.min(window.devicePixelRatio || 1, t.pixelRatioCap),
  };
}
