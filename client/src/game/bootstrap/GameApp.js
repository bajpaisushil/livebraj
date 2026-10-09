/**
 * GameApp — composition root and the game loop.
 *
 * Every system is constructed here, given the shared context, and updated in a
 * fixed order. Nothing else in the codebase knows how to build anything else.
 *
 * Systems are constructed defensively: a module that fails to load or throws in
 * its constructor is reported and skipped rather than taking the whole world
 * down with it. During active development that is the difference between a
 * broken feature and a black screen.
 */

/** How often the world quietly saves itself while you are walking, in seconds. */
const AUTOSAVE_S = SAVE.autosaveSeconds;

import * as THREE from 'three';
import { SAVE } from '../../content/tuning.js';

import { EventBus, Events } from '../../engine/core/EventBus.js';
import { makeQuality } from '../../engine/core/AppConfig.js';
import { SaveSystem } from '../../engine/save/SaveSystem.js';
import { TextureCache } from '../../engine/render/TextureCache.js';
import { haptic } from '../../engine/ui/Haptics.js';
import { Narration } from '../../engine/audio/Narration.js';
import { makeRng, hashSeed } from '../../engine/math/Random.js';

import content from '../../content/index.js';
import { WorldService } from '../world/WorldService.js';
import { TimeOfDay } from '../world/TimeOfDay.js';
import { Curtains } from '../devotion/Curtain.js';
import { LiveConditions } from '../world/LiveConditions.js';
import { InteriorSystem } from '../world/InteriorSystem.js';
import { NavGraph } from '../navigation/NavGraph.js';
import { RouteRenderer } from '../navigation/RouteRenderer.js';
import { ParikramaSystem } from '../parikrama/ParikramaSystem.js';
import { RitualSystem } from '../devotion/RitualSystem.js';
import { GatheringSystem } from '../devotion/GatheringSystem.js';
import { RickshawSystem } from '../transport/RickshawSystem.js';
import { DeityImages } from '../devotion/DeityImages.js';
import { CheatCodes } from '../transport/CheatCodes.js';
import { DialogueSystem } from '../dialogue/DialogueSystem.js';

const WORLD_SEED = hashSeed('vrindavan-dham');

/**
 * Simulation stepping.
 *
 * A single clamped delta stops physics tunnelling but makes the whole world run
 * in slow motion the moment the frame rate drops — walk on a struggling phone
 * and the avatar crawls, which reads as unresponsive rather than as a low
 * frame rate. So a long frame is instead broken into several fixed steps: the
 * world keeps real-time pace, and nothing ever integrates more than 50 ms at
 * once. CATCH_UP caps how far it will chase, so a stall cannot spiral.
 */
const SUB_STEP = 1 / 30;
const MAX_STEP = 0.05;
const CATCH_UP = 0.25;

/**
 * How many fixed steps one frame may take: STEPS in ordinary play, LAPSE_STEPS
 * while the world is being shown as a time-lapse (`ctx.timeScale`, see _frame).
 * Eight steps is 0.27 s of world a frame, which a time-lapse of x8 at 30 fps
 * already needs all of; sixteen lets x12 keep its pace at 45 fps and degrade
 * gracefully below that, never spiral.
 */
const STEPS = 8;
const LAPSE_STEPS = 16;

export class GameApp {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.paused = false;
    this._raf = 0;
    this._acc = 0;
    this._fpsT = 0;
    this._fpsN = 0;
    this.fps = 60;
  }

  /* ================================================================
   * Boot
   * ================================================================ */
  async boot() {
    const canvas = document.getElementById('gl');
    const bus = new EventBus();
    const save = new SaveSystem();
    let state = save.bind(save.load());
    // a cleared WebView must not mean a lost journey
    state = save.bind(await save.restoreFromNative(state));
    const quality = makeQuality(state.settings.quality);

    // A phone that cannot give us a context should say so plainly rather than
    // sit on a loading screen for ever.
    const probe = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!probe) {
      throw new Error('This browser could not start 3D graphics (WebGL). '
        + 'Try Chrome, close other tabs, or turn off battery saver.');
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES is built for photographic realism and quietly desaturates everything,
    // which is the opposite of the bright, high-contrast look this world wants.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    if (quality.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.25, 4600);
    camera.position.set(0, 40, 60);

    const ctx = {
      canvas, renderer, scene, camera,
      clock: new THREE.Clock(),
      bus, Events, save, state,
      data: content,
      quality,
      rng: makeRng(WORLD_SEED),
      rngAt: (seed) => makeRng(typeof seed === 'number' ? seed : hashSeed(seed)),
      textures: new TextureCache(),
      app: this,
      // how much faster than real time the world is being run: 1 except
      // while a long ride is shown as a time-lapse (RickshawSystem), which
      // writes it and says so on the ride bar. `timeScaleNow` is what the
      // last frame actually managed, which a slow device can make less.
      timeScale: 1,
      timeScaleNow: 1,
    };
    this.ctx = ctx;

    this._applyAccessibility(state.settings);
    this._wireGlobalEvents();

    // ---- world ----
    this._progress(0.02, 'Reading the map of Vrindavan');
    ctx.live = this._safe('LiveConditions', () => new LiveConditions(ctx));
    // open the app at six in the evening in India and the lamps are lit here too
    if (ctx.live && ctx.state.settings.liveTime !== false) {
      ctx.state.settings.timeOfDay = ctx.live.phase;
    }
    ctx.time = this._safe('TimeOfDay', () => new TimeOfDay(ctx));

    ctx.world = new WorldService(ctx);
    await ctx.world.build((pct, note) => this._progress(0.04 + pct * 0.72, note));

    this._progress(0.80, 'Tracing the streets');
    ctx.nav = this._safe('NavGraph', () => new NavGraph(ctx));
    ctx.interior = this._safe('InteriorSystem', () => new InteriorSystem(ctx));
    ctx.ritual = this._safe('RitualSystem', () => new RitualSystem(ctx));

    // ---- systems ----
    this._progress(0.84, 'Waking the town');
    ctx.input      = await this._load('InputManager', '../../engine/input/InputManager.js', (M) => new M.InputManager(ctx));
    ctx.player     = await this._load('Player',        '../player/Player.js',               (M) => new M.Player(ctx));
    ctx.cameraRig  = await this._load('CameraRig',     '../camera/ThirdPersonCamera.js',    (M) => new M.CameraRig(ctx));

    this._progress(0.89, 'Opening the temples');
    ctx.audio      = await this._load('AudioEngine',   '../../engine/audio/AudioEngine.js', (M) => new M.AudioEngine(ctx));
    ctx.interaction= await this._load('Interaction',   '../interaction/InteractionSystem.js', (M) => new M.InteractionSystem(ctx));
    ctx.map        = await this._load('MapSystem',     '../map/MapSystem.js',               (M) => new M.MapSystem(ctx));
    ctx.route      = this._safe('RouteRenderer', () => new RouteRenderer(ctx));
    ctx.parikrama  = this._safe('Parikrama', () => new ParikramaSystem(ctx));

    this._progress(0.94, 'Letting the cows out');
    ctx.crowd      = await this._load('Crowd',         '../npc/CrowdSystem.js',             (M) => new M.Crowd(ctx));
    // after the crowd, and before the player is placed: the gatherings push
    // static colliders into the world, and the spawn point is resolved against
    // those at the end of boot
    ctx.gatherings = this._safe('Gatherings', () => new GatheringSystem(ctx));
    ctx.rickshaw   = this._safe('Rickshaw', () => new RickshawSystem(ctx));
    ctx.deities    = this._safe('Deities',  () => new DeityImages(ctx));
    // after the world, because it finds its leaves by name in the built scene
    ctx.curtains   = this._safe('Curtains', () => new Curtains(ctx));
    ctx.cheats     = this._safe('Cheats',   () => new CheatCodes(ctx));
    ctx.dialogue   = this._safe('Dialogue', () => new DialogueSystem(ctx));
    ctx.narration  = this._safe('Narration', () => new Narration(ctx));

    this._progress(0.97, 'Hanging the garlands');
    ctx.ui         = await this._load('UI',            '../ui/UISystem.js',                 (M) => new M.UI(ctx));

    this._restorePickedFlowers();
    this._placePlayerAtStart();
    this._wireSystemEvents();

    this._progress(1, 'Ready');
    this.start();

    // hand over to the UI: first launch gets the cinematic, everyone else the menu
    const first = state.firstLaunch;
    if (first) { state.firstLaunch = false; save.write(); }
    if (ctx.ui) ctx.ui.show(first ? 'intro' : 'menu');

    // Always. Whatever screen we handed to.
    //
    // This used to be an \`else\`, on the assumption that the screen we show
    // takes the curtain down itself. Only the intro does. So a FIRST launch
    // worked and every launch after it sat on the loading screen for ever with
    // a finished, running world behind it — the note even said "Ready". It
    // survived every check because a check always boots fresh, and it only
    // appears once you have a save, which is to say only for someone who has
    // actually played. hideLoading is guarded against running twice.
    this._hideLoading();

    return ctx;
  }

  /* ================================================================
   * Construction helpers — one broken module must not break the world
   * ================================================================ */
  _safe(name, factory) {
    try { return factory(); }
    catch (err) { this._fail(name, err); return null; }
  }

  async _load(name, path, factory) {
    try {
      const M = await import(/* @vite-ignore */ path);
      return factory(M);
    } catch (err) { this._fail(name, err); return null; }
  }

  _fail(name, err) {
    console.error(`[boot] ${name} unavailable —`, err);
    (this._failed ||= []).push(name);
    const note = document.getElementById('load-note');
    if (note) note.textContent = `${name} unavailable — continuing`;
  }

  get failedSystems() { return this._failed || []; }

  /* ================================================================
   * Start position
   * ================================================================ */
  _placePlayerAtStart() {
    const ctx = this.ctx;
    if (!ctx.player) return;

    // Resume exactly where you left off, if you have been here before.
    const last = ctx.state.lastPosition;
    if (last && isFinite(last.x) && isFinite(last.z)) {
      ctx.player.position.set(last.x, ctx.world.groundHeight(last.x, last.z), last.z);
      if (ctx.player.setYaw) ctx.player.setYaw(last.yaw || 0);
      if (ctx.state.carrying && ctx.player.giveFlower) ctx.player.giveFlower(ctx.state.carrying.kind);
      return;
    }

    // Almost everyone arrives through Chhatikara: off the highway, past the bus
    // stand, under the arch. Starting there makes the walk into town the first
    // thing that happens, which is how the real journey begins.
    const start = ctx.data.LOCATION_BY_ID.get('chhatikara-crossing')
      || ctx.data.LOCATION_BY_ID.get('vrindavan-gate')
      || ctx.data.LOCATION_BY_ID.get('banke-bihari');
    const centre = start ? start.pos : [0, 0];
    const clearOf = start ? Math.max(start.build.w, start.build.d) * 0.5 + 8 : 30;
    // face the way the road runs into town, not back at the highway
    const bb = ctx.data.LOCATION_BY_ID.get('banke-bihari');

    let best = null;
    if (ctx.nav) {
      for (const node of ctx.nav.nodes.values()) {
        const d = Math.hypot(node.x - centre[0], node.z - centre[1]);
        if (d < clearOf || d > clearOf + 40) continue;
        if (!best || d < best.d) best = { x: node.x, z: node.z, d };
      }
    }

    const x = best ? best.x : centre[0];
    const z = best ? best.z : centre[1] + clearOf;
    ctx.player.position.set(x, ctx.world.groundHeight(x, z), z);
    // look toward the town, not back down the highway
    const look = bb ? bb.pos : centre;
    if (ctx.player.setYaw) ctx.player.setYaw(Math.atan2(look[0] - x, look[1] - z));
  }

  /** Flowers taken in an earlier session are gone, not waiting to be taken again. */
  _restorePickedFlowers() {
    const ctx = this.ctx;
    const taken = ctx.state.pickedFlowers;
    if (!taken || !taken.size || !ctx.world.flowers) return;
    let n = 0;
    for (const f of ctx.world.flowers) {
      if (!taken.has(f.id)) continue;
      f.picked = true;
      if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh);
      n++;
    }
    if (n) console.info(`[save] ${n} flowers already picked`);
  }

  /**
   * Save every so often while you play, not only on the way out.
   *
   * The exit hooks below cover the routes a phone actually uses, but none of
   * them fire if the tab is killed, the browser crashes, or the device simply
   * runs out of memory with the page in the background. A pilgrimage you have
   * walked for twenty minutes should not depend on the browser being polite
   * about how it closes.
   */
  _autosave() {
    // Wall clock, not a frame delta: this is called from a bus handler that
    // has no dt, and "every twenty seconds of real time" is what is wanted
    // anyway — a slow device should not save less often.
    const now = performance.now();
    if (!this._lastSaveAt) { this._lastSaveAt = now; return; }
    if (now - this._lastSaveAt < AUTOSAVE_S * 1000) return;
    this._lastSaveAt = now;
    this._persistPosition();
  }

  /** Write position on any exit route the OS might use. */
  _persistPosition() {
    const ctx = this.ctx;
    if (!ctx || !ctx.player) return;
    const p = ctx.player.position;
    ctx.state.lastPosition = {
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      z: Math.round(p.z * 100) / 100,
      yaw: Math.round(ctx.player.yaw * 1000) / 1000,
    };
    ctx.save.flush();
  }

  /* ================================================================
   * Wiring
   * ================================================================ */
  _wireGlobalEvents() {
    const ctx = this.ctx;

    ctx.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[gl] context lost');
      const note = document.getElementById('load-note');
      const loading = document.getElementById('loading');
      if (loading) { loading.classList.remove('gone'); loading.style.display = ''; }
      if (note) note.textContent = 'Graphics interrupted — reopening';
      setTimeout(() => window.location.reload(), 1500);
    });

    window.addEventListener('resize', () => this._resize(), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 120));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this._persistPosition(); this.pause(); } else this.resume();
    });
    // pagehide is the one Android and iOS actually deliver when the app is killed
    window.addEventListener('pagehide', () => this._persistPosition());
    window.addEventListener('beforeunload', () => this._persistPosition());
    window.addEventListener('blur', () => this._persistPosition());

    ctx.bus.on('haptic', ({ pattern }) => haptic(pattern, ctx.state.settings));

    ctx.bus.on('settings:changed', ({ settings }) => {
      this._applyAccessibility(settings);
      if (ctx.audio) ctx.audio.setVolume(settings.volume, settings.sfxVolume);
    });

    // The audio context can only start from a gesture. Take the first one we get.
    const kick = () => {
      if (ctx.audio && ctx.audio.start) ctx.audio.start();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
    window.addEventListener('pointerdown', kick, { passive: true });
    window.addEventListener('keydown', kick);
  }

  _wireSystemEvents() {
    const ctx = this.ctx;

    // route selected on the map -> a ribbon in the actual world
    ctx.bus.on('nav:destination', ({ loc }) => {
      if (!ctx.route) return;
      if (!loc) { ctx.route.setPath(null); return; }
      const p = ctx.player.position;
      const path = ctx.nav ? ctx.nav.path(p.x, p.z, loc.pos[0], loc.pos[1]) : null;
      ctx.route.setPath(path);
    });

    ctx.bus.on('nav:arrived', () => { if (ctx.route) ctx.route.setPath(null); });

    // walking distance is the one number the journey screen reports
    ctx.bus.on('player:moved', ({ delta }) => {
      if (delta > 0) ctx.state.metresWalked += delta;
      this._autosave();
      this._posAcc = (this._posAcc || 0) + delta;
      if (this._posAcc > 25) { this._posAcc = 0; this._persistPosition(); }
    });

    ctx.bus.on('ui:screen', ({ name }) => {
      const inWorld = name === 'world';
      // A ride keeps going while you look at the map. Pausing everything on a
      // screen change stopped the rickshaw dead the moment you opened the map,
      // which is the opposite of what a map is for — you want to watch yourself
      // move along the route while you decide where to get off.
      const riding = !!(ctx.rickshaw
        && (ctx.rickshaw.state === 'riding' || ctx.rickshaw.state === 'driving'));
      this.paused = !inWorld && name !== 'intro' && !(riding && name === 'map');
      if (ctx.input) ctx.input.setEnabled(inWorld);
      const layer = document.getElementById('touch-layer');
      if (layer) layer.classList.toggle('on', inWorld);
      const hud = document.getElementById('hud');
      if (hud) hud.classList.toggle('show', inWorld);
      if (ctx.cameraRig && ctx.cameraRig.setMode) {
        ctx.cameraRig.setMode(name === 'avatar' ? 'avatar' : name === 'intro' ? 'cinematic' : 'follow');
      }
    });

    ctx.bus.on('parikrama:start', () => { /* the bar is owned by UISystem */ });
  }

  _applyAccessibility(s) {
    const root = document.documentElement;
    if (s.largeText) root.dataset.ui = 'large'; else delete root.dataset.ui;
    if (s.reduceMotion) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
  }

  _resize() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = window.innerWidth, h = window.innerHeight;
    ctx.camera.aspect = w / h;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(w, h, false);
    ctx.renderer.setPixelRatio(ctx.quality.pixelRatio);
    if (ctx.map && ctx.map.resize) ctx.map.resize();
  }

  /* ================================================================
   * Loading screen
   * ================================================================ */
  _progress(pct, note) {
    const el = document.getElementById('load-note');
    if (el && note) el.textContent = note;
    if (this.ctx && this.ctx.ui && this.ctx.ui.setLoading) this.ctx.ui.setLoading(pct, note);
  }

  _hideLoading() {
    const el = document.getElementById('loading');
    if (!el || el.classList.contains('gone')) return;
    el.classList.add('gone');
    setTimeout(() => { el.style.display = 'none'; }, 900);
  }

  /* ================================================================
   * Loop
   * ================================================================ */
  start() {
    if (this.running) return;
    this.running = true;
    this.ctx.clock.start();
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      this._frame();
    };
    this._raf = requestAnimationFrame(tick);
  }

  pause() { this.paused = true; }
  resume() {
    this.paused = false;
    if (this.ctx) this.ctx.clock.getDelta(); // swallow the gap
  }

  _frame() {
    const ctx = this.ctx;
    // a backgrounded tab can hand back a delta of several seconds
    const raw = Math.min(ctx.clock.getDelta(), CATCH_UP);

    this._fpsN++; this._fpsT += raw;
    if (this._fpsT > 0.5) { this.fps = this._fpsN / this._fpsT; this._fpsN = 0; this._fpsT = 0; }

    if (!this.paused) {
      // walk the frame in fixed steps so a slow device loses smoothness, never
      // pace: two 40 ms steps rather than one 80 ms leap, or one clamped 50 ms
      // step that quietly throws the other 30 ms away
      /*
       * A TIME-LAPSE RUNS THE WHOLE WORLD FASTER, NOT ONE VEHICLE.
       *
       * A long ride used to be made bearable by driving the rickshaw at up to
       * 94 km/h past people walking at 5. Now the rickshaw keeps its real
       * speed and, for a long ride, everything here simply takes more of the
       * same fixed steps a frame: the walkers, the traffic, the cows and the
       * ride itself, all together, as a film run fast does. The ride bar says
       * by how much. The camera, the sky and the screens below stay on the
       * real clock, because they are about you watching, not the world.
       */
      const scale = ctx.timeScale > 1 ? ctx.timeScale : 1;
      const want = raw * scale;
      let left = want;
      let guard = 0;
      const steps = scale > 1 ? LAPSE_STEPS : STEPS;
      while (left > 1e-4 && guard++ < steps) {
        const dt = Math.min(left, left > MAX_STEP ? SUB_STEP : left);
        left -= dt;
        ctx.__simAccum = (ctx.__simAccum || 0) + dt;

        if (ctx.input) ctx.input.update(dt);
        if (ctx.player) ctx.player.update(dt, ctx);
        if (ctx.world) ctx.world.update(dt, ctx);
        if (ctx.crowd) ctx.crowd.update(dt, ctx);
        if (ctx.interaction) ctx.interaction.update(dt, ctx);
        if (ctx.ritual) ctx.ritual.update(dt, ctx);
        if (ctx.gatherings) ctx.gatherings.update(dt, ctx);
        if (ctx.rickshaw) ctx.rickshaw.update(dt, ctx);
        if (ctx.dialogue) ctx.dialogue.update(dt, ctx);
        if (ctx.parikrama) ctx.parikrama.update(dt, ctx);
      }
      // what this frame managed, so nobody quotes a pace the device cannot keep
      if (raw > 1e-4) ctx.timeScaleNow = (want - Math.max(0, left)) / raw;
    }

    const dt = Math.min(raw, MAX_STEP);

    // these keep running behind a menu so the world stays alive underneath it
    if (ctx.cameraRig) ctx.cameraRig.update(dt, ctx);
    if (ctx.time) ctx.time.update(dt, ctx);
    if (ctx.curtains) ctx.curtains.update(dt, ctx);
    if (ctx.live) ctx.live.update(dt, ctx);
    if (ctx.interior) ctx.interior.update(dt, ctx);
    if (ctx.route) ctx.route.update(dt, ctx);
    if (ctx.map) ctx.map.update(dt, ctx);
    if (ctx.audio) ctx.audio.update(dt, ctx);
    if (ctx.ui) ctx.ui.update(dt, ctx);

    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this.running = false;
    const ctx = this.ctx;
    for (const k of ['crowd', 'interaction', 'map', 'parikrama', 'audio', 'ui', 'input', 'route', 'nav', 'rickshaw', 'dialogue', 'narration', 'ritual', 'gatherings', 'interior', 'time', 'world']) {
      if (ctx[k] && ctx[k].dispose) { try { ctx[k].dispose(); } catch { /* ignore */ } }
    }
    ctx.textures.dispose();
    ctx.renderer.dispose();
  }
}
