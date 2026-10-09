/**
 * FountainShow — Prem Mandir's musical fountain, in its hours.
 *
 * "The show 19:00-19:30 in winter, 19:30-20:00 in summer, water jets
 * choreographed to bhajans, free entry" (docs/research/prem-mandir.md,
 * corroborated across three guides). The jets are meshes of their own,
 * `Show:<site>:<set>`, built by PremMandirSetting with the water level they
 * rise from; this raises and lowers each set on its own phrase, turns their
 * colour through the hues the lights throw on them, and keeps the bhajan's
 * beat on the mridanga and kartals for anyone near enough to hear it.
 *
 * WHEN: by the clock in Braj when the game is keeping live time — its date
 * deciding summer or winter hours (April to September as summer is INFERRED;
 * the sources give no dates) — and otherwise in the evening phase, the only
 * one that is ever at that hour. Outside the show the jets are not there.
 *
 * Visibility is this system's alone: LandmarkGenerator keeps `Show:` meshes
 * out of distance culling, as it does the curtains, so two systems never
 * fight over one flag.
 */
const WINTER = [19.0, 19.5];
const SUMMER = [19.5, 20.0];
const HEAR = 90;              // metres within which the beat is heard
const BEAT = 0.42;            // seconds a beat: an unhurried kirtan

export class FountainShow {
  constructor(ctx) {
    this.ctx = ctx;
    this.jets = [];
    ctx.scene.traverse((o) => {
      if (o.name && o.name.startsWith('Show:') && o.userData && o.userData.show) this.jets.push(o);
    });
    this.on = false;
    this.t = 0;
    this._check = 0;
    this._beat = 0;
    this._step = 0;
    this._pos = null;
    for (const j of this.jets) {
      j.visible = false;
      // spray: translucent, and lit from within by the show's own lights
      j.material.transparent = true;
      j.material.opacity = 0.78;
      j.material.depthWrite = false;
      j.material.needsUpdate = true;
    }
    if (this.jets.length) console.info(`[show] ${this.jets.length} sets of jets`);
  }

  /** Is it show time, by the clock in Braj or the phase the player chose? */
  isOn(ctx = this.ctx) {
    const s = ctx.state && ctx.state.settings;
    const live = ctx.live && ctx.live.vrindavanTime && (!s || s.liveTime !== false)
      ? ctx.live.vrindavanTime() : null;
    if (live) {
      const m = live.date.getMonth();
      const [a, b] = m >= 3 && m <= 8 ? SUMMER : WINTER;
      return live.decimal >= a && live.decimal < b;
    }
    return !!(ctx.time && ctx.time.phase === 'evening');
  }

  update(dt, ctx) {
    if (!this.jets.length) return;
    this._check -= dt;
    if (this._check <= 0) { this._check = 1; this.on = this.isOn(ctx); }
    if (!this.on) {
      for (const j of this.jets) if (j.visible) j.visible = false;
      return;
    }
    this.t += dt;
    const t = this.t;
    for (const j of this.jets) {
      const { base, group } = j.userData.show;
      // each set on its own phrase, never quite in step with the others
      const w = Math.sin(t * (0.8 + group * 0.21) + group * 1.7);
      const s = 0.2 + 0.8 * Math.pow(Math.max(0, w), 0.7);
      j.visible = w > -0.6;
      j.scale.y = s;
      j.position.y = base * (1 - s);           // grown from the water, not from sea level
      j.updateMatrix();
      const hue = (t * 0.04 + group * 0.25) % 1;
      j.material.color.setHSL(hue, 0.6, 0.72);
      j.material.emissive.setHSL(hue, 0.85, 0.42);
    }
    // the bhajan's beat, for anyone near enough to hear it
    const p = ctx.player && ctx.player.position;
    const c = this.jets[0].userData.show;
    if (!p || Math.hypot(p.x - c.x, p.z - c.z) > HEAR) return;
    if (!this._pos) this._pos = p.clone();
    this._pos.set(c.x, (this.jets[0].userData.show.base || 0) + 1, c.z);
    this._beat -= dt;
    while (this._beat <= 0) {
      this._beat += BEAT;
      const st = this._step = (this._step + 1) & 7;
      if (st === 0 || st === 3 || st === 4 || st === 6) ctx.bus.emit('sfx', { name: 'mridanga', position: this._pos });
      if ((st & 1) === 0) ctx.bus.emit('sfx', { name: 'kartal', position: this._pos });
    }
  }
}
