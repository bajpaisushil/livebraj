/** Vibration, gated on the user's setting and on real device support. */
const PATTERNS = {
  tick: [8],
  soft: [16],
  double: [14, 60, 14],
  long: [40],
  bell: [10, 40, 22],
};

export function haptic(pattern, settings) {
  if (settings && settings.haptics === false) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(PATTERNS[pattern] || PATTERNS.tick); } catch { /* unsupported */ }
}
