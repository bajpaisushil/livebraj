/**
 * Cancellation and timing for multi-step sequences.
 *
 * Every devotional interaction is an async sequence that must always restore
 * input and camera, including when the player walks away mid-bow. These are
 * the primitives that guarantee it.
 */

export class CancelledError extends Error {
  constructor() { super('cancelled'); this.name = 'CancelledError'; }
}

export class CancelToken {
  constructor() { this.cancelled = false; this._cbs = []; }
  throwIfCancelled() { if (this.cancelled) throw new CancelledError(); }
  onCancel(fn) { if (this.cancelled) fn(); else this._cbs.push(fn); }
  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const fn of this._cbs) { try { fn(); } catch { /* ignore */ } }
    this._cbs.length = 0;
  }
}

export function wait(ms, token) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    if (token) token.onCancel(() => { clearTimeout(id); reject(new CancelledError()); });
  });
}

export function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

/** Run `fn(t)` from 0..1 over `ms`, resolving when done. Cancellable. */
export function tween(ms, fn, token, ease = (t) => t) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let raf = 0;
    let cancelled = false;
    if (token) token.onCancel(() => { cancelled = true; cancelAnimationFrame(raf); reject(new CancelledError()); });
    const step = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / ms);
      fn(ease(t), t);
      if (t < 1) raf = requestAnimationFrame(step);
      else resolve();
    };
    raf = requestAnimationFrame(step);
  });
}

/** Swallow CancelledError, rethrow anything else. */
export function ignoreCancel(promise) {
  return promise.catch((err) => { if (!(err instanceof CancelledError)) throw err; });
}
