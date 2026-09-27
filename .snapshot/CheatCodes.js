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
    };

    this._words = Object.keys(this.codes).sort((a, b) => b.length - a.length);
    this._onKey = (e) => this._key(e);
    window.addEventListener('keydown', this._onKey);
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
    if (!r.setPace(mult)) return;
    this.ctx.bus.emit('ui:toast', { title: line, sub: '' });
    this.ctx.bus.emit('haptic', { pattern: 'tick' });
  }

  dispose() { window.removeEventListener('keydown', this._onKey); }
}
