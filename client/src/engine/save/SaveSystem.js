/**
 * Offline-first persistence.
 *
 * localStorage today, the same JSON document uploaded to an optional account
 * later. Writes are debounced because interactions fire in bursts. Every access
 * is guarded: private windows, cleared site data and thumbnail capture can all
 * make storage throw or come back empty, and the game must still run.
 */

import { defaultState, hydrate, serialise, migrate } from './StateSchema.js';

/**
 * Capacitor's Preferences plugin, when we are running as an app. It maps to
 * SharedPreferences on Android and UserDefaults on iOS — both of which survive
 * the storage pressure that can clear a WebView.
 */
function nativeStore() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (!cap || !cap.Plugins || !cap.Plugins.Preferences) return null;
  return cap.Plugins.Preferences;
}

const KEY = 'vrindavan-dham.v1';

export class SaveSystem {
  constructor(key = KEY) {
    this.key = key;
    this.available = probe();
    this.native = nativeStore();
    this._timer = null;
    this._state = null;
    if (this.native) console.info('[save] native store available, mirroring writes');
  }

  /**
   * Pull the native copy if it is newer than the WebView one. Called once at
   * boot, and it is why a cleared WebView does not mean a lost journey.
   */
  async restoreFromNative(current) {
    if (!this.native) return current;
    try {
      const { value } = await this.native.get({ key: this.key });
      if (!value) return current;
      const doc = JSON.parse(value);
      const localAt = current && current.updatedAt ? Date.parse(current.updatedAt) : 0;
      const nativeAt = doc && doc.updatedAt ? Date.parse(doc.updatedAt) : 0;
      if (nativeAt > localAt) {
        console.info('[save] recovered a newer document from the native store');
        return hydrate(migrate(defaultState(), doc));
      }
    } catch (err) { console.warn('[save] native read failed', err); }
    return current;
  }

  load() {
    const base = defaultState();
    if (!this.available) return hydrate(base);
    let raw = null;
    try { raw = window.localStorage.getItem(this.key); } catch { return hydrate(base); }
    if (!raw) return hydrate(base);
    try { return hydrate(migrate(base, JSON.parse(raw))); }
    catch { console.warn('[save] corrupt document discarded'); return hydrate(base); }
  }

  bind(state) { this._state = state; return state; }

  /** Debounced full write. Safe to call from any interaction. */
  write(state = this._state) {
    if (!this.available || !state) return;
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush(state);
    }, 400);
  }

  flush(state = this._state) {
    if (!this.available || !state) return;
    try {
      const doc = serialise(state);
      doc.updatedAt = new Date().toISOString();
      if (!doc.createdAt) doc.createdAt = doc.updatedAt;
      if (!doc.id) doc.id = `local-${doc.createdAt}`;
      state.createdAt = doc.createdAt;
      state.id = doc.id;
      const json = JSON.stringify(doc);
      window.localStorage.setItem(this.key, json);
      // mirror to the native store, which cannot be evicted
      if (this.native) {
        this.native.set({ key: this.key, value: json }).catch(() => {});
      }
    } catch (err) { console.warn('[save] write failed', err); }
  }

  patch(partial) {
    if (partial && this._state) Object.assign(this._state, partial);
    this.write();
    return this._state;
  }

  reset() {
    try { window.localStorage.removeItem(this.key); } catch { /* ignore */ }
    if (this.native) this.native.remove({ key: this.key }).catch(() => {});
  }

  /** What an account sync would upload. Exposed for the future backend. */
  export() { return serialise(this._state || defaultState()); }
}

function probe() {
  try {
    window.localStorage.setItem('__vd_probe', '1');
    window.localStorage.removeItem('__vd_probe');
    return true;
  } catch { return false; }
}
