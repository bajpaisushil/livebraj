/**
 * Import configuration for the Vrindavan world build.
 *
 * Source: OpenStreetMap via the Overpass API.
 * Licence: Open Database Licence (ODbL 1.0). Attribution is shipped in the
 * client main menu and in docs/DATA-SOURCES.md. No proprietary map data is
 * used anywhere in this project.
 */

export const ORIGIN = {
  // Shri Banke Bihari Mandir — the world origin, (0, 0) in game metres.
  lat: 27.57998,
  lon: 77.69050,
  label: 'Shri Banke Bihari Mandir',
};

/**
 * Playable area, in game metres relative to ORIGIN. +X east, +Z south.
 *
 * This was a symmetric +/-2100 square until the Chhatikara approach was
 * measured properly. Bhaktivedanta Swami Marg - the road every arriving
 * pilgrim takes - runs 4.74 km from the Chhatikara junction east to ISKCON,
 * and the junction sits 6203 m west of Banke Bihari. A 2100 m half-extent
 * cropped three quarters of that road away, and the importer then quietly
 * clamped the Chhatikara spawn point to the world edge, 1.1 km from ISKCON
 * instead of 5.1 km. Every route out of Chhatikara was measured against a
 * place that was not Chhatikara.
 *
 * So the world is a rectangle now, not a square: the old square plus a
 * western corridor along the approach road. 38.7 km2 against 17.6, but the
 * corridor is farmland and builds cheap. The west edge sits ~600 m beyond
 * the Chhatikara chauraha so the trunk road runs on past it rather than
 * stopping dead at the player's spawn.
 */
export const WORLD_BOUNDS = { minX: -7100, maxX: 2100, minZ: -2100, maxZ: 2700 };

/** Largest half-extent, for code that still wants a single radius. */
export const WORLD_HALF = Math.max(
  -WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX,
  -WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ,
);

/** True when a world-space point lies inside the playable rectangle. */
export function inBounds(x, z, pad = 0) {
  return x >= WORLD_BOUNDS.minX - pad && x <= WORLD_BOUNDS.maxX + pad
      && z >= WORLD_BOUNDS.minZ - pad && z <= WORLD_BOUNDS.maxZ + pad;
}

/** OSM highway class -> in-game road kind, width (m) and priority. */
export const ROAD_CLASSES = {
  // NH 44 / AH 1 - the Delhi-Agra trunk road that pilgrims arrive on, and the
  // reason Chhatikara is a chauraha at all. It was missing from this table
  // until the world grew west far enough to contain it, so every trunk way was
  // silently dropped as unclassed.
  trunk:          { kind: 'trunk',   width: 22.0, prio: 6 },
  trunk_link:     { kind: 'trunk',   width: 12.0, prio: 6 },
  primary:        { kind: 'trunk',   width: 18.0, prio: 6 },
  primary_link:   { kind: 'trunk',   width: 11.0, prio: 6 },
  secondary:      { kind: 'highway', width: 14.0, prio: 5 },
  secondary_link: { kind: 'highway', width: 10.0, prio: 5 },
  tertiary:       { kind: 'main',    width: 11.0, prio: 4 },
  tertiary_link:  { kind: 'main',    width:  8.0, prio: 4 },
  unclassified:   { kind: 'street',  width:  8.0, prio: 3 },
  residential:    { kind: 'street',  width:  6.5, prio: 3 },
  living_street:  { kind: 'gali',    width:  4.6, prio: 2 },
  service:        { kind: 'gali',    width:  4.2, prio: 2 },
  pedestrian:     { kind: 'gali',    width:  4.8, prio: 2 },
  footway:        { kind: 'path',    width:  2.6, prio: 1 },
  path:           { kind: 'path',    width:  2.2, prio: 1 },
  track:          { kind: 'path',    width:  3.4, prio: 1 },
  steps:          { kind: 'path',    width:  2.2, prio: 1 },
};

/**
 * Curated landmark table. OSM gives us exact positions and the real street
 * network; it does NOT give us architecture, deity or story. Those are authored
 * here and matched to OSM nodes by name (including the Russian-language names
 * that a large share of Vrindavan's OSM POIs carry).
 *
 * `match` is a list of case-insensitive substrings tried against every POI name.
 * `fallback` is a lat/lon used only when no OSM node matches.
 */
export const LANDMARKS = [
  {
    id: 'banke-bihari', match: ['Банкебихари', 'Banke Bihari', 'Banki Bihari'],
    name: 'Shri Banke Bihari Mandir', hindi: 'श्री बाँके बिहारी मंदिर',
    type: 'temple', deity: 'Shri Banke Bihari Ji', icon: 'temple',
    build: { kind: 'temple-rajasthani', w: 44, d: 50, h: 15, color: '#ded0b0', accent: '#b0472e', tiers: 3 },
    rot: Math.PI, radius: 30, district: 'old-town',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.57998, 77.69050],
  },
  {
    id: 'radha-raman', match: ['Radha Raman', 'Radha-Ramana', 'Radha Ramana'],
    name: 'Shri Radha Raman Mandir', hindi: 'श्री राधा रमण मंदिर',
    type: 'temple', deity: 'Shri Radha Raman', icon: 'temple',
    build: { kind: 'temple-haveli', w: 26, d: 30, h: 12, color: '#d9c7a4', accent: '#a8563c', arches: 3 },
    rot: Math.PI * 0.5, radius: 24, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58548, 77.69901],
  },
  {
    id: 'radha-gopinath', match: ['Radha Gopinath', 'Gopinath Mandir'],
    name: 'Shri Radha Gopinath Mandir', hindi: 'श्री राधा गोपीनाथ मंदिर',
    type: 'temple', deity: 'Shri Radha Gopinath', icon: 'temple',
    build: { kind: 'temple-truncated', w: 32, d: 38, h: 14, color: '#a8563c', accent: '#8a4230' },
    rot: 0, radius: 24, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58605, 77.69962],
  },
  {
    id: 'radha-shyamsundar', match: ['Radha Shyamsundar'],
    name: 'Shri Radha Shyamsundar Mandir', hindi: 'श्री राधा श्यामसुन्दर मंदिर',
    type: 'temple', deity: 'Shri Radha Shyamsundar', icon: 'temple',
    build: { kind: 'temple-haveli', w: 24, d: 28, h: 10, color: '#dcc9a6', accent: '#b0472e', arches: 5 },
    rot: Math.PI, radius: 22, district: 'old-town',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58269, 77.69613],
  },
  {
    id: 'madan-mohan', match: ['мадан мохан', 'Madan Mohan', 'मदन मोहन'],
    name: 'Shri Madan Mohan Mandir', hindi: 'श्री मदन मोहन मंदिर',
    type: 'temple', deity: 'Shri Madan Mohan', icon: 'temple',
    build: { kind: 'temple-redstone', w: 28, d: 34, h: 15, color: '#a1523a', accent: '#7d3d2b' },
    rot: Math.PI * 0.25, radius: 30, district: 'ghat-front',
    interactions: ['darshan', 'pranam', 'story'],
    fallback: [27.58790, 77.69540],
  },
  {
    id: 'govind-dev', match: ['Govind Dev', 'Govinda Dev'],
    name: 'Shri Govind Dev Ji Mandir', hindi: 'श्री गोविन्द देव जी मंदिर',
    type: 'temple', deity: 'Shri Govind Dev Ji', icon: 'temple',
    build: { kind: 'temple-truncated', w: 50, d: 60, h: 20, color: '#a8563c', accent: '#86402d', cathedral: true },
    rot: Math.PI, radius: 36, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58470, 77.70120],
  },
  {
    id: 'jugal-kishore', match: ['Югалы Кишора', 'Jugal Kishore'],
    name: 'Shri Jugal Kishore Mandir', hindi: 'श्री युगल किशोर मंदिर',
    type: 'temple', deity: 'Shri Jugal Kishore', icon: 'temple',
    build: { kind: 'temple-redstone', w: 26, d: 32, h: 16, color: '#a35540', accent: '#82402e' },
    rot: Math.PI * 1.5, radius: 22, district: 'ghat-front',
    interactions: ['darshan', 'pranam', 'story'],
    fallback: [27.58698, 77.69869],
  },
  {
    id: 'radha-damodar', match: ['Radha Damodara', 'Radha Damodar'],
    name: 'Shri Radha Damodar Mandir', hindi: 'श्री राधा दामोदर मंदिर',
    type: 'temple', deity: 'Shri Radha Damodar', icon: 'temple',
    build: { kind: 'temple-haveli', w: 20, d: 24, h: 9, color: '#dccfb4', accent: '#9c6a48', arches: 3 },
    rot: 0, radius: 20, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58330, 77.69760],
  },
  {
    id: 'gopishwar-mahadev', match: ['Гопишвары Махадевы', 'Gopishwar'],
    name: 'Shri Gopishwar Mahadev Mandir', hindi: 'श्री गोपीश्वर महादेव मंदिर',
    type: 'temple', deity: 'Shri Gopishwar Mahadev', icon: 'temple',
    build: { kind: 'temple-small', w: 22, d: 26, h: 16, color: '#cfc0a0', accent: '#8f6f4a' },
    rot: Math.PI, radius: 20, district: 'ghat-front',
    interactions: ['darshan', 'pranam', 'story'],
    fallback: [27.58515, 77.70295],
  },
  {
    id: 'shahji', match: ['Shahji', 'Shah Ji', 'Lal Babu'],
    name: 'Shahji Mandir', hindi: 'शाहजी मंदिर',
    type: 'temple', deity: 'Chhote Radha Raman', icon: 'temple',
    build: { kind: 'temple-colonnade', w: 32, d: 40, h: 11, color: '#f4f1e8', accent: '#d8cfba' },
    rot: Math.PI, radius: 26, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58480, 77.69700],
  },
  {
    id: 'radha-vallabh', match: ['Radha Vallabh', 'Radhavallabh'],
    name: 'Shri Radha Vallabh Mandir', hindi: 'श्री राधावल्लभ मंदिर',
    type: 'temple', deity: 'Shri Radha Vallabh', icon: 'temple',
    build: { kind: 'temple-gable', w: 30, d: 40, h: 14, color: '#a8563c', accent: '#8a4230' },
    rot: Math.PI * 0.5, radius: 24, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58330, 77.69540],
  },
  {
    id: 'rangaji', match: ['रंगनाथ', 'Ranganath', 'Rangaji'],
    name: 'Shri Rangaji Mandir', hindi: 'श्री रंगनाथ मंदिर',
    type: 'temple', deity: 'Shri Ranganath Ji', icon: 'temple',
    build: { kind: 'temple-gopuram', w: 70, d: 110, h: 28, color: '#e4d8c0', accent: '#c05a33' },
    rot: Math.PI * 0.5, radius: 46, district: 'temple-quarter',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.57530, 77.69160],
  },
  {
    id: 'iskcon-krishna-balaram', match: ['Krishna-Balaram', 'Кришна-Баларам', 'कृष्णा बलराम', 'कृष्ण-बलराम'],
    name: 'Shri Krishna Balaram Mandir', hindi: 'श्री कृष्ण बलराम मंदिर',
    type: 'temple', deity: 'Shri Krishna and Balaram', icon: 'temple',
    build: { kind: 'temple-modern', w: 54, d: 66, h: 21, color: '#f2ece0', accent: '#d8c9a8' },
    rot: Math.PI * 0.5, radius: 40, district: 'raman-reti',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.57253, 77.67757],
  },
  {
    id: 'prem-mandir', match: ['Prem Mandir', 'प्रेम मंदिर'],
    name: 'Prem Mandir', hindi: 'प्रेम मंदिर',
    type: 'temple', deity: 'Shri Radha Krishna', icon: 'temple',
    build: { kind: 'temple-marble', w: 66, d: 84, h: 38, color: '#f8f6f0', accent: '#eae4d4' },
    rot: 0, radius: 52, district: 'raman-reti',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.56740, 77.67590],
  },
  {
    id: 'katyayani', match: ['Katyayani', 'Катьяяни'],
    name: 'Shri Katyayani Peeth', hindi: 'श्री कात्यायनी पीठ',
    type: 'temple', deity: 'Shri Katyayani Devi', icon: 'temple',
    build: { kind: 'temple-small', w: 28, d: 32, h: 19, color: '#d5c3a0', accent: '#9c4a38' },
    rot: Math.PI, radius: 22, district: 'ghat-front',
    interactions: ['darshan', 'pranam', 'story'],
    fallback: [27.57890, 77.70374],
  },
  {
    id: 'nidhivan', match: ['निधिवन', 'Nidhivan', 'Nidhi Van'],
    name: 'Shri Nidhivan', hindi: 'श्री निधिवन',
    type: 'grove', deity: null, icon: 'grove',
    build: { kind: 'grove', w: 130, d: 110, h: 9, color: '#3f6330', accent: '#d8c9a8' },
    rot: Math.PI * 0.5, radius: 58, district: 'old-town',
    interactions: ['pranam', 'story'],
    fallback: [27.58270, 77.69880],
  },
  {
    id: 'seva-kunj', match: ['सेवा कुंज', 'Seva Kunj', 'Sewa Kunj'],
    name: 'Shri Seva Kunj', hindi: 'श्री सेवा कुंज',
    type: 'grove', deity: null, icon: 'grove',
    build: { kind: 'grove', w: 96, d: 88, h: 8, color: '#456a33', accent: '#d8c9a8', dome: true },
    rot: 0, radius: 46, district: 'old-town',
    interactions: ['pranam', 'story'],
    fallback: [27.58150, 77.69520],
  },
  {
    id: 'keshi-ghat', match: ['Keshi Ghat', 'Kesi Ghat', 'Кеши'],
    name: 'Shri Keshi Ghat', hindi: 'श्री केशी घाट',
    type: 'ghat', deity: null, icon: 'ghat',
    build: { kind: 'ghat', w: 120, d: 58, h: 15, color: '#b4664a', accent: '#8f4a34', palace: true },
    rot: Math.PI * 0.15, radius: 56, district: 'ghat-front',
    interactions: ['pranam', 'offer', 'story'],
    fallback: [27.58726, 77.69874],
  },
  {
    id: 'chir-ghat', match: ['Чир-гхат', 'Chir Ghat'],
    name: 'Shri Chir Ghat', hindi: 'श्री चीर घाट',
    type: 'ghat', deity: null, icon: 'ghat',
    build: { kind: 'ghat', w: 62, d: 40, h: 11, color: '#d2c09e', accent: '#9c6a42' },
    rot: Math.PI * 0.1, radius: 34, district: 'ghat-front',
    interactions: ['pranam', 'story'],
    fallback: [27.58550, 77.69663],
  },
  {
    id: 'kaliya-ghat', match: ['Kaliya Ghat', 'Kaliya Ghata', 'Калия'],
    name: 'Shri Kaliya Ghat', hindi: 'श्री कालीय घाट',
    type: 'ghat', deity: null, icon: 'ghat',
    build: { kind: 'ghat', w: 70, d: 44, h: 12, color: '#cfbd9b', accent: '#8f5f3c' },
    rot: Math.PI * 0.2, radius: 36, district: 'ghat-front',
    interactions: ['pranam', 'story'],
    fallback: [27.58490, 77.69590],
  },
  {
    id: 'yugal-ghat', match: ['Югала-гхат', 'Yugal Ghat'],
    name: 'Shri Yugal Ghat', hindi: 'श्री युगल घाट',
    type: 'ghat', deity: null, icon: 'ghat',
    build: { kind: 'ghat', w: 54, d: 36, h: 10, color: '#d2c09e', accent: '#96633f' },
    rot: Math.PI * 0.3, radius: 30, district: 'ghat-front',
    interactions: ['pranam', 'story'],
    fallback: [27.58154, 77.69108],
  },
  {
    id: 'brahma-kund', match: ['Brahma Kund'],
    name: 'Brahma Kund', hindi: 'ब्रह्म कुंड',
    type: 'kund', deity: null, icon: 'kund',
    build: { kind: 'kund', w: 46, d: 46, h: 5, color: '#c9b895', accent: '#6f8f7a' },
    rot: 0, radius: 28, district: 'old-town',
    interactions: ['pranam', 'story'],
    fallback: [27.58060, 77.69300],
  },
  {
    id: 'loi-bazar', match: ['Loi Bazar'],
    name: 'Loi Bazar', hindi: 'लोई बाज़ार',
    type: 'market', deity: null, icon: 'market',
    build: { kind: 'market', w: 60, d: 34, h: 6, color: '#dcc49c', accent: '#c8452a' },
    rot: 0, radius: 40, district: 'bazaar',
    interactions: ['story'],
    fallback: [27.58180, 77.69210],
  },
  {
    id: 'vrindavan-gate', match: [],
    name: 'Vrindavan Dwar', hindi: 'वृन्दावन द्वार',
    type: 'gate', deity: null, icon: 'gate',
    build: { kind: 'gate', w: 26, d: 9, h: 16, color: '#dcc9a8', accent: '#c8452a' },
    rot: Math.PI * 0.5, radius: 26, district: 'raman-reti',
    interactions: ['story'],
    fallback: [27.57630, 77.68120],
  },
  {
    id: 'chhatikara-crossing', match: ['Chhatikara', 'Chatikara'],
    name: 'Chhatikara Crossing', hindi: 'छटीकरा चौराहा',
    type: 'landmark', deity: null, icon: 'gate',
    build: { kind: 'crossing', w: 70, d: 46, h: 13, color: '#d8cdb4', accent: '#c8452a' },
    rot: Math.PI * 0.5, radius: 52, district: 'outskirts',
    interactions: ['story'],
    // The actual four-arm chauraha, read off the OSM network: NH 44 / AH 1
    // crosses here, Chhatikara-Govardan Road leaves west, and Bhaktivedanta
    // Swami Marg leaves east for Vrindavan. The previous value was invented
    // and landed 1.1 km from ISKCON instead of 5.1 km, which quietly made
    // every route measured from Chhatikara meaningless.
    fallback: [27.56163, 77.62596],
  },
  {
    id: 'chandrodaya', match: ['Chandrodaya'],
    name: 'Vrindavan Chandrodaya Mandir', hindi: 'वृन्दावन चन्द्रोदय मंदिर',
    type: 'landmark', deity: null, icon: 'landmark',
    build: { kind: 'tower', w: 44, d: 44, h: 62, color: '#d9d2c4', accent: '#a89878' },
    rot: 0, radius: 48, district: 'outskirts',
    interactions: ['story'],
    fallback: [27.56320, 77.67980],
  },
];

/** Districts, as polygons in lat/lon. Converted to metres by the importer. */
export const DISTRICTS = [
  {
    id: 'old-town', name: 'Purana Shahar', kind: 'old-town',
    palette: ['#e8d2a8', '#e0a88c', '#bcd0cc', '#f0c9a0', '#d9a8b4', '#cfd8b0', '#e6c2d0', '#c8b4d8'],
    minH: 5.5, maxH: 13, density: 0.94,
    poly: [[27.5845, 77.6880], [27.5848, 77.6985], [27.5810, 77.7008], [27.5772, 77.6982], [27.5768, 77.6902], [27.5806, 77.6868]],
  },
  {
    id: 'ghat-front', name: 'Yamuna Ghats', kind: 'ghat-front',
    palette: ['#e2c9a0', '#d8a878', '#c9d4c0', '#e8bfa0', '#bcc8d8'],
    minH: 6, maxH: 15, density: 0.78,
    poly: [[27.5895, 77.6930], [27.5892, 77.7048], [27.5842, 77.7042], [27.5840, 77.6928]],
  },
  {
    id: 'temple-quarter', name: 'Temple Quarter', kind: 'temple-quarter',
    palette: ['#e0cc9c', '#d4b078', '#e8dcb4', '#c8b088', '#dcc0a8'],
    minH: 5, maxH: 12, density: 0.72,
    poly: [[27.5872, 77.6975], [27.5868, 77.7060], [27.5800, 77.7052], [27.5748, 77.6960], [27.5798, 77.6935]],
  },
  {
    id: 'bazaar', name: 'Loi Bazar', kind: 'bazaar',
    palette: ['#f0c89c', '#e8a878', '#f2d8ac', '#e0b490', '#f4b8c0', '#c8d8b0'],
    minH: 5, maxH: 11, density: 0.96,
    poly: [[27.5832, 77.6900], [27.5834, 77.6960], [27.5798, 77.6962], [27.5796, 77.6898]],
  },
  {
    id: 'raman-reti', name: 'Raman Reti', kind: 'raman-reti',
    palette: ['#f2e4cc', '#e4d4b8', '#eee2cc', '#d8ccb0', '#f4ece0', '#dce8d4'],
    minH: 4.5, maxH: 10, density: 0.5,
    poly: [[27.5790, 77.6700], [27.5790, 77.6860], [27.5660, 77.6870], [27.5650, 77.6690]],
  },
  {
    id: 'residential', name: 'Vrindavan Town', kind: 'residential',
    palette: ['#e8d4b0', '#dcbc94', '#e4d8bc', '#d0bc98', '#e0c4cc', '#c4d4c8'],
    minH: 4.5, maxH: 10, density: 0.6,
    poly: [[27.5800, 77.6860], [27.5800, 77.6940], [27.5700, 77.6950], [27.5690, 77.6850]],
  },
  {
    id: 'outskirts', name: 'Outskirts', kind: 'outskirts',
    palette: ['#ded0b6', '#cfc0a2', '#d8cbb0'],
    minH: 3.5, maxH: 7, density: 0.22,
    poly: [[27.5700, 77.6660], [27.5700, 77.6900], [27.5580, 77.6900], [27.5580, 77.6660]],
  },
];
