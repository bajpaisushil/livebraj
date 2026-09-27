/**
 * Every number worth arguing about, in one place.
 *
 * These are the values you change when something feels wrong: too slow, too
 * expensive, too crowded, too far. They were scattered across a dozen modules
 * as top-of-file constants, which is fine for a number nobody touches and
 * wrong for a number you want to try three settings of.
 *
 * What belongs here: anything a person might reasonably want to tune without
 * reading the code around it. What does NOT: constants that encode a fact
 * about the world (the earth's radius), a contract (a texture size limit a
 * device imposes), or a fix (the teleport threshold that separates a step from
 * a placement — that one is load-bearing and changing it reintroduces a bug).
 *
 * In the Unity port this becomes a ScriptableObject and the fields below are
 * its serialised properties, which is the other reason they are gathered.
 */

/** Getting about: fares, pace, and how long a ride may take. */
export const TRAVEL = {
  /** Rupees on the meter before you have gone anywhere. */
  baseFare: 10,
  /** Rupees per kilometre on top. */
  perKm: 12,
  /** What you start with. Never a barrier, never something to grind for. */
  startingRupees: 500,

  /** How close you must be to get into a vehicle, in metres. */
  hailRange: 7.5,
  /** How long climbing in takes, in seconds. */
  boardSeconds: 1.15,

  /**
   * A ride aims for this many seconds, and may never exceed rideMaxSeconds.
   * The world is 1:1, so Chhatikara to ISKCON is 5.6 km of real road: at a
   * cycle rickshaw's true 3.2 m/s that is twenty-nine minutes of sitting.
   */
  rideTargetSeconds: 55,
  rideMaxSeconds: 300,

  /**
   * The ceiling on how fast a ride may look, in m/s. 26 is about 94 km/h —
   * fine on the Chhatikara highway, too quick for a gali. Lower it and rides
   * look righter and take longer; this is the honest trade-off of holding to
   * a five-minute maximum on a full-scale world.
   */
  rideMaxSpeed: 26,

  /** Limits on "jaldi chaliye" and "aaram se", as multipliers. */
  paceMin: 0.55,
  paceMax: 2.2,
  /** What holding RUN does while you are a passenger. */
  urgePace: 1.7,
};

/** How the town behaves around you. */
export const CROWD = {
  /** How far you can get from someone before the conversation ends, in metres. */
  talkRangeOut: 7.5,

  /**
   * Bump remarks. These exist because without them the crowd is scenery, and
   * they were tuned down because with them too loose you get scolded every two
   * seconds for standing still in a busy lane.
   */
  bumpGapSeconds: 9,
  bumpRunMax: 3,
  bumpRunForgetSeconds: 25,
  bumpForgiveMs: 45000,
};

/** How much of the world is built, and how thickly. */
export const WORLD_DETAIL = {
  /**
   * Height-field resolution in metres. Braj is flat alluvium and carries its
   * relief perfectly well at 12; dropping it costs boot time on a phone
   * quadratically, which is what made the app unopenable on a real device.
   */
  terrainCell: 12,
  /** Ground mesh segments across the long axis. */
  groundSegments: 420,

  /** Grass stays dense within this radius of the town centre, in metres. */
  greeneryFullRadius: 1800,
  /** Beyond this it is at its thinnest — the corridor is farmland. */
  greeneryThinRadius: 4200,
  /** How thin, as a fraction. */
  greeneryThinnest: 0.22,
  /** Trees thin past this radius from the origin. */
  treeThinRadius: 2600,
};

/**
 * Planting: the bushes that are put somewhere on purpose rather than scattered.
 *
 * The verge is the strip between the kerb and whatever stands behind it. It is
 * what makes a road look looked-after, and noise will never produce one — the
 * scatter keeps every bush 6.5 m off the centreline, which on a road with a
 * 7 m half-width means the kerb itself is always bare.
 */
export const PLANTING = {
  /** Metres between planting stations along a verge. */
  vergeSpacing: 30,
  /** How far past the kerb the nearest bush sits, in metres. */
  vergeOffset: 1.6,
  /** Bushes per station: a verge reads as a verge only in runs, not as dots. */
  vergeClump: [2, 3],
  /** Metres between the bushes of one run. */
  vergeStep: [1.5, 2.1],
  /**
   * Odds of planting a station in town, and out in the Chhatikara fields.
   * These are the whole cost of the feature: at 0.34 and 0.07 the verges came
   * to 1,100 bushes and put 4% on the world's triangle count, which is more
   * than a hedge is worth. Raise them if you want a greener town and have the
   * budget; they do nothing else.
   */
  vergeChanceTown: 0.22,
  vergeChanceField: 0.045,

  /** Bushes ringed around each landmark's grounds. */
  templeRing: 13,
  /** How far outside the grounds that ring sits, in metres. */
  templeRingMargin: [2.5, 7],
  /** Fraction of the ring left open, so it is planting and not a fence. */
  templeRingGaps: 0.22,
};

/** Saving. */
export const SAVE = {
  /** Seconds between quiet autosaves while you walk. */
  autosaveSeconds: 20,
  /**
   * A single frame's movement larger than this is a placement, not a step.
   * LOAD-BEARING: it is what stops a restored position being counted as
   * distance walked. Do not raise it casually.
   */
  teleportMetres: 12,
};

/** The place readout and other HUD timings. */
export const HUD = {
  /** How long the place bar stays up after you arrive somewhere, in seconds. */
  placeShowSeconds: 4.5,
};
