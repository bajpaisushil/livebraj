/**
 * Signage — the painted shopboards that make a bazaar look like a bazaar.
 *
 * Every board is drawn once into a single 2048px atlas on a twelve-by-twelve
 * grid. A shopfront then takes one cell by its UVs, so the whole town's signage
 * costs one texture and one draw call rather than a material per shop. The
 * names are the ones actually painted on these streets.
 */

import * as THREE from 'three';

// Thirteen by thirteen since Krishna Balaram's campus got its own boards:
// 16 generic + 20 campus + 126 real = 162 of 169 cells, at 157 px a cell.
export const SIGN_COLS = 13;
export const SIGN_ROWS = 13;

/**
 * A hundred and forty-four boards on one 2048px atlas: the eighteen generic
 * trades below, then up to a hundred and twenty-six real shopfronts read from
 * the OSM extract and painted with the name that is actually over that door —
 * Govinda's, Bikanerwala, Brijwasi, the UCO Bank on the corner. Generic boards
 * make a street that LOOKS like Vrindavan; the real names make the street *be*
 * Vrindavan, and they cost nothing extra because they share the same atlas and
 * the same draw call.
 *
 * It was eight by eight, so 48 real slots against 89 eligible POIs — and the
 * 48 were taken with `.slice()`, which is to say in the order the importer
 * happened to emit them. Forty-one real names were dropped for no reason at
 * all, and which forty-one was an accident. Twelve by twelve fits every named
 * place in the extract with room over, at the same 2048px and therefore the
 * same texture memory: the cells go from 256px to 171px, which is still more
 * than a signboard needs at the distance one is read from.
 */
export const REAL_SLOTS = 126;

/** Board designs: background, text colour, Devanagari line, roman line. */
const BOARDS = [
  ['#1d4f3f', '#f5e8c8', 'फूल माला', 'FLOWER GARLANDS'],
  ['#8a2f24', '#f8e4b0', 'मिठाई भंडार', 'SWEETS'],
  ['#2b3a6a', '#f2ece0', 'चाय', 'TEA STALL'],
  ['#c8452a', '#fff0d0', 'प्रसाद', 'PRASAD'],
  ['#3f6d74', '#f6f2e8', 'पीतल भंडार', 'BRASS & BELL METAL'],
  ['#7a4a86', '#f8e8f0', 'वस्त्र', 'CLOTH HOUSE'],
  ['#1d4f3f', '#f5e8c8', 'पूजा सामग्री', 'PUJA SAMAGRI'],
  ['#8a5a2a', '#fdf0d8', 'किराना', 'GENERAL STORE'],
  ['#c9a03c', '#2b1d14', 'श्री राधे', 'RADHE RADHE'],
  ['#2f5d5a', '#f2ece0', 'फोटो स्टूडियो', 'PHOTO STUDIO'],
  ['#a8563c', '#fff0d8', 'भोजनालय', 'BHOJANALAYA'],
  ['#1d3f6a', '#eef4ff', 'मेडिकल', 'MEDICAL STORE'],
  ['#5a7a2a', '#f4f8e0', 'फल सब्ज़ी', 'FRUIT & VEG'],
  ['#8a2f4a', '#ffe8f0', 'चूड़ी', 'BANGLES'],
  ['#3a3a42', '#f0f0f0', 'साइकिल मरम्मत', 'CYCLE REPAIR'],
  ['#c8452a', '#fff4dc', 'धर्मशाला', 'DHARAMSHALA'],
];

/**
 * Sri Sri Krishna-Balaram Mandir's own boards: the names on its official
 * campus signboard and in its arcade (docs/research/iskcon-krishna-balaram.md,
 * "WHAT IS IN THE COMPOUND"), and OSM's names for its buildings. They sit
 * straight after the generic trades, so `campusSign(key)` is a fixed slot.
 */
export const CAMPUS_BOARDS = [
  { key: 'mandir', bg: '#8a2f24', fg: '#f8e4b0', name: 'Sri Sri Krishna Balaram Mandir', deva: 'श्री श्री कृष्ण-बलराम मंदिर' },
  { key: 'samadhi', bg: '#f2ede1', fg: '#6a4a2a', name: "Srila Prabhupada's Samadhi", deva: 'श्रील प्रभुपाद समाधि' },
  { key: 'museum', bg: '#f2ede1', fg: '#6a4a2a', name: "Srila Prabhupada's Museum", deva: 'श्रील प्रभुपाद संग्रहालय' },
  { key: 'house', bg: '#c8452a', fg: '#fff0d0', name: "Srila Prabhupada's House", deva: 'श्रील प्रभुपाद निवास' },
  { key: 'guest', bg: '#2b3a6a', fg: '#f2ece0', name: 'Krishna Balarama Guesthouse', deva: 'अतिथि गृह' },
  { key: 'govindas', bg: '#1d4f3f', fg: '#f5e8c8', name: "Govinda's Restaurant", deva: 'गोविन्दाज़' },
  { key: 'gift', bg: '#c8452a', fg: '#fff0d0', name: 'Gift Shop', deva: 'उपहार' },
  { key: 'books', bg: '#2b3a6a', fg: '#f2ece0', name: 'Book Stall', deva: 'पुस्तक भंडार' },
  { key: 'mahaprasad', bg: '#8a2f24', fg: '#f8e4b0', name: 'Mahaprasad', deva: 'महाप्रसाद' },
  { key: 'market', bg: '#8a5a2a', fg: '#fdf0d8', name: 'Market Place', deva: 'बाज़ार' },
  { key: 'atm', bg: '#1d3f6a', fg: '#eef4ff', name: 'ATM', deva: 'एटीएम' },
  { key: 'post', bg: '#c8452a', fg: '#fff4dc', name: 'Post Office', deva: 'डाकघर' },
  { key: 'welcome', bg: '#3f6d74', fg: '#f6f2e8', name: 'Welcome Centre', deva: 'स्वागत केंद्र' },
  { key: 'internet', bg: '#3a3a42', fg: '#f0f0f0', name: 'Internet Access', deva: 'इंटरनेट' },
  { key: 'matchless', bg: '#7a4a86', fg: '#f8e8f0', name: 'Matchless Gifts', deva: 'मैचलेस गिफ्ट्स' },
  { key: 'bhisma', bg: '#5a7a2a', fg: '#f4f8e0', name: 'Bhisma Office', deva: 'भीष्म कार्यालय' },
  { key: 'vtv', bg: '#2f5d5a', fg: '#f2ece0', name: 'Vrindavan.tv', deva: 'वृंदावन टीवी' },
  { key: 'bbt', bg: '#1d4f3f', fg: '#f5e8c8', name: 'BBT Book Display', deva: 'बीबीटी पुस्तकें' },
  { key: 'security', bg: '#3a3a42', fg: '#f0f0f0', name: 'Security Office', deva: 'सुरक्षा कार्यालय' },
  { key: 'prasadam', bg: '#a8563c', fg: '#fff0d8', name: 'Krishna Prasadam Hall', deva: 'प्रसादम हॉल' },
  // over the small doors in the temple's side walls: "निकास EXIT" on a white
  // board (Commons "In and around ... Vrindavan 13" and "14")
  { key: 'exit', bg: '#f4f1e8', fg: '#1d1d1d', name: 'EXIT', deva: 'निकास' },
  // the west gate's red board, "GATE:2 ISKCON VRINDAVAN" (the same set, 01 and 02)
  { key: 'gate2', bg: '#d0221c', fg: '#fff6ec', name: 'GATE : 2', deva: 'इस्कॉन वृन्दावन' },
  // in the samadhi: the black stone before the murti, and the white plaque on
  // his gilded seat ("Samadhi Mandir, Srila Prabhupad, ISKCON, Vrindavan.jpg")
  { key: 'samadhi-stone', bg: '#161515', fg: '#e8e2d2', name: 'Samadhi Mandir', deva: 'समाधि मन्दिर · श्रील प्रभुपाद' },
  { key: 'acbsp', bg: '#f6f3ea', fg: '#2a2622', name: 'A.C. Bhaktivedanta Swami Prabhupada', deva: 'Founder-Acharya · ISKCON' },
  // Radha Vallabh: the yellow board across the street gate's arch ("Radhavallabh
  // Lal ju Maharaj Temple Vrindavan 2022 01", the checker's reading of it), and
  // the ASI's blue board at the old temple ("हमारी विरासत, हमारा गौरव")
  { key: 'rv-gate', bg: '#f7e997', fg: '#8a1c12', name: 'Shri Radhavallabh Lal Ju', deva: 'विराजमान राधावल्लभ लाल जू महाराज' },
  { key: 'asi', bg: '#1f4f9a', fg: '#ffffff', name: 'Protected Monument · ASI', deva: 'हमारी विरासत, हमारा गौरव' },
  // the two other temples Entwistle puts inside the Radhavallabh Ghera
  { key: 'anandi', bg: '#f2ede1', fg: '#7a2a1a', name: 'Anandi Bai ka Mandir', deva: 'आनन्दी बाई का मन्दिर' },
  { key: 'calcutta', bg: '#f2ede1', fg: '#7a2a1a', name: 'Calcuttawala Mandir', deva: 'कलकत्ते वाला मन्दिर' },
  // Madan Mohan: the ASI's maroon notice board at the foot of the stair, the
  // tower pictured on it ("Radha Madan Mohan Temple (36399)")
  { key: 'mm-asi', bg: '#6b1f2a', fg: '#f2e6d0', name: 'Madan Mohan Temple', deva: 'मदन मोहन मंदिर' },
];

/** Atlas slot of one of Krishna Balaram's boards, or -1. */
export function campusSign(key) {
  const i = CAMPUS_BOARDS.findIndex((b) => b.key === key);
  return i < 0 ? -1 : BOARDS.length + i;
}

/** Palettes the real boards cycle through, so a street is not one colour. */
const REAL_PALETTE = [
  ['#1d4f3f', '#f5e8c8'], ['#8a2f24', '#f8e4b0'], ['#2b3a6a', '#f2ece0'],
  ['#c8452a', '#fff0d0'], ['#3f6d74', '#f6f2e8'], ['#8a5a2a', '#fdf0d8'],
  ['#5a7a2a', '#f4f8e0'], ['#7a4a86', '#f8e8f0'],
];

/** The trade word under a real name, by POI class. */
const REAL_WORD = {
  food: ['भोजनालय', 'RESTAURANT'], stay: ['धर्मशाला', 'GUEST HOUSE'],
  service: ['सेवा', 'SERVICES'], health: ['मेडिकल', 'MEDICAL'],
  bazaar: ['बाज़ार', 'BAZAAR'], shop: ['दुकान', 'SHOP'],
  temple: ['मंदिर', 'MANDIR'], green: ['बाग़', 'GARDEN'],
  sight: ['दर्शनीय', 'WORTH SEEING'], water: ['जल', 'WATER'],
  other: ['श्री राधे', 'RADHE RADHE'],
};

/** Real boards built for this world; index i sits at atlas slot BOARDS.length + i. */
let realBoards = [];

/**
 * Take the named shops from the imported POIs and turn them into boards.
 * Called once before the atlas is built; safe to call with nothing.
 */
export function setRealSigns(pois, roads = [], locations = []) {
  /*
   * WHICH names get painted, when there are more names than slots.
   *
   * This used to be `.slice(0, REAL_SLOTS)` — the first N in whatever order the
   * importer emitted them. With 89 eligible POIs and 48 slots that silently
   * threw away 41 real shopfronts, and which 41 was an accident of file order.
   *
   * Now they are ranked by how close they are to a road a pilgrim actually
   * walks. A dhaba on Bhaktivedanta Swami Marg is a name you will read; a
   * utility yard 200 m inside a campus is not, however real it is. Galis and
   * footpaths are left out of the ranking on purpose — they are the back lanes,
   * and a board there is a board nobody passes.
   */
  const WALKED = new Set(['trunk', 'highway', 'main', 'street', 'parikrama']);
  const lane = [];
  for (const r of roads || []) {
    if (!WALKED.has(r.kind)) continue;
    for (const pt of r.points) lane.push(pt);
  }
  const distToLane = (x, z) => {
    let best = Infinity;
    for (let i = 0; i < lane.length; i++) {
      const dx = x - lane[i][0], dz = z - lane[i][1];
      const d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };

  /*
   * A temple that already stands as architecture does not want a shopboard —
   * it has a building, a name card and an altar. But only 26 of the 162 places
   * in the extract are built that way, and the filter here excluded EVERY
   * temple, so 34 real temples had no name on them anywhere in the world. The
   * ones that are not built get their board.
   */
  const builtAt = (locations || []).map((l) => l.pos);
  const isBuilt = (x, z) => builtAt.some((q) => Math.hypot(x - q[0], z - q[1]) < 45);

  realBoards = (pois || [])
    .filter((p) => p.name && p.name.length <= 28 && p.pos)
    .filter((p) => !(p.kind === 'temple' && isBuilt(p.pos[0], p.pos[1])))
    .map((p) => ({ p, d: lane.length ? distToLane(p.pos[0], p.pos[1]) : 0 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, REAL_SLOTS)
    .map(({ p }, i) => {
      const [bg, fg] = REAL_PALETTE[i % REAL_PALETTE.length];
      const word = REAL_WORD[p.kind] || REAL_WORD.other;
      return { bg, fg, name: p.name, deva: p.hindi || word[0], roman: word[1], poi: p };
    });
  cached = null;    // the atlas has to be repainted with the new names
  return realBoards;
}

/** The POI a real board belongs to, for placing it at the right address. */
export function realSignFor(index) {
  const b = realBoards[index - BOARDS.length - CAMPUS_BOARDS.length];
  return b ? b.poi : null;
}

/** Atlas slot for the nth real board, or -1 when there is none. */
export function realSignSlot(n) {
  return n >= 0 && n < realBoards.length ? BOARDS.length + CAMPUS_BOARDS.length + n : -1;
}

export function realSignCount() { return realBoards.length; }

let cached = null;

/** One atlas for the whole town. */
export function signAtlas(ctx) {
  if (cached) return cached;
  cached = ctx.textures.get('sign-atlas', () => {
    const S = 2048;
    const cell = S / SIGN_COLS;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    BOARDS.forEach((b, i) => {
      const cx = (i % SIGN_COLS) * cell;
      const cy = Math.floor(i / SIGN_COLS) * cell;
      const [bg, fg, deva, roman] = b;

      // the board, with a painted border and a little wear
      g.fillStyle = bg;
      g.fillRect(cx, cy, cell, cell);
      g.strokeStyle = fg;
      g.globalAlpha = 0.55;
      g.lineWidth = Math.max(2, cell * 0.0195);
      const inA = cell * 0.035;
      g.strokeRect(cx + inA, cy + inA, cell - inA * 2, cell - inA * 2);
      g.globalAlpha = 1;

      g.textAlign = 'center';
      g.fillStyle = fg;

      g.font = `600 ${Math.round(cell * 0.21)}px "Tiro Devanagari Hindi", serif`;
      g.fillText(deva, cx + cell / 2, cy + cell * 0.44);

      g.font = `500 ${Math.round(cell * 0.096)}px Jost, system-ui, sans-serif`;
      g.fillText(roman, cx + cell / 2, cy + cell * 0.66);

      // a hand-painted underline, because they all have one
      g.globalAlpha = 0.7;
      g.fillRect(cx + cell * 0.24, cy + cell * 0.73, cell * 0.52, Math.max(2, cell * 0.012));
      g.globalAlpha = 1;
    });

    /* Krishna Balaram's boards, then the real shopfronts */
    const fitted = (b, i, sub, subFont) => {
      if (i >= SIGN_COLS * SIGN_ROWS) return;
      const cx = (i % SIGN_COLS) * cell;
      const cy = Math.floor(i / SIGN_COLS) * cell;
      g.fillStyle = b.bg;
      g.fillRect(cx, cy, cell, cell);
      g.strokeStyle = b.fg;
      g.globalAlpha = 0.55; g.lineWidth = Math.max(2, cell * 0.0156);
      const inB = cell * 0.027;
      g.strokeRect(cx + inB, cy + inB, cell - inB * 2, cell - inB * 2);
      g.globalAlpha = 1;
      g.textAlign = 'center';
      g.fillStyle = b.fg;
      const words = b.name.split(/\s+/);
      const lines = words.length > 2
        ? [words.slice(0, Math.ceil(words.length / 2)).join(' '),
           words.slice(Math.ceil(words.length / 2)).join(' ')]
        : [b.name];
      let size = Math.round(cell * (lines.length > 1 ? 0.15 : 0.19));
      for (;;) {
        g.font = `600 ${size}px Jost, system-ui, sans-serif`;
        const widest = Math.max(...lines.map((l) => g.measureText(l).width));
        if (widest <= cell * 0.82 || size <= cell * 0.055) break;
        size -= 1;
      }
      const top = cy + cell * (lines.length > 1 ? 0.33 : 0.42);
      lines.forEach((l, k) => g.fillText(l, cx + cell / 2, top + k * size * 1.12));
      g.globalAlpha = 0.86;
      g.font = subFont;
      g.fillText(sub, cx + cell / 2, cy + cell * 0.72, cell * 0.86);
      g.globalAlpha = 0.7;
      g.fillRect(cx + cell * 0.26, cy + cell * 0.78, cell * 0.48, Math.max(1, cell * 0.009));
      g.globalAlpha = 1;
    };
    CAMPUS_BOARDS.forEach((b, n) => fitted(b, BOARDS.length + n, b.deva,
      `600 ${Math.round(cell * 0.1)}px "Tiro Devanagari Hindi", serif`));

    realBoards.forEach((b, n) => {
      const i = BOARDS.length + CAMPUS_BOARDS.length + n;
      if (i >= SIGN_COLS * SIGN_ROWS) return;
      const cx = (i % SIGN_COLS) * cell;
      const cy = Math.floor(i / SIGN_COLS) * cell;

      g.fillStyle = b.bg;
      g.fillRect(cx, cy, cell, cell);
      g.strokeStyle = b.fg;
      g.globalAlpha = 0.55; g.lineWidth = Math.max(2, cell * 0.0156);
      const inB = cell * 0.027;
      g.strokeRect(cx + inB, cy + inB, cell - inB * 2, cell - inB * 2);
      g.globalAlpha = 1;

      g.textAlign = 'center';
      g.fillStyle = b.fg;

      // the name gets the space; it shrinks to fit rather than overflowing
      const words = b.name.split(/\s+/);
      const lines = words.length > 2
        ? [words.slice(0, Math.ceil(words.length / 2)).join(' '),
           words.slice(Math.ceil(words.length / 2)).join(' ')]
        : [b.name];
      let size = Math.round(cell * (lines.length > 1 ? 0.15 : 0.19));
      for (;;) {
        g.font = `600 ${size}px Jost, system-ui, sans-serif`;
        const widest = Math.max(...lines.map((l) => g.measureText(l).width));
        if (widest <= cell * 0.82 || size <= cell * 0.055) break;
        size -= 1;
      }
      const top = cy + cell * (lines.length > 1 ? 0.33 : 0.42);
      lines.forEach((l, k) => g.fillText(l, cx + cell / 2, top + k * size * 1.12));

      g.globalAlpha = 0.86;
      g.font = `500 ${Math.round(cell * 0.085)}px Jost, system-ui, sans-serif`;
      g.fillText(b.roman, cx + cell / 2, cy + cell * 0.72);
      g.globalAlpha = 0.7;
      g.fillRect(cx + cell * 0.26, cy + cell * 0.78, cell * 0.48, Math.max(1, cell * 0.009));
      g.globalAlpha = 1;
    });

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
  return cached;
}

/** UV rect for a given board, for a quad's four corners. */
export function signUV(index) {
  const total = BOARDS.length + CAMPUS_BOARDS.length + realBoards.length;
  const i = ((index % total) + total) % total;
  const u = (i % SIGN_COLS) / SIGN_COLS;
  const v = 1 - (Math.floor(i / SIGN_COLS) + 1) / SIGN_ROWS;
  const w = 1 / SIGN_COLS;
  const h = 1 / SIGN_ROWS;
  return { u0: u, v0: v, u1: u + w, v1: v + h };
}

/** Generic boards only — what a building picks from when it has no address. */
export const SIGN_COUNT = BOARDS.length;
