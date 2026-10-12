/**
 * Trains on the New Delhi-Mathura main line (rail.generated.js).
 *
 * Every train between Delhi and both Agra and Kota comes through Chhatikara
 * — the two routes part at Mathura, eleven kilometres on — and the line was
 * quadrupled for them: expresses behind an electric locomotive, and long
 * rakes of coal. One passes every few minutes on one track or another (our
 * estimate, about eight an hour: not a timetable).
 *
 * Which way each runs. Indian Railways runs on the left. The four tracks are
 * two pairs, each pair a double line, and of each pair the north-eastern
 * track takes trains for Mathura and the south-western trains for Delhi —
 * which is also the way OSM draws each way, so a train runs along its
 * track's points (checked in tools/checks/trains.mjs).
 *
 * The stock at its own sizes: a WAP-7 or WAG-9 locomotive 20.56 m over
 * buffers, 3.15 m wide, 4.26 m high; an LHB coach 23.54 m by 3.24 by 4.04;
 * an ICF coach 22.3 m over buffers, 3.25 wide; a BOXN wagon 10.71 m over
 * couplers, 3.2 wide, 3.23 high. An express is 18 to 24 coaches; a freight
 * a full rake of 58 BOXN behind two locomotives. The liveries are
 * approximate: ICF blue and cream, LHB red, the locomotives' colours one
 * shed's among many.
 *
 * The metre gauge into Vrindavan carries nothing: the railbus stopped in
 * 2023 and its track was taken up (RailBuilder).
 *
 * A train sounds its horn coming up to you. It brakes for anybody on its
 * line, and cannot always stop in time; it never goes through anybody, who is
 * put off the line to the side they stood on.
 */
import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { RAIL_TOP, WIRE_OVER_RAIL } from '../world/RailBuilder.js';

/* the stock, each drawn once and instanced; `l` is the length over buffers */
export const STOCK = {
  wap7: { l: 20.56, w: 3.15, h: 4.26 },
  wag9: { l: 20.56, w: 3.15, h: 4.26 },
  lhb:  { l: 23.54, w: 3.24, h: 4.04 },
  icf:  { l: 22.3,  w: 3.25, h: 4.0 },
  boxn: { l: 10.71, w: 3.2,  h: 3.23 },
};
const CAPACITY = { wap7: 8, wag9: 8, lhb: 100, icf: 100, boxn: 240 };
const LINE = { passenger: [30, 36], freight: [15, 20.8] };   // m/s: 108-130 km/h, 54-75
const ACCEL = { passenger: 0.4, freight: 0.15 };              // m/s², away again
const BRAKE = 0.8;                // m/s², service: for the train ahead
const EMERGENCY = 1.2;            // m/s², for somebody on the line
const SEE_M = 600;                // straight line, open country: the driver sees this far
const HORN_M = 500;               // within this of you, a train sounds as it comes
const RUMBLE_M = 160;
const ON_LINE = 2.6;              // off the track's centre: in the train's way
const CLEAR = 0.45;               // kept between a body and anybody beside it
const BLOCK_M = 450;              // one train in the section: the last one this far in
const HEADWAY = [1200, 2400];     // s, on each track
const FIRST = [20, 300];

const lerp = (a, b, t) => a + (b - a) * t;

/** A track as a path a train can be laid along. */
function pathOf(track) {
  const P = track.points;
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { track, P, cum, L: cum[cum.length - 1] };
}

/** Where a path is at `s` metres along it. */
function at(path, s) {
  const { P, cum, L } = path;
  const c = Math.max(0, Math.min(L, s));
  let i = 1;
  while (i < P.length - 1 && cum[i] < c) i++;
  const t = (c - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
  return { x: lerp(P[i - 1][0], P[i][0], t), z: lerp(P[i - 1][1], P[i][1], t) };
}

/** How far along a path a point is, and how far off it. */
export function project(path, x, z) {
  const { P, cum } = path;
  let best = Infinity, bs = 0;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az;
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; bs = cum[i - 1] + t * Math.sqrt(L2); }
  }
  return { s: bs, d: best };
}

const GLASS = 0x1d2730, UNDER = 0x2b2c2f, BOGIE = 0x232427, ROOF = 0x707378, DARK = 0x353535;

/** A car's body, in its own frame: +z forward, y up from the rail top. */
function stockGeometry(kind) {
  const b = new MeshBuilder();
  const { l, w, h } = STOCK[kind];
  const box = (x, y, z, bw, bh, bd, c, top) => b.box(x, y, z, bw, bh, bd, c, 0, 0b111111, top || null);
  // the couplers, out to the length over buffers
  for (const s of [-1, 1]) box(0, 0.7, s * (l * 0.5 - 0.25), 0.5, 0.35, 0.5, DARK);
  if (kind === 'wap7' || kind === 'wag9') {
    const body = kind === 'wap7' ? 0xe6dfd0 : 0x6e2a20;
    const band = kind === 'wap7' ? 0xb3302a : 0xd4ad3c;
    for (const s of [-1, 1]) box(0, 0, s * l * 0.3, 2.7, 1.0, 4.2, BOGIE);
    for (const s of [-1, 1]) for (const side of [-1, 1]) box(side * 0.95, 0.65, s * (l * 0.5 - 0.3), 0.42, 0.42, 0.6, DARK);   // buffers
    box(0, 0.9, 0, w * 0.9, 0.35, l * 0.9, UNDER);
    box(0, 1.25, 0, w, h - 1.6, l - 0.4, body);
    box(0, 1.7, 0, w + 0.02, 0.45, l - 0.38, band);
    for (const s of [-1, 1]) {
      box(0, 2.75, s * (l * 0.5 - 0.19), w * 0.8, 0.85, 0.04, GLASS);              // the cab's front windows
      for (const side of [-1, 1]) box(side * (w * 0.5 + 0.01), 2.8, s * (l * 0.5 - 1.3), 0.02, 0.7, 0.9, GLASS);
    }
    box(0, h - 0.35, 0, w * 0.82, 0.35, l - 1.2, ROOF);
    // the trailing pantograph, up to the contact wire
    box(0, h, -l * 0.3, 1.2, 0.15, 1.0, DARK);
    box(0, h + 0.15, -l * 0.3, 0.08, WIRE_OVER_RAIL - h - 0.2, 0.08, DARK);
    box(0, WIRE_OVER_RAIL - 0.05, -l * 0.3, 1.9, 0.05, 0.12, DARK);
  } else if (kind === 'lhb' || kind === 'icf') {
    const body = kind === 'lhb' ? 0xa52f29 : 0x2c4e88;
    const band = kind === 'lhb' ? 0xd6cfc2 : 0xe1d8b9;
    for (const s of [-1, 1]) box(0, 0, s * l * 0.32, 2.6, 0.95, 3.0, BOGIE);
    box(0, 0.85, 0, w * 0.88, 0.4, l * 0.9, UNDER);
    box(0, 1.2, 0, w, h - 1.5, l - 0.5, body);
    box(0, 2.05, 0, w + 0.02, 0.8, l - 0.52, band);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 10; k++) box(side * (w * 0.5 + 0.015), 2.12, -l * 0.36 + k * (l * 0.72 / 9), 0.02, 0.62, 1.2, GLASS);
      for (const s of [-1, 1]) box(side * (w * 0.5 + 0.015), 1.25, s * (l * 0.5 - 1.0), 0.02, 2.1, 0.8, 0x3b4046);   // doors
    }
    box(0, h - 0.3, 0, w * 0.9, 0.3, l - 0.6, ROOF);
    for (const s of [-1, 1]) box(0, 1.3, s * (l * 0.5 - 0.15), 1.2, 2.4, 0.3, DARK);        // the gangways
  } else if (kind === 'boxn') {
    for (const s of [-1, 1]) box(0, 0, s * l * 0.3, 2.5, 0.85, 2.4, BOGIE);
    box(0, 0.75, 0, w * 0.9, 0.35, l - 0.6, UNDER);
    // an open wagon, loaded: coal to the brim
    box(0, 1.05, 0, w - 0.08, h - 1.05, l - 0.7, 0x6a3a29, 0x1f1d1b);
    for (const side of [-1, 1]) for (let k = -4; k <= 4; k++) box(side * (w * 0.5 - 0.02), 1.05, k * ((l - 0.8) / 8), 0.04, h - 1.05, 0.12, 0x56301f);
  }
  return b.build();
}

/** A lamp: a locomotive's headlight, or the red lamp on the last vehicle. */
function lampGeometry() {
  const b = new MeshBuilder();
  b.box(0, -0.17, 0, 0.36, 0.34, 0.06, 0xffffff);
  return b.build();
}

export class TrainSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rngAt('trains');
    this.paths = [];
    this.trains = [];
    this.cars = [];
    this.group = new THREE.Group();
    this.group.name = 'Trains';
    const rail = ctx.data.RAIL;
    if (!rail || !rail.tracks) return;
    // the four main tracks; not the station loops, and not the closed metre gauge
    for (const t of rail.tracks) {
      if (t.kind !== 'main' || t.dismantled) continue;
      const p = pathOf(t);
      if (p.L < 300) continue;
      p.next = this._range(FIRST);
      this.paths.push(p);
    }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.inst = {};
    for (const kind of Object.keys(STOCK)) {
      const m = new THREE.InstancedMesh(stockGeometry(kind), mat, CAPACITY[kind]);
      m.count = 0;
      m.frustumCulled = false;
      m.castShadow = !!ctx.quality.shadows;
      m.receiveShadow = true;
      m.name = `Train_${kind}`;
      this.group.add(m);
      this.inst[kind] = m;
    }
    const lamp = lampGeometry();
    this.headlamps = new THREE.InstancedMesh(lamp, new THREE.MeshBasicMaterial({ color: 0xfff1c4 }), 8);
    this.taillamps = new THREE.InstancedMesh(lamp, new THREE.MeshBasicMaterial({ color: 0xff2a1a }), 8);
    for (const m of [this.headlamps, this.taillamps]) { m.count = 0; m.frustumCulled = false; this.group.add(m); }
    ctx.scene.add(this.group);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._up = new THREE.Vector3(0, 1, 0);
  }

  _range([a, b]) { return a + this.rng() * (b - a); }

  /** Make up a train for a path: an express, or coal. */
  _makeUp(path) {
    const freight = this.rng() < 0.35;
    let cars;
    if (freight) cars = ['wag9', 'wag9'].concat(Array(58).fill('boxn'));
    else cars = ['wap7'].concat(Array(18 + Math.floor(this.rng() * 7)).fill(this.rng() < 0.6 ? 'lhb' : 'icf'));
    const kind = freight ? 'freight' : 'passenger';
    const line = this._range(LINE[kind]);
    const len = cars.reduce((n, c) => n + STOCK[c].l, 0);
    // the head comes in at the track's start, 60 m out past the edge of the world
    return { path, kind, cars, len, line, v: line, head: 0, honked: false, warnT: 0, rumbleT: 0 };
  }

  update(dt, ctx) {
    if (!this.paths.length) return;
    for (const p of this.paths) {
      p.next -= dt;
      if (p.next > 0) continue;
      if (this.trains.some((t) => t.path === p && t.head - t.len < BLOCK_M)) continue;
      this.trains.push(this._makeUp(p));
      p.next = this._range(HEADWAY);
    }

    const P = ctx.player ? ctx.player.position : null;
    // on the ground by the line, not on a bridge over it
    const byLine = P && Math.abs(P.y - ctx.world.groundHeight(P.x, P.z)) < 3;
    for (const t of this.trains) {
      let want = t.line;
      // the train in front on this track, if it is held
      for (const o of this.trains) {
        if (o === t || o.path !== t.path || o.head < t.head) continue;
        want = Math.min(want, Math.sqrt(2 * BRAKE * Math.max(0, o.head - o.len - t.head - 60)));
      }
      // somebody on the line ahead: the horn, and the brake
      const me = P ? project(t.path, P.x, P.z) : null;
      const ahead = byLine && me.d < ON_LINE && me.s > t.head && me.s - t.head < SEE_M ? me.s - t.head : null;
      t.warnT -= dt;
      if (ahead !== null) {
        want = Math.min(want, Math.sqrt(2 * EMERGENCY * Math.max(0, ahead - 15)));
        if (t.warnT <= 0) { this._sound('trainhorn', t.path, t.head); t.warnT = 4; }
      }
      const slow = t.v > want;
      t.v = slow ? Math.max(want, t.v - (ahead !== null ? EMERGENCY : BRAKE) * dt) : Math.min(want, t.v + ACCEL[t.kind] * dt);
      t.head += t.v * dt;
      if (!P) continue;
      // the horn once, coming up to you
      if (!t.honked && me && me.s > t.head && me.s - t.head < HORN_M && me.d < 120) {
        t.honked = true;
        this._sound('trainhorn', t.path, t.head);
      }
      // and the noise of it going by, from the nearest part of it
      t.rumbleT -= dt;
      if (me && t.rumbleT <= 0 && t.v > 2) {
        const s = Math.max(t.head - t.len, Math.min(t.head, me.s));
        const q = at(t.path, s);
        if (Math.hypot(q.x - P.x, q.z - P.z) < RUMBLE_M) {
          this._sound('trainrumble', t.path, s, t.v);
          t.rumbleT = 1.4;
        }
      }
    }
    // out the far side, the last vehicle and all
    this.trains = this.trains.filter((t) => t.head - t.len < t.path.L);

    this._place(ctx);
    if (P) this._push(P, P.y);
    if (ctx.crowd) this._clearCrowd(ctx.crowd, ctx.world.terrain);
  }

  _sound(name, path, s, speed) {
    const q = at(path, s);
    const position = { x: q.x, y: 3, z: q.z };
    if (this.ctx.bus) this.ctx.bus.emit('sfx', { name, position, speed });
  }

  /** Every vehicle where it is along its track, its two bogies on the rails. */
  _place(ctx) {
    const counts = {};
    for (const k of Object.keys(this.inst)) counts[k] = 0;
    let heads = 0, tails = 0;
    this.cars = [];
    for (const t of this.trains) {
      let s = t.head;
      const last = t.cars.length - 1;
      t.cars.forEach((kind, i) => {
        const S = STOCK[kind];
        const c = s - S.l * 0.5;
        s -= S.l;
        if (c < S.l * 0.5 || c > t.path.L - S.l * 0.5) return;
        const a = at(t.path, c - S.l * 0.32), f = at(t.path, c + S.l * 0.32);
        const x = (a.x + f.x) * 0.5, z = (a.z + f.z) * 0.5;
        const yaw = Math.atan2(f.x - a.x, f.z - a.z);
        const y = ctx.world.groundHeight(x, z) + RAIL_TOP;
        const m = this.inst[kind];
        if (counts[kind] >= CAPACITY[kind]) return;
        this._q.setFromAxisAngle(this._up, yaw);
        this._p.set(x, y, z);
        this._m.compose(this._p, this._q, this._s);
        m.setMatrixAt(counts[kind]++, this._m);
        this.cars.push({ x, y, z, yaw, hl: S.l * 0.5, hw: S.w * 0.5, h: S.h, kind, train: t });
        // the headlight on the leading locomotive, the red lamp on the last vehicle
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        if (i === 0 && heads < 8) {
          this._p.set(x + fx * (S.l * 0.5 - 0.15), y + 3.85, z + fz * (S.l * 0.5 - 0.15));
          this._m.compose(this._p, this._q, this._s);
          this.headlamps.setMatrixAt(heads++, this._m);
        }
        if (i === last && tails < 8) {
          this._p.set(x - fx * (S.l * 0.5 - 0.3) + fz * 0.9, y + 1.6, z - fz * (S.l * 0.5 - 0.3) - fx * 0.9);
          this._m.compose(this._p, this._q, this._s);
          this.taillamps.setMatrixAt(tails++, this._m);
        }
      });
    }
    for (const k of Object.keys(this.inst)) {
      this.inst[k].count = counts[k];
      this.inst[k].instanceMatrix.needsUpdate = true;
    }
    this.headlamps.count = heads; this.headlamps.instanceMatrix.needsUpdate = true;
    this.taillamps.count = tails; this.taillamps.instanceMatrix.needsUpdate = true;
  }

  /**
   * Nobody is ever inside a vehicle: put out to the side they are on. Never
   * along the line — pushed ahead of the nose, you were carried down the
   * track at a hundred kilometres an hour.
   */
  _push(o, y) {
    for (const c of this.cars) {
      const dx = o.x - c.x, dz = o.z - c.z;
      if (dx > 14 || dx < -14 || dz > 14 || dz < -14) continue;
      // on a bridge over it, or under one
      if (Number.isFinite(y) && Math.abs(y - c.y) > 3) continue;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      const along = dx * fx + dz * fz, across = dx * fz - dz * fx;
      if (Math.abs(along) > c.hl + CLEAR) continue;
      const pc = c.hw + CLEAR - Math.abs(across);
      if (pc <= 0) continue;
      const s = across < 0 ? -1 : 1;
      o.x += fz * s * pc; o.z -= fx * s * pc;
    }
  }

  /** The crowd near the line, people and animals both. */
  _clearCrowd(crowd, terrain) {
    if (!this.cars.length) return;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const c of this.cars) {
      x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z);
    }
    x0 -= 14; x1 += 14; z0 -= 14; z1 += 14;
    const near = (o) => o.x > x0 && o.x < x1 && o.z > z0 && o.z < z1
      && (!terrain || !terrain.railDistance || terrain.railDistance(o.x, o.z) < 4);
    const push = (a) => { if (near(a)) this._push(a, a.y); };
    for (const slot of crowd.peopleInst || []) slot.agents.forEach(push);
    (crowd.cows || []).forEach(push);
    (crowd.dogs || []).forEach(push);
  }

  dispose() {
    this.ctx.scene.remove(this.group);
  }
}
