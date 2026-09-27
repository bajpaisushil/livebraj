/**
 * EventBus — the one-way notification spine.
 *
 * Systems never hold references to each other; they publish and subscribe.
 * The Unity port replaces this with a static EventHub exposing the same names.
 */
export class EventBus {
  constructor() { this._m = new Map(); }

  on(name, fn) {
    let set = this._m.get(name);
    if (!set) { set = new Set(); this._m.set(name, set); }
    set.add(fn);
    return () => set.delete(fn);
  }

  once(name, fn) {
    const off = this.on(name, (p) => { off(); fn(p); });
    return off;
  }

  emit(name, payload) {
    const set = this._m.get(name);
    if (!set || set.size === 0) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); }
      catch (err) { console.error(`[bus] "${name}" handler threw`, err); }
    }
  }

  clear() { this._m.clear(); }
}

/** Canonical event names. Import these instead of typing string literals. */
export const Events = {
  PLAYER_MOVED: 'player:moved',
  LOCATION_NEAR: 'location:near',
  LOCATION_LEFT: 'location:left',
  LOCATION_DISCOVERED: 'location:discovered',
  FLOWER_PICKED: 'flower:picked',
  FLOWER_OFFERED: 'flower:offered',
  PRANAM_DONE: 'pranam:done',
  DARSHAN_DONE: 'darshan:done',
  PARIKRAMA_START: 'parikrama:start',
  PARIKRAMA_PROGRESS: 'parikrama:progress',
  PARIKRAMA_COMPLETE: 'parikrama:complete',
  PARIKRAMA_STOP: 'parikrama:stop',
  NAV_DESTINATION: 'nav:destination',
  NAV_ARRIVED: 'nav:arrived',
  UI_PROMPT: 'ui:prompt',
  UI_PROMPT_CLEAR: 'ui:prompt:clear',
  UI_TOAST: 'ui:toast',
  UI_CARD: 'ui:card',
  UI_SCREEN: 'ui:screen',
  HAPTIC: 'haptic',
  SFX: 'sfx',
  TIME_CHANGED: 'time:changed',
  SETTINGS_CHANGED: 'settings:changed',
  INPUT_INTERACT: 'input:interact',
  INPUT_TAP: 'input:tap',
  INPUT_PINCH: 'input:pinch',
  INPUT_MOVETO: 'input:moveto',
  QUALITY_CHANGED: 'quality:changed',
};
