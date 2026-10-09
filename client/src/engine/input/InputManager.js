/**
 * InputManager — one intent stream out of four very different devices.
 *
 * A phone held in two hands, a tablet, a laptop with a mouse and a gamepad all
 * end up writing the same few fields. Nothing downstream asks what is attached.
 *
 * The contract every other system reads:
 *   move   {x,y}  -1..1, y positive = forward. Magnitude is speed intent.
 *   look   {x,y}  radians for THIS frame, sensitivity and invert already
 *                 applied. Rebuilt at the top of update(), consumed by the
 *                 camera rig during the same frame.
 *   running bool  sustained hard deflection, Shift, or a pad trigger.
 *   lookActive bool  a look pointer is down; the camera stops auto-aligning.
 *   moveTo {x,z}|null  tap-to-move destination in world metres; Player nulls it.
 *
 * Touch is deliberately multi-touch: the left thumb and the right thumb are
 * tracked by their own identifiers, so walking and looking never fight. The
 * left stick floats — it is born wherever the thumb lands, which is the whole
 * difference between a phone control that feels right and one that does not.
 *
 * The stick and the D-pad are two schemes for the same thumb, and only one is
 * live at a time (settings.moveControl). With the D-pad chosen, no stick is
 * ever born and a left-half touch off the arrows looks around, as the right
 * thumb does; with the stick chosen, the D-pad is off the page entirely.
 */

import * as THREE from 'three';
import { clamp, clamp01, damp } from '../math/MathUtils.js';
import { Events } from '../core/EventBus.js';

/* ------------------------------------------------------------------ *
 * Tunables. One block, so feel can be adjusted without hunting.
 * ------------------------------------------------------------------ */
const STICK_RADIUS = 60;      // css px at scale 1 — maximum knob travel
const STICK_DEAD = 0.14;      // fraction of the radius that reads as zero
const RUN_DEFLECT = 0.80;     // push past this…
const RUN_HOLD = 0.35;        // …for this many seconds and the walk becomes a jog
const RUN_RELEASE = 0.58;     // hysteresis, so a jog never flickers
const TAP_SLOP = 12;          // css px a finger may wander and still be a tap
const TAP_TIME = 280;         // ms a tap may last
const LOOK_TOUCH = 0.0060;    // radians per css px of thumb drag
const LOOK_MOUSE = 0.0042;    // radians per css px of mouse drag
const LOOK_PAD = 2.40;        // radians per second at full pad stick
const LOOK_MAX = 0.50;        // radians one frame is allowed to turn
const PINCH_SENS = 0.055;     // camera-distance units per css px of spread
const WHEEL_SENS = 0.012;     // camera-distance units per wheel unit
const MOVE_DAMP = 20;         // smoothing of the final move vector
const PAD_DEAD = 0.18;
const TAP_MOVE_MAX = 260;     // metres — a tap further away than this is ignored
const MARCH_STEP = 2.5;       // metres between coarse ground-ray samples
import { WORLD } from '../../content/world.generated.js';

const WORLD_B = WORLD.bounds;
const DT_MAX = 0.05;          // a stalled tab must not teleport anyone

/** Keyboard layout, exported so a settings screen can show it honestly. */
export const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE', 'Space'],
  pranam: ['KeyP'],
  offer: ['KeyF'],
  map: ['KeyM'],
  menu: ['Tab'],
  pause: ['Escape'],
};

const ACTION_BY_CODE = (() => {
  const m = new Map();
  for (const action of Object.keys(KEY_BINDINGS)) {
    for (const code of KEY_BINDINGS[action]) m.set(code, action);
  }
  return m;
})();

/* Module-scope scratch. Nothing in this file allocates per frame. */
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();

const padAxis = (v) => (Math.abs(v) < PAD_DEAD ? 0 : (v - Math.sign(v) * PAD_DEAD) / (1 - PAD_DEAD));

/* ================================================================== *
 * VirtualStick — the floating left-thumb joystick.
 *
 * Owns two DOM nodes and nothing else. If the UI layer supplied
 * #stick-base / #stick-knob it drives those; if the markup is not there yet it
 * builds a plain pair so touch still works on any page.
 * ================================================================== */
class VirtualStick {
  constructor() {
    this.base = null;
    this.knob = null;
    this.owns = false;
    this.nested = false;      // knob is a child of base → knob coords are base-local
    this.active = false;
    this.radius = STICK_RADIUS;
    this.x = 0;               // -1..1, screen right
    this.y = 0;               // -1..1, screen up (forward)
    this.mag = 0;             // 0..1 after dead zone and response curve
    this.cx = 0;              // base centre, client coords
    this.cy = 0;
    // Where base and knob were last put, so _place only writes styles that
    // changed. "Never placed" has to read as far away, hence Infinity. These
    // were NaN, and `Math.abs(x - NaN) > 0.4` is false for every x — so the
    // first write never happened, nor any after it, and the stick drew in the
    // top-left corner behind the menu button however well it steered.
    this._bx = Infinity; this._by = Infinity;
    this._kx = Infinity; this._ky = Infinity;
  }

  attach(layer) {
    this.base = document.getElementById('stick-base');
    this.knob = document.getElementById('stick-knob');
    if (!this.base || !this.knob) this._build(layer);
    else this.nested = this.knob.parentElement === this.base;
    return this;
  }

  _build(host) {
    const parent = host || document.body;
    this.owns = true;
    this.nested = false;
    this.base = document.createElement('div');
    this.base.id = 'stick-base';
    this.knob = document.createElement('div');
    this.knob.id = 'stick-knob';
    const common = 'position:fixed;pointer-events:none;border-radius:50%;' +
      'transform:translate(-50%,-50%);opacity:0;transition:opacity .13s ease;z-index:6;left:-999px;top:-999px;';
    this.base.style.cssText = common +
      `width:${STICK_RADIUS * 2}px;height:${STICK_RADIUS * 2}px;` +
      'background:rgba(255,246,228,.10);border:2px solid rgba(255,246,228,.34);';
    this.knob.style.cssText = common +
      `width:${STICK_RADIUS * 0.78}px;height:${STICK_RADIUS * 0.78}px;` +
      'background:rgba(255,246,228,.82);box-shadow:0 2px 10px rgba(0,0,0,.28);';
    parent.appendChild(this.base);
    parent.appendChild(this.knob);
  }

  setScale(s) {
    this.radius = STICK_RADIUS * s;
    if (!this.owns) return;
    const d = this.radius * 2;
    this.base.style.width = `${d}px`;
    this.base.style.height = `${d}px`;
    const k = this.radius * 0.78;
    this.knob.style.width = `${k}px`;
    this.knob.style.height = `${k}px`;
  }

  /** A thumb landed: the stick is born under it. */
  begin(clientX, clientY, rect) {
    this.active = true;
    this.cx = clientX;
    this.cy = clientY;
    this.x = this.y = this.mag = 0;
    this._place(rect, 0, 0);
    this.base.classList.add('on');
    this.knob.classList.add('on');
    if (this.owns) { this.base.style.opacity = '1'; this.knob.style.opacity = '1'; }
  }

  /** The thumb moved. The base trails the finger once the rim is reached. */
  drag(clientX, clientY, rect) {
    if (!this.active) return;
    let dx = clientX - this.cx;
    let dy = clientY - this.cy;
    const r = this.radius;
    const len = Math.hypot(dx, dy);
    if (len > r) {
      // Classic follow: keep the knob pinned to the rim and slide the base.
      const over = len - r;
      this.cx += (dx / len) * over;
      this.cy += (dy / len) * over;
      dx = (dx / len) * r;
      dy = (dy / len) * r;
    }
    const raw = len > 0 ? Math.min(len / r, 1) : 0;
    let mag = raw <= STICK_DEAD ? 0 : (raw - STICK_DEAD) / (1 - STICK_DEAD);
    mag = clamp01(mag * (0.45 + 0.55 * mag));   // fine control near the centre
    if (mag > 0 && len > 0) {
      this.x = (dx / Math.max(len, 1e-4)) * mag;
      this.y = -(dy / Math.max(len, 1e-4)) * mag;
    } else {
      this.x = this.y = 0;
    }
    this.mag = mag;
    this._place(rect, dx, dy);
  }

  end() {
    if (!this.active) return;
    this.active = false;
    this.x = this.y = this.mag = 0;
    this.base.classList.remove('on');
    this.knob.classList.remove('on');
    if (this.owns) { this.base.style.opacity = '0'; this.knob.style.opacity = '0'; }
  }

  _place(rect, dx, dy) {
    const ox = this.owns ? 0 : (rect ? rect.left : 0);
    const oy = this.owns ? 0 : (rect ? rect.top : 0);
    const bx = this.cx - ox;
    const by = this.cy - oy;
    if (Math.abs(bx - this._bx) > 0.4 || Math.abs(by - this._by) > 0.4) {
      this.base.style.left = `${bx}px`;
      this.base.style.top = `${by}px`;
      this._bx = bx; this._by = by;
    }
    const kx = this.nested ? this.base.offsetWidth * 0.5 + dx : bx + dx;
    const ky = this.nested ? this.base.offsetHeight * 0.5 + dy : by + dy;
    if (Math.abs(kx - this._kx) > 0.4 || Math.abs(ky - this._ky) > 0.4) {
      this.knob.style.left = `${kx}px`;
      this.knob.style.top = `${ky}px`;
      this._kx = kx; this._ky = ky;
    }
  }

  dispose() {
    this.end();
    if (this.owns) {
      if (this.base && this.base.parentNode) this.base.parentNode.removeChild(this.base);
      if (this.knob && this.knob.parentNode) this.knob.parentNode.removeChild(this.knob);
    }
    this.base = this.knob = null;
  }
}

/* ================================================================== *
 * InputManager
 * ================================================================== */
export class InputManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.bus = ctx.bus;

    // --- the public contract -------------------------------------------------
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.running = false;
    this.lookActive = false;
    this.moveTo = null;
    this.turn = 0;
    this.strafe = 0;
    this.walk = 0;
    this.bodyRelative = false;

    // --- internals -----------------------------------------------------------
    this._enabled = true;         // explicit setEnabled()
    this._screenGate = true;      // closed while a full-screen UI is open
    this._scale = 1;
    this._lookAccum = { x: 0, y: 0 };

    this._touches = new Map();    // identifier → record
    this._lookIds = [];           // look-role identifiers, oldest first
    this._pinchPrev = 0;
    this._stick = new VirtualStick();
    this._stickOn = false;        // the stick is the chosen scheme; see _applySettings
    this._dpad = null;            // the D-pad's held directions, once it is bound
    this._runHold = 0;
    this._runLatch = false;

    this._keys = new Set();
    this._mouseLook = false;
    this._mouseDown = false;
    this._mouseMoved = false;
    this._mx = 0; this._my = 0;
    this._mStartX = 0; this._mStartY = 0;
    this._mStartT = 0;

    this._padSeen = false;
    this._padPrev = 0;
    this._padX = 0; this._padY = 0;
    this._padRun = false;
    this._padLook = false;

    this._prompts = new Map();
    this._promptOrder = [];

    this._seen = null;            // event de-duplication across two registrations
    this._rect = null;
    this._rectDirty = true;

    this.layer = document.getElementById('touch-layer');
    this.canvas = (ctx.renderer && ctx.renderer.domElement) || null;
    this._stickReady = false;
    this._layerBound = false;
    this._applySettings();
    this._bind();
    this._attach();
    this._bindDpad();

    console.info('[input] touch + keyboard + mouse ready');
  }

  /* ---------------------------------------------------------------- *
   * Wiring
   * ---------------------------------------------------------------- */
  _bind() {
    this._onTouchStart = this._touchStart.bind(this);
    this._onTouchMove = this._touchMove.bind(this);
    this._onTouchEnd = this._touchEnd.bind(this);
    this._onMouseDown = this._mouseDownHandler.bind(this);
    this._onMouseMove = this._mouseMoveHandler.bind(this);
    this._onMouseUp = this._mouseUpHandler.bind(this);
    this._onWheel = this._wheelHandler.bind(this);
    this._onKeyDown = this._keyDown.bind(this);
    this._onKeyUp = this._keyUp.bind(this);
    this._onBlur = this._releaseAll.bind(this);
    this._onResize = () => { this._rectDirty = true; };
    this._onContext = (e) => { if (!this._isUi(e.target)) e.preventDefault(); };
    this._onPad = () => { this._padSeen = true; };
    this._onPadOut = () => {
      this._padX = this._padY = 0; this._padRun = false; this._padPrev = 0;
    };
  }

  _attach() {
    const passive = { passive: true };
    const active = { passive: false };
    const capture = { passive: false, capture: true };

    // Touch is registered twice: capture on document so it works even if the
    // layer is pointer-events:none, and on the layer itself as the normal path.
    // `_seen` guarantees exactly one handling per event object.
    document.addEventListener('touchstart', this._onTouchStart, capture);
    document.addEventListener('touchmove', this._onTouchMove, capture);
    document.addEventListener('touchend', this._onTouchEnd, capture);
    document.addEventListener('touchcancel', this._onTouchEnd, capture);
    this._attachLayer();

    document.addEventListener('mousedown', this._onMouseDown, true);
    window.addEventListener('mousemove', this._onMouseMove, passive);
    window.addEventListener('mouseup', this._onMouseUp, passive);
    document.addEventListener('wheel', this._onWheel, active);
    document.addEventListener('contextmenu', this._onContext);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('resize', this._onResize, passive);
    window.addEventListener('orientationchange', this._onResize, passive);
    window.addEventListener('gamepadconnected', this._onPad);
    window.addEventListener('gamepaddisconnected', this._onPadOut);

    this._offSettings = this.bus.on(Events.SETTINGS_CHANGED, () => this._applySettings());
    this._offPrompt = this.bus.on(Events.UI_PROMPT, (p) => this._addPrompt(p));
    this._offPromptClear = this.bus.on(Events.UI_PROMPT_CLEAR, (p) => this._dropPrompt(p));
    this._offScreen = this.bus.on(Events.UI_SCREEN, (p) => this._onScreen(p));
  }

  _attachLayer() {
    if (!this.layer || this._layerBound) return;
    const active = { passive: false };
    this.layer.addEventListener('touchstart', this._onTouchStart, active);
    this.layer.addEventListener('touchmove', this._onTouchMove, active);
    this.layer.addEventListener('touchend', this._onTouchEnd, active);
    this.layer.addEventListener('touchcancel', this._onTouchEnd, active);
    this.layer.addEventListener('contextmenu', this._onContext);
    try { this.layer.style.touchAction = 'none'; } catch { /* styling is optional */ }
    this._layerBound = true;
  }

  /**
   * The UI layer may be built after this manager exists, so the stick binds to
   * its markup on the first touch rather than racing it at construction.
   */
  _ensureDom() {
    if (!this.layer) {
      const l = document.getElementById('touch-layer');
      if (l) { this.layer = l; this._rectDirty = true; this._attachLayer(); }
    }
    if (!this._stickReady) {
      this._stick.attach(this.layer);
      this._stick.setScale(this._scale);
      this._stickReady = true;
    }
  }

  /* ---------------------------------------------------------------- *
   * Settings, prompts, gating
   * ---------------------------------------------------------------- */
  get settings() {
    const s = this.ctx.state && this.ctx.state.settings;
    return s || {};
  }

  _applySettings() {
    const s = this.settings;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Denser screens carry finer thumbs; large-text users get a bigger target.
    this._scale = (dpr >= 2 ? 1.12 : 1) * (s.largeText ? 1.35 : 1);
    this._sens = clamp(typeof s.sensitivity === 'number' ? s.sensitivity : 1, 0.25, 3);
    this._invert = s.invertY ? -1 : 1;
    if (this._stickReady) this._stick.setScale(this._scale);
    this._rectDirty = true;

    // One way to walk on screen at a time — UISystem._applyMoveScheme has the
    // story. This runs on EVERY settings change, the volume slider included,
    // so both lines below are no-ops unless the scheme has just been switched
    // away from a control that is still being held.
    const stickOn = s.moveControl === 'stick';
    // A stick put away mid-walk stops walking. Its touch stays a 'move' record
    // that now does nothing, and is dropped as usual when the thumb lifts.
    if (!stickOn && this._stick.active) this._stick.end();
    // A D-pad taken off the page cannot be left holding a direction, or the
    // RUN toggle, that nobody can see any more to let go of.
    if (stickOn && this._dpad) this._clearDpad();
    this._stickOn = stickOn;
  }

  _addPrompt(p) {
    if (!p || !p.id) return;
    if (!this._prompts.has(p.id)) this._promptOrder.push(p.id);
    this._prompts.set(p.id, p);
  }

  _dropPrompt(p) {
    const id = p && p.id;
    if (!id) { this._prompts.clear(); this._promptOrder.length = 0; return; }
    this._prompts.delete(id);
    const i = this._promptOrder.indexOf(id);
    if (i >= 0) this._promptOrder.splice(i, 1);
  }

  /** The id an action should carry: whatever the newest matching prompt says. */
  _promptIdFor(keyChar, fallback) {
    for (let i = this._promptOrder.length - 1; i >= 0; i--) {
      const p = this._prompts.get(this._promptOrder[i]);
      if (!p) continue;
      const k = String(p.key || 'E').trim().charAt(0).toUpperCase();
      if (k === keyChar) return p.id;
    }
    if (keyChar === 'E' && this._promptOrder.length) {
      return this._promptOrder[this._promptOrder.length - 1];
    }
    return fallback;
  }

  _onScreen(p) {
    const name = p && p.name ? String(p.name) : 'hud';
    const open = !(name === 'hud' || name === 'world' || name === 'none' || name === '');
    if (open === !this._screenGate) return;
    this._screenGate = !open;
    if (open) this._releaseAll();
  }

  _live() { return this._enabled && this._screenGate; }

  _isUi(target) {
    if (!target || !target.closest) return false;
    return target.closest('.ui-interactive') !== null;
  }

  _isTyping(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
  }

  _bounds() {
    if (this._rect && !this._rectDirty) return this._rect;
    const el = this.layer || this.canvas;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        this._rect = r;
        this._rectDirty = false;
        return r;
      }
    }
    this._rect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    this._rectDirty = false;
    return this._rect;
  }

  /* ---------------------------------------------------------------- *
   * Touch — left thumb walks, right thumb looks, two fingers pinch
   * ---------------------------------------------------------------- */
  _touchStart(e) {
    if (this._seen === e) return;
    this._seen = e;
    if (!this._live()) return;
    this._ensureDom();
    const rect = this._bounds();
    let claimed = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this._isUi(t.target)) continue;
      const lx = t.clientX - rect.left;
      const leftHalf = lx < rect.width * 0.5;
      const rec = {
        id: t.identifier,
        role: 'look',
        x: t.clientX, y: t.clientY,
        sx: t.clientX, sy: t.clientY,
        t: e.timeStamp || performance.now(),
        moved: false,
      };
      // A second finger arriving while the stick has only just been touched is
      // almost always the start of a pinch, not a walk. Hand that touch over so
      // zooming never drags the player across the street — a pinch claims the
      // stick back rather than fighting it.
      if (this._stick.active && this._touches.size >= 1) {
        for (const [id, other] of this._touches) {
          if (other.role !== 'move') continue;
          const age = (e.timeStamp || performance.now()) - other.t;
          const drift = Math.hypot(other.x - other.sx, other.y - other.sy);
          if (age < 320 && drift < 26) {
            other.role = 'look';
            this._lookIds.push(id);
            this._stick.end();
            this.move.x = 0; this.move.y = 0;
          }
        }
      }

      // Only while the stick is the chosen scheme. With the D-pad chosen this
      // touch is a look, wherever on the left it lands — a stick born here
      // would be drawn straight over the D-pad, which is the bug this ends.
      if (leftHalf && this._stickOn && !this._stick.active && this._touches.size === 0) {
        rec.role = 'move';
        this._stick.begin(t.clientX, t.clientY, rect);
      } else {
        this._lookIds.push(rec.id);
        if (this._lookIds.length === 2) this._pinchPrev = this._pinchDistance();
      }
      this._touches.set(rec.id, rec);
      claimed = true;
    }
    if (claimed && e.cancelable) e.preventDefault();
  }

  _touchMove(e) {
    if (this._seen === e) return;
    this._seen = e;
    if (!this._live()) return;
    const rect = this._bounds();
    const slop = TAP_SLOP * this._scale;
    let claimed = false;
    let lookDX = 0;
    let lookDY = 0;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const rec = this._touches.get(t.identifier);
      if (!rec) continue;
      claimed = true;
      const dx = t.clientX - rec.x;
      const dy = t.clientY - rec.y;
      rec.x = t.clientX;
      rec.y = t.clientY;
      if (!rec.moved && Math.hypot(t.clientX - rec.sx, t.clientY - rec.sy) > slop) rec.moved = true;

      if (rec.role === 'move') {
        this._stick.drag(t.clientX, t.clientY, rect);
      } else if (this._lookIds.length < 2 && this._lookIds[0] === rec.id) {
        lookDX += dx;
        lookDY += dy;
      }
    }

    if (this._lookIds.length >= 2) {
      const d = this._pinchDistance();
      if (this._pinchPrev > 0 && d > 0) {
        const delta = (d - this._pinchPrev) * PINCH_SENS;
        if (Math.abs(delta) > 0.0005) this.bus.emit(Events.INPUT_PINCH, { delta });
      }
      this._pinchPrev = d;
    } else if (lookDX || lookDY) {
      this._lookAccum.x += lookDX * LOOK_TOUCH * this._sens;
      this._lookAccum.y += lookDY * LOOK_TOUCH * this._sens * this._invert;
    }

    if (claimed && e.cancelable) e.preventDefault();
  }

  _touchEnd(e) {
    if (this._seen === e) return;
    this._seen = e;
    const now = e.timeStamp || performance.now();
    let claimed = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const rec = this._touches.get(t.identifier);
      if (!rec) continue;
      claimed = true;
      this._touches.delete(rec.id);

      if (rec.role === 'move') {
        this._stick.end();
        this._runHold = 0;
        this._runLatch = false;
      } else {
        const k = this._lookIds.indexOf(rec.id);
        if (k >= 0) this._lookIds.splice(k, 1);
        this._pinchPrev = this._lookIds.length >= 2 ? this._pinchDistance() : 0;
        // The finger left over after a pinch must not whip the camera.
        if (this._lookIds.length === 1) {
          const other = this._touches.get(this._lookIds[0]);
          if (other) other.moved = true;
        }
      }

      const quick = !rec.moved && (now - rec.t) < TAP_TIME;
      if (quick && e.type !== 'touchcancel' && this._live()) this._tap(rec.sx, rec.sy);
    }
    if (claimed && e.cancelable && e.type !== 'touchcancel') e.preventDefault();
  }

  _pinchDistance() {
    const a = this._touches.get(this._lookIds[0]);
    const b = this._touches.get(this._lookIds[1]);
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* ---------------------------------------------------------------- *
   * Mouse
   * ---------------------------------------------------------------- */
  _mouseDownHandler(e) {
    if (this._seen === e) return;
    this._seen = e;
    if (!this._live() || e.button !== 0) return;
    if (this._isUi(e.target) || this._isTyping(e.target)) return;
    this._ensureDom();
    this._mouseDown = true;
    this._mouseMoved = false;
    this._mx = e.clientX; this._my = e.clientY;
    this._mStartX = e.clientX; this._mStartY = e.clientY;
    this._mStartT = e.timeStamp || performance.now();
  }

  _mouseMoveHandler(e) {
    if (!this._mouseDown || !this._live()) return;
    const dx = e.clientX - this._mx;
    const dy = e.clientY - this._my;
    this._mx = e.clientX; this._my = e.clientY;
    if (!this._mouseMoved &&
        Math.hypot(e.clientX - this._mStartX, e.clientY - this._mStartY) > TAP_SLOP * 0.5) {
      this._mouseMoved = true;
      this._mouseLook = true;
    }
    if (!this._mouseLook) return;
    this._lookAccum.x += dx * LOOK_MOUSE * this._sens;
    this._lookAccum.y += dy * LOOK_MOUSE * this._sens * this._invert;
  }

  _mouseUpHandler(e) {
    if (!this._mouseDown) return;
    this._mouseDown = false;
    this._mouseLook = false;
    const now = e.timeStamp || performance.now();
    if (!this._mouseMoved && this._live() && (now - this._mStartT) < 600) {
      this._tap(this._mStartX, this._mStartY);
    }
  }

  _wheelHandler(e) {
    if (!this._live() || this._isUi(e.target)) return;
    if (e.cancelable) e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 320 : 1;
    const delta = clamp(-e.deltaY * unit * WHEEL_SENS, -6, 6);
    if (delta) this.bus.emit(Events.INPUT_PINCH, { delta });
  }

  /* ---------------------------------------------------------------- *
   * Keyboard
   * ---------------------------------------------------------------- */
  _keyDown(e) {
    if (this._isTyping(e.target)) return;
    const action = ACTION_BY_CODE.get(e.code);
    if (!action) return;
    if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    this._keys.add(e.code);

    switch (action) {
      case 'interact':
        if (this._live()) this._fire('E', 'primary');
        break;
      case 'pranam':
        if (this._live()) this._fire('P', 'pranam');
        break;
      case 'offer':
        if (this._live()) this._fire('F', 'offer');
        break;
      case 'map':
        this.bus.emit(Events.UI_SCREEN, { name: 'map' });
        break;
      case 'menu':
        this.bus.emit(Events.UI_SCREEN, { name: 'menu' });
        break;
      case 'pause':
        this.bus.emit(Events.UI_SCREEN, { name: 'pause' });
        break;
      default:
        break;
    }
  }

  _keyUp(e) { this._keys.delete(e.code); }

  _held(action) {
    const codes = KEY_BINDINGS[action];
    for (let i = 0; i < codes.length; i++) if (this._keys.has(codes[i])) return true;
    return false;
  }

  _fire(keyChar, fallback) {
    const id = this._promptIdFor(keyChar, fallback);
    this.bus.emit(Events.INPUT_INTERACT, { id });
    this.bus.emit(Events.HAPTIC, { pattern: 'tick' });
  }

  /* ---------------------------------------------------------------- *
   * Taps — and the accessibility path that walks without a joystick
   * ---------------------------------------------------------------- */
  _tap(clientX, clientY) {
    this.bus.emit(Events.INPUT_TAP, { x: clientX, y: clientY });
    if (!this.settings.tapToMove) return;
    if (!this._groundUnder(clientX, clientY)) return;
    // A fresh object per tap: the Player may hold this reference until it
    // arrives, and a later tap must not rewrite a destination underneath it.
    this.moveTo = { x: _p.x, z: _p.z };
    this.bus.emit(Events.INPUT_MOVETO, { x: _p.x, z: _p.z });
    this.bus.emit(Events.HAPTIC, { pattern: 'soft' });
  }

  /**
   * March the camera ray until it drops below the terrain, then bisect.
   * Leaves the hit in the module scratch `_p`. Runs on tap only, never per frame.
   */
  _groundUnder(clientX, clientY) {
    const cam = this.ctx.camera;
    if (!cam) return false;
    const el = this.canvas || this.layer;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : this._bounds();
    if (!r.width || !r.height) return false;

    const nx = ((clientX - r.left) / r.width) * 2 - 1;
    const ny = -((clientY - r.top) / r.height) * 2 + 1;
    _v.set(nx, ny, 0.5).unproject(cam);
    _dir.copy(_v).sub(cam.position).normalize();
    if (_dir.y > -0.02) return false;            // aimed at or above the horizon

    const world = this.ctx.world;
    const ground = (x, z) => (world && world.groundHeight ? world.groundHeight(x, z) : 0);
    const maxT = TAP_MOVE_MAX * 1.8;
    let lo = 0;
    let hit = -1;
    for (let t = MARCH_STEP; t <= maxT; t += MARCH_STEP) {
      _p.copy(cam.position).addScaledVector(_dir, t);
      if (_p.y - ground(_p.x, _p.z) <= 0) { hit = t; break; }
      lo = t;
    }
    if (hit < 0) return false;
    let hi = hit;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) * 0.5;
      _p.copy(cam.position).addScaledVector(_dir, mid);
      if (_p.y - ground(_p.x, _p.z) > 0) lo = mid; else hi = mid;
    }
    _p.copy(cam.position).addScaledVector(_dir, hi);

    const px = this.ctx.player && this.ctx.player.position ? this.ctx.player.position : cam.position;
    if (Math.hypot(_p.x - px.x, _p.z - px.z) > TAP_MOVE_MAX) return false;
    _p.x = clamp(_p.x, WORLD_B.minX, WORLD_B.maxX);
    _p.z = clamp(_p.z, WORLD_B.minZ, WORLD_B.maxZ);
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Gamepad — polled only once a pad has announced itself
   * ---------------------------------------------------------------- */
  _pollPad(dt) {
    this._padLook = false;
    if (!this._padSeen || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
    }
    if (!pad) { this._padX = this._padY = 0; this._padRun = false; return; }

    const ax = pad.axes;
    this._padX = padAxis(ax.length > 0 ? ax[0] : 0);
    this._padY = -padAxis(ax.length > 1 ? ax[1] : 0);
    const rx = padAxis(ax.length > 2 ? ax[2] : 0);
    const ry = padAxis(ax.length > 3 ? ax[3] : 0);
    if (rx || ry) {
      this._lookAccum.x += rx * LOOK_PAD * this._sens * dt;
      this._lookAccum.y += ry * LOOK_PAD * this._sens * this._invert * dt;
      this._padLook = true;
    }

    const btns = pad.buttons;
    let mask = 0;
    for (let i = 0; i < btns.length && i < 16; i++) if (btns[i] && btns[i].pressed) mask |= (1 << i);
    const pressed = mask & ~this._padPrev;
    this._padPrev = mask;
    this._padRun = (mask & (1 << 10)) !== 0 || (mask & (1 << 6)) !== 0;
    if (!this._live()) return;
    if (pressed & (1 << 0)) this._fire('E', 'primary');
    if (pressed & (1 << 2)) this._fire('F', 'offer');
    if (pressed & (1 << 3)) this._fire('P', 'pranam');
    if (pressed & (1 << 8)) this.bus.emit(Events.UI_SCREEN, { name: 'map' });
    if (pressed & (1 << 9)) this.bus.emit(Events.UI_SCREEN, { name: 'menu' });
  }

  /* ---------------------------------------------------------------- *
   * Per-frame composition
   * ---------------------------------------------------------------- */
  /**
   * The D-pad. Up and down walk, left and right step sideways, centre toggles
   * running. Someone who has never held a game controller can navigate with
   * this, which is why it is the default scheme; the floating stick is the
   * other one, for anyone who prefers it, and Settings shows one or the other
   * — never both, because they want the same patch of screen.
   */
  _bindDpad() {
    const pad = document.getElementById("dpad");
    if (!pad) return;
    this._dpad = { up: false, down: false, left: false, right: false, run: false };

    const set = (dir, on, btn) => {
      if (dir === "run") { if (on) this._dpad.run = !this._dpad.run; }
      else this._dpad[dir] = on;
      if (btn) btn.classList.toggle("held", dir === "run" ? this._dpad.run : on);
    };

    pad.querySelectorAll(".dp").forEach((btn) => {
      const dir = btn.dataset.dir;
      const down = (e) => { e.preventDefault(); e.stopPropagation(); set(dir, true, btn); };
      const up = (e) => { if (e) e.stopPropagation(); if (dir !== "run") set(dir, false, btn); };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
    });
  }

  /** Let go of every D-pad direction and the RUN toggle, and say so on the buttons. */
  _clearDpad() {
    const d = this._dpad;
    d.up = d.down = d.left = d.right = d.run = false;
    const pad = document.getElementById("dpad");
    if (pad) pad.querySelectorAll(".dp.held").forEach((b) => b.classList.remove("held"));
  }


  update(dt) {
    if (!this.canvas && this.ctx.renderer) this.canvas = this.ctx.renderer.domElement;
    const step = clamp(dt || 0, 0, DT_MAX);

    if (!this._live()) {
      this.move.x = 0; this.move.y = 0;
      this.look.x = 0; this.look.y = 0;
      this.running = false;
      this.lookActive = false;
      this.turn = 0; this.strafe = 0; this.walk = 0; this.bodyRelative = false;
      this._lookAccum.x = 0; this._lookAccum.y = 0;
      return;
    }

    this._pollPad(step);

    const dpad = this._dpad;

    // The D-pad is DIRECTION, not a camera-relative stick. Left and right turn
    // the body, up and down walk along whatever way the body is facing. That is
    // what makes dragging the camera harmless: the view can point anywhere and
    // "forward" still means forward for the person.
    // All four directions MOVE the body. Left and right step sideways rather
    // than spinning the view, so pressing left goes left — which is what the
    // arrow says it will do. Turning is done by dragging the camera.
    this.strafe = dpad ? ((dpad.right ? 1 : 0) - (dpad.left ? 1 : 0)) : 0;
    this.walk = dpad ? ((dpad.up ? 1 : 0) - (dpad.down ? 1 : 0)) : 0;
    this.turn = 0;
    this.bodyRelative = !!(this.strafe || this.walk);

    // Look: whatever arrived since the last frame, clamped, then drained.
    this.look.x = clamp(this._lookAccum.x, -LOOK_MAX, LOOK_MAX);
    this.look.y = clamp(this._lookAccum.y, -LOOK_MAX, LOOK_MAX);
    this._lookAccum.x = 0;
    this._lookAccum.y = 0;
    this.lookActive = this._lookIds.length > 0 || this._mouseLook || this._padLook;

    // Move: stick + keys + pad, summed then clamped to the unit disc.
    let kx = 0;
    let ky = 0;
    if (this._held('right')) kx += 1;
    if (this._held('left')) kx -= 1;
    if (this._held('forward')) ky += 1;
    if (this._held('back')) ky -= 1;

    if (kx && ky) { const inv = Math.SQRT1_2; kx *= inv; ky *= inv; }

    let tx = this._stick.x + kx + this._padX;
    let ty = this._stick.y + ky + this._padY;
    const m = Math.hypot(tx, ty);
    if (m > 1) { tx /= m; ty /= m; }

    this.move.x = damp(this.move.x, tx, MOVE_DAMP, step);
    this.move.y = damp(this.move.y, ty, MOVE_DAMP, step);
    if (Math.abs(this.move.x) < 0.002) this.move.x = 0;
    if (Math.abs(this.move.y) < 0.002) this.move.y = 0;

    // Run: a sustained hard push, or a held Shift, or a pad trigger.
    const mag = Math.hypot(tx, ty);
    if (this._stick.active && mag >= RUN_DEFLECT) {
      this._runHold += step;
      if (this._runHold >= RUN_HOLD && !this._runLatch) {
        this._runLatch = true;
        this.bus.emit(Events.HAPTIC, { pattern: 'tick' });
      }
    } else if (mag < RUN_RELEASE) {
      this._runHold = 0;
      this._runLatch = false;
    }
    const padMag = Math.hypot(this._padX, this._padY);
    this.running = (this._runLatch && mag >= RUN_RELEASE) ||
      (this._held('run') && (kx !== 0 || ky !== 0)) ||
      (this._padRun && padMag > 0.1) ||
      (dpad && dpad.run && (dpad.up || dpad.down || dpad.left || dpad.right));
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */
  setEnabled(v) {
    const next = !!v;
    if (next === this._enabled) return;
    this._enabled = next;
    if (!next) this._releaseAll();
  }

  /** Drop every held pointer and key — used on blur, pause and disable. */
  _releaseAll() {
    this._touches.clear();
    this._lookIds.length = 0;
    this._pinchPrev = 0;
    this._stick.end();
    this._keys.clear();
    this._mouseDown = false;
    this._mouseLook = false;
    this._mouseMoved = false;
    this._runHold = 0;
    this._runLatch = false;
    this._padPrev = 0;
    this._padX = this._padY = 0;
    this._padRun = false;
    this._lookAccum.x = 0;
    this._lookAccum.y = 0;
    this.move.x = 0; this.move.y = 0;
    this.look.x = 0; this.look.y = 0;
    this.running = false;
    this.lookActive = false;
    this.moveTo = null;
  }

  dispose() {
    const capture = true;
    document.removeEventListener('touchstart', this._onTouchStart, capture);
    document.removeEventListener('touchmove', this._onTouchMove, capture);
    document.removeEventListener('touchend', this._onTouchEnd, capture);
    document.removeEventListener('touchcancel', this._onTouchEnd, capture);
    if (this.layer && this._layerBound) {
      this.layer.removeEventListener('touchstart', this._onTouchStart);
      this.layer.removeEventListener('touchmove', this._onTouchMove);
      this.layer.removeEventListener('touchend', this._onTouchEnd);
      this.layer.removeEventListener('touchcancel', this._onTouchEnd);
      this.layer.removeEventListener('contextmenu', this._onContext);
      this._layerBound = false;
    }
    document.removeEventListener('mousedown', this._onMouseDown, capture);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('contextmenu', this._onContext);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    window.removeEventListener('gamepadconnected', this._onPad);
    window.removeEventListener('gamepaddisconnected', this._onPadOut);

    if (this._offSettings) this._offSettings();
    if (this._offPrompt) this._offPrompt();
    if (this._offPromptClear) this._offPromptClear();
    if (this._offScreen) this._offScreen();

    this._releaseAll();
    this._prompts.clear();
    this._promptOrder.length = 0;
    if (this._stickReady) this._stick.dispose();
    this._stickReady = false;
  }
}
