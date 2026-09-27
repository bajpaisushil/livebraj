/**
 * InteractionSystem — proximity, discovery, and the devotional acts.
 *
 * Discovery is the only progression in this game and it is never scored. There
 * are no points for offering a flower; the response is a bell, a change in the
 * light, and a line of context. That restraint is the product, so it is
 * enforced here rather than left to the UI.
 *
 * Every sequence runs under a cancellation token and always restores input and
 * camera, including when the player simply walks away mid-bow.
 */

import * as THREE from 'three';
import { CancelToken, CancelledError, wait, tween } from '../../engine/core/Lifecycle.js';
import { PluckInteraction } from '../devotion/PluckInteraction.js';
import { damp, smoothstep } from '../../engine/math/MathUtils.js';

const POLL_HZ = 6;
const PLUCK_RANGE = 1.9;

const _v = new THREE.Vector3();

export class InteractionSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.pluck = new PluckInteraction(ctx);

    this.nearby = [];            // [{ loc, d }]
    this.current = null;         // closest interactable location
    this.nearFlower = null;
    this._prompts = new Set();
    this._acc = 0;
    this._busy = false;
    this._token = null;

    this._off = [
      ctx.bus.on('input:interact', ({ id } = {}) => this.trigger(id)),
      ctx.bus.on('ui:screen', ({ name }) => { if (name !== 'world') this.abort(); }),
    ];
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    if (this.pluck.active) { this.pluck.update(dt, ctx); return; }
    if (this._busy) return;

    this._acc += dt;
    if (this._acc < 1 / POLL_HZ) return;
    this._acc = 0;

    const p = ctx.player && ctx.player.position;
    if (!p) return;

    this.nearby = ctx.world.locationsNear(p.x, p.z, 10);
    this._discover(ctx);

    this.current = this.nearby.length ? this.nearby[0].loc : null;
    this.nearFlower = ctx.world.nearestFlower(p.x, p.z, PLUCK_RANGE);
    this.nearPerson = this._nearestPerson(ctx, p);

    this._refreshPrompts(ctx);
  }

  _discover(ctx) {
    for (const { loc } of this.nearby) {
      if (ctx.state.discovered.has(loc.id)) continue;
      ctx.state.discovered.add(loc.id);
      ctx.save.write();
      ctx.bus.emit('location:discovered', { loc });
      ctx.bus.emit('ui:toast', { title: loc.name, sub: loc.hindi });
      ctx.bus.emit('haptic', { pattern: 'soft' });
      ctx.bus.emit('sfx', { name: 'chime' });
    }
  }

  /** Prompts appear only when relevant and clear the moment they are not. */
  _refreshPrompts(ctx) {
    const want = new Map();

    if (this.nearPerson) {
      want.set('greet', { id: 'greet', label: 'Pranam', hint: 'folded hands', key: 'G' });
    }

    if (this.nearFlower) {
      want.set('pluck', { id: 'pluck', label: 'Pick flower', hint: 'hold & pull', key: 'E' });
    }

    const loc = this.current;
    if (loc) {
      const acts = loc.interactions || [];
      const carrying = ctx.player && ctx.player.carried;
      if (acts.includes('darshan')) want.set('darshan', { id: 'darshan', label: 'Darshan', key: 'E' });
      if (acts.includes('offer') && carrying) {
        want.set('offer', { id: 'offer', label: 'Offer flower', key: 'F' });
      }
      if (acts.includes('pranam')) {
        want.set('pranam', { id: 'pranam', label: 'Pranam', key: 'P' });
        /*
         * And the full prostration, which is the one most pilgrims came to
         * make. Offered wherever a pranam is, because the places that take a
         * pranam — the Deities, a threshold, a samadhi — are the places you
         * would go down full length.
         */
        want.set('dandvat', { id: 'dandvat', label: 'Dandvat pranam', key: 'O' });
      }
      if (acts.includes('story')) want.set('story', { id: 'story', label: loc.name, hint: 'read', key: 'R' });
    }

    for (const id of this._prompts) {
      if (!want.has(id)) { ctx.bus.emit('ui:prompt:clear', { id }); this._prompts.delete(id); }
    }
    for (const [id, data] of want) {
      if (!this._prompts.has(id)) { ctx.bus.emit('ui:prompt', data); this._prompts.add(id); }
    }
  }

  _clearAllPrompts() {
    for (const id of this._prompts) this.ctx.bus.emit('ui:prompt:clear', { id });
    this._prompts.clear();
  }

  /* ================================================================
   * Dispatch
   * ================================================================ */
  trigger(id) {
    if (this._busy || this.pluck.active) return;
    // no id means "the most obvious thing here"
    if (!id) {
      id = this.nearFlower ? 'pluck'
        : this.current && this.current.interactions.includes('darshan') ? 'darshan'
        : this.current && this.current.interactions.includes('pranam') ? 'pranam'
        : this.current ? 'story' : null;
    }
    switch (id) {
      case 'pluck': return this._doPluck();
      case 'offer': return this._run(() => this._doOffer());
      case 'pranam': return this._run(() => this._doPranam(false));
      case 'dandvat': return this._run(() => this._doPranam(true));
      case 'darshan': return this._run(() => this._doDarshan());
      case 'greet': return this._run(() => this._doGreet());
      case 'story': return this._doStory();
      default: return undefined;
    }
  }

  /**
   * The nearest person on the road, for an exchange of pranam. Vrindavan is a
   * town where strangers greet each other; being able to do that is worth more
   * than any amount of dialogue.
   */
  _nearestPerson(ctx, p) {
    if (!ctx.crowd || !ctx.crowd.peopleInst) return null;
    let best = null, bestD = 3.4;
    for (const slot of ctx.crowd.peopleInst) {
      for (const a of slot.agents) {
        const d = Math.hypot(a.x - p.x, a.z - p.z);
        if (d < bestD) { bestD = d; best = a; }
      }
    }
    return best;
  }

  async _doGreet() {
    const ctx = this.ctx;
    const who = this.nearPerson;
    if (!who) return;
    const token = this._token;

    _v.set(who.x, ctx.player.position.y, who.z);
    await ctx.player.faceTowards(_v, 0.35);
    token.throwIfCancelled();

    // they stop and turn to you, and fold their hands back
    who.idle = 3.2;
    who.greetYaw = Math.atan2(ctx.player.position.x - who.x, ctx.player.position.z - who.z);
    who.greeting = 1.6;

    await ctx.player.playAction('namaste');
    token.throwIfCancelled();

    ctx.state.greetings = (ctx.state.greetings || 0) + 1;
    ctx.save.write();
    ctx.bus.emit('haptic', { pattern: 'soft' });
    ctx.bus.emit('ui:toast', { title: 'Radhe Radhe', sub: 'राधे राधे' });
  }

  abort() {
    if (this.pluck.active) this.pluck.cancel();
    if (this._token) { this._token.cancel(); this._token = null; }
    this._restore();
  }

  async _run(fn) {
    this._busy = true;
    this._clearAllPrompts();
    this._token = new CancelToken();
    try { await fn(); }
    catch (err) { if (!(err instanceof CancelledError)) console.error('[interaction]', err); }
    finally { this._restore(); }
  }

  _restore() {
    const ctx = this.ctx;
    this._busy = false;
    this._token = null;
    if (ctx.cameraRig && ctx.cameraRig.release) ctx.cameraRig.release();
    if (ctx.input) ctx.input.setEnabled(true);
    if (ctx.player) ctx.player.clearHandTarget();
  }

  /* ================================================================
   * Pluck — delegated to the gesture controller
   * ================================================================ */
  async _doPluck() {
    const flower = this.nearFlower;
    if (!flower || flower.picked) return;
    const ctx = this.ctx;

    this._clearAllPrompts();
    try {
      await ctx.player.faceTowards(flower.pos, 0.35);
      await this.pluck.begin(flower);
    } catch {
      // letting go early is a legitimate outcome, not an error
    }
  }

  /* ================================================================
   * Offering
   * ================================================================ */
  async _doOffer() {
    const ctx = this.ctx;
    const loc = this.current;
    const carried = ctx.player.carried;
    if (!loc || !carried) return;

    const anchor = ctx.world.anchorFor(loc.id);
    if (!anchor) return;
    const token = this._token;

    if (ctx.input) ctx.input.setEnabled(false);
    if (ctx.cameraRig && ctx.cameraRig.focusOn) ctx.cameraRig.focusOn(anchor.altar, { fov: 48 });

    // walk the last couple of metres rather than snapping into place
    await this._approach(anchor.darshan, token);
    token.throwIfCancelled();
    await ctx.player.faceTowards(anchor.altar, 0.45);
    token.throwIfCancelled();

    // the flower leaves the hand at the top of the gesture
    const offAt = ctx.bus.on('action:release', () => {
      const taken = ctx.player.takeFlower();
      if (!taken) return;
      this._settleOnAltar(taken.mesh, anchor.altar, loc);
    });

    try { await ctx.player.playAction('offer'); }
    finally { offAt(); }
    token.throwIfCancelled();

    ctx.bus.emit('sfx', { name: 'bell', position: anchor.altar });
    ctx.bus.emit('haptic', { pattern: 'soft' });

    ctx.state.offered.push({ locId: loc.id, kind: carried.kind });
    ctx.state.carrying = null;
    ctx.save.write();
    ctx.bus.emit('flower:offered', { loc, kind: carried.kind });

    // a line of context, never a reward
    const deity = loc.deity ? `${loc.deity}.` : loc.name;
    ctx.bus.emit('ui:toast', { title: deity, sub: loc.story ? loc.story.short : '' });

    await wait(1600, token);
  }

  /** Animate the offered flower onto the altar, where it stays for good. */
  _settleOnAltar(mesh, altar, loc) {
    const ctx = this.ctx;
    ctx.scene.add(mesh);
    const from = mesh.position.clone();
    // scatter slightly so repeat offerings build a visible pile
    const n = ctx.state.offered.filter((o) => o.locId === loc.id).length;
    const a = n * 2.399;
    const to = altar.clone();
    to.x += Math.cos(a) * (0.12 + n * 0.02);
    to.z += Math.sin(a) * (0.12 + n * 0.02);
    to.y -= 0.05;

    tween(900, (t) => {
      mesh.position.lerpVectors(from, to, t);
      mesh.position.y += Math.sin(t * Math.PI) * 0.45;   // a small arc
      mesh.rotation.y = t * 3;
    }).then(() => { ctx.world.placeOffering(loc.id, mesh); });
  }

  /* ================================================================
   * Pranam
   * ================================================================ */
  async _doPranam(full = false) {
    const ctx = this.ctx;
    const loc = this.current;
    if (!loc) return;
    const anchor = ctx.world.anchorFor(loc.id);
    const token = this._token;

    if (ctx.input) ctx.input.setEnabled(false);
    if (anchor && ctx.cameraRig && ctx.cameraRig.focusOn) {
      /*
       * Stand further back and lower for the prostration. The close, chest-
       * height framing is right for a standing bow and wrong for a body going
       * flat on the floor — it puts the camera over an empty space with the
       * top of a head at the bottom of the screen.
       */
      ctx.cameraRig.focusOn(anchor.altar, full
        ? { distance: 5.4, height: 0.8, fov: 55 }
        : { distance: 3.6, height: 1.3, fov: 52 });
    }
    if (anchor) { await ctx.player.faceTowards(anchor.altar, 0.5); }
    token.throwIfCancelled();

    // a soft double at the bottom of the bow, and at the bottom of a dandvat
    // it lands later, because the body takes longer to get there
    const t = setTimeout(() => ctx.bus.emit('haptic', { pattern: 'double' }),
      full ? 3700 : 2100);
    token.onCancel(() => clearTimeout(t));

    await ctx.player.playAction(full ? 'dandvat' : 'pranam');
    clearTimeout(t);
    token.throwIfCancelled();

    /*
     * The standing pranam is remembered per temple, as it always was. The
     * dandvat is NOT recorded anywhere, and that is deliberate: a prostration
     * with a tally against it is the precise thing the brief rules out —
     * "don't gamify devotion" — and a list of temples you have prostrated at
     * is a checklist whether or not it is called one.
     */
    if (!full) {
      if (!ctx.state.pranams.includes(loc.id)) ctx.state.pranams.push(loc.id);
      ctx.save.write();
    }
    ctx.bus.emit('pranam:done', { loc, full });
    await wait(full ? 900 : 600, token);
  }

  /* ================================================================
   * Darshan
   * ================================================================ */
  async _doDarshan() {
    const ctx = this.ctx;
    const loc = this.current;
    if (!loc) return;
    const anchor = ctx.world.anchorFor(loc.id);
    const token = this._token;

    if (ctx.input) ctx.input.setEnabled(false);
    if (anchor) {
      if (ctx.cameraRig && ctx.cameraRig.focusOn) {
        ctx.cameraRig.focusOn(anchor.altar, { distance: 4.4, height: 1.8, fov: 46 });
      }
      await ctx.player.faceTowards(anchor.altar, 0.6);
    }
    token.throwIfCancelled();

    if (ctx.audio && ctx.audio.duck) ctx.audio.duck(0.35, 600);
    await ctx.player.playAction('namaste');
    token.throwIfCancelled();
    await wait(1400, token);

    if (!ctx.state.darshans.includes(loc.id)) ctx.state.darshans.push(loc.id);
    ctx.save.write();
    ctx.bus.emit('darshan:done', { loc });
    ctx.bus.emit('ui:card', { loc });
  }

  _doStory() {
    if (this.current) this.ctx.bus.emit('ui:card', { loc: this.current });
  }

  /* ================================================================
   * Helpers
   * ================================================================ */
  async _approach(target, token) {
    const ctx = this.ctx;
    const player = ctx.player;
    const from = player.position.clone();
    const dist = from.distanceTo(target);
    if (dist < 0.4) return;
    if (dist > 14) return;              // too far to walk politely; stay put

    const dur = Math.min(2200, dist * 700);
    await tween(dur, (t) => {
      _v.lerpVectors(from, target, t);
      player.position.x = _v.x;
      player.position.z = _v.z;
      player.position.y = ctx.world.groundHeight(_v.x, _v.z);
    }, token, smoothstep);
  }

  dispose() {
    this.abort();
    for (const off of this._off) off();
    this.pluck.dispose();
  }
}
