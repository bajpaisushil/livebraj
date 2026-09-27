/**
 * Locally-contributed corrections layered over the OpenStreetMap extract.
 *
 * OSM's coverage here is geometrically sound and semantically thin. The survey
 * recorded where the roads are but rarely what people call them: of 2,711 ways
 * in the extract, 38 carry a name and 6 carry a route number. This file is
 * where the second half comes from - names supplied by people who know the
 * town.
 *
 * Rules for anything added here:
 *
 *   1. Geometry always stays OSM's. Nothing here moves a road, only labels one.
 *      `ways` are OSM way ids; `at` is a point already on the OSM network.
 *   2. Every entry names its source and date. A name somebody tells us is a
 *      fact they are free to tell us. A name traced out of a proprietary map is
 *      not, and does not belong here.
 *   3. `confirmed: false` means we have the name but not yet the right way ids.
 *      The importer refuses to apply those, and prints them so they stay
 *      visible instead of rotting. A wrong name on the map is worse than none.
 *   4. When OSM gains a name upstream, delete the entry rather than let the two
 *      drift apart.
 *
 * Map data (c) OpenStreetMap contributors, ODbL 1.0. Annotations are original.
 */

/** Names for ways OSM left unnamed. */
export const WAY_NAMES = [
  {
    name: 'Jagadguru Kripalu Marg',
    hindi: 'जगद्गुरु कृपालु मार्ग',
    source: 'local knowledge, 2026-09-22',
    confirmed: false,
    ways: [],
    note:
      'Reported as the road ISKCON stands on. OSM names that stretch ' +
      'Bhaktivedanta Swami Marg, which is also ISKCON\'s postal address, so ' +
      'the two may be different stretches or a local vs official name. ' +
      'Prem Mandir sits 127 m off Bhaktivedanta Swami Marg with only unnamed ' +
      'residential ways closer (973513776, 973513777) - one of those is the ' +
      'likelier match. Needs someone to say which before it goes on the map.',
  },
];

/**
 * Route numbers. OSM tags the national number on this stretch and nothing else,
 * so signage and route shields have only half the story without this.
 */
export const WAY_REFS = [
  {
    matchRef: 'NH44',
    addRefs: ['AH1'],
    label: 'NH 44 / AH 1',
    hindi: 'राष्ट्रीय राजमार्ग ४४ / एशियाई राजमार्ग १',
    source: 'local knowledge, 2026-09-22',
    confirmed: true,
    note:
      'The Delhi-Agra trunk road. Asian Highway 1 runs concurrent with NH 44 ' +
      'along this stretch; OSM carries the national number only. This is the ' +
      'road pilgrims arrive on before turning east at Chhatikara.',
  },
];

/**
 * Junctions worth naming in their own right - the chaurahas people navigate by.
 * `at` is a point on the OSM network, never an invented position.
 */
export const JUNCTIONS = [
  {
    id: 'chhatikara-crossing',
    name: 'Chhatikara Crossing',
    hindi: 'छटीकरा चौराहा',
    at: [27.56163, 77.62596],
    confirmed: true,
    source: 'local knowledge, 2026-09-22; geometry from OSM',
    arms: [
      { toward: 'Delhi',      via: 'NH 44 / AH 1',            way: 973946076 },
      { toward: 'Mathura',    via: 'NH 44 / AH 1',            way: 973946074 },
      { toward: 'Govardhan',  via: 'Chhatikara-Govardan Road', way: 671541221 },
      { toward: 'Vrindavan',  via: 'Bhaktivedanta Swami Marg', way: 970968491 },
    ],
    note:
      'A true four-arm chauraha, and the gateway to Vrindavan for most ' +
      'arrivals. Bhaktivedanta Swami Marg leaves it eastward and runs 4.74 km ' +
      'to ISKCON - 1.01x the straight-line distance, which is to say dead ' +
      'straight. The player spawns here.',
  },
];

/** Way-id -> entry, for the confirmed names only. */
export function nameIndex() {
  const byId = new Map();
  for (const e of WAY_NAMES) {
    if (!e.confirmed) continue;
    for (const id of e.ways || []) byId.set(id, e);
  }
  return byId;
}

/** Names we have but cannot yet place. Printed by the importer each run. */
export function unconfirmed() {
  return [...WAY_NAMES, ...WAY_REFS, ...JUNCTIONS].filter((e) => e.confirmed === false);
}

/**
 * English names for places OSM carries only in Russian.
 *
 * A large share of Vrindavan's OSM detail was surveyed by Russian-speaking
 * devotees, and it is good work — but twenty-three temples and ghats here have
 * a Cyrillic `name` and no `name:en` at all, so the map showed "Храм Калия
 * Мардана" to someone reading English or Hindi. These are not translations in
 * any interpretive sense; they are the same Sanskrit names written in the
 * script the reader can read, which is why they can be stated rather than
 * researched. Where the Russian is itself a transliteration of a name we
 * already carry in English, the entry simply reunites them.
 *
 * Anything genuinely uncertain is marked and left alone.
 */
export const RUSSIAN_NAMES = {
  'Ашрам Гаутамы риши': 'Gautama Rishi Ashram',
  'Кришна-Баларам мандир': 'Sri Sri Krishna Balaram Mandir',
  'храм Ашта-сакхи': 'Ashta Sakhi Mandir',
  'Храм Банкебихари': 'Shri Banke Bihari Mandir',
  'Сурья гхат': 'Surya Ghat',
  'Пани-гхат': 'Pani Ghat',
  'Акрура-гхат': 'Akrura Ghat',
  'Вараха-гхат': 'Varaha Ghat',
  'Мохана тер-гхат': 'Mohan Ter Ghat',
  // The board at the ghat reads प्राचीन कालीदह मन्दिर — Ancient KALIDAH Mandir.
  // "Kaliya Mardan" was my transliteration of the Russian and it is not what the
  // place calls itself.
  'Храм Калия Мардана': 'Prachin Kalidah Mandir',
  'Храм Гопишвары Махадевы': 'Shri Gopishwar Mahadev Mandir',
  'Храм Радха Гопала': 'Shri Radha Gopal Mandir',
  'Храм Югалы Кишора': 'Shri Jugal Kishore Mandir',
  'Югала-гхат': 'Shri Yugal Ghat',
  'Шрингара ват': 'Shringar Vat',
  'Чир-гхат': 'Shri Chir Ghat',
  'Храм Лал Бабу': 'Lala Babu Mandir',
  'Бхаджан кутир Санатаны Госвами': 'Bhajan Kutir of Sanatana Goswami',
  'Адвайта ват': 'Advaita Vat',
  /**
   * "Дант" is DANTA — tooth.
   *
   * I rendered this as "the samadhi of Gadadhar Pandit", which is devotionally
   * wrong and would have been read as wrong by anyone who knows. Gadadhar
   * Pandit left his body in Puri; it is not in Vrindavan. His disciple
   * Nayanananda carried his TOOTH here so that his teacher would at last rest
   * in Vraj. It is the Danta Samadhi, and the distinction is the whole meaning
   * of the place.
   */
  'Храм Вамши Гопала и Гададхарв Дант самадхи':
    'Shri Shri Radha Vamshi Gopal Mandir and the Gadadhar Danta Samadhi',

  'Баладжи': 'Balaji Mandir',
  // the tamal tree in the Krishna Balaram courtyard, which is in your photograph
  'Дерево Кришна-Баларама': 'The Krishna-Balaram Tamal Tree',
  'Дом Гуру': 'Guru\'s House',

  // Less certain. "Тарас" and "Батхаран" do not map onto a name I can confirm,
  // and "Джару Мандала" may be Jharu Mandal or a rendering of something else.
  // Transliterated as read, and flagged here rather than guessed at.
  'Тарас мандир': 'Taras Mandir',
  'Храм Батхаран Бихари': 'Bathran Bihari Mandir',
  'Джару Мандала': 'Jharu Mandal',
};

/** Names above that could not be confirmed against a second source. */
export const RUSSIAN_UNSURE = new Set([
  'Тарас мандир', 'Храм Батхаран Бихари', 'Джару Мандала',
]);
