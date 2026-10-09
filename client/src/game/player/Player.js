/**
 * Player — the avatar rig, its animation, and locomotion.
 *
 * The rig is a real bone hierarchy built from primitives, not a single mesh.
 * That matters more than the geometry: when this ports to Unity the meshes are
 * replaced by a rigged humanoid and the animation code below maps onto an
 * Animator with a locomotion blend tree and a masked action layer, because the
 * joints are already named and parented the same way.
 *
 * Animation is always blended. Every pose is a set of target rotations that the
 * current rotations damp toward, so nothing ever snaps — including when an
 * action is cancelled halfway through a bow.
 */

import * as THREE from 'three';
import { SAVE } from '../../content/tuning.js';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { damp, dampAngle, clamp, clamp01, lerp, smoothstep, TAU } from '../../engine/math/MathUtils.js';
import { CancelToken, CancelledError } from '../../engine/core/Lifecycle.js';

const WALK_SPEED = 1.5;
const RUN_SPEED = 3.6;
const RADIUS = 0.42;
const TURN_RATE = 2.1;      // radians per second on the D-pad
const EYE = 1.62;

/** How far the root sinks into water, in metres — a wade, never a swim. */
const WADE = 0.6;

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _padF = new THREE.Vector3();
const _padR = new THREE.Vector3();
const _padDir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);
const _mat = new THREE.Matrix4();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _localT = new THREE.Vector3();
const BONE_DOWN = new THREE.Vector3(0, -1, 0);
const UPPER_ARM_LEN = 0.28;
const FOREARM_LEN = 0.26;

/* ================================================================
 * Poses — each is { bone: [x, y, z] } in radians. Absent bones rest at zero.
 * ================================================================ */
const POSES = {
  idle: {
    spine: [0.02, 0, 0], chest: [0.01, 0, 0],
    upperArmL: [0, 0, 0.055], upperArmR: [0, 0, -0.055],
    forearmL: [-0.16, 0, 0], forearmR: [-0.16, 0, 0],
  },
  namaste: {
    spine: [0.09, 0, 0], head: [0.16, 0, 0],
    upperArmL: [-0.72, 0, 0.66], upperArmR: [-0.72, 0, -0.66],
    forearmL: [-1.5, 0, -0.3], forearmR: [-1.5, 0, 0.3],
  },
  pranamDeep: {
    hips: [0.12, 0, 0], spine: [0.42, 0, 0], chest: [0.18, 0, 0], head: [0.2, 0, 0],
    upperArmL: [-0.78, 0, 0.6], upperArmR: [-0.78, 0, -0.6],
    forearmL: [-1.45, 0, -0.28], forearmR: [-1.45, 0, 0.28],
    thighL: [0.06, 0, 0], thighR: [0.06, 0, 0],
  },
  reach: {
    spine: [0.34, 0, 0], head: [0.28, 0, 0],
    upperArmR: [-1.28, 0, -0.18], forearmR: [-0.42, 0, 0],
    upperArmL: [0.12, 0, 0.2], forearmL: [-0.3, 0, 0],
    thighL: [0.3, 0, 0], thighR: [0.3, 0, 0], shinL: [-0.5, 0, 0], shinR: [-0.5, 0, 0],
  },
  offerLow: {
    spine: [0.16, 0, 0], head: [0.12, 0, 0],
    upperArmL: [-0.66, 0, 0.42], upperArmR: [-0.66, 0, -0.42],
    forearmL: [-1.2, 0, -0.2], forearmR: [-1.2, 0, 0.2],
  },
  offerHigh: {
    spine: [0.2, 0, 0], head: [-0.1, 0, 0],
    upperArmL: [-1.72, 0, 0.3], upperArmR: [-1.72, 0, -0.3],
    forearmL: [-0.5, 0, -0.1], forearmR: [-0.5, 0, 0.1],
  },
  sit: {
    hips: [0, 0, 0], spine: [0.06, 0, 0],
    thighL: [-1.5, 0, 0.5], thighR: [-1.5, 0, -0.5],
    shinL: [1.6, 0, 0], shinR: [1.6, 0, 0],
    upperArmL: [0.2, 0, 0.3], upperArmR: [0.2, 0, -0.3],
  },

  /*
   * DANDVAT PRANAM — the full prostration.
   *
   * `danda` is a stick, and that is the whole instruction: you go down flat and
   * straight, face to the ground, arms stretched out past the head toward the
   * Deity. It is a different act from the standing pranam already here, not a
   * deeper version of it, which is why it gets its own poses rather than a
   * larger number in `pranamDeep`.
   *
   * `_drop` is how far the hips come DOWN, in metres. Every other pose in this
   * file is bone rotations only, because every other pose happens standing up
   * — and rotating the hips ninety degrees without lowering them leaves the
   * avatar folded in the air with its feet still on the floor. Blended
   * alongside the rotations; see `_updateAction`.
   */
  kneel: {
    _drop: 0.44,
    hips: [0.10, 0, 0], spine: [0.10, 0, 0], head: [0.10, 0, 0],
    thighL: [-1.55, 0, 0.12], thighR: [-1.55, 0, -0.12],
    shinL: [2.30, 0, 0], shinR: [2.30, 0, 0],
    upperArmL: [-0.72, 0, 0.60], upperArmR: [-0.72, 0, -0.60],
    forearmL: [-1.45, 0, -0.28], forearmR: [-1.45, 0, 0.28],
  },
  dandvat: {
    _drop: 0.82,
    // the hips carry the whole torso down to horizontal; the legs counter-turn
    // so they lie straight back along the ground rather than folding with it
    hips: [1.42, 0, 0], spine: [0.10, 0, 0], chest: [0.06, 0, 0], head: [-0.34, 0, 0],
    upperArmL: [-2.85, 0, 0.16], upperArmR: [-2.85, 0, -0.16],
    forearmL: [-0.14, 0, -0.06], forearmR: [-0.14, 0, 0.06],
    thighL: [-1.40, 0, 0.06], thighR: [-1.40, 0, -0.06],
    shinL: [0.06, 0, 0], shinR: [0.06, 0, 0],
  },
};

/** Keyframe timelines for the action animations. */
const TIMELINES = {
  pranam: [
    { t: 0.00, pose: 'idle' },
    { t: 0.22, pose: 'namaste' },
    { t: 0.48, pose: 'pranamDeep' },
    { t: 0.74, pose: 'pranamDeep', hold: true },
    { t: 0.90, pose: 'namaste' },
    { t: 1.00, pose: 'idle' },
  ],
  namaste: [
    { t: 0.00, pose: 'idle' },
    { t: 0.3, pose: 'namaste' },
    { t: 0.75, pose: 'namaste', hold: true },
    { t: 1.0, pose: 'idle' },
  ],
  /*
   * Down through the knees rather than straight to the floor, because that is
   * how a body does it, and held at the bottom for nearly a third of the
   * action. The hold is the point: a prostration that snaps back up is a
   * gesture, and this is not meant to be a gesture.
   */
  dandvat: [
    { t: 0.00, pose: 'idle' },
    { t: 0.13, pose: 'namaste' },
    { t: 0.33, pose: 'kneel' },
    { t: 0.49, pose: 'dandvat' },
    { t: 0.77, pose: 'dandvat', hold: true },
    { t: 0.88, pose: 'kneel' },
    { t: 0.96, pose: 'namaste' },
    { t: 1.00, pose: 'idle' },
  ],
  pluck: [
    { t: 0.00, pose: 'idle' },
    { t: 0.35, pose: 'reach', grab: true },
    { t: 0.62, pose: 'reach' },
    { t: 1.00, pose: 'idle' },
  ],
  offer: [
    { t: 0.00, pose: 'idle' },
    { t: 0.24, pose: 'offerLow' },
    { t: 0.54, pose: 'offerHigh', release: true },
    { t: 0.72, pose: 'offerHigh', hold: true },
    { t: 0.88, pose: 'offerLow' },
    { t: 1.00, pose: 'idle' },
  ],
  sit: [
    { t: 0.00, pose: 'idle' },
    { t: 0.45, pose: 'sit' },
    { t: 1.00, pose: 'sit', hold: true },
  ],
};

/**
 * A jump larger than this in one frame is a placement, not a step. Generous
 * enough that a slow frame on a phone at running pace never trips it.
 */
const TELEPORT_M = SAVE.teleportMetres;

const DURATIONS = {
  pranam: 4200, namaste: 2000, pluck: 2200, offer: 4600, sit: 1400,
  // long, deliberately. See the `dandvat` timeline.
  dandvat: 7000,
};

/* ================================================================ */

export class Player {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = new THREE.Group();
    this.root.name = 'Player';
    ctx.scene.add(this.root);

    this.bones = {};
    this._buildRig();
    this.setAppearance(ctx.state.avatar);

    this._vel = new THREE.Vector3();
    this._speed = 0;
    this._yaw = 0;
    this._targetYaw = 0;
    this._phase = 0;
    this._footL = false;
    this._busy = false;
    this._token = null;
    this._action = null;
    this._blend = {};
    this._navPath = null;
    this._navIndex = 0;
    this._lastEmit = new THREE.Vector3();
    this._breath = 0;
    this._standY = null;        // the ground under the feet — see _feet()

    this.carried = null;

    // Analytic two-bone IK, used by the pluck gesture so the hand physically
    // reaches the flower instead of playing a canned reach animation.
    this._ikTarget = null;
    this._ikWeight = 0;
    this._ikSide = 'R';
  }

  /* ---------------- rig ---------------- */

  _buildRig() {
    const bone = (name, parent, x, y, z) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, y, z);
      parent.add(g);
      this.bones[name] = g;
      g.userData.rest = g.rotation.clone();
      return g;
    };

    const hips = bone('hips', this.root, 0, 0.92, 0);
    const spine = bone('spine', hips, 0, 0.16, 0);
    const chest = bone('chest', spine, 0, 0.26, 0);
    const neck = bone('neck', chest, 0, 0.24, 0);
    bone('head', neck, 0, 0.1, 0);

    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      const sh = bone(`shoulder${side}`, chest, s * 0.155, 0.17, 0);
      const ua = bone(`upperArm${side}`, sh, s * 0.035, -0.02, 0);
      const fa = bone(`forearm${side}`, ua, 0, -0.28, 0);
      bone(`hand${side}`, fa, 0, -0.26, 0);

      const th = bone(`thigh${side}`, hips, s * 0.1, -0.06, 0);
      const sn = bone(`shin${side}`, th, 0, -0.42, 0);
      bone(`foot${side}`, sn, 0, -0.4, 0);
    }
  }

  setAppearance(a) {
    const opts = this.ctx.data.AVATAR_OPTIONS;
    const skin = opts.skin[a.skin % opts.skin.length];
    const cloth = opts.clothColor[a.clothColor % opts.clothColor.length];
    const hairStyle = opts.hair[a.hair % opts.hair.length].id;
    const clothStyle = opts.cloth[a.cloth % opts.cloth.length].id;
    const accessory = opts.accessory[a.accessory % opts.accessory.length].id;

    // clear previous skin meshes, keep the bone hierarchy
    for (const name of Object.keys(this.bones)) {
      const b = this.bones[name];
      for (let i = b.children.length - 1; i >= 0; i--) {
        if (b.children[i].isMesh) { b.children[i].geometry.dispose(); b.remove(b.children[i]); }
      }
    }

    const attach = (boneName, build) => {
      const b = new MeshBuilder();
      build(b);
      if (b.isEmpty) return;
      const mesh = b.toMesh(`avatar-${boneName}`, {
        castShadow: !!this.ctx.quality.shadows, receiveShadow: true,
      });
      mesh.matrixAutoUpdate = true;
      this.bones[boneName].add(mesh);
    };

    const isSari = clothStyle === 'sari';
    const isSalwar = clothStyle === 'salwar';
    const isShirt = clothStyle === 'shirt';
    const legColor = isShirt ? 0x3a4050 : (isSari || isSalwar) ? cloth : 0xefe8d8;
    const shoe = 0x3a2b20;
    const dark = (hex, f) => {
      const c = new THREE.Color(hex);
      c.multiplyScalar(f);
      return c.getHex();
    };

    // HIPS — pelvis tapering up into the waist, plus the lower garment
    attach('hips', (b) => {
      b.prism(0, -0.14, 0, 0.30, 0.19, 0.26, 0.17, 0.30, cloth);
      if (isSari) {
        b.prism(0, -0.72, 0, 0.40, 0.29, 0.31, 0.22, 0.62, cloth);       // drape to the ankle
        b.prism(0, -0.80, 0, 0.44, 0.31, 0.40, 0.29, 0.10, dark(cloth, 0.85));
      } else if (clothStyle === 'kurta-dhoti') {
        b.prism(0, -0.52, 0, 0.38, 0.28, 0.30, 0.22, 0.42, cloth);
      }
    });

    // CHEST — broad at the shoulders, narrow at the waist. This single taper is
    // most of what separates a person from a stack of blocks.
    attach('chest', (b) => {
      b.prism(0, -0.26, 0, 0.27, 0.17, 0.38, 0.22, 0.34, cloth);          // waist -> ribcage
      b.prism(0, 0.06, 0, 0.38, 0.22, 0.40, 0.21, 0.18, cloth);           // shoulder shelf
      b.prism(0, 0.24, 0, 0.17, 0.16, 0.15, 0.14, 0.09, skin);            // neck
      if (isSari) b.prism(0.10, -0.20, 0.02, 0.13, 0.24, 0.11, 0.20, 0.50, dark(cloth, 0.92));
      if (isShirt) b.prism(0, 0.06, 0.10, 0.20, 0.04, 0.18, 0.04, 0.14, 0xf2ece0);   // collar
      if (accessory === 'mala') {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI - Math.PI / 2;
          b.box(Math.sin(a) * 0.10, 0.02 - Math.abs(Math.cos(a)) * 0.05, 0.10 + Math.cos(a) * 0.02,
            0.028, 0.028, 0.028, 0x8a5a2a);
        }
      }
      if (accessory === 'shawl') b.prism(0, -0.08, 0, 0.42, 0.26, 0.44, 0.27, 0.42, 0xf6f2e8);
      if (accessory === 'bag') {
        b.box(-0.21, -0.20, 0.05, 0.17, 0.22, 0.10, 0x8a6a42);
        b.prism(-0.10, 0.02, 0.02, 0.05, 0.12, 0.05, 0.12, 0.22, 0x6a5232, 0.5);
      }
    });

    // HEAD — rounded, taller than wide, with a real face plate
    attach('head', (b) => {
      b.bevelBox(0, -0.02, 0, 0.19, 0.25, 0.20, skin, 0, 0.3);
      b.prism(0, -0.04, 0.085, 0.16, 0.04, 0.15, 0.04, 0.16, dark(skin, 1.03));   // face
      b.box(-0.042, 0.06, 0.098, 0.036, 0.022, 0.012, 0xf6f2e8);                  // eyes
      b.box(0.042, 0.06, 0.098, 0.036, 0.022, 0.012, 0xf6f2e8);
      b.box(-0.042, 0.062, 0.104, 0.017, 0.017, 0.008, 0x2b1d14);
      b.box(0.042, 0.062, 0.104, 0.017, 0.017, 0.008, 0x2b1d14);
      b.box(-0.045, 0.092, 0.098, 0.042, 0.010, 0.010, 0x2b1d14);                 // brows
      b.box(0.045, 0.092, 0.098, 0.042, 0.010, 0.010, 0x2b1d14);
      b.prism(0, 0.03, 0.098, 0.035, 0.03, 0.026, 0.05, 0.05, dark(skin, 0.97));  // nose
      b.box(0, -0.01, 0.100, 0.052, 0.012, 0.010, 0x8a4a3a);                      // mouth
      b.prism(-0.098, 0.03, 0, 0.03, 0.07, 0.025, 0.06, 0.07, skin);              // ears
      b.prism(0.098, 0.03, 0, 0.03, 0.07, 0.025, 0.06, 0.07, skin);
      if (accessory === 'tilak') {
        b.box(0, 0.125, 0.099, 0.020, 0.055, 0.008, 0xe8dcc0);
        b.box(0, 0.105, 0.100, 0.010, 0.030, 0.008, 0xc8452a);
      }

      const hairC = 0x241a12;
      if (hairStyle === 'short') {
        b.bevelBox(0, 0.10, -0.005, 0.20, 0.10, 0.21, hairC, 0, 0.35);
        b.box(0, 0.05, -0.098, 0.19, 0.11, 0.02, hairC);
      } else if (hairStyle === 'tied') {
        b.bevelBox(0, 0.10, -0.005, 0.20, 0.10, 0.21, hairC, 0, 0.35);
        b.prism(0, 0.00, -0.12, 0.10, 0.08, 0.13, 0.11, 0.13, hairC);
      } else if (hairStyle === 'long') {
        b.bevelBox(0, 0.10, -0.005, 0.20, 0.10, 0.21, hairC, 0, 0.35);
        b.prism(0, -0.30, -0.075, 0.21, 0.09, 0.20, 0.07, 0.42, hairC);
      } else {
        b.prism(0, 0.10, -0.06, 0.05, 0.05, 0.035, 0.035, 0.09, hairC);           // sikha
      }
    });

    // LIMBS — every segment tapers toward the joint below it
    for (const side of ['L', 'R']) {
      const sleeve = (isSari || clothStyle === 'kurta-dhoti' || clothStyle === 'kurta-pyjama');
      attach('upperArm' + side, (b) => {
        b.prism(0, -0.30, 0, 0.085, 0.085, 0.115, 0.115, 0.30, sleeve ? cloth : skin);
        b.bevelBox(0, -0.055, 0, 0.145, 0.13, 0.135, sleeve ? cloth : skin, 0, 0.35);  // deltoid, overlapping the shoulder
      });
      attach('forearm' + side, (b) => {
        b.prism(0, -0.27, 0, 0.068, 0.068, 0.092, 0.092, 0.27, skin);
      });
      attach('hand' + side, (b) => {
        b.prism(0, -0.11, 0, 0.055, 0.035, 0.078, 0.048, 0.11, skin);
        b.box(0.035, -0.055, 0, 0.026, 0.055, 0.04, skin);                          // thumb
      });
      attach('thigh' + side, (b) => {
        b.prism(0, -0.44, 0, 0.105, 0.105, 0.145, 0.145, 0.44, legColor);
      });
      attach('shin' + side, (b) => {
        b.prism(0, -0.42, 0, 0.078, 0.082, 0.115, 0.115, 0.42, legColor);
      });
      attach('foot' + side, (b) => {
        b.prism(0, -0.045, 0.045, 0.098, 0.24, 0.105, 0.20, 0.075, shoe);
        b.prism(0, 0.03, 0.01, 0.10, 0.13, 0.095, 0.11, 0.06, dark(shoe, 1.25));
      });
    }
  }

  /* ---------------- accessors ---------------- */

  get position() { return this.root.position; }
  get yaw() { return this._yaw; }
  get isBusy() { return this._busy; }
  get speed() { return this._speed; }
  setYaw(y) { this._yaw = y; this._targetYaw = y; this.root.rotation.y = y; }
  setVisible(v) { this.root.visible = v; }

  /* ---------------- flower carrying ---------------- */

  giveFlower(kind) {
    this.takeFlower();
    const info = this.ctx.data.FLOWER_KINDS[kind];
    const b = new MeshBuilder();
    b.box(0, 0, 0, 0.04, 0.16, 0.04, 0x4f7a3a);
    b.box(0, 0.17, 0, 0.11, 0.11, 0.11, info ? info.color : 0xf5a623);
    const mesh = b.toMesh('carried-flower', {});
    mesh.matrixAutoUpdate = true;
    mesh.position.set(0, -0.1, 0.06);
    this.bones.handR.add(mesh);
    this.carried = { kind, mesh };
    return mesh;
  }

  takeFlower() {
    if (!this.carried) return null;
    const { mesh } = this.carried;
    mesh.getWorldPosition(_v);
    this.bones.handR.remove(mesh);
    mesh.position.copy(_v);
    mesh.matrixAutoUpdate = true;
    const out = this.carried;
    this.carried = null;
    return { ...out, mesh };
  }

  /* ---------------- actions ---------------- */

  /** Play a named action. Resolves when it finishes; rejects if cancelled. */
  playAction(name) {
    const timeline = TIMELINES[name];
    if (!timeline) return Promise.resolve();
    this.cancelAction();

    const token = new CancelToken();
    this._token = token;
    this._busy = true;

    return new Promise((resolve, reject) => {
      this._action = {
        name, timeline, token, resolve, reject,
        t: 0,
        duration: (DURATIONS[name] || 2000) / 1000,
        fired: {},
      };
      token.onCancel(() => {
        this._action = null;
        this._busy = false;
        reject(new CancelledError());
      });
    });
  }

  cancelAction() {
    if (this._token) { const t = this._token; this._token = null; t.cancel(); }
    this._action = null;
    this._busy = false;
    // interrupt a dandvat halfway and you stand back up, rather than walking
    // the rest of Braj with your hips eighty centimetres into the road
    this._hipDrop = 0;
  }

  /** Smoothly turn to face a world position. */
  faceTowards(worldPos, dur = 0.5) {
    _v.subVectors(worldPos, this.root.position);
    this._targetYaw = Math.atan2(_v.x, _v.z);
    const token = new CancelToken();
    return new Promise((resolve) => {
      const start = performance.now();
      const step = () => {
        if (token.cancelled) return resolve();
        const t = (performance.now() - start) / (dur * 1000);
        if (t >= 1) return resolve();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /** Walk to a world point along the road graph. Resolves on arrival. */
  async walkTo(x, z) {
    const nav = this.ctx.nav;
    const p = this.root.position;
    this._navPath = nav ? nav.path(p.x, p.z, x, z) : [[x, z]];
    this._navIndex = 0;
    if (!this._navPath) return;
    return new Promise((resolve) => { this._navResolve = resolve; });
  }

  /* ---------------- arm IK ---------------- */

  /**
   * Drive a hand to a world position. `weight` 0..1 blends it against whatever
   * the animation layer is doing, so the arm eases in and out of the reach.
   */
  setHandTarget(worldPos, weight = 1, side = 'R') {
    if (!worldPos) { this._ikTarget = null; return; }
    if (!this._ikTargetVec) this._ikTargetVec = new THREE.Vector3();
    this._ikTargetVec.copy(worldPos);
    this._ikTarget = this._ikTargetVec;
    this._ikWeight = clamp01(weight);
    this._ikSide = side;
  }

  clearHandTarget() { this._ikTarget = null; }

  /** World position of a hand, for gesture hit-testing. */
  handPosition(side = 'R', out = new THREE.Vector3()) {
    this.bones['hand' + side].getWorldPosition(out);
    return out;
  }

  _solveArmIK(dt) {
    const w = this._ikTarget ? this._ikWeight : 0;
    this._ikBlend = damp(this._ikBlend || 0, w, 10, dt);
    if (this._ikBlend < 0.01 || !this._ikTarget) return;

    const side = this._ikSide;
    const ua = this.bones['upperArm' + side];
    const fa = this.bones['forearm' + side];
    if (!ua || !fa) return;

    // target into the upper arm's parent frame, relative to the shoulder joint
    ua.parent.updateWorldMatrix(true, false);
    _mat.copy(ua.parent.matrixWorld).invert();
    _localT.copy(this._ikTarget).applyMatrix4(_mat).sub(ua.position);

    let d = _localT.length();
    const reach = (UPPER_ARM_LEN + FOREARM_LEN) * 0.985;
    if (d > reach) { _localT.multiplyScalar(reach / d); d = reach; }
    if (d < 0.04) return;
    _localT.divideScalar(d);                       // now a unit direction

    // law of cosines for the shoulder lift and the elbow bend
    const L1 = UPPER_ARM_LEN, L2 = FOREARM_LEN;
    const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const cosB = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
    const A = Math.acos(cosA);
    const B = Math.acos(cosB);

    // point the bone's local -Y down the target direction, then lift by A about
    // an axis chosen so the elbow folds backward like a real arm
    _q1.setFromUnitVectors(BONE_DOWN, _localT);
    _pole.set(side === 'R' ? -1 : 1, 0, -0.55).normalize();
    _axis.crossVectors(_localT, _pole);
    if (_axis.lengthSq() < 1e-4) _axis.set(1, 0, 0);
    _axis.normalize();
    _q2.setFromAxisAngle(_axis, -A);
    _q2.multiply(_q1);

    ua.quaternion.slerp(_q2, this._ikBlend);

    // the elbow bends about the same axis, expressed in the upper arm's frame
    _axis.applyQuaternion(_q1.copy(ua.quaternion).invert());
    _q2.setFromAxisAngle(_axis.normalize(), Math.PI - B);
    fa.quaternion.slerp(_q2, this._ikBlend);
  }

  /* ---------------- frame ---------------- */

  /**
   * Stop the avatar walking while something else is moving it.
   *
   * Input stays enabled through a rickshaw ride so the camera is still yours,
   * and the Player runs before the rickshaw in the sub-step — so it walked the
   * avatar off the seat every frame and the rickshaw quietly teleported it
   * back. That worked by accident of ordering. It stops working the moment the
   * stick means steering rather than walking, so a system that is carrying the
   * player says so instead.
   */
  setFrozen(v) {
    this.frozen = !!v;
    if (this.frozen) { this._speed = 0; this._vel.set(0, 0, 0); this._navPath = null; }
  }

  update(dt, ctx) {
    this._updateAction(dt);
    if (!this._busy && !this.frozen) this._updateMovement(dt, ctx);
    this._updateAnimation(dt);
    this._solveArmIK(dt);
    this._applyGround(ctx, dt);

    // Distance travelled, reported once the player has actually moved.
    //
    // A single frame's step is bounded by the run speed, so anything far larger
    // is not a step at all — it is a placement: restoring a saved position on
    // load, stepping out of a rickshaw, entering a temple. Counting those as
    // walking inflated the journey total by the distance from the spawn to
    // wherever you had saved, every single time you came back. The jump still
    // moves you; it just is not walking, and the rickshaw counts its own
    // metres itself while it drives.
    const d = this.root.position.distanceTo(this._lastEmit);
    if (d > TELEPORT_M) {
      this._lastEmit.copy(this.root.position);
    } else if (d > 0.01) {
      ctx.bus.emit('player:moved', { pos: this.root.position, delta: d });
      this._lastEmit.copy(this.root.position);
    }
  }

  _updateAction(dt) {
    const a = this._action;
    if (!a) return;
    a.t += dt / a.duration;

    /*
     * A timeline that ENDS on a hold stays where it ended until something
     * cancels it. Sitting down is the one there is, and nothing honoured its
     * hold: 1.4 s into every ride the passenger stood back up, with a head
     * through the canopy for the rest of the journey — under a time-lapse of
     * x5, a third of a second in. The promise still resolves on time, for
     * anyone waiting on the sitting-down; getting out cancels it, and with it
     * the pose, as every way out of a vehicle already does.
     */
    const last = a.timeline[a.timeline.length - 1];
    if (a.t >= 1 && last.hold) {
      a.t = 1;
      if (!a.held) { a.held = true; a.resolve(); }
      const p = POSES[last.pose] || POSES.idle;
      this._blendPose(p, p, 1);
      this._hipDrop = p._drop || 0;
      return;
    }

    if (a.t >= 1) {
      const { resolve } = a;
      this._action = null;
      this._token = null;
      this._busy = false;
      this._hipDrop = 0;
      resolve();
      return;
    }

    // find the surrounding keyframes and blend between them
    let k0 = a.timeline[0], k1 = a.timeline[a.timeline.length - 1];
    for (let i = 1; i < a.timeline.length; i++) {
      if (a.t <= a.timeline[i].t) { k0 = a.timeline[i - 1]; k1 = a.timeline[i]; break; }
    }
    const span = Math.max(1e-4, k1.t - k0.t);
    const local = smoothstep(clamp01((a.t - k0.t) / span));

    const p0 = POSES[k0.pose] || POSES.idle;
    const p1 = POSES[k1.pose] || POSES.idle;
    this._blendPose(p0, p1, local);
    // how far the hips are down this frame — see the dandvat poses
    this._hipDrop = lerp(p0._drop || 0, p1._drop || 0, local);

    // fire the moment where the hand closes on the flower, or lets it go
    if (k1.grab && !a.fired.grab && local > 0.7) { a.fired.grab = true; this.ctx.bus.emit('action:grab', { name: a.name }); }
    if (k1.release && !a.fired.release && local > 0.6) { a.fired.release = true; this.ctx.bus.emit('action:release', { name: a.name }); }
  }

  _blendPose(p0, p1, t) {
    const all = this._blend;
    for (const name of Object.keys(this.bones)) {
      const a = p0[name] || ZERO;
      const b = p1[name] || ZERO;
      let e = all[name];
      if (!e) { e = all[name] = [0, 0, 0]; }
      e[0] = lerp(a[0], b[0], t);
      e[1] = lerp(a[1], b[1], t);
      e[2] = lerp(a[2], b[2], t);
    }
  }

  _updateMovement(dt, ctx) {
    const input = ctx.input;
    let ix = 0, iy = 0;

    // ---- body-relative movement (the D-pad) ----
    // Direction is resolved against the camera's heading ONCE, then held: the
    // avatar walks a straight line and neither the camera nor the crowd can
    // nudge it off course.
    if (input && input.bodyRelative) {
      this._navPath = null;

      const settings0 = ctx.state.settings;
      const top = (input.running ? RUN_SPEED : WALK_SPEED) * (settings0.moveSpeed || 1);

      const wantX = input.strafe;
      const wantY = input.walk;
      const mag = Math.min(1, Math.hypot(wantX, wantY));

      // "Up" means away from the camera — but only decided at the moment you
      // press. Holding a direction keeps that heading even if the camera turns,
      // so the walk is a straight line rather than a curve that follows the view.
      const combo = wantX + ',' + wantY;
      if (mag > 0.01 && combo !== this._padCombo) {
        this._padCombo = combo;
        // Ask the rig for its own basis rather than rebuilding one from its
        // yaw. This used to be `camYaw + atan2(wantX, wantY)`, which is the
        // rig's yaw PLUS a quarter turn for "right" while the rig itself
        // defines right as yaw MINUS a quarter turn. Left and right came out
        // mirrored, and because the error was a reflection about the camera
        // axis it looked correct whenever the camera happened to face the
        // other way - which is why it kept coming back.
        const rig = ctx.cameraRig;
        if (rig && rig.getForward && rig.getRight) {
          rig.getForward(_padF);
          rig.getRight(_padR);
          _padDir.set(0, 0, 0).addScaledVector(_padF, wantY).addScaledVector(_padR, wantX);
          this._padHeading = _padDir.lengthSq() > 1e-6
            ? Math.atan2(_padDir.x, _padDir.z)
            : this._yaw;
        } else {
          this._padHeading = this._yaw + Math.atan2(wantX, wantY);
        }
      } else if (mag <= 0.01) {
        this._padCombo = null;
      }

      if (mag > 0.01) {
        const dirYaw = this._padHeading !== undefined ? this._padHeading : this._yaw;
        this._targetYaw = dirYaw;
        _fwd.set(Math.sin(dirYaw), 0, Math.cos(dirYaw));
        this._speed = damp(this._speed, top * mag, 8, dt);
        this._vel.copy(_fwd).multiplyScalar(this._speed);
      } else {
        this._speed = damp(this._speed, 0, 10, dt);
        this._vel.multiplyScalar(Math.max(0, 1 - dt * 10));
      }

      if (this._speed > 0.02) {
        const pos = this.root.position;
        _v.copy(pos).addScaledVector(this._vel, dt);
        const depth = ctx.world.waterDepth(_v.x, _v.z);
        if (depth > 0.65) this._speed *= 0.2;
        else {
          pos.x = _v.x; pos.z = _v.z;
          ctx.world.collide(pos, RADIUS, this._feet());          // feet, not root
          if (ctx.crowd && ctx.crowd.collideAgents) ctx.crowd.collideAgents(pos, RADIUS);
        }
      }

      this._yaw = dampAngle(this._yaw, this._targetYaw, 11, dt);
      this.root.rotation.y = this._yaw;
      return;
    }

    if (input && (input.move.x || input.move.y)) {
      ix = input.move.x; iy = input.move.y;
      this._navPath = null;
    } else if (this._navPath) {
      // tap-to-move / walk-here following the road graph
      const p = this.root.position;
      while (this._navIndex < this._navPath.length) {
        const wp = this._navPath[this._navIndex];
        const d = Math.hypot(wp[0] - p.x, wp[1] - p.z);
        if (d < 1.6) { this._navIndex++; continue; }
        const inv = 1 / d;
        _v.set((wp[0] - p.x) * inv, 0, (wp[1] - p.z) * inv);
        // convert world direction into camera-relative stick input
        ix = 0; iy = 1;
        this._targetYaw = Math.atan2(_v.x, _v.z);
        break;
      }
      if (this._navIndex >= this._navPath.length) {
        this._navPath = null;
        if (this._navResolve) { this._navResolve(); this._navResolve = null; }
      }
    }

    const mag = Math.min(1, Math.hypot(ix, iy));
    const settings = ctx.state.settings;
    const running = input && input.running;
    const maxSpeed = (running ? RUN_SPEED : WALK_SPEED) * (settings.moveSpeed || 1);

    if (mag > 0.06) {
      if (this._navPath) {
        // already heading along the path; direction comes from _targetYaw
        _fwd.set(Math.sin(this._targetYaw), 0, Math.cos(this._targetYaw));
      } else {
        // camera-relative: stick up means away from the camera
        const cam = ctx.camera;
        _fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
        _fwd.y = 0;
        if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, 1);
        _fwd.normalize();
        _right.crossVectors(_fwd, _UP).normalize();
        _target.set(0, 0, 0).addScaledVector(_fwd, iy).addScaledVector(_right, ix);
        if (_target.lengthSq() > 1e-6) {
          _target.normalize();
          this._targetYaw = Math.atan2(_target.x, _target.z);
          _fwd.copy(_target);
        }
      }
      this._speed = damp(this._speed, maxSpeed * mag, 7, dt);
      this._vel.copy(_fwd).multiplyScalar(this._speed);
    } else {
      this._speed = damp(this._speed, 0, 9, dt);
      this._vel.multiplyScalar(Math.max(0, 1 - dt * 9));
    }

    if (this._speed > 0.02) {
      const p = this.root.position;
      const wasX = p.x, wasZ = p.z;
      _v.copy(p).addScaledVector(this._vel, dt);

      // wade, but never swim
      const depth = ctx.world.waterDepth(_v.x, _v.z);
      if (depth > 0.65) { this._speed *= 0.2; }
      else {
        p.x = _v.x; p.z = _v.z;
        ctx.world.collide(p, RADIUS, this._feet());              // feet, not root
        if (ctx.crowd && ctx.crowd.collideAgents) ctx.crowd.collideAgents(p, RADIUS);
      }

      /*
       * WALKING AND GOING NOWHERE.
       *
       * A 1:1 town of this much geometry will eventually pen somebody in, and
       * until now there was no way out of that but to close the app — the
       * vehicles have had a stuck-detector for months and the person walking
       * has had nothing. Being trapped in front of the Deities was reported
       * four separate times before this existed.
       *
       * So: if the player is asking to move and has covered almost nothing
       * for a second and a half, they are wedged. Not "slow" — wedged. Real
       * walking into a wall still slides along it, which moves you.
       */
      const got = Math.hypot(p.x - wasX, p.z - wasZ);
      const wanted = this._speed * dt;
      if (wanted > 0.01 && got < wanted * 0.12) this._stuckT = (this._stuckT || 0) + dt;
      else this._stuckT = 0;

      if (this._stuckT > 1.5) {
        this._stuckT = 0;
        const out = this._wayOut(ctx);
        if (out) {
          /*
           * Deliberately NOT silent. A player who is teleported without being
           * told thinks the world glitched; a player who is told thinks the
           * game noticed. And it reports WHERE, because every one of these is
           * a geometry bug worth finding.
           */
          console.warn('[player] unstuck from', wasX.toFixed(1), wasZ.toFixed(1),
            '->', out.x.toFixed(1), out.z.toFixed(1));
          p.x = out.x; p.z = out.z;
          this._standY = out.y;
          this._speed = 0; this._vel.set(0, 0, 0);
          if (ctx.bus) {
            ctx.bus.emit('ui:toast', {
              title: 'Stepped back into the open',
              sub: 'आप फिर से खुले में हैं',
            });
          }
        }
      }
    } else this._stuckT = 0;

    this._yaw = dampAngle(this._yaw, this._targetYaw, 9, dt);
    this.root.rotation.y = this._yaw;
  }

  /**
   * The nearest place a body could actually stand, searched outward.
   *
   * Uses fits() and standHeight() rather than isClear(), because isClear
   * is feet-blind — it counts a step as solid and would happily report the
   * inside of a staircase as a fine place to stand. That mistake has cost
   * this project three separate wrong diagnoses.
   */
  _wayOut(ctx, at = null, maxR = 20) {
    const p = at || this.root.position;
    const feet = at
      ? ctx.world.groundHeight(p.x, p.z)
      : (this._standY !== null && this._standY !== undefined
        ? this._standY : ctx.world.groundHeight(p.x, p.z));
    for (let r = at ? 0 : 2.5; r <= maxR; r += 1.5) {
      for (let k = 0; k < 24; k++) {
        // rotate the sample pattern per ring so rings do not line up and
        // re-test the same blocked bearing over and over
        const a = (k / 24) * Math.PI * 2 + r * 0.7;
        const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
        if (r === 0 && k > 0) break;              // the centre is one sample
        // the body has to fit, not merely be pushed back to where it was:
        // see WorldService.fits for the sliver this used to accept
        if (!ctx.world.fits(x, z, RADIUS, feet)) continue;      // inside masonry
        const h = ctx.world.standHeight
          ? ctx.world.standHeight(x, z, feet) : ctx.world.groundHeight(x, z);
        if (h === null || h === undefined) continue;
        if (Math.abs(h - feet) > 2.5) continue;                 // not a cliff
        if (ctx.world.waterDepth(x, z) > 0.5) continue;         // not the river
        if (!ctx.world.canLeave(x, z, RADIUS, h)) continue;     // not a sealed pocket
        return { x, z, y: h };
      }
    }
    return null;
  }

  /**
   * Put the player down somewhere, safely.
   *
   * "I am stuck in somewhere" — and until now the only ways out of that were
   * the automatic unstick, which needs you to be pressing a direction, and
   * closing the app. A pilgrim who has wedged themselves somewhere the
   * unstick cannot solve needs to be able to say "put me over there" and
   * have it work.
   *
   * It does NOT drop you on the exact coordinate asked for: it searches
   * outward for a spot a body can actually stand on, using collide() and
   * standHeight() rather than isClear(), which is feet-blind. Teleporting
   * someone precisely into a wall would be a new way to be stuck rather than
   * a way out of the old one.
   *
   * @returns {boolean} whether a standable spot was found
   */
  placeAt(ctx, x, z) {
    // On a floor built over that very spot, if a body can stand there and
    // walk away — a temple's court is where you asked to be, and the ground
    // under it is inside the masonry (see WorldService.floorsAt) — and only
    // then on ground found by searching outward.
    let spot = null;
    for (const y of ctx.world.floorsAt ? ctx.world.floorsAt(x, z) : []) {
      if (ctx.world.canLeave(x, z, RADIUS, y)) { spot = { x, z, y: ctx.world.standHeight(x, z, y) }; break; }
    }
    if (!spot) spot = this._wayOut(ctx, { x, z }, 30);
    if (!spot) return false;
    const p = this.root.position;
    p.x = spot.x; p.z = spot.z; p.y = spot.y;
    this._standY = spot.y;
    this._speed = 0;
    this._vel.set(0, 0, 0);
    this._stuckT = 0;
    this._navPath = null;
    // a placement is not a step — see _feet(), which starts its ground
    // reckoning again from the root after a jump this large
    return true;
  }

  _updateAnimation(dt) {
    const running = this._speed > WALK_SPEED * 1.25;
    const moving = this._speed > 0.12;
    this._breath += dt;

    if (!this._action) {
      const idle = POSES.idle;
      const all = this._blend;
      for (const name of Object.keys(this.bones)) {
        let e = all[name];
        if (!e) e = all[name] = [0, 0, 0];
        const base = idle[name] || ZERO;
        e[0] = base[0]; e[1] = base[1]; e[2] = base[2];
      }

      if (moving) {
        // stride frequency follows real ground speed, so it never skates
        const stride = running ? 2.25 : 1.75;
        this._phase += dt * this._speed * stride;
        const s = Math.sin(this._phase * Math.PI);
        const c = Math.cos(this._phase * Math.PI);
        const amp = running ? 1.0 : 0.66;

        set(all, 'thighL', s * 0.62 * amp, 0, 0);
        set(all, 'thighR', -s * 0.62 * amp, 0, 0);
        set(all, 'shinL', Math.max(0, -s) * 0.8 * amp, 0, 0);
        set(all, 'shinR', Math.max(0, s) * 0.8 * amp, 0, 0);
        set(all, 'upperArmL', -s * 0.52 * amp, 0, 0.1);
        set(all, 'upperArmR', s * 0.52 * amp, 0, -0.1);
        set(all, 'forearmL', -0.26 - Math.max(0, -s) * 0.3, 0, 0);
        set(all, 'forearmR', -0.26 - Math.max(0, s) * 0.3, 0, 0);
        set(all, 'spine', 0.04 + (running ? 0.16 : 0.05), 0, c * 0.03);
        set(all, 'hips', 0, 0, -c * 0.045);
        this._bob = Math.abs(s) * 0.035 * amp;
      } else {
        this._bob = 0;
        // breathing and a slow weight shift so standing still is not frozen
        const br = Math.sin(this._breath * 1.5) * 0.012;
        set(all, 'chest', 0.01 + br, 0, 0);
        set(all, 'spine', 0.02, 0, Math.sin(this._breath * 0.4) * 0.02);
        set(all, 'head', 0, Math.sin(this._breath * 0.23) * 0.24, 0);
      }
    }

    // damp every bone toward its blended target — this is what removes snapping
    const k = this._action ? 16 : 9;
    for (const name of Object.keys(this.bones)) {
      const b = this.bones[name];
      const e = this._blend[name] || ZERO;
      b.rotation.x = damp(b.rotation.x, e[0], k, dt);
      b.rotation.y = damp(b.rotation.y, e[1], k, dt);
      b.rotation.z = damp(b.rotation.z, e[2], k, dt);
    }
  }

  /**
   * Where your feet are, which is not the height the root is drawn at.
   *
   * The root damps toward the ground rather than snapping to it, and in water
   * it sits a wade below it so you are in the river and not on it. Either way
   * it is behind the truth by most of a step exactly when a step is being
   * taken, and it was what the world was asked to measure the next step from.
   * On a ghat that came out as: step down one tread, be told from a height that
   * is still half a tread high that the next one is too deep to be a step, get
   * put back on the bank — all the way to the river, sixteen times. The ground
   * the last pass actually resolved is the honest answer and it costs a number.
   *
   * A placement is not a step: a save being restored, a rickshaw setting you
   * down, a temple door. The root moves without walking and the remembered
   * ground belongs to somewhere else, so a jump that large starts again from
   * the root — the same rule, and the same number, as counting the metres.
   */
  _feet() {
    const p = this.root.position;
    if (this._standY === null || p.distanceTo(this._lastEmit) > TELEPORT_M) return p.y;
    return this._standY;
  }

  _applyGround(ctx, dt) {
    const p = this.root.position;
    // stand on steps and plinths, not only on terrain — see WorldService
    const g = ctx.world.standHeight
      ? ctx.world.standHeight(p.x, p.z, this._feet())
      : ctx.world.groundHeight(p.x, p.z);
    this._standY = g;
    const depth = ctx.world.waterDepth(p.x, p.z);
    // the root tracks the terrain only; the walk bob rides on the hips, so the
    // two can never fight and the avatar cannot shake
    p.y = damp(p.y, g - Math.min(depth, WADE), 16, dt);
    if (this.bones.hips) {
      this.bones.hips.position.y = damp(this.bones.hips.position.y,
        0.92 + (this._bob || 0) - (this._hipDrop || 0), 18, dt);
    }
  }

  dispose() {
    this.cancelAction();
    this.ctx.scene.remove(this.root);
  }
}

const ZERO = [0, 0, 0];
function set(all, name, x, y, z) {
  let e = all[name];
  if (!e) e = all[name] = [0, 0, 0];
  e[0] = x; e[1] = y; e[2] = z;
}
