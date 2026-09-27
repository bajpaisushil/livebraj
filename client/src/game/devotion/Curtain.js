/**
 * The curtain at Banke Bihari.
 *
 * Darshan here is not continuous, and that is the single most distinctive thing
 * about the temple. A curtain is drawn shut and reopened every few minutes,
 * because Bihari Ji's gaze is held to be so overpowering that resting on it
 * uninterrupted is dangerous. Every time it parts the whole courtyard surges.
 *
 * It is built as two sliding leaves rather than painted on, because a painted
 * curtain is a wall and this one is the practice. The builder names them
 * `Curtain:<locId>:L` and `:R` and gives each an `open` vector — the direction
 * that leaf travels when it is drawn back — so nothing here needs to know which
 * way any temple faces.
 *
 * Timing follows the sources: "every one to five minutes". Held open a little
 * longer than shut, because a pilgrim who arrives to a closed curtain and walks
 * away before it opens has been told nothing.
 *
 * Deliberately NOT a reward, a timer or a thing to optimise. You wait, or you
 * do not. Nothing is scored.
 */

/*
 * The hours a temple is shut.
 *
 * Temples in Braj close for the night and a curtain is drawn across the
 * Deities — about 9pm, back in the morning. That is the ordinary practice at
 * every altar, and is a different thing from Banke Bihari's minute-by-minute
 * curtain below, which is its own tradition. Both run.
 */
/*
 * The darshan timings: 4am to 9pm, every temple.
 *
 * Asked for, and then confirmed as the answer rather than a stand-in —
 * "4am-9pm darshan timings". So this is the rule, not a placeholder: the
 * curtain is drawn across the Deities at 9pm and goes back at 4am, and the
 * pujari keeps the same hours.
 *
 * Real Braj temples each keep their own timings and several close at midday as
 * well. One pair of hours for all sixteen is a deliberate simplification, and
 * it is the right one for a pilgrim who is here to walk the town rather than
 * to plan around sixteen separate schedules. Still two named constants in one
 * place, so if it is ever wanted per temple that is a data change and not a
 * rewrite.
 */
const SHUT_FROM = 21;       // 9pm — shayan arti, the Deities are put to rest
const SHUT_UNTIL = 4;       // 4am — mangala arti, and Braj is awake for it

/**
 * An hour to stand in for each sky phase, when there is no live clock.
 *
 * The fallback used to be `phase === 'night'`, which QUIETLY CONTRADICTS the
 * rule above: the sky is still night at half past four, so with live time off
 * the Deities stayed veiled until dawn — an hour and a half after the temple
 * had opened. One rule, one comparison, whichever clock is answering.
 *
 * 'night' maps to 23:00 rather than 02:00 because a pinned night sky is an
 * evening one more often than it is the small hours, and both are shut anyway.
 */
const PHASE_HOUR = { morning: 6.5, day: 13, evening: 18.5, night: 23 };

const OPEN_S = 42;          // how long darshan lasts
const SHUT_S = 26;          // and how long the wait is
const SLIDE_S = 1.6;        // the draw itself, which is quick and hand-hauled

export class Curtains {
  constructor(ctx) {
    this.ctx = ctx;
    this.leaves = [];
    this.t = 0;
    this.open = true;
    this._wasOpen = true;

    /*
     * Two kinds of thing live here, and both are the same idea: how a Deity is
     * PRESENTED, changing through the day.
     *
     * `Curtain:` leaves slide apart and together at Banke Bihari.
     * `Vesh:` meshes are the gopi-vesh at Gopishwar Mahadev, where the SAME
     * Shiva linga is shown two completely different ways in one day — a bare
     * linga in the morning, and dressed as a gopi with shringar in the evening
     * for the Ras Lila. Only one is ever visible.
     */
    this.vesh = [];
    this.night = [];
    this.shut = false;
    ctx.scene.traverse((o) => {
      if (!o.name) return;
      if (o.name.startsWith('Night:')) { this.night.push(o); return; }
      if (o.name.startsWith('Vesh:')) { this.vesh.push(o); return; }
      if (!o.name.startsWith('Curtain:')) return;
      // the shut position is where the builder left it
      this.leaves.push({
        mesh: o,
        shut: o.position.clone(),
        open: o.userData.openBy || null,
      });
    });
    if (this.vesh.length) {
      console.info(`[vesh] ${this.vesh.length} dressings that change with the hour`);
      this._applyVesh(ctx);
    }
    if (this.night.length) {
      console.info(`[night] ${this.night.length} altars veiled after ${SHUT_FROM}:00`);
      this._applyNight(ctx);
    }
    if (this.leaves.length) {
      console.info(`[curtain] ${this.leaves.length} leaves across ${this.leaves.length / 2} shrine(s)`);
    }
  }

  /**
   * Which dressing the hour calls for.
   *
   * The research gives the day form as roughly 6-10am and the gopi-vesh in the
   * evening for the Ras Lila, so it follows `TimeOfDay`'s own phase rather
   * than a clock of its own — morning and day are the bare linga, evening and
   * night are the vesh.
   */
  _applyVesh(ctx) {
    if (!this.vesh.length) return;
    const phase = (ctx.time && ctx.time.phase) || 'morning';
    const dressed = phase === 'evening' || phase === 'night';
    for (const m of this.vesh) {
      m.visible = (m.userData.vesh === 'evening') === dressed;
    }
    this._veshPhase = phase;
  }

  /**
   * Is the temple shut?
   *
   * Vrindavan's own wall clock, not the device's — `LiveConditions` already
   * works that out, and a pilgrim in another timezone should still find the
   * temples open when they are open in Braj. Falls back to the sky's phase
   * where live time is off.
   */
  _shutNow(ctx) {
    const live = ctx.live && ctx.live.vrindavanTime && ctx.state.settings.liveTime !== false
      ? ctx.live.vrindavanTime() : null;
    const h = live ? live.decimal : PHASE_HOUR[(ctx.time && ctx.time.phase) || 'day'];
    return h >= SHUT_FROM || h < SHUT_UNTIL;
  }

  _applyNight(ctx) {
    const shut = this._shutNow(ctx);
    for (const m of this.night) m.visible = shut;
    this._wasShut = shut;
    /*
     * Published, because it is not only the curtain that stops at night.
     * RitualSystem reads this: a pujari circling a lamp in front of a drawn
     * curtain at two in the morning is the temple contradicting itself, and
     * the whole point of closing at 9pm was that the place keeps real hours.
     */
    this.shut = shut;
  }

  update(dt, ctx) {
    // the night veil: checked about once a second, not every frame
    if (this.night.length) {
      this._nightAcc = (this._nightAcc || 0) + dt;
      if (this._nightAcc > 1) {
        this._nightAcc = 0;
        const shut = this._shutNow(ctx);
        if (shut !== this._wasShut) {
          this._applyNight(ctx);
          ctx.bus.emit('ui:toast', shut
            ? { title: 'Shayan arti', sub: 'The temples are closing for the night' }
            : { title: 'Mangala arti', sub: 'The curtains are drawn back' });
        }
      }
    }
    // the dressing changes when the phase does, and not every frame
    if (this.vesh.length && ctx.time && ctx.time.phase !== this._veshPhase) {
      this._applyVesh(ctx);
    }
    if (!this.leaves.length) return;

    /*
     * Bihari Ji's own curtain keeps the temple's hours too.
     *
     * It was cycling all night — drawn back every twenty-six seconds behind
     * the night veil, at three in the morning, in a temple that is shut. The
     * minute-by-minute curtain is the practice DURING darshan; outside darshan
     * hours there is no curtain being pulled because there is nobody pulling
     * it and nothing to show.
     *
     * So while the temple is shut it simply stays closed, and it does not
     * announce a darshan nobody is having.
     */
    if (this.shut) {
      /*
       * Let it CLOSE rather than snapping closed. Nine o'clock arriving while
       * the curtain happens to be open is a curtain being drawn, which is the
       * thing you would actually see; teleporting it shut is a frame where the
       * cloth was in two places.
       *
       * `open` is forced false and `t` keeps running, so the easing below
       * carries it to the shut position and then holds it there — the flip
       * back to open at the end of the span is what is skipped, not the slide.
       */
      this.open = false;
      this.t = Math.min(this.t + dt, SHUT_S);
    } else {
      this.t += dt;
      const span = this.open ? OPEN_S : SHUT_S;
      if (this.t >= span) {
        this.t = 0;
        this.open = !this.open;
        if (this.open) {
          // the surge. A bell would be wrong here — there is not one in the
          // building — so it is the crowd and nothing else.
          ctx.bus.emit('sfx', { name: 'crowd' });
          ctx.bus.emit('ui:toast', { title: 'Darshan', sub: 'The curtain is drawn back' });
        }
      }
    }

    // ease the leaves between shut and open
    const k = Math.min(1, this.t / SLIDE_S);
    const eased = k * k * (3 - 2 * k);
    const f = this.open ? eased : 1 - eased;
    for (const l of this.leaves) {
      if (!l.open) continue;
      l.mesh.position.set(
        l.shut.x + l.open[0] * f,
        l.shut.y,
        l.shut.z + l.open[1] * f,
      );
    }
  }

  dispose() { this.leaves.length = 0; if (this.vesh) this.vesh.length = 0; if (this.night) this.night.length = 0; }
}
