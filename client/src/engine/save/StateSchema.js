/**
 * The single user document.
 *
 * This shape is deliberately the ONLY thing a backend would ever store. World
 * content is static and local; the server, if one ever exists, holds exactly
 * this object keyed by user id. Nothing here is required to render the world.
 */

export const SAVE_VERSION = 1;

export function defaultState() {
  return {
    version: SAVE_VERSION,
    id: null,                 // assigned locally; becomes the account id on sync
    createdAt: null,
    updatedAt: null,
    firstLaunch: true,

    avatar: { name: '', skin: 2, hair: 0, cloth: 0, clothColor: 3, accessory: 0 },

    // progression — discovery only, never scored
    discovered: [],           // location ids
    flowers: { marigold: 0, lotus: 0, tulsi: 0, jasmine: 0 },
    carrying: null,           // { kind } or null

    // Where you were when you last closed the app. Reopening puts you back on
    // the same spot, facing the same way, carrying the same flower — the world
    // is a place you leave and return to, not a level you restart.
    lastPosition: null,       // { x, y, z, yaw }
    pickedFlowers: [],        // flower ids already taken, so they stay taken
    offered: [],              // { locId, kind }
    pranams: [],              // location ids
    darshans: [],             // location ids
    metresWalked: 0,
    rupees: 500,              // for rickshaw fares; never a barrier, never grindable
    ridesTaken: 0,
    greetings: 0,
    parikrama: { active: false, metres: 0, laps: 0, lastPoint: 0, startedAt: null },
    destination: null,        // location id

    settings: {
      volume: 0.7,
      sfxVolume: 0.85,
      sensitivity: 1.0,
      invertY: false,
      moveSpeed: 1.0,
      cameraDistance: 6.8,   // metres behind the avatar; 2.5 is over the shoulder, 12 is wide
      quality: 'auto',
      haptics: true,
      largeText: false,
      reduceMotion: false,
      tapToMove: false,
      // lean the phone to steer, while you are at the wheel and nowhere else.
      // On by default because the sensor is simply absent on a desktop, where
      // it then costs nothing.
      tiltSteer: true,
      timeOfDay: 'morning',
      liveTime: true,
      showPlaceBar: true,
      showMinimap: true,
      hudPlaceMin: false,
      hudMapMin: false,   // follow Vrindavan's real clock unless the player takes over
    },
  };
}

/** Sets are convenient in memory but not on disk. */
export function hydrate(plain) {
  plain.discovered = new Set(Array.isArray(plain.discovered) ? plain.discovered : []);
  plain.pickedFlowers = new Set(Array.isArray(plain.pickedFlowers) ? plain.pickedFlowers : []);
  return plain;
}

export function serialise(state) {
  const out = {};
  for (const k of Object.keys(state)) {
    const v = state[k];
    if (v instanceof Set) out[k] = Array.from(v);
    else if (Array.isArray(v)) out[k] = v.slice();
    else if (v && typeof v === 'object') out[k] = { ...v };
    else out[k] = v;
  }
  return out;
}

/** Merge a loaded document onto the current defaults, so new fields appear. */
export function migrate(base, saved) {
  if (saved === null || saved === undefined) return base;

  // A default of null carries no shape to merge onto, so take what was saved.
  //
  // This one line is why nothing persisted. `typeof null` is 'object', so a
  // null default fell past the primitive check into the object branch and hit
  // `Object.keys(null)`, which throws. Three fields default to null —
  // lastPosition, carrying and destination — so the first time you actually
  // had a position to restore, the whole document threw on load, SaveSystem
  // caught it as "corrupt document discarded", and you woke up at Chhatikara
  // with everything gone. It looked like saving was broken. Saving was fine;
  // reading it back was not.
  if (base === null || base === undefined) return saved;

  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;
  if (typeof base !== 'object') return typeof saved === typeof base ? saved : base;
  if (typeof saved !== 'object') return base;      // shape changed under us

  const out = { ...base };
  for (const k of Object.keys(base)) if (k in saved) out[k] = migrate(base[k], saved[k]);
  return out;
}
