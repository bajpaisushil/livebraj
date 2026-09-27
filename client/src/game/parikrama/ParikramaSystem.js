/**
 * ParikramaSystem — the 10.17 km walk around Vrindavan.
 *
 * The route is the real Parikrama Marg, chained at import time from the named
 * OSM segments and closed through the actual street network.
 *
 * Two rules shape this file, and both came from the brief:
 *   - No teleporting between checkpoints. Progress is only credited for ground
 *     the player has actually walked, projected onto the route.
 *   - It is not a race. There is no timer, no pace, no ranking, no failure.
 *     Walk away at any point and the progress is simply kept.
 */

import { arcLengths, pointSegment } from '../../engine/math/Curves.js';
import { SpatialGrid } from '../../engine/math/SpatialGrid.js';
import { formatDistance } from '../../engine/math/MathUtils.js';

/** How far off the marg you may stray and still be walking it. */
const CORRIDOR = 26;
/** Progress is credited in steps of at most this, so a stray GPS-like jump cannot skip ahead. */
const MAX_STEP = 40;

export class ParikramaSystem {
  constructor(ctx) {
    this.ctx = ctx;
    const pari = ctx.data.PARIKRAMA;

    this.route = pari.points;
    this.arc = arcLengths(this.route);
    this.total = this.arc[this.arc.length - 1];
    this.stops = pari.stops
      .map((id) => ctx.data.LOCATION_BY_ID.get(id))
      .filter(Boolean)
      .map((loc) => ({ loc, at: this._projectStatic(loc.pos[0], loc.pos[1]).s }))
      .sort((a, b) => a.at - b.at);

    // segment index so projection is O(nearby) rather than O(132) every frame
    this.grid = new SpatialGrid(48);
    for (let i = 1; i < this.route.length; i++) {
      const a = this.route[i - 1], b = this.route[i];
      this.grid.insert((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, i);
    }

    this.active = false;
    this.metres = 0;
    this.lastS = 0;
    this.visited = new Set();
    this._scratch = [];
    this._sinceEmit = 0;

    // resume a walk in progress
    const saved = ctx.state.parikrama;
    if (saved && saved.active) {
      this.active = true;
      this.metres = saved.metres || 0;
      this.lastS = saved.lastPoint || 0;
    }

    this._offMoved = ctx.bus.on('player:moved', () => { this._dirty = true; });
    console.info(`[parikrama] ${(this.total / 1000).toFixed(2)} km, ${this.stops.length} stops`);
  }

  /* ---------------- control ---------------- */

  start() {
    if (this.active) return;
    this.active = true;
    this.metres = 0;
    this.visited.clear();
    const p = this.ctx.player.position;
    this.lastS = this._project(p.x, p.z).s;
    this._persist();
    this.ctx.bus.emit('parikrama:start', {});
    this.ctx.bus.emit('ui:toast', {
      title: 'Parikrama begun',
      sub: 'वृन्दावन परिक्रमा · about 10 km',
    });
    this.ctx.bus.emit('haptic', { pattern: 'soft' });
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this._persist();
    this.ctx.bus.emit('parikrama:stop', {});
  }

  /** Where the player should head to join the marg. */
  nearestEntry() {
    const p = this.ctx.player.position;
    const pr = this._project(p.x, p.z);
    return { x: pr.x, z: pr.z, distance: pr.d };
  }

  get progress() {
    return { metres: this.metres, total: this.total, pct: this.total ? this.metres / this.total : 0 };
  }

  /* ---------------- frame ---------------- */

  update(dt, ctx) {
    if (!this.active || !ctx.player) return;

    const p = ctx.player.position;
    const pr = this._project(p.x, p.z);

    // Only credit progress while actually on the marg. Wander into a temple and
    // the walk simply pauses — it does not reset, and nothing scolds you.
    if (pr.d <= CORRIDOR) {
      let step = pr.s - this.lastS;
      // handle the wrap at the closing point of the loop
      if (step < -this.total * 0.5) step += this.total;
      else if (step > this.total * 0.5) step -= this.total;

      if (step > 0 && step < MAX_STEP) {
        this.metres += step;
        if (this.metres >= this.total) this._complete();
      }
      this.lastS = pr.s;
      this._checkStops(pr.s);
    }

    this._sinceEmit += dt;
    if (this._sinceEmit > 0.5) {
      this._sinceEmit = 0;
      ctx.bus.emit('parikrama:progress', {
        metres: this.metres,
        total: this.total,
        pct: this.metres / this.total,
        nextStop: this._nextStop(),
        onRoute: pr.d <= CORRIDOR,
        offBy: pr.d,
      });
      this._persist();
    }
  }

  _checkStops(s) {
    for (const stop of this.stops) {
      if (this.visited.has(stop.loc.id)) continue;
      const d = Math.abs(stop.at - s);
      if (d < 55 || d > this.total - 55) {
        this.visited.add(stop.loc.id);
        this.ctx.bus.emit('ui:toast', { title: stop.loc.name, sub: stop.loc.hindi });
        this.ctx.bus.emit('haptic', { pattern: 'tick' });
      }
    }
  }

  _nextStop() {
    const s = this.lastS;
    let best = null, bestD = Infinity;
    for (const stop of this.stops) {
      if (this.visited.has(stop.loc.id)) continue;
      let d = stop.at - s;
      if (d < 0) d += this.total;
      if (d < bestD) { bestD = d; best = stop; }
    }
    if (!best) return null;
    return { id: best.loc.id, name: best.loc.name, hindi: best.loc.hindi, distance: bestD, label: formatDistance(bestD) };
  }

  _complete() {
    this.active = false;
    this.metres = this.total;
    const st = this.ctx.state.parikrama;
    st.laps = (st.laps || 0) + 1;
    this._persist();
    this.ctx.bus.emit('parikrama:complete', { metres: this.total });
    this.ctx.bus.emit('ui:toast', {
      title: 'Parikrama complete',
      sub: 'You walked the whole way round.',
    });
    this.ctx.bus.emit('haptic', { pattern: 'long' });
    this.ctx.bus.emit('sfx', { name: 'bell' });
  }

  _persist() {
    const st = this.ctx.state.parikrama;
    st.active = this.active;
    st.metres = Math.round(this.metres);
    st.lastPoint = this.lastS;
    this.ctx.save.write();
  }

  /* ---------------- projection ---------------- */

  /** Nearest point on the route: { s (arc length), d (offset), x, z }. */
  _project(x, z) {
    const cand = this.grid.query(x, z, 90, this._scratch);
    if (!cand.length) return this._projectStatic(x, z);
    let best = null, bestD = Infinity;
    for (let i = 0; i < cand.length; i++) {
      const idx = cand[i];
      const a = this.route[idx - 1], b = this.route[idx];
      const pr = pointSegment(x, z, a[0], a[1], b[0], b[1]);
      if (pr.d < bestD) {
        bestD = pr.d;
        best = { d: pr.d, x: pr.x, z: pr.z, s: this.arc[idx - 1] + (this.arc[idx] - this.arc[idx - 1]) * pr.t };
      }
    }
    return best;
  }

  /** Full scan — only used at construction, for the stop table. */
  _projectStatic(x, z) {
    let best = { d: Infinity, s: 0, x, z };
    for (let i = 1; i < this.route.length; i++) {
      const a = this.route[i - 1], b = this.route[i];
      const pr = pointSegment(x, z, a[0], a[1], b[0], b[1]);
      if (pr.d < best.d) {
        best = { d: pr.d, x: pr.x, z: pr.z, s: this.arc[i - 1] + (this.arc[i] - this.arc[i - 1]) * pr.t };
      }
    }
    return best;
  }

  dispose() {
    if (this._offMoved) this._offMoved();
    this.grid.clear();
  }
}
