/**
 * PluckInteraction — picking a flower as a physical act, not a button.
 *
 * The brief asked that a devotional action require more involvement than a tap.
 * So picking runs as a gesture with four felt stages:
 *
 *   REACH   drag toward the flower; two-bone IK carries the hand there, and the
 *           hand tracks your finger rather than playing a canned animation
 *   GRIP    the hand closes when it arrives — a light haptic tick confirms it
 *   PULL    keep pulling. The stem resists, bends toward you, and tension only
 *           builds while you are actually moving. Stop and it eases back off.
 *   SNAP    past the stem's limit it gives way: a sharp double haptic, the stem
 *           springs back, and the flower is in your hand.
 *
 * It is deliberately possible to fail by letting go too early. That is the
 * point — the small effort is what makes the offering afterwards mean anything.
 */

import * as THREE from 'three';
import { clamp, clamp01, damp, lerp, smoothstep } from '../../engine/math/MathUtils.js';

const REACH_DISTANCE = 1.9;      // how far the player may stand and still reach
const GRIP_RADIUS = 0.13;        // hand-to-flower distance that counts as grip
const TENSION_PER_METRE = 2.4;   // how fast dragging builds tension
const TENSION_DECAY = 0.85;      // per second, while not pulling
const SNAP_AT = 1.0;

const _v = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _rest = new THREE.Vector3();
const _screen = new THREE.Vector3();

export class PluckInteraction {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = 'idle';
    this.flower = null;
    this.tension = 0;
    this._reach = 0;
    this._dragTotal = 0;
    this._pointerId = null;
    this._last = { x: 0, y: 0 };
    this._pullSpeed = 0;
    this._nextTick = 0;
    this._resolve = null;
    this._reject = null;

    this._buildOverlay();
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
  }

  get active() { return this.state !== 'idle'; }

  /* ================================================================
   * Overlay — a tension ring pinned to the flower on screen
   * ================================================================ */
  _buildOverlay() {
    const el = document.createElement('div');
    el.id = 'pluck-overlay';
    el.style.cssText = [
      'position:fixed', 'left:0', 'top:0', 'width:92px', 'height:92px',
      'margin:-46px 0 0 -46px', 'pointer-events:none', 'z-index:60',
      'opacity:0', 'transition:opacity .22s ease',
    ].join(';');
    el.innerHTML = `
      <svg viewBox="0 0 92 92" width="92" height="92">
        <circle cx="46" cy="46" r="34" fill="none" stroke="rgba(242,230,208,.28)" stroke-width="3"/>
        <circle id="pluck-arc" cx="46" cy="46" r="34" fill="none" stroke="#e8961f" stroke-width="4"
                stroke-linecap="round" stroke-dasharray="213.6" stroke-dashoffset="213.6"
                transform="rotate(-90 46 46)"/>
        <circle id="pluck-dot" cx="46" cy="46" r="5" fill="rgba(242,230,208,.9)"/>
      </svg>
      <div id="pluck-hint" style="position:absolute;top:96px;left:50%;transform:translateX(-50%);
           white-space:nowrap;font:500 12px/1.3 Jost,system-ui,sans-serif;letter-spacing:.14em;
           text-transform:uppercase;color:#f2e6d0;text-shadow:0 2px 8px rgba(0,0,0,.7)"></div>`;
    document.body.appendChild(el);
    this.overlay = el;
    this.arc = el.querySelector('#pluck-arc');
    this.dot = el.querySelector('#pluck-dot');
    this.hint = el.querySelector('#pluck-hint');
  }

  /* ================================================================
   * Lifecycle
   * ================================================================ */

  /** Start the gesture on a flower. Resolves with the flower once snapped. */
  begin(flower) {
    if (this.active) return Promise.reject(new Error('busy'));
    this.flower = flower;
    this.state = 'reach';
    this.tension = 0;
    this._reach = 0;
    this._dragTotal = 0;
    this._pullSpeed = 0;

    const ctx = this.ctx;
    if (ctx.input) ctx.input.setEnabled(false);

    // remember where the stem started so it can spring back
    this._stemRest = flower.mesh.rotation.clone();

    const layer = document.getElementById('touch-layer') || document;
    layer.addEventListener('pointerdown', this._onDown, { passive: false });
    window.addEventListener('pointermove', this._onMove, { passive: false });
    window.addEventListener('pointerup', this._onUp, { passive: true });
    window.addEventListener('pointercancel', this._onUp, { passive: true });
    this._layer = layer;

    this.overlay.style.opacity = '1';
    this._setHint('Drag to reach');

    return new Promise((resolve, reject) => { this._resolve = resolve; this._reject = reject; });
  }

  cancel(reason = 'cancelled') {
    if (!this.active) return;
    const reject = this._reject;
    this._teardown();
    if (reject) reject(new Error(reason));
  }

  _teardown() {
    const ctx = this.ctx;
    if (this._layer) {
      this._layer.removeEventListener('pointerdown', this._onDown);
      this._layer = null;
    }
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);

    if (ctx.player) ctx.player.clearHandTarget();
    if (ctx.input) ctx.input.setEnabled(true);

    // let the stem spring back if we never snapped it
    if (this.flower && this.flower.mesh && !this.flower.picked && this._stemRest) {
      this.flower.mesh.rotation.copy(this._stemRest);
    }

    this.overlay.style.opacity = '0';
    this.state = 'idle';
    this.flower = null;
    this.tension = 0;
    this._pointerId = null;
    this._resolve = null;
    this._reject = null;
  }

  /* ================================================================
   * Pointer
   * ================================================================ */
  _onDown(e) {
    if (!this.active || this._pointerId !== null) return;
    if (e.target && e.target.closest && e.target.closest('.ui-interactive')) return;
    e.preventDefault();
    this._pointerId = e.pointerId;
    this._last.x = e.clientX;
    this._last.y = e.clientY;
    this._setHint('Pull');
  }

  _onMove(e) {
    if (!this.active || e.pointerId !== this._pointerId) return;
    e.preventDefault();

    const dx = e.clientX - this._last.x;
    const dy = e.clientY - this._last.y;
    this._last.x = e.clientX;
    this._last.y = e.clientY;

    // normalise to screen-independent units so a big phone is not easier
    const unit = Math.min(window.innerWidth, window.innerHeight);
    const drag = Math.hypot(dx, dy) / unit;
    this._dragTotal += drag;

    if (this.state === 'reach') {
      // reaching is about committing distance, in any direction
      this._reach = clamp01(this._reach + drag * 2.6);
    } else if (this.state === 'pull') {
      // only sustained movement builds tension, and pulling away from the
      // plant (down or back on screen) counts for more than sideways fidgeting
      const awayBias = 0.55 + 0.45 * clamp01(dy / Math.max(1, Math.abs(dx) + Math.abs(dy)));
      this._pullSpeed = drag / Math.max(1 / 120, this._dtLast || 1 / 60);
      this.tension = clamp(this.tension + drag * TENSION_PER_METRE * awayBias, 0, 1.6);
    }
  }

  _onUp(e) {
    if (e.pointerId !== this._pointerId) return;
    this._pointerId = null;
    this._pullSpeed = 0;
    if (this.state === 'pull') this._setHint('Keep pulling');
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    if (!this.active) return;
    this._dtLast = dt;

    const player = ctx.player;
    const flower = this.flower;
    if (!player || !flower || flower.picked) { this.cancel('gone'); return; }

    // walking out of range abandons the attempt
    const away = player.position.distanceTo(flower.pos);
    if (away > REACH_DISTANCE + 1.2) { this.cancel('out of reach'); return; }

    // hand rest position: relaxed, at the player's side
    _rest.copy(player.position);
    _rest.y += 1.05;
    _rest.x += Math.cos(player.yaw) * 0.26;
    _rest.z -= Math.sin(player.yaw) * 0.26;

    // the hand travels from rest to the flower as the reach commits
    _v.lerpVectors(_rest, flower.pos, smoothstep(this._reach));
    _v.y += (1 - this._reach) * 0.1;
    player.setHandTarget(_v, Math.min(1, this._reach * 1.4 + 0.15), 'R');

    // lean the body into the reach a little
    if (player.bones && player.bones.spine) {
      player.bones.spine.rotation.x = damp(player.bones.spine.rotation.x, this._reach * 0.3, 8, dt);
    }

    switch (this.state) {
      case 'reach': this._updateReach(dt, ctx, player, flower); break;
      case 'pull': this._updatePull(dt, ctx, player, flower); break;
      default: break;
    }

    this._updateOverlay(ctx, flower);
  }

  _updateReach(dt, ctx, player, flower) {
    // the reach eases back if the player stops dragging, so it must be committed
    if (this._pointerId === null) this._reach = Math.max(0, this._reach - dt * 0.5);

    player.handPosition('R', _hand);
    if (_hand.distanceTo(flower.pos) < GRIP_RADIUS || this._reach > 0.97) {
      this.state = 'pull';
      this.tension = 0;
      ctx.bus.emit('haptic', { pattern: 'tick' });
      ctx.bus.emit('sfx', { name: 'flower', position: flower.pos });
      this._setHint('Pull to pick');
    }
  }

  _updatePull(dt, ctx, player, flower) {
    // tension bleeds away unless you keep working at it
    if (this._pointerId === null || this._pullSpeed < 0.05) {
      this.tension = Math.max(0, this.tension - TENSION_DECAY * dt);
    }

    // the stem bends toward the hand, and stretches slightly under load
    const t = clamp01(this.tension / SNAP_AT);
    const bend = t * 0.85;
    flower.mesh.rotation.x = this._stemRest.x + bend * 0.7;
    flower.mesh.rotation.z = this._stemRest.z + Math.sin(performance.now() * 0.02) * 0.04 * t;
    flower.mesh.scale.setScalar(1.35 * (1 + t * 0.06));

    // escalating haptic ticks as the stem approaches its limit
    this._nextTick -= dt;
    if (t > 0.25 && this._nextTick <= 0) {
      ctx.bus.emit('haptic', { pattern: 'tick' });
      this._nextTick = lerp(0.34, 0.07, t);
    }

    if (this.tension >= SNAP_AT) this._snap(ctx, player, flower);
  }

  _snap(ctx, player, flower) {
    this.state = 'snapped';
    flower.picked = true;

    // the stem springs back now that the load is gone
    flower.mesh.scale.setScalar(1.35);
    if (flower.mesh.parent) flower.mesh.parent.remove(flower.mesh);

    player.giveFlower(flower.kind);

    ctx.bus.emit('haptic', { pattern: 'double' });
    ctx.bus.emit('sfx', { name: 'flower', position: flower.pos });

    const kinds = ctx.data.FLOWER_KINDS[flower.kind];
    ctx.state.flowers[flower.kind] = (ctx.state.flowers[flower.kind] || 0) + 1;
    ctx.state.carrying = { kind: flower.kind };
    if (ctx.state.pickedFlowers) ctx.state.pickedFlowers.add(flower.id);
    ctx.save.write();

    ctx.bus.emit('flower:picked', {
      kind: flower.kind,
      total: ctx.state.flowers[flower.kind],
    });
    ctx.bus.emit('ui:toast', { title: kinds ? kinds.line : 'Picked.', sub: kinds ? kinds.hindi : '' });

    const resolve = this._resolve;
    this._teardown();
    if (resolve) resolve(flower);
  }

  /* ================================================================
   * Overlay drawing
   * ================================================================ */
  _updateOverlay(ctx, flower) {
    _screen.copy(flower.pos);
    _screen.y += 0.35;
    _screen.project(ctx.camera);

    const x = (_screen.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_screen.y * 0.5 + 0.5) * window.innerHeight;
    const visible = _screen.z < 1;

    this.overlay.style.transform = `translate(${x}px, ${y}px)`;
    this.overlay.style.opacity = visible ? '1' : '0';

    const progress = this.state === 'pull'
      ? clamp01(this.tension / SNAP_AT)
      : this._reach;
    const CIRC = 213.6;
    this.arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - progress)));
    this.arc.setAttribute('stroke', this.state === 'pull' ? '#e8961f' : 'rgba(242,230,208,.75)');
    this.dot.setAttribute('r', String(5 + progress * 4));
  }

  _setHint(text) { if (this.hint) this.hint.textContent = text; }

  dispose() {
    this.cancel();
    if (this.overlay && this.overlay.parentElement) this.overlay.parentElement.removeChild(this.overlay);
  }
}
