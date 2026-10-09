/**
 * VehicleDrive — what it takes for a vehicle to move like a vehicle.
 *
 * The ride used to compute a point on the route polyline every frame and
 * assign the rickshaw's position to it. A collision pass then pushed the
 * vehicle out of whatever it had landed in, and the next frame put it straight
 * back on the blocked line, because the position came from the path rather
 * than from where the vehicle actually was. Measured with world.isClear every
 * two metres, an eighth of the ISKCON to Prem Mandir drive ran through solid
 * geometry, and no amount of nudging the route was going to fix that.
 *
 * So the vehicle carries its own position, heading and speed. Each step it is
 * told where it would like to point and how fast it would like to go; it turns
 * toward that heading no faster than the grip allows, accelerates or brakes
 * toward that speed, and moves strictly along its own nose — never sideways,
 * which is what made the old crowd vehicles crab through their turns. Then
 * whatever the world does to it is KEPT. A push-out is not a cosmetic nudge
 * any more: it is where the vehicle is next frame, and the speed it cost is
 * gone.
 *
 * Nothing in here punishes anybody. A vehicle that cannot get through simply
 * stops, looks both ways for the side with more room, tries that, and if it is
 * properly wedged it backs off a little and has another go. There is no damage
 * and no fail state. It is a pilgrimage.
 */

import * as THREE from 'three';
import { clamp, angleDelta, TAU } from '../../engine/math/MathUtils.js';

/**
 * The half-width every vehicle is collided at, in metres.
 *
 * There were three of these and they disagreed: NavGraph cleared routes at
 * 0.8 m, the ride drove at 1.1 m, and the crowd tested vehicles at
 * max(w,l)*0.42 — 1.18 for an e-rickshaw. A route the graph had declared clean
 * was routinely not clean at driving radius, which guaranteed a push-out on
 * every route it approved. One number now, imported by NavGraph so the road it
 * clears is the road that gets driven.
 *
 * 0.8 m is an e-rickshaw: 1.4 m across the body, about 1.6 m over the mirrors.
 * It was briefly 0.95 — the body plus elbow room — and elbow room is the one
 * thing Vrindavan does not sell. At 0.95 the driver could not get down half the
 * old town and spent his time reversing out of gaps he would have taken.
 */
export const VEHICLE_R = 0.8;

/**
 * How a kind of vehicle behaves, in real units.
 *
 *   accel    m/s² pulling away
 *   brake    m/s² slowing down
 *   lat      m/s² the tyres hold in a corner. This one constant does most of
 *            the work: it caps the turn rate at speed, and therefore caps the
 *            speed in a turn, so a vehicle slows into a bend without anyone
 *            scripting it.
 *   turnMax  rad/s at the steering lock, for when it is barely moving
 *   agents   whether it is pushed out of people and cows as well as walls
 */
export const HIRED = { accel: 5.0, brake: 7.5, lat: 4.4, turnMax: 1.5, agents: true };
export const DRIVEN = { accel: 4.6, brake: 8.0, lat: 7.0, turnMax: 1.8, agents: true };

/**
 * Ambient traffic is pushed out of walls but not out of people.
 *
 * Not laziness — cost. collideAgents walks every person within three metres,
 * and there are 280 of them and 55 vehicles; doing it for all of them every
 * sub-step is minutes of phone battery for something the queueing already
 * handles. `_vehicleAhead` makes ordinary traffic stop for a pilgrim or a cow
 * in front of it, which is the behaviour that matters; walls are what it used
 * to drive straight through.
 */
/*
 * `lat` was 3.6, which at a 8 m/s cruise caps the yaw rate at 0.45 rad/s — and
 * NavGraph legs are 8 m, about a second at that speed. A vehicle knocked off
 * the centreline could not steer back onto it before the leg ended, so the
 * error carried leg after leg: measured 2.79 m off the middle at the median,
 * 10.55 m at the ninetieth. That is out on the verge, which is where people
 * walk. 5.5 m/s^2 is still an unremarkable cornering load for a small vehicle
 * in a town, and it buys 0.69 rad/s.
 */
export const AMBIENT = { accel: 3.0, brake: 5.5, lat: 5.5, turnMax: 1.3, agents: false };

/** How long a vehicle takes to settle onto a heading it is asked for. */
const TURN_TIME = 0.5;

/** Below this speed it is the steering lock that limits you, not the grip. */
const CRAWL = 1.2;

/** Seconds of getting nowhere before a driver tries going round, then back. */
const STUCK_TRY = 0.55;
const STUCK_BACK = 2.6;

/**
 * How often, and how far, progress is actually checked.
 *
 * Per-frame contact is not enough on its own. A vehicle jammed in the seam
 * between two colliders gets pushed out of one and back into the other, so it
 * shuffles half a metre back and forth: every single frame reads as movement,
 * and two minutes later it is exactly where it started. So the stuck counter is
 * only ever cleared by having genuinely covered ground over a window — nothing
 * a vehicle does within one window can talk it out of being stuck.
 */
const MARK_S = 1.2;
const MARK_M = 2.2;

/**
 * How a stuck driver looks for a way round.
 *
 * A fan of bearings rather than one to each side, because a wall is not a post:
 * measured on the ISKCON route, a rickshaw pinned in the mouth of a building
 * had 1.5 m of room through 150 degrees of its front and twelve metres behind
 * it, and a pair of probes at 49 degrees found nothing either way. Only runs
 * while something is actually blocking the way, and at most once a second.
 */
const PROBE_M = 9;
const PROBE_FAN = [0.55, -0.55, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3];
const AVOID_MIN_S = 1.0;
const AVOID_MAX_S = 3.2;
const AVOID_SPEED = 2.6;

/**
 * The last resort: a driver wedged for this long threads it at the vehicle's
 * true half-width instead of the comfortable one.
 *
 * The Dham's galis really are this tight and a rickshaw-wallah really does
 * scrape through with his mirror an inch off the brickwork. It is not a pass
 * through anything — the body is still solid, it is just the body and not the
 * body plus elbow room. Only reached after eight seconds of getting nowhere,
 * which on a route laid along real roads is rare, and the alternative is a ride
 * that stops in front of a wall for ever.
 */
const SQUEEZE_AFTER = 8;
const SQUEEZE_R = 0.6;

/**
 * Backing out is a manoeuvre, not a nudge.
 *
 * It used to reverse for exactly as long as the stuck counter stayed above the
 * threshold — which reversing immediately cured — so the vehicle shuffled six
 * inches back and drove straight into the same wall, for ever. Once it starts
 * backing out it commits to it, and then looks again with fresh eyes.
 */
const REVERSE = 1.8;
const BACK_S = 1.4;

/**
 * How long after backing out before he will do it again.
 *
 * Without it a vehicle whose caller keeps telling it that it is going nowhere —
 * which is exactly what a ride trapped in a courtyard does — reverses, is told
 * it is still going nowhere, and reverses again, for ever. He backs out, then
 * spends a few seconds actually trying.
 */
const BACK_COOL = 3;

/** How far ahead the corner lookahead bothers to read, in metres and points. */
const LOOK_M = 60;
const LOOK_PTS = 30;

/**
 * How far a vehicle may move between collision passes, in metres, and the most
 * passes one step will ever be split into.
 *
 * world.collide is a teleporting resolver: it snaps a point to the NEAREST face
 * of whatever it is inside. At twenty-six metres a second a frame covers the
 * better part of a metre, so a vehicle clipping the corner of a building goes
 * in deep enough that the nearest face is the FAR one — and it is set down on
 * the wrong side of the wall. Measured, that is how a rickshaw ended up nine
 * metres off Bhaktivedanta Swami Marg, in the middle of a block, unable to get
 * out. Half a metre at a time and the nearest face is always the one it came in
 * through.
 */
const SUB_M = 0.45;
const SUB_MAX = 4;

/** Scratch for the collision pass, so driving allocates nothing per frame. */
const _p = new THREE.Vector3();

/**
 * Move a vehicle one step.
 *
 * `a` is an ordinary crowd agent — this writes `a.x`, `a.z`, `a.yaw` and adds
 * `a.vel`, `a.steer` and `a.stuck` to it, in the same bolted-on way the rest of
 * the crowd carries state. `wantYaw` is where it would like to be pointing and
 * `wantSpeed` how fast it would like to be going; both are wishes, and the
 * grip, the brakes and the world all get a say. `solid` is off for vehicles too
 * far away to be seen, which is the only place the cost of colliding them
 * matters.
 *
 * Returns the metres it actually made along its own heading — negative when it
 * is backing up, near zero when something is in the way.
 */
export function driveStep(a, dt, ctx, wantYaw, wantSpeed, prof, solid = true) {
  if (a.vel === undefined) a.vel = 0;
  if (a.stuck === undefined) a.stuck = 0;

  // ---- getting round whatever is in the way ----
  // A driver who cannot make progress does not keep pressing into the wall. He
  // looks for the way with the most room and leans that way for a second or
  // two; if that fails for long enough he backs out, commits to backing out,
  // and then looks again.
  if (a.backCool > 0) a.backCool -= dt;
  if (a.backT > 0) {
    a.backT -= dt;
    wantYaw = a.yaw;                     // straight back, the way he came
    wantSpeed = -REVERSE;
    if (a.backT <= 0) {
      a.stuck = 0; a.avoidT = 0; a.backCool = BACK_COOL;
      a.markT = 0; a.markX = a.x; a.markZ = a.z;
    }
  } else {
    if (a.stuck > STUCK_BACK && !(a.backCool > 0)) { a.backT = BACK_S; a.avoidT = 0; }
    else if (a.stuck > STUCK_TRY && !(a.avoidT > 0)) {
      const room = _wayRound(ctx, a, wantYaw);
      // Commit to a BEARING, not to an offset from the target. An offset stays
      // relative to a waypoint on the far side of the wall, so the moment the
      // vehicle turns away the offset turns with it and steers it back in — it
      // pinballed off the same building for ten minutes that way. A bearing,
      // held for about as long as the room he found will last, is how anybody
      // actually gets round the end of a wall.
      a.avoidYaw = wantYaw + room.off;
      a.avoidT = clamp(room.m / AVOID_SPEED, AVOID_MIN_S, AVOID_MAX_S);
    }
    if (a.avoidT > 0) {
      a.avoidT -= dt;
      wantYaw = a.avoidYaw;
      if (wantSpeed > AVOID_SPEED) wantSpeed = AVOID_SPEED;
    }
  }

  // ---- turn toward it, no faster than the vehicle could ----
  // A corner of radius R can be taken at sqrt(lat*R), which is the same thing
  // as saying the yaw rate can never exceed lat/speed. At a crawl it is the
  // steering lock that stops you instead.
  const v = Math.abs(a.vel);
  const maxRate = Math.min(prof.turnMax, prof.lat / Math.max(CRAWL, v));
  const rate = clamp(angleDelta(a.yaw, wantYaw) / TURN_TIME, -maxRate, maxRate);
  a.yaw += rate * dt;
  if (a.yaw > Math.PI) a.yaw -= TAU; else if (a.yaw < -Math.PI) a.yaw += TAU;
  a.steer = rate;

  // ---- speed ----
  // You cannot accelerate through a bend: the tyres hold lat m/s² and no more,
  // so the harder it is turning the less speed there is to be had. This is the
  // half of slowing for a corner that happens IN the corner; pathLimit below is
  // the half that has to happen before it.
  let want = wantSpeed;
  const turning = Math.abs(rate);
  if (want > 0 && turning > 0.06) want = Math.min(want, prof.lat / turning);

  const dv = want - a.vel;
  const lim = (dv > 0 ? prof.accel : prof.brake) * dt;
  a.vel += clamp(dv, -lim, lim);

  // ---- move, and let the world have the last word ----
  const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
  const step = a.vel * dt;
  const fromX = a.x, fromZ = a.z;

  const radius = a.stuck > SQUEEZE_AFTER ? SQUEEZE_R : VEHICLE_R;
  const n = solid ? Math.min(SUB_MAX, Math.max(1, Math.ceil(Math.abs(step) / SUB_M))) : 1;
  const sub = step / n;
  for (let i = 0; i < n; i++) {
    _p.set(a.x + fx * sub, 0, a.z + fz * sub);
    if (solid) {
      if (ctx.world && ctx.world.collide) ctx.world.collide(_p, radius);
      if (prof.agents && ctx.crowd && ctx.crowd.collideAgents) {
        // Skip itself. collideAgents has no idea which vehicle is asking, and a
        // vehicle tests against its own previous position at better than two
        // metres — it used to shove itself a metre down the road every frame.
        ctx.crowd.collideAgents(_p, radius, a);
      }
    }
    a.x = _p.x; a.z = _p.z;
  }

  // How much of that step actually happened. Grinding along a wall costs speed
  // rather than being silently ignored, and a vehicle getting nowhere knows it.
  const made = (a.x - fromX) * fx + (a.z - fromZ) * fz;
  if (Math.abs(step) > 1e-4) {
    const frac = clamp(made / step, 0, 1);
    if (frac < 0.92) a.vel *= frac;
    if (frac < 0.35) a.stuck += dt;
  } else if (wantSpeed > 0.2) {
    a.stuck += dt;
  }

  // ...and the only thing that clears it is having covered ground
  if (a.markX === undefined) { a.markX = a.x; a.markZ = a.z; a.markT = 0; }
  a.markT += dt;
  if (a.markT >= MARK_S) {
    const gone = Math.hypot(a.x - a.markX, a.z - a.markZ);
    if (gone < MARK_M) a.stuck = Math.max(a.stuck, a.markT);
    else a.stuck = 0;
    a.markT = 0; a.markX = a.x; a.markZ = a.z;
  }
  return made;
}

/**
 * The fastest a vehicle may be going right now and still take everything ahead
 * of it at a speed the tyres would hold.
 *
 * Walks forward along the route from the waypoint being steered to, works out
 * how tight each corner is, and asks what speed you could be doing here and
 * still brake down to that in time. Reads about fifteen waypoints on a 4 m
 * spacing, allocates nothing, and is the reason a rickshaw arrives at a bend
 * already slow rather than discovering it halfway round.
 *
 * `roadAt(k)`, when given, is the speed the ROAD allows at point k (see
 * RoadSpeeds) and is braked for exactly as a corner is: a driver coming off
 * the Chhatikara road into a gali is already slow on reaching it, rather
 * than finding out at the mouth of the lane.
 */
export function pathLimit(pts, i, x, z, prof, cap, roadAt = null) {
  const n = pts.length;
  if (i >= n) return cap;
  let limit = cap;
  // the road under the vehicle now: the stretch leading to the waypoint ahead
  if (roadAt) limit = Math.min(limit, roadAt(Math.max(0, i - 1)));
  if (n < 3) return limit;
  let ahead = Math.hypot(pts[i][0] - x, pts[i][1] - z);

  for (let k = Math.max(1, i); k < n - 1 && ahead < LOOK_M && k - i < LOOK_PTS; k++) {
    const a = pts[k - 1], b = pts[k], c = pts[k + 1];
    const ax = b[0] - a[0], az = b[1] - a[1];
    const bx = c[0] - b[0], bz = c[1] - b[1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    let hold = roadAt ? roadAt(k) : Infinity;
    if (la > 1e-3 && lb > 1e-3) {
      const turn = Math.abs(angleDelta(Math.atan2(ax, az), Math.atan2(bx, bz)));
      if (turn > 0.05) {
        // the radius of the arc that fits this corner, and the speed it holds
        const r = Math.min(la, lb) / (2 * Math.sin(Math.min(turn, 3) / 2));
        hold = Math.min(hold, Math.sqrt(prof.lat * Math.max(r, 0.6)));
      }
    }
    if (hold < limit) {
      // ...then how fast you may be going now and still brake down to it
      const now = Math.sqrt(hold * hold + 2 * prof.brake * ahead);
      if (now < limit) limit = now;
    }
    ahead += lb;
  }
  return limit;
}

/**
 * How long a route really takes to drive, in seconds, from rest to rest.
 *
 * The same physics `pathLimit` and `driveStep` apply, run once over the whole
 * route instead of a frame at a time: every point is held to the speed its
 * road allows (`lim[k]`, m/s) and the speed its corner holds; a pass forward
 * then limits each point to what the vehicle could have reached from the last
 * one at its acceleration, and a pass back to what it could still brake down
 * from in time for the next. What is left is a speed profile a driver could
 * actually drive, and its time is the honest length of the journey — the
 * figure the fare quote says out loud and the time-lapse is chosen from.
 *
 * It knows nothing of traffic, cows or the vehicle in front, so it is the best the
 * road allows and the ride's own measurement takes over once there is one.
 * Allocates two arrays a call, and is only ever called when a route is laid.
 * Pass `after` (length n) to have it filled with the time left from each point.
 */
export function routeSeconds(pts, lim, prof, after = null) {
  const n = pts.length;
  if (n < 2) { if (after && n) after[0] = 0; return 0; }
  const v = new Float32Array(n);
  const seg = new Float32Array(n);             // seg[k]: metres from k to k+1
  for (let k = 0; k < n - 1; k++) {
    seg[k] = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
  }
  for (let k = 0; k < n; k++) {
    let hold = lim[Math.min(k, lim.length - 1)];
    if (k > 0 && k < n - 1 && seg[k - 1] > 1e-3 && seg[k] > 1e-3) {
      const a = pts[k - 1], b = pts[k], c = pts[k + 1];
      const turn = Math.abs(angleDelta(Math.atan2(b[0] - a[0], b[1] - a[1]),
        Math.atan2(c[0] - b[0], c[1] - b[1])));
      if (turn > 0.05) {
        const r = Math.min(seg[k - 1], seg[k]) / (2 * Math.sin(Math.min(turn, 3) / 2));
        hold = Math.min(hold, Math.sqrt(prof.lat * Math.max(r, 0.6)));
      }
    }
    v[k] = hold;
  }
  v[0] = 0;                                    // from rest
  v[n - 1] = 0;                                // ...to rest, to set you down
  for (let k = 1; k < n; k++) {
    v[k] = Math.min(v[k], Math.sqrt(v[k - 1] * v[k - 1] + 2 * prof.accel * seg[k - 1]));
  }
  for (let k = n - 2; k >= 0; k--) {
    v[k] = Math.min(v[k], Math.sqrt(v[k + 1] * v[k + 1] + 2 * prof.brake * seg[k]));
  }
  // `after[k]`, when asked for, is the time from point k to the end: what is
  // left of the journey, honestly, from wherever the vehicle has got to
  let t = 0;
  if (after) after[n - 1] = 0;
  for (let k = n - 2; k >= 0; k--) {
    t += seg[k] / Math.max(0.3, (v[k] + v[k + 1]) * 0.5);
    if (after) after[k] = t;
  }
  return t;
}

/**
 * The offset from the wanted heading with the most room behind it, in radians.
 *
 * Deliberately not described as left or right: forward here is (sin yaw,
 * cos yaw), and this codebase has already been bitten once by a mirrored
 * quarter turn. The fan is ordered from the gentlest deviation outwards and
 * only a clearly better bearing displaces a gentler one, so a driver takes the
 * smallest swerve that works rather than swinging the handle over for a
 * lamp post.
 */
function _wayRound(ctx, a, wantYaw) {
  const w = ctx.world;
  _round.off = PROBE_FAN[0];
  _round.m = PROBE_M;
  if (!w || !w.isClear) {
    if (Math.random() < 0.5) _round.off = -PROBE_FAN[0];
    return _round;
  }
  let best = PROBE_FAN[0], bestRoom = _room(w, a, wantYaw + PROBE_FAN[0]);
  for (let i = 1; i < PROBE_FAN.length; i++) {
    const room = _room(w, a, wantYaw + PROBE_FAN[i]);
    if (room > bestRoom + 1) { bestRoom = room; best = PROBE_FAN[i]; }
  }
  _round.off = best;
  _round.m = bestRoom;
  return _round;
}

/** Reused so the recovery allocates nothing, rare as it is. */
const _round = { off: 0, m: 0 };

/** How far a vehicle could get on this bearing before something stopped it. */
function _room(w, a, yaw) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  for (let d = 1.5; d <= PROBE_M; d += 1.5) {
    if (!w.isClear(a.x + dx * d, a.z + dz * d, VEHICLE_R)) return d;
  }
  return PROBE_M;
}
