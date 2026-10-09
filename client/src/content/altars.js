/**
 * What is actually on each altar.
 *
 * This replaces a regular expression. `buildDeities` used to decide the form of
 * the Deities by testing the landmark's id against
 * `/radha|banke|govind|gopinath|damodar|madan|jugal|shyam|krishna|bihari|raman|vallabh/`
 * and drawing a gold Radha beside a blue Krishna whenever it matched. That is
 * inventing religious history, which this project may not do, and it was wrong
 * in ways a devotee would see immediately:
 *
 *   - **Jugal Kishore's altar is EMPTY.** The Deity was removed to escape
 *     desecration and is worshipped at Panna, Madhya Pradesh. The regex matched
 *     'jugal' and put a Radha-Krishna pair in a monument that has none.
 *   - **Govind Dev is in Jaipur**, in the City Palace complex. What Growse
 *     documents in the rebuilt Vrindavan sacrarium is Krishna as GIRIDHARI with
 *     Mahaprabhu and Nityananda.
 *   - **Radha Raman, Radha Vallabh and Banke Bihari are single Deities.** At
 *     Radha Raman and Radha Vallabh a CROWN stands for Radha; there is no
 *     second murti. The regex drew two figures at all three.
 *   - **Radha Damodar, Madan Mohan and Radha Gopinath are not pairs either** —
 *     each carries a third figure, and Radha Gopinath carries five, including
 *     Ananga Manjari, who is on no other altar in Vrindavan.
 *   - **Katyayani is seated on a lotus and multi-armed**, not a standing figure.
 *
 * Everything here comes from `docs/research/temple-architecture.json`, which
 * carries its sources. Where the research says a thing is not documented, this
 * file says so and the builder falls back to a plainly dressed figure rather
 * than inventing a colour. `undocumented: true` is not a gap to be filled in
 * later by guessing — it is the record that nobody writing this down knew.
 *
 * Sides are given in the DEITY's frame, as the sources give them: `x: -1` is
 * the Deity's own left, which is the viewer's right.
 */

/** Stand-in colours, used only where the sources record none. */
const CLOTH = 0xd8a24a;
const SKIN = 0xd8a878;
/** Black stone, where a source actually says black stone. */
const BLACK_STONE = 0x1e1c22;
const BLACK_CLOTH = 0x2a2731;
/** Ashta-dhatu: the eight-metal alloy, a warm dark bronze-gold. */
const ASHTA_DHATU = 0xa8823c;

export const ALTARS = {
  /* ---------------- the Sapta Devalaya and the old town ---------------- */

  'radha-raman': {
    form: 'figures',
    // svayambhu, emerged from a shalagrama-shila: black stone with a glossy
    // shalagram surface, "not more than twelve inches in height", standing
    // tribhanga. There is no second murti — Radha is a crown.
    figures: [{ x: 0, h: 1.15, cloth: BLACK_CLOTH, skin: BLACK_STONE, crown: true }],
    // "A representation/emblem of Shri Radha (commonly described as her crown)
    // is placed reverentially on Radharaman's LEFT." Negative is His own left.
    // I had this at +0.5, which is His right, until I checked the source.
    crownBeside: -0.5,
    note: 'One self-manifested Deity, standing tribhanga, playing the flute. There is NO Radha murti here: an emblem of Shri Radha, her crown, is placed on His left.',
  },

  'radha-damodar': {
    form: 'figures',
    // eight inches, carved by Rupa Goswami from black Vindhya stone. Radharani
    // on Damodar's LEFT, Lalita Sakhi on his RIGHT.
    figures: [
      { x: -0.52, h: 1.28, cloth: 0xc4415c, skin: BLACK_STONE, crown: true },   // Radha
      { x: 0, h: 1.4, cloth: BLACK_CLOTH, skin: BLACK_STONE, crown: true },     // Damodar
      { x: 0.52, h: 1.24, cloth: 0x3f7a55, skin: SKIN, crown: false },          // Lalita
    ],
    note: 'Black stone, not marble. Radharani on His left, Lalita Sakhi on His right.',
  },

  'radha-shyamsundar': {
    form: 'figures',
    // Shyamsundar from a nila-shila block — a dark, near-black polished stone,
    // and the LARGE central figure. His Radharani is cast ashta-dhatu.
    // THREE sets stand on this altar, which is the distinctive thing about it
    // and which one pair does not say. The large central Radha-Shyamsundar were
    // made in 1719 precisely BECAUSE the originals were too small to be dressed
    // in a full range of ornament — and those originals, Lala-Lali, are still
    // there, the shortest of the three. Radha Kunjabihari stands on the right.
    figures: [
      { x: -1.15, h: 0.92, cloth: ASHTA_DHATU, skin: BLACK_STONE, crown: true }, // Lala-Lali, the
      { x: -0.78, h: 0.96, cloth: BLACK_CLOTH, skin: BLACK_STONE, crown: true }, //   original small pair
      { x: -0.26, h: 1.3, cloth: ASHTA_DHATU, skin: ASHTA_DHATU, crown: true },  // Radharani, cast metal
      { x: 0.3, h: 1.55, cloth: BLACK_CLOTH, skin: BLACK_STONE, crown: true },   // Shyamsundar, nila-shila
      { x: 0.95, h: 1.18, cloth: 0xc4415c, skin: BLACK_STONE, crown: true },     // Radha Kunjabihari
      { x: 1.32, h: 1.22, cloth: BLACK_CLOTH, skin: BLACK_STONE, crown: true },
    ],
    note: 'Three sets. Shyamsundar is the large central figure in near-black nila-shila from Nilgiri and His Radharani is cast in eight-metal alloy (1719). The original small pair, Lala-Lali, are still on the altar and are the shortest of the three. Radha Kunjabihari stands on the right.',
  },

  'radha-gopinath': {
    form: 'figures',
    // the only Vrindavan altar carrying Ananga Manjari. Gopinath centre,
    // Ananga-Manjari on his LEFT, Radharani on his RIGHT, Lalita and Vishakha
    // flanking. Material and colour are NOT documented.
    figures: [
      { x: -1.05, h: 1.18, cloth: 0x9a5aa8, skin: SKIN, crown: false },         // Lalita
      { x: -0.54, h: 1.26, cloth: 0xd0b45c, skin: SKIN, crown: true },          // Ananga Manjari
      { x: 0, h: 1.46, cloth: CLOTH, skin: SKIN, crown: true },                 // Gopinath
      { x: 0.54, h: 1.3, cloth: 0xc4415c, skin: SKIN, crown: true },            // Radharani
      { x: 1.05, h: 1.18, cloth: 0x3f7a55, skin: SKIN, crown: false },          // Vishakha
    ],
    undocumented: true,
    note: 'Pratibhu murtis, installed 1748. Ananga Manjari stands on no other altar in Vrindavan. Material and colour are not documented — the colours here are stand-ins.',
  },

  'madan-mohan': {
    form: 'figures',
    // the original is at Karauli; a replica was established here in 1748. The
    // altar group is THREE: Madan Mohan centre, Radha one side, Lalita the other.
    figures: [
      { x: -0.52, h: 1.3, cloth: 0xc4415c, skin: SKIN, crown: true },
      { x: 0, h: 1.46, cloth: CLOTH, skin: SKIN, crown: true },
      { x: 0.52, h: 1.22, cloth: 0x3f7a55, skin: SKIN, crown: false },
    ],
    undocumented: true,
    note: 'A 1748 replica; the original Madan Mohan is at Karauli. Material, colour and dress are not documented.',
  },

  'radha-vallabh': {
    form: 'figures',
    // yugal jodi — Radha and Krishna united in one form. NO separate Radha
    // image; a crown stands for her.
    figures: [{ x: 0, h: 1.42, cloth: CLOTH, skin: SKIN, crown: true }],
    // The crown is documented; WHICH SIDE it stands on is not, here. Radha
    // Raman is the one temple where a source states it — His left — so this
    // follows that rather than picking a side at random. It is an inference
    // from the neighbouring practice, not a sourced fact, and is marked as one.
    crownBeside: -0.5,
    crownSideUndocumented: true,
    undocumented: true,
    note: 'One Deity, worshipped as the consort of Radha, a yugal jodi with the long braid read as Radha\'s. No separate Radha image — a crown stands for her. Material, colour, height and the crown\'s side are not documented.',
  },

  'garud-govind': {
    // drawn by GarudGovind.js, which builds the figure on Garuda; buildDeities
    // has no form for it and is not called there
    form: 'garuda',
    note: 'Govind — Krishna in His Narayana form — seated on Garuda (brajfoundation.org: "a rare and exquisite idol of Krishna seated on a Garud"); by some accounts twelve-armed, with Lakshmi, Satyabhama and Rukmini (vrindavanmathuraguide.com). The photograph shows Him in yellow and gold before a mirror-worked backdrop; the figure here is four-armed and its size is INFERRED.',
  },

  'govind-dev': {
    form: 'figures',
    // NOT Govind Dev — He is in the City Palace, Jaipur. What Growse documents
    // in the rebuilt sacrarium is Krishna as Giridhari, lifting Govardhan,
    // with Mahaprabhu and Nityananda.
    figures: [
      { x: -0.62, h: 1.3, cloth: 0xd9b36a, skin: SKIN, crown: false },   // Mahaprabhu
      { x: 0, h: 1.5, cloth: CLOTH, skin: SKIN, crown: true, arm: 'raised' },  // Giridhari
      { x: 0.62, h: 1.3, cloth: 0xd9b36a, skin: SKIN, crown: false },    // Nityananda
    ],
    undocumented: true,
    note: 'The original Govind Dev is in Jaipur. What stands in the rebuilt sacrarium is Krishna as Giridhari, lifting Govardhan, with Mahaprabhu and Nityananda. Their colour and material are not documented.',
  },

  'jugal-kishore': {
    // THE ALTAR IS EMPTY. The Deity was removed to escape desecration and is
    // worshipped at Panna, Madhya Pradesh, where Raja Hindupat Singh built a
    // temple for it. Living Yugal Kishor worship in Vrindavan is at a SEPARATE
    // Nimbarka-sampradaya temple near Jugal Ghat — not in this monument.
    //
    // This is the entry the whole file exists for. Drawing a Deity here is not
    // a rendering choice, it is a false claim about a place people visit.
    form: 'empty',
    note: 'The monument is empty. The Deity is worshipped at Panna, Madhya Pradesh.',
  },

  'banke-bihari': {
    form: 'figures',
    // black stone, frequently described as black marble; held swayambhu, not
    // sculptor-made. Tribhanga. Treated and dressed as a small child.
    figures: [{ x: 0, h: 1.2, cloth: 0xf0c64a, skin: BLACK_STONE, crown: true }],
    note: 'One self-manifested black-stone Deity in tribhanga, worshipped and dressed as a child.',
  },

  'gopishwar-mahadev': {
    // a bare linga in the morning; dressed as a gopi in the evening for the
    // Ras Lila. Size and stone are not documented.
    form: 'lingam',
    undocumented: true,
    note: 'A Shiva linga — Shiva as Gopeshwar. Bare in the morning, dressed as a gopi in the evening. Size and stone are not documented.',
  },

  'katyayani': {
    // Sources disagree on the material — ashtadhatu from Bengal, or black
    // stone. Both agree she is MULTI-ARMED and SEATED ON A LOTUS. The research
    // says an eight-metal seated Katyayani is the best-supported reading and
    // to label it contested, which this does.
    form: 'devi-seated',
    arms: 8,
    cloth: 0xb4232e,
    skin: ASHTA_DHATU,
    contested: true,
    note: 'Multi-armed and seated on a lotus — on that the sources agree. They disagree on whether she is eight-metal alloy or black stone; the eight-metal reading is the better supported and is what is shown.',
  },

  'rangaji': {
    form: 'figures',
    // The temple trust's own site and Braj Ras name Sri Goda-Rangamannar: a
    // divine couple, Krishna standing as a bridegroom with a walking stick in
    // the South Indian marriage convention, Andal (Goda Devi) to his right and
    // Garuda to his left. Tourist sites say otherwise; the trust is the primary
    // source and is what this follows.
    figures: [
      { x: -0.6, h: 1.26, cloth: 0x2f6f4f, skin: SKIN, crown: false },   // Garuda
      { x: 0, h: 1.52, cloth: 0xe8d27a, skin: SKIN, crown: true, staff: true },  // Rangamannar
      { x: 0.6, h: 1.3, cloth: 0xc4415c, skin: SKIN, crown: true },      // Andal
    ],
    undocumented: true,
    contested: true,
    note: "Sri Goda-Rangamannar, per the temple trust's own site: Krishna as a bridegroom with a walking stick, Andal to His right and Garuda to His left. Many tourist sites instead describe a RECLINING Ranganatha on the coils of Sesha, as at Srirangam. The two are incompatible; the trust is the primary source and is what this follows, but the research is explicit that the sanctum image should not be modelled without a photographic reference. Treat this as provisional.",
  },

  'shahji': {
    form: 'figures',
    // Radha and Krishna, known as Chhote Radha Raman — "little Radha-Raman" —
    // because the murtis are SMALL. Richly adorned; no documented fixed form,
    // colour or ornament. Do not invent one.
    figures: [
      { x: -0.34, h: 1.0, cloth: 0xe0b64e, skin: SKIN, crown: true },
      { x: 0.34, h: 1.06, cloth: CLOTH, skin: SKIN, crown: true },
    ],
    undocumented: true,
    note: 'Chhote Radha Raman — small murtis, richly adorned. No documented fixed form, colour or ornament.',
  },

  'prem-mandir': {
    form: 'figures',
    // ground floor: Radha Krishna, flanked by the eight Mahasakhis.
    figures: [
      { x: -0.5, h: 1.38, cloth: 0xc4415c, skin: SKIN, crown: true },
      { x: 0.5, h: 1.44, cloth: 0x2f4f8a, skin: 0x4a6a9a, crown: true },
    ],
    note: 'Ground floor: Radha Krishna, flanked by the eight Mahasakhis.',
  },
};

/**
 * The altar for a landmark, or null.
 *
 * Null means "this file has nothing sourced to say", and the builder falls back
 * to its old generic figure. That is different from `form: 'empty'`, which is a
 * positive statement that there is no Deity — the two must not be conflated.
 */
export function altarFor(id) {
  return ALTARS[id] || null;
}
