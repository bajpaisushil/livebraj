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
  { id: 'cycle-rickshaw', label: 'Cycle rickshaw', hindi: 'रिक्शा', speed: 3.2, w: 1.2, l: 2.6, h: 1.95, seat: 0.8, body: 0x2f5d5a, canopy: 0xc8452a, hire: { base: 10, perKm: 15, seats: 2 } },
  // 1.0 m wide: Saarthi, JSA, Neelam, Ele and E-Ashwa all give 0.95-1.0 (it was 1.4)
  { id: 'e-rickshaw', label: 'E-rickshaw', hindi: 'ई-रिक्शा', speed: 4.6, w: 1.0, l: 2.8, h: 1.76, seat: 0.62, body: 0x3f8f6a, canopy: 0xf2ece0, hire: { base: 10, perKm: 12, seats: 6 } },
  { id: 'auto', label: 'Auto rickshaw', hindi: 'ऑटो', speed: 5.4, w: 1.3, l: 2.7, h: 1.70, seat: 0.56, body: 0x1d4f3f, canopy: 0xf5d020, hire: { base: 20, perKm: 18, seats: 3 } },
  { id: 'tempo', label: 'Shared tempo', hindi: 'टेम्पो', speed: 4.2, w: 1.6, l: 3.6, h: 1.95, seat: 0.8, body: 0x3a5a8a, canopy: 0xe0d8c0, hire: { base: 10, perKm: 7, seats: 10, shared: true } },
  { id: 'taxi', label: 'Cab', hindi: 'टैक्सी', speed: 6.6, w: 1.75, l: 4.1, h: 1.52, seat: 0.5, body: 0xf0f0ea, canopy: null, hire: { base: 60, perKm: 26, seats: 4 } },
  { id: 'car', speed: 6.2, w: 1.7, l: 4.0, h: 1.5, seat: 0.48, body: 0xbfc4c8, canopy: null },
  { id: 'bike', speed: 6.8, w: 0.7, l: 1.9, h: 1.24, seat: 0.95, body: 0x3a3a42, canopy: null },
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

/**
 * Which side of the road a person walks on, and how far off the middle.
 *
 * Everyone — people, cows, dogs, rickshaws, cars — steered at NavGraph nodes,
 * and those nodes sit on the road CENTRELINE. So the crowd walked down the
 * middle of the carriageway and the vehicles drove through them. It was not
 * that the rickshaw failed to avoid anybody; it is that there was nowhere for
 * it to go. "It always strikes everyone."
 *
 * A pedestrian now holds a signed offset from the centreline for as long as
 * they live, so a road has a file of people up each verge and a clear channel
 * between them. Vehicles are untouched: `_stepVehicles` already aims straight
 * at the node, so clearing the middle is all that was needed.
 *
 * Half-widths are the real ones from the import: trunk 22 m, highway 14, main
 * 11, parikrama 9-11, street 6.5-8, gali 4.2-4.6, path 2.2-3.4.
 */
const KIND_HALF = {
  trunk: 11, highway: 7, main: 5.5, parikrama: 5, street: 3.6, gali: 2.2, path: 1.4,
};
/*
 * How far ahead along the leg a vehicle aims.
 *
 * NavGraph samples roads every 8 m, so a 6 m lookahead was aiming very nearly
 * AT the next node and pure pursuit degenerated to what it replaced — which is
 * exactly what the measurement showed: 2.93 m off the centreline before, 3.2
 * after. Shorter than the leg by enough to bite.
 */
const LANE_LOOK = 3.5;

/*
 * The horn.
 *
 * It fired on a 3-9 s timer for as long as a driver's throttle stayed under
 * 0.2, and a wedged vehicle never gets above that — so one stuck rickshaw rang
 * its bell every few seconds for ever, and with thirty-nine of them about the
 * town it was more or less continuous. "It keeps blowing bell."
 *
 * Three of them and he gives up, and only within earshot: the bell was
 * carrying across the whole town from vehicles you could not even see.
 */
const HORN_MAX = 3;
const HORN_GAP = [4.5, 11];
const HORN_RANGE = 42;
const VERGE_INSET = 1.0;      // how far inside the kerb a person walks
const MIN_VERGE = 0.35;       // a gali is not wide enough for a footway
const MAX_VERGE_FRAC = 0.82;  // never out past the kerb itself

function vergeFor(kind, side) {
  const half = KIND_HALF[kind] ?? 3.2;
  // A gali IS the footway — four metres wide, no kerb, and people walk down
  // the middle of one in Braj. Pushing them to its edge would put them through
  // the shopfronts, so on the narrow kinds this is a nudge and not a verge.
  const off = Math.min(Math.max(MIN_VERGE, half - VERGE_INSET), half * MAX_VERGE_FRAC);
  return side * off;
}

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

    /*
     * `h` is each vehicle's real overall height, and the roof goes there. It was
     * 1.47 m for everything with a canopy, and a passenger sitting under it put
     * head and shoulders through the top. Measured: an e-rickshaw stands
     * 1.725-1.87 m (Saarthi, JSA, Neelam, Ele, E-Ashwa specifications; 1.76 is
     * the middle of them), a Bajaj RE auto 1.70, a Dzire-sized cab 1.52; the
     * cycle rickshaw's hood and the tempo are estimates. `seat` is where a
     * seated passenger's hips are (RickshawSystem._seat), set so the avatar —
     * 0.99 m from hips to crown — clears the roof by 3 cm: an e-rickshaw's rear
     * bench about half a metre up, an auto's lower, a cab's lower still, as
     * they are. tools/checks/seated.mjs measures it.
     */
    this.vehicleGeo = VEHICLES.map((v) => {
      const b = new MeshBuilder();
      const H = v.h || 1.47;
      b.box(0, 0.32, 0, v.w, 0.5, v.l, v.body);
      if (v.id === 'taxi') b.box(0, H, -v.l * 0.2, 0.5, 0.16, 0.24, 0xf5d020);
      if (v.canopy) {
        b.box(0, H - 0.12, -v.l * 0.12, v.w + 0.12, 0.12, v.l * 0.62, v.canopy);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          b.box(sx * v.w * 0.42, 0.82, sz * v.l * 0.24, 0.06, H - 0.94, 0.06, 0x5a5a52);
        }
      } else {
        b.box(0, 0.82, -v.l * 0.05, v.w * 0.86, H - 0.82, v.l * 0.55, 0x8fa8b8);
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

  /**
   * How high to stand somebody who has been PUT somewhere, not walked there.
   *
   * Every step an agent takes is measured from its own feet — see the end of
   * `_stepAgent` — but a spawn or a recycle is a placement, and the feet it
   * carries belong to wherever it was before, if anywhere: they used to start
   * at 0 for everyone. So a placement starts again from the terrain under the
   * new spot, which is the rule the player keeps for a placement too:
   * `Player.placeAt` asks `standHeight` from the terrain under where it puts
   * you, and `Player._feet` forgets the old ground after a jump that large.
   */
  _placedY(x, z) {
    const w = this.ctx.world;
    return w.standHeightFast(x, z, w.groundHeight(x, z));
  }

  _addPerson(rng, i) {
    const typeIdx = i % PEOPLE.length;
    const slot = this.peopleInst[typeIdx];
    if (slot.agents.length >= slot.capacity) return;
    const node = this._startNode(rng);
    if (!node) return;
    const agent = {
      type: typeIdx,
      archetype: PEOPLE[typeIdx].id, x: node.x, z: node.z, y: this._placedY(node.x, node.z), yaw: rng() * TAU,
      speed: PEOPLE[typeIdx].speed * range(rng, 0.85, 1.15),
      target: null, phase: rng() * TAU, idle: 0, node,
      // which verge this person keeps to, for life. Held rather than rerolled
      // so a road has a file of people up each side instead of a crowd
      // shimmering across the middle of it.
      side: rng() < 0.5 ? -1 : 1, edgeKind: 'street',
    };
    slot.agents.push(agent);
    this.people.push(agent);
  }

  _addAnimal(list, rng, i, speed) {
    const node = this._startNode(rng);
    if (!node) return;
    list.push({
      x: node.x, z: node.z, y: this._placedY(node.x, node.z), yaw: rng() * TAU,
      speed: speed * range(rng, 0.7, 1.2),
      target: null, idle: range(rng, 0, 8), sitting: chance(rng, 0.35), phase: rng() * TAU,
      // cows wander nearer the middle than people do, because they do
      side: rng() < 0.5 ? -1 : 1, edgeKind: 'street',
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
      x: node.x, z: node.z, y: this._placedY(node.x, node.z), yaw: rng() * TAU,
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

    /*
     * Which gatherings the walking crowd has to walk AROUND.
     *
     * Crowd agents steer on the nav graph and never ask `world.collide`, so a
     * pedestrian strolled straight through the middle of a kirtan — twelve
     * people sitting on the ground and a man walking through all of them.
     * Only the player and the camera were ever stopped.
     *
     * Steered around the gathering's CENTRE and radius rather than around each
     * of its members: twelve circle tests times 196 pedestrians every frame is
     * real money, and the thing a person walks round is the kirtan, not each
     * singer in it. Gathered once here rather than per agent, and only the
     * ones near the player, because a pedestrian walking through a gathering
     * six hundred metres away is a thing nobody can see.
     */
    const near = this._nearG || (this._nearG = []);
    near.length = 0;
    if (this.ctx.gatherings) {
      for (const g of this.ctx.gatherings.gatherings) {
        if (g.onNow === false) continue;
        const dx = g.x - p.x, dz = g.z - p.z;
        if (dx * dx + dz * dz > 40000) continue;      // 200 m
        near.push(g);
      }
    }

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
        // and the height goes with them. It used to be left behind, and the
        // height is only set by walking, so somebody recycled into a pause
        // stood for those seconds at the height of the place they had left.
        if (n) { a.x = n.x; a.z = n.z; a.y = this._placedY(n.x, n.z); a.node = n; a.target = null; }
      }
      const edges = a.node ? a.node.edges : null;
      if (edges && edges.length) {
        const e = edges[Math.floor(Math.random() * edges.length)];
        const next = nav.nodes.get(e.to);
        // the verge depends on the road being walked, so it is re-read on
        // every leg: a street has room for a footway, a gali does not
        if (next) { a.target = next; a.node = next; a.edgeKind = e.kind; }
      }
      if (!a.target) { a.idle = 2; return; }
      if (Math.random() < 0.12) { a.idle = range(Math.random, 1.5, 6); return; }
    }

    /*
     * Aim at the verge, not at the centreline node.
     *
     * The perpendicular is taken from the agent's own bearing to the node, so
     * it needs no memory of the previous node and self-corrects: whatever the
     * offset starts at, the walk converges to a line parallel to the road at
     * `a.verge` metres from the middle. The arrival test has to measure the
     * OFFSET aim point too — against the node it would never come within
     * 0.7 m of a target four metres to its side, and the agent would circle it
     * for ever.
     */
    const toX = a.target.x - a.x, toZ = a.target.z - a.z;
    const toD = Math.hypot(toX, toZ) || 1;
    const verge = vergeFor(a.edgeKind, a.side);
    const aimX = a.target.x + (-toZ / toD) * verge;
    const aimZ = a.target.z + (toX / toD) * verge;

    let dx = aimX - a.x, dz = aimZ - a.z;
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

    /*
     * Go round the people who have sat down.
     *
     * Same shape as the avoidance for the player just above, and for the same
     * reason: a person walking is expected to go round a person who is not.
     * `K.radius` is the ground the whole gathering occupies, plus a little, so
     * the walker clears the outermost of the ring rather than clipping them.
     */
    const gs = this._nearG;
    if (gs) {
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        const gx = a.x - g.x, gz = a.z - g.z;
        const gd = Math.hypot(gx, gz);
        if (gd < 1e-4) continue;
        const keep = g.K.radius + 1.2;
        /*
         * Steer BEFORE arriving, and go AROUND rather than back.
         *
         * The first version of this only pushed once the walker was already
         * inside the ring, and only pushed radially — straight away from the
         * centre. Measured, that leaves people 7 cm from somebody sitting
         * down: by the time the push starts they are among the seated, and a
         * radial push fights the nav target head-on, so the walker stalls
         * against the edge and slides through on the next tick.
         *
         * So: a LOOK-AHEAD band a few metres wider than the gathering, and a
         * TANGENTIAL component inside it — pick the way round that agrees with
         * where they were already going, and lean that way. It is how a person
         * actually avoids a crowd: you see it coming and drift round it, you
         * do not walk into it and then back out.
         */
        const look = keep + 3.2;
        if (gd >= look) continue;

        // which way round: whichever side their current heading already favours
        const tx = -gz / gd, tz = gx / gd;
        const side = (nx * tx + nz * tz) >= 0 ? 1 : -1;

        // 0 at the edge of the look-ahead band, 1 at the ring itself
        const urgency = Math.min(1, (look - gd) / (look - keep + 1e-4));
        nx += side * tx * urgency * 1.5;
        nz += side * tz * urgency * 1.5;

        // and inside the ring, out as well as round — they should not be there
        if (gd < keep) {
          const away = (keep - gd) / keep;
          nx += (gx / gd) * away * 3.0;
          nz += (gz / gd) * away * 3.0;
        }
        const l2 = Math.hypot(nx, nz) || 1;
        nx /= l2; nz /= l2;
      }
    }

    a.yaw = dampAngle(a.yaw, Math.atan2(nx, nz), 5, dt);
    const step = a.speed * dt;
    a.x += nx * step;
    a.z += nz * step;
    /*
     * ON the floor, not on the terrain under it.
     *
     * This was `groundHeight`, which is the terrain and nothing else, so
     * anyone crossing paving, a forecourt or a ghat walked at the height of
     * the ground beneath it: 17 cm into Prem Mandir's plaza, and at Rangaji a
     * cow was measured 12 cm into the forecourt flags. It only went unseen
     * because the nav graph mostly keeps the crowd off built ground.
     *
     * The answer is the player's — the highest surface within a step of where
     * the feet already are, so a person climbs a tread and walks under a
     * balcony — asked through the index, because the full scan is 9 µs a call
     * and this is asked for every agent, every frame. `a.y` is the feet the
     * last step resolved, which is what the player measures from too.
     */
    a.y = ctx.world.standHeightFast(a.x, a.z, a.y);
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
      // on whatever floor is underfoot, the same as the people (`_stepAgent`)
      a.y = ctx.world.standHeightFast(a.x, a.z, a.y);
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

  /**
   * Who gives way at a junction.
   *
   * `_vehicleAhead` looks straight down a vehicle's own nose, so it queues
   * beautifully behind anything in front and is completely blind to anything
   * CROSSING. At a crossroads two vehicles are each outside the other's cone
   * right up until they are in the same place, and then they drive through one
   * another. Which is what you see at every junction in the town.
   *
   * So this is the other half: project both forward at the speed they are
   * actually doing, find the moment of closest approach, and if they will be
   * inside each other's width at that moment, ONE of them lifts off.
   *
   *   - Only crossing traffic. Headings within 40 degrees of each other are a
   *     queue, and `_vehicleAhead` already handles a queue properly. Applying
   *     this to a queue would make a whole line of traffic brake at once.
   *   - Whoever gets there LATER yields. That is both what happens here and
   *     the stable answer: a vehicle already into the junction keeps going
   *     rather than stopping in the middle of it.
   *   - The tie is broken by a fixed comparison, never by chance, so exactly
   *     one of any pair gives way. Both yielding is a deadlock, and a deadlock
   *     on a through road is worse than a collision — the collision clears.
   *
   * Returns a throttle ceiling: 1 to carry on, lower to ease off.
   */
  _crossYield(a, ti) {
    const LOOK_T = 2.4;          // seconds ahead worth worrying about
    const MIN_TURN = 0.70;       // radians — below this it is a queue, not a cross
    const av = (a.speed || 0) * (a.throttle === undefined ? 1 : a.throttle);
    if (av < 0.6) return 1;      // already stopped; nothing to decide
    const afx = Math.sin(a.yaw), afz = Math.cos(a.yaw);
    const aw = VEHICLES[ti].w * 0.5;
    let ceiling = 1;

    for (let tj = 0; tj < this.vehicleInst.length; tj++) {
      const ow = VEHICLES[tj].w * 0.5;
      for (const o of this.vehicleInst[tj].agents) {
        if (o === a) continue;
        const rx = o.x - a.x, rz = o.z - a.z;
        if (Math.abs(rx) > 18 || Math.abs(rz) > 18) continue;

        // a queue is not a junction
        let turn = Math.abs(a.yaw - o.yaw) % (Math.PI * 2);
        if (turn > Math.PI) turn = Math.PI * 2 - turn;
        if (turn < MIN_TURN) continue;

        const ov = (o.speed || 0) * (o.throttle === undefined ? 1 : o.throttle);
        const ofx = Math.sin(o.yaw), ofz = Math.cos(o.yaw);

        // closest approach of the two, as they are going now
        /*
         * Closest approach of the two.
         *
         * Separation at time t is (o + vo t) - (a + va t) = r - v t, with
         * v = va - vo. It is smallest when (r - v t) . v = 0, so t = r.v / v.v
         * and the gap then is |r - v t|. Getting that sign backwards — which
         * this did at first — puts every real conflict at a NEGATIVE time, so
         * every one is discarded as already past and the rule never fires once.
         */
        const vx = av * afx - ov * ofx, vz = av * afz - ov * ofz;
        const vv = vx * vx + vz * vz;
        if (vv < 0.04) continue;                  // same velocity: never meet
        const t = (rx * vx + rz * vz) / vv;
        if (t <= 0 || t > LOOK_T) continue;       // behind, or too far off
        const miss = Math.hypot(rx - vx * t, rz - vz * t);
        if (miss > aw + ow + 0.9) continue;       // they clear each other

        /*
         * Both are heading for the same square metre. Who gets there first?
         *
         * The spot is the midpoint of where each will be at the closest
         * approach — not "where I will be", which is just `t` again and tells
         * you nothing about the other vehicle.
         */
        const mx = (a.x + av * afx * t + o.x + ov * ofx * t) * 0.5;
        const mz = (a.z + av * afz * t + o.z + ov * ofz * t) * 0.5;
        const mine = Math.hypot(mx - a.x, mz - a.z) / Math.max(0.6, av);
        const theirs = Math.hypot(mx - o.x, mz - o.z) / Math.max(0.6, ov);

        /*
         * A dead heat has to break to EXACTLY ONE of them, or both go and the
         * rule has achieved nothing. A symmetric junction is a genuine dead
         * heat — two vehicles nine metres out at the same speed — so the
         * tie-break must be a total order over the pair and not a sum, which
         * is equal for the very case that needs deciding.
         */
        const giveWay = theirs < mine - 0.05
          || (Math.abs(theirs - mine) <= 0.05
              && (a.x !== o.x ? a.x > o.x : a.z > o.z));
        if (!giveWay) continue;

        // ease off in proportion to how soon it is: 2.4 s away is a lift,
        // half a second away is the brake
        const k = Math.max(0, Math.min(1, t / LOOK_T));
        ceiling = Math.min(ceiling, 0.08 + 0.72 * k);
      }
    }
    return ceiling;
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
          /*
           * Still the terrain, unlike every other agent here, because this one
           * is not ours to lift. RickshawSystem owns a chartered vehicle's
           * height and seats its passenger by `groundHeight`; standing the deck
           * on a floor while the seat stays on the terrain would sink whoever
           * is riding into it. Both move together or neither does.
           */
          a.y = ctx.world.groundHeight(a.x, a.z);
          if (n < slot.capacity) this._writeMatrix(slot.mesh, n++, a, 1, 0);
          continue;
        }

        // look down the road before moving — and across it
        const ahead = this._vehicleAhead(a, slot, ctx, p);
        const queue = ahead < 3.2 ? 0 : ahead < 6.5 ? 0.35 : 1;
        const want = Math.min(queue, this._crossYield(a, ti));
        a.throttle = a.throttle === undefined ? 1 : a.throttle + (want - a.throttle) * Math.min(1, dt * 3.5);

        const dx = a.x - p.x, dz = a.z - p.z;
        const d2 = dx * dx + dz * dz;
        this._stepVehicleAgent(a, dt, ctx, p, ctx.quality.drawDistance,
          a.speed * a.throttle, d2 < SOLID_NEAR * SOLID_NEAR);

        /*
         * A held-up driver sounds the horn, as they do — but he gives up.
         *
         * This fired on a 3-9 s timer for as long as throttle stayed under 0.2,
         * and a vehicle that is properly wedged never gets above that. So one
         * stuck rickshaw rang its bell every few seconds for ever, and with
         * thirty-nine of them about the town the bell was more or less
         * continuous. "It keeps blowing bell."
         *
         * Three changes: he only sounds it a few times before giving up and
         * waiting like everybody else, he does not sound it at all unless
         * somebody is near enough to be the obstruction, and he does not sound
         * it when he is too far away for you to be the reason.
         */
        const nearYou = Math.hypot(a.x - p.x, a.z - p.z) < HORN_RANGE;
        if (a.throttle < 0.2 && nearYou && (a.honks || 0) < HORN_MAX) {
          a.hornAt = (a.hornAt || 0) - dt;
          if (a.hornAt <= 0) {
            a.hornAt = HORN_GAP[0] + Math.random() * (HORN_GAP[1] - HORN_GAP[0]);
            a.honks = (a.honks || 0) + 1;
            ctx.bus.emit('sfx', { name: 'rickshawbell' });
          }
        } else if (a.throttle > 0.55) {
          // moving again: he has no reason to be cross any more
          a.honks = 0;
        }

        // on the paving it is driving over, not in it (see `_stepAgent`)
        a.y = ctx.world.standHeightFast(a.x, a.z, a.y);
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
        // a placement, so the height starts again from the new spot's terrain
        if (n) { a.x = n.x; a.z = n.z; a.y = this._placedY(n.x, n.z); a.node = n; a.prev = null; a.vel = 0; a.stuck = 0; }
      }
      const next = this._nextRoad(a, nav);
      // the leg it is driving, not just where it is going: without the start
      // point there is no line to hold, only a point to aim at
      if (next) { a.prev = a.node; a.target = next; a.node = next; }
      if (!a.target) { a.idle = 2; return; }
    }

    const dx = a.target.x - a.x, dz = a.target.z - a.z;
    const d = Math.hypot(dx, dz);
    // wider than a pedestrian's 0.7 m: a vehicle that has to touch the node
    // circles it, because it cannot turn on the spot
    if (d < 1.6) { a.target = null; return; }

    /*
     * Follow the LINE, not the point.
     *
     * Steering straight at the next node let a vehicle swing wide through
     * every turn and then cut back — measured at 2.93 m off the centreline at
     * the median and 9.16 m at the ninetieth, which is out on the verge where
     * the people now walk. Aiming at a point some way ahead ALONG the leg is
     * ordinary pure pursuit: it pulls the vehicle back onto the line and holds
     * it there, and because it is an aim POINT rather than a correction angle
     * there is no sign convention to get backwards.
     */
    let aimX = a.target.x, aimZ = a.target.z;
    if (a.prev) {
      const sx = a.target.x - a.prev.x, sz = a.target.z - a.prev.z;
      const sl = Math.hypot(sx, sz);
      if (sl > 0.5) {
        const ux = sx / sl, uz = sz / sl;
        const along = (a.x - a.prev.x) * ux + (a.z - a.prev.z) * uz;
        const look = Math.min(sl, Math.max(0, along) + LANE_LOOK);
        aimX = a.prev.x + ux * look;
        aimZ = a.prev.z + uz * look;
      }
    }

    driveStep(a, dt, ctx, Math.atan2(aimX - a.x, aimZ - a.z), want, AMBIENT, solid);
  }

  /** The next node a vehicle would take, from the roads a vehicle can use. */
  _nextRoad(a, nav) {
    const edges = a.node && a.node.edges;
    if (!nav || !edges || !edges.length) return null;
    // a drivable edge, and not against a one-way road's traffic (NavGraph)
    const ok = (e) => DRIVABLE.has(e.kind) && !e.against;
    let n = 0;
    for (let i = 0; i < edges.length; i++) if (ok(edges[i])) n++;
    // nothing drivable out of here: take anything rather than sit in the gali
    // for ever, and the steering will get it back out
    let pick = Math.floor(Math.random() * (n || edges.length));
    for (let i = 0; i < edges.length; i++) {
      if (n && !ok(edges[i])) continue;
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

    // Put it where it was asked for, nudged onto the road only if the road is
    // RIGHT THERE.
    //
    // This used to snap to nav.nearest() unconditionally, and that returns the
    // nearest node however far away it is — so in open ground, or out at
    // Chhatikara, you typed "rath", got told one had arrived, and it was
    // sitting fifty metres away behind you. A vehicle you cannot see has not
    // arrived. Twelve metres is close enough that it reads as pulling over.
    const nav = this.ctx.nav;
    const node = nav && nav.nearest ? nav.nearest(x, z) : null;
    const onRoad = node && Math.hypot(node.x - x, node.z - z) <= 12;
    let px = onRoad ? node.x : x;
    let pz = onRoad ? node.z : z;

    // and never on top of the person who asked for it.
    //
    // You are usually standing ON a road when you ask, so the nearest node is
    // under your own feet and the snap above put the vehicle inside you — which
    // is why "rath" announced one had arrived and there was nothing to see.
    const me = this.ctx.player && this.ctx.player.position;
    if (me && Math.hypot(px - me.x, pz - me.z) < 2.6) {
      px = x; pz = z;                       // keep the offset it was asked for
    }

    // and never inside a wall
    const w = this.ctx.world;
    if (w && w.isClear && !w.isClear(px, pz, 1.2)) {
      let found = false;
      for (let r = 2; r <= 8 && !found; r += 2) {
        for (let k = 0; k < 8; k++) {
          const th = (k / 8) * TAU;
          const nx = px + Math.cos(th) * r, nz = pz + Math.sin(th) * r;
          if (w.isClear(nx, nz, 1.2)) { px = nx; pz = nz; found = true; break; }
        }
      }
      if (!found) return false;
    }

    slot.agents.push({
      // the terrain, not a floor: it is chartered from the start, and a
      // chartered vehicle's height is RickshawSystem's (see `_stepVehicles`)
      x: px, z: pz, y: this.ctx.world.groundHeight(px, pz), yaw,
      speed: VEHICLES[ti].speed,
      cur: 0, target: null, node: onRoad ? node : null, throttle: 1,
      // so a caller can find the one it just asked for
      spawnedByWord: true,
      /**
       * Yours, and it waits.
       *
       * A spawned vehicle used to be an ordinary agent, which means the crowd
       * AI took the handle and drove it off down the road while you were still
       * walking towards it. You asked for a rath; what turned up was traffic.
       * `chartered` stops CrowdSystem steering it, and `personal` tells
       * RickshawSystem this one is not a taxi to be hired but a vehicle to be
       * driven.
       */
      personal: true,
      chartered: true,
      vel: 0,
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

    /*
     * The people who have SAT DOWN.
     *
     * This used to scan only `peopleInst` and the vehicles — the walking crowd
     * and the drivers — so you could stand in the middle of a kirtan with
     * twelve people around you and there was nobody to talk to. A gathering
     * was scenery. They are the one group in this town who are not going
     * anywhere, so they are the easiest people in it to speak to, and they
     * were the only ones you could not.
     *
     * `gKind` rides along because what somebody says depends on what they are
     * sitting at, not on their archetype — see DialogueSystem.LINES.
     */
    if (want !== "driver" && this.ctx.gatherings) {
      for (const g of this.ctx.gatherings.gatherings) {
        // cheap reject on the gathering before its members
        if (Math.abs(g.x - x) > range + 8 || Math.abs(g.z - z) > range + 8) continue;
        for (const m of g.members) {
          const d = Math.hypot(m.x - x, m.z - z);
          if (d < bestD) { bestD = d; best = { kind: "gathering", agent: m, gKind: g.kind, d }; }
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
