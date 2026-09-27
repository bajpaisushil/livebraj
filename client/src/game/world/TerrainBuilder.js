/**
 * TerrainBuilder — ground, the Yamuna, the road network and the ghat steps.
 *
 * Every centreline here is a real OpenStreetMap way and the river follows the
 * Yamuna's real course. The heights are baked once into a coarse grid because
 * the player, the crowd, the props and the route ribbon all sample them
 * constantly; recomputing noise per query would dominate the frame.
 */

import * as THREE from 'three';
import { WORLD_DETAIL } from '../../content/tuning.js';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { makeNoise2D } from '../../engine/math/Noise.js';
import { SpatialGrid } from '../../engine/math/SpatialGrid.js';
import { pointSegment, resample, smoothPolyline } from '../../engine/math/Curves.js';
import { clamp01, smoothstep, lerp } from '../../engine/math/MathUtils.js';
import { WORLD } from '../../content/world.generated.js';

/**
 * The ground covers the playable rectangle with a margin, not a square.
 *
 * This was a flat `HALF = 2200` while the world was a 4.2 km square. The world
 * reaches 7.1 km west now, and a square left everything past x = -2200 with no
 * ground under it at all — which on the map read as a hard vertical seam with
 * dark nothing on one side of it, and in the world as walking off the edge of
 * the terrain a kilometre before the edge of the town.
 */
const MARGIN = 120;
const MINX = WORLD.bounds.minX - MARGIN;
const MINZ = WORLD.bounds.minZ - MARGIN;
const MAXX = WORLD.bounds.maxX + MARGIN;
const MAXZ = WORLD.bounds.maxZ + MARGIN;
const SPAN_X = MAXX - MINX;
const SPAN_Z = MAXZ - MINZ;
const CX = (MINX + MAXX) / 2;
const CZ = (MINZ + MAXZ) / 2;
/** Largest half-extent, for the skirt and the water plane that must overshoot. */
const HALF = Math.max(SPAN_X, SPAN_Z) / 2;

/**
 * Height-field resolution, in metres.
 *
 * Was 8 while the world was a 4.2 km square: 551x551 samples. The world is
 * 9.2 x 4.8 km now, and at 8 m that is 1150 x 600 = 690,000 samples, baked in
 * one synchronous block. On a mid-range phone that block alone ran for over
 * twenty seconds with the browser frozen solid — no paint, no touch — which
 * mobile browsers treat as a hung tab. Braj is flat alluvium; 12 m carries the
 * relief that exists here perfectly well and costs 2.25x less.
 */
const CELL = WORLD_DETAIL.terrainCell;
const DIMX = Math.ceil(SPAN_X / CELL) + 1;
const DIMZ = Math.ceil(SPAN_Z / CELL) + 1;

const WATER_Y = -0.55;
const RIVER_BED = -3.8;
const ROAD_LIFT = 0.34;

/** Surface appearance per road kind. */
const ROAD_STYLE = {
  // NH 44 / AH 1. Wider, darker and cooler than the town roads, with a painted
  // centre line - it should read as somewhere you arrive from, not somewhere
  // you stroll.
  trunk:     { color: 0x5f5b55, kerb: 0xc6bba6, centre: true,  surface: 'road' },
  highway:   { color: 0x6c675f, kerb: 0xbfb29a, centre: true,  surface: 'road' },
  main:      { color: 0x726c63, kerb: 0xbfb29a, centre: true,  surface: 'road' },
  street:    { color: 0x8a8175, kerb: null,     centre: false, surface: 'stone' },
  gali:      { color: 0x9a8f7e, kerb: null,     centre: false, surface: 'gali' },
  path:      { color: 0xb09062, kerb: null,     centre: false, surface: 'dirt' },
  parikrama: { color: 0xbb9a70, kerb: null,     centre: false, surface: 'dirt' },
};

/** Hand the browser a frame, so a long build does not read as a hung tab. */
const breathe = () => new Promise((r) => requestAnimationFrame(() => r()));

export async function buildTerrain(ctx) {
  return await new Terrain(ctx).build();
}

class Terrain {
  constructor(ctx) {
    this.ctx = ctx;
    this.data = ctx.data;
    this.group = new THREE.Group();
    this.group.name = 'Terrain';
    this.noise = makeNoise2D(20250921);

    this.height = new Float32Array(DIMX * DIMZ);
    this.roadDist = new Float32Array(DIMX * DIMZ);
    this.roadKind = new Uint8Array(DIMX * DIMZ);

    this.segGrid = new SpatialGrid(40);
    this.riverGrid = new SpatialGrid(80);
  }

  /* ================================================================ */
  /**
   * Async, and it yields between passes.
   *
   * The height field and the ground mesh are the two largest single pieces of
   * work in the whole boot, and doing them back to back without a break froze
   * a mid-range phone for ten seconds — long enough for a mobile browser to
   * decide the tab has hung. Same work, same result, interruptible.
   */
  async build() {
    this._indexRoads();
    this._indexRiver();
    await breathe();
    this._bakeHeights();
    await breathe();
    this._buildGround();
    await breathe();
    this._buildRoads();
    this._buildGhats();
    await breathe();
    this._buildWater();
    this._buildSkirt();

    const self = this;
    return {
      group: this.group,
      water: this.water,
      // the ghat treads, so WorldService can make them solid
      colliders: this.stepColliders || [],
      /*
       * Which way each ghat faces, so LandmarkGenerator can put its riverfront
       * arcade BEHIND the flight instead of across it. This is returned rather
       * than read off the instance because `build()` hands back a facade, not
       * the Terrain — which is exactly how the first attempt at this fix came
       * to have no effect at all.
       */
      ghatFacing: this.ghatFacing || {},
      sampleHeight: (x, z) => self.sampleHeight(x, z),
      surfaceAt: (x, z) => self.surfaceAt(x, z),
      isWater: (x, z) => self.isWater(x, z),
      roadDistance: (x, z) => self.roadDistance(x, z),
      update: (dt) => self.update(dt),
    };
  }

  /* ---------------- spatial indices ---------------- */

  _indexRoads() {
    this.segs = [];
    for (const road of this.data.ROADS) {
      const style = ROAD_STYLE[road.kind] || ROAD_STYLE.street;
      // Chaikin-smooth the OSM trace so corners curve rather than kink
      const pts = road.points.length > 2 ? smoothPolyline(road.points, 1) : road.points;
      const rec = { road, pts, style, half: road.width * 0.5 };
      this.segs.push(rec);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const seg = { ax: a[0], az: a[1], bx: b[0], bz: b[1], rec };
        this.segGrid.insert((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, seg);
      }
    }
  }

  _indexRiver() {
    const r = this.data.RIVER;
    this.riverPts = smoothPolyline(r.points, 2);
    this.riverHalf = r.width * 0.5;
    for (let i = 1; i < this.riverPts.length; i++) {
      const a = this.riverPts[i - 1], b = this.riverPts[i];
      this.riverGrid.insert((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5,
        { ax: a[0], az: a[1], bx: b[0], bz: b[1] });
    }
  }

  /* ---------------- height field ---------------- */

  _bakeHeights() {
    const scratch = [];
    for (let iz = 0; iz < DIMZ; iz++) {
      const z = MINZ + iz * CELL;
      for (let ix = 0; ix < DIMX; ix++) {
        const x = MINX + ix * CELL;
        const i = iz * DIMX + ix;

        // Braj is flat alluvium: a broad swell plus fine relief, nothing dramatic
        let h = this.noise.fbm(x * 0.00055, z * 0.00055, 3) * 5.0
              + this.noise.fbm(x * 0.0032, z * 0.0032, 3) * 1.1;

        // road proximity, cached for surfaceAt and building setback
        const rd = this._rawRoadDistance(x, z, scratch);
        this.roadDist[i] = rd.d;
        this.roadKind[i] = rd.kind;

        // flatten under and beside every road so nothing sits on a slope
        if (rd.d < rd.half + 14) {
          const flat = 1 - smoothstep(clamp01((rd.d - rd.half) / 14));
          h = lerp(h, rd.roadH, flat * 0.92);
        }

        // carve the river bed
        const dr = this._riverDistance(x, z, scratch);
        if (dr < this.riverHalf + 70) {
          const t = clamp01((this.riverHalf + 70 - dr) / 70);
          const bed = lerp(h, RIVER_BED, smoothstep(clamp01((this.riverHalf - dr) / 26 + 0.5)));
          h = lerp(h, bed, smoothstep(t));
        }

        this.height[i] = h;
      }
    }

    // one smoothing pass kills the stair-stepping the flattening introduces
    const copy = this.height.slice();
    for (let iz = 1; iz < DIMZ - 1; iz++) {
      for (let ix = 1; ix < DIMX - 1; ix++) {
        const i = iz * DIMX + ix;
        this.height[i] = (copy[i] * 4 + copy[i - 1] + copy[i + 1] + copy[i - DIMX] + copy[i + DIMX]) / 8;
      }
    }
  }

  /** Reference height for a road: the broad swell only, ignoring fine relief. */
  _roadHeight(x, z) {
    return this.noise.fbm(x * 0.00055, z * 0.00055, 3) * 5.0;
  }

  _rawRoadDistance(x, z, scratch) {
    const cand = this.segGrid.query(x, z, 46, scratch);
    let best = Infinity, rec = null;
    for (let i = 0; i < cand.length; i++) {
      const s = cand[i];
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < best) { best = p.d; rec = s.rec; }
    }
    if (!rec) return { d: 999, half: 0, kind: 0, roadH: this._roadHeight(x, z) };
    return {
      d: best,
      half: rec.half,
      kind: KIND_ID[rec.road.kind] || 3,
      roadH: this._roadHeight(x, z),
    };
  }

  _riverDistance(x, z, scratch) {
    const cand = this.riverGrid.query(x, z, 180, scratch);
    let best = Infinity;
    for (let i = 0; i < cand.length; i++) {
      const s = cand[i];
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < best) best = p.d;
    }
    return best;
  }

  /* ---------------- public queries ---------------- */

  sampleHeight(x, z) {
    const fx = (x - MINX) / CELL, fz = (z - MINZ) / CELL;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    if (ix < 0 || iz < 0 || ix >= DIMX - 1 || iz >= DIMZ - 1) {
      return this._roadHeight(clampWorldX(x), clampWorldZ(z));
    }
    const tx = fx - ix, tz = fz - iz;
    const i = iz * DIMX + ix;
    const h00 = this.height[i], h10 = this.height[i + 1];
    const h01 = this.height[i + DIMX], h11 = this.height[i + DIMX + 1];
    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
  }

  roadDistance(x, z) {
    const i = gridIndex(x, z);
    return i < 0 ? 999 : this.roadDist[i];
  }

  isWater(x, z) {
    return this.sampleHeight(x, z) < WATER_Y - 0.08;
  }

  surfaceAt(x, z) {
    if (this.isWater(x, z)) return 'water';
    const i = gridIndex(x, z);
    if (i < 0) return 'dirt';
    const d = this.roadDist[i];
    if (d < 34) {
      const kind = KIND_NAME[this.roadKind[i]] || 'street';
      const style = ROAD_STYLE[kind];
      // only count as road surface when actually on the carriageway
      const half = KIND_HALF[this.roadKind[i]] || 3;
      if (d < half + 0.8) return style.surface;
    }
    const h = this.sampleHeight(x, z);
    if (h < WATER_Y + 1.6) return 'sand';
    return d < 24 ? 'dirt' : 'grass';
  }

  /* ---------------- ground mesh ---------------- */

  _buildGround() {
    // A coarser render mesh than the height field: 2 m of visual detail is more
    // than enough on a phone, and this is the largest single mesh in the world.
    // Segment counts follow the rectangle so the ground keeps ~11 m of visual
    // detail per segment on both axes rather than stretching one of them.
    // 640 segments across a 4.2 km world was ~6 m of detail; across 9.2 km it
    // is ~14 m, so the count went up without the detail improving. 420 keeps
    // roughly the same metres-per-segment at less than half the triangles.
    const RES_X = WORLD_DETAIL.groundSegments, RES_Z = Math.max(64, Math.round(RES_X * SPAN_Z / SPAN_X));
    const step = SPAN_X / RES_X;
    const geo = new THREE.PlaneGeometry(SPAN_X, SPAN_Z, RES_X, RES_Z);
    geo.rotateX(-Math.PI / 2);
    geo.translate(CX, 0, CZ);

    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();

    const SAND = new THREE.Color(0xe6d3a4);
    const DIRT = new THREE.Color(0xd8bb87);
    const GRASS = new THREE.Color(0x4f9e33);
    const DRY = new THREE.Color(0x6fa63c);
    const CROP = new THREE.Color(0x3d8f2c);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = this.sampleHeight(x, z);
      pos.setY(i, h);

      const rd = this.roadDistance(x, z);
      const wet = clamp01((WATER_Y + 1.5 - h) / 1.5);
      const worn = clamp01((8 - rd) / 8);

      // three scales of patchiness: fields, then scrub, then close-up grain
      const field = this.noise.fbm(x * 0.0016, z * 0.0016, 3) * 0.5 + 0.5;
      const patch = this.noise.fbm(x * 0.009, z * 0.009, 2) * 0.5 + 0.5;
      const fine = this.noise.fbm(x * 0.06, z * 0.06, 2) * 0.5 + 0.5;

      c.copy(GRASS).lerp(DRY, patch);
      c.lerp(CROP, clamp01((field - 0.42) * 2.4) * (1 - worn));   // cultivated strips
      c.lerp(DIRT, worn * 0.85);
      c.lerp(SAND, wet);
      const g = 0.9 + fine * 0.2;
      colors[i * 3] = c.r * g;
      colors[i * 3 + 1] = c.g * g;
      colors[i * 3 + 2] = c.b * g;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.name = 'Ground';
    mesh.receiveShadow = !!this.ctx.quality.shadows;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
  }

  /** A flat ring beyond the playable area so the horizon never shows an edge. */
  _buildSkirt() {
    const geo = new THREE.RingGeometry(HALF * 0.995, HALF * 3.2, 48, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(CX, 0, CZ);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x9d9a74 }));
    mesh.position.y = -0.6;
    mesh.name = 'Skirt';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
  }

  /* ---------------- roads ---------------- */

  _buildRoads() {
    const surface = new MeshBuilder();
    const kerbs = new MeshBuilder();
    const junctions = new MeshBuilder();
    const ends = [];

    for (const rec of this.segs) {
      const { pts, style, half } = rec;
      const dense = resample(pts, 9);
      if (dense.length < 2) continue;

      // Offset both edges along the segment normal, mitring at each joint so a
      // corner neither pinches nor splays.
      const left = [], right = [];
      for (let i = 0; i < dense.length; i++) {
        const prev = dense[Math.max(0, i - 1)];
        const next = dense[Math.min(dense.length - 1, i + 1)];
        let dx = next[0] - prev[0], dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        let nx = -dz, nz = dx;

        // widen the offset at sharp turns to keep the ribbon from narrowing
        let miter = 1;
        if (i > 0 && i < dense.length - 1) {
          const a1x = dense[i][0] - prev[0], a1z = dense[i][1] - prev[1];
          const a2x = next[0] - dense[i][0], a2z = next[1] - dense[i][1];
          const l1 = Math.hypot(a1x, a1z) || 1, l2 = Math.hypot(a2x, a2z) || 1;
          const dot = (a1x * a2x + a1z * a2z) / (l1 * l2);
          miter = Math.min(2.4, 1 / Math.max(0.42, Math.sqrt((1 + dot) * 0.5)));
        }
        const o = half * miter;
        left.push([dense[i][0] + nx * o, dense[i][1] + nz * o]);
        right.push([dense[i][0] - nx * o, dense[i][1] - nz * o]);
      }

      const y = (x, z) => this.sampleHeight(x, z) + ROAD_LIFT;
      for (let i = 1; i < dense.length; i++) {
        const l0 = left[i - 1], l1 = left[i], r0 = right[i - 1], r1 = right[i];
        surface.quad(
          [l0[0], y(l0[0], l0[1]), l0[1]],
          [l1[0], y(l1[0], l1[1]), l1[1]],
          [r1[0], y(r1[0], r1[1]), r1[1]],
          [r0[0], y(r0[0], r0[1]), r0[1]],
          style.color,
        );

        if (style.centre && i % 2 === 0) {
          const m0 = dense[i - 1], m1 = dense[i];
          const w = 0.16;
          let dx = m1[0] - m0[0], dz = m1[1] - m0[1];
          const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
          const nx = -dz * w, nz = dx * w;
          surface.quad(
            [m0[0] + nx, y(m0[0], m0[1]) + 0.014, m0[1] + nz],
            [m1[0] + nx, y(m1[0], m1[1]) + 0.014, m1[1] + nz],
            [m1[0] - nx, y(m1[0], m1[1]) + 0.014, m1[1] - nz],
            [m0[0] - nx, y(m0[0], m0[1]) + 0.014, m0[1] - nz],
            0xd8cdb2,
          );
        }

        if (style.kerb) {
          for (const side of [left, right]) {
            const a = side[i - 1], b = side[i];
            const ya = y(a[0], a[1]), yb = y(b[0], b[1]);
            kerbs.quad(
              [a[0], ya, a[1]], [b[0], yb, b[1]],
              [b[0], yb + 0.14, b[1]], [a[0], ya + 0.14, a[1]],
              style.kerb,
            );
          }
        }
      }

      ends.push({ p: dense[0], half, style });
      ends.push({ p: dense[dense.length - 1], half, style });
    }

    // Junction caps: a disc at every road end hides the seam where ways meet.
    for (const e of ends) {
      const [x, z] = e.p;
      const yy = this.sampleHeight(x, z) + ROAD_LIFT - 0.005;
      const r = e.half * 1.06;
      const N = 8;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        junctions.tri(
          x, yy, z,
          x + Math.cos(a1) * r, yy, z + Math.sin(a1) * r,
          x + Math.cos(a0) * r, yy, z + Math.sin(a0) * r,
          e.style.color,
        );
      }
    }

    surface.append(junctions);
    const roadMesh = surface.toMesh('Roads', { receiveShadow: true, doubleSided: true });
    roadMesh.material.polygonOffset = true;
    roadMesh.material.polygonOffsetFactor = -4;
    roadMesh.material.polygonOffsetUnits = -4;
    roadMesh.renderOrder = 1;
    this.group.add(roadMesh);
    if (!kerbs.isEmpty) this.group.add(kerbs.toMesh('Kerbs', { receiveShadow: true, doubleSided: true }));
  }

  /* ---------------- ghats ---------------- */

  /**
   * The ghat steps, and something to stand on.
   *
   * These were drawn and nothing more — sixteen quads a ghat, no collider
   * anywhere near them. You walked through the whole flight at terrain height,
   * which is why you could not climb down to the Yamuna and why the steps felt
   * like a painting of steps. Each tread now carries a box collider with its
   * own height, which is what WorldService.standHeight reads to put you on it.
   * The rise is 0.34 m, comfortably inside STEP_UP, so you simply walk down.
   */
  _buildGhats() {
    const b = new MeshBuilder();
    const stepColliders = [];
    this.stepColliders = stepColliders;
    /**
     * Which way each ghat faces, published for anything else that builds on it.
     *
     * A ghat descends toward the WATER, and that direction is worked out here
     * from the river geometry — it is not `loc.rot`. LandmarkGenerator's `ghat`
     * builder was using `loc.rot` for the arcade wall it sets 8 m back from the
     * steps, and where the two disagreed the wall came down across the middle
     * of the flight instead: a 70 x 6 m box, full height, untagged, sitting on
     * the treads. Measured, you got four risers down Chir Ghat and then slid
     * along it. One source of truth for which way a ghat faces.
     */
    this.ghatFacing = {};
    const ghats = this.data.LOCATIONS.filter((l) => l.type === 'ghat');

    for (const loc of ghats) {
      const [cx, cz] = loc.pos;
      // face the river: the ghat descends toward the nearest water
      const toward = this._riverDirection(cx, cz);
      const ang = Math.atan2(toward.x, toward.z);
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const W = loc.build.w;
      const STEPS = 16, RISE = 0.34, TREAD = 0.95;

      const top = this.sampleHeight(cx, cz);
      const p = (lx, ly, lz) => [cx + lx * cs + lz * sn, ly, cz - lx * sn + lz * cs];
      // `run` is how far the flight reaches from the centre toward the water
      this.ghatFacing[loc.id] = { ang, top, run: STEPS * TREAD };

      for (let s = 0; s < STEPS; s++) {
        const y = top - s * RISE;
        const z0 = s * TREAD, z1 = z0 + TREAD;
        const shade = 0xd0bd99 - (s % 2) * 0x060606;

        // tread
        b.quad(p(-W / 2, y, z0), p(-W / 2, y, z1), p(W / 2, y, z1), p(W / 2, y, z0), shade);

        // and something to stand on: a box the width of the flight, one tread
        // deep, whose top is this tread's height
        const mid = p(0, y, (z0 + z1) * 0.5);
        const g = this.sampleHeight(mid[0], mid[2]);
        stepColliders.push({
          type: 'box', x: mid[0], z: mid[2],
          // `p()` above maps its local frame as [lx*cs + lz*sn, -lx*sn + lz*cs],
          // which is the TRANSPOSE of the frame MeshBuilder.box, BuildingGenerator
          // and LandmarkGenerator all use. So the angle that orients the drawn
          // tread is the NEGATIVE of the one the collider wants. Handing over
          // `ang` laid a 0.95 m deep, up-to-120 m wide box diagonally across the
          // whole flight at the height of one step: you climbed back onto it as
          // fast as you stepped off, which is why the ghats could not be walked
          // down. Do not "tidy" this to `ang` without changing `p()` too.
          w: W, d: TREAD, rot: -ang,
          h: y - g,                       // _addColliders turns this into an absolute top
          tag: 'ghat-step',
        });
        // riser
        b.quad(
          p(-W / 2, y - RISE, z1), p(-W / 2, y, z1),
          p(W / 2, y, z1), p(W / 2, y - RISE, z1),
          0xbfae8b,
        );
      }

      // flanking walls, so the terrace reads as built rather than carved
      for (const side of [-1, 1]) {
        const wx = side * (W / 2 + 0.6);
        for (let s = 0; s < STEPS; s += 2) {
          const y = top - s * RISE;
          const z0 = s * TREAD;
          b.box(
            p(wx, 0, z0 + TREAD)[0], y - 0.4, p(wx, 0, z0 + TREAD)[2],
            1.2, 1.5, TREAD * 2.2, 0xc8b590, ang,
          );
        }
      }
    }

    if (!b.isEmpty) {
      const mesh = b.toMesh('GhatSteps', { receiveShadow: true, castShadow: !!this.ctx.quality.shadows });
      this.group.add(mesh);
    }
  }

  _riverDirection(x, z) {
    const scratch = [];
    const cand = this.riverGrid.query(x, z, 400, scratch);
    let best = null, bestD = Infinity;
    for (let i = 0; i < cand.length; i++) {
      const s = cand[i];
      const p = pointSegment(x, z, s.ax, s.az, s.bx, s.bz);
      if (p.d < bestD) { bestD = p.d; best = p; }
    }
    if (!best) return { x: 0, z: -1 };
    const dx = best.x - x, dz = best.z - z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: dx / l, z: dz / l };
  }

  /* ---------------- water ---------------- */

  _buildWater() {
    const geo = new THREE.PlaneGeometry(HALF * 2.6, HALF * 2.6, 1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(CX, 0, CZ);

    const tex = this.ctx.textures.get('water-ripple', () => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#808080';
      g.fillRect(0, 0, 256, 256);
      // soft overlapping bands read as slow ripples once scrolled
      for (let i = 0; i < 90; i++) {
        const y = Math.random() * 256;
        const h = 3 + Math.random() * 12;
        const a = 0.05 + Math.random() * 0.08;
        const grad = g.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.5, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        g.fillStyle = grad;
        g.fillRect(0, y, 256, h);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(90, 90);
      return t;
    });

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2f8fa0,
      roughness: 0.08,
      metalness: 0.32,
      transparent: true,
      opacity: 0.82,
      map: tex,
    });

    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = WATER_Y;
    this.water.name = 'Yamuna';
    this.water.renderOrder = 1;
    this.group.add(this.water);
    this._t = 0;
  }

  update(dt) {
    if (!this.water) return;
    this._t += dt;
    const m = this.water.material.map;
    if (m) { m.offset.x = this._t * 0.006; m.offset.y = this._t * 0.011; }
    // keep the water plane under the player so a modest plane covers the world
    const p = this.ctx.player ? this.ctx.player.position : null;
    if (p) { this.water.position.x = p.x; this.water.position.z = p.z; }
  }
}

/* ---------------- helpers ---------------- */

const KIND_ID = { highway: 1, main: 2, street: 3, gali: 4, path: 5, parikrama: 6, trunk: 7 };
const KIND_NAME = ['street', 'highway', 'main', 'street', 'gali', 'path', 'parikrama', 'trunk'];
const KIND_HALF = [3, 7, 5.5, 3.2, 2.3, 1.3, 4.5, 11];

function gridIndex(x, z) {
  const ix = Math.round((x - MINX) / CELL), iz = Math.round((z - MINZ) / CELL);
  if (ix < 0 || iz < 0 || ix >= DIMX || iz >= DIMZ) return -1;
  return iz * DIMX + ix;
}

const clampWorldX = (v) => (v < MINX ? MINX : v > MAXX ? MAXX : v);
const clampWorldZ = (v) => (v < MINZ ? MINZ : v > MAXZ ? MAXZ : v);
