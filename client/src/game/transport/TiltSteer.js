/**
 * Steering by leaning the phone.
 *
 * You asked for the vehicle to answer the phone itself and not only the
 * buttons: lean it left, go left. This is that, and only while you are at the
 * wheel — nothing here touches walking, where tilt would be motion sickness.
 *
 * WHY THE GRAVITY VECTOR AND NOT `gamma`.
 *
 * `deviceorientation` hands you alpha/beta/gamma, and gamma is the obvious
 * choice for left-right lean. It is also unusable for this: gamma goes through
 * a gimbal singularity as beta approaches ±90, which is to say as the phone
 * comes upright — exactly how somebody holds a phone they are looking at. Near
 * there gamma flips between +90 and -90 on a tremor and the vehicle would throw
 * itself across the road.
 *
 * `devicemotion` gives `accelerationIncludingGravity`, whose x component is the
 * component of gravity along the phone's left-right axis. That is a straight
 * sine of the lean about that axis, it is continuous everywhere, and it does not
 * care what the other two angles are doing. `deviceorientation` stays as a
 * fallback for anything that does not report motion.
 *
 * NEUTRAL IS WHERE YOU ARE HOLDING IT.
 *
 * Nobody holds a phone flat, and nobody holds it at the same angle twice. So
 * zero is taken from wherever the phone is when you take the wheel, not from
 * the horizontal, and it drifts slowly toward wherever you settle — put your
 * hand down mid-ride and the neutral follows rather than pinning the steering
 * hard over. The drift is slow enough that real steering outruns it.
 */

/** Lean, in degrees, that counts as full lock. A small, comfortable wrist. */
const FULL_LEAN_DEG = 24;
/** Below this the phone is being held, not steered. */
const DEADZONE = 0.12;
/** How fast neutral follows where you are actually holding it, per second. */
const RECENTRE = 0.06;
/** Smoothing on the raw reading, which is noisy at rest. */
const SMOOTH = 9;

const G = 9.81;
const FULL = G * Math.sin((FULL_LEAN_DEG * Math.PI) / 180);

export class TiltSteer {
  constructor(ctx) {
    this.ctx = ctx;
    this.available = typeof window !== 'undefined'
      && ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window);
    this.granted = false;
    this.live = false;          // true once a real reading has arrived
    this.raw = 0;               // smoothed gravity along the left-right axis
    this.neutral = null;        // where you are holding it
    this.value = 0;             // -1 .. 1, what the vehicle should do

    this._onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.x === undefined) return;
      this._feed(a.x);
    };
    this._onOrient = (e) => {
      // fallback only, and only where it is trustworthy: away from upright,
      // where gamma is not about to flip sign on a tremor
      if (this.live) return;
      if (e.gamma === null || e.beta === null) return;
      if (Math.abs(e.beta) > 70) return;
      this._feed(G * Math.sin((e.gamma * Math.PI) / 180));
    };
  }

  /**
   * Ask for the sensor. iOS 13+ will only grant this from a real tap, which is
   * why it is called from `takeWheel` and not from the constructor.
   */
  async enable() {
    if (!this.available || this.granted) return this.granted;
    try {
      const M = window.DeviceMotionEvent, O = window.DeviceOrientationEvent;
      if (M && typeof M.requestPermission === 'function') {
        const r = await M.requestPermission();
        if (r !== 'granted') return false;
      } else if (O && typeof O.requestPermission === 'function') {
        const r = await O.requestPermission();
        if (r !== 'granted') return false;
      }
    } catch (err) {
      // a refusal, or a browser that throws rather than resolving. Either way
      // the buttons still steer, so this is not worth surfacing.
      return false;
    }
    window.addEventListener('devicemotion', this._onMotion);
    window.addEventListener('deviceorientation', this._onOrient);
    this.granted = true;
    return true;
  }

  /** Take zero from wherever the phone is right now. */
  recentre() { this.neutral = this.live ? this.raw : null; }

  _feed(x) {
    const k = this.live ? 1 - Math.exp(-SMOOTH * (1 / 60)) : 1;
    this.raw += (x - this.raw) * k;
    this.live = true;
    if (this.neutral === null) this.neutral = this.raw;
  }

  /**
   * `steering` is what the buttons and the stick are asking for. Their ask
   * always wins: somebody with a thumb on the control is steering deliberately,
   * and a lean they did not mean must not fight it.
   */
  update(dt, steering) {
    if (!this.live || this.neutral === null) { this.value = 0; return 0; }
    if (Math.abs(steering) > 0.05) {
      // they are driving with the control. Let neutral catch up to however
      // they happen to be holding it, so letting go does not snap the wheel.
      this.neutral += (this.raw - this.neutral) * Math.min(1, dt * 4);
      this.value = 0;
      return 0;
    }
    this.neutral += (this.raw - this.neutral) * Math.min(1, dt * RECENTRE);
    // NOTE the sign: the gravity x axis points right in device space, so
    // leaning LEFT drives x negative, which is the direction we want.
    let v = (this.raw - this.neutral) / FULL;
    const m = Math.abs(v);
    v = m < DEADZONE ? 0 : Math.sign(v) * ((m - DEADZONE) / (1 - DEADZONE));
    this.value = Math.max(-1, Math.min(1, v));
    return this.value;
  }

  dispose() {
    window.removeEventListener('devicemotion', this._onMotion);
    window.removeEventListener('deviceorientation', this._onOrient);
    this.granted = false;
  }
}
