/**
 * Places that OpenStreetMap does not carry, or carries only as a dot.
 *
 * `locations.generated.js` comes out of the OSM importer and must not be
 * hand-edited — the next import would silently throw the edits away. But OSM
 * is thin on exactly the places a pilgrim comes for: it has no footprint for
 * Ashta Sakhi at all, it knows Seva Kunj as an unnamed green polygon, and it
 * gives Imli Tala a single node. So curated places live here, in the same
 * shape, and `content/index.js` merges them.
 *
 * EVERY ENTRY IS RESEARCHED AND INDEPENDENTLY VERIFIED. The notes are in
 * docs/research/<id>.md — two agents each, one researching and one checking
 * the first against separate sources, because the Goswami temples in
 * particular are routinely confused with one another and three other temples
 * called "Radha Gokulananda" dominate an image search.
 *
 * `geo` is the real latitude and longitude; `pos` is derived from it by the
 * same projection the importer uses, so a curated place and an imported one
 * land in the same world. Where OSM has a way id, it is quoted — those
 * footprints are measured, not estimated, and are marked as such.
 *
 * NOT HERE, DELIBERATELY: **Ter Kadamba**. Rupa Goswami's bhajan-sthali is
 * 33.4 km ESE of Banke Bihari, 1.7 km from Nandgaon village — about 50 km by
 * road. It is not in Vrindavan and it is a long way outside this world's
 * 9.2 x 4.8 km rectangle. The research for it is kept in docs/research for the
 * Braj expansion, where Nandgaon belongs.
 */

const R_LAT = 110946.0;          // metres per degree of latitude at this latitude
const R_LON = 98362.0;           // ...and of longitude
const O_LAT = 27.57998, O_LON = 77.6905;

/** Same projection the OSM importer uses: +X east, +Z south. */
function project(lat, lon) {
  return [
    +((lon - O_LON) * R_LON).toFixed(2),
    +((O_LAT - lat) * R_LAT).toFixed(2),
  ];
}

const DEG = Math.PI / 180;

/**
 * Each place, in the order a pilgrim is most likely to meet it.
 *
 * `build.kind` names the builder in LandmarkGenerator. Where a place needs a
 * shape nothing else has, it gets its own kind rather than being forced into
 * an existing one — that is how Chandrodaya came to be modelled as a finished
 * tower for months.
 */
const PLACES = [
  {
    id: 'radha-gokulananda',
    name: 'Shri Radha Gokulananda Mandir',
    hindi: 'श्री राधा गोकुलानन्द मन्दिर',
    type: 'temple',
    district: 'temple-quarter',
    geo: [27.58390, 77.69470],
    rot: 90 * DEG,
    radius: 22,
    icon: 'temple',
    deity: 'Shri Shri Radha Gokulananda, Radha Vinoda and Radha Vijaya Govinda',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    /*
     * THE SEVENTH GOSWAMI TEMPLE, and the one that was missing. The other six
     * were built and this was not, which leaves a hole in a canonical set.
     *
     * Flat-roofed and single-storey THROUGHOUT — no shikhara, no dome, no
     * tower of any kind. What makes it is the samadhi yard beside the deity
     * hall: the graves of Lokanatha Goswami, Narottama Dasa Thakura and
     * Vishvanatha Chakravarti, as five or six architecturally DIFFERENT little
     * shrines standing free in one enclosure. Most people come for those, not
     * for the altar. See docs/research/radha-gokulananda.md.
     */
    build: {
      kind: 'temple-samadhi-yard', w: 27, d: 33, h: 6.2,
      color: '#e8e0cf', accent: '#c98a6a', tombs: 6, measured: true,
    },
    osm: 'way 335852213',
  },

  {
    id: 'jaipur-mandir',
    name: 'Shri Radha Madhav Mandir (Jaipur Temple)',
    hindi: 'श्री राधा माधव मंदिर',
    type: 'temple',
    district: 'outskirts',
    geo: [27.56720, 77.68190],
    /*
     * 2 degrees, not 15. The survey measured OSM way 679447890's long axis at
     * a bearing of 92 degrees — essentially east-west — and the two nested
     * enclosures around it run the same way. 15 was never sourced.
     * (Bearing 92 means 2 degrees south of east; in this world +X is east and
     * +Z south, and the builder's long axis runs along (cos rot, sin rot).)
     * Which side the gate faces is a separate, still-UNRESOLVED question the
     * survey flags explicitly; only the axis is measured.
     */
    rot: 2 * DEG,
    grounds: 120,
    radius: 60,
    icon: 'temple',
    deity: 'Shri Shri Radha Madhav',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    /*
     * Built by Sawai Madho Singh II of Jaipur. A FORTRESS, not a temple
     * silhouette: a long low two-storey range along the road, deep bracketed
     * chhajja, a blind arcade of cusped niches, and the whole thing flat-
     * roofed — except for ONE open five-arched pavilion standing on the centre
     * of the shrine roof. That kiosk is the entire vertical event.
     *
     * NO shikhara, no urushringas, no amalaka-kalasha. And not Agra red nor
     * Jaipur "pink city" pink — dusty pale pink sandstone with cream plaster.
     */
    build: {
      kind: 'temple-fort-palace', w: 86, d: 52, h: 11.5,
      /*
       * TWO FAMILIES, measured off the Braj Ras photographs at 2048x1152 —
       * "within one frame the foreground gateway masonry is warm and the
       * shrine block behind it is essentially NEUTRAL GREY: 2% saturation on
       * the shrine, 31% on the gateway range."
       *   outward ranges, gateways, cloisters  warm dusty salmon-tan
       *   shrine block, crowning kiosk         pale cream / ivory
       * That shift as you pass through the gate "is as recognisable as the
       * kiosk, and nobody describes it".
       */
      color: '#b5937d', accent: '#efebd1', kiosk: 5, measured: true,
    },
    osm: 'way 679447890',
  },

  {
    id: 'pagal-baba',
    name: 'Pagal Baba Mandir (Leeladham)',
    hindi: 'पागल बाबा मंदिर',
    type: 'temple',
    district: 'outskirts',
    geo: [27.56470, 77.67880],
    rot: 0,
    grounds: 90,
    radius: 48,
    icon: 'temple',
    deity: 'Shri Shri Radha Krishna',
    interactions: ['darshan', 'pranam', 'story'],
    /*
     * A WHITE MARBLE ZIGGURAT and one of the tallest things in the town.
     * Eight or so storeys, each stepping back from the one below, each leaving
     * an open walk-round gallery with a deep eave slab, and two stair towers
     * rising through the mass.
     *
     * Every guidebook calls it "Nagara style". It is not: there is no
     * curvilinear rekha-shikhara and no garbhagriha under a spire. Footprint
     * is measured off OSM, 53.1 x 34.9 m, not estimated.
     */
    build: {
      kind: 'temple-stepped-marble', w: 53.1, d: 34.9, h: 48,
      color: '#f4f1ea', accent: '#ded6c4', stages: 8, measured: true,
    },
    osm: 'way 672984768',
  },

  {
    id: 'ashta-sakhi',
    name: 'Shri Radha Ras Bihari Ashta Sakhi Mandir',
    hindi: 'श्री राधा रास बिहारी अष्ट सखी मंदिर',
    type: 'temple',
    district: 'temple-quarter',
    /*
     * APPROXIMATE, AND SAID SO.
     *
     * This is the one place of the ten whose coordinates the research could
     * not settle: the verifying agent rejected the first account's position
     * outright — "DO NOT PLACE IT WHERE THE OTHER ACCOUNT PLACES IT, its whole
     * coordinate frame is wrong" — and no OSM footprint exists for it. What
     * both accounts agree on is that it is a couple of minutes' walk from
     * Banke Bihari, on a lane.
     *
     * So it is placed on a lane 190 m from Banke Bihari, which is that walk.
     * Chosen by sweeping for somewhere that is beside a lane rather than on
     * it, has clear ground for a 17 x 21 m building, and can actually be
     * ROUTED to — the true-looking coordinates put it beside a lane that is
     * in the map but not connected to the network, so `nav-smoke` reported it
     * unreachable and it would have been a temple nobody could walk to.
     *
     * AND THEN OSM TURNED OUT TO HAVE IT (2026-09-30). The research's search
     * matched names in Latin and Devanagari; the old town's pilgrimage mapper
     * writes in Russian, and node 7172072781 is "храм Ашта-сакхи", at
     * 27.580257 / 77.688857 — 163 m from Banke Bihari, which is the two
     * minutes' walk, on a narrow lane running SSE, in dense fabric where a
     * plot-filling building stands on the lane's SW side. The same mapper's
     * Radha Vallabh node sits exactly on that temple's roof in the imagery.
     * The swept spot it had been moved to was inside the Radhavallabh Ghera,
     * 27 m from that temple's own centre. So: the building's centre 10.5 m
     * back from the node, its street door (+lz in this builder's mirror
     * frame, world (sin rot, cos rot)) facing ENE onto the lane — 123 deg.
     */
    geo: [27.5802056, 77.6887679],
    rot: 123 * DEG,
    radius: 16,
    icon: 'temple',
    deity: 'Shri Shri Radha Ras Bihari with the eight sakhis',
    interactions: ['darshan', 'offer', 'pranam', 'story'],
    /*
     * Two minutes' walk from Banke Bihari and on everybody's route. A plot-
     * filling carved pink-sandstone building in a lane, and the altar is
     * UPSTAIRS — the stairs go up beside the commercial frontage, which is the
     * mistake the research flagged first.
     *
     * The altar is a fan of real peacock feathers in concentric rows with ten
     * figures in a stepped arc: Radha and Krishna in the centre, the eight
     * sakhis around Them.
     */
    build: {
      kind: 'temple-upstairs-sakhi', w: 17, d: 21, h: 13,
      color: '#d6a08c', accent: '#f0e6d4', sakhis: 8, measured: true,
    },
  },

  {
    id: 'imli-tal',
    name: 'Imli Tala',
    hindi: 'इमली ताला',
    type: 'temple',
    district: 'ghat-front',
    geo: [27.58880, 77.70120],
    rot: 270 * DEG,
    radius: 20,
    icon: 'temple',
    deity: 'Shri Chaitanya Mahaprabhu',
    interactions: ['darshan', 'pranam', 'story'],
    /*
     * The tamarind on the old Yamuna bank where Mahaprabhu sat. The building
     * is single-storey and FLAT-ROOFED with a plain parapet — no shikhara over
     * it, whatever a modeller's instinct says.
     *
     * What makes it is the tree: an enormous LEANING DEAD TRUNK in a bare
     * sheet-metal jacket, rising diagonally out of a white-tiled pedestal.
     * Not a living tree, not upright.
     */
    build: {
      kind: 'temple-imli', w: 22, d: 26, h: 5.6,
      color: '#efe7d6', accent: '#b8895f', measured: true,
    },
  },

  {
    id: 'vamsi-vat',
    name: 'Vamsi Vat',
    hindi: 'वंशी वट',
    type: 'temple',
    district: 'ghat-front',
    geo: [27.58650, 77.70260],
    rot: 90 * DEG,
    radius: 26,
    icon: 'temple',
    deity: 'Shri Shri Radha Krishna',
    interactions: ['darshan', 'pranam', 'story'],
    /*
     * Where Krishna is said to have played the flute to call the gopis. A
     * heavy fused-root banyan on a low painted plinth in the middle of a small
     * enclosed court whose floor is entirely BLACK-AND-WHITE CHEQUERBOARD
     * MARBLE.
     *
     * NOT A GHAT. Every source calls it "on the bank of the Yamuna" and the
     * river has moved: it does not stand on water today, and building it with
     * steps down to the Yamuna would be building the text rather than the
     * place. ~2,790 m², from the mahants.
     */
    build: {
      kind: 'temple-banyan-court', w: 46, d: 60, h: 7.2,
      color: '#ece4d2', accent: '#9a7b52', measured: true,
    },
  },

  {
    id: 'meera-bai',
    name: 'Prachin Mirabai Mandir',
    hindi: 'प्राचीन मीराबाई मंदिर',
    type: 'temple',
    district: 'old-town',
    geo: [27.58260, 77.69760],
    rot: 0,
    radius: 14,
    icon: 'temple',
    deity: 'Shri Shri Radha Krishna with Mirabai',
    interactions: ['darshan', 'pranam', 'story'],
    /*
     * A small 19th-century courtyard house-temple in the Govind Bagh lanes
     * behind Nidhivan. What makes it unrepeatable in Braj: MIRABAI STANDS ON
     * THE ALTAR AS A THIRD DEITY — a crowned, brocaded murti of her, the same
     * size as Radha and Krishna, garlanded and dressed beside Them.
     *
     * DO NOT build the Chittorgarh Meera Temple. The research names that as
     * the single most likely error: most images labelled "Meera Bai Mandir"
     * are the one inside Chittorgarh Fort, which is a different building in a
     * different state.
     */
    build: {
      kind: 'temple-house-court', w: 16, d: 19, h: 5.4,
      color: '#e4d9c2', accent: '#b0603a', measured: true,
    },
  },

  /*
   * NOT BUILT — OUTSIDE THIS WORLD: **Shri Akrur Dham**.
   *
   * Left as a note rather than as commented-out code, because the entry
   * carries block comments of its own and an outer comment terminates at the
   * first inner `*\/`.
   *
   * It stands at 27.55180 N, which is 3,127 m south of Banke Bihari, and this
   * world's rectangle ends at 2,700 m south. Measured rather than guessed:
   * `halls.mjs` put its altar at z 3127 against a `maxZ` of 2700, so it was
   * being built on ground that does not exist — no terrain beneath it and
   * nothing to index its colliders against, which is why its wall line read
   * 94.6% open.
   *
   * Same call as Ter Kadamba. The research is complete and kept in
   * docs/research/akrura-ghat.md; both belong to the Braj expansion, which is
   * the direction they lie in — Akrur Dham toward Mathura, Ter Kadamba toward
   * Nandgaon.
   */
];

/** Curated places, with `pos` derived from `geo` the way the importer does it. */
export const CURATED_PLACES = PLACES.map((p) => ({
  grounds: null,
  ...p,
  pos: project(p.geo[0], p.geo[1]),
}));
