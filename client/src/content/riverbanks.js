/**
 * Where the Yamuna's low-water channel runs right up to its mapped bank.
 *
 * The water is OSM's riverbank polygon intersected with the channel around
 * OSM's centreline (TerrainBuilder._riverSigned), and that is right almost
 * everywhere: within 10 m of the February 2024 imagery at Chir, Imli Tala,
 * Yugal and Kaliya Ghats. It is wrong in one place, and the place matters
 * most. Keshi Ghat is on the outside of the bend, where the current cuts
 * against the bank, and the water stands at the foot of its steps along the
 * whole palace front — the photographs show boats tied up to the burjes and
 * the imagery shows them moored on the mapped bank. The centreline there
 * drifts 26-49 m away from that bank from SW to NE, so the channel alone left
 * a beach in front of the ghats that has not been there in living memory.
 *
 * Each entry is a built front, `front` a line of world points along it
 * measured on the imagery (measurement only, never traced), south-west to
 * north-east with the river on its left. The water is taken to `edge` metres
 * out from that line, the whole length of it and `reach` metres either side;
 * `bank` is how quickly the ground rises out of the water — at a ghat the
 * steps ARE the bank, so it is a few metres, not the natural slope.
 */
export const WET_BANKS = [
  {
    id: 'keshi-ghat',
    /*
     * The palace front from Kishori Rani Kunj to the Yamunaji shrine
     * (world/KeshiGhat.js), and the water from the top of its steps, 5 m out
     * past the promenade. The boat landing beyond the north-east end keeps
     * its sand.
     */
    front: [[781.25, -778.55], [802, -792.5], [859, -830.8], [891, -844]],
    edge: 5, reach: 40, bank: 3,
  },
];
