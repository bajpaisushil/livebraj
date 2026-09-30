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
    /*
     * RED SANDSTONE, not cream. Growse, 1883: "a large square RED SANDSTONE
     * block of plain, but exceedingly substantial, character, with a very
     * effective central gateway of white stone." Amar Ujala, 2026: "मंदिर का
     * निर्माण लाल बलुई पत्थर से किया गया है।"
     *
     * THE FACADE HAS TWO VALID STATES AND THIS IS STATE 2 — as it stands
     * today. In June 2026 the ASI Science Branch, Agra Circle, stripped the
     * yellowed polymer coating that had trapped moisture and hollowed the
     * stone, treated it and polished it back to natural red sandstone.
     *
     * State 1 is the dusty pink-buff of the 2010-2012 photographs, and it is
     * the one with MEASURED hexes (#eadacb sunlit, #b79c89 in shade, hue
     * drifting H 7-39 at S 11-33%) — which is why the building gets called
     * cream and ochre and pink-red by different people looking at the same
     * wall. State 2 has no measured hex anywhere, because every exterior
     * photograph that exists predates the restoration.
     *
     * So this value is INFERRED: the Braj red-sandstone family from
     * docs/research/detail-colour.md rather than a sample of this building.
     * Height 17 m to the main parapet, from the survey's own estimate range
     * of 15-17 — and not the 169.77 m that Hindi Wikipedia prints, which is
     * the site's ELEVATION ABOVE SEA LEVEL mislabelled.
     */
    build: { kind: 'temple-rajasthani', w: 44, d: 50, h: 17, color: '#a85f40', accent: '#b0472e', tiers: 3 },
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
    /*
     * 56 m x 36 m, and the FRONT IS EAST (rot 180, so the east front faces
     * -Z and the E-W axis is `d`).
     *
     * Was 50 x 60, which is both too narrow across the transepts and too
     * deep. Two independent measurements agree: Growse's own plate (40 ft =
     * 1 inch, facing p.248) gives components summing to ~185 ft E-W, and
     * OSM's 161-node satellite trace of way 99427138 measures 56.2 x 34.4 m
     * = 184 x 113 ft. Bharatkosh's "200 x 120 ft" is the same figure rounded.
     *
     * Height has NO documented figure anywhere — not Growse, not Fergusson,
     * not the ASI. 20 m is a photogrammetric estimate cross-checked against
     * the 35 ft crossing span and 23.5 ft arm spans, and it is ESTIMATED, not
     * sourced. The "110-foot shikhara" of the travel sites has no primary
     * source at all, and the "seven storeys" is devotional tradition that
     * neither Growse nor Fergusson ever mentions.
     *
     * Colour is the mean of sampled modern photographs: H20 S58 V66, with
     * real per-block variation across H 15-27, S 35-70, V 20-75, because the
     * wall mixes 1873-77 replacement stone with spalled pale faces and
     * original weathered blocks.
     */
    build: { kind: 'temple-truncated', w: 36, d: 56, h: 20, color: '#a96a47', accent: '#86402d', cathedral: true },
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
    /*
     * From docs/research/shahji.md: "Whole white-marble mass, minimum-area
     * rectangle: 49.4 × 30.5 m, long axis bearing 054°" and "the facade faces
     * bearing ~144° (SE) onto the court", which in the box frame is -36
     * degrees (+lz toward the court). `compound` is the marble mass and its
     * 38 x 38 m forecourt, which the town must keep off. Honey and white
     * marble, measured; see ShahjiMandir.js.
     */
    build: { kind: 'temple-colonnade', w: 49.4, d: 30.5, h: 20, color: '#d8c6a2', accent: '#f0ede6', measured: true },
    rot: -36 * Math.PI / 180, radius: 26, district: 'temple-quarter',
    compound: { lx0: -29.2, lx1: 25.7, lz0: -16.25, lz1: 56.25 },
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.58480, 77.69700],
  },
  {
    id: 'radha-vallabh', match: ['Radha Vallabh', 'Radhavallabh'],
    name: 'Shri Radha Vallabh Mandir', hindi: 'श्री राधावल्लभ मंदिर',
    type: 'temple', deity: 'Shri Radha Vallabh', icon: 'temple',
    /*
     * On its real site now (docs/research/radha-vallabh.md, "Coordinate,
     * resolved"): OSM node 7172103529 is the temple, and ESRI imagery over it
     * shows the old temple's long roof due east-west 3.3 m north of the node,
     * centred 3.2 m west of it — which is this point. It stood 430 m NE. The
     * frame's +lz is EAST, the old temple's front; the living temple is
     * south. Build: both temples' footprint, the old one's measured stone.
     */
    at: [27.5811038, 77.6916876],
    build: { kind: 'temple-gable', w: 34, d: 37, h: 14, color: '#ac866a', accent: '#61230e', measured: true },
    rot: -Math.PI * 0.5, radius: 26, district: 'temple-quarter',
    compound: { lx0: -28.7, lx1: 6.17, lz0: -19.6, lz1: 31.8, ring: false },
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.5811038, 77.6916876],
  },
  {
    id: 'rangaji', match: ['रंगनाथ', 'Ranganath', 'Rangaji'],
    name: 'Shri Rangaji Mandir', hindi: 'श्री रंगनाथ मंदिर',
    type: 'temple', deity: 'Shri Ranganath Ji', icon: 'temple',
    /*
     * At full size now (docs/research/rangaji.md): Growse's outer walls,
     * "773 feet in length by 440 in breadth" = 236 x 135 m, the long axis on
     * OSM's 89.3 bearing with the principal gate WEST (+lz in the box frame),
     * and a compound that takes in the walls and the west forecourt. It was
     * built at half this size to fit the town already there.
     */
    build: { kind: 'temple-gopuram', w: 135, d: 236, h: 35, color: '#ae8a54', accent: '#ddd3be', measured: true },
    rot: 89.3 * Math.PI / 180, radius: 46, district: 'temple-quarter',
    compound: { lx0: -68.5, lx1: 68.5, lz0: -120, lz1: 170 },
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.57530, 77.69160],
  },
  {
    id: 'iskcon-krishna-balaram', match: ['Krishna-Balaram', 'Кришна-Баларам', 'कृष्णा बलराम', 'कृष्ण-बलराम'],
    name: 'Shri Krishna Balaram Mandir', hindi: 'श्री कृष्ण बलराम मंदिर',
    type: 'temple', deity: 'Shri Krishna and Balaram', icon: 'temple',
    build: { kind: 'temple-modern', w: 54, d: 66, h: 21, color: '#f2ece0', accent: '#d8c9a8' },
    /*
     * PLACED AND TURNED FROM THE SURVEY (docs/research/iskcon-krishna-balaram.md
     * and OSM, Overpass 2026-09-30). It was on the compound's pin, 29 m off,
     * and turned 90 degrees so its gate faced a lane to the west. In life the
     * gate is on Bhaktivedanta Swami Marg to the SOUTH, and every core
     * building shares one grid, long axes 347.7/167.7. So: the TEMPLE BLOCK's
     * own centre (way 334202009), turned -12.3 degrees, which puts the
     * builder's +lz toward the road.
     *
     * `compound` is the fenced campus (way 334202001) in that frame, relative
     * to the temple: the temple sits near its WEST edge, so a circle round it
     * — the old `grounds: 100` — cleared the town far across the west lane
     * and not far enough to the east.
     */
    at: [27.5723243, 77.6773845],
    rot: -12.3 * Math.PI / 180, radius: 40, district: 'raman-reti',
    compound: { lx0: -19.9, lx1: 103.6, lz0: -76.3, lz1: 55.3 },
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.57253, 77.67757],
  },
  /*
   * Chaar Dham, Chhatikara. NOT in the OSM extract at all — a search of all 162
   * imported places for dham/char/chhota returns only "Shri Ji Dham ashram" —
   * so it is placed here from its own coordinates and would otherwise not exist
   * in the world. You asked for it twice.
   *
   * Opened 8 February 2025, developed by the JC Chaudhary Trust, at the NH-44 /
   * Bhaktivedanta Swami Marg junction: 629 m from Chhatikara Crossing, which is
   * where you start, so it is the first thing on the road into Vrindavan.
   *
   * WHICH four dhams: the establishment's own site names Shiv Dham, Maa Vaishno
   * Devi Dham, Radha Krishna Dham and Shani Dham. It is NOT the classical
   * Badrinath / Dwarka / Puri / Rameshwaram — one guide site infers that and no
   * source states it, so it is not built that way.
   *
   * The two figures every source agrees on are the ones you see from the road:
   * a 141 ft (43 m) Maa Vaishno Devi and a 187 ft (57 m) trident. Campus size
   * is disputed — 8 acres on one guide, 11 on the temple's own site; 11 acres
   * is 211 m square, and `grounds` follows the temple.
   */
  {
    id: 'chaar-dham', match: ['Chaar Dham', 'Char Dham', 'Vaishno Devi Dham', 'चार धाम'],
    name: 'Chaar Dham', hindi: 'चार धाम',
    type: 'temple', deity: 'Shiv, Maa Vaishno Devi, Radha Krishna and Shani', icon: 'temple',
    build: { kind: 'temple-chaardham', w: 76, d: 76, h: 26, color: '#f4efe4', accent: '#c9a03c' },
    grounds: 96,
    // the entrance faces back down the highway toward Chhatikara Crossing
    rot: -1.7011, radius: 70, district: 'outskirts',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    fallback: [27.560892, 77.6322786],
  },
  {
    id: 'prem-mandir', match: ['Prem Mandir', 'प्रेम मंदिर'],
    name: 'Prem Mandir', hindi: 'प्रेम मंदिर',
    type: 'temple', deity: 'Shri Radha Krishna', icon: 'temple',
    /*
     * 61 x 41 is the BUILDING (OSM way 673573044); the jagati is 110 x 68 and
     * the walled park around it roughly 430 x 340 m (checker, z17 imagery),
     * so the town is kept out by `grounds`, as at Krishna Balaram. Faces EAST:
     * see buildPremMandir.
     */
    build: { kind: 'temple-marble', w: 61, d: 41, h: 38, color: '#f8f6f0', accent: '#eae4d4' },
    rot: 0, radius: 52, district: 'raman-reti', grounds: 140,
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

/**
 * Districts, as polygons in lat/lon. Converted to metres by the importer.
 *
 * THE PALETTES ARE NOT OSM DATA. OpenStreetMap carries no house colours, so
 * every hex below was authored here by eye — and the first pass was authored
 * wrongly. It ran to mint green, lavender and rose (#bcd0cc, #c8b4d8,
 * #e6c2d0), which made the town read as a seaside resort behind a red
 * sandstone temple.
 *
 * Corrected 2026-09-27 against the measurement in docs/research/detail-colour.md:
 * across a 120 m riverfront at Keshi Ghat every built surface sat inside
 * H 5-22 and H 27-38, S 18-45%, with exactly ONE pink house as the outlier.
 * The plaster band at H 27-38 is 10-16 degrees off the red sandstone of the
 * temples, and that separation is "the thing that makes the town legible from
 * the tower" — it is why Rangji's cream gate reads as a different SUBSTANCE
 * from Govind Dev at 400 m rather than just a different shade.
 *
 * One cool colour is deliberately kept per district, muted to S 0.10. Pale
 * green and blue distemper is genuinely common on Indian houses; the
 * measurement says it is a minority, not that it is absent.
 *
 * Re-running the importer preserves this, because these values live here.
 */
export const DISTRICTS = [
  {
    id: 'old-town', name: 'Purana Shahar', kind: 'old-town',
    palette: ['#d1bd97', '#d19d83', '#aabdb9', '#d1af8b', '#d1a2ad', '#ab886a', '#b8a48c', '#c4ae87'],
    minH: 5.5, maxH: 13, density: 0.94,
    poly: [[27.5845, 77.6880], [27.5848, 77.6985], [27.5810, 77.7008], [27.5772, 77.6982], [27.5768, 77.6902], [27.5806, 77.6868]],
  },
  {
    id: 'ghat-front', name: 'Yamuna Ghats', kind: 'ghat-front',
    palette: ['#d1ba94', '#d1a374', '#b2bdaa', '#d1ac90', '#9e8a6d'],
    minH: 6, maxH: 15, density: 0.78,
    poly: [[27.5895, 77.6930], [27.5892, 77.7048], [27.5842, 77.7042], [27.5840, 77.6928]],
  },
  {
    id: 'temple-quarter', name: 'Temple Quarter', kind: 'temple-quarter',
    palette: ['#d1be92', '#d1ae76', '#d1c6a2', '#c8b088', '#d1b6a0'],
    minH: 5, maxH: 12, density: 0.72,
    poly: [[27.5872, 77.6975], [27.5868, 77.7060], [27.5800, 77.7052], [27.5748, 77.6960], [27.5798, 77.6935]],
  },
  {
    id: 'bazaar', name: 'Loi Bazar', kind: 'bazaar',
    palette: ['#d1ae88', '#d19b73', '#d1bb95', '#d1a886', '#d19ea5', '#b5bdaa'],
    minH: 5, maxH: 11, density: 0.96,
    poly: [[27.5832, 77.6900], [27.5834, 77.6960], [27.5798, 77.6962], [27.5796, 77.6898]],
  },
  {
    id: 'raman-reti', name: 'Raman Reti', kind: 'raman-reti',
    palette: ['#d1c3ab', '#d1c2a9', '#d1c4ab', '#d1c5aa', '#d1c2ab', '#b1bdaa'],
    minH: 4.5, maxH: 10, density: 0.5,
    poly: [[27.5790, 77.6700], [27.5790, 77.6860], [27.5660, 77.6870], [27.5650, 77.6690]],
  },
  {
    id: 'residential', name: 'Vrindavan Town', kind: 'residential',
    palette: ['#d1bf9f', '#d1b38d', '#d1c6ab', '#d0bc98', '#d1abb6', '#aabdaf'],
    minH: 4.5, maxH: 10, density: 0.6,
    poly: [[27.5800, 77.6860], [27.5800, 77.6940], [27.5700, 77.6950], [27.5690, 77.6850]],
  },
  {
    id: 'outskirts', name: 'Outskirts', kind: 'outskirts',
    palette: ['#d1c4ab', '#cfc0a2', '#d1c5aa'],
    minH: 3.5, maxH: 7, density: 0.22,
    poly: [[27.5700, 77.6660], [27.5700, 77.6900], [27.5580, 77.6900], [27.5580, 77.6660]],
  },
];
