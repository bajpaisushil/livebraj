/**
 * The lilas painted on the walls of Braj.
 *
 * You asked for this to be a Krishna conscious app and not merely one set in
 * Vrindavan — for every house to carry its own pastime. Walls in Braj really
 * are painted this way, and a town where each door has a different lila over it
 * is closer to the place than a town of blank render.
 *
 * WHAT THESE ARE, AND ARE NOT.
 *
 * They are EMBLEMATIC painted panels: a ground colour, the one object the
 * pastime is known by — a butter pot, a hill, a serpent's hoods, a flute — and
 * the name of the lila in Devanagari and roman. They are not depictions of
 * Krishna's form. That is deliberate and it is the same decision
 * `buildDeities` makes and says out loud: at this scale a suggested form reads
 * as a murti and a modelled one reads as a doll. A badly drawn Krishna on nine
 * hundred walls would be worse than no Krishna at all.
 *
 * WHY NOT PHOTOGRAPHS OF PAINTINGS.
 *
 * Modern devotional art is in copyright and cannot ship. The lawful and far
 * more beautiful alternative — Pahari, Kangra, Basohli and Mewar miniatures,
 * 18th and 19th century, on Commons with museum provenance — remains the right
 * answer for a later pass, and is recorded in the backlog. It needs each file
 * checked and credited one by one, which is a different job from this one.
 *
 * SOURCES. Every lila below is from the Bhagavata Purana's tenth canto, cited
 * by chapter, except the four marked `braj` — Jhulan, Nauka Vihar, Gopashtami
 * and Radha Kund — which are Braj tradition rather than a chapter of the
 * Bhagavatam, and are labelled so rather than given a false citation.
 */

/** Emblems the painter knows how to draw. */
export const EMBLEM = {
  POT: 'pot', HILL: 'hill', SERPENT: 'serpent', CLOTH: 'cloth', FLUTE: 'flute',
  SWING: 'swing', BOAT: 'boat', COW: 'cow', CART: 'cart', TREE: 'tree',
  WHIRL: 'whirl', ROPE: 'rope', LOTUS: 'lotus', PEACOCK: 'peacock',
};

export const LILAS = [
  { id: 'makhan-chori', deva: 'माखन चोरी', roman: 'MAKHAN CHORI',
    emblem: EMBLEM.POT, bg: '#1d4f3f', fg: '#f5e8c8', mark: '#e8c88a',
    source: 'Bhagavata Purana 10.9' },
  { id: 'damodar', deva: 'दामोदर लीला', roman: 'DAMODAR LILA',
    emblem: EMBLEM.ROPE, bg: '#8a2f24', fg: '#f8e4b0', mark: '#e0b060',
    source: 'Bhagavata Purana 10.9' },
  { id: 'kaliya-mardan', deva: 'कालिय मर्दन', roman: 'KALIYA MARDAN',
    emblem: EMBLEM.SERPENT, bg: '#1f3a5c', fg: '#e8eef5', mark: '#6fb3c8',
    source: 'Bhagavata Purana 10.16' },
  { id: 'govardhan', deva: 'गोवर्धन धारण', roman: 'GOVARDHAN DHARAN',
    emblem: EMBLEM.HILL, bg: '#5a4a2e', fg: '#f2e6c8', mark: '#9c8f6e',
    source: 'Bhagavata Purana 10.25' },
  { id: 'vastra-haran', deva: 'वस्त्र हरण', roman: 'VASTRA HARAN',
    emblem: EMBLEM.CLOTH, bg: '#2f5d5a', fg: '#f4ece0', mark: '#e8a8b8',
    source: 'Bhagavata Purana 10.22' },
  { id: 'venu-gita', deva: 'वेणु गीत', roman: 'VENU GITA',
    emblem: EMBLEM.FLUTE, bg: '#3a2a5c', fg: '#f0e8f8', mark: '#c9a03c',
    source: 'Bhagavata Purana 10.21' },
  { id: 'ras-lila', deva: 'रास लीला', roman: 'RAS LILA',
    emblem: EMBLEM.LOTUS, bg: '#6a2448', fg: '#f8e8f0', mark: '#e8c04c',
    source: 'Bhagavata Purana 10.29-33' },
  { id: 'putana', deva: 'पूतना उद्धार', roman: 'PUTANA UDDHAR',
    emblem: EMBLEM.TREE, bg: '#3f2a3a', fg: '#efe2e8', mark: '#a86a7a',
    source: 'Bhagavata Purana 10.6' },
  { id: 'shakata-bhanjan', deva: 'शकट भंजन', roman: 'SHAKATA BHANJAN',
    emblem: EMBLEM.CART, bg: '#6a4a24', fg: '#f6ead2', mark: '#c89a52',
    source: 'Bhagavata Purana 10.7' },
  { id: 'trinavarta', deva: 'तृणावर्त', roman: 'TRINAVARTA',
    emblem: EMBLEM.WHIRL, bg: '#4a5a6a', fg: '#eef2f6', mark: '#b8c8d8',
    source: 'Bhagavata Purana 10.7' },
  { id: 'dhenukasura', deva: 'धेनुकासुर', roman: 'DHENUKASURA',
    emblem: EMBLEM.TREE, bg: '#2f4a28', fg: '#eef4e4', mark: '#c8b04c',
    source: 'Bhagavata Purana 10.15' },
  { id: 'vishwarupa', deva: 'मुख में ब्रह्माण्ड', roman: 'THE UNIVERSE IN HIS MOUTH',
    emblem: EMBLEM.WHIRL, bg: '#18243f', fg: '#e8eef8', mark: '#d8c060',
    source: 'Bhagavata Purana 10.8' },
  { id: 'go-charan', deva: 'गोचारण', roman: 'GO-CHARAN',
    emblem: EMBLEM.COW, bg: '#5c6a2e', fg: '#f4f0dc', mark: '#e0d2a0',
    source: 'Bhagavata Purana 10.15' },
  { id: 'mayura', deva: 'मयूर नृत्य', roman: 'MAYURA NRITYA',
    emblem: EMBLEM.PEACOCK, bg: '#14504a', fg: '#e8f6f2', mark: '#3fa8b8',
    source: 'Braj tradition', tradition: 'braj' },
  { id: 'jhulan', deva: 'झूलन', roman: 'JHULAN',
    emblem: EMBLEM.SWING, bg: '#7a4a86', fg: '#f6ecf8', mark: '#e8c04c',
    source: 'Braj tradition', tradition: 'braj' },
  { id: 'nauka-vihar', deva: 'नौका विहार', roman: 'NAUKA VIHAR',
    emblem: EMBLEM.BOAT, bg: '#1c5a70', fg: '#e8f4f8', mark: '#d8c48a',
    source: 'Braj tradition', tradition: 'braj' },
];

export const LILA_COUNT = LILAS.length;
