/**
 * ThirdPersonCamera — the pilgrim's eye.
 *
 * A GTA-style orbiting follow camera with three jobs beyond "stay behind the
 * player": it must never push through a gali wall, it must hand itself over to
 * slow cinematic framings for darshan and pranam without a visible cut, and it
 * must stay calm. Nothing here snaps — every value is damped in frame-rate
 * independent time, so a 30fps phone and a 120fps tablet feel identical.
 *
 * The rig owns no scene objects. It reads the player and the world each frame
 * and writes exactly two things: ctx.camera.position and ctx.camera.quaternion
 * (plus fov, when a shot asks for it).
 */

import * as THREE from 'three';
import {
  clamp, clamp01, lerp, damp, dampAngle, angleDelta,
  smoothstep, smootherstep, DEG, TAU,
} from '../../engine/math/MathUtils.js';

/* ------------------------------------------------------------------ *
 * Tuning — one table, so the feel of the game is editable in one place
 * ------------------------------------------------------------------ */

const MODES = ['follow', 'orbit', 'first', 'cinematic', 'map', 'avatar'];

const PIVOT_H = 1.50;          // the point the camera orbits: roughly the player's shoulders
const EYE_RISE = 1.05;         // pivot + this = 2.1 m camera height at level pitch
const DIST_DEFAULT = 6.8;
const DIST_MIN = 2.5;
const DIST_MAX = 12.0;
const NARROW_DIST = 4.0;       // galis are 2–3 m wide; the rig tucks in on its own
const COLLIDE_RADIUS = 0.3;
/**
 * The closest wall avoidance may ever pull the camera in.
 *
 * `_collide` is a fraction of the arm, and it can reach zero — at which point
 * `dist * 0` puts the camera exactly on the pivot, which is inside the
 * player's own head, and you are looking at the inside of your own avatar with
 * no way to work out what happened. Measured beside a kirtan: arm 6.21 m on
 * open ground, 0.00 m standing next to it.
 *
 * A squeezed camera should end up over the shoulder, not nowhere. At 0.75 m
 * you are close enough to be clearly pinned and can still see where you are
 * going, which is what the fallback is for.
 */
const COLLIDE_MIN = 0.75;
const PITCH_MIN = -35 * DEG;   // below the shoulder, looking up at a shikhara
const PITCH_MAX = 55 * DEG;    // above, looking down into a courtyard
const FP_PITCH_MIN = -62 * DEG;
const FP_PITCH_MAX = 72 * DEG;

const FOV_BASE = 60;
const FOV_CINEMA = 48;
const FOV_INTRO = 66;

const ALIGN_TAU = 2.5;                 // seconds — the long auto-align time constant
const ALIGN_K = 1 / ALIGN_TAU;
const ALIGN_IDLE = 0.55;               // look must be untouched this long first
const ALIGN_SPEED_FRAC = 0.4;          // ...and the player above 40% of walk pace

const LOOK_UNIT_RAD = 2.35;            // radians per unit of a normalised drag delta
const LOOK_PIXEL_RAD = 0.0026;         // radians per pixel, once pixel units are detected
const LOOK_AXIS_RATE = 2.6;            // radians per second when input reports a held axis

const AVATAR_DIST = 3.0;
const AVATAR_SPIN = 0.30;              // rad/s — a slow turntable for the dressing screen
const MAP_DIST = 120;
const MAP_PITCH = 68 * DEG;

const DEFAULT_SETTINGS = { sensitivity: 1, invertY: false, reduceMotion: false };

/* ------------------------------------------------------------------ *
 * Module scratch — update() allocates nothing, ever
 * ------------------------------------------------------------------ */

const _desired = new THREE.Vector3();
const _head = new THREE.Vector3();
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpC = new THREE.Vector3();
const _tmpD = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qRoll = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _UP = new THREE.Vector3(0, 1, 0);
const _ZAXIS = new THREE.Vector3(0, 0, 1);
const _XAXIS = new THREE.Vector3(1, 0, 0);
const _YAXIS = new THREE.Vector3(0, 1, 0);

function wrapAngle(a) {
  a %= TAU;
  if (a > Math.PI) a -= TAU;
  else if (a < -Math.PI) a += TAU;
  return a;
}

/** Yaw 0 looks toward +Z (south). forward = (sin y, 0, cos y); screen-right = (-cos y, 0, sin y). */
function forwardInto(out, yaw, pitch) {
  const cp = Math.cos(pitch);
  return out.set(Math.sin(yaw) * cp, -Math.sin(pitch), Math.cos(yaw) * cp);
}

function settingsOf(ctx) {
  const s = ctx && ctx.state && ctx.state.settings;
  return s || DEFAULT_SETTINGS;
}

/* ------------------------------------------------------------------ */

export class CameraRig {
  constructor(ctx) {
    this.ctx = ctx;
    this.camera = ctx.camera;
    this.mode = 'follow';

    // orbit state — `*Target` is what the player asked for, the bare name is what is rendered
    this.yaw = Math.PI;
    this.yawTarget = Math.PI;
    this.pitch = 18 * DEG;
    this.pitchTarget = 18 * DEG;
    const pref = (ctx && ctx.state && ctx.state.settings && ctx.state.settings.cameraDistance) || DIST_DEFAULT;
    this.dist = pref;
    this.distTarget = pref;
    this.distUser = pref;
    this.fov = this.camera ? this.camera.fov : FOV_BASE;

    // derived player readings
    this.focus = new THREE.Vector3(0, PIVOT_H, 0);
    this.speed = 0;
    this.heading = Math.PI;
    this.walkSpeed = 1.7;

    this._rawPos = new THREE.Vector3(0, 0, 0);
    this._lastPos = new THREE.Vector3(0, 0, 0);
    this._focusInit = false;   // pivot has been snapped to a real player position
    this._posInit = false;     // camera has been snapped to its first solved pose
    this._time = 0;

    // look input bookkeeping
    this._lookIdle = 99;
    this._lookPixels = false;

    // wall avoidance: 0 = fully pulled in, 1 = clear
    this._collide = 1;

    // committed transform
    this._camPos = new THREE.Vector3();
    this._camLook = new THREE.Vector3();
    this._camQuat = new THREE.Quaternion();
    this._hasQuat = false;
    this._fovTarget = FOV_BASE;
    this._fovK = 3.5;

    // cinematic (focusOn) — every vector preallocated so a darshan costs no GC
    this._cineFrom = new THREE.Vector3();
    this._cineTo = new THREE.Vector3();
    this._cineCreep = new THREE.Vector3();
    this._cineHold = new THREE.Vector3();
    this._cineFromQ = new THREE.Quaternion();
    this._cineToQ = new THREE.Quaternion();
    this._cineTarget = new THREE.Vector3();
    this._cineT = 1;
    this._cineDur = 1;
    this._cineFov0 = FOV_BASE;
    this._cineFov1 = FOV_CINEMA;
    this._cineResolve = null;
    this._cineSettled = false;

    // remembered orbit, restored on release()
    this._preYaw = this.yaw;
    this._prePitch = this.pitch;
    this._preDist = this.distTarget;

    // return blend out of a cinematic
    this._returnFrom = new THREE.Vector3();
    this._returnFromQ = new THREE.Quaternion();
    this._returnT = 1;
    this._returnDur = 0.85;

    // establishing shot
    this._introPos = null;
    this._introLook = null;
    this._introT = 0;
    this._introDur = 10.5;
    this._introRate = 1;
    this._introResolve = null;

    // shake
    this._shakeAmp = 0;
    this._shakeLeft = 0;
    this._shakeDur = 1;

    this._offs = [];
    const bus = ctx.bus;
    const E = ctx.Events || {};
    if (bus) {
      this._offs.push(bus.on(E.INPUT_PINCH || 'input:pinch', (p) => this._onPinch(p)));
      this._offs.push(bus.on(E.SETTINGS_CHANGED || 'settings:changed', () => { this._lookPixels = false; }));
    }

    if (this.camera) {
      this.camera.rotation.order = 'YXZ';
      this.fov = this.camera.fov;
      this._fovTarget = this.camera.fov;
    }

    console.info('[camera] third-person rig ready');
  }

  /* ---------------------------------------------------------------- *
   * Public API
   * ---------------------------------------------------------------- */

  setMode(mode) {
    if (!MODES.includes(mode) || mode === this.mode) return;
    if (this.mode === 'cinematic' && mode !== 'cinematic') this._settleCine();
    // leaving the opening sweep for any reason hands the camera straight back
    if (mode === 'follow') this._settleIntro();
    this.mode = mode;
    if (mode === 'avatar') {
      this.distTarget = AVATAR_DIST;
      this.pitchTarget = 7 * DEG;
      this._fovTarget = 42;
    } else if (mode === 'map') {
      this._fovTarget = FOV_BASE;
    } else if (mode === 'first') {
      this.pitchTarget = clamp(this.pitchTarget, FP_PITCH_MIN, FP_PITCH_MAX);
      this._fovTarget = 66;
    } else {
      this.distTarget = clamp(this.distUser, DIST_MIN, DIST_MAX);
      this.pitchTarget = clamp(this.pitchTarget, PITCH_MIN, PITCH_MAX);
      this._fovTarget = FOV_BASE;
    }
  }

  setDistance(d) {
    this.distUser = clamp(d, DIST_MIN, DIST_MAX);
    if (this.mode !== 'avatar' && this.mode !== 'map' && this.mode !== 'first') {
      this.distTarget = this.distUser;
    }
  }

  /**
   * Point the camera down (or up) from outside.
   *
   * Used when you step into a room: a hut is 5 m across and the shoulder-level
   * follow view is looking straight at a wall 2 m away. Looking DOWN into the
   * room is the only view that reads, which is the whole reason the top-down
   * interior shot exists in the games this is borrowed from.
   */
  setPitch(rad) {
    this.pitchTarget = clamp(rad, PITCH_MIN, PITCH_MAX);
  }

  getDistance() { return this.dist; }
  getYaw() { return this.yaw; }
  getPitch() { return this.pitch; }

  /** Movement is camera-relative; the player controller reads these. */
  getForward(out) {
    const v = out || _tmpA;
    return v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  getRight(out) {
    const v = out || _tmpB;
    return v.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
  }

  /** Gentle only, and never when reduceMotion is on. */
  shake(amount, dur = 0.4) {
    if (settingsOf(this.ctx).reduceMotion) return;
    const a = clamp(amount || 0, 0, 0.5);
    if (a <= 0) return;
    this._shakeAmp = Math.max(this._shakeAmp, a);
    this._shakeDur = Math.max(this._shakeLeft, dur, 0.05);
    this._shakeLeft = this._shakeDur;
  }

  /**
   * Cinematic push-in used by darshan, offering and pranam.
   * Frames the player in the left third and the target in the right third.
   * Resolves when the dolly has landed; the shot then holds until release().
   */
  focusOn(worldPos, opts = {}) {
    const ctx = this.ctx;
    this._settleCine();
    this._settleIntro();

    const t = this._cineTarget;
    if (Array.isArray(worldPos)) {
      t.set(worldPos[0] || 0, worldPos.length > 2 ? worldPos[1] : 1.4, worldPos.length > 2 ? worldPos[2] : (worldPos[1] || 0));
    } else if (worldPos && typeof worldPos.x === 'number') {
      t.set(worldPos.x, typeof worldPos.y === 'number' ? worldPos.y : 1.4, worldPos.z || 0);
    } else {
      t.copy(this.focus);
    }

    const st = settingsOf(ctx);
    const reduce = !!st.reduceMotion;

    this._preYaw = this.yawTarget;
    this._prePitch = this.pitchTarget;
    this._preDist = this.distTarget;

    this._solveFraming(ctx, t, opts);

    this._cineFrom.copy(this.camera.position);
    this._cineFromQ.copy(this.camera.quaternion);
    this._cineHold.copy(this._cineTo);
    this._cineT = 0;
    this._cineDur = Math.max(0.12, reduce ? 0.8 : (opts.duration || 2.2));
    this._cineFov0 = this.camera.fov;
    this._cineFov1 = reduce ? this.camera.fov : (opts.fov || FOV_CINEMA);
    this._cineSettled = false;
    this._returnT = 1;
    this.mode = 'cinematic';

    return new Promise((resolve) => { this._cineResolve = resolve; });
  }

  /** Leave a cinematic and glide back behind the player. */
  release() {
    this._settleCine();
    if (this.mode !== 'cinematic') return;
    const reduce = !!settingsOf(this.ctx).reduceMotion;
    this._returnFrom.copy(this.camera.position);
    this._returnFromQ.copy(this.camera.quaternion);
    this._returnT = 0;
    this._returnDur = reduce ? 0.35 : 0.85;
    this.yawTarget = this._preYaw;
    this.pitchTarget = this._prePitch;
    this.distTarget = this._preDist;
    this._fovTarget = FOV_BASE;
    this.mode = 'follow';
  }

  /**
   * The opening shot: high over the rooftops, sweeping toward Banke Bihari,
   * then descending into the follow rig without a cut.
   */
  playIntroShot(ctx) {
    const c = ctx || this.ctx;
    this._settleIntro();
    this._settleCine();

    const st = settingsOf(c);
    const reduce = !!st.reduceMotion;

    this._readPlayer(c, 1 / 60);
    this.yaw = this.yawTarget = this.heading;
    this.pitch = this.pitchTarget = 10 * DEG;
    this.dist = this.distTarget;
    this._collide = 1;

    const world = c.world;
    const ground = (x, z) => (world && world.groundHeight ? world.groundHeight(x, z) : 0);

    // The real temple, from the real OSM coordinate.
    const bb = c.data && c.data.LOCATION_BY_ID ? c.data.LOCATION_BY_ID.get('banke-bihari') : null;
    const tx = bb ? bb.pos[0] : 0;
    const tz = bb ? bb.pos[1] : 0;
    const ty = ground(tx, tz) + 20;

    const px = this.focus.x;
    const pz = this.focus.z;
    const py = this.focus.y;

    // A descending arc that comes in from the south-west, swings past the
    // temple and settles onto the follow shot.
    const posPts = [
      new THREE.Vector3(tx - 320, ground(tx - 320, tz + 350) + 195, tz + 350),
      new THREE.Vector3(tx - 205, ground(tx - 205, tz + 205) + 132, tz + 205),
      new THREE.Vector3(tx - 88, ground(tx - 88, tz + 96) + 74, tz + 96),
      new THREE.Vector3(lerp(tx, px, 0.55) - 26, ground(lerp(tx, px, 0.55), lerp(tz, pz, 0.55)) + 32, lerp(tz, pz, 0.55) + 34),
      new THREE.Vector3(px, py, pz),
    ];
    // The last key is the live follow position, so the handover is exact.
    this._orbitInto(posPts[4], this.focus, this.yaw, this.pitch, this.distTarget);

    const lookPts = [
      new THREE.Vector3(tx, ty, tz),
      new THREE.Vector3(tx, ty * 0.8, tz),
      new THREE.Vector3(lerp(tx, px, 0.35), lerp(ty * 0.6, py, 0.4), lerp(tz, pz, 0.35)),
      new THREE.Vector3(lerp(tx, px, 0.78), lerp(ty * 0.3, py, 0.8), lerp(tz, pz, 0.78)),
      new THREE.Vector3(px, py + 0.25, pz),
    ];

    this._introPos = new THREE.CatmullRomCurve3(posPts, false, 'catmullrom', 0.35);
    this._introLook = new THREE.CatmullRomCurve3(lookPts, false, 'catmullrom', 0.35);
    this._introT = 0;
    this._introRate = 1;
    this._introDur = reduce ? 3.0 : 10.5;
    this.mode = 'cinematic';
    this._returnT = 1;

    return new Promise((resolve) => { this._introResolve = resolve; });
  }

  /** Let a tap cut the establishing shot short without a jump. */
  skipIntro() {
    if (this._introPos) this._introRate = 6;
  }

  /* ---------------------------------------------------------------- *
   * Frame
   * ---------------------------------------------------------------- */

  /** The player can set how far back they want to sit, and it applies at once. */
  _syncPreferredDistance(ctx) {
    const pref = ctx.state && ctx.state.settings ? ctx.state.settings.cameraDistance : null;
    if (!pref || pref === this._lastPref) return;
    this._lastPref = pref;
    this.distUser = pref;
    this.distTarget = pref;
  }

  update(dt, ctx) {
    this._syncPreferredDistance(ctx);
    const c = ctx || this.ctx;
    const d = clamp(dt || 0, 0, 0.05);
    this._time += d;

    const st = settingsOf(c);
    this._readPlayer(c, d);
    this._readLook(c, d, st);

    const intro = !!this._introPos;
    const returning = this._returnT < 1;
    const orbiting = this.mode === 'follow' || this.mode === 'orbit' || this.mode === 'first';

    this._hasQuat = false;

    if (orbiting || intro || returning) this._solveFollow(c, d, st);
    if (this.mode === 'avatar') this._solveAvatar(c, d, st);
    else if (this.mode === 'map') this._solveMap(c, d);

    if (intro) this._solveIntro(c, d, st);
    else if (this.mode === 'cinematic') this._solveCinematic(d, st);

    if (returning && !intro) this._solveReturn(d);

    this._commit(c, d, st);
    this._applyFov(d, st);
  }

  /* ---------------------------------------------------------------- *
   * Inputs
   * ---------------------------------------------------------------- */

  /** The player module is written in parallel, so read it tolerantly. */
  _readPlayer(ctx, dt) {
    const p = ctx.player;
    let got = false;

    if (p) {
      const v = p.position || p.pos || (p.object3D && p.object3D.position)
        || (p.group && p.group.position) || (p.mesh && p.mesh.position)
        || (p.root && p.root.position) || (p.object && p.object.position);
      if (v && typeof v.x === 'number' && typeof v.z === 'number') {
        this._rawPos.set(v.x, typeof v.y === 'number' ? v.y : this._rawPos.y, v.z);
        got = true;
      } else if (Array.isArray(v) && v.length >= 2) {
        const gx = v[0];
        const gz = v.length > 2 ? v[2] : v[1];
        const gy = v.length > 2 ? v[1] : (ctx.world ? ctx.world.groundHeight(gx, gz) : 0);
        this._rawPos.set(gx, gy, gz);
        got = true;
      }
    }
    if (!got && !this._focusInit) this._rawPos.set(0, ctx.world ? ctx.world.groundHeight(0, 0) : 0, 0);

    const dx = this._rawPos.x - this._lastPos.x;
    const dz = this._rawPos.z - this._lastPos.z;
    const stepped = Math.sqrt(dx * dx + dz * dz);

    let raw;
    if (p && typeof p.speed === 'number') raw = Math.abs(p.speed);
    else if (p && p.velocity && typeof p.velocity.x === 'number') raw = Math.hypot(p.velocity.x, p.velocity.z);
    else raw = dt > 1e-4 ? stepped / dt : this.speed;
    this.speed = damp(this.speed, Math.min(raw, 14), 9, dt || 1 / 60);

    if (p && typeof p.walkSpeed === 'number') this.walkSpeed = Math.max(0.4, p.walkSpeed);

    let h = null;
    if (p) {
      if (typeof p.heading === 'number') h = p.heading;
      else if (typeof p.yaw === 'number') h = p.yaw;
      else if (typeof p.facing === 'number') h = p.facing;
      else {
        const o = p.object3D || p.group || p.mesh || p.root || p.object;
        if (o && o.rotation && typeof o.rotation.y === 'number') h = o.rotation.y;
      }
    }
    if (h === null && stepped > 1e-4) h = Math.atan2(dx, dz);
    if (h !== null) this.heading = wrapAngle(h);

    this._lastPos.copy(this._rawPos);

    // Pivot follows the body: quick horizontally, unhurried vertically so
    // steps, ghat stairs and terrain relief never make the frame bob.
    const ty = this._rawPos.y + PIVOT_H;
    if (!this._focusInit) {
      this.focus.set(this._rawPos.x, ty, this._rawPos.z);
      this.yaw = this.yawTarget = this.heading;
      this._focusInit = true;
    } else {
      const kx = this.mode === 'cinematic' ? 6 : 14;
      this.focus.x = damp(this.focus.x, this._rawPos.x, kx, dt);
      this.focus.z = damp(this.focus.z, this._rawPos.z, kx, dt);
      this.focus.y = damp(this.focus.y, ty, 6.5, dt);
    }
  }

  /**
   * ctx.input.look may arrive as a normalised drag delta, as raw pixels, or as
   * a held stick axis. Detect pixels once and stay with that reading.
   */
  _readLook(ctx, dt, st) {
    const input = ctx.input;
    let lx = 0;
    let ly = 0;

    if (input) {
      const l = input.look;
      if (l && typeof l === 'object') {
        lx = Number(l.x) || 0;
        ly = Number(l.y) || 0;
      } else {
        lx = Number(input.lookX) || 0;
        ly = Number(input.lookY) || 0;
      }
      try {
        if (typeof input.consumeLook === 'function') input.consumeLook();
        else if (l && typeof l === 'object') { l.x = 0; l.y = 0; }
        else if ('lookX' in input) { input.lookX = 0; input.lookY = 0; }
      } catch { /* a frozen input object simply clears itself */ }
    }

    const axis = !!(input && input.lookIsAxis);
    if (!axis && !this._lookPixels && (Math.abs(lx) > 3 || Math.abs(ly) > 3)) this._lookPixels = true;

    const sens = clamp(Number(st.sensitivity) || 1, 0.2, 3);
    const scale = axis ? LOOK_AXIS_RATE * dt : (this._lookPixels ? LOOK_PIXEL_RAD : LOOK_UNIT_RAD);
    lx *= scale * sens;
    ly *= scale * sens;

    const touched = Math.abs(lx) + Math.abs(ly) > 1e-5;
    if (touched) this._lookIdle = 0;
    else this._lookIdle += dt;

    if (this.mode === 'cinematic' || this.mode === 'map') return;

    // Dragging right turns the view right; yaw increases toward the east.
    this.yawTarget = wrapAngle(this.yawTarget - lx);
    const dp = st.invertY ? -ly : ly;
    const lo = this.mode === 'first' ? FP_PITCH_MIN : PITCH_MIN;
    const hi = this.mode === 'first' ? FP_PITCH_MAX : PITCH_MAX;
    this.pitchTarget = clamp(this.pitchTarget + dp, lo, hi);
  }

  _onPinch(p) {
    if (!p) return;
    let delta = Number(p.delta) || 0;
    if (delta === 0) return;
    // Spread (positive) pulls the camera in; pinch pushes it out.
    delta *= Math.abs(delta) > 3 ? 0.012 : 2.2;
    this.setDistance(this.distUser - delta);
    if (this.mode !== 'avatar' && this.mode !== 'map' && this.mode !== 'first') {
      this.distTarget = this.distUser;
    }
  }

  /* ---------------------------------------------------------------- *
   * Solvers — each writes _camPos and either _camLook or _camQuat
   * ---------------------------------------------------------------- */

  _solveFollow(ctx, dt, st) {
    const reduce = !!st.reduceMotion;
    const world = ctx.world;

    // Auto-align: only while walking, and only once the look control has
    // been left alone. 2.5 s time constant, so it never yanks.
    if (this.mode === 'follow' && this._lookIdle > ALIGN_IDLE) {
      const thr = this.walkSpeed * ALIGN_SPEED_FRAC;
      if (this.speed > thr) {
        const ramp = clamp01((this.speed - thr) / Math.max(0.2, this.walkSpeed - thr));
        this.yawTarget = wrapAngle(dampAngle(this.yawTarget, this.heading, ALIGN_K * (0.45 + ramp), dt));
      }
    }

    const kLook = reduce ? 20 : 12;
    this.yaw = wrapAngle(dampAngle(this.yaw, this.yawTarget, kLook, dt));
    this.pitch = damp(this.pitch, this.pitchTarget, kLook, dt);

    // Distance: user choice, tightened in narrow lanes and when looking down.
    let want = this.distTarget;
    if (this.mode === 'first') {
      want = 0;
    } else {
      if (world && world.isNarrow && world.isNarrow(this.focus.x, this.focus.z)) {
        want = Math.min(want, NARROW_DIST);
      }
      want *= lerp(1, 0.88, clamp01(this.pitch / PITCH_MAX));
    }
    this.dist = damp(this.dist, want, 4.5, dt);

    if (this.mode === 'first') {
      forwardInto(_dir, this.yaw, this.pitch);
      _desired.set(
        this.focus.x + _dir.x * 0.18,
        this.focus.y + 0.14,
        this.focus.z + _dir.z * 0.18,
      );
      this._camLook.copy(_desired).addScaledVector(_dir, 8);
      this._collide = 1;
    } else {
      this._orbitInto(_desired, this.focus, this.yaw, this.pitch, this.dist);

      // Wall avoidance. Pull in fast, ease back out slowly, so a doorway
      // jamb clips the camera for an instant rather than pumping it.
      let frac = 1;
      if (world && world.collideRay) {
        _head.copy(this.focus);
        const f = world.collideRay(_head, _desired, COLLIDE_RADIUS);
        if (typeof f === 'number' && isFinite(f)) frac = clamp01(f);
      }
      this._collide = clamp01(frac < this._collide
        ? damp(this._collide, frac, 22, dt)
        : damp(this._collide, frac, 3.2, dt));

      if (this._collide < 0.999) {
        // never all the way in: see COLLIDE_MIN
        const pulled = Math.max(COLLIDE_MIN, this.dist * this._collide * 0.94);
        this._orbitInto(_desired, this.focus, this.yaw, this.pitch, pulled);
      }

      this._camLook.copy(this.focus);
      this._camLook.y += 0.22;
      if (!reduce && this.speed > 0.2) {
        // A whisper of lead, so walking feels like going somewhere.
        this._camLook.x += Math.sin(this.yaw) * Math.min(this.speed * 0.22, 0.7);
        this._camLook.z += Math.cos(this.yaw) * Math.min(this.speed * 0.22, 0.7);
      }
    }

    if (!this._posInit) {
      this._camPos.copy(_desired);
      this._posInit = true;
    } else {
      const kp = reduce ? 26 : 17;
      this._camPos.x = damp(this._camPos.x, _desired.x, kp, dt);
      this._camPos.y = damp(this._camPos.y, _desired.y, kp, dt);
      this._camPos.z = damp(this._camPos.z, _desired.z, kp, dt);
    }

    if (this.mode !== 'cinematic') this._fovTarget = this.mode === 'first' ? 66 : FOV_BASE;
    this._fovK = 3.5;
  }

  /** The dressing-room turntable: a slow 3 m orbit, drag to spin. */
  _solveAvatar(ctx, dt, st) {
    const reduce = !!st.reduceMotion;
    if (this._lookIdle > 0.8 && !reduce) this.yawTarget = wrapAngle(this.yawTarget + AVATAR_SPIN * dt);
    this.yaw = wrapAngle(dampAngle(this.yaw, this.yawTarget, 7, dt));
    this.pitch = damp(this.pitch, clamp(this.pitchTarget, -10 * DEG, 30 * DEG), 7, dt);
    this.dist = damp(this.dist, AVATAR_DIST, 5, dt);

    _tmpC.set(this._rawPos.x, this._rawPos.y + 1.0, this._rawPos.z);
    this._orbitInto(_desired, _tmpC, this.yaw, this.pitch, this.dist);
    this._camPos.x = damp(this._camPos.x, _desired.x, 14, dt);
    this._camPos.y = damp(this._camPos.y, _desired.y, 14, dt);
    this._camPos.z = damp(this._camPos.z, _desired.z, 14, dt);
    this._camLook.copy(_tmpC);
    this._camLook.y -= 0.05;
    this._fovTarget = 42;
    this._fovK = 3;
  }

  /** A high, fixed plate the full-screen map sits in front of. */
  _solveMap(ctx, dt) {
    this.yaw = wrapAngle(dampAngle(this.yaw, this.yawTarget, 5, dt));
    _tmpC.copy(this.focus);
    this._orbitInto(_desired, _tmpC, this.yaw, MAP_PITCH, MAP_DIST);
    this._camPos.x = damp(this._camPos.x, _desired.x, 4, dt);
    this._camPos.y = damp(this._camPos.y, _desired.y, 4, dt);
    this._camPos.z = damp(this._camPos.z, _desired.z, 4, dt);
    this._camLook.copy(_tmpC);
    this._fovTarget = FOV_BASE;
    this._fovK = 3;
  }

  _solveCinematic(dt, st) {
    if (this._cineDur > 0) this._cineT += dt / this._cineDur;
    else this._cineT = 1;
    const raw = clamp01(this._cineT);
    const e = smootherstep(raw);

    if (raw < 1) {
      this._camPos.lerpVectors(this._cineFrom, this._cineTo, e);
      this._camQuat.copy(this._cineFromQ).slerp(this._cineToQ, e);
      this._cineHold.copy(this._camPos);
    } else {
      // The shot keeps breathing after it lands: a barely-there push-in.
      this._cineHold.x = damp(this._cineHold.x, this._cineCreep.x, 0.22, dt);
      this._cineHold.y = damp(this._cineHold.y, this._cineCreep.y, 0.22, dt);
      this._cineHold.z = damp(this._cineHold.z, this._cineCreep.z, 0.22, dt);
      this._camPos.copy(this._cineHold);
      this._camQuat.copy(this._cineToQ);
      if (!this._cineSettled) {
        this._cineSettled = true;
        this._settleCine();
      }
    }
    this._hasQuat = true;
    this._fovTarget = st.reduceMotion ? this._cineFov0 : lerp(this._cineFov0, this._cineFov1, e);
    this._fovK = 9;
  }

  _solveIntro(ctx, dt, st) {
    this._introT += (dt * this._introRate) / this._introDur;
    const raw = clamp01(this._introT);
    const e = smootherstep(raw);

    this._introPos.getPoint(e, _tmpA);
    this._introLook.getPoint(e, _tmpB);

    const world = ctx.world;
    if (world && world.groundHeight) {
      const g = world.groundHeight(_tmpA.x, _tmpA.z) + 2.5;
      if (_tmpA.y < g) _tmpA.y = g;
    }

    // Cross-fade into the live follow rig over the last fifth.
    const w = smoothstep((raw - 0.80) / 0.20);
    _tmpC.copy(this._camPos);
    _tmpD.copy(this._camLook);
    this._camPos.lerpVectors(_tmpA, _tmpC, w);
    this._camLook.lerpVectors(_tmpB, _tmpD, w);
    this._hasQuat = false;

    this._fovTarget = st.reduceMotion ? FOV_BASE : lerp(FOV_INTRO, FOV_BASE, smoothstep(raw));
    this._fovK = 6;

    if (raw >= 1) {
      this._introPos = null;
      this._introLook = null;
      this.mode = 'follow';
      this._settleIntro();
    }
  }

  _solveReturn(dt) {
    this._returnT += dt / this._returnDur;
    const e = smootherstep(clamp01(this._returnT));
    _tmpC.copy(this._camPos);
    this._camPos.lerpVectors(this._returnFrom, _tmpC, e);
    if (!this._hasQuat) {
      _m.lookAt(_tmpC, this._camLook, _UP);
      _q.setFromRotationMatrix(_m);
    } else {
      _q.copy(this._camQuat);
    }
    this._camQuat.copy(this._returnFromQ).slerp(_q, e);
    this._hasQuat = true;
  }

  /* ---------------------------------------------------------------- *
   * Commit
   * ---------------------------------------------------------------- */

  _commit(ctx, dt, st) {
    const cam = this.camera;
    if (!cam) return;

    // Never let the rig dip under the street.
    const world = ctx.world;
    if (world && world.groundHeight) {
      const g = world.groundHeight(this._camPos.x, this._camPos.z) + 0.45;
      if (this._camPos.y < g) this._camPos.y = g;
    }

    if (this._hasQuat) {
      _q.copy(this._camQuat);
    } else {
      _m.lookAt(this._camPos, this._camLook, _UP);
      _q.setFromRotationMatrix(_m);
    }

    if (this._shakeLeft > 0 && !st.reduceMotion) {
      this._shakeLeft -= dt;
      const k = clamp01(this._shakeLeft / this._shakeDur);
      const a = this._shakeAmp * k * k;
      const t = this._time;
      const ox = Math.sin(t * 23.3) * 0.6 + Math.sin(t * 41.7) * 0.4;
      const oy = Math.sin(t * 19.1 + 1.7) * 0.6 + Math.sin(t * 37.3 + 0.6) * 0.4;
      _tmpA.copy(_XAXIS).applyQuaternion(_q);
      _tmpB.copy(_YAXIS).applyQuaternion(_q);
      this._camPos.addScaledVector(_tmpA, a * ox * 0.14);
      this._camPos.addScaledVector(_tmpB, a * oy * 0.11);
      _qRoll.setFromAxisAngle(_ZAXIS, a * 0.022 * Math.sin(t * 13.7));
      _q.multiply(_qRoll);
      if (this._shakeLeft <= 0) this._shakeAmp = 0;
    } else if (this._shakeLeft > 0) {
      this._shakeLeft = 0;
      this._shakeAmp = 0;
    }

    cam.position.copy(this._camPos);
    cam.quaternion.copy(_q);
  }

  _applyFov(dt, st) {
    const cam = this.camera;
    if (!cam || typeof cam.fov !== 'number') return;
    let target = this._fovTarget;
    if (!st.reduceMotion && this.mode === 'follow') {
      // A couple of degrees of widening at a jog. Any more reads as a game.
      target += clamp(this.speed - this.walkSpeed * 1.15, 0, 3.2) * 0.85;
    }
    this.fov = damp(this.fov, target, this._fovK, dt);
    if (Math.abs(cam.fov - this.fov) > 0.02) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }

  /* ---------------------------------------------------------------- *
   * Geometry helpers
   * ---------------------------------------------------------------- */

  /** Place `out` on the orbit sphere around `pivot`. Positive pitch = above. */
  _orbitInto(out, pivot, yaw, pitch, dist) {
    const h = Math.cos(pitch) * dist;
    return out.set(
      pivot.x - Math.sin(yaw) * h,
      pivot.y + EYE_RISE + Math.sin(pitch) * dist,
      pivot.z - Math.cos(yaw) * h,
    );
  }

  /**
   * Two-shot composition. Searches a small set of camera placements for the
   * one whose angular separation puts the player on the left third and the
   * deity on the right third, preferring placements with a clear line.
   */
  _solveFraming(ctx, target, opts) {
    const cam = this.camera;
    const world = ctx.world;
    const aspect = cam && cam.aspect ? cam.aspect : 1.6;
    const fov = opts.fov || FOV_CINEMA;
    const tanH = Math.tan(fov * 0.5 * DEG) * aspect;
    const wantSep = 2 * Math.atan(0.33 * tanH);

    _tmpA.copy(this.focus);
    _tmpA.y += 0.15;                                   // the player's chest
    _dir.set(target.x - _tmpA.x, 0, target.z - _tmpA.z);
    const span = _dir.length();
    if (span < 0.35) forwardInto(_dir, this.yaw, 0).setY(0).normalize();
    else _dir.multiplyScalar(1 / span);
    _right.set(-_dir.z, 0, _dir.x);                    // screen-right when facing `_dir`

    const camH = typeof opts.height === 'number' ? opts.height : 1.72;
    const overShoulder = opts.framing === 'over';
    const backs = [2.6, 3.5, 4.6, 6.0];
    const laterals = overShoulder ? [0.55, 0.9] : [-3.4, -2.4, -1.6, -1.0, -0.5, 0.5, 1.0, 1.6, 2.4, 3.4];

    let bestScore = Infinity;
    let bestYaw = this.yaw;
    this._cineTo.copy(this.camera.position);

    for (let bi = 0; bi < backs.length; bi++) {
      const back = backs[bi] * (opts.distance ? opts.distance / 3.5 : 1);
      for (let li = 0; li < laterals.length; li++) {
        const L = laterals[li];
        const cx = _tmpA.x - _dir.x * back + _right.x * L;
        const cz = _tmpA.z - _dir.z * back + _right.z * L;
        let cy = _tmpA.y + camH - PIVOT_H + 0.55;
        if (world && world.groundHeight) cy = Math.max(cy, world.groundHeight(cx, cz) + 1.35);

        const aP = Math.atan2(_tmpA.x - cx, _tmpA.z - cz);
        const aT = Math.atan2(target.x - cx, target.z - cz);
        const sep = angleDelta(aT, aP);            // positive = player left, target right

        let score = Math.abs(sep - (overShoulder ? wantSep * 0.45 : wantSep)) * 3;
        if (sep <= 0.02) score += 4;               // wrong side of the axis
        score += Math.abs(L) * 0.05 + Math.abs(back - 3.5) * 0.04;

        if (world && world.collideRay) {
          _tmpB.set(cx, cy, cz);
          _head.copy(this.focus);
          const f = world.collideRay(_head, _tmpB, COLLIDE_RADIUS);
          if (typeof f === 'number' && isFinite(f) && f < 0.98) score += (1 - f) * 6;
        }

        if (score < bestScore) {
          bestScore = score;
          bestYaw = wrapAngle(aP - (sep > 0 ? wantSep * 0.5 : -wantSep * 0.5));
          this._cineTo.set(cx, cy, cz);
        }
      }
    }

    // Aim: between the two subjects, then a few degrees down — the look of
    // someone standing before the altar rather than staring at it.
    _tmpB.set(
      lerp(_tmpA.x, target.x, 0.55),
      lerp(_tmpA.y + 0.1, target.y, 0.55),
      lerp(_tmpA.z, target.z, 0.55),
    );
    const dxz = Math.hypot(_tmpB.x - this._cineTo.x, _tmpB.z - this._cineTo.z) || 1;
    const elev = Math.atan2(_tmpB.y - this._cineTo.y, dxz) - 3 * DEG;
    forwardInto(_tmpC, bestYaw, -elev);
    _tmpD.copy(this._cineTo).addScaledVector(_tmpC, Math.max(4, dxz));
    _m.lookAt(this._cineTo, _tmpD, _UP);
    this._cineToQ.setFromRotationMatrix(_m);

    // Where the hold creeps to: a touch closer along the view axis.
    this._cineCreep.copy(this._cineTo).addScaledVector(_tmpC, 0.42);
  }

  /* ---------------------------------------------------------------- *
   * Promise bookkeeping — nothing is ever left pending
   * ---------------------------------------------------------------- */

  _settleCine() {
    const r = this._cineResolve;
    this._cineResolve = null;
    if (r) r();
  }

  _settleIntro() {
    const r = this._introResolve;
    this._introResolve = null;
    this._introPos = null;
    this._introLook = null;
    if (r) r();
  }

  dispose() {
    for (const off of this._offs) { try { off(); } catch { /* already gone */ } }
    this._offs.length = 0;
    this._settleCine();
    this._settleIntro();
  }
}

export default CameraRig;
