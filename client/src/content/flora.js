/**
 * Vegetation and pickable flowers.
 *
 * Positions are derived deterministically from the imported road, river and
 * landmark geometry rather than hand-placed, so the planting survives a world
 * rebuild. The rules encode where things actually grow in Vrindavan: kadamb and
 * tamal around the groves, peepal and banyan at junctions and ghats, neem in
 * the residential lanes, tulsi on plinths at every temple and many doorways.
 */

import { makeRng, hashSeed } from '../engine/math/Random.js';
import { pointInPolygon, resample } from '../engine/math/Curves.js';
import { dist } from '../engine/math/MathUtils.js';
import { ROADS } from './roads.generated.js';
import { RIVER } from './river.generated.js';
import { LOCATIONS } from './locations.generated.js';
import { DISTRICTS } from './districts.generated.js';

import { WORLD } from './world.generated.js';

const B = WORLD.bounds;

/** A uniform point inside the playable rectangle. */
const spanX = (t) => B.minX + t * (B.maxX - B.minX);
const spanZ = (t) => B.minZ + t * (B.maxZ - B.minZ);

/** Keep-out: nothing plants inside a landmark footprint. */
const footprints = LOCATIONS.map((l) => ({
  x: l.pos[0], z: l.pos[1],
  r: Math.max(l.build.w, l.build.d) * 0.62,
  type: l.type, id: l.id,
}));

const blocked = (x, z, pad = 0, ignoreId = null) => {
  for (const f of footprints) {
    if (f.id === ignoreId) continue;
    if (dist(x, z, f.x, f.z) < f.r + pad) return true;
  }
  return false;
};

const districtAt = (x, z) => DISTRICTS.find((d) => pointInPolygon(x, z, d.poly)) || null;

/* ------------------------------------------------------------------ *
 * Trees
 * ------------------------------------------------------------------ */
function generateTrees() {
  const rng = makeRng(hashSeed('vrindavan-trees'));
  const out = [];
  const taken = [];

  const place = (x, z, kind, scale, minGap = 7) => {
    if (x < B.minX + 20 || x > B.maxX - 20 || z < B.minZ + 20 || z > B.maxZ - 20) return false;
    if (blocked(x, z, 2)) return false;
    for (const t of taken) if (dist(x, z, t[0], t[1]) < minGap) return false;
    taken.push([x, z]);
    out.push({ pos: [r2(x), r2(z)], kind, scale: r2(scale) });
    return true;
  };

  // avenue planting: set back from the kerb of the wider roads
  for (const road of ROADS) {
    if (road.kind === 'path') continue;
    const spacing = road.kind === 'gali' ? 34 : road.kind === 'street' ? 26 : 19;
    const pts = resample(road.points, spacing);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, z] = pts[i];
      const d = districtAt(x, z);
      const density = d ? 0.62 + (1 - d.density) * 0.35 : 0.85;
      if (rng() > density) continue;
      const prev = pts[i - 1];
      const dx = x - prev[0], dz = z - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len;
      const side = rng() < 0.5 ? 1 : -1;
      const off = road.width * 0.5 + 2.2 + rng() * 3.4;
      const kind = avenueKind(rng, d);
      place(x + nx * off * side, z + nz * off * side, kind, 0.82 + rng() * 0.5, 8);
    }
  }

  // riverbank: kadamb and tamal crowd the Yamuna, palms behind them
  const bank = resample(RIVER.points, 13);
  for (let i = 0; i < bank.length; i++) {
    const [x, z] = bank[i];
    /*
     * Out ACROSS the river, along its own normal. This stepped out in z
     * alone, which is only across the stream where the Yamuna runs east-west:
     * where it turns north past the western fields, every one of these went
     * up and down the channel instead — into the water. PropScatter now also
     * refuses a tree standing in the river, so a bank that moves cannot put
     * one back in it.
     */
    const a = bank[Math.max(0, i - 1)], b = bank[Math.min(bank.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
    for (let s = 0; s < 6; s++) {
      const off = RIVER.width * 0.5 + 6 + rng() * 64;
      const side = rng() < 0.62 ? 1 : -1;
      const jitter = (rng() - 0.5) * 22;
      const kind = rng() < 0.42 ? 'kadamb' : rng() < 0.68 ? 'tamal' : rng() < 0.86 ? 'peepal' : 'palm';
      place(x + nz * jitter + nx * off * side, z - nx * jitter + nz * off * side, kind, 0.9 + rng() * 0.7, 9);
    }
  }

  // groves: a dense heart of twisted tamal and kadamb
  for (const loc of LOCATIONS.filter((l) => l.type === 'grove')) {
    const rw = loc.build.w * 0.46, rd = loc.build.d * 0.46;
    const n = Math.round((rw * rd) / 26);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng());
      const x = loc.pos[0] + Math.cos(a) * r * rw;
      const z = loc.pos[1] + Math.sin(a) * r * rd;
      if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ) continue;
      for (const t of taken) if (dist(x, z, t[0], t[1]) < 3.4) { continue; }
      taken.push([x, z]);
      out.push({ pos: [r2(x), r2(z)], kind: rng() < 0.62 ? 'tamal' : 'kadamb', scale: r2(0.6 + rng() * 0.45), grove: loc.id });
    }
  }

  // temple courtyards: a tulsi on a plinth, and shade trees at the edge
  for (const loc of LOCATIONS.filter((l) => l.type === 'temple')) {
    const r = Math.max(loc.build.w, loc.build.d) * 0.5;
    place(loc.pos[0] + Math.sin(loc.rot) * (r + 5), loc.pos[1] + Math.cos(loc.rot) * (r + 5), 'tulsi', 0.9, 2);
    for (let i = 0; i < 4; i++) {
      const a = loc.rot + Math.PI + (rng() - 0.5) * 2.4;
      const rr = r + 7 + rng() * 9;
      place(loc.pos[0] + Math.sin(a) * rr, loc.pos[1] + Math.cos(a) * rr, rng() < 0.5 ? 'peepal' : 'neem', 1 + rng() * 0.5, 8);
    }
  }

  // open ground in the outskirts
  const fields = DISTRICTS.find((d) => d.kind === 'outskirts');
  if (fields) {
    for (let i = 0; i < 1400; i++) {
      const x = spanX(rng()), z = spanZ(rng());
      if (!pointInPolygon(x, z, fields.poly)) continue;
      place(x, z, rng() < 0.4 ? 'neem' : rng() < 0.7 ? 'peepal' : 'palm', 0.9 + rng() * 0.6, 11);
    }
  }

  return out;
}

function avenueKind(rng, district) {
  const k = district ? district.kind : 'residential';
  const r = rng();
  if (k === 'ghat-front') return r < 0.3 ? 'kadamb' : r < 0.55 ? 'peepal' : r < 0.8 ? 'mango' : 'tamal';
  if (k === 'old-town' || k === 'bazaar') return r < 0.35 ? 'neem' : r < 0.6 ? 'peepal' : r < 0.8 ? 'mango' : 'tulsi';
  if (k === 'raman-reti') return r < 0.35 ? 'neem' : r < 0.6 ? 'kadamb' : r < 0.85 ? 'peepal' : 'palm';
  if (k === 'outskirts') return r < 0.5 ? 'neem' : r < 0.8 ? 'palm' : 'peepal';
  return r < 0.22 ? 'banyan' : r < 0.45 ? 'peepal' : r < 0.62 ? 'neem' : r < 0.8 ? 'mango' : r < 0.9 ? 'amla' : 'kadamb';
}

/* ------------------------------------------------------------------ *
 * Flowers — the pickable ones.
 *
 * Placement follows intent, not noise: you find marigold in temple courtyards
 * and the bazaar, lotus only at the water, tulsi in the groves and at temple
 * doors, jasmine in garden corners. A flower on a road is a flower that feels
 * scattered by a level editor.
 * ------------------------------------------------------------------ */
function generateFlowerSpots() {
  const rng = makeRng(hashSeed('vrindavan-flowers'));
  const out = [];
  const taken = [];
  let n = 0;

  let owner = null;
  const place = (x, z, kind, minGap = 11) => {
    if (blocked(x, z, -1, owner)) return false;
    for (const t of taken) if (dist(x, z, t[0], t[1]) < minGap) return false;
    taken.push([x, z]);
    out.push({ id: `fl-${kind}-${n++}`, pos: [r2(x), r2(z)], kind });
    return true;
  };

  // temple courtyards — marigold, and tulsi by the door
  for (const loc of LOCATIONS.filter((l) => l.type === 'temple')) {
    owner = loc.id;
    const r = Math.max(loc.build.w, loc.build.d) * 0.5;
    for (let i = 0; i < 5; i++) {
      const a = loc.rot + (rng() - 0.5) * 2.0;
      const rr = r + 4 + rng() * 8;
      place(loc.pos[0] + Math.sin(a) * rr, loc.pos[1] + Math.cos(a) * rr, rng() < 0.75 ? 'marigold' : 'tulsi', 5);
    }
  }

  // groves — tulsi under the canopy
  for (const loc of LOCATIONS.filter((l) => l.type === 'grove')) {
    owner = loc.id;
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
      place(loc.pos[0] + Math.cos(a) * r * loc.build.w * 0.4,
            loc.pos[1] + Math.sin(a) * r * loc.build.d * 0.4, 'tulsi', 6);
    }
  }

  // ghats and kunds — lotus at the water's edge
  for (const loc of LOCATIONS.filter((l) => l.type === 'ghat' || l.type === 'kund')) {
    owner = loc.id;
    for (let i = 0; i < 6; i++) {
      const a = loc.rot + Math.PI + (rng() - 0.5) * 1.8;
      const rr = loc.build.w * 0.36 + rng() * 14;
      place(loc.pos[0] + Math.sin(a) * rr, loc.pos[1] + Math.cos(a) * rr, 'lotus', 6);
    }
  }

  owner = null;

  // bazaar — flower sellers' overspill, marigold and jasmine
  const bazaar = DISTRICTS.find((d) => d.kind === 'bazaar');
  if (bazaar) {
    for (let i = 0; i < 160 && out.length < 220; i++) {
      const x = spanX(rng()), z = spanZ(rng());
      if (!pointInPolygon(x, z, bazaar.poly)) continue;
      place(x, z, rng() < 0.7 ? 'marigold' : 'jasmine', 13);
    }
  }

  // gardens along the quieter lanes of Raman Reti
  const reti = DISTRICTS.find((d) => d.kind === 'raman-reti');
  if (reti) {
    for (const road of ROADS.filter((r) => r.kind === 'street' || r.kind === 'gali')) {
      for (const [x, z] of resample(road.points, 46)) {
        if (!pointInPolygon(x, z, reti.poly)) continue;
        if (rng() > 0.3) continue;
        place(x + (rng() - 0.5) * 14, z + (rng() - 0.5) * 14, rng() < 0.5 ? 'jasmine' : 'marigold', 20);
      }
    }
  }

  return out;
}

const r2 = (n) => Math.round(n * 100) / 100;

export const TREES = generateTrees();
export const FLOWER_SPOTS = generateFlowerSpots();

export const FLOWER_KINDS = {
  marigold: { name: 'Marigold', hindi: 'गेंदा', color: '#f5a623', accent: '#e07818', line: 'A marigold, still cool from the morning.' },
  lotus:    { name: 'Lotus',    hindi: 'कमल',  color: '#f0a8bc', accent: '#d97f9a', line: 'A lotus, lifted from the still water.' },
  tulsi:    { name: 'Tulsi',    hindi: 'तुलसी', color: '#4f7a3a', accent: '#3d6230', line: 'A sprig of tulsi. Nothing is dearer at the altar.' },
  jasmine:  { name: 'Jasmine',  hindi: 'चमेली', color: '#f6f2e8', accent: '#e0dcc8', line: 'Jasmine — you can smell it before you see it.' },
};
