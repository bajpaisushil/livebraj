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
import { DriverTalk } from './DriverTalk.js';
import { NavGraph } from '../navigation/NavGraph.js';
import { resample } from '../../engine/math/Curves.js';
import { driveStep, pathLimit, routeSeconds, HIRED, DRIVEN } from './VehicleDrive.js';
import { speedOn, topSpeed, pullAway, asked, roadKindAt, roadKindsAlong } from './RoadSpeeds.js';
import { TiltSteer } from './TiltSteer.js';

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
/**
 * What a hired vehicle is quoted at before its route is known, in m/s: the
 * town speed the traffic itself keeps (CrowdSystem), which for an e-rickshaw
 * is 4.6 m/s, about 17 km/h — where the 100-trip GPS study of e-rickshaws put
 * their average (17.4-18.3 km/h; docs/research/vehicle-speeds.md).
 */
const TOWN_SPEED = 4.6;

/**
 * The longest a ride may take in real seconds, anywhere in the world.
 *
 * Asked for directly: "it should be maximum of 5mins in e-rickshaw anywhere".
 * It used to be kept by driving faster: a pace planned up to 26 m/s and
 * allowed to 34 — an e-rickshaw at 94 km/h, and later 122, when a battery
 * e-rickshaw is built not to pass 25 (CMVR rule 2(cb)). Now the vehicle keeps
 * the speed it really has on each road (RoadSpeeds), and a journey longer
 * than this is shown as a TIME-LAPSE instead: the whole world runs faster
 * together (GameApp, `ctx.timeScale`), and the ride bar says by how much.
 */
const RIDE_MAX_S = 300;

/**
 * What a long ride is planned to fit, in real seconds: a minute inside the
 * promise, because traffic, cows and corners always cost more than the plan,
 * and what is left over is kept by `catchup` below.
 */
const RIDE_BUDGET_S = 240;

/**
 * The rates a ride may be shown at, and the fastest.
 *
 * Round numbers, because the ride bar says them out loud. Twelve is the
 * fastest the world is run: past that a town stops reading as a town, and it
 * is as much as the frame loop's sixteen steps keep at 45 fps. The slowest
 * long ride there is, a cycle rickshaw across the whole world, needs it.
 */
const LAPSES = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12];
const LAPSE_MAX = 12;

/** The smallest rate that fits a journey of `honest` seconds into the budget. */
function lapseFor(honest) {
  for (const k of LAPSES) if (honest / k <= RIDE_BUDGET_S) return k;
  return LAPSE_MAX;
}

/** A rate as the ride bar writes it: x5, x1.5, x2.6. */
const lapseText = (k) => '\u00d7' + (k >= 10 || Math.abs(k - Math.round(k)) < 0.05
  ? String(Math.round(k)) : k.toFixed(1));

/** What "jaldi chaliye" and "aaram se" actually do to the pace. */
const PACE_MIN = 0.5;

/**
 * How far "jaldi chaliye" can stack.
 *
 * It compounds, so each press is a real step up rather than a switch you have
 * already flipped: 1.0, 1.6, 2.6, 4.1, 5.0. Each press does two things, both
 * said on the ride bar. The driver leans toward the most the road allows
 * (RoadSpeeds.asked: half of what is left on the first press, nothing left by
 * the fourth), and the time-lapse runs by the same factor, up to LAPSE_MAX —
 * which is what a passenger in a hurry actually wants, without the vehicle
 * ever going faster than it can.
 */
const PACE_MAX = 5.0;

/**
 * How far the time-lapse may quietly be raised to keep inside RIDE_MAX_S.
 *
 * Only ever used when the measured ride says it will overrun the promise —
 * traffic, a cow, a long wait at a junction. Bounded, and it is the RATE that
 * rises, never the vehicle's speed: the ride bar shows the rate as it is.
 */
const CATCHUP_MAX = 2;

/** Seconds — how far back the ride's "what am I making now" average looks. */
const EMA_TAU = 15;

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

/** How near the last waypoint counts as arrived. */
const ARRIVE_M = 5;

/** Seconds of getting nowhere before the driver writes a waypoint off. */
const SKIP_S = 3.5;

/** The most waypoints one write-off may cover, so it cannot eat the route. */
const MAX_SKIP = 6;

/** How near the set-down he will settle for when he genuinely cannot get closer. */
const GIVE_UP_M = 45;

/** Seconds of getting nowhere at all before he lays a fresh route. */
/** Genuinely pinned for this long and he is put back on his route. */
const UNWEDGE_S = 3.2;

/**
 * Happen this many times and the route is wrong, not the driving.
 *
 * Six was far too few. A 5 km route through the old town has plenty of tight
 * corners a steering vehicle needs a shove past, and giving up after six left
 * the passenger 229 m from ISKCON — which reads as the ride simply stopping in
 * the street. Forty is still a real ceiling on a route that is genuinely
 * impassable, without abandoning a journey that is merely fiddly.
 */
const UNWEDGE_MAX = 40;

const RETRY_S = 9;

/**
 * How near the end the driver will simply call it arrived when he cannot get
 * any closer, in waypoints. The last few are the set-down itself; grinding at a
 * bollard twelve metres short of the gate is not a thing a driver does.
 */
const NEARLY_THERE = 4;

/**
 * Driving it yourself.
 *
 * A plain press of forward gives the vehicle's own unhurried pace for the road
 * it is on (RoadSpeeds `cruise`) — an e-rickshaw does 16-20 km/h on a street
 * and 8-12 in a gali, as they do — and jaldi leans that toward the road's
 * `max`, as it does for a driver you have hired. Holding RUN winds the handle
 * open to the most the vehicle can do at all: 25 km/h for an e-rickshaw, 50
 * for an auto, the legal ceilings for the rest. These were once the traffic
 * speed times 2.8, which put an e-rickshaw at 46 km/h on a plain press and
 * jaldi took it to 122. There is no penalty anywhere in here: you cannot crash,
 * you cannot fail, and the worst that happens is a wall stops you.
 */
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
    // leaning the phone steers, but only at the wheel and only once the sensor
    // has been granted, which iOS will not do outside a real tap
    this.tilt = new TiltSteer(ctx);
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
      el.querySelector('#ride-fast')?.addEventListener('click', () => {
        const r = this.setPace(1.6);
        if (r === 'capped') {
          this.ctx.bus.emit('ui:toast', {
            title: 'Aur tez nahin ho sakta', sub: 'He is already going his fastest',
          });
          this.ctx.bus.emit('haptic', { pattern: 'double' });
        }
      });
      el.querySelector('#ride-slow')?.addEventListener('click', () => this.setPace(0.62));
      el.querySelector('#ride-drive')?.addEventListener('click', () => this.takeWheel());
      el.querySelector('#ride-hand')?.addEventListener('click', () => this.handBack());
      // "S" for stop, for anyone on a keyboard. Kept as a field so dispose can
      // take it off the window again — it used to be an anonymous listener that
      // outlived the system.
      this._keys = (e) => {
        if (e.repeat) return;
        /*
         * NEVER WHILE SOMEONE IS TYPING, and only in the world.
         *
         * This listener sits on window, so it heard every key typed into the
         * map's search box. Searching "Radha Raman" mid-ride took the wheel at
         * the d; any name with an s in it — Shahji, Seva Kunj, ISKCON —
         * stopped the ride; and with the d swallowed the search read "Raha
         * Raman", found nothing, and "Start from here" had nothing to start
         * from. The same fault UISystem's `m` had, in a listener that never
         * got the guard. The ride bar these keys drive is only on screen in
         * the world, so they only act there.
         */
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
          || t.isContentEditable)) return;
        const ui = this.ctx && this.ctx.ui;
        if (ui && ui.screen && ui.screen !== 'world') return;
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

    const cruise = (this.vehicle && this.vehicle.speed) || TOWN_SPEED;
    const left = el.querySelector('.rh-left');

    // waiting: he has the fare and the route, and is holding for you. The
    // minutes are the journey's, at the vehicle's own speed — what the ride
    // takes in the town, not what it will take to watch
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
      // the bar is the handle: full is as fast as this vehicle goes at all
      const bar0 = el.querySelector('.rh-bar i');
      const most = topSpeed(this.vehicle && this.vehicle.id) * 3.6;
      if (bar0) bar0.style.width = Math.min(100, (kmh / most) * 100).toFixed(1) + '%';
      return;
    }

    const r = this.ride;
    if (!r) return;
    const frac = r.total > 0 ? Math.min(1, r.metres / r.total) : 0;
    const bar = el.querySelector('.rh-bar i');
    if (bar) bar.style.width = (frac * 100).toFixed(1) + '%';
    if (left) {
      const remain = Math.max(0, r.total - r.metres);
      // show the stack, so pressing it again is visibly worth doing
      const m = r.paceMult || 1;
      const steps = m > 1.15 ? Math.round(Math.log(m) / Math.log(1.6)) : 0;
      const capped = m >= PACE_MAX - 1e-6;
      // at the ceiling the chip says so, rather than counting up for ever
      const pace = capped ? ' · jaldi \u00d7' + steps + ' (max)'
        : steps > 0 ? ' · jaldi' + (steps > 1 ? ' \u00d7' + steps : '')
        : m < 0.85 ? ' · aaram se' : '';
      const fast = el.querySelector('#ride-fast');
      if (fast) {
        fast.classList.toggle('at-max', capped);
        fast.textContent = capped ? 'JALDI · MAX' : 'JALDI';
      }
      /*
       * Quote the measurement, not the plan — weighted by how much of the
       * journey the measurement has seen.
       *
       * Twenty seconds into the Chhatikara run he has covered six per cent of
       * 5.5 km, most of it the crawl out of the crossing, and quoting that as
       * the whole ride promised a time the rest of the road does not keep —
       * rickshaw.mjs's "countdown is not a work of fiction", which then passed
       * or failed on where the traffic happened to stand. What he has done
       * describes the rest of the ride in proportion to how much of it is
       * behind him; until then the PLAN is the better evidence, and the plan
       * is now the road itself: `r.after[i]` is how long the rest of this
       * route takes at the vehicle's own speed on each stretch of it, from
       * the point he is steering for.
       */
      const planned = this._plannedRest(r);
      const seen = r.total > 0 ? Math.min(1, (r.metres / r.total) * 2.5) : 1;
      const simRest = r.mps && r.t > 1.5
        ? seen * (remain / Math.max(0.5, r.mps)) + (1 - seen) * planned
        : planned;
      /*
       * In the time you will sit through, which is the world's time over the
       * rate it is being shown at — and never longer than the promise, which
       * the rate rises to keep (`catchup`), so a countdown beyond it would
       * describe a ride that cannot happen.
       */
      const lapse = this._lapse(r);
      const secs = Math.min(simRest / lapse, Math.max(20, RIDE_MAX_S - r.real));
      /*
       * Under a minute, say so rather than rounding up to one.
       *
       * `Math.max(1, ...)` is a floor, and a floor is a lie at the tail: six
       * seconds from the gate the HUD was still promising "about 1 min", which
       * is the same complaint as the original one in miniature — the number on
       * the screen not matching the journey you are having.
       */
      const when = secs < 45 ? 'arriving'
        : 'about ' + Math.round(secs / 60) + ' min';
      // and the rate, whenever the world is being run faster than it is
      const shown = lapse > 1.02 ? ' · time-lapse ' + lapseText(lapse) : '';
      left.textContent = formatDistance(remain) + ' to go · ' + when + shown + pace;
    }
  }

  /**
   * The rate this ride is being shown at, now: the one its length called for,
   * times what a passenger in a hurry has asked for, times whatever has been
   * found to keep the five-minute promise — never past LAPSE_MAX.
   */
  _lapse(r) {
    return Math.min(LAPSE_MAX,
      (r.lapse || 1) * Math.max(1, r.paceMult || 1) * (r.catchup || 1));
  }

  /**
   * Seconds of the world's time the rest of the ride should take: the road's
   * own answer from the point he is steering for (`r.after`), plus the run to
   * that point, at whatever the passenger has asked the driver for.
   */
  _plannedRest(r) {
    const i = Math.min(r.i, r.pts.length - 1);
    const sp = r.speeds[i];
    const lean = asked(sp, (r.paceMult || 1) * (r.urge || 1), PACE_MAX) / Math.max(0.1, sp.cruise);
    const toNext = r.car ? Math.hypot(r.pts[i][0] - r.car.x, r.pts[i][1] - r.car.z) / Math.max(0.5, sp.cruise) : 0;
    return (r.after[i] + toNext) / Math.max(0.3, lean);
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
      // your own vehicle has no driver to bargain with — you just drive
      if (b.car && b.car.personal) this.takeWheel();
      else this.openDialog();
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
    const quote = (l) => {
      const set = this._setDown(l);
      // routed as a vehicle: he will thread a gali to reach a door, but he
      // will not take one as a through-road
      const path = ctx.nav ? ctx.nav.path(p.x, p.z, set[0], set[1], true) : null;
      const metres = path ? NavGraph.length(path) : Math.hypot(set[0] - p.x, set[1] - p.z);
      const cruise = (this.vehicle && this.vehicle.speed) || TOWN_SPEED;
      return {
        loc: l, set, metres, path,
        fare: fareFor(metres, this.hire),
        // the honest journey time at this vehicle's real speed — an auto is
        // quicker than a cycle rickshaw and the quote should say so
        mins: Math.max(1, Math.round(metres / cruise / 60)),
      };
    };

    const known = ctx.data.LOCATIONS
      .filter((l) => ctx.state.discovered.has(l.id) || ALWAYS_KNOWN.has(l.id))
      .map(quote)
      .filter((d) => d.metres > 120)
      .sort((a, b) => a.metres - b.metres)
      .slice(0, 8);

    /*
     * ASKING FOR A PLACE BY NAME.
     *
     * The suggested list is the nearest eight he already knows, which is the
     * right SUGGESTION and the wrong limit: Radha Madan Mohan, Radha Damodar
     * and most of the old town simply could not be asked for at all. That is
     * not how a rickshaw works. You say a name and the driver knows it —
     * discovery governs what he OFFERS, not what he will answer to.
     *
     * Matches on the English name and on the Devanagari, so "मदन" finds Madan
     * Mohan, and the distance filter is dropped for a searched result: if you
     * have asked for somewhere 80 m away he can still say yes.
     */
    const search = (q) => {
      const t = q.trim().toLowerCase();
      if (!t) return known;
      return ctx.data.LOCATIONS
        .filter((l) => (l.name || '').toLowerCase().includes(t)
          || (l.hindi || '').includes(q.trim())
          || (l.deity || '').toLowerCase().includes(t))
        .map(quote)
        .sort((a, b) => a.metres - b.metres)
        .slice(0, 8);
    };

    const rowsFor = (list) => list.length ? list.map((d) => `
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
    let shown = known;
    const rows = rowsFor(known);

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
      <input id="rk-q" class="ui-interactive" type="search" autocomplete="off"
        placeholder="Say a place — Madan Mohan, Radha Damodar&hellip;"
        style="width:100%;box-sizing:border-box;padding:11px 13px;margin-bottom:10px;
        border-radius:12px;border:1px solid rgba(43,29,20,.12);
        background:rgba(255,255,255,.62);color:#2b1d14;
        font-family:Jost,system-ui,sans-serif;font-size:14px">
      <div id="rk-rows">${rows}</div>
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

    /*
     * Rows are re-bound after every render rather than delegated, because the
     * fare quote lives on the row object and not in the DOM — the click has
     * to find the SAME object that produced the price the player just read.
     */
    const bindRows = () => {
      this.dialog.querySelectorAll('.rk-row').forEach((btn) => {
        btn.addEventListener('click', () => {
          const d = shown.find((k) => k.loc.id === btn.dataset.go);
          if (d) this._agree(d);
        });
      });
    };
    bindRows();

    const q = this.dialog.querySelector('#rk-q');
    const rowsEl = this.dialog.querySelector('#rk-rows');
    if (q && rowsEl) {
      q.addEventListener('input', () => {
        shown = search(q.value);
        rowsEl.innerHTML = rowsFor(shown);
        bindRows();
      });
      /*
       * The world's own keyboard shortcuts are off while the dialog is open
       * (input.setEnabled(false) above), but UISystem keeps its own window
       * listener, so stop keys here too — otherwise typing "madan mohan"
       * would toggle the map mid-word, which is the same fault that was just
       * fixed in the map's search box.
       */
      q.addEventListener('keydown', (e) => e.stopPropagation());
    }
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
    /*
     * Returns 'capped' when the ask could not be honoured because he is
     * already flat out, so the caller can SAY so. It stacked silently before:
     * the fourth jaldi did nothing, looked identical to the third, and there
     * was no way to tell the ceiling from a broken button.
     */
    const target = this.state === 'driving' && this.drive ? this.drive
      : this.state === 'riding' && this.ride ? this.ride : null;
    if (!target) return false;

    const before = target.paceMult || 1;
    const after = clamp(before * mult, PACE_MIN, PACE_MAX);
    target.paceMult = after;
    this._updateRideHud();
    // asked for more and got none: he has nothing left
    if (mult > 1 && after <= before + 1e-6) return 'capped';
    if (mult < 1 && after >= before - 1e-6) return 'capped';
    return true;
  }

  /** How many jaldis deep the current ride is, and whether that is the last. */
  paceSteps() {
    const t = this.state === 'driving' ? this.drive : this.ride;
    const m = (t && t.paceMult) || 1;
    return {
      mult: m,
      steps: m > 1.15 ? Math.round(Math.log(m) / Math.log(1.6)) : 0,
      capped: m >= PACE_MAX - 1e-6,
    };
  }

  /**
   * Point the camera the way the vehicle is actually going. Once.
   *
   * Both boarding paths already snapped the rig to `car.yaw`, but that is the
   * heading of a PARKED vehicle — which is wherever it happened to stop, not
   * where it is about to go. You would board facing a wall and it would pull
   * away behind you. So the aim is armed at boarding and fired on the first
   * frame the thing is genuinely moving, which is what "towards the vehicle
   * moving" means.
   *
   * And then never again. After it fires the camera is yours: swing it
   * wherever you like, nothing drags it back. That is the difference between a
   * sensible default and a camera that fights you.
   */
  _aimCameraAtTravel(ctx, car, hold) {
    const rig = ctx.cameraRig;
    if (!rig || !car) return;
    /*
     * AND KEEP FOLLOWING IT. (2026-09-30)
     *
     * "as the lane changes in vehicle change the view to that like update it
     * to front view of vehicle moving direction." The rule above was right
     * for pulling away and wrong for everything after: once fired, nothing
     * ever turned the view again, so the first corner left you staring at
     * the side of the road. So the vehicle's heading is published to the rig
     * every frame it is genuinely moving, and the rig eases round to it —
     * but only after you have left the look control alone for a moment
     * (ThirdPersonCamera VEH_IDLE), so looking out of the side is still
     * yours for as long as you are doing it.
     *
     * This request was dropped once, between being made and being queued.
     */
    rig.vehicleHeading = Math.abs(car.vel || 0) >= 1.2 ? car.yaw : null;
    if (!hold || !hold.aimCam) return;
    if (Math.abs(car.vel || 0) < 1.2) return;       // still parked, or crawling
    if (rig.yaw !== undefined) { rig.yaw = car.yaw; rig.yawTarget = car.yaw; }
    hold.aimCam = false;
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
    /*
     * THE ROAD SETS THE SPEED.
     *
     * Every stretch of the route takes the speed this vehicle really keeps on
     * that kind of road (RoadSpeeds): an e-rickshaw 20-25 km/h on the
     * Chhatikara road, 16-20 on a street, 8-12 in a gali. From those, the
     * corners and the vehicle's own pull-away comes the honest length of the
     * journey — the same physics the drive loop runs, laid end to end — and
     * from that the rate it is shown at: none for a short hop, more for a long
     * one, whatever fits RIDE_BUDGET_S. Read once, here, because the road under
     * fourteen hundred points is fourteen hundred nav lookups.
     */
    const type = this.vehicle ? this.vehicle.id : null;
    const speeds = roadKindsAlong(ctx.nav, pts).map((k) => speedOn(type, k));
    const lim = new Float32Array(pts.length);
    for (let k = 0; k < pts.length; k++) lim[k] = speeds[k].cruise;

    // he stops being a vehicle and starts being a man with an opinion
    if (!this.talk) this.talk = new DriverTalk(ctx);
    this.talk.reset();

    // already chartered when you got in; he simply lets the brake off
    const car = this.target;
    if (car) { car.chartered = true; car.throttle = 1; }

    // Built once, here, because the drive loop must not allocate: a slow phone
    // runs it eight times a frame — sixteen under a time-lapse. Nothing in it
    // is scaled to a pace any more: the grip is the hired vehicle's own, and
    // it pulls away as that vehicle does (RoadSpeeds.pullAway), not at the
    // half a g every vehicle used to.
    const prof = {
      accel: pullAway(type),
      brake: HIRED.brake,
      lat: HIRED.lat,
      turnMax: HIRED.turnMax,
      agents: HIRED.agents,
    };
    const after = new Float32Array(pts.length);
    const honest = routeSeconds(pts, lim, prof, after);

    // `i` is the waypoint being steered TO, not a fraction along a segment —
    // the vehicle carries its own position now, and the route is only a list of
    // places to go past.
    //
    // `t` is the world's time on this ride and `real` the passenger's: they
    // part company by the rate. `pace` is the honest average the road allows,
    // which DriverTalk compares the measured one with to know a jam.
    this.ride = {
      d, pts, i: 0, t: 0, real: 0, metres: 0, total, car, prof,
      speeds, after, honest, pace: total / Math.max(1, honest),
      lapse: lapseFor(honest), paceMult: 1, urge: 1, roadAt: null,
      mps: 0, ema: 0, emaW: 0, catchup: 1,
      was: 0, stall: 0, lost: 0, skips: 0, stopping: false,
    };
    /*
     * What the road allows at point k, at what the passenger has asked for:
     * read by pathLimit to brake for a gali before reaching it, as it brakes
     * for a corner. Made once, here; it reads the ride as it stands each time.
     */
    const r0 = this.ride;
    r0.roadAt = (k) => asked(r0.speeds[Math.min(k, r0.speeds.length - 1)],
      (r0.paceMult || 1) * (r0.urge || 1), PACE_MAX);
    ctx.timeScale = r0.lapse;
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
    if (rig && rig.setDistance) rig.setDistance(7.5);
    // armed, not fired: see _aimCameraAtTravel
    if (this.ride) this.ride.aimCam = true;
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

  /**
   * Out of whatever this is, at once and without ceremony.
   *
   * "Start from here" moves you across town, and a ride held on to you
   * through it: riding or driving, the vehicle sits you back on its seat every
   * frame, so the placement was undone before it was ever drawn and the
   * button looked as if it did nothing. This lets go of the vehicle, the fare
   * dialog, the ride bar, the controls and the camera from any beat — walking
   * over, bargaining, waiting, riding or at the wheel — so the caller can put
   * you somewhere else. It says nothing: the caller says where you are.
   */
  leave() {
    const ctx = this.ctx;
    if (this.state === 'idle') return false;
    if (this.state === 'riding' || this.state === 'driving') {
      if (this.ride) this.ride.stopping = true;
      this._finish(true);
      return true;
    }
    // boarding, offered or waiting: nothing has moved yet
    if (this.dialog) this.dialog.style.display = 'none';
    const car = (this._boarding && this._boarding.car) || this.target;
    if (car) car.chartered = false;
    this._boarding = null;
    this.pending = null;
    this.state = 'idle';
    this._hideRideHud();
    this._freeze(ctx, false);
    if (ctx.player.cancelAction) ctx.player.cancelAction();
    if (ctx.input) ctx.input.setEnabled(true);
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
    // out of the vehicle, the world runs at its own pace again
    ctx.timeScale = 1;

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
    // out of the vehicle, however you got out: the rig follows you again
    if (this.state !== 'riding' && this.state !== 'driving' && ctx.cameraRig) {
      ctx.cameraRig.vehicleHeading = null;
    }
    // and only a ride in progress may run the world fast: whatever ended it,
    // and whichever path that took, the clock is put back here as well
    if (this.state !== 'riding' && ctx.timeScale !== 1) ctx.timeScale = 1;
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
      const mine = !!(near && near.personal);
      ctx.bus.emit('ui:prompt', {
        id: 'rickshaw',
        label: mine ? `Drive ${what}` : `Get in ${what}`,
        hint: mine ? '' : '₹',
        key: 'R',
      });
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
    // a node a vehicle can get to, not merely the closest one: the nearest node
    // to a temple in the old town is often inside a courtyard with a wall across
    // every way out of it, and no rickshaw has ever set anybody down there
    const near = ctx.nav.nearestDrivable
      ? (x, z) => ctx.nav.nearestDrivable(x, z)
      : (x, z) => ctx.nav.nearest(x, z);
    const n = near(loc.pos[0], loc.pos[1]);
    if (!n) return loc.pos;

    const half = Math.max(loc.build ? loc.build.w : 18, loc.build ? loc.build.d : 18) * 0.5;
    const dx = n.x - loc.pos[0], dz = n.z - loc.pos[1];
    const d = Math.hypot(dx, dz);

    /*
     * The graph runs right through this one — the old town's galis do reach
     * the door — so step clear of the footprint and take a road node out
     * there instead.
     *
     * The old version stepped out on ONE bearing, asked for the nearest node
     * to that point, and returned whatever came back WITHOUT CHECKING IT. So
     * if the nearest node to the stepped-out point was another gali node back
     * inside the compound, you were set down inside the mandir anyway.
     * Measured at Banke Bihari: 18.9 m out on a cold nav graph — fine — and
     * 11.1 m after seventy-odd routing calls had warmed it, which is inside
     * the building. Ride there and the interior mode actually engaged: camera
     * pulled in, ceiling clipped, standing in the sanctum.
     *
     * (The drift with warm-up is `NavGraph.nearestDrivable` treating an
     * unmeasured edge as drivable, so the same query answers differently
     * depending on how much of the graph has been walked. That is worth fixing
     * on its own, but a set-down that CHECKS ITS OWN ANSWER does not care what
     * the graph hands it, which is the more important property.)
     *
     * So: ring-search. Try bearings all the way round at increasing radius and
     * take the first node that is genuinely outside, verified against the same
     * test `InteriorSystem` uses to decide you are indoors. Give up to the
     * plain offset rather than to something inside.
     */
    /*
     * Is this point inside the place?
     *
     * Declared over the builder's own volume first and the footprint only as a
     * fallback, because `loc.build` is sometimes the BUILDING and sometimes
     * the PLOT — the same confusion that made the temple wall checks report
     * phantom failures. Chaar Dham's build is 76 m across and its grounds are
     * 96, so a point 43 m out clears the footprint comfortably and is still in
     * the middle of the compound.
     */
    const inside = (x, z) => {
      // the builder's own declared volume where there is one, the footprint
      // otherwise — see InteriorSystem._contains
      const io = ctx.interior;
      if (io && io.volumes) {
        for (const v of io.volumes) {
          if (v.loc && v.loc.id === loc.id && io._contains(v, x, z, 1.02)) return true;
        }
      }
      return Math.hypot(x - loc.pos[0], z - loc.pos[1]) < half * 1.05;
    };

    /*
     * How far out is far enough?
     *
     * `loc.build` is the BUILDING and the volume a builder declares is often
     * the COMPOUND, which is much bigger — Chaar Dham's build is 76 m across
     * and its grounds are 96. Stepping out from the building's half-width put
     * the set-down 43 m from the centre and still inside the declared volume,
     * so every ring failed and it fell back to the plain offset, which was the
     * thing being guarded against.
     *
     * So the search starts from whichever is larger, and reaches far enough
     * past it to clear anything this world declares.
     */
    let reach = half;
    const iov = ctx.interior && ctx.interior.volumes;
    if (iov) {
      for (const v of iov) {
        if (v.loc && v.loc.id === loc.id) reach = Math.max(reach, Math.hypot(v.hw, v.hd));
      }
    }
    if (loc.grounds) reach = Math.max(reach, loc.grounds * 0.5);
    if (loc.compound) {
      const c = loc.compound;
      reach = Math.max(reach, Math.max(-c.lx0, c.lx1, -c.lz0, c.lz1) * 0.5);
    }

    /*
     * If the nearest drivable node is ALREADY outside, that is the answer.
     *
     * This test used to be `d > half * 0.8` — a distance against the building
     * — and it is why Chaar Dham survived the ring search being fixed: the
     * nearest node sits 43 m out, which clears a 76 m building's half-width
     * and returned early, before any of the checking below could run. Asking
     * the same question the rest of this function asks means there is one
     * definition of "outside" here instead of two.
     */
    if (!inside(n.x, n.z)) return [n.x, n.z];

    const a0 = d > 0.01 ? Math.atan2(dx, dz) : loc.rot;
    let fallback = null;
    for (const out of [reach + 5, reach + 11, reach + 20, reach + 34, reach + 52]) {
      for (let k = 0; k < 12; k++) {
        // the original bearing first, then fan out either side of it
        const turn = ((k + 1) >> 1) * (Math.PI / 6) * (k % 2 ? 1 : -1);
        const a = a0 + turn;
        const ox = loc.pos[0] + Math.sin(a) * out;
        const oz = loc.pos[1] + Math.cos(a) * out;
        if (!fallback && !inside(ox, oz)) fallback = [ox, oz];
        const m = near(ox, oz);
        if (m && !inside(m.x, m.z)) return [m.x, m.z];
      }
    }
    // no road node anywhere outside it: the kerb itself beats the sanctum
    return fallback || [loc.pos[0] + Math.sin(a0) * (reach + 5),
      loc.pos[1] + Math.cos(a0) * (reach + 5)];
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
    /*
     * The HIPS go on the seat. The player's root is the soles of a standing
     * body, and sitting folds the legs without lowering the hips, so putting
     * the root 0.62 m up sat the hips at 1.5 m and the head through the roof.
     * Each vehicle says where a passenger's hips are (CrowdSystem `seat`).
     */
    const seat = (this.vehicle && this.vehicle.seat) || 0.78;
    const hips = ctx.player.bones && ctx.player.bones.hips ? ctx.player.bones.hips.position.y : 0.92;
    ctx.player.position.set(sx, y + seat - hips, sz);
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
    // the one-shot camera aim, fired the moment he is really rolling
    this._aimCameraAtTravel(ctx, car, r);

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

    /*
     * How long this ride has been going.
     *
     * `t` was in the ride record from the day it was written and NOTHING EVER
     * ADVANCED IT, so it sat at zero for the whole journey. Nothing read it
     * either, which is why it went unnoticed — until the ETA started measuring
     * the ride's real average speed, at which point a clock stuck at zero meant
     * the measurement never began and the quoted minutes stayed the fiction
     * they had always been.
     */
    r.t += dt;
    // ...and how long the passenger has sat through it: the world's time over
    // the rate it is being shown at, which is also asserted here every frame,
    // so whatever else has touched the clock, a ride in progress runs at its own
    const lapse = this._lapse(r);
    r.real += dt / lapse;
    ctx.timeScale = lapse;

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

    // Last resort: put him back on his own route.
    //
    // The steering above is a real improvement — measured, it holds 26 m/s down
    // Bhaktivedanta Swami Marg and follows the road rather than the straight
    // line through it. But a vehicle that steers can also WEDGE, and a wedged
    // rickshaw is worse than one that clips a wall: it moves, it turns, it
    // covers no ground, and the journey never ends. Measured at Chhatikara it
    // drove 198 m cleanly and then sat at 2.6 m/s against something for the
    // rest of the ride.
    //
    // So once he has genuinely tried — written off waypoints, tried to get
    // round, been given a fresh route — he is simply placed back on the line he
    // was driving and carries on. It is a small cheat, once, at the one moment
    // the alternative is a passenger stranded for ever. Getting there matters
    // more than the last four metres of it looking right.
    if (r.lost > UNWEDGE_S) {
      r.lost = 0; r.stall = 0; r.skips = 0;
      const i = Math.min(last, r.i + 1);
      car.x = pts[i][0];
      car.z = pts[i][1];
      car.y = ctx.world.groundHeight(car.x, car.z);
      car.vel = 0;
      if (i < last) car.yaw = Math.atan2(pts[i + 1][0] - car.x, pts[i + 1][1] - car.z);
      r.i = i; r.was = i;
      r.unwedged = (r.unwedged || 0) + 1;
      // if it keeps happening the route itself is wrong, so stop pretending
      if (r.unwedged > UNWEDGE_MAX) { this._finish(); return; }
      return;
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

    /*
     * What he is ACTUALLY making, as opposed to what was planned.
     *
     * The plan is the road's own (`r.after`), but the road does not care about
     * plans: traffic stops him, a cow stands in the gali, and the measured
     * average comes in under it. Reported once exactly that way — "it's been
     * 1 min but not yet reached iskcon temple as it showed erlier" — so the
     * ride measures itself, and everything that talks about time uses the
     * measurement as soon as there is one.
     */
    /*
     * And the five-minute promise is kept rather than assumed — by the RATE.
     *
     * If the measured ride says it will run past RIDE_MAX_S of the passenger's
     * time, the time-lapse is raised, a little at a time, up to CATCHUP_MAX;
     * once comfortably inside it, it eases back. The vehicle's speed is never
     * touched: that was the 94 km/h. Kept apart from `paceMult` on purpose,
     * because jaldi is the passenger asking and the ride bar reports it, and
     * it would be dishonest to show a jaldi nobody asked for — the rate it
     * shows is the rate it runs, catching up or not.
     */
    if (r.mps && r.t > 20) {
      const projected = r.real + (r.total - r.metres) / Math.max(0.5, r.mps) / lapse;
      const need = projected / RIDE_MAX_S;
      /*
       * ...and eases off again once he is comfortably inside it, rather than
       * keeping the extra for the rest of the journey — which once made a ride
       * quoted at seven minutes take under three. Letting it decay means the
       * ride SETTLES near the budget instead of overshooting it, and the
       * countdown agrees with the ride because both describe the same thing.
       *
       * Paced in the PASSENGER's seconds, at most 4% a second up and 10% down.
       * It was 2% a step, and a step was a thirtieth of a second when the
       * world ran at one speed; under a time-lapse of x5 that is a hundred and
       * fifty steps a second, and a crawl out of a busy crossing put the rate
       * from x5 to x6.7 before the ride had properly begun. Nor does it start
       * before the measurement has settled (`r.t > 20`, the same twenty
       * seconds of the town's time the measurement leans on the plan for).
       */
      const dReal = dt / lapse;
      const now = r.catchup || 1;
      r.catchup = need > 1.02
        ? Math.min(CATCHUP_MAX, now * (1 + Math.min(0.04, (need - 1) * 0.2) * dReal))
        : need < 0.9 ? Math.max(1, now * (1 - 0.1 * dReal)) : now;
    }

    // what the road allows here and ahead, at what he has been asked for, and
    // never past what the vehicle can do at all
    let want = pathLimit(pts, r.i, car.x, car.z, prof, topSpeed(this.vehicle && this.vehicle.id), r.roadAt);

    // and he pulls up rather than arriving at speed
    if (r.i >= last - NEARLY_THERE) {
      want = Math.min(want, Math.sqrt(2 * prof.brake * Math.max(0.6, dEnd)));
    }

    const made = driveStep(car, dt, ctx, wantYaw, want, prof);
    if (made > 0) r.metres += made;

    /*
     * What he is making NOW, rather than what he has averaged since the start.
     *
     * The whole-ride average is pessimistic for the first minute, because it
     * still carries the standing start and the slow crawl out of wherever you
     * hailed him: measured, at 40 s into the Chhatikara run it quoted four
     * minutes for a stretch that took two and a half. An exponential average
     * over about fifteen seconds forgets the start without being jumpy.
     *
     * Floored against the whole-ride average so a red light or a cow does not
     * send the quoted time to infinity for as long as he is stopped — which is
     * the failure mode of quoting instantaneous speed, and is worse than being
     * a minute out.
     */
    const inst = made > 0 ? made / Math.max(1e-3, dt) : 0;
    const k = Math.min(1, dt / EMA_TAU);
    r.ema += (inst - r.ema) * k;
    /*
     * Bias correction. An exponential average started at zero reads about half
     * the true speed one time-constant in, and the countdown divides by it: ten
     * seconds into the Chhatikara run that produced a quote of SIXTEEN minutes
     * for a ride that took three. Dividing by the accumulated weight removes
     * the bias from the very first frame, which is the same trick Adam uses on
     * its moment estimates and for the same reason.
     */
    r.emaW += (1 - r.emaW) * k;
    const recent = r.ema / Math.max(1e-3, r.emaW);
    const avg = r.t > 1.5 ? r.metres / r.t : 0;

    /*
     * And for the first twenty seconds, trust the PLAN.
     *
     * Not out of optimism: for the first few seconds he is genuinely still
     * accelerating out of a standing start, so no measurement of what he has
     * done so far describes the journey. The road's own answer for the rest of
     * it is the best evidence there is until there is some. It fades out as
     * the measurement arrives.
     */
    const planned = Math.max(0, r.total - r.metres) / Math.max(1, this._plannedRest(r));
    const warm = Math.min(1, r.t / 20);
    r.mps = Math.max(0.5,
      warm * Math.max(recent, avg * 0.6) + (1 - warm) * planned);
    car.y = ctx.world.groundHeight(car.x, car.z);

    this._seat(ctx, car);
    this._updateRideHud(ctx);
    // he talks in the passenger's time, not the world's: at x8 a line every
    // 22 s of the world would be one every three seconds of yours
    if (this.talk) this.talk.update(dt / lapse, r);

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

    // you cannot steer a time-lapse: the world goes back to its own pace
    ctx.timeScale = 1;
    this.drive = { car, d, metres: 0, kind: null, kindT: 0 };

    // put yourself in it, facing the way it faces
    car.x = ctx.player.position.x;
    car.z = ctx.player.position.z;
    this._seat(ctx, car);
    this._freeze(ctx, true);

    // the destination stays visible as a guide and nothing more
    if (d && d.loc) ctx.bus.emit('nav:destination', { loc: d.loc });

    const rig = ctx.cameraRig;
    if (rig && rig.setDistance) rig.setDistance(DRIVE_CAM);
    if (this.drive) this.drive.aimCam = true;
    // the phone can steer too, but iOS only grants the sensor from a real tap
    // and this is one. A refusal is silent: the buttons still work.
    if (this.tilt && ctx.state.settings.tiltSteer !== false) {
      this.tilt.enable().then((ok) => { if (ok) this.tilt.recentre(); });
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
    /*
     * And the phone itself. `update` is given what the controls are asking for
     * and returns nothing while they are being used, so a lean can never fight
     * a thumb — it only has the wheel when nobody else does.
     */
    if (this.tilt && ctx.state.settings.tiltSteer !== false) {
      const lean = this.tilt.update(dt, steer);
      if (lean) steer = lean;
    }
    steer = clamp(steer, -1, 1);
    throttle = clamp(throttle, -1, 1);

    /*
     * The road under you, read four times a second rather than every frame:
     * a plain press gives this vehicle's own pace for it, jaldi leans that
     * toward the road's most, and RUN opens it right up to the vehicle's own
     * ceiling (see "Driving it yourself" above REVERSE_MULT).
     */
    dr.kindT -= dt;
    if (dr.kindT <= 0) {
      dr.kindT = 0.25;
      dr.kind = roadKindAt(ctx.nav, car.x, car.z, Math.sin(car.yaw), Math.cos(car.yaw)) || dr.kind || 'street';
    }
    const type = this.vehicle && this.vehicle.id;
    const easy = asked(speedOn(type, dr.kind || 'street'), dr.paceMult || 1, PACE_MAX);
    const top = input && input.running ? topSpeed(type) : easy;
    const want = throttle >= 0
      ? top * throttle
      : easy * throttle * REVERSE_MULT;

    // steering is lock, not a bearing: holding it over keeps turning, which is
    // how a handle works and what the grip limit in VehicleDrive expects
    const made = driveStep(car, dt, ctx, car.yaw + steer * STEER_LOCK, want, DRIVEN);
    this._aimCameraAtTravel(ctx, car, dr);
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
