/**
 * The world's colour language. Everything that paints geometry pulls from here
 * so the town reads as one place rather than a pile of assets.
 *
 * Drawn from Braj's actual materials: Bharatpur and Agra sandstone, lime wash
 * in ochre and indigo, Makrana marble, marigold, the Yamuna's silted green.
 */

export const PALETTE = {
  // stone + structure
  sand:      '#d9c49a',
  stone:     '#cbb289',
  stoneDark: '#a8946f',
  redstone:  '#a8563c',
  redstoneD: '#86402d',
  marble:    '#f2ece0',
  marbleSh:  '#ded6c6',

  // lime-washed walls of the galis
  wallA: '#e8d5b0',
  wallB: '#d9b68c',
  wallC: '#c9d3c0',
  wallD: '#e3c3a8',
  wallE: '#cdbfd6',
  wallF: '#e6ddc4',

  // trim
  roof:   '#8c4a35',
  door:   '#3f2a1e',
  shutter:'#2f5d5a',
  iron:   '#4a4238',
  brass:  '#b8873b',

  // devotional
  saffron:  '#e8891f',
  marigold: '#f5a623',
  sindoor:  '#c8452a',
  tulsiRed: '#9c2f2a',
  white:    '#f6f2e8',

  // nature
  yamuna:    '#3f6d74',
  yamunaDeep:'#2c565e',
  leaf:      '#4f7a3a',
  leafDark:  '#33562a',
  leafPale:  '#7a9a55',
  bark:      '#5a4634',
  barkPale:  '#8d7a5e',
  dust:      '#c9a97c',
  dirt:      '#b39468',
  grass:     '#7f8f52',
  sandBank:  '#ddcba4',

  // roads
  asphalt:   '#6f6a62',
  paving:    '#a99e8c',
  kerb:      '#c4b79f',
};

/** Sky and light, per time of day. Drives LightingRig and the map's paper tone. */
export const TIME_OF_DAY = {
  morning: {
    label: 'Morning', hindi: 'प्रातः',
    sun: { azimuth: 1.92, elevation: 0.34, color: '#ffe6bc', intensity: 2.5 },
    ambient: { sky: '#a8d4f0', ground: '#bfa886', intensity: 1.25 },
    fog: '#dceaf2', fogScale: 0.9,
    skyTop: '#3f95e0', skyMid: '#96cdf0', skyLow: '#e8f0e0',
    exposure: 1.0,
  },
  day: {
    label: 'Day', hindi: 'दिन',
    /*
     * The sun is SOUTH of the zenith. TimeOfDay points it along (sin az, ., cos
     * az) with world z running SOUTH, so azimuth 0 is due south, PI/2 east,
     * PI north. This was 2.9 — bearing 14 degrees, NORTH-north-east, 60 degrees
     * up — and at Vrindavan's 27.6 N the midday sun is always due south: every
     * south face in the world stood in its own shadow at noon, which is how
     * Radha Raman's frontispiece measured half the brightness of its
     * photographs at the right hue. 0.25 is south-south-east, late morning;
     * morning (1.92, east-north-east) and evening (4.6, west) already ran the
     * right way round.
     */
    sun: { azimuth: 0.25, elevation: 1.05, color: '#fffaf0', intensity: 2.9 },
    ambient: { sky: '#bfe0f8', ground: '#c9b391', intensity: 1.35 },
    fog: '#dceef8', fogScale: 0.7,
    skyTop: '#2f8ae0', skyMid: '#8ec8f2', skyLow: '#e0f0ea',
    exposure: 1.0,
  },
  evening: {
    label: 'Evening', hindi: 'संध्या',
    sun: { azimuth: 4.6, elevation: 0.22, color: '#ffa860', intensity: 2.2 },
    ambient: { sky: '#b898c0', ground: '#bb9066', intensity: 1.0 },
    fog: '#f0c088', fogScale: 1.05,
    skyTop: '#2f5aa0', skyMid: '#e08858', skyLow: '#ffc878',
    exposure: 1.0,
  },
  night: {
    label: 'Night', hindi: 'रात्रि',
    sun: { azimuth: 5.6, elevation: 0.22, color: '#8ea8d8', intensity: 0.42 },
    ambient: { sky: '#33456a', ground: '#403628', intensity: 0.55 },
    fog: '#2a3448', fogScale: 1.4,
    skyTop: '#16203a', skyMid: '#26324e', skyLow: '#42455a',
    exposure: 1.25,
  },
};

/** Avatar option sets — read by AvatarAppearance and the avatar screen. */
export const AVATAR_OPTIONS = {
  skin: ['#f0cfae', '#e0b28b', '#c99464', '#a9743f', '#8a5a2f', '#6b431f'],
  hair: [
    { id: 'short', label: 'Short' },
    { id: 'tied', label: 'Tied back' },
    { id: 'long', label: 'Long' },
    { id: 'shaven', label: 'Shaven with sikha' },
  ],
  cloth: [
    { id: 'kurta-dhoti', label: 'Kurta & dhoti' },
    { id: 'kurta-pyjama', label: 'Kurta & pyjama' },
    { id: 'sari', label: 'Sari' },
    { id: 'salwar', label: 'Salwar kameez' },
    { id: 'shirt', label: 'Shirt & trousers' },
  ],
  clothColor: ['#f6f2e8', '#e8891f', '#c8452a', '#2f5d5a', '#e6dcc6', '#7a4a86', '#3f6d74', '#c9a03c'],
  accessory: [
    { id: 'none', label: 'None' },
    { id: 'tilak', label: 'Tilak' },
    { id: 'mala', label: 'Japa mala' },
    { id: 'bag', label: 'Jhola bag' },
    { id: 'shawl', label: 'Chadar' },
  ],
};
