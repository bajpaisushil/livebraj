/**
 * GatheringSystem — the yajnas, the kirtans and the kathas.
 *
 * A town where everyone is walking somewhere is a town of commuters. What
 * Vrindavan actually looks like is people who have stopped: twelve of them
 * round a fire at the edge of a courtyard, a drum and a dozen voices under a
 * tree, an old man with a book and forty people sitting in front of him on the
 * ground. You do not go to these. You come round a corner and one is happening.
 *
 * So they are placed once, deterministically, on ground that a person could
 * really sit on, and they stay there. Nothing asks you to attend, count or
 * complete anything — the only response to finding one is that you can hear it,
 * see the fire, and the world tells you its name once.
 *
 * Three things about the shape of this file are not arbitrary:
 *
 *  - The people are the *same* twelve archetypes the crowd uses, from
 *    `npc/Archetypes.js`, sitting down. Authoring separate figures here would
 *    have meant a ring of undressed grey people beside a street full of dhotis,
 *    saris and tilak, which is the one thing that would make this worse than
 *    nothing.
 *  - They are drawn from `InstancedMesh`es that are *rewritten around the
 *    player every frame*, exactly as CrowdSystem does. A gathering out of range
 *    writes no instances, so it costs one distance test — a gathering 2 km away
 *    genuinely costs nothing, and the instance pool only has to be as big as
 *    the few that can be near you at once.
 *  - Sway is a per-person tilt composed into the instance matrix rather than a
 *    per-limb rig. `Matrix4.compose` with a quaternion is the whole animation
 *    budget, and at these distances it is enough: bodies rocking slightly out
 *    of phase read as a congregation, and a rigid ring reads as furniture.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { PEOPLE, buildStanding, buildSeated } from '../npc/Archetypes.js';
import { rngAt, pick, range, rangeInt, chance } from '../../engine/math/Random.js';
import { damp, dist, TAU } from '../../engine/math/MathUtils.js';
import { inWorld } from '../../content/world.generated.js';

/** How many to aim for across the whole 9.2 x 4.8 km map. */
const WANT = 18;

/**
 * Metres between two gatherings.
 *
 * Far enough apart that you never see two at once and never hear one over the
 * other, which is also what bounds the instance pool below.
 */
const MIN_GAP = 210;

/**
 * How many may be drawn at one time.
 *
 * With MIN_GAP at 210 m and a draw distance of 420–820 m, three or four is
 * already generous; RitualSystem caps its arti the same way and for the same
 * reason. This number multiplies straight into the InstancedMesh capacities, so
 * raising it costs memory rather than correctness.
 */
const ACTIVE_MAX = 8;

/**
 * Past this, a gathering is not drawn at all, whatever the rank.
 *
 * ACTIVE_MAX used to be 4, justified on "at most 4 were ever in range in
 * testing". Sweeping the whole rectangle at 20 m intervals says otherwise:
 * **5 in range on the low tier, 6 on mid, 7 on high**, the worst spot being
 * around (-1500, 480) in the old town. The selector always dropped the
 * FARTHEST, so what vanished was 580-610 m away and a few pixels across —
 * which is why nobody ever saw it go, and also why it was still wrong: walk
 * toward it and it appears out of nothing.
 *
 * Two changes rather than one, because the rank cap was the wrong tool on its
 * own. A gathering now stops being drawn at a DISTANCE — 300 m, where a 4 m
 * huddle is a smudge — and the rank cap is raised past the measured worst case
 * so it is a safety net rather than the thing doing the culling. `peak * 8`
 * instead of `peak * 4` is the whole memory cost, and instance matrices for a
 * few dozen more people are nothing next to the town.
 */
const GATHER_DRAW = 300;

/** A seated person's collision radius. They are solid; you walk round them. */
const MEMBER_R = 0.3;

/**
 * How tall each of these colliders actually is.
 *
 * `world.collideRay` — which is only ever the camera — treats a collider with
 * no height as a wall to the sky. Every circle in the world was a lamp post or
 * a trunk until now, so nobody had noticed. Twelve people sitting on the ground
 * are not walls: without this, walking up to a havan collapses the third-person
 * camera into the back of your own head, because a body 1.2 m tall blocks a
 * camera arm passing two metres above it. `collide()` ignores these — at ankle
 * height they are as solid as ever and you still walk round them.
 */
const SEATED_H = 1.35;
const STANDING_H = 1.9;
/** The kund is a knee-high brick pit; the vyasasana is a seat with a man on it. */
const KUND_H = 0.8;
const DAIS_H = 1.8;

/**
 * What this system's own colliders are labelled.
 *
 * Without it `isClear` would start answering "no" at every site the moment the
 * gatherings had been placed — because the thing in the way would be the
 * gathering — and nothing afterwards could tell whether a spot had really been
 * open before we sat down in it.
 */
const TAG = 'gathering';

/** How close before the world names what you have walked into. */
const NAME_RANGE = 15;

/**
 * A lane you may sit at the edge of, versus one you may not.
 *
 * Everything that is not a gali or a footpath has to stay clear of the whole
 * ring, not just its centre: `Crowd._vehicleAhead` cannot see a gathering at
 * all, so anyone sitting on a street gets driven through every few seconds, and
 * the parikrama has pilgrims walking it end to end all day. A gali is the
 * exception because a kirtan spilling into a gali is what a gali is for.
 */
const OPEN_LANE = (s) => s.kind === 'gali' || s.kind === 'path';

/**
 * The three kinds, and how each one is arranged.
 *
 * `radius` is the ground the whole thing occupies and is what placement tests
 * against; `sway` is the tilt amplitude in radians and `rate` how fast the
 * bodies rock. A kirtan moves; a katha audience barely does.
 */
const KINDS = {
  /*
   * `from`/`to` are Braj wall-clock hours, and they are the difference between
   * a town and a diorama. A havan was burning at two in the morning exactly as
   * it burned at noon, with eleven people sitting round it, because nothing
   * here had ever asked the time.
   *
   * The hours are the ordinary ones, and they are NOT the same as each other,
   * which is the point:
   *   - a havan is a morning thing, lit early and finished by midday;
   *   - kirtan runs from the afternoon into the night, and the evening
   *     sankirtan is when the lanes are fullest;
   *   - katha is the long mid-morning session and again after the heat.
   *
   * A gathering outside its hours is not drawn, not lit, not audible and not
   * standing in the road: its colliders are the people, and they have gone
   * home. Same hours the temples keep, 4am to 9pm, at the outside edges.
   */
  yajna: { radius: 3.2, sway: 0.030, rate: 1.05, label: 'A havan is burning', hindi: 'हवन', from: 5.0, to: 11.5 },
  kirtan: { radius: 4.0, sway: 0.085, rate: 2.20, label: 'Kirtan', hindi: 'कीर्तन', from: 15.0, to: 21.0 },
  katha: { radius: 5.2, sway: 0.022, rate: 0.80, label: 'Katha', hindi: 'कथा', from: 9.0, to: 18.0 },
};

/**
 * The poses, and who may take each.
 *
 * `who` is a shortlist rather than everyone because each (pose, archetype) pair
 * is its own geometry and its own InstancedMesh. A child does not play the
 * mridanga at the front of a kirtan and a porter does not feed the fire, so
 * narrowing the lists costs nothing and saves three dozen draw calls.
 */
const POSES = {
  seated: { build: (t) => buildSeated(t, 'lap'), who: null },
  offer: { build: (t) => buildSeated(t, 'offer'), who: ['priest', 'brahmachari', 'sadhu', 'pilgrim'] },
  drum: { build: (t) => buildSeated(t, 'drum', 'mridanga'), who: ['brahmachari', 'pilgrim', 'shopkeeper', 'sadhu'] },
  kartal: { build: (t) => buildSeated(t, 'raised', 'kartal'), who: ['sari', 'sari2', 'gopi', 'widow', 'pilgrim', 'brahmachari'] },
  stand: { build: (t) => buildStanding(t, 'raised'), who: ['pilgrim', 'sadhu', 'sari', 'sari3', 'gopi', 'brahmachari', 'shopkeeper', 'child'] },
};

/**
 * Who turns up to what. Repeats are the weighting — a havan is mostly brahmins
 * and householders, a kirtan is everybody, and it is the widows and the old who
 * sit through a katha in the afternoon.
 */
const CONGREGATION = {
  yajna: ['priest', 'priest', 'brahmachari', 'brahmachari', 'pilgrim', 'pilgrim',
    'sadhu', 'shopkeeper', 'widow', 'sari', 'sari2', 'porter'],
  kirtan: ['pilgrim', 'pilgrim', 'sari', 'sari2', 'sari3', 'gopi', 'gopi',
    'brahmachari', 'child', 'child', 'sadhu', 'widow', 'shopkeeper', 'priest'],
  katha: ['widow', 'widow', 'pilgrim', 'pilgrim', 'sari', 'sari3', 'sadhu',
    'brahmachari', 'shopkeeper', 'porter', 'child', 'priest'],
};

/** The kirtan beat, in seconds. Roughly the tempo of a Vrindavan sankirtan. */
const BEAT = 0.44;

/** How often the slow work runs — naming, and scheduling sound. */
const POLL = 1 / 5;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _ONE = new THREE.Vector3(1, 1, 1);
const _idx = new Int32Array(64);

export class GatheringSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    // MapSystem hides this group by name when it renders the aerial map. Change
    // the string and the map gets a permanent speck of frozen people baked into
    // it, so it is a literal in both files and nothing else.
    this.group.name = 'Gatherings';
    ctx.scene.add(this.group);

    this.gatherings = [];
    this.slots = new Map();
    this._t = 0;
    this._poll = 0;

    this._place();
    this._buildPeople();
    this._buildProps();
    this._addColliders();

    const by = { yajna: 0, kirtan: 0, katha: 0 };
    let people = 0;
    for (const g of this.gatherings) { by[g.kind]++; people += g.members.length; }
    console.info(`[gathering] ${this.gatherings.length} gatherings `
      + `(${by.yajna} yajna, ${by.kirtan} kirtan, ${by.katha} katha), `
      + `${people} people, ${this.slots.size} instanced poses`);
  }

  /* ================================================================
   * Placement — deterministic, and off the carriageway
   * ================================================================ */

  /**
   * Anchors, in the order they are tried.
   *
   * Named locations first because a gathering belongs at a temple, a ghat or a
   * grove, then the OSM points of interest so the far half of the map — where
   * there are no curated landmarks at all between here and Chhatikara — is not
   * empty. Shuffled by seed so the order is not the file order but is the same
   * every launch.
   */
  _anchors(rng) {
    const ctx = this.ctx;
    const out = [];

    for (const loc of ctx.data.LOCATIONS) {
      const keep = loc.build ? Math.max(loc.build.w, loc.build.d) * 0.58 + 3 : 8;
      out.push({ x: loc.pos[0], z: loc.pos[1], keep, type: loc.type });
    }
    for (const poi of ctx.data.POIS) {
      if (poi.kind !== 'temple' && poi.kind !== 'green' && poi.kind !== 'other') continue;
      out.push({ x: poi.pos[0], z: poi.pos[1], keep: 7, type: poi.kind === 'green' ? 'grove' : 'poi' });
    }

    // Fisher-Yates on the seeded stream — not Math.random, or the pre-rendered
    // aerial map would disagree with the world on the next launch
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /** What tends to happen where. A ghat gets a havan; a grove gets singing. */
  _kindFor(anchor, counts) {
    let want;
    if (anchor.type === 'ghat' || anchor.type === 'kund') want = 'yajna';
    else if (anchor.type === 'grove') want = 'kirtan';
    else if (anchor.type === 'market' || anchor.type === 'gate' || anchor.type === 'landmark') want = 'katha';
    else want = ['kirtan', 'yajna', 'katha'][(counts.total) % 3];
    // but never let one kind take the whole map
    if (counts[want] >= Math.ceil(WANT * 0.45)) {
      want = ['yajna', 'kirtan', 'katha'].reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    }
    return want;
  }

  _place() {
    const ctx = this.ctx;
    const rng = rngAt('gatherings');
    const anchors = this._anchors(rng);
    const counts = { yajna: 0, kirtan: 0, katha: 0, total: 0 };

    for (const anchor of anchors) {
      if (this.gatherings.length >= WANT) break;
      const kind = this._kindFor(anchor, counts);
      const K = KINDS[kind];

      for (let tries = 0; tries < 26; tries++) {
        const a = rng() * TAU;
        const r = anchor.keep + K.radius + range(rng, 2, 24);
        const x = anchor.x + Math.cos(a) * r;
        const z = anchor.z + Math.sin(a) * r;
        if (!this._siteOk(x, z, K.radius)) continue;

        // which way the whole thing faces — a katha's speaker looks this way,
        // and the ring of a yajna is turned so no two look identical from the
        // same side of the street
        const facing = rng() * TAU;
        const g = {
          kind, K, x, z, facing,
          y: ctx.world.groundHeight(x, z),
          members: this._members(kind, x, z, facing,
            rngAt(`gathering-${kind}-${Math.round(x)}-${Math.round(z)}`)),
          phase: rng() * TAU,
          props: null, flame: null, smoke: null, light: null,
          active: false,
          beat: rng() * BEAT, step: 0,
          bellAt: 6 + rng() * 20,
          named: false,
        };
        this.gatherings.push(g);
        counts[kind]++; counts.total++;
        break;
      }
    }
  }

  /**
   * Is this a place a dozen people could actually sit down?
   *
   * Every rule here is one CityFabric already applies to a building lot, plus
   * the two that are specific to people: they must not be on something a
   * rickshaw drives down, because `Crowd._vehicleAhead` cannot see them and
   * would run them over every few seconds; and the ground must be flat, because
   * a ring laid across a flight of ghat steps has half its members buried.
   */
  _siteOk(x, z, r) {
    const w = this.ctx.world;

    // inside the playable rectangle — inWorld's pad grows the box, so the
    // margin goes in negative
    if (!inWorld(x, z, -40)) return false;

    // the Yamuna, and the steep bank above it
    if (w.isWater(x, z)) return false;
    if (w.groundHeight(x, z) < 0.2) return false;

    // flat enough, and dry all the way round the ring
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (w.isWater(px, pz)) return false;
      const h = w.groundHeight(px, pz);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    if (hi - lo > 0.85) return false;

    // somewhere you could have walked to
    const near = w.nearestRoad(x, z, 80);
    if (!near) return false;
    // ...but not standing in the lane itself, whatever kind of lane it is
    if (near.d < near.seg.w * 0.5 + 0.8) return false;
    // ...and the whole ring clear of anything that carries traffic
    const busy = w.nearestRoad(x, z, 140, (s) => !OPEN_LANE(s));
    if (busy && busy.d < busy.seg.w * 0.5 + r + 0.8) return false;

    // nothing already built here
    if (!w.isClear(x, z, r + 0.8, TAG)) return false;

    // clear of every landmark footprint, not only the one we anchored on
    for (const { loc } of w.locationsNear(x, z, 140)) {
      if (!loc.build) continue;
      const keep = Math.max(loc.build.w, loc.build.d) * 0.58 + 3;
      if (dist(x, z, loc.pos[0], loc.pos[1]) < keep + r) return false;
    }

    // and of each other
    for (const g of this.gatherings) {
      if (dist(x, z, g.x, g.z) < MIN_GAP) return false;
    }
    return true;
  }

  /* ================================================================
   * Who is in it, and where they sit
   * ================================================================ */

  _archetype(pose, kind, rng) {
    const allowed = POSES[pose].who;
    const roll = allowed ? pick(rng, allowed) : pick(rng, CONGREGATION[kind]);
    const i = PEOPLE.findIndex((t) => t.id === roll);
    return i < 0 ? 0 : i;
  }

  /**
   * One person, placed relative to the centre and then turned with the whole
   * gathering. Offsets are laid out in the gathering's own frame and rotated
   * into the world here, once, at build time — which is why a member carries an
   * absolute x/z and nothing at runtime has to transform anything.
   */
  _member(kind, pose, rng, cx, cz, dx, dz, yaw, facing, lift = 0) {
    const K = KINDS[kind];
    const cs = Math.cos(facing), sn = Math.sin(facing);
    const wx = cx + dx * cs + dz * sn;
    const wz = cz - dx * sn + dz * cs;
    return {
      pose,
      type: this._archetype(pose, kind, rng),
      x: wx,
      z: wz,
      y: this.ctx.world.groundHeight(wx, wz) + lift,
      yaw: yaw + facing,
      off: rng() * TAU,
      swayX: K.sway * range(rng, 0.7, 1.3),
      swayZ: K.sway * range(rng, 0.4, 1.0),
    };
  }

  /** Face the centre of the thing you are sitting at. */
  _inward(dx, dz) { return Math.atan2(-dx, -dz); }

  _members(kind, cx, cz, facing, rng) {
    const out = [];
    const add = (pose, dx, dz, yaw, lift) =>
      out.push(this._member(kind, pose, rng, cx, cz, dx, dz, yaw, facing, lift));

    if (kind === 'yajna') {
      // a closed ring round the kund, everyone facing the fire, and one of them
      // sitting in a little closer with a hand out over it
      const n = rangeInt(rng, 8, 11);
      const feeder = Math.floor(rng() * n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + range(rng, -0.09, 0.09);
        const fed = i === feeder;
        const r = (fed ? 1.62 : 2.05) + range(rng, -0.12, 0.12);
        const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
        add(fed ? 'offer' : 'seated', dx, dz, this._inward(dx, dz));
      }
    } else if (kind === 'kirtan') {
      // a loose ring rather than a circle: the drum at the front, kartals
      // beside it, singers sitting inside and a few more standing behind
      const n = rangeInt(rng, 10, 14);
      const drum = 0, kartalA = 2, kartalB = n - 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + range(rng, -0.16, 0.16);
        const stand = i !== drum && i !== kartalA && i !== kartalB && chance(rng, 0.34);
        const pose = i === drum ? 'drum'
          : (i === kartalA || i === kartalB) ? 'kartal'
            : stand ? 'stand' : 'seated';
        const r = (stand ? 3.15 : 2.35) + range(rng, -0.3, 0.45);
        const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
        add(pose, dx, dz, this._inward(dx, dz) + range(rng, -0.2, 0.2));
      }
    } else {
      // the speaker up on the dais, the rest in a fan on the ground in front
      add('seated', 0, 0, 0, 0.42);
      const rows = [2.4, 3.4, 4.3];
      for (let row = 0; row < rows.length; row++) {
        const n = 3 + row * 2;
        for (let i = 0; i < n; i++) {
          const spread = 1.05 + row * 0.12;
          const a = Math.PI * 0.5 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * spread);
          const r = rows[row] + range(rng, -0.22, 0.22);
          const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
          add('seated', dx, dz, this._inward(dx, dz));
        }
      }
    }
    return out;
  }

  /* ================================================================
   * Geometry — one InstancedMesh per pose and archetype that is used
   * ================================================================ */

  /**
   * Allocate only the pose/archetype pairs that actually turned up, and only as
   * many of each as ACTIVE_MAX gatherings can need at once.
   *
   * An InstancedMesh's constructor argument is a hard allocation; `count` is
   * just how many are drawn this frame. Sizing it off the real rosters means no
   * silent drops when a ring is unusually large, and no pool sitting idle.
   */
  _buildPeople() {
    const ctx = this.ctx;
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });

    const peak = new Map();
    for (const g of this.gatherings) {
      const here = new Map();
      for (const m of g.members) {
        const key = m.pose + ':' + m.type;
        here.set(key, (here.get(key) || 0) + 1);
      }
      for (const [key, n] of here) peak.set(key, Math.max(peak.get(key) || 0, n));
    }

    for (const [key, n] of peak) {
      const [pose, type] = key.split(':');
      const geo = POSES[pose].build(PEOPLE[+type]);
      const mesh = new THREE.InstancedMesh(geo, this.mat, n * ACTIVE_MAX);
      mesh.name = `Gathering_${pose}_${PEOPLE[+type].id}`;
      mesh.castShadow = !!ctx.quality.shadows;
      // the matrices are rewritten around the player every frame, so this mesh
      // is never where three.js last thought it was — same reason CrowdSystem
      // turns it off, and the distance gate below does the culling instead
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
      this.slots.set(key, { mesh, n: 0, wrote: 0 });
    }
  }

  /* ================================================================
   * What they are sitting around
   * ================================================================ */

  _buildProps() {
    const ctx = this.ctx;

    // one material for every kund, dais and durrie in the world
    this.propMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    // the fire. Lambert with emissive, the way RitualSystem lights its arti
    // lamp, and toneMapped off so a flame at noon is still a flame
    this.flameMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.flameMat.emissive = new THREE.Color(0xff7a18);
    this.flameMat.emissiveIntensity = 1.15;
    this.flameMat.toneMapped = false;
    this.smokeMat = new THREE.MeshLambertMaterial({
      color: 0xb6ad9c, transparent: true, opacity: 0.13, depthWrite: false,
    });

    for (const g of this.gatherings) {
      const b = new MeshBuilder();
      if (g.kind === 'yajna') this._kund(b);
      else if (g.kind === 'kirtan') this._durrie(b);
      else this._dais(b);

      const mesh = new THREE.Mesh(b.build(), this.propMat);
      mesh.name = 'GatheringProps';
      mesh.castShadow = !!ctx.quality.shadows;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;

      const holder = new THREE.Group();
      holder.position.set(g.x, g.y, g.z);
      holder.rotation.y = g.facing;
      holder.visible = false;
      holder.add(mesh);
      mesh.updateMatrix();
      this.group.add(holder);
      g.props = holder;

      if (g.kind === 'yajna') {
        g.flame = new THREE.Mesh(this._flameGeo(), this.flameMat);
        g.flame.position.set(0, 0.30, 0);
        holder.add(g.flame);

        // Transparency is the one thing a low-tier phone should not be asked
        // for, and smoke is the cheapest thing to give up.
        if (ctx.quality.tier !== 'low') {
          g.smoke = new THREE.Mesh(this._smokeGeo(), this.smokeMat);
          g.smoke.position.set(0, 0.95, 0);
          holder.add(g.smoke);
        }

        // Lights are rationed. This rides behind the same flag as the arti
        // lamps, and is off entirely on the low tier.
        if (ctx.quality.templeLights) {
          g.light = new THREE.PointLight(0xff9330, 0, 11, 2);
          g.light.position.set(0, 0.7, 0);
          holder.add(g.light);
        }
      }
    }
  }

  /** The havan kund: a square brick pit, stepped, with the ash bed inside. */
  _kund(b) {
    const brick = 0xb4714a, edge = 0xc89268, ash = 0x3a3128;
    b.box(0, 0, 0, 1.30, 0.20, 1.30, brick);
    b.box(0, 0.20, 0, 1.06, 0.14, 1.06, edge);
    b.box(0, 0.30, 0, 0.84, 0.03, 0.84, ash);
    // the samagri, the ladle and the pot of ghee set out on one side
    b.box(1.05, 0, 0.42, 0.34, 0.12, 0.34, 0xd8c48a);
    b.box(1.05, 0, -0.24, 0.26, 0.20, 0.26, 0xb8873b);
    b.box(0.72, 0.12, 0.62, 0.05, 0.04, 0.46, 0x8a6a42);
    // the four logs of the crib, laid across each other over the ash
    b.box(0, 0.30, -0.22, 0.72, 0.09, 0.09, 0x6a4a2c);
    b.box(0, 0.30, 0.22, 0.72, 0.09, 0.09, 0x6a4a2c);
    b.box(-0.22, 0.38, 0, 0.09, 0.09, 0.72, 0x6a4a2c);
    b.box(0.22, 0.38, 0, 0.09, 0.09, 0.72, 0x6a4a2c);
  }

  /** A durrie thrown down to sit on, and the tulsi pot beside it. */
  _durrie(b) {
    b.box(0, 0.01, 0, 5.0, 0.02, 5.0, 0xb8453a, 0, 0b000001);
    b.box(0, 0.025, 0, 4.4, 0.02, 4.4, 0xd9c9a4, 0, 0b000001);
    b.box(2.0, 0, 1.9, 0.38, 0.34, 0.38, 0xc1743f);
    b.box(2.0, 0.34, 1.9, 0.20, 0.42, 0.20, 0x4f7a34);
  }

  /** The vyasasana: a low seat for whoever is reading, and the book on it. */
  _dais(b) {
    b.box(0, 0, 0, 1.50, 0.38, 1.30, 0xb59a6e);
    b.box(0, 0.38, 0, 1.34, 0.05, 1.16, 0xc8452a);
    b.box(0, 0.43, 0.46, 0.46, 0.22, 0.30, 0x8a6a42);
    b.box(0, 0.63, 0.46, 0.40, 0.05, 0.26, 0xf2ece0);
    // the canopy poles, because a katha always has something over it
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box(sx * 1.05, 0, sz * 0.95, 0.07, 2.30, 0.07, 0x8a6a42);
    }
    b.box(0, 2.30, 0, 2.30, 0.08, 2.10, 0xe8891f);
  }

  /** Tapered tongues of flame, orange at the base and pale at the tip. */
  _flameGeo() {
    const b = new MeshBuilder();
    b.prism(0, 0, 0, 0.52, 0.52, 0.34, 0.34, 0.26, 0xff6a10);
    b.prism(0, 0.26, 0, 0.34, 0.34, 0.20, 0.20, 0.26, 0xffa028);
    b.prism(0.03, 0.52, -0.02, 0.20, 0.20, 0.07, 0.07, 0.26, 0xffd98a);
    b.prism(-0.14, 0.14, 0.10, 0.16, 0.16, 0.04, 0.04, 0.30, 0xff8c1c);
    b.prism(0.15, 0.10, -0.11, 0.15, 0.15, 0.04, 0.04, 0.26, 0xff8c1c);
    return b.build();
  }

  /** Four widening puffs. It is not volumetric and does not need to be. */
  _smokeGeo() {
    const b = new MeshBuilder();
    for (let i = 0; i < 4; i++) {
      const y = i * 0.62;
      const w = 0.34 + i * 0.30;
      b.box((i % 2 ? 0.12 : -0.1) * i, y, (i % 2 ? -0.08 : 0.12) * i, w, 0.60, w, 0xb6ad9c);
    }
    return b.build();
  }

  /**
   * Everyone sitting here is solid.
   *
   * Nothing else can do this for us: `Crowd.collideAgents` only walks its own
   * `peopleInst` slots, so a gathering that did not push colliders into the
   * world would be one you walk straight through. They never move, so they go
   * in as static circles alongside the lamp posts — `Player` already asks
   * `world.collide` every step and needs to know nothing about gatherings.
   *
   * Unlike a lamp post they carry a height, because they are the first things
   * in this world that are solid at the ankle and open at the shoulder. See
   * SEATED_H.
   */
  _addColliders() {
    const list = [];
    for (const g of this.gatherings) {
      /*
       * Only the ones sitting at this hour.
       *
       * These colliders ARE the people — a circle each, solid at the ankle and
       * open at the shoulder. A gathering that has gone home must not leave
       * eleven invisible bodies in the lane for you to walk round, which is
       * exactly what happened for as long as the hours were not consulted:
       * a havan finishes at half past eleven and its ring stayed solid all
       * night.
       */
      if (g.onNow === false) continue;
      for (const m of g.members) {
        list.push({
          type: 'circle', x: m.x, z: m.z, r: MEMBER_R, tag: TAG,
          h: m.pose === 'stand' ? STANDING_H : SEATED_H,
        });
      }
      if (g.kind === 'yajna') list.push({ type: 'circle', x: g.x, z: g.z, r: 0.95, tag: TAG, h: KUND_H });
      if (g.kind === 'katha') list.push({ type: 'circle', x: g.x, z: g.z, r: 1.0, tag: TAG, h: DAIS_H });
    }
    this.ctx.world.addColliders(list);
  }

  /* ================================================================
   * Frame
   * ================================================================ */

  update(dt, ctx) {
    const p = ctx.player && ctx.player.position;
    if (!p) return;
    this._t += dt;

    const far = ctx.quality.drawDistance;
    // whichever is nearer: the quality tier's own horizon, or the distance at
    // which a gathering is too small to be worth a draw call. See GATHER_DRAW.
    const cut = Math.min(far, GATHER_DRAW);
    const cut2 = cut * cut;

    /*
     * Who is sitting at this hour. Checked about once a second rather than
     * every frame — nobody's timetable changes at 60 Hz — and against
     * VRINDAVAN's clock, so a pilgrim in another timezone finds a havan
     * burning when one is really burning in Braj.
     */
    this._hourAcc = (this._hourAcc || 0) + dt;
    if (this._hourAcc > 1 || this._hoursInit !== true) {
      this._hourAcc = 0;
      this._hoursInit = true;
      const live = ctx.live && ctx.live.vrindavanTime
        && (!ctx.state || !ctx.state.settings || ctx.state.settings.liveTime !== false)
        ? ctx.live.vrindavanTime() : null;
      const h = live ? live.decimal
        : ({ morning: 7, day: 13, evening: 18.5, night: 23 }[(ctx.time && ctx.time.phase) || 'day']);
      let on = 0;
      for (const g of this.gatherings) {
        g.onNow = h >= g.K.from && h < g.K.to;
        if (g.onNow) on++;
      }
      if (this._lastOn !== on) {
        this._lastOn = on;
        // the people have arrived or gone, so the world has to be told
        if (ctx.world && ctx.world.removeColliders) {
          ctx.world.removeColliders(TAG);
          this._addColliders();
        }
        console.info(`[gatherings] ${on} of ${this.gatherings.length} sitting at `
          + `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`);
      }
    }

    // the nearest few, by insertion into a fixed-size list — no allocation, and
    // ACTIVE_MAX is small enough that anything cleverer would be slower
    let nActive = 0;
    let bestD2 = Infinity, bestI = -1;
    for (let i = 0; i < this.gatherings.length; i++) {
      const g = this.gatherings[i];
      g.active = false;
      // gone home for the night, or not started yet
      if (!g.onNow) { if (g.props) g.props.visible = false; continue; }
      const dx = g.x - p.x, dz = g.z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > cut2) { if (g.props) g.props.visible = false; continue; }
      if (d2 < bestD2) { bestD2 = d2; bestI = i; }

      let at = nActive;
      while (at > 0 && this._d2(this.gatherings[_idx[at - 1]], p) > d2) {
        if (at < ACTIVE_MAX) _idx[at] = _idx[at - 1];
        at--;
      }
      if (at < ACTIVE_MAX) {
        _idx[at] = i;
        if (nActive < ACTIVE_MAX) nActive++;
      }
    }

    for (const slot of this.slots.values()) slot.n = 0;

    for (let k = 0; k < nActive; k++) {
      const g = this.gatherings[_idx[k]];
      g.active = true;
      g.phase += dt * g.K.rate;
      this._draw(g, dt);
    }
    for (const g of this.gatherings) {
      if (!g.active && g.props) g.props.visible = false;
    }

    for (const slot of this.slots.values()) {
      slot.mesh.count = slot.n;
      // uploading a buffer nobody is looking at is the one cost a distant
      // gathering could still have, so skip it once it has already gone quiet
      if (slot.n > 0 || slot.wrote > 0) slot.mesh.instanceMatrix.needsUpdate = true;
      slot.wrote = slot.n;
    }

    this._poll += dt;
    if (this._poll >= POLL) {
      const pdt = this._poll;
      this._poll = 0;
      this._slow(pdt, ctx, bestI < 0 ? null : this.gatherings[bestI], Math.sqrt(bestD2));
    }
  }

  _d2(g, p) { const dx = g.x - p.x, dz = g.z - p.z; return dx * dx + dz * dz; }

  /** Write one gathering's people into the instance pools, and stoke its fire. */
  _draw(g, dt) {
    if (g.props) g.props.visible = true;

    for (const m of g.members) {
      const slot = this.slots.get(m.pose + ':' + m.type);
      if (!slot || slot.n >= slot.mesh.instanceMatrix.count) continue;
      // a body rocking about where it meets the ground: for someone seated that
      // is the base of the spine, for someone standing it is their feet, and
      // both are right
      const a = g.phase + m.off;
      _e.set(Math.sin(a) * m.swayX, m.yaw, Math.cos(a * 0.83 + m.off) * m.swayZ, 'YXZ');
      _q.setFromEuler(_e);
      _p.set(m.x, m.y, m.z);
      _m.compose(_p, _q, _ONE);
      slot.mesh.setMatrixAt(slot.n++, _m);
    }

    if (g.flame) {
      // two incommensurable rates, so the flicker never repeats on a beat you
      // could tap along to
      const f = 0.82 + Math.sin(this._t * 9.1 + g.phase) * 0.13
        + Math.sin(this._t * 23.7 + g.phase * 2.1) * 0.07;
      g.flame.scale.set(0.9 + f * 0.16, f, 0.9 + f * 0.16);
      g.flame.rotation.y += dt * 0.7;
      if (g.light) g.light.intensity = damp(g.light.intensity, f * 2.3, 6, dt);
      if (g.smoke) {
        g.smoke.rotation.y += dt * 0.11;
        g.smoke.position.y = 0.95 + Math.sin(this._t * 0.5 + g.phase) * 0.12;
      }
    }
  }

  /**
   * The slow half: naming a gathering once, and playing it.
   *
   * Only the nearest one is ever audible. Two kirtans overlapping sounds like a
   * fault, and the mix has a whole town in it already.
   */
  _slow(dt, ctx, nearest, nearestD) {
    if (!nearest || !nearest.active) return;

    if (!nearest.named && nearestD < NAME_RANGE) {
      nearest.named = true;
      ctx.bus.emit('ui:toast', { title: nearest.K.label, sub: nearest.K.hindi });
      ctx.bus.emit('haptic', { pattern: 'soft' });
    }

    if (nearestD > 60) return;
    _p.set(nearest.x, nearest.y + 1, nearest.z);

    if (nearest.kind === 'kirtan') {
      // the drum and the kartals, on a real cycle rather than at random: eight
      // beats, the mridanga on the ones you would actually hear it on
      nearest.beat -= dt;
      while (nearest.beat <= 0) {
        nearest.beat += BEAT;
        const s = nearest.step = (nearest.step + 1) & 7;
        if (s === 0 || s === 3 || s === 4 || s === 6) {
          ctx.bus.emit('sfx', { name: 'mridanga', position: _p });
        }
        if ((s & 1) === 0) ctx.bus.emit('sfx', { name: 'kartal', position: _p });
      }
    } else if (nearest.kind === 'yajna') {
      nearest.bellAt -= dt;
      if (nearest.bellAt <= 0) {
        nearest.bellAt = 18 + Math.random() * 30;
        ctx.bus.emit('sfx', { name: 'bell', position: _p });
      }
    }
    // A katha is one voice speaking, and there is no voice in the synth. An
    // oscillator pretending to be a man reading Bhagavatam would be worse than
    // the silence, so it stays silent and reads entirely as a picture.
  }

  dispose() {
    /*
     * Take the people back out of the world, not just off the screen.
     *
     * 227 circle colliders went in at `_addColliders`, and until `removeColliders`
     * existed there was nothing that could take them out — so disposing this
     * system left you being shoved 1.42 m out of somebody who was no longer
     * drawn. It only ever looked harmless because GameApp drops the whole world
     * immediately afterwards.
     */
    if (this.ctx.world && this.ctx.world.removeColliders) {
      const gone = this.ctx.world.removeColliders(TAG);
      if (gone) console.info(`[gatherings] ${gone} colliders taken back out of the world`);
    }

    this.ctx.scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.mat.dispose();
    this.propMat.dispose();
    this.flameMat.dispose();
    this.smokeMat.dispose();
  }
}
