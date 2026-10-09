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
import { busyness } from './CrowdCalendar.js';

/*
 * THE CROWD FOLLOWS THE CALENDAR (CrowdCalendar.js): how many of the people
 * the game carries are out at this hour, on this day. Never fewer than
 * CALENDAR_FLOOR of them — the small hours still have sadhus, chai and
 * people going home — and changed a few at a time, only out of sight, so
 * nobody vanishes in front of you or appears from nowhere.
 */
const CALENDAR_FLOOR = 0.3;
const CALENDAR_STEP = 3;          // people sent home or brought out per second
const OUT_OF_SIGHT = 70;          // metres from you before anyone may come or go
const AWAY = 1e7;                 // where the people not out right now are kept
/*
 * And the traffic: e-rickshaws and autos run to the same day as the people
 * they carry — thin in the small hours, every one out on a festival — but
 * never fewer than a quarter of them, because the night has its share of
 * station runs and the late bus from Delhi.
 */
const TRAFFIC_FLOOR = 0.25;
const TRAFFIC_STEP = 2;           // vehicles sent off the road or brought back per second

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
 * Which side of the road a vehicle keeps — the LEFT, as everywhere in India —
 * and how far off the middle, by the kind of road.
 *
 * Every vehicle drove its leg's centreline, both ways. Two meeting on a
 * two-way road met nose to nose, each saw the other dead ahead, and both
 * stopped for good: once the one-way roads were one way, that was every long
 * standoff the traffic check had left (queue item 21).
 *
 * The street is the tight one: 3.6 m to the kerb, and its people walk 2.6 m
 * off the middle (`vergeFor`). A full lane there (1.05 m) put every vehicle
 * 1.55 m from the walkers on its side, and with the corridor narrowed to
 * match, a sweep of sixty towns had a vehicle standing in somebody in 27 of
 * them, against 7 before. So on a street a
 * vehicle keeps a little left of the middle, as it does in the town, and
 * moves over only as far as it needs to for whatever is coming the other
 * way (`meet` in `_vehicleAhead`). The wider roads have room for a lane each
 * all the time. A one-way carriageway is all one lane, driven down its middle.
 */
const LANE = { street: 0.6, parikrama: 1.7, main: 1.9, highway: 2.4, trunk: 2.8 };
/* How far ahead a vehicle coming the other way is seen and made room for,
 * and the least each moves over for it: two passing 1.5 m apart, centre to
 * centre, whatever their widths. */
const MEET_M = 22;
const MEET_MIN = 0.75;
/*
 * How much room a vehicle wants beside what it is passing, flank to flank:
 * PASS_GAP for a vehicle coming the other way in its own lane, PEOPLE_GAP for
 * somebody on foot, a cow, or you. `_vehicleAhead` used one corridor 1.7 m
 * beyond the other's width for everything, and kept left, the walkers on the
 * verge and the traffic coming the other way are all inside that.
 */
const PASS_GAP = 0.2;
const PEOPLE_GAP = 0.5;
/*
 * Going round.
 *
 * A vehicle held by something that is going nowhere never moved again:
 * `_vehicleAhead` held it, wanting no speed, and getting nowhere while
 * wanting none is not "stuck" to VehicleDrive. Two that met face to face at
 * a junction held each other for good (seed 39: a cycle rickshaw and a bike
 * on a stitch, for thirty seconds), and so did a rickshaw nosed up to
 * somebody standing in the road (seed 17). So, as everybody here does: wait
 * a moment, then go round — overtaking on the right, or pulling in to the
 * left of something coming the other way — slowly, and only round that one
 * thing. Of two holding each other, only one goes, by a fixed order; the
 * other waits, since what it waits for is leaving.
 */
/*
 * What is ahead is measured as the GAP, from this vehicle's nose to the near
 * side of the thing, and not centre to centre. It was centre to centre, with
 * the stop at 3.2 m: shorter than a cab, which is 4.1 m long, so cabs queued
 * a metre into each other and the traffic check, counting centres within
 * 1.5 m, never saw it. Somebody on foot is given half a metre more.
 */
const STOP_GAP = 0.8;        // stop
const SLOW_GAP = 4.0;        // ease off to a crawl
const FOOT_GAP = 0.5;        // and this much more for somebody on foot, a cow, or you
const HOLD_S = 2.0;          // held by somebody, a cow, or a vehicle holding for it
const HOLD_QUEUE_S = 6.0;    // held behind a vehicle that is itself waiting
const ROUND_S = 7.0;         // the longest a way round is kept
const ROUND_THR = 0.55;      // and the throttle it is taken at

/** The lane for a leg: kept left on a two-way road, the middle of a one-way
 *  one, and across a junction's stitch, whatever it had coming in. */
function laneFor(e, had) {
  if (e.kind === 'stitch') return had || 0;
  if (e.oneway || e.against) return 0;
  return LANE[e.kind] || 0;
}

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
const STEP_ASIDE = 2.4;       // how near a vehicle has to be for a walker to step out of its way
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
    /*
     * On, unless the browser is driven by automation: every check written
     * before this assumes the whole crowd is out, and a check must not read
     * differently at three in the morning. The check of the calendar itself
     * turns it on, with a clock of its own (setCalendar).
     */
    this.calendar = {
      on: !(typeof navigator !== 'undefined' && navigator.webdriver),
      clock: null, level: 1, because: '', told: false, acc: 1, seconds: 0,
      // the first pass sets the town to the hour at once, before anything is seen
      fresh: true,
    };
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
    // what each slot of `vehicleInst` is, by the same index (sizes for the checks)
    this.vehicleTypes = VEHICLES;
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

  /**
   * Turn the calendar on or off, or pin its clock: `clock` is a Date whose
   * local fields read Braj's time (as LiveConditions.vrindavanTime gives
   * one), or null for the live clock. Off brings everyone out at once.
   */
  setCalendar(on, clock = null, atOnce = false) {
    const c = this.calendar;
    c.on = !!on; c.clock = clock; c.acc = 1;
    if (atOnce) c.fresh = true;
    if (!c.on) {
      for (const a of this.people) if (a.away) this._comeOut(a, null, true);
      for (const a of this._traffic()) if (a.away) this._driveOut(a, null, true);
    }
  }

  /** Every ambient vehicle, in a fixed order: by kind, then as added. */
  _traffic() {
    const out = [];
    for (const slot of this.vehicleInst) for (const a of slot.agents) out.push(a);
    return out;
  }

  /**
   * Bring one vehicle back onto the road: where it was, if that is out of
   * sight and in the band the traffic recycles within; else a node there on
   * a road a vehicle takes (`_addVehicle` places them the same way).
   */
  _driveOut(a, p, anywhere) {
    let x = a.away.x, z = a.away.z, node = a.away.node || a.node;
    if (!anywhere && p) {
      const far = this.ctx.quality.drawDistance;
      const inBand = (qx, qz) => { const d = Math.hypot(qx - p.x, qz - p.z); return d > OUT_OF_SIGHT && d < far * 1.1; };
      if (!inBand(x, z)) {
        const nav = this.ctx.nav;
        let n = null;
        for (let k = 0; k < 16 && nav && nav.randomNodeNear; k++) {
          const q = nav.randomNodeNear(p.x, p.z, far * 1.05, Math.random);
          if (q && inBand(q.x, q.z) && q.edges.some((e) => DRIVABLE.has(e.kind))) { n = q; break; }
        }
        if (!n) return false;
        x = n.x; z = n.z; node = n;
      }
    }
    a.x = x; a.z = z; a.y = this._placedY(x, z);
    a.node = node; a.prev = null; a.target = null; a.vel = 0; a.stuck = 0; a.throttle = 1;
    a.away = null;
    return true;
  }

  /** How busy the town is now, by the calendar (or full, with it off). */
  calendarNow(ctx = this.ctx) {
    const c = this.calendar;
    if (!c.on) return { level: 1, because: '', festival: null };
    const live = c.clock || (ctx.live && ctx.live.vrindavanTime
      && ctx.state.settings.liveTime !== false ? ctx.live.vrindavanTime().date : null);
    if (!live) return { level: 1, because: '', festival: null };
    return busyness(live);
  }

  /**
   * Once a second: how many should be out, and a few sent home or brought
   * out toward that — the highest-numbered first home, the lowest first out,
   * so the people any code finds by number are the last to go. Only people
   * out of sight change, except in the first second, before anything has
   * been seen, when the town is set to the hour at once.
   */
  _followCalendar(dt, ctx, p) {
    const c = this.calendar;
    c.acc += dt; c.seconds += dt;
    if (c.acc < 1) return;
    c.acc = 0;
    const now = this.calendarNow(ctx);
    c.level = now.level; c.because = now.because;
    const want = Math.round(this.people.length * Math.max(CALENDAR_FLOOR, c.on ? now.level : 1));
    let out = 0;
    for (const a of this.people) if (!a.away) out++;
    const first = c.fresh;
    c.fresh = false;
    let budget = first ? Infinity : CALENDAR_STEP;
    const unseen = (x, z) => first || Math.hypot(x - p.x, z - p.z) > OUT_OF_SIGHT;
    if (out > want) {
      for (let i = this.people.length - 1; i >= 0 && out > want && budget > 0; i--) {
        const a = this.people[i];
        if (a.away || !unseen(a.x, a.z)) continue;
        a.away = { x: a.x, z: a.z };
        a.x = AWAY; a.z = AWAY; a.walking = false;
        out--; budget--;
      }
    } else if (out < want) {
      for (let i = 0; i < this.people.length && out < want && budget > 0; i++) {
        const a = this.people[i];
        if (!a.away) continue;
        if (this._comeOut(a, p, first)) { out++; budget--; }
      }
    }
    /*
     * The traffic, by the same rule and the same courtesy: never a vehicle
     * you could see, never one somebody is riding in or asked for by name.
     */
    {
      const all = this._traffic();
      const level = c.on ? Math.max(TRAFFIC_FLOOR, now.level) : 1;
      const wantV = Math.round(all.length * level);
      let outV = 0;
      for (const a of all) if (!a.away) outV++;
      let budgetV = first ? Infinity : TRAFFIC_STEP;
      const keep = (a) => a.chartered || a.spawnedByWord || a.hired || a.driven;
      if (outV > wantV) {
        for (let i = all.length - 1; i >= 0 && outV > wantV && budgetV > 0; i--) {
          const a = all[i];
          if (a.away || keep(a) || !unseen(a.x, a.z)) continue;
          a.away = { x: a.x, z: a.z, node: a.node };
          a.x = AWAY; a.z = AWAY; a.target = null; a.vel = 0;
          outV--; budgetV--;
        }
      } else if (outV < wantV) {
        for (let i = 0; i < all.length && outV < wantV && budgetV > 0; i++) {
          const a = all[i];
          if (!a.away) continue;
          if (this._driveOut(a, p, first)) { outV++; budgetV--; }
        }
      }
    }
    // say so once, on a day worth saying it about, once you are in the world
    if (!c.told && c.on && now.because && c.seconds > 4 && ctx.ui && ctx.ui.screen === 'world') {
      c.told = true;
      const f = now.festival;
      if (ctx.bus) {
        ctx.bus.emit('ui:toast', f
          ? { title: f.name, sub: `${f.hindi} · ${now.level > 0.8 ? 'the town is full of pilgrims' : 'pilgrims are arriving'}` }
          : { title: now.because, sub: now.level > 0.8 ? 'the weekend crowd is out' : 'a weekend in Braj' });
      }
    }
  }

  /**
   * Bring one person back out, out of sight but not so far off that the
   * walk would recycle them at once — `_stepAgent` moves anyone past 1.15
   * of the draw distance to a node anywhere within three-quarters of it,
   * which can be beside you. Where they were, if that is in the band; else
   * a node that is.
   */
  _comeOut(a, p, anywhere) {
    let x = a.away.x, z = a.away.z;
    if (!anywhere && p) {
      const far = this.ctx.quality.drawDistance;
      const inBand = (qx, qz) => { const d = Math.hypot(qx - p.x, qz - p.z); return d > OUT_OF_SIGHT && d < far * 1.1; };
      if (!inBand(x, z)) {
        const nav = this.ctx.nav;
        let n = null;
        for (let t = 0; t < 12 && nav && nav.randomNodeNear; t++) {
          const q = nav.randomNodeNear(p.x, p.z, far * 1.05, Math.random);
          if (q && inBand(q.x, q.z)) { n = q; break; }
        }
        if (!n) return false;
        x = n.x; z = n.z; a.node = n; a.target = null;
      }
    }
    a.x = x; a.z = z; a.y = this._placedY(x, z);
    a.away = null;
    return true;
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
    this._followCalendar(dt, ctx, p);

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
        if (a.away) continue;                       // not out at this hour
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
     * And out of a vehicle's way — AROUND it, as round the people sitting
     * down below, and not straight back. Nobody gave way to a vehicle at all:
     * a walker on the verge kept their line into the side of a bike going
     * round a wall (seed 40). Pushed straight away, one whose way lay past a
     * rickshaw's nose stood at the nose, the push and the pull cancelling,
     * and the rickshaw waited for them for good (seed 17). So: a little away,
     * and more along — the way round that agrees with where they were going.
     */
    let shy = false;
    for (let ti = 0; ti < this.vehicleInst.length; ti++) {
      for (const v of this.vehicleInst[ti].agents) {
        const vx = a.x - v.x, vz = a.z - v.z;
        if (vx > STEP_ASIDE || vx < -STEP_ASIDE || vz > STEP_ASIDE || vz < -STEP_ASIDE) continue;
        const vd = Math.hypot(vx, vz);
        if (vd >= STEP_ASIDE || vd < 1e-4) continue;
        const k = (STEP_ASIDE - vd) / STEP_ASIDE;
        const ox = vx / vd, oz = vz / vd;
        // the tangent on the side they were already heading
        const side = -oz * nx + ox * nz >= 0 ? 1 : -1;
        nx += ox * k * 0.8 - oz * side * k * 1.4;
        nz += oz * k * 0.8 + ox * side * k * 1.4;
        shy = true;
      }
    }
    if (shy) {
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
  _vehicleAhead(a, half, ctx, p, hl = 1.4) {
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    // what it is already going round is not in its way (`_goRound`)
    const skip = a.round ? a.round.o : null;
    let nearest = Infinity;
    let who = null, whoR = 0, whoV = false, whoOn = false;

    /*
     * Down the line it is steering for, too, when that is not the way it is
     * facing — for other vehicles only. Looking only off the nose, a rickshaw
     * turning onto its next leg saw the auto stopped across that leg 6 cm
     * from its nose, and turned into it (seed 1). Looking for everything down
     * that line stopped the traffic at every corner for the people on the
     * verge it was turning past, and the traffic check's sweep was worse for
     * it, not better.
     */
    let gx = fx, gz = fz;
    if (a.aimYaw !== undefined) {
      let d = a.aimYaw - a.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > 0.15) { gx = Math.sin(a.aimYaw); gz = Math.cos(a.aimYaw); }
    }
    /*
     * `reach`: how far off the nose's line something has to be to be passed.
     * `depth`: how far it reaches back toward this vehicle along that line,
     * so what comes back is the gap from the nose (STOP_GAP).
     */
    const along1 = (dx, dz, ux, uz, reach) => {
      const along = dx * ux + dz * uz;              // distance down the road
      if (along <= 0 || along > 9 + hl) return Infinity;
      return Math.abs(dx * uz - dz * ux) > reach ? Infinity : along;   // how far off the line
    };
    const consider = (ox, oz, reach, o, radius, depth, isV = false, on = false) => {
      if (o === skip) return;
      const dx = ox - a.x, dz = oz - a.z;
      let along = along1(dx, dz, fx, fz, reach);
      if (isV && (gx !== fx || gz !== fz)) along = Math.min(along, along1(dx, dz, gx, gz, reach));
      if (along === Infinity) return;
      const gap = along - hl - depth;
      if (gap < nearest) { nearest = gap; who = o; whoR = radius; whoV = isV; whoOn = on; }
    };
    // somebody on foot, a cow, or you: passed once the flanks clear (PEOPLE_GAP)
    const flank = (radius) => half + radius + PEOPLE_GAP;

    // the player
    consider(p.x, p.z, flank(0.4), p, 0.4, 0.4 + FOOT_GAP);

    // other vehicles
    let meet = 0;
    for (let ti = 0; ti < this.vehicleInst.length; ti++) {
      const ow = VEHICLES[ti].w * 0.5;
      for (const o of this.vehicleInst[ti].agents) {
        if (o === a) continue;
        const dx = o.x - a.x, dz = o.z - a.z;
        if (Math.abs(dx) > MEET_M || Math.abs(dz) > MEET_M) continue;
        /*
         * Coming the other way, it is in its own lane and is passed the same
         * way — and made room for, by moving over as far as the two of them
         * need (LANE). Going this way, it is the queue, and the queue keeps
         * the wide corridor it always had: a vehicle in front is followed.
         */
        const oncoming = Math.sin(o.yaw) * fx + Math.cos(o.yaw) * fz < 0;
        if (oncoming && o !== skip) {
          const along = dx * fx + dz * fz;
          if (along > 0 && along < MEET_M && Math.abs(dx * fz - dz * fx) < 4.5) {
            meet = Math.max(meet, (half + ow + PASS_GAP + 0.15) * 0.5, MEET_MIN);
          }
        }
        if (Math.abs(dx) > 14 || Math.abs(dz) > 14) continue;
        // its length along this vehicle's line, as it lies: end on, or across
        const ofx = Math.sin(o.yaw), ofz = Math.cos(o.yaw);
        const depth = VEHICLES[ti].l * 0.5 * Math.abs(ofx * fx + ofz * fz) + ow * Math.abs(ofz * fx - ofx * fz);
        consider(o.x, o.z, oncoming ? half + ow + PASS_GAP : 1.7 + ow, o, ow, depth, true, oncoming);
      }
    }

    // cows, which stand in the road and are not going to move for you
    for (const c of this.cows) {
      if (Math.abs(c.x - a.x) > 12 || Math.abs(c.z - a.z) > 12) continue;
      consider(c.x, c.z, flank(0.8), c, 0.8, 0.8 + FOOT_GAP);
    }

    // people crossing
    for (const slot of this.peopleInst) {
      for (const o of slot.agents) {
        if (Math.abs(o.x - a.x) > 10 || Math.abs(o.z - a.z) > 10) continue;
        consider(o.x, o.z, flank(0.35), o, 0.35, 0.35 + FOOT_GAP);
      }
    }

    // what it is waiting for, and how big, for `_goRound`
    a.aheadAt = nearest;
    a.aheadObj = who; a.aheadR = whoR; a.aheadV = whoV; a.aheadOn = whoOn;
    a.meet = meet;
    return nearest;
  }

  /**
   * Held by something going nowhere: wait a moment, then go round it (HOLD_S).
   *
   * The way round is a place across the leg — `round.left`, metres left of
   * its line, as the lane is — far enough from the thing that the two flanks
   * clear: on its right to overtake, on its left to make way for something
   * coming the other way. Taken slowly, and only round that one thing: it is
   * looked past in `_vehicleAhead` and `_crossYield` until it is behind, out
   * of reach, or ROUND_S is up. The time held runs down rather than resetting
   * when the hold lifts for a moment: somebody walking between the two of a
   * standoff was enough to start the count again, every time (seed 39).
   */
  _goRound(a, dt, half) {
    const r = a.round;
    if (r) {
      r.t -= dt;
      const dx = r.o.x - a.x, dz = r.o.z - a.z;
      const along = dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw);
      if (r.t <= 0 || along < -2.5 || Math.hypot(dx, dz) > 12) a.round = null;
    }
    const o = a.aheadObj;
    // a vehicle that is moving is a queue, not an obstruction
    const going = o && a.aheadV && Math.abs(o.vel || 0) > 0.3;
    if (!o || !(a.aheadAt < STOP_GAP + 0.4) || going) {
      a.heldT = Math.max(0, (a.heldT || 0) - dt * 2);
      return;
    }
    a.heldT = (a.heldT || 0) + dt;
    // two holding each other: one goes round, by a fixed order, so only one —
    // and the other starts its count again, or it would follow the first out
    const mutual = a.aheadV && o.aheadObj === a;
    if (mutual && (o.x !== a.x ? o.x < a.x : o.z < a.z)) { a.heldT = 0; return; }
    const wait = a.aheadV && !mutual && o.aheadAt < STOP_GAP + 0.4 ? HOLD_QUEUE_S : HOLD_S;
    if (a.heldT < wait) return;

    const now = a.laneNow !== undefined ? a.laneNow : (a.lane || 0);
    /*
     * A vehicle across its path is not gone round: there is no "beside" to a
     * thing meeting you at a right angle, and a place across your own leg
     * computed from one put a tempo straight back in front of the auto it was
     * trying to clear (seed 5). It is driven on past, on its own line, and
     * the other — which waits, by the order above — is left behind.
     */
    if (a.aheadV) {
      let turn = Math.abs(a.yaw - o.yaw) % (Math.PI * 2);
      if (turn > Math.PI) turn = Math.PI * 2 - turn;
      if (turn > 0.6 && turn < Math.PI - 0.6) {
        a.round = { o, left: now, t: ROUND_S };
        a.heldT = 0;
        return;
      }
    }
    // where it is across this leg, and where to be to clear it
    const clear = Math.max(half + a.aheadR + PEOPLE_GAP, a.aheadV ? 1.6 : 0);
    let oLeft = 0, room = 3.2;
    if (a.prev && a.target) {
      const sx = a.target.x - a.prev.x, sz = a.target.z - a.prev.z;
      const sl = Math.hypot(sx, sz) || 1;
      oLeft = ((o.x - a.prev.x) * sz - (o.z - a.prev.z) * sx) / sl;
      const e = a.prev.edges.find((q) => q.to === a.target.k);
      if (e && KIND_HALF[e.kind] !== undefined && e.kind !== 'stitch') room = KIND_HALF[e.kind];
    }
    // pull in left of something coming at you; overtake anything else on its
    // right — and on the road: a rickshaw in a gali went 4 m out, into a wall
    const most = Math.max(1, room - half - 0.3);
    const left = a.aheadOn ? oLeft + clear : oLeft - clear;
    a.round = { o, left: Math.max(-most, Math.min(most, left)), t: ROUND_S };
    a.heldT = 0;
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
        if (o === a || (a.round && o === a.round.o)) continue;
        const rx = o.x - a.x, rz = o.z - a.z;
        if (Math.abs(rx) > 18 || Math.abs(rz) > 18) continue;

        // a queue is not a junction
        let turn = Math.abs(a.yaw - o.yaw) % (Math.PI * 2);
        if (turn > Math.PI) turn = Math.PI * 2 - turn;
        if (turn < MIN_TURN) continue;

        const ov = (o.speed || 0) * (o.throttle === undefined ? 1 : o.throttle);
        const ofx = Math.sin(o.yaw), ofz = Math.cos(o.yaw);
        /*
         * Coming the other way is not crossing. Kept left (LANE), two
         * vehicles on a street pass 1.5-2.1 m apart, centre to centre, which
         * the crossing margin below calls a near miss — and one of every pair
         * braked as they passed. Head on, it only matters if they will touch.
         */
        const headOn = turn > Math.PI - MIN_TURN;

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
        if (miss > aw + ow + (headOn ? PASS_GAP : 0.9)) continue;   // they clear each other

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
        /*
         * Off the road by the calendar: not stepped, not drawn, and above all
         * not "recycled" — anything this far off is moved back beside you.
         * Unless something has put it back in the town (a cheat word, a hire
         * that found it), in which case it is out again.
         */
        if (a.away) {
          if (a.x === AWAY && a.z === AWAY) continue;
          a.away = null;
        }
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
        const half = VEHICLES[ti].w * 0.5, hl = VEHICLES[ti].l * 0.5;
        this._vehicleAhead(a, half, ctx, p, hl);
        this._goRound(a, dt, half);
        // looked at again once it has decided to go round, so it is looking past it
        const ahead = a.round ? this._vehicleAhead(a, half, ctx, p, hl) : a.aheadAt;
        const queue = ahead < STOP_GAP ? 0 : ahead < SLOW_GAP ? 0.35 : 1;
        const want = Math.min(queue, this._crossYield(a, ti), a.round ? ROUND_THR : 1);
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
        /*
         * Onto a road a vehicle takes, as `_addVehicle` and `_driveOut` place
         * them. Any node at all put rickshaws in the galis, where nothing
         * drivable leads out and they drove the lanes looking for one.
         */
        let n = null;
        for (let k = 0; k < 8 && !n; k++) {
          const q = nav.randomNodeNear(p.x, p.z, far * 0.75, Math.random);
          if (q && q.edges.some((e) => DRIVABLE.has(e.kind) && e.kind !== 'stitch')) n = q;
        }
        // a placement, so the height starts again from the new spot's terrain
        if (n) { a.x = n.x; a.z = n.z; a.y = this._placedY(n.x, n.z); a.node = n; a.prev = null; a.vel = 0; a.stuck = 0; a.round = null; a.heldT = 0; }
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
    /*
     * And the line is the vehicle's own LANE, `a.lane` to the left of the leg
     * (LANE). Kept to one side, it passes the node a lane's width off and
     * may never come within 1.6 m of it, so it has also arrived once it is
     * level with the node, measured along the leg. (The first try at keeping
     * left had a 2.2 m lane circling every node it could not reach.) But only
     * level AND in its lane, give or take: arriving merely level let one that
     * had swung wide start the next 8 m leg still 5 m out, and the next, and
     * never come back (seed 50, a third of its traffic). Well past the node,
     * it gives that one up rather than turn back for it.
     */
    let aimX = a.target.x, aimZ = a.target.z;
    if (a.prev) {
      const sx = a.target.x - a.prev.x, sz = a.target.z - a.prev.z;
      const sl = Math.hypot(sx, sz);
      if (sl > 0.5) {
        const ux = sx / sl, uz = sz / sl;
        const along = (a.x - a.prev.x) * ux + (a.z - a.prev.z) * uz;
        // its lane, moved over for whatever is coming, or its way round something
        const lane = a.round ? a.round.left : Math.max(a.lane || 0, a.meet || 0);
        a.laneNow = lane;
        const left = (a.x - a.prev.x) * uz - (a.z - a.prev.z) * ux;
        if (along > sl - 1.6 && (Math.abs(left - lane) < 2.5 || along > sl + 1.5)) { a.target = null; return; }
        const look = Math.min(sl, Math.max(0, along) + LANE_LOOK);
        // left of the way it is going is (uz, -ux): x is east and z south
        aimX = a.prev.x + ux * look + uz * lane;
        aimZ = a.prev.z + uz * look - ux * lane;
      }
    }
    // the way it is about to go, for `_vehicleAhead` to look down as well
    a.aimYaw = Math.atan2(aimX - a.x, aimZ - a.z);

    driveStep(a, dt, ctx, Math.atan2(aimX - a.x, aimZ - a.z), want, AMBIENT, solid);
  }

  /**
   * The next node a vehicle would take, from the roads a vehicle can use —
   * and not back the way it came, unless the road gives it nothing else.
   *
   * It chose among every drivable edge out of the node, the one it had just
   * driven included, and NavGraph puts a node every 8 m: so a vehicle
   * half-way down a street turned round in the road about one leg in three
   * (51 of 163 on the traffic check's seed 1, 70 of 169 on seed 60). Turning
   * round in front of whoever was following is how two of the last four
   * standoffs began.
   *
   * Nor into a dead end, where there is a way on: the turn it is forced to
   * make at the end of one is the same turn, made in front of whoever came
   * down after it (seed 56: a stitch 9 m into a road's end, and the auto
   * behind it met it coming back). One node ahead is enough to see one.
   *
   * It also sets the leg's lane (`laneFor`), since only here is the edge in
   * hand.
   */
  _nextRoad(a, nav) {
    const edges = a.node && a.node.edges;
    if (!nav || !edges || !edges.length) return null;
    /*
     * A drivable edge, not against a one-way road's traffic, and one a
     * vehicle fits down (NavGraph `_edgeOpen`, measured once an edge and
     * kept). The routes the rickshaws are hired for always asked that; the
     * traffic never did, and a junction's stitch cuts its corner through
     * whatever stands there — a cycle rickshaw spent twenty seconds grinding
     * along a wall by Chhatikara on one (seed 20).
     */
    const fits = nav._edgeOpen ? (n, e) => nav._edgeOpen(n, e) : () => true;
    const okAt = (n, e) => DRIVABLE.has(e.kind) && !e.against && fits(n, e);
    const ok = (e) => okAt(a.node, e);
    const back = a.prev ? a.prev.k : null;
    const here = a.node.k;
    // does the road go on from there, other than straight back here?
    const goesOn = (e) => {
      const m = nav.nodes.get(e.to);
      return !!m && m.edges.some((f) => okAt(m, f) && f.to !== here);
    };
    let n = 0, on = 0, open = 0;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (!ok(e)) continue;
      n++;
      if (e.to === back) continue;
      on++;
      if (goesOn(e)) open++;
    }
    // nothing drivable out of here: take anything rather than sit in the gali
    // for ever, and the steering will get it back out
    const take = open ? (e) => ok(e) && e.to !== back && goesOn(e)
      : on ? (e) => ok(e) && e.to !== back
        : n ? ok : () => true;
    let pick = Math.floor(Math.random() * (open || on || n || edges.length));
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (!take(e)) continue;
      if (pick-- === 0) {
        const next = nav.nodes.get(e.to) || null;
        if (next) a.lane = laneFor(e, a.lane);
        return next;
      }
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
