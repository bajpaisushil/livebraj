/**
 * MapSystem — the radar and the Dham map.
 *
 * Both views draw the same imported geometry, so what you see on the map is
 * literally the ground you are standing on. The minimap's static layers — the
 * Yamuna, all 1,055 roads at their real widths, the district washes — are
 * rendered once into an offscreen canvas; each frame is a rotated blit of a
 * crop. Redrawing the city sixty times a second is what makes a true top-down
 * radar unaffordable, and not doing it is what makes this one cheap.
 *
 * The full map is an aerial render of the real city with cartography drawn over
 * it, and it answers to zoom the way a real map does: pulled out it names only
 * the quarters people actually say out loud, pushed in it names the streets
 * along their own centrelines and picks out every lane. Your own position is
 * always the topmost thing on it.
 */

import * as THREE from 'three';
import { formatDistance, clamp } from '../../engine/math/MathUtils.js';
import { bearingFromVector, compassLabel } from '../../engine/math/Geo.js';

// Phones cap canvas dimensions (commonly 4096, and iOS caps total area near
// 16.7M pixels). The old 1.5 px/m gave a 6300 square = 151 MB, which silently
// failed to allocate and took the WebGL context down with it. The base is now
// sized to a hard budget and the resolution derived from it.
const BASE_MAX_PX = 2048;
const MINIMAP_RANGE = 130;         // metres visible across the radar
import { WORLD } from '../../content/world.generated.js';

/**
 * The playable rectangle. The map used to assume a square centred on the
 * origin and bake 2100 into every transform; the world reaches 7.1 km west and
 * 2.1 km east now, so a square would have put the whole town in one corner.
 * WB.minX / WB.minZ is the top-left of the base texture.
 */
const WB = WORLD.bounds;
const WORLD_W = WORLD.width;
const WORLD_D = WORLD.depth;
const TAU = Math.PI * 2;

/**
 * The offscreen base texture's pixel size and scale.
 *
 * Both the 2D base and the aerial render use it, and they have to agree
 * exactly or the photography lands offset from the drawn roads. The long axis
 * gets BASE_MAX_PX and the short one follows the world's aspect.
 */
function baseSize() {
  const long = Math.max(WORLD_W, WORLD_D);
  const ppm = BASE_MAX_PX / long;
  return {
    w: Math.round(WORLD_W * ppm),
    h: Math.round(WORLD_D * ppm),
    ppm,
  };
}

const ROAD_PEN = {
  // NH 44 / AH 1 — the widest thing on the map, and the only road that leaves.
  trunk: { w: 9.5, c: '#a98d5d' },
  highway: { w: 7.0, c: '#b39a6e' },
  main: { w: 5.4, c: '#bda478' },
  street: { w: 3.0, c: '#c7b28c' },
  gali: { w: 1.7, c: '#cfbc98' },
  path: { w: 1.2, c: '#d3c3a4' },
  parikrama: { w: 5.0, c: '#d98f3c' },
};

// Over photography a road reads best as a pale ribbon with a dark casing —
// the same trick a hybrid satellite map uses to keep streets findable.
const ROAD_INK = {
  trunk: { core: 'rgba(253,240,198,.94)', case: 'rgba(60,43,26,.54)' },
  highway: { core: 'rgba(252,238,201,.88)', case: 'rgba(66,48,30,.46)' },
  main: { core: 'rgba(251,238,206,.80)', case: 'rgba(66,48,30,.40)' },
  street: { core: 'rgba(249,238,214,.62)', case: 'rgba(66,48,30,.30)' },
  gali: { core: 'rgba(248,240,220,.44)', case: 'rgba(66,48,30,.20)' },
  path: { core: 'rgba(246,240,224,.34)', case: 'rgba(66,48,30,.15)' },
};

// Zoom (CSS pixels per metre) at which the map changes what it is willing to
// say. Pulled all the way out the town is 4.2 km across; pushed in it is a lane.
const TIER_MID = 0.18;
const TIER_CLOSE = 0.5;
const LANE_NAMES_AT = 0.9;         // below this, unnamed lanes stay unnamed

// How Vrindavan is actually spoken about: by the thing you are near. These are
// the quarter names the far view uses in place of the coarse import districts,
// most-said first so the greedy placer keeps the ones that matter.
const AREA_ANCHORS = [
  ['banke-bihari', 'BANKE BIHARI'],
  ['keshi-ghat', 'KESHI GHAT'],
  ['raman-reti', 'RAMAN RETI'],
  ['loi-bazar', 'LOI BAZAR'],
  ['nidhivan', 'NIDHIVAN'],
  ['rangaji', 'RANGAJI'],
  ['prem-mandir', 'PREM MANDIR'],
  ['madan-mohan', 'MADAN MOHAN'],
  ['chandrodaya', 'CHANDRODAYA'],
  ['chhatikara-crossing', 'CHHATIKARA'],
  ['vrindavan-gate', 'VRINDAVAN DWAR'],
  ['kaliya-ghat', 'KALIYA GHAT'],
];
// The ISKCON temple is the landmark; Raman Reti is what the quarter is called.
const AREA_ALIAS = { 'raman-reti': 'iskcon-krishna-balaram' };

const SCALE_STEPS = [50, 100, 250, 500, 1000];

export class MapSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.mini = document.getElementById('minimap');
    this.full = document.getElementById('worldmap');
    this.sel = document.getElementById('map-sel');
    this.navReadout = document.getElementById('nav-readout');
    this.navDist = document.getElementById('nav-dist');
    this.navName = document.getElementById('nav-name');
    this.compass = document.getElementById('compass');

    this.destination = null;
    this.route = null;
    this._routeFrom = null;
    this.open = false;

    this._pan = { x: 0, z: 0 };
    this._zoom = 0.26;
    this._selected = null;
    this._laneNames = new Map();     // road id -> "Gali by <landmark>", computed once

    this.searchBox = document.getElementById('map-search');
    this.searchInput = document.getElementById('map-q');
    this.searchHits = document.getElementById('map-hits');
    this._highlight = null;      // { pos, name, until } — the pulsing ring
    this._focusTo = null;        // eased pan/zoom target while flying to a hit

    this._indexRoads();
    this._orderPlaces();
    this._buildBase();
    this._buildSearchIndex();
    this._sizeCanvases();
    this._wireFull();
    this._wireZoom();
    this._wireSearch();

    // restore a destination chosen in a previous session
    if (ctx.state.destination) this.setDestination(ctx.state.destination);
  }

  /**
   * Roads bucketed by kind with a bounding box each, so a zoomed-in frame can
   * throw away the 1,000 roads that are nowhere near the screen before it
   * touches a single point.
   */
  _indexRoads() {
    this._roadIndex = new Map();
    for (const road of this.ctx.data.ROADS) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of road.points) {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < z0) z0 = p[1];
        if (p[1] > z1) z1 = p[1];
      }
      let list = this._roadIndex.get(road.kind);
      if (!list) { list = []; this._roadIndex.set(road.kind, list); }
      list.push({ road, x0, x1, z0, z1 });
    }
  }

  /** Landmarks in the order their labels should win a fight over space. */
  _orderPlaces() {
    const rank = new Map();
    AREA_ANCHORS.forEach(([id], i) => rank.set(AREA_ALIAS[id] || id, i));
    this._places = this.ctx.data.LOCATIONS.slice().sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : 50 + a.id.length;
      const rb = rank.has(b.id) ? rank.get(b.id) : 50 + b.id.length;
      if (ra !== rb) return ra - rb;
      return b.radius - a.radius;
    });
    this._areas = AREA_ANCHORS
      .map(([id, label]) => ({ loc: this.ctx.data.LOCATION_BY_ID.get(AREA_ALIAS[id] || id), label }))
      .filter((a) => !!a.loc);
  }

  /* ================================================================
   * Offscreen base — drawn once
   * ================================================================ */
  _buildBase() {
    // The texture takes the world's own shape. It used to be square, which was
    // fine while the world was; now the world is 9.2 km by 4.8 km and a square
    // would spend 48% of its pixels on ground that does not exist — which is
    // exactly the black and stray colour that shows up out past Chhatikara.
    const { w: size, h: sizeH, ppm } = baseSize();
    const c = document.createElement('canvas');
    c.width = size; c.height = sizeH;
    const g = c.getContext('2d');
    if (!g) { this.base = null; return; }
    this.base = c;
    this.basePPM = ppm;
    this.baseW = size; this.baseH = sizeH;
    console.info('[map] base ' + size + 'x' + sizeH + ' at ' + ppm.toFixed(2) + ' px/m');

    const T = (x, z) => [(x - WB.minX) * ppm, (z - WB.minZ) * ppm];

    // paper ground
    g.fillStyle = '#e8dbbc';
    g.fillRect(0, 0, size, sizeH);

    // district washes, so the old town reads denser than the fields
    for (const d of this.ctx.data.DISTRICTS) {
      g.beginPath();
      d.poly.forEach((p, i) => { const [x, y] = T(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.closePath();
      g.fillStyle = d.kind === 'outskirts' ? 'rgba(150,165,110,.16)' : 'rgba(196,172,128,.22)';
      g.fill();
    }

    // the Yamuna
    const r = this.ctx.data.RIVER;
    g.beginPath();
    r.points.forEach((p, i) => { const [x, y] = T(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = '#6fa3a8';
    g.lineWidth = r.width * ppm;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.stroke();
    g.strokeStyle = 'rgba(58,110,116,.5)';
    g.lineWidth = r.width * ppm * 0.82;
    g.stroke();

    // roads, widest last so the main streets sit on top
    const order = ['path', 'gali', 'street', 'main', 'highway', 'trunk', 'parikrama'];
    for (const kind of order) {
      const pen = ROAD_PEN[kind] || ROAD_PEN.street;
      g.strokeStyle = pen.c;
      g.lineWidth = Math.max(0.7, pen.w * ppm / 1.5);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (const road of this.ctx.data.ROADS) {
        if (road.kind !== kind) continue;
        road.points.forEach((p, i) => { const [x, y] = T(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      }
      g.stroke();
    }

    // landmark footprints, so the map has mass where the town has mass
    g.fillStyle = 'rgba(168,86,60,.3)';
    for (const loc of this.ctx.data.LOCATIONS) {
      const [x, y] = T(loc.pos[0], loc.pos[1]);
      const rr = Math.max(2, Math.max(loc.build.w, loc.build.d) * 0.5 * ppm);
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
  }

  /**
   * The map, the way Vice City did it: an actual render of the actual city,
   * seen from straight above.
   *
   * An orthographic camera covers the whole 4.2 km world and draws the real
   * geometry — roads, roofs, the Yamuna, every tree — into an offscreen
   * target once at boot. What you plan your route on is therefore the ground
   * you will actually walk, not a diagram of it.
   */
  _renderAerial() {
    const ctx = this.ctx;
    const { w: SIZE, h: SIZE_H } = baseSize();
    let target = null;
    try {
      target = new THREE.WebGLRenderTarget(SIZE, SIZE_H, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
    } catch (err) {
      console.warn("[map] aerial render unavailable", err);
      return null;
    }

    // The camera frames exactly the playable rectangle, so the render lines up
    // with the drawn base pixel for pixel and contains no ground that is not
    // in the world. Framing a square around it put 4.4 km of void in shot.
    const hw = WORLD_W / 2, hd = WORLD_D / 2;
    const cx = WB.minX + hw;
    const cz = WB.minZ + hd;
    const cam = new THREE.OrthographicCamera(-hw, hw, hd, -hd, 1, 4000);
    cam.position.set(cx, 1200, cz);
    cam.up.set(0, 0, -1);
    cam.lookAt(cx, 0, cz);

    // the sky dome and the HUD-ish bits would only fill the frame
    const hidden = [];
    ctx.scene.traverse((o) => {
      if (o.name === "Player" || o.name === "Rituals" || o.name === "Route"
          || o.name === "DoorMarkers" || o.name === "Crowd" || o.name === "Gatherings") {
        if (o.visible) { hidden.push(o); o.visible = false; }
      }
    });
    const sky = ctx.time && ctx.time.sky;
    const skyWas = sky ? sky.visible : null;
    if (sky) sky.visible = false;
    const fogWas = ctx.scene.fog;
    ctx.scene.fog = null;

    // Flat light for the duration of the render.
    //
    // The scene is lit for standing in: a low sun, warm, casting long shadows.
    // Photographed from above that gives a map where one side of every street
    // is dark, whole quarters sit in shadow, and the whole thing changes
    // brightness with the hour — which reads as the map being broken rather
    // than as evening. A map wants even, sourceless light, so the sun is
    // pointed straight down and flattened and the ambient brought up to carry
    // the image. Everything is restored immediately afterwards.
    const lightsWere = [];
    ctx.scene.traverse((o) => {
      if (!o.isLight) return;
      lightsWere.push({
        o,
        intensity: o.intensity,
        castShadow: o.castShadow,
        color: o.color ? o.color.getHex() : null,
        ground: o.groundColor ? o.groundColor.getHex() : null,
        pos: o.position ? o.position.clone() : null,
      });
      if (o.isAmbientLight || o.isHemisphereLight) {
        o.intensity = o.isHemisphereLight ? 1.15 : 0.9;
        if (o.color) o.color.setHex(0xffffff);
        if (o.groundColor) o.groundColor.setHex(0xdcd6c8);
      } else if (o.isDirectionalLight) {
        o.intensity = 0.55;
        o.castShadow = false;
        if (o.color) o.color.setHex(0xffffff);
        if (o.position) o.position.set(cx, 2400, cz - 1);
      } else {
        // lamps, braziers and the rest add nothing from 1.2 km up
        o.intensity = 0;
      }
    });
    const shadowsWere = ctx.renderer.shadowMap.enabled;
    ctx.renderer.shadowMap.enabled = false;

    /*
     * Put the roof back on for the duration of this bake.
     *
     * InteriorSystem keeps a horizontal clipping plane on the renderer and
     * drops it to the ceiling height while you are standing in a room, so the
     * roof comes off and you can see in. This render is taken from 2400 m up
     * with its own camera and does NOT go through the camera rig, so the
     * mode test that parks the plane every frame never sees it — bake the map
     * while standing in a hut and everything above 3.8 m is cut away, which is
     * to say the entire town.
     *
     * Saved and restored here beside the shadows and the lights, which is what
     * everything else that is temporarily wrong for a map does.
     */
    const clip = ctx.interior && ctx.interior.clip ? ctx.interior.clip : null;
    const clipWas = clip ? clip.constant : 0;
    if (clip) clip.constant = 1e5;

    const prevTarget = ctx.renderer.getRenderTarget();
    ctx.renderer.setRenderTarget(target);
    ctx.renderer.setClearColor(0x2f8fa0, 1);
    ctx.renderer.clear();
    ctx.renderer.render(ctx.scene, cam);
    ctx.renderer.setRenderTarget(prevTarget);

    ctx.renderer.shadowMap.enabled = shadowsWere;
    if (clip) clip.constant = clipWas;
    for (const w of lightsWere) {
      w.o.intensity = w.intensity;
      w.o.castShadow = w.castShadow;
      if (w.color !== null && w.o.color) w.o.color.setHex(w.color);
      if (w.ground !== null && w.o.groundColor) w.o.groundColor.setHex(w.ground);
      if (w.pos && w.o.position) w.o.position.copy(w.pos);
    }

    ctx.scene.fog = fogWas;
    if (sky) sky.visible = skyWas;
    for (const o of hidden) o.visible = true;

    // pull the pixels into a canvas we can draw labels over
    const row = SIZE * 4;
    const buf = new Uint8Array(row * SIZE_H);
    try {
      ctx.renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE_H, buf);
    } catch (err) {
      console.warn("[map] could not read the aerial render", err);
      target.dispose();
      return null;
    }

    const c = document.createElement("canvas");
    c.width = SIZE; c.height = SIZE_H;
    const g = c.getContext("2d");
    const img = g.createImageData(SIZE, SIZE_H);
    // WebGL reads bottom-up; flip as we copy
    for (let y = 0; y < SIZE_H; y++) {
      const src = (SIZE_H - 1 - y) * row;
      img.data.set(buf.subarray(src, src + row), y * row);
    }
    g.putImageData(img, 0, 0);
    target.dispose();

    console.info("[map] aerial render " + SIZE + "x" + SIZE_H);
    return c;
  }
  /* ================================================================
   * Sizing
   * ================================================================ */
  _sizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.mini) {
      const r = this.mini.getBoundingClientRect();
      const s = Math.max(96, r.width || 132);
      this.mini.width = Math.round(s * dpr);
      this.mini.height = Math.round(s * dpr);
      this.miniCtx = this.mini.getContext('2d');
      this.miniDpr = dpr;
    }
    if (this.full) {
      this.full.width = Math.round(window.innerWidth * dpr);
      this.full.height = Math.round(window.innerHeight * dpr);
      this.fullCtx = this.full.getContext('2d');
      this.fullDpr = dpr;
    }
  }

  resize() { this._sizeCanvases(); if (this.open) this._drawFull(); }

  /* ================================================================
   * Destination + routing
   * ================================================================ */
  setDestination(locId) {
    const ctx = this.ctx;
    if (!locId) {
      this.destination = null; this.route = null;
      ctx.state.destination = null; ctx.save.write();
      ctx.bus.emit('nav:destination', { loc: null });
      if (this.navReadout) this.navReadout.classList.remove('show');
      return;
    }
    const loc = ctx.data.LOCATION_BY_ID.get(locId);
    if (!loc) return;
    this.destination = loc;
    ctx.state.destination = locId;
    ctx.save.write();
    this._recomputeRoute();
    ctx.bus.emit('nav:destination', { loc });
    if (this.navReadout) this.navReadout.classList.add('show');
  }

  _recomputeRoute() {
    const ctx = this.ctx;
    if (!this.destination || !ctx.player || !ctx.nav) return;
    const p = ctx.player.position;
    this.route = ctx.nav.path(p.x, p.z, this.destination.pos[0], this.destination.pos[1]);
    this._routeFrom = { x: p.x, z: p.z };
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    this._drawMini(ctx);
    this._updateNav(ctx);
    if (this.open) {
      // the player marker still needs to keep up, so nudge a redraw when they
      // have actually moved — or turned, now that the marker shows a heading
      const pl = ctx.player ? ctx.player.position : null;
      if (pl) {
        if (!this._lastDrawAt) this._lastDrawAt = { x: pl.x, z: pl.z, yaw: ctx.player.yaw || 0 };
        const yaw = ctx.player.yaw || 0;
        const turned = Math.abs(wrapPi(yaw - this._lastDrawAt.yaw)) > 0.08;
        if (turned || Math.hypot(pl.x - this._lastDrawAt.x, pl.z - this._lastDrawAt.z) > 3) {
          this._lastDrawAt = { x: pl.x, z: pl.z, yaw };
          this._mapDirty = true;
        }
      }
      if (this._focusTo && this._stepFocus(dt)) this._mapDirty = true;
      if (this._highlight) {
        // the ring pulses, so it needs a redraw even when nothing else moved
        this._highlight.t += dt;
        this._mapDirty = true;
      }
      if (this._mapDirty) { this._mapDirty = false; this._drawFull(true); }
    }
  }

  _updateNav(ctx) {
    if (!this.destination || !ctx.player) return;
    const p = ctx.player.position;
    const d = Math.hypot(this.destination.pos[0] - p.x, this.destination.pos[1] - p.z);

    if (this.navDist) this.navDist.textContent = formatDistance(d);
    if (this.navName) this.navName.textContent = this.destination.name;

    if (d < 12) {
      ctx.bus.emit('nav:arrived', { loc: this.destination });
      this.setDestination(null);
      return;
    }
    // recompute if the player has wandered off the line
    if (this._routeFrom && Math.hypot(p.x - this._routeFrom.x, p.z - this._routeFrom.z) > 25) {
      this._recomputeRoute();
      ctx.bus.emit('nav:destination', { loc: this.destination });
    }
  }

  /* ---------------- minimap ---------------- */
  _drawMini(ctx) {
    const g = this.miniCtx;
    if (!g || !ctx.player || !this.base) return;
    const S = this.mini.width;
    const p = ctx.player.position;

    // heading: the map turns under a fixed player arrow, as a car radar does
    const heading = ctx.cameraRig && ctx.cameraRig.yaw !== undefined
      ? ctx.cameraRig.yaw : ctx.player.yaw;

    g.save();
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, TAU); g.clip();
    g.fillStyle = '#e8dbbc'; g.fillRect(0, 0, S, S);

    const scale = S / (MINIMAP_RANGE * this.basePPM);
    g.translate(S / 2, S / 2);
    g.rotate(-heading);
    g.scale(scale, scale);
    g.translate(-(p.x - WB.minX) * this.basePPM, -(p.z - WB.minZ) * this.basePPM);

    const span = MINIMAP_RANGE * this.basePPM * 1.5;
    const sx = (p.x - WB.minX) * this.basePPM - span / 2;
    const sy = (p.z - WB.minZ) * this.basePPM - span / 2;
    g.drawImage(this.base, sx, sy, span, span, sx, sy, span, span);

    // the route, following the real streets
    if (this.route && this.route.length > 1) {
      g.beginPath();
      this.route.forEach((q, i) => {
        const x = (q[0] - WB.minX) * this.basePPM;
        const y = (q[1] - WB.minZ) * this.basePPM;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.strokeStyle = '#c8452a';
      g.lineWidth = 3 / scale;
      g.setLineDash([7 / scale, 5 / scale]);
      g.stroke();
      g.setLineDash([]);
    }

    // discovered places only — an undiscovered temple is not on your map
    for (const loc of this.ctx.data.LOCATIONS) {
      if (!ctx.state.discovered.has(loc.id)) continue;
      const dx = loc.pos[0] - p.x, dz = loc.pos[1] - p.z;
      if (Math.hypot(dx, dz) > MINIMAP_RANGE) continue;
      const x = (loc.pos[0] - WB.minX) * this.basePPM;
      const y = (loc.pos[1] - WB.minZ) * this.basePPM;
      g.beginPath(); g.arc(x, y, 4.5 / scale, 0, TAU);
      g.fillStyle = loc.type === 'ghat' ? '#2e6b70' : '#a8563c';
      g.fill();
      g.lineWidth = 1.4 / scale; g.strokeStyle = '#f2e6d0'; g.stroke();
    }

    // destination marker, pulsing
    if (this.destination) {
      const x = (this.destination.pos[0] - WB.minX) * this.basePPM;
      const y = (this.destination.pos[1] - WB.minZ) * this.basePPM;
      const pulse = 5 + Math.sin(performance.now() * 0.005) * 2;
      g.beginPath(); g.arc(x, y, pulse / scale, 0, TAU);
      g.fillStyle = '#c8452a'; g.fill();
    }

    g.restore();

    // player arrow, fixed at the centre
    g.save();
    g.translate(S / 2, S / 2);
    g.beginPath();
    g.moveTo(0, -S * 0.058);
    g.lineTo(S * 0.042, S * 0.05);
    g.lineTo(0, S * 0.026);
    g.lineTo(-S * 0.042, S * 0.05);
    g.closePath();
    g.fillStyle = '#2b1d14'; g.fill();
    g.strokeStyle = '#f2e6d0'; g.lineWidth = S * 0.012; g.stroke();
    g.restore();

    if (this.compass) this.compass.textContent = compassLabel(bearingFromVector(Math.sin(heading), Math.cos(heading)));
  }

  /* ================================================================
   * Full map
   * ================================================================ */
  openFull() {
    this.open = true;
    this._sizeCanvases();
    if (!this.aerial && !this._aerialTried) {
      this._aerialTried = true;
      this.aerial = this._renderAerial();
    }
    if (!this._opened) {
      this._opened = true;
      // Open where you are standing, not on the whole Dham.
      //
      // The world is 9.2 km wide and 4.8 km deep. Fitting all of it onto a
      // portrait phone leaves a thin band across the middle with the town too
      // small to read and two thirds of the screen empty. Every map anyone
      // actually uses opens near them and lets them pull back, so this does
      // too — the zoom-out button and a pinch still reach the whole world.
      this.centreOnMe();
      this._zoom = 0.42;
    }
    this._mapDirty = true;
    this._drawFull(true);
  }

  /** The whole Dham, edge to edge. */
  fitWorld() {
    const w = window.innerWidth, h = window.innerHeight;
    // centre of the rectangle, not of the origin - the origin sits well east of it
    this._pan.x = WORLD.centre[0];
    this._pan.z = WORLD.centre[1];
    // fit whichever axis is tighter, with a little margin off the edges
    this._zoom = clamp(Math.min(w / (WORLD_W * 1.06), h / (WORLD_D * 1.06)), 0.03, 1.8);
    this._mode = 'world';
  }

  /** Close in on where you are standing, at street detail. */
  centreOnMe() {
    const p = this.ctx.player ? this.ctx.player.position : { x: 0, z: 0 };
    this._pan.x = p.x;
    this._pan.z = p.z;
    this._zoom = Math.max(this._zoom, 0.72);
    this._mode = 'me';
  }

  closeFull() {
    this.open = false;
    if (this.sel) this.sel.classList.remove('show');
    this._selected = null;
    this._focusTo = null;
    this._highlight = null;
    if (this.searchHits) { this.searchHits.classList.remove('show'); }
  }

  _wireFull() {
    if (!this.full) return;
    let dragging = false, lx = 0, ly = 0, moved = 0, pinch = 0;

    this.full.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
      this._focusTo = null;   // your finger wins over an easing flight
      this.full.setPointerCapture(e.pointerId);
    });
    this.full.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      const ppm = this._zoom * this.fullDpr;
      this._pan.x -= dx / ppm;
      this._pan.z -= dy / ppm;
      this._clampPan();
      this._drawFull();
    });
    this.full.addEventListener('pointerup', (e) => {
      dragging = false;
      if (moved < 8) this._pick(e.clientX, e.clientY);
    });
    this.full.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._zoom = clamp(this._zoom * (e.deltaY > 0 ? 0.88 : 1.14), 0.06, 1.8);
      this._drawFull();
    }, { passive: false });

    this.full.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (pinch) this._zoom = clamp(this._zoom * (d / pinch), 0.08, 1.6);
      pinch = d;
      this._drawFull();
    }, { passive: false });
    this.full.addEventListener('touchend', () => { pinch = 0; });
  }

  _clampPan() {
    this._pan.x = clamp(this._pan.x, WB.minX, WB.maxX);
    this._pan.z = clamp(this._pan.z, WB.minZ, WB.maxZ);
  }

  _toScreen(x, z) {
    const ppm = this._zoom * this.fullDpr;
    return [
      (x - this._pan.x) * ppm + this.full.width / 2,
      (z - this._pan.z) * ppm + this.full.height / 2,
    ];
  }

  /** Zoom controls, and a button to snap the view back to where you stand. */
  _wireZoom() {
    const zi = document.getElementById("zoom-in");
    const zo = document.getElementById("zoom-out");
    const zm = document.getElementById("zoom-me");
    this.tapEl = document.getElementById("map-tap");
    // higher _zoom = more pixels per metre = closer in
    const step = (f) => {
      this._zoom = clamp(this._zoom * f, 0.06, 1.8);
      this._drawFull();
    };
    if (zi) zi.addEventListener("click", () => step(1.45));
    if (zo) zo.addEventListener("click", () => step(1 / 1.45));
    if (zm) zm.addEventListener("click", () => {
      if (this._mode === 'me') this.fitWorld(); else this.centreOnMe();
      if (zm) zm.textContent = this._mode === 'me' ? '◎' : '⛶';
      this._drawFull();
    });
  }

  /** Tapping empty ground still tells you what road it is. */
  _showTap(wx, wz) {
    if (!this.tapEl || !this.ctx.world.placeName) return;
    const info = this.ctx.world.placeName(wx, wz);
    const txt = info.road ? info.road + "  ·  " + info.area : info.area;
    this.tapEl.textContent = txt;
    this.tapEl.classList.add("show");
    clearTimeout(this._tapTimer);
    this._tapTimer = setTimeout(() => this.tapEl.classList.remove("show"), 3200);
  }

  _pick(clientX, clientY) {
    const ppm = this._zoom;
    const wx = (clientX - window.innerWidth / 2) / ppm + this._pan.x;
    const wz = (clientY - window.innerHeight / 2) / ppm + this._pan.z;
    let best = null, bestD = 60 / ppm;
    for (const loc of this.ctx.data.LOCATIONS) {
      if (!this.ctx.state.discovered.has(loc.id)) continue;
      const d = Math.hypot(loc.pos[0] - wx, loc.pos[1] - wz);
      if (d < bestD) { bestD = d; best = loc; }
    }
    this._selected = best;
    this._showSel(best);
    if (!best) this._showTap(wx, wz);
    this._drawFull();
  }

  /**
   * The panel for a picked landmark.
   *
   * The straight-line distance is the honest headline — it is what "how far is
   * it" means when you are looking at a map. Underneath, when the road network
   * can answer, is the distance you would actually walk and the road you would
   * spend most of it on, which is the thing worth knowing before setting off.
   * Routing is only run for the one place you picked, so the cost is a single
   * A* query per tap.
   */
  _showSel(loc) {
    if (!this.sel) return;
    if (!loc) { this.sel.classList.remove('show'); return; }
    const p = this.ctx.player ? this.ctx.player.position : { x: 0, z: 0 };
    const d = Math.hypot(loc.pos[0] - p.x, loc.pos[1] - p.z);
    const walk = this._walkPreview(p, loc);

    this.sel.innerHTML = `
      <div class="nm">${esc(loc.name)}</div>
      <div class="hi">${esc(loc.hindi || '')}</div>
      <div class="sn">${esc((loc.story && loc.story.short) || '')}</div>
      ${walk ? `<div class="via">
          <b>${esc(walk.dist)}</b> on foot
          <span class="rd">${walk.via ? '\u00b7 via ' + esc(walk.via) : ''}</span>
        </div>` : ''}
      <div class="act">
        <button class="walkbtn ui-interactive" data-walk>Walk here</button>
        <button class="clsbtn ui-interactive" data-close>DISMISS</button>
        <span class="dist">${formatDistance(d)}</span>
      </div>`;
    this.sel.classList.add('show');
    this.sel.querySelector('[data-walk]').addEventListener('click', () => {
      this.setDestination(loc.id);
      if (this.ctx.ui) this.ctx.ui.show('world');
    });
    this.sel.querySelector('[data-close]').addEventListener('click', () => {
      this.sel.classList.remove('show');
      this._selected = null;
      this._highlight = null;
      this._mapDirty = true;
    });
  }

  /**
   * Walking distance and the road that carries most of it, or null when the
   * network cannot reach the place. Cached per destination and invalidated
   * once you have moved 40 m, so panning the map does not re-route.
   */
  _walkPreview(from, loc) {
    const nav = this.ctx.nav;
    if (!nav) return null;
    const c = this._walkCache;
    if (c && c.id === loc.id && Math.hypot(c.x - from.x, c.z - from.z) < 40) return c.out;

    const pts = nav.path(from.x, from.z, loc.pos[0], loc.pos[1]);
    let out = null;
    if (pts && pts.length > 1) {
      let len = 0;
      for (let i = 1; i < pts.length; i++) {
        len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      out = { dist: formatDistance(len), via: this._dominantRoad(pts) };
    }
    this._walkCache = { id: loc.id, x: from.x, z: from.z, out };
    return out;
  }

  /**
   * The named road a path spends the most metres on. Sampled rather than
   * walked point by point — a route across town is a few hundred nodes and the
   * answer is a single line of UI text.
   */
  _dominantRoad(pts) {
    const named = (this._byKind ? Object.values(this._byKind).flat() : this.ctx.data.ROADS)
      .filter((r) => r.name);
    if (!named.length) return null;
    const tally = new Map();
    const step = Math.max(1, Math.floor(pts.length / 60));
    for (let i = 1; i < pts.length; i += step) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * step;
      let best = null, bd = 60 * 60;
      for (const r of named) {
        for (const q of r.points) {
          const dd = (q[0] - pts[i][0]) ** 2 + (q[1] - pts[i][1]) ** 2;
          if (dd < bd) { bd = dd; best = r.name; }
        }
      }
      if (best) tally.set(best, (tally.get(best) || 0) + seg);
    }
    let top = null, tv = 0;
    for (const [k, v] of tally) if (v > tv) { tv = v; top = k; }
    return top;
  }

  /* ================================================================
   * Search
   * ================================================================ */

  /**
   * One flat list of everything you can look up: landmarks, named roads, and
   * the districts. Roads appear once under their name however many OSM ways
   * carry it — Bhaktivedanta Swami Marg is 14 ways, and 14 identical rows
   * would be useless.
   *
   * Matching is deliberately forgiving. People type "iskon", "banke bihari"
   * without the Shri, or the Hindi. Diacritics are folded, a leading "Shri" is
   * ignored, and a match anywhere in the name counts — but a match at the
   * start of a word ranks above one in the middle, so "Radha" puts the four
   * Radha temples above "Shri Jugal Kishore".
   */
  _buildSearchIndex() {
    const ctx = this.ctx;
    const out = [];

    for (const loc of ctx.data.LOCATIONS) {
      out.push({
        kind: 'place',
        id: loc.id,
        loc,
        name: loc.name,
        sub: loc.deity || TYPE_LABEL[loc.type] || 'Place',
        glyph: GLYPH[loc.icon] || GLYPH[loc.type] || '◈',
        pos: loc.pos,
        keys: norm([loc.name, loc.hindi, loc.deity,
                    loc.id.replace(/-/g, ' '), ALIASES[loc.id] || ''].join(' ')),
      });
    }

    // The 133 places OSM names that are not curated landmarks. They carry no
    // model and no story, but somebody looking for "Govinda's" or the UCO Bank
    // should find it, and the map has room for them once you zoom in.
    for (const poi of ctx.data.POIS || []) {
      out.push({
        kind: 'poi',
        id: poi.id,
        poi,
        name: poi.name,
        sub: POI_LABEL[poi.kind] || 'Place',
        glyph: POI_GLYPH[poi.kind] || '\u00b7',
        pos: poi.pos,
        extent: 120,
        keys: norm([poi.name, poi.hindi, poi.tag.replace(/_/g, ' ')].join(' ')),
      });
    }

    const roads = new Map();
    for (const r of ctx.data.ROADS) {
      if (!r.name) continue;
      let e = roads.get(r.name);
      if (!e) {
        e = { kind: 'road', id: 'road:' + r.name, name: r.name, ways: 0, len: 0,
              pts: [], glyph: '▬', keys: norm(r.name) };
        roads.set(r.name, e);
      }
      e.ways++;
      for (let i = 1; i < r.points.length; i++) {
        e.len += Math.hypot(r.points[i][0] - r.points[i - 1][0], r.points[i][1] - r.points[i - 1][1]);
      }
      e.pts.push(...r.points);
    }
    for (const e of roads.values()) {
      // centre of the road's own extent, so focusing frames the whole street
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of e.pts) {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1];
      }
      e.pos = [(x0 + x1) / 2, (z0 + z1) / 2];
      e.extent = Math.max(x1 - x0, z1 - z0);
      e.sub = (e.len >= 1000 ? (e.len / 1000).toFixed(1) + ' km' : Math.round(e.len) + ' m') + ' road';
      e.pts = null;   // the geometry was only needed for the extent
      out.push(e);
    }

    for (const d of ctx.data.DISTRICTS || []) {
      if (!d.name || !d.poly?.length) continue;
      let x = 0, z = 0;
      for (const p of d.poly) { x += p[0]; z += p[1]; }
      out.push({
        kind: 'area', id: 'area:' + d.id, name: d.name, sub: 'Locality', glyph: '◇',
        pos: [x / d.poly.length, z / d.poly.length],
        extent: 900, keys: norm(d.name + ' ' + d.id.replace(/-/g, ' ')),
      });
    }

    this._search = out;
    return out;
  }

  /** Best matches for a typed query, nearest first within each rank. */
  _searchFor(raw) {
    const q = norm(raw);
    if (q.length < 2) return [];
    const p = this.ctx.player ? this.ctx.player.position : { x: 0, z: 0 };
    const scored = [];
    for (const e of this._search) {
      const at = e.keys.indexOf(q);
      if (at < 0) continue;
      // start of the whole string beats start of a word beats anywhere
      const rank = at === 0 ? 0 : e.keys[at - 1] === ' ' ? 1 : 2;
      const d = Math.hypot(e.pos[0] - p.x, e.pos[1] - p.z);
      scored.push({ e, rank, weight: KIND_WEIGHT[e.kind] ?? 3, d });
    }
    // A curated landmark outranks a POI of the same match quality however far
    // away it is: typing "radha" must reach the Radha temples before it
    // reaches a bhojnalaya named after them, even when the bhojnalaya is
    // nearer. Distance only separates entries of the same kind.
    scored.sort((a, b) => a.rank - b.rank || a.weight - b.weight || a.d - b.d);
    return scored.slice(0, 8);
  }

  _wireSearch() {
    const input = this.searchInput, list = this.searchHits, box = this.searchBox;
    if (!input || !list || !box) return;

    const clear = document.getElementById('map-q-clear');
    const render = () => {
      const q = input.value.trim();
      box.classList.toggle('has-q', q.length > 0);
      if (q.length < 2) { list.classList.remove('show'); list.innerHTML = ''; return; }

      const hits = this._searchFor(q);
      if (!hits.length) {
        list.innerHTML = '<li class="none">Nothing here by that name</li>';
        list.classList.add('show');
        return;
      }
      list.innerHTML = hits.map(({ e, d }) => `
        <li role="option" data-id="${esc(e.id)}">
          <span class="g">${e.glyph}</span>
          <span class="tx"><span class="n">${esc(e.name)}</span><span class="s">${esc(e.sub)}</span></span>
          <span class="d">${formatDistance(d)}</span>
        </li>`).join('');
      list.classList.add('show');
    };

    let t = 0;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 90); });
    input.addEventListener('focus', render);
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const first = list.querySelector('li[data-id]');
      if (first) first.click();
      input.blur();
    });

    // Collapse to the glyph. The bar floats over the map, so even with its
    // box reserved it is width the map cannot use for names; this hands that
    // width back when you are reading rather than searching.
    const toggle = document.getElementById('map-q-toggle');
    toggle?.addEventListener('click', () => {
      const mini = box.classList.toggle('mini');
      toggle.setAttribute('aria-expanded', String(!mini));
      toggle.setAttribute('aria-label', mini ? 'Search' : 'Hide search');
      if (mini) { list.classList.remove('show'); input.blur(); }
      else input.focus();
      // the reserved chrome box just changed, so the labels must be laid again
      this._mapDirty = true;
      this._drawFull(true);
    });

    clear?.addEventListener('click', () => {
      input.value = '';
      box.classList.remove('has-q');
      list.classList.remove('show');
      list.innerHTML = '';
      this._highlight = null;
      this._mapDirty = true;
      input.focus();
    });

    list.addEventListener('click', (ev) => {
      const li = ev.target.closest('li[data-id]');
      if (!li) return;
      const e = this._search.find((x) => x.id === li.dataset.id);
      if (!e) return;
      list.classList.remove('show');
      input.blur();
      this.focusOn(e);
    });
  }

  /**
   * Fly the map to a search hit, ring it, and — for a landmark — open the
   * panel so "Walk here" is one tap away. The ring is what answers "how far am
   * I from that place": it is drawn with the distance from you, and the route
   * line is laid the moment you pick it as a destination.
   */
  focusOn(entry) {
    if (!entry) return;
    const span = entry.extent || Math.max(160, (entry.loc?.radius || 40) * 6);
    const w = window.innerWidth, h = window.innerHeight;
    const want = clamp(Math.min(w, h) / (span * 2.4), 0.12, 1.6);
    this._focusTo = { x: entry.pos[0], z: entry.pos[1], zoom: want };
    this._mode = 'focus';
    this._highlight = { pos: entry.pos.slice(), name: entry.name, t: 0 };
    if (entry.loc) { this._selected = entry.loc; this._showSel(entry.loc); }
    else if (this.sel) { this.sel.classList.remove('show'); this._selected = null; }
    this._mapDirty = true;
  }

  /** Ease the pan and zoom toward a focus target; returns true while moving. */
  _stepFocus(dt) {
    const t = this._focusTo;
    if (!t) return false;
    const k = 1 - Math.pow(0.0016, dt);          // frame-rate independent ease
    this._pan.x += (t.x - this._pan.x) * k;
    this._pan.z += (t.z - this._pan.z) * k;
    this._zoom += (t.zoom - this._zoom) * k;
    if (Math.abs(t.x - this._pan.x) < 1.5 && Math.abs(t.z - this._pan.z) < 1.5
        && Math.abs(t.zoom - this._zoom) < 0.004) {
      this._pan.x = t.x; this._pan.z = t.z; this._zoom = t.zoom;
      this._focusTo = null;
    }
    this._clampPan();
    return true;
  }

  /** The pulsing ring around a searched-for place. */
  _drawHighlight(g) {
    const hl = this._highlight;
    if (!hl) return;
    const [sx, sy] = this._toScreen(hl.pos[0], hl.pos[1]);
    const dpr = this._dpr || 1;
    const beat = (Math.sin(hl.t * 3.1) + 1) * 0.5;
    const r = (17 + beat * 11) * dpr;
    g.save();
    g.strokeStyle = 'rgba(200,69,42,' + (0.75 - beat * 0.4).toFixed(3) + ')';
    g.lineWidth = 2.4 * dpr;
    g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(200,69,42,.95)';
    g.lineWidth = 2 * dpr;
    g.beginPath(); g.arc(sx, sy, 9 * dpr, 0, TAU); g.stroke();
    g.restore();
  }

  /* ---------------- level of detail ---------------- */

  /** 0 = the whole town, 1 = a quarter, 2 = a street. */
  _tier() {
    if (this._zoom < TIER_MID) return 0;
    if (this._zoom < TIER_CLOSE) return 1;
    return 2;
  }

  /** The world rectangle the screen currently covers, with a margin. */
  _view() {
    const ppm = this._zoom * this.fullDpr;
    const hw = this.full.width / 2 / ppm + 80;
    const hh = this.full.height / 2 / ppm + 80;
    return {
      x0: this._pan.x - hw, x1: this._pan.x + hw,
      z0: this._pan.z - hh, z1: this._pan.z + hh,
    };
  }

  _inView(e, view) {
    return !(e.x1 < view.x0 || e.x0 > view.x1 || e.z1 < view.z0 || e.z0 > view.z1);
  }

  _screenPts(points) {
    const out = new Array(points.length);
    for (let i = 0; i < points.length; i++) out[i] = this._toScreen(points[i][0], points[i][1]);
    return out;
  }

  /**
   * OpenStreetMap names only a handful of roads here, so an unnamed lane is
   * described the way a person would describe it — by what it runs past. This
   * matches WorldService.placeName so the map and the on-screen readout agree.
   */
  _laneName(road) {
    if (this._laneNames.has(road.id)) return this._laneNames.get(road.id);
    const pts = road.points;
    const stride = Math.max(1, Math.floor(pts.length / 8));
    let best = null, bestD = 170;
    for (const loc of this.ctx.data.LOCATIONS) {
      for (let i = 0; i < pts.length; i += stride) {
        const d = Math.hypot(loc.pos[0] - pts[i][0], loc.pos[1] - pts[i][1]);
        if (d < bestD) { bestD = d; best = loc; }
      }
    }
    const name = best
      ? (road.kind === 'gali' ? 'Gali' : 'Road') + ' by ' + best.name.replace(/^Shri\s+/, '')
      : null;
    this._laneNames.set(road.id, name);
    return name;
  }

  /**
   * Lay a label along a polyline. Walks the line for a run straight enough and
   * long enough to carry the text, rotates to that run's bearing, and refuses
   * to repeat itself inside a screen-width — which is what stops a road that
   * the import split into eleven ways from shouting its name eleven times.
   */
  _labelAlong(pts, textW, opt, draw) {
    const dpr = this.fullDpr;
    const W = this.full.width, H = this.full.height;
    const need = textW + 16 * dpr;
    const gap = opt.gap || Math.min(W, H);
    const placed = opt.placed;
    const recent = opt.recent;
    const half = (opt.fontPx || 12 * dpr) * 0.5;
    const max = opt.max || 1;
    let drawn = 0;
    let i = 0;

    while (i < pts.length - 1 && drawn < max) {
      let j = i + 1, path = 0, fits = false;
      while (j < pts.length) {
        path += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
        const chord = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
        if (path > chord * 1.07) break;          // the run bends; text would not sit on it
        if (chord >= need) { fits = true; break; }
        j++;
      }
      if (!fits) { i++; continue; }

      const a = pts[i], b = pts[j];
      i = j;
      const mx = (a[0] + b[0]) * 0.5, my = (a[1] + b[1]) * 0.5;

      // keep the text the right way up whichever way the road runs
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (ang > Math.PI / 2) ang -= Math.PI;
      else if (ang < -Math.PI / 2) ang += Math.PI;

      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      const hw = textW * 0.5 * c + half * s;
      const hh = textW * 0.5 * s + half * c;
      if (mx - hw < 8 * dpr || mx + hw > W - 8 * dpr) continue;
      if (my - hh < (opt.top || 62 * dpr) || my + hh > H - (opt.bottom || 44 * dpr)) continue;
      if (recent && recent.some((q) => Math.hypot(q[0] - mx, q[1] - my) < gap)) continue;

      const box = [mx - hw, my - hh, mx + hw, my + hh];
      if (placed && placed.some((q) => overlaps(box, q))) continue;

      if (placed) placed.push(box);
      if (recent) recent.push([mx, my]);
      draw(mx, my, ang);
      drawn++;
    }
    return drawn;
  }

  /**
   * As _labelAlong, but for the two features that must always be named — the
   * river and the parikrama ring. If no run of the curve is straight enough,
   * the name goes down flat at the first on-screen point rather than vanishing.
   */
  _labelCurve(pts, textW, opt, draw) {
    const n = this._labelAlong(pts, textW, opt, draw);
    if (n) return n;
    const dpr = this.fullDpr;
    const W = this.full.width, H = this.full.height;
    const half = (opt.fontPx || 12 * dpr) * 0.5;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (x < textW * 0.5 + 12 * dpr || x > W - textW * 0.5 - 12 * dpr) continue;
      if (y < 62 * dpr || y > H - 44 * dpr) continue;
      const box = [x - textW * 0.5, y - half, x + textW * 0.5, y + half];
      if (opt.placed && opt.placed.some((q) => overlaps(box, q))) continue;
      if (opt.placed) opt.placed.push(box);
      draw(x, y, 0);
      return 1;
    }
    return 0;
  }

  /** Where the scale bar sits, and what it is worth — the panel pushes it up. */
  _scaleAnchor() {
    const dpr = this.fullDpr;
    let metres = SCALE_STEPS[0];
    const maxPx = 116 * dpr;
    for (const s of SCALE_STEPS) if (s * this._zoom * dpr <= maxPx) metres = s;
    let lift = 0;
    if (this.sel && this.sel.classList.contains('show')) {
      const r = this.sel.getBoundingClientRect();
      if (r && r.height) lift = (r.height + 22) * dpr;
    }
    return {
      metres,
      len: metres * this._zoom * dpr,
      x: 20 * dpr,
      y: this.full.height - 26 * dpr - lift,
    };
  }

  /** Chrome wins its own space: labels are placed around it, not under it. */
  _reserveChrome(placed) {
    const dpr = this.fullDpr;
    const W = this.full.width, H = this.full.height;
    placed.push([0, 0, W, 78 * dpr]);                                  // the title band

    // The search bar floats over the map, so anything written under it is
    // simply lost - the label thinks it found clear paper. Reserve its real
    // measured box, and the results list too while it is open, since that
    // covers half the screen.
    for (const el of [this.searchBox, this.searchHits]) {
      if (!el) continue;
      if (el === this.searchHits && !el.classList.contains('show')) continue;
      if (el === this.searchHits && this.searchBox?.classList.contains('mini')) continue;
      const r = el.getBoundingClientRect();
      if (r && r.height > 1) {
        placed.push([r.left * dpr, r.top * dpr, r.right * dpr, r.bottom * dpr]);
      }
    }

    // The compass sits below the search bar rather than beside the title now.
    const cy = this._chromeTop();
    placed.push([W - 56 * dpr, cy, W - 12 * dpr, cy + 44 * dpr]);       // the compass rose
    const sc = this._scaleAnchor();
    placed.push([sc.x - 8 * dpr, sc.y - 28 * dpr, sc.x + sc.len + 40 * dpr, sc.y + 8 * dpr]);
    if (this.sel && this.sel.classList.contains('show')) {
      const r = this.sel.getBoundingClientRect();
      if (r && r.height) placed.push([r.left * dpr, r.top * dpr, r.right * dpr, H]);
    }
  }

  /** Top of the free area under the title band and search bar, in device px. */
  _chromeTop() {
    const dpr = this.fullDpr;
    let y = 90 * dpr;
    const r = this.searchBox && this.searchBox.getBoundingClientRect();
    if (r && r.height > 1) y = Math.max(y, (r.bottom + 12) * dpr);
    return y;
  }

  _drawRoads(g, tier, view, ppm) {
    const dpr = this.fullDpr;
    const kinds = tier === 0 ? ['trunk', 'main', 'highway']
      : tier === 1 ? ['trunk', 'street', 'main', 'highway']
        : ['trunk', 'path', 'gali', 'street', 'main', 'highway'];

    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const kind of kinds) {
      const list = this._roadIndex.get(kind);
      if (!list) continue;
      const w = Math.max(0.6, (ROAD_PEN[kind] || ROAD_PEN.street).w * ppm * 0.5);

      g.beginPath();
      let any = false;
      for (const e of list) {
        if (!this._inView(e, view)) continue;
        any = true;
        const pts = e.road.points;
        for (let i = 0; i < pts.length; i++) {
          const [x, y] = this._toScreen(pts[i][0], pts[i][1]);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
      }
      if (!any) continue;

      if (tier === 0) {
        // too small for a casing to read; one honest ink line
        g.strokeStyle = 'rgba(74,54,34,.42)';
        g.lineWidth = Math.max(0.7, w);
        g.stroke();
        continue;
      }
      const ink = ROAD_INK[kind] || ROAD_INK.street;
      g.strokeStyle = ink.case;
      g.lineWidth = w + 1.8 * dpr;
      g.stroke();
      g.strokeStyle = ink.core;
      g.lineWidth = w;
      g.stroke();
    }
  }

  /** Street names written along the streets — the thing that makes a map a map. */
  _drawRoadLabels(g, tier, view, ppm, placed) {
    if (tier < 1) return;
    const dpr = this.fullDpr;
    const fontPx = Math.max(10.5, (tier === 2 ? 12 : 11) * dpr);
    g.font = `${fontPx}px Jost, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    const ink = (text, colour) => (x, y, ang) => {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.lineJoin = 'round';
      g.lineWidth = 4.5 * dpr;
      g.strokeStyle = 'rgba(244,236,214,.92)';
      g.strokeText(text, 0, 0);
      g.fillStyle = colour;
      g.fillText(text, 0, 0);
      g.restore();
    };

    const kinds = tier === 2
      ? ['trunk', 'highway', 'main', 'street', 'gali']
      : ['trunk', 'highway', 'main', 'street'];
    const recent = new Map();
    let budget = tier === 2 ? 20 : 9;

    for (const kind of kinds) {
      const list = this._roadIndex.get(kind);
      if (!list) continue;
      for (const e of list) {
        if (budget <= 0) break;
        if (!this._inView(e, view)) continue;
        const named = !!e.road.name;
        let text = e.road.name;
        if (!named) {
          if (this._zoom < LANE_NAMES_AT || kind === 'trunk' || kind === 'highway' || kind === 'main') continue;
          text = this._laneName(e.road);
          if (!text) continue;
        }
        let seen = recent.get(text);
        if (!seen) { seen = []; recent.set(text, seen); }
        // an unnamed lane's borrowed name is only worth saying once per screen
        if (!named && seen.length) continue;

        // a road that cannot span the text on screen can never carry it
        const textW = g.measureText(text).width;
        if (Math.hypot(e.x1 - e.x0, e.z1 - e.z0) * ppm < textW + 16 * dpr) continue;

        const n = this._labelAlong(
          this._screenPts(e.road.points), textW,
          { max: named ? 2 : 1, fontPx, placed, recent: seen },
          ink(text, named ? '#43301d' : 'rgba(84,64,42,.85)'),
        );
        budget -= n;
      }
    }
    g.textAlign = 'start';
    g.textBaseline = 'alphabetic';
  }

  /**
   * Pulled out, the map names quarters rather than buildings — the names a
   * rickshaw driver would answer to. Pushed in, it names the places themselves.
   */
  _drawPlaceLabels(g, tier, placed) {
    const dpr = this.fullDpr;
    const W = this.full.width, H = this.full.height;
    g.textBaseline = 'middle';

    if (tier === 0) {
      const fontPx = Math.max(10, 11 * dpr);
      g.font = `${fontPx}px Jost, system-ui, sans-serif`;
      g.textAlign = 'center';
      if ('letterSpacing' in g) g.letterSpacing = `${1.6 * dpr}px`;
      for (const a of this._areas) {
        const [sx, sy] = this._toScreen(a.loc.pos[0], a.loc.pos[1]);
        if (sy < 64 * dpr || sy > H - 44 * dpr) continue;
        const wd = g.measureText(a.label).width;
        if (sx - wd / 2 < 12 * dpr || sx + wd / 2 > W - 12 * dpr) continue;
        const box = [sx - wd / 2 - 8 * dpr, sy - fontPx, sx + wd / 2 + 8 * dpr, sy + fontPx];
        if (placed.some((q) => overlaps(box, q))) continue;
        placed.push(box);
        g.beginPath(); g.arc(sx, sy - fontPx * 1.15, 2.6 * dpr, 0, TAU);
        g.fillStyle = 'rgba(138,90,60,.9)'; g.fill();
        g.lineWidth = 4.5 * dpr; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(244,236,214,.92)';
        g.strokeText(a.label, sx, sy);
        g.fillStyle = '#4a3320';
        g.fillText(a.label, sx, sy);
      }
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      g.textAlign = 'start';
      g.textBaseline = 'alphabetic';
      return;
    }

    const fontPx = Math.max(10, (tier === 2 ? 13 : 12) * dpr);
    const devaPx = Math.max(9, 11 * dpr);
    g.textAlign = 'start';
    let budget = tier === 2 ? 26 : 14;

    for (const loc of this._places) {
      if (budget <= 0) break;
      const [sx, sy] = this._toScreen(loc.pos[0], loc.pos[1]);
      if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) continue;
      if (!this.ctx.state.discovered.has(loc.id)) continue;

      const s = Math.max(7, 11 * dpr * Math.min(1.4, this._zoom * 3));
      const label = loc.name.replace(/^Shri\s+/, '');
      g.font = `${fontPx}px Marcellus, Georgia, serif`;
      const wd = g.measureText(label).width;
      const deva = tier === 2 && loc.hindi ? loc.hindi : '';
      const lineH = deva ? fontPx + devaPx * 0.95 : fontPx;

      const cands = [
        [sx + s + 6 * dpr, sy], [sx - s - 6 * dpr - wd, sy],
        [sx - wd / 2, sy - s - lineH * 0.7], [sx - wd / 2, sy + s + lineH * 0.7],
      ];
      let put = null;
      for (const [lx, ly] of cands) {
        // a name half off the screen is worse than the name on the other side
        if (lx < 8 * dpr || lx + wd > W - 8 * dpr) continue;
        if (ly - lineH / 2 < 8 * dpr || ly + lineH / 2 > H - 8 * dpr) continue;
        const box = [lx - 2 * dpr, ly - lineH / 2 - 2 * dpr, lx + wd + 2 * dpr, ly + lineH / 2 + 2 * dpr];
        if (!placed.some((q) => overlaps(box, q))) { put = [lx, ly]; placed.push(box); break; }
      }
      if (!put) continue;
      budget--;

      const ty = deva ? put[1] - devaPx * 0.48 : put[1];
      g.lineWidth = 4.5 * dpr; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(238,228,204,.92)';
      g.strokeText(label, put[0], ty);
      g.fillStyle = '#4a3320';
      g.fillText(label, put[0], ty);
      if (deva) {
        g.font = `${devaPx}px 'Tiro Devanagari Hindi', serif`;
        g.strokeText(deva, put[0], ty + fontPx * 0.92);
        g.fillStyle = '#9c4a33';
        g.fillText(deva, put[0], ty + fontPx * 0.92);
      }
    }
    g.textBaseline = 'alphabetic';
  }

  /** Little elevations for the places themselves, and the boxes labels must dodge. */
  _drawPlaceIcons(g, tier, placed) {
    if (tier === 0) return;                     // the far view marks quarters, not buildings
    const dpr = this.fullDpr;
    const W = this.full.width, H = this.full.height;

    for (const loc of this._places) {
      const [sx, sy] = this._toScreen(loc.pos[0], loc.pos[1]);
      if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) continue;

      const found = this.ctx.state.discovered.has(loc.id);
      const s = Math.max(7, 11 * dpr * Math.min(1.4, this._zoom * 3));
      g.globalAlpha = found ? 1 : 0.24;
      drawIcon(g, loc.icon, sx, sy, s, loc === this._selected);
      g.globalAlpha = 1;
      placed.push([sx - s, sy - s * 1.35, sx + s, sy + s]);
    }
  }

  /**
   * Where you are, unmistakably: an accuracy halo, a cone for the way you are
   * facing, and a ringed dot. Fixed pixel sizes, so it reads the same whether
   * the screen holds a lane or the whole Dham, and drawn last so nothing
   * covers it. Off the edge, it becomes an arrow pointing home.
   */
  _drawPlayer(g) {
    const pl = this.ctx.player;
    if (!pl) return;
    const dpr = this.fullDpr;
    const W = this.full.width, H = this.full.height;
    const [px, py] = this._toScreen(pl.position.x, pl.position.z);

    const m = 26 * dpr;
    if (px < -m || py < -m || px > W + m || py > H + m) {
      const cx = clamp(px, m, W - m), cy = clamp(py, m, H - m);
      const ang = Math.atan2(py - cy, px - cx);
      g.save();
      g.translate(cx, cy); g.rotate(ang);
      g.beginPath();
      g.moveTo(11 * dpr, 0); g.lineTo(-7 * dpr, -8 * dpr); g.lineTo(-7 * dpr, 8 * dpr);
      g.closePath();
      g.fillStyle = '#2f6ed6'; g.fill();
      g.lineWidth = 2 * dpr; g.strokeStyle = '#ffffff'; g.stroke();
      g.restore();
      return;
    }

    // world +Z is screen +Y, so a yaw of 0 (south) points down the screen
    const yaw = pl.yaw || 0;
    const dir = Math.atan2(Math.cos(yaw), Math.sin(yaw));

    const halo = 24 * dpr;
    const hg = g.createRadialGradient(px, py, 2 * dpr, px, py, halo);
    hg.addColorStop(0, 'rgba(47,110,214,.22)');
    hg.addColorStop(1, 'rgba(47,110,214,0)');
    g.beginPath(); g.arc(px, py, halo, 0, TAU);
    g.fillStyle = hg; g.fill();
    g.beginPath(); g.arc(px, py, halo, 0, TAU);
    g.strokeStyle = 'rgba(47,110,214,.20)'; g.lineWidth = 1 * dpr; g.stroke();

    const reach = 40 * dpr, spread = 0.44;
    const cg = g.createRadialGradient(px, py, 4 * dpr, px, py, reach);
    cg.addColorStop(0, 'rgba(47,110,214,.92)');
    cg.addColorStop(0.5, 'rgba(47,110,214,.46)');
    cg.addColorStop(1, 'rgba(47,110,214,0)');
    g.beginPath();
    g.moveTo(px, py);
    g.arc(px, py, reach, dir - spread, dir + spread);
    g.closePath();
    g.fillStyle = cg; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.34)';
    g.lineWidth = 1.2 * dpr;
    g.stroke();

    g.beginPath(); g.arc(px, py, 7.5 * dpr, 0, TAU);
    g.shadowColor = 'rgba(24,32,50,.45)';
    g.shadowBlur = 6 * dpr;
    g.shadowOffsetY = 1.5 * dpr;
    g.fillStyle = '#2f6ed6'; g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.lineWidth = 2.6 * dpr; g.strokeStyle = '#ffffff'; g.stroke();
  }

  /** North is always up here, and the bar says what a screen-inch is worth. */
  _drawChrome(g) {
    const dpr = this.fullDpr;

    // compass rose — pushed below the search bar, which floats over the map
    const cx = this.full.width - 34 * dpr, cy = this._chromeTop() + 22 * dpr;
    g.beginPath(); g.arc(cx, cy, 17 * dpr, 0, TAU);
    g.fillStyle = 'rgba(244,236,214,.86)'; g.fill();
    g.strokeStyle = 'rgba(74,51,32,.28)'; g.lineWidth = 1 * dpr; g.stroke();
    g.beginPath();
    g.moveTo(cx, cy - 12 * dpr);
    g.lineTo(cx - 5 * dpr, cy + 2.5 * dpr);
    g.lineTo(cx + 5 * dpr, cy + 2.5 * dpr);
    g.closePath();
    g.fillStyle = '#c8452a'; g.fill();
    g.font = `${Math.max(8, 9 * dpr)}px Jost, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#4a3320';
    g.fillText('N', cx, cy + 9.5 * dpr);

    // scale bar — the largest round distance that still fits the ruler
    const { metres, len, x, y } = this._scaleAnchor();

    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(x, y - 6 * dpr); g.lineTo(x, y); g.lineTo(x + len, y); g.lineTo(x + len, y - 6 * dpr);
    g.lineWidth = 4.5 * dpr; g.strokeStyle = 'rgba(244,236,214,.9)'; g.stroke();
    g.lineWidth = 2 * dpr; g.strokeStyle = '#4a3320'; g.stroke();
    g.lineCap = 'round';

    const txt = metres >= 1000 ? (metres / 1000) + ' km' : metres + ' m';
    g.font = `${Math.max(9, 10.5 * dpr)}px Jost, system-ui, sans-serif`;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.lineWidth = 4 * dpr; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(244,236,214,.92)';
    g.strokeText(txt, x, y - 10 * dpr);
    g.fillStyle = '#4a3320';
    g.fillText(txt, x, y - 10 * dpr);
    g.textAlign = 'start';
  }

  _drawFull(force) {
    if (!force && this.open) { this._mapDirty = true; return; }
    const g = this.fullCtx;
    if (!g) return;
    const W = this.full.width, H = this.full.height;
    const dpr = this.fullDpr;
    const ppm = this._zoom * this.fullDpr;
    const tier = this._tier();
    const view = this._view();

    const backdrop = this.aerial || this.base;
    if (backdrop) {
      // the real city, from above
      // beyond the imported extent there is no data, so it reads as old paper
      g.fillStyle = '#d8cbb0';
      g.fillRect(0, 0, W, H);
      const spanW = WORLD_W * ppm, spanH = WORLD_D * ppm;
      const ox = (WB.minX - this._pan.x) * ppm + W / 2;
      const oy = (WB.minZ - this._pan.z) * ppm + H / 2;
      g.imageSmoothingEnabled = true;
      g.drawImage(backdrop, ox, oy, spanW, spanH);
      // a wash so ink labels stay readable over photography
      g.fillStyle = 'rgba(244,236,214,.18)';
      g.fillRect(0, 0, W, H);
    } else {
      g.fillStyle = '#e9dcc0';
      g.fillRect(0, 0, W, H);
      g.save();
      g.globalAlpha = 0.05;
      for (let i = 0; i < 260; i++) {
        const x = ((i * 9301 + 49297) % 233280) / 233280 * W;
        const y = ((i * 4021 + 12345) % 233280) / 233280 * H;
        g.fillStyle = i % 2 ? '#8a7057' : '#c8b189';
        g.fillRect(x, y, 2.5, 2.5);
      }
      g.restore();
    }

    const T = (x, z) => this._toScreen(x, z);

    // groves as green stipple — only once they are big enough to read as groves
    if (tier >= 1) {
      for (const loc of this.ctx.data.LOCATIONS) {
        if (loc.type !== 'grove') continue;
        const [sx, sy] = T(loc.pos[0], loc.pos[1]);
        g.fillStyle = 'rgba(96,126,66,.3)';
        g.beginPath(); g.arc(sx, sy, loc.build.w * 0.5 * ppm, 0, TAU); g.fill();
      }
    }

    // Yamuna
    const r = this.ctx.data.RIVER;
    g.beginPath();
    r.points.forEach((p, i) => { const [x, y] = T(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = '#8fbcc0'; g.lineWidth = r.width * ppm; g.lineCap = 'round'; g.lineJoin = 'round';
    g.stroke();
    g.strokeStyle = '#5d949a'; g.lineWidth = r.width * ppm * 0.7; g.stroke();

    this._drawRoads(g, tier, view, ppm);

    // the parikrama ring, dashed
    const pari = this.ctx.data.PARIKRAMA;
    const ringW = clamp(4 * ppm, 1.6, 9 * dpr);
    g.beginPath();
    pari.points.forEach((p, i) => { const [x, y] = T(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath();
    g.strokeStyle = '#d98f3c'; g.lineWidth = ringW;
    g.setLineDash([ringW * 2.6, ringW * 2]); g.stroke(); g.setLineDash([]);

    // the route
    if (this.route && this.route.length > 1) {
      const rw = clamp(3.5 * ppm, 2, 8 * dpr);
      g.beginPath();
      this.route.forEach((q, i) => { const [x, y] = T(q[0], q[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.strokeStyle = '#c8452a'; g.lineWidth = rw;
      g.setLineDash([rw * 2.6, rw * 1.8]); g.stroke(); g.setLineDash([]);
    }

    // everything from here competes for the same space
    const placed = [];
    this._reserveChrome(placed);
    this._drawPlaceIcons(g, tier, placed);

    // the Yamuna, named along its own course
    if (r.points.length > 2) {
      const riverPx = Math.max(13, 17 * dpr);
      g.font = `italic ${riverPx}px Marcellus, Georgia, serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const wd = g.measureText('Yamuna').width;
      this._labelCurve(this._screenPts(r.points), wd,
        { max: 2, fontPx: riverPx * 2, placed, recent: [] },
        (x, y, a) => {
          g.save();
          g.translate(x, y); g.rotate(a);
          g.fillStyle = 'rgba(28,66,74,.82)';
          g.font = `italic ${riverPx}px Marcellus, Georgia, serif`;
          g.fillText('Yamuna', 0, -riverPx * 0.42);
          g.font = `${Math.max(11, 14 * dpr)}px 'Tiro Devanagari Hindi', serif`;
          g.fillText('यमुना', 0, riverPx * 0.7);
          g.restore();
        });
      g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }

    // and the ring says what it is, at every zoom
    if (pari.points.length > 2) {
      const ringPx = Math.max(10, 11.5 * dpr);
      g.font = `${ringPx}px Jost, system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const txt = 'PARIKRAMA MARG · 10.2 km';
      const wd = g.measureText(txt).width;
      this._labelCurve(this._screenPts(pari.points), wd,
        { max: tier === 0 ? 1 : 2, fontPx: ringPx, placed, recent: [] },
        (x, y, a) => {
          g.save();
          g.translate(x, y); g.rotate(a);
          g.lineWidth = 4.5 * dpr; g.lineJoin = 'round';
          g.strokeStyle = 'rgba(244,236,214,.92)';
          g.strokeText(txt, 0, 0);
          g.fillStyle = '#b8721f';
          g.fillText(txt, 0, 0);
          g.restore();
        });
      g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }

    this._drawRoadLabels(g, tier, view, ppm, placed);
    this._drawPlaceLabels(g, tier, placed);

    // destination, so the place you chose is findable at any zoom
    if (this.destination) {
      const [dx, dy] = T(this.destination.pos[0], this.destination.pos[1]);
      g.beginPath(); g.arc(dx, dy - 9 * dpr, 6 * dpr, Math.PI * 0.85, Math.PI * 0.15);
      g.lineTo(dx, dy);
      g.closePath();
      g.fillStyle = '#c8452a'; g.fill();
      g.lineWidth = 1.8 * dpr; g.strokeStyle = '#f7efdd'; g.stroke();
    }

    this._drawChrome(g);
    this._drawHighlight(g);
    this._drawPlayer(g);
  }

  dispose() {}
}

/** Small elevation icons — a shikhara, a gopuram, a ghat stair. */
function drawIcon(g, icon, x, y, s, selected) {
  g.save();
  g.translate(x, y);
  g.fillStyle = selected ? '#c8452a' : '#8a5a3c';
  g.strokeStyle = '#f2e6d0';
  g.lineWidth = 1.5;

  g.beginPath();
  switch (icon) {
    case 'ghat':
      for (let i = 0; i < 3; i++) g.rect(-s + i * s * 0.33, -s * 0.2 + i * s * 0.28, s * 2 - i * s * 0.66, s * 0.26);
      break;
    case 'grove':
      g.arc(0, -s * 0.2, s * 0.7, 0, TAU);
      g.rect(-s * 0.12, -s * 0.2, s * 0.24, s * 0.9);
      break;
    case 'kund':
      g.rect(-s * 0.8, -s * 0.5, s * 1.6, s);
      break;
    case 'gate':
      g.rect(-s * 0.8, -s, s * 0.34, s * 2);
      g.rect(s * 0.46, -s, s * 0.34, s * 2);
      g.rect(-s * 0.8, -s, s * 1.6, s * 0.4);
      break;
    case 'market':
      g.moveTo(-s, 0); g.lineTo(0, -s * 0.8); g.lineTo(s, 0); g.lineTo(s * 0.7, s * 0.7); g.lineTo(-s * 0.7, s * 0.7);
      break;
    case 'landmark':
      g.moveTo(-s * 0.5, s); g.lineTo(-s * 0.3, -s * 1.3); g.lineTo(s * 0.3, -s * 1.3); g.lineTo(s * 0.5, s);
      break;
    default: {
      // a shikhara: a curved tower on a base
      g.moveTo(-s * 0.8, s * 0.8);
      g.quadraticCurveTo(-s * 0.55, -s * 0.5, 0, -s * 1.3);
      g.quadraticCurveTo(s * 0.55, -s * 0.5, s * 0.8, s * 0.8);
      g.closePath();
      break;
    }
  }
  g.fill();
  g.stroke();
  g.restore();
}

const overlaps = (a, b) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);

const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Fold a name to something typeable: lower case, no diacritics, no leading
 * "Shri", punctuation to spaces. Searching for "radha raman" should find
 * "Shri Radha Raman Mandir", and so should "Rādhā".
 */
function norm(v) {
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bshri\b|\bsri\b|\bshree\b/g, ' ')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * What people actually type. Official names are not what anybody searches: the
 * Krishna Balaram Mandir is "ISKCON" to everyone including its own signage,
 * and nobody spells Chhatikara the same way twice. Substring matching cannot
 * bridge a missing letter, so the spellings go in the index alongside the name.
 */
const ALIASES = {
  'iskcon-krishna-balaram': 'iskcon iskon isckon hare krishna balaram temple',
  'chhatikara-crossing': 'chatikara chhatikara chattikara chauraha crossing bus stand nh44 ah1 highway',
  'banke-bihari': 'bankey bihari banke bihariji thakurji',
  'prem-mandir': 'prem mandir kripalu jagadguru',
  'radha-raman': 'radharaman',
  'radha-shyamsundar': 'shyamsundar shyam sundar',
  'radha-gopinath': 'gopinath gopinathji',
  'radha-damodar': 'damodar damodarji',
  'radha-vallabh': 'vallabh vallabhji',
  'govind-dev': 'govind dev govindji govinddev',
  'madan-mohan': 'madanmohan',
  'keshi-ghat': 'kesi ghat keshighat',
  'nidhivan': 'nidhi van nidhivan',
  'seva-kunj': 'sewa kunj seva kunj',
  'chandrodaya': 'chandrodaya vcm tallest temple',
  'rangaji': 'ranganath rangji rangaji',
  'gopishwar-mahadev': 'gopeshwar gopishwar mahadev shiva',
  'katyayani': 'katyayani devi shakti peeth',
  'vrindavan-gate': 'vrindavan dwar gate darwaza',
};

/** Row glyphs in the search list, by landmark icon or type. */
const GLYPH = {
  temple: '\u25c8', ghat: '\u2248', kund: '\u25cb', grove: '\u2663',
  gate: '\u25ad', landmark: '\u25b2', bazaar: '\u25a4', tower: '\u25b2',
};

/** Search ordering between kinds. Lower sorts first. */
const KIND_WEIGHT = { place: 0, road: 1, area: 2, poi: 3 };

/** What each POI class is called in a search row, and its glyph. */
const POI_LABEL = {
  temple: 'Mandir', food: 'Food', stay: 'Stay', service: 'Service',
  health: 'Health', green: 'Park', bazaar: 'Bazaar', sight: 'Worth seeing',
  water: 'Water', shop: 'Shop', other: 'Place',
};
const POI_GLYPH = {
  temple: '\u25c7', food: '\u25cf', stay: '\u25b0', service: '\u25a0',
  health: '\u271a', green: '\u2663', bazaar: '\u25a4', sight: '\u2605',
  water: '\u2248', shop: '\u25aa', other: '\u00b7',
};

/** Human label for a landmark type, when it has no deity to show. */
const TYPE_LABEL = {
  temple: 'Mandir', ghat: 'Ghat on the Yamuna', kund: 'Kund',
  grove: 'Grove', landmark: 'Landmark', bazaar: 'Bazaar',
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
