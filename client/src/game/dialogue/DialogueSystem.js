/**
 * DialogueSystem — talking to people.
 *
 * A town you can only walk past is scenery. A town where you can stop anyone
 * and hear something is a place. Pokemon gets almost all of its warmth from
 * this one mechanic, and it costs almost nothing.
 *
 * Lines are written per archetype and drawn from a seeded shuffle, so the same
 * sadhu says the same thing each time you meet him — people are consistent,
 * which is what makes them feel like people rather than a random generator.
 */

import * as THREE from 'three';
import { CROWD } from '../../content/tuning.js';
import { rngAt } from '../../engine/math/Random.js';
import { formatDistance } from '../../engine/math/MathUtils.js';
import { bearingFromVector, compassLabel } from '../../engine/math/Geo.js';

const _t = new THREE.Vector3();

const TALK_RANGE = 3.6;
/**
 * How far you can get from whoever you are talking to before the conversation
 * ends. Generous enough that shuffling on the spot does not cut someone off
 * mid-sentence, short enough that you cannot be in a different lane.
 */
const TALK_RANGE_OUT = CROWD.talkRangeOut;

/** Seconds between two bump remarks, whoever makes them. */
const BUMP_GAP_S = CROWD.bumpGapSeconds;

/** How many remarks a single crowded stretch is allowed before people stop minding. */
const BUMP_RUN_MAX = CROWD.bumpRunMax;

/** Quiet for this long and the run resets, so a new street starts fresh. */
const BUMP_RUN_FORGET_S = CROWD.bumpRunForgetSeconds;

/** How long one person stays disinclined to say it again. */
const BUMP_FORGIVE_MS = CROWD.bumpForgiveMs;

const CHAR_MS = 22;          // typewriter speed

/** What each kind of person has to say. */
const LINES = {
  /*
   * The people who have SAT DOWN.
   *
   * A gathering was scenery: you could walk into the middle of a kirtan and
   * nobody in it could be spoken to, because `nearestSpeakable` only scanned
   * the walking crowd. But a gathering is the thing that makes this town feel
   * like Vrindavan rather than a town of commuters, and being unable to say
   * anything to the one group of people who are not going anywhere was the
   * wrong way round.
   *
   * They do not stop what they are doing. Nobody gets up, nobody turns to face
   * you, the sway carries on — they answer without breaking off, which is what
   * actually happens if you speak to someone in a kirtan. Kept short for the
   * same reason.
   */
  yajna: [
    ['Baithiye. There is room.', 'It is a havan for the whole lane. No fee, no list.'],
    ['Aahuti do — ghee and samagri, that is all it takes.'],
    ['The fire has been going since morning. Somebody always feeds it.'],
    ['Hands over the smoke first. Then the head.'],
  ],
  kirtan: [
    ['Bas naam lijiye. Nothing else is needed here.'],
    ['Taali bajaiye. You will pick up the beat.'],
    ['We sit here most evenings. Anyone may join.'],
    ['Hare Krishna. Baithiye, baithiye.'],
  ],
  katha: [
    ['Shhh — thodi der. He is in the middle of it.'],
    ['Dashama skandha chal raha hai. The tenth canto.'],
    ['Sit at the back if you are late. Nobody minds.'],
    ['He has been on this one chapter three days.'],
  ],
  pilgrim: [
    ['Radhe Radhe.', 'First time in Vrindavan? Do the parikrama. Ten kilometres, and you will not regret one of them.'],
    ['We came from Kolkata. Third year running.'],
    ['Banke Bihari ji ka darshan ho gaya? The curtain closes every few minutes, so keep looking.'],
    ['The evening aarti at Keshi Ghat — do not miss it.'],
  ],
  sadhu: [
    ['Jai Shri Radhe.', 'You are walking. That is good. The Dham gives itself to those who walk it.'],
    ['I have been here forty years. I still find lanes I have not seen.'],
    ['Do not hurry. Nothing here rewards hurry.'],
    ['Take the dust of this place on your head. It is older than all of us.'],
  ],
  sari: [
    ['Radhe Radhe, beta.'],
    ['The flower sellers near Loi Bazar give a better garland. Tell them I sent you.'],
    ['Careful of the monkeys near Nidhivan. Hold your glasses.'],
  ],
  sari2: [
    ['Radhe Radhe.'],
    ['You are going to the temple? Go now, before the rush.'],
    ['Have you eaten? There is good kachori in the bazaar.'],
  ],
  widow: [
    ['Radhe Radhe.'],
    ['I sing at the bhajan ashram in the mornings. Come if you like.'],
    ['This town looks after us. That is more than most places do.'],
  ],
  shopkeeper: [
    ['Aaiye, aaiye. Garlands, peda, poshak — everything.'],
    ['Fresh marigold today. Bihari ji likes marigold.'],
    ['Brass, bell metal, all here. Take your time.'],
  ],
  child: [
    ['Radhe Radhe!'],
    ['Did you see the cows? That brown one is mine.'],
    ['Can you run? I can run faster.'],
  ],
  priest: [
    ['Radhe Radhe. Aarti is at six.'],
    ['Leave your shoes outside, please.'],
    ['You may offer a flower. Bring it in your right hand.'],
  ],
  porter: [
    ['Radhe Radhe. Mind your back, coming through.'],
    ['Twenty kilos to the ghat and back. Every day.'],
  ],
  driver: [
    ['Kahan jaana hai? Baith jaiye.'],
    ['Anywhere in Vrindavan. Fixed rate, no haggling.'],
  ],
};

/**
 * What people say when you walk into them. Escalating, because the third time
 * is not the first time — but it never becomes a fight. This is Vrindavan; the
 * worst that happens is that someone is short with you and walks on.
 */
const BUMP_LINES = {
  first: [
    'Arre — dekh ke chaliye.',
    'Careful, beta.',
    'Oof! Mind your step.',
    'Radhe Radhe... and watch where you are going.',
  ],
  again: [
    'Aap phir se? Why do you keep coming in my way?',
    'Bhai sahab, the whole road is empty.',
    'Please. I am also trying to walk.',
  ],
  persistent: [
    'Bas karo na. Jaiye, apna raasta dekhiye.',
    'Enough now. Go your way, I will go mine.',
    'Is this a game to you? Go on.',
  ],
  vehicle: [
    'Horn bajaya tha! Side mein ho jaiye.',
    'Arre bhai, sadak par dhyan do.',
    'Hatt jao — I cannot stop so quickly.',
  ],
};

export class DialogueSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = null;
    this.target = null;
    this._acc = 0;
    this._page = 0;
    this._typed = 0;
    this._pages = null;

    this._build();
    this._off = [
      ctx.bus.on('input:interact', ({ id } = {}) => { if (id === 'talk') this.start(); }),
      ctx.bus.on('ui:screen', ({ name }) => { if (name !== 'world') this.close(); }),
      ctx.bus.on('input:tap', () => { if (this.active) this.advance(); }),
    ];
  }

  /* ---------------- the box ---------------- */
  _build() {
    const el = document.createElement('div');
    el.id = 'dialogue-box';
    el.className = 'ui-interactive';
    el.style.cssText = [
      'position:fixed', 'left:12px', 'right:12px',
      'bottom:calc(14px + env(safe-area-inset-bottom,0px))',
      'z-index:68', 'display:none', 'padding:16px 18px 14px',
      'border-radius:16px',
      'background:linear-gradient(180deg,#f8f0dc,#ead9ba)',
      'border:2px solid #b8873b',
      'box-shadow:0 10px 34px rgba(0,0,0,.4)',
      'max-width:560px', 'margin:0 auto', 'cursor:pointer',
    ].join(';');
    el.innerHTML = `
      <div id="dlg-who" style="font:500 10.5px/1 Jost,system-ui,sans-serif;letter-spacing:.2em;
           text-transform:uppercase;color:#b8873b;margin-bottom:7px"></div>
      <div id="dlg-text" style="font:400 16px/1.62 Spectral,Georgia,serif;color:#2b1d14;
           min-height:3.3em"></div>
      <div id="dlg-more" style="text-align:right;font-size:13px;color:#b8873b;margin-top:4px;
           opacity:0">&#9662;</div>
      <div id="dlg-choices" style="display:none;flex-direction:column;gap:7px;margin-top:12px"></div>`;
    document.body.appendChild(el);
    this.box = el;
    this.who = el.querySelector('#dlg-who');
    this.text = el.querySelector('#dlg-text');
    this.more = el.querySelector('#dlg-more');
    this.choices = el.querySelector('#dlg-choices');
    el.addEventListener('click', () => this.advance());
  }

  /* ---------------- flow ---------------- */
  start() {
    if (this.active || !this.target) return;
    const a = this.target;
    /*
     * Who is this, for the purpose of what they say?
     *
     * A person sitting in a gathering is identified by WHAT THEY ARE DOING
     * rather than by their archetype — a widow at a kirtan has more to say
     * about the kirtan than about being a widow, and it is the gathering you
     * walked into. `_targetGathering` is set alongside `_targetKind` when the
     * speakable came from `GatheringSystem`.
     */
    const kind = this._targetKind === 'driver' ? 'driver'
      : this._targetKind === 'gathering' ? (this._targetGathering || 'kirtan')
        : (a.archetype || 'pilgrim');
    const set = LINES[kind] || LINES.pilgrim;

    // a person says the same thing every time you meet them
    const rng = rngAt('talk-' + Math.round(a.x * 7) + '-' + Math.round(a.z * 7));
    this.kind = kind;
    this._choosing = false;
    this.choices.style.display = 'none';
    this._pages = set[Math.floor(rng() * set.length) % set.length];
    this._page = 0;
    this._typed = 0;
    this.active = a;

    a.idle = 6;
    a.greeting = 5;
    a.greetYaw = Math.atan2(this.ctx.player.position.x - a.x, this.ctx.player.position.z - a.z);

    this.who.textContent = NAMES[kind] || 'A passer-by';
    this.text.textContent = '';
    this.more.style.opacity = '0';
    this.box.style.display = 'block';
    if (this.ctx.input) this.ctx.input.setEnabled(false);
    this.ctx.bus.emit('ui:prompt:clear', { id: 'talk' });
    this.ctx.bus.emit('haptic', { pattern: 'tick' });
  }

  advance() {
    if (!this.active || this._choosing) return;
    const full = this._pages[this._page] || '';
    if (this._typed < full.length) { this._typed = full.length; this.text.textContent = full; this._showMore(); return; }
    this._page++;
    if (this._page >= this._pages.length) { this._showChoices(); return; }
    this._typed = 0;
    this.text.textContent = '';
    this.more.style.opacity = '0';
  }

  /**
   * What do you want? Ending every exchange in a question is what turns a line
   * of flavour text into an actual conversation — and it is where the rickshaw,
   * the pranam and asking directions all hang off.
   */
  _showChoices() {
    const ctx = this.ctx;
    const a = this.active;
    if (!a) return;
    this._choosing = true;
    this.more.style.opacity = '0';

    const opts = [];
    if (this.kind === 'driver') {
      opts.push({ label: 'Where can you take me?', go: () => { this.close(); if (ctx.rickshaw) ctx.rickshaw.openDialog(); } });
    }
    opts.push({ label: 'Pranam', go: () => this._pranam() });
    opts.push({ label: 'Dandvat pranam', go: () => this._pranam(true) });
    opts.push({ label: 'Which way to a temple?', go: () => this._directions() });
    opts.push({ label: 'Nothing, thank you', go: () => this.close() });

    this.choices.innerHTML = '';
    this.choices.style.display = 'flex';
    for (const o of opts) {
      const b = document.createElement('button');
      b.className = 'ui-interactive';
      b.textContent = o.label;
      b.style.cssText = [
        'width:100%', 'text-align:left', 'padding:11px 14px', 'border-radius:11px',
        'background:rgba(255,255,255,.52)', 'border:1px solid rgba(43,29,20,.12)',
        'font:400 14.5px/1.3 Spectral,Georgia,serif', 'color:#2b1d14', 'cursor:pointer',
      ].join(';');
      b.addEventListener('click', (e) => { e.stopPropagation(); o.go(); });
      this.choices.appendChild(b);
    }
  }

  /**
   * @param {boolean} full  dandvat — flat on the ground, rather than standing
   *
   * Two different acts, not two sizes of one. A standing pranam is a greeting
   * you give a person you have just met; dandvat is going down full length
   * like a stick, which is what `danda` means, and it is offered to the
   * Deities, at a threshold, and to a Vaishnava.
   *
   * NOTHING IS COUNTED for the dandvat. The standing greeting keeps its
   * tally because it always had one, but a prostration with a score attached
   * is the exact thing the brief rules out — "don't gamify devotion" — and a
   * number going up would be the first thing anyone looked at.
   */
  async _pranam(full = false) {
    const ctx = this.ctx;
    const a = this.active;
    this.close();
    if (!a || !ctx.player) return;
    _t.set(a.x, ctx.player.position.y, a.z);
    a.greeting = full ? 7 : 3;
    a.greetYaw = Math.atan2(ctx.player.position.x - a.x, ctx.player.position.z - a.z);
    try {
      await ctx.player.faceTowards(_t, 0.3);
      await ctx.player.playAction(full ? 'dandvat' : 'namaste');
      ctx.bus.emit('haptic', { pattern: 'soft' });
      if (full) {
        ctx.bus.emit('ui:toast', { title: 'Dandvat pranam', sub: 'दण्डवत् प्रणाम' });
      } else {
        ctx.state.greetings = (ctx.state.greetings || 0) + 1;
        ctx.save.write();
        ctx.bus.emit('ui:toast', { title: 'Radhe Radhe', sub: 'राधे राधे' });
      }
    } catch { /* interrupted */ }
  }

  /** Someone who lives here will always point you somewhere. */
  _directions() {
    const ctx = this.ctx;
    const p = ctx.player.position;
    // the nearest place you have NOT found yet, so the answer is always useful
    let best = null, bestD = Infinity;
    for (const loc of ctx.data.LOCATIONS) {
      if (loc.type === 'landmark' || loc.type === 'market') continue;
      if (ctx.state.discovered.has(loc.id)) continue;
      const d = Math.hypot(loc.pos[0] - p.x, loc.pos[1] - p.z);
      if (d < bestD) { bestD = d; best = loc; }
    }
    if (!best) {
      for (const loc of ctx.data.LOCATIONS) {
        if (loc.type !== 'temple') continue;
        const d = Math.hypot(loc.pos[0] - p.x, loc.pos[1] - p.z);
        if (d > 60 && d < bestD) { bestD = d; best = loc; }
      }
    }
    if (!best) { this.close(); return; }

    const bearing = compassLabel(bearingFromVector(best.pos[0] - p.x, best.pos[1] - p.z));
    const name = best.name.replace(/^Shri\s+/, '');
    this._pages = [
      'That way — ' + bearing + ', about ' + formatDistance(bestD) + '.',
      ctx.state.discovered.has(best.id)
        ? 'You know it already. ' + name + '.'
        : 'Keep walking and you will come to ' + name + '.',
    ];
    this._page = 0;
    this._typed = 0;
    this._choosing = false;
    this.choices.style.display = 'none';
    this.text.textContent = '';
    if (ctx.map && ctx.map.setDestination) ctx.map.setDestination(best.id);
  }

  _showMore() {
    this.more.textContent = this._page < this._pages.length - 1 ? '▾' : '✕';
    this.more.style.opacity = '1';
  }

  close() {
    if (!this.active) return;
    this.active = null;
    this._pages = null;
    this._choosing = false;
    this.choices.style.display = 'none';
    this.box.style.display = 'none';
    if (this.ctx.input) this.ctx.input.setEnabled(true);
  }

  /* ---------------- frame ---------------- */
  update(dt, ctx) {
    if (this.active) {
      // Walking away ends the conversation. Nothing used to close it but
      // reaching the last page or changing screen, so a dialogue that was
      // interrupted any other way stayed on screen over an empty street, with
      // input still disabled. The speaker is a crowd person and can wander off
      // by themselves, so the check has to run every frame rather than once.
      const a = this.active;
      if (a && a.x !== undefined && ctx.player) {
        const p = ctx.player.position;
        if (Math.hypot(a.x - p.x, a.z - p.z) > TALK_RANGE_OUT) { this.close(); return; }
      }

      const full = this._pages[this._page] || '';
      if (this._typed < full.length) {
        this._typed = Math.min(full.length, this._typed + Math.max(1, Math.round(dt * 1000 / CHAR_MS)));
        this.text.textContent = full.slice(0, this._typed);
        if (this._typed >= full.length) this._showMore();
      }
      return;
    }

    // A bump gets a spoken reaction — but only when you walked into them.
    //
    // This used to fire on any contact, on a 2.6 s cooldown, and forgive each
    // person after six seconds. Standing still in a busy lane, where the crowd
    // flows around and through you, that produced "apna rasta dekhiye" over
    // and over for as long as you stood there: a different one of the 196
    // people every couple of seconds, and the same ones again six seconds
    // later. Nobody in Vrindavan behaves like that.
    //
    // Now: you have to be moving, the gap between remarks is long, a person
    // who has spoken stays quiet for a good while, and a run of them dies down
    // on its own — people get used to you.
    this._bumpCool = Math.max(0, (this._bumpCool || 0) - dt);
    this._bumpRunCool = Math.max(0, (this._bumpRunCool || 0) - dt);
    if (this._bumpRunCool <= 0 && this._bumpRun) this._bumpRun = 0;

    const moving = ctx.player && (ctx.player._speed === undefined || ctx.player._speed > 0.35);
    if (ctx.crowd && moving && this._bumpCool <= 0 && (this._bumpRun || 0) < BUMP_RUN_MAX) {
      const who = this._recentBump(ctx);
      if (who && who.agent !== this._lastBumped) {
        this._bumpCool = BUMP_GAP_S;
        this._bumpRun = (this._bumpRun || 0) + 1;
        this._bumpRunCool = BUMP_RUN_FORGET_S;
        this._lastBumped = who.agent;
        this._sayBump(ctx, who);
      }
    }

    this._acc += dt;
    if (this._acc < 0.35) return;
    this._acc = 0;

    const p = ctx.player && ctx.player.position;
    if (!p || !ctx.crowd || !ctx.crowd.peopleInst) return;

    const found = ctx.crowd.nearestSpeakable
      ? ctx.crowd.nearestSpeakable(p.x, p.z, TALK_RANGE)
      : null;

    const had = !!this.target;
    this.target = found ? found.agent : null;
    this._targetKind = found ? found.kind : null;
    this._targetGathering = found && found.gKind ? found.gKind : null;
    if (found && !had) {
      ctx.bus.emit('ui:prompt', {
        id: 'talk',
        label: found.kind === 'driver' ? 'Talk to driver'
          : found.kind === 'gathering' ? 'Talk to them' : 'Talk',
        key: 'T',
      });
    } else if (!found && had) ctx.bus.emit('ui:prompt:clear', { id: 'talk' });
  }

  /** Someone who has just been walked into. */
  _recentBump(ctx) {
    for (const slot of ctx.crowd.peopleInst) {
      for (const a of slot.agents) {
        if (a.bumped && !a.bumpSpoken) { a.bumpSpoken = true; return { kind: 'person', agent: a }; }
      }
    }
    for (const slot of ctx.crowd.vehicleInst) {
      for (const a of slot.agents) {
        if (a.bumped && !a.bumpSpoken) { a.bumpSpoken = true; return { kind: 'vehicle', agent: a }; }
      }
    }
    return null;
  }

  /** A single line over their head, and they step around you. */
  _sayBump(ctx, who) {
    const a = who.agent;
    const n = a.bumped || 1;
    const set = who.kind === 'vehicle' ? BUMP_LINES.vehicle
      : n > 5 ? BUMP_LINES.persistent
      : n > 2 ? BUMP_LINES.again
      : BUMP_LINES.first;
    const line = set[Math.floor(Math.random() * set.length)];

    // over THEIR head, not in the corner: a toast does not know where the
    // speaker is, so it stayed up long after you had walked away
    if (ctx.ui && ctx.ui.say) ctx.ui.say(line, a);
    else ctx.bus.emit('ui:toast', { title: line, sub: '' });
    ctx.bus.emit('haptic', { pattern: 'tick' });

    // they turn, say it, and go round you rather than through you
    a.idle = 1.4;
    a.greeting = 1.2;
    a.greetYaw = Math.atan2(ctx.player.position.x - a.x, ctx.player.position.z - a.z);
    a.target = null;

    // forgiven eventually, but not in six seconds — that is what made one
    // person able to scold you repeatedly while you stood in the same spot
    clearTimeout(a._bumpTimer);
    a._bumpTimer = setTimeout(() => {
      a.bumpSpoken = false;
      a.bumped = Math.max(0, (a.bumped || 1) - 1);
    }, BUMP_FORGIVE_MS);
  }

  dispose() {
    for (const off of this._off) off();
    if (this.box && this.box.parentElement) this.box.parentElement.removeChild(this.box);
  }
}

const NAMES = {
  pilgrim: 'A pilgrim', sadhu: 'A sadhu', sari: 'A woman of the town',
  sari2: 'A woman of the town', widow: 'A widow of Vrindavan',
  shopkeeper: 'A shopkeeper', child: 'A child', priest: 'A priest',
  porter: 'A porter', driver: 'A rickshaw driver',
  yajna: 'At the havan', kirtan: 'In the kirtan', katha: 'At the katha',
};
