/**
 * RickshawSystem — hailing an e-rickshaw, agreeing a fare, and taking the ride.
 *
 * Vrindavan is a real 4.2 km across at 1:1 scale, and walking from Chhatikara to
 * ISKCON takes as long here as it does there. The answer is not to shrink the
 * town; it is to offer what the town itself offers — an e-rickshaw waiting at
 * the crossing, a fare agreed out loud, and a ride along the real road.
 *
 * The fare is real: computed from the routed distance along actual streets, at
 * the rates people actually pay. It is never a barrier — the wallet cannot
 * block you, and a driver short-changed will simply tell you to pay later. This
 * is flavour and texture, not a resource to manage.
 */

import { formatDistance, clamp } from '../../engine/math/MathUtils.js';
import { NavGraph } from '../navigation/NavGraph.js';
import { resample } from '../../engine/math/Curves.js';
import { driveStep, pathLimit, HIRED, DRIVEN } from './VehicleDrive.js';

const HAIL_RANGE = 7.5;

/**
 * Destinations any driver will take you to on the first day, because everybody
 * who drives here knows them. Deliberately short: the rest of the Dham is
 * still something you find by walking, which is the whole point.
 */
const ALWAYS_KNOWN = new Set([
  'banke-bihari',
  'iskcon-krishna-balaram',
  'prem-mandir',
  'chandrodaya',
  'keshi-ghat',
  'rangaji',
]);
const BASE_FARE = 10;          // rupees
const PER_KM = 12;             // rupees
const RIDE_SPEED = 7.5;        // m/s — fallback when the vehicle has no speed

/**
 * The longest a ride may take in real seconds.
 *
 * The world is 1:1, so Chhatikara to ISKCON is 5.6 km of real road. A cycle
 * rickshaw covers that at 3.2 m/s, which is twenty-nine minutes of sitting and
 * watching — long enough that you conclude the ride is broken and get out,
 * which is exactly what happened. The fare and the quoted duration stay honest
 * about the real journey; only the watching is compressed, and never below the
 * vehicle's own speed, so a short hop still runs at a rickshaw's pace.
 */
const RIDE_TARGET_S = 55;

/**
 * No ride may take longer than this, anywhere in the world.
 *
 * Asked for directly: "it should be maximum of 5mins in e-rickshaw anywhere".
 * The pace is whatever meets it, floored at the vehicle's own speed so a short
 * hop still ambles, and ceilinged so it never stops looking like a road
 * vehicle. The longest route in this world is about 7.8 km, which fits.
 */
const RIDE_MAX_S = 300;

/**
 * The fastest a ride may ever look, in m/s.
 *
 * RIDE_TARGET_S alone was a mistake. Chhatikara to ISKCON is 5.6 km, so
 * compressing it into 55 seconds meant 102 m/s — 367 km/h — and at that speed
 * the rickshaw does not read as following the road at all. It skims through
 * walls and people because it crosses three metres between frames. 12 m/s is
 * about 43 km/h: brisk for an auto, generous for a cycle rickshaw, and slow
 * enough that you can see it turning with the street. A long ride is simply a
 * long ride now, and STOP is always there.
 */
const RIDE_MAX_SPEED = 26;

/** What "jaldi chaliye" and "aaram se" actually do to the pace. */
const PACE_MIN = 0.55;
const PACE_MAX = 2.2;

/** What holding RUN does to the pace while you are a passenger. */
const URGE_PACE = 1.7;

/** How long climbing in takes, in real seconds. */
const BOARD_S = 1.15;

/**
 * How near a waypoint counts as reached, in metres, plus how much further a
 * fast vehicle needs.
 */
const CAPTURE_M = 3.2;
const CAPTURE_PER_SPEED = 0.34;

/**
 * How far down the road the driver is actually looking, in metres.
 *
 * Aiming at the waypoint in front of the nose does not work: a vehicle at
 * 11 m/s has a turning circle far wider than the route's 4 m spacing, so it
 * swings past the point and comes back for it, and comes back for it, and
 * comes back for it. Measured, a rickshaw orbited waypoint 19 of the ISKCON
 * route for six minutes. A driver looks at where the road goes, not at the
 * tarmac under the bonnet, so this picks the point a turning circle ahead and
 * steers at that instead.
 */
const LOOK_MIN = 7;
const LOOK_PER_SPEED = 0.95;

/**
 * The tightest bend, in metres, the hired vehicle is expected to hold at the
 * pace it agreed to.
 *
 * A ride's pace is a deliberate compression — 5.6 km of real road inside five
 * minutes, which is the one thing about a ride that is not 1:1 — and no real
 * grip will hold a Vrindavan corner at 26 m/s. So the grip is compressed by
 * exactly the same amount and no more: enough to stay on the road at the pace
 * that was quoted. What is NOT compressed is the collision. The vehicle is
 * pushed out of everything solid at full radius whatever speed it is doing,
 * which is the whole point of the exercise.
 */
const TRACK_R = 20;

/** How near the last waypoint counts as arrived. */
const ARRIVE_M = 5;

/** Seconds of getting nowhere before the driver writes a waypoint off. */
const SKIP_S = 3.5;

/** The most waypoints one write-off may cover, so it cannot eat the route. */
const MAX_SKIP = 6;

/** How near the set-down he will settle for when he genuinely cannot get closer. */
const GIVE_UP_M = 45;

/** Seconds of getting nowhere at all before he lays a fresh route. */
const RETRY_S = 9;

/**
 * How near the end the driver will simply call it arrived when he cannot get
 * any closer, in waypoints. The last few are the set-down itself; grinding at a
 * bollard twelve metres short of the gate is not a thing a driver does.
 */
const NEARLY_THERE = 4;

/**
 * Taking the wheel yourself.
 *
 * `TOP_MULT` turns a vehicle's cruising-in-traffic speed into its flat-out
 * speed — an e-rickshaw cruises at 4.6 m/s and will do about 25 km/h with the
 * handle wound open, which is the 1.9 below. `EASY` is what a plain press of
 * forward gives you, so that holding RUN still means something. There is no
 * penalty anywhere in here: you cannot crash, you cannot fail, and the worst
 * that happens is a wall stops you.
 */
const TOP_MULT = 1.9;
const TOP_MAX = 14;
const EASY = 0.68;
const REVERSE_MULT = 0.3;

/** How far the steering is thrown over at full lock, in radians. */
const STEER_LOCK = 0.78;

/** How far behind the vehicle the camera sits while you drive it. */
const DRIVE_CAM = 8.5;

/** Player half-width, matching Player.RADIUS, for stepping out of the kerb. */
const PLAYER_R = 0.42;

/**
 * Scratch for the step-out push-out. world.collide only ever reads and writes
 * `.x` and `.z`, so this does not need to be a vector.
 */
const _out = { x: 0, z: 0 };

export class RickshawSystem {
  constructor(ctx) {
    this.ctx = ctx;
    // idle -> boarding -> offered -> waiting -> riding -> idle
    //
    // "Boarding is instant" was the last thing wrong with this. You hailed a
    // rickshaw and the world cut straight to you moving down the road, which
    // is why it read as a teleport even after the vehicle started carrying
    // you properly. Getting in is its own beat now: the driver stops, you
    // walk over and climb on, he waits while you say where to, and he does
    // not pull away until you say start. Each of those is a moment a real
    // ride has.
    this.state = 'idle';
    this._boarding = null;     // { car, t, from } while climbing in
    this.target = null;
    this.ride = null;
    this.drive = null;         // { car, d, top, metres } while you are driving
    this._acc = 0;

    this._buildDialog();

    this._off = [
      ctx.bus.on('input:interact', ({ id } = {}) => {
        if (id === 'rickshaw') this.board();
      }),
      ctx.bus.on('ui:screen', ({ name }) => { if (name !== 'world') this.closeDialog(); }),
    ];
  }

  /* ================================================================
   * The conversation
   * ================================================================ */
  _buildDialog() {
    const el = document.createElement('div');
    el.id = 'rickshaw-dialog';
    el.className = 'ui-interactive';
    el.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:70',
      'display:none', 'padding:18px 20px calc(20px + env(safe-area-inset-bottom,0px))',
      'background:linear-gradient(180deg,#f6ecd9,#e6d4b4)',
      'border-radius:22px 22px 0 0', 'box-shadow:0 -12px 44px rgba(0,0,0,.45)',
      'max-height:72%', 'overflow-y:auto', '-webkit-overflow-scrolling:touch',
    ].join(';');
    document.body.appendChild(el);
    this.dialog = el;
  }

  /* ---------------- the riding HUD ---------------- */

  _rideEl() {
    if (this._hud === undefined) this._hud = document.getElementById('ride-hud');
    return this._hud;
  }

  _showRideHud(ctx, pending = null) {
    const el = this._rideEl();
    // driving yourself with nowhere agreed is a perfectly good state to be in,
    // so the bar no longer insists on a destination before it will appear
    const d = pending || (this.ride && this.ride.d) || (this.drive && this.drive.d);
    if (!el || (!d && this.state !== 'driving')) return;
    const dest = el.querySelector('.rh-dest');
    if (dest) dest.textContent = d ? d.loc.name.replace(/^Shri\s+/, '') : 'Jahan chalein';
    el.classList.add('show');
    this._syncRideHudState(el);

    if (!this._stopWired) {
      this._stopWired = true;
      el.querySelector('#ride-stop')?.addEventListener('click', () => this.stopRide());
      el.querySelector('#ride-start')?.addEventListener('click', () => this.startRide());
      el.querySelector('#ride-fast')?.addEventListener('click', () => this.setPace(1.6));
      el.querySelector('#ride-slow')?.addEventListener('click', () => this.setPace(0.62));
      el.querySelector('#ride-drive')?.addEventListener('click', () => this.takeWheel());
      el.querySelector('#ride-hand')?.addEventListener('click', () => this.handBack());
      // "S" for stop, for anyone on a keyboard. Kept as a field so dispose can
      // take it off the window again — it used to be an anonymous listener that
      // outlived the system.
      this._keys = (e) => {
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === 'g' && this.state === 'waiting') { e.preventDefault(); this.startRide(); }
        else if (k === 'd' && (this.state === 'waiting' || this.state === 'riding')) {
          e.preventDefault();
          this.takeWheel();
        } else if (k === 'd' && this.state === 'driving') { e.preventDefault(); this.handBack(); }
        else if (k === 's' && (this.state === 'riding' || this.state === 'waiting' || this.state === 'driving')) {
          e.preventDefault();
          this.stopRide();
        }
      };
      window.addEventListener('keydown', this._keys);
    }
    this._updateRideHud(ctx);
  }

  /** Which of the bar's buttons belong to the beat you are in. */
  _syncRideHudState(el) {
    el.classList.toggle('waiting', this.state === 'waiting');
    el.classList.toggle('driving', this.state === 'driving');
  }

  _updateRideHud() {
    const el = this._rideEl();
    if (!el) return;
    this._syncRideHudState(el);

    const cruise = (this.vehicle && this.vehicle.speed) || RIDE_SPEED;
    const base = (this.ride && this.ride.pace) || cruise;
    const left = el.querySelector('.rh-left');

    // waiting: he has the fare and the route, and is holding for you
    if (this.state === 'waiting' && this.pending) {
      const d = this.pending;
      const mins = Math.max(1, Math.round(d.metres / cruise / 60));
      if (left) {
        left.textContent = formatDistance(d.metres) + ' · about ' + mins + ' min · ₹' + d.fare;
      }
      return;
    }

    // driving yourself: how fast you are going, and where the guide still is.
    // Nothing here is a target and nothing counts down.
    if (this.state === 'driving' && this.drive) {
      const dr = this.drive;
      const kmh = Math.abs((dr.car && dr.car.vel) || 0) * 3.6;
      if (left) {
        const p = this.ctx.player.position;
        const away = dr.d ? Math.hypot(dr.d.set[0] - p.x, dr.d.set[1] - p.z) : 0;
        left.textContent = Math.round(kmh) + ' km/h'
          + (dr.d ? ' · ' + formatDistance(away) + ' away' : ' · wherever you like');
      }
      const bar0 = el.querySelector('.rh-bar i');
      if (bar0) bar0.style.width = Math.min(100, (kmh / 50) * 100).toFixed(1) + '%';
      return;
    }

    const r = this.ride;
    if (!r) return;
    const frac = r.total > 0 ? Math.min(1, r.metres / r.total) : 0;
    const bar = el.querySelector('.rh-bar i');
    if (bar) bar.style.width = (frac * 100).toFixed(1) + '%';
    if (left) {
      const remain = Math.max(0, r.total - r.metres);
      const mins = Math.max(1, Math.round(remain / cruise / 60));
      const m = r.paceMult || 1;
      const pace = m > 1.15 ? ' · jaldi' : m < 0.85 ? ' · aaram se' : '';
      left.textContent = formatDistance(remain) + ' to go · about '
        + Math.max(1, Math.round(remain / (base * m) / 60)) + ' min' + pace;
    }
  }

  _hideRideHud() {
    const el = this._rideEl();
    if (el) el.classList.remove('show');
  }

  /**
   * Walk over and get in. The driver holds still for it.
   *
   * Takes BOARD_S of real time, which is short but not nothing — long enough
   * that you see yourself arrive at the vehicle rather than appearing in it.
   */
  board() {
    if (this.state !== 'idle' || !this.target) return false;
    const ctx = this.ctx;
    const car = this.target;

    this.state = 'boarding';
    car.chartered = true;                      // he waits for you
    car.throttle = 0;
    this._boarding = {
      car,
      t: 0,
      from: { x: ctx.player.position.x, z: ctx.player.position.z },
    };
    if (ctx.input) ctx.input.setEnabled(false);
    ctx.bus.emit('ui:prompt:clear', { id: 'rickshaw' });
    ctx.bus.emit('sfx', { name: 'rickshawbell' });
    ctx.bus.emit('haptic', { pattern: 'soft' });
    return true;
  }

  /** Ease the passenger from where they stood onto the seat. */
  _stepBoarding(dt, ctx) {
    const b = this._boarding;
    if (!b) { this.state = 'idle'; return; }
    b.t = Math.min(1, b.t + dt / BOARD_S);

    // ease-out: you slow as you reach the step
    const k = 1 - Math.pow(1 - b.t, 3);
    const L = (this.vehicle && this.vehicle.l) || 2.8;
    const back = L * 0.22;
    const sx = b.car.x - Math.sin(b.car.yaw) * back;
    const sz = b.car.z - Math.cos(b.car.yaw) * back;
    const x = b.from.x + (sx - b.from.x) * k;
    const z = b.from.z + (sz - b.from.z) * k;
    const y = ctx.world.groundHeight(x, z);
    ctx.player.position.set(x, y + 0.62 * k, z);
    ctx.player.setYaw(b.car.yaw);

    if (b.t >= 1) {
      if (ctx.player.playAction) ctx.player.playAction('sit').catch(() => {});
      this._boarding = null;
      this.openDialog();                      // now ask him where to
    }
  }

  openDialog() {
    if (this.state === 'riding' || !this.target) return;
    const ctx = this.ctx;
    const p = ctx.player.position;

    // Places you have found, plus the handful every driver in Braj knows
    // without being told.
    //
    // Discovery-only was the rule here, which reads well until you notice
    // where the player starts: Chhatikara, having discovered nothing, 5.1 km
    // from ISKCON. The one thing an arriving pilgrim actually does at that
    // chauraha — get in and say "ISKCON" — was the one thing the driver
    // refused. A driver not knowing Banke Bihari is not restraint, it is a
    // driver who has never worked this road.
    const known = ctx.data.LOCATIONS
      .filter((l) => ctx.state.discovered.has(l.id) || ALWAYS_KNOWN.has(l.id))
      .map((l) => {
        const set = this._setDown(l);
        // routed as a vehicle: he will thread a gali to reach a door, but he
        // will not take one as a through-road
        const path = ctx.nav ? ctx.nav.path(p.x, p.z, set[0], set[1], true) : null;
        const metres = path ? NavGraph.length(path) : Math.hypot(set[0] - p.x, set[1] - p.z);
        const cruise = (this.vehicle && this.vehicle.speed) || RIDE_SPEED;
        return {
          loc: l, set, metres, path,
          fare: fareFor(metres, this.hire),
          // the honest journey time at this vehicle's real speed — an auto is
          // quicker than a cycle rickshaw and the quote should say so
          mins: Math.max(1, Math.round(metres / cruise / 60)),
        };
      })
      .filter((d) => d.metres > 120)
      .sort((a, b) => a.metres - b.metres)
      .slice(0, 8);

    const rows = known.length ? known.map((d) => `
      <button class="rk-row ui-interactive" data-go="${d.loc.id}" style="
        display:flex;align-items:center;gap:12px;width:100%;text-align:left;
        padding:13px 12px;margin-bottom:8px;border-radius:14px;
        background:rgba(255,255,255,.5);border:1px solid rgba(43,29,20,.08)">
        <span style="flex:1 1 auto;min-width:0">
          <span style="display:block;font-family:Marcellus,Georgia,serif;font-size:15px">${esc(d.loc.name)}</span>
          <span style="display:block;font-family:'Tiro Devanagari Hindi',serif;font-size:12px;color:#c8452a">${esc(d.loc.hindi || '')}</span>
          <span style="display:block;font-size:11.5px;color:#8a7057;margin-top:4px;letter-spacing:.04em">
            ${formatDistance(d.metres)} &middot; about ${d.mins} min</span>
        </span>
        <span style="flex:0 0 auto;font-family:Jost,system-ui,sans-serif;font-size:17px;font-weight:500;color:#2b1d14">&#8377;${d.fare}</span>
      </button>`).join('') : `
      <div style="font-family:Spectral,Georgia,serif;color:#5b4634;line-height:1.6;padding:6px 2px">
        The driver looks at you kindly. "Where to, ji? You have not seen much of
        Vrindavan yet — walk a little first, then I will take you anywhere."
      </div>`;

    this.dialog.innerHTML = `
      <div style="width:38px;height:4px;border-radius:2px;background:rgba(43,29,20,.2);margin:0 auto 14px"></div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
        <span style="font-family:Marcellus,Georgia,serif;font-size:19px">${esc((this.vehicle && this.vehicle.label) || 'E-rickshaw')}</span>
        <span style="font-family:'Tiro Devanagari Hindi',serif;font-size:14px;color:#c8452a">${esc((this.vehicle && this.vehicle.hindi) || 'ई-रिक्शा')}</span>
        <span style="margin-left:auto;font-size:12px;color:#8a7057">&#8377;${ctx.state.rupees ?? 0} with you</span>
      </div>
      <div style="font-family:Spectral,Georgia,serif;font-style:italic;color:#5b4634;font-size:13.5px;margin-bottom:14px">
        ${this.hire && this.hire.shared ? '"Sawari hai? Baith jaiye, dus rupaye." Shared — you sit with whoever else is going.' : '"Kahan jaana hai? Baith jaiye."'}
      </div>
      ${rows}
      <button class="rk-drive ui-interactive" style="
        display:flex;align-items:center;gap:12px;width:100%;text-align:left;
        padding:13px 12px;margin:2px 0 8px;border-radius:14px;
        background:rgba(200,69,42,.10);border:1px solid rgba(200,69,42,.22)">
        <span style="flex:1 1 auto;min-width:0">
          <span style="display:block;font-family:Marcellus,Georgia,serif;font-size:15px">I&rsquo;ll drive</span>
          <span style="display:block;font-family:'Tiro Devanagari Hindi',serif;font-size:12px;color:#c8452a">मैं चलाता हूँ</span>
          <span style="display:block;font-size:11.5px;color:#8a7057;margin-top:4px;letter-spacing:.04em">
            He shifts over &middot; go where you like &middot; no fare</span>
        </span>
      </button>
      <button class="rk-close ui-interactive" style="
        width:100%;padding:13px;margin-top:6px;border-radius:14px;
        background:rgba(43,29,20,.07);color:#5b4634;font-size:13px;
        letter-spacing:.11em;text-transform:uppercase">Not now</button>`;

    this.dialog.style.display = 'block';
    this.state = 'offered';
    if (ctx.input) ctx.input.setEnabled(false);

    this.dialog.querySelector('.rk-close').addEventListener('click', () => this.closeDialog());
    this.dialog.querySelector('.rk-drive')?.addEventListener('click', () => this.takeWheel());
    this.dialog.querySelectorAll('.rk-row').forEach((b) => {
      b.addEventListener('click', () => {
        const d = known.find((k) => k.loc.id === b.dataset.go);
        if (d) this._agree(d);
      });
    });
  }

  closeDialog() {
    this.dialog.style.display = 'none';
    if (this.state === 'offered') this.state = 'idle';
    if (this.ctx.input && this.state !== 'riding' && this.state !== 'driving') {
      this.ctx.input.setEnabled(true);
    }
  }

  /* ================================================================
   * The ride
   * ================================================================ */

  /**
   * The fare is agreed and the route is laid, but nothing moves yet. He waits.
   */
  _agree(d) {
    const ctx = this.ctx;
    this.closeDialog();
    this.state = 'waiting';
    this.pending = d;
    if (ctx.input) ctx.input.setEnabled(false);
    this._showRideHud(ctx, d);
    ctx.bus.emit('ui:toast', {
      title: `To ${d.loc.name.replace(/^Shri\s+/, '')} — ₹${d.fare}`,
      sub: 'Chaliye? Say start when you are ready.',
    });
  }

  /**
   * Ask the driver to change pace, as a multiplier on the agreed one.
   *
   * Compounds, so saying "fast" twice is faster than saying it once, and
   * clamped at both ends — he is not going to crawl and he is not going to
   * fly. Returns false when there is nobody to ask.
   */
  setPace(mult) {
    if (this.state !== 'riding' || !this.ride) return false;
    const r = this.ride;
    r.paceMult = clamp((r.paceMult || 1) * mult, PACE_MIN, PACE_MAX);
    this._updateRideHud();
    return true;
  }

  /** Say start, and he pulls away. */
  startRide() {
    if (this.state !== 'waiting' || !this.pending) return false;
    const d = this.pending;
    this.pending = null;
    this._begin(d);
    return true;
  }

  /**
   * Lay the route and pull away.
   *
   * `charge` is false when you are handing the controls back mid-journey: the
   * fare was agreed and paid when the ride began, and he is not going to ask
   * for it twice because you drove part of the way yourself.
   */
  _begin(d, charge = true) {
    const ctx = this.ctx;
    this.closeDialog();
    this.state = 'riding';
    if (ctx.input) ctx.input.setEnabled(false);

    const pts = resample(d.path && d.path.length > 1 ? d.path
      : [[ctx.player.position.x, ctx.player.position.z], d.set || d.loc.pos], 4);

    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    const cruise = (this.vehicle && this.vehicle.speed) || RIDE_SPEED;
    // aim for RIDE_TARGET_S, never exceed RIDE_MAX_S, never crawl below the
    // vehicle's own pace, never outrun RIDE_MAX_SPEED
    const pace = Math.min(
      RIDE_MAX_SPEED,
      Math.max(cruise, total / RIDE_TARGET_S, total / RIDE_MAX_S),
    );

    // already chartered when you got in; he simply lets the brake off
    const car = this.target;
    if (car) { car.chartered = true; car.throttle = 1; }

    // Built once, here, because the drive loop must not allocate: a slow phone
    // runs it eight times a frame.
    const prof = {
      accel: Math.max(HIRED.accel, pace * 0.35),
      brake: Math.max(HIRED.brake, pace * 0.45),
      lat: Math.max(HIRED.lat, (pace * pace) / TRACK_R),
      turnMax: HIRED.turnMax,
      agents: HIRED.agents,
    };

    // `i` is the waypoint being steered TO, not a fraction along a segment —
    // the vehicle carries its own position now, and the route is only a list of
    // places to go past.
    this.ride = {
      d, pts, i: 0, t: 0, metres: 0, total, pace, paceMult: 1, car, prof,
      was: 0, stall: 0, lost: 0, skips: 0, stopping: false,
    };
    if (car) {
      // start it under you rather than wherever it was idling, pointing the way
      // the route sets off, and from rest
      car.x = ctx.player.position.x;
      car.z = ctx.player.position.z;
      car.vel = 0;
      car.stuck = 0;
      if (pts.length > 1) car.yaw = Math.atan2(pts[1][0] - car.x, pts[1][1] - car.z);
      this._seat(ctx, car);
    }
    this._freeze(ctx, true);
    this._showRideHud(ctx);

    // the fare is agreed, and the wallet never blocks you
    let paid = d.fare;
    if (charge) {
      const purse = ctx.state.rupees ?? 0;
      paid = Math.min(purse, d.fare);
      ctx.state.rupees = purse - paid;
      ctx.state.ridesTaken = (ctx.state.ridesTaken || 0) + 1;
      ctx.save.write();
    }

    ctx.bus.emit('ui:toast', {
      title: 'Chaliye',
      sub: paid < d.fare ? 'Paise baad mein de dena.' : 'Jai Shri Radhe.',
    });
    ctx.bus.emit('sfx', { name: 'rickshawbell' });
    ctx.bus.emit('haptic', { pattern: 'soft' });

    if (ctx.player.playAction) ctx.player.playAction('sit').catch(() => {});

    // Face the way you are going, and keep the controls for looking.
    //
    // The camera kept whatever heading it had when you hailed, so a ride often
    // started staring at the side of the road with no way to turn: input was
    // disabled wholesale, which took the camera with it. You cannot walk during
    // a ride — RickshawSystem updates after the player and pins you to the seat
    // every frame — so leaving input on costs nothing and gives you your head
    // back.
    const rig = ctx.cameraRig;
    if (rig) {
      if (rig.setDistance) rig.setDistance(7.5);
      if (car && rig.yaw !== undefined) { rig.yaw = car.yaw; rig.yawTarget = car.yaw; }
    }
    if (ctx.input) ctx.input.setEnabled(true);
  }

  /**
   * Ask the driver to pull over. The ride ends where you are, not where you
   * were going — which is the whole point of being able to say stop.
   */
  stopRide() {
    // Getting out before he has moved is a real thing to want, so stop works
    // from the waiting beat as well as mid-route.
    if (this.state === 'waiting') {
      const car = this.target;
      if (car) car.chartered = false;
      this.pending = null;
      this.state = 'idle';
      this._hideRideHud();
      this._freeze(this.ctx, false);
      if (this.ctx.player.cancelAction) this.ctx.player.cancelAction();
      if (this.ctx.input) this.ctx.input.setEnabled(true);
      this.ctx.bus.emit('ui:toast', { title: 'Rehne dijiye', sub: 'You step back down.' });
      return true;
    }
    const ctx = this.ctx;
    // Driving yourself, stop means get out — here, wherever here is. There is
    // no wrong place to stop and nothing to settle up.
    if (this.state === 'driving' && this.drive) {
      ctx.bus.emit('ui:toast', { title: 'Bas, yahin', sub: 'You step down.' });
      this._finish(true);
      return true;
    }
    if (this.state !== 'riding' || !this.ride) return false;
    this.ride.stopping = true;
    ctx.bus.emit('ui:toast', { title: 'Yahin rok dijiye', sub: 'The driver pulls over.' });
    ctx.bus.emit('sfx', { name: 'rickshawbell' });
    this._finish(true);
    return true;
  }

  _finish(early = false) {
    const ctx = this.ctx;
    const held = this.ride || this.drive;
    const loc = held && held.d ? held.d.loc : null;
    const car = held ? held.car : null;
    this._hideRideHud();

    // step out onto the side of the road, clear of the vehicle
    if (car) {
      car.chartered = false;
      car.vel = 0;
      car.stuck = 0;
      car.target = null;
      const side = 1.5;
      const ox = car.x + Math.cos(car.yaw) * side;
      const oz = car.z - Math.sin(car.yaw) * side;
      // the kerb is not always clear, and stepping out into a wall is exactly
      // the sort of thing this whole change is about
      _out.x = ox; _out.z = oz;
      if (ctx.world.collide) ctx.world.collide(_out, PLAYER_R);
      ctx.player.position.set(_out.x, ctx.world.groundHeight(_out.x, _out.z), _out.z);
    }

    this.ride = null;
    this.drive = null;
    this.state = 'idle';

    this._freeze(ctx, false);
    if (ctx.player.cancelAction) ctx.player.cancelAction();
    if (ctx.input) ctx.input.setEnabled(true);
    if (ctx.cameraRig && ctx.cameraRig.setDistance) {
      ctx.cameraRig.setDistance(ctx.state.settings.cameraDistance || 6.8);
    }
    if (loc && !early) {
      ctx.bus.emit('ui:toast', { title: `${loc.name}`, sub: 'Aa gaye. Jai Shri Radhe.' });
      ctx.bus.emit('sfx', { name: 'rickshawbell' });
    }
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    if (this.state === 'boarding') { this._stepBoarding(dt, ctx); return; }
    if (this.state === 'riding') {
      // Holding RUN as a passenger means the same as saying jaldi: the button
      // already means "hurry" when you are on foot, so it should not mean
      // nothing the moment you sit down. Eases in and back out rather than
      // snapping, so it reads as the driver leaning on it.
      const want = ctx.input && ctx.input.running ? URGE_PACE : 1;
      const r = this.ride;
      if (r) {
        r.urge = (r.urge === undefined ? 1 : r.urge) + (want - (r.urge ?? 1)) * Math.min(1, dt * 2.6);
      }
      this._drive(dt, ctx);
      return;
    }
    if (this.state === 'driving') { this._driveSelf(dt, ctx); return; }
    if (this.state === 'waiting') { this._updateRideHud(ctx); return; }
    if (this.state === 'offered') return;

    // offer a ride when you are standing beside one
    this._acc += dt;
    if (this._acc < 0.4) return;
    this._acc = 0;

    const p = ctx.player && ctx.player.position;
    if (!p || !ctx.crowd) return;

    const near = this._nearestRickshaw(ctx, p);
    const had = !!this.target;
    this.target = near;

    if (near && !had) {
      const what = this.vehicle ? this.vehicle.label : 'rickshaw';
      ctx.bus.emit('ui:prompt', { id: 'rickshaw', label: `Get in ${what}`, hint: '₹', key: 'R' });
    } else if (!near && had) {
      ctx.bus.emit('ui:prompt:clear', { id: 'rickshaw' });
    }
  }

  /**
   * Where a driver actually puts you down.
   *
   * The route used to end at `loc.pos` — the centre of the building — and
   * NavGraph.path overwrites its last point with exactly the coordinates it was
   * given, so the last leg left the road, drove through the compound wall and
   * set you down inside the temple. At ISKCON that meant arriving in the middle
   * of the courtyard, which is not something any e-rickshaw in Vrindavan has
   * ever done. He stops at the gate and you walk in.
   *
   * The gate is found as a road node rather than as an offset along loc.rot,
   * because the two "front" conventions in LandmarkGenerator disagree about
   * which face that is and the road knows perfectly well: Krishna Balaram's
   * nearest street is 48 m off its -X side, which the rot-based offset points
   * directly away from.
   */
  _setDown(loc) {
    const ctx = this.ctx;
    if (!ctx.nav || !ctx.nav.nearest) return loc.pos;
    const n = ctx.nav.nearest(loc.pos[0], loc.pos[1]);
    if (!n) return loc.pos;

    const half = Math.max(loc.build ? loc.build.w : 18, loc.build ? loc.build.d : 18) * 0.5;
    const dx = n.x - loc.pos[0], dz = n.z - loc.pos[1];
    const d = Math.hypot(dx, dz);
    if (d > half * 0.8) return [n.x, n.z];

    // the graph runs right through this one — the old town's galis do reach the
    // door — so step clear of the footprint on the same bearing and take the
    // road node nearest that instead
    const a = d > 0.01 ? Math.atan2(dx, dz) : loc.rot;
    const ox = loc.pos[0] + Math.sin(a) * (half + 5);
    const oz = loc.pos[1] + Math.cos(a) * (half + 5);
    const m = ctx.nav.nearest(ox, oz);
    return m ? [m.x, m.z] : [ox, oz];
  }

  _nearestRickshaw(ctx, p) {
    // "driver" specifically: a pedestrian standing nearer than the rickshaw is
    // not a reason to refuse you a ride.
    const found = ctx.crowd.nearestSpeakable
      ? ctx.crowd.nearestSpeakable(p.x, p.z, HAIL_RANGE, 'driver')
      : null;
    if (!found || !found.type || !found.type.hire) return null;
    this.hire = found.type.hire;
    this.vehicle = found.type;
    return found.agent;
  }

  /**
   * Put the passenger on the seat of the vehicle that is carrying them.
   *
   * The ride used to move the player along the route and leave the rickshaw
   * parked where it was hailed, so you slid down the road at seat height with
   * nothing under you. The vehicle drives the route now and the passenger is
   * placed on it every frame, a little back from the middle and a little above
   * the deck, facing the way it faces.
   */
  _seat(ctx, a) {
    const L = (this.vehicle && this.vehicle.l) || 2.8;
    const back = L * 0.22;
    const sx = a.x - Math.sin(a.yaw) * back;
    const sz = a.z - Math.cos(a.yaw) * back;
    const y = ctx.world.groundHeight(sx, sz);
    ctx.player.position.set(sx, y + 0.62, sz);
    ctx.player.setYaw(a.yaw);
  }

  /**
   * Drive the hired vehicle along the agreed route.
   *
   * This used to sample the route polyline: it walked an arc length down the
   * line each frame and assigned the vehicle's position to the point it landed
   * on. A collision pass then pushed the vehicle out of whatever that point was
   * inside — and the next frame put it straight back, because the position came
   * from the line and the line never moved. Measured with world.isClear every
   * two metres, an eighth of the ISKCON to Prem Mandir drive still ran through
   * solid geometry after that pass.
   *
   * The vehicle steers now. It has a heading and a speed of its own, it aims at
   * the waypoint ahead, it slows for the corner before the corner, and where the
   * world leaves it is where it is. The route is a set of places to go past,
   * not a rail.
   */
  _drive(dt, ctx) {
    const r = this.ride;
    if (!r) { this.state = 'idle'; return; }
    const car = r.car;
    if (!car) { this._finish(); return; }

    const pts = r.pts;
    const last = pts.length - 1;
    const prof = r.prof || HIRED;
    const vel = Math.abs(car.vel || 0);

    // A waypoint is done with once you are on top of it, or once you are past
    // the line drawn square across the route through it — however wide of it
    // you went getting there. Proximity alone is a trap: overshoot one and a
    // vehicle that cannot turn inside its own overshoot will orbit it for ever.
    const capture = CAPTURE_M + vel * CAPTURE_PER_SPEED;
    const reach = capture * 6;
    while (r.i < last) {
      const wx = pts[r.i][0], wz = pts[r.i][1];
      const dx = wx - car.x, dz = wz - car.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < capture * capture) { r.i++; continue; }
      // guarded by distance so a hairpin further up the road is not written off
      // before it has been driven
      if (d2 < reach * reach) {
        const nx = pts[r.i + 1][0] - wx, nz = pts[r.i + 1][1] - wz;
        if (dx * nx + dz * nz < 0) { r.i++; continue; }
      }
      break;
    }

    const dEndNow = Math.hypot(pts[last][0] - car.x, pts[last][1] - car.z);

    // Wedged against something the route went straight through.
    //
    // Progress is measured by getting PAST waypoints, not by the vehicle's own
    // stuck counter: a vehicle pinned in a doorway shuffles forward and back
    // half a metre at a time, which resets that counter for ever and looks like
    // driving. Each write-off that does not help writes off more, because a
    // route through a wall does not get better four metres at a time.
    if (r.i === r.was) { r.stall += dt; r.lost += dt; }
    else { r.stall = 0; r.lost = 0; r.was = r.i; r.skips = 0; }

    // Tell the driver, but only once a waypoint has actually been written off.
    // From inside the vehicle a courtyard it cannot get out of feels exactly
    // like driving — it moves, it turns, it covers ground, and it arrives
    // nowhere — so VehicleDrive's recovery has to hear about a route that is
    // going nowhere. It must not hear about an ordinary slow pull-away, which
    // also spends a second or two on one waypoint: that read as stuck, and the
    // swerve and the 2.6 m/s crawl came on every time he set off.
    if (r.skips > 0 && r.lost > (car.stuck || 0)) car.stuck = r.lost;

    if (r.stall > SKIP_S) {
      r.stall = 0;
      r.skips++;
      // near the end he simply calls it arrived: a driver who cannot reach the
      // gate sets you down by the gate rather than grinding at a bollard
      if (r.i >= last - NEARLY_THERE || dEndNow < GIVE_UP_M) { this._finish(); return; }
      // write off a bounded run of it — an escalating skip that is not bounded
      // eats the whole rest of the route and "arrives" a kilometre short
      r.i = Math.min(last, r.i + Math.min(r.skips, MAX_SKIP));
      r.was = r.i;
    }

    // Properly pinned. He has tried to get round, tried to back out, and the
    // route he was given goes through a wall — so he lays a new one from where
    // he has actually ended up. One A* call, and never more often than this;
    // NavGraph's scratch is instance state and its nudge pass is not cheap.
    if (r.skips > 0 && r.lost > RETRY_S) {
      r.lost = 0;
      if (this._reroute(ctx, r)) return;
    }

    const dEnd = Math.hypot(pts[last][0] - car.x, pts[last][1] - car.z);
    if (r.i >= last && dEnd < ARRIVE_M) { this._finish(); return; }

    // look a turning circle down the road rather than at the next waypoint
    let aim = r.i;
    let along = Math.hypot(pts[aim][0] - car.x, pts[aim][1] - car.z);
    const look = LOOK_MIN + vel * LOOK_PER_SPEED;
    while (aim < last && along < look) {
      along += Math.hypot(pts[aim + 1][0] - pts[aim][0], pts[aim + 1][1] - pts[aim][1]);
      aim++;
    }
    const wantYaw = Math.atan2(pts[aim][0] - car.x, pts[aim][1] - car.z);

    // the agreed pace, what he has been asked for, and what the road allows
    const cruise = (r.pace || RIDE_SPEED) * (r.paceMult || 1) * (r.urge || 1);
    let want = pathLimit(pts, r.i, car.x, car.z, prof, cruise);
    // and he pulls up rather than arriving at speed
    if (r.i >= last - NEARLY_THERE) {
      want = Math.min(want, Math.sqrt(2 * prof.brake * Math.max(0.6, dEnd)));
    }

    const made = driveStep(car, dt, ctx, wantYaw, want, prof);
    if (made > 0) r.metres += made;
    car.y = ctx.world.groundHeight(car.x, car.z);

    this._seat(ctx, car);
    this._updateRideHud(ctx);

    // the journey still counts as ground covered, and still discovers places
    ctx.bus.emit('player:moved', { pos: ctx.player.position, delta: Math.max(0, made) });
  }

  /**
   * Lay a fresh route from wherever the vehicle has ended up.
   *
   * A route is a suggestion, not a rail, and a vehicle that has spent nine
   * seconds pinned has usually moved somewhere the graph would route from
   * differently. Returns true when it replaced the route, in which case the
   * caller should leave this frame alone rather than drive on a polyline it no
   * longer holds.
   */
  _reroute(ctx, r) {
    if (!ctx.nav || !ctx.nav.path) return false;
    const car = r.car;
    const set = r.d.set || (r.d.loc ? this._setDown(r.d.loc) : null);
    if (!set) return false;
    const fresh = ctx.nav.path(car.x, car.z, set[0], set[1], true);
    if (!fresh || fresh.length < 2) return false;

    r.pts = resample(fresh, 4);
    r.i = 0;
    r.was = 0;
    r.stall = 0;
    r.skips = 0;
    car.stuck = 0;
    return true;
  }

  /* ================================================================
   * "Main chalaata hoon" — taking the wheel
   * ================================================================ */

  /**
   * Take the controls.
   *
   * Asked for directly: "let there be a chat to driver like i'll drive where we
   * take control of e-rickshaw and control full speed of it". The driver shifts
   * over, you steer with the same controls you walk with, and the vehicle obeys
   * exactly the same steering model it obeys when he is driving — so it cannot
   * be put through a wall either.
   *
   * Nothing about this is a driving game. There is no damage, no timer, no
   * score and no way to fail. If a destination was agreed it stays on the map
   * as a guide and the fare stands, but nothing makes you follow it; you can
   * hand back or get out anywhere.
   */
  takeWheel() {
    const ctx = this.ctx;
    if (this.state === 'driving') return false;

    // whichever beat you said it from, the vehicle is the one you are in
    const car = (this.ride && this.ride.car) || this.target;
    if (!car) return false;
    const d = (this.ride && this.ride.d) || this.pending || null;

    this.closeDialog();
    if (this.ride) { this.ride = null; }
    this.pending = null;
    this.state = 'driving';

    car.chartered = true;                       // the crowd keeps its hands off
    car.throttle = 1;
    car.vel = car.vel || 0;
    car.stuck = 0;

    const type = this.vehicle;
    this.drive = {
      car, d,
      top: Math.min(TOP_MAX, ((type && type.speed) || RIDE_SPEED) * TOP_MULT),
      metres: 0,
    };

    // put yourself in it, facing the way it faces
    car.x = ctx.player.position.x;
    car.z = ctx.player.position.z;
    this._seat(ctx, car);
    this._freeze(ctx, true);

    // the destination stays visible as a guide and nothing more
    if (d && d.loc) ctx.bus.emit('nav:destination', { loc: d.loc });

    const rig = ctx.cameraRig;
    if (rig) {
      if (rig.setDistance) rig.setDistance(DRIVE_CAM);
      if (rig.yaw !== undefined) { rig.yaw = car.yaw; rig.yawTarget = car.yaw; }
    }
    if (ctx.input) ctx.input.setEnabled(true);

    this._showRideHud(ctx);
    ctx.bus.emit('ui:toast', {
      title: 'Aap chalaiye',
      sub: 'He shifts over. Forward to go, back to brake, left and right to steer.',
    });
    ctx.bus.emit('sfx', { name: 'rickshawbell' });
    ctx.bus.emit('haptic', { pattern: 'soft' });
    return true;
  }

  /**
   * Give the controls back.
   *
   * The route agreed before you took over starts wherever the vehicle was then,
   * so it is re-laid from where you have actually ended up. The fare is not
   * charged twice — you already paid him.
   */
  handBack() {
    if (this.state !== 'driving' || !this.drive) return false;
    const ctx = this.ctx;
    const d = this.drive.d;
    const car = this.drive.car;

    if (!d || !d.loc) {
      // no destination was ever agreed, so there is nothing to hand back TO
      this.stopRide();
      return true;
    }

    // one A* call, on a button press, the same as the fare sheet does. Never
    // per frame: the scratch in NavGraph is instance state and is not reentrant.
    const set = d.set || this._setDown(d.loc);
    const path = ctx.nav ? ctx.nav.path(car.x, car.z, set[0], set[1], true) : null;
    const metres = path ? NavGraph.length(path) : Math.hypot(set[0] - car.x, set[1] - car.z);

    this.drive = null;
    this.target = car;
    this._begin({ ...d, set, path, metres }, false);
    ctx.bus.emit('ui:toast', { title: 'Aap baithiye', sub: 'He takes the handle back.' });
    return true;
  }

  /**
   * One step of driving it yourself.
   *
   * Forward and back are throttle and brake along the vehicle's own nose; left
   * and right are steering lock, not a world heading — the D-pad's walking
   * semantics are the opposite of what a vehicle wants, so this reads walk and
   * strafe directly rather than going through the Player's camera-relative
   * resolution. Pull back from a standstill and it reverses, slowly.
   */
  _driveSelf(dt, ctx) {
    const dr = this.drive;
    if (!dr) { this.state = 'idle'; return; }
    const car = dr.car;
    const input = ctx.input;

    let throttle = 0, steer = 0;
    if (input) {
      // the D-pad presses, or the stick and the keys — whichever is being used
      if (input.walk || input.strafe) { throttle = input.walk; steer = input.strafe; }
      else { throttle = input.move.y; steer = input.move.x; }
    }
    steer = clamp(steer, -1, 1);
    throttle = clamp(throttle, -1, 1);

    const boost = input && input.running ? 1 : EASY;
    const want = throttle >= 0
      ? dr.top * throttle * boost
      : dr.top * throttle * REVERSE_MULT;

    // steering is lock, not a bearing: holding it over keeps turning, which is
    // how a handle works and what the grip limit in VehicleDrive expects
    const made = driveStep(car, dt, ctx, car.yaw + steer * STEER_LOCK, want, DRIVEN);
    dr.metres += Math.abs(made);
    car.y = ctx.world.groundHeight(car.x, car.z);

    this._seat(ctx, car);
    this._updateRideHud(ctx);
    ctx.bus.emit('player:moved', { pos: ctx.player.position, delta: Math.abs(made) });
  }

  /**
   * Stop the Player walking the avatar off the seat.
   *
   * Input stays enabled through a ride so the camera is still yours, and the
   * Player runs before the rickshaw in the sub-step — so it was walking the
   * avatar away every frame and `_seat` was quietly teleporting it back. That
   * worked, but it fought the steering the moment the stick meant something
   * else, and it spent two collision passes a frame on a body that is sitting
   * down.
   */
  _freeze(ctx, on) {
    if (ctx.player && ctx.player.setFrozen) ctx.player.setFrozen(on);
  }

  dispose() {
    for (const off of this._off) off();
    if (this._keys) window.removeEventListener('keydown', this._keys);
    if (this.dialog && this.dialog.parentElement) this.dialog.parentElement.removeChild(this.dialog);
  }
}

/** What a driver would actually ask for. */
function fareFor(metres, hire) {
  const km = metres / 1000;
  const raw = (hire ? hire.base : BASE_FARE) + km * (hire ? hire.perKm : PER_KM);
  return Math.max(10, Math.round(raw / 5) * 5);   // drivers quote in round fives
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
