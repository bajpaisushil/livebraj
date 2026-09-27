/**
 * The colour of Braj.
 *
 * Sixteen temples read as boxes partly because each was one flat hex. On a
 * real Braj temple no two square metres are the same colour, and the
 * variation is not noise — it is four stacked, rule-governed layers, every
 * one of them documented. This module is those rules, and nothing else.
 *
 * Sources are in docs/research/detail-colour.md; the hexes below were
 * sampled off midday photographs, and the historical claims come from
 * F. S. Growse, "Mathura: A District Memoir" (1883, public domain), which is
 * the classic survey of these exact buildings. Page numbers are cited at the
 * constant they justify so a later reader can check rather than trust.
 *
 * Everything here runs at world-build time and costs nothing per frame.
 */

/* ================================================================
 * A. THE BASE PALETTE
 *
 * All hexes are sRGB taken as the MIDDAY SUNLIT SIDE FACE. Every other
 * surface is derived from these by a multiplier, never by a new hex —
 * that is the whole point, and the reason one correction here improves
 * every building at once.
 * ================================================================ */

/*
 * Red sandstone, the Bharatpur family. Use ALL FOUR on any "red" temple.
 *
 * Growse names the quarry over and over: Hari Deva at Gobardhan is "red
 * sandstone from the Bharatpur quarries" (p.305), the Rani of Tikari's piers
 * are "each shaft being a single piece of stone, brought from the Paharpur
 * quarry" (p.263). That quarry — Bansi Paharpur — is still worked and still
 * sells three named grades: pink, red and barra. One building carries all
 * three because it was built from whatever the barge brought, which is why
 * the grades are a per-course choice below and not a per-building one.
 */
export const SS_RED = 0x8c4a2f;     // H 18 S 66 V 55 — the commonest course, ~55%
export const SS_BROWN = 0x6b3a26;   // H 18 S 65 V 42 — darker course, ~20%
export const SS_PINK = 0xb07a56;    // H 22 S 51 V 69 — pink grade / replacement, ~12%
export const SS_BARRA = 0xa9764f;   // H 24 S 54 V 66 — variegated grade, ~13%

/*
 * Lime plaster over brick — the whole town that is not a Mughal-period
 * temple. Growse, on the Madan Mohan nave rebuild where stone ran short:
 * "the place of stone being supplied by brick" (p.252).
 */
export const LP_CREAM = 0xd8c39a;   // H 34 S 29 V 85
export const LP_BUFF = 0xbe9a6c;    // H 32 S 43 V 75
export const LP_PINK = 0xc08b76;    // H 13 S 39 V 75 — the pink house at Keshi Ghat
export const LP_WHITE = 0xeae3d6;   // H 36 S  9 V 92 — fresh whitewash

/*
 * Marble, and there are TWO whites, never one. Shahji's colonnade is warm
 * and honeyed while his own balustrade beside it is cool; a single white
 * makes both look like plastic.
 */
export const MB_WARM = 0xd9cbac;    // H 40 S 21 V 85 — Shahji's centre pavilion
export const MB_COOL = 0xdcdcd8;    // H 60 S  3 V 86 — ISKCON, Prem Mandir

/* Dirt. The black is chemistry, not soot: studies of Indian red sandstone
 * find the crust is amorphous carbon and heavy metals bound in gypsum, and
 * it forms on rain-SHELTERED surfaces while rain-washed faces stay red. */
export const W_SOOT = 0x2a211b;
export const W_DAMP = 0x5b4c42;
export const W_ALGAE = 0x3d4436;
export const W_DUST = 0xc9b294;

/* Paint, which is real and which people forget. */
export const PT_VERM = 0xb8402a;
export const PT_OCHRE = 0xd79a2b;
export const PT_WHITE = 0xf2efe6;
export const PT_GILT = 0xc9a03c;

/* The ground, for comparison. Measured off the Govind Dev plaza: the ground
 * is LIGHTER than the building. If the plaza is dark the temple looks
 * pasted on. */
export const GROUND_REF = 0xc9a98e;

/* How often each sandstone grade turns up in a wall, as cumulative weight. */
const GRADES = [
  [0.55, SS_RED],
  [0.75, SS_BROWN],
  [0.87, SS_PINK],
  [1.00, SS_BARRA],
];

/* ================================================================
 * Colour maths. HSV, because every rule in the research is stated as
 * "multiply V, keep H and S" and doing that in RGB greys the hue out.
 * ================================================================ */

function toHsv(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255,
    b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
  let h = 0;
  if (c) {
    if (mx === r) h = ((g - b) / c) % 6;
    else if (mx === g) h = (b - r) / c + 2;
    else h = (r - g) / c + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? c / mx : 0, mx];
}

function toHex(h, s, v) {
  s = Math.min(1, Math.max(0, s));
  v = Math.min(1, Math.max(0, v));
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const i = Math.floor(((h % 360) + 360) % 360 / 60);
  const t = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i];
  return (Math.round((t[0] + m) * 255) << 16)
    | (Math.round((t[1] + m) * 255) << 8) | Math.round((t[2] + m) * 255);
}

/** Blend two hexes in RGB. Used only for dirt, which genuinely is a mixture. */
export function blend(a, bb, t) {
  const f = (sh) => {
    const x = (a >> sh) & 255, y = (bb >> sh) & 255;
    return Math.round(x + (y - x) * t);
  };
  return (f(16) << 16) | (f(8) << 8) | f(0);
}

/** Deterministic 0..1 from a string and an integer. No Math.random anywhere
 *  in world building — the same town has to come back on every load. */
function hash(seed, n) {
  let x = 2166136261 ^ n;
  for (let i = 0; i < seed.length; i++) {
    x ^= seed.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  x ^= x >>> 15;
  return ((x >>> 0) % 100000) / 100000;
}

/* ================================================================
 * B. THE VERTICAL RAMP — the single highest-value number in the research.
 *
 * Measured off a midday photograph of Govind Dev (H ~ 17 m): V 78% at 12 m,
 * 48% at 6 m, 32% at 3 m, 17% at 1 m. Same hue throughout, 18-24 degrees.
 * Top-to-bottom ratio 4.5:1.
 *
 * Note what the shape is NOT: it is not a straight line to the parapet. The
 * wall reaches full brightness at only 30% of its height and is flat above
 * that. All the drama is in the bottom third, where the rain splashes.
 * ================================================================ */

/**
 * @param {number} y   height above the building's own ground, in metres
 * @param {number} H   the building's own height, in metres
 * @param {boolean} riverfront  true for anything standing in the Yamuna's
 *   flood range, which behaves differently and for a documented reason
 */
export function vMul(y, H, riverfront = false) {
  const h = Math.max(1, H);
  if (!riverfront) return 0.58 + 0.42 * Math.min(1, Math.max(0, y / (0.30 * h)));
  /*
   * The 2.6 m is the Yamuna silt line. Mathura's danger level is 166 m and
   * floods run to 166.68 m, which puts the Keshi Ghat steps and the road
   * under water most monsoons. Below it everything is one grey-brown
   * regardless of what it is made of.
   */
  return Math.max(0.45, 0.45 + 0.55 * Math.min(1, (y - 2.6) / (0.22 * h)));
}

/** Below the silt line a riverfront wall is mud, whatever it is built of. */
export function siltLine(hex, y) {
  return y < 2.6 ? blend(hex, W_DAMP, 0.6 * (1 - y / 2.6)) : hex;
}

/* ================================================================
 * C. SHADE MULTIPLIERS — multiply V, keep H and S.
 * ================================================================ */
export const SHADE = {
  top: 1.12,          // an upward-facing face catches the sky
  ledge: 1.12,        // then blend 35% toward dust — see dusted()
  recess: 0.62,       // the field of a sunken panel
  arch: 0.16,         // inside a cusped arch. Measured #100d0a against
                      // #c6835a: V 6% against V 78%. Arches read as HOLES.
  shikharaBack: 0.55, // the self-shadowed side of a spire
};

/** V x 1.12, for the topColor argument box() already takes. */
export function sunTop(hex) {
  const [h, s, v] = toHsv(hex);
  return toHex(h, s, v * SHADE.top);
}

/** A ledge over 0.25 m deep collects dust, and dust is not just a lighter
 *  version of the stone — it is a different, greyer colour sitting on it. */
export function dusted(hex) {
  return blend(sunTop(hex), W_DUST, 0.35);
}

/** Multiply value while holding hue and saturation. */
export function shade(hex, k) {
  const [h, s, v] = toHsv(hex);
  return toHex(h, s, v * k);
}

/* ================================================================
 * D. COURSE JITTER
 *
 * Horizontally, course by course: roughly one block in seven is a visibly
 * paler grade or a replacement, jumping +22% value and dropping 28%
 * saturation against its neighbours.
 * ================================================================ */

/**
 * The colour of a course of stone at a given height on a given building.
 *
 * @param {number} base  a palette constant
 * @param {number} y     height above the building's ground
 * @param {number} H     the building's height
 * @param {string} seed  the building id, so two temples never band alike
 * @param {object} [opts]
 * @param {number} [opts.shade=1]      one of SHADE, or any multiplier
 * @param {boolean} [opts.riverfront]  use the flood ramp
 * @param {number} [opts.course=0.45]  course height in metres
 * @returns {number} hex
 */
export function stone(base, y, H, seed, opts = {}) {
  /*
   * Course height. 0.45 m is right for the panelled faces of a shikhara,
   * but a big slab wall wants 0.9 m, because Tavernier (in Growse, p.119)
   * describes the Mathura stone splitting "15 feet long and nine or ten
   * broad and only some six inches thick" — 4.6 m by 2.7 m by 150 mm. These
   * walls are a few LARGE panels, not many small bricks, and banding them
   * at brick pitch is the thing that makes a render look like Lego.
   */
  const course = opts.course || 0.45;
  const n = Math.floor(y / course);
  const r1 = hash(seed, n * 3 + 1);
  const r2 = hash(seed, n * 3 + 2);
  const r3 = hash(seed, n * 3 + 3);

  // 1. pick the grade for this course, but only for stone families
  let pick = base;
  if (base === SS_RED || base === SS_BROWN || base === SS_PINK || base === SS_BARRA) {
    for (const [w, c] of GRADES) { if (r1 <= w) { pick = c; break; } }
  } else if (r1 > 0.88) {
    // 12% of plaster courses are a patch: paler and less saturated
    const [h, s, v] = toHsv(base);
    pick = toHex(h, s * 0.72, v * 1.22);
  }

  let [h, s, v] = toHsv(pick);
  s *= 1 + (r2 - 0.5) * 0.10;                 // +/- 5%
  v *= 1 + (r3 - 0.5) * 0.12;                 // +/- 6%
  v *= vMul(y, H, !!opts.riverfront);
  v *= opts.shade === undefined ? 1 : opts.shade;

  const out = toHex(h, s, v);
  return opts.riverfront ? siltLine(out, y) : out;
}

/* ================================================================
 * H. HUE SEPARATION — what makes the town legible from the tower.
 *
 *   red sandstone temples  H 14-22
 *   lime-plaster town      H 27-38   <- 10-16 degrees away, which is exactly
 *                                       why Rangji's cream gate reads as a
 *                                       different substance from Govind Dev
 *                                       at 400 m
 *   marble                 S <= 21% warm, <= 3% cool
 *   painted street level   H 11-13, S 73-85%  — more saturated than any
 *                                               stone in town
 *
 * G. And the ceiling: under midday lighting the buildings run V 45-80%.
 * Anything brighter than V 80% in any weather is wrong.
 * ================================================================ */

/**
 * Pull a colour from the content files into the family it belongs to.
 *
 * The generated location data was authored by eye and sits at a median
 * saturation of 0.25, where measured Braj stone is 0.50-0.75 — which is why
 * every temple rendered as a washed-out grey-beige no matter how much
 * geometry it had. This keeps each building's authored HUE, which carries
 * the intent, and corrects only the saturation and value, which do not.
 *
 * Marble is left alone: white buildings are genuinely unsaturated, and
 * lifting them would turn Prem Mandir pink.
 */
export function correct(hex) {
  const [h, s, v] = toHsv(hex);
  if (v > 0.86 && s < 0.24) return toHex(h, s, Math.min(v, 0.90));  // marble
  const warm = h <= 45 || h >= 340;
  if (!warm) return hex;                       // greens and blues are paint
  const target = h < 26 ? 0.62 : 0.40;         // stone band, or plaster band
  return toHex(h, Math.max(s, target), Math.min(0.80, Math.max(0.45, v)));
}
