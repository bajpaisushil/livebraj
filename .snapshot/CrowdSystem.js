/**
 * CrowdSystem — the people, cows, dogs, birds and rickshaws.
 *
 * No dialogue, no quests, no AI worth the name — waypoints on the real road
 * graph and a handful of idle behaviours. They exist so the town is not empty,
 * and nothing they do demands anything of the player.
 *
 * Agents are pooled and only ever exist near the player: 4.2 km of streets can
 * hold a crowd that no phone could animate, so the world spawns around you and
 * recycles behind you.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { PEOPLE, buildStanding } from './Archetypes.js';
import { rngAt, pick, range, chance } from '../../engine/math/Random.js';
import { damp, dampAngle, clamp01, TAU } from '../../engine/math/MathUtils.js';
import { driveStep, AMBIENT } from '../transport/VehicleDrive.js';

const _v = new THREE.Vector3();

/**
 * What actually plies these roads. The first five carry passengers, with the
 * fares people really pay: a shared tempo is cheapest and slowest, a cab is
 * quickest and dearest, and the e-rickshaw sits in the middle where most of
 * Vrindavan travels.
 */
const VEHICLES = [
  { id: 'cycle-rickshaw', label: 'Cycle rickshaw', hindi: 'रिक्शा', speed: 3.2, w: 1.2, l: 2.6, body: 0x2f5d5a, canopy: 0xc8452a, hire: { base: 10, perKm: 15, seats: 2 } },
  { id: 'e-rickshaw', label: 'E-rickshaw', hindi: 'ई-रिक्शा', speed: 4.6, w: 1.4, l: 2.8, body: 0x3f8f6a, canopy: 0xf2ece0, hire: { base: 10, perKm: 12, seats: 6 } },
  { id: 'auto', label: 'Auto rickshaw', hindi: 'ऑटो', speed: 5.4, w: 1.3, l: 2.7, body: 0x1d4f3f, canopy: 0xf5d020, hire: { base: 20, perKm: 18, seats: 3 } },
  { id: 'tempo', label: 'Shared tempo', hindi: 'टेम्पो', speed: 4.2, w: 1.6, l: 3.6, body: 0x3a5a8a, canopy: 0xe0d8c0, hire: { base: 10, perKm: 7, seats: 10, shared: true } },
  { id: 'taxi', label: 'Cab', hindi: 'टैक्सी', speed: 6.6, w: 1.75, l: 4.1, body: 0xf0f0ea, canopy: null, hire: { base: 60, perKm: 26, seats: 4 } },
  { id: 'car', speed: 6.2, w: 1.7, l: 4.0, body: 0xbfc4c8, canopy: null },
  { id: 'bike', speed: 6.8, w: 0.7, l: 1.9, body: 0x3a3a42, canopy: null },
];

/** How many of a given kind you should expect to see. */
const VEHICLE_MIX = [0.26, 0.30, 0.14, 0.10, 0.05, 0.09, 0.06];

/**
 * Edges a vehicle will actually take.
 *
 * The spawn filter only ever checked the STARTING node, and after that the
 * shared pedestrian brain picked uniformly from every edge on it — so a
 * rickshaw that started on Mathura Road was one coin toss away from a footpath
 * through somebody's courtyard. Galis and paths are walked here, not driven.
 * `stitch` stays in: it is junction glue rather than real road, but without it
 * the graph comes apart at crossings and traffic has nowhere to go.
 */
const DRIVABLE = new Set(['street', 'main', 'highway', 'trunk', 'parikrama', 'stitch']);

/**
 * How near the player a vehicle has to be before it is worth colliding, in
 * metres. Pushing a vehicle out of a wall four hundred metres behind you is
 * cost for something nobody will ever see.
 */
const SOLID_NEAR = 140;

export class Crowd {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'Crowd';
    ctx.scene.add(this.group);

    const q = ctx.quality.crowd;
    this.counts = {
      people: Math.round(280 * q),
      cows: Math.round(34 * q),
      dogs: Math.round(20 * q),
      vehicles: Math.round(55 * q),
      birds: Math.round(60 * q),
    };

    this._buildTemplates();
    this._spawn();
    this._acc = 0;
    console.info(`[crowd] ${this.counts.people} people, ${this.counts.cows} cows, ${this.counts.vehicles} vehicles`);
  }

  /* ================================================================
   * Templates — one merged body per archetype, instanced
   * ================================================================ */
  _buildTemplates() {
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });

    // The standing pose is the walking crowd; the seated poses beside it in
    // Archetypes.js are the same twelve people sitting down at a gathering.
    this.peopleGeo = PEOPLE.map((t) => buildStanding(t));

    // zebu cow: humped, dewlapped, unmistakable
    const cow = new MeshBuilder();
    cow.box(0, 0.62, 0, 0.58, 0.66, 1.5, 0xe4dccc);
    cow.box(0, 1.2, -0.1, 0.4, 0.34, 0.5, 0xd8cfbc);          // hump
    cow.box(0, 0.75, 0.88, 0.32, 0.36, 0.5, 0xe4dccc);        // head
    cow.box(0, 0.5, 0.6, 0.22, 0.42, 0.24, 0xdcd2c0);         // dewlap
    cow.box(-0.16, 1.02, 0.95, 0.07, 0.24, 0.07, 0xc8452a);   // painted horns
    cow.box(0.16, 1.02, 0.95, 0.07, 0.24, 0.07, 0xc8452a);
    for (const sx of [-0.22, 0.22]) for (const sz of [-0.5, 0.5]) {
      cow.box(sx, 0, sz, 0.13, 0.64, 0.13, 0xd0c6b2);
    }
    this.cowGeo = cow.build();

    const dog = new MeshBuilder();
    dog.box(0, 0.32, 0, 0.22, 0.26, 0.66, 0xc9a06a);
    dog.box(0, 0.44, 0.4, 0.18, 0.2, 0.26, 0xc9a06a);
    for (const sx of [-0.09, 0.09]) for (const sz of [-0.22, 0.22]) {
      dog.box(sx, 0, sz, 0.07, 0.34, 0.07, 0xb8905c);
    }
    this.dogGeo = dog.build();

    this.vehicleGeo = VEHICLES.map((v) => {
      const b = new MeshBuilder();
      b.box(0, 0.32, 0, v.w, 0.5, v.l, v.body);
      if (v.id === 'taxi') b.box(0, 1.28, -v.l * 0.2, 0.5, 0.16, 0.24, 0xf5d020);
      if (v.canopy) {
        b.box(0, 1.35, -v.l * 0.12, v.w + 0.12, 0.12, v.l * 0.62, v.canopy);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          b.box(sx * v.w * 0.42, 0.82, sz * v.l * 0.24, 0.06, 0.56, 0.06, 0x5a5a52);
        }
      } else {
        b.box(0, 0.82, -v.l * 0.05, v.w * 0.86, 0.42, v.l * 0.55, 0x8fa8b8);
      }
      // wheels
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.box(sx * v.w * 0.48, 0.0, sz * v.l * 0.34, 0.12, 0.44, 0.44, 0x2a2a2a);
      }
      return b.build();
    });

    const bird = new MeshBuilder();
    bird.box(0, 0, 0, 0.1, 0.07, 0.24, 0x8a8a92);
    bird.box(-0.16, 0.02, 0, 0.26, 0.03, 0.12, 0x9a9aa2);
    bird.box(0.16, 0.02, 0, 0.26, 0.03, 0.12, 0x9a9aa2);
    this.birdGeo = bird.build();
  }

  /* ================================================================
   * Spawning
   * ================================================================ */
  _spawn() {
    const ctx = this.ctx;
    this.people = [];
    this.cows = [];
    this.dogs = [];
    this.vehicles = [];

    // one InstancedMesh per archetype
    this.peopleInst = PEOPLE.map((t, i) => {
      const n = Math.max(1, Math.round(this.counts.people / PEOPLE.length));
      const m = new THREE.InstancedMesh(this.peopleGeo[i], this.mat, n);
      m.castShadow = !!ctx.quality.shadows;
      m.frustumCulled = false;
      m.count = 0;
      this.group.add(m);
      return { mesh: m, capacity: n, agents: [] };
    });

    this.cowInst = this._instanced(this.cowGeo, this.counts.cows);
    this.dogInst = this._instanced(this.dogGeo, this.counts.dogs);
    this.birdInst = this._instanced(this.birdGeo, this.counts.birds);
    this.vehicleInst = VEHICLES.map((v, i) => {
      const n = Math.max(1, Math.round(this.counts.vehicles / VEHICLES.length));
      const m = new THREE.InstancedMesh(this.vehicleGeo[i], this.mat, n);
      m.castShadow = !!ctx.quality.shadows;
      m.frustumCulled = false;
      m.count = 0;
      this.group.add(m);
      return { mesh: m, capacity: n, agents: [] };
    });

    // populate
    const rng = rngAt('crowd');
    for (let i = 0; i < this.counts.people; i++) this._addPerson(rng, i);
    for (let i = 0; i < this.counts.cows; i++) this._addAnimal(this.cows, rng, i, 0.9);
    for (let i = 0; i < this.counts.dogs; i++) this._addAnimal(this.dogs, rng, i, 1.6);
    for (let i = 0; i < this.counts.vehicles; i++) this._addVehicle(rng, i);
    this.birds = [];
    for (let i = 0; i < this.counts.birds; i++) {
      this.birds.push({
        x: range(rng, -400, 400), y: range(rng, 8, 26), z: range(rng, -400, 400),
        a: rng() * TAU, r: range(rng, 14, 50), t: rng() * TAU, speed: range(rng, 0.3, 0.7),
      });
    }
  }

  _instanced(geo, n) {
    const m = new THREE.InstancedMesh(geo, this.mat, Math.max(1, n));
    m.castShadow = !!this.ctx.quality.shadows;
    m.frustumCulled = false;
    m.count = 0;
    this.group.add(m);
    return m;
  }

  _startNode(rng) {
    const nav = this.ctx.nav;
    if (!nav) return null;
    return nav.randomNode(rng);
  }

  _addPerson(rng, i) {
    const typeIdx = i % PEOPLE.length;
    const slot = this.peopleInst[typeIdx];
    if (slot.agents.length >= slot.capacity) return;
    const node = this._startNode(rng);
    if (!node) return;
    const agent = {
      type: typeIdx,
      archetype: PEOPLE[typeIdx].id, x: node.x, z: node.z, y: 0, yaw: rng() * TAU,
      speed: PEOPLE[typeIdx].speed * range(rng, 0.85, 1.15),
      target: null, phase: rng() * TAU, idle: 0, node,
    };
    slot.agents.push(agent);
    this.people.push(agent);
  }

  _addAnimal(list, rng, i, speed) {
    const node = this._startNode(rng);
    if (!node) return;
    list.push({
      x: node.x, z: node.z, y: 0, yaw: rng() * TAU,
      speed: speed * range(rng, 0.7, 1.2),
      target: null, idle: range(rng, 0, 8), sitting: chance(rng, 0.35), phase: rng() * TAU,
    });
  }

  _addVehicle(rng, i) {
    // choose by how common each kind actually is, not evenly
    let roll = rng(), typeIdx = 0, acc = 0;
    for (let k = 0; k < VEHICLE_MIX.length; k++) {
      acc += VEHICLE_MIX[k];
      if (roll <= acc) { typeIdx = k; break; }
    }
    const slot = this.vehicleInst[typeIdx];
    if (slot.agents.length >= slot.capacity) return;
    // vehicles only use the wider roads
    const nav = this.ctx.nav;
    let node = null;
    for (let tries = 0; tries < 20 && nav; tries++) {
      const n = nav.randomNode(rng);
      if (n && n.edges.some((e) => e.kind === 'street' || e.kind === 'main' || e.kind === 'highway')) { node = n; break; }
    }
    if (!node) return;
    slot.agents.push({
      x: node.x, z: node.z, y: 0, yaw: rng() * TAU,
      speed: VEHICLES[typeIdx].speed * range(rng, 0.8, 1.1),
      cur: 0, target: null, node,
    });
    this.vehicles.push({ typeIdx });
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    const p = ctx.player && ctx.player.position;
    if (!p) return;
    const far = ctx.quality.drawDistance;
    const far2 = far * far;

    for (const slot of this.peopleInst) {
      let n = 0;
      for (const a of slot.agents) {
        this._stepAgent(a, dt, ctx, p, far);
        const dx = a.x - p.x, dz = a.z - p.z;
        if (dx * dx + dz * dz > far2) continue;
        this._writeMatrix(slot.mesh, n++, a, 1, a.walking ? Math.sin(a.phase) * 0.04 : 0);
      }
      slot.mesh.count = n;
      slot.mesh.instanceMatrix.needsUpdate = true;
    }

    this._stepList(this.cows, this.cowInst, dt, ctx, p, far2, 1.0);
    this._stepList(this.dogs, this.dogInst, dt, ctx, p, far2, 1.0);
    this._stepVehicles(dt, ctx, p, far2);
    this._stepBirds(dt, ctx, p, far2);
  }

  _stepAgent(a, dt, ctx, p, far) {
    const nav = ctx.nav;

    // someone has greeted them: stop, turn, and answer
    if (a.greeting > 0) {
      a.greeting -= dt;
      a.walking = false;
      if (a.greetYaw !== undefined) a.yaw = dampAngle(a.yaw, a.greetYaw, 6, dt);
      return;
    }

    if (a.idle > 0) { a.idle -= dt; a.walking = false; return; }

    if (!a.target) {
      // recycle anyone who has drifted far away, rather than simulating them
      const dx = a.x - p.x, dz = a.z - p.z;
      const away = Math.hypot(dx, dz);
      // recycle anyone who has drifted out of sight to somewhere just inside it,
      // so the street around you is always populated rather than statistically
      // populated across the whole district
      if (away > far * 1.15 && nav) {
        const n = nav.randomNodeNear(p.x, p.z, far * 0.75, Math.random);
        if (n) { a.x = n.x; a.z = n.z; a.node = n; a.target = null; }
      }
      const edges = a.node ? a.node.edges : null;
      if (edges && edges.length) {
        const e = edges[Math.floor(Math.random() * edges.length)];
        const next = nav.nodes.get(e.to);
        if (next) { a.target = next; a.node = next; }
      }
      if (!a.target) { a.idle = 2; return; }
      if (Math.random() < 0.12) { a.idle = range(Math.random, 1.5, 6); return; }
    }

    let dx = a.target.x - a.x, dz = a.target.z - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.7) { a.target = null; return; }

    let nx = dx / d, nz = dz / d;

    // avoid the player rather than walking into them
    const px = a.x - p.x, pz = a.z - p.z;
    const pd = Math.hypot(px, pz);
    if (pd < 2.2 && pd > 1e-4) {
      const away = (2.2 - pd) / 2.2;
      nx += (px / pd) * away * 1.6;
      nz += (pz / pd) * away * 1.6;
      const l = Math.hypot(nx, nz) || 1;
      nx /= l; nz /= l;
    }

    a.yaw = dampAngle(a.yaw, Math.atan2(nx, nz), 5, dt);
    const step = a.speed * dt;
    a.x += nx * step;
    a.z += nz * step;
    a.y = ctx.world.groundHeight(a.x, a.z);
    a.phase += dt * a.speed * 4;
    a.walking = true;
  }

  _stepList(list, inst, dt, ctx, p, far2, scale) {
    let n = 0;
    for (const a of list) {
      if (a.idle > 0) { a.idle -= dt; }
      else if (!a.target && ctx.nav) {
        const node = ctx.nav.randomNodeNear(p.x, p.z, 120, Math.random);
        if (node) a.target = node;
        if (Math.random() < 0.4) a.idle = range(Math.random, 3, 14);
      } else if (a.target) {
        const dx = a.target.x - a.x, dz = a.target.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.2) a.target = null;
        else {
          a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 3, dt);
          a.x += (dx / d) * a.speed * dt;
          a.z += (dz / d) * a.speed * dt;
        }
      }
      a.y = ctx.world.groundHeight(a.x, a.z);
      const ddx = a.x - p.x, ddz = a.z - p.z;
      if (ddx * ddx + ddz * ddz > far2) continue;
      if (n >= inst.instanceMatrix.count) break;
      this._writeMatrix(inst, n++, a, scale, 0);
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
  }

  /** Anything in this vehicle's path within a few metres, and how close. */
  _vehicleAhead(a, self, ctx, p) {
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    let nearest = Infinity;

    const consider = (ox, oz, radius) => {
      const dx = ox - a.x, dz = oz - a.z;
      const along = dx * fx + dz * fz;              // distance down the road
      if (along <= 0 || along > 9) return;
      const across = Math.abs(dx * fz - dz * fx);   // how far off the line
      if (across > 1.7 + radius) return;
      if (along < nearest) nearest = along;
    };

    // the player
    consider(p.x, p.z, 0.4);

    // other vehicles
    for (let ti = 0; ti < this.vehicleInst.length; ti++) {
      for (const o of this.vehicleInst[ti].agents) {
        if (o === a) continue;
        if (Math.abs(o.x - a.x) > 12 || Math.abs(o.z - a.z) > 12) continue;
        consider(o.x, o.z, VEHICLES[ti].w * 0.5);
      }
    }

    // cows, which stand in the road and are not going to move for you
    for (const c of this.cows) {
      if (Math.abs(c.x - a.x) > 12 || Math.abs(c.z - a.z) > 12) continue;
      consider(c.x, c.z, 0.8);
    }

    // people crossing
    for (const slot of this.peopleInst) {
      for (const o of slot.agents) {
        if (Math.abs(o.x - a.x) > 10 || Math.abs(o.z - a.z) > 10) continue;
        consider(o.x, o.z, 0.35);
      }
    }

    return nearest;
  }

  _stepVehicles(dt, ctx, p, far2) {
    for (let ti = 0; ti < this.vehicleInst.length; ti++) {
      const slot = this.vehicleInst[ti];
      let n = 0;
      for (const a of slot.agents) {
        // A chartered vehicle is being driven by RickshawSystem along an
        // agreed route, with the passenger sitting in it. It still gets drawn
        // and still sits on the ground, it just does not wander off with you
        // aboard.
        if (a.chartered) {
          a.y = ctx.world.groundHeight(a.x, a.z);
          if (n < slot.capacity) this._writeMatrix(slot.mesh, n++, a, 1, 0);
          continue;
        }

        // look down the road before moving
        const ahead = this._vehicleAhead(a, slot, ctx, p);
        const want = ahead < 3.2 ? 0 : ahead < 6.5 ? 0.35 : 1;
        a.throttle = a.throttle === undefined ? 1 : a.throttle + (want - a.throttle) * Math.min(1, dt * 3.5);

        const dx = a.x - p.x, dz = a.z - p.z;
        const d2 = dx * dx + dz * dz;
        this._stepVehicleAgent(a, dt, ctx, p, ctx.quality.drawDistance,
          a.speed * a.throttle, d2 < SOLID_NEAR * SOLID_NEAR);

        // a held-up driver sounds the horn, as they do
        if (a.throttle < 0.2) {
          a.hornAt = (a.hornAt || 0) - dt;
          if (a.hornAt <= 0) {
            a.hornAt = 3 + Math.random() * 6;
            ctx.bus.emit('sfx', { name: 'rickshawbell' });
          }
        }

        a.y = ctx.world.groundHeight(a.x, a.z);
        if (d2 > far2) continue;
        if (n >= slot.capacity) break;
        this._writeMatrix(slot.mesh, n++, a, 1, 0);
      }
      slot.mesh.count = n;
      slot.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * One ordinary vehicle, one step.
   *
   * Traffic used to share `_stepAgent` with the pedestrians, and that is the
   * whole reason the town's vehicles drove through buildings: that function
   * never calls world.collide, and it damps the yaw for looks while translating
   * along the raw direction to the target, so vehicles also crabbed sideways
   * through every turn. A vehicle steers now — heading, momentum, and the
   * collision result carried forward — and it only takes roads a vehicle could
   * actually get down.
   */
  _stepVehicleAgent(a, dt, ctx, p, far, want, solid) {
    const nav = ctx.nav;

    // somebody has spoken to the driver: he stops, and turns to answer
    if (a.greeting > 0) {
      a.greeting -= dt;
      driveStep(a, dt, ctx, a.greetYaw === undefined ? a.yaw : a.greetYaw, 0, AMBIENT, solid);
      return;
    }
    if (a.idle > 0) {
      a.idle -= dt;
      driveStep(a, dt, ctx, a.yaw, 0, AMBIENT, solid);
      return;
    }

    if (!a.target) {
      // recycle anyone who has drifted out of sight to somewhere just inside it
      const ax = a.x - p.x, az = a.z - p.z;
      if (Math.hypot(ax, az) > far * 1.15 && nav) {
        const n = nav.randomNodeNear(p.x, p.z, far * 0.75, Math.random);
        if (n) { a.x = n.x; a.z = n.z; a.node = n; a.vel = 0; a.stuck = 0; }
      }
      const next = this._nextRoad(a, nav);
      if (next) { a.target = next; a.node = next; }
      if (!a.target) { a.idle = 2; return; }
    }

    const dx = a.target.x - a.x, dz = a.target.z - a.z;
    const d = Math.hypot(dx, dz);
    // wider than a pedestrian's 0.7 m: a vehicle that has to touch the node
    // circles it, because it cannot turn on the spot
    if (d < 1.6) { a.target = null; return; }

    driveStep(a, dt, ctx, Math.atan2(dx, dz), want, AMBIENT, solid);
  }

  /** The next node a vehicle would take, from the roads a vehicle can use. */
  _nextRoad(a, nav) {
    const edges = a.node && a.node.edges;
    if (!nav || !edges || !edges.length) return null;
    let n = 0;
    for (let i = 0; i < edges.length; i++) if (DRIVABLE.has(edges[i].kind)) n++;
    // nothing drivable out of here: take anything rather than sit in the gali
    // for ever, and the steering will get it back out
    let pick = Math.floor(Math.random() * (n || edges.length));
    for (let i = 0; i < edges.length; i++) {
      if (n && !DRIVABLE.has(edges[i].kind)) continue;
      if (pick-- === 0) return nav.nodes.get(edges[i].to) || null;
    }
    return null;
  }

  _stepBirds(dt, ctx, p, far2) {
    let n = 0;
    const inst = this.birdInst;
    for (const b of this.birds) {
      b.t += dt * b.speed;
      const x = b.x + Math.cos(b.t) * b.r;
      const z = b.z + Math.sin(b.t) * b.r;
      const y = b.y + Math.sin(b.t * 2) * 1.5;
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz > far2) continue;
      if (n >= inst.instanceMatrix.count) break;
      _m.makeRotationY(-b.t + Math.PI / 2);
      _m.setPosition(x, y, z);
      inst.setMatrixAt(n++, _m);
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
  }

  _writeMatrix(inst, i, a, scale, bob) {
    _m.makeRotationY(a.yaw);
    _m.setPosition(a.x, a.y + bob, a.z);
    if (scale !== 1) _m.scale(_s.set(scale, scale, scale));
    inst.setMatrixAt(i, _m);
  }

  /**
   * Push the player out of anyone they are standing in.
   *
   * Walking through a person is the single fastest way to stop believing in
   * a place, so everyone is solid. The exception is cows, which are soft: you
   * squeeze past them the way you actually do, because a cow asleep across a
   * gali should be an obstacle with give, not a wall.
   *
   * `skip` is the agent doing the asking, and it is not optional decoration. A
   * driving vehicle tests a point about a tenth of a metre ahead of where it
   * already is, against its own 1.2 m radius — so it found itself, decided it
   * was badly overlapped, and shoved itself a metre down the road every single
   * frame, incrementing its own bump count as it went.
   */
  collideAgents(pos, radius, skip = null) {
    let hit = null;

    // The player is displaced as little as possible: being shoved around by
    // passers-by every frame is what made walking feel unsteady. People are
    // solid enough to stop you walking through them, and no more.
    const push = (ax, az, r, soft) => {
      const dx = pos.x - ax, dz = pos.z - az;
      const d = Math.hypot(dx, dz);
      const min = r + radius;
      if (d >= min || d < 1e-5) return false;
      const overlap = min - d;
      if (overlap < 0.015) return false;             // ignore grazing contact
      const k = soft ? 0.18 : 0.55;
      const outBy = (overlap / d) * k;
      pos.x += dx * outBy;
      pos.z += dz * outBy;
      return true;
    };

    // people
    for (const slot of this.peopleInst) {
      for (const a of slot.agents) {
        if (a === skip) continue;
        if (Math.abs(a.x - pos.x) > 3 || Math.abs(a.z - pos.z) > 3) continue;
        if (push(a.x, a.z, 0.34, false)) {
          // they notice, and they remember for a moment
          a.bumped = (a.bumped || 0) + 1;
          a.bumpAt = a.bumpAt || 0;
          hit = hit || { kind: "person", agent: a };
        }
      }
    }

    // vehicles, which are bigger and firmly solid
    for (let ti = 0; ti < this.vehicleInst.length; ti++) {
      const v = VEHICLES[ti];
      const r = Math.max(v.w, v.l) * 0.42;
      for (const a of this.vehicleInst[ti].agents) {
        if (a === skip) continue;
        if (Math.abs(a.x - pos.x) > 6 || Math.abs(a.z - pos.z) > 6) continue;
        if (push(a.x, a.z, r, false)) {
          a.bumped = (a.bumped || 0) + 1;
          hit = hit || { kind: "vehicle", agent: a, type: v };
        }
      }
    }

    // cows and dogs give way
    for (const a of this.cows) {
      if (Math.abs(a.x - pos.x) > 3.5 || Math.abs(a.z - pos.z) > 3.5) continue;
      if (push(a.x, a.z, 0.72, true)) hit = hit || { kind: "cow", agent: a };
    }
    for (const a of this.dogs) {
      if (Math.abs(a.x - pos.x) > 2 || Math.abs(a.z - pos.z) > 2) continue;
      push(a.x, a.z, 0.3, true);
    }

    return hit;
  }

  /** The nearest person or driver worth speaking to. */
  /**
   * The nearest thing within range you could address.
   *
   * `want` narrows it: "person" for a passer-by, "driver" for a vehicle that
   * carries passengers, omitted for whichever is closest. That parameter is
   * not decoration. People and vehicles used to compete for one "nearest"
   * slot, and the rickshaw system asked for the nearest *anything* and then
   * discarded it unless it was a driver — so standing in front of an
   * e-rickshaw with a single pilgrim walking past meant no ride, on a street
   * carrying nearly two hundred people. Ask for what you actually want.
   */
  /**
   * Put a vehicle of a given type at a spot, facing a given way.
   *
   * Used by the typed words — you ask for a rickshaw and one is there. It goes
   * in as an ordinary agent so it drives, queues and can be hailed like any
   * other, and it is parked on the nearest road node rather than wherever you
   * happen to be standing, so it does not materialise inside a wall.
   */
  spawnVehicleAt(typeId, x, z, yaw = 0) {
    const ti = VEHICLES.findIndex((v) => v.id === typeId);
    if (ti < 0) return false;
    const slot = this.vehicleInst[ti];
    if (!slot) return false;

    // drop the oldest if this type is already full rather than refusing
    if (slot.agents.length >= slot.capacity) slot.agents.shift();

    const nav = this.ctx.nav;
    const node = nav && nav.nearest ? nav.nearest(x, z) : null;
    const px = node ? node.x : x;
    const pz = node ? node.z : z;

    slot.agents.push({
      x: px, z: pz, y: this.ctx.world.groundHeight(px, pz), yaw,
      speed: VEHICLES[ti].speed,
      cur: 0, target: null, node, throttle: 1,
    });
    this.vehicles.push({ typeIdx: ti });
    return true;
  }

  nearestSpeakable(x, z, range, want = null) {
    let best = null, bestD = range;

    if (want !== "driver") {
      for (const slot of this.peopleInst) {
        for (const a of slot.agents) {
          const d = Math.hypot(a.x - x, a.z - z);
          if (d < bestD) { bestD = d; best = { kind: "person", agent: a, d }; }
        }
      }
    }

    if (want !== "person") {
      for (let ti = 0; ti < this.vehicleInst.length; ti++) {
        if (!VEHICLES[ti].hire) continue;         // only what carries passengers
        for (const a of this.vehicleInst[ti].agents) {
          const d = Math.hypot(a.x - x, a.z - z);
          if (d < bestD) { bestD = d; best = { kind: "driver", agent: a, type: VEHICLES[ti], d }; }
        }
      }
    }

    return best;
  }

  dispose() {
    this.ctx.scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.mat.dispose();
  }
}

const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();
