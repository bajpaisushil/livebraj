/**
 * AudioEngine — the entire soundscape, synthesised. No audio files anywhere.
 *
 * Ambience is a set of always-running beds whose gains are crossfaded by where
 * the player is and what time of day it is, so walking from the bazaar down to
 * the Yamuna is a continuous change rather than a cut between loops.
 *
 * The temple bell is the one sound worth real effort, so it is built as an
 * inharmonic additive stack with independently decaying partials and a slow beat
 * between two near-equal ones. It is the sound the game answers an offering
 * with, and a cheap synthetic ding would undo the whole moment.
 */

import { clamp01, damp } from '../math/MathUtils.js';

const BELL_PARTIALS = [
  // ratio, gain, decay seconds — a struck bell's hum, prime, tierce, quint, nominal
  [0.5, 0.42, 7.2],
  [1.0, 1.00, 5.6],
  [1.19, 0.34, 4.4],
  [2.01, 0.52, 3.4],
  [2.77, 0.30, 2.6],
  [4.07, 0.20, 1.8],
  [5.21, 0.12, 1.2],
  [6.83, 0.07, 0.8],
];

export class AudioEngine {
  constructor(ctx) {
    this.ctx = ctx;
    this.ok = false;
    this.started = false;
    this._duck = 1;
    this._duckTarget = 1;
    this._nextBird = 0;
    this._nextTown = 0;
    this._acc = 0;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.info('[audio] WebAudio unavailable — running silent'); return; }

    try {
      this.ac = new AC();
      this.ok = true;
    } catch { console.info('[audio] could not create context'); return; }

    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = 0;
    this.master.connect(ac.destination);

    this.musicBus = ac.createGain();
    this.sfxBus = ac.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);

    this.listener = ac.listener;
    this._buildNoise();
    this._buildBeds();
    this._applyVolumes();

    this._off = ctx.bus.on('sfx', ({ name, position }) => this.play(name, { position }));
    document.addEventListener('visibilitychange', () => {
      if (!this.ok) return;
      this.master.gain.setTargetAtTime(document.hidden ? 0 : this._baseVolume(), this.ac.currentTime, 0.2);
    });
  }

  /* ================================================================
   * Buffers
   * ================================================================ */
  _buildNoise() {
    const ac = this.ac;
    const len = ac.sampleRate * 3;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    // brown-ish noise: integrated white, which sits far better under a scene
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    this.noiseBuf = buf;

    const wlen = ac.sampleRate;
    const wbuf = ac.createBuffer(1, wlen, ac.sampleRate);
    const wd = wbuf.getChannelData(0);
    for (let i = 0; i < wlen; i++) wd[i] = Math.random() * 2 - 1;
    this.whiteBuf = wbuf;
  }

  /** A looping noise source through a filter — the shape of every bed. */
  _bed(type, freq, q, gain) {
    const ac = this.ac;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;

    const filt = ac.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;

    const g = ac.createGain();
    g.gain.value = 0;

    src.connect(filt); filt.connect(g); g.connect(this.musicBus);
    src.start();

    // slow drift so the bed never sits perfectly still
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.05 + Math.random() * 0.08;
    lfoGain.gain.value = freq * 0.12;
    lfo.connect(lfoGain); lfoGain.connect(filt.frequency);
    lfo.start();

    return { src, filt, gain: g, target: 0, base: gain };
  }

  _buildBeds() {
    this.beds = {
      wind: this._bed('lowpass', 420, 0.6, 0.22),
      river: this._bed('bandpass', 900, 0.9, 0.34),
      town: this._bed('lowpass', 700, 0.5, 0.16),
      leaves: this._bed('bandpass', 2600, 1.4, 0.1),
      insects: this._bed('bandpass', 5200, 6, 0.07),
    };

    // a low drone for temple courtyards
    const ac = this.ac;
    const drone = ac.createGain();
    drone.gain.value = 0;
    drone.connect(this.musicBus);
    [55, 82.5, 110].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = [0.5, 0.22, 0.12][i];
      o.connect(g); g.connect(drone);
      o.start();
    });
    this.beds.temple = { gain: drone, target: 0, base: 0.18 };
  }

  /* ================================================================
   * Lifecycle
   * ================================================================ */
  start() {
    if (!this.ok || this.started) return;
    this.started = true;
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
    this.master.gain.setTargetAtTime(this._baseVolume(), this.ac.currentTime, 1.2);
  }

  _baseVolume() {
    return clamp01(this.ctx.state.settings.volume) * 0.9;
  }

  setVolume(music, sfx) {
    if (!this.ok) return;
    this.master.gain.setTargetAtTime(this._baseVolume(), this.ac.currentTime, 0.2);
    this.sfxBus.gain.setTargetAtTime(clamp01(sfx), this.ac.currentTime, 0.1);
  }

  _applyVolumes() {
    const s = this.ctx.state.settings;
    this.sfxBus.gain.value = clamp01(s.sfxVolume);
    this.musicBus.gain.value = 1;
  }

  setPhase(phase) { this.phase = phase; }

  /**
   * Inside a temple the street has to close off: the outside beds duck away and
   * the drone and the bells come forward. It is the single most convincing part
   * of walking through a doorway.
   */
  setSpace(space) {
    this.space = space;
    if (!this.ok || !this.started) return;
    const now = this.ac.currentTime;
    const inside = space === 'interior';
    this.musicBus.gain.setTargetAtTime(inside ? 0.72 : 1, now, 0.5);
    this._interior = inside;
  }

  duck(amount, ms) {
    this._duckTarget = clamp01(amount);
    clearTimeout(this._duckTimer);
    this._duckTimer = setTimeout(() => { this._duckTarget = 1; }, ms + 1500);
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    if (!this.ok || !this.started) return;
    const ac = this.ac;
    const p = ctx.player && ctx.player.position;
    if (!p) return;

    // keep the listener on the camera so panning matches what you see
    const cam = ctx.camera;
    if (this.listener.positionX) {
      const t = ac.currentTime;
      this.listener.positionX.setValueAtTime(cam.position.x, t);
      this.listener.positionY.setValueAtTime(cam.position.y, t);
      this.listener.positionZ.setValueAtTime(cam.position.z, t);
    }

    this._duck = damp(this._duck, this._duckTarget, 3, dt);

    // mix by place and time
    const phase = ctx.time ? ctx.time.phase : 'morning';
    const district = ctx.world.districtAt(p.x, p.z);
    const kind = district ? district.kind : 'outskirts';
    const nearWater = Math.max(0, 1 - ctx.world.waterDepth(p.x, p.z) * 0 - this._riverDistance(ctx, p) / 220);
    const nearTemple = ctx.interaction && ctx.interaction.current ? 1 : 0;

    const b = this.beds;
    b.wind.target = 0.22 + (kind === 'outskirts' ? 0.16 : 0);
    b.river.target = 0.5 * clamp01(nearWater);
    b.town.target = kind === 'bazaar' ? 0.42 : kind === 'old-town' ? 0.3 : kind === 'outskirts' ? 0.04 : 0.16;
    b.leaves.target = kind === 'old-town' || kind === 'temple-quarter' ? 0.12 : 0.2;
    b.insects.target = (phase === 'evening' || phase === 'night') ? 0.18 : 0.0;
    b.temple.target = this._interior ? 0.5 : nearTemple ? 0.22 : 0.03;
    if (this._interior) {
      // the street does not follow you in
      b.town.target *= 0.18;
      b.wind.target *= 0.3;
      b.river.target *= 0.15;
      b.leaves.target *= 0.2;
    }

    const now = ac.currentTime;
    for (const key of Object.keys(b)) {
      const bed = b[key];
      const g = bed.gain.gain !== undefined ? bed.gain.gain : bed.gain;
      g.setTargetAtTime((bed.target * (bed.base || 1)) * this._duck, now, 0.9);
    }

    // generative birds, denser at dawn
    this._nextBird -= dt;
    if (this._nextBird <= 0) {
      const density = phase === 'morning' ? 0.5 : phase === 'evening' ? 0.9 : 1.8;
      this._nextBird = density * (0.3 + Math.random());
      if (phase !== 'night' || Math.random() < 0.2) this._chirp(phase);
    }

    this._nextTown -= dt;
    if (this._nextTown <= 0) {
      this._nextTown = 3 + Math.random() * 7;
      if (kind === 'bazaar' || kind === 'old-town') this._murmur();
    }
  }

  _riverDistance(ctx, p) {
    // cheap: the river runs north, so depth of the nearest water is a good proxy
    let best = 9999;
    const pts = ctx.data.RIVER.points;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - p.x, pts[i][1] - p.z);
      if (d < best) best = d;
    }
    return Math.max(0, best - ctx.data.RIVER.width * 0.5);
  }

  /* ================================================================
   * One-shots
   * ================================================================ */
  play(name, opts = {}) {
    if (!this.ok || !this.started) return;
    const fn = this[`_sfx_${name}`];
    if (typeof fn === 'function') fn.call(this, opts);
  }

  _out(position) {
    const ac = this.ac;
    if (!position || !ac.createPanner) return this.sfxBus;
    const pan = ac.createPanner();
    pan.panningModel = this.ctx.quality.tier === 'low' ? 'equalpower' : 'HRTF';
    pan.distanceModel = 'inverse';
    pan.refDistance = 4;
    pan.maxDistance = 200;
    pan.rolloffFactor = 1.2;
    if (pan.positionX) {
      pan.positionX.value = position.x;
      pan.positionY.value = position.y;
      pan.positionZ.value = position.z;
    }
    pan.connect(this.sfxBus);
    return pan;
  }

  /** The temple bell. Inharmonic partials, each with its own decay. */
  _sfx_bell({ position } = {}) {
    const ac = this.ac;
    const out = this._out(position);
    const now = ac.currentTime;
    const f0 = 232;

    const bus = ac.createGain();
    bus.gain.value = 0.34;
    bus.connect(out);

    for (const [ratio, gain, decay] of BELL_PARTIALS) {
      // two detuned voices per partial produce the slow beat a real bell has
      for (const detune of [-1.2, 1.2]) {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = f0 * ratio;
        o.detune.value = detune;
        const g = ac.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gain * 0.5, now + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        o.connect(g); g.connect(bus);
        o.start(now);
        o.stop(now + decay + 0.1);
      }
    }

    // the strike: a brief filtered noise transient gives it a physical attack
    const n = ac.createBufferSource();
    n.buffer = this.whiteBuf;
    const nf = ac.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 2600; nf.Q.value = 1.2;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.22, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    n.connect(nf); nf.connect(ng); ng.connect(bus);
    n.start(now); n.stop(now + 0.25);
  }

  _sfx_chime({ position } = {}) {
    const ac = this.ac, now = ac.currentTime, out = this._out(position);
    [880, 1320].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 1.1);
      o.connect(g); g.connect(out);
      o.start(now + i * 0.1); o.stop(now + i * 0.1 + 1.2);
    });
  }

  _sfx_conch({ position } = {}) {
    const ac = this.ac, now = ac.currentTime, out = this._out(position);
    const o = ac.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = 196;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 3;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.25);
    g.gain.setValueAtTime(0.16, now + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    const vib = ac.createOscillator(); const vg = ac.createGain();
    vib.frequency.value = 5.5; vg.gain.value = 3;
    vib.connect(vg); vg.connect(o.frequency); vib.start(now); vib.stop(now + 2.5);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(now); o.stop(now + 2.5);
  }

  _footstepLike(freq, q, decay, gain, position) {
    const ac = this.ac, now = ac.currentTime, out = this._out(position);
    const n = ac.createBufferSource();
    n.buffer = this.whiteBuf;
    n.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    n.connect(f); f.connect(g); g.connect(out);
    n.start(now); n.stop(now + decay + 0.05);
  }

  _sfx_footstep({ position, surface } = {}) {
    switch (surface) {
      case 'stone': case 'road': return this._footstepLike(1500, 1.6, 0.1, 0.1, position);
      case 'gali': return this._footstepLike(1100, 1.4, 0.12, 0.1, position);
      case 'grass': return this._footstepLike(2400, 0.9, 0.16, 0.07, position);
      case 'sand': return this._footstepLike(900, 0.7, 0.2, 0.08, position);
      case 'water': return this._footstepLike(700, 0.5, 0.3, 0.14, position);
      default: return this._footstepLike(800, 1.0, 0.15, 0.09, position);
    }
  }

  _sfx_flower({ position } = {}) { this._footstepLike(4200, 3, 0.25, 0.05, position); }
  _sfx_water({ position } = {}) { this._footstepLike(1200, 0.6, 0.4, 0.12, position); }
  _sfx_birdflap({ position } = {}) { this._footstepLike(1800, 0.8, 0.22, 0.06, position); }
  /**
   * The mridanga — the two-headed clay drum that carries every kirtan here.
   *
   * A membrane, not a bell: a sine whose pitch collapses in the first tenth of
   * a second is most of what a drum is, and the low-passed noise burst on top
   * of it is the skin. The two heads are different sizes, so a stroke lands
   * either low and round or high and slapped, chosen at random per hit the way
   * a player's hands alternate.
   */
  _sfx_mridanga({ position } = {}) {
    const ac = this.ac, now = ac.currentTime, out = this._out(position);
    const bass = Math.random() < 0.55;
    const f0 = bass ? 96 : 188;
    const decay = bass ? 0.40 : 0.22;

    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0 * 2.4, now);
    o.frequency.exponentialRampToValueAtTime(f0, now + 0.07);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(bass ? 0.15 : 0.11, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    o.connect(g); g.connect(out);
    o.start(now); o.stop(now + decay + 0.05);

    // the skin itself
    const n = ac.createBufferSource();
    n.buffer = this.whiteBuf;
    n.playbackRate.value = 0.7 + Math.random() * 0.5;
    const f = ac.createBiquadFilter();
    f.type = bass ? 'lowpass' : 'bandpass';
    f.frequency.value = bass ? 520 : 1650;
    f.Q.value = bass ? 0.9 : 1.6;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(bass ? 0.06 : 0.08, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + (bass ? 0.11 : 0.08));
    n.connect(f); f.connect(ng); ng.connect(out);
    n.start(now); n.stop(now + 0.2);
  }

  /**
   * Kartals — the pair of small brass discs everybody in a kirtan is holding.
   *
   * Brass rings at ratios that are nowhere near harmonic, which is why this is
   * three detuned partials up in the top two octaves rather than one note. Kept
   * quiet: there are eight of them a bar and the ear finds them very fast.
   */
  _sfx_kartal({ position } = {}) {
    const ac = this.ac, now = ac.currentTime, out = this._out(position);
    const f0 = 2350 + Math.random() * 420;
    for (const [ratio, gain] of [[1, 0.055], [1.73, 0.036], [2.41, 0.022]]) {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f0 * ratio;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 + Math.random() * 0.1);
      o.connect(g); g.connect(out);
      o.start(now); o.stop(now + 0.32);
    }
    this._footstepLike(5200, 2.4, 0.05, 0.03, position);
  }

  _sfx_rickshawbell({ position } = {}) {
    const ac = this.ac, now = ac.currentTime, out = this._out(position);
    [2100, 3150].forEach((f) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      o.connect(g); g.connect(out); o.start(now); o.stop(now + 0.8);
    });
  }

  _chirp(phase) {
    const ac = this.ac, now = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sine';
    const base = phase === 'evening' ? 1800 : 2600;
    const f = base + Math.random() * 1600;
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * (0.6 + Math.random() * 0.8), now + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.028 + Math.random() * 0.02, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + Math.random() * 0.2);
    o.connect(g); g.connect(this.musicBus);
    o.start(now); o.stop(now + 0.5);
  }

  _murmur() {
    const ac = this.ac, now = ac.currentTime;
    const n = ac.createBufferSource();
    n.buffer = this.noiseBuf;
    n.playbackRate.value = 0.7 + Math.random() * 0.5;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 400 + Math.random() * 500; f.Q.value = 2.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.03, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    n.connect(f); f.connect(g); g.connect(this.musicBus);
    n.start(now); n.stop(now + 1.8);
  }

  dispose() {
    if (this._off) this._off();
    if (this.ok) { try { this.ac.close(); } catch { /* ignore */ } }
  }
}
