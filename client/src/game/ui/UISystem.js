/**
 * UISystem — screens, HUD, story cards and settings.
 *
 * Operates only on the DOM index.html already provides. It never touches the
 * WebGL canvas, and the menu renders over the live world rather than a still.
 *
 * The copy rules are enforced here: no "level", "XP", "score", "unlock",
 * "reward", "achievement" or "streak" appears anywhere, and My Journey is
 * written as quiet prose about your own walk, never a comparison with anyone.
 */

/**
 * How long the place bar stays up after you arrive somewhere or ask for it.
 * Long enough to read twice, short enough that it is not furniture.
 */
const PLACE_SHOW_S = HUD.placeShowSeconds;

/** What to call each POI class under its name when you tap it. */
const POI_WORD = {
  temple: 'Mandir', food: 'Food', stay: 'Stay', service: 'Service',
  health: 'Health', green: 'Park', bazaar: 'Bazaar', sight: 'Worth seeing',
  water: 'Water', shop: 'Shop', other: 'Place',
};

import * as THREE from 'three';
import { HUD } from '../../content/tuning.js';
import { formatDistance } from '../../engine/math/MathUtils.js';

/** How far a spoken line follows its speaker before it is taken down. */
const SAY_RANGE = 22;
const _sayV = new THREE.Vector3();

const SCREENS = ['intro', 'menu', 'places', 'journey', 'settings', 'avatar', 'map'];

export class UI {
  constructor(ctx) {
    this.ctx = ctx;
    this.screen = null;
    this.el = {};
    this._toasts = [];
    this._promptEls = new Map();
    this._cardLoc = null;
    this._distAcc = 0;

    for (const id of [
      'screen-intro', 'screen-menu', 'screen-places', 'screen-journey', 'screen-settings',
      'screen-avatar', 'screen-map', 'hud', 'prompts', 'toasts', 'card', 'nav-readout',
      'nav-dist', 'nav-name', 'flower-count', 'flower-text', 'pari-bar', 'pari-km',
      'pari-fill', 'pari-next', 'places-list', 'journey-body', 'settings-body',
      'avatar-rows', 'intro-skip', 'btn-menu', 'btn-map', 'loading', 'load-note', 'touch-layer', 'world-zoom',
      'btn-vol', 'vol-pop', 'vol-master', 'vol-sfx', 'vol-mute', 'say-bubble',
      'place-readout', 'place-road', 'place-area', 'dpad', 'map-zoom', 'map-tap',
    ]) this.el[id] = document.getElementById(id);

    this._wireChrome();
    this._buildSettings();
    this._buildAvatar();
    this._wireEvents();
    this._wireHudToggles();
  }

  /* ================================================================
   * Chrome
   * ================================================================ */
  _wireChrome() {
    const go = (name) => this.show(name);

    document.querySelectorAll('[data-go]').forEach((b) => {
      b.addEventListener('click', () => {
        const t = b.dataset.go;
        if (t === 'parikrama') { this._startParikrama(); return; }
        go(t);
      });
    });
    document.querySelectorAll('[data-back]').forEach((b) => {
      b.addEventListener('click', () => this.show(this._returnTo || 'menu'));
    });

    if (this.el['btn-menu']) this.el['btn-menu'].addEventListener('click', () => this.show('menu'));
    if (this.el['btn-map']) this.el['btn-map'].addEventListener('click', () => this.show('map'));
    this._wireVolume();
    if (this.el['intro-skip']) this.el['intro-skip'].addEventListener('click', () => this._endIntro());

    window.addEventListener('keydown', (e) => {
      /*
       * A SHORTCUT MUST NOT FIRE WHILE SOMEONE IS TYPING.
       *
       * `m` toggles the map. The map screen has a search field. So typing the
       * name of any place with an m in it — Madan Mohan, Prem Mandir, Imli
       * Tala, Mathura, and the word "mandir" itself — threw you out of the
       * map on the first keystroke. Which is most of Vrindavan.
       *
       * InputManager has had `_isTyping` for exactly this since it was
       * written; this listener is a SECOND, independent one registered on
       * window by the UI, and it never got the guard. Two handlers for the
       * same key, one of them careful and one of them not.
       *
       * Escape still works while typing, because leaving a field you are
       * stuck in is the one shortcut you actively want there — but it blurs
       * the field rather than closing the whole screen, which is what every
       * other search box on a computer does.
       */
      const t = e.target;
      const typing = t && t.tagName
        && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'
          || t.tagName === 'SELECT' || t.isContentEditable === true);
      if (typing) {
        if (e.key === 'Escape') { e.stopPropagation(); t.blur(); }
        return;
      }

      if (e.key === 'Escape') this.show(this.screen === 'world' ? 'menu' : 'world');
      else if (e.key === 'm' || e.key === 'M') this.show(this.screen === 'map' ? 'world' : 'map');
      else if (e.key === 'Tab') { e.preventDefault(); this.show(this.screen === 'world' ? 'menu' : 'world'); }
    });
  }

  /**
   * The HUD should be dismissable. Tap the location bar or the radar to shrink
   * it; tap again to bring it back. Settings can hide either outright, for
   * anyone who wants nothing between them and the Dham.
   */
  /**
   * Sound, without leaving the world.
   *
   * `volume` and `sfxVolume` were already settings; there was simply no way to
   * reach them while a rickshaw bell was going off in your ear — you had to
   * open the menu, which pauses everything. One button on the HUD, two
   * sliders, and a mute that remembers what you had so unmuting puts it back.
   */
  _wireVolume() {
    const btn = this.el['btn-vol'], pop = this.el['vol-pop'];
    if (!btn || !pop) return;
    const st = this.ctx.state.settings;
    const master = this.el['vol-master'], sfx = this.el['vol-sfx'], mute = this.el['vol-mute'];

    const paint = () => {
      if (master) master.value = Math.round((st.volume ?? 0.7) * 100);
      if (sfx) sfx.value = Math.round((st.sfxVolume ?? 0.85) * 100);
      const off = (st.volume ?? 0.7) <= 0.001 && (st.sfxVolume ?? 0.85) <= 0.001;
      if (mute) { mute.classList.toggle('on', off); mute.textContent = off ? 'Sound is off' : 'Mute everything'; }
      btn.classList.toggle('muted', off);
      btn.innerHTML = off ? '&#128263;' : '&#9834;';
    };
    const apply = () => {
      // the engine reads settings.volume itself; sfx is passed
      if (this.ctx.audio && this.ctx.audio.setVolume) {
        this.ctx.audio.setVolume(st.volume, st.sfxVolume);
      }
      this.ctx.bus.emit('settings:changed', { volume: st.volume, sfxVolume: st.sfxVolume });
      if (this.ctx.save) this.ctx.save.write();
      paint();
    };

    btn.addEventListener('click', () => { pop.classList.toggle('show'); paint(); });
    if (master) master.addEventListener('input', () => { st.volume = master.value / 100; apply(); });
    if (sfx) sfx.addEventListener('input', () => { st.sfxVolume = sfx.value / 100; apply(); });
    if (mute) {
      mute.addEventListener('click', () => {
        const off = (st.volume ?? 0.7) <= 0.001 && (st.sfxVolume ?? 0.85) <= 0.001;
        if (off) { st.volume = this._preMute?.v ?? 0.7; st.sfxVolume = this._preMute?.s ?? 0.85; }
        else { this._preMute = { v: st.volume, s: st.sfxVolume }; st.volume = 0; st.sfxVolume = 0; }
        apply();
      });
    }
    // tapping the world closes it, the way every other popover here behaves
    if (this.el['touch-layer']) {
      this.el['touch-layer'].addEventListener('pointerdown', () => pop.classList.remove('show'));
    }
    paint();
  }

  /**
   * A line spoken over the speaker's head, which goes away when they do.
   *
   * These were system toasts, and a toast has no idea where the person who
   * said it is — so it sat in the corner long after you had walked off, which
   * is what you reported. Anchored to the speaker now: it follows them, and it
   * is taken down the moment they are too far, behind you, or quiet.
   */
  say(text, agent) {
    const el = this.el['say-bubble'];
    if (!el) return;
    el.textContent = text;
    el.classList.remove('fade');
    el.classList.add('show');
    this._say = { agent, until: 2.8 };
  }

  _updateSay(dt) {
    const el = this.el['say-bubble'];
    if (!el || !this._say) return;
    const s2 = this._say, a = s2.agent, ctx = this.ctx;
    s2.until -= dt;
    const p = ctx.player && ctx.player.position;
    const gone = !a || !p || Math.hypot(a.x - p.x, a.z - p.z) > SAY_RANGE;
    if (s2.until <= 0 || gone || this.screen !== 'world') {
      el.classList.add('fade');
      if (s2.until <= -0.25 || gone) { el.classList.remove('show'); this._say = null; }
      return;
    }
    // project the speaker's head to the screen
    const cam = ctx.camera;
    if (!cam) return;
    _sayV.set(a.x, (a.y || 0) + 1.9, a.z).project(cam);
    if (_sayV.z > 1) { el.classList.remove('show'); this._say = null; return; }  // behind you
    const w = window.innerWidth, h = window.innerHeight;
    el.style.left = `${((_sayV.x + 1) / 2) * w}px`;
    el.style.top = `${((1 - _sayV.y) / 2) * h}px`;
  }

  _wireHudToggles() {
    const s = this.ctx.state.settings;
    const bar = this.el['place-readout'];
    const mini = document.getElementById('minimap-wrap');
    this.miniWrap = mini;

    if (bar) {
      bar.classList.add('ui-interactive');
      bar.addEventListener('click', () => {
        s.hudPlaceMin = !s.hudPlaceMin;
        bar.classList.toggle('min', !!s.hudPlaceMin);
        this._placeHold = PLACE_SHOW_S;
        this._commit();
        this.ctx.bus.emit('haptic', { pattern: 'tick' });
      });
      bar.classList.toggle('min', !!s.hudPlaceMin);
    }

    if (mini) {
      mini.classList.add('ui-interactive');
      let holdTimer = null;
      let held = false;

      const startHold = (e) => {
        held = false;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          held = true;
          s.hudMapMin = !s.hudMapMin;
          mini.classList.toggle('min', !!s.hudMapMin);
          this._commit();
          this.ctx.bus.emit('haptic', { pattern: 'double' });
        }, 550);
        if (e) e.stopPropagation();
      };
      const endHold = (e) => {
        clearTimeout(holdTimer);
        if (!held) this.show('map');          // a tap opens the map
        if (e) e.stopPropagation();
      };

      mini.addEventListener('pointerdown', startHold);
      mini.addEventListener('pointerup', endHold);
      mini.addEventListener('pointerleave', () => clearTimeout(holdTimer));
      mini.addEventListener('pointercancel', () => clearTimeout(holdTimer));
      mini.addEventListener('contextmenu', (e) => e.preventDefault());
      mini.classList.toggle('min', !!s.hudMapMin);
    }
    this._applyHudVisibility();
    this._wireWorldTap();
    this._wireZoom();
  }

  /**
   * Buttons for the one thing pinch does that a D-pad cannot.
   *
   * Pinching works, but it needs two fingers and it fights the stick, and on a
   * phone held one-handed there is no way to pull back and see where you are.
   * Two buttons, top right, stepping the follow camera between its own limits.
   */
  _wireZoom() {
    const rig = this.ctx.cameraRig;
    if (!rig || !rig.setDistance) return;
    const step = (d) => {
      const now = rig.getDistance ? rig.getDistance() : 6.8;
      rig.setDistance(now + d);
      this.ctx.bus.emit('haptic', { pattern: 'tick' });
      const s2 = this.ctx.state.settings;
      if (s2) { s2.cameraDistance = rig.distUser; this._commit(); }
    };
    document.getElementById('wz-in')?.addEventListener('click', () => step(-1.4));
    document.getElementById('wz-out')?.addEventListener('click', () => step(1.4));
  }

  /**
   * Tap anything in the world and it tells you what it is.
   *
   * The readout answers "where am I" for wherever you are standing. This
   * answers "what is that" for whatever you pointed at, which is the question
   * you actually have when you can see a temple two streets away. It reads the
   * ground point under the finger, then names the nearest landmark, shop or
   * road to that point rather than to you.
   */
  _wireWorldTap() {
    /**
     * Listen on the touch layer, not the canvas.
     *
     * #touch-layer covers the whole screen above #gl — that is its job, it is
     * what the virtual stick and the look-drag read. A pointerup listener on
     * the canvas underneath therefore never fired for a real tap, which is why
     * tapping a temple named nothing however well the naming itself worked.
     */
    const canvas = document.getElementById('touch-layer') || document.getElementById('gl');
    if (!canvas || !this.ctx) return;

    let downX = 0, downY = 0, downT = 0;
    canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX; downY = e.clientY; downT = performance.now();
    });
    canvas.addEventListener('pointerup', (e) => {
      // a tap, not a drag and not a long press to look around
      if (performance.now() - downT > 320) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 14) return;
      if (this.screen !== 'world') return;
      const hit = this._groundAt(e.clientX, e.clientY);
      if (hit) this.nameAt(hit.x, hit.z);
    });
  }

  /** Where a screen point meets the ground plane, or null if it misses. */
  _groundAt(clientX, clientY) {
    const ctx = this.ctx;
    if (!ctx.camera || !ctx.canvas) return null;
    const r = ctx.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1,
    );
    const ray = this._ray || (this._ray = new THREE.Raycaster());
    ray.setFromCamera(ndc, ctx.camera);
    // the ground is near enough to y = 0 at this scale; a plane beats a mesh
    // intersection test against 18,000 buildings on every tap
    const plane = this._plane
      || (this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const out = this._hitPt || (this._hitPt = new THREE.Vector3());
    if (!ray.ray.intersectPlane(plane, out)) return null;
    const p = ctx.player ? ctx.player.position : { x: 0, z: 0 };
    // beyond a few hundred metres the ray is nearly parallel to the ground and
    // the hit point is meaningless
    if (Math.hypot(out.x - p.x, out.z - p.z) > 420) return null;
    return { x: out.x, z: out.z };
  }

  /**
   * Name whatever is at a world point and show it. Prefers a landmark, then a
   * named shop, then the road, because that is the order someone would answer
   * "what is that" standing in the same spot.
   */
  nameAt(x, z) {
    const ctx = this.ctx;
    const el = this.el['place-readout'];
    if (!el) return;

    let best = null, bestD = Infinity, kind = null;
    for (const loc of ctx.data.LOCATIONS) {
      const d = Math.hypot(loc.pos[0] - x, loc.pos[1] - z);
      if (d < Math.max(70, loc.radius * 1.8) && d < bestD) { bestD = d; best = loc; kind = 'loc'; }
    }
    if (!best) {
      for (const poi of ctx.data.POIS || []) {
        const d = Math.hypot(poi.pos[0] - x, poi.pos[1] - z);
        if (d < 42 && d < bestD) { bestD = d; best = poi; kind = 'poi'; }
      }
    }

    const info = ctx.world.placeName ? ctx.world.placeName(x, z) : null;
    if (best) {
      this.el['place-road'].textContent = best.name;
      this.el['place-area'].textContent = kind === 'loc'
        ? (best.hindi || best.deity || info?.area || '')
        : (POI_WORD[best.kind] || 'Place');
    } else if (info && (info.road || info.area)) {
      this.el['place-road'].textContent = info.road || info.area;
      this.el['place-area'].textContent = info.road ? info.area : '';
    } else {
      return;
    }
    this._lastRoad = null; this._lastArea = null;   // let the walk readout resume after
    this._placeHold = PLACE_SHOW_S;
    el.classList.add('show');
    ctx.bus.emit('haptic', { pattern: 'tick' });
  }

  _applyHudVisibility() {
    const s = this.ctx.state.settings;
    const bar = this.el['place-readout'];
    if (bar) bar.classList.toggle('off', s.showPlaceBar === false);
    if (this.miniWrap) this.miniWrap.classList.toggle('off', s.showMinimap === false);
  }

  _wireEvents() {
    const bus = this.ctx.bus;
    this._off = [
      bus.on('ui:toast', (t) => this.toast(t)),
      bus.on('ui:card', ({ loc }) => this.card(loc)),
      bus.on('ui:prompt', (p) => this.prompt(p)),
      bus.on('ui:prompt:clear', ({ id }) => this.clearPrompt(id)),
      bus.on('flower:picked', () => this._refreshFlower()),
      bus.on('flower:offered', () => this._refreshFlower()),
      bus.on('parikrama:progress', (p) => this._parikramaBar(p)),
      bus.on('parikrama:start', () => this.el['pari-bar'].classList.add('show')),
      bus.on('parikrama:stop', () => this.el['pari-bar'].classList.remove('show')),
      bus.on('parikrama:complete', () => this.el['pari-bar'].classList.remove('show')),
    ];
  }

  /* ================================================================
   * Screens
   * ================================================================ */
  show(name) {
    if (name === this.screen) return;
    if (name !== 'world' && this.screen === 'world') this._returnTo = 'world';
    else if (name === 'menu') this._returnTo = 'menu';

    for (const s of SCREENS) {
      const el = this.el[`screen-${s}`];
      if (el) el.classList.toggle('show', s === name);
    }
    this.el.hud.classList.toggle('show', name === 'world');
    /*
     * The screen, on the page, for anything that belongs to the world view
     * but lives outside #hud. The ride bar is one: it stayed up over the map
     * mid-ride and sat exactly on "Start from here", so the tap landed on the
     * ride bar and the button could not be pressed at all.
     */
    document.body.dataset.screen = name;
    if (this.el['touch-layer']) this.el['touch-layer'].classList.toggle('on', name === 'world');
    if (this.el.dpad) this.el.dpad.classList.toggle('on', name === 'world');
    this.closeCard();

    this.screen = name;
    this.ctx.bus.emit('ui:screen', { name });

    if (name === 'places') this._buildPlaces();
    if (name === 'journey') this._buildJourney();
    if (name === 'map' && this.ctx.map) this.ctx.map.openFull();
    else if (this.ctx.map && this.ctx.map.closeFull) this.ctx.map.closeFull();
    if (name === 'intro') this._playIntro();
    if (name === 'world') { this.hideLoading(); this._refreshFlower(); }
  }

  setLoading(pct, note) {
    if (this.el['load-note'] && note) this.el['load-note'].textContent = note;
  }

  hideLoading() {
    const el = this.el.loading;
    if (!el || el.classList.contains('gone')) return;
    el.classList.add('gone');
    setTimeout(() => { el.style.display = 'none'; }, 900);
  }

  /* ---------------- intro ---------------- */
  _playIntro() {
    this.hideLoading();
    const beats = this.el['screen-intro'].querySelectorAll('.beat');
    if (this.ctx.cameraRig && this.ctx.cameraRig.playIntroShot) this.ctx.cameraRig.playIntroShot(this.ctx);
    this._introTimers = [];
    beats.forEach((b, i) => {
      b.classList.remove('in');
      this._introTimers.push(setTimeout(() => b.classList.add('in'), i * 4000 + 400));
    });
    this._introTimers.push(setTimeout(() => this._endIntro(), beats.length * 4000 + 900));
  }

  _endIntro() {
    if (this._introTimers) { this._introTimers.forEach(clearTimeout); this._introTimers = null; }
    if (this.screen === 'intro') this.show('avatar');
  }

  /* ================================================================
   * HUD
   * ================================================================ */
  _refreshFlower() {
    const carried = this.ctx.player && this.ctx.player.carried;
    const el = this.el['flower-count'];
    if (!el) return;
    if (carried) {
      const k = this.ctx.data.FLOWER_KINDS[carried.kind];
      this.el['flower-text'].textContent = k ? k.name : carried.kind;
      el.classList.add('show');
    } else el.classList.remove('show');
  }

  _parikramaBar({ metres, total, pct, nextStop, onRoute }) {
    this.el['pari-bar'].classList.add('show');
    this.el['pari-km'].textContent = `${(metres / 1000).toFixed(2)} / ${(total / 1000).toFixed(2)} km`;
    this.el['pari-fill'].style.width = `${Math.min(100, pct * 100)}%`;
    this.el['pari-next'].textContent = !onRoute
      ? 'Return to the Parikrama Marg to continue'
      : nextStop ? `Next: ${nextStop.name} · ${nextStop.label}` : 'Walking the marg';
  }

  _startParikrama() {
    if (this.ctx.parikrama) this.ctx.parikrama.start();
    this.show('world');
  }

  /* ================================================================
   * Prompts, toasts, cards
   * ================================================================ */
  prompt({ id, label, hint, key }) {
    if (this._promptEls.has(id)) return;
    const b = document.createElement('button');
    b.className = 'prompt ui-interactive';
    b.innerHTML = `<span>${escape(label)}</span>${hint ? `<span class="k">${escape(hint)}</span>` : key ? `<span class="k">${key}</span>` : ''}`;
    b.addEventListener('click', (e) => { e.stopPropagation(); this.ctx.bus.emit('input:interact', { id }); });
    this.el.prompts.appendChild(b);
    this._promptEls.set(id, b);
  }

  clearPrompt(id) {
    const b = this._promptEls.get(id);
    if (!b) return;
    b.remove();
    this._promptEls.delete(id);
  }

  toast({ title, sub }) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<div class="t">${escape(title || '')}</div>${sub ? `<div class="s">${escape(sub)}</div>` : ''}`;
    this.el.toasts.appendChild(t);
    this._toasts.push(t);
    while (this._toasts.length > 2) { const old = this._toasts.shift(); old.remove(); }
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => { t.remove(); this._toasts = this._toasts.filter((x) => x !== t); }, 500);
    }, 3400);
  }

  card(loc) {
    if (!loc) return;
    this._cardLoc = loc;
    const listenable = !!(this.ctx.narration && this.ctx.narration.available);
    const story = loc.story || {};
    const c = this.el.card;
    c.innerHTML = `
      <div class="grip"></div>
      <div class="eyebrow">${escape(loc.type)}</div>
      <h3>${escape(loc.name)}</h3>
      <div class="hi">${escape(loc.hindi || '')}</div>
      <div class="body">
        <p>${escape(story.long || story.short || '')}</p>
        ${story.source ? `<div class="src">Source: ${escape(story.source)}</div>` : ''}
      </div>
      <div class="acts">
        <button class="ghost ui-interactive" data-card="close">Close</button>
        ${listenable ? '<button class="ghost ui-interactive" data-card="listen">Listen</button>' : ''}
        <button class="solid ui-interactive" data-card="walk">Walk here</button>
      </div>`;
    c.classList.add('show');
    c.querySelector('[data-card="close"]').addEventListener('click', () => this.closeCard());

    const listen = c.querySelector('[data-card="listen"]');
    if (listen) {
      listen.addEventListener('click', () => {
        const n = this.ctx.narration;
        if (n.speaking) { n.stop(); listen.textContent = 'Listen'; return; }
        // the Dham told aloud, for anyone who would rather be read to
        if (n.speak(loc, () => { listen.textContent = 'Listen'; })) {
          listen.textContent = 'Stop';
        }
      });
    }
    c.querySelector('[data-card="walk"]').addEventListener('click', () => {
      this.closeCard();
      if (this.ctx.map) this.ctx.map.setDestination(loc.id);
      this.show('world');
    });
  }

  closeCard() {
    if (this.ctx.narration) this.ctx.narration.stop();
    if (this.el.card) { this.el.card.classList.remove('show'); this.el.card.innerHTML = ''; }
    this._cardLoc = null;
  }

  /* ================================================================
   * Places
   * ================================================================ */
  _buildPlaces() {
    const list = this.el['places-list'];
    if (!list) return;
    const p = this.ctx.player ? this.ctx.player.position : { x: 0, z: 0 };
    const locs = this.ctx.data.LOCATIONS.slice().sort((a, b) => {
      const da = Math.hypot(a.pos[0] - p.x, a.pos[1] - p.z);
      const db = Math.hypot(b.pos[0] - p.x, b.pos[1] - p.z);
      return da - db;
    });

    list.innerHTML = '';
    for (const loc of locs) {
      const found = this.ctx.state.discovered.has(loc.id);
      const d = Math.hypot(loc.pos[0] - p.x, loc.pos[1] - p.z);
      const row = document.createElement('div');
      row.className = `place${found ? '' : ' locked'}`;
      row.innerHTML = `
        <div class="ico">${ICON[loc.icon] || '◈'}</div>
        <div class="txt">
          <div class="nm">${found ? escape(loc.name) : 'Not yet discovered'}</div>
          ${found ? `<div class="hi">${escape(loc.hindi || '')}</div>` : ''}
          ${found ? `<div class="sn">${escape((loc.story && loc.story.short) || '')}</div>` : ''}
          <div class="meta"><span>${formatDistance(d)}</span>${found ? '' : '<span>keep walking</span>'}</div>
        </div>`;
      if (found) {
        const btn = document.createElement('button');
        btn.className = 'walkbtn ui-interactive';
        btn.textContent = 'Walk here';
        btn.addEventListener('click', () => {
          if (this.ctx.map) this.ctx.map.setDestination(loc.id);
          this.show('world');
        });
        row.querySelector('.meta').appendChild(btn);
      }
      list.appendChild(row);
    }
  }

  /* ================================================================
   * My Journey — personal, informational, never comparative
   * ================================================================ */
  _buildJourney() {
    const el = this.el['journey-body'];
    if (!el) return;
    const s = this.ctx.state;
    const total = this.ctx.data.LOCATIONS.length;
    const found = s.discovered.size;
    const offered = s.offered.length;
    const laps = s.parikrama.laps || 0;
    const km = s.metresWalked / 1000;

    const lines = [];
    lines.push(km < 0.1
      ? 'You have just arrived in Vrindavan.'
      : `You have walked <b>${km.toFixed(2)} km</b> in Vrindavan.`);
    lines.push(found === 0
      ? 'You have not yet come across any of its places.'
      : `You have come across <b>${found}</b> of Vrindavan's <b>${total}</b> places.`);
    if (offered) lines.push(`You have offered <b>${offered}</b> ${offered === 1 ? 'flower' : 'flowers'}.`);
    if (s.pranams.length) lines.push(`You have offered pranam at <b>${s.pranams.length}</b> ${s.pranams.length === 1 ? 'place' : 'places'}.`);
    if (laps) lines.push(`You have completed the parikrama <b>${laps}</b> ${laps === 1 ? 'time' : 'times'}.`);
    else if (s.parikrama.metres > 100) lines.push(`You have walked <b>${(s.parikrama.metres / 1000).toFixed(2)} km</b> of the parikrama.`);

    el.innerHTML = lines.map((l) => `<p class="journey-line">${l}</p>`).join('')
      + `<div class="journey-close">This is only a picture of a place. If it has made you
         curious, the real Vrindavan is still there, and it is better.</div>`;
  }

  /* ================================================================
   * Settings
   * ================================================================ */
  _buildSettings() {
    const el = this.el['settings-body'];
    if (!el) return;
    const s = this.ctx.state.settings;
    el.innerHTML = '';

    const group = (title) => {
      const g = document.createElement('div');
      g.className = 'set-group';
      g.innerHTML = `<h3>${title}</h3>`;
      el.appendChild(g);
      return g;
    };

    const row = (g, label, hint) => {
      const r = document.createElement('div');
      r.className = 'set-row';
      r.innerHTML = `<label>${label}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
      g.appendChild(r);
      return r;
    };

    const slider = (g, label, key, min, max, step, hint) => {
      const r = row(g, label, hint);
      const i = document.createElement('input');
      i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = s[key];
      i.className = 'ui-interactive'; i.id = `set-${key}`;
      i.addEventListener('input', () => { s[key] = parseFloat(i.value); this._commit(); });
      r.appendChild(i);
    };

    const toggle = (g, label, key, hint) => {
      const r = row(g, label, hint);
      const t = document.createElement('button');
      t.className = `tgl ui-interactive${s[key] ? ' on' : ''}`;
      t.id = `set-${key}`;
      t.innerHTML = '<i></i>';
      t.addEventListener('click', () => {
        s[key] = !s[key];
        t.classList.toggle('on', s[key]);
        this._commit();
      });
      r.appendChild(t);
    };

    const segment = (g, label, key, options, hint) => {
      const r = row(g, label, hint);
      const seg = document.createElement('div');
      seg.className = 'seg';
      options.forEach(([val, text]) => {
        const b = document.createElement('button');
        b.className = `ui-interactive${s[key] === val ? ' sel' : ''}`;
        b.textContent = text;
        b.addEventListener('click', () => {
          s[key] = val;
          seg.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          this._commit();
          if (key === 'timeOfDay' && this.ctx.time) this.ctx.time.setPhase(val);
        });
        seg.appendChild(b);
      });
      r.appendChild(seg);
    };

    const g1 = group('Sound');
    slider(g1, 'Ambience', 'volume', 0, 1, 0.05);
    slider(g1, 'Effects', 'sfxVolume', 0, 1, 0.05);

    const g2 = group('Movement');
    slider(g2, 'Camera speed', 'sensitivity', 0.3, 2.5, 0.1);
    slider(g2, 'Walking speed', 'moveSpeed', 0.6, 1.8, 0.1);
    slider(g2, 'Camera further back', 'cameraDistance', 2.5, 12, 0.5,
      'Slide right to pull the camera back and see more of the street. Left brings it over the shoulder');
    toggle(g2, 'Invert look', 'invertY');
    toggle(g2, 'Tap to walk', 'tapToMove', 'Tap where you want to go instead of using the stick');

    const g3 = group('The Dham');
    segment(g3, 'Time of day', 'timeOfDay', [
      ['morning', 'Morning'], ['day', 'Day'], ['evening', 'Evening'], ['night', 'Night'],
    ]);

    const g35 = group('On screen');
    toggle(g35, 'Location bar', 'showPlaceBar', 'The street name at the top. Tap it to shrink it');
    toggle(g35, 'Radar', 'showMinimap', 'The small map. Tap it to shrink it');

    const g4 = group('Comfort');
    toggle(g4, 'Larger text', 'largeText');
    toggle(g4, 'Reduced motion', 'reduceMotion');
    toggle(g4, 'Vibration', 'haptics');
    segment(g4, 'Detail', 'quality', [
      ['auto', 'Auto'], ['low', 'Low'], ['mid', 'Medium'], ['high', 'High'],
    ], 'Lower detail runs smoother on older phones');

    // CC BY 4.0 (Open-Meteo) and ODbL (OpenStreetMap) both require the credit to
    // be shown, not just sat in a source file. Free use is only free if honoured.
    const g45 = group('Sources');
    const cred = document.createElement('p');
    cred.className = 'set-credit';
    cred.innerHTML = 'Map data &copy; OpenStreetMap contributors, ODbL 1.0.<br>'
      + 'Live weather by <span>Open-Meteo.com</span>, CC BY 4.0.<br>'
      + 'The Dham runs fully offline; live weather is an enhancement only.';
    g45.appendChild(cred);

    const g5 = group('Your journey');
    const r = row(g5, 'Reset my journey', 'Clears everything you have discovered');
    const btn = document.createElement('button');
    btn.className = 'walkbtn ui-interactive danger';
    btn.textContent = 'Reset';
    btn.style.background = '#c8452a';
    btn.addEventListener('click', () => {
      if (btn.dataset.confirm) {
        this.ctx.save.reset();
        window.location.reload();
      } else {
        btn.dataset.confirm = '1';
        btn.textContent = 'Tap again to confirm';
        setTimeout(() => { delete btn.dataset.confirm; btn.textContent = 'Reset'; }, 4000);
      }
    });
    r.appendChild(btn);
  }

  _commit() {
    const s = this.ctx.state.settings;
    this._applyHudVisibility();
    this.ctx.save.write();
    this.ctx.bus.emit('settings:changed', { settings: s });
  }

  /* ================================================================
   * Avatar
   * ================================================================ */
  _buildAvatar() {
    const el = this.el['avatar-rows'];
    if (!el) return;
    const opts = this.ctx.data.AVATAR_OPTIONS;
    const a = this.ctx.state.avatar;
    el.innerHTML = '';

    const chips = (label, key, items, asDot) => {
      const row = document.createElement('div');
      row.className = 'av-row';
      row.innerHTML = `<span>${label}</span>`;
      const box = document.createElement('div');
      box.className = 'chips';
      items.forEach((item, i) => {
        const b = document.createElement('button');
        b.className = `chip ui-interactive${asDot ? ' dot' : ''}${a[key] === i ? ' sel' : ''}`;
        if (asDot) b.style.background = item;
        else b.textContent = item.label || item;
        b.addEventListener('click', () => {
          a[key] = i;
          box.querySelectorAll('.chip').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          if (this.ctx.player) this.ctx.player.setAppearance(a);
          this.ctx.save.write();
        });
        box.appendChild(b);
      });
      row.appendChild(box);
      el.appendChild(row);
    };

    chips('Skin', 'skin', opts.skin, true);
    chips('Hair', 'hair', opts.hair);
    chips('Dress', 'cloth', opts.cloth);
    chips('Colour', 'clothColor', opts.clothColor, true);
    chips('Wearing', 'accessory', opts.accessory);

    const nameRow = document.createElement('div');
    nameRow.innerHTML = `<input id="av-name" class="ui-interactive" placeholder="Your name (optional)" value="${escape(a.name || '')}">`;
    el.appendChild(nameRow);
    nameRow.querySelector('input').addEventListener('input', (e) => {
      a.name = e.target.value.slice(0, 24);
      this.ctx.save.write();
    });

    const note = document.createElement('div');
    note.className = 'photo-note';
    note.innerHTML = `<span>◷</span><span><b>Use a photo — coming soon.</b><br>
      Your photo will be read on this device only, to shape the face. It is never
      uploaded and never stored.</span>`;
    el.appendChild(note);

    const cta = document.createElement('button');
    cta.className = 'cta ui-interactive';
    cta.textContent = 'Enter Vrindavan';
    cta.addEventListener('click', () => this.show('world'));
    el.appendChild(cta);
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  /**
   * Where am I? The single most important thing the HUD can answer, and the
   * thing its absence made the world feel anonymous. Updated twice a second.
   */
  _updatePlaceReadout(ctx) {
    const el = this.el["place-readout"];
    if (!el || !ctx.player || !ctx.world.placeName) return;
    const p = ctx.player.position;
    const info = ctx.world.placeName(p.x, p.z);
    if (!info.road && !info.area) { el.classList.remove("show"); return; }

    const changed = info.road !== this._lastRoad || info.area !== this._lastArea;
    if (changed) {
      this.el["place-road"].textContent = info.road;
      this.el["place-area"].textContent = info.area;
      this._lastRoad = info.road;
      this._lastArea = info.area;
      // Arriving somewhere new is worth announcing. Standing in it is not,
      // so the bar shows itself and then gets out of the way.
      this._placeHold = PLACE_SHOW_S;
    }

    if (this._placeHold > 0) el.classList.add("show");
    else el.classList.remove("show");
  }

  /**
   * Bring the readout back for a few seconds — what a tap on the world, the
   * bar itself or the radar asks for. It used to sit on screen permanently,
   * which covered the view and told you the same thing for minutes at a time.
   */
  showPlace(seconds = PLACE_SHOW_S) {
    this._placeHold = Math.max(this._placeHold || 0, seconds);
    this._lastRoad = null;          // force a refresh of the text
    this._lastArea = null;
    if (this.ctx) this._updatePlaceReadout(this.ctx);
  }

  update(dt, ctx) {
    this._updateSay(dt);
    if (this.screen !== "world") {
      if (this.el["place-readout"]) this.el["place-readout"].classList.remove("show");
      return;
    }
    this._placeHold = Math.max(0, (this._placeHold || 0) - dt);
    this._distAcc += dt;
    if (this._distAcc > 0.25) { this._distAcc = 0; this._updatePlaceReadout(ctx); }
  }

  dispose() {
    if (this._off) this._off.forEach((f) => f());
  }
}

const ICON = {
  temple: '卍', ghat: '≋', grove: '❧', kund: '◎',
  landmark: '⌂', gate: '⌅', market: '⌗',
};

function escape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
