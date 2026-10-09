/**
 * WorldService — assembles the town and owns every spatial query.
 *
 * It builds no geometry itself. TerrainBuilder, LandmarkGenerator,
 * BuildingGenerator and PropScatter each return geometry plus colliders; this
 * file stitches them together and exposes the one surface the rest of the game
 * asks questions through: ground height, surface material, collision, ray
 * blocking, narrowness, nearby locations and flowers.
 *
 * The Unity equivalent is a WorldService MonoBehaviour owning the generated
 * chunks and answering the same queries.
 */

import * as THREE from 'three';
import { SpatialGrid } from '../../engine/math/SpatialGrid.js';
import { dist } from '../../engine/math/MathUtils.js';
import { pointSegment, pointInPolygon } from '../../engine/math/Curves.js';

/**
 * The tallest thing you can walk up without thinking about it, in metres.
 *
 * A ghat step is about 0.3 m and a temple threshold about 0.25. Half a metre
 * takes both comfortably and still leaves a garden wall a wall.
 */
const STEP_UP = 0.52;

/**
 * The slack a standable surface holds you with, in metres.
 *
 * Feet are not a point and treads butt up against one another, so the test is
 * asked with a little give. It is one number because the cheap bound and the
 * shaped test have to agree about where a surface ends.
 */
const STAND_PAD = 0.1;

/**
 * The side of a cell in the standables' own index, in metres. See
 * `_fileStandable`.
 *
 * Measured over the crowd's own positions and points round every landmark,
 * the call costs the same at any cell from 4 m to 20 m — 0.13 to 0.14 µs,
 * because a crowd agent's cell holds 0.2 standables on average — so the size
 * is chosen on what it stores. At ten metres the index is about 30,000
 * entries and its fullest cell 84 standables (ISKCON's paving); at four it is
 * 150,000 entries for nothing, at twenty the fullest cell is 135.
 */
const STAND_CELL = 10;

/**
 * How much further than the shaped test a standable is filed, in metres.
 *
 * A filing that is a hair too wide costs a cheap reject; one a hair too narrow
 * is a surface the index cannot see and the full scan can. Rounding is
 * nanometres at these coordinates, so a centimetre is all margin.
 */
const STAND_SLACK = 0.01;

/**
 * A cell's key: a number, not the "ix,iz" string SpatialGrid builds.
 *
 * The crowd asks this a few hundred times a frame, and building the string was
 * half the cost of the whole call — 0.21 µs against 0.14, measured. Unique for
 * |iz| under 32,768 cells, which is 327 km; past that two cells can share a
 * key, and that is still harmless, because a cell that hands back surfaces
 * from somewhere else only costs their cheap reject. What would be wrong is a
 * cell that LACKS one, and sharing a key never takes anything away.
 */
const standKey = (ix, iz) => ix * 65536 + iz;

/**
 * What an empty cell answers with. Never written to — and deliberately not
 * frozen, because a frozen array is a different shape of object to the engine
 * and `_standOn` is happier reading one shape of list.
 */
const NO_STANDABLES = [];

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _hits = [];

export class WorldService {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'World';
    ctx.scene.add(this.group);

    this.colliders = [];

    /**
     * The few colliders you can stand ON, kept apart from the many you cannot.
     *
     * standHeight runs every frame from the player's ground pass. Asking the
     * spatial grid for everything within a radius wide enough to catch a
     * twenty-metre ghat tread meant scanning a large slice of 22,000 colliders
     * sixty times a second, and the frame rate went from 60 to 10. Only a few
     * hundred things in the world are standable, so they get their own list and
     * it is walked directly.
     */
    this.standables = [];

    /**
     * ...and the same standables again, filed by every cell they reach.
     *
     * The list stopped being a few hundred: it is 2,405 now, 2,646 while every
     * gathering is sitting, and walking it is 8.9 µs a call — nothing once a
     * frame for the player, 3.3 ms a frame for a crowd of 369. So the crowd
     * asks `standHeightFast`, which reads one cell of this instead of the whole
     * list. Kept in step with `standables` by `_addColliders` and
     * `removeColliders`, the only two places either one changes.
     */
    this._standCells = new Map();
    this.grid = new SpatialGrid(20);
    this.locationGrid = new SpatialGrid(64);
    this.flowerGrid = new SpatialGrid(16);

    this.terrain = null;
    this.buildings = null;
    this.landmarks = null;
    this.props = null;
    this.anchors = {};
    this.flowers = [];

    this._narrowRoads = [];
    this._roadGrid = new SpatialGrid(28);
    this._ready = false;
  }

  /**
   * Build in stages so main.js can yield to the browser between them and keep
   * the loading screen responsive. Each stage reports progress 0..1.
   */
  async build(onProgress = () => {}) {
    const ctx = this.ctx;

    onProgress(0.05, 'Laying the ground');
    const { buildTerrain } = await import('./TerrainBuilder.js');
    this.terrain = await buildTerrain(ctx);
    this.group.add(this.terrain.group);
    await frame();

    onProgress(0.34, 'Raising the temples');
    const { buildLandmarks } = await import('./LandmarkGenerator.js');
    this.landmarks = buildLandmarks(ctx, this.terrain);
    this.group.add(this.landmarks.group);
    this.anchors = this.landmarks.anchors || {};
    this._addColliders(this.terrain.colliders);      // the ghat treads
    this._addColliders(this.landmarks.colliders);
    await frame();

    onProgress(0.58, 'Building the galis');
    const { buildBuildings } = await import('./BuildingGenerator.js');
    this.buildings = buildBuildings(ctx, this.terrain);
    this.group.add(this.buildings.group);
    this._addColliders(this.buildings.colliders);
    await frame();

    onProgress(0.82, 'Planting the groves');
    const { buildProps } = await import('./PropScatter.js');
    this.props = await buildProps(ctx, this.terrain);
    this.group.add(this.props.group);
    this._addColliders(this.props.colliders);
    this.flowers = this.props.flowers || [];
    for (const f of this.flowers) this.flowerGrid.insert(f.pos.x, f.pos.z, f);
    await frame();

    onProgress(0.95, 'Opening the gates');
    this._indexLocations();
    this._indexRoads();
    this._ready = true;
    onProgress(1, 'Ready');
    return this;
  }

  /* ---------------- indexing ---------------- */

  /**
   * Take a system's colliders back out of the world.
   *
   * The counterpart to `addColliders`, and it did not exist — so a system that
   * put colliders in could never take them out, and `GatheringSystem.dispose`
   * left 227 invisible people standing in the road. Every collider carries a
   * `tag` for exactly this reason; this is the first thing to use it that way.
   *
   * @param {string} tag  the tag the system stamped on its own colliders
   * @returns {number} how many were dropped
   */
  removeColliders(tag) {
    if (!tag) return 0;
    const hit = (c) => c && c.tag === tag;
    const strip = (arr) => {
      let w = 0;
      for (let i = 0; i < arr.length; i++) if (!hit(arr[i])) arr[w++] = arr[i];
      const gone = arr.length - w;
      arr.length = w;
      return gone;
    };
    const n = strip(this.colliders);
    strip(this.standables);
    // and out of the stand index, or `standHeightFast` would go on standing
    // people on a surface `standHeight` no longer knows about
    for (const [k, cell] of this._standCells) {
      strip(cell);
      if (!cell.length) this._standCells.delete(k);
    }
    this.grid.removeWhere(hit);
    return n;
  }

  _addColliders(list) {
    if (!list) return;
    for (const c of list) {
      if (!c) continue;
      // normalise to a fast-test shape
      // `tag` is carried through because the collider list is otherwise
      // anonymous: once something has been dropped in after the build there is
      // no way to ask which of these is the world and which is the thing you
      // just put in it. `isClear` ignores it; a caller that placed colliders
      // can use it to exclude its own.
      //
      // `h` is optional and means "this thing is only this tall". A collider
      // without it is treated as infinitely tall, which is what every wall,
      // trunk and lamp post in the world wants and is the behaviour this had
      // before. It exists for the waist-high ones: a person sitting on the
      // ground must stop you walking into him and must NOT stop the camera,
      // which passes a metre over his head. Only `collideRay` reads it —
      // `collide()` and `isClear()` are both asked at ground level, where
      // height cannot matter.
      if (c.type === 'box') {
        const hw = c.w * 0.5, hd = c.d * 0.5;
        const rot = c.rot || 0;
        // `soft` marks a backstop floor, consulted only when nothing real is
        // underfoot — see standHeight. It has to be carried here or it is lost.
        const norm = { type: 'box', x: c.x, z: c.z, hw, hd, rot, cos: Math.cos(-rot), sin: Math.sin(-rot), r: Math.hypot(hw, hd), tag: c.tag, standOnly: !!c.standOnly, soft: !!c.soft, floor: !!c.floor, over: !!c.over };
        // `top`, when given, is an absolute height and wins: LandmarkGenerator
        // pins it from the builder's own ground, because `h` added to the
        // terrain under the collider drifts wherever the ground slopes.
        if (c.top != null) norm.top = c.top;
        else if (c.h != null) norm.top = this.groundHeight(c.x, c.z) + c.h;
        this.colliders.push(norm);
        this._index(norm);
        if (norm.top !== undefined) { this.standables.push(norm); this._fileStandable(norm); }
      } else {
        const norm = { type: 'circle', x: c.x, z: c.z, r: c.r || 0.5, tag: c.tag, standOnly: !!c.standOnly, soft: !!c.soft, floor: !!c.floor, over: !!c.over };
        if (c.top != null) norm.top = c.top;
        else if (c.h != null) norm.top = this.groundHeight(c.x, c.z) + c.h;
        this.colliders.push(norm);
        this._index(norm);
        if (norm.top !== undefined) { this.standables.push(norm); this._fileStandable(norm); }
      }
    }
  }

  /**
   * Put a collider in the grid — in EVERY cell it reaches, not just the one
   * its centre falls in.
   *
   * This is the fix for walking through walls. A wall is one box collider as
   * long as the wall: ISKCON's front wall is a single 57 m box. Inserted by its
   * centre, that 57 m of stone lived in one 24 m cell. `collide()` queries at
   * `radius + 6`, so standing against that wall twenty metres from its midpoint
   * looked in cells the box was not in, the box was never tested, and you
   * walked straight through it. "I am able to bypass the walls" was this.
   *
   * The 6 m pad in the query is what made it invisible: everything small is
   * found, so collision looked like it worked everywhere you happened to test.
   *
   * Stamping is by cell index rather than by sampling points, so a collider
   * lands in each cell exactly once and `query` never returns it twice. The
   * bound is the rotation-independent circumradius, which over-covers a long
   * thin box at 45 degrees by at most a cell — cheap, and never wrong in the
   * direction that matters.
   */
  _index(norm) {
    const cell = this.grid.cell;
    const R = norm.type === 'box' ? norm.r : norm.r;
    if (R <= cell * 0.5) { this.grid.insert(norm.x, norm.z, norm); return; }
    const x0 = Math.floor((norm.x - R) / cell), x1 = Math.floor((norm.x + R) / cell);
    const z0 = Math.floor((norm.z - R) / cell), z1 = Math.floor((norm.z + R) / cell);
    const half = cell * 0.5;
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        this.grid.insert(ix * cell + half, iz * cell + half, norm);
      }
    }
  }

  /**
   * File a standable in every cell of `_standCells` that its CHEAP REJECT
   * would let through — the square `standHeight` tests before the shaped one,
   * `c.r + STAND_PAD` either side of the centre.
   *
   * That square is the whole contract. Any point a surface can hold falls
   * inside it, so the one cell a point falls in holds every surface that could
   * hold that point, and reading that cell gives exactly the answer reading the
   * whole list does. Nothing else is needed for `standHeightFast` to agree with
   * `standHeight`, and no smaller bound would do.
   *
   * Why not `this.grid`, which already has them: it files anything under half
   * a cell by its centre alone, so an exact point query there has to read up
   * to nine cells round the point; its bound is the circumradius without the
   * pad; and half its entries are walls and trunks nobody can stand on.
   * Measured, reading it that way is 1.19 µs a call against 0.14 for this.
   */
  _fileStandable(c) {
    const reach = c.r + STAND_PAD + STAND_SLACK;
    const x0 = Math.floor((c.x - reach) / STAND_CELL), x1 = Math.floor((c.x + reach) / STAND_CELL);
    const z0 = Math.floor((c.z - reach) / STAND_CELL), z1 = Math.floor((c.z + reach) / STAND_CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = standKey(ix, iz);
        const cell = this._standCells.get(k);
        if (cell) cell.push(c);
        else this._standCells.set(k, [c]);
      }
    }
  }

  /**
   * Drop solid objects into the world after it has been built.
   *
   * The generators hand their colliders over during `build()`, but not
   * everything solid is part of the terrain: the gatherings are placed once the
   * world exists and the people sitting in them still have to stop you walking
   * through them. Same normalisation, same grid, so `collide()` needs to know
   * nothing about where a collider came from.
   */
  addColliders(list) {
    this._addColliders(list);
  }

  /**
   * Is there room to put something down here?
   *
   * There was no public version of this question, so anything that wanted to
   * place an object was about to reach into `this.grid` and re-implement the
   * circle/box test that `collide()` already owns. One copy, and it answers the
   * only form the question is ever asked in: a disc of radius `r` about a point.
   *
   * `skipTag` ignores colliders a caller added itself, so it can ask the
   * question again afterwards and get the same answer it got the first time.
   */
  isClear(x, z, r, skipTag = null) {
    const near = this.grid.query(x, z, r + 6, _hits);
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      /*
       * A floor is GROUND, not an obstruction. `isClear` asks whether there is
       * room to put something down, and there is always room to put something
       * down on a floor. Counting temple floors as solid made every doorway in
       * the world read as blocked — `temples.mjs` went from sixteen doorways
       * to none the moment the floors were added.
       *
       * `floor` is the same thing built solid: a raised platform you must not
       * walk INTO from the ground beside it, but which is ground to stand on
       * all the same. Prem Mandir's jagati, a temple's kursi.
       */
      if (c.standOnly || c.floor) continue;
      if (skipTag && c.tag === skipTag) continue;
      if (c.type === 'circle') {
        if (dist(x, z, c.x, c.z) < c.r + r) return false;
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin;
        const lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + r && Math.abs(lz) < c.hd + r) return false;
      }
    }
    return true;
  }

  _indexLocations() {
    for (const loc of this.ctx.data.LOCATIONS) {
      this.locationGrid.insert(loc.pos[0], loc.pos[1], loc);
    }
  }

  _indexRoads() {
    for (const road of this.ctx.data.ROADS) {
      const narrow = road.kind === 'gali' || road.width <= 5.5;
      for (let i = 1; i < road.points.length; i++) {
        const seg = {
          ax: road.points[i - 1][0], az: road.points[i - 1][1],
          bx: road.points[i][0], bz: road.points[i][1],
          w: road.width, narrow, kind: road.kind, road,
        };
        const mx = (seg.ax + seg.bx) * 0.5, mz = (seg.az + seg.bz) * 0.5;
        this._roadGrid.insert(mx, mz, seg);
        if (narrow) this._narrowRoads.push(seg);
      }
    }
  }

  /* ---------------- spatial queries ---------------- */

  groundHeight(x, z) {
    return this.terrain ? this.terrain.sampleHeight(x, z) : 0;
  }

  surfaceAt(x, z) {
    return this.terrain ? this.terrain.surfaceAt(x, z) : 'dirt';
  }

  isWater(x, z) {
    return this.terrain ? this.terrain.isWater(x, z) : false;
  }

  /**
   * Water depth at a point, positive when submerged.
   *
   * Measured down to what you would be standing on there, not to the bed.
   * A ghat's steps are built out over the river, and under every tread the
   * terrain is the bed of the Yamuna: measured to that, a dry step three
   * risers above the water read as a metre and a half of it, so "wade, but
   * never swim" stopped you halfway down Keshi Ghat's flight. The highest
   * standable surface at the point is what you are on; with nothing built
   * there it is the terrain, exactly as before.
   */
  waterDepth(x, z) {
    if (!this.isWater(x, z)) return 0;
    const surface = this.terrain && this.terrain.waterY !== undefined ? this.terrain.waterY : -0.55;
    let floor = this.groundHeight(x, z);
    const cell = this._standCells.get(standKey(Math.floor(x / STAND_CELL), Math.floor(z / STAND_CELL)));
    if (cell) {
      for (let i = 0; i < cell.length; i++) {
        const c = cell[i];
        if (c.soft || c.top <= floor) continue;
        if (this._overlaps(c, x, z, 0)) floor = c.top;
      }
    }
    return Math.max(0, surface - 0.05 - floor);
  }

  /** True inside a narrow lane — the camera pulls in and the crowd thins. */
  isNarrow(x, z) {
    const segs = this._roadGrid.query(x, z, 14, _hits);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.narrow) continue;
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < s.w * 0.75) return true;
    }
    return false;
  }

  /**
   * Metres to the nearest road centreline, and which road it is.
   *
   * `filter` narrows it to the segments a caller cares about. It exists because
   * "how far am I from a road" and "how far am I from something a rickshaw
   * drives down" are different questions: in the old town every point is within
   * a few metres of a gali, and answering the second with the first would put
   * nothing anywhere.
   */
  nearestRoad(x, z, maxRadius = 40, filter = null) {
    const segs = this._roadGrid.query(x, z, maxRadius, _hits);
    let best = null, bestD = Infinity;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (filter && !filter(s)) continue;
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < bestD) { bestD = p.d; best = { seg: s, d: p.d, x: p.x, z: p.z }; }
    }
    return best;
  }

  /**
   * The name of the spot you are standing on, GTA-style.
   *
   * OpenStreetMap names only eight roads in Vrindavan and its district polygons
   * are kilometres wide, so neither can answer "where am I" on their own. Both
   * halves of the readout are built the way a resident gives directions here —
   * by the landmark you are next to. The HUD asks twice a second, so the
   * landmark index is built once and the answer is memoised per square metre.
   */
  placeName(x, z) {
    const memo = this._placeMemo;
    const qx = Math.round(x), qz = Math.round(z);
    if (memo && memo.x === qx && memo.z === qz) return memo.out;

    const near = this.nearestRoad(x, z, 44);
    const mark = this._nearestLandmark(x, z);
    const out = {
      road: this._roadLabel(near, mark),
      area: this._areaLabel(x, z, mark, near),
      near: mark ? mark.loc : null,
    };
    this._placeMemo = { x: qx, z: qz, out };
    return out;
  }

  /**
   * Landmarks, their spoken short names, and how far each one's name carries.
   * A big grove owns more ground than a small shrine, so reach follows radius.
   */
  _buildPlaceIndex() {
    const grid = new SpatialGrid(256);
    const marks = this.ctx.data.LOCATIONS.map((loc) => {
      const short = this._shortPlace(loc.name);
      const full = loc.name.replace(/^Shri\s+/i, '');
      const m = {
        loc,
        short,
        // the road line carries the fuller name, but only while it still fits
        full: full.length <= 20 ? full : short,
        reach: Math.min(520, 250 + loc.radius * 3.4),
      };
      grid.insert(loc.pos[0], loc.pos[1], m);
      return m;
    });
    const river = [];
    const rp = this.ctx.data.RIVER.points;
    for (let i = 1; i < rp.length; i++) {
      river.push({ ax: rp[i - 1][0], az: rp[i - 1][1], bx: rp[i][0], bz: rp[i][1] });
    }
    this._placeIndex = { grid, marks, river, hits: [] };
    return this._placeIndex;
  }

  /** Nearest landmark at any distance — rings first, whole list as a backstop. */
  _nearestLandmark(x, z) {
    const idx = this._placeIndex || this._buildPlaceIndex();
    for (let r = 256; r <= 1024; r *= 2) {
      const cand = idx.grid.query(x, z, r, idx.hits);
      const best = this._closest(cand, x, z, r);
      if (best) return best;
    }
    return this._closest(idx.marks, x, z, Infinity);
  }

  /** Nearest of a list of landmark entries; `d` is scratch, valid to the caller. */
  _closest(list, x, z, maxD) {
    let best = null, bestD = maxD;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const d = dist(x, z, m.loc.pos[0], m.loc.pos[1]);
      if (d <= bestD) { bestD = d; best = m; }
    }
    if (best) best.d = bestD;
    return best;
  }

  /**
   * The locality, which is the half people actually navigate by.
   *
   * Nobody in Vrindavan says "Raman Reti" about a kilometre of ground, so the
   * landmark you are nearest names the place, first by itself and then by the
   * side of itself you are on. The district polygon is only consulted once no
   * landmark is close enough to speak for the spot, and the last resorts still
   * turn on where you stand — which bank of the Yamuna, which road brought you
   * here, which edge of Braj.
   */
  _areaLabel(x, z, mark, near) {
    // the far bank first: nothing on this side of the water stands in that field,
    // so it is named by what you can see across the water, or by the river itself
    if (this._acrossRiver(x, z)) {
      return mark && mark.d <= 900 ? `Across from ${mark.short}` : 'Yamuna Paar';
    }
    if (mark) {
      const d = mark.d, r = mark.loc.radius;
      if (d <= Math.max(120, r * 2.2)) return mark.short;
      if (d <= Math.max(230, mark.reach * 0.62)) return `${mark.short} ke paas`;
      if (d <= mark.reach) return `${mark.short} side`;
      if (d <= 700) return this._sideOf(x, z, mark);
    }
    // A named road beats a district, and this used to be the other way round.
    // The districts are a handful of coarse polygons - Raman Reti alone is
    // 1.8 km by 1.6 km - so once you stepped outside a landmark's reach the
    // readout said "Raman Reti" and kept saying it for a kilometre in every
    // direction. Naming the road you are standing on changes as you walk,
    // which is the whole point of the readout.
    const on = near && near.seg.road.name;
    if (on) return on;

    const road = this._nearestNamedRoad(x, z, 320, null);
    if (road) return `Off ${road}`;

    // Still nothing named nearby, so fall back to the landmark you can see
    // before reaching for the district. Out in the fields along the Chhatikara
    // road that is often the only true thing to say.
    if (mark && mark.d <= 1600) return this._sideOf(x, z, mark);

    const river = this.ctx.data.RIVER;
    if (this._riverDistance(x, z) < river.width * 0.5 + river.bank * 4) return 'Yamuna Kinare';

    const district = this.districtAt(x, z);
    if (district) return district.name;

    const quarter = this._bearing(0, 0, x, z, true);
    return `${quarter} ${Math.hypot(x, z) > 1500 ? 'Braj' : 'Vrindavan'}`;
  }

  _sideOf(x, z, mark) {
    return `${this._bearing(mark.loc.pos[0], mark.loc.pos[1], x, z)} of ${mark.short}`;
  }

  /** True when you would have to cross the Yamuna to walk here from the town. */
  _acrossRiver(x, z) {
    const idx = this._placeIndex || this._buildPlaceIndex();
    let crossings = 0;
    for (const s of idx.river) {
      const d1 = (s.bx - s.ax) * (0 - s.az) - (s.bz - s.az) * (0 - s.ax);
      const d2 = (s.bx - s.ax) * (z - s.az) - (s.bz - s.az) * (x - s.ax);
      const d3 = x * s.az - z * s.ax;
      const d4 = x * s.bz - z * s.bx;
      if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)) crossings++;
    }
    return crossings % 2 === 1;
  }

  _riverDistance(x, z) {
    const idx = this._placeIndex || this._buildPlaceIndex();
    let best = Infinity;
    for (const s of idx.river) {
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < best) best = p.d;
    }
    return best;
  }

  _nearestNamedRoad(x, z, maxRadius, skip) {
    const segs = this._roadGrid.query(x, z, maxRadius, _hits);
    let best = null, bestD = maxRadius;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.road.name || s.road.name === skip) continue;
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < bestD) { bestD = p.d; best = s.road.name; }
    }
    return best;
  }

  /**
   * The street. A named OSM road wins outright; everything else is described
   * by what it runs past, in the register of its own size.
   */
  _roadLabel(near, mark) {
    if (near && near.seg.road.name) return near.seg.road.name;
    if (!near) {
      // off the road network entirely — a courtyard, a grove, the fields
      if (mark && mark.d <= Math.max(40, mark.loc.radius)) return `Inside ${mark.short}`;
      return '';
    }
    const kind = near.seg.kind;
    if (kind === 'parikrama') return 'the Parikrama Marg';
    const label = kind === 'gali' ? 'Gali' : kind === 'path' ? 'Path'
      : kind === 'street' ? 'Lane' : kind === 'trunk' ? 'Highway' : 'Road';
    if (mark && mark.d <= 260) {
      const joiner = mark.d <= 90 ? 'by'
        : (kind === 'main' || kind === 'highway' || kind === 'trunk') ? 'past' : 'to';
      return `${label} ${joiner} ${mark.full}`;
    }
    return kind === 'gali' ? 'Narrow gali' : kind === 'path' ? 'Footpath'
      : kind === 'street' ? 'Side lane' : kind === 'main' ? 'Main road'
        : kind === 'trunk' ? 'National highway' : 'Highway';
  }

  /** Compass word from one point to another. North is -Z. */
  _bearing(ax, az, x, z, coarse = false) {
    const a = Math.atan2(x - ax, az - z);
    if (coarse) return ['North', 'East', 'South', 'West'][(Math.round(a / (Math.PI / 2)) + 4) % 4];
    // intercardinals stay abbreviated: the area line is uppercase and narrow
    const w = ['North', 'NE', 'East', 'SE', 'South', 'SW', 'West', 'NW'];
    return w[(Math.round(a / (Math.PI / 4)) + 8) % 8];
  }

  /**
   * "Shri Radha Raman Mandir" is "Radha Raman" when you are standing in it.
   * Honorifics and the word Mandir come off unless they are load-bearing —
   * Prem Mandir is never "Prem", and Vrindavan Dwar is never "Dwar".
   */
  _shortPlace(name) {
    const words = (s) => s.trim().split(/\s+/).length;
    let n = name.replace(/^Shri\s+/i, '');
    const cut = n.replace(/\s+Mandir$/i, '');
    if (words(cut) >= 2) n = cut.replace(/\s+Ji$/i, '');
    const bare = n.replace(/^Vrindavan\s+/i, '');
    if (bare.length >= 8) n = bare;
    return n;
  }

  districtAt(x, z) {
    for (const d of this.ctx.data.DISTRICTS) {
      if (pointInPolygon(x, z, d.poly)) return d;
    }
    return null;
  }

  /**
   * Resolve a desired position against the world.
   * Push-out resolution against every nearby collider, iterated twice so a
   * corner between two buildings resolves cleanly instead of jittering.
   */
  /**
   * How high the ground is at a point, counting things you can stand ON.
   *
   * `groundHeight` is the terrain and nothing else, which is why you could not
   * climb a single step in this world: a ghat stair, a plinth, a temple
   * threshold is geometry, so walking at one you were stopped by its collider
   * and there was nowhere to stand even if you got up. This looks for the
   * highest surface at the point that is within reach of where your feet
   * already are — a step you could actually take — and returns that instead.
   *
   * Going down is a step as ordinary as going up, and it is the half that was
   * missing. A ghat is not built ON the bank, it is cut INTO it: every tread
   * but the first sits BELOW the terrain. This used to start at the terrain
   * and only ever raise you, so at a ghat it kept answering "the bank" and you
   * walked the whole flight at the height of its top step with sixteen treads
   * buried under your feet — a real one dropped 0.01 m in fourteen seconds.
   *
   * So the terrain is not the floor everywhere any more. It is the floor
   * everywhere except where something you can stand on covers the point and
   * holds you UNDER it: there the ground has been cut away and the tread is
   * the ground. That single exception is the whole difference, and it is
   * deliberately narrow — the terrain remains the floor of the world wherever
   * nothing built is holding you beneath it, so nothing here can ever drop you
   * through open ground.
   *
   * `maxStep` is a step and not a leap, now in both directions. Higher than a
   * step is a wall and stays one. Deeper than a step is a drop, not a stair:
   * you keep the ground you are on rather than being swallowed by a flight you
   * are merely standing beside, and over a hole you stand on the terrain
   * instead of hovering in the air above it.
   *
   * This walks every standable in the world, and it stays that way on
   * purpose: it is the reference `standHeightFast` is measured against, and the
   * player asks it once a frame, where its 9 µs is nothing.
   */
  standHeight(x, z, feetY, maxStep = STEP_UP) {
    return this._standOn(this.standables, x, z, feetY, maxStep);
  }

  /**
   * `standHeight`, for when a few hundred things ask it every frame.
   *
   * Same question, same rules, same answer — not approximately: the rules are
   * one function, `_standOn`, and the only thing that differs is the list it
   * is handed. Here that is the one cell of `_standCells` the point falls in,
   * which holds every surface whose cheap bound reaches the point (see
   * `_fileStandable`), where `standHeight` hands over every surface in the
   * world. Whatever the long list has and the short one lacks is a surface the
   * cheap bound throws away anyway, and what `_standOn` keeps from the rest —
   * the highest surface, the highest backstop, whether either is a cut tread —
   * comes out the same in any order. `crowdfloor.mjs` asks both at thousands
   * of points round the landmarks and requires them to agree to the last bit.
   *
   * The crowd and the gatherings use this; the player keeps `standHeight`.
   */
  standHeightFast(x, z, feetY, maxStep = STEP_UP) {
    const cell = this._standCells.get(standKey(Math.floor(x / STAND_CELL), Math.floor(z / STAND_CELL)));
    return this._standOn(cell || NO_STANDABLES, x, z, feetY, maxStep);
  }

  /**
   * The rules of standing, over whichever standables a caller hands in.
   *
   * One copy, so the full scan and the indexed one cannot drift apart: change
   * how a backstop or a cut tread works here and both of them change.
   */
  _standOn(list, x, z, feetY, maxStep) {
    const terrain = this.groundHeight(x, z);
    const reachUp = feetY + maxStep;
    const reachDown = feetY - maxStep;
    let best = -Infinity;       // the highest surface underfoot you could take
    let soft = -Infinity;       // ...and the best BACKSTOP, if nothing else holds
    let cut = false;            // is one of them holding you under the terrain
    let softCut = false;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.top > reachUp) continue;              // too tall to step onto
      // Cheap reject before the shaped test. This was a flat thirty metres and
      // a ghat flight is a hundred and twenty wide: out near the edge of one
      // the tread holding you up is further away than that, so the flight let
      // go of you halfway across. Every collider already knows its own bound.
      // The slack the shaped test allows has to be in the bound as well, or the
      // cheap one throws away the last finger's width of a tread that the
      // shaped one would have accepted — a rim you can stand on by one test and
      // not by the other, at the outside edge of a flight.
      if (Math.abs(c.x - x) > c.r + STAND_PAD || Math.abs(c.z - z) > c.r + STAND_PAD) continue;
      if (!this._overlaps(c, x, z, STAND_PAD)) continue;
      /*
       * A BACKSTOP IS NOT A SURFACE.
       *
       * `soft` marks the blanket floor slab that LandmarkGenerator lays across
       * a temple's whole declared volume so nobody falls through a hall that
       * was drawn and never collided. It is a safety net and it does not know
       * the shape of the building — at Banke Bihari it is 44 x 50 m at 0.55 m,
       * and the approach steps run from 0.27 to 0.71 straight through it. Take
       * the highest surface in reach and the slab wins on the lower treads, so
       * the feet read 0.55 m all the way down a flight you can see. Measured:
       * 0.16 m descended of a 0.44 m flight, and the same fault paved over
       * ISKCON's five risers.
       *
       * So it is only consulted when nothing real is underfoot. That keeps
       * exactly the thing it was added for — you cannot fall through a temple
       * floor — without it overriding a tread, a plinth or a ghat.
       */
      if (c.soft) {
        if (c.top > soft) soft = c.top;
        if (c.top < terrain && c.top >= reachDown) softCut = true;
        continue;
      }
      if (c.top > best) best = c.top;
      // under the terrain and within a step of the feet: a tread of a flight
      // you are actually on, and the ground here rather than the bank above it
      if (c.top < terrain && c.top >= reachDown) cut = true;
    }
    if (best === -Infinity && soft > -Infinity) { best = soft; cut = softCut; }
    if (cut) return best;
    /*
     * IN A BASIN THE TERRAIN IS NOT A FLOOR.
     *
     * Where a place declared a basin the ground mesh is cut away, and what
     * the terrain reports there is the street above. Brahma Kund's garden is
     * 6 m below its street and its pool a further 3.2 m, down stepwell
     * flights with open sides: step off one and the rule above — no surface
     * within a step, so stand on the terrain — lifted you 7 m back up to the
     * street through the masonry. Down there a drop is a drop: you land on
     * the highest thing built under you. Over a gap in what was built you
     * keep your height rather than fly up out of it.
     */
    if (this.terrain && this.terrain.inBasin && this.terrain.inBasin(x, z)) {
      if (best > -Infinity) return best;
      return Number.isFinite(feetY) ? feetY : terrain;
    }
    return best > terrain ? best : terrain;
  }

  /**
   * How low the camera may go at a point: the ground, or in a basin whatever
   * is built under `y` — the camera's "never under the street" held it 6 m
   * above anyone walking in Brahma Kund's garden, looking straight down.
   * Open air over nothing built in a basin is -Infinity: no floor to keep off.
   */
  floorUnder(x, z, y) {
    const t = this.terrain;
    if (!t || !t.inBasin || !t.inBasin(x, z)) return this.groundHeight(x, z);
    let best = -Infinity;
    const cell = this._standCells.get(standKey(Math.floor(x / STAND_CELL), Math.floor(z / STAND_CELL)));
    if (cell) {
      for (let i = 0; i < cell.length; i++) {
        const c = cell[i];
        if (c.soft || !(c.top <= y + 0.5) || c.top <= best) continue;
        if (this._overlaps(c, x, z, 0)) best = c.top;
      }
    }
    return best;
  }

  /** Is this point within a collider's footprint, with a little slack? */
  _overlaps(c, x, z, pad = 0) {
    if (c.type === 'circle') return Math.hypot(x - c.x, z - c.z) <= c.r + pad;
    const dx = x - c.x, dz = z - c.z;
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    return Math.abs(lx) <= c.hw + pad && Math.abs(lz) <= c.hd + pad;
  }

  /**
   * Does a body of `radius` fit here, standing at `feetY`?
   *
   * The question `collide()` answers by moving you, asked without moving
   * anything, by the same rules: a floor you stand on is not in the way, nor
   * anything low enough to step onto from these feet, and a box is its
   * rectangle grown by the radius, as collide() pushes out of it.
   *
   * Why not "collide() moved it hardly at all": between two walls a body is
   * too wide for, collide() pushes it out of one, into the other, and back,
   * and two passes can end where they began. At Radha Raman the court floor's
   * edge and the altar block stand 5 cm apart; a point in that sliver came
   * back 3 cm from where it went in, read as open ground, and "Start from
   * here" put the player in it, with no way out in any of eight directions.
   */
  fits(x, z, radius = 0.42, feetY) {
    const step = feetY === undefined ? null : feetY + STEP_UP;
    const near = this.grid.query(x, z, radius + 6, _hits);
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      if (c.standOnly) continue;
      if (step !== null && c.top !== undefined && c.top <= step) continue;
      if (c.type === 'circle') {
        if (Math.hypot(x - c.x, z - c.z) < c.r + radius) return false;
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin;
        const lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + radius && Math.abs(lz) < c.hd + radius) return false;
      }
    }
    return true;
  }

  /**
   * The floors built over a spot, lowest first: the tops of the surfaces there
   * that are made to be stood on (`floor`, `standOnly`), leaving out the
   * blanket backstop slabs, which are a safety net and not a place.
   *
   * The terrain is not in the list. Where a temple's court is raised over the
   * ground, the ground under it is inside the masonry, and a search that only
   * knows the terrain cannot put anybody in the court: "Start from here" at
   * Radha Raman, asked for its darshan spot on a court 1.2 m up, could only
   * look for ground at the terrain's height, and the nearest it found was a
   * sliver beside the altar block that nobody could walk out of.
   */
  floorsAt(x, z) {
    const cell = this._standCells.get(standKey(Math.floor(x / STAND_CELL), Math.floor(z / STAND_CELL)));
    const tops = [];
    for (const c of cell || NO_STANDABLES) {
      if (!(c.floor || c.standOnly) || c.soft) continue;
      if (!this._overlaps(c, x, z, 0)) continue;
      if (!tops.includes(c.top)) tops.push(c.top);
    }
    return tops.sort((a, b) => a - b);
  }

  /**
   * Could a body stand here and LEAVE? It must fit, and be able to walk `minWalk`
   * metres in a straight line along at least one of eight bearings, a quarter
   * of a metre at a time, fitting at every step and never facing a rise of
   * more than a step.
   *
   * Fitting is not enough. Behind Radha Raman's altar there is a gap between
   * the altar block and the west wall that a body fits in and cannot leave:
   * 1.5 m wide, closed at both ends a metre or so either way. Once `fits` was
   * asked instead of trusting collide(), that is where "Start from here" put
   * the player. Three metres is longer than any such pocket and shorter than
   * any lane.
   */
  canLeave(x, z, radius = 0.42, feetY, minWalk = 3) {
    if (!this.fits(x, z, radius, feetY)) return false;
    const STEP = 0.25;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const cx = Math.cos(a), sz = Math.sin(a);
      let f = feetY, d = 0;
      while (d < minWalk - 1e-6) {
        const nd = Math.min(minWalk, d + STEP);
        const nx = x + cx * nd, nz = z + sz * nd;
        if (!this.fits(nx, nz, radius, f)) break;
        const h = this.standHeight(nx, nz, f);
        if (h - f > STEP_UP) break;
        f = h; d = nd;
      }
      if (d >= minWalk - 1e-6) return true;
    }
    return false;
  }

  /**
   * Push a point out of anything solid.
   *
   * `feetY` lets a walker step ONTO something low instead of being stopped by
   * it. Passed as undefined — which is what every existing caller does — every
   * collider is solid to its full height, exactly as before.
   */
  collide(pos, radius = 0.42, feetY) {
    let x = pos.x, z = pos.z;
    const step = feetY === undefined ? null : feetY + STEP_UP;
    for (let pass = 0; pass < 2; pass++) {
      const near = this.grid.query(x, z, radius + 6, _hits);
      let moved = false;
      for (let i = 0; i < near.length; i++) {
        const c = near[i];
        /*
         * A FLOOR IS NOT A WALL.
         *
         * `standOnly` is something you stand on and never bump into. Temple
         * floors are declared across a whole interior, and a hall 0.55 m up —
         * which is most of them — sits just above STEP_UP, so without this the
         * slab became a chest-high wall ringing every temple and you could not
         * get in at all. The steps take you up; the floor holds you there.
         */
        if (c.standOnly) continue;
        // low enough to walk up onto rather than be stopped by
        if (step !== null && c.top !== undefined && c.top <= step) continue;
        if (c.type === 'circle') {
          const dx = x - c.x, dz = z - c.z;
          const d = Math.hypot(dx, dz);
          const min = c.r + radius;
          if (d < min && d > 1e-5) {
            const push = (min - d) / d;
            x += dx * push; z += dz * push; moved = true;
          } else if (d <= 1e-5) { x += min; moved = true; }
        } else {
          // rotate the point into the box's local frame
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * c.cos - dz * c.sin;
          const lz = dx * c.sin + dz * c.cos;
          const ex = c.hw + radius, ez = c.hd + radius;
          if (lx > -ex && lx < ex && lz > -ez && lz < ez) {
            // smallest axis push-out
            const px = ex - Math.abs(lx), pz = ez - Math.abs(lz);
            let nlx = lx, nlz = lz;
            if (px < pz) nlx = lx > 0 ? ex : -ex;
            else nlz = lz > 0 ? ez : -ez;
            // back to world
            const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
            x = c.x + (nlx * cs - nlz * sn);
            z = c.z + (nlx * sn + nlz * cs);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    pos.x = x; pos.z = z;
    return pos;
  }

  /**
   * Camera collision: march the segment and return the first blocked fraction.
   * Cheap and stable — far better than a real sweep for this use.
   */
  collideRay(from, to, radius = 0.3) {
    _v.subVectors(to, from);
    const len = _v.length();
    if (len < 1e-4) return 1;
    const steps = Math.min(16, Math.max(4, Math.ceil(len / 0.7)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      _v2.copy(from).addScaledVector(_v, t);
      if (this._blocked(_v2.x, _v2.z, _v2.y, radius)) return Math.max(0, (i - 1) / steps);
    }
    return 1;
  }

  _blocked(x, z, y, radius) {
    if (y < this.floorUnder(x, z, y) + 0.25) return true;
    const near = this.grid.query(x, z, radius + 4, _hits);
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      // the camera is the only thing that asks this question above the ground,
      // and it is allowed over anything that declared how tall it is
      if (c.top !== undefined && y > c.top) continue;
      if (c.type === 'circle') {
        if (dist(x, z, c.x, c.z) < c.r + radius) return true;
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin;
        const lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + radius && Math.abs(lz) < c.hd + radius) return true;
      }
    }
    return false;
  }

  /* ---------------- content queries ---------------- */

  locationsNear(x, z, radius) {
    const out = [];
    const cand = this.locationGrid.query(x, z, radius + 90, _hits);
    for (let i = 0; i < cand.length; i++) {
      const loc = cand[i];
      const d = dist(x, z, loc.pos[0], loc.pos[1]);
      if (d < Math.max(radius, loc.radius)) out.push({ loc, d });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }

  getLocation(id) {
    if (!this._locById) {
      this._locById = new Map(this.ctx.data.LOCATIONS.map((l) => [l.id, l]));
    }
    return this._locById.get(id) || null;
  }

  /** Where the player should stand for darshan at a location. */
  anchorFor(locId) {
    const a = this.anchors[locId];
    if (a) return a;
    const loc = this.getLocation(locId);
    if (!loc) return null;
    // fall back to a point in front of the entrance
    const r = (loc.build ? loc.build.d * 0.5 : 10) + 4;
    const fx = loc.pos[0] + Math.sin(loc.rot || 0) * r;
    const fz = loc.pos[1] + Math.cos(loc.rot || 0) * r;
    return {
      darshan: new THREE.Vector3(fx, this.groundHeight(fx, fz), fz),
      facing: (loc.rot || 0) + Math.PI,
      altar: new THREE.Vector3(loc.pos[0], this.groundHeight(loc.pos[0], loc.pos[1]) + 2.2, loc.pos[1]),
    };
  }

  nearestFlower(x, z, maxDist = 2.4) {
    const cand = this.flowerGrid.query(x, z, maxDist + 4, _hits);
    let best = null, bestD = maxDist;
    for (let i = 0; i < cand.length; i++) {
      const f = cand[i];
      if (f.picked) continue;
      const d = dist(x, z, f.pos.x, f.pos.z);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  /** Permanently place an offered flower on an altar. */
  placeOffering(locId, mesh) {
    if (!this._offerGroup) {
      this._offerGroup = new THREE.Group();
      this._offerGroup.name = 'Offerings';
      this.group.add(this._offerGroup);
    }
    this._offerGroup.add(mesh);
    return mesh;
  }

  /* ---------------- frame ---------------- */

  update(dt) {
    if (!this._ready) return;
    if (this.terrain && this.terrain.update) this.terrain.update(dt, this.ctx);
    if (this.props && this.props.update) this.props.update(dt, this.ctx);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const m = Array.isArray(o.material) ? o.material : [o.material];
        for (const mm of m) mm.dispose();
      }
    });
    this.ctx.scene.remove(this.group);
  }
}

/** Yield a frame so the loading screen can paint between build stages. */
function frame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
