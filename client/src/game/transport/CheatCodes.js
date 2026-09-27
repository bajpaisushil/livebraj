/**
 * Typed words that do things, in the tradition of the games this one borrows
 * its controls from.
 *
 * You type a word — anywhere, no prompt, no input box — and it happens. There
 * is no score to protect and nothing to cheat at, so these are simply
 * conveniences: put a rickshaw in front of me, tell the driver to hurry, take
 * me to the ghat. The buffer keeps the last few keystrokes and matches the tail
 * against the word list, so mistyping costs nothing; you just carry on typing.
 *
 * Words are matched longest-first, so `rickshaw` wins over any shorter word
 * that happens to end the same way.
 */

const BUFFER = 24;

export class CheatCodes {
  constructor(ctx) {
    this.ctx = ctx;
    this._buf = '';

    /**
     * word -> what it does. Hindi spellings sit beside the English ones
     * because those are the words that come to mind here.
     */
    this.codes = {
      // vehicles: one appears beside you, facing the way you are
      rickshaw: () => this._spawn('e-rickshaw', 'An e-rickshaw pulls up'),
      erickshaw: () => this._spawn('e-rickshaw', 'An e-rickshaw pulls up'),
      rath: () => this._spawn('e-rickshaw', 'Aapka rath haazir hai'),
      auto: () => this._spawn('auto', 'An auto swings round'),
      cab: () => this._spawn('taxi', 'A cab pulls in'),
      taxi: () => this._spawn('taxi', 'A cab pulls in'),
      tempo: () => this._spawn('tempo', 'A shared tempo stops'),
      cycle: () => this._spawn('cycle-rickshaw', 'A cycle rickshaw stops'),

      // pace, while you are riding
      fast: () => this._pace(1.6, 'Jaldi chaliye'),
      jaldi: () => this._pace(1.6, 'Jaldi chaliye'),
      tej: () => this._pace(1.6, 'Tez chalao'),
      slow: () => this._pace(0.62, 'Aaram se'),
      dhire: () => this._pace(0.62, 'Dhire chaliye'),

      /*
       * Straight to the ceiling, rather than five jaldis to get there.
       *
       * `_pace` compounds and clamps at PACE_MAX, so asking for the whole
       * range in one go is simply a big enough multiplier — the clamp does the
       * rest and the hard speed ceiling in RickshawSystem still applies, so
       * this cannot outrun the collision pass.
       */
      turbo: () => this._pace(99, 'Poori raftaar'),
      udao: () => this._pace(99, 'Udao ise'),
      rocket: () => this._pace(99, 'Poori raftaar'),
    };

    this._words = Object.keys(this.codes).sort((a, b) => b.length - a.length);
    this._onKey = (e) => this._key(e);
    window.addEventListener('keydown', this._onKey);
    this._wireField();
  }

  /**
   * The same words, for a phone.
   *
   * Typing them at the world only works if there is something to type on, and
   * on a phone there is not — the whole feature was unreachable on the device
   * this game is actually for. The menu carries a field instead: say the word,
   * press GO, and it happens exactly as if it had been typed.
   */
  _wireField() {
    const input = document.getElementById('code-input');
    const go = document.getElementById('code-go');
    if (!input) return;

    const say = () => {
      const word = input.value.trim().toLowerCase().replace(/[^a-z]/g, '');
      input.value = '';
      input.blur();
      const fn = this.codes[word];
      if (!fn) {
        this.ctx.bus.emit('ui:toast', { title: 'Nothing happens', sub: 'No such word.' });
        return;
      }
      // back to the world first: a rickshaw arriving behind a menu is no use
      if (this.ctx.ui && this.ctx.ui.show) this.ctx.ui.show('world');
      setTimeout(() => fn(), 60);
    };

    go?.addEventListener('click', say);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); say(); }
      e.stopPropagation();          // never let the world's listener see this
    });
  }

  _key(e) {
    // a modifier means they are driving the browser, not typing at the world
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
    // never swallow typing meant for a real field
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

    this._buf = (this._buf + e.key.toLowerCase()).slice(-BUFFER);
    for (const w of this._words) {
      if (this._buf.endsWith(w)) {
        this._buf = '';
        this.codes[w]();
        return;
      }
    }
  }

  /** Put a vehicle on the road beside the player, ready to get into. */
  _spawn(typeId, line) {
    const ctx = this.ctx;
    if (!ctx.crowd || !ctx.crowd.spawnVehicleAt || !ctx.player) return;
    const p = ctx.player.position;
    const yaw = ctx.player.yaw || 0;
    // just ahead and a little to the left, where one would actually stop
    const x = p.x + Math.sin(yaw) * 3.4 - Math.cos(yaw) * 1.6;
    const z = p.z + Math.cos(yaw) * 3.4 + Math.sin(yaw) * 1.6;
    const ok = ctx.crowd.spawnVehicleAt(typeId, x, z, yaw + Math.PI);
    if (!ok) return;
    ctx.bus.emit('ui:toast', { title: line, sub: 'Baith jaiye.' });
    ctx.bus.emit('sfx', { name: 'rickshawbell' });
    ctx.bus.emit('haptic', { pattern: 'soft' });
  }

  /** Ask the driver to change pace. Only means anything mid-ride. */
  _pace(mult, line) {
    const r = this.ctx.rickshaw;
    if (!r || !r.setPace) return;
    const res = r.setPace(mult);
    if (!res) return;                       // not in a vehicle: nobody to ask
    if (res === 'capped') {
      // Typing jaldi a fifth time used to do nothing at all and say nothing
      // about it, which reads as a broken word rather than a full throttle.
      this.ctx.bus.emit('ui:toast', {
        title: mult > 1 ? 'Aur tez nahin ho sakta' : 'Isse dhire nahin',
        sub: mult > 1 ? 'He is already going his fastest' : 'He is already crawling',
      });
      this.ctx.bus.emit('haptic', { pattern: 'double' });
      return;
    }
    const st = r.paceSteps ? r.paceSteps() : null;
    this.ctx.bus.emit('ui:toast', {
      title: line,
      sub: st && st.steps > 1 ? 'jaldi \u00d7' + st.steps : '',
    });
    this.ctx.bus.emit('haptic', { pattern: 'tick' });
  }

  dispose() { window.removeEventListener('keydown', this._onKey); }
}
