/**
 * Photographs of the Deities, shown on the altars.
 *
 * THE POINT OF THIS FILE
 *
 * The Deities are not scenery and a box with a face painted on it is not
 * darshan. Where there is a real photograph of the real Deity, it belongs on
 * the altar. This is the manifest that puts it there.
 *
 * WHAT MAY GO IN
 *
 * Only images you have the right to distribute. That means one of:
 *
 *   - a photograph you took;
 *   - one released under a licence that permits redistribution (Creative
 *     Commons, public domain) — Wikimedia Commons has many, though be careful:
 *     most freely-licensed ISKCON Deity photographs are of OTHER temples'
 *     Deities, and the wrong Deity is worse than none;
 *   - one the temple has given you permission to use. Temples are often glad
 *     to, for something made in a devotional spirit. Ask.
 *
 * Darshan photographs on temple websites are copyrighted by whoever took them.
 * They are not ours to ship, however freely they are shared. Every entry here
 * records where its image came from and under what terms, so that question can
 * always be answered.
 *
 * HOW TO ADD ONE
 *
 * Put the file in client/assets/deities/, add an entry below, reload. A
 * landmark with no entry, or whose file is missing, falls back to the carved
 * geometry that is already there — nothing breaks, it just is not a photograph.
 *
 * DAILY DARSHAN
 *
 * `daily` is a URL that is re-read once a day if the device is online. It is
 * OFF unless you fill it in, and the world never waits for it: the packaged
 * image shows immediately and is replaced only if the fetch succeeds. The brief
 * is offline-first and this does not bend it. Only set it to somewhere you are
 * permitted to read from.
 */

export const DEITIES = {
  'iskcon-krishna-balaram': {
    altars: [
      {
        name: 'Sri Sri Gaura-Nitai', hindi: 'श्री श्री गौर-नित्यानन्द', side: -1,
        // A photograph of this altar exists on Commons and is NOT usable: it is
        // tagged CC0 by an uploader who credits it to "a photograph on a public
        // Facebook page", with an ISKCON Vrindavan watermark still on it. You
        // cannot dedicate someone else's work to the public domain. Left empty
        // rather than shipped.
        file: null, source: null, licence: null,
      },
      {
        name: 'Sri Sri Krishna-Balaram', hindi: 'श्री श्री कृष्ण-बलराम', side: 0,
        // No freely-licensed photograph of the central altar found yet.
        file: null, source: null, licence: null,
      },
      {
        name: 'Sri Sri Radha-Shyamasundara', hindi: 'श्री श्री राधा-श्यामसुन्दर', side: 1,
        file: 'radha-shyamsundar.jpg',
        source: 'https://commons.wikimedia.org/wiki/File:Radha_Syamasundar_Vrindavan_Radhastami_2004.jpg',
        licence: 'CC BY-SA 3.0 — Sahadeva',
        // The file's own description places it: "taken on Radhastami at the
        // Krishna Balaram mandir in Vrindavan", categorised ISKCON Temple,
        // Vrindavan. This is the right altar of this temple and not another.
      },
    ],
    daily: null,
  },

  'radha-damodar': {
    altars: [{
      name: 'Sri Sri Radha Damodar', hindi: 'श्री श्री राधा दामोदर', side: 0,
      file: 'radha-damodar.jpg',
      source: 'https://commons.wikimedia.org/wiki/File:Deities_of_Radha_Damodar.jpg',
      licence: 'CC BY-SA 3.0 — Aliva Sahoo',
    }],
    daily: null,
  },

  'shahji': {
    altars: [{
      name: 'Chhote Radha Raman', hindi: 'छोटे राधा रमण', side: 0,
      file: 'shahji.jpg',
      source: 'https://commons.wikimedia.org/wiki/File:Chhote_Radha_Raman_Deities_Shahji_Temple_Vrindavan.jpg',
      licence: 'CC BY-SA 3.0 — Aliva Sahoo',
    }],
    daily: null,
  },

  'banke-bihari': {
    altars: [{
      name: 'Sri Banke Bihari Ji', hindi: 'श्री बाँके बिहारी जी', side: 0,
      // A Commons photograph filed under "Banke bihari" shows a Radha-Krishna
      // PAIR under a wooden canopy, with a board reading "आरती श्री कुंजबिहारी
      // जी की" — Kunj Bihari. Banke Bihari's Deity is a single black form. That
      // is a different temple, and putting it here would be exactly the
      // conflation this project must not make.
      file: null, source: null, licence: null,
    }],
    curtained: true,
    daily: null,
  },

  'radha-raman': {
    altars: [{
      name: 'Sri Radha Raman', hindi: 'श्री राधा रमण', side: 0,
      file: null, source: null, licence: null,
    }],
    daily: null,
  },
};

/** Altars for a landmark, or null. Missing files are dropped, not faked. */
export function altarsFor(locId) {
  const e = DEITIES[locId];
  if (!e || !e.altars || !e.altars.length) return null;
  return e;
}

/** Everything credited, for the attribution screen. Licences are not optional. */
export function credits() {
  const out = [];
  for (const [id, e] of Object.entries(DEITIES)) {
    for (const a of e.altars || []) {
      if (a.file && a.source) out.push({ id, name: a.name, source: a.source, licence: a.licence || 'unknown' });
    }
  }
  return out;
}
